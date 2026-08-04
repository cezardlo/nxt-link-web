// POST /api/apply/submit
// Public vendor intake. Anyone can submit (no login required). If the caller
// happens to be signed in already, the application is tagged to their
// account automatically. Nothing here is ever readable by the public —
// only an authenticated admin (or the vendor's own account, once linked)
// can read it back. Accepts multipart form-data so logo/images can be
// attached in the same request.
//
// ONE APPLICATION PER COMPANY (2026-08-04 batch): re-entering the flow
// RESUMES the existing application — it never silently creates a second row.
//   - signed in   → their own application (a prior anonymous submission with
//                   the same email is claimed onto the account first)
//   - signed out  → the latest UNCLAIMED application with the same email is
//                   updated; a row already claimed by an account is never
//                   touched by an anonymous caller
// The DB-level backstop lives in
// supabase/migrations/20260804_vendor_applications_one_per_company.sql.
//
// Everything a signed-in vendor submits is also mirrored onto their live
// vendor profile (fill-empty only) via syncApplicationToVendorProfile — so
// the portal never shows the placeholder "New company" after a real
// application exists.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getApplicantSession, findOwnApplication, findAnonymousApplication } from '@/lib/apply/auth';
import { cleanStringArray, resolveMultiValue, resubmitStatusPatch, MAX_REGIONS, REGION_MAXLEN, MAX_TARGET_CUSTOMERS, TARGET_CUSTOMER_MAXLEN } from '@/lib/apply/fields';
import { syncApplicationToVendorProfile } from '@/lib/apply/profile-sync';
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
  const offering_types = (cleanStringArray(offeringTypesRaw, OFFERING_TYPES.length, 60) || []).filter((v) => OFFERING_TYPES.includes(v));
  const supply_chain_stages = cleanStringArray(stagesRaw, MAX_STAGES, 80) || [];

  // Multi-select locations + customer types (2026-08-04): the form posts one
  // `regions` / `target_customers` entry per picked value; a cached older page
  // may still post the single `region` / `target_customer` — both land in the
  // same place. The legacy single-value columns are kept in sync (first
  // value) so every pre-existing reader keeps working.
  const regions = resolveMultiValue(cleanStringArray(form.getAll('regions').map((v) => String(v)), MAX_REGIONS, REGION_MAXLEN), get('region').slice(0, 100));
  const target_customers = resolveMultiValue(cleanStringArray(form.getAll('target_customers').map((v) => String(v)), MAX_TARGET_CUSTOMERS, TARGET_CUSTOMER_MAXLEN), get('target_customer').slice(0, 500));

  const row = {
    company_name,
    contact_name: get('contact_name'),
    email,
    phone: get('phone'),
    category,
    offering_types,
    supply_chain_stages,
    company_size: get('company_size').slice(0, 100),
    region: regions[0] || '',
    regions,
    problem_solved: get('problem_solved').slice(0, 2000),
    target_customer: target_customers[0] || '',
    target_customers,
    price_range: get('price_range').slice(0, 100),
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

    // Resume target: an existing application this submission continues.
    const existing = session
      ? await findOwnApplication(db, session)
      : await findAnonymousApplication(db, email);

    let appId: string;
    let publicRef: string;
    let resumed = false;
    let priorImagePaths: string[] = [];

    if (existing) {
      // Resume — update the one existing row, never insert a second. Status
      // and public_ref are untouched (status is admin-only anyway) — EXCEPT
      // a needs_info application being resubmitted, which returns to review
      // ('pending') on the same row (2026-08-04 Batch B).
      resumed = true;
      appId = existing.id;
      publicRef = existing.public_ref;
      priorImagePaths = Array.isArray(existing.product_image_paths) ? existing.product_image_paths : [];
      const { error } = await db.from('vendor_applications').update({ ...row, ...resubmitStatusPatch(existing.status) }).eq('id', appId);
      if (error) throw error;
    } else {
      const { data, error } = await db
        .from('vendor_applications')
        .insert({ ...row, status: 'pending', auth_id: session?.authId ?? null })
        .select('id, public_ref')
        .single();
      if (error && (error as { code?: string }).code === '23505') {
        // The DB unique backstop (…_one_per_company.sql) caught a race: the
        // row appeared between our lookup and insert. Resume it instead of
        // losing the submission.
        const won = session
          ? await findOwnApplication(db, session)
          : await findAnonymousApplication(db, email);
        if (!won) throw error;
        resumed = true;
        appId = won.id;
        publicRef = won.public_ref;
        priorImagePaths = Array.isArray(won.product_image_paths) ? won.product_image_paths : [];
        const { error: upErr } = await db.from('vendor_applications').update({ ...row, ...resubmitStatusPatch(won.status) }).eq('id', appId);
        if (upErr) throw upErr;
      } else {
        if (error) throw error;
        appId = data.id as string;
        publicRef = data.public_ref as string;
      }
    }

    // Best-effort admin notification (fire-and-forget — MUST NOT slow or
    // fail this submission; see src/lib/admin/notify.ts header). Not
    // awaited on purpose. Resumed submissions don't re-notify: the admin
    // already has this company in the queue.
    if (!resumed) {
      notifyAdminsNewVendorApplication({
        companyName: company_name,
        contactName: row.contact_name || null,
        contactEmail: email,
        category: category || null,
      });
    }

    // Logo (optional, one file)
    const logo = form.get('logo');
    if (logo instanceof File && logo.size > 0 && logo.size <= MAX_BYTES && ALLOWED_IMG.includes(logo.type)) {
      const path = `${appId}/logo_${Date.now()}_${safeName(logo.name)}`;
      const bytes = new Uint8Array(await logo.arrayBuffer());
      const { error: upErr } = await db.storage.from(LOGO_BUCKET).upload(path, bytes, { contentType: logo.type });
      if (!upErr) await db.from('vendor_applications').update({ logo_path: path }).eq('id', appId);
    }

    // Product images (optional, up to 3 total — on a resumed submission the
    // new picks top up what is already there instead of wiping it).
    const images = form.getAll('images').filter((f): f is File => f instanceof File && f.size > 0).slice(0, 3);
    const paths: string[] = [];
    for (const img of images) {
      if (img.size > MAX_BYTES || !ALLOWED_IMG.includes(img.type)) continue;
      const path = `${appId}/img_${Date.now()}_${safeName(img.name)}`;
      const bytes = new Uint8Array(await img.arrayBuffer());
      const { error: upErr } = await db.storage.from(IMG_BUCKET).upload(path, bytes, { contentType: img.type });
      if (!upErr) paths.push(path);
    }
    if (paths.length) {
      const merged = [...priorImagePaths, ...paths].slice(0, 3);
      await db.from('vendor_applications').update({ product_image_paths: merged }).eq('id', appId);
    }

    // Mirror onto the live vendor profile (fill-empty only) so the portal and
    // storefront show what they actually told us — never "New company".
    if (session) {
      await syncApplicationToVendorProfile(db, session, {
        company_name,
        contact_name: row.contact_name || null,
        phone: row.phone || null,
        problem_solved: row.problem_solved || null,
        region: row.region || null,
        regions,
        email,
      });
    }

    return NextResponse.json({ ok: true, stored: true, resumed, id: appId, public_ref: publicRef });
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
