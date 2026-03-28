'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ComparisonTable } from '@/components/marketplace/ComparisonTable';
import type { MarketplaceProduct } from '@/types/marketplace';

function CompareInner() {
  const searchParams = useSearchParams();
  const ids = (searchParams.get('ids') ?? '').split(',').filter(Boolean);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    Promise.all(
      ids.map((id) =>
        fetch(`/api/products/${id}`)
          .then((r) => r.json())
          .then((d) => d.product as MarketplaceProduct | null),
      ),
    ).then((results) => {
      setProducts(results.filter(Boolean) as MarketplaceProduct[]);
      setLoading(false);
    });
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="font-mono text-[11px] text-white/20 animate-pulse">
          Loading comparison...
        </span>
      </div>
    );
  }

  if (products.length < 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <span className="font-mono text-[13px] text-white/30">
          Select at least 2 products to compare
        </span>
        <Link
          href="/products"
          className="font-mono text-[10px] text-[#00d4ff] hover:underline"
        >
          &larr; Back to marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 max-w-5xl mx-auto px-6">
      <div className="pt-6 pb-4">
        <Link
          href="/products"
          className="font-mono text-[9px] text-[#00d4ff]/60 hover:text-[#00d4ff] transition-colors uppercase tracking-wider"
        >
          &larr; Marketplace
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="font-mono text-[20px] font-bold text-white/90 mb-1">
          Compare Products
        </h1>
        <p className="font-mono text-[11px] text-white/30">
          {products.length} products side by side
        </p>
      </div>

      <ComparisonTable products={products} />
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <span className="font-mono text-[11px] text-white/20 animate-pulse">
            Loading comparison...
          </span>
        </div>
      }
    >
      <CompareInner />
    </Suspense>
  );
}
