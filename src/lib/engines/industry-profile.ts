// src/lib/engines/industry-profile.ts
// Industry Profile Engine — assembles the 8-block "Explain This Industry" data.
//
// Block 1: Snapshot (stage, momentum, competition, signals this month)
// Block 2: Explanation (what it does, why it matters)
// Block 3: Ecosystem Map (companies, technologies, relationships)
// Block 4: Key Technologies (from graph technology nodes)
// Block 5: Companies (active companies from graph)
// Block 6: Adoption Curve (visual position + score)
// Block 7: Timeline (what happened — signals ordered by date)
// Block 8: Opportunities (detected opportunities)
//
// All data sourced from: knowledge graph, intel signals, static catalogs.
// No LLM calls — pure data assembly.

import { getIndustryEcosystem } from '@/db/queries/knowledge-graph';
import type { EntityRow, ConnectedEntity } from '@/db/queries/knowledge-graph';
import { getIntelSignals } from '@/db/queries/intel-signals';
import type { IntelSignalRow } from '@/db/queries/intel-signals';
import { getAdoptionProfile } from '@/lib/agents/scoring/adoption-curve';
import type { AdoptionProfile } from '@/lib/agents/scoring/adoption-curve';
import { INDUSTRIES, TECHNOLOGY_CATALOG, type IndustrySlug } from '@/lib/data/technology-catalog';
import { INDUSTRY_STORIES } from '@/lib/data/industry-stories';
import { EL_PASO_VENDORS, type VendorRecord } from '@/lib/data/el-paso-vendors';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type IndustrySnapshot = {
  stage: string;
  stage_label: string;
  momentum: string;
  competition: 'low' | 'medium' | 'high';
  signals_this_month: number;
  company_count: number;
  technology_count: number;
  sector_score: number;
};

export type IndustryExplanation = {
  what_it_does: string;
  why_it_matters: string[];
  outlook: string | null;
};

export type EcosystemNode = {
  id: string;
  name: string;
  type: 'industry' | 'company' | 'technology' | 'product';
  color: string;
  size: number;
};

export type EcosystemEdge = {
  source: string;
  target: string;
  relationship: string;
  confidence: number;
};

export type EcosystemData = {
  nodes: EcosystemNode[];
  edges: EcosystemEdge[];
};

export type TechnologyEntry = {
  id: string;
  name: string;
  description: string;
  maturity: string;
  relevance: string;
};

export type CompanyEntry = {
  id: string;
  name: string;
  website: string;
  category: string;
  iker_score: number;
  tags: string[];
};

export type TimelineEvent = {
  date: string;
  type: string;
  title: string;
  company: string | null;
  source: string | null;
  importance: number;
  url: string | null;
};

export type OpportunityEntry = {
  title: string;
  reason: string;
  strength: 'strong' | 'moderate' | 'emerging';
};

export type IndustryProfile = {
  slug: string;
  label: string;
  color: string;
  is_core: boolean;
  blocks: {
    snapshot: IndustrySnapshot;
    explanation: IndustryExplanation;
    ecosystem: EcosystemData;
    technologies: TechnologyEntry[];
    companies: CompanyEntry[];
    adoption: AdoptionProfile;
    timeline: TimelineEvent[];
    opportunities: OpportunityEntry[];
  };
  generated_at: string;
};

// ─── Vendor category mapping ────────────────────────────────────────────────────

const CATEGORY_TO_VENDOR_CATS: Record<string, string[]> = {
  'AI/ML':          ['AI / ML', 'IoT', 'Analytics', 'AI/R&D'],
  'Cybersecurity':  ['Cybersecurity'],
  'Defense':        ['Defense', 'Defense IT'],
  'Border Tech':    ['Border Tech'],
  'Manufacturing':  ['Manufacturing', 'Robotics', 'Fabrication', 'Warehousing', 'Robotics & Automation', 'Warehouse Automation'],
  'Energy':         ['Energy', 'Water Tech', 'Energy Tech'],
  'Healthcare':     ['Health Tech', 'Healthcare'],
  'Logistics':      ['Logistics', 'Warehousing', 'Trucking', 'Supply Chain Software'],
};

const SLUG_TO_SIGNAL_INDUSTRY: Record<string, string> = {
  'ai-ml': 'ai_ml',
  'cybersecurity': 'cybersecurity',
  'defense': 'aerospace_defense',
  'border-tech': 'construction',
  'manufacturing': 'manufacturing',
  'energy': 'energy',
  'healthcare': 'health_biotech',
  'logistics': 'supply_chain',
};

