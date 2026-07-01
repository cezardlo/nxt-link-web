// GET /api/vendors/videos?vendor_id=...  — admin: list a company's showcase videos
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isAdminRequest } from '@/lib/assistant/auth';

export async function GET(req: Request) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  const vendorId = new URL(req.url).searchParams.get('vendor_id');
  if (!vendorId) return NextResponse.json({ ok: false, message: 'vendor_id is required' }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, videos: [] });
  try {
    const db = getSupabaseClient({ admin: true });
    const { data, error } = await db.from('vendor_videos')
      .select('id, title, url, embed_url, provider, created_at')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, stored: true, videos: data || [] });
  } catch (e) {
    return NextResponse.json({ ok: true, stored: false, degraded: true, videos: [],
      message: e instanceof Error ? e.message : 'Could not load videos' });
  }
}
