// src/lib/engines/ask-engine.ts
// Ask Engine — assembles comprehensive intelligence response for /api/ask.
// Combines static catalog data with LIVE search from Google News, GDELT,
// arXiv, OpenAlex, PatentsView, Grants.gov — all free, no keys needed.

import { buildIndustryProfile } from '@/lib/engines/industry-profile';
import { INDUSTRY_TRAJECTORIES } from '@/lib/data/industry-trajectory-timeline';
import { GLOBAL_VENDORS } from '@/lib/data/global-vendors';
import type {
  CompanyEntry,
  TimelineEvent,
  OpportunityEntry,
  ConfidenceAssessment,
} from '@/lib/engines/industry-profile';
import { getIntelSignals } from '@/db/queries/intel-signals';
import type { IntelSignalRow } from '@/db/queries/intel-signals';
import { getStoredFeedItems, type EnrichedFeedItem } from '@/lib/agents/feed-agent';
import { searchKgIndustries } from '@/db/queries/kg-industries';
import { INDUSTRIES } from '@/lib/data/technology-catalog';
import { EL_PASO_VENDORS, type VendorRecord } from '@/lib/data/el-paso-vendors';
import { PRODUCT_CATALOG, type Product } from '@/lib/data/product-catalog';
import { getCompanyLogoUrl } from '@/lib/utils/company-logos';
import {
  liveSearch,
  type LiveSearchResult,
  type PatentResult,
  type ResearchPaper,
  type GrantResult,
  type FederalContract,
  type FundingEvent,
  type MarketDataPoint,
  type GeographicBreakdown,
  type WikipediaSummary,
} from '@/lib/engines/live-search-engine';

// ─── Response Types ─────────────────────────────────────────────────────────────

export type WhatItIsSection = {
  summary: string;
  key_points: string[];
  outlook: string | null;
  market_data: MarketDataPoint[];
};

export type HistorySection = {
  events: TimelineEvent[];
};

export type DirectionSection = {
  adoption_stage: string;
  adoption_label: string;
  momentum: string;
  sentiment: { overall: string; positive_pct: number; negative_pct: number; neutral_pct: number };
  opportunities: OpportunityEntry[];
};

export type CostRange = {
  tier: 'budget' | 'mid' | 'enterprise';
  label: string;
  range: string;
  products: string[];
};

export type CostsSection = {
  ranges: CostRange[];
  price_signals: string[];
  market_sizes: string[];
  growth_rates: string[];
  funding_events: FundingEvent[];
};

export type AskVendor = {
  id: string;
  name: string;
  website: string;
  category: string;
  tags: string[];
  iker_score: number;
  logo_url: string | null;
  is_local: boolean;
  description: string;
  phone: string | null;
  address: string | null;
  sentiment: string;
  is_hiring: boolean;
  has_recent_funding: boolean;
};

export type AskSignal = {
  title: string;
  url: string | null;
  source: string | null;
  type: string;
  discovered_at: string;
  importance: number;
};

export type AskProduct = {
  id: string;
  name: string;
  company: string;
  category: string;
  description: string;
  price_estimate: string;
  price_range: string | undefined;
  logo_url: string | null;
  recommendation_score: number;
  maturity: string;
  momentum: string;
};

export type LiveSearchMeta = {
  sources_checked: number;
  articles_found: number;
  companies_discovered: number;
  patents_found: number;
  papers_found: number;
  grants_found: number;
  contracts_found: number;
  top_sources: string[];
  freshest_article: string;
  duration_ms: number;
};

export type ExpertBrief = {
  headline: string;
  key_insight: string;
  market_momentum: 'surging' | 'growing' | 'stable' | 'declining' | 'emerging';
  maturity: 'nascent' | 'emerging' | 'growth' | 'mature' | 'declining';
  risk_level: 'low' | 'moderate' | 'high';
  data_depth: number;
  bullet_points: string[];
};

export type KeyPlayer = {
  name: string;
  role: 'leader' | 'challenger' | 'emerging' | 'niche';
  mentions: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  badges: string[];
  context: string;
  momentum_score: number;
};

export type TechTheme = {
  keyword: string;
  frequency: number;
  sources: string[];
  maturity: 'emerging' | 'growing' | 'mature';
  companies: string[];
};

export type InnovationItem = {
  title: string;
  entity: string;
  date: string;
  url: string;
};

export type InnovationPipeline = {
  researched: InnovationItem[];
  patented: InnovationItem[];
  funded: InnovationItem[];
  contracted: InnovationItem[];
  gaps: string[];
};

