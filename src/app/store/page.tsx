'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Product } from '@/lib/data/product-catalog';
import { PRODUCT_CATALOG as _RAW_CATALOG } from '@/lib/data/product-catalog';
import { BottomNav, TopBar, EmptyState } from '@/components/ui';
import { COLORS } from '@/lib/tokens';

// ── Product catalog with runtime fallback guard ───────────────────────────────
const PRODUCT_CATALOG: Product[] = Array.isArray(_RAW_CATALOG) ? _RAW_CATALOG : [];

// ── Constants ─────────────────────────────────────────────────────────────────

const WHAT_IT_DOES = [
  { label: 'Saves Money',       icon: '↓$',  tags: ['cost', 'savings', 'efficiency', 'reduce', 'automat'] },
  { label: 'Finds Customers',   icon: '◎',   tags: ['crm', 'sales', 'marketing', 'lead', 'customer'] },
  { label: 'Tracks Things',     icon: '◈',   tags: ['tracking', 'monitor', 'sensor', 'asset', 'iot', 'surveillance'] },
  { label: 'Fixes Problems',    icon: '⚙',   tags: ['maintenance', 'predictive', 'repair', 'diagnostic', 'anomaly'] },
  { label: 'Builds Things',     icon: '▣',   tags: ['manufacturing', 'production', 'robotics', 'fabricat', 'construct'] },
] as const;

const INDUSTRIES = [
  { label: 'Defense',           color: '#ff8c00' },
  { label: 'AI/ML',             color: '#a855f7' },
  { label: 'Cybersecurity',     color: '#ff3b30' },
  { label: 'Energy',            color: '#00ff88' },
  { label: 'Manufacturing',     color: '#3b82f6' },
  { label: 'Healthcare',        color: '#00d4ff' },
  { label: 'Logistics',         color: '#ffd700' },
  { label: 'Border Tech',       color: '#ff6600' },
  { label: 'Finance',           color: '#10b981' },
  { label: 'Quantum Computing', color: '#c084fc' },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return COLORS.green;
  if (score >= 60) return COLORS.cyan;
  if (score >= 40) return COLORS.gold;
  return COLORS.orange;
}

function momentumIcon(m: string): string {
  if (m === 'rising')    return '▲';
  if (m === 'stable')    return '→';
  return '▼';
}

function momentumColor(m: string): string {
  if (m === 'rising')    return COLORS.green;
  if (m === 'stable')    return COLORS.gold;
  if (m === 'declining') return COLORS.red;
  return COLORS.dim;
}

function priceTier(estimate: string): string {
  const map: Record<string, string> = { low: '$', medium: '$$', high: '$$$', enterprise: '$$$$' };
  return map[estimate] ?? '$$';
}

function categoryAccent(cat: string): string {
  const lc = cat.toLowerCase();
  if (lc.includes('cyber')) return '#ff3b30';
  if (lc.includes('ai') || lc.includes('ml')) return '#a855f7';
  if (lc.includes('manufact')) return '#3b82f6';
  if (lc.includes('defense')) return '#ff8c00';
  if (lc.includes('energy')) return '#00ff88';
  if (lc.includes('health')) return '#00d4ff';
  return COLORS.cyan;
}

function matchesQuery(p: Product, q: string): boolean {
  const lower = q.toLowerCase();
  return (
    p.name.toLowerCase().includes(lower) ||
    p.company.toLowerCase().includes(lower) ||
    p.description.toLowerCase().includes(lower) ||
    (p.tags ?? []).some(t => t.toLowerCase().includes(lower)) ||
    (p.industries ?? []).some(i => i.toLowerCase().includes(lower)) ||
    p.category.toLowerCase().includes(lower)
  );
}

function matchesWhatItDoes(p: Product, tags: readonly string[]): boolean {
  const haystack = [
    p.name, p.description, p.category,
    ...(p.tags ?? []), ...(p.industries ?? []), ...(p.problemsSolved ?? []),
  ].join(' ').toLowerCase();
  return tags.some(t => haystack.includes(t));
}

function matchesIndustry(p: Product, industry: string): boolean {
  const normalised = industry.toLowerCase().replace('/', '').replace(' ', '');
  const haystack = [
    ...(p.industries ?? []), p.category, ...(p.tags ?? []),
  ].join(' ').toLowerCase().replace(/[^a-z0-9 ]/g, '');
  return haystack.includes(normalised.replace(/[^a-z0-9]/g, ''));
}

// ── Featured Carousel Card ───────────────────────────────────────────────────

