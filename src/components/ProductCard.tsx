'use client';

import type { Product } from '@/lib/data/product-catalog';
import { categoryColor } from '@/lib/data/product-catalog';

type Props = {
  product: Product;
};

const MOMENTUM_BADGE: Record<string, { label: string; color: string }> = {
  rising:    { label: 'RISING',    color: '#00ff88' },
  stable:    { label: 'STABLE',    color: '#ffb800' },
  declining: { label: 'DECLINING', color: '#ff3b30' },
};

const MATURITY_BADGE: Record<string, string> = {
  emerging: '#a855f7',
  growing:  '#3b82f6',
  mature:   '#00d4ff',
};

export function ProductCard({ product }: Props) {
  const accent = categoryColor(product.category);
  const momentum = MOMENTUM_BADGE[product.momentum] ?? MOMENTUM_BADGE.stable;
  const pCost = product.costLevel ?? product.priceEstimate;
  const pImpl = product.implementationLevel ?? product.implementationDifficulty;
  const pMat = product.maturityLevel ?? product.maturity;
  const pScore = product.ikerScore ?? product.recommendationScore;
  const matColor = MATURITY_BADGE[pMat] ?? '#6b7280';

  return (
    <div className="group relative flex flex-col p-5 bg-white/[0.015] border border-white/[0.06] rounded-sm hover:bg-white/[0.035] hover:border-white/[0.12] transition-all duration-200">
      <div className="flex items-center justify-between mb-2">
        <span
          className="font-mono text-[8px] tracking-[0.2em] uppercase"
          style={{ color: accent + '99' }}
        >
          {product.company}
        </span>
        <span
          className="font-mono text-[7px] tracking-[0.15em] px-1.5 py-0.5 rounded-sm border"
          style={{
            color: momentum.color,
            borderColor: momentum.color + '30',
            backgroundColor: momentum.color + '08',
          }}
        >
          {momentum.label}
        </span>
      </div>

      <h3 className="font-mono text-[14px] font-semibold text-white/90 leading-tight mb-1.5 group-hover:text-white transition-colors">
        {product.name}
      </h3>

      <p className="font-mono text-[10px] text-white/35 leading-[1.7] line-clamp-3 mb-3">
        {product.description}
      </p>

      {pScore !== undefined && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[7px] tracking-[0.2em] text-white/20 uppercase">IKER SCORE</span>
            <span className="font-mono text-[10px] font-semibold" style={{ color: accent }}>
              {pScore}
            </span>
          </div>
          <div className="h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: pScore + '%',
                backgroundColor: accent,
                boxShadow: '0 0 6px ' + accent + '60',
              }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-[7px] tracking-[0.1em] text-white/20 px-1.5 py-0.5 border border-white/[0.06] rounded-sm uppercase">
          {pCost}
        </span>
        <span className="font-mono text-[7px] tracking-[0.1em] text-white/20 px-1.5 py-0.5 border border-white/[0.06] rounded-sm uppercase">
          {pImpl}
        </span>
        <span
          className="font-mono text-[7px] tracking-[0.1em] px-1.5 py-0.5 border rounded-sm uppercase"
          style={{
            color: matColor + 'cc',
            borderColor: matColor + '30',
            backgroundColor: matColor + '08',
          }}
        >
          {pMat}
        </span>
      </div>

      <div className="flex flex-wrap gap-1 mt-auto">
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

      {product.contractsWon !== undefined && product.contractsWon > 0 && (
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-[#ffb800]" style={{ boxShadow: '0 0 4px #ffb80080' }} />
          <span className="font-mono text-[7px] text-[#ffb800]/60">{product.contractsWon} contracts</span>
        </div>
      )}
    </div>
  );
}
