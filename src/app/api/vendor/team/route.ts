// GET    /api/vendor/team — MY team members
// POST   /api/vendor/team (multipart: name, position?, expertise?, languages?
//        (comma-separated), service_region?, file?) — add one (max 8)
// DELETE /api/vendor/team?id= — remove mine
// Public storefront team section. No direct contact fields by design —
// introductions run through NXT//LINK.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';

const BUCKET = 'vendor-logos';
const MAX = 8;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];
const COLS = 'id, name, position, expertise, languages, service_region, photo_path, sort_order, created_at';

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
  const { data } = await db.from('vendor_team').select(COLS).eq('vendor_id', vendor.id).order('sort_order').order('created_at');
  const rows = await Promise.all((data || []).map(async (m) => ({ ...m, photo_url: await signed(db, m.photo_path as string | null) })));
  return NextResponse.json({ ok: true, team: rows });
}

export async function POST(req: Request) {
  const { vendor, err } = await requireVendor();
  if (err) return err;
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ ok: false, message: 'Expected multipart form-data' }, { status: 400 }); }
  const name = String(form.get('name') || '').trim().slice(0, 120);
  if (!name) return NextResponse.json({ ok: false, message: 'Name is required' }, { status: 400 });

  const db = getSupabaseClient({ admin: true });
  const { count } = await db.from('vendor_team').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id);
  if ((count || 0) >= MAX) return NextResponse.json({ ok: false, message: `Limit of ${MAX} team members reached` }, { status: 400 });

  let photo_path: string | null = null;
  const file = form.get('file');
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, message: 'Photo exceeds 5 MB' }, { status: 400 });
    if (file.type && !ALLOWED.includes(file.type)) return NextResponse.json({ ok: false, message: 'Use PNG, JPG, or WEBP' }, { status: 400 });
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
    photo_path = `${vendor.id}/team_${Date.now()}_${safe}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await db.storage.from(BUCKET).upload(photo_path, bytes, { contentType: file.type || 'image/jpeg', upsert: false });
    if (upErr) return NextResponse.json({ ok: false, message: upErr.message }, { status: 500 });
  }

  const languages = String(form.get('languages') || '')
    .split(',').map((s) => s.trim().slice(0, 40)).filter(Boolean).slice(0, 6);
  const { data, error } = await db.from('vendor_team').insert({
    vendor_id: vendor.id,
    name,
    position: String(form.get('position') || '').trim().slice(0, 120) || null,
    expertise: String(form.get('expertise') || '').trim().slice(0, 200) || null,
    languages,
    service_region: String(form.get('service_region') || '').trim().slice(0, 120) || null,
    photo_path,
    sort_order: count || 0,
  }).select(COLS).single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, member: { ...data, photo_url: await signed(db, data.photo_path as string | null) } });
}

export async function DELETE(req: Request) {
  const { vendor, err } = await requireVendor();
  if (err) return err;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, message: 'id is required' }, { status: 400 });
  const db = getSupabaseClient({ admin: true });
  const { data: row } = await db.from('vendor_team').select('id, photo_path').eq('id', id).eq('vendor_id', vendor.id).maybeSingle();
  if (!row) return NextResponse.json({ ok: false, message: 'Not found' }, { status: 404 });
  if (row.photo_path) await db.storage.from(BUCKET).remove([row.photo_path as string]).catch(() => {});
  const { error } = await db.from('vendor_team').delete().eq('id', id).eq('vendor_id', vendor.id);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
