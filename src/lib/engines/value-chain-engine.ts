// src/lib/engines/value-chain-engine.ts
// Value Chain Mapping engine — maps industry signals into supply chain tiers and identifies gaps.
// Pure computation, no LLM calls, no DB access.

import type { IntelSignalRow } from '@/db/queries/intel-signals';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ValueChainTier = {
  name: string;
  slug: string;
  activity_score: number;   // 0–100
  company_density: number;  // estimated companies active in this tier
  signal_count: number;     // raw count of matched signals
  key_signals: string[];    // top 3 signal titles
  gap_detected: boolean;    // true when adjacent tiers are strong but this is weak
};

export type ValueChainAnalysis = {
  tiers: ValueChainTier[];
  integration_score: number;   // 0–100, avg of all tier activity scores
  bottleneck_tiers: string[];  // slugs of tiers with gap_detected = true
  strongest_tier: string;      // slug of tier with highest activity_score
  weakest_tier: string | null; // slug of lowest non-zero tier, null if all zero
};

// ─── Tier Definitions ─────────────────────────────────────────────────────────

type TierDef = {
  name: string;
  slug: string;
  signal_types: string[];                            // exact type matches
  title_keywords: string[];                          // title substring matches (lowercase)
};

const TIER_DEFS: TierDef[] = [
  {
    name: 'Research & Development',
    slug: 'research_development',
    signal_types: ['research_paper', 'patent_filing'],
    title_keywords: ['research', 'patent', 'study', 'paper', 'lab', 'r&d', 'prototype', 'innovation'],
  },
  {
    name: 'Inputs & Materials',
    slug: 'inputs_materials',
    signal_types: [],
    title_keywords: ['supply', 'material', 'component', 'raw', 'input', 'ingredient', 'parts', 'procurement', 'sourcing', 'supplier'],
  },
  {
    name: 'Production & Manufacturing',
    slug: 'production_manufacturing',
    signal_types: ['facility_expansion', 'product_launch'],
    title_keywords: ['manufactur', 'production', 'factory', 'plant', 'facility', 'assembly', 'fabricat', 'build', 'output'],
  },
  {
    name: 'Distribution & Logistics',
    slug: 'distribution_logistics',
    signal_types: [],
    title_keywords: ['logistic', 'distribution', 'ship', 'transport', 'freight', 'deliver', 'warehouse', 'fulfillment', 'partnership', 'partner', 'network'],
  },
  {
    name: 'Sales & Marketing',
    slug: 'sales_marketing',
    signal_types: ['contract_award', 'case_study'],
    title_keywords: ['contract', 'award', 'sale', 'customer', 'client', 'deal', 'win', 'revenue', 'market', 'case study', 'deployment'],
  },
  {
    name: 'Support & Services',
    slug: 'support_services',
    signal_types: ['hiring_signal'],
    title_keywords: ['hiring', 'support', 'service', 'training', 'consult', 'maintenan', 'workforce', 'talent', 'staff', 'team'],
  },
];

// Signal types that contribute partial weight across multiple tiers
type SplitRule = {
  signal_type: string;
  tiers: string[];   // slugs that each receive a fractional count
};

const SPLIT_RULES: SplitRule[] = [
  {
    signal_type: 'funding_round',
    tiers: ['research_development', 'production_manufacturing'],
  },
  {
    signal_type: 'merger_acquisition',
    tiers: ['production_manufacturing', 'sales_marketing'],
  },
];

// Regulatory actions give a small uniform boost to every tier
const REGULATORY_BOOST_PER_SIGNAL = 0.5;

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function titleMatchesTier(title: string, def: TierDef): boolean {
  const lower = title.toLowerCase();
  return def.title_keywords.some(kw => lower.includes(kw));
}

function signalMatchesTier(signal: IntelSignalRow, def: TierDef): boolean {
  if (def.signal_types.includes(signal.signal_type)) return true;
  if (titleMatchesTier(signal.title, def)) return true;
  return false;
}

