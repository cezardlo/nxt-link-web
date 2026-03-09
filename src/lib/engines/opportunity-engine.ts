// src/lib/engines/opportunity-engine.ts
// Opportunity Engine — discovers actionable opportunities from signal data.
//
// Combines: intel signals, adoption profiles, Porter's Five Forces, and
// cross-industry convergence analysis to surface the top 20 opportunities.
//
// Opportunity types:
//   underserved_market      — low company count + high signal activity
//   early_mover             — innovator/early_adopter stage + accelerating momentum
//   funding_surge           — unusual concentration of funding_round signals
//   patent_gap              — many patents filed, few companies (uncommercialized)
//   convergence_play        — two industries sharing companies/technologies
//   policy_tailwind         — regulatory actions creating positive demand signals
//   supply_chain_gap        — high demand signals, few known suppliers
//   talent_arbitrage        — hiring signals outpacing company count
//   geographic_white_space  — innovation signals referencing non-local locations
//
// Pure computation — no LLM calls, no external fetches beyond DB queries.

import { getIntelSignals } from '@/db/queries/intel-signals';
import type { IntelSignalRow } from '@/db/queries/intel-signals';
import { getEntitiesByType } from '@/db/queries/knowledge-graph';
import { getAdoptionProfile } from '@/lib/agents/scoring/adoption-curve';
import { scorePorterForces } from '@/lib/engines/strategic-frameworks';

// ─── Types ────────────────────────────────────────────────────────────────────

export type OpportunityType =
  | 'underserved_market'
  | 'early_mover'
  | 'funding_surge'
  | 'patent_gap'
  | 'convergence_play'
  | 'policy_tailwind'
  | 'supply_chain_gap'
  | 'talent_arbitrage'
  | 'geographic_white_space';

export type OpportunityTiming = 'immediate' | 'short_term' | 'medium_term' | 'long_term';
export type OpportunityRisk = 'low' | 'medium' | 'high';

export type DiscoveredOpportunity = {
  id: string;
  type: OpportunityType;
  title: string;
  description: string;
  score: number; // 0–100
  industries: string[];
  evidence: string[];
  timing: OpportunityTiming;
  risk_level: OpportunityRisk;
};

