// GET /api/marketplace/listings — public browse (published listings only).
// Query: kind=product|service|all, q, category, industry, pilot=1, area
// Returns standardized cards with vendor name + signed first image.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

const CARD_BASE = 'id, public_ref, vendor_id, name, category, overview, best_for, industries, image_paths, pilot, pricing, warranty_support, status, published_at';
const CARD_PRODUCT = `${CARD_BASE}, availability, lead_time`;
const CARD_SERVICE = `${CARD_BASE}, service_areas, response_time, emergency_available, pricing_model`;

function escLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

type Row = Record<string, unknown> & { id: string; vendor_id: string; image_paths?: string[]; pilot?: { available?: boolean } | null };

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, listings: [] });
  const sp = new URL(req.url).searchParams;
  const kind = sp.get('kind') === 'product' ? 'product' : sp.get('kind') === 'service' ? 'service' : 'all';
  const q = (sp.get('q') || '').trim().slice(0, 120);
  const category = (sp.get('category') || '').trim().slice(0, 120);
  const industry = (sp.get('industry') || '').trim().slice(0, 120);
  const area = (sp.get('area') || '').trim().slice(0, 120);
  const pilotOnly = sp.get('pilot') === '1';

  const db = getSupabaseClient({ admin: true });

  async function fetchKind(k: 'product' | 'service'): Promise<Row[]> {
    let query = db.from(k === 'product' ? 'marketplace_products' : 'marketplace_services')
      .select(k === 'product' ? CARD_PRODUCT : CARD_SERVICE)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(60);
    if (q) query = query.or(`name.ilike.%${escLike(q)}%,overview.ilike.%${escLike(q)}%,category.ilike.%${escLike(q)}%`);
    if (category) query = query.ilike('category', escLike(category));
    if (industry) query = query.contains('industries', JSON.stringify([industry]));
    if (area && k === 'service') query = query.contains('service_areas', JSON.stringify([area]));
    const { data } = await query;
    return (data as unknown as Row[]) || [];
  }

  const kinds: Array<'product' | 'service'> = kind === 'all' ? ['product', 'service'] : [kind];
  const results = await Promise.all(kinds.map(fetchKind));
  let rows: Array<Row & { kind: 'product' | 'service' }> = [];
  kinds.forEach((k, i) => { rows = rows.concat(results[i].map((r) => ({ ...r, kind: k }))); });
  if (pilotOnly) rows = rows.filter((r) => Boolean(r.pilot && (r.pilot as { available?: boolean }).available));

  // Vendor names (bulk) + signed first image per card.
  const vendorIds = Array.from(new Set(rows.map((r) => r.vendor_id)));
  const { data: vendors } = vendorIds.length
    ? await db.from('vendor_profiles').select('id, company_name, city').in('id', vendorIds)
    : { data: [] };
  const vmap = new Map<string, { company_name: string; city: string | null }>();
  for (const v of vendors || []) vmap.set(v.id as string, { company_name: v.company_name as string, city: (v.city as string) || null });

  const listings = await Promise.all(rows.map(async (r) => {
    const first = Array.isArray(r.image_paths) && r.image_paths.length ? r.image_paths[0] : null;
    let image_url: string | null = null;
    if (first && /^https?:\/\//.test(first)) {
      image_url = first; // direct external image URL
    } else if (first) {
      const { data: signed } = await db.storage.from('listing-media').createSignedUrl(first, 3600);
      image_url = signed?.signedUrl || null;
    }
    const v = vmap.get(r.vendor_id);
    return { ...r, image_paths: undefined, image_url, vendor_name: v?.company_name || 'Verified vendor', vendor_city: v?.city || null };
  }));

  return NextResponse.json({ ok: true, listings });
}
