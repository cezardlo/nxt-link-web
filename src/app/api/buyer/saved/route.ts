// GET  /api/buyer/saved — my saved listings (with names, for the dashboard)
// POST /api/buyer/saved {listing_id, kind, saved} — save/unsave one
// Account-level saves so they follow the buyer across devices. Scoped to the
// buyer's own verified email; anonymous visitors keep localStorage saves.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getBuyerSession } from '@/lib/buyer/auth';

function likeLiteral(v: string): string { return v.replace(/[\\%_]/g, (c) => `\\${c}`); }

export async function GET() {
  const session = await getBuyerSession();
  if (!session?.email || !session.emailConfirmed || !isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, signed_in: false, items: [] });
  }
  const db = getSupabaseClient({ admin: true });
  const { data } = await db.from('saved_listings').select('listing_id, kind').ilike('buyer_email', likeLiteral(session.email)).order('created_at', { ascending: false }).limit(200);
  const rows = data || [];

  // Resolve names for the dashboard list (published listings only).
  const pIds = rows.filter((r) => r.kind === 'product').map((r) => r.listing_id);
  const sIds = rows.filter((r) => r.kind === 'service').map((r) => r.listing_id);
  const [pRes, sRes] = await Promise.all([
    pIds.length ? db.from('marketplace_products').select('id, name, status').in('id', pIds) : Promise.resolve({ data: [] }),
    sIds.length ? db.from('marketplace_services').select('id, name, status').in('id', sIds) : Promise.resolve({ data: [] }),
  ]);
  const names = new Map<string, string>();
  for (const r of [...(pRes.data || []), ...(sRes.data || [])]) if (r.status === 'published') names.set(r.id as string, r.name as string);

  return NextResponse.json({
    ok: true,
    signed_in: true,
    items: rows.map((r) => ({ listing_id: r.listing_id, kind: r.kind, name: names.get(r.listing_id as string) || null })),
  });
}

export async function POST(req: Request) {
  const session = await getBuyerSession();
  if (!session?.email || !session.emailConfirmed) return NextResponse.json({ ok: true, stored: false }); // anonymous: localStorage only
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false });

  let body: { listing_id?: string; kind?: string; saved?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  const id = String(body.listing_id || '');
  const kind = body.kind === 'service' ? 'service' : 'product';
  if (!id) return NextResponse.json({ ok: false, message: 'listing_id is required' }, { status: 400 });

  const db = getSupabaseClient({ admin: true });
  if (body.saved === false) {
    await db.from('saved_listings').delete().ilike('buyer_email', likeLiteral(session.email)).eq('listing_id', id);
  } else {
    await db.from('saved_listings').upsert({ buyer_email: session.email, listing_id: id, kind }, { onConflict: 'buyer_email,listing_id' });
  }
  return NextResponse.json({ ok: true, stored: true });
}
