import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  dispatchRequestToVendors, inviteVendorsToRequest, MAX_VENDORS, MAX_INVITES,
  type DispatchableRequest,
} from '@/lib/requests/dispatch';
import {
  canMarkInvitationViewed, AUTO_VIEWABLE_INVITATION_STATUSES, INVITATION_STATUSES,
} from '@/lib/requests/invitations';
import { makeFakeDb } from './helpers/fake-supabase';

const ROOT = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

// ============================================================================
// RFQ Slice R1b — "Invite specific vendors" (send-mode B)
// workplace/plans/rfq-seamless-build-2026-07-29.md
// ============================================================================

// --- Pure guard: canMarkInvitationViewed (never-downgrade discipline) ------

test('canMarkInvitationViewed allows only the untouched "invited" status', () => {
  assert.equal(canMarkInvitationViewed('invited'), true);
});

test('canMarkInvitationViewed refuses every status that represents real progress', () => {
  for (const status of ['viewed', 'quoted', 'declined']) {
    assert.equal(canMarkInvitationViewed(status), false, `must not auto-mark a "${status}" invitation as viewed`);
  }
});

test('canMarkInvitationViewed refuses null/undefined/empty/unknown values (fail closed)', () => {
  assert.equal(canMarkInvitationViewed(null), false);
  assert.equal(canMarkInvitationViewed(undefined), false);
  assert.equal(canMarkInvitationViewed(''), false);
  assert.equal(canMarkInvitationViewed('some_future_status'), false);
});

test('AUTO_VIEWABLE_INVITATION_STATUSES is exactly the one pre-vendor-action value', () => {
  assert.deepEqual([...AUTO_VIEWABLE_INVITATION_STATUSES], ['invited']);
});

test('INVITATION_STATUSES is the minimal binding vocabulary (invited/viewed/quoted/declined)', () => {
  assert.deepEqual([...INVITATION_STATUSES].sort(), ['declined', 'invited', 'quoted', 'viewed']);
});

// --- inviteVendorsToRequest: creation, approval gate, cap, idempotency ----

function baseRequest(overrides: Partial<DispatchableRequest> = {}): DispatchableRequest {
  return {
    id: 'req-1', public_ref: 'REQ-1', category: 'Forklifts', problem: 'Need 3 forklifts',
    location: 'El Paso, TX', contact_name: 'Buyer Co', contact_email: 'buyer@example.com',
    request_kind: 'product', quantity: 3, delivery_location: 'El Paso, TX', preferred_timeline: 'ASAP',
    structured_specs: { voltage: '220V' },
    ...overrides,
  };
}

function approvedVendor(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id, company_name: `Vendor ${id}`, email: `${id}@example.com`,
    status: 'approved', moderation_status: 'active', suspended_until: null,
    ...overrides,
  };
}

test('inviteVendorsToRequest: invites an approved+active vendor, creates a quote_requests lead AND a request_invitations row', async () => {
  const db = makeFakeDb({ vendor_profiles: [approvedVendor('v1')] });
  const result = await inviteVendorsToRequest(db, baseRequest(), ['v1']);
  assert.equal(result.invited, 1);
  assert.equal(result.skipped, 0);
  assert.deepEqual(result.invitedVendorIds, ['v1']);

  const leads = db._store.quote_requests || [];
  assert.equal(leads.length, 1);
  assert.equal(leads[0].vendor_id, 'v1');
  assert.equal((leads[0].answers as Record<string, unknown>).invited, true);
  assert.equal((leads[0].answers as Record<string, unknown>).source_request, 'REQ-1');
  // Never the auto-match tag on an invited lead.
  assert.equal('dispatched' in (leads[0].answers as Record<string, unknown>), false);

  const invitations = db._store.request_invitations || [];
  assert.equal(invitations.length, 1);
  assert.equal(invitations[0].request_id, 'req-1');
  assert.equal(invitations[0].vendor_id, 'v1');
  assert.equal(invitations[0].status, 'invited');
  assert.equal(invitations[0].quote_request_id, leads[0].id);
});

test('inviteVendorsToRequest: a match-reason chip for an invited lead must never be computed — no scoreVendors call, no category/location on the vendor required', async () => {
  // Deliberately give the vendor NO matching categories/service_areas at all
  // — an honest invite still succeeds because the buyer's own pick is the
  // reason, never a fabricated score.
  const db = makeFakeDb({
    vendor_profiles: [approvedVendor('v1', { categories: [], service_areas: [] })],
  });
  const result = await inviteVendorsToRequest(db, baseRequest({ category: 'Something totally unrelated' }), ['v1']);
  assert.equal(result.invited, 1);
});

