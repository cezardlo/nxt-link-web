'use client';

import Link from 'next/link';
import type { MarketplaceProduct } from '@/types/marketplace';
import { categoryColor } from '@/lib/data/product-catalog';

const MOMENTUM_COLOR: Record<string, string> = {
  rising: '#00ff88',
  stable: '#ffb800',
  declining: '#ff3b30',
};

const MATURITY_COLOR: Record<string, string> = {
  emerging: '#a855f7',
  growing: '#3b82f6',
  mature: '#00d4ff',
};

function Stars({ score }: { score: number }) {
  const stars = Math.round(score / 20);
  return (
    <span className="flex items-center gap-[1px]">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className="w-3 h-3"
          fill={i < stars ? '#ffd700' : '#ffffff10'}
        >
          <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.33L10 13.27l-4.77 2.5.91-5.33L2.27 6.62l5.34-.78L10 1z" />
        </svg>
      ))}
    </span>
  );
}

type Props = {
  product: MarketplaceProduct;
  onCompareToggle?: (id: string) => void;
  isComparing?: boolean;
};

export function ProductMarketCard({ product, onCompareToggle, isComparing }: Props) {
  const accent = categoryColor(product.category);
  const momColor = MOMENTUM_COLOR[product.momentum] ?? '#ffb800';
  const matColor = MATURITY_COLOR[product.maturity] ?? '#6b7280';

  return (
    <div className="group relative flex flex-col p-5 bg-white/[0.015] border border-white/[0.06] rounded-sm hover:bg-white/[0.035] hover:border-white/[0.12] transition-all duration-200">
      {/* NXT PICK badge */}
      {product.isNxtPick && (
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-sm bg-[#ffd700]/10 border border-[#ffd700]/30">
          <span className="font-mono text-[7px] tracking-[0.2em] text-[#ffd700] font-bold">
            NXT PICK
          </span>
        </div>
      )}

      {/* Company + momentum */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="font-mono text-[8px] tracking-[0.2em] uppercase"
          style={{ color: accent + '99' }}
        >
          {product.company}
        </span>
        <span
          className="font-mono text-[7px] tracking-[0.15em] px-1.5 py-0.5 rounded-sm border uppercase"
          style={{
            color: momColor,
            borderColor: momColor + '30',
            backgroundColor: momColor + '08',
          }}
        >
          {product.momentum}
        </span>
      </div>

      {/* Name */}
      <h3 className="font-mono text-[14px] font-semibold text-white/90 leading-tight mb-1.5 group-hover:text-white transition-colors">
        {product.name}
      </h3>

      {/* Stars + score */}
      <div className="flex items-center gap-2 mb-2">
        <Stars score={product.recommendationScore} />
        <span className="font-mono text-[10px] text-white/40">
          {product.recommendationScore}/100
        </span>
      </div>

      {/* Description */}
      <p className="font-mono text-[10px] text-white/35 leading-[1.7] line-clamp-2 mb-3">
        {product.description}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="font-mono text-[7px] tracking-[0.1em] text-white/20 px-1.5 py-0.5 border border-white/[0.06] rounded-sm uppercase">
          {product.priceEstimate}
        </span>
        {product.priceRange && (
          <span className="font-mono text-[8px] text-white/30">
            {product.priceRange}
          </span>
        )}
        <span className="font-mono text-[7px] tracking-[0.1em] text-white/20 px-1.5 py-0.5 border border-white/[0.06] rounded-sm uppercase">
          {product.deploymentTimeline}
        </span>
        <span
          className="font-mono text-[7px] tracking-[0.1em] px-1.5 py-0.5 border rounded-sm uppercase"
          style={{
            color: matColor + 'cc',
            borderColor: matColor + '30',
            backgroundColor: matColor + '08',
          }}
        >
          {product.maturity}
        </span>
      </div>

      {/* Best for tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {product.bestFor.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="font-mono text-[7px] tracking-[0.08em] px-1.5 py-0.5 rounded-sm"
            style={{
              color: accent + '80',
              border: '1px solid ' + accent + '15',
              backgroundColor: accent + '06',
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-2 border-t border-white/[0.04]">
        <Link
          href={`/products/${product.id}`}
          className="font-mono text-[9px] tracking-[0.1em] px-3 py-1.5 rounded-sm border border-[#00d4ff]/30 text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-colors uppercase"
        >
          View Details
        </Link>
        <button
          onClick={() => onCompareToggle?.(product.id)}
          className="font-mono text-[9px] tracking-[0.1em] px-3 py-1.5 rounded-sm border transition-colors uppercase"
          style={{
            borderColor: isComparing ? '#00ff88' + '50' : 'rgba(255,255,255,0.06)',
            color: isComparing ? '#00ff88' : 'rgba(255,255,255,0.3)',
            backgroundColor: isComparing ? '#00ff88' + '10' : 'transparent',
          }}
        >
          {isComparing ? 'Comparing' : 'Compare'}
        </button>
      </div>
    </div>
  );
}
