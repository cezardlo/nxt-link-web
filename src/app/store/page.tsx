'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Product } from '@/lib/data/product-catalog';
import { PRODUCT_CATALOG as _RAW_CATALOG } from '@/lib/data/product-catalog';

// ── Product catalog with runtime fallback guard ───────────────────────────────
const PRODUCT_CATALOG: Product[] = Array.isArray(_RAW_CATALOG) ? _RAW_CATALOG : [];

// ── Constants ─────────────────────────────────────────────────────────────────

const WHAT_IT_DOES = [
  { label: 'Saves Money',       icon: '↓$',  tags: ['cost', 'savings', 'efficiency', 'reduce', 'automat'] },
  { label: 'Finds Customers',   icon: '◎',   tags: ['crm', 'sales', 'marketing', 'lead', 'customer'] },
  { label: 'Tracks Things',     icon: '◈',   tags: ['tracking', 'monitor', 'sensor', 'asset', 'iot', 'surveillance'] },
  { label: 'Fixes Problems',    icon: '⚙',   tags: ['maintenance', 'predictive', 'repair', 'diagnostic', 'anomaly'] },
  { label: 'Builds Things',     icon: '▣',   tags: ['manufacturing', 'production', 'robotics', 'fabricat', 'construct'] },
  { label: 'Sells Better',      icon: '▲',   tags: ['ecommerce', 'retail', 'pricing', 'revenue', 'optimization'] },
  { label: 'Protects Assets',   icon: '⬡',   tags: ['security', 'cybersecurity', 'protection', 'defense', 'compliance'] },
  { label: 'Moves Things',      icon: '→',   tags: ['logistics', 'supply chain', 'transport', 'delivery', 'fleet'] },
  { label: 'Connects People',   icon: '⟳',   tags: ['communication', 'collaboration', 'network', 'platform', 'workforce'] },
  { label: 'Understands Data',  icon: '≋',   tags: ['analytics', 'ai', 'intelligence', 'insight', 'data', 'ml'] },
] as const;

const INDUSTRIES = [
  { label: 'Defense',       color: '#ff8c00' },
  { label: 'AI/ML',         color: '#a855f7' },
  { label: 'Cybersecurity', color: '#ff3b30' },
  { label: 'Energy',        color: '#00ff88' },
  { label: 'Manufacturing', color: '#3b82f6' },
  { label: 'Healthcare',    color: '#00d4ff' },
  { label: 'Logistics',     color: '#ffd700' },
  { label: 'Border Tech',   color: '#ff6600' },
  { label: 'Finance',       color: '#10b981' },
] as const;

const NAV_TABS = ['TODAY', 'EXPLORE', 'WORLD', 'FOLLOW', 'STORE', 'DOSSIER'] as const;

const NAV_ROUTES: Record<string, string> = {
  TODAY:   '/',
  EXPLORE: '/explore',
  WORLD:   '/world',
  FOLLOW:  '/following',
  STORE:   '/store',
  DOSSIER: '/dossier',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function ikerLabel(score: number): { text: string; color: string } {
  if (score >= 80) return { text: 'TRUSTED',  color: '#00ff88' };
  if (score >= 60) return { text: 'RELIABLE', color: '#ffd700' };
  if (score >= 40) return { text: 'CAUTION',  color: '#ff6600' };
  return               { text: 'RISK',     color: '#ff3b30' };
}

function momentumColor(m: string): string {
  if (m === 'rising')   return '#00ff88';
  if (m === 'stable')   return '#ffd700';
  if (m === 'declining') return '#ff3b30';
  return '#888';
}

function recommendationColor(score: number): string {
  if (score >= 75) return '#00ff88';
  if (score >= 50) return '#ffd700';
  return '#ff3b30';
}

function recommendationLabel(score: number): string {
  if (score >= 75) return 'BUY NOW';
  if (score >= 50) return 'EVALUATE';
  return 'WAIT';
}

function priceDisplay(p: Product): string {
  if (p.priceRange) return p.priceRange;
  const map: Record<string, string> = {
    low:        'Under $10k/yr',
    medium:     '$10k – $100k/yr',
    high:       '$100k – $500k/yr',
    enterprise: 'Enterprise pricing',
  };
  return map[p.priceEstimate] ?? p.priceEstimate;
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
    p.name,
    p.description,
    p.category,
    ...(p.tags ?? []),
    ...(p.industries ?? []),
    ...(p.problemsSolved ?? []),
  ].join(' ').toLowerCase();
  return tags.some(t => haystack.includes(t));
}