test('inviteVendorsToRequest: skips a vendor that is not approved', async () => {
  const db = makeFakeDb({ vendor_profiles: [approvedVendor('v1', { status: 'pending' })] });
  const result = await inviteVendorsToRequest(db, baseRequest(), ['v1']);
  assert.equal(result.invited, 0);
  assert.equal(result.invitedVendorIds.length, 0);
  assert.equal((db._store.quote_requests || []).length, 0);
  assert.equal((db._store.request_invitations || []).length, 0);
});

test('inviteVendorsToRequest: skips a suspended/banned (restricted) vendor even if approved', async () => {
  const db = makeFakeDb({
    vendor_profiles: [approvedVendor('v1', { moderation_status: 'suspended', suspended_until: '2099-01-01T00:00:00.000Z' })],
  });
  const result = await inviteVendorsToRequest(db, baseRequest(), ['v1']);
  assert.equal(result.invited, 0);
  assert.equal((db._store.quote_requests || []).length, 0);
});

test('inviteVendorsToRequest: caps at MAX_INVITES even when more vendor ids are passed (no mass-blast)', async () => {
  const ids = Array.from({ length: 12 }, (_, i) => `v${i + 1}`);
  const db = makeFakeDb({ vendor_profiles: ids.map((id) => approvedVendor(id)) });
  const result = await inviteVendorsToRequest(db, baseRequest(), ids);
  assert.equal(MAX_INVITES, MAX_VENDORS);
  assert.equal(result.invited, MAX_INVITES);
  assert.equal((db._store.quote_requests || []).length, MAX_INVITES);
});

test('inviteVendorsToRequest: re-inviting an already-invited vendor is idempotent (no duplicate lead/invitation row)', async () => {
  const db = makeFakeDb({ vendor_profiles: [approvedVendor('v1')] });
  const first = await inviteVendorsToRequest(db, baseRequest(), ['v1']);
  const second = await inviteVendorsToRequest(db, baseRequest(), ['v1']);
  assert.equal(first.invited, 1);
  assert.equal(second.invited, 0);
  assert.equal(second.skipped, 1);
  assert.equal((db._store.quote_requests || []).length, 1);
  assert.equal((db._store.request_invitations || []).length, 1);
});

test('inviteVendorsToRequest: no reachable buyer email or missing request id/ref returns empty, never throws', async () => {
  const db = makeFakeDb({ vendor_profiles: [approvedVendor('v1')] });
  const noEmail = await inviteVendorsToRequest(db, baseRequest({ contact_email: '' }), ['v1']);
  assert.deepEqual(noEmail, { invited: 0, skipped: 0, invitedVendorIds: [] });
  const noRef = await inviteVendorsToRequest(db, baseRequest({ public_ref: null }), ['v1']);
  assert.deepEqual(noRef, { invited: 0, skipped: 0, invitedVendorIds: [] });
});

// --- BLIND BUDGET — invited leads must never carry the buyer's budget -----

test('inviteVendorsToRequest: the invited lead never carries budget_min/budget_max even if the source object had it attached', async () => {
  const db = makeFakeDb({ vendor_profiles: [approvedVendor('v1')] });
  const sourceWithBudgetAttached = {
    ...baseRequest(),
    budget_min: 10000, budget_max: 50000,
  } as DispatchableRequest & { budget_min: number; budget_max: number };

  const result = await inviteVendorsToRequest(db, sourceWithBudgetAttached, ['v1']);
  assert.equal(result.invited, 1);

  const lead = (db._store.quote_requests || [])[0];
  assert.equal('budget_min' in lead, false);
  assert.equal('budget_max' in lead, false);
  const json = JSON.stringify(lead);
  assert.ok(!json.includes('10000'));
  assert.ok(!json.includes('50000'));

  // The invitation tracking row is even further removed from budget data —
  // it only ever holds ids + a status string, structurally cannot carry it.
  const invitation = (db._store.request_invitations || [])[0];
  assert.equal('budget_min' in invitation, false);
  assert.equal('budget_max' in invitation, false);
});

// --- dispatchRequestToVendors: excludeVendorIds / maxVendors (send-mode "both") ---