/** Convert a raw match count (+ fractional split contributions) to an activity score 0–100. */
function rawToScore(raw: number): number {
  // Asymptotic scale: each additional signal is worth less at higher counts
  // Score saturates near 100 around 20+ signals
  return Math.min(100, Math.round((raw / (raw + 8)) * 100));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildValueChain(
  signals: IntelSignalRow[],
  companyCount: number,
  technologyCount: number,
): ValueChainAnalysis {
  // ── 1. Accumulate per-tier match counts ──────────────────────────────────────

  // raw[slug] = fractional accumulator
  const raw = new Map<string, number>();
  // signalLists[slug] = matched signal titles (importance-sorted, capped at 3)
  const signalLists = new Map<string, { title: string; importance: number }[]>();
  // companySets[slug] = set of unique company names
  const companySets = new Map<string, Set<string>>();

  for (const def of TIER_DEFS) {
    raw.set(def.slug, 0);
    signalLists.set(def.slug, []);
    companySets.set(def.slug, new Set<string>());
  }

  for (const signal of signals) {
    // Regulatory: small boost to every tier, then continue (may also match normally)
    if (signal.signal_type === 'regulatory_action') {
      for (const def of TIER_DEFS) {
        raw.set(def.slug, (raw.get(def.slug) ?? 0) + REGULATORY_BOOST_PER_SIGNAL);
      }
      // Do not count regulatory toward key_signals or company density — keep looping
    }

    // Split rules: a partial contribution to specific tiers
    const splitRule = SPLIT_RULES.find(r => r.signal_type === signal.signal_type);
    if (splitRule) {
      const fraction = 1 / splitRule.tiers.length;
      for (const slug of splitRule.tiers) {
        raw.set(slug, (raw.get(slug) ?? 0) + fraction);
        if (signal.company) {
          companySets.get(slug)?.add(signal.company);
        }
        signalLists.get(slug)?.push({ title: signal.title, importance: signal.importance_score });
      }
      continue; // split signal is fully consumed; skip normal matching
    }

    // Normal matching: a signal goes to the FIRST tier it matches (most specific wins)
    for (const def of TIER_DEFS) {
      if (signalMatchesTier(signal, def)) {
        raw.set(def.slug, (raw.get(def.slug) ?? 0) + 1);
        if (signal.company) {
          companySets.get(def.slug)?.add(signal.company);
        }
        signalLists.get(def.slug)?.push({ title: signal.title, importance: signal.importance_score });
        break; // first-match wins
      }
    }
  }

  // ── 2. Build tier objects ────────────────────────────────────────────────────

  // We need scores first to compute gap detection
  const activityScores: number[] = TIER_DEFS.map(def => rawToScore(raw.get(def.slug) ?? 0));

  // Distribute companyCount across tiers proportional to raw match counts
  const totalRaw = TIER_DEFS.reduce((sum, def) => sum + (raw.get(def.slug) ?? 0), 0);

  // technologyCount is used as a small weight boost on R&D and Production tiers
  // (reflects that more technologies imply more R&D and manufacturing activity)
  const techBoostRd = Math.min(20, technologyCount * 2);
  const techBoostProd = Math.min(10, technologyCount);

  const tiers: ValueChainTier[] = TIER_DEFS.map((def, idx) => {
    const rawCount = raw.get(def.slug) ?? 0;

    // Integer signal_count is the floor of raw accumulator (split signals get fractional)
    const signalCount = Math.round(rawCount);

    // activity_score: start from raw score, then blend tech boosts for relevant tiers
    let score = activityScores[idx];
    if (def.slug === 'research_development') {
      score = Math.min(100, score + techBoostRd);
    } else if (def.slug === 'production_manufacturing') {
      score = Math.min(100, score + techBoostProd);
    }
    activityScores[idx] = score; // keep in sync for gap detection

    // company_density: proportional distribution + set-based floor
    const setSize = companySets.get(def.slug)?.size ?? 0;
    const proportional = totalRaw > 0
      ? Math.round((rawCount / totalRaw) * companyCount)
      : 0;
    const companyDensity = Math.max(setSize, proportional);

    // key_signals: top 3 by importance
    const sorted = (signalLists.get(def.slug) ?? [])
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 3)
      .map(e => e.title);

    return {
      name: def.name,
      slug: def.slug,
      activity_score: score,
      company_density: companyDensity,
      signal_count: signalCount,
      key_signals: sorted,
      gap_detected: false, // computed in next pass
    };
  });

  // ── 3. Gap detection ─────────────────────────────────────────────────────────
  // A tier is a gap if BOTH adjacent tiers have activity_score > 30
  // and this tier has activity_score < 15.

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (tier.activity_score >= 15) continue; // already above gap threshold

    const prevScore = i > 0 ? tiers[i - 1].activity_score : 0;
    const nextScore = i < tiers.length - 1 ? tiers[i + 1].activity_score : 0;

    if (prevScore > 30 && nextScore > 30) {
      tier.gap_detected = true;
    }
  }

  // ── 4. Aggregate metrics ─────────────────────────────────────────────────────

  const integrationScore = Math.round(
    tiers.reduce((sum, t) => sum + t.activity_score, 0) / tiers.length
  );

  const bottleneckTiers = tiers
    .filter(t => t.gap_detected)
    .map(t => t.slug);

  const strongest = tiers.reduce((best, t) =>
    t.activity_score > best.activity_score ? t : best
  );

  // Weakest = lowest non-zero activity tier
  const nonZero = tiers.filter(t => t.activity_score > 0);
  const weakest = nonZero.length > 0
    ? nonZero.reduce((worst, t) => t.activity_score < worst.activity_score ? t : worst)
    : null;

  // Suppress "weakest" if it equals "strongest" (all tiers flat / single active)
  const weakestSlug =
    weakest && weakest.slug !== strongest.slug
      ? weakest.slug
      : null;

  return {
    tiers,
    integration_score: integrationScore,
    bottleneck_tiers: bottleneckTiers,
    strongest_tier: strongest.slug,
    weakest_tier: weakestSlug,
  };
}
