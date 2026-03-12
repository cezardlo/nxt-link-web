// src/lib/engines/prediction-engine.ts
// Prediction Layer — forecasts trajectories, convergence, timing, and risks.
//
// Inputs: emerging industry scores, adoption profiles, signal history, graph relationships
// Outputs: trajectory forecasts, convergence predictions, timing estimates, risk alerts
//
// Pure computation — no LLM calls, no external fetches.

import { getIntelSignals, type IntelSignalRow } from '@/db/queries/intel-signals';
import { getEntitiesByType, getRelationships } from '@/db/queries/knowledge-graph';
import { scoreEmergingIndustry } from '@/lib/agents/scoring/emerging-industry-score';
import { estimateAdoption, detectMomentum } from '@/lib/agents/scoring/adoption-curve';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrajectoryDirection = 'accelerating' | 'growing' | 'plateauing' | 'declining' | 'volatile';

export type TrajectoryForecast = {
  industry: string;
  slug: string;
  current_score: number;
  predicted_score_30d: number;
  predicted_score_90d: number;
  direction: TrajectoryDirection;
  velocity: number; // score change per 30 days
  confidence: number; // 0–1
  adoption_stage: string;
  adoption_next_stage: string | null;
  time_to_next_stage_days: number | null;
  signals_recent: number; // last 14 days
  signals_prior: number; // 15–30 days ago
  risk_factors: string[];
  catalysts: string[];
};

export type ConvergencePrediction = {
  industries: string[];
  shared_technologies: string[];
  shared_companies: string[];
  convergence_score: number; // 0–100
  prediction: string;
  time_horizon: '3_months' | '6_months' | '12_months' | '24_months';
  confidence: number;
};

export type TimingEstimate = {
  industry: string;
  slug: string;
  current_stage: string;
  next_milestone: string;
  estimated_days: number;
  confidence: number;
  evidence: string[];
};

export type RiskAlert = {
  industry: string;
  slug: string;
  risk_type: 'signal_decay' | 'competition_surge' | 'adoption_stall' | 'funding_drought' | 'policy_headwind' | 'market_saturation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string[];
  suggested_action: string;
};

