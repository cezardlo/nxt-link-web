// GET  /api/vendor/notifications — my latest notifications + unread count
// POST /api/vendor/notifications — mark all mine as read
// Scoped to the signed-in vendor's own profile.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';

export async function GET() {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: true, notifications: [], unread: 0 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, notifications: [], unread: 0 });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: true, notifications: [], unread: 0 });
  const db = getSupabaseClient({ admin: true });
  const { data } = await db.from('notifications')
    .select('id, type, title, read_at, created_at, quote_request_id')
    .eq('recipient', 'vendor').eq('vendor_id', vendor.id)
    .order('created_at', { ascending: false }).limit(30);
  const rows = data || [];
  return NextResponse.json({ ok: true, notifications: rows, unread: rows.filter((n) => !n.read_at).length });
}

export async function POST() {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });
  const db = getSupabaseClient({ admin: true });
  await db.from('notifications').update({ read_at: new Date().toISOString() })
    .eq('recipient', 'vendor').eq('vendor_id', vendor.id).is('read_at', null);
  return NextResponse.json({ ok: true });
}