function matchesIndustry(p: Product, industry: string): boolean {
  const normalised = industry.toLowerCase().replace('/', '').replace(' ', '');
  const haystack = [
    ...(p.industries ?? []),
    p.category,
    ...(p.tags ?? []),
  ].join(' ').toLowerCase().replace(/[^a-z0-9 ]/g, '');
  return haystack.includes(normalised.replace(/[^a-z0-9]/g, ''));
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const iker = ikerLabel(product.ikerScore);
  const recColor = recommendationColor(product.recommendationScore);
  const momColor = momentumColor(product.momentum);

  return (
    <div
      style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderRadius: 4,
        padding: compact ? '10px 12px' : '14px 16px',
        minWidth: compact ? 260 : undefined,
        maxWidth: compact ? 300 : undefined,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        flex: compact ? '0 0 auto' : undefined,
      }}
    >
      {/* Row 1 — category + maturity */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontSize: 9,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#00d4ff',
            background: 'rgba(0,212,255,0.08)',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 2,
            padding: '1px 6px',
          }}
        >
          {product.category}
        </span>
        <span style={{ fontSize: 9, color: '#666', letterSpacing: '0.1em' }}>
          {product.maturity?.toUpperCase()}
        </span>
      </div>

      {/* Row 2 — product name */}
      <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, lineHeight: 1.3 }}>
        {product.name}
      </div>

      {/* Row 3 — company */}
      <div style={{ fontSize: 10, color: '#888' }}>{product.company}</div>

      {/* Row 4 — description */}
      <div
        style={{
          fontSize: 10,
          color: '#aaa',
          lineHeight: 1.5,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {product.description}
      </div>

      {/* Row 5 — price + momentum */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
        <span style={{ fontSize: 10, color: '#ffd700' }}>{priceDisplay(product)}</span>
        <span style={{ fontSize: 9, color: momColor, letterSpacing: '0.1em' }}>
          {'█'.repeat(Math.min(4, Math.round(product.recommendationScore / 25)))}
          {'░'.repeat(Math.max(0, 4 - Math.min(4, Math.round(product.recommendationScore / 25))))}
          {'  '}{product.momentum?.toUpperCase()}
        </span>
      </div>

      {/* Row 6 — IKER + recommendation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #1a1a1a',
          paddingTop: 8,
          marginTop: 2,
        }}
      >
        <span style={{ fontSize: 10, color: iker.color, letterSpacing: '0.1em' }}>
          ● {iker.text} ({product.ikerScore})
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: recColor,
            background: `${recColor}18`,
            border: `1px solid ${recColor}40`,
            borderRadius: 2,
            padding: '2px 8px',
          }}
        >
          {recommendationLabel(product.recommendationScore)}
        </span>
      </div>
    </div>
  );
}

// ── Search Results Grid ───────────────────────────────────────────────────────

function SearchResults({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '60px 0',
          color: '#444',
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          fontSize: 12,
          letterSpacing: '0.1em',
        }}
      >
        NO RESULTS — TRY A DIFFERENT KEYWORD
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 12,
        padding: '0 16px 24px',
      }}
    >
      {products.map(p => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

// ── Section Label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        color: '#ff6600',
        padding: '0 16px',
        marginBottom: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 20,
          height: 1,
          background: '#ff6600',
          opacity: 0.6,
        }}
      />
      {children}
      <span
        style={{
          flex: 1,
          height: 1,
          background: '#ff6600',
          opacity: 0.15,
        }}
      />
    </div>
  );
}

// ── Inner page (needs useSearchParams) ───────────────────────────────────────

function StoreInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [filterMode, setFilterMode] = useState<
    | { type: 'what'; label: string; tags: readonly string[] }
    | { type: 'industry'; label: string }
    | null
  >(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync URL param on load
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setQuery(q);
  }, [searchParams]);

  // Derived data
  const newThisWeek = useMemo(
    () =>
      [...PRODUCT_CATALOG]
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, 6),
    []
  );

  const trending = useMemo(
    () =>
      [...PRODUCT_CATALOG]
        .sort((a, b) => b.ikerScore - a.ikerScore)
        .slice(0, 5),
    []
  );

  const searchResults = useMemo(() => {
    if (!query && !filterMode) return null;

    let pool = PRODUCT_CATALOG;

    if (filterMode?.type === 'what') {
      pool = pool.filter(p => matchesWhatItDoes(p, filterMode.tags));
    }
    if (filterMode?.type === 'industry') {
      pool = pool.filter(p => matchesIndustry(p, filterMode.label));
    }
    if (query) {
      pool = pool.filter(p => matchesQuery(p, query));
    }

    return pool.sort((a, b) => b.recommendationScore - a.recommendationScore);
  }, [query, filterMode]);

  const showBrowse = !searchResults;

  function handleWhatClick(item: (typeof WHAT_IT_DOES)[number]) {
    setFilterMode(prev =>
      prev?.type === 'what' && prev.label === item.label
        ? null
        : { type: 'what', label: item.label, tags: item.tags }
    );
    setQuery('');
  }

  function handleIndustryClick(label: string) {
    setFilterMode(prev =>
      prev?.type === 'industry' && prev.label === label
        ? null
        : { type: 'industry', label }
    );
    setQuery('');
  }

  function clearAll() {
    setQuery('');
    setFilterMode(null);
    inputRef.current?.focus();
  }

  return (
    <div
      style={{
        background: '#000',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        color: '#fff',
      }}
    >
      {/* ── Fixed Top Bar ─────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: '#000',
          borderBottom: '1px solid #1a1a1a',
          padding: '10px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Platform title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: '#ff6600', letterSpacing: '0.3em', fontWeight: 700 }}>
            NXT//LINK
          </span>
          <span style={{ fontSize: 9, color: '#333', letterSpacing: '0.2em' }}>
            TECH STORE
          </span>
          <span style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em' }}>
            {PRODUCT_CATALOG.length} PRODUCTS
          </span>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 11,
              color: '#444',
            }}
          >
            ⌕
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setFilterMode(null);
            }}
            placeholder="Search products, companies, problems..."
            style={{
              width: '100%',
              background: '#0d0d0d',
              border: '1px solid #222',
              borderRadius: 4,
              padding: '9px 40px 9px 32px',
              fontSize: 12,
              color: '#fff',
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {(query || filterMode) && (
            <button
              onClick={clearAll}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#555',
                fontSize: 14,
                cursor: 'pointer',
                padding: 0,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Active filter pill */}
        {filterMode && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: '#444' }}>FILTER:</span>
            <span
              style={{
                fontSize: 9,
                letterSpacing: '0.12em',
                color: '#00d4ff',
                background: 'rgba(0,212,255,0.1)',
                border: '1px solid rgba(0,212,255,0.3)',
                borderRadius: 2,
                padding: '2px 8px',
              }}
            >
              {filterMode.label.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* ── Scrollable Content ────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: filterMode ? 118 : 96,
          paddingBottom: 64,
        }}
      >
        {searchResults !== null ? (
          /* ── Search / Filter Results ─────────────────────────────────── */
          <>
            <div
              style={{
                padding: '0 16px 12px',
                fontSize: 9,
                color: '#555',
                letterSpacing: '0.15em',
              }}
            >
              {searchResults.length} RESULTS
              {query ? ` FOR "${query.toUpperCase()}"` : ''}
              {filterMode ? ` · ${filterMode.label.toUpperCase()}` : ''}
            </div>
            <SearchResults products={searchResults} />
          </>
        ) : showBrowse ? (
          /* ── Browse Sections ─────────────────────────────────────────── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* NEW THIS WEEK */}
            <section>
              <SectionLabel>
                <span
                  style={{
                    background: '#ffd700',
                    color: '#000',
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    padding: '1px 5px',
                    borderRadius: 2,
                    marginRight: 4,
                  }}
                >
                  NEW
                </span>
                THIS WEEK
              </SectionLabel>
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  overflowX: 'auto',
                  padding: '0 16px 8px',
                  scrollbarWidth: 'none',
                }}
              >
                {newThisWeek.map(p => (
                  <ProductCard key={p.id} product={p} compact />
                ))}
              </div>
            </section>

            {/* BROWSE BY WHAT IT DOES */}
            <section>
              <SectionLabel>BROWSE BY WHAT IT DOES</SectionLabel>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: 8,
                  padding: '0 16px',
                }}
              >
                {WHAT_IT_DOES.map(item => (
                  <button
                    key={item.label}
                    onClick={() => handleWhatClick(item)}
                    style={{
                      background: '#0a0a0a',
                      border: '1px solid #1c1c1c',
                      borderRadius: 4,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 16, marginBottom: 6, color: '#ff6600' }}>
                      {item.icon}
                    </div>
                    <div style={{ fontSize: 10, color: '#ccc', letterSpacing: '0.08em' }}>
                      {item.label}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* BROWSE BY INDUSTRY */}
            <section>
              <SectionLabel>BROWSE BY INDUSTRY</SectionLabel>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                  padding: '0 16px',
                }}
              >
                {INDUSTRIES.map(ind => (
                  <button
                    key={ind.label}
                    onClick={() => handleIndustryClick(ind.label)}
                    style={{
                      background: '#0a0a0a',
                      border: `1px solid ${ind.color}28`,
                      borderRadius: 4,
                      padding: '14px 12px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: ind.color,
                        boxShadow: `0 0 6px ${ind.color}cc`,
                      }}
                    />
                    <div
                      style={{
                        fontSize: 9,
                        color: ind.color,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {ind.label}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* TRENDING THIS WEEK */}
            <section>
              <SectionLabel>TRENDING THIS WEEK</SectionLabel>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0,
                  padding: '0 16px',
                  borderTop: '1px solid #111',
                }}
              >
                {trending.map((p, i) => {
                  const iker = ikerLabel(p.ikerScore);
                  const momColor = momentumColor(p.momentum);
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '12px 0',
                        borderBottom: '1px solid #111',
                      }}
                    >
                      {/* Rank */}
                      <span
                        style={{
                          fontSize: 11,
                          color: '#333',
                          width: 18,
                          textAlign: 'right',
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </span>

                      {/* Signal bar */}
                      <div
                        style={{
                          width: 3,
                          height: 36,
                          background: `linear-gradient(to top, ${momColor}40, ${momColor})`,
                          borderRadius: 2,
                          flexShrink: 0,
                        }}
                      />

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            color: '#fff',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {p.name}
                        </div>
                        <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                          {p.company} · {p.category}
                        </div>
                      </div>

                      {/* IKER badge */}
                      <span
                        style={{
                          fontSize: 9,
                          color: iker.color,
                          letterSpacing: '0.1em',
                          flexShrink: 0,
                        }}
                      >
                        {iker.text}
                      </span>

                      {/* Signal count (proxy via ikerScore) */}
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#00d4ff', fontWeight: 700 }}>
                          {Math.round(p.ikerScore * 1.3)}
                        </div>
                        <div style={{ fontSize: 8, color: '#444', letterSpacing: '0.1em' }}>
                          SIGNALS
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

          </div>
        ) : null}
      </div>

      {/* ── Fixed Bottom NavBar ───────────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 48,
          background: '#000',
          borderTop: '1px solid #1a1a1a',
          display: 'flex',
          alignItems: 'stretch',
          zIndex: 50,
        }}
      >
        {NAV_TABS.map(tab => {
          const isActive = tab === 'STORE';
          return (
            <button
              key={tab}
              onClick={() => {
                const route = NAV_ROUTES[tab];
                if (route && route !== '/store') router.push(route);
              }}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                borderTop: isActive ? '2px solid #ff6600' : '2px solid transparent',
              }}
            >
              <span
                style={{
                  fontSize: 8,
                  letterSpacing: '0.15em',
                  color: isActive ? '#ff6600' : '#444',
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                {tab}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ── Page export (wraps inner in Suspense for useSearchParams) ─────────────────

export default function StorePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            background: '#000',
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
            fontSize: 10,
            color: '#444',
            letterSpacing: '0.2em',
          }}
        >
          LOADING...
        </div>
      }
    >
      <StoreInner />
    </Suspense>
  );
}
