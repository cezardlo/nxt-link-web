// GET /api/marketplace/listings/[id]?kind=product|service — public detail page data.
// Published listings only. Returns full listing + signed images/documents +
// case studies + related listings (same vendor, then same category).

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { colsFor, tableFor } from '@/lib/marketplace/types';

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

  const [{ data: vendor }, { data: docs }, { data: cases }, { data: sameVendorP }, { data: sameVendorS }, { data: sameCat }] = await Promise.all([
    db.from('vendor_profiles').select('id, company_name, city, website, description').eq('id', row.vendor_id).maybeSingle(),
    db.from('listing_documents').select('id, file_name, title, doc_type, ai_summary, size_bytes, storage_path').eq(fk, id).order('uploaded_at', { ascending: false }).limit(12),
    db.from('case_studies').select('id, title, challenge, solution, results').eq(fk, id).eq('status', 'published').limit(6),
    db.from('marketplace_products').select('id, name, category, overview').eq('vendor_id', row.vendor_id).eq('status', 'published').neq('id', id).limit(4),
    db.from('marketplace_services').select('id, name, category, overview').eq('vendor_id', row.vendor_id).eq('status', 'published').neq('id', id).limit(4),
    db.from(tableFor(kind)).select('id, name, category, overview, vendor_id').eq('status', 'published').ilike('category', row.category || '').neq('id', id).limit(4),
  ]);

  const images = await Promise.all((row.image_paths || []).map(async (p) => {
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
    vendor: vendor ? { company_name: vendor.company_name, city: vendor.city, website: vendor.website, description: vendor.description } : null,
    related: {
      same_vendor: [
        ...(sameVendorP || []).map((r) => ({ ...r, kind: 'product' })),
        ...(sameVendorS || []).map((r) => ({ ...r, kind: 'service' })),
      ].slice(0, 4),
      same_category: (sameCat || []).filter((r) => (r as { vendor_id: string }).vendor_id !== row.vendor_id).map((r) => ({ ...r, kind })),
    },
  });
}
