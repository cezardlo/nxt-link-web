// GET /api/marketplace/vendor/[id] — public vendor storefront data.
// One standardized format for every vendor: identity + logo, what they do,
// published listings, case studies, videos, and verified reviews.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

const CARD = 'id, name, category, overview, best_for, image_paths, pilot, pricing, warranty_support';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });
  const id = params.id;
  const db = getSupabaseClient({ admin: true });

  const { data: vendor } = await db.from('vendor_profiles')
    .select('id, company_name, city, website, description, status, categories, industries, service_areas, client_types, achievements, logo_path, banner_path, tagline')
    .eq('id', id).maybeSingle();
  if (!vendor) return NextResponse.json({ ok: false, message: 'Vendor not found' }, { status: 404 });

  const [{ data: products }, { data: services }, { data: cases }, { data: videos }, { data: reviews }, { data: certRows }, { data: galleryRows }] = await Promise.all([
    db.from('marketplace_products').select(CARD).eq('vendor_id', id).eq('status', 'published').order('published_at', { ascending: false }).limit(24),
    db.from('marketplace_services').select(`${CARD}, service_areas, response_time, emergency_available, pricing_model`).eq('vendor_id', id).eq('status', 'published').order('published_at', { ascending: false }).limit(24),
    db.from('vendor_case_studies').select('id, title, challenge, solution, result').eq('vendor_id', id).order('sort_order').limit(3),
    db.from('vendor_videos').select('id, title, embed_url, provider').eq('vendor_id', id).order('created_at', { ascending: false }).limit(4),
    db.from('reviews').select('rating, title, body, created_at').eq('vendor_id', id).eq('status', 'published').order('created_at', { ascending: false }).limit(50),
    db.from('vendor_certifications').select('id, name, issuer, credential, issued_on, expires_on, image_path').eq('vendor_id', id).order('sort_order').limit(12),
    db.from('vendor_gallery').select('id, image_path, caption').eq('vendor_id', id).order('sort_order').limit(12),
  ]);

  const certifications = await Promise.all((certRows || []).map(async (c) => {
    let image_url: string | null = null;
    if (c.image_path) {
      const { data: s } = await db.storage.from('vendor-logos').createSignedUrl(c.image_path as string, 3600);
      image_url = s?.signedUrl || null;
    }
    return { id: c.id, name: c.name, issuer: c.issuer, credential: c.credential, issued_on: c.issued_on, expires_on: c.expires_on, image_url };
  }));
  const gallery = (await Promise.all((galleryRows || []).map(async (g) => {
    const { data: s } = await db.storage.from('vendor-logos').createSignedUrl(g.image_path as string, 3600);
    return { id: g.id, caption: g.caption, image_url: s?.signedUrl || null };
  }))).filter((g) => g.image_url);

  let logo_url: string | null = null;
  if (vendor.logo_path) {
    const { data: signed } = await db.storage.from('vendor-logos').createSignedUrl(vendor.logo_path as string, 3600);
    logo_url = signed?.signedUrl || null;
  }
  let banner_url: string | null = null;
  if (vendor.banner_path) {
    const { data: signed } = await db.storage.from('vendor-logos').createSignedUrl(vendor.banner_path as string, 3600);
    banner_url = signed?.signedUrl || null;
  }

  async function withImage(rows: Array<Record<string, unknown>>, kind: 'product' | 'service') {
    return Promise.all(rows.map(async (r) => {
      const paths = (r.image_paths as string[]) || [];
      const first = paths.length ? paths[0] : null;
      let image_url: string | null = null;
      if (first && /^https?:\/\//.test(first)) image_url = first;
      else if (first) {
        const { data: signed } = await db.storage.from('listing-media').createSignedUrl(first, 3600);
        image_url = signed?.signedUrl || null;
      }
      return { ...r, image_paths: undefined, image_url, kind };
    }));
  }

  const revs = reviews || [];
  const rating = revs.length ? Math.round((revs.reduce((s, r) => s + Number(r.rating), 0) / revs.length) * 10) / 10 : null;

  return NextResponse.json({
    ok: true,
    vendor: {
      id: vendor.id,
      company_name: vendor.company_name,
      city: vendor.city,
      website: vendor.website,
      description: vendor.description,
      verified: vendor.status === 'approved',
      categories: vendor.categories || [],
      industries: vendor.industries || [],
      service_areas: vendor.service_areas || [],
      client_types: vendor.client_types || [],
      achievements: vendor.achievements || [],
      tagline: (vendor.tagline as string) || null,
      logo_url,
      banner_url,
      rating,
      review_count: revs.length,
    },
    listings: [
      ...(await withImage((products as Array<Record<string, unknown>>) || [], 'product')),
      ...(await withImage((services as Array<Record<string, unknown>>) || [], 'service')),
    ],
    case_studies: cases || [],
    videos: videos || [],
    reviews: revs.slice(0, 6),
    certifications,
    gallery,
  });
}
