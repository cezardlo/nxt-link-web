// POST /api/buyer/quote-decision {quote_request_id, decision:'accepted'|'declined'}
// The buyer accepts or declines a vendor's quote INSIDE NXT//LINK. Scoped to the
// buyer's own (verified) email; updates the opportunity and its commission.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getBuyerSession } from '@/lib/buyer/auth';
import { notifyVendor } from '@/lib/notify';
import { sendMail } from '@/lib/mail';
import { calculateFee, PROTECTION_MONTHS } from '@/lib/fees/engine';
import { isMissingColumnError, omitCommissionId } from '@/lib/admin/commission-ledger';

function likeLiteral(v: string): string { return v.replace(/[\\%_]/g, (c) => `\\${c}`); }

export async function POST(req: Request) {
  const session = await getBuyerSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!session.email || !session.emailConfirmed) return NextResponse.json({ ok: false, message: 'Verify your email first' }, { status: 403 });

  let body: { quote_request_id?: string; decision?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const id = String(body.quote_request_id || '');
  const decision = body.decision === 'accepted' ? 'accepted' : body.decision === 'declined' ? 'declined' : '';
  if (!id || !decision) return NextResponse.json({ ok: false, message: 'quote_request_id and a valid decision are required' }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  const db = getSupabaseClient({ admin: true });
  // The opportunity must belong to THIS buyer (matched by verified email) and have a quote.
  const { data: opp } = await db.from('quote_requests')
    .select('id, vendor_id, quote_amount, quote_timeline, public_ref, opportunity_ref, company')
    .eq('id', id).ilike('email', likeLiteral(session.email)).maybeSingle();
  if (!opp) return NextResponse.json({ ok: false, message: 'Quote not found' }, { status: 404 });
  if (opp.quote_amount == null) return NextResponse.json({ ok: false, message: 'This request has no quote yet' }, { status: 400 });

  const now = new Date().toISOString();
  await db.from('quote_requests').update({
    buyer_decision: decision,
    status: decision === 'accepted' ? 'won' : 'lost',
    updated_at: now,
  }).eq('id', id);
  // Capture the linked commissions row's id so an accepted quote's draft
  // deal can be stamped with commission_id below (Payments S0 Phase C —
  // one deal ledger, see workplace/plans/payments-s0-ledger-merge-plan.md §7).
  const { data: commissionRow } = await db.from('commissions').update({
    status: decision === 'accepted' ? 'accepted' : 'lost',
    updated_at: now,
  }).eq('quote_request_id', id).select('id').maybeSingle();

  // Tell the vendor the buyer's decision.
  await notifyVendor(db, opp.vendor_id as string, id, 'decision', `Buyer ${decision} your quote (${opp.public_ref})`);
  const { data: v } = await db.from('vendor_profiles').select('email, company_name').eq('id', opp.vendor_id).maybeSingle();

  // Accepted quote → drop a draft deal into the admin tracker (once per quote),
  // so the money loop is connected: the operator just confirms and collects.
  if (decision === 'accepted' && opp.quote_amount != null) {
    const { data: existing } = await db.from('manual_deals').select('id').eq('source_quote_id', id).maybeSingle();
    if (!existing) {
      const net = Number(opp.quote_amount);
      const fee = calculateFee(net);
      const protectedUntil = new Date();
      protectedUntil.setMonth(protectedUntil.getMonth() + PROTECTION_MONTHS);
      const dealRow: Record<string, unknown> = {
        source_quote_id: id,
        vendor_id: opp.vendor_id,
        vendor_name: (v?.company_name as string) || 'Vendor',
        buyer_company: (opp.company as string) || null,
        description: `Auto-created from accepted quote ${opp.public_ref}`,
        net_amount: net,
        currency: 'USD',
        fee_policy_version: fee.policyVersion,
        commission_amount: fee.fee,
        effective_rate: fee.effectiveRate,
        applied_cap: fee.appliedMaximum,
        status: 'won',
        opportunity_ref: (opp.opportunity_ref as string) || null,
        protected_until: protectedUntil.toISOString().slice(0, 10),
      };
      const linkedCommissionId = commissionRow?.id as string | undefined;
      if (linkedCommissionId) dealRow.commission_id = linkedCommissionId;

      const { error: dealInsertError } = await db.from('manual_deals').insert(dealRow).select('id').maybeSingle();
      // Deploy-order safety: manual_deals.commission_id may not exist yet on
      // the live database. Recording the deal always wins over linking it —
      // retry the identical insert without the link column rather than lose
      // the deal (this insert was already best-effort/fire-and-forget before
      // Phase C; it still never blocks the buyer's accept response).
      if (dealInsertError && linkedCommissionId && isMissingColumnError(dealInsertError)) {
        console.warn('[buyer/quote-decision] manual_deals.commission_id not available yet, inserting without it:', dealInsertError.message);
        await db.from('manual_deals').insert(omitCommissionId(dealRow)).select('id').maybeSingle();
      }
    }
  }
  if (v?.email) {
    sendMail({
      to: v.email as string,
      subject: `NXT//LINK: your quote ${opp.public_ref} was ${decision}`,
      body: `The buyer ${decision} your quote (${opp.public_ref}) inside NXT//LINK.${decision === 'accepted' ? ' Continue the deal through NXT//LINK — the commission and protected period are recorded.' : ''}`,
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true, decision });
}
