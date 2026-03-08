// src/lib/agents/agents/trend-agent.ts
// Analyzes intel signals to detect emerging trends via keyword clustering.
// When multiple signal types (patents, funding, hiring, research) converge
// around a topic, that indicates a trend worth surfacing.

import { getIntelSignals, type IntelSignalRow } from '@/db/queries/intel-signals';
import { isSupabaseConfigured } from '@/db/client';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type DetectedTrend = {
  keyword: string;
  score: number;                    // 0-100
  stage: 'emerging' | 'accelerating' | 'established';
  signal_count: number;
  signal_types: string[];           // unique types found
  industries: string[];             // unique industries
  companies: string[];              // unique companies (max 5)
  latest_signal: string;            // most recent title
  first_seen: string;               // earliest discovered_at
};

export type TrendAgentResult = {
  trends: DetectedTrend[];
  signals_analyzed: number;
  duration_ms: number;
};

// ─── Stop Words ─────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'in', 'on', 'for', 'and', 'or', 'of', 'to', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can',
  'with', 'at', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'under', 'over', 'again',
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
  'such', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because',
  'not', 'but', 'what', 'which', 'who', 'whom', 'this', 'that', 'these',
  'those', 'its', 'his', 'her', 'their', 'our', 'your', 'they', 'them',
  'she', 'him', 'also', 'new', 'first', 'last', 'next', 'many', 'much',
  'well', 'back', 'even', 'still', 'now', 'says', 'said', 'report', 'reports',
  'according', 'company', 'companies', 'million', 'billion', 'year', 'years',
]);

// ─── Keyword Extraction ─────────────────────────────────────────────────────────

function extractKeywords(title: string): string[] {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

  // Deduplicate
  return Array.from(new Set(words));
}

// ─── Trend Scoring ──────────────────────────────────────────────────────────────

/** High-value signal types that indicate real activity, not just chatter */
const STRONG_TYPES = new Set([
  'patent_filing',
  'funding_round',
  'hiring_signal',
  'merger_acquisition',
  'contract_award',
  'facility_expansion',
]);

function classifyStage(count: number): 'emerging' | 'accelerating' | 'established' {
  if (count >= 10) return 'established';
  if (count >= 6) return 'accelerating';
  return 'emerging';
}

function computeTrendScore(
  signalCount: number,
  uniqueTypes: string[],
  signals: IntelSignalRow[],
): number {
  // 1. Diversity: more signal types = stronger trend
  const typeDiversity = Math.min(uniqueTypes.length / 5, 1); // cap at 5 types

  // 2. Strong-type bonus: patents + funding + hiring converging is meaningful
  const strongCount = uniqueTypes.filter((t) => STRONG_TYPES.has(t)).length;
  const strongBonus = Math.min(strongCount / 3, 1); // cap at 3 strong types

  // 3. Volume factor (log scale, diminishing returns)
  const volumeFactor = Math.min(Math.log2(signalCount) / 5, 1);

  // 4. Recency boost: fraction of signals from last 7 days
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const recentCount = signals.filter(
    (s) => now - new Date(s.discovered_at).getTime() < sevenDaysMs,
  ).length;
  const recencyRatio = signalCount > 0 ? recentCount / signalCount : 0;

  // 5. Average importance of constituent signals
  const avgImportance =
    signals.reduce((sum, s) => sum + s.importance_score, 0) / (signalCount || 1);

  // Weighted combination
  const raw =
    typeDiversity * 25 +
    strongBonus * 20 +
    volumeFactor * 20 +
    recencyRatio * 15 +
    avgImportance * 20;

  return Math.min(100, Math.max(0, Math.round(raw)));
}

// ─── Main Agent ─────────────────────────────────────────────────────────────────

export async function runTrendAgent(): Promise<TrendAgentResult> {
  const start = Date.now();

  if (!isSupabaseConfigured()) {
    return { trends: [], signals_analyzed: 0, duration_ms: Date.now() - start };
  }

  // 1. Fetch recent signals
  const signals = await getIntelSignals({ limit: 500 });

  if (signals.length === 0) {
    return { trends: [], signals_analyzed: 0, duration_ms: Date.now() - start };
  }

  // 2. Group signals by extracted keywords
  const keywordMap = new Map<string, IntelSignalRow[]>();

  for (const signal of signals) {
    const keywords = extractKeywords(signal.title);
    for (const kw of keywords) {
      const existing = keywordMap.get(kw);
      if (existing) {
        existing.push(signal);
      } else {
        keywordMap.set(kw, [signal]);
      }
    }
  }

  // 3. Build trends from clusters with 3+ signals
  const trends: DetectedTrend[] = [];

  for (const [keyword, cluster] of Array.from(
    keywordMap.entries() as Iterable<[string, IntelSignalRow[]]>,
  )) {
    if (cluster.length < 3) continue;

    const uniqueTypes = Array.from(new Set(cluster.map((s) => s.signal_type)));
    const uniqueIndustries = Array.from(new Set(cluster.map((s) => s.industry)));
    const uniqueCompanies = Array.from(
      new Set(cluster.map((s) => s.company).filter((c): c is string => c !== null)),
    ).slice(0, 5);

    // Sort cluster by discovered_at descending to find latest/earliest
    const sorted = [...cluster].sort(
      (a, b) => new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime(),
    );

    const score = computeTrendScore(cluster.length, uniqueTypes, cluster);

    trends.push({
      keyword,
      score,
      stage: classifyStage(cluster.length),
      signal_count: cluster.length,
      signal_types: uniqueTypes,
      industries: uniqueIndustries,
      companies: uniqueCompanies,
      latest_signal: sorted[0].title,
      first_seen: sorted[sorted.length - 1].discovered_at,
    });
  }

  // 4. Sort by score descending, take top 20
  trends.sort((a, b) => b.score - a.score);
  const topTrends = trends.slice(0, 20);

  return {
    trends: topTrends,
    signals_analyzed: signals.length,
    duration_ms: Date.now() - start,
  };
}
