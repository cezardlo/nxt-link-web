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
