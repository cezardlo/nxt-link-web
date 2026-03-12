// src/lib/agents/scoring/adoption-curve.ts
// Adoption Curve Engine — estimates where an industry sits on the S-curve.
// Pure algorithmic (no LLM, free).
//
// Stages:
//   innovators       → patents, research papers dominate
//   early_adopters   → funding rounds, hiring signals appear
//   early_majority   → product launches, facility expansions
//   late_majority    → enterprise contracts, M&A, regulatory actions
//   laggards         → declining signals, commoditization
//
// Score 0–100 maps to a stage + position within that stage.

import type { IntelSignalRow } from '@/db/queries/intel-signals';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type AdoptionStage =
  | 'innovators'
  | 'early_adopters'
  | 'early_majority'
  | 'late_majority'
  | 'laggards';

export type AdoptionProfile = {
  stage: AdoptionStage;
  stage_label: string;
  score: number;            // 0–100 (position on the full curve)
  confidence: number;       // how confident we are in this estimate (0–1)
  momentum: 'accelerating' | 'steady' | 'decelerating';
  signal_breakdown: Record<string, number>;
  company_count: number;
  description: string;
};

// ─── Stage Labels ───────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<AdoptionStage, string> = {
  innovators: 'Innovators',
  early_adopters: 'Early Adopters',
  early_majority: 'Early Majority',
  late_majority: 'Late Majority',
  laggards: 'Laggards',
};

const STAGE_DESCRIPTIONS: Record<AdoptionStage, string> = {
  innovators: 'Research and patents are driving activity. Few commercial products exist.',
  early_adopters: 'Startups and investors are entering. Early products and funding rounds appear.',
  early_majority: 'Products are launching at scale. Companies are expanding facilities and hiring.',
  late_majority: 'Enterprise adoption is widespread. M&A activity and regulations are shaping the market.',
  laggards: 'Market is mature and consolidating. Innovation has shifted to adjacent areas.',
};

// ─── Signal Type Weights (which stage each signal type indicates) ────────────

// Each signal type contributes evidence toward specific stages.
// Weight = how strongly it indicates that stage (0–1).
const STAGE_EVIDENCE: Record<string, Partial<Record<AdoptionStage, number>>> = {
  patent_filing:       { innovators: 1.0, early_adopters: 0.3 },
  research_paper:      { innovators: 1.0, early_adopters: 0.2 },
  funding_round:       { early_adopters: 1.0, innovators: 0.3, early_majority: 0.2 },
  hiring_signal:       { early_adopters: 0.7, early_majority: 0.8 },
  product_launch:      { early_majority: 1.0, early_adopters: 0.3 },
  facility_expansion:  { early_majority: 0.9, late_majority: 0.5 },
  case_study:          { early_majority: 0.6, late_majority: 0.4 },
  contract_award:      { late_majority: 1.0, early_majority: 0.5 },
  merger_acquisition:  { late_majority: 1.0, laggards: 0.4 },
  regulatory_action:   { late_majority: 0.8, laggards: 0.5 },
};

// ─── Score → Stage Mapping ──────────────────────────────────────────────────────

function scoreToStage(score: number): AdoptionStage {
  if (score >= 80) return 'laggards';
  if (score >= 60) return 'late_majority';
  if (score >= 40) return 'early_majority';
  if (score >= 20) return 'early_adopters';
  return 'innovators';
}

// ─── Momentum Detection ─────────────────────────────────────────────────────────

export function detectMomentum(signals: IntelSignalRow[]): 'accelerating' | 'steady' | 'decelerating' {
  if (signals.length < 3) return 'steady';

  const now = Date.now();
  const day30 = now - 30 * 24 * 60 * 60 * 1000;
  const day90 = now - 90 * 24 * 60 * 60 * 1000;

  let recent30 = 0;
  let recent90 = 0;

  for (const s of signals) {
    const ts = new Date(s.discovered_at).getTime();
    if (ts >= day30) recent30++;
    if (ts >= day90) recent90++;
  }

  const older60 = recent90 - recent30;
  if (older60 === 0) return recent30 > 0 ? 'accelerating' : 'steady';

  const ratio = recent30 / older60;
  if (ratio > 1.5) return 'accelerating';
  if (ratio < 0.5) return 'decelerating';
  return 'steady';
}

// ─── Main Function ──────────────────────────────────────────────────────────────

/**
 * Estimate where an industry sits on the adoption curve based on its signal mix.
 */
