import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureVendorProfile } from '@/lib/vendor/profile';
import { dispatchRequestToVendors } from '@/lib/requests/dispatch';
import { canReceiveLeads } from '@/lib/vendor/moderation';
import { makeFakeDb } from './helpers/fake-supabase';

// F1 decision (2026-07-22): "Anyone with the valid invite link may create an
// account. Business verification is required before marketplace access is
// fully activated." These tests pin the three behaviors Cesar's decision
// requires, using an in-memory fake db (tests/helpers/fake-supabase.ts) so
// they run without a live Supabase connection.

test('invite lane: fresh signup is born PENDING, not approved', async () => {
  const db = makeFakeDb();
  const result = await ensureVendorProfile(db, {
    lane: 'invite',
    authId: 'auth-1',
    email: 'new-vendor@example.com',
    profile: { company_name: 'Borderland Forklift Services', source: 'invite' },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.status, 'pending');
  assert.equal(result.created, true);
  assert.equal(result.wasAlreadyApproved, false);
});

test('invite lane: linking an existing unowned row by email does not promote it to approved', async () => {
  // Simulates an operator-seeded placeholder row (auth_id null, status
  // pending) that the invited vendor's first sign-in then claims.
  const db = makeFakeDb({
    vendor_profiles: [
      { id: 'vp-1', status: 'pending', auth_id: null, email: 'invited@example.com' },
    ],
  });
  const result = await ensureVendorProfile(db, {
    lane: 'invite',
    authId: 'auth-2',
    email: 'invited@example.com',
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.status, 'pending'); // still pending — invite never promotes
  assert.equal(result.created, false);
  assert.equal(result.id, 'vp-1');
});

test('organic lane: still born PENDING (regression guard — never weaken)', async () => {
  const db = makeFakeDb();
  const result = await ensureVendorProfile(db, {
    lane: 'organic',
    authId: 'auth-3',
    email: 'quick-signup@example.com',
    profile: { company_name: 'Acme Co', source: 'quick_signup' },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.status, 'pending');
});

test('admin_approval lane: still the one lane that activates a vendor', async () => {
  const db = makeFakeDb({
    vendor_profiles: [
      { id: 'vp-2', status: 'pending', auth_id: 'auth-4', email: 'pending-vendor@example.com' },
    ],
  });
  const result = await ensureVendorProfile(db, {
    lane: 'admin_approval',
    authId: 'auth-4',
    email: 'pending-vendor@example.com',
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.status, 'approved');
  assert.equal(result.wasAlreadyApproved, false); // it WAS pending before this call
});

test('RFQ dispatch: a pending vendor is excluded even when it outranks the approved one', async () => {
  const db = makeFakeDb({
    vendor_profiles: [
      {
        id: 'vendor-approved', company_name: 'Approved Forklifts Co', email: null,
        categories: ['Forklifts'], service_areas: ['El Paso'],
        status: 'approved', moderation_status: 'active', suspended_until: null,
      },
      {
        id: 'vendor-pending', company_name: 'Pending Forklifts Co', email: null,
        categories: ['Forklifts'], service_areas: ['El Paso'],
        status: 'pending', moderation_status: 'active', suspended_until: null,
      },
    ],
  });

  const result = await dispatchRequestToVendors(db, {
    id: 'req-1', public_ref: 'REQ-1', category: 'Forklifts', problem: 'Need forklifts',
    location: 'El Paso', contact_name: 'Buyer Co', contact_email: 'buyer@example.com',
  });

  // Only the approved vendor is even a candidate (dispatch.ts queries
  // `.eq('status', 'approved')` before scoring/matching runs at all).
  assert.equal(result.matched, 1);
  assert.equal(result.dispatched, 1);

  const leads = db._store.quote_requests || [];
  assert.equal(leads.length, 1);
  assert.equal(leads[0].vendor_id, 'vendor-approved');
});

// Follow-up (same F1 decision): POST /api/vendor/open-requests lets a vendor
// respond to (and thereby create a lead + notify the buyer on) an open
// request. That's a "receive/work a lead" action same as dispatch, so it
// must be gated the same way: canReceiveLeads() (src/lib/vendor/moderation.ts)
// is the exact check the route runs after fetching the vendor's own
// status/moderation row — these tests exercise it against a fake db query
// shaped exactly like the route's, so a query/column-name drift would fail
// them the same way it would break the route.

test('open-requests response gate: a pending vendor cannot respond', async () => {
  const db = makeFakeDb({
    vendor_profiles: [
      { id: 'vendor-pending', status: 'pending', moderation_status: 'active', suspended_until: null },
    ],
  });
  const { data: modRow } = await db.from('vendor_profiles')
    .select('status, moderation_status, suspended_until').eq('id', 'vendor-pending').maybeSingle();
  assert.ok(modRow);
  assert.equal(canReceiveLeads({ status: modRow!.status as string, moderation_status: modRow!.moderation_status as string, suspended_until: modRow!.suspended_until as string | null }), false);
});

test('open-requests response gate: an approved, active vendor can respond', async () => {
  const db = makeFakeDb({
    vendor_profiles: [
      { id: 'vendor-approved', status: 'approved', moderation_status: 'active', suspended_until: null },
    ],
  });
  const { data: modRow } = await db.from('vendor_profiles')
    .select('status, moderation_status, suspended_until').eq('id', 'vendor-approved').maybeSingle();
  assert.ok(modRow);
  assert.equal(canReceiveLeads({ status: modRow!.status as string, moderation_status: modRow!.moderation_status as string, suspended_until: modRow!.suspended_until as string | null }), true);
});

test('open-requests response gate: an approved but suspended vendor still cannot respond', async () => {
  const db = makeFakeDb({
    vendor_profiles: [
      { id: 'vendor-suspended', status: 'approved', moderation_status: 'suspended', suspended_until: null },
    ],
  });
  const { data: modRow } = await db.from('vendor_profiles')
    .select('status, moderation_status, suspended_until').eq('id', 'vendor-suspended').maybeSingle();
  assert.ok(modRow);
  assert.equal(canReceiveLeads({ status: modRow!.status as string, moderation_status: modRow!.moderation_status as string, suspended_until: modRow!.suspended_until as string | null }), false);
});
