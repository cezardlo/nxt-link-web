// src/lib/engines/strategic-frameworks.ts
// Porter's Five Forces + PESTLE analysis — algorithmic scoring from signal data.
// Pure computation, no LLM calls.

import type { IntelSignalRow } from '@/db/queries/intel-signals';

// ─── Porter's Five Forces ─────────────────────────────────────────────────────

export type ForceLevel = 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';

export type PorterForce = {
  name: string;
  score: number; // 0–100
  level: ForceLevel;
  evidence: string[];
  description: string;
};

export type PorterAnalysis = {
  forces: {
    competitive_rivalry: PorterForce;
    threat_of_new_entrants: PorterForce;
    threat_of_substitutes: PorterForce;
    bargaining_power_suppliers: PorterForce;
    bargaining_power_buyers: PorterForce;
  };
  overall_attractiveness: number; // 0–100 (higher = more attractive industry)
  overall_label: string;
  confidence: number; // 0–1
};

function forceLevel(score: number): ForceLevel {
  if (score >= 80) return 'very_high';
  if (score >= 60) return 'high';
  if (score >= 40) return 'moderate';
  if (score >= 20) return 'low';
  return 'very_low';
}

export function scorePorterForces(
  signals: IntelSignalRow[],
  companyCount: number,
  technologyCount: number,
): PorterAnalysis {
  const now = Date.now();
  const day30 = 30 * 24 * 60 * 60 * 1000;

  // Count signals by type
  const typeCounts = new Map<string, number>();
  const recentTypeCounts = new Map<string, number>();
  let totalFunding = 0;

  for (const s of signals) {
    typeCounts.set(s.signal_type, (typeCounts.get(s.signal_type) ?? 0) + 1);
    if (now - new Date(s.discovered_at).getTime() < day30) {
      recentTypeCounts.set(s.signal_type, (recentTypeCounts.get(s.signal_type) ?? 0) + 1);
    }
    if (s.amount_usd) totalFunding += s.amount_usd;
  }

  const funding = typeCounts.get('funding_round') ?? 0;
  const hiring = typeCounts.get('hiring_signal') ?? 0;
  const patents = typeCounts.get('patent_filing') ?? 0;
  const products = typeCounts.get('product_launch') ?? 0;
  const contracts = typeCounts.get('contract_award') ?? 0;
  const ma = typeCounts.get('merger_acquisition') ?? 0;
  const regulatory = typeCounts.get('regulatory_action') ?? 0;
  const facilities = typeCounts.get('facility_expansion') ?? 0;
  const research = typeCounts.get('research_paper') ?? 0;

  // ── 1. Competitive Rivalry ──
  // High when: many companies, lots of M&A, frequent product launches, contract competition
  let rivalryScore = 30; // base
  if (companyCount >= 10) rivalryScore += 20;
  else if (companyCount >= 5) rivalryScore += 10;
  if (ma >= 3) rivalryScore += 15;
  else if (ma >= 1) rivalryScore += 8;
  if (products >= 5) rivalryScore += 15;
  else if (products >= 2) rivalryScore += 8;
  if (contracts >= 5) rivalryScore += 10;
  rivalryScore = Math.min(100, rivalryScore);

  const rivalryEvidence: string[] = [];
  if (companyCount > 0) rivalryEvidence.push(`${companyCount} active companies`);
  if (ma > 0) rivalryEvidence.push(`${ma} M&A signals (consolidation)`);
  if (products > 0) rivalryEvidence.push(`${products} product launches`);
  if (contracts > 0) rivalryEvidence.push(`${contracts} contract awards`);

  // ── 2. Threat of New Entrants ──
  // High when: lots of funding, hiring, low patent barriers
  let entrantsScore = 25;
  if (funding >= 5) entrantsScore += 25;
  else if (funding >= 2) entrantsScore += 15;
  else if (funding >= 1) entrantsScore += 8;
  if (hiring >= 5) entrantsScore += 15;
  else if (hiring >= 2) entrantsScore += 8;
  if (patents < 3) entrantsScore += 10; // low patents = lower barrier
  if (totalFunding > 10_000_000) entrantsScore += 10;
  entrantsScore = Math.min(100, entrantsScore);

  const entrantsEvidence: string[] = [];
  if (funding > 0) entrantsEvidence.push(`${funding} funding rounds attracting new players`);
  if (hiring > 0) entrantsEvidence.push(`${hiring} hiring signals (workforce building)`);
  if (patents > 0) entrantsEvidence.push(`${patents} patents (${patents >= 5 ? 'high barrier' : 'moderate barrier'})`);
  if (totalFunding > 0) entrantsEvidence.push(`$${(totalFunding / 1_000_000).toFixed(1)}M total funding tracked`);

  // ── 3. Threat of Substitutes ──
  // High when: many technologies, diverse signal types, research activity
  let substitutesScore = 20;
  if (technologyCount >= 8) substitutesScore += 20;
  else if (technologyCount >= 4) substitutesScore += 10;
  if (research >= 5) substitutesScore += 20;
  else if (research >= 2) substitutesScore += 10;
  if (typeCounts.size >= 6) substitutesScore += 15; // diverse signal types = multiple approaches
  else if (typeCounts.size >= 4) substitutesScore += 8;
  if (products >= 3) substitutesScore += 10;
  substitutesScore = Math.min(100, substitutesScore);

  const substitutesEvidence: string[] = [];
  if (technologyCount > 0) substitutesEvidence.push(`${technologyCount} competing technologies`);
  if (research > 0) substitutesEvidence.push(`${research} research papers (alternative approaches)`);
  if (typeCounts.size > 0) substitutesEvidence.push(`${typeCounts.size} different signal types`);

  // ── 4. Bargaining Power of Suppliers ──
  // High when: few companies dominate, high consolidation (M&A), facilities concentrated
  let suppliersScore = 30;
  if (companyCount <= 3 && companyCount > 0) suppliersScore += 25; // few suppliers = high power
  else if (companyCount <= 6) suppliersScore += 15;
  if (ma >= 3) suppliersScore += 15; // consolidation increases supplier power
  if (facilities >= 3) suppliersScore += 10;
  if (patents >= 5) suppliersScore += 10; // IP protection
  suppliersScore = Math.min(100, suppliersScore);

  const suppliersEvidence: string[] = [];
  if (companyCount > 0) suppliersEvidence.push(`${companyCount} suppliers (${companyCount <= 3 ? 'concentrated' : companyCount <= 6 ? 'moderate' : 'fragmented'})`);
  if (ma > 0) suppliersEvidence.push(`${ma} consolidation events`);
  if (patents > 0) suppliersEvidence.push(`${patents} patents protecting supply`);

  // ── 5. Bargaining Power of Buyers ──
  // High when: many alternatives, low switching cost (many products), commoditization
  let buyersScore = 25;
  if (products >= 5) buyersScore += 20; // many products = more buyer choice
  else if (products >= 2) buyersScore += 10;
  if (companyCount >= 8) buyersScore += 15; // many vendors = buyer power
  else if (companyCount >= 4) buyersScore += 8;
  if (contracts >= 3) buyersScore += 10; // active procurement = buyer power
  if (regulatory >= 2) buyersScore += 10; // regulation empowers buyers
  buyersScore = Math.min(100, buyersScore);

  const buyersEvidence: string[] = [];
  if (products > 0) buyersEvidence.push(`${products} products available`);
  if (companyCount > 0) buyersEvidence.push(`${companyCount} competing vendors`);
  if (contracts > 0) buyersEvidence.push(`${contracts} active contracts`);
  if (regulatory > 0) buyersEvidence.push(`${regulatory} regulatory actions affecting buyers`);

  // ── Overall Attractiveness ──
  // Lower total force pressure = more attractive industry
  const avgForce = (rivalryScore + entrantsScore + substitutesScore + suppliersScore + buyersScore) / 5;
  const attractiveness = Math.round(100 - avgForce);

  const attractivenessLabel =
    attractiveness >= 70 ? 'Highly attractive' :
    attractiveness >= 50 ? 'Moderately attractive' :
    attractiveness >= 30 ? 'Challenging' :
    'Highly competitive';

  // Confidence based on data richness
  let confidence = 0.3;
  if (signals.length >= 10) confidence += 0.15;
  if (signals.length >= 30) confidence += 0.15;
  if (companyCount >= 3) confidence += 0.1;
  if (typeCounts.size >= 4) confidence += 0.1;
  if (totalFunding > 0) confidence += 0.1;
  confidence = Math.min(0.95, confidence);

  return {
    forces: {
      competitive_rivalry: {
        name: 'Competitive Rivalry',
        score: rivalryScore,
        level: forceLevel(rivalryScore),
        evidence: rivalryEvidence,
        description: rivalryScore >= 60
          ? 'Intense competition with many active players and frequent activity'
          : rivalryScore >= 40
          ? 'Moderate competition with room for differentiation'
          : 'Low competitive pressure — early or niche market',
      },
      threat_of_new_entrants: {
        name: 'Threat of New Entrants',
        score: entrantsScore,
        level: forceLevel(entrantsScore),
        evidence: entrantsEvidence,
        description: entrantsScore >= 60
          ? 'High entry activity — funding and hiring signal new competitors'
          : entrantsScore >= 40
          ? 'Moderate barriers with some new market entry'
          : 'Significant barriers protect incumbents',
      },
      threat_of_substitutes: {
        name: 'Threat of Substitutes',
        score: substitutesScore,
        level: forceLevel(substitutesScore),
        evidence: substitutesEvidence,
        description: substitutesScore >= 60
          ? 'Multiple alternative technologies and approaches exist'
          : substitutesScore >= 40
          ? 'Some substitutes available but not dominant'
          : 'Few viable alternatives — strong lock-in',
      },
      bargaining_power_suppliers: {
        name: 'Supplier Power',
        score: suppliersScore,
        level: forceLevel(suppliersScore),
        evidence: suppliersEvidence,
        description: suppliersScore >= 60
          ? 'Concentrated supply chain with few dominant players'
          : suppliersScore >= 40
          ? 'Moderate supplier concentration'
          : 'Fragmented supply — buyers have options',
      },
      bargaining_power_buyers: {
        name: 'Buyer Power',
        score: buyersScore,
        level: forceLevel(buyersScore),
        evidence: buyersEvidence,
        description: buyersScore >= 60
          ? 'Buyers have strong leverage with many alternatives'
          : buyersScore >= 40
          ? 'Balanced buyer-seller dynamics'
          : 'Sellers have pricing power — limited buyer alternatives',
      },
    },
    overall_attractiveness: attractiveness,
    overall_label: attractivenessLabel,
    confidence: Math.round(confidence * 100) / 100,
  };
}

