// GET    /api/vendor/gallery — MY storefront photos
// POST   /api/vendor/gallery (multipart: file, caption?) — add one (max 12)
// DELETE /api/vendor/gallery?id= — remove mine
// Facility/work photo gallery shown on the public storefront.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';

const BUCKET = 'vendor-logos';
const MAX = 12;
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];
const COLS = 'id, image_path, caption, sort_order, created_at';

async function requireVendor() {
  const session = await getVendorSession();
  if (!session) return { err: NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 }) };
  if (!isSupabaseConfigured()) return { err: NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 }) };
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return { err: NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 }) };
  return { vendor };
}

export async function GET() {
  const { vendor, err } = await requireVendor();
  if (err) return err;
  const db = getSupabaseClient({ admin: true });
  const { data } = await db.from('vendor_gallery').select(COLS).eq('vendor_id', vendor.id).order('sort_order').order('created_at');
  const photos = await Promise.all((data || []).map(async (p) => {
    const { data: s } = await db.storage.from(BUCKET).createSignedUrl(p.image_path as string, 3600);
    return { ...p, image_url: s?.signedUrl || null };
  }));
  return NextResponse.json({ ok: true, photos });
}

export async function POST(req: Request) {
  const { vendor, err } = await requireVendor();
  if (err) return err;
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ ok: false, message: 'Expected multipart form-data' }, { status: 400 }); }
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ ok: false, message: 'file is required' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, message: 'Photo exceeds 8 MB' }, { status: 400 });
  if (file.type && !ALLOWED.includes(file.type)) return NextResponse.json({ ok: false, message: 'Use PNG, JPG, or WEBP' }, { status: 400 });

  const db = getSupabaseClient({ admin: true });
  const { count } = await db.from('vendor_gallery').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id);
  if ((count || 0) >= MAX) return NextResponse.json({ ok: false, message: `Limit of ${MAX} photos reached` }, { status: 400 });

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const path = `${vendor.id}/gallery_${Date.now()}_${safe}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: file.type || 'image/jpeg', upsert: false });
  if (upErr) return NextResponse.json({ ok: false, message: upErr.message }, { status: 500 });

  const { data, error } = await db.from('vendor_gallery').insert({
    vendor_id: vendor.id,
    image_path: path,
    caption: String(form.get('caption') || '').trim().slice(0, 200) || null,
    sort_order: count || 0,
  }).select(COLS).single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  const { data: s } = await db.storage.from(BUCKET).createSignedUrl(path, 3600);
  return NextResponse.json({ ok: true, photo: { ...data, image_url: s?.signedUrl || null } });
}

export async function DELETE(req: Request) {
  const { vendor, err } = await requireVendor();
  if (err) return err;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, message: 'id is required' }, { status: 400 });
  const db = getSupabaseClient({ admin: true });
  const { data: row } = await db.from('vendor_gallery').select('id, image_path').eq('id', id).eq('vendor_id', vendor.id).maybeSingle();
  if (!row) return NextResponse.json({ ok: false, message: 'Not found' }, { status: 404 });
  await db.storage.from(BUCKET).remove([row.image_path as string]).catch(() => {});
  const { error } = await db.from('vendor_gallery').delete().eq('id', id).eq('vendor_id', vendor.id);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
