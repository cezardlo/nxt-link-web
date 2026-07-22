// GET /api/admin/reconcile — one-deal-ledger health check (Payments S0 Phase D,
// see workplace/plans/payments-s0-ledger-merge-plan.md §7d). Admin-only.
//
// Reports three things:
//   1) discrepancies — commission_ledger rows the view itself flags as
//      disagreeing (fee amount, deal amount vs quoted amount, or paid state
//      between manual_deals and its linked commissions row).
//   2) orphans.unlinked_deals — manual_deals rows that trace back to a quote
//      (source_quote_id set) but were never linked to their commissions row
//      (commission_id null).
//   3) orphans.dealless_commissions — commissions rows the buyer accepted
//      that never became a tracked manual_deals row at all.
// Zero findings across all three = healthy: true.
//
// DEFENSIVE: the commission_ledger view and manual_deals.commission_id column
// only exist once Cesar applies the Phase A migration (house law: migrations
// first, then code — see supabase/migrations/20260721_one_deal_ledger.sql).
// Any error reading either degrades this report to a partial one
// (ledger_source: 'fallback') — never a 500. Reuses the exact Phase B/C
// helpers (isLedgerUnavailable, isMissingColumnError) so "unavailable" means
// the same thing everywhere in this codebase.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isAdminRequest } from '@/lib/assistant/auth';
import {
  LEDGER_DEAL_COLUMNS,
  isLedgerUnavailable,
  isMissingColumnError,
  mapLedgerRowToDeal,
  findUnlinkedDeals,
  findDeallessCommissions,
  isLedgerHealthy,
  type LedgerDealRow,
  type LedgerSource,
} from '@/lib/admin/commission-ledger';

interface UnlinkedDealRow {
  id: string;
  vendor_name: string;
  buyer_company: string | null;
  buyer_name: string | null;
  source_quote_id: string | null;
  commission_id: string | null;
  status: string;
  net_amount: number | null;
  created_at: string;
}

interface AcceptedCommissionRow {
  id: string;
  quote_request_id: string | null;
  vendor_id: string | null;
  quote_amount: number | null;
  commission_amount: number | null;
  status: string;
  created_at: string;
}

