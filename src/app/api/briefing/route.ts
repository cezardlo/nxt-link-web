/**
 * GET /api/briefing — Top 3 supply chain intelligence insights
 *
 * Computes everything from intel_signals (the real data).
 * No dependency on missing tables (top_insights, signal_clusters, etc.)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

type SignalRow = {
  id: string;
  title: string;
  signal_type: string;
  industry: string;
  company: string | null;
  evidence: string | null;
  amount_usd: number | null;
  confidence: number;
  importance_score: number;
  relevance_score?: number;
  discovered_at: string;
  source: string | null;
  source_domain?: string | null;
  tags: string[];
};

export async function GET() {
  const supabase = createClient();

  // Parallel fetch: recent high-quality signals + total count + 24h count + last briefing
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const [
    { data: recentSignals },
    { count: totalSignals },
    { count: signals24h },
    { data: latestBriefing },
  ] = await Promise.all([
    supabase
      .from('intel_signals')
      .select('id, title, signal_type, industry, company, evidence, amount_usd, confidence, importance_score, discovered_at, source, tags')
      .gte('discovered_at', since7d)
      .order('importance_score', { ascending: false })
      .limit(200),
    supabase.from('intel_signals').select('*', { count: 'exact', head: true }),
    supabase.from('intel_signals').select('*', { count: 'exact', head: true }).gte('discovered_at', since24h),
    supabase.from('daily_briefings').select('generated_at, briefing_date').order('briefing_date', { ascending: false }).limit(1),
  ]);

  const signals = (recentSignals || []) as SignalRow[];

  // --- Build Top 3 Insights by grouping signals by industry ---
  const industryGroups: Record<string, SignalRow[]> = {};
  for (const s of signals) {
    const key = s.industry || 'general';
    if (!industryGroups[key]) industryGroups[key] = [];
    industryGroups[key].push(s);
  }

  // Rank industries by total importance
  const rankedIndustries = Object.entries(industryGroups)
    .map(([industry, sigs]) => ({
      industry,
      signals: sigs,
      totalImportance: sigs.reduce((sum, s) => sum + (s.importance_score || 0), 0),
      avgImportance: sigs.reduce((sum, s) => sum + (s.importance_score || 0), 0) / sigs.length,
      topSignal: sigs[0], // already sorted by importance_score
    }))
    .sort((a, b) => b.totalImportance - a.totalImportance);

  // Build top 3 insight cards from the top 3 industry clusters
  const topInsights = rankedIndustries.slice(0, 3).map((group, i) => {
    const top = group.topSignal;
    const topSignals = group.signals.slice(0, 5);

    // Dominant signal type in this cluster
    const typeCounts: Record<string, number> = {};
    for (const s of group.signals) {
      typeCounts[s.signal_type] = (typeCounts[s.signal_type] || 0) + 1;
    }
    const dominantType = Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'discovery';

    // Collect companies mentioned
    const companySet: Record<string, boolean> = {};
    for (const s of group.signals) { if (s.company) companySet[s.company] = true; }
    const companies = Object.keys(companySet).slice(0, 4);
    const companyMention = companies.length > 0 ? ` Key players: ${companies.join(', ')}.` : '';

    // Build evidence summary from top signals
    const evidenceBits = topSignals
      .filter(s => s.evidence)
      .map(s => s.evidence!)
      .slice(0, 3);

    // Build narrative fields
    const what_is_happening = top.title + (top.evidence ? ` — ${top.evidence}` : '');

    const why_it_matters = evidenceBits.length > 1
      ? `${group.signals.length} signals detected in ${group.industry} this week.${companyMention} ${evidenceBits[1] || ''}`
      : `${group.signals.length} signals tracked in ${group.industry} over the past 7 days.${companyMention}`;

    const where_its_going = group.signals.length >= 5
      ? `High activity cluster with ${group.signals.length} signals — this sector is moving. Watch for follow-on developments.`
      : `Emerging activity with ${group.signals.length} signals. Monitor for acceleration.`;

    // Related signals for source attribution
    const related_signals = topSignals.map(s => ({
      id: s.id,
      title: s.title,
      source: s.source || 'Unknown',
      discovered_at: s.discovered_at,
      signal_type: s.signal_type,
      relevance_score: s.importance_score,
    }));

    return {
      rank: i + 1,
      title: top.title,
      what_is_happening,
      why_it_matters,
      where_its_going,
      signal_count: group.signals.length,
      avg_score: Math.round(group.avgImportance * 100) / 100,
      industry: group.industry,
      signal_type: dominantType,
      related_signals,
    };
  });

  // --- Signal stats (from all fetched signals) ---
  const typeCount: Record<string, number> = {};
  const industryCount: Record<string, number> = {};
  for (const s of signals) {
    typeCount[s.signal_type] = (typeCount[s.signal_type] || 0) + 1;
    industryCount[s.industry] = (industryCount[s.industry] || 0) + 1;
  }

  // --- Recent signals for the feed (latest 20) ---
  const sortedByDate = [...signals]
    .sort((a, b) => new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime())
    .slice(0, 20);

  // --- Trend data from daily signal counts (last 14 days) ---
  const trendDays: Record<string, Record<string, number>> = {};
  for (const s of signals) {
    const day = s.discovered_at.split('T')[0];
    const ind = s.industry || 'general';
    if (!trendDays[day]) trendDays[day] = {};
    trendDays[day][ind] = (trendDays[day][ind] || 0) + 1;
  }

  // Build time series for top 4 industries
  const topIndustryNames = rankedIndustries.slice(0, 4).map(g => g.industry);
  const sortedDates = Object.keys(trendDays).sort();

  const timeSeries = topIndustryNames.map(ind => ({
    cluster_id: ind,
    label: ind,
    points: sortedDates.map(date => ({
      date,
      score: trendDays[date][ind] || 0,
    })),
  }));

  // Trend snapshot (simple: growing if recent days > earlier days)
  const snapshot = topIndustryNames.map(ind => {
    const pts = sortedDates.map(d => trendDays[d][ind] || 0);
    const half = Math.floor(pts.length / 2);
    const firstHalf = pts.slice(0, half).reduce((a, b) => a + b, 0) / (half || 1);
    const secondHalf = pts.slice(half).reduce((a, b) => a + b, 0) / (pts.length - half || 1);
    const velocity = secondHalf - firstHalf;
    const trendLabel = velocity > 1 ? 'growing' : velocity < -1 ? 'declining' : 'stable';
    return {
      cluster_id: ind,
      label: ind,
      date: sortedDates[sortedDates.length - 1] || new Date().toISOString().split('T')[0],
      signal_count: pts.reduce((a, b) => a + b, 0),
      rolling_avg: (pts.reduce((a, b) => a + b, 0) / (pts.length || 1)).toFixed(1),
      velocity: velocity.toFixed(2),
      acceleration: '0',
      trend_score: velocity.toFixed(2),
      trend_label: trendLabel,
    };
  });

  const trendDistribution: Record<string, number> = { spiking: 0, growing: 0, stable: 0, declining: 0 };
  for (const s of snapshot) {
    if (s.trend_label in trendDistribution) trendDistribution[s.trend_label]++;
  }

  return NextResponse.json({
    briefing: {
      generated_at: new Date().toISOString(),
      total_signals: totalSignals || 0,
      signals_24h: signals24h || 0,
      last_pipeline_run: latestBriefing?.[0]?.generated_at || null,
      trend_distribution: trendDistribution,
      top_insights: topInsights,
      signal_stats: { by_type: typeCount, by_industry: industryCount },
      clusters: [],
      regions: [],
      recent_signals: sortedByDate,
      trends: {
        snapshot,
        time_series: timeSeries,
      },
    },
  });
}
