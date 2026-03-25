'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { COLORS } from '@/lib/tokens';

interface Vendor {
  company_name: string;
  sector: string;
  iker_score: number;
  company_url: string | null;
}

interface Product {
  product_name: string;
  company: string;
  category: string | null;
  description: string | null;
}

interface Cluster {
  id: string;
  title: string;
  strength: number;
  signal_count: number;
  companies: string[];
  industries: string[];
  technologies: string[];
  what_is_happening: string | null;
  why_it_matters: string | null;
  what_happens_next: string | null;
  actions: string[] | null;
  vendors: Vendor[];
  products: Product[];
}

interface Trend {
  name: string;
  trend_type: string;
  velocity: number;
  direction: string;
  confidence: number;
}

interface Briefing {
  generated_at: string;
  total_signals: number;
  top_clusters: Cluster[];
  trends: Trend[];
  velocity: { industry: string; signals_7d: number; velocity_ratio: number }[];
  fallback_signals: { id: string; title: string; industry: string; importance_score: number }[];
}

function strengthLabel(s: number): { text: string; color: string } {
  if (s >= 70) return { text: 'CRITICAL', color: '#ef4444' };
  if (s >= 50) return { text: 'HIGH', color: COLORS.amber };
  return { text: 'MODERATE', color: COLORS.cyan };
}

