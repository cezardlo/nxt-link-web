/**
 * GET /api/briefing — Top 3 supply chain intelligence insights
 *
 * Computes everything from intel_signals (the real data).
 * Focuses on logistics/trucking/border-tech. Surfaces vendors + problems.
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
  discovered_at: string;
  source: string | null;
  tags: string[];
  vendor_id: string | null;
  problem_category: string | null;
};

type VendorRow = {
  id: string;
  company_name: string;
  primary_category: string;
  iker_score: number | null;
};

/** Strip HTML tags and decode entities from evidence text */
function sanitize(text: string | null): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8230;/g, '...')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Priority industries for a trucking/logistics platform */
const FOCUS_INDUSTRIES = ['logistics', 'border-tech', 'manufacturing', 'defense', 'energy', 'government', 'tech'];

/** Human-readable problem labels */
const PROBLEM_LABELS: Record<string, string> = {
  border_delays: 'Border & Crossing Delays',
  documentation_errors: 'Documentation & Compliance Errors',
  erp_integration: 'System Integration Gaps',
  customs: 'Trade & Customs Risk',
  cost: 'Cost Pressure',
  routing: 'Route Disruptions',
  labor_shortage: 'Labor & Workforce Gaps',
};

export async function GET() {
  const supabase = createClient();

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
      .select('id, title, signal_type, industry, company, evidence, amount_usd, confidence, importance_score, discovered_at, source, tags, vendor_id, problem_category')
      .gte('discovered_at', since7d)
      .order('importance_score', { ascending: false })
      .limit(300),
    supabase.from('intel_signals').select('*', { count: 'exact', head: true }),
    supabase.from('intel_signals').select('*', { count: 'exact', head: true }).gte('discovered_at', since24h),
    supabase.from('daily_briefings').select('generated_at, briefing_date').order('briefing_date', { ascending: false }).limit(1),
  ]);

  const signals = (recentSignals || []) as SignalRow[];

  // Collect vendor IDs to fetch vendor details
  const vendorIds = signals.filter(s => s.vendor_id).map(s => s.vendor_id!);
  const uniqueVendorIds = Object.keys(vendorIds.reduce((acc: Record<string, boolean>, id) => { acc[id] = true; return acc; }, {}));

  let vendorMap: Record<string, VendorRow> = {};
  if (uniqueVendorIds.length > 0) {
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id, company_name, primary_category, iker_score')
      .in('id', uniqueVendorIds.slice(0, 50));
    if (vendors) {
      for (const v of vendors as VendorRow[]) {
        vendorMap[v.id] = v;
      }
    }
  }

  // --- Group signals by industry, prioritizing focus industries ---
  const industryGroups: Record<string, SignalRow[]> = {};
  for (const s of signals) {
    const key = s.industry || 'other';
    if (!industryGroups[key]) industryGroups[key] = [];
    industryGroups[key].push(s);
  }

  // Rank: focus industries first, then by signal volume
  const rankedIndustries = Object.entries(industryGroups)
    .map(([industry, sigs]) => {
      const focusIdx = FOCUS_INDUSTRIES.indexOf(industry);
      return {
        industry,
        signals: sigs,
        totalImportance: sigs.reduce((sum, s) => sum + (s.importance_score || 0), 0),
        avgImportance: sigs.reduce((sum, s) => sum + (s.importance_score || 0), 0) / sigs.length,
        topSignal: sigs[0],
        focusPriority: focusIdx >= 0 ? focusIdx : 100, // focus industries sort first
      };
    })
    .filter(g => g.industry !== 'other') // exclude "other" from top insights
    .sort((a, b) => {
      // Primary: focus industries first
      if (a.focusPriority !== b.focusPriority) return a.focusPriority - b.focusPriority;
      // Secondary: by total importance
      return b.totalImportance - a.totalImportance;
    });

  // Build top 3 insight cards
  const topInsights = rankedIndustries.slice(0, 3).map((group, i) => {
    const top = group.topSignal;
    const topSignals = group.signals.slice(0, 5);

    // Dominant signal type
    const typeCounts: Record<string, number> = {};
    for (const s of group.signals) {
      typeCounts[s.signal_type] = (typeCounts[s.signal_type] || 0) + 1;
    }
    const dominantType = Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'discovery';

    // Companies mentioned
    const companySet: Record<string, boolean> = {};
    for (const s of group.signals) { if (s.company) companySet[s.company] = true; }
    const companies = Object.keys(companySet).slice(0, 4);

    // Problem categories in this cluster
    const problemCounts: Record<string, number> = {};
    for (const s of group.signals) {
      if (s.problem_category) {
        problemCounts[s.problem_category] = (problemCounts[s.problem_category] || 0) + 1;
      }
    }
    const topProblems = Object.entries(problemCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([p, count]) => ({ key: p, label: PROBLEM_LABELS[p] || p, count }));

    // Vendors linked to signals in this cluster
    const linkedVendors: Record<string, VendorRow> = {};
    for (const s of group.signals) {
      if (s.vendor_id && vendorMap[s.vendor_id]) {
        linkedVendors[s.vendor_id] = vendorMap[s.vendor_id];
      }
    }
    const vendorList = Object.values(linkedVendors)
      .sort((a, b) => (b.iker_score || 0) - (a.iker_score || 0))
      .slice(0, 4)
      .map(v => ({ name: v.company_name, category: v.primary_category, iker_score: v.iker_score }));

    // Clean evidence from top signals (no HTML)
    const cleanEvidence = topSignals
      .map(s => sanitize(s.evidence))
      .filter(e => e.length > 30 && !e.startsWith('[') && !e.startsWith('http'))
      .slice(0, 3);

    // --- Build narrative fields ---
    const what_is_happening = sanitize(top.title) + (cleanEvidence[0] ? ` — ${cleanEvidence[0]}` : '');

    // "Why it matters" — specific, not generic
    const problemMention = topProblems.length > 0
      ? ` Core issues: ${topProblems.map(p => `${p.label} (${p.count} signals)`).join(', ')}.`
      : '';
    const companyMention = companies.length > 0
      ? ` Key players: ${companies.join(', ')}.`
      : '';
    const why_it_matters = cleanEvidence[1]
      ? `${sanitize(cleanEvidence[1])}${companyMention}${problemMention}`
      : `${group.signals.length} signals in ${group.industry} this week.${companyMention}${problemMention}`;

    // "Where it's going" — actionable, with vendors
    let where_its_going: string;
    if (vendorList.length > 0) {
      const vendorNames = vendorList.map(v => v.name).join(', ');
      where_its_going = topProblems.length > 0
        ? `Vendors addressing this: ${vendorNames}. Focus on ${topProblems[0].label.toLowerCase()} — ${topProblems[0].count} signals and rising.`
        : `Vendors to watch: ${vendorNames}. ${group.signals.length} signals this week — monitor for procurement opportunities.`;
    } else if (topProblems.length > 0) {
      where_its_going = `${topProblems[0].count} signals point to ${topProblems[0].label.toLowerCase()}. Review vendor coverage in this area — potential gap.`;
    } else {
      where_its_going = `${group.signals.length} signals this week. High activity — watch for contract awards and partnership announcements.`;
    }

    // Related signals
    const related_signals = topSignals.map(s => ({
      id: s.id,
      title: sanitize(s.title),
      source: s.source || 'Unknown',
      discovered_at: s.discovered_at,
      signal_type: s.signal_type,
      relevance_score: s.importance_score,
    }));

    return {
      rank: i + 1,
      title: sanitize(top.title),
      what_is_happening,
      why_it_matters,
      where_its_going,
      signal_count: group.signals.length,
      avg_score: Math.round(group.avgImportance * 100) / 100,
      industry: group.industry,
      signal_type: dominantType,
      related_signals,
      vendors: vendorList,
      problems: topProblems,
    };
  });

  // --- Signal stats ---
  const typeCount: Record<string, number> = {};
  const industryCount: Record<string, number> = {};
  for (const s of signals) {
    typeCount[s.signal_type] = (typeCount[s.signal_type] || 0) + 1;
    industryCount[s.industry] = (industryCount[s.industry] || 0) + 1;
  }

  // --- Recent signals (latest 20, sanitized) ---
  const sortedByDate = [...signals]
    .sort((a, b) => new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime())
    .slice(0, 20)
    .map(s => ({ ...s, title: sanitize(s.title), evidence: sanitize(s.evidence) }));

  // --- Trend data ---
  const trendDays: Record<string, Record<string, number>> = {};
  for (const s of signals) {
    const day = s.discovered_at.split('T')[0];
    const ind = s.industry || 'other';
    if (!trendDays[day]) trendDays[day] = {};
    trendDays[day][ind] = (trendDays[day][ind] || 0) + 1;
  }

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
