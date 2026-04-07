'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductMarketCard } from '@/components/marketplace/ProductMarketCard';
import { FilterSidebar } from '@/components/marketplace/FilterSidebar';
import { SortBar } from '@/components/marketplace/SortBar';
import type { MarketplaceProduct, MarketplaceFilters, SortKey, Facets } from '@/types/marketplace';
import Link from 'next/link';
import { PageTransition } from '@/components/PageTransition';

const PAGE_SIZE = 24;

function ProductsInner() {
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<Facets>({
    industries: {},
    priceEstimate: {},
    maturity: {},
    implementationSpeed: {},
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [sortKey, setSortKey] = useState<SortKey>('nxt-recommended');
  const [filters, setFilters] = useState<MarketplaceFilters>({});

  // Compare state (lightweight — no hook needed on list page)
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : prev.length < 4 ? [...prev, id] : prev,
    );
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filters.industries?.length) params.set('industries', filters.industries.join(','));
    if (filters.priceEstimate?.length) params.set('priceEstimate', filters.priceEstimate.join(','));
    if (filters.maturity?.length) params.set('maturity', filters.maturity.join(','));
    if (filters.implementationSpeed?.length) params.set('implementationSpeed', filters.implementationSpeed.join(','));
    params.set('sort', sortKey);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(page * PAGE_SIZE));

    try {
      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      setProducts(data.products);
      setTotal(data.total);
      setFacets(data.facets);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [search, filters, sortKey, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset page on filter/sort change
  useEffect(() => {
    setPage(0);
  }, [search, filters, sortKey]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const nxtPickCount = products.filter((p) => p.isNxtPick).length;

  return (
    <div className="min-h-screen bg-nxt-bg pb-24">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
        <h1 className="font-grotesk text-2xl font-bold text-nxt-text tracking-tight mb-1">
          Product Marketplace
        </h1>
        <p className="font-mono text-[11px] text-nxt-dim">
          Supply chain intelligence across {total} products
        </p>

        <Link href="/vendors" className="font-mono text-[9px] text-nxt-accent uppercase tracking-wider hover:text-nxt-accent-light transition-colors">
          View Vendor Directory →
        </Link>

        {/* Stats bar */}
        <div className="flex items-center gap-4 mt-4">
          <span className="font-mono text-[9px] text-nxt-dim uppercase tracking-wider">
            {total} products
          </span>
          <span className="font-mono text-[9px] text-nxt-gold/50 uppercase tracking-wider">
            {nxtPickCount} nxt picks
          </span>
          {compareIds.length > 0 && (
            <Link
              href={`/products/compare?ids=${compareIds.join(',')}`}
              className="font-mono text-[9px] text-nxt-cyan uppercase tracking-wider hover:underline"
            >
              Compare {compareIds.length} products &rarr;
            </Link>
          )}
        </div>
      </div>

      {/* Search + Sort */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <svg
            viewBox="0 0 24 24"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nxt-dim"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx={11} cy={11} r={8} />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, vendors, technologies..."
            className="w-full pl-9 pr-4 py-2 bg-white/[0.02] border border-white/[0.06] rounded-sm font-mono text-[11px] text-nxt-secondary placeholder:text-nxt-dim focus:outline-none focus:border-nxt-cyan/30 transition-colors"
          />
        </div>
        <SortBar active={sortKey} onChange={setSortKey} />
      </div>

      {/* Main area */}
      <div className="flex">
        <FilterSidebar
          facets={facets}
          filters={filters}
          onChange={setFilters}
        />

        <div className="flex-1 p-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="h-64 bg-nxt-card border border-white/[0.06] rounded-sm animate-pulse"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <span className="font-mono text-[12px] text-nxt-dim">
                No products match your filters
              </span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {products.map((p) => (
                  <ProductMarketCard
                    key={p.id}
                    product={p}
                    onCompareToggle={toggleCompare}
                    isComparing={compareIds.includes(p.id)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="font-mono text-[10px] px-3 py-1.5 border border-white/[0.06] rounded-sm text-nxt-dim hover:text-nxt-muted disabled:opacity-30 transition-colors"
                  >
                    Prev
                  </button>
                  <span className="font-mono text-[10px] text-nxt-dim">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="font-mono text-[10px] px-3 py-1.5 border border-white/[0.06] rounded-sm text-nxt-dim hover:text-nxt-muted disabled:opacity-30 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <PageTransition>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <span className="font-mono text-[11px] text-nxt-dim animate-pulse">
              Loading marketplace...
            </span>
          </div>
        }
      >
        <ProductsInner />
      </Suspense>
    </PageTransition>
  );
}
