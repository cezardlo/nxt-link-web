// IKER Trust Score — Intelligence · Knowledge · Evidence · Reliability
// Bayesian Confidence Model: Start at neutral prior, adjust with evidence.
// Score = posterior mean; Confidence = how much evidence we actually have.
// Based on NXT LINK Architecture Research (Bitsight, UpGuard, DSALTA patterns)

// ── Types ──────────────────────────────────────────────────────────────────

export type IkerTier = 'TRUSTED' | 'RELIABLE' | 'CAUTION' | 'RISK';

export type IkerFactor = {
  factor: string;
  impact: number;      // positive = good, negative = bad
  confidence: number;  // 0–1, how reliable this evidence is
};

/**
 * New Bayesian breakdown.
 * Backward-compatible: `total`, `tier`, `external`, `stability`, `context`
 * still exist with the same shapes so existing UI keeps working.
 */
export type IkerBreakdown = {
  // ── New Bayesian fields ──
  score: number;           // 0–100 posterior mean
  confidence: number;      // 0–1 overall confidence
  tier: IkerTier;
  factors: IkerFactor[];
  missing: string[];       // data we didn't have — lowers confidence, NOT score

  // ── Legacy fields (kept for backward compat) ──
  total: number;
  external: { score: number; max: 40; factors: string[] };
  stability: { score: number; max: 35; factors: string[] };
  context: { score: number; max: 25; factors: string[] };
};

// ── Constants ──────────────────────────────────────────────────────────────

export const IKER_TIERS: Record<IkerTier, { min: number; color: string; label: string }> = {
  TRUSTED:  { min: 80, color: '#22c55e', label: 'Trusted Partner' },
  RELIABLE: { min: 60, color: '#eab308', label: 'Reliable Vendor' },
  CAUTION:  { min: 40, color: '#f97316', label: 'Use Caution' },
  RISK:     { min: 0,  color: '#ef4444', label: 'High Risk' },
};

const PRIOR_MEAN = 50;
const PRIOR_CONFIDENCE = 0.3;   // weak prior — easily moved by evidence

// ── Helpers (backward-compatible) ──────────────────────────────────────────

export function getIkerTier(score: number): IkerTier {
  if (score >= 80) return 'TRUSTED';
  if (score >= 60) return 'RELIABLE';
  if (score >= 40) return 'CAUTION';
  return 'RISK';
}

export function getIkerColor(score: number): string {
  return IKER_TIERS[getIkerTier(score)].color;
}

// ── Bayesian Engine ────────────────────────────────────────────────────────

type EvidenceSpec = {
  key: string;            // vendor field name
  label: string;          // human-readable
  category: 'external' | 'stability' | 'context';
  /** Evaluate vendor data → impact + confidence, or null if data missing */
  evaluate: (v: VendorInput) => { impact: number; confidence: number; label: string } | null;
};

type VendorInput = {
  // External Signals
  lastFundingDaysAgo?: number;
  fundingAmount?: number;
  recentPartnerships?: number;
  positiveNewsCount?: number;
  signalMentions?: number;
  // Stability
  yearsInBusiness?: number;
  employeeGrowth?: 'growing' | 'stable' | 'declining';
  leadershipStable?: boolean;
  officeLocations?: number;
  // Business Context
  hasLocalCustomers?: boolean;
  hasCaseStudies?: boolean;
  avgReviewScore?: number;
  responseRate?: number;
};

/**
 * Evidence registry.
 * Each spec returns an impact (-50 to +50 scale) and its own confidence.
 * Positive impact = evidence the vendor is trustworthy.
 * Negative impact = evidence of risk.
 */
