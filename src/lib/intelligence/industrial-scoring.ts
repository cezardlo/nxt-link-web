// src/lib/intelligence/industrial-scoring.ts
// Industrial intelligence scoring engine for NXT LINK vendors.
// Produces composite growth, automation, opportunity, and risk scores
// derived from vendor ikerScore, tags, evidence, and category signals.

import type { VendorRecord } from '@/lib/data/el-paso-vendors';

// ─── Types ────────────────────────────────────────────────────────────────────

export type IndustrialScore = {
  vendorId: string;
  vendorName: string;
  category: string;
  growthScore: number;        // 0-100: hiring, funding, expansion activity
  automationScore: number;    // 0-100: AI, robotics, autonomous capability
  opportunityScore: number;   // 0-100: contracts, market expansion signals
  riskScore: number;          // 0-100: lawsuits, layoffs, financial risk (lower = safer)
  compositeScore: number;     // weighted: growth*0.3 + automation*0.25 + opportunity*0.3 + (100-risk)*0.15
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  signals: string[];          // key drivers behind the score
  updatedAt: string;          // ISO timestamp
};

// ─── Keyword sets ─────────────────────────────────────────────────────────────

const GROWTH_TAG_KEYWORDS = [
  'expansion', 'funding', 'growth', 'series', 'venture', 'investment',
  'scale', 'hiring', 'recruiting', 'headcount', 'workforce', 'build-out',
  'new facility', 'opening', 'launched', 'expanded',
];

const AUTOMATION_TAG_KEYWORDS = [
  'ai', 'artificial intelligence', 'machine learning', 'ml', 'robotics',
  'autonomous', 'automation', 'computer vision', 'nlp', 'deep learning',
  'neural', 'inference', 'iot', 'digital twin', 'predictive', 'sensor fusion',
  'unmanned', 'uas', 'drone',
];

const OPPORTUNITY_EVIDENCE_KEYWORDS = [
  'contract', 'award', 'task order', 'idiq', 'sbir', 'sttr', 'grant',
  'government', 'dod', 'army', 'cbp', 'federal', 'usaf', 'navy',
  'solicitation', 'rfp', 'bpa', 'bliss', 'fort', 'department', 'agency',
];

const RISK_EVIDENCE_KEYWORDS = [
  'lawsuit', 'litigation', 'layoff', 'restructuring', 'downgrade',
  'investigation', 'breach', 'penalty', 'fine', 'settled', 'complaint',
  'bankruptcy', 'acquired', 'sunset', 'discontinued', 'cancelled',
];

const GROWTH_EVIDENCE_KEYWORDS = [
  'funding', 'expansion', 'series a', 'series b', 'raised', 'investment',
  'hired', 'hiring', '+', 'new office', 'opened', 'relocated', 'grow',
];

// ─── Category amplifiers ──────────────────────────────────────────────────────
// Some categories get a base automation score boost because the sector is
// inherently automation-heavy (robotics, AI R&D, etc.)

const CATEGORY_AUTOMATION_BOOST: Record<string, number> = {
  'Robotics & Automation':    35,
  'Warehouse Automation':     30,
  'Industrial AI':            30,
  'AI / R&D':                 28,
  'Manufacturing Tech':       20,
  'Defense Tech':             15,
  'Defense IT':               12,
  'Consulting':               8,
};

const CATEGORY_OPPORTUNITY_BOOST: Record<string, number> = {
  'Defense Tech':             30,
  'Defense IT':               28,
  'Border Tech':              25,
  'Consulting':               20,
  'Logistics Platform':       15,
  'Supply Chain Software':    12,
  'Energy Tech':              10,
  'Water Tech':               8,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function matchScore(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) hits++;
  }
  return hits;
}

function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function gradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

// ─── Score computation ────────────────────────────────────────────────────────

function computeGrowthScore(vendor: VendorRecord): { score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 0;

  // Base from IKER score (IKER is forward-looking vendor health)
  const ikerBase = (vendor.ikerScore / 100) * 30;
  score += ikerBase;

  // Tag hits for growth keywords
  const tagText = vendor.tags.join(' ');
  const tagHits = matchScore(tagText, GROWTH_TAG_KEYWORDS);
  if (tagHits > 0) {
    score += Math.min(25, tagHits * 8);
    signals.push(`${tagHits} growth tag(s) detected`);
  }

  // Evidence hits for growth/funding language
  const evidenceText = vendor.evidence.join(' ');
  const evidenceHits = matchScore(evidenceText, GROWTH_EVIDENCE_KEYWORDS);
  if (evidenceHits > 0) {
    score += Math.min(30, evidenceHits * 10);
    signals.push(`Funding/expansion evidence (${evidenceHits} signal${evidenceHits > 1 ? 's' : ''})`);
  }

  // Weight bonus
  const weightBonus = (vendor.weight ?? 0.5) * 15;
  score += weightBonus;

  return { score: clamp(score), signals };
}

