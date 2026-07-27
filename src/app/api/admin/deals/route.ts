// Internal concierge deal tracker + commission calculator. Admin-only.
// GET   — list manual deals (newest first)
// POST  — create a deal; the fee engine computes commission from the NET amount
//         (4% first $50k, 2% above, $20k cap), applies the first-deal 50%
//         discount if flagged, and stamps the 12-month protection window.
// PATCH — update status (won → payment_confirmed → invoiced → paid …) / invoice ref.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isAdminRequest } from '@/lib/assistant/auth';
import { calculateFee, DEFAULT_FEE_POLICY, firstDealDiscountAmount, FIRST_DEAL_DISCOUNT_RATE, PROTECTION_MONTHS } from '@/lib/fees/engine';
import { effectiveModeration, MODERATION_LABEL } from '@/lib/vendor/moderation';
import { LEDGER_DEAL_COLUMNS, isLedgerUnavailable, isMissingColumnError, mapLedgerRowToDeal, omitCommissionId, type LedgerDealRow, type LedgerSource } from '@/lib/admin/commission-ledger';

// GET reads from the unified `commission_ledger` view (Payments S0 Phase B) so
// this page and /api/admin/commissions share one source of truth. The view
// doesn't exist on live until Cesar applies the Phase A migration, so a
// missing-relation (or any) error falls back to the exact pre-ledger read —
// `select('*') from manual_deals` — verbatim. `ledger_source` tells the caller
// which path served the response; `discrepancy` is additive (false in
// fallback, since there's nothing to compare without the view).
export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Admin only' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, deals: [], policy: DEFAULT_FEE_POLICY, ledger_source: 'fallback' as LedgerSource });
  const db = getSupabaseClient({ admin: true });

  const { data: viewRows, error: viewError } = await db
    .from('commission_ledger')
    .select(LEDGER_DEAL_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(200);

  let deals: Record<string, unknown>[];
  let ledgerSource: LedgerSource;
  if (isLedgerUnavailable(viewError)) {
    console.warn('[admin/deals] commission_ledger view unavailable, falling back to manual_deals:', viewError?.message);
    const { data } = await db.from('manual_deals').select('*').order('created_at', { ascending: false }).limit(200);
    deals = (data || []).map((d) => ({ ...d, discrepancy: false }));
    ledgerSource = 'fallback';
  } else {
    deals = (viewRows as unknown as LedgerDealRow[] || []).map(mapLedgerRowToDeal);
    ledgerSource = 'view';
  }

  return NextResponse.json({ ok: true, deals, policy: { version: DEFAULT_FEE_POLICY.version, brackets: DEFAULT_FEE_POLICY.brackets, cap: DEFAULT_FEE_POLICY.maximumFee, first_deal_discount_rate: FIRST_DEAL_DISCOUNT_RATE, protection_months: PROTECTION_MONTHS }, ledger_source: ledgerSource });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Admin only' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }

  const vendorName = typeof body.vendor_name === 'string' ? body.vendor_name.trim().slice(0, 200) : '';
  const net = Number(body.net_amount);
  if (!vendorName) return NextResponse.json({ ok: false, message: 'Vendor name required' }, { status: 400 });
  if (!Number.isFinite(net) || net <= 0) return NextResponse.json({ ok: false, message: 'Enter a valid net amount' }, { status: 400 });

  const fee = calculateFee(net);
  const isFirstDeal = Boolean(body.is_free_credit);
  // First-deal benefit = 50% off the already-capped fee, via the shared engine
  // helper (firstDealDiscountAmount) — the SAME 50% the vendor side shows, so
  // the two can never diverge (this is the old $1,250-vs-$250 mismatch, gone).
  const creditApplied = isFirstDeal ? firstDealDiscountAmount(fee.fee) : 0;
  const commission = Math.round((fee.fee - creditApplied) * 100) / 100;

  const s = (k: string, max = 300): string | null =>
    typeof body[k] === 'string' && (body[k] as string).trim() ? (body[k] as string).trim().slice(0, max) : null;

  const protectedUntil = new Date();
  protectedUntil.setMonth(protectedUntil.getMonth() + PROTECTION_MONTHS);

  // Optional: when this POST is confirming a draft that traces back to a
  // specific accepted quote (Payments S0 Phase C — see
  // workplace/plans/payments-s0-ledger-merge-plan.md §7), carry that link
  // through so it dedupes against /api/buyer/quote-decision's auto-created
  // draft rather than doubling it.
  const sourceQuoteId = s('source_quote_id', 100);

  const row: Record<string, unknown> = {
    opportunity_ref: s('opportunity_ref', 40),
    vendor_id: s('vendor_id', 60),
    vendor_name: vendorName,
    buyer_name: s('buyer_name', 200),
    buyer_company: s('buyer_company', 200),
    description: s('description', 1000),
    gross_amount: Number.isFinite(Number(body.gross_amount)) ? Number(body.gross_amount) : null,
    net_amount: net,
    currency: (s('currency', 8) || 'USD').toUpperCase(),
    fee_policy_version: fee.policyVersion,
    commission_amount: commission,
    effective_rate: net > 0 ? Math.round((commission / net) * 10000) / 10000 : 0,
    applied_cap: fee.appliedMaximum,
    is_free_credit: isFirstDeal,
    credit_applied: creditApplied || null,
    status: 'reserved',
    protected_until: protectedUntil.toISOString().slice(0, 10),
    notes: s('notes', 1000),
    source_quote_id: sourceQuoteId,
  };

  const db = getSupabaseClient({ admin: true });

  // A suspended or banned vendor can't have new deals logged against them.
  if (row.vendor_id) {
    const { data: mod } = await db.from('vendor_profiles')
      .select('moderation_status, suspended_until').eq('id', row.vendor_id as string).maybeSingle();
    if (mod) {
      const eff = effectiveModeration(mod);
      if (eff !== 'active') {
        return NextResponse.json({ ok: false, code: 'vendor_restricted',
          message: `This vendor is ${MODERATION_LABEL[eff].toLowerCase()} — you can’t log a new deal for them. Reactivate them first if this is resolved.` }, { status: 409 });
      }
    }
  }

  // Dedupe on source_quote_id: an accepted quote already has (or is about to
  // get) exactly one manual_deals row via /api/buyer/quote-decision. Never
  // create a second deal for the same quote — hand back the existing one.
  if (sourceQuoteId) {
    const { data: existingDeal } = await db.from('manual_deals').select('*').eq('source_quote_id', sourceQuoteId).maybeSingle();
    if (existingDeal) return NextResponse.json({ ok: true, deal: existingDeal, breakdown: fee.lines, deduped: true });
  }

  // Stamp the link to the quote-stage commissions row when we have one, so
  // this write path keeps commission_id current the same way the accept
  // path does. Optional and best-effort by design (an operator-typed deal
  // with no quote never has one).
  let linkedCommissionId: string | null = null;
  if (sourceQuoteId) {
    const { data: commissionRow } = await db.from('commissions').select('id').eq('quote_request_id', sourceQuoteId).maybeSingle();
    linkedCommissionId = (commissionRow?.id as string) || null;
    if (linkedCommissionId) row.commission_id = linkedCommissionId;
  }

  const { data, error } = await db.from('manual_deals').insert(row).select('*').single();

  // Deploy-order safety: manual_deals.commission_id may not exist yet on the
  // live database. Recording the deal always wins over linking it — retry
  // the identical insert without the link column rather than fail the write.
  if (error && linkedCommissionId && isMissingColumnError(error)) {
    console.warn('[admin/deals] manual_deals.commission_id not available yet, inserting without it:', error.message);
    const retry = await db.from('manual_deals').insert(omitCommissionId(row)).select('*').single();
    if (retry.error) return NextResponse.json({ ok: false, message: retry.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deal: retry.data, breakdown: fee.lines });
  }

  if (error) {
    // Unique-violation race: another request inserted the same
    // source_quote_id between our dedupe check above and this insert.
    // Treat it the same as the pre-check dedupe — hand back the row that
    // won the race instead of a 500.
    if (sourceQuoteId && (error as { code?: string }).code === '23505') {
      const { data: raced } = await db.from('manual_deals').select('*').eq('source_quote_id', sourceQuoteId).maybeSingle();
      if (raced) return NextResponse.json({ ok: true, deal: raced, breakdown: fee.lines, deduped: true });
    }
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deal: data, breakdown: fee.lines });
}

const STATUSES = ['reserved', 'won', 'payment_reported', 'payment_confirmed', 'invoiced', 'paid', 'overdue', 'disputed', 'credited', 'cancelled'];

export async function PATCH(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, message: 'Admin only' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ ok: false, message: 'id required' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (STATUSES.includes(String(body.status))) patch.status = String(body.status);
  if (typeof body.invoice_ref === 'string') patch.invoice_ref = body.invoice_ref.trim().slice(0, 80) || null;
  if (body.status === 'paid') patch.paid_at = new Date().toISOString();
  if (!Object.keys(patch).length) return NextResponse.json({ ok: false, message: 'Nothing to update' }, { status: 400 });

  const db = getSupabaseClient({ admin: true });
  const { data, error } = await db.from('manual_deals').update(patch).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, deal: data });
}