function FeaturedCard({ product }: { product: Product }) {
  const accent = categoryAccent(product.category);
  const recScore = product.recommendationScore;
  const recLabel = recScore >= 75 ? 'TOP PICK' : recScore >= 50 ? 'RECOMMENDED' : 'EXPLORE';
  const recColor = recScore >= 75 ? COLORS.green : recScore >= 50 ? COLORS.gold : COLORS.dim;

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex-none flex flex-col gap-3 px-6 py-5 transition-all duration-300 hover:translate-y-[-2px]"
      style={{
        width: 'min(320px, 80vw)',
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '24px',
      }}
    >
      {/* Recommendation badge */}
      <div className="flex items-center justify-between">
        <span
          className="font-mono text-[8px] font-bold tracking-[0.15em] rounded-full px-2.5 py-1"
          style={{ color: recColor, background: `${recColor}0c`, border: `1px solid ${recColor}20` }}
        >
          {recLabel}
        </span>
        <span
          className="font-mono text-[8px] tracking-[0.12em] uppercase rounded-full px-2 py-0.5"
          style={{ color: accent, background: `${accent}0a`, border: `1px solid ${accent}18` }}
        >
          {product.category}
        </span>
      </div>

      {/* Product name */}
      <div
        className="font-grotesk text-[16px] font-semibold leading-tight group-hover:opacity-80 transition-opacity"
        style={{ color: COLORS.text }}
      >
        {product.name}
      </div>

      {/* Value prop */}
      <div
        className="font-grotesk text-[12px] font-light leading-relaxed line-clamp-2"
        style={{ color: `${COLORS.text}60` }}
      >
        {product.description}
      </div>

      {/* Company */}
      <div className="font-mono text-[9px] tracking-[0.1em]" style={{ color: `${COLORS.text}35` }}>
        {product.company}
      </div>

      {/* Bottom accent line */}
      <div className="h-[2px] rounded-full mt-auto" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
    </Link>
  );
}

// ── Product Grid Card ────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const accent = categoryAccent(product.category);
  const sColor = scoreColor(product.recommendationScore);
  const mColor = momentumColor(product.momentum);
  const mIcon = momentumIcon(product.momentum);

  return (
    <Link
      href={`/products/${product.id}`}
      className="group relative flex flex-col gap-2.5 p-5 transition-all duration-300 hover:translate-y-[-2px]"
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '20px',
      }}
    >
      {/* Category badge — top right */}
      <span
        className="absolute top-4 right-4 font-mono text-[7px] tracking-[0.15em] uppercase rounded-full px-2 py-0.5"
        style={{ color: accent, background: `${accent}0a`, border: `1px solid ${accent}18` }}
      >
        {product.category}
      </span>

      {/* Product name */}
      <div
        className="font-grotesk text-[14px] font-semibold leading-tight pr-16 group-hover:opacity-80 transition-opacity"
        style={{ color: COLORS.text }}
      >
        {product.name}
      </div>

      {/* Company */}
      <div className="font-mono text-[9px] tracking-[0.08em]" style={{ color: `${COLORS.text}40` }}>
        {product.company}
      </div>

      {/* Description */}
      <div
        className="font-grotesk text-[12px] font-light leading-relaxed line-clamp-2"
        style={{ color: `${COLORS.text}50` }}
      >
        {product.description}
      </div>

      {/* Score bar */}
      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 h-[3px] rounded-full" style={{ background: `${COLORS.text}08` }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${product.recommendationScore}%`, background: sColor }}
          />
        </div>
        <span className="font-mono text-[9px] font-bold tabular-nums" style={{ color: sColor }}>
          {product.recommendationScore}
        </span>
      </div>

      {/* Momentum + Price tier */}
      <div className="flex items-center justify-between mt-0.5">
        <span className="font-mono text-[9px] tracking-[0.08em]" style={{ color: mColor }}>
          {mIcon} {product.momentum}
        </span>
        <span className="font-mono text-[10px] font-bold tracking-wider" style={{ color: COLORS.gold }}>
          {priceTier(product.priceEstimate)}
        </span>
      </div>

      {/* CTA — visible on hover */}
      <div
        className="flex items-center justify-end pt-2 mt-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ borderTop: `1px solid ${COLORS.border}` }}
      >
        <span className="font-mono text-[9px] tracking-[0.12em]" style={{ color: COLORS.cyan }}>
          Learn more →
        </span>
      </div>
    </Link>
  );
}

// ── Inner page ────────────────────────────────────────────────────────────────

