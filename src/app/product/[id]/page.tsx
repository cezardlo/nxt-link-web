'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProductById, PRODUCT_CATALOG, categoryColor } from '@/lib/data/product-catalog';
import type { Product, CostLevel, ImplementationLevel, MaturityLevel } from '@/lib/data/product-catalog';
import AdoptionCurveChart from '@/components/AdoptionCurveChart';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapMaturityToStage(m: MaturityLevel): 'innovators' | 'early_majority' | 'late_majority' {
  const map: Record<MaturityLevel, 'innovators' | 'early_majority' | 'late_majority'> = {
    emerging: 'innovators',
    growing: 'early_majority',
    mature: 'late_majority',
  };
  return map[m];
}

function costColorFn(level: CostLevel): string {
  const map: Record<CostLevel, string> = { low: '#00ff88', medium: '#ffd700', high: '#ff8c00', enterprise: '#ff3b30' };
  return map[level];
}

function implColorFn(level: ImplementationLevel): string {
  const map: Record<ImplementationLevel, string> = { easy: '#00ff88', moderate: '#ffd700', advanced: '#ff3b30' };
  return map[level];
}

function maturityColorFn(level: MaturityLevel): string {
  const map: Record<MaturityLevel, string> = { emerging: '#00d4ff', growing: '#00ff88', mature: '#6b7280' };
  return map[level];
}

const COST_SEGMENTS: CostLevel[] = ['low', 'medium', 'high', 'enterprise'];
const IMPL_SEGMENTS: ImplementationLevel[] = ['easy', 'moderate', 'advanced'];
const IMPL_COLORS: Record<ImplementationLevel, string> = { easy: '#00ff88', moderate: '#ffd700', advanced: '#ff3b30' };

// ─── Micro components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[9px] tracking-[0.2em] text-white/40 uppercase mb-5">
      {children}
    </h2>
  );
}

function Divider() {
  return <div className="border-b border-white/[0.06] my-10" />;
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex-1 min-w-[100px] p-3 bg-white/[0.02] border border-white/[0.06] rounded-sm">
      <div className="font-mono text-[7px] tracking-[0.2em] text-white/25 uppercase mb-1.5">{label}</div>
      <div className="font-mono text-[13px] font-semibold" style={{ color: color ?? 'rgba(255,255,255,0.8)' }}>
        {value}
      </div>
    </div>
  );
}

// ─── Alternative card ─────────────────────────────────────────────────────────

