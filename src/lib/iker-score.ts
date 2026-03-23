// IKER Trust Score — Intelligence · Knowledge · Evidence · Reliability
// Weighted: External Signals (40%) + Stability (35%) + Business Context (25%)
// Based on NXT LINK Architecture Research (Bitsight, UpGuard, DSALTA patterns)

export type IkerBreakdown = {
  total: number;
  tier: IkerTier;
  external: { score: number; max: 40; factors: string[] };
  stability: { score: number; max: 35; factors: string[] };
  context: { score: number; max: 25; factors: string[] };
};

export type IkerTier = 'TRUSTED' | 'RELIABLE' | 'CAUTION' | 'RISK';

export const IKER_TIERS: Record<IkerTier, { min: number; color: string; label: string }> = {
  TRUSTED:  { min: 80, color: '#22c55e', label: 'Trusted Partner' },
  RELIABLE: { min: 60, color: '#eab308', label: 'Reliable Vendor' },
  CAUTION:  { min: 40, color: '#f97316', label: 'Use Caution' },
  RISK:     { min: 0,  color: '#ef4444', label: 'High Risk' },
};

export function getIkerTier(score: number): IkerTier {
  if (score >= 80) return 'TRUSTED';
  if (score >= 60) return 'RELIABLE';
  if (score >= 40) return 'CAUTION';
  return 'RISK';
}

export function getIkerColor(score: number): string {
  return IKER_TIERS[getIkerTier(score)].color;
}

/**
 * Calculate IKER score from vendor data.
 * Returns breakdown with individual component scores.
 */
export function calculateIker(vendor: {
  // External Signals (40%)
  lastFundingDaysAgo?: number;
  fundingAmount?: number;
  recentPartnerships?: number;
  positiveNewsCount?: number;
  signalMentions?: number;
  // Stability (35%)
  yearsInBusiness?: number;
  employeeGrowth?: 'growing' | 'stable' | 'declining';
  leadershipStable?: boolean;
  officeLocations?: number;
  // Business Context (25%)
  hasLocalCustomers?: boolean;
  hasCaseStudies?: boolean;
  avgReviewScore?: number;
  responseRate?: number;
}): IkerBreakdown {
  const external = { score: 0, max: 40 as const, factors: [] as string[] };
  const stability = { score: 0, max: 35 as const, factors: [] as string[] };
  const context = { score: 0, max: 25 as const, factors: [] as string[] };

  // ── External Signals (40 points) ──
  if (vendor.lastFundingDaysAgo != null) {
    if (vendor.lastFundingDaysAgo < 180) {
      external.score += 15;
      external.factors.push('Funded in last 6 months');
    } else if (vendor.lastFundingDaysAgo < 365) {
      external.score += 10;
      external.factors.push('Funded in last year');
    } else if (vendor.lastFundingDaysAgo < 730) {
      external.score += 5;
      external.factors.push('Funded in last 2 years');
    }
  }

  if (vendor.recentPartnerships != null) {
    if (vendor.recentPartnerships > 2) {
      external.score += 10;
      external.factors.push(`${vendor.recentPartnerships} recent partnerships`);
    } else if (vendor.recentPartnerships > 0) {
      external.score += 5;
      external.factors.push(`${vendor.recentPartnerships} partnership`);
    }
  }

  if (vendor.positiveNewsCount) {
    const pts = Math.min(vendor.positiveNewsCount * 2, 10);
    external.score += pts;
    external.factors.push(`${vendor.positiveNewsCount} positive news mentions`);
  }

  if (vendor.signalMentions) {
    const pts = Math.min(vendor.signalMentions * 3, 5);
    external.score += pts;
    external.factors.push(`${vendor.signalMentions} intel signal mentions`);
  }

  // ── Stability Metrics (35 points) ──
  if (vendor.yearsInBusiness != null) {
    if (vendor.yearsInBusiness >= 10) {
      stability.score += 15;
      stability.factors.push(`${vendor.yearsInBusiness} years in business`);
    } else if (vendor.yearsInBusiness >= 5) {
      stability.score += 10;
      stability.factors.push(`${vendor.yearsInBusiness} years in business`);
    } else if (vendor.yearsInBusiness >= 2) {
      stability.score += 5;
      stability.factors.push(`${vendor.yearsInBusiness} years in business`);
    }
  }

  if (vendor.employeeGrowth === 'growing') {
    stability.score += 10;
    stability.factors.push('Employee count growing');
  } else if (vendor.employeeGrowth === 'stable') {
    stability.score += 5;
    stability.factors.push('Employee count stable');
  } else if (vendor.employeeGrowth === 'declining') {
    stability.factors.push('Employee count declining');
  }

  if (vendor.leadershipStable) {
    stability.score += 5;
    stability.factors.push('Stable leadership team');
  }

  if (vendor.officeLocations) {
    stability.score += Math.min(vendor.officeLocations, 5);
    stability.factors.push(`${vendor.officeLocations} office locations`);
  }

  // ── Business Context (25 points) ──
  if (vendor.hasLocalCustomers) {
    context.score += 10;
    context.factors.push('Has local customers');
  }

  if (vendor.hasCaseStudies) {
    context.score += 5;
    context.factors.push('Published case studies');
  }

  if (vendor.avgReviewScore != null && vendor.avgReviewScore >= 4.0) {
    context.score += 5;
    context.factors.push(`${vendor.avgReviewScore}/5 avg reviews`);
  }

  if (vendor.responseRate != null && vendor.responseRate >= 0.8) {
    context.score += 5;
    context.factors.push('High response rate');
  }

  const total = Math.min(external.score + stability.score + context.score, 100);

  return {
    total,
    tier: getIkerTier(total),
    external,
    stability,
    context,
  };
}
