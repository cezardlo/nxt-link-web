// GET   /api/admin/commissions — operator money ledger: every opportunity's
//        commission with vendor/buyer context + totals.
// PATCH /api/admin/commissions {id, action:'mark_paid'|'mark_unpaid'} — settle.
// Admin/operator only.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isAdminRequest } from '@/lib/assistant/auth';
import {
  buildDealSettlementPatch,
  isLedgerUnavailable,
  isMissingColumnError,
  isProtectedDealStatus,
  type DealSettlementPatch,
  type LedgerSource,
  type SettlementAction,
} from '@/lib/admin/commission-ledger';

// GET's row set is quote-stage `commissions` (includes 'quoted'/'lost' rows
// that never become a deal) — a different grain than the unified
// `commission_ledger` view, which is one row per `manual_deals` record
// (Payments S0 Phase A/B). Swapping the base query for the view would silently
// drop every pipeline commission that hasn't closed into a deal yet, changing
// the pipeline/paid totals this page reports — unacceptable for a money
// ledger. So the base read stays exactly as it was; the view is used only to
// enrich each row with `discrepancy` (keyed by commission_id) when it's
// available, and the response gets an additive `ledger_source` flag. Any
// error reading the view (including "relation does not exist" before Cesar
// applies the Phase A migration) degrades to `ledger_source: 'fallback'` with
// `discrepancy: false` on every row — never a 500.
export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, rows: [], totals: { pipeline: 0, billed_due: 0, paid: 0 }, ledger_source: 'fallback' as LedgerSource });

  const db = getSupabaseClient({ admin: true });
  const { data: coms } = await db.from('commissions')
    .select('id, quote_request_id, vendor_id, quote_amount, final_amount, commission_amount, effective_rate, status, invoice_number, billed_at, due_date, paid_at, protected_until, created_at')
    .order('created_at', { ascending: false }).limit(500);
  const rows = coms || [];

  const qrIds = rows.map((r) => r.quote_request_id);
  const vIds = Array.from(new Set(rows.map((r) => r.vendor_id)));
  const ids = rows.map((r) => r.id as string);
  const [qrRes, vRes, ledgerRes] = await Promise.all([
    qrIds.length ? db.from('quote_requests').select('id, public_ref, company, buyer_decision').in('id', qrIds) : Promise.resolve({ data: [] }),
    vIds.length ? db.from('vendor_profiles').select('id, company_name').in('id', vIds) : Promise.resolve({ data: [] }),
    ids.length
      ? db.from('commission_ledger').select('commission_id, discrepancy').in('commission_id', ids)
      : db.from('commission_ledger').select('commission_id, discrepancy').limit(1),
  ]);
  const qrs = new Map<string, { public_ref: string; company: string | null; buyer_decision: string | null }>();
  for (const q of qrRes.data || []) qrs.set(q.id as string, { public_ref: q.public_ref as string, company: (q.company as string) || null, buyer_decision: (q.buyer_decision as string) || null });
  const vendors = new Map<string, string>();
  for (const v of vRes.data || []) vendors.set(v.id as string, v.company_name as string);

  const ledgerSource: LedgerSource = isLedgerUnavailable(ledgerRes.error) ? 'fallback' : 'view';
  if (isLedgerUnavailable(ledgerRes.error)) {
    console.warn('[admin/commissions] commission_ledger view unavailable, discrepancy defaults to false:', ledgerRes.error?.message);
  }
  const discrepancyByCommissionId = new Map<string, boolean>();
  if (ledgerSource === 'view') {
    for (const lr of ledgerRes.data || []) {
      if (lr.commission_id) discrepancyByCommissionId.set(lr.commission_id as string, Boolean(lr.discrepancy));
    }
  }

  const enriched = rows.map((r) => ({
    ...r,
    ref: qrs.get(r.quote_request_id as string)?.public_ref || '—',
    buyer_company: qrs.get(r.quote_request_id as string)?.company || '—',
    vendor_name: vendors.get(r.vendor_id as string) || '—',
    discrepancy: discrepancyByCommissionId.get(r.id as string) || false,
  }));

  const sum = (f: (r: typeof rows[number]) => boolean) =>
    Math.round(rows.filter(f).reduce((s, r) => s + Number(r.commission_amount || 0), 0) * 100) / 100;
  const totals = {
    pipeline: sum((r) => r.status === 'quoted' || r.status === 'accepted'),
    billed_due: sum((r) => r.status === 'won' && !r.paid_at),
    paid: sum((r) => r.status === 'paid' || !!r.paid_at),
  };
  return NextResponse.json({ ok: true, rows: enriched, totals, ledger_source: ledgerSource });
}

