// POST /api/apply/submit
// Public vendor intake. Anyone can submit (no login required). If the caller
// happens to be signed in already, the application is tagged to their
// account automatically. Nothing here is ever readable by the public —
// only an authenticated admin (or the vendor's own account, once linked)
// can read it back. Accepts multipart form-data so logo/images can be
// attached in the same request.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getApplicantSession } from '@/lib/apply/auth';
import { recordLegalAcceptance, LEGAL_MSG, bilingual } from '@/lib/legal/acceptance';
import { notifyAdminsNewVendorApplication } from '@/lib/admin/notify';

const CATEGORIES = ['TMS', 'WMS', 'Telematics/ELD', 'Forklifts', 'Customs/Cross-Border', 'Cold Chain', 'Robotics', 'Other'];
const OFFERING_TYPES = ['Product', 'Software / platform', 'Service', 'Innovation / frontier tool'];
const LOGO_BUCKET = 'vendor-logos';
const IMG_BUCKET = 'vendor-product-images';
const MAX_BYTES = 8 * 1024 * 1024;
// No SVG: it can carry scripts and these files are re-served to admins/buyers.
const ALLOWED_IMG = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_STAGES = 12;

/** Free values allowed (the "Other" escape hatch) — just capped in length/count. */
function cleanStringArray(values: string[], max: number, maxLen: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim().slice(0, maxLen);
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, message: 'Expected multipart form-data' }, { status: 400 });
  }

  const get = (k: string) => String(form.get(k) || '').trim();

  // Anti-bot: hidden honeypot field must stay empty (fake success so bots
  // don't learn), and the form must have been open at least 1.5s.
  if (get('website_url')) return NextResponse.json({ ok: true, stored: false, public_ref: 'APP-RECEIVED' });
  const startedAt = Number(get('started_at') || 0);
  if (startedAt && Date.now() - startedAt < 1500) {
    return NextResponse.json({ ok: false, message: 'Form submitted too quickly — please try again' }, { status: 400 });
  }

  const company_name = get('company_name');
  const email = get('email');
  const category = get('category');

  if (!company_name) return NextResponse.json({ ok: false, message: 'Company name is required' }, { status: 400 });
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ ok: false, message: 'A valid email is required' }, { status: 400 });
  if (!CATEGORIES.includes(category)) return NextResponse.json({ ok: false, message: 'Choose a valid category' }, { status: 400 });

  // Click-wrap gate — fail closed (process doc §4): no accepted terms, no application.
  if (get('terms_accepted') !== 'true') {
    return NextResponse.json({ ok: false, message: bilingual(LEGAL_MSG.required) }, { status: 400 });
  }

  const session = await getApplicantSession();

  const offeringTypesRaw = form.getAll('offering_types').map((v) => String(v));
  const stagesRaw = form.getAll('supply_chain_stages').map((v) => String(v));
  const offering_types = cleanStringArray(offeringTypesRaw, OFFERING_TYPES.length, 60).filter((v) => OFFERING_TYPES.includes(v));
  const supply_chain_stages = cleanStringArray(stagesRaw, MAX_STAGES, 80);

  const row = {
    company_name,
    contact_name: get('contact_name'),
    email,
    phone: get('phone'),
    category,
    offering_types,
    supply_chain_stages,
    company_size: get('company_size').slice(0, 100),
    region: get('region').slice(0, 100),
    problem_solved: get('problem_solved').slice(0, 2000),
    target_customer: get('target_customer').slice(0, 500),
    price_range: get('price_range').slice(0, 100),
    status: 'pending',
    auth_id: session?.authId ?? null,
  };

  if (!isSupabaseConfigured()) {
    const ref = 'APP-' + Math.abs(hash(JSON.stringify(row))).toString(36).slice(0, 8).toUpperCase();
    return NextResponse.json({ ok: true, stored: false, degraded: true, public_ref: ref });
  }

  // Record the ToS/Privacy acceptance BEFORE storing the application — if the
  // evidence row can't be written, the submission is rejected (fail closed).
  const dbLegal = getSupabaseClient({ admin: true });
  const recorded = await recordLegalAcceptance(dbLegal, {
    email,
    authId: session?.authId ?? null,
    context: 'apply',
    req,
  });
  if (!recorded.ok) {
    return NextResponse.json({ ok: false, message: bilingual(LEGAL_MSG.recordFailed) }, { status: 500 });
  }

  try {
    const db = getSupabaseClient({ admin: true });
    const { data, error } = await db.from('vendor_applications').insert(row).select('id, public_ref').single();
    if (error) throw error;

    const appId = data.id as string;

    // Best-effort admin notification (fire-and-forget — MUST NOT slow or
    // fail this submission; see src/lib/admin/notify.ts header). Not
    // awaited on purpose.
    notifyAdminsNewVendorApplication({
      companyName: company_name,
      contactName: row.contact_name || null,
      contactEmail: email,
      category: category || null,
    });

    // Logo (optional, one file)
    const logo = form.get('logo');
    if (logo instanceof File && logo.size > 0 && logo.size <= MAX_BYTES && ALLOWED_IMG.includes(logo.type)) {
      const path = `${appId}/logo_${Date.now()}_${safeName(logo.name)}`;
      const bytes = new Uint8Array(await logo.arrayBuffer());
      const { error: upErr } = await db.storage.from(LOGO_BUCKET).upload(path, bytes, { contentType: logo.type });
      if (!upErr) await db.from('vendor_applications').update({ logo_path: path }).eq('id', appId);
    }

    // Product images (optional, up to 3)
    const images = form.getAll('images').filter((f): f is File => f instanceof File && f.size > 0).slice(0, 3);
    const paths: string[] = [];
    for (const img of images) {
      if (img.size > MAX_BYTES || !ALLOWED_IMG.includes(img.type)) continue;
      const path = `${appId}/img_${Date.now()}_${safeName(img.name)}`;
      const bytes = new Uint8Array(await img.arrayBuffer());
      const { error: upErr } = await db.storage.from(IMG_BUCKET).upload(path, bytes, { contentType: img.type });
      if (!upErr) paths.push(path);
    }
    if (paths.length) await db.from('vendor_applications').update({ product_image_paths: paths }).eq('id', appId);

    return NextResponse.json({ ok: true, stored: true, id: appId, public_ref: data.public_ref });
  } catch (e) {
    const ref = 'APP-' + Math.abs(hash(JSON.stringify(row))).toString(36).slice(0, 8).toUpperCase();
    return NextResponse.json({
      ok: true, stored: false, degraded: true, public_ref: ref,
      message: e instanceof Error ? e.message : 'Could not store application',
    });
  }
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