interface DealLinkRow {
  commission_id: string | null;
  source_quote_id: string | null;
}

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Admin only' }, { status: 401 });
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      healthy: true,
      ledger_source: 'fallback' as LedgerSource,
      discrepancies: [],
      orphans: { unlinked_deals: [], dealless_commissions: [] },
      counts: { discrepancies: 0, unlinked_deals: 0, dealless_commissions: 0 },
    });
  }
  const db = getSupabaseClient({ admin: true });

  // 1) Discrepancies: rows the unified view itself flags as disagreeing.
  const { data: discrepancyRows, error: viewError } = await db
    .from('commission_ledger')
    .select(LEDGER_DEAL_COLUMNS)
    .eq('discrepancy', true)
    .order('updated_at', { ascending: false })
    .limit(200);
  const ledgerAvailable = !isLedgerUnavailable(viewError);
  if (!ledgerAvailable) {
    console.warn('[admin/reconcile] commission_ledger view unavailable, degrading to a partial report:', viewError?.message);
  }
  const discrepancies = ledgerAvailable ? (discrepancyRows as unknown as LedgerDealRow[] || []).map(mapLedgerRowToDeal) : [];

  // 2a) Unlinked deals: manual_deals rows with a source quote but no
  // commission_id link. Filtered server-side; findUnlinkedDeals re-asserts
  // the same rule so the definition lives in one tested place.
  let unlinkedDeals: UnlinkedDealRow[] = [];
  let columnAvailable = true;
  {
    const { data, error } = await db
      .from('manual_deals')
      .select('id, vendor_name, buyer_company, buyer_name, source_quote_id, commission_id, status, net_amount, created_at')
      .not('source_quote_id', 'is', null)
      .is('commission_id', null)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error && isMissingColumnError(error)) {
      columnAvailable = false;
      console.warn('[admin/reconcile] manual_deals.commission_id not available yet, skipping unlinked-deal check:', error.message);
    } else if (error) {
      console.warn('[admin/reconcile] could not read manual_deals for the unlinked-deal check:', error.message);
    } else {
      unlinkedDeals = findUnlinkedDeals((data || []) as UnlinkedDealRow[]);
    }
  }

  // 2b) Dealless commissions: accepted quotes that never became a tracked
  // deal. Linked-status is checked by TWO separate .in() queries merged in
  // JS (never .or() with interpolated ids — that pattern is a known
  // remaining risk elsewhere in this codebase; avoided here deliberately).
  let deallessCommissions: Array<AcceptedCommissionRow & { ref: string | null; buyer_company_name: string | null; vendor_name: string | null }> = [];
  {
    const { data: acceptedData, error: acceptedError } = await db
      .from('commissions')
      .select('id, quote_request_id, vendor_id, quote_amount, commission_amount, status, created_at')
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(500);
    if (acceptedError) {
      console.warn('[admin/reconcile] could not read commissions for the dealless-commission check:', acceptedError.message);
    } else {
      const acceptedCommissions = (acceptedData || []) as AcceptedCommissionRow[];
      if (acceptedCommissions.length) {
        const commissionIds = acceptedCommissions.map((c) => c.id);
        const quoteRequestIds = Array.from(new Set(acceptedCommissions.map((c) => c.quote_request_id).filter((x): x is string => !!x)));

        const [byCommissionId, bySourceQuote] = await Promise.all([
          columnAvailable && commissionIds.length
            ? db.from('manual_deals').select('commission_id, source_quote_id').in('commission_id', commissionIds)
            : Promise.resolve({ data: [] as DealLinkRow[], error: null }),
          quoteRequestIds.length
            ? db.from('manual_deals').select('commission_id, source_quote_id').in('source_quote_id', quoteRequestIds)
            : Promise.resolve({ data: [] as DealLinkRow[], error: null }),
        ]);
        if (byCommissionId.error) console.warn('[admin/reconcile] link lookup by commission_id failed:', (byCommissionId.error as { message: string }).message);
        if (bySourceQuote.error) console.warn('[admin/reconcile] link lookup by source_quote_id failed:', (bySourceQuote.error as { message: string }).message);

        const dealLinks: DealLinkRow[] = [
          ...((byCommissionId.data || []) as DealLinkRow[]),
          ...((bySourceQuote.data || []) as DealLinkRow[]),
        ];
        const rawDealless = findDeallessCommissions(acceptedCommissions, dealLinks);

        if (rawDealless.length) {
          // Enrich with vendor/buyer context (same joins GET /api/admin/commissions
          // already does), scoped to just the flagged rows.
          const qrIds = rawDealless.map((c) => c.quote_request_id).filter((x): x is string => !!x);
          const vIds = Array.from(new Set(rawDealless.map((c) => c.vendor_id).filter((x): x is string => !!x)));
          const [qrRes, vRes] = await Promise.all([
            qrIds.length ? db.from('quote_requests').select('id, public_ref, company').in('id', qrIds) : Promise.resolve({ data: [] }),
            vIds.length ? db.from('vendor_profiles').select('id, company_name').in('id', vIds) : Promise.resolve({ data: [] }),
          ]);
          const qrMap = new Map<string, { public_ref: string; company: string | null }>();
          for (const q of (qrRes.data || []) as { id: string; public_ref: string; company: string | null }[]) {
            qrMap.set(q.id, { public_ref: q.public_ref, company: q.company });
          }
          const vMap = new Map<string, string>();
          for (const v of (vRes.data || []) as { id: string; company_name: string }[]) vMap.set(v.id, v.company_name);

          deallessCommissions = rawDealless.map((c) => ({
            ...c,
            ref: (c.quote_request_id && qrMap.get(c.quote_request_id)?.public_ref) || null,
            buyer_company_name: (c.quote_request_id && qrMap.get(c.quote_request_id)?.company) || null,
            vendor_name: (c.vendor_id && vMap.get(c.vendor_id)) || null,
          }));
        }
      }
    }
  }

  const counts = {
    discrepancies: discrepancies.length,
    unlinked_deals: unlinkedDeals.length,
    dealless_commissions: deallessCommissions.length,
  };
  const ledgerSource: LedgerSource = ledgerAvailable ? 'view' : 'fallback';

  return NextResponse.json({
    ok: true,
    healthy: isLedgerHealthy(counts),
    ledger_source: ledgerSource,
    discrepancies,
    orphans: { unlinked_deals: unlinkedDeals, dealless_commissions: deallessCommissions },
    counts,
  });
}