function computeAutomationScore(vendor: VendorRecord): { score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 0;

  // Category base boost
  const categoryBoost = CATEGORY_AUTOMATION_BOOST[vendor.category] ?? 0;
  if (categoryBoost > 0) {
    score += categoryBoost;
    signals.push(`${vendor.category} sector automation base`);
  }

  // Tag keyword matching
  const tagText = vendor.tags.join(' ');
  const tagHits = matchScore(tagText, AUTOMATION_TAG_KEYWORDS);
  if (tagHits > 0) {
    score += Math.min(35, tagHits * 9);
    signals.push(`${tagHits} automation/AI tag(s)`);
  }

  // Evidence keyword matching
  const evidenceText = vendor.evidence.join(' ');
  const evidenceHits = matchScore(evidenceText, AUTOMATION_TAG_KEYWORDS);
  if (evidenceHits > 0) {
    score += Math.min(20, evidenceHits * 7);
    signals.push('AI/automation capability in evidence');
  }

  // IKER score contribution (high-IKER vendors tend to be tech-forward)
  if (vendor.ikerScore >= 85) {
    score += 10;
    signals.push('High IKER score reflects tech leadership');
  } else if (vendor.ikerScore >= 70) {
    score += 5;
  }

  return { score: clamp(score), signals };
}

function computeOpportunityScore(vendor: VendorRecord): { score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 0;

  // Category base boost (defense/border = more gov contract opportunity)
  const categoryBoost = CATEGORY_OPPORTUNITY_BOOST[vendor.category] ?? 0;
  if (categoryBoost > 0) {
    score += categoryBoost;
    signals.push(`${vendor.category} sector opportunity multiplier`);
  }

  // Evidence hits for contract/award language
  const evidenceText = vendor.evidence.join(' ');
  const evidenceHits = matchScore(evidenceText, OPPORTUNITY_EVIDENCE_KEYWORDS);
  if (evidenceHits > 0) {
    score += Math.min(40, evidenceHits * 9);
    signals.push(`${evidenceHits} contract/award signal(s) in evidence`);
  }

  // IKER contribution
  const ikerBonus = (vendor.ikerScore / 100) * 20;
  score += ikerBonus;

  // Confidence bonus (high-confidence vendors have more validated opportunity data)
  const confBonus = (vendor.confidence ?? 0.7) * 10;
  score += confBonus;

  return { score: clamp(score), signals };
}

function computeRiskScore(vendor: VendorRecord): { score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 20; // baseline low risk

  const evidenceText = vendor.evidence.join(' ');
  const riskHits = matchScore(evidenceText, RISK_EVIDENCE_KEYWORDS);
  if (riskHits > 0) {
    score += riskHits * 20;
    signals.push(`${riskHits} risk indicator(s) found`);
  }

  // Low IKER = higher risk
  if (vendor.ikerScore < 50) {
    score += 25;
    signals.push('Low IKER score (below 50)');
  } else if (vendor.ikerScore < 65) {
    score += 12;
    signals.push('Moderate IKER score (50-65)');
  }

  // Low confidence data = higher uncertainty risk
  if ((vendor.confidence ?? 1) < 0.7) {
    score += 10;
    signals.push('Low data confidence');
  }

  return { score: clamp(score), signals };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeIndustrialScores(
  vendors: Record<string, VendorRecord>,
): IndustrialScore[] {
  const now = new Date().toISOString();

  return Object.values(vendors).map((vendor) => {
    const growth = computeGrowthScore(vendor);
    const automation = computeAutomationScore(vendor);
    const opportunity = computeOpportunityScore(vendor);
    const risk = computeRiskScore(vendor);

    // Weighted composite: growth*0.30 + automation*0.25 + opportunity*0.30 + safety*0.15
    const composite = clamp(
      growth.score * 0.30 +
      automation.score * 0.25 +
      opportunity.score * 0.30 +
      (100 - risk.score) * 0.15,
    );

    const allSignals = [
      ...growth.signals,
      ...automation.signals,
      ...opportunity.signals,
      ...risk.signals,
    ].filter(Boolean);

    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      category: vendor.category,
      growthScore: growth.score,
      automationScore: automation.score,
      opportunityScore: opportunity.score,
      riskScore: risk.score,
      compositeScore: composite,
      grade: gradeFromScore(composite),
      signals: allSignals.slice(0, 5),
      updatedAt: now,
    };
  });
}

// ─── Convenience: sort by composite desc ──────────────────────────────────────

export function topIndustrialVendors(
  vendors: Record<string, VendorRecord>,
  limit = 10,
): IndustrialScore[] {
  return computeIndustrialScores(vendors)
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, limit);
}
