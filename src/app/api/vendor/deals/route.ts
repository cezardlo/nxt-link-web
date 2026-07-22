// GET /api/vendor/deals — the signed-in vendor's deals + commission status +
// first-deal fee-credit standing. Read-only: deals are created/updated by
// NXT//LINK operators (concierge); the vendor just sees where things stand.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';
import { resolveFirstDealCredit, FIRST_DEAL_CREDIT_STANDARD } from '@/lib/fees/engine';

// Shape the vendor-facing credit banner reads. Deliberately does NOT echo the
// raw founding_vendor flag — only the resolved tier + cap the vendor may see.
function defaultCredit() {
  return { tier: 'standard' as const, cap: FIRST_DEAL_CREDIT_STANDARD, available: false, expiresAt: null as string | null };
}

export async function GET() {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, deals: [], credit: defaultCredit() });

  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  const { data: deals } = await db.from('manual_deals')
    .select('id, opportunity_ref, buyer_company, description, net_amount, commission_amount, effective_rate, is_free_credit, credit_applied, status, invoice_ref, protected_until, created_at')
    .eq('vendor_id', vendor.id).order('created_at', { ascending: false }).limit(100);

  // Tiered, one-per-company first-deal credit (DECISIONS-2026-07-21 §5):
  // standard vendors up to $250, manually-approved founding vendors up to
  // $1,250, within 90 days of signup. Resolved by the SAME engine function
  // the money path uses, so the banner can never drift from the real credit.
  const { data: prof } = await db.from('vendor_profiles')
    .select('founding_vendor, created_at, billing_status').eq('id', vendor.id).maybeSingle();
  const tier = prof?.founding_vendor ? ('founding' as const) : ('standard' as const);
  let signupAt = new Date();
  if (prof?.created_at) {
    const parsed = new Date(prof.created_at as string);
    if (!Number.isNaN(parsed.getTime())) signupAt = parsed;
  }
  const priorCreditedDeals = (deals || []).filter(
    (d) => Number(d.credit_applied) > 0 && d.status !== 'cancelled',
  ).length;
  // fee: 0 — the banner only needs the tier cap + eligibility; the actual
  // per-deal credit amount is computed on the deal itself by the engine.
  const resolved = resolveFirstDealCredit({ tier, signupAt, now: new Date(), priorCreditedDeals, fee: 0 });
  const credit = { tier, cap: resolved.cap, available: resolved.eligible, expiresAt: resolved.expiresAt.toISOString() };

  return NextResponse.json({
    ok: true,
    deals: deals || [],
    credit,
    billing_status: prof?.billing_status || 'free',
  });
}
