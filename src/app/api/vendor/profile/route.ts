// GET   /api/vendor/profile — signed-in vendor: get (or auto-create) my profile
// PATCH /api/vendor/profile — signed-in vendor: update MY OWN profile fields
// Every operation is scoped by the caller's session — never a client-supplied id.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';

export async function GET() {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, degraded: true, vendor: null, brochures: [], videos: [] });

  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Could not load profile' }, { status: 500 });

  const db = getSupabaseClient({ admin: true });
  const [{ data: brochureRows }, { data: videoRows }, { data: caseRows }, { data: logoRow }] = await Promise.all([
    db.from('vendor_brochures').select('id, file_name, storage_path, title, size_bytes, uploaded_at').eq('vendor_id', vendor.id).order('uploaded_at', { ascending: false }),
    db.from('vendor_videos').select('id, title, url, embed_url, provider, created_at').eq('vendor_id', vendor.id).order('created_at', { ascending: false }),
    db.from('vendor_case_studies').select('id, title, challenge, solution, result, sort_order, created_at').eq('vendor_id', vendor.id).order('sort_order').order('created_at'),
    db.from('vendor_profiles').select('logo_path, achievements, banner_path, tagline').eq('id', vendor.id).maybeSingle(),
  ]);

  const BUCKET = 'vendor-brochures';
  const brochures = await Promise.all((brochureRows || []).map(async (b) => {
    const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(b.storage_path, 3600);
    return { ...b, public_url: signed?.signedUrl || null };
  }));

  let logo_url: string | null = null;
  if (logoRow?.logo_path) {
    const { data: signed } = await db.storage.from('vendor-logos').createSignedUrl(logoRow.logo_path as string, 3600);
    logo_url = signed?.signedUrl || null;
  }
  let banner_url: string | null = null;
  if (logoRow?.banner_path) {
    const { data: signed } = await db.storage.from('vendor-logos').createSignedUrl(logoRow.banner_path as string, 3600);
    banner_url = signed?.signedUrl || null;
  }

  return NextResponse.json({
    ok: true, stored: true,
    vendor: { ...vendor, achievements: (logoRow?.achievements as string[]) || [], tagline: (logoRow?.tagline as string) || null },
    brochures, videos: videoRows || [], case_studies: caseRows || [], logo_url, banner_url,
  });
}

export async function PATCH(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }

  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, degraded: true });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const patch: Record<string, unknown> = {};
  const str = (k: string, max = 300) => { if (typeof body[k] === 'string') patch[k] = (body[k] as string).slice(0, max); };
  const arr = (k: string, max = 20, maxLen = 160) => {
    if (Array.isArray(body[k])) patch[k] = (body[k] as unknown[]).map((v) => String(v).trim().slice(0, maxLen)).filter(Boolean).slice(0, max);
  };
  const bool = (k: string) => { if (typeof body[k] === 'boolean') patch[k] = body[k]; };
  const int = (k: string, min: number, max: number) => {
    if (body[k] === null) { patch[k] = null; return; }
    const n = Number(body[k]);
    if (Number.isInteger(n) && n >= min && n <= max) patch[k] = n;
  };
  str('company_name'); str('contact_name'); str('phone'); str('website'); str('city');
  str('description', 4000); str('tagline', 160);
  arr('categories', 30); arr('service_areas'); arr('industries'); arr('client_types');
  if (Array.isArray(body.achievements)) patch.achievements = (body.achievements as string[]).map((a) => String(a).slice(0, 160)).slice(0, 12);

  // Company profile template fields (Overview + Expertise + quick facts).
  int('year_founded', 1800, new Date().getFullYear());
  int('projects_completed', 0, 1000000);
  str('employee_count', 40); str('company_type', 60); str('response_time', 60);
  str('cta_label', 40); str('brand_color', 20);
  arr('languages', 10, 40);
  arr('main_expertise', 5, 80); // spec: at most five primary areas
  arr('problems_solved', 20, 120);
  arr('capabilities', 20, 120);
  arr('offering_families', 4, 20);
  arr('visible_tabs', 12, 20);
  bool('emergency_available'); bool('cross_border'); bool('installation_available'); bool('pilot_available');

  if (!Object.keys(patch).length) return NextResponse.json({ ok: false, message: 'Nothing to update' }, { status: 400 });

  const db = getSupabaseClient({ admin: true });
  const { data, error } = await db.from('vendor_profiles').update(patch).eq('id', vendor.id).eq('auth_id', session.authId)
    .select('*')
    .single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, stored: true, vendor: data });
}