// Find the manual_deals row this commission is linked to — commission_id
// back-link first, falling back to the same source_quote_id join the
// accept-path dedupe already relies on — and apply `patch` to it, so
// manual_deals stays the single settlement ledger (Payments S0 Phase C, see
// workplace/plans/payments-s0-ledger-merge-plan.md §7). Guards against
// clobbering an exception status (disputed/credited/cancelled) that only an
// explicit admin/deals action should change. Never throws: the caller
// already succeeded in settling `commissions`, which must not be undone by
// a problem mirroring onto manual_deals — recording the settlement always
// wins over linking it.
async function settleLinkedManualDeal(
  db: SupabaseClient,
  params: { commissionId: string; quoteRequestId: string | null; patch: DealSettlementPatch },
): Promise<{ updated: boolean; error: string | null }> {
  const { commissionId, quoteRequestId, patch } = params;
  try {
    let dealData: { id: string; status: string } | null = null;
    let lookupError: { message: string } | null = null;

    const byCommission = await db.from('manual_deals').select('id, status').eq('commission_id', commissionId).maybeSingle();
    if (byCommission.error && isMissingColumnError(byCommission.error)) {
      console.warn('[admin/commissions] manual_deals.commission_id not available yet, looking up by source_quote_id instead:', byCommission.error.message);
      if (quoteRequestId) {
        const bySource = await db.from('manual_deals').select('id, status').eq('source_quote_id', quoteRequestId).maybeSingle();
        dealData = bySource.data as { id: string; status: string } | null;
        lookupError = bySource.error;
      }
    } else if (byCommission.error) {
      lookupError = byCommission.error;
    } else if (byCommission.data) {
      dealData = byCommission.data as { id: string; status: string };
    } else if (quoteRequestId) {
      // Column exists but no row is linked via commission_id yet (predates
      // the backfill, or the backfill hasn't run) — same fallback key.
      const bySource = await db.from('manual_deals').select('id, status').eq('source_quote_id', quoteRequestId).maybeSingle();
      dealData = bySource.data as { id: string; status: string } | null;
      lookupError = bySource.error;
    }

    if (lookupError) return { updated: false, error: lookupError.message };
    if (!dealData) return { updated: false, error: null }; // no linked deal — normal for pipeline-only commissions
    if (isProtectedDealStatus(dealData.status)) {
      console.warn(`[admin/commissions] not overwriting manual_deals ${dealData.id} — status is protected (${dealData.status})`);
      return { updated: false, error: null };
    }
    const { error: updateError } = await db.from('manual_deals').update(patch).eq('id', dealData.id);
    if (updateError) return { updated: false, error: updateError.message };
    return { updated: true, error: null };
  } catch (e) {
    return { updated: false, error: e instanceof Error ? e.message : 'unknown error settling linked deal' };
  }
}

export async function PATCH(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });
  let body: { id?: string; action?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ ok: false, message: 'id is required' }, { status: 400 });

  const db = getSupabaseClient({ admin: true });
  const action: SettlementAction = body.action === 'mark_unpaid' ? 'mark_unpaid' : 'mark_paid';
  const nowIso = new Date().toISOString();
  const patch = action === 'mark_unpaid'
    ? { paid_at: null, status: 'won', updated_at: nowIso }
    : { paid_at: nowIso, status: 'paid', updated_at: nowIso };
  const { data: commissionRow, error } = await db.from('commissions').update(patch).eq('id', id).select('quote_request_id').maybeSingle();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  // Payments S0 Phase C: mirror this settlement onto the linked manual_deals
  // row so it isn't tracked twice. Additive only — never fails the request;
  // the commissions-side settlement above already succeeded and that
  // existing, load-bearing behavior must not regress.
  const dealPatch = buildDealSettlementPatch(action, nowIso);
  const dealSync = await settleLinkedManualDeal(db, {
    commissionId: id,
    quoteRequestId: (commissionRow?.quote_request_id as string) || null,
    patch: dealPatch,
  });
  if (dealSync.error) console.warn('[admin/commissions] could not mirror settlement onto manual_deals:', dealSync.error);

  return NextResponse.json({ ok: true, deal_settled: dealSync.updated });
}
