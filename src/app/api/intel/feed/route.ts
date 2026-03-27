import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/intel/feed
 * Server-side query for intel_signals with pagination, tab filters, and industry filter.
 */
export async function GET(request: Request): Promise<NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { signals: [], totalCount: 0, highCount: 0, error: 'Database not configured' },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') ?? 'all';
  const industry = searchParams.get('industry') ?? 'ALL';
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10) || 0);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('page_size') ?? '25', 10) || 25));

  try {
    const supabase = getSupabaseClient({ admin: true });

    let query = supabase
      .from('intel_signals')
      .select('id, title, evidence, source, industry, importance_score, discovered_at, url, signal_type, company', { count: 'exact' })
      .order('discovered_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (tab === 'high') {
      query = query.gte('importance_score', 75);
    } else if (tab === 'trending') {
      query = query.gte('importance_score', 50).order('importance_score', { ascending: false });
    }

    if (industry !== 'ALL') {
      query = query.eq('industry', industry);
    }

    const [signalResult, totalResult, highResult] = await Promise.all([
      query,
      supabase.from('intel_signals').select('*', { count: 'exact', head: true }),
      supabase.from('intel_signals').select('*', { count: 'exact', head: true }).gte('importance_score', 75),
    ]);

    return NextResponse.json(
      {
        signals: signalResult.data ?? [],
        totalCount: totalResult.count ?? 0,
        highCount: highResult.count ?? 0,
        filteredCount: signalResult.count ?? 0,
        page,
        pageSize,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      },
    );
  } catch (err) {
    console.error('[intel/feed] Error:', err);
    return NextResponse.json(
      { signals: [], totalCount: 0, highCount: 0, error: 'Failed to fetch signals' },
      { status: 500 },
    );
  }
}
