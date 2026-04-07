/**
 * GET /api/briefing — Top 3 supply chain intelligence insights for El Paso
 *
 * 1. Filters out junk (arXiv, generic market news)
 * 2. Prioritizes real logistics/border/trucking sources
 * 3. Picks 3 signals from DIFFERENT industries
 * 4. Calls Gemini once to analyze El Paso impact
 */

import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';
import { analyzeSignalIntake } from '@/lib/intelligence/source-intelligence';
import { FALLBACK_INTEL_SIGNALS } from '@/lib/intelligence/fallback-signals';
import { buildElPasoAssessmentReport } from '@/lib/intelligence/el-paso-relevance';
import type { IntelSignalRow } from '@/db/queries/intel-signals';

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
  region: string | null;
};

type VendorRow = {
  id: string;
  company_name: string;
  primary_category: string;
  iker_score: number | null;
};

type BriefingSignalRow = IntelSignalRow & Pick<SignalRow, 'vendor_id' | 'problem_category' | 'region'>;

function sanitize(text: string | null): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#8230;/g, '...').replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Sources that produce real logistics/supply chain intelligence */
const GOOD_SOURCES = [
  'freightwaves', 'supply chain dive', 'transport topics', 'the loadstar',
  'land line', 'commercial carrier journal', 'fleet owner', 'trucking info',
  'logistics management', 'journal of commerce', 'american shipper',
  'defense one', 'borderreport', 'reuters', 'associated press', 'bloomberg',
];

/** Sources that produce noise */
const JUNK_SOURCES = ['arxiv', 'arXiv'];

/** Check if a source is junk */
function isJunkSource(source: string | null): boolean {
  if (!source) return false;
  const lower = source.toLowerCase();
  return JUNK_SOURCES.some(j => lower.includes(j.toLowerCase()));
}

/** Score boost for high-value sources */
function sourceBoost(source: string | null): number {
  if (!source) return 0;
  const lower = source.toLowerCase();
  if (GOOD_SOURCES.some(g => lower.includes(g))) return 30;
  return 0;
}

