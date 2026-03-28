'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import type { MarketplaceProduct } from '@/types/marketplace';
import { categoryColor } from '@/lib/data/product-catalog';

const MOMENTUM_COLOR: Record<string, string> = {
  rising: '#00ff88',
  stable: '#ffb800',
  declining: '#ff3b30',
};

function Stars({ score }: { score: number }) {
  const stars = Math.round(score / 20);
  return (
    <span className="flex items-center gap-[1px]">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className="w-4 h-4"
          fill={i < stars ? '#ffd700' : '#ffffff10'}
        >
          <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.33L10 13.27l-4.77 2.5.91-5.33L2.27 6.62l5.34-.78L10 1z" />
        </svg>
      ))}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-mono text-[10px] tracking-[0.25em] text-white/30 uppercase mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<MarketplaceProduct | null>(null);
  const [alternatives, setAlternatives] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setProduct(data.product);
        setAlternatives(data.alternatives ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="font-mono text-[11px] text-white/20 animate-pulse">
          Loading product...
        </span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <span className="font-mono text-[13px] text-white/30">Product not found</span>
        <Link
          href="/products"
          className="font-mono text-[10px] text-[#00d4ff] hover:underline"
        >
          &larr; Back to marketplace
        </Link>
      </div>
    );
  }

  const accent = categoryColor(product.category);
  const momColor = MOMENTUM_COLOR[product.momentum] ?? '#ffb800';

  return (
    <div className="min-h-screen pb-24 max-w-4xl mx-auto px-6">
      {/* Breadcrumb */}
      <div className="pt-6 pb-4">
        <Link
          href="/products"
          className="font-mono text-[9px] text-[#00d4ff]/60 hover:text-[#00d4ff] transition-colors uppercase tracking-wider"
        >
          &larr; Marketplace
        </Link>
      </div>

      {/* Hero */}
      <div className="pb-6 mb-6 border-b border-white/[0.06]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <span
              className="font-mono text-[9px] tracking-[0.2em] uppercase"
              style={{ color: accent + '99' }}
            >
              {product.company}
            </span>
            <h1 className="font-mono text-[24px] font-bold text-white/95 mt-1 mb-2">
              {product.name}
            </h1>
            <div className="flex items-center gap-3 mb-3">
              <Stars score={product.recommendationScore} />
              <span className="font-mono text-[12px] font-semibold" style={{ color: accent }}>
                {product.recommendationScore}/100
              </span>
              <span
                className="font-mono text-[8px] tracking-[0.15em] px-2 py-0.5 rounded-sm border uppercase"
                style={{
                  color: momColor,
                  borderColor: momColor + '30',
                  backgroundColor: momColor + '08',
                }}
              >
                {product.momentum}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-[10px] text-white/40 px-2 py-1 border border-white/[0.06] rounded-sm uppercase">
                {product.priceEstimate}
              </span>
              {product.priceRange && (
                <span className="font-mono text-[10px] text-white/30">
                  {product.priceRange}
                </span>
              )}
              <span className="font-mono text-[10px] text-white/40 px-2 py-1 border border-white/[0.06] rounded-sm">
                {product.deploymentTimeline}
              </span>
            </div>
          </div>

          {product.isNxtPick && (
            <div className="px-3 py-1.5 rounded-sm bg-[#ffd700]/10 border border-[#ffd700]/30">
              <span className="font-mono text-[9px] tracking-[0.2em] text-[#ffd700] font-bold">
                NXT PICK
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <Section title="Overview">
        <p className="font-mono text-[12px] text-white/50 leading-[1.8]">
          {product.longDescription}
        </p>
      </Section>

      {/* Features */}
      {product.features.length > 0 && (
        <Section title="Features">
          <ul className="space-y-1.5">
            {product.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#00d4ff] mt-1 text-[8px]">&#9670;</span>
                <span className="font-mono text-[11px] text-white/45 leading-[1.6]">
                  {f}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Buyer Insight + Research Notes */}
      {(product.buyerInsight || product.researchNotes) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {product.buyerInsight && (
            <div className="p-4 bg-[#00d4ff]/[0.03] border border-[#00d4ff]/10 rounded-sm">
              <h3 className="font-mono text-[9px] tracking-[0.2em] text-[#00d4ff]/60 uppercase mb-2">
                Buyer Insight
              </h3>
              <p className="font-mono text-[11px] text-white/45 leading-[1.7]">
                {product.buyerInsight}
              </p>
            </div>
          )}
          {product.researchNotes && (
            <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-sm">
              <h3 className="font-mono text-[9px] tracking-[0.2em] text-white/30 uppercase mb-2">
                Research Notes
              </h3>
              <p className="font-mono text-[11px] text-white/45 leading-[1.7]">
                {product.researchNotes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Best For (use cases) */}
      {product.bestFor.length > 0 && (
        <Section title="Best For">
          <div className="flex flex-wrap gap-2">
            {product.bestFor.map((b) => (
              <span
                key={b}
                className="font-mono text-[10px] px-2.5 py-1 rounded-sm"
                style={{
                  color: accent + '90',
                  border: '1px solid ' + accent + '20',
                  backgroundColor: accent + '08',
                }}
              >
                {b}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Pros / Cons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {product.features.length > 0 && (
          <div>
            <h3 className="font-mono text-[10px] tracking-[0.25em] text-[#00ff88]/60 uppercase mb-3">
              Strengths
            </h3>
            <ul className="space-y-1.5">
              {product.features.slice(0, 5).map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#00ff88] text-[10px]">+</span>
                  <span className="font-mono text-[10px] text-white/40 leading-[1.6]">
                    {f}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {product.watchOutFor.length > 0 && (
          <div>
            <h3 className="font-mono text-[10px] tracking-[0.25em] text-[#ff3b30]/60 uppercase mb-3">
              Watch Out For
            </h3>
            <ul className="space-y-1.5">
              {product.watchOutFor.map((w, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#ff3b30] text-[10px]">!</span>
                  <span className="font-mono text-[10px] text-white/40 leading-[1.6]">
                    {w}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Implementation */}
      <Section title="Implementation Details">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-sm">
            <span className="font-mono text-[8px] text-white/20 uppercase tracking-wider block mb-1">
              Difficulty
            </span>
            <span className="font-mono text-[12px] text-white/60 capitalize">
              {product.implementationDifficulty}
            </span>
          </div>
          <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-sm">
            <span className="font-mono text-[8px] text-white/20 uppercase tracking-wider block mb-1">
              Timeline
            </span>
            <span className="font-mono text-[12px] text-white/60">
              {product.deploymentTimeline}
            </span>
          </div>
          <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-sm">
            <span className="font-mono text-[8px] text-white/20 uppercase tracking-wider block mb-1">
              Maturity
            </span>
            <span className="font-mono text-[12px] text-white/60 capitalize">
              {product.maturity}
            </span>
          </div>
          <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-sm">
            <span className="font-mono text-[8px] text-white/20 uppercase tracking-wider block mb-1">
              Price Tier
            </span>
            <span className="font-mono text-[12px] text-white/60 capitalize">
              {product.priceEstimate}
            </span>
          </div>
        </div>
      </Section>

      {/* ROI */}
      {product.recommendationReason && (
        <Section title="ROI & Recommendation">
          <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-sm">
            <p className="font-mono text-[11px] text-white/45 leading-[1.7]">
              {product.recommendationReason}
            </p>
          </div>
        </Section>
      )}

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <Section title="Alternatives">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alternatives.map((alt) => (
              <Link
                key={alt.id}
                href={`/products/${alt.id}`}
                className="p-4 bg-white/[0.015] border border-white/[0.06] rounded-sm hover:bg-white/[0.03] hover:border-white/[0.1] transition-all group"
              >
                <span className="font-mono text-[8px] text-white/25 tracking-wider uppercase">
                  {alt.company}
                </span>
                <h4 className="font-mono text-[12px] font-semibold text-white/70 group-hover:text-white/90 mt-0.5 mb-1 transition-colors">
                  {alt.name}
                </h4>
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono text-[10px] font-semibold"
                    style={{ color: accent }}
                  >
                    {alt.recommendationScore}/100
                  </span>
                  <span className="font-mono text-[8px] text-white/20 uppercase">
                    {alt.priceEstimate}
                  </span>
                  {alt.isNxtPick && (
                    <span className="font-mono text-[7px] text-[#ffd700] tracking-wider">
                      NXT PICK
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Tags */}
      {product.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4 pb-8">
          {product.tags.map((t) => (
            <span
              key={t}
              className="font-mono text-[8px] text-white/20 px-2 py-0.5 border border-white/[0.04] rounded-sm"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
