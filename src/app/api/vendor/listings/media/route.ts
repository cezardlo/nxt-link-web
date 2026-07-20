// POST   /api/vendor/listings/media  (multipart: kind, id, file) — add image to MY listing
// DELETE /api/vendor/listings/media?kind=&id=&path=              — remove image from MY listing
// Image-array updates go through SECURITY DEFINER RPCs that re-check ownership
// against auth_id in the database (atomic append/remove, no read-modify-write race).

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession } from '@/lib/vendor/auth';

const BUCKET = 'listing-media';
const MAX_BYTES = 8 * 1024 * 1024;
// No SVG: it can carry scripts and these files are re-served to buyers.
const ALLOWED_IMG = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_IMAGES = 8;

export async function POST(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ ok: false, message: 'Bad form data' }, { status: 400 }); }
  const kind = String(form.get('kind'));
  const id = String(form.get('id') || '');
  const file = form.get('file');
  if (kind !== 'product' && kind !== 'service') return NextResponse.json({ ok: false, message: 'kind must be product or service' }, { status: 400 });
  if (!id) return NextResponse.json({ ok: false, message: 'id is required' }, { status: 400 });
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ ok: false, message: 'file is required' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, message: 'File exceeds 8 MB' }, { status: 400 });
  if (!ALLOWED_IMG.includes(file.type)) return NextResponse.json({ ok: false, message: 'Use PNG, JPEG, or WebP' }, { status: 400 });

  const db = getSupabaseClient({ admin: true });
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const path = `${kind}/${id}/${Date.now()}_${safe}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: file.type });
  if (upErr) return NextResponse.json({ ok: false, message: upErr.message }, { status: 500 });

  const { data: okAdd, error } = await db.rpc('listing_add_image', { p_kind: kind, p_id: id, p_auth_id: session.authId, p_path: path, p_max: MAX_IMAGES });
  if (error || !okAdd) {
    await db.storage.from(BUCKET).remove([path]).catch(() => {});
    return NextResponse.json({ ok: false, message: error?.message || `Not your listing, or the limit of ${MAX_IMAGES} images was reached` }, { status: 400 });
  }
  const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(path, 3600);
  return NextResponse.json({ ok: true, path, image_url: signed?.signedUrl || null });
}

export async function DELETE(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  const sp = new URL(req.url).searchParams;
  const kind = sp.get('kind');
  const id = sp.get('id') || '';
  const path = sp.get('path') || '';
  if ((kind !== 'product' && kind !== 'service') || !id || !path) {
    return NextResponse.json({ ok: false, message: 'kind, id, and path are required' }, { status: 400 });
  }

  const db = getSupabaseClient({ admin: true });
  const { data: okRem, error } = await db.rpc('listing_remove_image', { p_kind: kind, p_id: id, p_auth_id: session.authId, p_path: path });
  if (error || !okRem) return NextResponse.json({ ok: false, message: error?.message || 'Not found on your listing' }, { status: 400 });
  await db.storage.from(BUCKET).remove([path]).catch(() => {});
  return NextResponse.json({ ok: true });
}
