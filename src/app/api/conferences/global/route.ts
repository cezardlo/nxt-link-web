// GET /api/conferences/global — Global conference intelligence
// Supports: ?continent=Europe&country=Germany&category=Manufacturing&search=robot
// Returns conferences with continent stats, country breakdown, and industry facets.

import { NextRequest, NextResponse } from 'next/server';
import {
  CONFERENCES,
  getContinentStats,
  type Continent,
} from '@/lib/data/conferences';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const continent = sp.get('continent') as Continent | null;
  const country = sp.get('country');
  const category = sp.get('category');
  const search = sp.get('search');
  const minRelevance = Number(sp.get('minRelevance')) || 0;
  const limit = Math.min(Number(sp.get('limit')) || 200, 1000);
  const offset = Number(sp.get('offset')) || 0;

  let filtered = [...CONFERENCES];

  // Filters
  if (continent) {
    filtered = filtered.filter((c) => c.continent === continent);
  }
  if (country) {
    const q = country.toLowerCase();
    filtered = filtered.filter((c) => c.country.toLowerCase() === q);
  }
  if (category) {
    const q = category.toLowerCase();
    filtered = filtered.filter((c) => c.category.toLowerCase() === q);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q),
    );
  }
  if (minRelevance > 0) {
    filtered = filtered.filter((c) => c.relevanceScore >= minRelevance);
  }

  // Sort by relevance
  filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Facets
  const continentCounts: Record<string, number> = {};
  const countryCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  for (const c of filtered) {
    continentCounts[c.continent] = (continentCounts[c.continent] ?? 0) + 1;
    countryCounts[c.country] = (countryCounts[c.country] ?? 0) + 1;
    categoryCounts[c.category] = (categoryCounts[c.category] ?? 0) + 1;
  }

  // Top countries (sorted by count)
  const topCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, count]) => ({ name, count }));

  // Top categories
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name, count }));

  // Paginate
  const page = filtered.slice(offset, offset + limit);

  // Global stats (always computed from full dataset)
  const globalStats = getContinentStats(CONFERENCES);

  return NextResponse.json({
    conferences: page,
    total: filtered.length,
    facets: {
      continents: continentCounts,
      countries: topCountries,
      categories: topCategories,
    },
    global_stats: globalStats,
  });
}
