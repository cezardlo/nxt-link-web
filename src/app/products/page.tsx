'use client';

import { Suspense, useState, useMemo } from 'react';
import Link from 'next/link';
import { PRODUCT_CATALOG, CATEGORY_COLORS, type Product, type ProductCategory } from '@/lib/data/product-catalog';
import { COLORS } from '@/lib/tokens';

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_LIST = [
  'All',
  'Cybersecurity',
  'AI/ML',
  'Manufacturing',
  'Defense',
  'Energy',
  'Healthcare',
] as const;

type CategoryFilter = (typeof CATEGORY_LIST)[number];

function getCategoryColor(cat: string): string {
  const normalized = cat.toLowerCase().replace(/\/.*$/, '').trim() as ProductCategory;
  const map: Record<string, string> = {
    cybersecurity: CATEGORY_COLORS.cybersecurity,
    ai: CATEGORY_COLORS.AI,
    'ai/ml': CATEGORY_COLORS.AI,
    manufacturing: CATEGORY_COLORS.manufacturing,
    defense: CATEGORY_COLORS.defense,
    energy: CATEGORY_COLORS.energy,
    healthcare: CATEGORY_COLORS.healthcare,
    drones: '#00d4ff',
    robots: '#a855f7',
    'ai hardware': '#00ff88',
    sensors: '#60a5fa',
    logistics: '#fb923c',
  };
  return map[normalized] ?? map[cat.toLowerCase()] ?? '#00d4ff';
}

function getPriceTier(estimate: Product['priceEstimate']): string {
  const map: Record<Product['priceEstimate'], string> = {
    low: '$',
    medium: '$$',
    high: '$$$',
    enterprise: '$$$$',
  };
  return map[estimate];
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#00ff88';
  if (score >= 60) return '#00d4ff';
  if (score >= 40) return '#ffd700';
  return '#ff8c00';
}

function getMomentumLabel(m: Product['momentum']): string {
  if (m === 'rising') return '▲ rising';
  if (m === 'stable') return '→ stable';
  return '▼ declining';
}

function getMomentumColor(m: Product['momentum']): string {
  if (m === 'rising') return '#00ff88';
  if (m === 'stable') return '#ffb800';
  return '#ff3b30';
}

function categoryMatches(productCat: string, filter: CategoryFilter): boolean {
  if (filter === 'All') return true;
  const lc = productCat.toLowerCase();
  const f = filter.toLowerCase();
  if (filter === 'AI/ML') return lc === 'ai/ml' || lc === 'ai' || lc === 'ml';
  return lc === f;
}

type SortMode = 'TOP_RATED' | 'MOMENTUM' | 'PRICE_ASC' | 'PRICE_DESC';

const PRICE_ORDER: Record<Product['priceEstimate'], number> = {
  low: 1,
  medium: 2,
  high: 3,
  enterprise: 4,
};

// ── No image fetching — clean text-only premium cards ────────────────────────

// ── Product Card (Obsidian database view) ────────────────────────────────────