const EVIDENCE: EvidenceSpec[] = [
  // ── External Signals ──
  {
    key: 'lastFundingDaysAgo',
    label: 'Recent funding',
    category: 'external',
    evaluate: (v) => {
      if (v.lastFundingDaysAgo == null) return null;
      if (v.lastFundingDaysAgo < 180)
        return { impact: +18, confidence: 0.9, label: 'Funded in last 6 months' };
      if (v.lastFundingDaysAgo < 365)
        return { impact: +12, confidence: 0.85, label: 'Funded in last year' };
      if (v.lastFundingDaysAgo < 730)
        return { impact: +5, confidence: 0.7, label: 'Funded in last 2 years' };
      return { impact: -3, confidence: 0.6, label: 'No recent funding (>2 years)' };
    },
  },
  {
    key: 'recentPartnerships',
    label: 'Partnerships',
    category: 'external',
    evaluate: (v) => {
      if (v.recentPartnerships == null) return null;
      if (v.recentPartnerships > 2)
        return { impact: +12, confidence: 0.8, label: `${v.recentPartnerships} recent partnerships` };
      if (v.recentPartnerships > 0)
        return { impact: +6, confidence: 0.7, label: `${v.recentPartnerships} partnership` };
      return { impact: -4, confidence: 0.5, label: 'No known partnerships' };
    },
  },
  {
    key: 'positiveNewsCount',
    label: 'News sentiment',
    category: 'external',
    evaluate: (v) => {
      if (v.positiveNewsCount == null) return null;
      if (v.positiveNewsCount >= 5)
        return { impact: +10, confidence: 0.75, label: `${v.positiveNewsCount} positive news mentions` };
      if (v.positiveNewsCount > 0)
        return { impact: +5, confidence: 0.6, label: `${v.positiveNewsCount} positive news mentions` };
      return { impact: -2, confidence: 0.4, label: 'No positive news found' };
    },
  },
  {
    key: 'signalMentions',
    label: 'Intel signals',
    category: 'external',
    evaluate: (v) => {
      if (v.signalMentions == null) return null;
      if (v.signalMentions > 0)
        return { impact: +Math.min(v.signalMentions * 3, 8), confidence: 0.7, label: `${v.signalMentions} intel signal mentions` };
      return { impact: 0, confidence: 0.3, label: 'No intel signals' };
    },
  },

  // ── Stability ──
  {
    key: 'yearsInBusiness',
    label: 'Business longevity',
    category: 'stability',
    evaluate: (v) => {
      if (v.yearsInBusiness == null) return null;
      if (v.yearsInBusiness >= 10)
        return { impact: +15, confidence: 0.95, label: `${v.yearsInBusiness} years in business` };
      if (v.yearsInBusiness >= 5)
        return { impact: +10, confidence: 0.9, label: `${v.yearsInBusiness} years in business` };
      if (v.yearsInBusiness >= 2)
        return { impact: +4, confidence: 0.8, label: `${v.yearsInBusiness} years in business` };
      return { impact: -6, confidence: 0.85, label: `Only ${v.yearsInBusiness} years in business` };
    },
  },
  {
    key: 'employeeGrowth',
    label: 'Employee trajectory',
    category: 'stability',
    evaluate: (v) => {
      if (v.employeeGrowth == null) return null;
      if (v.employeeGrowth === 'growing')
        return { impact: +10, confidence: 0.8, label: 'Employee count growing' };
      if (v.employeeGrowth === 'stable')
        return { impact: +4, confidence: 0.7, label: 'Employee count stable' };
      return { impact: -8, confidence: 0.85, label: 'Employee count declining' };
    },
  },
  {
    key: 'leadershipStable',
    label: 'Leadership stability',
    category: 'stability',
    evaluate: (v) => {
      if (v.leadershipStable == null) return null;
      if (v.leadershipStable)
        return { impact: +6, confidence: 0.75, label: 'Stable leadership team' };
      return { impact: -5, confidence: 0.7, label: 'Leadership changes detected' };
    },
  },
  {
    key: 'officeLocations',
    label: 'Office footprint',
    category: 'stability',
    evaluate: (v) => {
      if (v.officeLocations == null) return null;
      const pts = Math.min(v.officeLocations * 2, 6);
      return { impact: +pts, confidence: 0.6, label: `${v.officeLocations} office locations` };
    },
  },

  // ── Business Context ──
  {
    key: 'hasLocalCustomers',
    label: 'Local presence',
    category: 'context',
    evaluate: (v) => {
      if (v.hasLocalCustomers == null) return null;
      if (v.hasLocalCustomers)
        return { impact: +10, confidence: 0.8, label: 'Has local customers' };
      return { impact: -3, confidence: 0.5, label: 'No known local customers' };
    },
  },
  {
    key: 'hasCaseStudies',
    label: 'Case studies',
    category: 'context',
    evaluate: (v) => {
      if (v.hasCaseStudies == null) return null;
      if (v.hasCaseStudies)
        return { impact: +6, confidence: 0.7, label: 'Published case studies' };
      return { impact: -2, confidence: 0.4, label: 'No case studies found' };
    },
  },
  {
    key: 'avgReviewScore',
    label: 'Review score',
    category: 'context',
    evaluate: (v) => {
      if (v.avgReviewScore == null) return null;
      if (v.avgReviewScore >= 4.5)
        return { impact: +8, confidence: 0.85, label: `${v.avgReviewScore}/5 avg reviews` };
      if (v.avgReviewScore >= 4.0)
        return { impact: +5, confidence: 0.8, label: `${v.avgReviewScore}/5 avg reviews` };
      if (v.avgReviewScore >= 3.0)
        return { impact: -2, confidence: 0.7, label: `${v.avgReviewScore}/5 avg reviews` };
      return { impact: -8, confidence: 0.8, label: `${v.avgReviewScore}/5 avg reviews — poor` };
    },
  },
  {
    key: 'responseRate',
    label: 'Responsiveness',
    category: 'context',
    evaluate: (v) => {
      if (v.responseRate == null) return null;
      if (v.responseRate >= 0.8)
        return { impact: +5, confidence: 0.7, label: 'High response rate' };
      if (v.responseRate >= 0.5)
        return { impact: +1, confidence: 0.5, label: 'Moderate response rate' };
      return { impact: -4, confidence: 0.6, label: 'Low response rate' };
    },
  },
];

