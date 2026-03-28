import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);

  const sector = searchParams.get('sector');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const continent = searchParams.get('continent');
  const country = searchParams.get('country');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = supabase
    .from('vendors')
    .select('id, company_name, company_url, description, primary_category, sector, hq_country, hq_city, continent, iker_score, credibility_score, tags, funding_stage, employee_count_range, industries')
    .order('iker_score', { ascending: false, nullsFirst: false });

  if (sector) query = query.eq('sector', sector);
  if (category) query = query.eq('primary_category', category);
  if (search) query = query.ilike('company_name', `%${search}%`);
  if (continent) query = query.eq('continent', continent);
  if (country) query = query.eq('hq_country', country);

  query = query.range(offset, offset + limit - 1);

  const [vendorsResult, countResult, sectorsResult, geoResult] = await Promise.allSettled([
    query,
    supabase.from('vendors').select('id', { count: 'exact', head: true }),
    supabase.from('vendors').select('sector').not('sector', 'is', null),
    supabase.from('vendors').select('continent, hq_country').not('continent', 'is', null),
  ]);

  const vendors = vendorsResult.status === 'fulfilled' ? vendorsResult.value.data || [] : [];
  const total = countResult.status === 'fulfilled' ? countResult.value.count || 0 : 0;

  // Sector counts
  const sectorRows = sectorsResult.status === 'fulfilled' ? sectorsResult.value.data || [] : [];
  const sectorCounts: Record<string, number> = {};
  for (const row of sectorRows) {
    if (row.sector) sectorCounts[row.sector] = (sectorCounts[row.sector] || 0) + 1;
  }
  const sectors = Object.entries(sectorCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Geo counts
  const geoRows = geoResult.status === 'fulfilled' ? geoResult.value.data || [] : [];
  const continentCounts: Record<string, number> = {};
  const countryCounts: Record<string, number> = {};
  for (const row of geoRows) {
    if (row.continent) continentCounts[row.continent] = (continentCounts[row.continent] || 0) + 1;
    if (row.hq_country) countryCounts[row.hq_country] = (countryCounts[row.hq_country] || 0) + 1;
  }

  return NextResponse.json({
    vendors,
    total,
    sectors,
    geo: {
      continents: Object.entries(continentCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      countries: Object.entries(countryCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    },
  });
}
