/**
 * GET /api/briefing — Top 3 supply chain intelligence insights
 *
 * Returns:
 *   - top_insights (3 cards with what/why/where + related signals)
 *   - signal_stats (counts by type, industry, recent activity)
 *   - clusters (top clusters ranked by composite_rank)
 *   - regions (region intelligence with signal counts)
 *   - recent_signals (latest 20 signals for the feed)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();

  // Parallel fetch all data
  const [
    { data: insights },
    { data: signals },
    { data: clusters },
    { data: regions },
    { count: totalSignals },
    { data: trendMetrics },
  ] = await Promise.all([
    supabase.from('top_insights').select('*').order('rank', { ascending: true }).limit(3),
    supabase.from('intel_signals').select('id, title, signal_type, industry, company, relevance_score, discovered_at, source, source_domain').order('relevance_score', { ascending: false }).limit(50),
    supabase.from('signal_clusters').select('*').order('composite_rank', { ascending: false }).limit(10),
    supabase.from('region_intelligence').select('*').order('signal_count', { ascending: false }),
    supabase.from('intel_signals').select('*', { count: 'exact', head: true }),
    supabase.from('cluster_metrics').select('cluster_id, date, signal_count, rolling_avg, velocity, acceleration, trend_score, trend_label').order('date', { ascending: true }),
  ]);

  // Build signal stats
  const signalList = signals || [];
  const typeCount: Record<string, number> = {};
  const industryCount: Record<string, number> = {};
  for (const s of signalList) {
    typeCount[s.signal_type] = (typeCount[s.signal_type] || 0) + 1;
    industryCount[s.industry] = (industryCount[s.industry] || 0) + 1;
  }

  // Resolve related signals for each insight
  const enrichedInsights = (insights || []).map(insight => {
    const relatedIds = insight.related_signal_ids || [];
    const relatedSignals = relatedIds
      .map((id: string) => signalList.find(s => s.id === id))
      .filter(Boolean)
      .slice(0, 5);
    return { ...insight, related_signals: relatedSignals };
  });

  // Group regions by name (combine manufacturing + logistics)
  const regionMap: Record<string, { name: string; total_signals: number; risk_level: string; opportunity_score: number; industries: string[]; total_investment_usd: number }> = {};
  for (const r of (regions || [])) {
    if (!regionMap[r.region]) {
      regionMap[r.region] = { name: r.region, total_signals: 0, risk_level: r.risk_level, opportunity_score: r.opportunity_score, industries: [], total_investment_usd: 0 };
    }
    regionMap[r.region].total_signals += r.signal_count;
    regionMap[r.region].total_investment_usd += (r.total_investment_usd || 0);
    regionMap[r.region].industries.push(r.industry);
    // Use the higher risk level
    if (r.risk_level === 'high' || r.risk_level === 'critical') regionMap[r.region].risk_level = r.risk_level;
  }

  // Build trend data: latest snapshot per cluster + time series for top clusters
  const metricsList = trendMetrics || [];
  const clusterLabels: Record<string, string> = {};
  for (const c of (clusters || [])) { clusterLabels[c.id] = c.label; }

  // Latest metric per cluster
  const latestByCluster: Record<string, typeof metricsList[0] & { label: string }> = {};
  for (const m of metricsList) {
    if (!latestByCluster[m.cluster_id] || m.date > latestByCluster[m.cluster_id].date) {
      latestByCluster[m.cluster_id] = { ...m, label: clusterLabels[m.cluster_id] || m.cluster_id };
    }
  }
  const trendSnapshot = Object.values(latestByCluster)
    .sort((a, b) => Number(b.trend_score) - Number(a.trend_score));

  // Time series for top 6 clusters (last 14 days)
  const topClusterIds = trendSnapshot.slice(0, 6).map(t => t.cluster_id);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const trendTimeSeries: Record<string, { date: string; score: number }[]> = {};
  for (const m of metricsList) {
    if (topClusterIds.includes(m.cluster_id) && m.date >= cutoffStr) {
      if (!trendTimeSeries[m.cluster_id]) trendTimeSeries[m.cluster_id] = [];
      trendTimeSeries[m.cluster_id].push({ date: m.date, score: Number(m.trend_score) });
    }
  }

  return NextResponse.json({
    briefing: {
      generated_at: new Date().toISOString(),
      total_signals: totalSignals || 0,
      top_insights: enrichedInsights,
      signal_stats: { by_type: typeCount, by_industry: industryCount },
      clusters: (clusters || []).slice(0, 5),
      regions: Object.values(regionMap).sort((a, b) => b.total_signals - a.total_signals),
      recent_signals: signalList.slice(0, 20),
      trends: {
        snapshot: trendSnapshot,
        time_series: Object.entries(trendTimeSeries).map(([id, points]) => ({
          cluster_id: id,
          label: clusterLabels[id] || id,
          points,
        })),
      },
    },
  });
}
