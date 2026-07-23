// GET /api/marketplace/listings/[id]?kind=product|service — public detail page data.
// Published listings only. Returns full listing + signed images/documents +
// case studies + related listings (same vendor, then same category).

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { colsFor, tableFor } from '@/lib/marketplace/types';
import { isRestricted } from '@/lib/vendor/moderation';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });
  const sp = new URL(req.url).searchParams;
  const kind = sp.get('kind') === 'service' ? 'service' as const : 'product' as const;
  const id = params.id;

  const db = getSupabaseClient({ admin: true });
  const { data: listing } = await db.from(tableFor(kind)).select(colsFor(kind))
    .eq('id', id).eq('status', 'published').maybeSingle();
  if (!listing) return NextResponse.json({ ok: false, message: 'Listing not found' }, { status: 404 });

  const row = listing as unknown as { id: string; vendor_id: string; category: string; image_paths?: string[] };
  const fk = kind === 'product' ? 'product_id' : 'service_id';

  // Fetch the vendor up front (before the rest of the detail queries fire) so
  // a suspended/banned vendor's listing can short-circuit to the exact same
  // "not found" shape the missing/unpublished-listing path already returns —
  // no separate "suspended" signal leaks into the public payload. Pure
  // read-side check (isRestricted), same as the marketplace browse route —
  // no write-on-read here.
  const { data: vendor } = await db.from('vendor_profiles')
    .select('id, company_name, city, website, description, status, moderation_status, suspended_until')
    .eq('id', row.vendor_id).maybeSingle();
  if (vendor && ((vendor.status as string) !== 'approved' || isRestricted({ moderation_status: (vendor.moderation_status as string) || null, suspended_until: (vendor.suspended_until as string) || null }))) {
    return NextResponse.json({ ok: false, message: 'Listing not found' }, { status: 404 });
  }

  const [{ data: docs }, { data: cases }, { data: sameVendorP }, { data: sameVendorS }, { data: sameCat }, { data: reviewRows }] = await Promise.all([
    db.from('listing_documents').select('id, file_name, title, doc_type, ai_summary, size_bytes, storage_path').eq(fk, id).order('uploaded_at', { ascending: false }).limit(12),
    db.from('case_studies').select('id, title, challenge, solution, results').eq(fk, id).eq('status', 'published').limit(6),
    db.from('marketplace_products').select('id, name, category, overview').eq('vendor_id', row.vendor_id).eq('status', 'published').neq('id', id).limit(4),
    db.from('marketplace_services').select('id, name, category, overview').eq('vendor_id', row.vendor_id).eq('status', 'published').neq('id', id).limit(4),
    db.from(tableFor(kind)).select('id, name, category, overview, vendor_id').eq('status', 'published').ilike('category', row.category || '').neq('id', id).limit(4),
    db.from('reviews').select('rating, title, body, created_at').eq('vendor_id', row.vendor_id).eq('status', 'published').order('created_at', { ascending: false }).limit(100),
  ]);

  const revs = reviewRows || [];
  const reviewCount = revs.length;
  const rating = reviewCount ? Math.round((revs.reduce((s, r) => s + Number(r.rating), 0) / reviewCount) * 10) / 10 : null;

  const images = await Promise.all((row.image_paths || []).map(async (p) => {
    if (/^https?:\/\//.test(p)) return { path: p, url: p }; // direct external image URL
    const { data: signed } = await db.storage.from('listing-media').createSignedUrl(p, 3600);
    return { path: p, url: signed?.signedUrl || null };
  }));
  const documents = await Promise.all((docs || []).map(async (d) => {
    const { data: signed } = await db.storage.from('listing-docs').createSignedUrl(d.storage_path as string, 3600);
    return { id: d.id, file_name: d.file_name, title: d.title, doc_type: d.doc_type, ai_summary: d.ai_summary, size_bytes: d.size_bytes, url: signed?.signedUrl || null };
  }));

  return NextResponse.json({
    ok: true, kind,
    listing: { ...row, image_paths: undefined },
    images: images.filter((i) => i.url),
    documents,
    case_studies: cases || [],
    vendor: vendor ? { company_name: vendor.company_name, city: vendor.city, website: vendor.website, description: vendor.description, rating, review_count: reviewCount } : null,
    reviews: revs.slice(0, 8),
    related: {
      same_vendor: [
        ...(sameVendorP || []).map((r) => ({ ...r, kind: 'product' })),
        ...(sameVendorS || []).map((r) => ({ ...r, kind: 'service' })),
      ].slice(0, 4),
      same_category: (sameCat || []).filter((r) => (r as { vendor_id: string }).vendor_id !== row.vendor_id).map((r) => ({ ...r, kind })),
    },
  });
}
