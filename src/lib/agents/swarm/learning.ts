// Swarm learning — NXT//LINK platform
// Agent-to-agent feedback loop. Agents rate each other's memory entries,
// building reliability scores used to weight routing decisions.
//
// Enhanced with:
//  • Pattern Learning System — signal combos that predict real events
//  • IKER Score Auto-Update — entity intelligence/reliability scoring
//  • Industry Cluster Detection — emerging technology term detection
//  • Learning Memory Store — unified stats + reset for all subsystems

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import type { SignalFinding, SignalType } from '@/lib/intelligence/signal-engine';

export type SwarmRating = 'useful' | 'noise' | 'critical';

export type SwarmFeedback = {
  id: string;
  memory_entry_id: string;
  rated_by_agent: string;
  rating: SwarmRating;
  context?: string;
  created_at: string;
};

export type AgentReliability = {
  agent_name: string;
  total_findings: number;
  useful_count: number;
  noise_count: number;
  critical_count: number;
  /** 0.0 – 1.0. Weighted: critical=1.2, useful=1.0, noise=0.0 */
  reliability_score: number;
};

// In-memory fallback storage
const feedbackStore: SwarmFeedback[] = [];
let feedbackCounter = 0;

// Weight constants used consistently for scoring
const WEIGHT_CRITICAL = 1.2;
const WEIGHT_USEFUL = 1.0;
const WEIGHT_NOISE = 0.0;

function computeReliabilityScore(useful: number, noise: number, critical: number): number {
  const total = useful + noise + critical;
  if (total === 0) return 0.5; // Default neutral score with no data
  const weightedPositive = critical * WEIGHT_CRITICAL + useful * WEIGHT_USEFUL + noise * WEIGHT_NOISE;
  const maxPossible = total * WEIGHT_CRITICAL;
  return maxPossible > 0 ? Math.min(1, weightedPositive / maxPossible) : 0.5;
}

export async function swarmRateFinding(
  entryId: string,
  agentName: string,
  rating: SwarmRating,
  context?: string,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    feedbackStore.push({
      id: `local-${++feedbackCounter}`,
      memory_entry_id: entryId,
      rated_by_agent: agentName,
      rating,
      context,
      created_at: new Date().toISOString(),
    });
    return;
  }

  const supabase = createClient({ admin: true });
  const { error } = await supabase.from('swarm_learning').insert({
    memory_entry_id: entryId,
    rated_by_agent: agentName,
    rating,
    context: context ?? null,
  });

  if (error) {
    console.warn('[SwarmLearning] RateFinding failed:', error.message);
    // Still persist locally so nothing is lost
    feedbackStore.push({
      id: `local-${++feedbackCounter}`,
      memory_entry_id: entryId,
      rated_by_agent: agentName,
      rating,
      context,
      created_at: new Date().toISOString(),
    });
  }
}

