// GET    /api/vendor/certifications — MY certifications
// POST   /api/vendor/certifications (multipart: name, issuer?, credential?,
//        issued_on?, expires_on?, file?) — add one (max 50), optional proof image
// DELETE /api/vendor/certifications?id= — remove mine
// Evidence-backed certifications shown on the public storefront.
//
// Cap raised 12 -> 50 (2026-07-30, Cesar: "allow them to add multiple
// certifications ... as much as they want"). Not literally uncapped — this
// is a service-role write path (arbitrary file uploads), so a generous
// safety ceiling stays: 50 feels unlimited to a real vendor while still
// bounding storage/payload abuse.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';

const BUCKET = 'vendor-logos';
const MAX = 50;
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
const COLS = 'id, name, issuer, credential, issued_on, expires_on, image_path, sort_order, created_at';

async function requireVendor() {
  const session = await getVendorSession();
  if (!session) return { err: NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 }) };
  if (!isSupabaseConfigured()) return { err: NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 }) };
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return { err: NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 }) };
  return { vendor };
}

async function signed(db: ReturnType<typeof getSupabaseClient>, path: string | null) {
  if (!path) return null;
  const { data } = await db.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

export async function GET() {
  const { vendor, err } = await requireVendor();
  if (err) return err;
  const db = getSupabaseClient({ admin: true });
  const { data } = await db.from('vendor_certifications').select(COLS).eq('vendor_id', vendor.id).order('sort_order').order('created_at');
  const rows = await Promise.all((data || []).map(async (c) => ({ ...c, image_url: await signed(db, c.image_path as string | null) })));
  return NextResponse.json({ ok: true, certifications: rows });
}

export async function POST(req: Request) {
  const { vendor, err } = await requireVendor();
  if (err) return err;
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ ok: false, message: 'Expected multipart form-data' }, { status: 400 }); }
  const name = String(form.get('name') || '').trim().slice(0, 160);
  if (!name) return NextResponse.json({ ok: false, message: 'Certification name is required' }, { status: 400 });

  const db = getSupabaseClient({ admin: true });
  const { count } = await db.from('vendor_certifications').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id);
  if ((count || 0) >= MAX) return NextResponse.json({ ok: false, message: `Limit of ${MAX} certifications reached` }, { status: 400 });

  let image_path: string | null = null;
  const file = form.get('file');
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, message: 'Proof file exceeds 8 MB' }, { status: 400 });
    if (file.type && !ALLOWED.includes(file.type)) return NextResponse.json({ ok: false, message: 'Use PNG, JPG, WEBP, or PDF' }, { status: 400 });
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
    image_path = `${vendor.id}/cert_${Date.now()}_${safe}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await db.storage.from(BUCKET).upload(image_path, bytes, { contentType: file.type || 'image/jpeg', upsert: false });
    if (upErr) return NextResponse.json({ ok: false, message: upErr.message }, { status: 500 });
  }

  const dateOf = (k: string) => { const v = String(form.get(k) || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null; };
  const { data, error } = await db.from('vendor_certifications').insert({
    vendor_id: vendor.id,
    name,
    issuer: String(form.get('issuer') || '').trim().slice(0, 160) || null,
    credential: String(form.get('credential') || '').trim().slice(0, 120) || null,
    issued_on: dateOf('issued_on'),
    expires_on: dateOf('expires_on'),
    image_path,
    sort_order: count || 0,
  }).select(COLS).single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, certification: { ...data, image_url: await signed(db, data.image_path as string | null) } });
}

export async function DELETE(req: Request) {
  const { vendor, err } = await requireVendor();
  if (err) return err;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, message: 'id is required' }, { status: 400 });
  const db = getSupabaseClient({ admin: true });
  const { data: row } = await db.from('vendor_certifications').select('id, image_path').eq('id', id).eq('vendor_id', vendor.id).maybeSingle();
  if (!row) return NextResponse.json({ ok: false, message: 'Not found' }, { status: 404 });
  if (row.image_path) await db.storage.from(BUCKET).remove([row.image_path as string]).catch(() => {});
  const { error } = await db.from('vendor_certifications').delete().eq('id', id).eq('vendor_id', vendor.id);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
