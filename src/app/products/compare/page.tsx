'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PRODUCT_CATALOG, type Product } from '@/lib/data/product-catalog';

// ── Helpers ───────────────────────────────────────────────────────────────────

function categoryColor(cat: string): string {
  const map: Record<string, string> = {
    Cybersecurity: '#ff3b30', cybersecurity: '#ff3b30',
    AI: '#a855f7', 'AI/ML': '#a855f7',
    Manufacturing: '#3b82f6', manufacturing: '#3b82f6',
    Defense: '#f97316', defense: '#f97316',
    Energy: '#00ff88', energy: '#00ff88',
    Healthcare: '#00d4ff', healthcare: '#00d4ff',
    Drones: '#00d4ff', Robots: '#a855f7', 'AI Hardware': '#00ff88',
    Sensors: '#60a5fa', Logistics: '#fb923c',
  };
  return map[cat] ?? '#00d4ff';
}

function scoreColor(score: number): string {
  if (score >= 80) return '#00ff88';
  if (score >= 60) return '#ffd700';
  return '#f97316';
}

function difficultyColor(d: string): string {
  if (d === 'easy') return '#00ff88';
  if (d === 'moderate') return '#ffd700';
  return '#ff3b30';
}

function momentumColor(m: string): string {
  if (m === 'rising') return '#00ff88';
  if (m === 'stable') return '#ffd700';
  return '#ff3b30';
}

function momentumSymbol(m: string): string {
  if (m === 'rising') return '↑';
  if (m === 'stable') return '→';
  return '↓';
}

function maturityColor(m: string): string {
  if (m === 'mature') return '#00d4ff';
  if (m === 'growing') return '#a855f7';
  return '#ffd700';
}

// ── Wikipedia image ───────────────────────────────────────────────────────────

function ProductImage({ product }: { product: Product }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!product.wikipedia) return;
    fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(product.wikipedia)}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.thumbnail?.source) setImgUrl(d.thumbnail.source);
      })
      .catch(() => {});
  }, [product.wikipedia]);

  if (imgUrl) {
    return (
      <img
        src={imgUrl}
        alt={product.name}
        className="w-full h-32 object-contain rounded-sm"
      />
    );
  }

  const color = categoryColor(product.category);
  return (
    <div
      className="w-full h-32 flex items-center justify-center rounded-sm"
      style={{ background: `${color}15`, border: `1px solid ${color}30` }}
    >
      <span className="font-mono text-4xl" style={{ color }}>
        {product.name[0]}
      </span>
    </div>
  );
}

// ── Category filter chips ─────────────────────────────────────────────────────

const CATEGORIES = [
  'All', 'Cybersecurity', 'AI/ML', 'Manufacturing', 'Defense',
  'Energy', 'Healthcare', 'Drones', 'Robots', 'AI Hardware',
  'Sensors', 'Logistics',
];

// ── Main page ─────────────────────────────────────────────────────────────────

function ProductCompareInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Read URL on mount
  useEffect(() => {
    const p = searchParams.get('p');
    if (p) {
      const ids = p.split(',').filter((id) => PRODUCT_CATALOG.find((x) => x.id === id));
      setSelectedIds(ids.slice(0, 4));
    }
  }, [searchParams]);

  // Sync URL on change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedIds.length > 0) params.set('p', selectedIds.join(','));
    router.replace(`/products/compare${selectedIds.length ? `?${params}` : ''}`, { scroll: false });
  }, [selectedIds, router]);

  const filtered = useMemo(() => {
    return PRODUCT_CATALOG.filter((p) => {
      const matchCat = activeCat === 'All' || p.category === activeCat;
      const matchQ =
        !query ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.company.toLowerCase().includes(query.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));
      return matchCat && matchQ;
    });
  }, [query, activeCat]);

  const selected = useMemo(
    () => selectedIds.map((id) => PRODUCT_CATALOG.find((p) => p.id === id)!).filter(Boolean),
    [selectedIds]
  );

  function toggleProduct(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }

  // Winners
  const highestScore = selected.length
    ? selected.reduce((a, b) => (a.recommendationScore >= b.recommendationScore ? a : b))
    : null;
  const mostFeatures = selected.length
    ? selected.reduce((a, b) => (a.features.length >= b.features.length ? a : b))
    : null;
  const easiestDeploy = selected.length
    ? (selected.find((p) => p.implementationDifficulty === 'easy') ??
       selected.find((p) => p.implementationDifficulty === 'moderate') ??
       selected[0])
    : null;

  return (
    <div className="min-h-screen bg-black font-mono text-white">

      {/* Top bar */}
      <div className="border-b border-white/[0.06] px-6 py-3 flex items-center gap-4">
        <Link
          href="/products"
          className="text-[10px] tracking-widest text-white/40 hover:text-[#00d4ff] transition-colors"
        >
          ← PRODUCTS
        </Link>
        <span className="text-white/20 text-[10px]">/</span>
        <span className="text-[10px] tracking-widest text-white/60">COMPARE</span>
      </div>

      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
        <h1
          className="text-xl font-bold tracking-widest mb-1"
          style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#00d4ff' }}
        >
          PRODUCT INTELLIGENCE — COMPARE
        </h1>
        <p className="text-[10px] tracking-wide text-white/40">
          Compare specs, scores, and capabilities of any technology products — select 2 to 4
        </p>
      </div>

      {/* Selected bar */}
      {selected.length > 0 && (
        <div className="sticky top-0 z-30 bg-black/95 backdrop-blur border-b border-[#00d4ff]/20 px-6 py-2 flex items-center gap-3">
          <span className="text-[9px] tracking-widest text-white/40 mr-2">COMPARING</span>
          {selected.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-sm px-2 py-1"
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: categoryColor(p.category) }}
              />
              <span className="text-[10px] text-white/80">{p.name}</span>
              <button
                onClick={() => toggleProduct(p.id)}
                className="text-white/30 hover:text-[#ff3b30] text-[10px] ml-1 leading-none"
              >
                ×
              </button>
            </div>
          ))}
          {selected.length >= 2 && (
            <a
              href="#comparison"
              className="ml-auto text-[10px] tracking-widest px-3 py-1 rounded-sm transition-colors"
              style={{ background: '#00d4ff15', color: '#00d4ff', border: '1px solid #00d4ff30' }}
            >
              COMPARE {selected.length} PRODUCTS →
            </a>
          )}
        </div>
      )}

      <div className="px-6 py-6 space-y-8">

        {/* Search + filter */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/[0.06] rounded-sm px-3 py-2 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-[#00d4ff]/40 transition-colors"
          />
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className="text-[9px] tracking-widest px-2 py-1 rounded-sm transition-colors"
                style={
                  activeCat === cat
                    ? { background: '#00d4ff20', color: '#00d4ff', border: '1px solid #00d4ff40' }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {filtered.map((product) => {
            const isSelected = selectedIds.includes(product.id);
            const isDisabled = !isSelected && selectedIds.length >= 4;
            const color = categoryColor(product.category);
            return (
              <button
                key={product.id}
                onClick={() => !isDisabled && toggleProduct(product.id)}
                disabled={isDisabled}
                className="text-left rounded-sm p-3 transition-all duration-150 relative"
                style={{
                  background: isSelected ? `${color}12` : 'rgba(255,255,255,0.02)',
                  border: isSelected ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.06)',
                  opacity: isDisabled ? 0.35 : 1,
                }}
              >
                {isSelected && (
                  <span
                    className="absolute top-2 right-2 text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold"
                    style={{ background: color, color: '#000' }}
                  >
                    ✓
                  </span>
                )}
                <div className="text-[9px] tracking-widest mb-1" style={{ color }}>
                  {product.category}
                </div>
                <div className="text-[11px] font-bold text-white/90 leading-tight mb-1">
                  {product.name}
                </div>
                <div className="text-[9px] text-white/40 mb-2">{product.company}</div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-[9px] font-bold"
                    style={{ color: scoreColor(product.recommendationScore) }}
                  >
                    {product.recommendationScore}
                  </span>
                  <span
                    className="text-[9px]"
                    style={{ color: momentumColor(product.momentum) }}
                  >
                    {momentumSymbol(product.momentum)} {product.momentum}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Comparison view */}
        {selected.length >= 2 && (
          <div id="comparison" className="space-y-6 pt-4">
            <div className="flex items-center gap-3 pb-2 border-b border-white/[0.06]">
              <span
                className="text-[10px] tracking-widest"
                style={{ color: '#00d4ff' }}
              >
                SIDE-BY-SIDE ANALYSIS
              </span>
              <span className="text-[9px] text-white/30">
                {selected.length} products selected
              </span>
            </div>

            {/* Product columns */}
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${selected.length}, minmax(0, 1fr))` }}
            >
              {selected.map((p) => {
                const color = categoryColor(p.category);
                const isHighestScore = highestScore?.id === p.id;
                const isMostFeatures = mostFeatures?.id === p.id;
                const isEasiest = easiestDeploy?.id === p.id;

                return (
                  <div
                    key={p.id}
                    className="rounded-sm p-4 space-y-4"
                    style={{
                      background: `${color}08`,
                      border: `1px solid ${color}25`,
                    }}
                  >
                    {/* Winner badges */}
                    <div className="flex flex-wrap gap-1 min-h-[20px]">
                      {isHighestScore && (
                        <span
                          className="text-[8px] tracking-widest px-1.5 py-0.5 rounded-sm"
                          style={{ background: '#00ff8820', color: '#00ff88', border: '1px solid #00ff8840' }}
                        >
                          ★ HIGHEST SCORE
                        </span>
                      )}
                      {isMostFeatures && (
                        <span
                          className="text-[8px] tracking-widest px-1.5 py-0.5 rounded-sm"
                          style={{ background: '#00d4ff20', color: '#00d4ff', border: '1px solid #00d4ff40' }}
                        >
                          ★ MOST FEATURES
                        </span>
                      )}
                      {isEasiest && (
                        <span
                          className="text-[8px] tracking-widest px-1.5 py-0.5 rounded-sm"
                          style={{ background: '#ffd70020', color: '#ffd700', border: '1px solid #ffd70040' }}
                        >
                          ★ EASIEST TO DEPLOY
                        </span>
                      )}
                    </div>

                    {/* Image */}
                    <ProductImage product={p} />

                    {/* Name + company */}
                    <div>
                      <h2
                        className="text-base font-bold leading-tight mb-0.5"
                        style={{ fontFamily: 'Space Grotesk, sans-serif', color }}
                      >
                        {p.name}
                      </h2>
                      <div className="text-[10px] text-white/50">{p.company}</div>
                    </div>

                    {/* Category badge */}
                    <span
                      className="inline-block text-[9px] tracking-widest px-2 py-0.5 rounded-sm"
                      style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
                    >
                      {p.category}
                    </span>

                    {/* Score */}
                    <div className="flex items-baseline gap-2">
                      <span
                        className="text-3xl font-bold"
                        style={{ color: scoreColor(p.recommendationScore), fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        {p.recommendationScore}
                      </span>
                      <span className="text-[9px] text-white/30 tracking-widest">/ 100</span>
                    </div>

                    {/* Specs */}
                    <div className="space-y-2">
                      {[
                        { label: 'PRICE', value: p.priceRange ?? p.priceEstimate },
                        {
                          label: 'MATURITY',
                          value: p.maturity,
                          color: maturityColor(p.maturity),
                        },
                        {
                          label: 'MOMENTUM',
                          value: `${momentumSymbol(p.momentum)} ${p.momentum}`,
                          color: momentumColor(p.momentum),
                        },
                        {
                          label: 'COMPLEXITY',
                          value: p.implementationDifficulty,
                          color: difficultyColor(p.implementationDifficulty),
                        },
                        { label: 'TIMELINE', value: p.deploymentTimeline },
                      ].map(({ label, value, color: vc }) => (
                        <div key={label} className="flex justify-between items-start gap-2">
                          <span className="text-[9px] tracking-widest text-white/30 shrink-0">{label}</span>
                          <span
                            className="text-[10px] text-right"
                            style={{ color: vc ?? 'rgba(255,255,255,0.7)' }}
                          >
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Best For */}
                    <div>
                      <div className="text-[9px] tracking-widest text-white/30 mb-1.5">BEST FOR</div>
                      <ul className="space-y-1">
                        {p.bestFor.slice(0, 3).map((item, i) => (
                          <li key={i} className="flex gap-1.5 items-start">
                            <span className="text-[#00ff88] text-[9px] mt-0.5">✓</span>
                            <span className="text-[9px] text-white/60 leading-tight">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Watch Out For */}
                    <div>
                      <div className="text-[9px] tracking-widest text-white/30 mb-1.5">WATCH OUT FOR</div>
                      <ul className="space-y-1">
                        {p.watchOutFor.slice(0, 2).map((item, i) => (
                          <li key={i} className="flex gap-1.5 items-start">
                            <span className="text-[#ffd700] text-[9px] mt-0.5">⚠</span>
                            <span className="text-[9px] text-white/50 leading-tight">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Features */}
                    <div>
                      <div className="text-[9px] tracking-widest text-white/30 mb-1.5">KEY FEATURES</div>
                      <div className="flex flex-wrap gap-1">
                        {p.features.slice(0, 4).map((f, i) => (
                          <span
                            key={i}
                            className="text-[8px] px-1.5 py-0.5 rounded-sm"
                            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
                          >
                            {f.length > 40 ? f.slice(0, 38) + '…' : f}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Industries */}
                    <div>
                      <div className="text-[9px] tracking-widest text-white/30 mb-1.5">INDUSTRIES</div>
                      <div className="flex flex-wrap gap-1">
                        {p.industries.slice(0, 4).map((ind, i) => (
                          <span
                            key={i}
                            className="text-[8px] px-1.5 py-0.5 rounded-sm"
                            style={{ background: `${color}10`, color, border: `1px solid ${color}20` }}
                          >
                            {ind}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Spec comparison table */}
            <div className="overflow-x-auto">
              <div className="text-[10px] tracking-widest text-white/40 mb-3 pt-2 border-t border-white/[0.06]">
                SPEC COMPARISON TABLE
              </div>
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-2 pr-4 text-[9px] tracking-widest text-white/30 font-normal w-28">
                      SPEC
                    </th>
                    {selected.map((p) => (
                      <th
                        key={p.id}
                        className="text-left py-2 px-3 text-[9px] font-normal"
                        style={{ color: categoryColor(p.category) }}
                      >
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: 'SCORE',
                      values: selected.map((p) => p.recommendationScore),
                      best: Math.max(...selected.map((p) => p.recommendationScore)),
                      render: (v: number) => (
                        <span style={{ color: scoreColor(v) }}>{v}</span>
                      ),
                    },
                    {
                      label: 'PRICE',
                      values: selected.map((p) => p.priceEstimate),
                      best: null as null,
                      render: (v: string) => <span className="capitalize text-white/70">{v}</span>,
                    },
                    {
                      label: 'MATURITY',
                      values: selected.map((p) => p.maturity),
                      best: null as null,
                      render: (v: string) => (
                        <span style={{ color: maturityColor(v) }} className="capitalize">{v}</span>
                      ),
                    },
                    {
                      label: 'MOMENTUM',
                      values: selected.map((p) => p.momentum),
                      best: null as null,
                      render: (v: string) => (
                        <span style={{ color: momentumColor(v) }}>
                          {momentumSymbol(v)} {v}
                        </span>
                      ),
                    },
                    {
                      label: 'COMPLEXITY',
                      values: selected.map((p) => p.implementationDifficulty),
                      best: null as null,
                      render: (v: string) => (
                        <span style={{ color: difficultyColor(v) }} className="capitalize">{v}</span>
                      ),
                    },
                    {
                      label: 'TIMELINE',
                      values: selected.map((p) => p.deploymentTimeline),
                      best: null as null,
                      render: (v: string) => <span className="text-white/60">{v}</span>,
                    },
                    {
                      label: 'FEATURES',
                      values: selected.map((p) => p.features.length),
                      best: Math.max(...selected.map((p) => p.features.length)),
                      render: (v: number) => <span className="text-white/70">{v}</span>,
                    },
                    {
                      label: 'INTEGRATION',
                      values: selected.map((p) => (p.integrationNeeded ? 'Required' : 'Optional')),
                      best: null as null,
                      render: (v: string) => (
                        <span style={{ color: v === 'Required' ? '#f97316' : '#00ff88' }}>{v}</span>
                      ),
                    },
                  ].map((row) => (
                    <tr
                      key={row.label}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2 pr-4 text-[9px] tracking-widest text-white/30">
                        {row.label}
                      </td>
                      {row.values.map((v, i) => {
                        const isBest =
                          row.best !== null &&
                          (typeof v === 'number' ? v === row.best : false);
                        return (
                          <td
                            key={i}
                            className="py-2 px-3 capitalize"
                            style={isBest ? { background: 'rgba(0,255,136,0.06)' } : {}}
                          >
                            {row.render(v as never)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* AI Recommendation */}
            {highestScore && (
              <div
                className="rounded-sm p-5 space-y-3"
                style={{ background: '#00ff8806', border: '1px solid #00ff8820' }}
              >
                <div className="text-[10px] tracking-widest text-white/40">
                  WHICH SHOULD YOU CHOOSE?
                </div>
                <div className="flex items-start gap-4">
                  <div
                    className="shrink-0 w-10 h-10 rounded-sm flex items-center justify-center text-lg font-bold"
                    style={{
                      background: `${categoryColor(highestScore.category)}20`,
                      color: categoryColor(highestScore.category),
                      fontFamily: 'Space Grotesk, sans-serif',
                    }}
                  >
                    {highestScore.recommendationScore}
                  </div>
                  <div className="space-y-1">
                    <div
                      className="text-sm font-bold"
                      style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#00ff88' }}
                    >
                      {highestScore.name}
                    </div>
                    <div className="text-[10px] text-white/50">{highestScore.company}</div>
                    <p className="text-[10px] text-white/60 leading-relaxed max-w-2xl">
                      {highestScore.recommendationReason}
                    </p>
                    <Link
                      href={`/products?id=${highestScore.id}`}
                      className="inline-block mt-2 text-[9px] tracking-widest px-3 py-1.5 rounded-sm transition-colors"
                      style={{ background: '#00ff8815', color: '#00ff88', border: '1px solid #00ff8830' }}
                    >
                      VIEW FULL PROFILE →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {selected.length < 2 && (
          <div
            className="rounded-sm p-8 text-center"
            style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="text-[10px] tracking-widest text-white/20 mb-2">
              SELECT {2 - selected.length} MORE PRODUCT{2 - selected.length !== 1 ? 'S' : ''} TO COMPARE
            </div>
            <div className="text-[9px] text-white/15">
              Click any product card above — up to 4 products at once
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductComparePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ProductCompareInner />
    </Suspense>
  );
}
