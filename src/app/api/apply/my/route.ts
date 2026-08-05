// GET   /api/apply/my — signed-in vendor: fetch MY OWN application (or null)
// PATCH /api/apply/my — signed-in vendor: update MY OWN editable fields
// Status/admin_notes/approved_at can NEVER be set here (admin-only, and the
// DB trigger guard_vendor_application_update() enforces this even if this
// route were bypassed).
//
// Both verbs also mirror the application onto the vendor's live profile
// (fill-empty only, syncApplicationToVendorProfile) — the GET covers the
// moment an anonymous submission is claimed onto the account by email match.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getApplicantSession, getOwnApplication } from '@/lib/apply/auth';
import { cleanStringArray, resubmitStatusPatch, MAX_REGIONS, REGION_MAXLEN, MAX_TARGET_CUSTOMERS, TARGET_CUSTOMER_MAXLEN, cleanLaborRate, cleanMobileFee, cleanWedgeCurrency, cleanResponseTime, cleanContractTypes } from '@/lib/apply/fields';
import { syncApplicationToVendorProfile } from '@/lib/apply/profile-sync';

const CATEGORIES = ['TMS', 'WMS', 'Telematics/ELD', 'Forklifts', 'Customs/Cross-Border', 'Cold Chain', 'Robotics', 'Other'];
const OFFERING_TYPES = ['Product', 'Software / platform', 'Service', 'Innovation / frontier tool'];
const LOGO_BUCKET = 'vendor-logos';
const IMG_BUCKET = 'vendor-product-images';
const MAX_STAGES = 12;

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

  // The application may have just been claimed onto this account by email
  // match — mirror its facts onto the vendor profile either way (fill-empty).
  await syncApplicationToVendorProfile(db, session, app);

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
  str('company_name'); str('contact_name'); str('phone'); str('price_range', 100);
  str('company_size', 100);
  str('problem_solved', 2000);
  if (typeof body.category === 'string' && CATEGORIES.includes(body.category)) patch.category = body.category;

  const offeringTypes = cleanStringArray(body.offering_types, OFFERING_TYPES.length, 60)?.filter((v) => OFFERING_TYPES.includes(v));
  if (offeringTypes) patch.offering_types = offeringTypes;
  const stages = cleanStringArray(body.supply_chain_stages, MAX_STAGES, 80);
  if (stages) patch.supply_chain_stages = stages;

  // Multi-select locations + customer types (2026-08-04): prefer the array
  // fields; the legacy single strings still work and are expanded into the
  // arrays. Legacy single columns stay in sync (first value) so every
  // pre-existing reader keeps working.
  const regions = cleanStringArray(body.regions, MAX_REGIONS, REGION_MAXLEN);
  if (regions) {
    patch.regions = regions;
    patch.region = regions[0] || '';
  } else if (typeof body.region === 'string') {
    const r = body.region.slice(0, 100).trim();
    patch.region = r;
    patch.regions = r ? [r] : [];
  }
  const customers = cleanStringArray(body.target_customers, MAX_TARGET_CUSTOMERS, TARGET_CUSTOMER_MAXLEN);
  if (customers) {
    patch.target_customers = customers;
    patch.target_customer = customers[0] || '';
  } else if (typeof body.target_customer === 'string') {
    const c = body.target_customer.slice(0, 500).trim();
    patch.target_customer = c;
    patch.target_customers = c ? [c] : [];
  }

  // Wedge fields (2026-08-04) — same rules as /api/apply/submit: when a wedge
  // key IS sent it must be valid (an invalid one is a 400, never silently
  // stored); an absent key leaves the stored value alone. The /apply/status
  // form always sends all four, so the required-field rule holds there too.
  if ('labor_rate' in body) {
    const v = cleanLaborRate(body.labor_rate);
    if (v == null) return NextResponse.json({ ok: false, message: 'Your hourly labor rate is required — a number, e.g. 95. / Tu tarifa por hora es obligatoria — un número, p. ej. 95.' }, { status: 400 });
    patch.labor_rate = v;
  }
  if ('labor_rate_currency' in body) patch.labor_rate_currency = cleanWedgeCurrency(body.labor_rate_currency);
  if ('mobile_fee' in body) {
    const v = cleanMobileFee(body.mobile_fee);
    if (v == null) return NextResponse.json({ ok: false, message: 'Your trip / mobilization fee is required — enter 0 if you don’t charge one. / Tu cargo por traslado es obligatorio — escribe 0 si no cobras.' }, { status: 400 });
    patch.mobile_fee = v;
  }
  if ('response_time' in body) {
    const v = cleanResponseTime(body.response_time);
    if (!v) return NextResponse.json({ ok: false, message: 'Choose how fast you can be on site. / Elige qué tan rápido puedes estar en sitio.' }, { status: 400 });
    patch.response_time = v;
  }
  if ('contract_types' in body) {
    const v = cleanContractTypes(body.contract_types);
    if (!v.length) return NextResponse.json({ ok: false, message: 'Choose at least one contract option. / Elige al menos una opción de contrato.' }, { status: 400 });
    patch.contract_types = v;
  }

  if (!Object.keys(patch).length) return NextResponse.json({ ok: false, message: 'Nothing to update' }, { status: 400 });

  // Resubmit (2026-08-04 Batch B): saving after a needs_info send-back
  // returns the SAME application to review — status flips back to 'pending',
  // no second row is created. Any other status is never touched here
  // (vendors cannot approve/reject themselves; the DB guard trigger also
  // enforces this for non-admin sessions).
  const statusPatch = resubmitStatusPatch(app.status);

  const db = getSupabaseClient({ admin: true });
  const { data, error } = await db.from('vendor_applications').update({ ...patch, ...statusPatch }).eq('id', app.id).eq('auth_id', session.authId)
    .select('id, public_ref, company_name, contact_name, email, phone, category, offering_types, supply_chain_stages, company_size, region, regions, problem_solved, target_customer, target_customers, price_range, labor_rate, labor_rate_currency, mobile_fee, response_time, contract_types, status, vendor_message')
    .single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await syncApplicationToVendorProfile(db, session, {
    company_name: (patch.company_name as string) ?? app.company_name,
    contact_name: (patch.contact_name as string) ?? app.contact_name,
    phone: (patch.phone as string) ?? app.phone,
    problem_solved: (patch.problem_solved as string) ?? app.problem_solved,
    region: (patch.region as string) ?? app.region,
    regions: (patch.regions as string[]) ?? app.regions,
    email: app.email,
  });

  return NextResponse.json({ ok: true, stored: true, application: data });
}
