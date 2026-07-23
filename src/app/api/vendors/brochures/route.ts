// POST /api/vendors/brochures  — upload a brochure for a vendor (multipart form)
//   fields: vendor_id (uuid), title (optional), file (the file)
// GET  /api/vendors/brochures?vendor_id=...  — list a vendor's brochures
// Stores the file in the 'vendor-brochures' Storage bucket and a row in
// vendor_brochures. Degrades gracefully when Supabase/Storage is unavailable.
//
// AUTH: both handlers are gated to (a) an admin, or (b) the signed-in vendor who
// OWNS that vendor_id — see authorizeVendorResource. vendor_ids are exposed in
// public storefront URLs, so this endpoint must NEVER serve/accept them for an
// anonymous caller (private brochures + signed download URLs, unauthenticated
// writes/file-planting). Consumed by /admin/vendors + /admin/directory (admin)
// and, for parity with the portal, the owning vendor.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { authorizeVendorResource } from '@/lib/vendor/authz';

const BUCKET = 'vendor-brochures';
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

/** Uniform fail-closed refusal for both handlers. */
function refuse(decision: 'unauthenticated' | 'forbidden') {
  return decision === 'unauthenticated'
    ? NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 })
    : NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
}

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

  // Authorize BEFORE touching Storage/DB or reading the file bytes: only an
  // admin or the owning signed-in vendor may write to this vendor_id.
  const authz = await authorizeVendorResource(req, vendorId);
  if (authz.decision !== 'allow') return refuse(authz.decision);

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

    // Bucket is private — store the path; we mint short-lived signed URLs on read.
    const { data, error } = await db
      .from('vendor_brochures')
      .insert({
        vendor_id: vendorId,
        file_name: file.name,
        file_type: file.type,
        size_bytes: file.size,
        storage_path: path,
        title: title || file.name,
      })
      .select('id, file_name, storage_path')
      .single();
    if (error) throw error;

    const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(path, 3600);
    return NextResponse.json({ ok: true, stored: true, brochure: { ...data, public_url: signed?.signedUrl || null } });
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

  // Authorize BEFORE any read: only an admin or the owning signed-in vendor may
  // list this vendor's private brochures + mint signed download URLs.
  const authz = await authorizeVendorResource(req, vendorId);
  if (authz.decision !== 'allow') return refuse(authz.decision);

  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, brochures: [] });
  try {
    const db = getSupabaseClient({ admin: true });
    const { data, error } = await db
      .from('vendor_brochures')
      .select('id, file_name, file_type, size_bytes, storage_path, title, uploaded_at')
      .eq('vendor_id', vendorId)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    // Mint a fresh signed URL for each file (private bucket).
    const brochures = await Promise.all(
      (data || []).map(async (b) => {
        const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(b.storage_path, 3600);
        return { ...b, public_url: signed?.signedUrl || null };
      }),
    );
    return NextResponse.json({ ok: true, stored: true, brochures });
  } catch (e) {
    return NextResponse.json({ ok: true, stored: false, degraded: true, brochures: [],
      message: e instanceof Error ? e.message : 'Could not load brochures' });
  }
}
