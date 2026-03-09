// src/lib/agents/scoring/emerging-industry-score.ts
// Emerging Industry Score — detects when signal clusters form new industries.
// Pure algorithmic (no LLM, free). Score 0–100.
//
// Formula:
//   Frequency + Diversity + Momentum + Company + Geography + Evidence Quality + Graph Connections
//
// Interpretation:
//   0–29  = Weak signal (noise)
//   30–49 = Watching
//   50–69 = Emerging niche
//   70–84 = Strong emergence
//   85–100 = Breakout industry cluster

import type { IntelSignalRow } from '@/db/queries/intel-signals';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type EmergingIndustryCandidate = {
  keyword: string;
  slug: string;
  score: number;
  label: string;
  frequency_score: number;
  diversity_score: number;
  momentum_score: number;
  company_score: number;
  geography_score: number;
  evidence_quality_score: number;
  graph_connection_score: number;
  signal_count: number;
  signal_type_count: number;
  company_count: number;
  location_count: number;
  companies: string[];
  signal_types: string[];
};

export type ScoreLabel = 'Weak signal' | 'Watching' | 'Emerging' | 'Strong emergence' | 'Breakout';

// ─── Score Interpretation ───────────────────────────────────────────────────────

export function getScoreLabel(score: number): ScoreLabel {
  if (score >= 85) return 'Breakout';
  if (score >= 70) return 'Strong emergence';
  if (score >= 50) return 'Emerging';
  if (score >= 30) return 'Watching';
  return 'Weak signal';
}

// ─── Source Quality Weights ─────────────────────────────────────────────────────

const SOURCE_QUALITY: Record<string, number> = {
  patent_filing: 1.0,
  research_paper: 1.0,
  contract_award: 1.0,
  funding_round: 0.9,
  product_launch: 0.8,
  facility_expansion: 0.8,
  hiring_signal: 0.7,
  merger_acquisition: 0.7,
  case_study: 0.7,
  regulatory_action: 0.6,
};

// ─── Individual Scoring Functions ───────────────────────────────────────────────

/** 1. Frequency: how many signals mention this niche? (max 20 pts) */
function frequencyScore(signalCount: number): number {
  if (signalCount >= 10) return 20;
  if (signalCount >= 5) return 15;
  if (signalCount >= 3) return 10;
  if (signalCount >= 1) return 5;
  return 0;
}

/** 2. Diversity: how many different signal types? (max 15 pts) */
function diversityScore(signalTypeCount: number): number {
  if (signalTypeCount >= 4) return 15;
  if (signalTypeCount >= 3) return 12;
  if (signalTypeCount >= 2) return 7;
  return 3;
}

/** 3. Momentum: are signals accelerating? (max 15 pts) */
function momentumScore(signals: IntelSignalRow[]): number {
  if (signals.length < 2) return 0;

  const now = Date.now();
  const day7 = now - 7 * 24 * 60 * 60 * 1000;
  const day30 = now - 30 * 24 * 60 * 60 * 1000;

  let recent7 = 0;
  let recent30 = 0;

  for (const s of signals) {
    const ts = new Date(s.discovered_at).getTime();
    if (ts >= day7) recent7++;
    if (ts >= day30) recent30++;
  }

  const total = signals.length;

  // Ratio of last 7 days vs last 30 days
  if (recent30 === 0) return 0;
  const recentRatio = recent7 / recent30;

  // Rapid acceleration: >50% of 30d signals appeared in last 7d
  if (recentRatio > 0.5 && recent7 >= 3) return 15;
  // Clear growth: >30% recent
  if (recentRatio > 0.3 && recent7 >= 2) return 10;
  // Slight growth
  if (recent7 >= 1 && total > recent7) return 5;
  return 0;
}

/** 4. Company count: are real companies involved? (max 15 pts) */
function companyScore(companyCount: number): number {
  if (companyCount >= 7) return 15;
  if (companyCount >= 4) return 12;
  if (companyCount >= 2) return 7;
  if (companyCount >= 1) return 3;
  return 0;
}