export async function swarmGetAgentReliability(agentName?: string): Promise<AgentReliability[]> {
  if (!isSupabaseConfigured()) {
    // Aggregate local feedback against swarm_memory (in-memory).
    // We only have rating records here, so group by the agent who produced the entry.
    // Since we don't have a cross-reference to memory entries in local mode, group by rated_by_agent
    // and treat ratings as a proxy for the issuing agent's reliability.
    const grouped = new Map<string, { useful: number; noise: number; critical: number }>();

    for (const fb of feedbackStore) {
      if (agentName && fb.rated_by_agent !== agentName) continue;
      const key = fb.rated_by_agent;
      const current = grouped.get(key) ?? { useful: 0, noise: 0, critical: 0 };
      if (fb.rating === 'useful') current.useful += 1;
      else if (fb.rating === 'noise') current.noise += 1;
      else if (fb.rating === 'critical') current.critical += 1;
      grouped.set(key, current);
    }

    return Array.from(grouped.entries() as Iterable<[string, { useful: number; noise: number; critical: number }]>).map(
      ([name, counts]) => ({
        agent_name: name,
        total_findings: counts.useful + counts.noise + counts.critical,
        useful_count: counts.useful,
        noise_count: counts.noise,
        critical_count: counts.critical,
        reliability_score: computeReliabilityScore(counts.useful, counts.noise, counts.critical),
      }),
    );
  }

  const supabase = createClient({ admin: true });

  // Join swarm_learning with swarm_memory to attribute ratings to the original author.
  const { data, error } = await supabase
    .from('swarm_learning')
    .select('rating, swarm_memory(agent_name)');

  if (error) {
    console.warn('[SwarmLearning] GetAgentReliability failed:', error.message);
    return [];
  }

  type LearningRow = {
    rating: string;
    // Supabase returns joined rows as arrays; we take the first element.
    swarm_memory: Array<{ agent_name: string }> | { agent_name: string } | null;
  };

  const rows = (data ?? []) as unknown as LearningRow[];
  const grouped = new Map<string, { useful: number; noise: number; critical: number }>();

  for (const row of rows) {
    // Normalise whether the join came back as object or single-element array
    const memoryEntry = Array.isArray(row.swarm_memory)
      ? row.swarm_memory[0]
      : row.swarm_memory;
    const name = memoryEntry?.agent_name ?? 'unknown';
    if (agentName && name !== agentName) continue;
    const current = grouped.get(name) ?? { useful: 0, noise: 0, critical: 0 };
    if (row.rating === 'useful') current.useful += 1;
    else if (row.rating === 'noise') current.noise += 1;
    else if (row.rating === 'critical') current.critical += 1;
    grouped.set(name, current);
  }

  return Array.from(grouped.entries() as Iterable<[string, { useful: number; noise: number; critical: number }]>).map(
    ([name, counts]) => ({
      agent_name: name,
      total_findings: counts.useful + counts.noise + counts.critical,
      useful_count: counts.useful,
      noise_count: counts.noise,
      critical_count: counts.critical,
      reliability_score: computeReliabilityScore(counts.useful, counts.noise, counts.critical),
    }),
  );
}

