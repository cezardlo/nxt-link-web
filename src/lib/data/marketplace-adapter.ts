// NXT//LINK Marketplace — data adapter merging both static catalogs

import { PRODUCT_CATALOG, type Product } from './product-catalog';
import { PRODUCTS_CATALOG, type CatalogProduct } from './products-catalog';
import type {
  MarketplaceProduct,
  MarketplaceFilters,
  SortKey,
  Facets,
  PriceEstimate,
  Maturity,
} from '@/types/marketplace';

// ── Normalizers ─────────────────────────────────────────────────────────────

function deriveNxtPick(score: number, momentum: string): boolean {
  return score >= 85 && momentum === 'rising';
}

export function normalizeRichProduct(p: Product): MarketplaceProduct {
  return {
    id: p.id,
    name: p.name,
    company: p.company,
    category: p.category,
    description: p.description,
    longDescription: p.longDescription,
    industries: p.industries,
    features: p.features,
    priceEstimate: p.priceEstimate,
    priceRange: p.priceRange ?? '',
    implementationDifficulty: p.implementationDifficulty,
    deploymentTimeline: p.deploymentTimeline,
    bestFor: p.bestFor,
    maturity: p.maturity,
    momentum: p.momentum,
    recommendationScore: p.recommendationScore,
    recommendationReason: p.recommendationReason,
    researchNotes: p.researchNotes,
    buyerInsight: p.buyerInsight,
    watchOutFor: p.watchOutFor,
    alternatives: p.alternatives,
    tags: p.tags,
    isNxtPick: deriveNxtPick(p.recommendationScore, p.momentum),
    source: 'rich',
  };
}

const COST_MAP: Record<string, PriceEstimate> = {
  'sensors': 'medium',
  'robotics': 'high',
  'machinery': 'enterprise',
  'software': 'medium',
  'ai-software': 'high',
  'security': 'high',
  'energy': 'enterprise',
  'communications': 'medium',
  'medical': 'enterprise',
  'infrastructure': 'enterprise',
};

const STAGE_TO_MATURITY: Record<string, Maturity> = {
  emerging: 'emerging',
  growing: 'growing',
  mature: 'mature',
  declining: 'mature',
};

export function normalizeSimpleProduct(p: CatalogProduct): MarketplaceProduct {
  const price = COST_MAP[p.category] ?? 'medium';
  const maturity = STAGE_TO_MATURITY[p.adoptionStage] ?? 'growing';
  const costStr = p.costRange
    ? `$${(p.costRange.min / 1000).toFixed(0)}K–$${(p.costRange.max / 1000).toFixed(0)}K`
    : '';

  return {
    id: p.id,
    name: p.name,
    company: p.vendor,
    category: p.category,
    description: p.description,
    longDescription: p.description,
    industries: [p.industry],
    features: p.requirements,
    priceEstimate: price,
    priceRange: costStr,
    implementationDifficulty: 'moderate',
    deploymentTimeline: p.roiEstimate,
    bestFor: p.targetCompanies.slice(0, 4),
    maturity,
    momentum: p.adoptionStage === 'emerging' ? 'rising' : 'stable',
    recommendationScore: 50,
    recommendationReason: p.problemSolved,
    researchNotes: '',
    buyerInsight: '',
    watchOutFor: [],
    alternatives: [],
    tags: p.tags,
    isNxtPick: false,
    source: 'simple',
  };
}

// ── Merge ───────────────────────────────────────────────────────────────────

let _cache: MarketplaceProduct[] | null = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getAllMarketplaceProducts(): MarketplaceProduct[] {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL_MS) return _cache;

  const seen = new Set<string>();
  const result: MarketplaceProduct[] = [];

  // Rich catalog wins on dedup
  for (const p of PRODUCT_CATALOG) {
    const mp = normalizeRichProduct(p);
    seen.add(mp.id);
    result.push(mp);
  }

  for (const p of PRODUCTS_CATALOG) {
    if (!seen.has(p.id)) {
      result.push(normalizeSimpleProduct(p));
      seen.add(p.id);
    }
  }

  _cache = result;
  _cacheTime = Date.now();
  return result;
}

/**
 * Async version that also merges enriched vendors from the DB.
 * Falls back to static-only if DB unavailable.
 */
export async function getAllMarketplaceProductsWithVendors(): Promise<MarketplaceProduct[]> {
  const staticProducts = getAllMarketplaceProducts();

  try {
    const { getVendorMarketplaceProducts } = await import(
      '@/lib/agents/agents/vendor-marketplace-sync'
    );
    const vendorProducts = await getVendorMarketplaceProducts();

    if (vendorProducts.length === 0) return staticProducts;

    // Merge — static products win on id collision
    const seen = new Set(staticProducts.map((p) => p.id));
    const merged = [...staticProducts];
    for (const vp of vendorProducts) {
      if (!seen.has(vp.id)) {
        merged.push(vp);
        seen.add(vp.id);
      }
    }
    return merged;
  } catch {
    return staticProducts;
  }
}