export type PredictionReport = {
  generated_at: string;
  trajectories: TrajectoryForecast[];
  convergences: ConvergencePrediction[];
  timing: TimingEstimate[];
  risks: RiskAlert[];
  summary: {
    fastest_growing: string | null;
    biggest_risk: string | null;
    nearest_convergence: string | null;
    industries_analyzed: number;
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const ADOPTION_STAGES = ['innovators', 'early_adopters', 'early_majority', 'late_majority', 'laggards'] as const;

function nextStage(current: string): string | null {
  const idx = ADOPTION_STAGES.indexOf(current as typeof ADOPTION_STAGES[number]);
  if (idx < 0 || idx >= ADOPTION_STAGES.length - 1) return null;
  return ADOPTION_STAGES[idx + 1];
}

function stageLabel(stage: string): string {
  const labels: Record<string, string> = {
    innovators: 'Innovators',
    early_adopters: 'Early Adopters',
    early_majority: 'Early Majority',
    late_majority: 'Late Majority',
    laggards: 'Laggards',
  };
  return labels[stage] ?? stage;
}

// ─── Trajectory Forecasting ───────────────────────────────────────────────────

function computeTrajectory(
  industry: string,
  signals: IntelSignalRow[],
  entityLinkCount: number,
): TrajectoryForecast {
  const slug = slugify(industry);
  const now = Date.now();
  const day = 1000 * 60 * 60 * 24;

  // Split signals into time windows
  const recent = signals.filter(s => now - new Date(s.discovered_at).getTime() < 14 * day);
  const prior = signals.filter(s => {
    const age = now - new Date(s.discovered_at).getTime();
    return age >= 14 * day && age < 30 * day;
  });
  const older = signals.filter(s => {
    const age = now - new Date(s.discovered_at).getTime();
    return age >= 30 * day && age < 60 * day;
  });

  // Score the industry
  const emergingScore = scoreEmergingIndustry(industry, signals, entityLinkCount);
  const adoption = estimateAdoption(signals);
  const momentum = detectMomentum(signals);

  // Calculate velocity (score change rate)
  // Use signal count ratios as proxy for score momentum
  const recentRate = recent.length / 14; // signals per day (last 14d)
  const priorRate = prior.length > 0 ? prior.length / 16 : 0; // signals per day (15-30d)
  const olderRate = older.length > 0 ? older.length / 30 : 0; // signals per day (30-60d)

  let velocity = 0;
  if (priorRate > 0) {
    velocity = ((recentRate - priorRate) / Math.max(priorRate, 0.01)) * 15; // normalize to ~score-points/30d
  } else if (recentRate > 0) {
    velocity = recentRate * 10; // new industry, assume growth
  }

  // Cap velocity to reasonable range
  velocity = Math.max(-20, Math.min(20, velocity));

  // Direction from velocity + acceleration
  const acceleration = priorRate > 0 && olderRate > 0
    ? (recentRate - priorRate) - (priorRate - olderRate)
    : 0;

  let direction: TrajectoryDirection;
  if (velocity > 5 && acceleration > 0) direction = 'accelerating';
  else if (velocity > 2) direction = 'growing';
  else if (velocity > -2) direction = 'plateauing';
  else if (velocity < -5 && Math.abs(acceleration) > 0.1) direction = 'volatile';
  else direction = 'declining';

  // Predict future scores
  const predicted30d = Math.max(0, Math.min(100, emergingScore.score + velocity));
  const predicted90d = Math.max(0, Math.min(100, emergingScore.score + velocity * 2.5 + acceleration * 10));

  // Confidence based on data quality
  const signalCount = signals.length;
  let confidence = 0.3; // base
  if (signalCount >= 5) confidence += 0.1;
  if (signalCount >= 15) confidence += 0.1;
  if (signalCount >= 30) confidence += 0.1;
  if (prior.length >= 3) confidence += 0.1; // historical data exists
  if (older.length >= 3) confidence += 0.1; // deeper history
  if (entityLinkCount >= 3) confidence += 0.1;
  confidence = Math.min(0.95, confidence);

  // Time to next adoption stage (rough estimate)
  const nextSt = nextStage(adoption.stage);
  let timeToNextDays: number | null = null;
  if (nextSt && velocity > 0) {
    // Each stage is roughly 20 points wide
    const stageIdx = ADOPTION_STAGES.indexOf(adoption.stage as typeof ADOPTION_STAGES[number]);
    const targetScore = (stageIdx + 1) * 20 + 10; // midpoint of next stage
    const gap = targetScore - adoption.score;
    if (gap > 0 && velocity > 0) {
      timeToNextDays = Math.round((gap / velocity) * 30); // convert velocity (per 30d) to days
      timeToNextDays = Math.max(30, Math.min(730, timeToNextDays)); // clamp 1 month – 2 years
    }
  }

  // Identify risk factors
  const riskFactors: string[] = [];
  if (recent.length === 0) riskFactors.push('No signals in last 14 days');
  if (velocity < -3) riskFactors.push('Signal volume declining');
  if (emergingScore.company_count <= 1) riskFactors.push('Single-company dependency');
  if (emergingScore.diversity_score < 5) riskFactors.push('Low signal diversity');
  if (adoption.confidence < 0.4) riskFactors.push('Low confidence in adoption estimate');

  // Identify catalysts
  const catalysts: string[] = [];
  const typeCounts = new Map<string, number>();
  for (const s of recent) {
    typeCounts.set(s.signal_type, (typeCounts.get(s.signal_type) ?? 0) + 1);
  }
  if ((typeCounts.get('funding_round') ?? 0) >= 2) catalysts.push('Active funding rounds');
  if ((typeCounts.get('patent_filing') ?? 0) >= 2) catalysts.push('Patent activity surge');
  if ((typeCounts.get('product_launch') ?? 0) >= 1) catalysts.push('Recent product launches');
  if ((typeCounts.get('contract_award') ?? 0) >= 1) catalysts.push('Contract awards');
  if ((typeCounts.get('policy_change') ?? 0) >= 1) catalysts.push('Policy tailwinds');
  if (velocity > 5) catalysts.push('Strong momentum');
  if (momentum === 'accelerating') catalysts.push('Accelerating signal velocity');

  return {
    industry,
    slug,
    current_score: emergingScore.score,
    predicted_score_30d: Math.round(predicted30d),
    predicted_score_90d: Math.round(predicted90d),
    direction,
    velocity: Math.round(velocity * 10) / 10,
    confidence: Math.round(confidence * 100) / 100,
    adoption_stage: stageLabel(adoption.stage),
    adoption_next_stage: nextSt ? stageLabel(nextSt) : null,
    time_to_next_stage_days: timeToNextDays,
    signals_recent: recent.length,
    signals_prior: prior.length,
    risk_factors: riskFactors,
    catalysts,
  };
}

// ─── Convergence Detection ────────────────────────────────────────────────────

function detectConvergences(
  industrySignals: Map<string, IntelSignalRow[]>,
): ConvergencePrediction[] {
  const predictions: ConvergencePrediction[] = [];
  const industries = Array.from(industrySignals.keys());

  for (let i = 0; i < industries.length; i++) {
    for (let j = i + 1; j < industries.length; j++) {
      const a = industries[i];
      const b = industries[j];
      const signalsA = industrySignals.get(a) ?? [];
      const signalsB = industrySignals.get(b) ?? [];

      // Find shared companies
      const companiesA = new Set(signalsA.map(s => s.company).filter(Boolean));
      const companiesB = new Set(signalsB.map(s => s.company).filter(Boolean));
      const sharedCompanies = Array.from(companiesA).filter(c => companiesB.has(c)) as string[];

      // Find shared signal types (proxy for shared technologies)
      const typesA = new Set(signalsA.map(s => s.signal_type));
      const typesB = new Set(signalsB.map(s => s.signal_type));
      const sharedTypes = Array.from(typesA).filter(t => typesB.has(t));

      // Convergence score: weighted by shared elements
      const companyOverlap = sharedCompanies.length / Math.max(1, Math.min(companiesA.size, companiesB.size));
      const typeOverlap = sharedTypes.length / Math.max(1, Math.min(typesA.size, typesB.size));
      const convergenceScore = Math.round((companyOverlap * 60 + typeOverlap * 40) * 100) / 100;

      if (convergenceScore < 20 || sharedCompanies.length === 0) continue;

      // Estimate time horizon based on signal recency
      const now = Date.now();
      const recentA = signalsA.filter(s => now - new Date(s.discovered_at).getTime() < 30 * 86400000).length;
      const recentB = signalsB.filter(s => now - new Date(s.discovered_at).getTime() < 30 * 86400000).length;
      const bothActive = recentA >= 2 && recentB >= 2;

      let timeHorizon: ConvergencePrediction['time_horizon'] = '24_months';
      if (convergenceScore >= 60 && bothActive) timeHorizon = '3_months';
      else if (convergenceScore >= 40 && bothActive) timeHorizon = '6_months';
      else if (convergenceScore >= 25) timeHorizon = '12_months';

      predictions.push({
        industries: [a, b],
        shared_technologies: sharedTypes,
        shared_companies: sharedCompanies,
        convergence_score: Math.round(convergenceScore),
        prediction: `${a} and ${b} show convergence through ${sharedCompanies.length} shared companies and ${sharedTypes.length} shared signal patterns`,
        time_horizon: timeHorizon,
        confidence: Math.min(0.9, convergenceScore / 100 + (bothActive ? 0.15 : 0)),
      });
    }
  }

  // Sort by convergence score descending
  predictions.sort((a, b) => b.convergence_score - a.convergence_score);
  return predictions.slice(0, 10); // top 10
}

// ─── Timing Estimation ────────────────────────────────────────────────────────

function estimateTiming(trajectory: TrajectoryForecast): TimingEstimate | null {
  if (!trajectory.adoption_next_stage || !trajectory.time_to_next_stage_days) return null;

  const evidence: string[] = [];
  if (trajectory.velocity > 3) evidence.push(`Signal velocity: +${trajectory.velocity} per 30 days`);
  if (trajectory.signals_recent > 5) evidence.push(`${trajectory.signals_recent} signals in last 14 days`);
  if (trajectory.catalysts.length > 0) evidence.push(`Catalysts: ${trajectory.catalysts.join(', ')}`);

  return {
    industry: trajectory.industry,
    slug: trajectory.slug,
    current_stage: trajectory.adoption_stage,
    next_milestone: `Transition to ${trajectory.adoption_next_stage}`,
    estimated_days: trajectory.time_to_next_stage_days,
    confidence: trajectory.confidence * 0.8, // timing is less certain
    evidence,
  };
}

// ─── Risk Detection ───────────────────────────────────────────────────────────

function detectRisks(trajectory: TrajectoryForecast): RiskAlert[] {
  const risks: RiskAlert[] = [];
  const slug = trajectory.slug;

  // Signal decay: no recent signals
  if (trajectory.signals_recent === 0 && trajectory.signals_prior > 0) {
    risks.push({
      industry: trajectory.industry,
      slug,
      risk_type: 'signal_decay',
      severity: trajectory.signals_prior >= 5 ? 'high' : 'medium',
      description: `${trajectory.industry} had ${trajectory.signals_prior} signals last month but none in the last 14 days`,
      evidence: ['Zero signals in 14-day window', `${trajectory.signals_prior} signals in 15-30 day window`],
      suggested_action: 'Monitor for stale data. Check if sources are still active.',
    });
  }

  // Adoption stall: plateauing with low confidence
  if (trajectory.direction === 'plateauing' && trajectory.current_score > 40 && trajectory.velocity < 1) {
    risks.push({
      industry: trajectory.industry,
      slug,
      risk_type: 'adoption_stall',
      severity: trajectory.current_score > 60 ? 'medium' : 'low',
      description: `${trajectory.industry} has plateaued at score ${trajectory.current_score} with minimal growth`,
      evidence: [`Velocity: ${trajectory.velocity}/30d`, `Direction: ${trajectory.direction}`],
      suggested_action: 'Look for enabling technologies or policy changes that could restart growth.',
    });
  }

  // Single-company dependency
  if (trajectory.risk_factors.includes('Single-company dependency')) {
    risks.push({
      industry: trajectory.industry,
      slug,
      risk_type: 'competition_surge',
      severity: 'medium',
      description: `${trajectory.industry} depends on a single company — high concentration risk`,
      evidence: ['Only 1 company detected in signals'],
      suggested_action: 'Scan for new entrants. Single-vendor industries are fragile.',
    });
  }

  // Declining trajectory
  if (trajectory.direction === 'declining' && trajectory.velocity < -5) {
    risks.push({
      industry: trajectory.industry,
      slug,
      risk_type: 'signal_decay',
      severity: 'high',
      description: `${trajectory.industry} is showing significant decline (velocity: ${trajectory.velocity}/30d)`,
      evidence: [`Velocity: ${trajectory.velocity}`, `Predicted 90d score: ${trajectory.predicted_score_90d}`],
      suggested_action: 'Investigate root cause. Market shift, regulation, or technology disruption?',
    });
  }

  // Funding drought: lots of patents/research but no funding signals
  const hasFundingCatalyst = trajectory.catalysts.some(c => c.includes('funding'));
  const hasPatentCatalyst = trajectory.catalysts.some(c => c.includes('Patent'));
  if (hasPatentCatalyst && !hasFundingCatalyst && trajectory.adoption_stage === 'Innovators') {
    risks.push({
      industry: trajectory.industry,
      slug,
      risk_type: 'funding_drought',
      severity: 'low',
      description: `${trajectory.industry} has patent activity but no funding signals — may struggle to commercialize`,
      evidence: ['Patent filings detected', 'No funding rounds in recent window'],
      suggested_action: 'Track for venture capital entry. Good research without funding delays adoption.',
    });
  }

  return risks;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Run the full prediction engine.
 * Analyzes all industries with recent signals and produces forecasts.
 */
export async function runPredictions(): Promise<PredictionReport> {
  const signals = await getIntelSignals({ limit: 500 });

  // Group signals by industry
  const industrySignals = new Map<string, typeof signals>();
  for (const s of signals) {
    const existing = industrySignals.get(s.industry) ?? [];
    existing.push(s);
    industrySignals.set(s.industry, existing);
  }

  // Count entity links per industry (for scoring)
  const entityLinkCounts = new Map<string, number>();
  try {
    const industryEntities = await getEntitiesByType('industry');
    for (const entity of industryEntities) {
      const rels = await getRelationships(entity.id);
      entityLinkCounts.set(entity.name.toLowerCase(), rels.length);
    }
  } catch {
    // Graph may not be populated — continue with 0 links
  }

  // Build trajectory for each industry
  const trajectories: TrajectoryForecast[] = [];
  for (const [industry, indSignals] of Array.from(industrySignals.entries() as Iterable<[string, typeof signals]>)) {
    if (indSignals.length < 2) continue; // need minimum data
    const linkCount = entityLinkCounts.get(industry.toLowerCase()) ?? 0;
    const trajectory = computeTrajectory(industry, indSignals, linkCount);
    trajectories.push(trajectory);
  }

  // Sort by current score descending
  trajectories.sort((a, b) => b.current_score - a.current_score);

  // Detect convergences between industries
  const convergences = detectConvergences(industrySignals);

  // Timing estimates from trajectories
  const timing: TimingEstimate[] = [];
  for (const t of trajectories) {
    const estimate = estimateTiming(t);
    if (estimate) timing.push(estimate);
  }

  // Risk alerts from trajectories
  const risks: RiskAlert[] = [];
  for (const t of trajectories) {
    risks.push(...detectRisks(t));
  }
  // Sort risks by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  risks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Summary
  const fastestGrowing = trajectories.reduce<TrajectoryForecast | null>(
    (best, t) => (!best || t.velocity > best.velocity) ? t : best, null
  );
  const biggestRisk = risks[0] ?? null;
  const nearestConvergence = convergences[0] ?? null;

  return {
    generated_at: new Date().toISOString(),
    trajectories,
    convergences,
    timing,
    risks,
    summary: {
      fastest_growing: fastestGrowing?.industry ?? null,
      biggest_risk: biggestRisk ? `${biggestRisk.industry}: ${biggestRisk.risk_type}` : null,
      nearest_convergence: nearestConvergence ? nearestConvergence.industries.join(' + ') : null,
      industries_analyzed: trajectories.length,
    },
  };
}
