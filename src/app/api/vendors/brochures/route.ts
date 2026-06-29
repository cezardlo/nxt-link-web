// POST /api/vendors/brochures  — upload a brochure for a vendor (multipart form)
//   fields: vendor_id (uuid), title (optional), file (the file)
// GET  /api/vendors/brochures?vendor_id=...  — list a vendor's brochures
// Stores the file in the 'vendor-brochures' Storage bucket and a row in
// vendor_brochures. Degrades gracefully when Supabase/Storage is unavailable.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

const BUCKET = 'vendor-brochures';
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, message: 'Expected multipart form-data' }, { status: 400 });
  }
  const vendorId = String(form.get('vendor_id') || '').trim();
  const title = String(form.get('title') || '').trim();
  const file = form.get('file');
  if (!vendorId) return NextResponse.json({ ok: false, message: 'vendor_id is required' }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ ok: false, message: 'file is required' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, message: 'File exceeds 15 MB' }, { status: 400 });
  if (file.type && !ALLOWED.includes(file.type))
    return NextResponse.json({ ok: false, message: 'Unsupported file type' }, { status: 400 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, stored: false, degraded: true,
      brochure: { file_name: file.name, file_type: file.type, size_bytes: file.size, title } });
  }

  try {
    const db = getSupabaseClient({ admin: true });
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
    const path = `${vendorId}/${Date.now()}_${safe}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: upErr } = await db.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (upErr) throw upErr;

    const { data: pub } = db.storage.from(BUCKET).getPublicUrl(path);

    const { data, error } = await db
      .from('vendor_brochures')
      .insert({
        vendor_id: vendorId,
        file_name: file.name,
        file_type: file.type,
        size_bytes: file.size,
        storage_path: path,
        public_url: pub?.publicUrl || null,
        title: title || file.name,
      })
      .select('id, file_name, public_url, storage_path')
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, stored: true, brochure: data });
  } catch (e) {
    return NextResponse.json({
      ok: true, stored: false, degraded: true,
      brochure: { file_name: file.name, file_type: file.type, size_bytes: file.size, title },
      message: e instanceof Error ? e.message : 'Upload failed',
    });
  }
}

export async function GET(req: Request) {
  const vendorId = new URL(req.url).searchParams.get('vendor_id');
  if (!vendorId) return NextResponse.json({ ok: false, message: 'vendor_id is required' }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, brochures: [] });
  try {
    const db = getSupabaseClient({ admin: true });
    const { data, error } = await db
      .from('vendor_brochures')
      .select('id, file_name, file_type, size_bytes, public_url, storage_path, title, uploaded_at')
      .eq('vendor_id', vendorId)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, stored: true, brochures: data || [] });
  } catch (e) {
    return NextResponse.json({ ok: true, stored: false, degraded: true, brochures: [],
      message: e instanceof Error ? e.message : 'Could not load brochures' });
  }
}
