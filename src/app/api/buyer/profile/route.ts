// GET   /api/buyer/profile — get (or create) MY buyer profile
// PATCH /api/buyer/profile — update MY profile (company, name, position,
//        industry, city, phone, employee_count, service_locations). Scoped
//        to the buyer's own verified email.
//
// employee_count + service_locations (2026-07-30 buyer progressive-
// enrichment card, workplace/plans/matching-and-onboarding-2026-07-30.md):
// both columns already existed on buyer_profiles (zero migration) but were
// never read/written by this route — wiring them in here is the ONE save
// path for the new card, /buyer/profile, and any future caller alike.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getBuyerSession } from '@/lib/buyer/auth';

const COLS = 'id, buyer_email, company_name, contact_name, position, industry, city, phone, logo_path, employee_count, service_locations';
const MAX_SERVICE_LOCATIONS = 8;

export async function GET() {
  const session = await getBuyerSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!session.email || !session.emailConfirmed) return NextResponse.json({ ok: true, verified: false, profile: null });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, verified: true, profile: null });

  const db = getSupabaseClient({ admin: true });
  let { data: profile } = await db.from('buyer_profiles').select(COLS).eq('buyer_email', session.email).maybeSingle();
  if (!profile) {
    const { data: created } = await db.from('buyer_profiles').insert({ buyer_email: session.email }).select(COLS).maybeSingle();
    profile = created || null;
  }
  let logo_url: string | null = null;
  if (profile?.logo_path) {
    const { data: signed } = await db.storage.from('vendor-logos').createSignedUrl(profile.logo_path as string, 3600);
    logo_url = signed?.signedUrl || null;
  }
  return NextResponse.json({ ok: true, verified: true, profile, logo_url });
}

export async function PATCH(req: Request) {
  const session = await getBuyerSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!session.email || !session.emailConfirmed) return NextResponse.json({ ok: false, message: 'Verify your email first' }, { status: 403 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const str = (k: string, max = 200) => { if (typeof body[k] === 'string') patch[k] = (body[k] as string).trim().slice(0, max) || null; };
  str('company_name'); str('contact_name'); str('position', 120); str('industry', 120); str('city', 120); str('phone', 60);
  str('employee_count', 60);
  if (Array.isArray(body.service_locations)) {
    patch.service_locations = (body.service_locations as unknown[])
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .map((v) => v.trim().slice(0, 120))
      .slice(0, MAX_SERVICE_LOCATIONS);
  }

  const db = getSupabaseClient({ admin: true });
  const { data, error } = await db.from('buyer_profiles')
    .upsert({ buyer_email: session.email, ...patch }, { onConflict: 'buyer_email' })
    .select(COLS).single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, profile: data });
}