export type AskResponse = {
  ok: true;
  query: string;
  slug: string;
  label: string;
  confidence: ConfidenceAssessment;
  sections: {
    what_it_is: WhatItIsSection;
    history: HistorySection;
    direction: DirectionSection;
    costs: CostsSection;
    global_vendors: { vendors: AskVendor[] };
    local_vendors: { vendors: AskVendor[] };
    live_signals: { signals: AskSignal[] };
    patents: { items: PatentResult[] };
    research: { papers: ResearchPaper[] };
    grants: { items: GrantResult[] };
    contracts: { items: FederalContract[] };
    geography: { breakdown: GeographicBreakdown[] };
    wikipedia: WikipediaSummary | null;
    expert_brief: ExpertBrief;
    key_players: KeyPlayer[];
    tech_landscape: TechTheme[];
    innovation_pipeline: InnovationPipeline;
  };
  products: AskProduct[];
  related_searches: string[];
  risk_signals: string[];
  regulatory_signals: string[];
  hiring_signals: string[];
  live_search: LiveSearchMeta;
  generated_at: string;
};

// ─── Query → Slug Resolution ───────────────────────────────────────────────────

export async function resolveQueryToSlug(
  query: string,
): Promise<{ slug: string; label: string }> {
  const lower = query.toLowerCase().trim();

  const staticMatch = INDUSTRIES.find(
    (i) =>
      i.label.toLowerCase() === lower ||
      i.slug === lower ||
      i.category.toLowerCase() === lower ||
      lower.includes(i.slug) ||
      i.label.toLowerCase().includes(lower),
  );
  if (staticMatch) {
    return { slug: staticMatch.slug, label: staticMatch.label };
  }

  const kgMatches = await searchKgIndustries(query, 5);
  if (kgMatches.length > 0) {
    return { slug: kgMatches[0].slug, label: kgMatches[0].name };
  }

  const slug = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const label = query.trim().replace(/\b\w/g, (c) => c.toUpperCase());
  return { slug, label };
}

// ─── Signal Filtering ───────────────────────────────────────────────────────────

function filterSignalsForQuery(
  signals: IntelSignalRow[],
  query: string,
): AskSignal[] {
  const keywords = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
  return signals
    .filter((s) => {
      const text = `${s.title} ${s.industry} ${s.company ?? ''} ${(s.tags ?? []).join(' ')}`.toLowerCase();
      return keywords.some((kw) => text.includes(kw));
    })
    .slice(0, 5)
    .map((s) => ({
      title: s.title, url: s.url, source: s.source,
      type: s.signal_type, discovered_at: s.discovered_at, importance: s.importance_score,
    }));
}

function filterFeedForQuery(items: EnrichedFeedItem[], query: string): AskSignal[] {
  const keywords = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
  return items
    .filter((item) => {
      const text = `${item.title} ${item.description} ${item.category}`.toLowerCase();
      return keywords.some((kw) => text.includes(kw));
    })
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 5)
    .map((item) => ({
      title: item.title, url: item.link, source: item.source,
      type: 'news', discovered_at: item.pubDate, importance: item.score / 10,
    }));
}

// ─── Product Filtering ──────────────────────────────────────────────────────────

function filterProductsForQuery(query: string): AskProduct[] {
  const keywords = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
  return PRODUCT_CATALOG.filter((p) => {
    const text = `${p.name} ${p.company} ${p.category} ${p.description} ${p.industries.join(' ')} ${p.tags.join(' ')}`.toLowerCase();
    return keywords.some((kw) => text.includes(kw));
  })
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, 8)
    .map((p) => ({
      id: p.id, name: p.name, company: p.company, category: p.category,
      description: p.description, price_estimate: p.priceEstimate,
      price_range: p.priceRange, logo_url: getCompanyLogoUrl(p.company),
      recommendation_score: p.recommendationScore, maturity: p.maturity, momentum: p.momentum,
    }));
}

// ─── Cost Ranges ────────────────────────────────────────────────────────────────

function buildCostRanges(products: Product[]): CostRange[] {
  const tiers: Record<string, { label: string; products: string[]; ranges: string[] }> = {
    budget: { label: 'Budget', products: [], ranges: [] },
    mid: { label: 'Mid-Market', products: [], ranges: [] },
    enterprise: { label: 'Enterprise', products: [], ranges: [] },
  };

  for (const p of products) {
    const tier = p.priceEstimate === 'low' ? 'budget' : p.priceEstimate === 'medium' ? 'mid' : 'enterprise';
    tiers[tier].products.push(p.name);
    if (p.priceRange) tiers[tier].ranges.push(p.priceRange);
  }

  return (Object.entries(tiers) as Array<[string, { label: string; products: string[]; ranges: string[] }]>)
    .filter(([, v]) => v.products.length > 0)
    .map(([key, v]) => ({
      tier: key as 'budget' | 'mid' | 'enterprise',
      label: v.label,
      range: v.ranges[0] ?? (key === 'budget' ? '<$10K/yr' : key === 'mid' ? '$10K–$100K/yr' : '$100K+/yr'),
      products: v.products,
    }));
}

