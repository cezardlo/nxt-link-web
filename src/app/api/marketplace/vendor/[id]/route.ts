// GET /api/marketplace/vendor/[id] — public vendor storefront data.
// One standardized format for every vendor: identity + logo, what they do,
// published listings, case studies, videos, and verified reviews.

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { autoReactivateIfExpired } from '@/lib/vendor/moderation';
import { getSessionUser } from '@/lib/auth/require-user';
import { isAdminRequest } from '@/lib/assistant/auth';
import { decideStorefrontPreview } from '@/lib/vendor/authz';

const CARD = 'id, name, category, overview, best_for, image_paths, pilot, pricing, warranty_support, implementation';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  // Login wall (owner decision, 2026-07-23): vendor storefronts are signed-in-only.
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, code: 'auth_required', message: 'Sign in to view this vendor' }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });
  const id = params.id;
  const db = getSupabaseClient({ admin: true });

  const { data: vendor } = await db.from('vendor_profiles')
    .select('id, company_name, city, website, description, status, moderation_status, suspended_until, verification_level, categories, industries, service_areas, client_types, achievements, logo_path, banner_path, tagline, company_type, year_founded, employee_count, languages, response_time, emergency_available, cross_border, installation_available, pilot_available, main_expertise, problems_solved, capabilities, brands_supported, auth_id')
    .eq('id', id).maybeSingle();
  if (!vendor) return NextResponse.json({ ok: false, message: 'Vendor not found' }, { status: 404 });

  // Suspended/banned vendors are hidden from buyers (an expired suspension
  // auto-returns to active first), and so are not-yet-approved (pending)
  // vendors — an invited vendor is no longer born approved (F1 decision,
  // 2026-07-22): the invite link gets them a frictionless account, not a
  // public storefront. Hidden vendors return the SAME body as an unknown id
  // — no "pending" vs "suspended" vs "doesn't exist" oracle... UNLESS the
  // caller is the vendor who owns this exact profile, or an admin — they get
  // an explicit `preview: true` storefront so the "View as a buyer" link
  // isn't a dead end while their business is still under review (2026-07-29).
  // See decideStorefrontPreview (src/lib/vendor/authz.ts) for the fail-closed
  // ownership rule; this never runs for vendors that ARE already live.
  const modStatus = await autoReactivateIfExpired(db, id, vendor);
  const isLive = modStatus === 'active' && vendor.status === 'approved';
  let preview = false;
  if (!isLive) {
    const decision = decideStorefrontPreview({
      isAdmin: await isAdminRequest(req),
      callerAuthId: user.id,
      vendorId: id,
      vendorAuthId: (vendor.auth_id as string | null) || null,
    });
    if (decision === 'not_found') {
      return NextResponse.json({ ok: false, message: 'Vendor not found' }, { status: 404 });
    }
    preview = true;
  }

  const [{ data: products }, { data: services }, { data: cases }, { data: videos }, { data: reviews }, { data: certRows }, { data: galleryRows }, { data: team }, { count: dealsClosed }] = await Promise.all([
    db.from('marketplace_products').select(`${CARD}, lead_time`).eq('vendor_id', id).eq('status', 'published').order('sort_order', { ascending: true, nullsFirst: false }).order('published_at', { ascending: false }).limit(24),
    db.from('marketplace_services').select(`${CARD}, service_areas, response_time, emergency_available, pricing_model`).eq('vendor_id', id).eq('status', 'published').order('sort_order', { ascending: true, nullsFirst: false }).order('published_at', { ascending: false }).limit(24),
    db.from('vendor_case_studies').select('id, title, challenge, solution, result').eq('vendor_id', id).order('sort_order').limit(3),
    db.from('vendor_videos').select('id, title, embed_url, provider').eq('vendor_id', id).order('created_at', { ascending: false }).limit(4),
    db.from('reviews').select('rating, title, body, created_at').eq('vendor_id', id).eq('status', 'published').order('created_at', { ascending: false }).limit(50),
    db.from('vendor_certifications').select('id, name, issuer, credential, issued_on, expires_on, image_path').eq('vendor_id', id).order('sort_order').limit(12),
    db.from('vendor_gallery').select('id, image_path, caption').eq('vendor_id', id).order('sort_order').limit(12),
    db.from('vendor_team').select('id, name, position, expertise, languages, service_region').eq('vendor_id', id).order('sort_order').limit(8),
    db.from('commissions').select('id', { count: 'exact', head: true }).eq('vendor_id', id).in('status', ['won', 'paid']),
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
    preview,
    vendor: {
      id: vendor.id,
      company_name: vendor.company_name,
      city: vendor.city,
      website: vendor.website,
      description: vendor.description,
      verified: vendor.status === 'approved',
      verification_level: (vendor.verification_level as string) || null,
      categories: vendor.categories || [],
      industries: vendor.industries || [],
      service_areas: vendor.service_areas || [],
      client_types: vendor.client_types || [],
      achievements: vendor.achievements || [],
      tagline: (vendor.tagline as string) || null,
      company_type: vendor.company_type || null,
      year_founded: vendor.year_founded || null,
      employee_count: vendor.employee_count || null,
      languages: vendor.languages || [],
      response_time: vendor.response_time || null,
      emergency_available: vendor.emergency_available || false,
      cross_border: vendor.cross_border || false,
      installation_available: vendor.installation_available || false,
      pilot_available: vendor.pilot_available || false,
      main_expertise: vendor.main_expertise || [],
      problems_solved: vendor.problems_solved || [],
      capabilities: vendor.capabilities || [],
      brands_supported: vendor.brands_supported || [],
      logo_url,
      banner_url,
      rating,
      review_count: revs.length,
      deals_closed: dealsClosed || 0,
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
    team: team || [],
  });
}
