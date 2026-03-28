import { NextRequest, NextResponse } from 'next/server';
import {
  getAllMarketplaceProductsWithVendors,
  filterProducts,
  sortProducts,
  computeFacets,
} from '@/lib/data/marketplace-adapter';
import type { MarketplaceFilters, SortKey } from '@/types/marketplace';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const filters: MarketplaceFilters = {
    search: sp.get('search') ?? undefined,
    industries: sp.get('industries')?.split(',').filter(Boolean),
    priceEstimate: sp.get('priceEstimate')?.split(',').filter(Boolean) as MarketplaceFilters['priceEstimate'],
    maturity: sp.get('maturity')?.split(',').filter(Boolean) as MarketplaceFilters['maturity'],
    implementationSpeed: sp.get('implementationSpeed')?.split(',').filter(Boolean) as MarketplaceFilters['implementationSpeed'],
  };

  const sortKey = (sp.get('sort') ?? 'nxt-recommended') as SortKey;
  const limit = Math.min(Number(sp.get('limit')) || 50, 200);
  const offset = Number(sp.get('offset')) || 0;

  const all = await getAllMarketplaceProductsWithVendors();
  const filtered = filterProducts(all, filters);
  const facets = computeFacets(filtered);
  const sorted = sortProducts(filtered, sortKey);
  const page = sorted.slice(offset, offset + limit);

  return NextResponse.json({
    products: page,
    total: filtered.length,
    facets,
  });
}
