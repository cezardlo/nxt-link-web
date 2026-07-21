// GET  /api/buyer/cart — my account quote cart (names + vendors resolved)
// POST /api/buyer/cart {items:[{listing_id, kind, qty, note}]} — full replace
// Account-level cart so it follows the buyer across devices (same pattern as
// /api/buyer/saved). Scoped to the caller's OWN verified email; anonymous
// visitors keep the localStorage cart and this route fails open (stored:false).

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getBuyerSession } from '@/lib/buyer/auth';

function likeLiteral(v: string): string { return v.replace(/[\\%_]/g, (c) => `\\${c}`); }
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ITEMS = 50;

function clampQty(n: unknown): number {
  const q = Math.round(Number(n));
  return Number.isFinite(q) ? Math.min(999, Math.max(1, q)) : 1;
}

export async function GET() {
  const session = await getBuyerSession();
  if (!session?.email || !session.emailConfirmed || !isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, signed_in: false, items: [] });
  }
  const db = getSupabaseClient({ admin: true });
  const { data } = await db.from('cart_items')
    .select('listing_id, kind, qty, note')
    .ilike('buyer_email', likeLiteral(session.email))
    .order('created_at', { ascending: true })
    .limit(MAX_ITEMS);
  const rows = data || [];

  // Resolve names + vendors so items added on another device render fully.
  const pIds = rows.filter((r) => r.kind === 'product').map((r) => r.listing_id);
  const sIds = rows.filter((r) => r.kind === 'service').map((r) => r.listing_id);
  const [pRes, sRes] = await Promise.all([
    pIds.length ? db.from('marketplace_products').select('id, name, vendor_id, status').in('id', pIds) : Promise.resolve({ data: [] }),
    sIds.length ? db.from('marketplace_services').select('id, name, vendor_id, status').in('id', sIds) : Promise.resolve({ data: [] }),
  ]);
  const meta = new Map<string, { name: string; vendor_id: string | null }>();
  for (const r of [...(pRes.data || []), ...(sRes.data || [])]) {
    if (r.status === 'published') meta.set(r.id as string, { name: r.name as string, vendor_id: (r.vendor_id as string) || null });
  }
  const vendorIds = Array.from(new Set(Array.from(meta.values()).map((m) => m.vendor_id).filter(Boolean))) as string[];
  const vendors = new Map<string, string>();
  if (vendorIds.length) {
    const { data: vRows } = await db.from('vendor_profiles').select('id, company_name').in('id', vendorIds);
    for (const v of vRows || []) vendors.set(v.id as string, (v.company_name as string) || '');
  }

  return NextResponse.json({
    ok: true,
    signed_in: true,
    items: rows.map((r) => {
      const m = meta.get(r.listing_id as string);
      return {
        listing_id: r.listing_id,
        kind: r.kind,
        qty: clampQty(r.qty),
        note: r.note || null,
        name: m?.name || null,
        vendor_id: m?.vendor_id || null,
        vendor_name: m?.vendor_id ? vendors.get(m.vendor_id) || null : null,
      };
    }),
  });
}

export async function POST(req: Request) {
  const session = await getBuyerSession();
  if (!session?.email || !session.emailConfirmed) return NextResponse.json({ ok: true, stored: false }); // anonymous: localStorage only
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, stored: false });

  let body: { items?: Array<{ listing_id?: string; kind?: string; qty?: number; note?: string | null }> };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }); }
  if (!Array.isArray(body.items)) return NextResponse.json({ ok: false, message: 'items[] is required' }, { status: 400 });

  const seen = new Set<string>();
  const items: Array<{ listing_id: string; kind: string; qty: number; note: string | null }> = [];
  for (const it of body.items) {
    const id = String(it?.listing_id || '');
    if (!UUID_RE.test(id) || seen.has(id)) continue;
    seen.add(id);
    items.push({
      listing_id: id,
      kind: it?.kind === 'service' ? 'service' : 'product',
      qty: clampQty(it?.qty),
      note: typeof it?.note === 'string' && it.note.trim() ? it.note.trim().slice(0, 300) : null,
    });
    if (items.length >= MAX_ITEMS) break;
  }

  // Full replace: the client always sends the whole (merged) cart, so this is
  // idempotent and an empty list clears the account cart.
  const db = getSupabaseClient({ admin: true });
  const { error: delError } = await db.from('cart_items').delete().ilike('buyer_email', likeLiteral(session.email));
  if (delError) return NextResponse.json({ ok: false, message: delError.message }, { status: 500 });
  if (items.length) {
    const { error } = await db.from('cart_items').insert(items.map((i) => ({ ...i, buyer_email: session.email })));
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, stored: true });
}
