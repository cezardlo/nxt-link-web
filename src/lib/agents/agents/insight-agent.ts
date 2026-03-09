// src/lib/agents/agents/insight-agent.ts
// Insight Agent — transforms raw signals into structured intelligence.
// Produces patterns, clusters, implications, and opportunities.
// Pure algorithmic (no LLM, no API costs). Runs ~50ms.

import { getIntelSignals, type IntelSignalRow } from '@/db/queries/intel-signals';
import { isSupabaseConfigured } from '@/db/client';
import { INDUSTRIES, TECHNOLOGY_CATALOG } from '@/lib/data/technology-catalog';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type InsightType = 'pattern' | 'cluster' | 'implication' | 'opportunity';

export type Insight = {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  confidence: number;                // 0-100
  industries: string[];
  companies: string[];
  signal_types: string[];
  signal_count: number;
  momentum: 'accelerating' | 'steady' | 'emerging' | 'cooling';
  color: string;                     // accent color for UI
  generated_at: string;
};

export type InsightAgentResult = {
  insights: Insight[];
  patterns: Insight[];
  clusters: Insight[];
  implications: Insight[];
  opportunities: Insight[];
  signals_analyzed: number;
  duration_ms: number;
};

// ─── Industry Display Names ─────────────────────────────────────────────────────

const INDUSTRY_LABELS: Record<string, string> = {
  'health_biotech': 'Healthcare & Biotech',
  'manufacturing': 'Manufacturing',
  'aerospace_defense': 'Defense & Aerospace',
  'agriculture': 'Agriculture',
  'construction': 'Construction',
  'energy': 'Energy',
  'fintech': 'Fintech',
  'cybersecurity': 'Cybersecurity',
  'ai_ml': 'AI/ML',
  'supply_chain': 'Supply Chain',
  'general': 'General',
};

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  patent_filing: 'patents',
  research_paper: 'research',
  funding_round: 'funding',
  merger_acquisition: 'M&A',
  contract_award: 'contracts',
  product_launch: 'product launches',
  hiring_signal: 'hiring',
  regulatory_action: 'regulatory changes',
  facility_expansion: 'facility expansions',
  case_study: 'case studies',
};

// ─── Momentum Colors ────────────────────────────────────────────────────────────

