// GET   /api/apply/my — signed-in vendor: fetch MY OWN application (or null)
// PATCH /api/apply/my — signed-in vendor: update MY OWN editable fields
// Status/admin_notes/approved_at can NEVER be set here (admin-only, and the
// DB trigger guard_vendor_application_update() enforces this even if this
// route were bypassed).

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getApplicantSession, getOwnApplication } from '@/lib/apply/auth';

const CATEGORIES = ['TMS', 'WMS', 'Telematics/ELD', 'Forklifts', 'Customs/Cross-Border', 'Cold Chain', 'Robotics', 'Other'];
const OFFERING_TYPES = ['Product', 'Software / platform', 'Service', 'Innovation / frontier tool'];
const LOGO_BUCKET = 'vendor-logos';
const IMG_BUCKET = 'vendor-product-images';
const MAX_STAGES = 12;

function cleanStringArray(values: unknown, max: number, maxLen: number): string[] | undefined {
  if (!Array.isArray(values)) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    if (typeof raw !== 'string') continue;
    const v = raw.trim().slice(0, maxLen);
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

export async function GET() {
  const session = await getApplicantSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, degraded: true, application: null });

  const app = await getOwnApplication(session);
  if (!app) return NextResponse.json({ ok: true, stored: true, application: null });

  const db = getSupabaseClient({ admin: true });
  let logo_url: string | null = null;
  if (app.logo_path) {
    const { data } = await db.storage.from(LOGO_BUCKET).createSignedUrl(app.logo_path, 3600);
    logo_url = data?.signedUrl || null;
  }
  const image_urls: string[] = [];
  for (const p of app.product_image_paths || []) {
    const { data } = await db.storage.from(IMG_BUCKET).createSignedUrl(p, 3600);
    if (data?.signedUrl) image_urls.push(data.signedUrl);
  }

  return NextResponse.json({ ok: true, stored: true, application: { ...app, logo_url, image_urls } });
}

export async function PATCH(req: Request) {
  const session = await getApplicantSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }

  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, degraded: true });
  const app = await getOwnApplication(session);
  if (!app) return NextResponse.json({ ok: false, message: 'No application found — apply first' }, { status: 404 });

  const patch: Record<string, unknown> = {};
  const str = (k: string, max = 300) => { if (typeof body[k] === 'string') patch[k] = (body[k] as string).slice(0, max); };
  str('company_name'); str('contact_name'); str('phone'); str('target_customer'); str('price_range', 100);
  str('company_size', 100); str('region', 100);
  str('problem_solved', 2000);
  if (typeof body.category === 'string' && CATEGORIES.includes(body.category)) patch.category = body.category;

  const offeringTypes = cleanStringArray(body.offering_types, OFFERING_TYPES.length, 60)?.filter((v) => OFFERING_TYPES.includes(v));
  if (offeringTypes) patch.offering_types = offeringTypes;
  const stages = cleanStringArray(body.supply_chain_stages, MAX_STAGES, 80);
  if (stages) patch.supply_chain_stages = stages;

  if (!Object.keys(patch).length) return NextResponse.json({ ok: false, message: 'Nothing to update' }, { status: 400 });

  const db = getSupabaseClient({ admin: true });
  const { data, error } = await db.from('vendor_applications').update(patch).eq('id', app.id).eq('auth_id', session.authId)
    .select('id, public_ref, company_name, contact_name, email, phone, category, offering_types, supply_chain_stages, company_size, region, problem_solved, target_customer, price_range, status')
    .single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, stored: true, application: data });
}
