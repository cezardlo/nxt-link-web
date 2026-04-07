/**
 * GET /api/conferences/[id]/exhibitors
 * 
 * Returns companies for a conference.
 * Priority: 1) Real scraped exhibitors from DB  2) Sector-matched vendors
 * Also returns top products for those companies.
 */

import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { CONFERENCES } from '@/lib/data/conferences';

export const dynamic = 'force-dynamic';

// Map conference categories → vendor sectors
const CATEGORY_TO_SECTOR: Record<string, string[]> = {
  'Defense':          ['Defense', 'Defense IT', 'Defense & Intelligence', 'Infrastructure & Defense'],
  'AI/ML':            ['AI / ML', 'AI/ML', 'Technology'],
  'Manufacturing':    ['Manufacturing', 'Robotics', 'Industrial'],
  'Cybersecurity':    ['Cybersecurity'],
  'Homeland Security':['Defense IT', 'Cybersecurity', 'Infrastructure & Defense'],
  'Government IT':    ['Defense IT', 'Enterprise'],
  'Aerospace':        ['Defense', 'Aerospace'],
  'Healthcare':       ['Healthcare'],
  'Energy':           ['Energy', 'Clean Technology'],
  'Logistics':        ['Logistics', 'Supply Chain', 'Trucking Technology', 'Warehouse Automation'],
  'Transportation':   ['Logistics', 'Trucking Technology', 'Trucking OEM'],
  'Finance':          ['Finance', 'Fintech'],
  'Robotics':         ['Robotics', 'Manufacturing'],
  'Software':         ['Technology', 'Enterprise', 'AI / ML'],
  'Border Tech':      ['Defense IT', 'Cybersecurity', 'Infrastructure & Defense'],
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conferenceId } = await params;

  // Find conference metadata for category
  const conf = CONFERENCES.find(c => c.id === conferenceId);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ exhibitors: [], total: 0, source: 'unavailable' });
  }

  const supabase = createClient();

  // ── Try real scraped exhibitors first ──────────────────────────────────────
  const { data: links } = await supabase
    .from('conference_vendor_links')
    .select('id, company_name, match_confidence, technologies, vendor_id')
    .eq('conference_id', conferenceId)
    .order('match_confidence', { ascending: false })
    .limit(100);

  if (links && links.length > 0) {
    // Enrich with vendor data
    const vendorIds = links.filter(l => l.vendor_id).map(l => l.vendor_id as string);
    let vendorMap: Record<string, any> = {};

    if (vendorIds.length > 0) {
      const { data: vendors } = await supabase
        .from('vendors')
        .select('"ID", company_name, company_url, description, sector, iker_score')
        .in('"ID"', vendorIds.map(Number).filter(Boolean));

      if (vendors) {
        for (const v of vendors) {
          vendorMap[String(v.ID)] = v;
        }
      }
    }

    const exhibitors = links.map(link => {
      const vendor = link.vendor_id ? vendorMap[link.vendor_id] : null;
      const domain = vendor?.company_url
        ? (() => { try { return new URL(vendor.company_url).hostname.replace('www.', ''); } catch { return null; } })()
        : null;

      return {
        id: link.id,
        company_name: link.company_name,
        logo_url: domain ? `https://logo.clearbit.com/${domain}` : null,
        company_url: vendor?.company_url ?? null,
        description: vendor?.description ?? null,
        sector: vendor?.sector ?? null,
        iker_score: vendor?.iker_score ?? null,
        technologies: (link.technologies as string[]) ?? [],
        match_confidence: link.match_confidence,
        has_vendor_profile: !!link.vendor_id,
        source: 'scraped',
      };
    });

    return NextResponse.json(
      { exhibitors, total: exhibitors.length, conference_id: conferenceId, source: 'scraped' },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  }

  // ── Fallback: sector-matched vendors ──────────────────────────────────────
  const category = conf?.category ?? '';
  const sectors = CATEGORY_TO_SECTOR[category] ?? [];

  let vendorQuery = supabase
    .from('vendors')
    .select('"ID", company_name, company_url, description, primary_category, sector, iker_score, tags')
    .order('iker_score', { ascending: false, nullsFirst: false })
    .limit(24);

  if (sectors.length > 0) {
    vendorQuery = vendorQuery.in('sector', sectors);
  }

  const { data: vendors } = await vendorQuery;

  if (!vendors?.length) {
    return NextResponse.json({
      exhibitors: [], total: 0, conference_id: conferenceId,
      source: 'no_data',
      message: 'No exhibitor data yet.',
    });
  }

  // Fetch top products for these companies
  const companyNames = vendors.slice(0, 6).map(v => v.company_name);
  const productMap: Record<string, any[]> = {};

  if (companyNames.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, product_name, company, category, description, maturity, price_range')
      .in('company', companyNames)
      .limit(30);

    if (products) {
      for (const p of products) {
        if (!productMap[p.company]) productMap[p.company] = [];
        if (productMap[p.company].length < 3) productMap[p.company].push(p);
      }
    }
  }

  const exhibitors = vendors.map(v => {
    const domain = v.company_url
      ? (() => { try { return new URL(v.company_url).hostname.replace('www.', ''); } catch { return null; } })()
      : null;

    return {
      id: String(v.ID),
      company_name: v.company_name,
      logo_url: domain ? `https://logo.clearbit.com/${domain}` : null,
      company_url: v.company_url,
      description: v.description,
      sector: v.sector,
      iker_score: v.iker_score,
      technologies: (v.tags as string[]) ?? [],
      match_confidence: 0.7,
      has_vendor_profile: true,
      products: productMap[v.company_name] ?? [],
      source: 'sector_match',
    };
  });

  return NextResponse.json(
    {
      exhibitors,
      total: exhibitors.length,
      conference_id: conferenceId,
      source: 'sector_match',
      category,
      message: `Companies active in ${category} — relevant to this conference`,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
}