export default function BriefingPage() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/briefing')
      .then(r => r.json())
      .then(data => setBriefing(data.briefing))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
        <span className="font-mono text-sm tracking-wider animate-pulse-soft" style={{ color: COLORS.dim }}>
          ASSEMBLING BRIEFING...
        </span>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
        <span className="font-mono text-sm" style={{ color: COLORS.dim }}>BRIEFING UNAVAILABLE</span>
      </div>
    );
  }

  const clusters = briefing.top_clusters;
  const hasClusters = clusters.length > 0;

  return (
    <div className="min-h-screen" style={{ background: COLORS.bg }}>
      {/* ─── Top Bar ─── */}
      <header
        className="fixed top-0 left-0 right-0 h-[52px] flex items-center justify-between px-6 z-[100]"
        style={{
          background: `${COLORS.bg}bf`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${COLORS.accent}0f`,
        }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="font-mono text-[15px] font-semibold tracking-[0.12em] text-white">
            NXT<span style={{ color: COLORS.accent }}>{'//'}
            </span>LINK
          </Link>
          <span
            className="font-mono text-[10px] font-semibold tracking-[0.15em] uppercase px-2 py-0.5 rounded"
            style={{ color: COLORS.gold, background: `${COLORS.gold}12`, border: `1px solid ${COLORS.gold}25` }}
          >
            EXECUTIVE BRIEFING
          </span>
        </div>
        <div className="font-mono text-[10px]" style={{ color: COLORS.dim }}>
          {briefing.total_signals.toLocaleString()} signals analyzed
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="pt-[72px] pb-[100px] px-6 max-w-[900px] mx-auto">

        {/* Header */}
        <div className="mb-10">
          <h1 className="font-mono text-[32px] font-bold tracking-wide text-white mb-2">
            TOP <span style={{ color: COLORS.accent }}>{hasClusters ? clusters.length : '—'}</span> THINGS THAT MATTER
          </h1>
          <p className="text-sm" style={{ color: COLORS.muted }}>
            {new Date(briefing.generated_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {' · '}{briefing.total_signals.toLocaleString()} signals across {briefing.velocity?.length || 0} active industries
          </p>
        </div>

        {/* Velocity bar */}
        {briefing.velocity && briefing.velocity.length > 0 && (
          <div className="flex gap-2 mb-8 flex-wrap">
            {briefing.velocity.map((v, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px]"
                style={{
                  background: `${COLORS.cyan}0a`,
                  border: `1px solid ${COLORS.cyan}15`,
                  color: COLORS.cyan,
                }}
              >
                <span className="font-bold">{v.velocity_ratio}x</span>
                {v.industry?.replace(/-/g, ' ').toUpperCase()}
                <span style={{ color: COLORS.dim }}>{v.signals_7d} / 7d</span>
              </span>
            ))}
          </div>
        )}

        {/* ─── Cluster Cards ─── */}
        {hasClusters ? (
          <div className="flex flex-col gap-6">
            {clusters.map((c, index) => {
              const priority = strengthLabel(c.strength);
              return (
                <div
                  key={c.id}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  {/* Card header */}
                  <div className="px-6 py-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="font-mono text-[28px] font-bold"
                        style={{ color: `${COLORS.accent}40` }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1">
                        <h2 className="text-[18px] font-semibold text-white leading-tight">{c.title}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="font-mono text-[9px] font-bold tracking-wider px-2 py-0.5 rounded"
                            style={{ color: priority.color, background: `${priority.color}15`, border: `1px solid ${priority.color}30` }}
                          >
                            {priority.text}
                          </span>
                          <span className="font-mono text-[9px]" style={{ color: COLORS.dim }}>
                            {c.signal_count} signals · strength {c.strength}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Intelligence */}
                  {c.what_is_happening && (
                    <div className="px-6 py-4 space-y-4">
                      <div>
                        <div className="font-mono text-[9px] font-bold tracking-[0.2em] mb-1.5" style={{ color: COLORS.cyan }}>
                          WHAT IS HAPPENING
                        </div>
                        <p className="text-[14px] leading-relaxed text-white">{c.what_is_happening}</p>
                      </div>
                      {c.why_it_matters && (
                        <div>
                          <div className="font-mono text-[9px] font-bold tracking-[0.2em] mb-1.5" style={{ color: COLORS.amber }}>
                            WHY IT MATTERS
                          </div>
                          <p className="text-[14px] leading-relaxed" style={{ color: `${COLORS.text}cc` }}>{c.why_it_matters}</p>
                        </div>
                      )}
                      {c.what_happens_next && (
                        <div>
                          <div className="font-mono text-[9px] font-bold tracking-[0.2em] mb-1.5" style={{ color: COLORS.green }}>
                            WHAT HAPPENS NEXT
                          </div>
                          <p className="text-[14px] leading-relaxed" style={{ color: `${COLORS.text}cc` }}>{c.what_happens_next}</p>
                        </div>
                      )}
                      {c.actions && c.actions.length > 0 && (
                        <div>
                          <div className="font-mono text-[9px] font-bold tracking-[0.2em] mb-2" style={{ color: COLORS.gold }}>
                            RECOMMENDED ACTIONS
                          </div>
                          <div className="space-y-1.5">
                            {c.actions.map((a, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="font-mono text-[11px] font-bold mt-0.5" style={{ color: COLORS.gold }}>
                                  {i + 1}.
                                </span>
                                <span className="text-[13px]" style={{ color: COLORS.text }}>{a}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Solutions: Vendors + Products */}
                  {(c.vendors.length > 0 || c.products.length > 0) && (
                    <div className="px-6 py-4" style={{ borderTop: `1px solid ${COLORS.border}`, background: `${COLORS.card}80` }}>
                      <div className="font-mono text-[9px] font-bold tracking-[0.2em] mb-3" style={{ color: COLORS.emerald }}>
                        RELEVANT SOLUTIONS
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Vendors */}
                        {c.vendors.slice(0, 3).map((v, i) => (
                          <div
                            key={`v-${i}`}
                            className="flex items-center gap-3 p-3 rounded-lg"
                            style={{ background: `${COLORS.surface}`, border: `1px solid ${COLORS.border}` }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-medium text-white truncate">{v.company_name}</div>
                              <div className="font-mono text-[9px] mt-0.5" style={{ color: COLORS.dim }}>
                                {v.sector} · IKER {v.iker_score}
                              </div>
                            </div>
                            {v.company_url && (
                              <a
                                href={v.company_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[8px] px-2 py-1 rounded shrink-0"
                                style={{ color: COLORS.accent, border: `1px solid ${COLORS.accent}20` }}
                              >
                                VISIT
                              </a>
                            )}
                          </div>
                        ))}
                        {/* Products */}
                        {c.products.slice(0, 3).map((p, i) => (
                          <div
                            key={`p-${i}`}
                            className="flex items-center gap-3 p-3 rounded-lg"
                            style={{ background: `${COLORS.surface}`, border: `1px solid ${COLORS.border}` }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-medium text-white truncate">{p.product_name}</div>
                              <div className="font-mono text-[9px] mt-0.5" style={{ color: COLORS.dim }}>
                                {p.company}{p.category ? ` · ${p.category}` : ''}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Fallback: show top signals if no clusters yet */
          <div>
            <p className="font-mono text-[11px] mb-4" style={{ color: COLORS.dim }}>
              Assembly layer has not run yet. Showing top signals:
            </p>
            <div className="flex flex-col gap-2">
              {briefing.fallback_signals.map((s: { id: string; title: string; industry: string; importance_score: number }) => (
                <div
                  key={s.id}
                  className="px-4 py-3 rounded-lg"
                  style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
                >
                  <div className="text-[14px] text-white">{s.title}</div>
                  <div className="font-mono text-[9px] mt-1" style={{ color: COLORS.dim }}>
                    {s.industry} · score {Math.round((s.importance_score || 0) * 100)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trends */}
        {briefing.trends.length > 0 && (
          <div className="mt-10">
            <h2 className="font-mono text-[13px] font-bold tracking-[0.15em] mb-4" style={{ color: COLORS.dim }}>
              ACTIVE TRENDS
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {briefing.trends.map((t, i) => (
                <div
                  key={i}
                  className="px-4 py-3 rounded-lg"
                  style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
                >
                  <div className="text-[13px] font-medium text-white">{t.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        color: t.direction === 'accelerating' ? COLORS.green : COLORS.amber,
                        background: `${t.direction === 'accelerating' ? COLORS.green : COLORS.amber}12`,
                      }}
                    >
                      {t.trend_type.toUpperCase()}
                    </span>
                    {t.velocity > 0 && (
                      <span className="font-mono text-[9px]" style={{ color: COLORS.dim }}>
                        {t.velocity}x velocity
                      </span>
                    )}
                    <span className="font-mono text-[9px]" style={{ color: COLORS.dim }}>
                      {t.confidence}% confidence
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