test('dispatchRequestToVendors: excludeVendorIds keeps an already-invited vendor from getting a second, duplicate lead', async () => {
  const db = makeFakeDb({
    vendor_profiles: [approvedVendor('v1', { categories: ['Forklifts'], service_areas: ['El Paso'] })],
  });
  // v1 was already invited (send-mode B) — auto-match (send-mode A) must not
  // re-add them even though they'd otherwise score well.
  const dispatchResult = await dispatchRequestToVendors(db, baseRequest(), { excludeVendorIds: ['v1'] });
  assert.equal(dispatchResult.dispatched, 0);
  assert.equal((db._store.quote_requests || []).length, 0);
});

test('dispatchRequestToVendors: maxVendors bounds the combined total when send-mode "both" fills remaining slots', async () => {
  const ids = Array.from({ length: 5 }, (_, i) => `v${i + 1}`);
  const db = makeFakeDb({
    vendor_profiles: ids.map((id) => approvedVendor(id, { categories: ['Forklifts'], service_areas: ['El Paso'] })),
  });
  const result = await dispatchRequestToVendors(db, baseRequest(), { maxVendors: 2 });
  assert.equal(result.dispatched, 2);
  assert.equal((db._store.quote_requests || []).length, 2);
});

test('dispatchRequestToVendors: maxVendors <= 0 dispatches to nobody (both modes already filled the cap)', async () => {
  const db = makeFakeDb({
    vendor_profiles: [approvedVendor('v1', { categories: ['Forklifts'], service_areas: ['El Paso'] })],
  });
  const result = await dispatchRequestToVendors(db, baseRequest(), { maxVendors: 0 });
  assert.equal(result.dispatched, 0);
  assert.equal((db._store.quote_requests || []).length, 0);
});

test('dispatchRequestToVendors: unchanged default behavior (no opts) still dispatches normally — backward compatible', async () => {
  const db = makeFakeDb({
    vendor_profiles: [approvedVendor('v1', { categories: ['Forklifts'], service_areas: ['El Paso'] })],
  });
  const result = await dispatchRequestToVendors(db, baseRequest());
  assert.equal(result.dispatched, 1);
  assert.equal((db._store.quote_requests[0] as Record<string, unknown>).vendor_id, 'v1');
  assert.equal(((db._store.quote_requests[0] as Record<string, unknown>).answers as Record<string, unknown>).dispatched, true);
});

// --- Route wiring regression (mirrors tests/vendor-lead-viewed-guard.test.ts style) ---

test('POST /api/platform/requests: default send_mode is auto_match — every existing caller (nothing new in the body) is byte-for-byte unchanged', () => {
  const src = read('src/app/api/platform/requests/route.ts');
  assert.match(src, /const SEND_MODES = \['auto_match', 'invite', 'both'\] as const;/);
  assert.match(src, /:\s*'auto_match';/, 'default send_mode must be auto_match');
});

test('POST /api/platform/requests: invite mode falls back to auto-match dispatch if nobody could actually be invited (no dead ends)', () => {
  const src = read('src/app/api/platform/requests/route.ts');
  assert.match(src, /inviteResult\.invited === 0/);
});

test('POST /api/platform/requests: "both" mode caps the combined total at MAX_VENDORS and excludes already-invited vendors', () => {
  const src = read('src/app/api/platform/requests/route.ts');
  assert.match(src, /excludeVendorIds:\s*inviteResult\.invitedVendorIds/);
  assert.match(src, /MAX_VENDORS\s*-\s*inviteResult\.invitedVendorIds\.length/);
});

test('GET /api/vendor/leads: the invitation "viewed" write uses the guard and re-checks status in the update itself (double-guarded, matches the RV pattern)', () => {
  const src = read('src/app/api/vendor/leads/route.ts');
  assert.match(src, /canMarkInvitationViewed\(/, 'must call canMarkInvitationViewed before auto-marking an invitation viewed');
  assert.match(src, /request_invitations['"]?\)[\s\S]{0,20}\.update\(\{ status: 'viewed'/, 'auto-view write must target request_invitations with status viewed');
  assert.match(src, /\.in\(\s*'status'\s*,\s*AUTO_VIEWABLE_INVITATION_STATUSES/, 'the DB update must re-check current invitation status, not just the pre-fetched one');
});

test('GET /api/vendor/leads: an invited lead never gets a fabricated match_reasons score', () => {
  const src = read('src/app/api/vendor/leads/route.ts');
  assert.match(src, /match_reasons:\s*invited\s*\?\s*\[\]/);
});

test('Migration file exists at the exact path the spec requires', () => {
  assert.doesNotThrow(() => read('supabase/migrations/20260730_rfq_invitations_r1b.sql'));
});
