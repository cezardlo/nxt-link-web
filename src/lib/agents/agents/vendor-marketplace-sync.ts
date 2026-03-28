// src/lib/agents/agents/vendor-marketplace-sync.ts
// Auto-syncs enriched vendors into the marketplace adapter.
// Converts EnrichedVendorRow → MarketplaceProduct so the marketplace
// grows automatically as new vendors are discovered and enriched.

import { getDb, isSupabaseConfigured } from '@/db/client';
import type { EnrichedVendorRow } from '@/db/queries/exhibitors';
import type { MarketplaceProduct, PriceEstimate, Maturity, Momentum } from '@/types/marketplace';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type SyncReport = {
  vendors_synced: number;
  marketplace_products_before: number;
  marketplace_products_after: number;
  duration_ms: number;
};

// ─── Conversion ─────────────────────────────────────────────────────────────────

const VENDOR_TYPE_TO_PRICE: Record<string, PriceEstimate> = {
  startup: 'medium',
  software: 'medium',
  services: 'medium',
  enterprise: 'enterprise',
  manufacturer: 'high',
  distributor: 'medium',
  robotics: 'high',
  unknown: 'medium',
};

function vendorToMarketplaceProduct(v: EnrichedVendorRow): MarketplaceProduct {
  const score = Math.round(v.confidence * 100);
  const price = VENDOR_TYPE_TO_PRICE[v.vendor_type] ?? 'medium';

  // Derive momentum from conference appearances
  const confCount = v.conference_sources?.length ?? 0;
  let momentum: Momentum = 'stable';
  if (confCount >= 3) momentum = 'rising';

  // Derive maturity from vendor type + products
  let maturity: Maturity = 'growing';
  if (v.vendor_type === 'enterprise' || (v.products?.length ?? 0) >= 5) maturity = 'mature';
  else if (v.vendor_type === 'startup') maturity = 'emerging';

  const isNxtPick = score >= 75 && momentum === 'rising';

  return {
    id: `ev-${v.id}`,
    name: v.products?.[0] ?? v.canonical_name,
    company: v.canonical_name,
    category: v.vendor_type,
    description: v.description || `${v.canonical_name} — discovered via conference intelligence`,
    longDescription: v.description || '',
    industries: v.industries ?? [],
    features: v.use_cases ?? [],
    priceEstimate: price,
    priceRange: '',
    implementationDifficulty: 'moderate',
    deploymentTimeline: '',
    bestFor: v.use_cases?.slice(0, 4) ?? [],
    maturity,
    momentum,
    recommendationScore: score,
    recommendationReason: v.description || '',
    researchNotes: v.conference_sources?.length
      ? `Discovered at: ${v.conference_sources.join(', ')}`
      : '',
    buyerInsight: '',
    watchOutFor: [],
    alternatives: [],
    tags: [...(v.technologies ?? []), ...(v.industries ?? [])],
    isNxtPick,
    source: 'rich',
  };
}

// ─── Sync Function ──────────────────────────────────────────────────────────────

// In-memory cache of vendor-derived marketplace products
let _vendorProducts: MarketplaceProduct[] = [];
let _lastSync = 0;
const SYNC_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get marketplace products derived from enriched vendors.
 * Cached for 5 minutes to avoid excessive DB reads.
 */
export async function getVendorMarketplaceProducts(): Promise<MarketplaceProduct[]> {
  if (Date.now() - _lastSync < SYNC_TTL_MS && _vendorProducts.length > 0) {
    return _vendorProducts;
  }

  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const { data } = await db
    .from('enriched_vendors')
    .select('*')
    .gte('confidence', 0.35) // Only show vendors scoring >= 35/100
    .order('confidence', { ascending: false })
    .limit(200);

  if (!data || data.length === 0) return [];

  _vendorProducts = (data as EnrichedVendorRow[]).map(vendorToMarketplaceProduct);
  _lastSync = Date.now();

  return _vendorProducts;
}

/** Force-refresh the vendor marketplace cache */
export function invalidateVendorCache(): void {
  _lastSync = 0;
  _vendorProducts = [];
}

/**
 * Full sync report — useful for monitoring.
 */
export async function runMarketplaceSync(): Promise<SyncReport> {
  const start = Date.now();
  invalidateVendorCache();
  const products = await getVendorMarketplaceProducts();

  return {
    vendors_synced: products.length,
    marketplace_products_before: 0, // set by caller
    marketplace_products_after: 0,  // set by caller
    duration_ms: Date.now() - start,
  };
}