// ─── Node colors ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  industry: '#a855f7',
  company: '#00d4ff',
  technology: '#ffd700',
  product: '#00ff88',
};

// ─── Build Profile ──────────────────────────────────────────────────────────────

export async function buildIndustryProfile(slug: string): Promise<IndustryProfile> {
  const industry = INDUSTRIES.find(i => i.slug === slug);
  const story = industry ? INDUSTRY_STORIES[industry.slug as IndustrySlug] : undefined;
  const isCore = !!industry;
  const label = industry?.label ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const color = industry?.color ?? '#00d4ff';

  // Fetch data in parallel
  const signalIndustry = SLUG_TO_SIGNAL_INDUSTRY[slug] ?? slug;
  const [ecosystem, signals] = await Promise.all([
    getIndustryEcosystem(slug),
    getIntelSignals({ industry: signalIndustry, limit: 100 }),
  ]);

  // ── Block 1: Snapshot ──
  const snapshot = buildSnapshot(slug, signals, ecosystem, industry);

  // ── Block 2: Explanation ──
  const explanation = buildExplanation(slug, story, industry);

  // ── Block 3: Ecosystem Map ──
  const ecosystemData = buildEcosystem(slug, label, color, ecosystem, industry);

  // ── Block 4: Technologies ──
  const technologies = buildTechnologies(ecosystem, industry);

  // ── Block 5: Companies ──
  const companies = buildCompanies(ecosystem, industry);

  // ── Block 6: Adoption Curve ──
  const adoption = getAdoptionProfile(slug, signals);

  // ── Block 7: Timeline ──
  const timeline = buildTimeline(signals);

  // ── Block 8: Opportunities ──
  const opportunities = buildOpportunities(slug, signals, adoption, snapshot);

  return {
    slug,
    label,
    color,
    is_core: isCore,
    blocks: {
      snapshot,
      explanation,
      ecosystem: ecosystemData,
      technologies,
      companies,
      adoption,
      timeline,
      opportunities,
    },
    generated_at: new Date().toISOString(),
  };
}

// ─── Block Builders ─────────────────────────────────────────────────────────────

function buildSnapshot(
  slug: string,
  signals: IntelSignalRow[],
  ecosystem: { companies: ConnectedEntity[]; technologies: ConnectedEntity[] },
  industry: (typeof INDUSTRIES)[number] | undefined,
): IndustrySnapshot {
  const now = Date.now();
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  const signalsThisMonth = signals.filter(s =>
    new Date(s.discovered_at).getTime() >= monthAgo
  ).length;

  // Get static counts as fallback
  const vendorCats = industry ? CATEGORY_TO_VENDOR_CATS[industry.category] ?? [] : [];
  const allVendors = Object.values(EL_PASO_VENDORS) as VendorRecord[];
  const localVendors = allVendors.filter(v => vendorCats.includes(v.category));
  const staticTechs = industry
    ? TECHNOLOGY_CATALOG.filter(t => t.category === industry.category)
    : [];

  const companyCount = ecosystem.companies.length || localVendors.length;
  const techCount = ecosystem.technologies.length || staticTechs.length;

  // Competition level from company count
  const competition: 'low' | 'medium' | 'high' =
    companyCount >= 15 ? 'high' : companyCount >= 6 ? 'medium' : 'low';

  // Sector score from technologies
  const sectorScore = staticTechs.length === 0 ? 0 : Math.min(100, Math.round(
    staticTechs.reduce((sum, t) => {
      const m = t.maturityLevel === 'mature' ? 3 : t.maturityLevel === 'growing' ? 2 : 1;
      const r = t.elPasoRelevance === 'high' ? 3 : t.elPasoRelevance === 'medium' ? 2 : 1;
      return sum + m * r;
    }, 0) / (staticTechs.length * 9) * 100
  ));

  const adoption = getAdoptionProfile(slug, signals);

  return {
    stage: adoption.stage,
    stage_label: adoption.stage_label,
    momentum: adoption.momentum,
    competition,
    signals_this_month: signalsThisMonth,
    company_count: companyCount,
    technology_count: techCount,
    sector_score: sectorScore,
  };
}

