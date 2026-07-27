// GET /api/vendor/deals — the signed-in vendor's deals + commission status +
// first-deal discount standing. Read-only: deals are created/updated by
// NXT//LINK operators (concierge); the vendor just sees where things stand.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';
import { resolveFirstDealDiscount, FIRST_DEAL_DISCOUNT_RATE } from '@/lib/fees/engine';

// Shape the vendor-facing first-deal-discount banner reads. The benefit is a
// flat 50% off the first eligible deal — no tier, no dollar cap to diverge on.
function defaultCredit() {
  return { rate: FIRST_DEAL_DISCOUNT_RATE, available: false, expiresAt: null as string | null };
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

  // One-per-company first-deal DISCOUNT (Cesar's ruling 2026-07-27): a vendor's
  // first eligible closed deal gets 50% off the NXT//LINK fee, within 90 days of
  // signup, one per company. Resolved by the SAME engine function the money path
  // uses, so the banner can never drift from the real discount.
  const { data: prof } = await db.from('vendor_profiles')
    .select('created_at, billing_status').eq('id', vendor.id).maybeSingle();
  let signupAt = new Date();
  if (prof?.created_at) {
    const parsed = new Date(prof.created_at as string);
    if (!Number.isNaN(parsed.getTime())) signupAt = parsed;
  }
  const priorDiscountedDeals = (deals || []).filter(
    (d) => Number(d.credit_applied) > 0 && d.status !== 'cancelled',
  ).length;
  // fee: 0 — the banner only needs eligibility + window; the actual per-deal
  // discount amount is computed on the deal itself by the engine.
  const resolved = resolveFirstDealDiscount({ signupAt, now: new Date(), priorDiscountedDeals, fee: 0 });
  const credit = { rate: FIRST_DEAL_DISCOUNT_RATE, available: resolved.eligible, expiresAt: resolved.expiresAt.toISOString() };

  return NextResponse.json({
    ok: true,
    deals: deals || [],
    credit,
    billing_status: prof?.billing_status || 'free',
  });
}