export function estimateAdoption(
  signals: IntelSignalRow[],
): AdoptionProfile {
  // Accumulate weighted evidence per stage
  const stageScores: Record<AdoptionStage, number> = {
    innovators: 0,
    early_adopters: 0,
    early_majority: 0,
    late_majority: 0,
    laggards: 0,
  };

  const signalBreakdown: Record<string, number> = {};
  const companies = new Set<string>();

  for (const s of signals) {
    signalBreakdown[s.signal_type] = (signalBreakdown[s.signal_type] ?? 0) + 1;
    if (s.company) companies.add(s.company);

    const weights = STAGE_EVIDENCE[s.signal_type];
    if (!weights) continue;

    // Weight by signal confidence
    const conf = s.confidence ?? 0.7;
    for (const [stage, weight] of Object.entries(weights)) {
      stageScores[stage as AdoptionStage] += (weight as number) * conf;
    }
  }

  // Normalize to get a weighted position on the 0–100 curve
  // Each stage maps to a range: innovators=0-20, early_adopters=20-40, etc.
  const stagePositions: Record<AdoptionStage, number> = {
    innovators: 10,
    early_adopters: 30,
    early_majority: 50,
    late_majority: 70,
    laggards: 90,
  };

  let totalWeight = 0;
  let weightedPosition = 0;

  for (const [stage, score] of Object.entries(stageScores)) {
    totalWeight += score;
    weightedPosition += score * stagePositions[stage as AdoptionStage];
  }

  const adoptionScore = totalWeight > 0
    ? Math.round(weightedPosition / totalWeight)
    : 10; // default to innovators if no signals

  const confidence = Math.min(1, totalWeight / 10); // need ~10 weighted signals for full confidence
  const stage = scoreToStage(adoptionScore);
  const momentum = detectMomentum(signals);

  return {
    stage,
    stage_label: STAGE_LABELS[stage],
    score: adoptionScore,
    confidence: Math.round(confidence * 100) / 100,
    momentum,
    signal_breakdown: signalBreakdown,
    company_count: companies.size,
    description: STAGE_DESCRIPTIONS[stage],
  };
}

// ─── Fallback for static industries (no signals yet) ────────────────────────────

const STATIC_ADOPTION: Record<string, AdoptionProfile> = {
  'ai-ml': {
    stage: 'early_majority', stage_label: 'Early Majority', score: 45,
    confidence: 0.8, momentum: 'accelerating',
    signal_breakdown: { patent_filing: 12, funding_round: 8, product_launch: 6, hiring_signal: 5 },
    company_count: 15, description: STAGE_DESCRIPTIONS.early_majority,
  },
  'cybersecurity': {
    stage: 'late_majority', stage_label: 'Late Majority', score: 65,
    confidence: 0.85, momentum: 'steady',
    signal_breakdown: { contract_award: 10, product_launch: 7, regulatory_action: 4, hiring_signal: 6 },
    company_count: 20, description: STAGE_DESCRIPTIONS.late_majority,
  },
  'defense': {
    stage: 'late_majority', stage_label: 'Late Majority', score: 70,
    confidence: 0.9, momentum: 'steady',
    signal_breakdown: { contract_award: 15, patent_filing: 5, facility_expansion: 4 },
    company_count: 18, description: STAGE_DESCRIPTIONS.late_majority,
  },
  'border-tech': {
    stage: 'early_adopters', stage_label: 'Early Adopters', score: 30,
    confidence: 0.6, momentum: 'accelerating',
    signal_breakdown: { patent_filing: 4, funding_round: 3, product_launch: 2 },
    company_count: 8, description: STAGE_DESCRIPTIONS.early_adopters,
  },
  'manufacturing': {
    stage: 'early_majority', stage_label: 'Early Majority', score: 55,
    confidence: 0.8, momentum: 'steady',
    signal_breakdown: { product_launch: 8, facility_expansion: 5, hiring_signal: 6, contract_award: 4 },
    company_count: 14, description: STAGE_DESCRIPTIONS.early_majority,
  },
  'energy': {
    stage: 'early_adopters', stage_label: 'Early Adopters', score: 35,
    confidence: 0.7, momentum: 'accelerating',
    signal_breakdown: { patent_filing: 6, funding_round: 5, research_paper: 4, product_launch: 3 },
    company_count: 10, description: STAGE_DESCRIPTIONS.early_adopters,
  },
  'healthcare': {
    stage: 'early_majority', stage_label: 'Early Majority', score: 50,
    confidence: 0.75, momentum: 'accelerating',
    signal_breakdown: { patent_filing: 8, product_launch: 5, funding_round: 6, regulatory_action: 3 },
    company_count: 12, description: STAGE_DESCRIPTIONS.early_majority,
  },
  'logistics': {
    stage: 'early_majority', stage_label: 'Early Majority', score: 48,
    confidence: 0.7, momentum: 'steady',
    signal_breakdown: { product_launch: 6, facility_expansion: 4, hiring_signal: 5, case_study: 3 },
    company_count: 11, description: STAGE_DESCRIPTIONS.early_majority,
  },
};

/**
 * Get adoption profile — uses live signals if available, falls back to static data.
 */
export function getAdoptionProfile(
  slug: string,
  signals: IntelSignalRow[],
): AdoptionProfile {
  if (signals.length >= 3) {
    return estimateAdoption(signals);
  }
  return STATIC_ADOPTION[slug] ?? estimateAdoption(signals);
}
