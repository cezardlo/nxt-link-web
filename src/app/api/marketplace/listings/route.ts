// GET /api/marketplace/listings — public browse (published listings only).
// Query: kind=product|service|all, q, department (functional_group), category,
//        industry, area, pilot=1, verified=1
// Returns standardized cards with vendor name + signed first image.

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isRestricted } from '@/lib/vendor/moderation';
import { getSessionUser } from '@/lib/auth/require-user';

const CARD_BASE = 'id, public_ref, vendor_id, name, category, functional_group, overview, best_for, industries, image_paths, pilot, pricing, warranty_support, status, published_at';
const CARD_PRODUCT = `${CARD_BASE}, availability, lead_time`;
const CARD_SERVICE = `${CARD_BASE}, service_areas, response_time, emergency_available, pricing_model`;

function escLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

type Row = Record<string, unknown> & { id: string; vendor_id: string; image_paths?: string[]; pilot?: { available?: boolean } | null };

export async function GET(req: Request) {
  // Login wall (owner decision, 2026-07-23): the marketplace is signed-in-only.
  // Server-side session check — a real getUser() verification, not UI gating.
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, code: 'auth_required', message: 'Sign in to browse the marketplace' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, listings: [] });
  const sp = new URL(req.url).searchParams;
  const kind = sp.get('kind') === 'product' ? 'product' : sp.get('kind') === 'service' ? 'service' : 'all';
  const q = (sp.get('q') || '').trim().slice(0, 120);
  const category = (sp.get('category') || '').trim().slice(0, 120);
  const department = (sp.get('department') || '').trim().slice(0, 60);
  const industry = (sp.get('industry') || '').trim().slice(0, 120);
  const area = (sp.get('area') || '').trim().slice(0, 120);
  const pilotOnly = sp.get('pilot') === '1';
  const verifiedOnly = sp.get('verified') === '1';

  const db = getSupabaseClient({ admin: true });

  async function fetchKind(k: 'product' | 'service'): Promise<Row[]> {
    let query = db.from(k === 'product' ? 'marketplace_products' : 'marketplace_services')
      .select(k === 'product' ? CARD_PRODUCT : CARD_SERVICE)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(60);
    if (q) query = query.or(`name.ilike.%${escLike(q)}%,overview.ilike.%${escLike(q)}%,category.ilike.%${escLike(q)}%`);
    if (department) query = query.eq('functional_group', department);
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

  // Vendor names (bulk) + signed first image per card. Same query also carries
  // the moderation columns so the restricted-vendor filter below costs no
  // extra round trip.
  const vendorIds = Array.from(new Set(rows.map((r) => r.vendor_id)));
  const { data: vendors } = vendorIds.length
    ? await db.from('vendor_profiles').select('id, company_name, city, status, verification_level, moderation_status, suspended_until').in('id', vendorIds)
    : { data: [] };
  const vmap = new Map<string, { company_name: string; city: string | null; verified: boolean; verification_level: string | null }>();
  for (const v of vendors || []) vmap.set(v.id as string, { company_name: v.company_name as string, city: (v.city as string) || null, verified: v.status === 'approved', verification_level: (v.verification_level as string) || null });

  // Suspended/banned vendors' listings are hidden from the public marketplace
  // (moderation gate — mirrors api/marketplace/vendor/[id] + requests/dispatch),
  // and so are not-yet-approved (pending) vendors' — an invited vendor is no
  // longer born approved (F1 decision, 2026-07-22). In practice a pending
  // vendor can never have a 'published' listing (the publish gate blocks it),
  // so the status check here is defense-in-depth on top of that invariant,
  // made explicit rather than left implicit. Pure read-side check, no write:
  // a lapsed suspension already reads as active via isRestricted(), and this
  // is a list context, not a single record view, so we don't want the
  // write-on-read behavior of autoReactivateIfExpired firing once per page load.
  const restrictedVendorIds = new Set(
    (vendors || [])
      .filter((v) => v.status !== 'approved' || isRestricted({ moderation_status: (v.moderation_status as string) || null, suspended_until: (v.suspended_until as string) || null }))
      .map((v) => v.id as string),
  );
  if (restrictedVendorIds.size) rows = rows.filter((r) => !restrictedVendorIds.has(r.vendor_id));

  // "Verified vendors only" facet — drop listings whose vendor isn't verified.
  if (verifiedOnly) rows = rows.filter((r) => vmap.get(r.vendor_id)?.verified);

  // Verified-review ratings per vendor (degrades to none if reviews absent).
  const ratings = new Map<string, { avg: number; count: number }>();
  if (vendorIds.length) {
    const { data: revs } = await db.from('reviews').select('vendor_id, rating').in('vendor_id', vendorIds).eq('status', 'published');
    const acc = new Map<string, { sum: number; n: number }>();
    for (const r of revs || []) { const a = acc.get(r.vendor_id as string) || { sum: 0, n: 0 }; a.sum += Number(r.rating); a.n++; acc.set(r.vendor_id as string, a); }
    for (const [vid, a] of acc) ratings.set(vid, { avg: Math.round((a.sum / a.n) * 10) / 10, count: a.n });
  }

  // Trust badges only when the underlying data really exists: bulk-count
  // documents and case studies for the listed ids.
  const pIds = rows.filter((r) => (r as { kind?: string }).kind !== 'service').map((r) => r.id);
  const sIds = rows.filter((r) => (r as { kind?: string }).kind === 'service').map((r) => r.id);
  const hasDocs = new Set<string>();
  const hasCases = new Set<string>();
  const [dp, ds, cp, cs2] = await Promise.all([
    pIds.length ? db.from('listing_documents').select('product_id').in('product_id', pIds) : Promise.resolve({ data: [] }),
    sIds.length ? db.from('listing_documents').select('service_id').in('service_id', sIds) : Promise.resolve({ data: [] }),
    pIds.length ? db.from('case_studies').select('product_id').in('product_id', pIds).eq('status', 'published') : Promise.resolve({ data: [] }),
    sIds.length ? db.from('case_studies').select('service_id').in('service_id', sIds).eq('status', 'published') : Promise.resolve({ data: [] }),
  ]);
  for (const r of dp.data || []) if (r.product_id) hasDocs.add(r.product_id as string);
  for (const r of ds.data || []) if (r.service_id) hasDocs.add(r.service_id as string);
  for (const r of cp.data || []) if (r.product_id) hasCases.add(r.product_id as string);
  for (const r of cs2.data || []) if (r.service_id) hasCases.add(r.service_id as string);

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
    const rt = ratings.get(r.vendor_id);
    // The list-typed jsonb columns hold {} instead of [] on some rows (2026-07-16
    // load); one such row must degrade to an empty list here, not crash every
    // consumer that iterates it (the marketplace page white-screened on this).
    const asList = (val: unknown): unknown[] => (Array.isArray(val) ? val : []);
    return {
      ...r, image_paths: undefined, image_url,
      best_for: asList(r.best_for), industries: asList(r.industries),
      ...('availability' in r ? { availability: asList(r.availability) } : {}),
      ...('service_areas' in r ? { service_areas: asList(r.service_areas) } : {}),
      vendor_name: v?.company_name || 'Vendor', vendor_city: v?.city || null,
      vendor_verified: Boolean(v?.verified),
      vendor_verification_level: v?.verification_level || null,
      vendor_rating: rt?.avg ?? null,
      vendor_review_count: rt?.count ?? 0,
      has_documents: hasDocs.has(r.id),
      has_case_studies: hasCases.has(r.id),
    };
  }));

  return NextResponse.json({ ok: true, listings });
}
