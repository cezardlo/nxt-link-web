'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PRODUCT_CATALOG, CATEGORY_COLORS, type Product } from '@/lib/data/product-catalog';
import { COLORS } from '@/lib/tokens';
import { TopBar, BottomNav } from '@/components/ui';

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
    drones: COLORS.accent,
    robots: '#a855f7',
    'ai hardware': COLORS.green,
    sensors: '#60a5fa',
    logistics: COLORS.orange,
  };
  return map[cat.toLowerCase()] ?? COLORS.accent;
}

function getScoreColor(score: number): string {
  if (score >= 80) return COLORS.green;
  if (score >= 60) return COLORS.accent;
  if (score >= 40) return COLORS.gold;
  return COLORS.orange;
}

function getMomentumColor(m: Product['momentum']): string {
  if (m === 'rising') return COLORS.green;
  if (m === 'stable') return COLORS.amber;
  return COLORS.red;
}

function getMomentumLabel(m: Product['momentum']): string {
  if (m === 'rising') return '▲ Rising';
  if (m === 'stable') return '→ Stable';
  return '▼ Declining';
}

function getDifficultyColor(d: Product['implementationDifficulty']): string {
  if (d === 'easy') return COLORS.green;
  if (d === 'moderate') return COLORS.amber;
  return COLORS.red;
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

// ── Section card wrapper ──────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="p-6"
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 20,
      }}
    >
      <h2
        className="font-mono text-[10px] tracking-[0.2em] uppercase mb-4"
        style={{ color: COLORS.muted }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

// ── Detail page inner ─────────────────────────────────────────────────────────

function ProductDetailInner() {
  const params = useParams<{ id: string }>();
  const product = PRODUCT_CATALOG.find((p) => p.id === params.id) ?? null;

  if (!product) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: COLORS.bg }}
      >
        <TopBar />
        <div className="font-mono text-[11px] tracking-[0.15em] uppercase" style={{ color: COLORS.muted }}>
          Product not found
        </div>
        <Link
          href="/products"
          className="font-mono text-[11px] tracking-[0.1em] hover:underline"
          style={{ color: COLORS.accent }}
        >
          ← Back to Marketplace
        </Link>
        <BottomNav />
      </div>
    );
  }

  const color = getCategoryColor(product.category);
  const scoreColor = getScoreColor(product.recommendationScore);
  const momentumColor = getMomentumColor(product.momentum);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: COLORS.bg, color: COLORS.text }}>
      <TopBar />

      {/* Centered single-column layout */}
      <main className="flex-1 w-full max-w-[640px] mx-auto px-5 pt-6 pb-28">

        {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.05em] mb-6 transition-colors hover:opacity-80"
          style={{ color: COLORS.muted }}
        >
          ← Marketplace
          <span style={{ color: `${COLORS.text}20` }}>/</span>
          <span style={{ color: `${COLORS.text}50` }}>{product.name}</span>
        </Link>

        {/* ── Hero section ───────────────────────────────────────────────── */}
        <div className="mb-8">
          {/* Category badge */}
          <span
            className="inline-block font-mono text-[10px] tracking-[0.12em] uppercase px-3 py-1 mb-4"
            style={{
              background: `${color}15`,
              color,
              border: `1px solid ${color}30`,
              borderRadius: 9999,
            }}
          >
            {product.category}
          </span>

          {/* Product name */}
          <h1
            className="font-grotesk font-bold leading-tight mb-1"
            style={{ fontSize: 28, color: COLORS.text }}
          >
            {product.name}
          </h1>

          {/* Company */}
          <div className="font-mono text-[11px] mb-3" style={{ color: COLORS.muted }}>
            {product.company}
          </div>

          {/* One-line description */}
          <p className="font-grotesk text-[15px] leading-relaxed" style={{ color: `${COLORS.text}88` }}>
            {product.description}
          </p>
        </div>

        {/* ── Score / Momentum / Price row ────────────────────────────────── */}
        <div
          className="grid grid-cols-3 gap-0 mb-8 overflow-hidden"
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 20,
          }}
        >
          {/* Score */}
          <div className="flex flex-col items-center justify-center py-5 px-3" style={{ borderRight: `1px solid ${COLORS.border}` }}>
            <span className="font-grotesk font-bold text-[28px] leading-none mb-1" style={{ color: scoreColor }}>
              {product.recommendationScore}
            </span>
            <div className="w-12 h-[3px] rounded-full mb-1.5" style={{ background: `${COLORS.text}10` }}>
              <div className="h-full rounded-full" style={{ width: `${product.recommendationScore}%`, background: scoreColor }} />
            </div>
            <span className="font-mono text-[8px] tracking-[0.2em] uppercase" style={{ color: COLORS.muted }}>
              NXT Score
            </span>
          </div>

          {/* Momentum */}
          <div className="flex flex-col items-center justify-center py-5 px-3" style={{ borderRight: `1px solid ${COLORS.border}` }}>
            <span className="font-mono text-[13px] font-semibold mb-1" style={{ color: momentumColor }}>
              {getMomentumLabel(product.momentum)}
            </span>
            <span className="font-mono text-[8px] tracking-[0.2em] uppercase" style={{ color: COLORS.muted }}>
              Momentum
            </span>
          </div>

          {/* Price */}
          <div className="flex flex-col items-center justify-center py-5 px-3">
            <span className="font-mono text-[18px] font-bold mb-1" style={{ color: COLORS.gold }}>
              {getPriceTier(product.priceEstimate)}
            </span>
            {product.priceRange && (
              <span className="font-mono text-[9px] mb-1" style={{ color: `${COLORS.text}40` }}>
                {product.priceRange}
              </span>
            )}
            <span className="font-mono text-[8px] tracking-[0.2em] uppercase" style={{ color: COLORS.muted }}>
              Price
            </span>
          </div>
        </div>

        {/* ── Content sections ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* WHAT IT DOES */}
          {product.longDescription && product.longDescription !== product.description && (
            <SectionCard title="What It Does">
              <p className="font-grotesk text-[14px] leading-relaxed" style={{ color: `${COLORS.text}90` }}>
                {product.longDescription}
              </p>
            </SectionCard>
          )}

          {/* PROBLEMS SOLVED */}
          {product.problemsSolved.length > 0 && (
            <SectionCard title="Problems Solved">
              <ul className="space-y-3">
                {product.problemsSolved.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: COLORS.accent }} />
                    <span className="font-grotesk text-[14px] leading-relaxed" style={{ color: `${COLORS.text}80` }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {/* FEATURES */}
          {product.features.length > 0 && (
            <SectionCard title="Features">
              <ul className="space-y-3">
                {product.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 text-[12px]" style={{ color: COLORS.green }}>✓</span>
                    <span className="font-grotesk text-[14px] leading-relaxed" style={{ color: `${COLORS.text}80` }}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {/* BUYER INSIGHT */}
          {product.buyerInsight && (
            <SectionCard title="Buyer Insight">
              <div
                className="px-5 py-4"
                style={{
                  background: `${COLORS.accent}08`,
                  borderLeft: `3px solid ${COLORS.accent}`,
                  borderRadius: 12,
                }}
              >
                <p className="font-grotesk text-[14px] leading-relaxed italic" style={{ color: `${COLORS.text}75` }}>
                  &ldquo;{product.buyerInsight}&rdquo;
                </p>
              </div>
            </SectionCard>
          )}

          {/* WATCH OUT FOR */}
          {product.watchOutFor.length > 0 && (
            <SectionCard title="Watch Out For">
              <ul className="space-y-3">
                {product.watchOutFor.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 text-[12px]" style={{ color: COLORS.orange }}>⚠</span>
                    <span className="font-grotesk text-[14px] leading-relaxed" style={{ color: `${COLORS.text}75` }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {/* IMPLEMENTATION */}
          <SectionCard title="Implementation">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[9px] tracking-[0.15em] uppercase" style={{ color: COLORS.muted }}>
                  Difficulty
                </span>
                <span className="font-mono text-[13px] font-semibold capitalize" style={{ color: getDifficultyColor(product.implementationDifficulty) }}>
                  {product.implementationDifficulty}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[9px] tracking-[0.15em] uppercase" style={{ color: COLORS.muted }}>
                  Timeline
                </span>
                <span className="font-mono text-[13px]" style={{ color: `${COLORS.text}80` }}>
                  {product.deploymentTimeline}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[9px] tracking-[0.15em] uppercase" style={{ color: COLORS.muted }}>
                  Training
                </span>
                <span className="font-mono text-[12px] leading-snug" style={{ color: `${COLORS.text}70` }}>
                  {product.trainingRequired}
                </span>
              </div>
            </div>

            {/* Extra metadata row */}
            <div
              className="flex items-center gap-6 mt-5 pt-4"
              style={{ borderTop: `1px solid ${COLORS.border}` }}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] tracking-[0.15em] uppercase" style={{ color: COLORS.muted }}>Maturity</span>
                <span className="font-mono text-[11px] capitalize" style={{ color: `${COLORS.text}70` }}>{product.maturity}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] tracking-[0.15em] uppercase" style={{ color: COLORS.muted }}>Integration</span>
                <span className="font-mono text-[11px]" style={{ color: product.integrationNeeded ? COLORS.amber : COLORS.green }}>
                  {product.integrationNeeded ? 'Required' : 'Optional'}
                </span>
              </div>
            </div>
          </SectionCard>

          {/* BEST FOR */}
          {product.bestFor.length > 0 && (
            <SectionCard title="Best For">
              <div className="flex flex-wrap gap-2">
                {product.bestFor.map((item, i) => (
                  <span
                    key={i}
                    className="font-mono text-[11px] px-3 py-1.5"
                    style={{
                      background: `${color}12`,
                      color,
                      border: `1px solid ${color}25`,
                      borderRadius: 9999,
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ALTERNATIVES */}
          {product.alternatives.length > 0 && (
            <SectionCard title="Alternatives">
              <div className="flex flex-wrap gap-2">
                {product.alternatives.map((alt, i) => {
                  const altProduct = PRODUCT_CATALOG.find((p) => p.id === alt);
                  const href = altProduct
                    ? `/products/${altProduct.id}`
                    : `/search?q=${encodeURIComponent(alt)}`;
                  const label = altProduct ? altProduct.name : alt;
                  return (
                    <Link
                      key={i}
                      href={href}
                      className="font-mono text-[11px] px-3 py-1.5 transition-colors"
                      style={{
                        background: `${COLORS.text}06`,
                        color: `${COLORS.text}55`,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 9999,
                      }}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* INDUSTRIES */}
          {product.industries.length > 0 && (
            <SectionCard title="Industries">
              <div className="flex flex-wrap gap-2">
                {product.industries.map((ind, i) => (
                  <Link
                    key={i}
                    href={`/industry/${encodeURIComponent(ind.toLowerCase())}`}
                    className="font-mono text-[11px] px-3 py-1.5 transition-colors hover:opacity-80"
                    style={{
                      background: `${color}10`,
                      color,
                      border: `1px solid ${color}20`,
                      borderRadius: 9999,
                    }}
                  >
                    {ind}
                  </Link>
                ))}
              </div>
            </SectionCard>
          )}

          {/* TAGS */}
          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag, i) => (
                <span
                  key={i}
                  className="font-mono text-[10px] px-3 py-1"
                  style={{
                    background: `${COLORS.text}06`,
                    color: COLORS.muted,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 9999,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* RECOMMENDATION REASON */}
          {product.recommendationReason && (
            <div
              className="px-5 py-4"
              style={{
                background: `${scoreColor}08`,
                border: `1px solid ${scoreColor}20`,
                borderRadius: 20,
              }}
            >
              <div className="font-mono text-[9px] tracking-[0.2em] uppercase mb-2" style={{ color: COLORS.muted }}>
                Why We Recommend It
              </div>
              <p className="font-grotesk text-[14px] leading-relaxed" style={{ color: `${COLORS.text}80` }}>
                {product.recommendationReason}
              </p>
            </div>
          )}

          {/* RESEARCH NOTES */}
          {product.researchNotes && (
            <SectionCard title="Research Notes">
              <p className="font-mono text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: `${COLORS.text}50` }}>
                {product.researchNotes}
              </p>
            </SectionCard>
          )}

          {/* ── CTA ──────────────────────────────────────────────────────── */}
          <Link
            href={`/search?q=${encodeURIComponent(product.name)}`}
            className="flex items-center justify-center gap-2 font-grotesk text-[14px] font-semibold py-4 transition-all hover:opacity-90"
            style={{
              background: `${COLORS.accent}15`,
              color: COLORS.accent,
              border: `1px solid ${COLORS.accent}30`,
              borderRadius: 20,
            }}
          >
            ⌕ Search this product
          </Link>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: COLORS.bg }} />}>
      <ProductDetailInner />
    </Suspense>
  );
}
