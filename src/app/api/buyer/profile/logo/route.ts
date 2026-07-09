// POST   /api/buyer/profile/logo (multipart: file) — set MY company logo
// DELETE /api/buyer/profile/logo                    — remove MY logo
// Buyer profile image; stored in the private 'vendor-logos' bucket
// (buyerlogo_ prefix), path saved on buyer_profiles.logo_path.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getBuyerSession } from '@/lib/buyer/auth';

const BUCKET = 'vendor-logos';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export async function POST(req: Request) {
  const session = await getBuyerSession();
  if (!session?.email || !session.emailConfirmed) return NextResponse.json({ ok: false, message: 'Sign in and verify your email first' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ ok: false, message: 'Expected multipart form-data' }, { status: 400 }); }
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ ok: false, message: 'file is required' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, message: 'Logo exceeds 5 MB' }, { status: 400 });
  if (file.type && !ALLOWED.includes(file.type)) return NextResponse.json({ ok: false, message: 'Use PNG, JPG, WEBP, or SVG' }, { status: 400 });

  const db = getSupabaseClient({ admin: true });
  const { data: cur } = await db.from('buyer_profiles').select('logo_path').eq('buyer_email', session.email).maybeSingle();

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const path = `buyers/buyerlogo_${Date.now()}_${safe}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: file.type || 'image/png', upsert: false });
  if (upErr) return NextResponse.json({ ok: false, message: upErr.message }, { status: 500 });

  const { error } = await db.from('buyer_profiles')
    .upsert({ buyer_email: session.email, logo_path: path, updated_at: new Date().toISOString() }, { onConflict: 'buyer_email' });
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  if (cur?.logo_path) await db.storage.from(BUCKET).remove([cur.logo_path as string]).catch(() => {});

  const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(path, 3600);
  return NextResponse.json({ ok: true, logo_url: signed?.signedUrl || null });
}

export async function DELETE() {
  const session = await getBuyerSession();
  if (!session?.email || !session.emailConfirmed) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });
  const db = getSupabaseClient({ admin: true });
  const { data: cur } = await db.from('buyer_profiles').select('logo_path').eq('buyer_email', session.email).maybeSingle();
  if (cur?.logo_path) await db.storage.from(BUCKET).remove([cur.logo_path as string]).catch(() => {});
  await db.from('buyer_profiles').update({ logo_path: null, updated_at: new Date().toISOString() }).eq('buyer_email', session.email);
  return NextResponse.json({ ok: true });
}
