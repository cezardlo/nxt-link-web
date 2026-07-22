// Payments S0 Phase B — shared helpers for reading the unified
// `commission_ledger` view (see supabase/migrations/20260721_one_deal_ledger.sql,
// section 6). Pure, DB-free mapping so both admin GET routes can be unit-tested
// without hitting Supabase.
//
// The view does not exist on the live database until Cesar applies the Phase A
// migration (house law: migrations first, then code — see
// workplace/plans/payments-s0-ledger-merge-plan.md §6). Callers MUST treat any
// error from a `commission_ledger` query as "view not available yet" and fall
// back to the pre-ledger two-table read — never throw, never 500.

/** Where a GET response's rows/enrichment actually came from. */
export type LedgerSource = 'view' | 'fallback';

/**
 * True for ANY Supabase/PostgREST error reading `commission_ledger` — a
 * missing relation (view not migrated yet, PGRST205 / 42P01), a revoked-grant
 * error, or a transient network hiccup. All of these should degrade to the
 * fallback read, not crash the route. Broad-and-safe beats narrow-and-brittle
 * here: a false "fallback" just means one extra read of tables that already
 * work today; a false "view" would mean silently trusting a query that failed.
 */
export function isLedgerUnavailable(error: unknown): boolean {
  return error != null;
}

/** Shape of the columns this app reads from `public.commission_ledger` for the deals page. */
export interface LedgerDealRow {
  deal_id: string;
  contract_ref: string | null;
  quote_request_id: string | null;
  commission_id: string | null;
  vendor_id: string | null;
  vendor_name: string;
  buyer_name: string | null;
  buyer_company: string | null;
  description: string | null;
  gross_amount: number | null;
  deal_amount: number;
  currency: string;
  nxtlink_fee: number | null;
  nxtlink_fee_rate: number | null;
  applied_cap: boolean | null;
  is_free_credit: boolean | null;
  credit_applied: number | null;
  payment_status: string;
  invoice_ref: string | null;
  protected_until: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  discrepancy: boolean;
}

/** Columns selected from commission_ledger for /api/admin/deals (view-mode). */
export const LEDGER_DEAL_COLUMNS =
  'deal_id, contract_ref, quote_request_id, commission_id, vendor_id, vendor_name, ' +
  'buyer_name, buyer_company, description, gross_amount, deal_amount, currency, ' +
  'nxtlink_fee, nxtlink_fee_rate, applied_cap, is_free_credit, credit_applied, ' +
  'payment_status, invoice_ref, protected_until, paid_at, notes, created_at, updated_at, discrepancy';

/**
 * The `commission_ledger` view renames several manual_deals columns (deal_id,
 * contract_ref, deal_amount, nxtlink_fee, nxtlink_fee_rate, payment_status) so
 * the ledger reads sensibly on its own. `/api/admin/deals` and its UI
 * (src/app/admin/deals/page.tsx) were both built against the RAW manual_deals
 * column names — this maps a view row back onto that exact shape so the
 * response is byte-identical to today's `select('*') from manual_deals`, plus
 * the additive `discrepancy` field. NOT present here (the view doesn't carry
 * them): `fee_policy_version`, `created_by` — neither is read by the admin
 * deals UI, only unused extra columns in today's raw `select('*')` response.
 */
export function mapLedgerRowToDeal(row: LedgerDealRow): Record<string, unknown> {
  return {
    id: row.deal_id,
    opportunity_ref: row.contract_ref,
    source_quote_id: row.quote_request_id,
    commission_id: row.commission_id,
    vendor_id: row.vendor_id,
    vendor_name: row.vendor_name,
    buyer_name: row.buyer_name,
    buyer_company: row.buyer_company,
    description: row.description,
    gross_amount: row.gross_amount,
    net_amount: row.deal_amount,
    currency: row.currency,
    commission_amount: row.nxtlink_fee,
    effective_rate: row.nxtlink_fee_rate,
    applied_cap: row.applied_cap,
    is_free_credit: row.is_free_credit,
    credit_applied: row.credit_applied,
    status: row.payment_status,
    invoice_ref: row.invoice_ref,
    protected_until: row.protected_until,
    paid_at: row.paid_at,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    discrepancy: row.discrepancy,
  };
}

