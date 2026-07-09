// GET  /api/vendor/agreement — the current terms + whether I've accepted them
// POST /api/vendor/agreement — record MY acceptance of the current terms version
// Revenue protection (build step 1): a vendor must accept before publishing.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';
import { VENDOR_TERMS, VENDOR_TERMS_VERSION, VENDOR_TERMS_SUMMARY } from '@/lib/vendor/terms';

export async function GET() {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  const payload = { version: VENDOR_TERMS_VERSION, summary: VENDOR_TERMS_SUMMARY, terms: VENDOR_TERMS };
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, accepted: false, ...payload });

  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });
  const db = getSupabaseClient({ admin: true });
  const { data } = await db.from('vendor_profiles').select('terms_accepted_version, terms_accepted_at').eq('id', vendor.id).maybeSingle();
  const accepted = data?.terms_accepted_version === VENDOR_TERMS_VERSION;
  return NextResponse.json({ ok: true, accepted, accepted_version: data?.terms_accepted_version || null, accepted_at: data?.terms_accepted_at || null, ...payload });
}

export async function POST() {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, degraded: true, accepted: true });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  const { error } = await db.from('vendor_profiles')
    .update({ terms_accepted_version: VENDOR_TERMS_VERSION, terms_accepted_at: new Date().toISOString() })
    .eq('id', vendor.id).eq('auth_id', session.authId);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, accepted: true, version: VENDOR_TERMS_VERSION });
}
