import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { analyzeSignalIntake } from '@/lib/intelligence/source-intelligence';
import { FALLBACK_INTEL_SIGNALS } from '@/lib/intelligence/fallback-signals';
import { buildElPasoAssessmentReport } from '@/lib/intelligence/el-paso-relevance';
import type { IntelSignalRow } from '@/db/queries/intel-signals';

export const dynamic = 'force-dynamic';

/**
 * GET /api/intel/feed
 * Server-side query for intel_signals with pagination, tab filters, and industry filter.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') ?? 'all';
  const industry = searchParams.get('industry') ?? 'ALL';
  const signalType = searchParams.get('signal_type') ?? 'ALL';
  const queryText = (searchParams.get('q') ?? '').trim();
  const minScoreRaw = Number(searchParams.get('min_score') ?? 0);
  const minScore = minScoreRaw > 1 ? minScoreRaw / 100 : minScoreRaw;
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10) || 0);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('page_size') ?? '25', 10) || 25));
  const supabaseReady = isSupabaseConfigured();

  try {
    if (!supabaseReady) {
      const intake = analyzeSignalIntake(FALLBACK_INTEL_SIGNALS, { fallbackUsed: true, limit: FALLBACK_INTEL_SIGNALS.length });
      const assessments = buildElPasoAssessmentReport(intake.signals).signalAssessments;
      const assessmentMap = new Map(assessments.map((item) => [item.id, item]));
      const sortedSignals = [...intake.signals].sort((a, b) => {
        const aScore = (a.quality_score ?? 0) * 0.6 + (a.source_trust ?? 0) * 0.4;
        const bScore = (b.quality_score ?? 0) * 0.6 + (b.source_trust ?? 0) * 0.4;
        if (bScore !== aScore) return bScore - aScore;
        return new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime();
      });
      const pagedSignals = sortedSignals
        .slice(page * pageSize, (page + 1) * pageSize)
        .map((signal) => ({ ...signal, ...(assessmentMap.get(signal.id) ?? {}) }));

      return NextResponse.json({
        signals: pagedSignals,
        totalCount: FALLBACK_INTEL_SIGNALS.length,
        highCount: FALLBACK_INTEL_SIGNALS.filter((signal) => signal.importance_score >= 0.75).length,
        filteredCount: intake.signals.length,
        pipeline: intake.pipeline,
        sourceScores: intake.sourceScores.slice(0, 5),
        page,
        pageSize,
        preview: true,
      });
    }

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
        .limit(500)
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

    const rawSignals = (signalResult.data ?? []).map((signal) => ({
      ...signal,
      amount_usd: null,
      tags: [],
      created_at: signal.discovered_at,
    })) as IntelSignalRow[];
    const intake = analyzeSignalIntake(rawSignals, { limit: rawSignals.length });
    const assessments = buildElPasoAssessmentReport(intake.signals).signalAssessments;
    const assessmentMap = new Map(assessments.map((item) => [item.id, item]));
    const sortedSignals = [...intake.signals].sort((a, b) => {
      const aScore = (a.quality_score ?? 0) * 0.6 + (a.source_trust ?? 0) * 0.4;
      const bScore = (b.quality_score ?? 0) * 0.6 + (b.source_trust ?? 0) * 0.4;
      if (bScore !== aScore) return bScore - aScore;
      return new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime();
    });
    const pagedSignals = sortedSignals
      .slice(page * pageSize, (page + 1) * pageSize)
      .map((signal) => ({ ...signal, ...(assessmentMap.get(signal.id) ?? {}) }));

    return NextResponse.json(
      {
        signals: pagedSignals,
        totalCount: totalResult.count ?? 0,
        highCount: highResult.count ?? 0,
        filteredCount: filteredResult.count ?? intake.signals.length,
        pipeline: intake.pipeline,
        sourceScores: intake.sourceScores.slice(0, 5),
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
