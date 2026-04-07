/**
 * GET /api/intelligence/grouped
 * 
 * Returns signals grouped by industry + direction + capability_layer.
 * This is the "smart view" — not a feed, but understanding.
 * 
 * Powers the sector momentum board and the grouped intelligence view.
 */

import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

const CANONICAL_INDUSTRIES = [
  'ai-ml', 'defense', 'cybersecurity', 'logistics',
  'manufacturing', 'border-tech', 'energy', 'healthcare', 'space', 'finance',
];

const INDUSTRY_LABELS: Record<string, string> = {
  'ai-ml': 'AI / ML', 'defense': 'Defense', 'cybersecurity': 'Cybersecurity',
  'logistics': 'Logistics', 'manufacturing': 'Manufacturing', 'border-tech': 'Border Tech',
  'energy': 'Energy', 'healthcare': 'Healthcare', 'space': 'Space', 'finance': 'Finance',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') ?? '7');
  const industry = searchParams.get('industry'); // optional filter

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, groups: [], message: 'Supabase not configured' });
  }

  const supabase = createClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Get signals from last N days, enriched ones first
  let query = supabase
    .from('intel_signals')
    .select('id, title, industry, subsystem, capability_layer, meaning, direction, importance_score, signal_type, company, discovered_at, enriched_at')
    .not('source', 'ilike', '%arxiv%')
    .gte('discovered_at', since)
    .order('importance_score', { ascending: false })
    .limit(500);

  if (industry) {
    query = query.eq('industry', industry);
  }

  const { data: signals, error } = await query;

  if (error || !signals) {
    return NextResponse.json({ ok: false, error: error?.message ?? 'Query failed' }, { status: 500 });
  }

  // Group by industry
  const grouped = CANONICAL_INDUSTRIES
    .filter(ind => !industry || ind === industry)
    .map(ind => {
      const industrySignals = signals.filter(s => 
        s.industry === ind || s.industry?.toLowerCase().includes(ind.replace('-', ''))
      );

      if (industrySignals.length === 0) return null;

      // Group by direction
      const byDirection = {
        growing:    industrySignals.filter(s => s.direction === 'growing'),
        emerging:   industrySignals.filter(s => s.direction === 'emerging'),
        converging: industrySignals.filter(s => s.direction === 'converging'),
        stable:     industrySignals.filter(s => s.direction === 'stable' || !s.direction),
        declining:  industrySignals.filter(s => s.direction === 'declining'),
      };

      // Group by capability layer
      const byLayer: Record<string, typeof industrySignals> = {};
      for (const s of industrySignals) {
        const layer = s.capability_layer ?? 'General';
        if (!byLayer[layer]) byLayer[layer] = [];
        byLayer[layer].push(s);
      }

      // Calculate momentum
      const growingCount = byDirection.growing.length + byDirection.emerging.length;
      const decliningCount = byDirection.declining.length;
      const totalCount = industrySignals.length;
      const momentumScore = totalCount > 0 
        ? Math.round(((growingCount - decliningCount) / totalCount) * 100)
        : 0;

      const momentum = growingCount > decliningCount * 2 ? 'accelerating'
        : decliningCount > growingCount * 2 ? 'slowing'
        : byDirection.emerging.length > 3 ? 'emerging'
        : 'stable';

      // Top signals (highest importance, enriched first)
      const topSignals = [...industrySignals]
        .sort((a, b) => {
          // Enriched signals first
          const aEnriched = a.enriched_at ? 1 : 0;
          const bEnriched = b.enriched_at ? 1 : 0;
          if (aEnriched !== bEnriched) return bEnriched - aEnriched;
          return (b.importance_score ?? 0) - (a.importance_score ?? 0);
        })
        .slice(0, 5)
        .map(s => ({
          id: s.id,
          title: s.title,
          meaning: s.meaning,
          subsystem: s.subsystem,
          layer: s.capability_layer,
          direction: s.direction,
          importance: s.importance_score,
          company: s.company,
          discovered_at: s.discovered_at,
          is_enriched: !!s.enriched_at,
        }));

      // Dominant direction
      const dominantDirection = Object.entries(byDirection)
        .sort(([,a],[,b]) => b.length - a.length)[0][0];

      return {
        industry: ind,
        label: INDUSTRY_LABELS[ind] ?? ind,
        total_signals: totalCount,
        momentum,
        momentum_score: momentumScore,
        dominant_direction: dominantDirection,
        enriched_count: industrySignals.filter(s => s.enriched_at).length,
        by_direction: {
          growing: byDirection.growing.length,
          emerging: byDirection.emerging.length,
          converging: byDirection.converging.length,
          stable: byDirection.stable.length,
          declining: byDirection.declining.length,
        },
        by_layer: Object.fromEntries(
          Object.entries(byLayer).map(([layer, sigs]) => [layer, sigs.length])
        ),
        top_signals: topSignals,
      };
    })
    .filter(Boolean);

  // Sort by total signals descending
  grouped.sort((a, b) => (b?.total_signals ?? 0) - (a?.total_signals ?? 0));

  // Overall stats
  const totalEnriched = signals.filter(s => s.enriched_at).length;
  const overallMomentum = grouped.map(g => g?.momentum_score ?? 0);
  const avgMomentum = overallMomentum.length > 0 
    ? Math.round(overallMomentum.reduce((a,b) => a+b, 0) / overallMomentum.length)
    : 0;

  return NextResponse.json(
    {
      ok: true,
      days,
      total_signals: signals.length,
      enriched_signals: totalEnriched,
      enrichment_coverage: signals.length > 0 
        ? Math.round((totalEnriched / signals.length) * 100) 
        : 0,
      avg_momentum_score: avgMomentum,
      groups: grouped,
      generated_at: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } }
  );
}
