export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import {
  getContinentActivity,
  getContinentActivityById,
} from '@/db/queries/continent-activity';
import { CONTINENT_DEPARTMENTS } from '@/lib/data/continent-departments';
import type { ContinentId } from '@/lib/data/continent-departments';

export const revalidate = 300; // 5 min cache

/**
 * GET /api/continent-activity
 *   ?id=americas   → single continent
 *   (no param)     → all continents
 *   ?format=summary → { continent_id: heat_score } map
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') as ContinentId | null;
  const format = url.searchParams.get('format');

  // Single continent
  if (id) {
    const row = await getContinentActivityById(id);
    if (!row) {
      // Return static fallback from definitions
      const dept = CONTINENT_DEPARTMENTS.find(d => d.id === id);
      if (!dept) return NextResponse.json({ ok: false, error: 'Unknown continent' }, { status: 404 });
      return NextResponse.json({
        ok: true,
        source: 'static',
        data: {
          continent_id: dept.id,
          label: dept.label,
          color: dept.color,
          signal_count_30d: 0,
          signal_velocity: 0,
          top_industries: dept.industryFocus.slice(0, 5).map(f => ({ name: f.industry, count: 0 })),
          top_countries: dept.countryCodes.slice(0, 5).map(c => ({ code: c, count: 0 })),
          top_companies: [],
          heat_score: 25,
          trend_direction: 'stable',
          last_updated: new Date().toISOString(),
        },
      });
    }
    return NextResponse.json({ ok: true, source: 'live', data: row });
  }

  // All continents
  const rows = await getContinentActivity();

  // If DB is empty, return static fallbacks
  if (rows.length === 0) {
    const staticRows = CONTINENT_DEPARTMENTS.map(dept => ({
      continent_id: dept.id,
      label: dept.label,
      color: dept.color,
      signal_count_30d: 0,
      signal_velocity: 0,
      top_industries: dept.industryFocus.slice(0, 5).map(f => ({ name: f.industry, count: 0 })),
      top_countries: dept.countryCodes.slice(0, 5).map(c => ({ code: c, count: 0 })),
      top_companies: [],
      heat_score: 25,
      trend_direction: 'stable' as const,
      last_updated: new Date().toISOString(),
    }));
    if (format === 'summary') {
      const summary: Record<string, number> = {};
      for (const r of staticRows) summary[r.continent_id] = r.heat_score;
      return NextResponse.json({ ok: true, source: 'static', data: summary });
    }
    return NextResponse.json({ ok: true, source: 'static', data: staticRows });
  }

  if (format === 'summary') {
    const summary: Record<string, number> = {};
    for (const r of rows) summary[r.continent_id] = r.heat_score;
    return NextResponse.json({ ok: true, source: 'live', data: summary });
  }

  return NextResponse.json({ ok: true, source: 'live', data: rows });
}