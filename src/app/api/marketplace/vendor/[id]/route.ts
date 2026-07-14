// GET /api/marketplace/vendor/[id] — public vendor storefront data.
// One standardized company-profile format for every vendor: identity + trust
// badges, overview facts, expertise, published listings, team, case studies,
// documents, videos, and verified reviews. Deal actions run through NXT//LINK.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { publicPricing } from '@/lib/marketplace/types';

const PRODUCT_CARD = 'id, name, category, overview, best_for, image_paths, pilot, pricing, warranty_support, lead_time, availability';
const SERVICE_CARD = 'id, name, category, overview, best_for, image_paths, pilot, pricing, warranty_support, service_areas, response_time, emergency_available, pricing_model';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });
  const id = params.id;
  const db = getSupabaseClient({ admin: true });

  const { data: vendor } = await db.from('vendor_profiles').select('*').eq('id', id).maybeSingle();
  if (!vendor) return NextResponse.json({ ok: false, message: 'Vendor not found' }, { status: 404 });

  const [
    { data: products }, { data: services }, { data: cases }, { data: videos },
    { data: reviews }, { data: certRows }, { data: galleryRows }, { data: teamRows }, { data: brochureRows },
  ] = await Promise.all([
    db.from('marketplace_products').select(PRODUCT_CARD).eq('vendor_id', id).eq('status', 'published').order('published_at', { ascending: false }).limit(24),
    db.from('marketplace_services').select(SERVICE_CARD).eq('vendor_id', id).eq('status', 'published').order('published_at', { ascending: false }).limit(24),
    db.from('vendor_case_studies').select('id, title, challenge, solution, result').eq('vendor_id', id).order('sort_order').limit(3),
    db.from('vendor_videos').select('id, title, embed_url, provider').eq('vendor_id', id).order('created_at', { ascending: false }).limit(4),
    db.from('reviews').select('rating, title, body, created_at').eq('vendor_id', id).eq('status', 'published').order('created_at', { ascending: false }).limit(50),
    db.from('vendor_certifications').select('id, name, issuer, credential, issued_on, expires_on, image_path').eq('vendor_id', id).order('sort_order').limit(12),
    db.from('vendor_gallery').select('id, image_path, caption').eq('vendor_id', id).order('sort_order').limit(12),
    db.from('vendor_team').select('id, name, position, expertise, languages, service_region, photo_path').eq('vendor_id', id).order('sort_order').limit(8),
    db.from('vendor_brochures').select('id, file_name, title, size_bytes, storage_path, uploaded_at').eq('vendor_id', id).order('uploaded_at', { ascending: false }).limit(12),
  ]);

  const signLogo = async (path: string | null | undefined) => {
    if (!path) return null;
    const { data: s } = await db.storage.from('vendor-logos').createSignedUrl(path, 3600);
    return s?.signedUrl || null;
  };

  const certifications = await Promise.all((certRows || []).map(async (c) => ({
    id: c.id, name: c.name, issuer: c.issuer, credential: c.credential,
    issued_on: c.issued_on, expires_on: c.expires_on,
    image_url: await signLogo(c.image_path as string | null),
  })));
  const gallery = (await Promise.all((galleryRows || []).map(async (g) => ({
    id: g.id, caption: g.caption, image_url: await signLogo(g.image_path as string),
  })))).filter((g) => g.image_url);
  const team = await Promise.all((teamRows || []).map(async (m) => ({
    id: m.id, name: m.name, position: m.position, expertise: m.expertise,
    languages: (m.languages as string[]) || [], service_region: m.service_region,
    photo_url: await signLogo(m.photo_path as string | null),
  })));
  const documents = (await Promise.all((brochureRows || []).map(async (b) => {
    const { data: s } = await db.storage.from('vendor-brochures').createSignedUrl(b.storage_path as string, 3600);
    return {
      id: b.id, name: (b.title as string) || (b.file_name as string),
      size_bytes: b.size_bytes, uploaded_at: b.uploaded_at, url: s?.signedUrl || null,
    };
  }))).filter((d) => d.url);

  const logo_url = await signLogo(vendor.logo_path as string | null);
  const banner_url = await signLogo(vendor.banner_path as string | null);

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
      // Anonymous storefront: gated price entries must never leave the server.
      return { ...r, image_paths: undefined, image_url, kind, pricing: publicPricing(r.pricing, 'public') };
    }));
  }

  const revs = reviews || [];
  const rating = revs.length ? Math.round((revs.reduce((s, r) => s + Number(r.rating), 0) / revs.length) * 10) / 10 : null;

  // "Insured" is shown only when an uploaded certification is insurance
  // evidence — a credential-token system replaces this heuristic in P1.
  const insured = (certRows || []).some((c) =>
    /insur/i.test(String(c.name || '')) || /insur/i.test(String(c.issuer || '')));

  const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

  return NextResponse.json({
    ok: true,
    vendor: {
      id: vendor.id,
      company_name: vendor.company_name,
      city: vendor.city,
      website: vendor.website,
      description: vendor.description,
      verified: vendor.status === 'approved',
      categories: arr(vendor.categories),
      industries: arr(vendor.industries),
      service_areas: arr(vendor.service_areas),
      client_types: arr(vendor.client_types),
      achievements: arr(vendor.achievements),
      tagline: (vendor.tagline as string) || null,
      logo_url,
      banner_url,
      rating,
      review_count: revs.length,
      // Company profile template fields.
      year_founded: (vendor.year_founded as number) || null,
      employee_count: (vendor.employee_count as string) || null,
      company_type: (vendor.company_type as string) || null,
      languages: arr(vendor.languages),
      response_time: (vendor.response_time as string) || null,
      projects_completed: (vendor.projects_completed as number) || null,
      emergency_available: Boolean(vendor.emergency_available),
      cross_border: Boolean(vendor.cross_border),
      installation_available: Boolean(vendor.installation_available),
      pilot_available: Boolean(vendor.pilot_available),
      main_expertise: arr(vendor.main_expertise),
      problems_solved: arr(vendor.problems_solved),
      capabilities: arr(vendor.capabilities),
      cta_label: (vendor.cta_label as string) || null,
      visible_tabs: arr(vendor.visible_tabs),
      brand_color: (vendor.brand_color as string) || null,
      insured,
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
    team,
    documents,
  });
}