// ─── Vendor Builders ────────────────────────────────────────────────────────────

const CATEGORY_TO_VENDOR_CATS: Record<string, string[]> = {
  'AI/ML': ['AI / ML', 'IoT', 'Analytics', 'Enterprise IT', 'Defense IT', 'Consulting', 'Engineering'],
  Cybersecurity: ['Cybersecurity', 'Defense IT', 'Enterprise IT', 'Government'],
  Defense: ['Defense', 'Defense IT', 'Government', 'Engineering', 'Consulting'],
  'Border Tech': ['Border Tech', 'Government', 'Defense', 'Defense IT'],
  Manufacturing: ['Manufacturing', 'Robotics', 'Fabrication', 'Warehousing', 'Engineering', 'HVAC', 'Construction', 'Auto / Fleet'],
  Energy: ['Energy', 'Water Tech', 'Engineering', 'Construction', 'HVAC'],
  Healthcare: ['Health Tech', 'Food', 'Professional'],
  Logistics: ['Logistics', 'Warehousing', 'Trucking', 'Auto / Fleet', 'Real Estate'],
  Construction: ['Construction', 'Engineering', 'Fabrication', 'Real Estate', 'PropTech', 'HVAC'],
  Agriculture: ['Food', 'Engineering', 'Water Tech'],
  Education: ['Education', 'Consulting', 'Professional', 'Government'],
  Fintech: ['FinTech', 'Professional', 'Consulting'],
};

function vendorToAsk(v: VendorRecord, isLocal: boolean): AskVendor {
  return {
    id: v.id, name: v.name, website: v.website, category: v.category,
    tags: v.tags, iker_score: v.ikerScore,
    logo_url: getCompanyLogoUrl(v.name, v.website),
    is_local: isLocal, description: v.description,
    phone: null, address: null,
    sentiment: 'neutral', is_hiring: false, has_recent_funding: false,
  };
}

function buildLocalVendors(slug: string, query: string): AskVendor[] {
  const allVendors = Object.values(EL_PASO_VENDORS);
  const keywords = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);

  // Try category match first (using slug → INDUSTRIES → CATEGORY_TO_VENDOR_CATS)
  const industry = INDUSTRIES.find((i) => i.slug === slug);
  const catMatch = CATEGORY_TO_VENDOR_CATS[industry?.category ?? ''] ?? [];

  // Score every vendor: category match + keyword match in description/tags
  const scored = allVendors.map((v) => {
    let score = 0;
    if (catMatch.includes(v.category)) score += 10;
    const text = `${v.description} ${v.tags.join(' ')} ${v.category} ${v.name}`.toLowerCase();
    for (const kw of keywords) {
      if (text.includes(kw)) score += 3;
    }
    // Boost high IKER score vendors slightly
    score += v.ikerScore * 0.05;
    return { v, score };
  });

  // Return vendors that have ANY match; if none match fall back to top IKER vendors
  const matched = scored
    .filter(({ score }) => score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ v }) => vendorToAsk(v, true));

  if (matched.length > 0) return matched;

  // Fallback: top El Paso vendors by IKER score (always show something)
  return allVendors
    .sort((a, b) => b.ikerScore - a.ikerScore)
    .slice(0, 6)
    .map((v) => vendorToAsk(v, true));
}

function buildGlobalVendors(companies: CompanyEntry[], query: string): AskVendor[] {
  const keywords = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);

  // Score curated GLOBAL_VENDORS by query keyword relevance
  const scored = Object.values(GLOBAL_VENDORS)
    .map((v) => {
      const text = `${v.description} ${v.tags.join(' ')} ${v.category} ${v.name}`.toLowerCase();
      const score = keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 2 : 0), 0);
      return { v, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.v.ikerScore - a.v.ikerScore);

  const profileConverted: AskVendor[] = companies.slice(0, 6).map((c) => ({
    id: c.id, name: c.name, website: c.website, category: c.category,
    tags: c.tags, iker_score: c.iker_score,
    logo_url: getCompanyLogoUrl(c.name, c.website),
    is_local: false, description: '', phone: null, address: null,
    sentiment: 'neutral', is_hiring: false, has_recent_funding: false,
  }));

  const curatedConverted = scored.slice(0, 12).map(({ v }) => vendorToAsk(v, false));

  const merged: AskVendor[] = [];
  const seen = new Set<string>();
  for (const v of [...curatedConverted, ...profileConverted]) {
    const key = v.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(v);
    if (merged.length >= 18) break;
  }
  return merged;
}