function ProductCard({
  product,
}: {
  product: Product;
}) {
  const color = getCategoryColor(product.category);
  const scoreColor = getScoreColor(product.recommendationScore);

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden transition-all duration-300 hover:translate-y-[-2px]"
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '20px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${color}30`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = COLORS.border;
      }}
    >

      {/* Card body */}
      <div className="flex flex-col flex-1 p-5 gap-0">

        {/* Category badge + name */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div
              className="font-grotesk text-[14px] font-semibold leading-snug mb-1"
              style={{ color: `${COLORS.text}e0` }}
            >
              {product.name}
            </div>
            <div className="font-mono text-[9px] tracking-[0.08em]" style={{ color: `${COLORS.text}35` }}>{product.company}</div>
          </div>
          <span
            className="shrink-0 text-[7px] tracking-[0.15em] px-2 py-0.5 rounded-full font-mono uppercase ml-2"
            style={{
              background: `${color}10`,
              color: `${color}cc`,
              border: `1px solid ${color}25`,
            }}
          >
            {product.category}
          </span>
        </div>

        <div className="h-px mb-3" style={{ background: `${COLORS.text}08` }} />

        {/* Property rows — Obsidian style */}
        <div className="space-y-0 flex-1">

          {/* SCORE row */}
          <div className="flex items-center py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="font-mono text-[9px] tracking-[0.15em] text-white/30 uppercase w-20 shrink-0">
              SCORE
            </span>
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1 h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${product.recommendationScore}%`, background: scoreColor }}
                />
              </div>
              <span
                className="font-mono text-[10px] font-bold shrink-0 tabular-nums"
                style={{ color: scoreColor }}
              >
                {product.recommendationScore}
              </span>
            </div>
          </div>

          {/* PRICE row */}
          <div className="flex items-center py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="font-mono text-[9px] tracking-[0.15em] text-white/30 uppercase w-20 shrink-0">
              PRICE
            </span>
            <span className="font-mono text-[11px] text-[#ffd700] font-bold tracking-wider">
              {getPriceTier(product.priceEstimate)}
            </span>
          </div>

          {/* MOMENTUM row */}
          <div className="flex items-center py-1.5">
            <span className="font-mono text-[9px] tracking-[0.15em] text-white/30 uppercase w-20 shrink-0">
              MOMENTUM
            </span>
            <span
              className="font-mono text-[10px]"
              style={{ color: getMomentumColor(product.momentum) }}
            >
              {getMomentumLabel(product.momentum)}
            </span>
          </div>
        </div>

        {/* Action row */}
        <div
          className="flex items-center justify-between pt-2.5 mt-2.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span
            className="font-mono text-[9px] tracking-[0.15em] px-2 py-1 rounded-sm transition-colors duration-150 group-hover:bg-[#00d4ff]/20 group-hover:border-[#00d4ff]/40"
            style={{
              background: 'rgba(0,212,255,0.08)',
              color: '#00d4ff',
              border: '1px solid rgba(0,212,255,0.2)',
            }}
          >
            VIEW →
          </span>
          <Link
            href={`/products/compare?a=${product.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-[9px] tracking-[0.15em] px-2 py-1 rounded-sm transition-colors duration-150 hover:bg-white/8 hover:text-white/60"
            style={{
              color: 'rgba(255,255,255,0.25)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            + COMPARE
          </Link>
        </div>
      </div>
    </Link>
  );
}

// ── Main page inner ───────────────────────────────────────────────────────────

function ProductCatalogInner() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
  const [sortMode, setSortMode] = useState<SortMode>('TOP_RATED');
  // No image fetching — clean text-only cards

  const filtered = useMemo(() => {
    let list = PRODUCT_CATALOG.filter((p) => {
      const matchCat = categoryMatches(p.category, activeCategory);
      const q = query.toLowerCase();
      const matchQ =
        !query ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      return matchCat && matchQ;
    });

    if (sortMode === 'TOP_RATED') {
      list = [...list].sort((a, b) => b.recommendationScore - a.recommendationScore);
    } else if (sortMode === 'MOMENTUM') {
      const order: Record<Product['momentum'], number> = { rising: 0, stable: 1, declining: 2 };
      list = [...list].sort((a, b) => order[a.momentum] - order[b.momentum]);
    } else if (sortMode === 'PRICE_ASC') {
      list = [...list].sort((a, b) => PRICE_ORDER[a.priceEstimate] - PRICE_ORDER[b.priceEstimate]);
    } else if (sortMode === 'PRICE_DESC') {
      list = [...list].sort((a, b) => PRICE_ORDER[b.priceEstimate] - PRICE_ORDER[a.priceEstimate]);
    }

    return list;
  }, [query, activeCategory, sortMode]);

  return (
    <div className="min-h-screen font-mono text-white" style={{ background: '#0a0a0a' }}>

      {/* Header bar */}
      <div
        className="px-6 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0a' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 max-w-screen-2xl mx-auto">
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/map"
                className="font-mono text-[9px] tracking-[0.15em] text-white/25 hover:text-[#00d4ff] transition-colors uppercase"
              >
                ← MAP
              </Link>
              <span className="text-white/15 text-[9px]">/</span>
              <span className="font-mono text-[9px] tracking-[0.15em] text-white/40 uppercase">
                Products
              </span>
            </div>
            {/* Title */}
            <h1
              className="font-bold tracking-[0.08em] text-white mb-1"
              style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px' }}
            >
              PRODUCT INTELLIGENCE DATABASE
            </h1>
            <div className="font-mono text-[9px] tracking-[0.15em] text-white/25 uppercase">
              {PRODUCT_CATALOG.length} records &nbsp;·&nbsp; Powered by Wikipedia + PatentsView
            </div>
          </div>

          <Link
            href="/products/compare"
            className="font-mono text-[9px] tracking-[0.15em] px-3 py-2 rounded-sm transition-colors self-start"
            style={{
              background: 'rgba(0,212,255,0.08)',
              color: '#00d4ff',
              border: '1px solid rgba(0,212,255,0.2)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(0,212,255,0.15)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(0,212,255,0.08)';
            }}
          >
            COMPARE PRODUCTS →
          </Link>
        </div>
      </div>

      {/* Filter row */}
      <div
        className="px-6 py-3 space-y-3 max-w-screen-2xl mx-auto"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <input
            type="text"
            placeholder="Search products, companies, tags..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 min-w-[200px] max-w-sm rounded-sm px-3 py-1.5 font-mono text-[11px] text-white/80 placeholder-white/20 outline-none transition-colors"
            style={{
              background: '#111111',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(0,212,255,0.50)';
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.10)';
            }}
          />

          {/* Sort */}
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="rounded-sm px-3 py-1.5 font-mono text-[9px] tracking-[0.15em] text-white/50 outline-none transition-colors cursor-pointer"
            style={{
              background: '#111111',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
          >
            <option value="TOP_RATED">TOP RATED</option>
            <option value="MOMENTUM">MOMENTUM</option>
            <option value="PRICE_ASC">PRICE ↑</option>
            <option value="PRICE_DESC">PRICE ↓</option>
          </select>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_LIST.map((cat) => {
            const isActive = activeCategory === cat;
            const color = cat === 'All' ? '#00d4ff' : getCategoryColor(cat);
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="font-mono text-[9px] tracking-[0.15em] px-2.5 py-1 rounded-sm transition-all duration-150 uppercase"
                style={
                  isActive
                    ? {
                        background: `${color}18`,
                        color,
                        border: `1px solid ${color}45`,
                      }
                    : {
                        background: '#111111',
                        color: 'rgba(255,255,255,0.30)',
                        border: '1px solid rgba(255,255,255,0.10)',
                      }
                }
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results bar */}
      <div
        className="px-6 py-2 max-w-screen-2xl mx-auto"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
      >
        <span className="font-mono text-[9px] tracking-[0.15em] text-white/20 uppercase">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          {query && ` for "${query}"`}
          {activeCategory !== 'All' && ` · ${activeCategory}`}
        </span>
      </div>

      {/* Product grid */}
      <div className="px-6 py-5 max-w-screen-2xl mx-auto">
        {filtered.length === 0 ? (
          <div
            className="rounded-sm p-12 text-center"
            style={{ border: '1px solid rgba(255,255,255,0.06)', background: '#111111' }}
          >
            <div className="font-mono text-[10px] tracking-[0.2em] text-white/20 mb-2 uppercase">
              No products found
            </div>
            <div className="font-mono text-[9px] text-white/15">
              Try a different search term or category
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#0a0a0a' }} />}>
      <ProductCatalogInner />
    </Suspense>
  );
}
