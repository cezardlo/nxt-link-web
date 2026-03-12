import { NextResponse } from 'next/server';
import { getCountryActivity, getCountrySignalCounts, updateCountryActivity } from '@/db/queries/country-activity';
import { isSupabaseConfigured } from '@/db/client';

export const dynamic = 'force-dynamic';

// GET /api/country-activity
// Returns country signal counts for the global heat map.
// Query params:
//   ?format=counts   → simple { ISO: count } map (default, used by map)
//   ?format=full     → full country activity rows
//   ?refresh=1       → trigger a background recompute first

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') ?? 'counts';
  const refresh = searchParams.has('refresh');

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'Supabase not configured', counts: {}, rows: [] },
      { headers: { 'Cache-Control': 'public, s-maxage=60' } },
    );
  }

  // Background refresh if requested
  if (refresh) {
    updateCountryActivity().catch(() => {});
  }

  try {
    if (format === 'full') {
      const rows = await getCountryActivity();
      return NextResponse.json(
        { ok: true, rows, total: rows.length },
        { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
      );
    }

    // Default: simple signal count map
    const counts = await getCountrySignalCounts();

    // If empty (table not populated yet), trigger background fill
    if (Object.keys(counts).length === 0) {
      updateCountryActivity().catch(() => {});
    }

    return NextResponse.json(
      { ok: true, counts, total_countries: Object.keys(counts).length },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to fetch country activity',
        counts: {},
      },
      { status: 500 },
    );
  }
}