// ── Core Calculation ───────────────────────────────────────────────────────

/**
 * Bayesian IKER score.
 *
 * Prior: mean = 50, confidence = 0.3
 * Each evidence point shifts the posterior proportionally to its own confidence.
 * Missing data does NOT penalize the score — it only lowers overall confidence.
 */
export function calculateIkerScore(vendor: VendorInput): IkerBreakdown {
  const factors: IkerFactor[] = [];
  const missing: string[] = [];

  // Accumulators for Bayesian update
  let weightedSum = PRIOR_MEAN * PRIOR_CONFIDENCE;
  let totalWeight = PRIOR_CONFIDENCE;

  // Legacy bucket accumulators
  const legacyExternal: string[] = [];
  const legacyStability: string[] = [];
  const legacyContext: string[] = [];
  let extScore = 0;
  let stabScore = 0;
  let ctxScore = 0;

  for (const spec of EVIDENCE) {
    const result = spec.evaluate(vendor);

    if (result === null) {
      // Data missing — reduce confidence, don't touch score
      missing.push(spec.label);
      continue;
    }

    // Weight = how much this evidence matters (confidence as weight)
    const w = result.confidence;
    // Map impact to an "observation" around the prior mean
    // impact of +20 with prior 50 → observation of 70
    const observation = clamp(PRIOR_MEAN + result.impact, 0, 100);

    weightedSum += observation * w;
    totalWeight += w;

    factors.push({
      factor: result.label,
      impact: result.impact,
      confidence: result.confidence,
    });

    // Fill legacy buckets
    const legacyPts = Math.max(0, result.impact); // old system was additive-only
    if (spec.category === 'external') {
      legacyExternal.push(result.label);
      extScore += legacyPts;
    } else if (spec.category === 'stability') {
      legacyStability.push(result.label);
      stabScore += legacyPts;
    } else {
      legacyContext.push(result.label);
      ctxScore += legacyPts;
    }
  }

  // Posterior mean
  const posteriorMean = clamp(Math.round(weightedSum / totalWeight), 0, 100);

  // Overall confidence: ratio of evidence weight to max possible weight
  const maxPossibleWeight = PRIOR_CONFIDENCE + EVIDENCE.length * 1.0; // if every spec returned confidence=1
  const overallConfidence = clamp(totalWeight / maxPossibleWeight, 0, 1);

  const tier = getIkerTier(posteriorMean);

  return {
    // New Bayesian fields
    score: posteriorMean,
    confidence: parseFloat(overallConfidence.toFixed(3)),
    tier,
    factors,
    missing,

    // Legacy compat
    total: posteriorMean,
    external: { score: Math.min(extScore, 40), max: 40, factors: legacyExternal },
    stability: { score: Math.min(stabScore, 35), max: 35, factors: legacyStability },
    context: { score: Math.min(ctxScore, 25), max: 25, factors: legacyContext },
  };
}

/**
 * @deprecated Use `calculateIkerScore` instead.
 * Kept for backward compatibility — same signature, returns the new breakdown.
 */
export const calculateIker = calculateIkerScore;

// ── Utility ────────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
