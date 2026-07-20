// GET /api/vendor/deals — the signed-in vendor's deals + commission status +
// free-deal credits remaining. Read-only: deals are created/updated by NXT//LINK
// operators (concierge); the vendor just sees where things stand.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';

export async function GET() {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, deals: [], credits: { remaining: 2, reserved: 0, used: 0 } });

  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  const { data: deals } = await db.from('manual_deals')
    .select('id, opportunity_ref, buyer_company, description, net_amount, commission_amount, effective_rate, is_free_credit, status, invoice_ref, protected_until, created_at')
    .eq('vendor_id', vendor.id).order('created_at', { ascending: false }).limit(100);

  // Free-deal credits: how many of the two intro credits remain.
  const { data: prof } = await db.from('vendor_profiles').select('free_deals_reserved, free_deals_used, billing_status').eq('id', vendor.id).maybeSingle();
  const reserved = Number(prof?.free_deals_reserved || 0);
  const used = Number(prof?.free_deals_used || 0);
  const remaining = Math.max(0, 2 - Math.max(reserved, used));

  return NextResponse.json({
    ok: true,
    deals: deals || [],
    credits: { remaining, reserved, used },
    billing_status: prof?.billing_status || 'free',
  });
}