/** Score boost for having a problem category (means it's actionable) */
function problemBoost(problem: string | null): number {
  return problem ? 15 : 0;
}

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
  const supabaseReady = isSupabaseConfigured();
  const supabase = supabaseReady ? createClient() : null;

  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const [
    { data: recentSignals },
    { count: totalSignals },
    { count: signals24h },
    { data: latestBriefing },
  ] = supabaseReady && supabase
    ? await Promise.all([
        supabase
          .from('intel_signals')
          .select('id, title, signal_type, industry, company, evidence, amount_usd, confidence, importance_score, discovered_at, source, tags, vendor_id, problem_category, region')
          .gte('discovered_at', since7d)
          .order('importance_score', { ascending: false })
          .limit(500),
        supabase.from('intel_signals').select('*', { count: 'exact', head: true }),
        supabase.from('intel_signals').select('*', { count: 'exact', head: true }).gte('discovered_at', since24h),
        supabase.from('daily_briefings').select('generated_at, briefing_date').order('briefing_date', { ascending: false }).limit(1),
      ])
    : [
        { data: FALLBACK_INTEL_SIGNALS as BriefingSignalRow[] },
        { count: FALLBACK_INTEL_SIGNALS.length },
        { count: FALLBACK_INTEL_SIGNALS.length },
        { data: [] },
      ];

  const rawSignals: BriefingSignalRow[] = supabaseReady
    ? ((recentSignals || []) as SignalRow[]).map((signal) => ({
        ...signal,
        url: null,
        created_at: signal.discovered_at,
      }))
    : FALLBACK_INTEL_SIGNALS;
  const intake = analyzeSignalIntake(rawSignals, { limit: 500, fallbackUsed: !supabaseReady });
  const signals = intake.signals;
  const elPasoReport = buildElPasoAssessmentReport(signals);
  const assessmentMap = new Map(elPasoReport.signalAssessments.map((item) => [item.id, item]));

  // Fetch vendor details
  const vendorIds = signals.filter(s => s.vendor_id).map(s => s.vendor_id!);
  const uniqueVendorIds = Object.keys(vendorIds.reduce((acc: Record<string, boolean>, id) => { acc[id] = true; return acc; }, {}));
  const vendorMap: Record<string, VendorRow> = {};
  if (supabaseReady && supabase && uniqueVendorIds.length > 0) {
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id, company_name, primary_category, iker_score')
      .in('id', uniqueVendorIds.slice(0, 50));
    if (vendors) {
      for (const v of vendors as VendorRow[]) vendorMap[v.id] = v;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // STEP 1: Filter + re-score signals for El Paso relevance
  // ──────────────────────────────────────────────────────────────
  const scoredSignals = signals
    .filter(s => !isJunkSource(s.source))                    // remove arXiv
    .filter(s => s.industry !== 'other')                     // remove "other"
    .filter(s => !s.title.toLowerCase().includes('arxiv'))   // catch any missed
    .map(s => {
      const assessment = assessmentMap.get(s.id);
      return ({
      ...s,
      briefing_score:
        (assessment?.opportunity_score ?? s.quality_score ?? s.importance_score) * 100 +
        (assessment?.el_paso_relevance ?? s.source_trust ?? 0.5) * 35 +
        (assessment?.urgency_score ?? s.evidence_quality ?? 0.4) * 25 +
        sourceBoost(s.source) +
        problemBoost(s.problem_category),
    });
    })
    .sort((a, b) => b.briefing_score - a.briefing_score);

  // ──────────────────────────────────────────────────────────────
  // STEP 2: Pick top 3 from DIFFERENT industries
  // ──────────────────────────────────────────────────────────────
  const top3: (typeof scoredSignals)[number][] = [];
  const usedIndustries: string[] = [];
  const usedTitlePrefixes: string[] = [];

  for (const s of scoredSignals) {
    if (top3.length >= 3) break;
    // Skip if we already have this industry
    if (usedIndustries.includes(s.industry)) continue;
    // Skip near-duplicate titles
    const prefix = s.title.toLowerCase().slice(0, 30);
    if (usedTitlePrefixes.some(p => p.startsWith(prefix.slice(0, 20)))) continue;
    top3.push(s);
    usedIndustries.push(s.industry);
    usedTitlePrefixes.push(prefix);
  }

  // If we couldn't fill 3 from different industries, fill from same
  if (top3.length < 3) {
    for (const s of scoredSignals) {
      if (top3.length >= 3) break;
      if (top3.some(t => t.id === s.id)) continue;
      const prefix = s.title.toLowerCase().slice(0, 30);
      if (usedTitlePrefixes.some(p => p.startsWith(prefix.slice(0, 20)))) continue;
      top3.push(s);
      usedTitlePrefixes.push(prefix);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // STEP 3: Call Gemini for El Paso analysis (1 call, all 3)
  // ──────────────────────────────────────────────────────────────
  type AnalyzedSignal = {
    whats_happening: string;
    el_paso_impact: string[];
    watch_for: string[];
    what_to_do: string[];
  };

  let aiAnalysis: AnalyzedSignal[] = [];

  if (top3.length > 0) {
    const signalSummaries = top3.map((s, i) => {
      // Find vendors related to this signal
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
Summary: ${sanitize(s.evidence).slice(0, 300)}
Source: ${s.source || 'unknown'}
Industry: ${s.industry}
Problem: ${s.problem_category || 'general'}
Company mentioned: ${s.company || 'none'}
Vendors in our database for this area: ${vendorNames.join(', ') || 'none found'}`;
    }).join('\n\n');

    try {
      const { result } = await runParallelJsonEnsemble<AnalyzedSignal[]>({
        systemPrompt: `You are a Jarvis-style global intelligence analyst briefing the leadership of a city at the center of the world's most important trade corridor.

The Borderplex (El Paso / Juárez) context:
- $126B in annual US-Mexico trade — #1 crossing in the Western Hemisphere
- Fort Bliss: one of the largest US Army installations, home to 1st Armored Division, THAAD missile defense testing, growing AI and autonomy programs
- UTEP: rising research university, NSF grants, cross-border research
- SpaceX Starbase: 45 minutes away — space economy emerging
- 300+ Juárez maquiladoras: manufacturing for Ford, Foxconn, Bosch, and more
- Space Valley positioning: El Paso is positioning as a technology test corridor
- Key sectors: Defense, Logistics, Border Tech, AI/ML, Manufacturing, Energy, Space

Your job is NOT to report news. Your job is to brief like a strategist:
- What PATTERNS are forming across sectors?
- What is ACCELERATING vs SLOWING?
- What is about to EMERGE that nobody sees yet?
- What does this mean for someone operating in the Borderplex?

Tone: Sharp. Strategic. No filler. Like a Palantir analyst briefing a general.`,
        userPrompt: `Analyze these ${top3.length} signals. For EACH, return:

1. "whats_happening" — 2-3 sentences on the STRATEGIC PATTERN this signal is part of. Not what happened — what it indicates about where a sector is heading. Think like a Palantir analyst, not a journalist.

2. "el_paso_impact" — 2-3 bullet points on how this pattern specifically intersects with the Borderplex — Fort Bliss, Juárez maquiladoras, BOTA/BOTE crossings, UTEP, or Space Valley. Name specific entities.

3. "watch_for" — 1-2 forward-looking signals: what would you see in the next 2-4 weeks if this pattern accelerates?

4. "what_to_do" — 1-2 strategic moves. Not "monitor this" — specific actions with named vendors or institutions.

Return a JSON array with ${top3.length} objects. No markdown, just JSON.

${signalSummaries}`,
        temperature: 0.3,
        preferredProviders: ['gemini'],
        budget: { maxProviders: 1, preferLowCostProviders: true },
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

  // ──────────────────────────────────────────────────────────────
  // STEP 4: Build insight cards
  // ──────────────────────────────────────────────────────────────
  const industryGroups: Record<string, typeof signals> = {};
  for (const s of signals) {
    const key = s.industry || 'other';
    if (!industryGroups[key]) industryGroups[key] = [];
    industryGroups[key].push(s);
  }

  const topInsights = top3.map((signal, i) => {
    const cleanTitle = sanitize(signal.title);
    const cleanEvidence = sanitize(signal.evidence);
    const problem = signal.problem_category;
    const ai = aiAnalysis[i];
    const assessment = assessmentMap.get(signal.id);

    // Find vendors
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

    // Use AI if available, fallback to evidence text
    const whats_happening = ai?.whats_happening || (cleanEvidence && cleanEvidence.length > 30 ? cleanEvidence : cleanTitle);
    const el_paso_impact = ai?.el_paso_impact || ['Monitoring impact on El Paso-Juárez corridor'];
    const watch_for = ai?.watch_for || ['Follow developments this week'];
    const action_bullets = ai?.what_to_do || ['Share with your operations team'];

    return {
      rank: i + 1,
      id: signal.id,
      title: cleanTitle,
      source: signal.source_label || signal.source || 'Unknown',
      discovered_at: signal.discovered_at,
      what_is_happening: whats_happening,
      why_it_matters: el_paso_impact.join('. ') + '.',
      where_its_going: action_bullets.join('. ') + '.',
      el_paso_impact,
      watch_for,
      action_bullets: assessment?.recommended_actions?.length
        ? assessment.recommended_actions.map((action) => action.replace(/-/g, ' '))
        : action_bullets,
      signal_count: industryGroups[signal.industry]?.length || 0,
      avg_score: signal.importance_score,
      industry: signal.industry,
      signal_type: signal.signal_type,
      opportunity_type: assessment?.opportunity_type ?? 'vendor',
      opportunity_score: assessment?.opportunity_score ?? signal.quality_score ?? signal.importance_score,
      urgency_score: assessment?.urgency_score ?? signal.importance_score,
      el_paso_relevance: assessment?.el_paso_relevance ?? signal.source_trust ?? 0.5,
      why_now: assessment?.why_now ?? 'This sits in the current operating window.',
      who_it_matters_to: assessment?.who_it_matters_to ?? ['regional operators'],
      local_pathway: assessment?.local_pathway ?? 'Potential El Paso relevance is still emerging.',
      suggested_targets: assessment?.suggested_targets ?? [],
      tracked_technologies: assessment?.tracked_technologies ?? [],
      confidence_explanation: assessment?.confidence_explanation ?? 'Confidence is based on source and evidence quality.',
      reason_for_ranking: assessment?.reason_for_ranking ?? [],
      what_changed_vs_last_week: assessment?.what_changed_vs_last_week ?? 'No week-over-week baseline yet.',
      problem_category: problem,
      problem_label: problem ? PROBLEM_LABELS[problem] || problem : null,
      related_signals: signals
        .filter(s => s.industry === signal.industry && s.id !== signal.id && !isJunkSource(s.source))
        .slice(0, 3)
        .map(s => ({
          id: s.id,
          title: sanitize(s.title),
          source: s.source_label || s.source || 'Unknown',
          discovered_at: s.discovered_at,
          signal_type: s.signal_type,
          relevance_score: s.quality_score ?? s.importance_score,
        })),
      vendors: industryVendors,
    };
  });

  // ──────────────────────────────────────────────────────────────
  // Signal stats + trends + recent (same as before)
  // ──────────────────────────────────────────────────────────────
  const typeCount: Record<string, number> = {};
  const industryCount: Record<string, number> = {};
  for (const s of signals) {
    typeCount[s.signal_type] = (typeCount[s.signal_type] || 0) + 1;
    industryCount[s.industry] = (industryCount[s.industry] || 0) + 1;
  }

  const sortedByDate = [...signals]
    .filter(s => !isJunkSource(s.source))
    .sort((a, b) => new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime())
    .slice(0, 20)
    .map(s => ({ ...s, title: sanitize(s.title), evidence: sanitize(s.evidence) }));

  const trendDays: Record<string, Record<string, number>> = {};
  for (const s of signals) {
    const day = s.discovered_at.split('T')[0];
    const ind = s.industry || 'other';
    if (!trendDays[day]) trendDays[day] = {};
    trendDays[day][ind] = (trendDays[day][ind] || 0) + 1;
  }

  const rankedIndustries = Object.entries(industryGroups)
    .map(([industry, sigs]) => ({ industry, signals: sigs, totalImportance: sigs.reduce((sum, s) => sum + (s.importance_score || 0), 0) }))
    .sort((a, b) => b.totalImportance - a.totalImportance);
  const topIndustryNames = rankedIndustries.slice(0, 4).map(g => g.industry);
  const sortedDates = Object.keys(trendDays).sort();

  const timeSeries = topIndustryNames.map(ind => ({
    cluster_id: ind, label: ind,
    points: sortedDates.map(date => ({ date, score: trendDays[date][ind] || 0 })),
  }));

  const snapshot = topIndustryNames.map(ind => {
    const pts = sortedDates.map(d => trendDays[d][ind] || 0);
    const half = Math.floor(pts.length / 2);
    const firstHalf = pts.slice(0, half).reduce((a, b) => a + b, 0) / (half || 1);
    const secondHalf = pts.slice(half).reduce((a, b) => a + b, 0) / (pts.length - half || 1);
    const velocity = secondHalf - firstHalf;
    return {
      cluster_id: ind, label: ind,
      date: sortedDates[sortedDates.length - 1] || new Date().toISOString().split('T')[0],
      signal_count: pts.reduce((a, b) => a + b, 0),
      rolling_avg: (pts.reduce((a, b) => a + b, 0) / (pts.length || 1)).toFixed(1),
      velocity: velocity.toFixed(2), acceleration: '0', trend_score: velocity.toFixed(2),
      trend_label: velocity > 1 ? 'growing' : velocity < -1 ? 'declining' : 'stable',
    };
  });

  const trendDistribution: Record<string, number> = { spiking: 0, growing: 0, stable: 0, declining: 0 };
  for (const s of snapshot) {
    if (s.trend_label in trendDistribution) trendDistribution[s.trend_label]++;
  }

  // Region aggregation from intel_signals.region column
  const REGION_NORMALIZE: Record<string, string> = {
    'USA': 'United States', 'US': 'United States', 'U.S.': 'United States',
    'UK': 'United Kingdom', 'UAE': 'United Arab Emirates',
    'unknown': '', 'Unknown': '', 'Global': '',
    'North America': 'United States',
    'California': 'United States', 'Texas': 'United States',
  };

  const regionAcc: Record<string, {
    total_signals: number;
    industries: Set<string>;
    total_investment_usd: number;
    max_importance: number;
  }> = {};

  for (const s of signals) {
    const raw = s.region || '';
    const name = REGION_NORMALIZE[raw] ?? raw;
    if (!name || name.length < 2) continue;

    if (!regionAcc[name]) {
      regionAcc[name] = { total_signals: 0, industries: new Set(), total_investment_usd: 0, max_importance: 0 };
    }
    regionAcc[name].total_signals++;
    regionAcc[name].industries.add(s.industry);
    if (s.amount_usd) regionAcc[name].total_investment_usd += s.amount_usd;
    if (s.importance_score > regionAcc[name].max_importance) regionAcc[name].max_importance = s.importance_score;
  }

  const regions = Object.entries(regionAcc)
    .map(([name, data]) => ({
      name,
      total_signals: data.total_signals,
      risk_level: data.total_signals >= 50 ? 'high' : data.total_signals >= 20 ? 'elevated' : data.total_signals >= 5 ? 'moderate' : 'low',
      opportunity_score: Math.min(100, data.max_importance + data.total_signals),
      industries: [...data.industries],
      total_investment_usd: data.total_investment_usd,
    }))
    .sort((a, b) => b.total_signals - a.total_signals);

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
      regions,
      recent_signals: sortedByDate,
      source_ops: {
        duplicates_filtered: intake.pipeline.duplicatesFiltered,
        low_evidence_discarded: intake.pipeline.lowEvidenceDiscarded,
        strongest_source: intake.pipeline.topTrustedSources[0]?.source ?? null,
      },
      local_relevance_summary: elPasoReport.opportunities.localRelevanceSummary,
      top_opportunities: elPasoReport.opportunities.topOpportunities,
      action_queue: elPasoReport.opportunities.actionQueue,
      memory: elPasoReport.memory,
      trends: { snapshot, time_series: timeSeries },
    },
  });
}