function buildRichTimeline(slug: string, liveResult: LiveSearchResult): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // 1. Curated trajectory milestones for this industry
  const trajectory = INDUSTRY_TRAJECTORIES[slug];
  if (trajectory) {
    for (const m of trajectory.milestones) {
      events.push({
        date: `${m.year}-01-01`,
        title: m.title,
        company: m.companies[0] ?? null,
        type: m.isInflection ? 'milestone' : m.status === 'future' ? 'forecast' : 'case_study',
        url: null,
        source: null,
        importance: m.isInflection ? 1.0 : 0.6,
      });
    }
  }

  // 2. Live patents as timeline events
  for (const p of liveResult.patents.slice(0, 6)) {
    events.push({
      date: p.date,
      title: `Patent: ${p.title}`,
      company: p.assignee || null,
      type: 'patent_filing',
      url: p.url,
      source: 'PatentsView',
      importance: 0.7,
    });
  }

  // 3. Live research papers
  for (const r of liveResult.research.slice(0, 5)) {
    events.push({
      date: `${r.year}-01-01`,
      title: r.title,
      company: r.authors[0] ?? null,
      type: 'research_paper',
      url: r.url,
      source: r.source,
      importance: 0.5,
    });
  }

  // 4. Funding events
  for (const f of liveResult.funding.slice(0, 4)) {
    events.push({
      date: f.date,
      title: `${f.company} raised ${f.amount} ${f.round}`,
      company: f.company,
      type: 'funding_round',
      url: null,
      source: f.source,
      importance: 0.8,
    });
  }

  // Sort chronologically
  return events
    .filter((e) => e.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 25);
}

// ─── Convert live search companies to vendors ───────────────────────────────

