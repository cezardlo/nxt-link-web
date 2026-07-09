// POST   /api/vendor/logo  (multipart: file) — signed-in vendor: set MY company logo
// DELETE /api/vendor/logo                     — signed-in vendor: remove MY logo
// Stores the image in the private 'vendor-logos' bucket and saves the path on
// vendor_profiles.logo_path. Scoped to the caller's own row.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';

const BUCKET = 'vendor-logos';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export async function POST(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ ok: false, message: 'Expected multipart form-data' }, { status: 400 }); }
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ ok: false, message: 'file is required' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, message: 'Logo exceeds 5 MB' }, { status: 400 });
  if (file.type && !ALLOWED.includes(file.type)) return NextResponse.json({ ok: false, message: 'Use PNG, JPG, WEBP, or SVG' }, { status: 400 });

  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, degraded: true });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  const { data: cur } = await db.from('vendor_profiles').select('logo_path').eq('id', vendor.id).maybeSingle();

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const path = `${vendor.id}/logo_${Date.now()}_${safe}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: file.type || 'image/png', upsert: false });
  if (upErr) return NextResponse.json({ ok: false, message: upErr.message }, { status: 500 });

  const { error } = await db.from('vendor_profiles').update({ logo_path: path }).eq('id', vendor.id).eq('auth_id', session.authId);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  // Best-effort cleanup of the previous logo file.
  if (cur?.logo_path) await db.storage.from(BUCKET).remove([cur.logo_path as string]).catch(() => {});

  const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(path, 3600);
  return NextResponse.json({ ok: true, logo_path: path, logo_url: signed?.signedUrl || null });
}

export async function DELETE() {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, degraded: true });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  const { data: cur } = await db.from('vendor_profiles').select('logo_path').eq('id', vendor.id).maybeSingle();
  if (cur?.logo_path) await db.storage.from(BUCKET).remove([cur.logo_path as string]).catch(() => {});
  const { error } = await db.from('vendor_profiles').update({ logo_path: null }).eq('id', vendor.id).eq('auth_id', session.authId);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