// ---------------------------------------------------------------------------
// Payments S0 Phase C — "stop duplicating on write" (see
// workplace/plans/payments-s0-ledger-merge-plan.md §7). Every write path that
// touches manual_deals.commission_id (buyer/quote-decision's draft insert,
// admin/deals POST, admin/commissions PATCH's settlement mirror) needs the
// same fail-safe shape: if the column isn't live yet (deploy-order slip),
// retry once without it and never let the write itself fail. These helpers
// stay pure/DB-free like the read-side ones above — each route performs its
// own Supabase calls and uses these only to decide WHAT to write/retry, so
// the decisions are unit-testable without hitting Supabase.
// ---------------------------------------------------------------------------

/**
 * True for a Postgres "undefined column" error (SQLSTATE 42703) or
 * PostgREST's own "column not found in schema cache" code (PGRST204) — the
 * exact failure shape when `manual_deals.commission_id` doesn't exist yet on
 * the live database. House law is migrations-before-code (see the Phase A
 * migration file), but this is what makes a commission_id write fail SAFE if
 * that order ever slips: recording the deal/settlement always wins over
 * linking it. Deliberately narrow — unlike `isLedgerUnavailable`'s broad
 * any-error read fallback above, a real write failure (bad FK, a check
 * constraint, RLS) must still surface as itself, never be silently retried
 * away as if it were a missing-column problem.
 */
export function isMissingColumnError(
  error: { code?: string | null; message?: string | null } | null | undefined,
): boolean {
  if (!error) return false;
  if (error.code === '42703' || error.code === 'PGRST204') return true;
  const msg = (error.message || '').toLowerCase();
  return msg.includes('column') && (msg.includes('does not exist') || msg.includes('could not find') || msg.includes('schema cache'));
}

/**
 * Drop `commission_id` from a row/patch object — the exact retry payload
 * used after `isMissingColumnError` fires. Pure so the retry shape is
 * unit-testable without Supabase.
 */
export function omitCommissionId<T extends Record<string, unknown>>(row: T): Omit<T, 'commission_id'> {
  const { commission_id: _drop, ...rest } = row;
  return rest as Omit<T, 'commission_id'>;
}

/**
 * Deal statuses a blunt admin/commissions settlement toggle must never
 * overwrite — these only change through an explicit admin/deals action
 * (dispute resolution, credit, cancellation). Mirrors the status-transition
 * guard pattern already used elsewhere (no re-quote after accept, no flip
 * after billed).
 */
export function isProtectedDealStatus(status: string | null | undefined): boolean {
  return status === 'disputed' || status === 'credited' || status === 'cancelled';
}

export type SettlementAction = 'mark_paid' | 'mark_unpaid';

export interface DealSettlementPatch {
  status: 'paid' | 'won';
  paid_at: string | null;
}

/**
 * The manual_deals-side patch that mirrors a commissions mark_paid/
 * mark_unpaid action, so manual_deals stays the single settlement ledger
 * (Payments S0 Phase C). Pure — `nowIso` is injected so mark_paid's
 * timestamp is testable without faking the clock. Deliberately narrow: it
 * only ever returns `status`/`paid_at` — commission_amount, effective_rate,
 * fee_policy_version and protected_until are money/audit fields this patch
 * must never touch (plan §5), and this shape makes that true by
 * construction rather than by caller discipline.
 */
export function buildDealSettlementPatch(action: SettlementAction, nowIso: string): DealSettlementPatch {
  return action === 'mark_unpaid' ? { status: 'won', paid_at: null } : { status: 'paid', paid_at: nowIso };
}
