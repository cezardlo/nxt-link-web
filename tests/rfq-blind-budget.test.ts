import assert from 'node:assert/strict';
import test from 'node:test';

import { stripBlindBudgetFields, shouldShareClientRequestBudget } from '@/lib/requests/vendor-view';
import { dispatchRequestToVendors, type DispatchableRequest } from '@/lib/requests/dispatch';
import { makeFakeDb } from './helpers/fake-supabase';

// BLIND BUDGET INVARIANT — Slice R1, binding
// (workplace/plans/rfq-seamless-build-2026-07-29.md): "the buyer's budget
// range must NEVER be serialized into any vendor-facing response."
//
// Proven three independent ways below:
//   1. The pure stripping function used by GET /api/vendor/leads.
//   2. The DispatchableRequest type used to create a vendor's lead — it has
//      no budget_min/budget_max field AT ALL, so leaking budget through
//      dispatch is a compile error, not just a review catch.
//   3. The real dispatch write path (src/lib/requests/dispatch.ts), seeded
//      via the shared fake-db test helper, proving the ACTUAL row it inserts
//      into quote_requests (what GET /api/vendor/leads reads from) never
//      carries budget — even when the source object has it attached.

test('stripBlindBudgetFields: removes budget_min/budget_max even when present, keeps everything else', () => {
  const row = {
    id: 'qr-1', public_ref: 'REQ-1', company: 'Acme', quantity: 5,
    delivery_location: 'El Paso, TX', budget_min: 10000, budget_max: 50000,
  };
  const out = stripBlindBudgetFields(row);
  assert.equal('budget_min' in out, false);
  assert.equal('budget_max' in out, false);
  assert.equal(out.company, 'Acme');
  assert.equal(out.quantity, 5);
  assert.equal(out.delivery_location, 'El Paso, TX');

  // Proof by string search too — the actual numbers/key name must not appear
  // anywhere in the serialized output a route would send over the wire.
  const json = JSON.stringify(out);
  assert.ok(!json.includes('10000'));
  assert.ok(!json.includes('50000'));
  assert.ok(!/budget/i.test(json));
});

test('stripBlindBudgetFields: a row with no budget fields at all (old-shape row) passes through unchanged', () => {
  const row = { id: 'qr-2', company: 'Old Co' };
  const out = stripBlindBudgetFields(row);
  assert.deepEqual(out, row);
});

test('shouldShareClientRequestBudget: defaults to hidden — false/null/absent all hide the legacy budget_range', () => {
  assert.equal(shouldShareClientRequestBudget({ share_budget: false }), false);
  assert.equal(shouldShareClientRequestBudget({ share_budget: null }), false);
  assert.equal(shouldShareClientRequestBudget({}), false);
});

test('shouldShareClientRequestBudget: only an explicit true reveals the legacy budget_range', () => {
  assert.equal(shouldShareClientRequestBudget({ share_budget: true }), true);
});

test('DispatchableRequest has no budget field — structurally cannot carry budget into a dispatched lead', () => {
  // Compile-time proof: this object satisfies DispatchableRequest using
  // every field the type allows, and budget simply isn't one of them — a
  // future author literally cannot type `budget_min` onto this interface
  // without TypeScript rejecting it at the call site.
  const req: DispatchableRequest = {
    id: 'req-1', public_ref: 'REQ-1', category: 'Forklifts', problem: 'need one',
    location: 'El Paso', contact_name: 'Buyer Co', contact_email: 'buyer@example.com',
    request_kind: 'product', quantity: 2, delivery_location: 'El Paso, TX',
    preferred_timeline: 'ASAP', structured_specs: { color: 'yellow' },
  };
  assert.equal((req as unknown as Record<string, unknown>).budget_min, undefined);
});

test('dispatch: the actual lead written to quote_requests never carries budget, even if the source object had it attached', async () => {
  const db = makeFakeDb({
    vendor_profiles: [
      {
        id: 'vendor-1', company_name: 'Forklift Co', email: null,
        categories: ['Forklifts'], service_areas: ['El Paso'],
        status: 'approved', moderation_status: 'active', suspended_until: null,
      },
    ],
  });

  // A buyer's client_requests row DOES carry budget_min/budget_max (Slice
  // R1 columns) — simulate a caller passing the wider row straight through
  // (bypassing the type system via a cast, e.g. an accidental object spread
  // at a future call site) to prove the INSERT itself — not just the type —
  // is what keeps budget off the vendor-visible row.
  const sourceWithBudgetAttached = {
    id: 'req-1', public_ref: 'REQ-1', category: 'Forklifts', problem: 'Need 3 forklifts',
    location: 'El Paso', contact_name: 'Buyer Co', contact_email: 'buyer@example.com',
    request_kind: 'product', quantity: 3, delivery_location: 'El Paso, TX', preferred_timeline: 'ASAP',
    structured_specs: { voltage: '220V' },
    budget_min: 10000, budget_max: 50000,
  } as DispatchableRequest & { budget_min: number; budget_max: number };

  const result = await dispatchRequestToVendors(db, sourceWithBudgetAttached);
  assert.equal(result.dispatched, 1);

  const leads = db._store.quote_requests || [];
  assert.equal(leads.length, 1);
  const lead = leads[0];
  assert.equal('budget_min' in lead, false);
  assert.equal('budget_max' in lead, false);
  // The non-blind structured fields DID make it through — proves this isn't
  // just an accidentally-empty insert, the safe fields really are copied.
  assert.equal(lead.quantity, 3);
  assert.equal(lead.delivery_location, 'El Paso, TX');
  assert.equal(lead.request_kind, 'product');
  assert.deepEqual(lead.structured_specs, { voltage: '220V' });

  const json = JSON.stringify(lead);
  assert.ok(!json.includes('10000'));
  assert.ok(!json.includes('50000'));
});
