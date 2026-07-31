// GET    /api/vendor/case-studies        — signed-in vendor: MY case studies
// POST   /api/vendor/case-studies         — signed-in vendor: add one (max 50)
// DELETE /api/vendor/case-studies?id=...   — signed-in vendor: remove mine
// Profile-level case studies (up to 50), scoped to the caller's own vendor row.
//
// Cap raised 3 -> 50 (2026-07-30, Cesar: "allow them to add ... case studies
// as much as they want"). A generous safety ceiling, not literally uncapped —
// this is a service-role write path — but 50 feels unlimited in practice.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getVendorSession, getOrCreateVendorProfile } from '@/lib/vendor/auth';

const MAX = 50;
const COLS = 'id, title, challenge, solution, result, sort_order, created_at';

export async function GET() {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, case_studies: [] });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  const { data } = await db.from('vendor_case_studies').select(COLS).eq('vendor_id', vendor.id).order('sort_order').order('created_at');
  return NextResponse.json({ ok: true, case_studies: data || [] });
}

export async function POST(req: Request) {
  const session = await getVendorSession();
  if (!session) return NextResponse.json({ ok: false, message: 'Sign in required' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const title = String(body.title || '').trim().slice(0, 200);
  if (!title) return NextResponse.json({ ok: false, message: 'A title is required' }, { status: 400 });

  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false, degraded: true });
  const vendor = await getOrCreateVendorProfile(session);
  if (!vendor) return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });

  const db = getSupabaseClient({ admin: true });
  const { count } = await db.from('vendor_case_studies').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id);
  if ((count || 0) >= MAX) return NextResponse.json({ ok: false, message: `You can add up to ${MAX} case studies` }, { status: 400 });

  const { data, error } = await db.from('vendor_case_studies').insert({
    vendor_id: vendor.id,
    title,
    challenge: String(body.challenge || '').trim().slice(0, 2000) || null,
    solution: String(body.solution || '').trim().slice(0, 2000) || null,
    result: String(body.result || '').trim().slice(0, 2000) || null,
    sort_order: count || 0,
  }).select(COLS).single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, case_study: data });
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
  const { error } = await db.from('vendor_case_studies').delete().eq('id', id).eq('vendor_id', vendor.id);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
