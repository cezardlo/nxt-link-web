'use client';

import { useState } from 'react';
import { getCompanyLogoUrl, companyInitials } from '@/lib/utils/company-logos';

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = {
  company_name: string;
  company_url: string;
  product_summary: string;
  problems_solved: string[];
  industry_areas: string[];
  confidence: number;
  source_title: string;
  source_type: string;
};

type Props = {
  products: Product[];
  accentColor: string;
  loading?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductCatalog({ products, accentColor, loading }: Props) {
  const [filter, setFilter] = useState<string>('all');

  // Collect unique industry areas for filtering
  const areas = Array.from(new Set(products.flatMap((p) => p.industry_areas)));

  const filtered =
    filter === 'all'
      ? products
      : products.filter((p) => p.industry_areas.includes(filter));

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-28 bg-white/[0.02] border border-white/[0.04] rounded-sm animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <span className="font-mono text-[10px] text-white/20 tracking-[0.2em]">
          NO PRODUCTS DISCOVERED YET
        </span>
        <span className="font-mono text-[8px] text-white/10">
          Run industry scan to populate
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      {areas.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`font-mono text-[7px] tracking-[0.15em] px-2 py-1 rounded-sm border transition-colors ${
              filter === 'all'
                ? 'text-white/80 border-white/20 bg-white/[0.06]'
                : 'text-white/25 border-white/[0.04] hover:border-white/10'
            }`}
          >
            ALL ({products.length})
          </button>
          {areas.map((area) => (
            <button
              key={area}
              onClick={() => setFilter(area)}
              className={`font-mono text-[7px] tracking-[0.1em] px-2 py-1 rounded-sm border transition-colors ${
                filter === area
                  ? 'border-white/20 bg-white/[0.06]'
                  : 'text-white/25 border-white/[0.04] hover:border-white/10'
              }`}
              style={filter === area ? { color: accentColor } : {}}
            >
              {area.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filtered.map((p, i) => (
          <ProductCard key={`${p.company_name}-${i}`} product={p} accentColor={accentColor} />
        ))}
      </div>
    </div>
  );
}

// ─── Product Card (with company logo) ────────────────────────────────────────

function ProductCard({ product, accentColor }: { product: Product; accentColor: string }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = getCompanyLogoUrl(product.company_name, product.company_url);
  const initials = companyInitials(product.company_name);
  const confidenceColor =
    product.confidence >= 0.7 ? '#00ff88' : product.confidence >= 0.4 ? '#ffb800' : '#ff3b30';

  return (
    <a
      href={product.company_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 bg-white/[0.015] border border-white/[0.05] rounded-sm hover:bg-white/[0.035] hover:border-white/[0.10] transition-all duration-200 group"
    >
      {/* Header with logo */}
      <div className="flex items-start gap-3 mb-2.5">
        {/* Company logo */}
        <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden bg-white/[0.06] flex items-center justify-center border border-white/[0.08] mt-0.5">
          {logoUrl && !imgError ? (
            <img
              src={logoUrl}
              alt={product.company_name}
              width={32}
              height={32}
              className="w-full h-full object-contain bg-white/90 p-0.5"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <span
              className="font-mono text-[9px] font-bold"
              style={{ color: accentColor }}
            >
              {initials}
            </span>
          )}
        </div>

        {/* Name + source */}
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[11px] text-white/75 font-medium truncate group-hover:text-white/90 transition-colors">
            {product.company_name}
          </div>
          <div className="font-mono text-[7px] text-white/20 tracking-[0.1em] uppercase">
            {product.source_type}
          </div>
        </div>

        {/* Confidence */}
        <div className="shrink-0 flex items-center gap-1">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: confidenceColor, boxShadow: `0 0 4px ${confidenceColor}80` }}
          />
          <span className="font-mono text-[7px]" style={{ color: confidenceColor }}>
            {Math.round(product.confidence * 100)}%
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="font-mono text-[9px] text-white/40 leading-[1.7] line-clamp-2 mb-2.5">
        {product.product_summary}
      </div>

      {/* Problems solved */}
      {product.problems_solved.length > 0 && (
        <div className="space-y-0.5 mb-2.5">
          {product.problems_solved.slice(0, 3).map((problem, j) => (
            <div key={j} className="flex items-start gap-1.5">
              <span className="font-mono text-[7px] mt-px" style={{ color: accentColor }}>
                ›
              </span>
              <span className="font-mono text-[7px] text-white/30 leading-tight">
                {problem}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Industry area tags */}
      <div className="flex flex-wrap gap-1">
        {product.industry_areas.slice(0, 3).map((area) => (
          <span
            key={area}
            className="font-mono text-[6px] tracking-[0.1em] px-1.5 py-0.5 rounded-sm"
            style={{
              color: `${accentColor}99`,
              border: `1px solid ${accentColor}20`,
              backgroundColor: `${accentColor}08`,
            }}
          >
            {area.toUpperCase()}
          </span>
        ))}
      </div>
    </a>
  );
}
