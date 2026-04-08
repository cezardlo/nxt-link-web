export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';


export async function GET(request: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);

  const continent = searchParams.get('continent');
  const country = searchParams.get('country');
  const category = searchParams.get('category');
  const status = searchParams.get('status'); // upcoming, live, past
  const sort = searchParams.get('sort') || 'date'; // date, importance
  const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 1000);

  let confQuery = supabase
    .from('conferences')
    .select('id, name, category, city, country, continent, start_date, end_date, website, description, relevance_score, estimated_exhibitors, sector_tags, lat, lon')
    .not('start_date', 'is', null);

  // Geo filters
  if (continent && continent !== 'Global') confQuery = confQuery.eq('continent', continent);
  if (country) confQuery = confQuery.eq('country', country);
  if (category) confQuery = confQuery.eq('category', category);

  // Sorting
  if (sort === 'importance') {
    confQuery = confQuery.order('relevance_score', { ascending: false, nullsFirst: false });
  } else {
    confQuery = confQuery.order('start_date', { ascending: true });
  }

  confQuery = confQuery.limit(limit);

  const [confResult, intelResult, statsResult, linksResult, exhibitorsResult, insightsResult, marketInsightsResult] = await Promise.allSettled([
    confQuery,
    supabase
      .from('conference_intel')
      .select('id, conference_id, company_name, role, signal_type, title, description, technology_cluster, importance_score')
      .order('importance_score', { ascending: false }),
    // Aggregate stats for the response
    supabase.from('conferences').select('continent, country, category').not('start_date', 'is', null),
    // Conference-vendor links (discovered vendors)
    supabase
      .from('conference_vendor_links')
      .select('conference_id, company_name, vendor_id, match_confidence, technologies, match_type')
      .order('match_confidence', { ascending: false }),
    // Exhibitors grouped by conference
    supabase
      .from('exhibitors')
      .select('conference_id, normalized_name, technologies, confidence')
      .order('confidence', { ascending: false }),
    // Per-conference insights (Why It Matters + Recommendations)
    supabase
      .from('conference_insights')
      .select('conference_id, insight_type, insight, why_it_matters, recommendation, supporting_vendors, technologies, problem_area, confidence, vendor_count')
      .order('confidence', { ascending: false }),
    // Global market insights
    supabase
      .from('market_insights')
      .select('insight_type, insight, why_it_matters, recommendation, supporting_vendors, technologies, problem_area, source_conferences, confidence, vendor_count')
      .gte('expires_at', new Date().toISOString())
      .order('confidence', { ascending: false })
      .limit(10),
  ]);

  const conferences = confResult.status === 'fulfilled' ? confResult.value.data || [] : [];
  const intel = intelResult.status === 'fulfilled' ? intelResult.value.data || [] : [];
  const allConfs = statsResult.status === 'fulfilled' ? statsResult.value.data || [] : [];
  const vendorLinks = linksResult.status === 'fulfilled' ? linksResult.value.data || [] : [];
  const exhibitors = exhibitorsResult.status === 'fulfilled' ? exhibitorsResult.value.data || [] : [];
  const _conferenceInsights = insightsResult.status === 'fulfilled' ? insightsResult.value.data || [] : [];
  const _marketInsights = marketInsightsResult.status === 'fulfilled' ? marketInsightsResult.value.data || [] : [];
  void _conferenceInsights; void _marketInsights; // fetched for future use

  // Group intel by conference_id
  const intelByConf: Record<string, typeof intel> = {};
  for (const item of intel) {
    if (!intelByConf[item.conference_id]) intelByConf[item.conference_id] = [];
    intelByConf[item.conference_id].push(item);
  }

  // Group vendor links by conference_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linksByConf: Record<string, any[]> = {};
  for (const link of vendorLinks) {
    const cid = link.conference_id as string;
    if (!linksByConf[cid]) linksByConf[cid] = [];
    linksByConf[cid].push(link);
  }

  // Group exhibitors by conference_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exhByConf: Record<string, any[]> = {};
  for (const exh of exhibitors) {
    const cid = exh.conference_id as string;
    if (!exhByConf[cid]) exhByConf[cid] = [];
    exhByConf[cid].push(exh);
  }

  const now = new Date().toISOString().split('T')[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = conferences.map((c: any) => {
    const s = !c.start_date ? 'unknown' : c.end_date && c.end_date < now ? 'past' : c.start_date <= now && (!c.end_date || c.end_date >= now) ? 'live' : 'upcoming';
    const confLinks = linksByConf[c.id] || [];
    const confExhibitors = exhByConf[c.id] || [];

    // Collect unique technologies from links and exhibitors
    const techSet = new Set<string>();
    for (const link of confLinks) {
      for (const t of (link.technologies as string[]) || []) techSet.add(t);
    }
    for (const exh of confExhibitors) {
      for (const t of (exh.technologies as string[]) || []) techSet.add(t);
    }

    // Top matched vendors (with vendor_id)
    const matchedVendors = confLinks
      .filter((l: { vendor_id: string | null }) => l.vendor_id)
      .slice(0, 5)
      .map((l: { company_name: string; match_confidence: number }) => ({
        name: l.company_name,
        confidence: l.match_confidence,
      }));

    return {
      ...c,
      status: s,
      exhibitors: intelByConf[c.id] || [],
      exhibitor_count: (intelByConf[c.id] || []).length,
      vendors_discovered: confLinks.length,
      new_exhibitors: confExhibitors.length,
      trending_technologies: Array.from(techSet).slice(0, 10),
      top_vendors: matchedVendors,
    };
  }).filter(c => !status || c.status === status);

  // Build aggregate stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const continentCounts: Record<string, number> = {};
  const countryCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  for (const c of allConfs) {
    if (c.continent) continentCounts[c.continent] = (continentCounts[c.continent] || 0) + 1;
    if (c.country) countryCounts[c.country] = (countryCounts[c.country] || 0) + 1;
    if (c.category) categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
  }

  const toSorted = (obj: Record<string, number>) =>
    Object.entries(obj).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  return NextResponse.json({
    conferences: items,
    total: items.length,
    stats: {
      continents: toSorted(continentCounts),
      countries: toSorted(countryCounts),
      categories: toSorted(categoryCounts),
    },
  });
}