export async function swarmGetRoutingWeights(): Promise<Record<string, number>> {
  const reliabilities = await swarmGetAgentReliability();

  const weights: Record<string, number> = {};

  for (const r of reliabilities) {
    // Scale: score 0.5 (neutral) → weight 1.0; score 1.0 → weight 2.0; score 0.0 → weight 0.5
    // Formula: weight = 0.5 + reliability_score * 1.5
    // This keeps unreliable agents at half-weight rather than zero to avoid dead ends.
    weights[r.agent_name] = 0.5 + r.reliability_score * 1.5;
  }

  return weights;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — Pattern Learning System
// A SignalPattern records signal-type combinations that historically precede
// confirmed real-world events (contract awards, regulatory actions, etc.).
// ─────────────────────────────────────────────────────────────────────────────

export type SignalPattern = {
  id: string;
  /** Ordered list of SignalTypes that together constitute this pattern. */
  signalTypes: SignalType[];
  sectorId: string;
  /** Number of times this pattern's prediction was confirmed as a real event. */
  confirmationCount: number;
  falsePositiveCount: number;
  /**
   * 0–0.5. Added to the base confidence of every matching signal when this
   * pattern is active, rewarding historically reliable combinations.
   */
  confidenceBoost: number;
  lastConfirmed: string;
  createdAt: string;
};

// ── In-memory pattern store (fallback when Supabase is unavailable) ──────────
const patternStore = new Map<string, SignalPattern>();
let patternCounter = 0;

/**
 * Derive a stable, order-independent pattern key from a set of SignalTypes
 * so that ['velocity_spike','contract_alert'] and ['contract_alert','velocity_spike']
 * hash to the same pattern bucket.
 */
function patternKey(signalTypes: SignalType[], sectorId: string): string {
  return [...signalTypes].sort().join('+') + '@' + sectorId;
}

/**
 * Recompute the confidence boost for a pattern.
 * Boost grows with confirmation rate, capped at 0.5.
 * Formula: boost = min(0.5, confirmations / (confirmations + falsePositives + 1) * 0.6)
 */
function computeConfidenceBoost(confirmed: number, falsePositives: number): number {
  return Math.min(0.5, (confirmed / (confirmed + falsePositives + 1)) * 0.6);
}

/**
 * When a batch of signals arrives for a sector, check every known pattern to
 * see if the current signal set contains all types required by that pattern.
 * Matching patterns have their confidenceBoost applied to the returned signals
 * (mutates confidence in-place on a copy — callers can use the boosted array).
 *
 * Also auto-creates a new pattern record for novel type combinations so future
 * arrivals can be tracked immediately.
 */
export function recordPatternMatch(
  signals: SignalFinding[],
  sectorId: string,
): SignalFinding[] {
  const presentTypes = new Set<SignalType>(signals.map((s) => s.type));

  // Auto-register any novel multi-type combination for this sector.
  if (presentTypes.size >= 2) {
    const types = Array.from(presentTypes) as SignalType[];
    const key = patternKey(types, sectorId);
    if (!patternStore.has(key)) {
      const now = new Date().toISOString();
      const newPattern: SignalPattern = {
        id: `pat-${++patternCounter}`,
        signalTypes: types,
        sectorId,
        confirmationCount: 0,
        falsePositiveCount: 0,
        confidenceBoost: 0,
        lastConfirmed: now,
        createdAt: now,
      };
      patternStore.set(key, newPattern);
    }
  }

  // Collect boost from all matching known patterns.
  let totalBoost = 0;
  for (const pattern of Array.from(patternStore.values() as Iterable<SignalPattern>)) {
    if (pattern.sectorId !== sectorId) continue;
    if (pattern.confirmationCount === 0) continue; // Only boost from proven patterns.
    const allPresent = pattern.signalTypes.every((t) => presentTypes.has(t));
    if (allPresent) {
      totalBoost = Math.min(0.5, totalBoost + pattern.confidenceBoost);
    }
  }

  if (totalBoost === 0) return signals;

  // Return boosted copies — never mutate the caller's originals.
  return signals.map((s) => ({
    ...s,
    confidence: Math.min(1, s.confidence + totalBoost),
  }));
}

/**
 * Call when a pattern's prediction was externally confirmed (e.g. contract
 * award announced). Increments confirmationCount and recomputes boost.
 */
export function confirmPattern(patternId: string): void {
  for (const [key, pattern] of Array.from(patternStore.entries() as Iterable<[string, SignalPattern]>)) {
    if (pattern.id === patternId) {
      const updated: SignalPattern = {
        ...pattern,
        confirmationCount: pattern.confirmationCount + 1,
        lastConfirmed: new Date().toISOString(),
        confidenceBoost: computeConfidenceBoost(
          pattern.confirmationCount + 1,
          pattern.falsePositiveCount,
        ),
      };
      patternStore.set(key, updated);
      return;
    }
  }
  console.warn(`[PatternLearning] confirmPattern: unknown patternId "${patternId}"`);
}

/**
 * Call when a pattern proved wrong (false positive). Increments
 * falsePositiveCount and reduces confidenceBoost accordingly.
 */
export function rejectPattern(patternId: string): void {
  for (const [key, pattern] of Array.from(patternStore.entries() as Iterable<[string, SignalPattern]>)) {
    if (pattern.id === patternId) {
      const updated: SignalPattern = {
        ...pattern,
        falsePositiveCount: pattern.falsePositiveCount + 1,
        confidenceBoost: computeConfidenceBoost(
          pattern.confirmationCount,
          pattern.falsePositiveCount + 1,
        ),
      };
      patternStore.set(key, updated);
      return;
    }
  }
  console.warn(`[PatternLearning] rejectPattern: unknown patternId "${patternId}"`);
}

/**
 * Returns patterns sorted by reliability (confirmation rate descending).
 * Patterns with zero confirmations appear last.
 */
export function getTopPatterns(limit = 20): SignalPattern[] {
  const all = Array.from(patternStore.values() as Iterable<SignalPattern>);
  return all
    .slice()
    .sort((a, b) => {
      const rateA = a.confirmationCount / (a.confirmationCount + a.falsePositiveCount + 1);
      const rateB = b.confirmationCount / (b.confirmationCount + b.falsePositiveCount + 1);
      return rateB - rateA;
    })
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — IKER Score Auto-Update
// IKER = Intelligence, Knowledge, Evidence, Reliability — a 0–100 score
// per entity that reflects how much credible signal activity surrounds it.
// ─────────────────────────────────────────────────────────────────────────────

export type IkerUpdate = {
  entityId: string;
  previousScore: number;
  newScore: number;
  reason: string;
  updatedAt: string;
};

// In-memory IKER score registry.
const ikerScores = new Map<string, number>();
// Running log of all updates (capped to last 500 for memory safety).
const ikerUpdateLog: IkerUpdate[] = [];
const IKER_LOG_CAP = 500;

/** Clamp a value to the 0–100 range. */
function clampIker(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/**
 * Calculates the IKER score delta for a single entity based on its recent
 * signal activity.
 *
 * Formula:
 *   base                    = current score (or 50 if new)
 *   + mentionCount × 2      — raw presence in the news cycle
 *   + tier1SourceCount × 5  — authoritative source coverage bonus
 *   + contractSignalCount × 10 — high-value contract intelligence bonus
 *   - inactivityDecay       — –3 when mention count is zero (slow fade)
 *
 * The delta is clamped so the resulting score stays within 0–100.
 */
export function computeIkerDelta(entityId: string, recentSignals: SignalFinding[]): number {
  const relevant = recentSignals.filter((s) => s.entityId === entityId);

  const mentionCount = relevant.length;
  const tier1SourceCount = relevant.reduce((acc, s) => {
    // Tier-1 sources are wires / official outlets; use source list heuristic.
    // Signal sources are display names — we flag tier-1 by checking if any
    // source in the signal matches a known tier-1 keyword set.
    const TIER1_KEYWORDS = [
      'AP ', 'BBC', 'Defense One', 'FedScoop', 'SEC', 'DOE', 'DOT', 'NASA',
      'CBP', 'DoD', 'SBA', 'GSA',
    ];
    const hasTier1 = s.sources.some((src) =>
      TIER1_KEYWORDS.some((kw) => src.includes(kw)),
    );
    return acc + (hasTier1 ? 1 : 0);
  }, 0);

  const contractSignalCount = relevant.filter((s) => s.type === 'contract_alert').length;
  const inactivityDecay = mentionCount === 0 ? 3 : 0;

  const delta =
    mentionCount * 2 +
    tier1SourceCount * 5 +
    contractSignalCount * 10 -
    inactivityDecay;

  const currentScore = ikerScores.get(entityId) ?? 50;
  const proposed = currentScore + delta;
  // Return raw delta clamped so the final score stays in range.
  return clampIker(proposed) - currentScore;
}

/**
 * Runs IKER updates for every distinct entity referenced in the supplied
 * signals. Returns the full list of updates applied (useful for audit logs
 * and UI delta indicators).
 */
export function batchUpdateIkerScores(signals: SignalFinding[]): IkerUpdate[] {
  // Gather unique entity IDs present in this signal batch.
  const entityIds = new Set<string>();
  for (const s of signals) {
    if (s.entityId) entityIds.add(s.entityId);
  }

  // Also include any entity that currently has a score but got zero mentions
  // this cycle (so inactivity decay is applied).
  for (const id of Array.from(ikerScores.keys() as Iterable<string>)) {
    entityIds.add(id);
  }

  const updates: IkerUpdate[] = [];
  const now = new Date().toISOString();

  for (const entityId of Array.from(entityIds as Iterable<string>)) {
    const previousScore = ikerScores.get(entityId) ?? 50;
    const delta = computeIkerDelta(entityId, signals);
    if (delta === 0) continue;

    const newScore = clampIker(previousScore + delta);
    ikerScores.set(entityId, newScore);

    const relevant = signals.filter((s) => s.entityId === entityId);
    const contractCount = relevant.filter((s) => s.type === 'contract_alert').length;
    const tier1Count = relevant.reduce((acc, s) => {
      const TIER1_KEYWORDS = [
        'AP ', 'BBC', 'Defense One', 'FedScoop', 'SEC', 'DOE', 'DOT', 'NASA',
        'CBP', 'DoD', 'SBA', 'GSA',
      ];
      const hasTier1 = s.sources.some((src) =>
        TIER1_KEYWORDS.some((kw) => src.includes(kw)),
      );
      return acc + (hasTier1 ? 1 : 0);
    }, 0);

    const reason =
      delta > 0
        ? `+${delta} from ${relevant.length} mention(s)` +
          (tier1Count > 0 ? `, ${tier1Count} tier-1 source(s)` : '') +
          (contractCount > 0 ? `, ${contractCount} contract signal(s)` : '')
        : `${delta} inactivity decay`;

    const update: IkerUpdate = { entityId, previousScore, newScore, reason, updatedAt: now };
    updates.push(update);

    // Append to rolling log, evicting oldest when cap is reached.
    ikerUpdateLog.push(update);
    if (ikerUpdateLog.length > IKER_LOG_CAP) {
      ikerUpdateLog.splice(0, ikerUpdateLog.length - IKER_LOG_CAP);
    }
  }

  return updates;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — Industry Cluster Detection
// Scans signal article titles/descriptions for novel technology or industry
// terms that appear across many articles and multiple sources, surfacing
// emerging sectors before they are in any taxonomy.
// ─────────────────────────────────────────────────────────────────────────────

export type EmergingCluster = {
  /** Canonical term as it appears most frequently in source text. */
  term: string;
  articleCount: number;
  /** Sector slug the term most frequently co-appears with. */
  sectorAffinity: string;
  /** 0–1; higher = term is less established in our known taxonomy. */
  noveltyScore: number;
  /** URL-safe slug suggested for a new sector/tag page. */
  suggestedSlug: string;
};

// In-memory store so repeated calls accumulate evidence across runs.
const clusterStore = new Map<string, { articleCount: number; sources: Set<string>; sectorHits: Map<string, number>; firstSeen: string }>();

/** Known taxonomy terms to exclude from novelty scoring (not exhaustive). */
const KNOWN_TAXONOMY_TERMS = new Set([
  'ai', 'cybersecurity', 'defense', 'supply chain', 'energy', 'finance',
  'enterprise', 'logistics', 'border', 'trade', 'contract', 'federal',
  'government', 'military', 'technology', 'data', 'cloud', 'software',
  'hardware', 'network', 'security', 'intelligence', 'automation',
]);

/** Tokenise a text string into lowercase bigrams and trigrams worth indexing. */
function extractNgrams(text: string): string[] {
  // Strip punctuation, lowercase, split on whitespace.
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const ngrams: string[] = [];
  // Unigrams (single meaningful words, skip stop-words)
  const STOP = new Set([
    'with', 'that', 'this', 'from', 'have', 'been', 'will', 'more',
    'also', 'into', 'than', 'they', 'were', 'said', 'says', 'would',
    'about', 'their', 'there', 'when', 'which', 'after', 'other',
  ]);
  for (const w of words) {
    if (!STOP.has(w)) ngrams.push(w);
  }
  // Bigrams
  for (let i = 0; i < words.length - 1; i++) {
    if (!STOP.has(words[i]) && !STOP.has(words[i + 1])) {
      ngrams.push(`${words[i]} ${words[i + 1]}`);
    }
  }
  // Trigrams
  for (let i = 0; i < words.length - 2; i++) {
    if (!STOP.has(words[i]) && !STOP.has(words[i + 2])) {
      ngrams.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
  }
  return ngrams;
}

/** Convert a term into a URL-safe slug. */
function toSlug(term: string): string {
  return term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Scans signal articles for novel technology/industry terms.
 * A term qualifies as an emerging cluster when it appears in ≥ `threshold`
 * articles (default 5) sourced from ≥ 3 distinct sources.
 *
 * Accumulates evidence across calls — calling this function repeatedly with
 * new signal batches builds up the cluster corpus over time.
 */
export function detectEmergingClusters(
  signals: SignalFinding[],
  threshold = 5,
): EmergingCluster[] {
  const now = new Date().toISOString();

  for (const signal of signals) {
    // Collect text to scan: title + description + article titles.
    const texts: string[] = [signal.title, signal.description];
    for (const article of signal.articles) {
      texts.push(article.title);
    }
    const combinedText = texts.join(' ');
    const ngrams = extractNgrams(combinedText);

    for (const ngram of ngrams) {
      const existing = clusterStore.get(ngram);
      if (existing) {
        existing.articleCount += signal.articleCount;
        for (const src of signal.sources) existing.sources.add(src);
        if (signal.sectorId) {
          const prev = existing.sectorHits.get(signal.sectorId) ?? 0;
          existing.sectorHits.set(signal.sectorId, prev + 1);
        }
      } else {
        const sectorHits = new Map<string, number>();
        if (signal.sectorId) sectorHits.set(signal.sectorId, 1);
        clusterStore.set(ngram, {
          articleCount: signal.articleCount,
          sources: new Set(signal.sources),
          sectorHits,
          firstSeen: now,
        });
      }
    }
  }

  // Filter to terms meeting the threshold criteria.
  const results: EmergingCluster[] = [];

  for (const [term, data] of Array.from(clusterStore.entries() as Iterable<[string, { articleCount: number; sources: Set<string>; sectorHits: Map<string, number>; firstSeen: string }]>)) {
    if (data.articleCount < threshold) continue;
    if (data.sources.size < 3) continue;

    // Compute sector affinity — which sector slug this term most co-appears with.
    let topSector = 'general';
    let topHits = 0;
    for (const [sector, hits] of Array.from(data.sectorHits.entries() as Iterable<[string, number]>)) {
      if (hits > topHits) { topHits = hits; topSector = sector; }
    }

    // Novelty: terms absent from known taxonomy score higher.
    // Also penalise very short terms (likely stop-words that slipped through).
    const inTaxonomy = KNOWN_TAXONOMY_TERMS.has(term);
    const wordCount = term.split(' ').length;
    const noveltyScore = inTaxonomy ? 0.1 : Math.min(1, 0.4 + wordCount * 0.2);

    results.push({
      term,
      articleCount: data.articleCount,
      sectorAffinity: topSector,
      noveltyScore,
      suggestedSlug: toSlug(term),
    });
  }

  // Sort by noveltyScore × articleCount (surface genuinely new AND popular terms first).
  return results
    .slice()
    .sort((a, b) => b.noveltyScore * b.articleCount - a.noveltyScore * a.articleCount);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3.5 — Supabase Persistence
// Serverless functions reset in-memory state on every cold start.
// These functions serialize all learning state to ml_patterns (Supabase)
// so the brain survives restarts and gets smarter across sessions.
// ─────────────────────────────────────────────────────────────────────────────

import { setMlPattern, loadAllPatterns } from '@/db/queries/ml-patterns';

/**
 * Persist all in-memory learning state to Supabase ml_patterns.
 * Call this at the END of every cron run.
 */
export async function persistLearningToSupabase(): Promise<{ patterns: number; iker: number; clusters: number }> {
  let patterns = 0;
  let iker = 0;
  let clusters = 0;

  // 1. Persist signal patterns
  for (const [key, pattern] of Array.from(patternStore.entries() as Iterable<[string, SignalPattern]>)) {
    const ok = await setMlPattern({
      pattern_key: `learning:pattern:${key}`,
      pattern_data: {
        id: pattern.id,
        signalTypes: pattern.signalTypes,
        sectorId: pattern.sectorId,
        confirmationCount: pattern.confirmationCount,
        falsePositiveCount: pattern.falsePositiveCount,
        confidenceBoost: pattern.confidenceBoost,
        lastConfirmed: pattern.lastConfirmed,
        createdAt: pattern.createdAt,
      },
      agent: 'learning',
    }).catch(() => false);
    if (ok) patterns++;
  }

  // 2. Persist IKER scores
  for (const [entityId, score] of Array.from(ikerScores.entries() as Iterable<[string, number]>)) {
    const ok = await setMlPattern({
      pattern_key: `learning:iker:${entityId}`,
      pattern_data: { entityId, score, updatedAt: new Date().toISOString() },
      agent: 'learning',
    }).catch(() => false);
    if (ok) iker++;
  }

  // 3. Persist emerging clusters (top 100 by articleCount)
  const topClusters = Array.from(clusterStore.entries() as Iterable<[string, { articleCount: number; sources: Set<string>; sectorHits: Map<string, number>; firstSeen: string }]>)
    .sort((a, b) => b[1].articleCount - a[1].articleCount)
    .slice(0, 100);

  for (const [term, data] of topClusters) {
    const slug = term.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const ok = await setMlPattern({
      pattern_key: `learning:cluster:${slug}`,
      pattern_data: {
        term,
        articleCount: data.articleCount,
        sourceCount: data.sources.size,
        sectorHits: Object.fromEntries(Array.from(data.sectorHits.entries() as Iterable<[string, number]>)),
        firstSeen: data.firstSeen,
      },
      agent: 'learning',
    }).catch(() => false);
    if (ok) clusters++;
  }

  markLearnRun();
  return { patterns, iker, clusters };
}

/**
 * Load all persisted learning state from Supabase ml_patterns into memory.
 * Call this at the START of every cron run (warm the in-memory store).
 */
export async function loadLearningFromSupabase(): Promise<{ patterns: number; iker: number; clusters: number }> {
  const allPatterns = await loadAllPatterns().catch(() => new Map<string, Record<string, unknown>>());
  let patterns = 0;
  let iker = 0;
  let clusters = 0;

  for (const [key, data] of Array.from(allPatterns.entries() as Iterable<[string, Record<string, unknown>]>)) {
    if (key.startsWith('learning:pattern:')) {
      // Restore signal pattern
      const raw = data as {
        id: string; signalTypes: SignalType[]; sectorId: string;
        confirmationCount: number; falsePositiveCount: number;
        confidenceBoost: number; lastConfirmed: string; createdAt: string;
      };
      const storageKey = key.replace('learning:pattern:', '');
      if (!patternStore.has(storageKey)) {
        patternStore.set(storageKey, {
          id: raw.id ?? `pat-${++patternCounter}`,
          signalTypes: raw.signalTypes ?? [],
          sectorId: raw.sectorId ?? 'general',
          confirmationCount: raw.confirmationCount ?? 0,
          falsePositiveCount: raw.falsePositiveCount ?? 0,
          confidenceBoost: raw.confidenceBoost ?? 0,
          lastConfirmed: raw.lastConfirmed ?? new Date().toISOString(),
          createdAt: raw.createdAt ?? new Date().toISOString(),
        });
        patterns++;
      }
    } else if (key.startsWith('learning:iker:')) {
      // Restore IKER score
      const entityId = key.replace('learning:iker:', '');
      const raw = data as { score: number };
      if (raw.score !== undefined && !ikerScores.has(entityId)) {
        ikerScores.set(entityId, raw.score);
        iker++;
      }
    } else if (key.startsWith('learning:cluster:')) {
      // Restore cluster
      const raw = data as { term: string; articleCount: number; sourceCount: number; sectorHits: Record<string, number>; firstSeen: string };
      if (raw.term && !clusterStore.has(raw.term)) {
        const sectorHits = new Map<string, number>();
        for (const [s, c] of Object.entries(raw.sectorHits ?? {})) sectorHits.set(s, c);
        clusterStore.set(raw.term, {
          articleCount: raw.articleCount ?? 0,
          sources: new Set(Array.from({ length: raw.sourceCount ?? 0 }, (_, i) => `src-${i}`)),
          sectorHits,
          firstSeen: raw.firstSeen ?? new Date().toISOString(),
        });
        clusters++;
      }
    }
  }

  return { patterns, iker, clusters };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — Learning Memory Store
// Unified stats surface and reset utility covering all learning subsystems.
// ─────────────────────────────────────────────────────────────────────────────

export type LearningStats = {
  totalPatterns: number;
  confirmedPatterns: number;
  ikerUpdates: number;
  clustersDetected: number;
  lastLearnRun: string | null;
};

/** Tracks the ISO timestamp of the most recent batch learning run. */
let lastLearnRun: string | null = null;

/** Call at the end of any learning batch to record the run timestamp. */
export function markLearnRun(): void {
  lastLearnRun = new Date().toISOString();
}

/**
 * Returns a summary of the current learning state across all subsystems.
 * Gracefully degrades when Supabase is unavailable — always reads from
 * the in-memory stores.
 */
export function getLearningStats(): LearningStats {
  const totalPatterns = patternStore.size;
  const confirmedPatterns = Array.from(patternStore.values() as Iterable<SignalPattern>).filter(
    (p) => p.confirmationCount > 0,
  ).length;
  const ikerUpdates = ikerUpdateLog.length;
  const clustersDetected = Array.from(
    clusterStore.values() as Iterable<{ articleCount: number; sources: Set<string>; sectorHits: Map<string, number>; firstSeen: string }>,
  ).filter((c) => c.sources.size >= 3).length;

  return {
    totalPatterns,
    confirmedPatterns,
    ikerUpdates,
    clustersDetected,
    lastLearnRun,
  };
}

/**
 * Clears all in-memory learning state. Intended for testing and dev resets.
 * Does NOT touch Supabase — remote data is preserved.
 */
export function resetLearning(): void {
  patternStore.clear();
  patternCounter = 0;
  ikerScores.clear();
  ikerUpdateLog.splice(0);
  clusterStore.clear();
  lastLearnRun = null;
  console.info('[SwarmLearning] In-memory learning state cleared.');
}