function AltCard({ product }: { product: Product }) {
  const accent = categoryColor(product.category);
  const pc = product.costLevel ?? product.priceEstimate;
  const pi = product.implementationLevel ?? product.implementationDifficulty;
  const altScore = product.ikerScore ?? product.recommendationScore;

  return (
    <Link
      href={`/product/${product.id}`}
      className="flex-1 min-w-[200px] bg-black border border-white/[0.08] rounded-sm overflow-hidden hover:border-white/[0.16] hover:bg-white/[0.02] transition-all duration-200 group"
    >
      {/* Accent bar */}
      <div className="h-[2px] w-full" style={{ backgroundColor: accent + '40' }} />
      <div className="p-4 space-y-2">
        <div className="font-mono text-[8px] tracking-[0.15em] uppercase" style={{ color: accent + '80' }}>
          {product.company}
        </div>
        <div className="text-[13px] font-semibold text-white/80 group-hover:text-white transition-colors" style={{ fontFamily: 'var(--font-space-grotesk, sans-serif)' }}>
          {product.name}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[7px] tracking-wider uppercase" style={{ color: costColorFn(pc) + 'cc' }}>
            $ {pc}
          </span>
          <span className="font-mono text-[7px] tracking-wider uppercase" style={{ color: implColorFn(pi) + 'cc' }}>
            {pi}
          </span>
          {altScore !== undefined && (
            <span className="font-mono text-[8px] font-semibold" style={{ color: accent }}>
              {altScore}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function ProductDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const product = getProductById(id);

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center space-y-4">
          <div className="font-mono text-[9px] tracking-[0.3em] text-white/20 uppercase">Product Not Found</div>
          <Link href="/products" className="font-mono text-[10px] text-[#00d4ff]/70 hover:text-[#00d4ff] transition-colors block">
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const accent = categoryColor(product.category);
  const pCost = product.costLevel ?? product.priceEstimate;
  const pImpl = product.implementationLevel ?? product.implementationDifficulty;
  const pMat = product.maturityLevel ?? product.maturity;
  const score = product.recommendationScore ?? product.ikerScore ?? 70;
  const momMap: Record<string, { symbol: string; color: string; label: string }> = {
    rising: { symbol: '\u2191', color: '#00ff88', label: 'RISING' },
    stable: { symbol: '\u2192', color: '#6b7280', label: 'STABLE' },
    declining: { symbol: '\u2193', color: '#ff8c00', label: 'DECLINING' },
  };
  const mom = momMap[product.momentum] ?? momMap.stable;

  const alternatives = (product.alternatives ?? [])
    .map((altId) => PRODUCT_CATALOG.find((p) => p.id === altId))
    .filter((p): p is Product => p !== undefined)
    .slice(0, 3);

  return (
    <div className="bg-black min-h-screen text-white pl-16 md:pl-16 pb-20 md:pb-0">
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* ── Breadcrumb ──────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-8">
          <Link
            href="/products"
            className="font-mono text-[9px] text-white/30 tracking-wider hover:text-white/60 transition-colors"
          >
            PRODUCTS
          </Link>
          <span className="font-mono text-[9px] text-white/15">/</span>
          <span className="font-mono text-[9px] text-white/30 tracking-wider">
            {product.company.toUpperCase()}
          </span>
          <span className="font-mono text-[9px] text-white/15">/</span>
          <span className="font-mono text-[9px] text-white/40 tracking-wider">
            {product.name.toUpperCase()}
          </span>
        </div>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              {/* Category chip */}
              <span
                className="inline-block font-mono text-[8px] tracking-[0.2em] uppercase px-2 py-1 rounded-sm border mb-4"
                style={{ color: accent + 'cc', borderColor: accent + '30', backgroundColor: accent + '08' }}
              >
                {product.category}
              </span>

              <h1
                className="text-[28px] md:text-[32px] font-bold text-white/95 leading-tight mb-2"
                style={{ fontFamily: 'var(--font-space-grotesk, sans-serif)' }}
              >
                {product.name}
              </h1>
              <div className="font-mono text-[12px] text-white/40 tracking-wider mb-3">
                {product.company}
              </div>
              <p className="text-[14px] text-white/60 leading-relaxed max-w-2xl">
                {product.description}
              </p>
            </div>

            {/* Score circle */}
            <div className="hidden md:flex flex-col items-center gap-1 shrink-0">
              <div
                className="w-20 h-20 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: accent + '40' }}
              >
                <span className="font-mono text-[22px] font-bold" style={{ color: accent }}>
                  {score}
                </span>
              </div>
              <span className="font-mono text-[7px] tracking-[0.2em] text-white/25 uppercase">IKER SCORE</span>
            </div>
          </div>
        </section>

        {/* ── Quick Stats Row ─────────────────────────────────────── */}
        <section className="mb-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <StatCard label="COST" value={`$ ${pCost.toUpperCase()}`} color={costColorFn(pCost)} />
            <StatCard label="IMPLEMENTATION" value={pImpl.toUpperCase()} color={implColorFn(pImpl)} />
            <StatCard label="MATURITY" value={pMat.toUpperCase()} color={maturityColorFn(pMat)} />
            <StatCard label="MOMENTUM" value={`${mom.symbol} ${mom.label}`} color={mom.color} />
            <StatCard label="IKER SCORE" value={`${score}/100`} color={accent} />
          </div>
        </section>

        <Divider />

        {/* ── What It Does ────────────────────────────────────────── */}
        {product.longDescription && (
          <section className="mb-10">
            <SectionLabel>WHAT IT DOES</SectionLabel>
            <p className="font-mono text-[13px] text-white/70 leading-relaxed">
              {product.longDescription}
            </p>
            <Divider />
          </section>
        )}

        {/* ── Problems Solved ─────────────────────────────────────── */}
        {product.problemsSolved && product.problemsSolved.length > 0 && (
          <section className="mb-10">
            <SectionLabel>PROBLEMS SOLVED</SectionLabel>
            <div className="space-y-0">
              {product.problemsSolved.map((p) => (
                <div key={p} className="flex items-start gap-3 py-2.5">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: accent }} />
                  <span className="font-mono text-[12px] text-white/60 leading-relaxed">{p}</span>
                </div>
              ))}
            </div>
            <Divider />
          </section>
        )}

        {/* ── Best Fit ────────────────────────────────────────────── */}
        {product.bestFor.length > 0 && (
          <section className="mb-10">
            <SectionLabel>BEST FIT</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {product.bestFor.map((item) => (
                <span
                  key={item}
                  className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-sm font-mono text-[10px] text-white/50"
                >
                  {item}
                </span>
              ))}
            </div>
            <Divider />
          </section>
        )}

        {/* ── Key Features ────────────────────────────────────────── */}
        {product.features && product.features.length > 0 && (
          <section className="mb-10">
            <SectionLabel>KEY FEATURES</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {product.features.map((f) => (
                <div
                  key={f}
                  className="flex items-start gap-3 p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-sm"
                >
                  <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: accent + '80' }} />
                  <span className="font-mono text-[11px] text-white/60 leading-relaxed">{f}</span>
                </div>
              ))}
            </div>
            <Divider />
          </section>
        )}

        {/* ── Cost Breakdown ──────────────────────────────────────── */}
        <section className="mb-10">
          <SectionLabel>COST BREAKDOWN</SectionLabel>

          {/* Visual cost bar */}
          <div className="flex gap-2 mb-5">
            {COST_SEGMENTS.map((seg) => {
              const active = seg === pCost;
              return (
                <div key={seg} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className="w-full h-2 rounded-full transition-colors"
                    style={{
                      backgroundColor: active ? costColorFn(seg) : 'rgba(255,255,255,0.06)',
                      boxShadow: active ? `0 0 8px ${costColorFn(seg)}40` : 'none',
                    }}
                  />
                  <span className={`font-mono text-[7px] tracking-wider uppercase ${active ? 'text-white/60' : 'text-white/20'}`}>
                    {seg}
                  </span>
                </div>
              );
            })}
          </div>

          {product.priceRange && (
            <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-sm mb-4">
              <div className="font-mono text-[7px] tracking-[0.2em] text-white/25 uppercase mb-1.5">PRICE RANGE</div>
              <div className="font-mono text-[13px] text-white/80">{product.priceRange}</div>
            </div>
          )}

          {/* Cost breakdown grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'PRODUCT COST', level: pCost },
              { label: 'SETUP COST', level: pImpl === 'advanced' ? 'enterprise' as CostLevel : pImpl === 'moderate' ? 'high' as CostLevel : 'medium' as CostLevel },
              { label: 'TRAINING COST', level: product.trainingRequired && product.trainingRequired.includes('week') ? 'high' as CostLevel : 'medium' as CostLevel },
              { label: 'ONGOING COST', level: pCost === 'enterprise' ? 'enterprise' as CostLevel : pCost === 'high' ? 'high' as CostLevel : 'medium' as CostLevel },
            ].map((item) => {
              const idx = COST_SEGMENTS.indexOf(item.level);
              const pct = ((idx + 1) / COST_SEGMENTS.length) * 100;
              return (
                <div key={item.label} className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-sm">
                  <div className="font-mono text-[8px] tracking-wider text-white/25 mb-2">{item.label}</div>
                  <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: costColorFn(item.level) }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <Divider />
        </section>

        {/* ── Implementation Profile ──────────────────────────────── */}
        <section className="mb-10">
          <SectionLabel>IMPLEMENTATION PROFILE</SectionLabel>

          {/* Difficulty bar */}
          <div className="flex gap-2 mb-5">
            {IMPL_SEGMENTS.map((seg) => {
              const active = seg === pImpl;
              return (
                <div key={seg} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className="w-full h-2 rounded-full transition-colors"
                    style={{
                      backgroundColor: active ? IMPL_COLORS[seg] : 'rgba(255,255,255,0.06)',
                      boxShadow: active ? `0 0 8px ${IMPL_COLORS[seg]}40` : 'none',
                    }}
                  />
                  <span className={`font-mono text-[7px] tracking-wider uppercase ${active ? 'text-white/60' : 'text-white/20'}`}>
                    {seg}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {product.deploymentTimeline && (
              <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-sm">
                <div className="font-mono text-[7px] tracking-[0.2em] text-white/25 mb-1.5">DEPLOYMENT</div>
                <div className="font-mono text-[11px] text-white/70">{product.deploymentTimeline}</div>
              </div>
            )}
            <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-sm">
              <div className="font-mono text-[7px] tracking-[0.2em] text-white/25 mb-1.5">INTEGRATION</div>
              <div className="font-mono text-[11px] text-white/70 flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: (product.integrationRequired ?? product.integrationNeeded) ? '#ff8c00' : '#00ff88' }}
                />
                {(product.integrationRequired ?? product.integrationNeeded) ? 'Required' : 'Not Required'}
              </div>
            </div>
            {product.trainingRequired && (
              <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-sm">
                <div className="font-mono text-[7px] tracking-[0.2em] text-white/25 mb-1.5">TRAINING</div>
                <div className="font-mono text-[11px] text-white/70">{product.trainingRequired}</div>
              </div>
            )}
            <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-sm">
              <div className="font-mono text-[7px] tracking-[0.2em] text-white/25 mb-1.5">DIFFICULTY</div>
              <div className="font-mono text-[11px] text-white/70">{pImpl.toUpperCase()}</div>
            </div>
          </div>
          <Divider />
        </section>

        {/* ── Research Notes ──────────────────────────────────────── */}
        <section className="mb-10">
          <SectionLabel>RESEARCH NOTES</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-sm">
              <div className="font-mono text-[8px] tracking-[0.2em] text-[#00d4ff]/50 mb-3">WHAT RESEARCH FINDS</div>
              <p className="font-mono text-[11px] text-white/60 leading-relaxed">
                {product.researchNotes}
              </p>
            </div>
            <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-sm">
              <div className="font-mono text-[8px] tracking-[0.2em] text-[#00ff88]/50 mb-3">BUYER INSIGHT</div>
              <p className="font-mono text-[11px] text-white/60 leading-relaxed">
                {product.buyerInsight ?? 'Analysis pending.'}
              </p>
            </div>
          </div>
          <Divider />
        </section>

        {/* ── Adoption Curve ──────────────────────────────────────── */}
        <section className="mb-10">
          <SectionLabel>ADOPTION CURVE</SectionLabel>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-sm p-5">
            <AdoptionCurveChart
              stage={mapMaturityToStage(pMat)}
              score={score}
              momentum={
                product.momentum === 'rising'
                  ? 'accelerating'
                  : product.momentum === 'declining'
                    ? 'decelerating'
                    : 'steady'
              }
              accentColor={accent}
              label={product.name}
            />
          </div>
          <Divider />
        </section>

        {/* ── NXT LINK Assessment ─────────────────────────────────── */}
        <section className="mb-10">
          <SectionLabel>NXT LINK ASSESSMENT</SectionLabel>

          {/* Recommendation */}
          <div className="p-5 bg-[#00ff88]/[0.03] border border-[#00ff88]/15 rounded-sm mb-3">
            <div className="flex items-center justify-between mb-4">
              <div className="font-mono text-[9px] tracking-[0.2em] text-[#00ff88]/60 uppercase">
                RECOMMENDATION
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${score}%`, backgroundColor: '#00ff88', boxShadow: '0 0 6px #00ff8860' }}
                  />
                </div>
                <span className="font-mono text-[14px] font-bold text-[#00ff88]">{score}</span>
              </div>
            </div>
            <p className="font-mono text-[12px] text-white/60 leading-relaxed">
              {product.recommendationReason ?? product.researchNotes}
            </p>
          </div>

          {/* Watch outs */}
          {product.watchOutFor && product.watchOutFor.length > 0 && (
            <div className="p-5 bg-[#f97316]/[0.03] border border-[#f97316]/15 rounded-sm">
              <div className="font-mono text-[9px] tracking-[0.2em] text-[#f97316]/60 uppercase mb-4">
                WATCH OUT FOR
              </div>
              <div className="space-y-3">
                {product.watchOutFor.map((w) => (
                  <div key={w} className="flex items-start gap-3">
                    <div className="w-1 h-1 rounded-full bg-[#f97316] mt-1.5 shrink-0" />
                    <span className="font-mono text-[11px] text-white/55 leading-relaxed">{w}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Divider />
        </section>

        {/* ── Alternatives ────────────────────────────────────────── */}
        {alternatives.length > 0 && (
          <section className="mb-12">
            <SectionLabel>ALTERNATIVES</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {alternatives.map((alt) => (
                <AltCard key={alt.id} product={alt} />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