// ─── PESTLE Analysis ──────────────────────────────────────────────────────────

export type PestleCategory = 'political' | 'economic' | 'social' | 'technological' | 'legal' | 'environmental';

export type PestleFactor = {
  category: PestleCategory;
  label: string;
  score: number; // 0–100 (impact intensity)
  sentiment: 'positive' | 'neutral' | 'negative';
  evidence: string[];
  description: string;
};

export type PestleAnalysis = {
  factors: PestleFactor[];
  dominant_factor: PestleCategory;
  overall_environment: 'favorable' | 'mixed' | 'challenging';
  confidence: number;
};

export function scorePestle(
  signals: IntelSignalRow[],
  companyCount: number,
): PestleAnalysis {
  const typeCounts = new Map<string, number>();
  let totalFunding = 0;

  for (const s of signals) {
    typeCounts.set(s.signal_type, (typeCounts.get(s.signal_type) ?? 0) + 1);
    if (s.amount_usd) totalFunding += s.amount_usd;
  }

  const funding = typeCounts.get('funding_round') ?? 0;
  const hiring = typeCounts.get('hiring_signal') ?? 0;
  const patents = typeCounts.get('patent_filing') ?? 0;
  const products = typeCounts.get('product_launch') ?? 0;
  const contracts = typeCounts.get('contract_award') ?? 0;
  const ma = typeCounts.get('merger_acquisition') ?? 0;
  const regulatory = typeCounts.get('regulatory_action') ?? 0;
  const facilities = typeCounts.get('facility_expansion') ?? 0;
  const research = typeCounts.get('research_paper') ?? 0;
  const caseStudies = typeCounts.get('case_study') ?? 0;

  const factors: PestleFactor[] = [];

  // ── Political ──
  const politicalScore = Math.min(100, 20 + regulatory * 15 + contracts * 8);
  const politicalSentiment: PestleFactor['sentiment'] =
    contracts >= 3 ? 'positive' : regulatory >= 3 ? 'negative' : 'neutral';
  const politicalEvidence: string[] = [];
  if (regulatory > 0) politicalEvidence.push(`${regulatory} regulatory actions`);
  if (contracts > 0) politicalEvidence.push(`${contracts} government contracts`);

  factors.push({
    category: 'political',
    label: 'Political',
    score: politicalScore,
    sentiment: politicalSentiment,
    evidence: politicalEvidence,
    description: contracts >= 3
      ? 'Strong government support through contracts and procurement'
      : regulatory >= 3
      ? 'Heavy regulatory pressure — compliance costs rising'
      : 'Moderate political influence on the industry',
  });

  // ── Economic ──
  const economicScore = Math.min(100, 15 + funding * 10 + ma * 12 + (totalFunding > 0 ? 20 : 0));
  const economicSentiment: PestleFactor['sentiment'] =
    funding >= 3 && totalFunding > 5_000_000 ? 'positive' : ma >= 3 ? 'negative' : 'neutral';
  const economicEvidence: string[] = [];
  if (funding > 0) economicEvidence.push(`${funding} funding rounds`);
  if (totalFunding > 0) economicEvidence.push(`$${(totalFunding / 1_000_000).toFixed(1)}M tracked investment`);
  if (ma > 0) economicEvidence.push(`${ma} M&A events`);

  factors.push({
    category: 'economic',
    label: 'Economic',
    score: economicScore,
    sentiment: economicSentiment,
    evidence: economicEvidence,
    description: funding >= 3
      ? 'Strong capital flows and investment activity'
      : ma >= 2
      ? 'Market consolidation signals — economic pressure'
      : 'Stable economic conditions with moderate investment',
  });

  // ── Social ──
  const socialScore = Math.min(100, 15 + hiring * 10 + products * 8 + caseStudies * 12);
  const socialSentiment: PestleFactor['sentiment'] =
    hiring >= 3 && products >= 2 ? 'positive' : 'neutral';
  const socialEvidence: string[] = [];
  if (hiring > 0) socialEvidence.push(`${hiring} hiring signals (workforce growth)`);
  if (products > 0) socialEvidence.push(`${products} product launches (adoption)`);
  if (caseStudies > 0) socialEvidence.push(`${caseStudies} case studies (proven value)`);

  factors.push({
    category: 'social',
    label: 'Social',
    score: socialScore,
    sentiment: socialSentiment,
    evidence: socialEvidence,
    description: hiring >= 3
      ? 'Growing workforce demand and product adoption'
      : products >= 2
      ? 'Active product adoption signals'
      : 'Limited social impact signals detected',
  });

  // ── Technological ──
  const techScore = Math.min(100, 20 + patents * 10 + research * 8 + products * 6 + facilities * 10);
  const techSentiment: PestleFactor['sentiment'] =
    patents >= 3 || research >= 3 ? 'positive' : 'neutral';
  const techEvidence: string[] = [];
  if (patents > 0) techEvidence.push(`${patents} patent filings (innovation)`);
  if (research > 0) techEvidence.push(`${research} research papers`);
  if (products > 0) techEvidence.push(`${products} product launches`);
  if (facilities > 0) techEvidence.push(`${facilities} facility expansions`);

  factors.push({
    category: 'technological',
    label: 'Technological',
    score: techScore,
    sentiment: techSentiment,
    evidence: techEvidence,
    description: patents >= 5
      ? 'Rapid technological innovation — patents and research driving change'
      : patents >= 2 || research >= 2
      ? 'Active R&D with emerging technological advances'
      : 'Technology is stable or nascent',
  });

  // ── Legal ──
  const legalScore = Math.min(100, 10 + regulatory * 15 + patents * 5);
  const legalSentiment: PestleFactor['sentiment'] =
    regulatory >= 3 ? 'negative' : patents >= 5 ? 'neutral' : 'positive';
  const legalEvidence: string[] = [];
  if (regulatory > 0) legalEvidence.push(`${regulatory} regulatory changes`);
  if (patents > 0) legalEvidence.push(`${patents} IP filings (legal complexity)`);

  factors.push({
    category: 'legal',
    label: 'Legal',
    score: legalScore,
    sentiment: legalSentiment,
    evidence: legalEvidence,
    description: regulatory >= 3
      ? 'Significant legal and regulatory constraints'
      : regulatory >= 1
      ? 'Some regulatory activity — monitoring required'
      : 'Light regulatory environment',
  });

  // ── Environmental ──
  // Inferred from facility expansions, regulatory actions, and industry type
  const envScore = Math.min(100, 10 + facilities * 12 + regulatory * 8);
  const envSentiment: PestleFactor['sentiment'] =
    facilities >= 3 ? 'negative' : 'neutral';
  const envEvidence: string[] = [];
  if (facilities > 0) envEvidence.push(`${facilities} facility expansions (physical footprint)`);
  if (regulatory > 0) envEvidence.push(`${regulatory} regulatory actions (may include environmental)`);

  factors.push({
    category: 'environmental',
    label: 'Environmental',
    score: envScore,
    sentiment: envSentiment,
    evidence: envEvidence,
    description: facilities >= 3
      ? 'Significant physical expansion — environmental impact likely'
      : 'Low environmental footprint signals',
  });

  // Sort by score descending
  factors.sort((a, b) => b.score - a.score);
  const dominant = factors[0].category;

  // Overall environment
  const positiveCount = factors.filter(f => f.sentiment === 'positive').length;
  const negativeCount = factors.filter(f => f.sentiment === 'negative').length;
  const overall: PestleAnalysis['overall_environment'] =
    positiveCount >= 3 ? 'favorable' : negativeCount >= 3 ? 'challenging' : 'mixed';

  // Confidence
  let confidence = 0.3;
  if (signals.length >= 10) confidence += 0.15;
  if (signals.length >= 30) confidence += 0.15;
  if (typeCounts.size >= 4) confidence += 0.1;
  if (companyCount >= 3) confidence += 0.1;
  confidence = Math.min(0.9, confidence);

  return {
    factors,
    dominant_factor: dominant,
    overall_environment: overall,
    confidence: Math.round(confidence * 100) / 100,
  };
}