function buildExplanation(
  slug: string,
  story: (typeof INDUSTRY_STORIES)[IndustrySlug] | undefined,
  industry: (typeof INDUSTRIES)[number] | undefined,
): IndustryExplanation {
  if (story) {
    return {
      what_it_does: story.summary,
      why_it_matters: story.bullets.slice(0, 3),
      outlook: story.outlook ?? null,
    };
  }

  // Fallback for custom industries
  const label = industry?.label ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return {
    what_it_does: `${label} is an emerging sector being tracked by NXT LINK intelligence.`,
    why_it_matters: [
      'Signal activity detected across multiple sources',
      'Companies and technologies are converging in this space',
      'Potential opportunities for early movers',
    ],
    outlook: null,
  };
}

function buildEcosystem(
  slug: string,
  label: string,
  color: string,
  ecosystem: { industry: EntityRow | null; companies: ConnectedEntity[]; technologies: ConnectedEntity[]; products: ConnectedEntity[] },
  industry: (typeof INDUSTRIES)[number] | undefined,
): EcosystemData {
  const nodes: EcosystemNode[] = [];
  const edges: EcosystemEdge[] = [];

  // Center node
  const centerId = `ind-${slug}`;
  nodes.push({
    id: centerId,
    name: label,
    type: 'industry',
    color,
    size: 44,
  });

  // Graph-sourced nodes
  if (ecosystem.companies.length > 0 || ecosystem.technologies.length > 0) {
    for (const c of ecosystem.companies.slice(0, 20)) {
      nodes.push({
        id: `co-${c.slug}`,
        name: c.name,
        type: 'company',
        color: TYPE_COLORS.company,
        size: 22,
      });
      edges.push({
        source: `co-${c.slug}`,
        target: centerId,
        relationship: c.relationship.relationship_type,
        confidence: c.relationship.confidence,
      });
    }
    for (const t of ecosystem.technologies.slice(0, 15)) {
      nodes.push({
        id: `tech-${t.slug}`,
        name: t.name,
        type: 'technology',
        color: TYPE_COLORS.technology,
        size: 22,
      });
      edges.push({
        source: `tech-${t.slug}`,
        target: centerId,
        relationship: t.relationship.relationship_type,
        confidence: t.relationship.confidence,
      });
    }
    for (const p of ecosystem.products?.slice(0, 10) ?? []) {
      nodes.push({
        id: `prod-${p.slug}`,
        name: p.name,
        type: 'product',
        color: TYPE_COLORS.product,
        size: 18,
      });
      edges.push({
        source: `prod-${p.slug}`,
        target: centerId,
        relationship: p.relationship.relationship_type,
        confidence: p.relationship.confidence,
      });
    }
  } else if (industry) {
    // Fallback: use static data
    const vendorCats = CATEGORY_TO_VENDOR_CATS[industry.category] ?? [];
    const allVendors = Object.values(EL_PASO_VENDORS) as VendorRecord[];
    const vendors = allVendors.filter(v => vendorCats.includes(v.category)).slice(0, 15);
    const techs = TECHNOLOGY_CATALOG.filter(t => t.category === industry.category);

    for (const v of vendors) {
      nodes.push({
        id: `co-${v.id}`,
        name: v.name,
        type: 'company',
        color: TYPE_COLORS.company,
        size: 22,
      });
      edges.push({
        source: `co-${v.id}`,
        target: centerId,
        relationship: 'belongs_to',
        confidence: v.confidence,
      });
    }
    for (const t of techs) {
      const tid = t.id.replace(/^tech-/, '');
      nodes.push({
        id: `tech-${tid}`,
        name: t.name,
        type: 'technology',
        color: TYPE_COLORS.technology,
        size: 22,
      });
      edges.push({
        source: `tech-${tid}`,
        target: centerId,
        relationship: 'belongs_to',
        confidence: 0.9,
      });
    }
  }

  return { nodes, edges };
}

function buildTechnologies(
  ecosystem: { technologies: ConnectedEntity[] },
  industry: (typeof INDUSTRIES)[number] | undefined,
): TechnologyEntry[] {
  // Prefer graph data
  if (ecosystem.technologies.length > 0) {
    return ecosystem.technologies.map(t => ({
      id: t.slug,
      name: t.name,
      description: t.description ?? '',
      maturity: (t.metadata as Record<string, unknown>)?.maturity as string ?? 'emerging',
      relevance: (t.metadata as Record<string, unknown>)?.el_paso_relevance as string ?? 'medium',
    }));
  }

  // Fallback to static catalog
  if (!industry) return [];
  return TECHNOLOGY_CATALOG
    .filter(t => t.category === industry.category)
    .map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      maturity: t.maturityLevel,
      relevance: t.elPasoRelevance,
    }));
}