function liveCompaniesToVendors(liveResult: LiveSearchResult): AskVendor[] {
  return liveResult.companies.slice(0, 15).map((c, i) => ({
    id: `live-${i}-${c.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: c.name,
    website: '',
    category: liveResult.inferred.related_industries[0] ?? 'Technology',
    tags: [
      `${c.mentions} mentions`,
      ...(c.isHiring ? ['HIRING'] : []),
      ...(c.hasRecentFunding ? ['FUNDED'] : []),
    ],
    iker_score: Math.min(95, 50 + c.mentions * 8),
    logo_url: getCompanyLogoUrl(c.name),
    is_local: false,
    description: c.context,
    phone: null,
    address: null,
    sentiment: c.sentiment,
    is_hiring: c.isHiring,
    has_recent_funding: c.hasRecentFunding,
  }));
}

// ─── Convert live articles to signals ───────────────────────────────────────

function liveArticlesToSignals(liveResult: LiveSearchResult): AskSignal[] {
  return liveResult.articles.slice(0, 15).map(a => ({
    title: a.title,
    url: a.url,
    source: a.source,
    type: 'news',
    discovered_at: a.publishedAt,
    importance: a.relevanceScore,
  }));
}

// ─── Best-Industry Matching ─────────────────────────────────────────────────────

function findBestIndustryMatch(query: string, liveResult?: LiveSearchResult): { slug: string; label: string } | null {
  const lower = query.toLowerCase();
  const keywords = lower.split(/\s+/).filter((w) => w.length >= 3);
  if (keywords.length === 0) return null;

  const liveIndustries = liveResult?.inferred.related_industries ?? [];
  const scores: Array<{ slug: string; label: string; score: number }> = [];
  const allVendors = Object.values(EL_PASO_VENDORS);

  for (const ind of INDUSTRIES) {
    let score = 0;
    const catVendors = CATEGORY_TO_VENDOR_CATS[ind.category] ?? [];

    for (const li of liveIndustries) {
      if (li.toLowerCase().includes(ind.slug) || ind.label.toLowerCase().includes(li.toLowerCase().split('/')[0].trim())) {
        score += 10;
      }
    }

    for (const v of allVendors) {
      if (!catVendors.includes(v.category)) continue;
      const text = `${v.description} ${v.tags.join(' ')}`.toLowerCase();
      for (const kw of keywords) { if (text.includes(kw)) score += 2; }
    }

    for (const p of PRODUCT_CATALOG) {
      const pText = `${p.industries.join(' ')} ${p.description} ${p.tags.join(' ')}`.toLowerCase();
      if (!pText.includes(ind.slug) && !p.industries.some(pi => pi.toLowerCase().includes(ind.slug))) continue;
      for (const kw of keywords) { if (pText.includes(kw)) score += 1; }
    }

    const descText = (ind.description ?? '').toLowerCase();
    for (const kw of keywords) { if (descText.includes(kw)) score += 3; }

    if (score > 0) scores.push({ slug: ind.slug, label: ind.label, score });
  }

  scores.sort((a, b) => b.score - a.score);
  return scores.length > 0 ? scores[0] : null;
}

// ─── Synthesis Helpers ───────────────────────────────────────────────────────────

function buildExpertBrief(
  query: string,
  liveResult: LiveSearchResult,
  profileExplanation: { what_it_does: string; why_it_matters: string[]; outlook: string | null },
): ExpertBrief {
  void query;

  const headline =
    liveResult.wikipedia?.description ||
    liveResult.inferred.what_it_is ||
    profileExplanation.what_it_does;

  const key_insight =
    liveResult.inferred.key_trends[0] ||
    (liveResult.companies.length > 0
      ? `${liveResult.companies[0].name} leads with ${liveResult.companies[0].mentions} mentions across ${liveResult.summary.total_sources_checked} sources`
      : `Scanning ${liveResult.summary.total_sources_checked} sources found ${liveResult.summary.total_articles_found} relevant articles`);

  const articleCount = liveResult.summary.total_articles_found;
  const market_momentum: ExpertBrief['market_momentum'] =
    articleCount >= 40 ? 'surging'
    : articleCount >= 20 ? 'growing'
    : articleCount >= 8 ? 'stable'
    : articleCount >= 3 ? 'emerging'
    : 'declining';

  const patents = liveResult.patents;
  const recentPatents = patents.filter((p) => {
    const year = parseInt(p.date.slice(0, 4), 10);
    return year >= 2023;
  }).length;
  const maturity: ExpertBrief['maturity'] =
    patents.length === 0 ? 'nascent'
    : recentPatents > patents.length * 0.7 ? 'emerging'
    : recentPatents > patents.length * 0.4 ? 'growth'
    : 'mature';

  const riskCount =
    liveResult.inferred.risk_signals.length + liveResult.inferred.regulatory_signals.length;
  const risk_level: ExpertBrief['risk_level'] =
    riskCount >= 5 ? 'high' : riskCount >= 2 ? 'moderate' : 'low';

  const data_depth = Math.min(
    100,
    Math.round(
      articleCount * 1.5 +
        liveResult.companies.length * 3 +
        patents.length * 4 +
        liveResult.research.length * 3 +
        liveResult.grants.length * 5 +
        liveResult.contracts.length * 5 +
        (liveResult.wikipedia ? 10 : 0),
    ),
  );

  const bullet_points: string[] = [];

  if (liveResult.wikipedia) {
    const firstSentence = liveResult.wikipedia.extract.split('.')[0];
    if (firstSentence && firstSentence.length > 20) bullet_points.push(firstSentence + '.');
  }

  if (liveResult.inferred.market_sizes.length > 0) {
    bullet_points.push(`Market size: ${liveResult.inferred.market_sizes[0]}`);
  }

  if (liveResult.inferred.growth_rates.length > 0) {
    bullet_points.push(`Growth: ${liveResult.inferred.growth_rates[0]}`);
  }

  if (liveResult.companies.length > 0) {
    const top3 = liveResult.companies.slice(0, 3).map((c) => c.name).join(', ');
    bullet_points.push(`Key players: ${top3}`);
  }

  if (patents.length > 0) {
    const topAssignees = Array.from(
      new Set(patents.map((p) => p.assignee).filter(Boolean)),
    ).slice(0, 3) as string[];
    if (topAssignees.length > 0) bullet_points.push(`Active patent holders: ${topAssignees.join(', ')}`);
  }

  if (liveResult.funding.length > 0) {
    const totalFunding = liveResult.funding
      .slice(0, 3)
      .map((f) => `${f.company} (${f.amount})`)
      .join(', ');
    bullet_points.push(`Recent funding: ${totalFunding}`);
  }

  if (liveResult.inferred.risk_signals.length > 0) {
    bullet_points.push(`Top risk: ${liveResult.inferred.risk_signals[0]}`);
  }

  if (bullet_points.length < 4) {
    for (const point of profileExplanation.why_it_matters) {
      if (bullet_points.length >= 6) break;
      bullet_points.push(point);
    }
  }

  return {
    headline,
    key_insight,
    market_momentum,
    maturity,
    risk_level,
    data_depth,
    bullet_points: bullet_points.slice(0, 6),
  };
}

function buildKeyPlayers(liveResult: LiveSearchResult): KeyPlayer[] {
  const playerMap = new Map<string, KeyPlayer>();

  for (const c of liveResult.companies) {
    playerMap.set(c.name.toLowerCase(), {
      name: c.name,
      role: c.mentions >= 5 ? 'leader' : c.mentions >= 3 ? 'challenger' : 'emerging',
      mentions: c.mentions,
      sentiment: c.sentiment,
      badges: [
        ...(c.isHiring ? ['HIRING'] : []),
        ...(c.hasRecentFunding ? ['FUNDED'] : []),
      ],
      context: c.context,
      momentum_score: Math.min(
        100,
        c.mentions * 15 + (c.isHiring ? 10 : 0) + (c.hasRecentFunding ? 15 : 0),
      ),
    });
  }

  for (const p of liveResult.patents) {
    if (!p.assignee) continue;
    const key = p.assignee.toLowerCase();
    const existing = playerMap.get(key);
    if (existing) {
      if (!existing.badges.includes('PATENTED')) existing.badges.push('PATENTED');
      existing.momentum_score = Math.min(100, existing.momentum_score + 10);
    } else {
      playerMap.set(key, {
        name: p.assignee,
        role: 'niche',
        mentions: 1,
        sentiment: 'neutral',
        badges: ['PATENTED'],
        context: `Patent: ${p.title}`,
        momentum_score: 30,
      });
    }
  }

  for (const c of liveResult.contracts) {
    if (!c.vendor) continue;
    const key = c.vendor.toLowerCase();
    const existing = playerMap.get(key);
    if (existing) {
      if (!existing.badges.includes('GOV_CONTRACT')) existing.badges.push('GOV_CONTRACT');
      existing.momentum_score = Math.min(100, existing.momentum_score + 10);
    }
  }

  for (const f of liveResult.funding) {
    const key = f.company.toLowerCase();
    const existing = playerMap.get(key);
    if (existing && !existing.badges.includes('FUNDED')) {
      existing.badges.push('FUNDED');
      existing.momentum_score = Math.min(100, existing.momentum_score + 15);
    }
  }

  return Array.from(playerMap.values() as Iterable<KeyPlayer>)
    .sort((a, b) => b.momentum_score - a.momentum_score)
    .slice(0, 15);
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'from', 'this', 'are', 'was', 'were', 'been',
  'have', 'has', 'had', 'not', 'but', 'its', 'all', 'can', 'may', 'will', 'use',
  'using', 'used', 'new', 'based', 'system', 'method', 'methods', 'approach', 'study',
  'results', 'analysis', 'data', 'high', 'low', 'first', 'also', 'than', 'more',
  'other', 'between', 'which', 'their', 'these', 'each', 'such', 'into', 'over',
  'through', 'about', 'most', 'some', 'very', 'after', 'before', 'both', 'same',
  'article', 'research', 'paper', 'patent', 'grant', 'federal', 'united', 'states',
]);

function buildTechLandscape(liveResult: LiveSearchResult): TechTheme[] {
  type WordEntry = { count: number; sources: Set<string>; companies: Set<string> };
  const wordCounts = new Map<string, WordEntry>();

  for (const p of liveResult.patents) {
    const words = p.title
      .toLowerCase()
      .split(/[\s\-\/,]+/)
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
    for (const w of words) {
      const entry: WordEntry = wordCounts.get(w) ?? { count: 0, sources: new Set(), companies: new Set() };
      entry.count++;
      entry.sources.add('patent');
      if (p.assignee) entry.companies.add(p.assignee);
      wordCounts.set(w, entry);
    }
  }

  for (const r of liveResult.research) {
    const text = `${r.title} ${r.abstract}`.toLowerCase();
    const words = text
      .split(/[\s\-\/,]+/)
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
    for (const w of words) {
      const entry: WordEntry = wordCounts.get(w) ?? { count: 0, sources: new Set(), companies: new Set() };
      entry.count++;
      entry.sources.add('research');
      wordCounts.set(w, entry);
    }
  }

  for (const a of liveResult.articles.slice(0, 30)) {
    const words = a.title
      .toLowerCase()
      .split(/[\s\-\/,]+/)
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
    for (const w of words) {
      const entry: WordEntry = wordCounts.get(w) ?? { count: 0, sources: new Set(), companies: new Set() };
      entry.count++;
      entry.sources.add('news');
      wordCounts.set(w, entry);
    }
  }

  for (const g of liveResult.grants) {
    const words = g.title
      .toLowerCase()
      .split(/[\s\-\/,]+/)
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
    for (const w of words) {
      const entry: WordEntry = wordCounts.get(w) ?? { count: 0, sources: new Set(), companies: new Set() };
      entry.count++;
      entry.sources.add('grant');
      wordCounts.set(w, entry);
    }
  }

  return Array.from(wordCounts.entries() as Iterable<[string, WordEntry]>)
    .filter(([, v]) => v.count >= 3)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([word, data]) => ({
      keyword: word,
      frequency: data.count,
      sources: Array.from(data.sources as Iterable<string>),
      maturity: (data.sources.has('patent') && data.sources.has('news')
        ? 'mature'
        : data.sources.has('research')
          ? 'emerging'
          : 'growing') as TechTheme['maturity'],
      companies: Array.from(data.companies as Iterable<string>).slice(0, 3),
    }));
}

function buildInnovationPipeline(liveResult: LiveSearchResult): InnovationPipeline {
  const researched: InnovationItem[] = liveResult.research.slice(0, 8).map((r) => ({
    title: r.title,
    entity: r.authors[0] ?? r.source,
    date: String(r.year),
    url: r.url,
  }));

  const patented: InnovationItem[] = liveResult.patents.slice(0, 8).map((p) => ({
    title: p.title,
    entity: p.assignee,
    date: p.date,
    url: p.url,
  }));

  const funded: InnovationItem[] = liveResult.grants.slice(0, 8).map((g) => ({
    title: g.title,
    entity: g.agency,
    date: g.deadline,
    url: g.url,
  }));

  const contracted: InnovationItem[] = liveResult.contracts.slice(0, 8).map((c) => ({
    title: c.title,
    entity: c.vendor || c.agency,
    date: c.date,
    url: c.url,
  }));

  const gaps: string[] = [];
  if (researched.length > 0 && patented.length === 0) {
    gaps.push('Active research but no patents found — potential IP opportunity');
  }
  if (patented.length > 0 && funded.length === 0) {
    gaps.push('Patents filed but no government grants — potential funding gap');
  }
  if (funded.length > 0 && contracted.length === 0) {
    gaps.push('Government grants awarded but no contracts — market not yet mature');
  }
  if (researched.length === 0 && patented.length > 0) {
    gaps.push('Patents without recent research — technology may be established');
  }

  return { researched, patented, funded, contracted, gaps };
}

// ─── Main Assembler ─────────────────────────────────────────────────────────────

export async function assembleAskResponse(query: string): Promise<AskResponse> {
  const resolved = await resolveQueryToSlug(query);
  const { slug, label } = resolved;
  const isKnown = INDUSTRIES.some((i) => i.slug === slug);

  // ── ALL data sources in parallel ──
  const [profile, allSignals, liveResult] = await Promise.all([
    buildIndustryProfile(isKnown ? slug : 'general'),
    getIntelSignals({ limit: 200 }),
    liveSearch(query),
  ]);

  // Find best industry match using live search intelligence
  let fallbackSlug: string | null = null;
  let profileSlug = slug;

  if (!isKnown) {
    const bestMatch = findBestIndustryMatch(query, liveResult);
    if (bestMatch) {
      fallbackSlug = bestMatch.slug;
      profileSlug = bestMatch.slug;
      const betterProfile = await buildIndustryProfile(profileSlug);
      Object.assign(profile, betterProfile);
    }
  }

  const feedStore = getStoredFeedItems();

  // ── Signals: merge live + DB + feed ──
  const dbSignals = filterSignalsForQuery(allSignals, query);
  const feedSignals = feedStore ? filterFeedForQuery(feedStore.items, query) : [];
  const liveSignalsList = liveArticlesToSignals(liveResult);
  const fallbackSignals = fallbackSlug && dbSignals.length < 3
    ? filterSignalsForQuery(allSignals, INDUSTRIES.find(i => i.slug === fallbackSlug)?.label ?? '')
    : [];

  const mergedSignals: AskSignal[] = [];
  const seenTitles = new Set<string>();
  for (const s of [...liveSignalsList, ...dbSignals, ...fallbackSignals, ...feedSignals]) {
    const key = s.title.toLowerCase().slice(0, 50);
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);
    mergedSignals.push(s);
    if (mergedSignals.length >= 20) break;
  }

  // ── Products + Costs ──
  let matchedProducts = filterProductsForQuery(query);
  if (matchedProducts.length === 0 && fallbackSlug) {
    matchedProducts = filterProductsForQuery(INDUSTRIES.find(i => i.slug === fallbackSlug)?.label ?? '');
  }
  const matchedFullProducts = PRODUCT_CATALOG.filter((p) => matchedProducts.some((mp) => mp.id === p.id));
  const costRanges = buildCostRanges(matchedFullProducts);

  // ── Vendors: merge live-discovered + profile + local ──
  const profileVendors = buildGlobalVendors(profile.blocks.companies, query);
  const liveVendors = liveCompaniesToVendors(liveResult);

  const globalVendors: AskVendor[] = [];
  const seenVendorNames = new Set<string>();
  for (const v of [...liveVendors, ...profileVendors]) {
    const key = v.name.toLowerCase();
    if (seenVendorNames.has(key)) continue;
    seenVendorNames.add(key);
    globalVendors.push(v);
    if (globalVendors.length >= 20) break;
  }

  let localVendors = buildLocalVendors(profileSlug, query);
  if (localVendors.length === 0 && fallbackSlug) {
    localVendors = buildLocalVendors(fallbackSlug, query);
  }

  // ── Section 1: What It Is — enriched with live data ──
  const whatItIs: WhatItIsSection = {
    summary: isKnown
      ? profile.blocks.explanation.what_it_does
      : liveResult.inferred.what_it_is || profile.blocks.explanation.what_it_does,
    key_points: liveResult.inferred.key_trends.length > 0
      ? liveResult.inferred.key_trends
      : (isKnown ? profile.blocks.explanation.why_it_matters : [
          `Scanned ${liveResult.summary.total_sources_checked} sources, found ${liveResult.summary.total_articles_found} articles`,
          ...(liveResult.inferred.related_industries.length > 0
            ? [`Related industries: ${liveResult.inferred.related_industries.join(', ')}`] : []),
          ...(liveResult.companies.length > 0
            ? [`Key companies: ${liveResult.companies.slice(0, 5).map(c => c.name).join(', ')}`] : []),
          ...profile.blocks.explanation.why_it_matters.slice(0, 2),
        ]),
    outlook: profile.blocks.explanation.outlook,
    market_data: liveResult.market_data,
  };

  // ── Expert Synthesis ──
  const expertBrief = buildExpertBrief(query, liveResult, profile.blocks.explanation);
  const keyPlayers = buildKeyPlayers(liveResult);
  const techLandscape = buildTechLandscape(liveResult);
  const innovationPipeline = buildInnovationPipeline(liveResult);

  // ── Confidence: boosted by live data ──
  const totalData = liveResult.summary.total_articles_found + liveResult.summary.total_patents_found + liveResult.summary.total_papers_found;
  const confidenceLevel = totalData >= 30 ? 3 : totalData >= 10 ? 2 : 1;
  const confidenceLabel = totalData >= 30 ? 'High Confidence — Live Intelligence'
    : totalData >= 10 ? 'Moderate — Live Intelligence' : 'Exploring — Limited Data';

  return {
    ok: true,
    query,
    slug,
    label,
    confidence: {
      ...profile.confidence,
      signal_count: profile.confidence.signal_count + liveResult.summary.total_articles_found,
      company_count: profile.confidence.company_count + liveResult.companies.length,
      level: Math.max(profile.confidence.level, confidenceLevel) as 1 | 2 | 3,
      label: confidenceLabel,
    },
    sections: {
      what_it_is: whatItIs,
      history: { events: buildRichTimeline(profileSlug, liveResult) },
      direction: {
        adoption_stage: profile.blocks.adoption.stage,
        adoption_label: profile.blocks.adoption.stage_label ?? profile.blocks.adoption.stage,
        momentum: liveResult.summary.total_articles_found >= 30 ? 'accelerating'
          : liveResult.summary.total_articles_found >= 15 ? 'growing'
          : liveResult.summary.total_articles_found >= 5 ? 'steady'
          : profile.blocks.snapshot.momentum,
        sentiment: liveResult.sentiment,
        opportunities: profile.blocks.opportunities,
      },
      costs: {
        ranges: costRanges,
        price_signals: liveResult.inferred.price_signals,
        market_sizes: liveResult.inferred.market_sizes,
        growth_rates: liveResult.inferred.growth_rates,
        funding_events: liveResult.funding,
      },
      global_vendors: { vendors: globalVendors },
      local_vendors: { vendors: localVendors },
      live_signals: { signals: mergedSignals },
      patents: { items: liveResult.patents },
      research: { papers: liveResult.research },
      grants: { items: liveResult.grants },
      contracts: { items: liveResult.contracts },
      geography: { breakdown: liveResult.geography },
      wikipedia: liveResult.wikipedia,
      expert_brief: expertBrief,
      key_players: keyPlayers,
      tech_landscape: techLandscape,
      innovation_pipeline: innovationPipeline,
    },
    products: matchedProducts,
    related_searches: liveResult.inferred.related_searches,
    risk_signals: liveResult.inferred.risk_signals,
    regulatory_signals: liveResult.inferred.regulatory_signals,
    hiring_signals: liveResult.inferred.hiring_signals,
    live_search: {
      sources_checked: liveResult.summary.total_sources_checked,
      articles_found: liveResult.summary.total_articles_found,
      companies_discovered: liveResult.companies.length,
      patents_found: liveResult.summary.total_patents_found,
      papers_found: liveResult.summary.total_papers_found,
      grants_found: liveResult.summary.total_grants_found,
      contracts_found: liveResult.summary.total_contracts_found,
      top_sources: liveResult.summary.top_sources,
      freshest_article: liveResult.summary.freshest_article,
      duration_ms: liveResult.duration_ms,
    },
    generated_at: new Date().toISOString(),
  };
}
