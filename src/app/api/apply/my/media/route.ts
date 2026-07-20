// POST   /api/apply/my/media  (multipart: kind='logo'|'image', file)
//   — signed-in vendor: replace logo, or add a product image (max 3)
// DELETE /api/apply/my/media?kind=image&path=...
//   — signed-in vendor: remove one of MY product images
// Always scoped to the caller's OWN application (resolved from session).

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getApplicantSession, getOwnApplication } from '@/lib/apply/auth';

const LOGO_BUCKET = 'vendor-logos';
const IMG_BUCKET = 'vendor-product-images';
const MAX_BYTES = 8 * 1024 * 1024;
// No SVG: it can carry scripts and these files are re-served to admins/buyers.
const ALLOWED_IMG = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_IMAGES = 3;

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

export async function POST(req: Request) {
  const session = await getApplicantSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, degraded: true });

  const app = await getOwnApplication(session);
  if (!app) return NextResponse.json({ ok: false, message: 'No application found — apply first' }, { status: 404 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ ok: false, message: 'Expected multipart form-data' }, { status: 400 }); }

  const kind = String(form.get('kind') || '');
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ ok: false, message: 'file is required' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, message: 'File exceeds 8 MB' }, { status: 400 });
  if (!ALLOWED_IMG.includes(file.type)) return NextResponse.json({ ok: false, message: 'Unsupported file type' }, { status: 400 });

  const db = getSupabaseClient({ admin: true });
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (kind === 'logo') {
    const path = `${app.id}/logo_${Date.now()}_${safeName(file.name)}`;
    const { error: upErr } = await db.storage.from(LOGO_BUCKET).upload(path, bytes, { contentType: file.type });
    if (upErr) return NextResponse.json({ ok: false, message: upErr.message }, { status: 500 });
    if (app.logo_path) await db.storage.from(LOGO_BUCKET).remove([app.logo_path]).catch(() => {});
    await db.from('vendor_applications').update({ logo_path: path }).eq('id', app.id).eq('auth_id', session.authId);
    const { data: signed } = await db.storage.from(LOGO_BUCKET).createSignedUrl(path, 3600);
    return NextResponse.json({ ok: true, logo_url: signed?.signedUrl || null });
  }

  if (kind === 'image') {
    const current: string[] = app.product_image_paths || [];
    if (current.length >= MAX_IMAGES) return NextResponse.json({ ok: false, message: `Limit of ${MAX_IMAGES} images reached` }, { status: 400 });
    const path = `${app.id}/img_${Date.now()}_${safeName(file.name)}`;
    const { error: upErr } = await db.storage.from(IMG_BUCKET).upload(path, bytes, { contentType: file.type });
    if (upErr) return NextResponse.json({ ok: false, message: upErr.message }, { status: 500 });
    const next = [...current, path];
    await db.from('vendor_applications').update({ product_image_paths: next }).eq('id', app.id).eq('auth_id', session.authId);
    const { data: signed } = await db.storage.from(IMG_BUCKET).createSignedUrl(path, 3600);
    return NextResponse.json({ ok: true, path, image_url: signed?.signedUrl || null });
  }

  return NextResponse.json({ ok: false, message: "kind must be 'logo' or 'image'" }, { status: 400 });
}

export async function DELETE(req: Request) {
  const session = await getApplicantSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, degraded: true });

  const app = await getOwnApplication(session);
  if (!app) return NextResponse.json({ ok: false, message: 'No application found' }, { status: 404 });

  const sp = new URL(req.url).searchParams;
  const path = sp.get('path');
  if (!path) return NextResponse.json({ ok: false, message: 'path is required' }, { status: 400 });

  const current: string[] = app.product_image_paths || [];
  if (!current.includes(path)) return NextResponse.json({ ok: false, message: 'Not found on your application' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  await db.storage.from(IMG_BUCKET).remove([path]).catch(() => {});
  const next = current.filter((p) => p !== path);
  await db.from('vendor_applications').update({ product_image_paths: next }).eq('id', app.id).eq('auth_id', session.authId);
  return NextResponse.json({ ok: true });
}
