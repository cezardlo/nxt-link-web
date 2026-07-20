// POST   /api/vendor/videos  { title?, url } — signed-in vendor: add a video to MY profile
// DELETE /api/vendor/videos?id=...          — signed-in vendor: remove MY video
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';
import { parseVideoUrl } from '@/lib/vendor/video';

const MAX_VIDEOS = 8;

export async function POST(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });

  let body: { title?: string; url?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const url = String(body.url || '').trim();
  const parsed = parseVideoUrl(url);
  if (!parsed) return NextResponse.json({ ok: false, message: 'Enter a valid video URL (YouTube or Vimeo work best).' }, { status: 400 });

  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, degraded: true });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  const { count } = await db.from('vendor_videos').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id);
  if ((count || 0) >= MAX_VIDEOS) return NextResponse.json({ ok: false, message: `Limit of ${MAX_VIDEOS} videos reached` }, { status: 400 });

  const { data, error } = await db
    .from('vendor_videos')
    .insert({ vendor_id: vendor.id, title: String(body.title || '').trim().slice(0, 200) || null, url, embed_url: parsed.embedUrl, provider: parsed.provider })
    .select('id, title, url, embed_url, provider, created_at')
    .single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, video: data });
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
  const { error } = await db.from('vendor_videos').delete().eq('id', id).eq('vendor_id', vendor.id);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