/** Invalidate the static cache (e.g. after vendor sync) */
export function invalidateMarketplaceCache(): void {
  _cache = null;
  _cacheTime = 0;
}

// ── Search ──────────────────────────────────────────────────────────────────

export function searchProducts(
  products: MarketplaceProduct[],
  query: string,
): MarketplaceProduct[] {
  if (!query.trim()) return products;
  const q = query.toLowerCase();
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.company.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q)) ||
      p.features.some((f) => f.toLowerCase().includes(q)) ||
      p.bestFor.some((b) => b.toLowerCase().includes(q)) ||
      p.industries.some((i) => i.toLowerCase().includes(q)),
  );
}

// ── Filter ──────────────────────────────────────────────────────────────────

export function filterProducts(
  products: MarketplaceProduct[],
  filters: MarketplaceFilters,
): MarketplaceProduct[] {
  let result = products;

  if (filters.search) {
    result = searchProducts(result, filters.search);
  }

  if (filters.industries?.length) {
    const set = new Set(filters.industries.map((i) => i.toLowerCase()));
    result = result.filter((p) =>
      p.industries.some((i) => set.has(i.toLowerCase())),
    );
  }

  if (filters.priceEstimate?.length) {
    const set = new Set(filters.priceEstimate);
    result = result.filter((p) => set.has(p.priceEstimate));
  }

  if (filters.maturity?.length) {
    const set = new Set(filters.maturity);
    result = result.filter((p) => set.has(p.maturity));
  }

  if (filters.implementationSpeed?.length) {
    const set = new Set(filters.implementationSpeed);
    result = result.filter((p) => set.has(p.implementationDifficulty));
  }

  return result;
}

// ── Sort ────────────────────────────────────────────────────────────────────

const MOMENTUM_BONUS: Record<string, number> = {
  rising: 30,
  stable: 15,
  declining: 0,
};

const MATURITY_BONUS: Record<string, number> = {
  mature: 25,
  growing: 15,
  emerging: 5,
};

const PRICE_ORDER: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  enterprise: 4,
};

const IMPL_ORDER: Record<string, number> = {
  easy: 1,
  moderate: 2,
  advanced: 3,
};

function nxtRecommendedScore(p: MarketplaceProduct): number {
  return (
    p.recommendationScore * 0.5 +
    (MOMENTUM_BONUS[p.momentum] ?? 15) * 0.3 +
    (MATURITY_BONUS[p.maturity] ?? 15) * 0.2
  );
}

export function sortProducts(
  products: MarketplaceProduct[],
  key: SortKey,
): MarketplaceProduct[] {
  const sorted = [...products];

  switch (key) {
    case 'best-rated':
      return sorted.sort((a, b) => b.recommendationScore - a.recommendationScore);
    case 'trending':
      return sorted.sort((a, b) => {
        const am = MOMENTUM_BONUS[a.momentum] ?? 0;
        const bm = MOMENTUM_BONUS[b.momentum] ?? 0;
        return bm - am || b.recommendationScore - a.recommendationScore;
      });
    case 'lowest-cost':
      return sorted.sort(
        (a, b) =>
          (PRICE_ORDER[a.priceEstimate] ?? 2) -
          (PRICE_ORDER[b.priceEstimate] ?? 2),
      );
    case 'fastest-impl':
      return sorted.sort(
        (a, b) =>
          (IMPL_ORDER[a.implementationDifficulty] ?? 2) -
          (IMPL_ORDER[b.implementationDifficulty] ?? 2),
      );
    case 'nxt-recommended':
    default:
      return sorted.sort(
        (a, b) => nxtRecommendedScore(b) - nxtRecommendedScore(a),
      );
  }
}

// ── Facets ──────────────────────────────────────────────────────────────────

export function computeFacets(products: MarketplaceProduct[]): Facets {
  const facets: Facets = {
    industries: {},
    priceEstimate: {},
    maturity: {},
    implementationSpeed: {},
  };

  for (const p of products) {
    for (const ind of p.industries) {
      facets.industries[ind] = (facets.industries[ind] ?? 0) + 1;
    }
    facets.priceEstimate[p.priceEstimate] =
      (facets.priceEstimate[p.priceEstimate] ?? 0) + 1;
    facets.maturity[p.maturity] = (facets.maturity[p.maturity] ?? 0) + 1;
    facets.implementationSpeed[p.implementationDifficulty] =
      (facets.implementationSpeed[p.implementationDifficulty] ?? 0) + 1;
  }

  return facets;
}