const MOMENTUM_COLORS: Record<string, string> = {
  accelerating: '#00ff88',
  emerging: '#f97316',
  steady: '#00d4ff',
  cooling: '#6b7280',
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function uniqueStrings(arr: (string | null | undefined)[]): string[] {
  return Array.from(new Set(arr.filter((s): s is string => !!s)));
}

function computeMomentum(signals: IntelSignalRow[]): 'accelerating' | 'steady' | 'emerging' | 'cooling' {
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;

  const recent = signals.filter(s => now - new Date(s.discovered_at).getTime() < sevenDays).length;
  const older = signals.filter(s => {
    const age = now - new Date(s.discovered_at).getTime();
    return age >= sevenDays && age < fourteenDays;
  }).length;

  if (signals.length < 3) return 'emerging';
  if (recent > older * 1.5) return 'accelerating';
  if (recent < older * 0.5) return 'cooling';
  return 'steady';
}

function formatSignalTypes(types: string[]): string {
  return types
    .map(t => SIGNAL_TYPE_LABELS[t] ?? t)
    .slice(0, 3)
    .join(', ');
}

// ─── Pattern Detection ──────────────────────────────────────────────────────────
// Patterns = same industry + multiple signal types converging

function detectPatterns(signals: IntelSignalRow[]): Insight[] {
  const byIndustry = new Map<string, IntelSignalRow[]>();
  for (const s of signals) {
    const existing = byIndustry.get(s.industry);
    if (existing) existing.push(s);
    else byIndustry.set(s.industry, [s]);
  }

  const patterns: Insight[] = [];

  for (const [industry, group] of Array.from(byIndustry.entries() as Iterable<[string, IntelSignalRow[]]>)) {
    if (group.length < 4) continue;

    const types = uniqueStrings(group.map(s => s.signal_type));
    if (types.length < 2) continue; // need signal diversity

    const companies = uniqueStrings(group.map(s => s.company)).slice(0, 5);
    const momentum = computeMomentum(group);
    const label = INDUSTRY_LABELS[industry] ?? industry;

    // Confidence based on signal diversity + volume
    const confidence = Math.min(100, Math.round(
      (types.length / 5) * 40 + (Math.log2(group.length) / 4) * 30 + (companies.length / 5) * 30
    ));

    patterns.push({
      id: `pattern-${slugify(industry)}`,
      type: 'pattern',
      title: `${label} activity intensifying`,
      description: `${group.length} signals detected across ${formatSignalTypes(types)}. ${companies.length > 0 ? `Key players: ${companies.slice(0, 3).join(', ')}.` : ''}`,
      confidence,
      industries: [industry],
      companies,
      signal_types: types,
      signal_count: group.length,
      momentum,
      color: MOMENTUM_COLORS[momentum],
      generated_at: new Date().toISOString(),
    });
  }

  return patterns.sort((a, b) => b.confidence - a.confidence).slice(0, 6);
}

// ─── Cluster Detection ──────────────────────────────────────────────────────────
// Clusters = same signal type across multiple industries

function detectClusters(signals: IntelSignalRow[]): Insight[] {
  const byType = new Map<string, IntelSignalRow[]>();
  for (const s of signals) {
    const existing = byType.get(s.signal_type);
    if (existing) existing.push(s);
    else byType.set(s.signal_type, [s]);
  }

  const clusters: Insight[] = [];

  for (const [signalType, group] of Array.from(byType.entries() as Iterable<[string, IntelSignalRow[]]>)) {
    if (group.length < 3) continue;

    const industries = uniqueStrings(group.map(s => s.industry));
    if (industries.length < 2) continue; // need cross-industry spread

    const companies = uniqueStrings(group.map(s => s.company)).slice(0, 5);
    const momentum = computeMomentum(group);
    const typeLabel = SIGNAL_TYPE_LABELS[signalType] ?? signalType;
    const industryLabels = industries.map(i => INDUSTRY_LABELS[i] ?? i).slice(0, 3);

    const confidence = Math.min(100, Math.round(
      (industries.length / 4) * 40 + (Math.log2(group.length) / 4) * 30 + 30
    ));

    clusters.push({
      id: `cluster-${slugify(signalType)}`,
      type: 'cluster',
      title: `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} wave across sectors`,
      description: `${group.length} ${typeLabel} signals spanning ${industryLabels.join(', ')}. ${companies.length > 0 ? `Active companies: ${companies.slice(0, 3).join(', ')}.` : ''}`,
      confidence,
      industries,
      companies,
      signal_types: [signalType],
      signal_count: group.length,
      momentum,
      color: MOMENTUM_COLORS[momentum],
      generated_at: new Date().toISOString(),
    });
  }

  return clusters.sort((a, b) => b.confidence - a.confidence).slice(0, 4);
}

// ─── Implication Detection ──────────────────────────────────────────────────────
// Implications = high-confidence patterns → what they mean

const IMPLICATION_RULES: Array<{
  condition: (signals: IntelSignalRow[]) => IntelSignalRow[];
  title: string;
  template: (matched: IntelSignalRow[]) => string;
  color: string;
}> = [
  {
    condition: (signals) => signals.filter(s =>
      s.signal_type === 'funding_round' && s.amount_usd && s.amount_usd > 10_000_000
    ),
    title: 'Major capital flowing into new technology sectors',
    template: (m) => {
      const industries = uniqueStrings(m.map(s => INDUSTRY_LABELS[s.industry] ?? s.industry));
      const total = m.reduce((sum, s) => sum + (s.amount_usd ?? 0), 0);
      return `$${Math.round(total / 1_000_000)}M+ in funding detected across ${industries.slice(0, 3).join(', ')}. Capital formation at this scale signals upcoming product launches and market expansion.`;
    },
    color: '#00ff88',
  },
  {
    condition: (signals) => signals.filter(s => s.signal_type === 'hiring_signal'),
    title: 'Workforce expansion signals growing demand',
    template: (m) => {
      const companies = uniqueStrings(m.map(s => s.company)).slice(0, 4);
      return `${m.length} hiring signals detected. ${companies.length > 0 ? `Companies expanding: ${companies.join(', ')}.` : ''} Hiring precedes product launches by 6-12 months.`;
    },
    color: '#00d4ff',
  },
  {
    condition: (signals) => signals.filter(s =>
      s.signal_type === 'patent_filing' || s.signal_type === 'research_paper'
    ),
    title: 'Innovation pipeline building across sectors',
    template: (m) => {
      const patents = m.filter(s => s.signal_type === 'patent_filing').length;
      const research = m.filter(s => s.signal_type === 'research_paper').length;
      const industries = uniqueStrings(m.map(s => INDUSTRY_LABELS[s.industry] ?? s.industry)).slice(0, 3);
      return `${patents} patents + ${research} research papers filed. Industries: ${industries.join(', ')}. This R&D activity typically leads to commercial products within 18-24 months.`;
    },
    color: '#ffd700',
  },
  {
    condition: (signals) => signals.filter(s =>
      s.signal_type === 'contract_award' || s.signal_type === 'facility_expansion'
    ),
    title: 'Infrastructure investment accelerating',
    template: (m) => {
      const contracts = m.filter(s => s.signal_type === 'contract_award').length;
      const facilities = m.filter(s => s.signal_type === 'facility_expansion').length;
      return `${contracts} contract awards + ${facilities} facility expansions. Physical infrastructure investment signals long-term commitment and market maturation.`;
    },
    color: '#f97316',
  },
];

function detectImplications(signals: IntelSignalRow[]): Insight[] {
  const implications: Insight[] = [];

  for (const rule of IMPLICATION_RULES) {
    const matched = rule.condition(signals);
    if (matched.length < 3) continue;

    const companies = uniqueStrings(matched.map(s => s.company)).slice(0, 5);
    const industries = uniqueStrings(matched.map(s => s.industry));
    const types = uniqueStrings(matched.map(s => s.signal_type));
    const momentum = computeMomentum(matched);

    implications.push({
      id: `implication-${slugify(rule.title)}`,
      type: 'implication',
      title: rule.title,
      description: rule.template(matched),
      confidence: Math.min(100, Math.round(50 + matched.length * 3)),
      industries,
      companies,
      signal_types: types,
      signal_count: matched.length,
      momentum,
      color: rule.color,
      generated_at: new Date().toISOString(),
    });
  }

  return implications;
}

// ─── Opportunity Detection ──────────────────────────────────────────────────────
// Opportunities = emerging patterns where signal diversity is high

function detectOpportunities(signals: IntelSignalRow[]): Insight[] {
  // Find industries with accelerating momentum and diverse signal types
  const byIndustry = new Map<string, IntelSignalRow[]>();
  for (const s of signals) {
    const existing = byIndustry.get(s.industry);
    if (existing) existing.push(s);
    else byIndustry.set(s.industry, [s]);
  }

  const opportunities: Insight[] = [];

  for (const [industry, group] of Array.from(byIndustry.entries() as Iterable<[string, IntelSignalRow[]]>)) {
    if (group.length < 3) continue;

    const momentum = computeMomentum(group);
    if (momentum === 'cooling') continue;

    const types = uniqueStrings(group.map(s => s.signal_type));
    const companies = uniqueStrings(group.map(s => s.company)).slice(0, 5);
    const label = INDUSTRY_LABELS[industry] ?? industry;

    // Look for specific opportunity signals
    const hasFunding = types.includes('funding_round');
    const hasHiring = types.includes('hiring_signal');
    const hasPatents = types.includes('patent_filing');
    const hasContracts = types.includes('contract_award');

    // Score opportunity strength
    let strength = 0;
    if (hasFunding) strength += 25;
    if (hasHiring) strength += 20;
    if (hasPatents) strength += 20;
    if (hasContracts) strength += 15;
    if (momentum === 'accelerating') strength += 20;
    if (types.length >= 3) strength += 10;

    if (strength < 40) continue;

    const drivers: string[] = [];
    if (hasFunding) drivers.push('capital inflow');
    if (hasHiring) drivers.push('workforce expansion');
    if (hasPatents) drivers.push('IP development');
    if (hasContracts) drivers.push('contract awards');

    // Match to static industry data for richer context
    const staticIndustry = INDUSTRIES.find(i =>
      i.label.toLowerCase().includes(label.toLowerCase().split(' ')[0]) ||
      label.toLowerCase().includes(i.label.toLowerCase().split('/')[0].trim())
    );
    const techCount = staticIndustry
      ? TECHNOLOGY_CATALOG.filter(t => t.category === staticIndustry.category).length
      : 0;

    opportunities.push({
      id: `opportunity-${slugify(industry)}`,
      type: 'opportunity',
      title: `${label}: ${momentum === 'accelerating' ? 'high momentum' : 'emerging opportunity'}`,
      description: `Driven by ${drivers.join(', ')}. ${group.length} signals from ${companies.length} companies.${techCount > 0 ? ` ${techCount} technologies tracked in this sector.` : ''}`,
      confidence: Math.min(100, strength),
      industries: [industry],
      companies,
      signal_types: types,
      signal_count: group.length,
      momentum,
      color: staticIndustry?.color ?? MOMENTUM_COLORS[momentum],
      generated_at: new Date().toISOString(),
    });
  }

  return opportunities.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

// ─── Fallback Insights (when no Supabase / no signals) ──────────────────────────

const FALLBACK_INSIGHTS: Insight[] = [
  {
    id: 'insight-fallback-1',
    type: 'pattern',
    title: 'Warehouse automation accelerating',
    description: 'Labor shortages are driving rapid adoption of autonomous mobile robots and pick-and-place systems across distribution centers.',
    confidence: 85,
    industries: ['supply_chain', 'manufacturing'],
    companies: ['AutoStore', 'Locus Robotics', 'GreyOrange'],
    signal_types: ['funding_round', 'hiring_signal', 'patent_filing'],
    signal_count: 12,
    momentum: 'accelerating',
    color: '#00ff88',
    generated_at: new Date().toISOString(),
  },
  {
    id: 'insight-fallback-2',
    type: 'cluster',
    title: 'AI entering industrial inspection',
    description: 'Computer vision and acoustic sensors are detecting pipeline anomalies, solar panel defects, and infrastructure failures weeks before traditional methods.',
    confidence: 78,
    industries: ['energy', 'manufacturing', 'ai_ml'],
    companies: ['Gecko Robotics', 'Percepto', 'Flyability'],
    signal_types: ['patent_filing', 'product_launch', 'contract_award'],
    signal_count: 9,
    momentum: 'accelerating',
    color: '#00d4ff',
    generated_at: new Date().toISOString(),
  },
  {
    id: 'insight-fallback-3',
    type: 'implication',
    title: 'Border technology modernization wave',
    description: 'Integrated sensor networks and AI-powered surveillance are replacing legacy detection systems. $2.4B+ in CBP modernization contracts expected through FY26.',
    confidence: 82,
    industries: ['aerospace_defense', 'cybersecurity'],
    companies: ['Elbit Systems', 'Anduril', 'FLIR'],
    signal_types: ['contract_award', 'facility_expansion'],
    signal_count: 7,
    momentum: 'steady',
    color: '#f97316',
    generated_at: new Date().toISOString(),
  },
  {
    id: 'insight-fallback-4',
    type: 'opportunity',
    title: 'Cybersecurity: high momentum',
    description: 'Driven by capital inflow, workforce expansion, and contract awards. Zero-trust architecture and OT security are the fastest-growing segments.',
    confidence: 88,
    industries: ['cybersecurity'],
    companies: ['CrowdStrike', 'Palo Alto Networks', 'Dragos'],
    signal_types: ['funding_round', 'hiring_signal', 'contract_award'],
    signal_count: 15,
    momentum: 'accelerating',
    color: '#00ff88',
    generated_at: new Date().toISOString(),
  },
  {
    id: 'insight-fallback-5',
    type: 'pattern',
    title: 'Robotics entering solar maintenance',
    description: 'Autonomous cleaning and inspection systems are replacing manual field crews across utility-scale solar farms, driven by 3 patent filings and 2 product launches.',
    confidence: 72,
    industries: ['energy', 'manufacturing'],
    companies: ['SunPower', 'Ecoppia', 'Aerones'],
    signal_types: ['patent_filing', 'product_launch'],
    signal_count: 6,
    momentum: 'emerging',
    color: '#ffd700',
    generated_at: new Date().toISOString(),
  },
  {
    id: 'insight-fallback-6',
    type: 'opportunity',
    title: 'Supply Chain: emerging opportunity',
    description: 'Driven by IP development and workforce expansion. Real-time visibility platforms and predictive analytics are reshaping logistics operations.',
    confidence: 74,
    industries: ['supply_chain'],
    companies: ['FourKites', 'project44', 'Transfix'],
    signal_types: ['patent_filing', 'hiring_signal', 'funding_round'],
    signal_count: 8,
    momentum: 'emerging',
    color: '#f97316',
    generated_at: new Date().toISOString(),
  },
];

// ─── Main Agent ─────────────────────────────────────────────────────────────────

export async function runInsightAgent(): Promise<InsightAgentResult> {
  const start = Date.now();

  // Use fallback when Supabase is not configured
  if (!isSupabaseConfigured()) {
    return {
      insights: FALLBACK_INSIGHTS,
      patterns: FALLBACK_INSIGHTS.filter(i => i.type === 'pattern'),
      clusters: FALLBACK_INSIGHTS.filter(i => i.type === 'cluster'),
      implications: FALLBACK_INSIGHTS.filter(i => i.type === 'implication'),
      opportunities: FALLBACK_INSIGHTS.filter(i => i.type === 'opportunity'),
      signals_analyzed: 0,
      duration_ms: Date.now() - start,
    };
  }

  // Fetch recent signals (30 days)
  const signals = await getIntelSignals({ limit: 500 });

  if (signals.length === 0) {
    return {
      insights: FALLBACK_INSIGHTS,
      patterns: FALLBACK_INSIGHTS.filter(i => i.type === 'pattern'),
      clusters: FALLBACK_INSIGHTS.filter(i => i.type === 'cluster'),
      implications: FALLBACK_INSIGHTS.filter(i => i.type === 'implication'),
      opportunities: FALLBACK_INSIGHTS.filter(i => i.type === 'opportunity'),
      signals_analyzed: 0,
      duration_ms: Date.now() - start,
    };
  }

  // Run all detectors
  const patterns = detectPatterns(signals);
  const clusters = detectClusters(signals);
  const implications = detectImplications(signals);
  const opportunities = detectOpportunities(signals);

  // Merge all insights, sorted by confidence
  const all = [...patterns, ...clusters, ...implications, ...opportunities]
    .sort((a, b) => b.confidence - a.confidence);

  return {
    insights: all,
    patterns,
    clusters,
    implications,
    opportunities,
    signals_analyzed: signals.length,
    duration_ms: Date.now() - start,
  };
}
