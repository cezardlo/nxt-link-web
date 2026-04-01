/**
 * GET /api/briefing — Top 3 supply chain intelligence insights
 *
 * Computes everything from intel_signals (the real data).
 * Focuses on logistics/trucking/border-tech. Surfaces vendors + problems.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';

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

/** El Paso / Borderplex impact context by problem + industry */
const EP_IMPACT: Record<string, string[]> = {
  // Problem-based impacts
  border_delays: [
    'Could increase wait times at Ysleta, BOTA, or Santa Teresa POEs',
    'Cross-border freight between El Paso and Juarez may slow down',
    'Maquiladora supply chains could face delays',
  ],
  customs: [
    'USMCA compliance requirements may shift for El Paso importers/exporters',
    'Customs brokers in the Borderplex may need to adjust filings',
    'Cross-border trade costs between US and Mexico could change',
  ],
  cost: [
    'Freight and drayage costs in the El Paso corridor may rise',
    'Fuel and transport pricing for cross-border carriers could shift',
    'Operating costs for maquiladora logistics may increase',
  ],
  routing: [
    'Trucking routes through the Borderplex may need rerouting',
    'Carriers using El Paso as a gateway could face disruptions',
    'Intermodal connections at El Paso rail hubs may be affected',
  ],
  documentation_errors: [
    'Customs paperwork for El Paso-Juarez crossings may need updates',
    'Documentation requirements for Borderplex trade could change',
  ],
  erp_integration: [
    'Local manufacturers may need to update their systems',
    'Borderplex companies on legacy ERPs could fall further behind',
  ],
  labor_shortage: [
    'El Paso warehouse and driver labor pool may tighten',
    'Cross-border workforce dynamics could shift',
  ],
  // Industry-based fallbacks
  logistics: [
    'El Paso is a top-10 US logistics hub — this affects local carriers and warehouses',
    'Cross-border freight volume through the Borderplex could shift',
  ],
  manufacturing: [
    'Juarez has 300+ maquiladoras — manufacturing shifts affect the whole Borderplex',
    'El Paso-area manufacturers and suppliers may see ripple effects',
  ],
  'border-tech': [
    'Border technology and security systems in the El Paso sector may be impacted',
    'CBP and DHS operations at local POEs could change',
  ],
  defense: [
    'Fort Bliss operations and defense contractors in El Paso may be affected',
    'Defense supply chain through the Borderplex could see changes',
  ],
  energy: [
    'Energy costs for El Paso industrial operations could shift',
    'Fuel pricing at Borderplex terminals may be impacted',
  ],
  tech: [
    'Tech adoption in Borderplex logistics and manufacturing may be affected',
    'Local companies evaluating these solutions should take note',
  ],
};

/** Get El Paso impact bullets for a signal */
function getElPasoImpact(problemCategory: string | null, industry: string): string[] {
  // Try problem-specific first, then industry fallback
  if (problemCategory && EP_IMPACT[problemCategory]) {
    return EP_IMPACT[problemCategory].slice(0, 2);
  }
  if (EP_IMPACT[industry]) {
    return EP_IMPACT[industry].slice(0, 2);
  }
  return ['Monitor how this affects supply chains through the El Paso-Juarez corridor'];
}

/** Get "watch for" bullets based on signal context */
function getWatchFor(signal: SignalRow, problemCategory: string | null): string[] {
  const bullets: string[] = [];
  if (signal.amount_usd && signal.amount_usd > 0) {
    bullets.push(`Dollar amount involved: $${(signal.amount_usd / 1e6).toFixed(0)}M`);
  }
  if (problemCategory === 'border_delays') bullets.push('Check POE wait times this week');
  if (problemCategory === 'customs') bullets.push('Watch for new tariff or compliance announcements');
  if (problemCategory === 'cost') bullets.push('Track freight rate changes in your contracts');
  if (problemCategory === 'routing') bullets.push('Check for route advisories or port congestion');
  if (signal.signal_type === 'merger_acquisition') bullets.push('Watch for supply chain consolidation effects');
  if (signal.signal_type === 'funding_round') bullets.push('New funding means this company is scaling — could be a future vendor');
  if (signal.signal_type === 'contract_award') bullets.push('See if this contract affects your suppliers or competitors');
  if (signal.signal_type === 'facility_expansion') bullets.push('New capacity coming — could change local competition');
  if (bullets.length === 0) bullets.push('Follow up on this in the next 1-2 weeks');
  return bullets.slice(0, 3);
}

