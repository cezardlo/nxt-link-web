import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();

  const { data: conferences } = await supabase
    .from('conferences')
    .select('id, name, category, city, country, continent, start_date, end_date, relevance_score, estimated_exhibitors, sector_tags, lat, lon')
    .not('start_date', 'is', null);

  const all = conferences || [];
  const now = new Date().toISOString().split('T')[0];

  // Build continent summaries
  const continentMap: Record<string, {
    conferences: number;
    countries: Set<string>;
    upcoming: number;
    topCategories: Record<string, number>;
  }> = {};

  for (const c of all) {
    const cont = c.continent || 'Other';
    if (!continentMap[cont]) continentMap[cont] = { conferences: 0, countries: new Set(), upcoming: 0, topCategories: {} };
    continentMap[cont].conferences++;
    if (c.country) continentMap[cont].countries.add(c.country);
    if (c.start_date && c.start_date >= now) continentMap[cont].upcoming++;
    if (c.category) continentMap[cont].topCategories[c.category] = (continentMap[cont].topCategories[c.category] || 0) + 1;
  }

  const continents = Object.entries(continentMap).map(([name, data]) => ({
    name,
    total_conferences: data.conferences,
    countries: data.countries.size,
    upcoming: data.upcoming,
    top_categories: Object.entries(data.topCategories)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 5)
      .map(([cat, count]) => ({ name: cat, count })),
  })).sort((a, b) => b.total_conferences - a.total_conferences);

  // Build country summaries
  const countryMap: Record<string, { conferences: number; continent: string; upcoming: number }> = {};
  for (const c of all) {
    const co = c.country || 'Unknown';
    if (!countryMap[co]) countryMap[co] = { conferences: 0, continent: c.continent || 'Other', upcoming: 0 };
    countryMap[co].conferences++;
    if (c.start_date && c.start_date >= now) countryMap[co].upcoming++;
  }

  const countries = Object.entries(countryMap).map(([name, data]) => ({
    name,
    continent: data.continent,
    total_conferences: data.conferences,
    upcoming: data.upcoming,
  })).sort((a, b) => b.total_conferences - a.total_conferences);

  return NextResponse.json({
    total_conferences: all.length,
    total_countries: new Set(all.map(c => c.country).filter(Boolean)).size,
    total_continents: continents.filter(c => c.name !== 'Global').length,
    upcoming: all.filter(c => c.start_date && c.start_date >= now).length,
    continents,
    countries,
  });
}
