import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDealSettlementPatch,
  findDeallessCommissions,
  findUnlinkedDeals,
  isLedgerHealthy,
  isMissingColumnError,
  isProtectedDealStatus,
  omitCommissionId,
} from '@/lib/admin/commission-ledger';

// Payments S0 Phase C — "stop duplicating on write". These are the pure
// decision points extracted so the retry/guard logic is testable without a
// live database (local dev has neither SUPABASE_SERVICE_ROLE_KEY nor the
// migrated schema — see workplace/plans/payments-s0-ledger-merge-plan.md §7).

test('isMissingColumnError recognizes the Postgres and PostgREST codes', () => {
  assert.equal(isMissingColumnError({ code: '42703', message: 'column "commission_id" does not exist' }), true);
  assert.equal(isMissingColumnError({ code: 'PGRST204', message: "Column 'commission_id' not found" }), true);
});

test('isMissingColumnError falls back to message text when a driver omits the code', () => {
  assert.equal(isMissingColumnError({ message: 'column manual_deals.commission_id does not exist' }), true);
  assert.equal(isMissingColumnError({ message: "Could not find the 'commission_id' column of 'manual_deals' in the schema cache" }), true);
});

test('isMissingColumnError never treats an unrelated failure as a missing column', () => {
  assert.equal(isMissingColumnError(null), false);
  assert.equal(isMissingColumnError(undefined), false);
  assert.equal(isMissingColumnError({ code: '23505', message: 'duplicate key value violates unique constraint' }), false);
  assert.equal(isMissingColumnError({ code: '23503', message: 'insert or update violates foreign key constraint' }), false);
  assert.equal(isMissingColumnError({ message: 'permission denied for table manual_deals' }), false);
});

test('omitCommissionId drops only commission_id, keeps every other field', () => {
  const row = { vendor_name: 'Acme', net_amount: 1000, commission_id: 'c-1', source_quote_id: 'q-1' };
  const result = omitCommissionId(row);
  assert.deepEqual(result, { vendor_name: 'Acme', net_amount: 1000, source_quote_id: 'q-1' });
  assert.ok(!('commission_id' in result));
});

test('omitCommissionId is a safe no-op when the key is already absent', () => {
  const row = { vendor_name: 'Acme', net_amount: 1000 };
  assert.deepEqual(omitCommissionId(row), row);
});

test('isProtectedDealStatus guards exception states an admin/commissions toggle must not overwrite', () => {
  assert.equal(isProtectedDealStatus('disputed'), true);
  assert.equal(isProtectedDealStatus('credited'), true);
  assert.equal(isProtectedDealStatus('cancelled'), true);
});

test('isProtectedDealStatus lets the normal deal-flow statuses through', () => {
  for (const status of ['reserved', 'won', 'payment_reported', 'payment_confirmed', 'invoiced', 'paid', 'overdue']) {
    assert.equal(isProtectedDealStatus(status), false);
  }
  assert.equal(isProtectedDealStatus(null), false);
  assert.equal(isProtectedDealStatus(undefined), false);
});

test('buildDealSettlementPatch mirrors mark_paid onto the deal', () => {
  const patch = buildDealSettlementPatch('mark_paid', '2026-07-21T12:00:00.000Z');
  assert.deepEqual(patch, { status: 'paid', paid_at: '2026-07-21T12:00:00.000Z' });
});

test('buildDealSettlementPatch mirrors mark_unpaid (undo) onto the deal', () => {
  const patch = buildDealSettlementPatch('mark_unpaid', '2026-07-21T12:00:00.000Z');
  assert.deepEqual(patch, { status: 'won', paid_at: null });
});

test('buildDealSettlementPatch never includes a money/audit field', () => {
  const paid = buildDealSettlementPatch('mark_paid', '2026-07-21T12:00:00.000Z');
  const unpaid = buildDealSettlementPatch('mark_unpaid', '2026-07-21T12:00:00.000Z');
  for (const patch of [paid, unpaid]) {
    const keys = Object.keys(patch);
    assert.deepEqual(keys.sort(), ['paid_at', 'status']);
    for (const forbidden of ['commission_amount', 'effective_rate', 'fee_policy_version', 'protected_until']) {
      assert.ok(!(forbidden in patch), `settlement patch must never touch ${forbidden}`);
    }
  }
});

// Payments S0 Phase D — reconcile (GET /api/admin/reconcile). These are the
// pure orphan-classification + health helpers extracted so the reconcile
// route's logic is testable without a live database (same rationale as the
// Phase C tests above).

test('findUnlinkedDeals flags a deal with a source quote but no commission link', () => {
  const deals = [
    { id: 'd1', source_quote_id: 'q1', commission_id: null },
    { id: 'd2', source_quote_id: 'q2', commission_id: 'c2' },
    { id: 'd3', source_quote_id: null, commission_id: null },
  ];
  const result = findUnlinkedDeals(deals);
  assert.deepEqual(result.map((d) => d.id), ['d1']);
});

test('findUnlinkedDeals returns an empty array when every quoted deal is linked', () => {
  const deals = [
    { id: 'd1', source_quote_id: 'q1', commission_id: 'c1' },
    { id: 'd2', source_quote_id: null, commission_id: null },
  ];
  assert.deepEqual(findUnlinkedDeals(deals), []);
});

test('findDeallessCommissions flags an accepted commission linked by neither key', () => {
  const accepted = [
    { id: 'c1', quote_request_id: 'q1' },
    { id: 'c2', quote_request_id: 'q2' },
    { id: 'c3', quote_request_id: null },
  ];
  // c1 is linked via commission_id, c2 is linked only via source_quote_id
  // (predates the backfill / column), c3 has no deal at all.
  const dealLinks = [
    { commission_id: 'c1', source_quote_id: null },
    { commission_id: null, source_quote_id: 'q2' },
  ];
  const result = findDeallessCommissions(accepted, dealLinks);
  assert.deepEqual(result.map((c) => c.id), ['c3']);
});

test('findDeallessCommissions returns an empty array when every accepted commission has a deal', () => {
  const accepted = [{ id: 'c1', quote_request_id: 'q1' }];
  const dealLinks = [{ commission_id: 'c1', source_quote_id: null }];
  assert.deepEqual(findDeallessCommissions(accepted, dealLinks), []);
});

test('findDeallessCommissions treats no accepted commissions as no findings', () => {
  assert.deepEqual(findDeallessCommissions([], []), []);
});

test('isLedgerHealthy is true only when every count is zero', () => {
  assert.equal(isLedgerHealthy({ discrepancies: 0, unlinked_deals: 0, dealless_commissions: 0 }), true);
  assert.equal(isLedgerHealthy({ discrepancies: 1, unlinked_deals: 0, dealless_commissions: 0 }), false);
  assert.equal(isLedgerHealthy({ discrepancies: 0, unlinked_deals: 1, dealless_commissions: 0 }), false);
  assert.equal(isLedgerHealthy({ discrepancies: 0, unlinked_deals: 0, dealless_commissions: 1 }), false);
});
