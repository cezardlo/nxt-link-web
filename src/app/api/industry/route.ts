export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';


export async function GET(req: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const industry = searchParams.get('industry') || 'manufacturing';

  // Parallel queries
  const [signalsRes, clustersRes, companiesRes, recentRes] = await Promise.all([
    // Signal breakdown by type
    supabase
      .from('intel_signals')
      .select('signal_type, amount_usd, importance_score, discovered_at')
      .eq('industry', industry)
      .gte('discovered_at', new Date(Date.now() - 90 * 86400000).toISOString())
      .order('discovered_at', { ascending: false }),

    // Clusters for this industry
    supabase
      .from('signal_clusters')
      .select('id, label, signal_type, signal_count, composite_rank, total_usd, avg_importance, status')
      .eq('industry', industry)
      .eq('status', 'active')
      .order('composite_rank', { ascending: false }),

    // Top companies
    supabase
      .from('intel_signals')
      .select('company, signal_type, amount_usd, importance_score')
      .eq('industry', industry)
      .not('company', 'is', null)
      .neq('company', '')
      .gte('discovered_at', new Date(Date.now() - 90 * 86400000).toISOString()),

    // Recent signals (latest 20)
    supabase
      .from('intel_signals')
      .select('id, title, signal_type, source, company, amount_usd, importance_score, discovered_at')
      .eq('industry', industry)
      .order('discovered_at', { ascending: false })
      .limit(20),
  ]);

  const signals = signalsRes.data || [];
  const clusters = clustersRes.data || [];
  const companySignals = companiesRes.data || [];
  const recentSignals = recentRes.data || [];

  // Aggregate by signal type
  const typeBreakdown: Record<string, { count: number; total_usd: number; avg_importance: number }> = {};
  for (const s of signals) {
    if (!typeBreakdown[s.signal_type]) {
      typeBreakdown[s.signal_type] = { count: 0, total_usd: 0, avg_importance: 0 };
    }
    typeBreakdown[s.signal_type].count++;
    typeBreakdown[s.signal_type].total_usd += s.amount_usd || 0;
    typeBreakdown[s.signal_type].avg_importance += s.importance_score || 0;
  }
  for (const key of Object.keys(typeBreakdown)) {
    typeBreakdown[key].avg_importance = typeBreakdown[key].avg_importance / typeBreakdown[key].count;
  }

  // Daily signal volume (last 14 days)
  const dailyVolume: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dailyVolume[d.toISOString().split('T')[0]] = 0;
  }
  for (const s of signals) {
    const day = s.discovered_at?.split('T')[0];
    if (day && dailyVolume[day] !== undefined) {
      dailyVolume[day]++;
    }
  }

  // Company aggregation
  const companyMap: Record<string, { signals: number; total_usd: number; types: Set<string> }> = {};
  for (const s of companySignals) {
    const name = s.company;
    if (!companyMap[name]) companyMap[name] = { signals: 0, total_usd: 0, types: new Set() };
    companyMap[name].signals++;
    companyMap[name].total_usd += s.amount_usd || 0;
    companyMap[name].types.add(s.signal_type);
  }
  const topCompanies = Object.entries(companyMap)
    .map(([name, data]) => ({ name, signals: data.signals, total_usd: data.total_usd, types: Array.from(data.types) }))
    .sort((a, b) => b.signals - a.signals)
    .slice(0, 10);

  // Get tendency data for this industry's clusters
  const clusterIds = clusters.map((c: { id: string }) => c.id);
  let tendencyData: { cluster_id: string; date: string; trend_score: number; trend_label: string }[] = [];
  if (clusterIds.length > 0) {
    const { data: td } = await supabase
      .from('cluster_metrics')
      .select('cluster_id, date, trend_score, trend_label')
      .in('cluster_id', clusterIds)
      .order('date', { ascending: true });
    tendencyData = td || [];
  }

  return NextResponse.json({
    industry,
    total_signals: signals.length,
    total_investment: signals.reduce((sum: number, s: { amount_usd: number | null }) => sum + (s.amount_usd || 0), 0),
    type_breakdown: Object.entries(typeBreakdown)
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.count - a.count),
    daily_volume: Object.entries(dailyVolume).map(([date, count]) => ({ date, count })),
    clusters,
    top_companies: topCompanies,
    recent_signals: recentSignals,
    tendency: tendencyData,
  });
}