function buildCompanies(
  ecosystem: { companies: ConnectedEntity[] },
  industry: (typeof INDUSTRIES)[number] | undefined,
): CompanyEntry[] {
  // Prefer graph data
  if (ecosystem.companies.length > 0) {
    return ecosystem.companies.map(c => {
      const meta = c.metadata as Record<string, unknown>;
      return {
        id: c.slug,
        name: c.name,
        website: (meta?.website as string) ?? '',
        category: (meta?.category as string) ?? '',
        iker_score: (meta?.iker_score as number) ?? 0,
        tags: [],
      };
    });
  }

  // Fallback to static vendors
  if (!industry) return [];
  const vendorCats = CATEGORY_TO_VENDOR_CATS[industry.category] ?? [];
  const allVendors = Object.values(EL_PASO_VENDORS) as VendorRecord[];
  return allVendors
    .filter(v => vendorCats.includes(v.category))
    .sort((a, b) => b.ikerScore - a.ikerScore)
    .slice(0, 20)
    .map(v => ({
      id: v.id,
      name: v.name,
      website: v.website,
      category: v.category,
      iker_score: v.ikerScore,
      tags: v.tags,
    }));
}

function buildTimeline(signals: IntelSignalRow[]): TimelineEvent[] {
  // Sort signals by date descending
  const sorted = [...signals].sort((a, b) =>
    new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime()
  );

  return sorted.slice(0, 30).map(s => ({
    date: s.discovered_at,
    type: s.signal_type,
    title: s.title,
    company: s.company,
    source: s.source,
    importance: s.importance_score,
    url: s.url,
  }));
}

function buildOpportunities(
  slug: string,
  signals: IntelSignalRow[],
  adoption: AdoptionProfile,
  snapshot: IndustrySnapshot,
): OpportunityEntry[] {
  const opportunities: OpportunityEntry[] = [];

  // 1. Adoption-based opportunities
  if (adoption.stage === 'innovators' || adoption.stage === 'early_adopters') {
    opportunities.push({
      title: 'Early mover advantage',
      reason: `${snapshot.stage_label} stage with ${adoption.momentum} momentum — few competitors, high growth potential.`,
      strength: adoption.momentum === 'accelerating' ? 'strong' : 'moderate',
    });
  }

  // 2. Low competition + signals
  if (snapshot.competition === 'low' && snapshot.signals_this_month > 0) {
    opportunities.push({
      title: 'Underserved market',
      reason: `Only ${snapshot.company_count} active companies despite ${snapshot.signals_this_month} signals this month.`,
      strength: 'strong',
    });
  }

  // 3. Funding activity
  const fundingSignals = signals.filter(s => s.signal_type === 'funding_round');
  if (fundingSignals.length >= 2) {
    opportunities.push({
      title: 'Active investment flow',
      reason: `${fundingSignals.length} funding rounds detected — investor confidence is growing.`,
      strength: fundingSignals.length >= 5 ? 'strong' : 'moderate',
    });
  }

  // 4. Patent clustering
  const patentSignals = signals.filter(s => s.signal_type === 'patent_filing');
  if (patentSignals.length >= 3) {
    opportunities.push({
      title: 'Innovation acceleration',
      reason: `${patentSignals.length} patents filed — technology breakthrough potential.`,
      strength: patentSignals.length >= 6 ? 'strong' : 'moderate',
    });
  }

  // 5. Hiring surge
  const hiringSignals = signals.filter(s => s.signal_type === 'hiring_signal');
  if (hiringSignals.length >= 3) {
    opportunities.push({
      title: 'Talent demand surge',
      reason: `${hiringSignals.length} hiring signals — companies scaling operations.`,
      strength: 'moderate',
    });
  }

  // 6. Facility expansion
  const expansionSignals = signals.filter(s => s.signal_type === 'facility_expansion');
  if (expansionSignals.length >= 2) {
    opportunities.push({
      title: 'Physical expansion',
      reason: `${expansionSignals.length} facility expansions — real capacity being built.`,
      strength: 'strong',
    });
  }

  // 7. Fallback — always show at least one
  if (opportunities.length === 0) {
    if (snapshot.technology_count > 0) {
      opportunities.push({
        title: 'Technology convergence',
        reason: `${snapshot.technology_count} technologies tracked — cross-pollination potential between adjacent sectors.`,
        strength: 'emerging',
      });
    } else {
      opportunities.push({
        title: 'Emerging sector',
        reason: 'Early signal detected — monitoring for opportunity formation.',
        strength: 'emerging',
      });
    }
  }

  return opportunities.slice(0, 5);
}
