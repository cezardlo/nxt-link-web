// src/lib/engines/ask-engine.ts
// Ask Engine — assembles the 7-section intelligence response for /api/ask.
// No LLM calls — pure data assembly from existing engines + static catalogs.

import { buildIndustryProfile } from '@/lib/engines/industry-profile';
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

// ─── Response Types ─────────────────────────────────────────────────────────────

export type WhatItIsSection = {
  summary: string;
  key_points: string[];
  outlook: string | null;
};

export type HistorySection = {
  events: TimelineEvent[];
};

export type DirectionSection = {
  adoption_stage: string;
  adoption_label: string;
  momentum: string;
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
  };
  products: AskProduct[];
  generated_at: string;
};

// ─── Query → Slug Resolution ───────────────────────────────────────────────────

export async function resolveQueryToSlug(
  query: string,
): Promise<{ slug: string; label: string }> {
  const lower = query.toLowerCase().trim();

  // 1. Check static INDUSTRIES list first (fastest)
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

  // 2. Try KG industry search (Supabase)
  const kgMatches = await searchKgIndustries(query, 5);
  if (kgMatches.length > 0) {
    return { slug: kgMatches[0].slug, label: kgMatches[0].name };
  }

  // 3. Fallback: slugify the query
  const slug = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const label = query
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { slug, label };
}

// ─── Signal Filtering ───────────────────────────────────────────────────────────

export function filterSignalsForQuery(
  signals: IntelSignalRow[],
  query: string,
): AskSignal[] {
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  return signals
    .filter((s) => {
      const text =
        `${s.title} ${s.industry} ${s.company ?? ''} ${(s.tags ?? []).join(' ')}`.toLowerCase();
      return keywords.some((kw) => text.includes(kw));
    })
    .slice(0, 5)
    .map((s) => ({
      title: s.title,
      url: s.url,
      source: s.source,
      type: s.signal_type,
      discovered_at: s.discovered_at,
      importance: s.importance_score,
    }));
}

export function filterFeedForQuery(
  items: EnrichedFeedItem[],
  query: string,
): AskSignal[] {
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  return items
    .filter((item) => {
      const text =
        `${item.title} ${item.description} ${item.category}`.toLowerCase();
      return keywords.some((kw) => text.includes(kw));
    })
    .sort(
      (a, b) =>
        new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
    )
    .slice(0, 5)
    .map((item) => ({
      title: item.title,
      url: item.link,
      source: item.source,
      type: 'news',
      discovered_at: item.pubDate,
      importance: item.score / 10,
    }));
}

// ─── Product Filtering ──────────────────────────────────────────────────────────

export function filterProductsForQuery(query: string): AskProduct[] {
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  return PRODUCT_CATALOG.filter((p) => {
    const text =
      `${p.name} ${p.company} ${p.category} ${p.description} ${p.industries.join(' ')} ${p.tags.join(' ')}`.toLowerCase();
    return keywords.some((kw) => text.includes(kw));
  })
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      name: p.name,
      company: p.company,
      category: p.category,
      description: p.description,
      price_estimate: p.priceEstimate,
      price_range: p.priceRange,
      logo_url: getCompanyLogoUrl(p.company),
      recommendation_score: p.recommendationScore,
      maturity: p.maturity,
      momentum: p.momentum,
    }));
}

// ─── Cost Ranges ────────────────────────────────────────────────────────────────

export function buildCostRanges(products: Product[]): CostRange[] {
  const tiers: Record<
    string,
    { label: string; products: string[]; ranges: string[] }
  > = {
    budget: { label: 'Budget', products: [], ranges: [] },
    mid: { label: 'Mid-Market', products: [], ranges: [] },
    enterprise: { label: 'Enterprise', products: [], ranges: [] },
  };

  for (const p of products) {
    const tier =
      p.priceEstimate === 'low'
        ? 'budget'
        : p.priceEstimate === 'medium'
          ? 'mid'
          : 'enterprise';
    tiers[tier].products.push(p.name);
    if (p.priceRange) tiers[tier].ranges.push(p.priceRange);
  }

  return (Object.entries(tiers) as Array<[string, { label: string; products: string[]; ranges: string[] }]>)
    .filter(([, v]) => v.products.length > 0)
    .map(([key, v]) => ({
      tier: key as 'budget' | 'mid' | 'enterprise',
      label: v.label,
      range:
        v.ranges[0] ??
        (key === 'budget'
          ? '<$10K/yr'
          : key === 'mid'
            ? '$10K–$100K/yr'
            : '$100K+/yr'),
      products: v.products,
    }));
}

