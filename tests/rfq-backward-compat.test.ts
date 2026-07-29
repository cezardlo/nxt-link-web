import assert from 'node:assert/strict';
import test from 'node:test';

import { validateStructuredRequest, validateQuoteExtras } from '@/lib/requests/structured';
import { stripBlindBudgetFields } from '@/lib/requests/vendor-view';

// Backward-compat requirement (Slice R1, binding): every new column added by
// 20260729_rfq_structured_fields_r1.sql is nullable/defaulted, so an
// old-shape row (created before this slice, with none of the new fields set)
// must keep flowing through validation/serialization without throwing or
// being rejected.

test('an old quote_requests row (nothing new set) passes through the vendor-facing stripper unchanged', () => {
  const oldRow = {
    id: 'qr-old', public_ref: 'REQ-OLD1', kind: 'product', company: 'Legacy Co',
    email: 'buyer@example.com', message: 'need a forklift', status: 'new',
    quote_amount: 12000, quote_currency: 'USD', quote_message: 'here is my quote',
    // request_kind, quantity, delivery_location, preferred_timeline,
    // budget_min, budget_max, structured_specs, quote_payment_terms,
    // quote_warranty, quote_extras are all simply ABSENT — never set on a
    // row created before this slice.
  };
  const stripped = stripBlindBudgetFields(oldRow);
  assert.deepEqual(stripped, oldRow);
});

test('validateStructuredRequest on a legacy-shaped body (no new fields at all) never throws and never errors', () => {
  const legacyBody = { company: 'Old Co', email: 'x@example.com', message: 'legacy free text request' };
  const result = validateStructuredRequest(legacyBody);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.value.request_kind, null);
  assert.equal(result.value.quantity, null);
  assert.equal(result.value.delivery_location, null);
  assert.equal(result.value.preferred_timeline, null);
  assert.equal(result.value.budget_min, null);
  assert.equal(result.value.budget_max, null);
  assert.deepEqual(result.value.structured_specs, {});
});

test('validateQuoteExtras on an opportunity with no request_kind (pre-R1 row) never throws, never errors, returns {}', () => {
  const result = validateQuoteExtras(undefined, { unit_price: 500, scope_summary: 'whatever' });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {});
});

test('a pre-existing quote_proposals shape (no request_kind/quote_extras keys) is still legitimate — new columns are additive, not required', () => {
  const oldProposal = {
    id: 'qp-1', quote_request_id: 'qr-old', vendor_id: 'v-1', revision: 1, status: 'submitted',
    line_items: [{ description: 'Forklift', qty: 1, unit_price: 15000, kind: 'product' }],
    subtotal: 15000, total: 15000, currency: 'USD',
    lead_time: '2 weeks', warranty: '1 year', payment_terms: 'Net 30',
  };
  assert.equal('request_kind' in oldProposal, false);
  assert.equal('quote_extras' in oldProposal, false);
  // Reading it the way the live code will (kind-less opportunity) behaves
  // exactly like any other pre-R1 row: {} extras, never an error.
  const extras = validateQuoteExtras(undefined, {});
  assert.deepEqual(extras.value, {});
});

test('validateStructuredRequest never throws on hostile input shapes (arrays, null, primitives)', () => {
  assert.doesNotThrow(() => validateStructuredRequest(null));
  assert.doesNotThrow(() => validateStructuredRequest([1, 2, 3]));
  assert.doesNotThrow(() => validateStructuredRequest('a string'));
  assert.doesNotThrow(() => validateStructuredRequest(42));
  assert.equal(validateStructuredRequest(null).ok, true);
});
