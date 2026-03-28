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
    totalRelevance: number;
  }> = {};

  for (const c of all) {
    const cont = c.continent || 'Other';
    if (!continentMap[cont]) continentMap[cont] = { conferences: 0, countries: new Set(), upcoming: 0, topCategories: {}, totalRelevance: 0 };
    continentMap[cont].conferences++;
    if (c.country) continentMap[cont].countries.add(c.country);
    if (c.start_date && c.start_date >= now) continentMap[cont].upcoming++;
    if (c.category) continentMap[cont].topCategories[c.category] = (continentMap[cont].topCategories[c.category] || 0) + 1;
    continentMap[cont].totalRelevance += (c.relevance_score || 0);
  }

  const continents = Object.entries(continentMap).map(([name, data]) => ({
    name,
    total_conferences: data.conferences,
    countries: data.countries.size,
    upcoming: data.upcoming,
    avg_relevance: data.conferences > 0 ? Math.round(data.totalRelevance / data.conferences) : 0,
    top_categories: Object.entries(data.topCategories)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 5)
      .map(([cat, count]) => ({ name: cat, count })),
  })).sort((a, b) => b.total_conferences - a.total_conferences);

  // Build country summaries
  const countryMap: Record<string, {
    conferences: number;
    continent: string;
    upcoming: number;
    totalRelevance: number;
    categories: Set<string>;
  }> = {};

  for (const c of all) {
    const co = c.country || 'Unknown';
    if (!countryMap[co]) countryMap[co] = { conferences: 0, continent: c.continent || 'Other', upcoming: 0, totalRelevance: 0, categories: new Set() };
    countryMap[co].conferences++;
    if (c.start_date && c.start_date >= now) countryMap[co].upcoming++;
    countryMap[co].totalRelevance += (c.relevance_score || 0);
    if (c.category) countryMap[co].categories.add(c.category);
  }

  const countries = Object.entries(countryMap).map(([name, data]) => ({
    name,
    continent: data.continent,
    total_conferences: data.conferences,
    upcoming: data.upcoming,
    avg_relevance: data.conferences > 0 ? Math.round(data.totalRelevance / data.conferences) : 0,
    top_categories: [...data.categories].slice(0, 5),
  })).sort((a, b) => b.total_conferences - a.total_conferences);

  // Hot zones: countries with high activity + high relevance
  const hotZones = countries
    .filter(c => c.total_conferences >= 3 && c.name !== 'Unknown' && c.name !== 'Various')
    .slice(0, 10)
    .map(c => ({
      country: c.name,
      continent: c.continent,
      conferences: c.total_conferences,
      upcoming: c.upcoming,
      avg_relevance: c.avg_relevance,
      specialization: c.top_categories.slice(0, 3),
      heat: c.total_conferences >= 50 ? 'extreme' : c.total_conferences >= 10 ? 'high' : 'medium',
    }));

  // Upcoming activity summary
  const upcomingAll = all.filter(c => c.start_date && c.start_date >= now);
  const next30 = upcomingAll.filter(c => {
    const d = new Date(c.start_date + 'T00:00:00');
    return d.getTime() - Date.now() <= 30 * 86400000;
  });

  return NextResponse.json({
    total_conferences: all.length,
    total_countries: new Set(all.map(c => c.country).filter(Boolean)).size,
    total_continents: continents.filter(c => c.name !== 'Global').length,
    upcoming: upcomingAll.length,
    upcoming_30d: next30.length,
    continents,
    countries: countries.slice(0, 30),
    hot_zones: hotZones,
  });
}
