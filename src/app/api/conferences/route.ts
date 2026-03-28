import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

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

  const [confResult, intelResult, statsResult] = await Promise.allSettled([
    confQuery,
    supabase
      .from('conference_intel')
      .select('id, conference_id, company_name, role, signal_type, title, description, technology_cluster, importance_score')
      .order('importance_score', { ascending: false }),
    // Aggregate stats for the response
    supabase.from('conferences').select('continent, country, category').not('start_date', 'is', null),
  ]);

  const conferences = confResult.status === 'fulfilled' ? confResult.value.data || [] : [];
  const intel = intelResult.status === 'fulfilled' ? intelResult.value.data || [] : [];
  const allConfs = statsResult.status === 'fulfilled' ? statsResult.value.data || [] : [];

  // Group intel by conference_id
  const intelByConf: Record<string, typeof intel> = {};
  for (const item of intel) {
    if (!intelByConf[item.conference_id]) intelByConf[item.conference_id] = [];
    intelByConf[item.conference_id].push(item);
  }

  const now = new Date().toISOString().split('T')[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = conferences.map((c: any) => {
    const s = !c.start_date ? 'unknown' : c.end_date && c.end_date < now ? 'past' : c.start_date <= now && (!c.end_date || c.end_date >= now) ? 'live' : 'upcoming';
    return {
      ...c,
      status: s,
      exhibitors: intelByConf[c.id] || [],
      exhibitor_count: (intelByConf[c.id] || []).length,
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
