'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PRODUCT_CATALOG, CATEGORY_COLORS, type Product } from '@/lib/data/product-catalog';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCategoryColor(cat: string): string {
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
  const key = cat.toLowerCase();
  return map[key] ?? '#00d4ff';
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#00ff88';
  if (score >= 60) return '#00d4ff';
  if (score >= 40) return '#ffd700';
  return '#ff8c00';
}

function getMomentumColor(m: Product['momentum']): string {
  if (m === 'rising') return '#00ff88';
  if (m === 'stable') return '#ffb800';
  return '#ff3b30';
}

function getMomentumLabel(m: Product['momentum']): string {
  if (m === 'rising') return '▲ rising';
  if (m === 'stable') return '→ stable';
  return '▼ declining';
}

function getDifficultyColor(d: Product['implementationDifficulty']): string {
  if (d === 'easy') return '#00ff88';
  if (d === 'moderate') return '#ffb800';
  return '#ff3b30';
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

async function fetchWikiImage(title: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=600&origin=*`;
    const res = await fetch(url);
    const data: {
      query?: {
        pages?: Record<string, { thumbnail?: { source?: string } }>;
      };
    } = await res.json();
    const pages = data?.query?.pages ?? {};
    const page = Object.values(pages)[0];
    return page?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

// ── Section heading (Obsidian note style) ────────────────────────────────────

function SectionHeading({ label }: { label: string }) {
  return (
    <div
      className="font-mono text-[9px] tracking-[0.2em] text-white/25 uppercase mb-3 mt-6 pb-1.5"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      {label}
    </div>
  );
}

// ── Property row (Obsidian frontmatter style) ─────────────────────────────────

function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between py-1.5 last:border-0"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <span className="font-mono text-[9px] tracking-wider text-white/30 uppercase shrink-0 w-24">
        {label}
      </span>
      <div className="font-mono text-[11px] text-white/80 text-right">{children}</div>
    </div>
  );
}

// ── Detail page inner ─────────────────────────────────────────────────────────

function ProductDetailInner() {
  const params = useParams<{ id: string }>();
  const product = PRODUCT_CATALOG.find((p) => p.id === params.id) ?? null;
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!product?.wikipedia) return;
    fetchWikiImage(product.wikipedia).then((url) => {
      if (url) setImageUrl(url);
    });
  }, [product?.wikipedia]);

  if (!product) {
    return (
      <div
        className="min-h-screen font-mono text-white flex flex-col items-center justify-center gap-4"
        style={{ background: '#0a0a0a' }}
      >
        <div className="text-[10px] tracking-[0.2em] text-white/25 uppercase">Product not found</div>
        <Link
          href="/products"
          className="font-mono text-[10px] tracking-[0.15em] text-[#00d4ff] hover:underline uppercase"
        >
          ← Back to Products
        </Link>
      </div>
    );
  }

  const color = getCategoryColor(product.category);
  const scoreColor = getScoreColor(product.recommendationScore);

  return (
    <div className="min-h-screen font-mono text-white" style={{ background: '#0a0a0a' }}>

      {/* Top bar */}
      <div
        className="px-6 py-2.5 flex items-center justify-between flex-wrap gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0a' }}
      >
        {/* Left: back + breadcrumb */}
        <div className="flex items-center gap-2">
          <Link
            href="/products"
            className="font-mono text-[9px] tracking-[0.15em] text-white/25 hover:text-[#00d4ff] transition-colors uppercase"
          >
            ← Products
          </Link>
          <span className="text-white/15 text-[9px]">/</span>
          <span className="font-mono text-[9px] tracking-[0.1em] text-white/40">
            {product.name}
          </span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <Link
            href={`/products/compare?a=${product.id}`}
            className="font-mono text-[9px] tracking-[0.15em] px-3 py-1.5 rounded-sm transition-colors uppercase"
            style={{
              background: 'rgba(0,212,255,0.08)',
              color: '#00d4ff',
              border: '1px solid rgba(0,212,255,0.2)',
            }}
          >
            COMPARE
          </Link>
          <Link
            href={`/ask?q=${encodeURIComponent(product.name)}`}
            className="font-mono text-[9px] tracking-[0.15em] px-3 py-1.5 rounded-sm transition-colors uppercase"
            style={{
              background: '#111111',
              color: 'rgba(255,255,255,0.35)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            ASK /AI
          </Link>
        </div>
      </div>

      {/* Body: sidebar + main */}
      <div className="flex flex-col lg:flex-row max-w-screen-xl mx-auto">

        {/* ── LEFT SIDEBAR (Obsidian properties panel) ────────────────────── */}
        <aside
          className="lg:w-64 shrink-0 flex flex-col gap-0 lg:min-h-screen"
          style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Product image */}
          <div
            className="overflow-hidden"
            style={{
              height: '200px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: '#111111',
            }}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: `${color}0d` }}
              >
                <span
                  className="font-bold select-none"
                  style={{
                    fontFamily: 'Space Grotesk, sans-serif',
                    color: `${color}55`,
                    fontSize: '4rem',
                    lineHeight: 1,
                  }}
                >
                  {product.name[0]}
                </span>
              </div>
            )}
          </div>

          {/* Company initial badge */}
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div
              className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0 font-bold text-sm"
              style={{
                background: `${color}18`,
                color,
                border: `1px solid ${color}25`,
                fontFamily: 'Space Grotesk, sans-serif',
              }}
            >
              {product.company[0]}
            </div>
            <div>
              <div
                className="font-semibold text-white/85 leading-tight"
                style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '12px' }}
              >
                {product.company}
              </div>
              <div className="font-mono text-[8px] tracking-wider text-white/30 uppercase mt-0.5">
                Manufacturer
              </div>
            </div>
          </div>

          {/* Properties list */}
          <div className="px-4 py-3 flex flex-col">

            <div
              className="font-mono text-[8px] tracking-[0.2em] text-white/20 uppercase mb-2"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '6px' }}
            >
              Properties
            </div>

            <PropertyRow label="category">
              <span
                className="font-mono text-[9px] tracking-wider px-1.5 py-0.5 rounded-sm"
                style={{
                  background: `${color}18`,
                  color,
                  border: `1px solid ${color}30`,
                }}
              >
                {product.category}
              </span>
            </PropertyRow>

            <PropertyRow label="company">
              <span className="text-white/70">{product.company}</span>
            </PropertyRow>

            <PropertyRow label="price">
              <span style={{ color: '#ffd700' }}>
                {getPriceTier(product.priceEstimate)}
                {product.priceRange && (
                  <span className="text-white/35 ml-1.5 text-[10px]">{product.priceRange}</span>
                )}
              </span>
            </PropertyRow>

            <PropertyRow label="deployment">
              <span className="text-white/65">{product.deploymentTimeline}</span>
            </PropertyRow>

            <PropertyRow label="difficulty">
              <span style={{ color: getDifficultyColor(product.implementationDifficulty) }}>
                {product.implementationDifficulty}
              </span>
            </PropertyRow>

            <PropertyRow label="training">
              <span className="text-white/65 text-right leading-snug">{product.trainingRequired}</span>
            </PropertyRow>

            <PropertyRow label="momentum">
              <span style={{ color: getMomentumColor(product.momentum) }}>
                {getMomentumLabel(product.momentum)}
              </span>
            </PropertyRow>

            <PropertyRow label="score">
              <span style={{ color: scoreColor }} className="font-bold">
                {product.recommendationScore}
                <span className="text-white/25 font-normal"> / 100</span>
              </span>
            </PropertyRow>

            <PropertyRow label="maturity">
              <span className="text-white/65">{product.maturity}</span>
            </PropertyRow>

            <PropertyRow label="integration">
              <span className={product.integrationNeeded ? 'text-[#ffb800]' : 'text-[#00ff88]'}>
                {product.integrationNeeded ? 'required' : 'optional'}
              </span>
            </PropertyRow>
          </div>

          {/* Tags */}
          {product.tags.length > 0 && (
            <div
              className="px-4 py-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="font-mono text-[8px] tracking-[0.2em] text-white/20 uppercase mb-2">
                Tags
              </div>
              <div className="flex flex-wrap gap-1">
                {product.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="font-mono text-[9px] px-1.5 py-0.5 rounded-sm"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      color: 'rgba(255,255,255,0.45)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sidebar actions */}
          <div
            className="px-4 py-3 flex flex-col gap-2 mt-auto"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <Link
              href={`/products/compare?a=${product.id}`}
              className="font-mono text-[9px] tracking-[0.15em] px-3 py-2 rounded-sm text-center transition-colors uppercase"
              style={{
                background: 'rgba(0,212,255,0.08)',
                color: '#00d4ff',
                border: '1px solid rgba(0,212,255,0.2)',
              }}
            >
              COMPARE
            </Link>
            <Link
              href={`/ask?q=${encodeURIComponent(product.name)}`}
              className="font-mono text-[9px] tracking-[0.15em] px-3 py-2 rounded-sm text-center transition-colors uppercase"
              style={{
                background: '#111111',
                color: 'rgba(255,255,255,0.30)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              ASK /AI
            </Link>
          </div>
        </aside>

        {/* ── MAIN CONTENT (Obsidian note body) ───────────────────────────── */}
        <main className="flex-1 px-8 py-6 max-w-3xl">

          {/* Title */}
          <h1
            className="font-bold text-white leading-tight mb-1"
            style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '22px' }}
          >
            {product.name}
          </h1>
          <div className="font-mono text-[11px] text-white/35 mb-1">{product.company}</div>

          {/* Category + momentum badges */}
          <div className="flex items-center gap-2 flex-wrap mb-5">
            <span
              className="font-mono text-[9px] tracking-wider px-2 py-0.5 rounded-sm"
              style={{
                background: `${color}18`,
                color,
                border: `1px solid ${color}30`,
              }}
            >
              {product.category.toUpperCase()}
            </span>
            <span
              className="font-mono text-[9px] tracking-wider px-2 py-0.5 rounded-sm"
              style={{
                background: `${getMomentumColor(product.momentum)}12`,
                color: getMomentumColor(product.momentum),
                border: `1px solid ${getMomentumColor(product.momentum)}25`,
              }}
            >
              {getMomentumLabel(product.momentum).toUpperCase()}
            </span>
            <span
              className="font-mono text-[9px] tracking-wider px-2 py-0.5 rounded-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.30)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {product.maturity.toUpperCase()}
            </span>
          </div>

          {/* Description */}
          <p className="font-mono text-[12px] text-white/65 leading-relaxed mb-2">
            {product.description}
          </p>

          {/* Long description */}
          {product.longDescription && product.longDescription !== product.description && (
            <p className="font-mono text-[11px] text-white/45 leading-relaxed">
              {product.longDescription}
            </p>
          )}

          {/* Recommendation score block */}
          <div
            className="rounded-sm p-4 my-6 flex items-center gap-5"
            style={{
              background: `${scoreColor}08`,
              border: `1px solid ${scoreColor}20`,
            }}
          >
            {/* Mini score bar column */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <span
                className="font-bold leading-none"
                style={{ fontFamily: 'Space Grotesk, sans-serif', color: scoreColor, fontSize: '2rem' }}
              >
                {product.recommendationScore}
              </span>
              <div className="w-16 h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${product.recommendationScore}%`, background: scoreColor }}
                />
              </div>
              <span className="font-mono text-[8px] tracking-[0.2em] text-white/25 uppercase">NXT Score</span>
            </div>
            <div className="flex-1">
              <div className="font-mono text-[9px] tracking-[0.15em] text-white/25 uppercase mb-1.5">
                Recommendation
              </div>
              <p className="font-mono text-[11px] text-white/60 leading-relaxed">
                {product.recommendationReason}
              </p>
            </div>
          </div>

          {/* ## What it solves */}
          {product.problemsSolved.length > 0 && (
            <section>
              <SectionHeading label="What it solves" />
              <ul className="space-y-2">
                {product.problemsSolved.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-[#00d4ff] text-[10px] mt-0.5 shrink-0">◆</span>
                    <span className="font-mono text-[11px] text-white/60 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ## Features */}
          {product.features.length > 0 && (
            <section>
              <SectionHeading label="Features" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {product.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[#00ff88] text-[10px] mt-0.5 shrink-0">✓</span>
                    <span className="font-mono text-[11px] text-white/60 leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ## Best for */}
          {product.bestFor.length > 0 && (
            <section>
              <SectionHeading label="Best for" />
              <div className="flex flex-wrap gap-2">
                {product.bestFor.map((item, i) => (
                  <span
                    key={i}
                    className="font-mono text-[10px] px-2.5 py-1 rounded-sm"
                    style={{
                      background: `${color}10`,
                      color,
                      border: `1px solid ${color}22`,
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* ## Watch out for */}
          {product.watchOutFor.length > 0 && (
            <section>
              <SectionHeading label="Watch out for" />
              <ul className="space-y-2">
                {product.watchOutFor.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-[#f97316] text-[10px] mt-0.5 shrink-0">⚠</span>
                    <span className="font-mono text-[11px] text-white/55 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ## Buyer insight */}
          {product.buyerInsight && (
            <section>
              <SectionHeading label="Buyer insight" />
              <div
                className="rounded-sm px-4 py-3"
                style={{
                  background: 'rgba(0,212,255,0.05)',
                  borderLeft: '3px solid #00d4ff',
                  borderTop: '1px solid rgba(0,212,255,0.15)',
                  borderRight: '1px solid rgba(0,212,255,0.15)',
                  borderBottom: '1px solid rgba(0,212,255,0.15)',
                }}
              >
                <p className="font-mono text-[11px] text-white/65 leading-relaxed italic">
                  &ldquo;{product.buyerInsight}&rdquo;
                </p>
              </div>
            </section>
          )}

          {/* ## Alternatives */}
          {product.alternatives.length > 0 && (
            <section>
              <SectionHeading label="Alternatives" />
              <div className="flex flex-wrap gap-2">
                {product.alternatives.map((alt, i) => {
                  const altProduct = PRODUCT_CATALOG.find((p) => p.id === alt);
                  return altProduct ? (
                    <Link
                      key={i}
                      href={`/products/${altProduct.id}`}
                      className="font-mono text-[10px] tracking-wide px-2.5 py-1 rounded-sm transition-colors hover:border-[#00d4ff]/35 hover:text-[#00d4ff]"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        color: 'rgba(255,255,255,0.40)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {altProduct.name}
                    </Link>
                  ) : (
                    <Link
                      key={i}
                      href={`/ask?q=${encodeURIComponent(alt)}`}
                      className="font-mono text-[10px] tracking-wide px-2.5 py-1 rounded-sm transition-colors hover:border-[#00d4ff]/35 hover:text-[#00d4ff]"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        color: 'rgba(255,255,255,0.40)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {alt}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* ## Industries */}
          {product.industries.length > 0 && (
            <section>
              <SectionHeading label="Industries" />
              <div className="flex flex-wrap gap-2">
                {product.industries.map((ind, i) => (
                  <Link
                    key={i}
                    href={`/industry/${encodeURIComponent(ind.toLowerCase())}`}
                    className="font-mono text-[10px] px-2.5 py-1 rounded-sm transition-colors"
                    style={{
                      background: `${color}0d`,
                      color,
                      border: `1px solid ${color}1a`,
                    }}
                  >
                    {ind}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ## Research notes (Obsidian code block style) */}
          {product.researchNotes && (
            <section>
              <SectionHeading label="Research notes" />
              <div
                className="rounded-sm px-4 py-3"
                style={{
                  background: '#111111',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderLeft: '3px solid rgba(255,255,255,0.12)',
                }}
              >
                <p className="font-mono text-[10px] text-white/40 leading-relaxed whitespace-pre-wrap">
                  {product.researchNotes}
                </p>
              </div>
            </section>
          )}

          {/* Bottom spacer */}
          <div className="h-16" />
        </main>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#0a0a0a' }} />}>
      <ProductDetailInner />
    </Suspense>
  );
}
