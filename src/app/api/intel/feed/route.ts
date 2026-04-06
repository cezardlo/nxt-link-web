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
  const signalType = searchParams.get('signal_type') ?? 'ALL';
  const queryText = (searchParams.get('q') ?? '').trim();
  const minScoreRaw = Number(searchParams.get('min_score') ?? 0);
  const minScore = minScoreRaw > 1 ? minScoreRaw / 100 : minScoreRaw;
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10) || 0);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('page_size') ?? '25', 10) || 25));

  try {
    const supabase = getSupabaseClient({ admin: true });

    function applyFilters<T>(builder: T): T {
      let filtered = builder as T & {
        gte: (column: string, value: number) => typeof filtered;
        eq: (column: string, value: string) => typeof filtered;
        ilike: (column: string, value: string) => typeof filtered;
        or: (value: string) => typeof filtered;
        order: (column: string, options?: { ascending: boolean }) => typeof filtered;
      };

      if (tab === 'high') {
        filtered = filtered.gte('importance_score', 0.75);
      } else if (tab === 'trending') {
        filtered = filtered.gte('importance_score', 0.5).order('importance_score', { ascending: false });
      }

      if (industry !== 'ALL') {
        filtered = filtered.eq('industry', industry);
      }

      if (signalType !== 'ALL') {
        filtered = filtered.eq('signal_type', signalType);
      }

      if (minScore > 0) {
        filtered = filtered.gte('importance_score', minScore);
      }

      if (queryText) {
        const safe = queryText.replace(/,/g, ' ');
        filtered = filtered.or(
          `title.ilike.%${safe}%,evidence.ilike.%${safe}%,company.ilike.%${safe}%,source.ilike.%${safe}%`
        );
      }

      return filtered as T;
    }

    const query = applyFilters(
      supabase
        .from('intel_signals')
        .select(
          'id, title, evidence, source, industry, importance_score, confidence, discovered_at, url, signal_type, company',
          { count: 'exact' }
        )
        .order('discovered_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)
    );

    const filteredCountQuery = applyFilters(
      supabase.from('intel_signals').select('id', { count: 'exact', head: true })
    );

    const [signalResult, filteredResult, totalResult, highResult] = await Promise.all([
      query,
      filteredCountQuery,
      supabase.from('intel_signals').select('*', { count: 'exact', head: true }),
      supabase.from('intel_signals').select('*', { count: 'exact', head: true }).gte('importance_score', 0.75),
    ]);

    return NextResponse.json(
      {
        signals: signalResult.data ?? [],
        totalCount: totalResult.count ?? 0,
        highCount: highResult.count ?? 0,
        filteredCount: filteredResult.count ?? 0,
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
