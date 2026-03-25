'use client';

import { useState, useEffect } from 'react';
import { COLORS } from '@/lib/tokens';

interface Briefing {
  id: string;
  title: string;
  signal_count: number;
  companies: string[];
  industries: string[];
  technologies: string[];
  strength: number;
  first_signal: string;
  last_signal: string;
  what_is_happening: string | null;
  why_it_matters: string | null;
  what_happens_next: string | null;
  actions: string[] | null;
  narrative_confidence: number | null;
  recommendations: { rec_type: string; entity_name: string; reason: string }[];
}

interface Trend {
  name: string;
  trend_type: string;
  velocity: number;
  direction: string;
  confidence: number;
  signal_count: number;
}

function strengthColor(s: number): string {
  if (s >= 70) return COLORS.cyan;
  if (s >= 50) return COLORS.amber;
  return COLORS.dim;
}

function trendIcon(type: string): string {
  switch (type) {
    case 'spike': return '\u25B2';    // ▲
    case 'growth': return '\u2197';   // ↗
    case 'cooling': return '\u2198';  // ↘
    case 'chain': return '\u2192';    // →
    case 'emergence': return '\u2726'; // ✦
    default: return '\u25CF';         // ●
  }
}

export function ClusterBriefings() {
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/assembly?limit=10&min_strength=30')
      .then(r => r.json())
      .then(data => {
        setBriefings(data.briefings || []);
        setTrends(data.trends || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-3">
        <div className="font-mono text-[9px] tracking-[0.2em] animate-pulse-soft" style={{ color: COLORS.dim }}>
          ASSEMBLING INTELLIGENCE...
        </div>
      </div>
    );
  }

  if (briefings.length === 0 && trends.length === 0) return null;

  return (
    <div className="px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
      {/* Section label */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse-soft" style={{ background: COLORS.cyan }} />
        <span className="font-mono text-[9px] font-semibold tracking-[0.2em]" style={{ color: COLORS.cyan }}>
          INTELLIGENCE BRIEFING
        </span>
        <span className="font-mono text-[8px]" style={{ color: COLORS.dim }}>
          {briefings.length} clusters · {trends.length} trends
        </span>
      </div>

      {/* Trends bar */}
      {trends.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {trends.slice(0, 5).map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-1 rounded font-mono text-[9px]"
              style={{
                background: t.direction === 'accelerating' ? `${COLORS.cyan}0f` : `${COLORS.amber}0f`,
                border: `1px solid ${t.direction === 'accelerating' ? COLORS.cyan : COLORS.amber}20`,
                color: t.direction === 'accelerating' ? COLORS.cyan : COLORS.amber,
              }}
            >
              {trendIcon(t.trend_type)} {t.name}
              {t.velocity > 0 && <span style={{ color: COLORS.dim }}>{t.velocity}x</span>}
            </span>
          ))}
        </div>
      )}

      {/* Cluster briefings */}
      <div className="flex flex-col gap-1.5">
        {briefings.slice(0, 5).map((b) => {
          const isExpanded = expanded === b.id;
          const hasNarrative = !!b.what_is_happening;

          return (
            <div
              key={b.id}
              className="rounded-lg transition-colors cursor-pointer"
              style={{
                background: isExpanded ? `${COLORS.surface}` : `${COLORS.card}80`,
                border: `1px solid ${isExpanded ? `${COLORS.cyan}20` : COLORS.border}`,
              }}
              onClick={() => setExpanded(isExpanded ? null : b.id)}
            >
              {/* Header row */}
              <div className="flex items-center gap-2 px-3 py-2">
                <span
                  className="font-mono text-[11px] font-bold tabular-nums w-6 text-center"
                  style={{ color: strengthColor(b.strength) }}
                >
                  {b.strength}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-white truncate">{b.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[8px]" style={{ color: COLORS.dim }}>
                      {b.signal_count} signals
                    </span>
                    {b.industries.slice(0, 2).map((ind, i) => (
                      <span key={i} className="font-mono text-[8px] tracking-wide" style={{ color: COLORS.cyan }}>
                        {ind.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="font-mono text-[10px]" style={{ color: COLORS.dim }}>
                  {isExpanded ? '\u25B4' : '\u25BE'}
                </span>
              </div>

              {/* Expanded content */}
              {isExpanded && hasNarrative && (
                <div className="px-3 pb-3 pt-0" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <div className="mt-2 space-y-2">
                    {/* What */}
                    <div>
                      <span className="font-mono text-[8px] tracking-[0.15em] block mb-0.5" style={{ color: COLORS.cyan }}>
                        WHAT IS HAPPENING
                      </span>
                      <p className="text-[11px] leading-relaxed" style={{ color: COLORS.text }}>
                        {b.what_is_happening}
                      </p>
                    </div>

                    {/* Why */}
                    <div>
                      <span className="font-mono text-[8px] tracking-[0.15em] block mb-0.5" style={{ color: COLORS.amber }}>
                        WHY IT MATTERS
                      </span>
                      <p className="text-[11px] leading-relaxed" style={{ color: `${COLORS.text}cc` }}>
                        {b.why_it_matters}
                      </p>
                    </div>

                    {/* Next */}
                    <div>
                      <span className="font-mono text-[8px] tracking-[0.15em] block mb-0.5" style={{ color: COLORS.green }}>
                        WHAT HAPPENS NEXT
                      </span>
                      <p className="text-[11px] leading-relaxed" style={{ color: `${COLORS.text}cc` }}>
                        {b.what_happens_next}
                      </p>
                    </div>

                    {/* Actions */}
                    {b.actions && b.actions.length > 0 && (
                      <div>
                        <span className="font-mono text-[8px] tracking-[0.15em] block mb-1" style={{ color: COLORS.gold }}>
                          ACTIONS
                        </span>
                        <div className="flex flex-col gap-1">
                          {b.actions.map((a, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <span className="text-[9px] mt-0.5" style={{ color: COLORS.gold }}>&#x25B8;</span>
                              <span className="text-[10px]" style={{ color: `${COLORS.text}b3` }}>{a}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {b.recommendations.length > 0 && (
                      <div>
                        <span className="font-mono text-[8px] tracking-[0.15em] block mb-1" style={{ color: COLORS.emerald }}>
                          RECOMMENDED
                        </span>
                        <div className="flex gap-1.5 flex-wrap">
                          {b.recommendations.slice(0, 4).map((r, i) => (
                            <span
                              key={i}
                              className="font-mono text-[8px] px-2 py-0.5 rounded"
                              style={{
                                background: `${COLORS.emerald}0f`,
                                border: `1px solid ${COLORS.emerald}20`,
                                color: COLORS.emerald,
                              }}
                            >
                              {r.entity_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Expanded but no narrative yet */}
              {isExpanded && !hasNarrative && (
                <div className="px-3 pb-3 pt-1" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <p className="text-[10px] font-mono" style={{ color: COLORS.dim }}>
                    Narrative pending — will generate on next assembly run.
                  </p>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {b.companies.map((c, i) => (
                      <span key={i} className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${COLORS.cyan}0a`, color: COLORS.cyan }}>
                        {c}
                      </span>
                    ))}
                    {b.technologies.map((t, i) => (
                      <span key={i} className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${COLORS.green}0a`, color: COLORS.green }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