/** 5. Geography: how many distinct regions? (max 10 pts) */
function geographyScore(locationCount: number): number {
  if (locationCount >= 5) return 10;
  if (locationCount >= 3) return 8;
  if (locationCount >= 2) return 5;
  if (locationCount >= 1) return 2;
  return 0;
}

/** 6. Evidence quality: weighted average of source types (max 10 pts) */
function evidenceQualityScore(signals: IntelSignalRow[]): number {
  if (signals.length === 0) return 0;

  let totalWeight = 0;
  for (const s of signals) {
    totalWeight += SOURCE_QUALITY[s.signal_type] ?? 0.5;
  }
  const avgQuality = totalWeight / signals.length;

  if (avgQuality >= 0.85) return 10;
  if (avgQuality >= 0.7) return 7;
  if (avgQuality >= 0.5) return 5;
  return 2;
}

/** 7. Graph connections: how many entities does this niche link to? (max 10 pts) */
function graphConnectionScore(entityLinkCount: number): number {
  if (entityLinkCount >= 6) return 10;
  if (entityLinkCount >= 3) return 7;
  if (entityLinkCount >= 1) return 4;
  return 0;
}

// ─── Main Scoring Function ──────────────────────────────────────────────────────

/**
 * Score a candidate emerging industry from its signal cluster.
 * @param keyword     - The industry keyword/phrase being evaluated
 * @param signals     - All intel signals matching this keyword
 * @param entityLinks - Number of graph entity connections (0 if unknown)
 */
export function scoreEmergingIndustry(
  keyword: string,
  signals: IntelSignalRow[],
  entityLinks: number = 0,
): EmergingIndustryCandidate {
  // Collect unique signal types
  const signalTypes = new Set<string>();
  const companies = new Set<string>();
  const locations = new Set<string>();

  for (const s of signals) {
    signalTypes.add(s.signal_type);
    if (s.company) companies.add(s.company);
    // Extract location from tags or metadata if available
    if (s.tags) {
      for (const tag of s.tags) {
        if (tag.startsWith('loc:')) locations.add(tag.slice(4));
      }
    }
  }

  const freq = frequencyScore(signals.length);
  const div = diversityScore(signalTypes.size);
  const mom = momentumScore(signals);
  const comp = companyScore(companies.size);
  const geo = geographyScore(locations.size);
  const evidence = evidenceQualityScore(signals);
  const graph = graphConnectionScore(entityLinks);

  const total = Math.min(100, freq + div + mom + comp + geo + evidence + graph);

  const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const label = keyword.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return {
    keyword,
    slug,
    score: total,
    label,
    frequency_score: freq,
    diversity_score: div,
    momentum_score: mom,
    company_score: comp,
    geography_score: geo,
    evidence_quality_score: evidence,
    graph_connection_score: graph,
    signal_count: signals.length,
    signal_type_count: signalTypes.size,
    company_count: companies.size,
    location_count: locations.size,
    companies: Array.from(companies).slice(0, 10),
    signal_types: Array.from(signalTypes),
  };
}

// ─── Thresholds ─────────────────────────────────────────────────────────────────

/** Should we create a candidate dynamic industry? */
export function shouldCreateCandidate(score: number): boolean {
  return score >= 50;
}

/** Should we auto-create graph node + dynamic industry row? */
export function shouldAutoCreate(score: number): boolean {
  return score >= 60;
}

/** Strong enough to promote to visible category? */
export function isStrongEmergence(score: number): boolean {
  return score >= 75;
}

/** Breakout — recommend for homepage/radar visibility */
export function isBreakout(score: number): boolean {
  return score >= 85;
}

/** Apply decay to a score (call every 14 days without fresh evidence) */
export function applyDecay(score: number, daysSinceLastSignal: number): number {
  const decayPeriods = Math.floor(daysSinceLastSignal / 14);
  if (decayPeriods <= 0) return score;
  return Math.round(score * Math.pow(0.9, decayPeriods));
}
