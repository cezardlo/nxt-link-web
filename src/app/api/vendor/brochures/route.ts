// POST   /api/vendor/brochures  (multipart: file, title?) — signed-in vendor: upload to MY profile
// DELETE /api/vendor/brochures?id=...                     — signed-in vendor: remove MY file
// Session-scoped sibling of /api/vendors/brochures (which is used by the
// anonymous initial-signup flow, before an account exists).

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';

const BUCKET = 'vendor-brochures';
const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILES = 12;

export async function POST(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ ok: false, message: 'Expected multipart form-data' }, { status: 400 }); }
  const title = String(form.get('title') || '').trim();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ ok: false, message: 'file is required' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, message: 'File exceeds 15 MB' }, { status: 400 });
  if (file.type && !ALLOWED.includes(file.type)) return NextResponse.json({ ok: false, message: 'Unsupported file type' }, { status: 400 });

  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, degraded: true });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  const { count } = await db.from('vendor_brochures').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id);
  if ((count || 0) >= MAX_FILES) return NextResponse.json({ ok: false, message: `Limit of ${MAX_FILES} files reached` }, { status: 400 });

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
  const path = `${vendor.id}/${Date.now()}_${safe}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: file.type || 'application/octet-stream', upsert: false });
  if (upErr) return NextResponse.json({ ok: false, message: upErr.message }, { status: 500 });

  const { data, error } = await db.from('vendor_brochures')
    .insert({ vendor_id: vendor.id, file_name: file.name, file_type: file.type, size_bytes: file.size, storage_path: path, title: title || file.name })
    .select('id, file_name, storage_path, title, size_bytes').single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(path, 3600);
  return NextResponse.json({ ok: true, brochure: { ...data, public_url: signed?.signedUrl || null } });
}

export async function DELETE(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, message: 'id is required' }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, degraded: true });

  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  const { data: row } = await db.from('vendor_brochures').select('id, storage_path').eq('id', id).eq('vendor_id', vendor.id).maybeSingle();
  if (!row) return NextResponse.json({ ok: false, message: 'Not found' }, { status: 404 });

  await db.storage.from(BUCKET).remove([row.storage_path]).catch(() => {});
  const { error } = await db.from('vendor_brochures').delete().eq('id', id).eq('vendor_id', vendor.id);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