/** Get "what to do" bullets */
function getActionBullets(vendors: { name: string; category: string }[], problemCategory: string | null): string[] {
  const bullets: string[] = [];
  if (vendors.length > 0) {
    bullets.push(`Talk to: ${vendors.map(v => v.name).join(', ')}`);
  }
  if (problemCategory === 'border_delays') bullets.push('Review your crossing schedules and backup POE options');
  else if (problemCategory === 'customs') bullets.push('Check with your customs broker on compliance updates');
  else if (problemCategory === 'cost') bullets.push('Review carrier contracts and lock in rates where possible');
  else if (problemCategory === 'routing') bullets.push('Confirm your routes and have backup plans ready');
  else if (problemCategory === 'labor_shortage') bullets.push('Review staffing levels and retention plans');
  else bullets.push('Share this with your operations team');
  if (vendors.length === 0) bullets.push('Look for vendors in this space — gap in your coverage');
  return bullets.slice(0, 3);
}

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

  const vendorMap: Record<string, VendorRow> = {};
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

  // --- Pick Top 3 individual signals (focus industries, skip "other") ---
  const focusSignals = signals
    .filter(s => FOCUS_INDUSTRIES.includes(s.industry) && s.industry !== 'other')
    .slice(0, 50);

  // Deduplicate by title similarity (skip near-duplicates)
  const seenTitles: string[] = [];
  const uniqueSignals = focusSignals.filter(s => {
    const normalized = s.title.toLowerCase().slice(0, 40);
    if (seenTitles.some(t => t.startsWith(normalized.slice(0, 25)))) return false;
    seenTitles.push(normalized);
    return true;
  });

  const top3 = uniqueSignals.slice(0, 3);

  // Also group by industry for stats
  const industryGroups: Record<string, SignalRow[]> = {};
  for (const s of signals) {
    const key = s.industry || 'other';
    if (!industryGroups[key]) industryGroups[key] = [];
    industryGroups[key].push(s);
  }
  const rankedIndustries = Object.entries(industryGroups)
    .map(([industry, sigs]) => ({ industry, signals: sigs, totalImportance: sigs.reduce((sum, s) => sum + (s.importance_score || 0), 0) }))
    .sort((a, b) => b.totalImportance - a.totalImportance);

  // --- Ask Gemini to analyze top 3 signals for El Paso impact ---
  type AnalyzedSignal = {
    whats_happening: string;
    el_paso_impact: string[];
    watch_for: string[];
    what_to_do: string[];
  };

  let aiAnalysis: AnalyzedSignal[] = [];

  if (top3.length > 0) {
    const signalSummaries = top3.map((s, i) => {
      const vendorNames: string[] = [];
      for (const sig of signals) {
        if (sig.vendor_id && vendorMap[sig.vendor_id] && sig.industry === s.industry) {
          const name = vendorMap[sig.vendor_id].company_name;
          if (!vendorNames.includes(name)) vendorNames.push(name);
          if (vendorNames.length >= 3) break;
        }
      }
      return `Signal ${i + 1}:
Title: ${sanitize(s.title)}
Evidence: ${sanitize(s.evidence).slice(0, 200)}
Industry: ${s.industry}
Type: ${s.signal_type}
Company: ${s.company || 'none'}
Problem: ${s.problem_category || 'none'}
Related vendors in our database: ${vendorNames.join(', ') || 'none'}`;
    }).join('\n\n');

    try {
      const { result } = await runParallelJsonEnsemble<AnalyzedSignal[]>({
        systemPrompt: `You are a supply chain analyst for the El Paso-Juárez Borderplex region. El Paso is a top-10 US logistics hub with 300+ maquiladoras in Juárez, Fort Bliss military base, and 4 international ports of entry (Ysleta, BOTA, Santa Teresa, Stanton).

Analyze each signal and return JSON. Be specific to El Paso. Use simple language. Short bullet points.`,
        userPrompt: `Analyze these ${top3.length} signals. For each one, explain:
1. whats_happening: One sentence, plain English, what this news means (not just the title)
2. el_paso_impact: 2-3 bullet points, how this specifically affects El Paso, Juárez, or the Borderplex
3. watch_for: 1-2 things to monitor this week
4. what_to_do: 1-2 concrete actions (include vendor names if provided)

Return a JSON array of objects. Keep bullets SHORT (under 15 words each).

${signalSummaries}`,
        temperature: 0.3,
        preferredProviders: ['gemini'],
        budget: { maxCostUsd: 0.01 },
        parse: (content) => {
          const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          return JSON.parse(cleaned) as AnalyzedSignal[];
        },
      });
      aiAnalysis = result;
    } catch (err) {
      console.warn('[briefing] AI analysis failed, using fallback:', err);
    }
  }

  // Build top 3 insight cards
  const topInsights = top3.map((signal, i) => {
    const cleanTitle = sanitize(signal.title);
    const cleanEvidence = sanitize(signal.evidence);
    const problem = signal.problem_category;
    const ai = aiAnalysis[i];

    // Find vendors for this signal's industry/problem
    const industryVendors: { name: string; category: string; iker_score: number | null }[] = [];
    if (signal.vendor_id && vendorMap[signal.vendor_id]) {
      const v = vendorMap[signal.vendor_id];
      industryVendors.push({ name: v.company_name, category: v.primary_category, iker_score: v.iker_score });
    }
    for (const s of signals) {
      if (s.vendor_id && s.vendor_id !== signal.vendor_id && vendorMap[s.vendor_id]) {
        if ((problem && s.problem_category === problem) || s.industry === signal.industry) {
          const v = vendorMap[s.vendor_id];
          if (!industryVendors.some(iv => iv.name === v.company_name)) {
            industryVendors.push({ name: v.company_name, category: v.primary_category, iker_score: v.iker_score });
          }
        }
      }
      if (industryVendors.length >= 3) break;
    }

    // Use AI analysis if available, otherwise fallback to templates
    const el_paso_impact = ai?.el_paso_impact || getElPasoImpact(problem, signal.industry);
    const watch_for = ai?.watch_for || getWatchFor(signal, problem);
    const action_bullets = ai?.what_to_do || getActionBullets(industryVendors, problem);
    const whats_happening = ai?.whats_happening || (cleanEvidence && cleanEvidence.length > 30 ? cleanEvidence : cleanTitle);

    const industryCount = industryGroups[signal.industry]?.length || 0;

    return {
      rank: i + 1,
      title: cleanTitle,
      what_is_happening: whats_happening,
      why_it_matters: el_paso_impact.join('. ') + '.',
      where_its_going: action_bullets.join('. ') + '.',
      el_paso_impact,
      watch_for,
      action_bullets,
      signal_count: industryCount,
      avg_score: signal.importance_score,
      industry: signal.industry,
      signal_type: signal.signal_type,
      problem_category: problem,
      problem_label: problem ? PROBLEM_LABELS[problem] || problem : null,
      related_signals: signals
        .filter(s => s.industry === signal.industry && s.id !== signal.id)
        .slice(0, 3)
        .map(s => ({
          id: s.id,
          title: sanitize(s.title),
          source: s.source || 'Unknown',
          discovered_at: s.discovered_at,
          signal_type: s.signal_type,
          relevance_score: s.importance_score,
        })),
      vendors: industryVendors,
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