// ─── Vendor Builders ────────────────────────────────────────────────────────────

const CATEGORY_TO_VENDOR_CATS: Record<string, string[]> = {
  'AI/ML': ['AI / ML', 'IoT', 'Analytics', 'AI/R&D'],
  Cybersecurity: ['Cybersecurity'],
  Defense: ['Defense', 'Defense IT'],
  'Border Tech': ['Border Tech'],
  Manufacturing: [
    'Manufacturing',
    'Robotics',
    'Fabrication',
    'Warehousing',
    'Robotics & Automation',
    'Warehouse Automation',
  ],
  Energy: ['Energy', 'Water Tech', 'Energy Tech'],
  Healthcare: ['Health Tech', 'Healthcare'],
  Logistics: [
    'Logistics',
    'Warehousing',
    'Trucking',
    'Supply Chain Software',
  ],
};

function vendorToAsk(v: VendorRecord, isLocal: boolean): AskVendor {
  return {
    id: v.id,
    name: v.name,
    website: v.website,
    category: v.category,
    tags: v.tags,
    iker_score: v.ikerScore,
    logo_url: getCompanyLogoUrl(v.name, v.website),
    is_local: isLocal,
    description: v.description,
    phone: null,
    address: null,
  };
}

export function buildLocalVendors(slug: string, query: string): AskVendor[] {
  const allVendors = Object.values(EL_PASO_VENDORS);
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  const industry = INDUSTRIES.find((i) => i.slug === slug);
  const catMatch = CATEGORY_TO_VENDOR_CATS[industry?.category ?? ''] ?? [];

  const matches = allVendors.filter((v) => {
    if (catMatch.includes(v.category)) return true;
    const text =
      `${v.description} ${v.tags.join(' ')} ${v.category}`.toLowerCase();
    return keywords.some((kw) => text.includes(kw));
  });

  return matches
    .sort((a, b) => b.ikerScore - a.ikerScore)
    .slice(0, 10)
    .map((v) => vendorToAsk(v, true));
}

export function buildGlobalVendors(companies: CompanyEntry[]): AskVendor[] {
  return companies.slice(0, 12).map((c) => ({
    id: c.id,
    name: c.name,
    website: c.website,
    category: c.category,
    tags: c.tags,
    iker_score: c.iker_score,
    logo_url: getCompanyLogoUrl(c.name, c.website),
    is_local: false,
    description: '',
    phone: null,
    address: null,
  }));
}

// ─── Main Assembler ─────────────────────────────────────────────────────────────

export async function assembleAskResponse(
  query: string,
): Promise<AskResponse> {
  const { slug, label } = await resolveQueryToSlug(query);

  // Parallel data fetch
  const [profile, allSignals] = await Promise.all([
    buildIndustryProfile(slug),
    getIntelSignals({ limit: 200 }),
  ]);

  const feedStore = getStoredFeedItems();

  // Section 7: Live Signals — try DB signals first, fall back to feed items
  const dbSignals = filterSignalsForQuery(allSignals, query);
  const feedSignals = feedStore
    ? filterFeedForQuery(feedStore.items, query)
    : [];
  const liveSignals = dbSignals.length >= 3 ? dbSignals : feedSignals;

  // Products + Section 4: Costs
  const matchedProducts = filterProductsForQuery(query);
  const matchedFullProducts = PRODUCT_CATALOG.filter((p) =>
    matchedProducts.some((mp) => mp.id === p.id),
  );
  const costRanges = buildCostRanges(matchedFullProducts);

  // Section 5 & 6: Vendors
  const globalVendors = buildGlobalVendors(profile.blocks.companies);
  const localVendors = buildLocalVendors(slug, query);

  return {
    ok: true,
    query,
    slug,
    label,
    confidence: profile.confidence,
    sections: {
      what_it_is: {
        summary: profile.blocks.explanation.what_it_does,
        key_points: profile.blocks.explanation.why_it_matters,
        outlook: profile.blocks.explanation.outlook,
      },
      history: {
        events: profile.blocks.timeline.slice(0, 10),
      },
      direction: {
        adoption_stage: profile.blocks.adoption.stage,
        adoption_label: profile.blocks.adoption.stage_label ?? profile.blocks.adoption.stage,
        momentum: profile.blocks.snapshot.momentum,
        opportunities: profile.blocks.opportunities,
      },
      costs: { ranges: costRanges },
      global_vendors: { vendors: globalVendors },
      local_vendors: { vendors: localVendors },
      live_signals: { signals: liveSignals },
    },
    products: matchedProducts,
    generated_at: new Date().toISOString(),
  };
}
