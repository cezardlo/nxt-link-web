// GET /api/marketplace/companies — public company directory for the
// marketplace "Companies" tab. Returns approved vendors (plus any vendor with
// a published listing) with their structured fit data and listing rollups so
// the client can filter and explain matches in plain language. Structured
// tags, not descriptions, power the filters.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { solutionTypeOf, type SolutionType } from '@/lib/marketplace/guided-search';

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, message: 'Not configured' }, { status: 503 });
  const db = getSupabaseClient({ admin: true });

  const [{ data: vendors }, { data: products }, { data: services }, { data: reviews }, { data: cases }, { data: certs }] = await Promise.all([
    db.from('vendor_profiles').select('*').not('status', 'in', '("rejected","paused")'),
    db.from('marketplace_products').select('vendor_id, name, category').eq('status', 'published'),
    db.from('marketplace_services').select('vendor_id, name, category').eq('status', 'published'),
    db.from('reviews').select('vendor_id, rating').eq('status', 'published'),
    db.from('vendor_case_studies').select('vendor_id'),
    db.from('vendor_certifications').select('vendor_id, name, issuer'),
  ]);

  const byVendor = <T extends { vendor_id: string }>(rows: T[] | null) => {
    const m = new Map<string, T[]>();
    for (const r of rows || []) {
      const list = m.get(r.vendor_id) || [];
      list.push(r);
      m.set(r.vendor_id, list);
    }
    return m;
  };
  const prodBy = byVendor(products as Array<{ vendor_id: string; name: string; category: string }> | null);
  const servBy = byVendor(services as Array<{ vendor_id: string; name: string; category: string }> | null);
  const revBy = byVendor(reviews as Array<{ vendor_id: string; rating: number }> | null);
  const caseBy = byVendor(cases as Array<{ vendor_id: string }> | null);
  const certBy = byVendor(certs as Array<{ vendor_id: string; name: string | null; issuer: string | null }> | null);

  const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

  const companies = await Promise.all((vendors || [])
    .filter((v) => v.status === 'approved' || prodBy.has(v.id) || servBy.has(v.id))
    .map(async (v) => {
      const prods = prodBy.get(v.id) || [];
      const servs = servBy.get(v.id) || [];
      const types = new Set<SolutionType>();
      for (const p of prods) types.add(solutionTypeOf({ kind: 'product', category: p.category, name: p.name }));
      if (servs.length) types.add('service');

      const revs = revBy.get(v.id) || [];
      const rating = revs.length ? Math.round((revs.reduce((s, r) => s + Number(r.rating), 0) / revs.length) * 10) / 10 : null;
      const vendorCerts = certBy.get(v.id) || [];
      const insured = vendorCerts.some((c) => /insur/i.test(String(c.name || '')) || /insur/i.test(String(c.issuer || '')));

      let logo_url: string | null = null;
      if (v.logo_path) {
        const { data: s } = await db.storage.from('vendor-logos').createSignedUrl(v.logo_path as string, 3600);
        logo_url = s?.signedUrl || null;
      }

      return {
        id: v.id,
        company_name: v.company_name,
        tagline: (v.tagline as string) || null,
        city: v.city,
        logo_url,
        verified: v.status === 'approved',
        insured,
        company_type: (v.company_type as string) || null,
        year_founded: (v.year_founded as number) || null,
        industries: arr(v.industries),
        service_areas: arr(v.service_areas),
        categories: arr(v.categories),
        main_expertise: arr(v.main_expertise),
        problems_solved: arr(v.problems_solved),
        capabilities: arr(v.capabilities),
        languages: arr(v.languages),
        response_time: (v.response_time as string) || null,
        cross_border: Boolean(v.cross_border),
        installation_available: Boolean(v.installation_available),
        pilot_available: Boolean(v.pilot_available),
        emergency_available: Boolean(v.emergency_available),
        solution_types: Array.from(types),
        product_count: prods.length,
        service_count: servs.length,
        rating,
        review_count: revs.length,
        case_study_count: (caseBy.get(v.id) || []).length,
        certification_count: vendorCerts.length,
      };
    }));

  // Most complete storefronts first: verified, then listing count, then rating.
  companies.sort((a, b) =>
    Number(b.verified) - Number(a.verified) ||
    (b.product_count + b.service_count) - (a.product_count + a.service_count) ||
    (b.rating || 0) - (a.rating || 0));

  return NextResponse.json({ ok: true, companies });
}