function StoreInner() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [filterMode, setFilterMode] = useState<
    | { type: 'what'; label: string; tags: readonly string[] }
    | { type: 'industry'; label: string }
    | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    if (PRODUCT_CATALOG.length > 0) {
      const t = setTimeout(() => setIsLoading(false), 400);
      return () => clearTimeout(t);
    }
  }, []);

  // Featured — top recommendation scores
  const featured = useMemo(
    () => [...PRODUCT_CATALOG].sort((a, b) => b.recommendationScore - a.recommendationScore).slice(0, 6),
    []
  );

  // Trending — top IKER scores
  const trending = useMemo(
    () => [...PRODUCT_CATALOG].sort((a, b) => b.ikerScore - a.ikerScore).slice(0, 5),
    []
  );

  // All products sorted for grid
  const allProducts = useMemo(
    () => [...PRODUCT_CATALOG].sort((a, b) => b.recommendationScore - a.recommendationScore),
    []
  );

  // Search / filter results
  const searchResults = useMemo(() => {
    if (!query && !filterMode) return null;
    let pool = [...PRODUCT_CATALOG];
    if (filterMode?.type === 'what') pool = pool.filter(p => matchesWhatItDoes(p, filterMode.tags));
    if (filterMode?.type === 'industry') pool = pool.filter(p => matchesIndustry(p, filterMode.label));
    if (query) pool = pool.filter(p => matchesQuery(p, query));
    return pool.sort((a, b) => b.recommendationScore - a.recommendationScore);
  }, [query, filterMode]);

  const showBrowse = !searchResults;

  function handleWhatClick(item: (typeof WHAT_IT_DOES)[number]) {
    setFilterMode(prev => prev?.type === 'what' && prev.label === item.label ? null : { type: 'what', label: item.label, tags: item.tags });
    setQuery('');
  }

  function handleIndustryClick(label: string) {
    setFilterMode(prev => prev?.type === 'industry' && prev.label === label ? null : { type: 'industry', label });
    setQuery('');
  }

  function clearAll() {
    setQuery('');
    setFilterMode(null);
    inputRef.current?.focus();
  }

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: COLORS.bg, color: COLORS.text }}>
      <TopBar />

      {/* ── Filter Bar ──────────────────────────────────────────────── */}
      <div
        className="sticky top-11 z-[80] px-6 py-4"
        style={{ background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}
      >
        {/* Search input */}
        <div className="relative mb-3">
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] opacity-25"
            style={{ color: COLORS.text }}
          >
            ⌕
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setFilterMode(null); }}
            placeholder="Search products, companies, problems..."
            className="w-full font-grotesk text-[14px] font-light placeholder:opacity-20 outline-none min-h-[44px] pl-10 pr-10 py-2"
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '24px',
              color: COLORS.text,
            }}
          />
          {(query || filterMode) && (
            <button
              onClick={clearAll}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none text-sm cursor-pointer p-0 leading-none min-h-[44px] flex items-center"
              style={{ color: `${COLORS.text}30` }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter pills row — industry + what-it-does inline */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {INDUSTRIES.slice(0, 5).map(ind => {
            const isActive = filterMode?.type === 'industry' && filterMode.label === ind.label;
            return (
              <button
                key={ind.label}
                onClick={() => handleIndustryClick(ind.label)}
                className="flex-none font-mono text-[9px] tracking-[0.1em] uppercase rounded-full px-3 py-1.5 cursor-pointer transition-all duration-200 whitespace-nowrap"
                style={{
                  background: isActive ? `${ind.color}15` : 'transparent',
                  color: isActive ? ind.color : `${COLORS.text}40`,
                  border: `1px solid ${isActive ? `${ind.color}40` : COLORS.border}`,
                }}
              >
                {ind.label}
              </button>
            );
          })}

          {/* Divider */}
          <div className="w-px h-4 flex-none" style={{ background: COLORS.border }} />

          {WHAT_IT_DOES.slice(0, 3).map(item => {
            const isActive = filterMode?.type === 'what' && filterMode.label === item.label;
            return (
              <button
                key={item.label}
                onClick={() => handleWhatClick(item)}
                className="flex-none font-mono text-[9px] tracking-[0.1em] uppercase rounded-full px-3 py-1.5 cursor-pointer transition-all duration-200 whitespace-nowrap"
                style={{
                  background: isActive ? `${COLORS.orange}15` : 'transparent',
                  color: isActive ? COLORS.orange : `${COLORS.text}40`,
                  border: `1px solid ${isActive ? `${COLORS.orange}40` : COLORS.border}`,
                }}
              >
                {item.icon} {item.label}
              </button>
            );
          })}
        </div>

        {/* Active filter indicator */}
        {filterMode && (
          <div className="flex items-center gap-2 mt-2">
            <span className="font-mono text-[8px] tracking-[0.15em]" style={{ color: `${COLORS.text}25` }}>SHOWING:</span>
            <span
              className="font-mono text-[9px] tracking-[0.12em] rounded-full px-2.5 py-0.5"
              style={{ color: COLORS.cyan, background: `${COLORS.cyan}0a`, border: `1px solid ${COLORS.cyan}25` }}
            >
              {filterMode.label.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-20">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-6 pt-6 pb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[200px] shimmer" style={{ borderRadius: '20px' }} />
            ))}
          </div>
        ) : searchResults !== null ? (
          /* ── Search / Filter Results ──────────────────────────── */
          <>
            <div className="px-6 py-4 font-mono text-[9px] tracking-[0.15em]" style={{ color: `${COLORS.text}25` }}>
              {searchResults.length} RESULTS
              {query ? ` FOR "${query.toUpperCase()}"` : ''}
              {filterMode ? ` · ${filterMode.label.toUpperCase()}` : ''}
            </div>
            {searchResults.length === 0 ? (
              <EmptyState message="NO RESULTS — TRY A DIFFERENT KEYWORD" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-6 pb-6">
                {searchResults.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </>
        ) : showBrowse ? (
          /* ── Browse Mode ─────────────────────────────────────── */
          <div className="flex flex-col gap-0">

            {/* ── Featured Carousel ─────────────────────────────── */}
            <section className="pt-8 pb-10 animate-fade-up">
              <div className="flex items-center gap-3 px-6 mb-5">
                <span className="font-grotesk text-[13px] font-semibold tracking-wide" style={{ color: COLORS.text }}>
                  Most Relevant
                </span>
                <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${COLORS.border}, transparent)` }} />
                <span className="font-mono text-[8px] tracking-[0.2em]" style={{ color: `${COLORS.text}20` }}>
                  {featured.length} PICKS
                </span>
              </div>
              <div className="flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-none">
                {featured.map(p => <FeaturedCard key={p.id} product={p} />)}
              </div>
            </section>

            {/* ── Divider glow ───────────────────────────────────── */}
            <div className="mx-6 h-px" style={{ background: `linear-gradient(90deg, transparent, ${COLORS.cyan}20, transparent)` }} />

            {/* ── Browse Filters — What It Does ─────────────────── */}
            <section className="pt-10 pb-8 animate-fade-up" style={{ animationDelay: '80ms' }}>
              <div className="flex items-center gap-3 px-6 mb-5">
                <span className="font-grotesk text-[13px] font-semibold tracking-wide" style={{ color: COLORS.text }}>
                  What It Does
                </span>
                <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${COLORS.border}, transparent)` }} />
              </div>
              <div className="flex gap-2.5 overflow-x-auto px-6 scrollbar-none">
                {WHAT_IT_DOES.map(item => {
                  const isActive = filterMode?.type === 'what' && filterMode.label === item.label;
                  return (
                    <button
                      key={item.label}
                      onClick={() => handleWhatClick(item)}
                      className="flex-none flex items-center gap-2 font-mono text-[10px] tracking-[0.06em] cursor-pointer min-h-[40px] px-4 py-2.5 transition-all duration-200 hover:translate-y-[-1px] whitespace-nowrap"
                      style={{
                        background: isActive ? `${COLORS.orange}12` : COLORS.surface,
                        border: `1px solid ${isActive ? COLORS.orange : COLORS.border}`,
                        borderRadius: '20px',
                        color: isActive ? COLORS.orange : `${COLORS.text}60`,
                        boxShadow: isActive ? `0 0 16px ${COLORS.orange}10` : 'none',
                      }}
                    >
                      <span style={{ color: COLORS.orange, fontSize: '13px' }}>{item.icon}</span>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── Browse Filters — By Industry ──────────────────── */}
            <section className="pb-8 animate-fade-up" style={{ animationDelay: '120ms' }}>
              <div className="flex items-center gap-3 px-6 mb-5">
                <span className="font-grotesk text-[13px] font-semibold tracking-wide" style={{ color: COLORS.text }}>
                  By Industry
                </span>
                <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${COLORS.border}, transparent)` }} />
              </div>
              <div className="flex gap-2.5 overflow-x-auto px-6 scrollbar-none">
                {INDUSTRIES.map(ind => {
                  const isActive = filterMode?.type === 'industry' && filterMode.label === ind.label;
                  return (
                    <button
                      key={ind.label}
                      onClick={() => handleIndustryClick(ind.label)}
                      className="flex-none flex items-center gap-2 font-mono text-[9px] tracking-[0.1em] uppercase cursor-pointer min-h-[40px] px-4 py-2.5 transition-all duration-200 hover:translate-y-[-1px] whitespace-nowrap"
                      style={{
                        background: isActive ? `${ind.color}10` : COLORS.surface,
                        border: `1px solid ${isActive ? `${ind.color}40` : COLORS.border}`,
                        borderRadius: '20px',
                        color: isActive ? ind.color : `${COLORS.text}50`,
                        boxShadow: isActive ? `0 0 16px ${ind.color}10` : 'none',
                      }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: ind.color, boxShadow: `0 0 6px ${ind.color}80` }}
                      />
                      {ind.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── Divider glow ───────────────────────────────────── */}
            <div className="mx-6 h-px" style={{ background: `linear-gradient(90deg, transparent, ${COLORS.cyan}20, transparent)` }} />

            {/* ── Product Grid ──────────────────────────────────── */}
            <section className="pt-10 pb-10 animate-fade-up" style={{ animationDelay: '160ms' }}>
              <div className="flex items-center gap-3 px-6 mb-6">
                <span className="font-grotesk text-[13px] font-semibold tracking-wide" style={{ color: COLORS.text }}>
                  All Products
                </span>
                <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${COLORS.border}, transparent)` }} />
                <span className="font-mono text-[8px] tracking-[0.2em]" style={{ color: `${COLORS.text}20` }}>
                  {allProducts.length} ITEMS
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-6">
                {allProducts.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </section>

            {/* ── Divider glow ───────────────────────────────────── */}
            <div className="mx-6 h-px mb-10" style={{ background: `linear-gradient(90deg, transparent, ${COLORS.cyan}20, transparent)` }} />

            {/* ── Trending ──────────────────────────────────────── */}
            <section className="pb-14 animate-fade-up" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-3 px-6 mb-5">
                <span className="font-grotesk text-[13px] font-semibold tracking-wide" style={{ color: COLORS.text }}>
                  Trending This Week
                </span>
                <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${COLORS.border}, transparent)` }} />
              </div>
              <div className="flex flex-col mx-6">
                {trending.map((p, i) => {
                  const mColor = momentumColor(p.momentum);
                  const sColor = scoreColor(p.ikerScore);
                  return (
                    <Link
                      key={p.id}
                      href={`/products/${p.id}`}
                      className="group flex items-center gap-4 py-4 transition-colors duration-200"
                      style={{ borderBottom: `1px solid ${COLORS.border}` }}
                    >
                      {/* Rank number */}
                      <span
                        className="font-mono text-[14px] font-bold w-6 text-right shrink-0 tabular-nums"
                        style={{ color: `${COLORS.text}15` }}
                      >
                        {i + 1}
                      </span>

                      {/* Momentum bar */}
                      <div
                        className="w-[3px] h-10 rounded-full shrink-0"
                        style={{ background: `linear-gradient(to top, ${mColor}25, ${mColor})` }}
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-grotesk text-[14px] font-semibold truncate group-hover:opacity-80 transition-opacity"
                          style={{ color: COLORS.text }}
                        >
                          {p.name}
                        </div>
                        <div className="font-mono text-[9px] mt-1 tracking-[0.06em]" style={{ color: `${COLORS.text}35` }}>
                          {p.company} · {p.category}
                        </div>
                      </div>

                      {/* Momentum indicator */}
                      <span className="font-mono text-[10px] shrink-0" style={{ color: mColor }}>
                        {momentumIcon(p.momentum)}
                      </span>

                      {/* Score */}
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-[12px] font-bold tabular-nums" style={{ color: sColor }}>
                          {p.ikerScore}
                        </div>
                        <div className="font-mono text-[7px] tracking-[0.15em]" style={{ color: `${COLORS.text}20` }}>
                          IKER
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>
        ) : null}
      </div>

      <BottomNav />
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function StorePage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-[100dvh] flex items-center justify-center font-mono text-[10px] tracking-[0.2em]"
          style={{ background: COLORS.bg, color: COLORS.dim }}
        >
          LOADING...
        </div>
      }
    >
      <StoreInner />
    </Suspense>
  );
}
