export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

import { CONFERENCES } from '@/lib/data/conference-intel';
import type { ConferenceRecord } from '@/lib/data/conference-intel';


// GET /api/conferences/intelligence
// Returns scored conference data, optionally filtered by ?category= and ?limit=
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 200, 2000) : 2000;

    let results: ConferenceRecord[] = [...CONFERENCES].sort(
      (a, b) => b.relevanceScore - a.relevanceScore,
    );

    if (category && category !== 'ALL') {
      results = results.filter(
        (c) => c.category.toLowerCase() === category.toLowerCase(),
      );
    }

    const total = results.length;
    results = results.slice(0, limit);

    return NextResponse.json(
      {
        ok: true,
        conferences: results,
        total,
        as_of: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : 'Conference intelligence failed.',
        conferences: [],
        total: 0,
      },
      { status: 500 },
    );
  }
}