export type OpportunityReport = {
  generated_at: string;
  opportunities: DiscoveredOpportunity[];
  industry_coverage: number;
  total_signals_analyzed: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function makeId(type: OpportunityType, industries: string[]): string {
  return `${type}__${industries.map(slugify).join('_')}`;
}

/** Signals from the last N days. */
function recentSignals(signals: IntelSignalRow[], days: number): IntelSignalRow[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return signals.filter(s => new Date(s.discovered_at).getTime() >= cutoff);
}

/** Distinct company names (non-null) in a set of signals. */
function distinctCompanies(signals: IntelSignalRow[]): Set<string> {
  const set = new Set<string>();
  for (const s of signals) {
    if (s.company) set.add(s.company);
  }
  return set;
}

// ─── Per-industry detectors ───────────────────────────────────────────────────

/** Underserved market: few companies but many signals — gap between activity and players. */
function detectUnderserved(
  industry: string,
  signals: IntelSignalRow[],
): DiscoveredOpportunity | null {
  const companies = distinctCompanies(signals);
  const recent30 = recentSignals(signals, 30);

  // Need meaningful signal activity but sparse company presence
  if (recent30.length < 3) return null;
  if (companies.size >= 8) return null;

  // Score based on signal-to-company ratio
  const ratio = recent30.length / Math.max(1, companies.size);
  if (ratio < 2) return null;

  const baseScore = Math.min(100, 30 + Math.round(ratio * 8) + (companies.size === 0 ? 20 : 0));

  const evidence: string[] = [
    `${recent30.length} signals in last 30 days`,
    `Only ${companies.size} named companies detected`,
    `Signal-to-company ratio: ${ratio.toFixed(1)}x`,
  ];
  if (companies.size === 0) evidence.push('No established players identified — pure white space');

  const timing: OpportunityTiming = baseScore >= 70 ? 'immediate' : 'short_term';
  const risk: OpportunityRisk = companies.size === 0 ? 'high' : 'medium';

  return {
    id: makeId('underserved_market', [industry]),
    type: 'underserved_market',
    title: `Underserved market in ${industry}`,
    description: `High signal activity in ${industry} but few companies — demand exists without supply.`,
    score: baseScore,
    industries: [industry],
    evidence,
    timing,
    risk_level: risk,
  };
}

/** Early mover: innovator or early_adopter stage with accelerating momentum. */
function detectEarlyMover(
  industry: string,
  signals: IntelSignalRow[],
): DiscoveredOpportunity | null {
  const adoption = getAdoptionProfile(slugify(industry), signals);

  if (adoption.stage !== 'innovators' && adoption.stage !== 'early_adopters') return null;
  if (adoption.momentum === 'decelerating') return null;

  let score = 40;
  if (adoption.momentum === 'accelerating') score += 30;
  if (adoption.stage === 'innovators') score += 15; // earlier = more upside
  if (adoption.confidence >= 0.6) score += 10;
  score = Math.min(100, score);

  const evidence: string[] = [
    `Adoption stage: ${adoption.stage_label}`,
    `Momentum: ${adoption.momentum}`,
    `${signals.length} total signals tracked`,
  ];
  if (adoption.confidence < 0.5) evidence.push('Low confidence — limited signal history');

  const timing: OpportunityTiming =
    adoption.momentum === 'accelerating' ? 'immediate' : 'short_term';
  const risk: OpportunityRisk = adoption.stage === 'innovators' ? 'high' : 'medium';

  return {
    id: makeId('early_mover', [industry]),
    type: 'early_mover',
    title: `Early mover advantage in ${industry}`,
    description: `${industry} is at the ${adoption.stage_label} stage with ${adoption.momentum} momentum — the window to lead is open.`,
    score,
    industries: [industry],
    evidence,
    timing,
    risk_level: risk,
  };
}

/** Funding surge: cluster of funding_round signals in a short window. */
function detectFundingSurge(
  industry: string,
  signals: IntelSignalRow[],
): DiscoveredOpportunity | null {
  const funding = signals.filter(s => s.signal_type === 'funding_round');
  if (funding.length < 3) return null;

  const recent14 = funding.filter(
    s => Date.now() - new Date(s.discovered_at).getTime() < 14 * 24 * 60 * 60 * 1000,
  );

  // Only flag if a meaningful share is recent, or total is large
  if (funding.length < 5 && recent14.length < 2) return null;

  const totalUsd = funding.reduce((sum, s) => sum + (s.amount_usd ?? 0), 0);

  let score = 30 + Math.min(40, funding.length * 6);
  if (recent14.length >= 3) score += 15;
  if (totalUsd >= 50_000_000) score += 15;
  else if (totalUsd >= 10_000_000) score += 8;
  score = Math.min(100, score);

  const evidence: string[] = [
    `${funding.length} funding rounds detected`,
    `${recent14.length} funding rounds in the last 14 days`,
  ];
  if (totalUsd > 0) {
    evidence.push(`$${(totalUsd / 1_000_000).toFixed(1)}M total tracked capital`);
  }
  const companies = distinctCompanies(funding);
  if (companies.size > 0) {
    evidence.push(`Funded companies: ${Array.from(companies).slice(0, 4).join(', ')}`);
  }

  return {
    id: makeId('funding_surge', [industry]),
    type: 'funding_surge',
    title: `Funding surge in ${industry}`,
    description: `${funding.length} funding rounds tracked in ${industry} — capital is concentrating here.`,
    score,
    industries: [industry],
    evidence,
    timing: recent14.length >= 2 ? 'immediate' : 'short_term',
    risk_level: 'medium',
  };
}

/** Patent gap: many patents but few companies — innovation not yet commercialized. */
function detectPatentGap(
  industry: string,
  signals: IntelSignalRow[],
): DiscoveredOpportunity | null {
  const patents = signals.filter(s => s.signal_type === 'patent_filing');
  const companies = distinctCompanies(signals);
  const products = signals.filter(s => s.signal_type === 'product_launch');

  if (patents.length < 4) return null;
  // Patent gap only meaningful when companies are sparse and commercialization low
  if (companies.size >= 10) return null;
  if (products.length >= patents.length * 0.5) return null; // already commercializing

  const ratio = patents.length / Math.max(1, companies.size);
  let score = 30 + Math.min(50, Math.round(ratio * 10));
  if (products.length === 0) score += 15; // nothing to market yet
  score = Math.min(100, score);

  const evidence: string[] = [
    `${patents.length} patent filings detected`,
    `${companies.size} companies actively tracked`,
    `${products.length} product launches so far`,
    `Patent-to-company ratio: ${ratio.toFixed(1)}x`,
  ];

  return {
    id: makeId('patent_gap', [industry]),
    type: 'patent_gap',
    title: `Patent gap in ${industry}`,
    description: `Heavy patent activity in ${industry} with few commercial products — first movers to commercialize have an edge.`,
    score,
    industries: [industry],
    evidence,
    timing: 'medium_term',
    risk_level: 'medium',
  };
}

/** Policy tailwind: regulatory actions with positive contract/procurement context. */
function detectPolicyTailwind(
  industry: string,
  signals: IntelSignalRow[],
): DiscoveredOpportunity | null {
  const regulatory = signals.filter(s => s.signal_type === 'regulatory_action');
  const contracts = signals.filter(s => s.signal_type === 'contract_award');

  // Need either regulatory actions alongside contracts, or strong contract volume
  if (regulatory.length < 1 && contracts.length < 3) return null;
  if (regulatory.length === 0) return null;

  // Score rises when regulation is paired with active procurement
  let score = 25 + regulatory.length * 10 + contracts.length * 8;
  score = Math.min(100, score);

  const evidence: string[] = [
    `${regulatory.length} regulatory actions detected`,
    `${contracts.length} contract awards following`,
  ];
  if (contracts.length > regulatory.length) {
    evidence.push('Contract volume exceeds regulatory signals — government demand confirmed');
  }
  const totalContractUsd = contracts.reduce((sum, s) => sum + (s.amount_usd ?? 0), 0);
  if (totalContractUsd > 0) {
    evidence.push(`$${(totalContractUsd / 1_000_000).toFixed(1)}M in tracked contracts`);
  }

  return {
    id: makeId('policy_tailwind', [industry]),
    type: 'policy_tailwind',
    title: `Policy tailwind in ${industry}`,
    description: `Regulatory and procurement signals in ${industry} are creating government-driven demand.`,
    score,
    industries: [industry],
    evidence,
    timing: contracts.length >= 3 ? 'immediate' : 'short_term',
    risk_level: 'low',
  };
}

/** Supply chain gap: high demand/contract signals but very few supplier companies. */
function detectSupplyChainGap(
  industry: string,
  signals: IntelSignalRow[],
): DiscoveredOpportunity | null {
  const demandSignals = signals.filter(
    s => s.signal_type === 'contract_award' || s.signal_type === 'facility_expansion',
  );
  const companies = distinctCompanies(signals);

  if (demandSignals.length < 3) return null;
  if (companies.size >= 8) return null; // enough suppliers present

  const ratio = demandSignals.length / Math.max(1, companies.size);
  if (ratio < 1.5) return null;

  let score = 25 + Math.min(50, Math.round(ratio * 12));
  if (companies.size <= 2) score += 15;
  score = Math.min(100, score);

  const evidence: string[] = [
    `${demandSignals.length} demand signals (contracts + expansions)`,
    `${companies.size} known suppliers`,
    `Demand-to-supplier ratio: ${ratio.toFixed(1)}x`,
  ];

  return {
    id: makeId('supply_chain_gap', [industry]),
    type: 'supply_chain_gap',
    title: `Supply chain gap in ${industry}`,
    description: `${industry} shows strong demand signals but lacks sufficient suppliers — new entrants can capture unmet demand.`,
    score,
    industries: [industry],
    evidence,
    timing: 'short_term',
    risk_level: 'medium',
  };
}

/** Talent arbitrage: hiring signals greatly outpace known company count. */
function detectTalentArbitrage(
  industry: string,
  signals: IntelSignalRow[],
): DiscoveredOpportunity | null {
  const hiring = signals.filter(s => s.signal_type === 'hiring_signal');
  const companies = distinctCompanies(signals);

  if (hiring.length < 3) return null;

  const ratio = hiring.length / Math.max(1, companies.size);
  if (ratio < 2) return null;

  let score = 20 + Math.min(55, Math.round(ratio * 10));
  const recent30Hiring = recentSignals(hiring, 30);
  if (recent30Hiring.length >= 3) score += 15;
  score = Math.min(100, score);

  const evidence: string[] = [
    `${hiring.length} hiring signals detected`,
    `${companies.size} known companies`,
    `Hiring-to-company ratio: ${ratio.toFixed(1)}x`,
    `${recent30Hiring.length} hiring signals in the last 30 days`,
  ];

  return {
    id: makeId('talent_arbitrage', [industry]),
    type: 'talent_arbitrage',
    title: `Talent arbitrage in ${industry}`,
    description: `${industry} is hiring faster than companies are forming — talent demand is outrunning supply.`,
    score,
    industries: [industry],
    evidence,
    timing: 'short_term',
    risk_level: 'low',
  };
}

// ─── Cross-industry detectors ─────────────────────────────────────────────────

/** Convergence play: two industries share companies or signal type patterns. */
function detectConvergencePlays(
  industrySignals: Map<string, IntelSignalRow[]>,
): DiscoveredOpportunity[] {
  const opportunities: DiscoveredOpportunity[] = [];
  const industries = Array.from(industrySignals.keys() as Iterable<string>);

  for (let i = 0; i < industries.length; i++) {
    for (let j = i + 1; j < industries.length; j++) {
      const a = industries[i];
      const b = industries[j];
      const sigA = industrySignals.get(a) ?? [];
      const sigB = industrySignals.get(b) ?? [];

      const companiesA = distinctCompanies(sigA);
      const companiesB = distinctCompanies(sigB);
      const sharedCompanies = Array.from(companiesA as Iterable<string>).filter(c =>
        companiesB.has(c),
      );

      const typesA = new Set(sigA.map(s => s.signal_type));
      const typesB = new Set(sigB.map(s => s.signal_type));
      const sharedTypes = Array.from(typesA as Iterable<string>).filter(t => typesB.has(t));

      // Convergence requires shared companies OR very high signal-type overlap
      if (sharedCompanies.length === 0 && sharedTypes.length < 4) continue;

      const companyOverlap =
        sharedCompanies.length / Math.max(1, Math.min(companiesA.size, companiesB.size));
      const typeOverlap =
        sharedTypes.length / Math.max(1, Math.min(typesA.size, typesB.size));
      const rawScore = companyOverlap * 60 + typeOverlap * 40;

      if (rawScore < 15) continue;

      const score = Math.min(100, Math.round(rawScore));

      const evidence: string[] = [
        `${sharedCompanies.length} companies active in both industries`,
        `${sharedTypes.length} shared signal patterns: ${sharedTypes.join(', ')}`,
      ];
      if (sharedCompanies.length > 0) {
        evidence.push(`Shared companies: ${sharedCompanies.slice(0, 3).join(', ')}`);
      }

      const timing: OpportunityTiming = score >= 60 ? 'short_term' : 'medium_term';

      opportunities.push({
        id: makeId('convergence_play', [a, b]),
        type: 'convergence_play',
        title: `${a} + ${b} convergence`,
        description: `${a} and ${b} are converging through shared companies and activity patterns — a hybrid product or service could serve both markets.`,
        score,
        industries: [a, b],
        evidence,
        timing,
        risk_level: 'medium',
      });
    }
  }

  // Deduplicate by id and sort descending
  const seen = new Set<string>();
  return opportunities
    .filter(o => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6); // cap convergence plays at 6
}

/** Geographic white space: signal titles reference non-El Paso locations. */
function detectGeographicWhiteSpaces(
  industrySignals: Map<string, IntelSignalRow[]>,
): DiscoveredOpportunity[] {
  const opportunities: DiscoveredOpportunity[] = [];

  // Location keywords that suggest activity elsewhere
  const REMOTE_LOCATION_PATTERNS = [
    /\b(silicon valley|san francisco|bay area|new york|nyc|austin|dallas|houston|seattle|boston|denver|chicago|atlanta|miami|los angeles|LA)\b/i,
    /\b(california|texas|new york state|washington state|massachusetts|florida|colorado|georgia)\b/i,
    /\b(israel|germany|china|india|uk|united kingdom|canada|australia|japan|south korea|taiwan)\b/i,
  ];

  for (const [industry, signals] of Array.from(
    industrySignals.entries() as Iterable<[string, IntelSignalRow[]]>,
  )) {
    if (signals.length < 3) continue;

    const remoteSignals = signals.filter(s => {
      const text = `${s.title} ${s.evidence ?? ''}`.toLowerCase();
      return REMOTE_LOCATION_PATTERNS.some(p => p.test(text));
    });

    if (remoteSignals.length < 2) continue;

    const remoteRatio = remoteSignals.length / signals.length;
    if (remoteRatio < 0.2) continue; // only flag if a meaningful share is remote

    // Extract mentioned locations for evidence
    const locationMatches = new Set<string>();
    for (const s of remoteSignals) {
      const text = `${s.title} ${s.evidence ?? ''}`;
      for (const pattern of REMOTE_LOCATION_PATTERNS) {
        const match = pattern.exec(text);
        if (match) locationMatches.add(match[1]);
      }
    }

    const score = Math.min(100, 25 + Math.round(remoteRatio * 80) + (remoteSignals.length >= 5 ? 15 : 0));

    opportunities.push({
      id: makeId('geographic_white_space', [industry]),
      type: 'geographic_white_space',
      title: `${industry} white space — innovation is elsewhere`,
      description: `${industry} innovation is concentrated outside El Paso. Bringing these capabilities locally could capture an underserved regional market.`,
      score,
      industries: [industry],
      evidence: [
        `${remoteSignals.length} of ${signals.length} signals reference non-local locations`,
        `Locations mentioned: ${Array.from(locationMatches as Iterable<string>).slice(0, 5).join(', ')}`,
        `${Math.round(remoteRatio * 100)}% of signals are remote-location signals`,
      ],
      timing: 'medium_term',
      risk_level: 'high',
    });
  }

  return opportunities;
}

// ─── Porter attractiveness filter ─────────────────────────────────────────────

/**
 * Boost or dampen an opportunity score based on industry attractiveness.
 * More attractive industries (lower Porter pressure) deserve higher final scores.
 */
function applyPorterBoost(
  score: number,
  signals: IntelSignalRow[],
  companyCount: number,
  techCount: number,
): number {
  const porter = scorePorterForces(signals, companyCount, techCount);
  // overall_attractiveness is 0–100 (higher = less competitive = better)
  const boost = Math.round((porter.overall_attractiveness - 50) / 10); // –5 to +5
  return Math.max(0, Math.min(100, score + boost));
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Run the opportunity engine.
 * Returns the top 20 opportunities discovered across all tracked industries.
 */
export async function runOpportunityEngine(): Promise<OpportunityReport> {
  const signals = await getIntelSignals({ limit: 500 });

  // Group signals by industry
  const industrySignals = new Map<string, IntelSignalRow[]>();
  for (const s of signals) {
    const existing = industrySignals.get(s.industry) ?? [];
    existing.push(s);
    industrySignals.set(s.industry, existing);
  }

  // Count known entities from the knowledge graph (for tech count estimates)
  const entityTechCounts = new Map<string, number>();
  try {
    const techEntities = await getEntitiesByType('technology');
    // Group technologies by the industry slug found in their metadata
    for (const entity of techEntities) {
      const meta = entity.metadata as Record<string, unknown>;
      const ind = typeof meta?.industry === 'string' ? meta.industry : null;
      if (ind) {
        entityTechCounts.set(ind, (entityTechCounts.get(ind) ?? 0) + 1);
      }
    }
  } catch {
    // Graph may not be populated — continue without tech counts
  }

  const allOpportunities: DiscoveredOpportunity[] = [];
  let industriesAnalyzed = 0;

  // Per-industry analysis
  for (const [industry, indSignals] of Array.from(
    industrySignals.entries() as Iterable<[string, IntelSignalRow[]]>,
  )) {
    if (indSignals.length < 3) continue;
    industriesAnalyzed++;

    const companyCount = distinctCompanies(indSignals).size;
    const techCount = entityTechCounts.get(industry) ?? 0;

    const candidates: Array<DiscoveredOpportunity | null> = [
      detectUnderserved(industry, indSignals),
      detectEarlyMover(industry, indSignals),
      detectFundingSurge(industry, indSignals),
      detectPatentGap(industry, indSignals),
      detectPolicyTailwind(industry, indSignals),
      detectSupplyChainGap(industry, indSignals),
      detectTalentArbitrage(industry, indSignals),
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      // Apply Porter's attractiveness as a score modifier
      const adjustedScore = applyPorterBoost(
        candidate.score,
        indSignals,
        companyCount,
        techCount,
      );
      allOpportunities.push({ ...candidate, score: adjustedScore });
    }
  }

  // Cross-industry analysis
  const convergences = detectConvergencePlays(industrySignals);
  allOpportunities.push(...convergences);

  const geoWhiteSpaces = detectGeographicWhiteSpaces(industrySignals);
  allOpportunities.push(...geoWhiteSpaces);

  // Deduplicate by id (same opportunity found from multiple paths)
  const deduped = new Map<string, DiscoveredOpportunity>();
  for (const opp of allOpportunities) {
    const existing = deduped.get(opp.id);
    // Keep the higher-scored version if duplicate
    if (!existing || opp.score > existing.score) {
      deduped.set(opp.id, opp);
    }
  }

  // Sort by score descending, take top 20
  const top20 = Array.from(deduped.values() as Iterable<DiscoveredOpportunity>)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return {
    generated_at: new Date().toISOString(),
    opportunities: top20,
    industry_coverage: industriesAnalyzed,
    total_signals_analyzed: signals.length,
  };
}
