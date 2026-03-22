'use client';

import { useMemo } from 'react';
import { COLORS } from '@/lib/tokens';
import type { Technology } from '@/lib/data/technology-catalog';

// ─── Types ──────────────────────────────────────────────────────────────────

type Props = {
  technologies: Technology[];
  accentColor: string;
};

type RecommendationLevel = 'ADOPT NOW' | 'PILOT SOON' | 'MONITOR' | 'WATCHLIST' | 'AVOID';

type Recommendation = {
  tech: Technology;
  level: RecommendationLevel;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  timeHorizon: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<RecommendationLevel, string> = {
  'ADOPT NOW': COLORS.green,
  'PILOT SOON': COLORS.cyan,
  MONITOR: COLORS.amber,
  WATCHLIST: 'rgba(255,255,255,0.3)',
  AVOID: COLORS.red,
};

const TIME_HORIZONS: Record<RecommendationLevel, string> = {
  'ADOPT NOW': 'Now',
  'PILOT SOON': '3–6 months',
  MONITOR: '6–12 months',
  WATCHLIST: '12–24 months',
  AVOID: '—',
};

function truncateReason(description: string, max = 100): string {
  const firstSentence = description.split(/\.\s/)[0];
  if (firstSentence.length <= max) return firstSentence + '.';
  return firstSentence.slice(0, max).trimEnd() + '…';
}

function computeConfidence(tech: Technology): 'high' | 'medium' | 'low' {
  const vendorScore = tech.relatedVendorCount >= 40 ? 2 : tech.relatedVendorCount >= 20 ? 1 : 0;
  const budgetScore = (tech.governmentBudgetFY25M ?? 0) >= 1000 ? 2 : (tech.governmentBudgetFY25M ?? 0) >= 300 ? 1 : 0;
  const total = vendorScore + budgetScore;
  if (total >= 3) return 'high';
  if (total >= 2) return 'medium';
  return 'low';
}

function formatBudget(millions?: number): string | null {
  if (millions == null) return null;
  if (millions >= 1000) return `$${(millions / 1000).toFixed(1)}B`;
  return `$${millions}M`;
}

function deriveRecommendations(technologies: Technology[]): Recommendation[] {
  const results: Recommendation[] = [];
  const used = new Set<string>();

  const add = (tech: Technology, level: RecommendationLevel) => {
    if (used.has(tech.id)) return;
    used.add(tech.id);
    results.push({
      tech,
      level,
      reason: truncateReason(tech.description),
      confidence: computeConfidence(tech),
      timeHorizon: TIME_HORIZONS[level],
    });
  };

  // 5. AVOID / OVERHYPED — emerging + vendorCount > 50
  const overhyped = technologies.filter(
    (t) => t.maturityLevel === 'emerging' && t.relatedVendorCount > 50,
  );
  for (const t of overhyped) add(t, 'AVOID');

  // 1. ADOPT NOW — mature + high elPasoRelevance + vendorCount ≥ 40
  const adoptNow = technologies.filter(
    (t) => t.maturityLevel === 'mature' && t.elPasoRelevance === 'high' && t.relatedVendorCount >= 40,
  );
  for (const t of adoptNow) add(t, 'ADOPT NOW');

  // 2. PILOT SOON — growing + high elPasoRelevance + budget ≥ 500M
  const pilotSoon = technologies.filter(
    (t) =>
      t.maturityLevel === 'growing' &&
      t.elPasoRelevance === 'high' &&
      (t.governmentBudgetFY25M ?? 0) >= 500,
  );
  for (const t of pilotSoon) add(t, 'PILOT SOON');

  // 3. MONITOR — growing + medium elPasoRelevance
  const monitor = technologies.filter(
    (t) => t.maturityLevel === 'growing' && t.elPasoRelevance === 'medium',
  );
  for (const t of monitor) add(t, 'MONITOR');

  // 4. WATCHLIST — emerging + high elPasoRelevance
  const watchlist = technologies.filter(
    (t) => t.maturityLevel === 'emerging' && t.elPasoRelevance === 'high',
  );
  for (const t of watchlist) add(t, 'WATCHLIST');

  return results.slice(0, 5);
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RecommendedMoves({ technologies, accentColor }: Props) {
  const recommendations = useMemo(() => deriveRecommendations(technologies), [technologies]);

  if (recommendations.length === 0) return null;

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-[2px] h-3 rounded-full"
          style={{ background: accentColor }}
        />
        <span className="font-mono text-[8px] tracking-[0.3em] uppercase" style={{ color: 'rgba(255,255,255,0.15)' }}>
          RECOMMENDED MOVES
        </span>
      </div>

      {/* Horizontally scrollable card row */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
        {recommendations.map((rec) => {
          const levelColor = LEVEL_COLORS[rec.level];
          const budgetStr = formatBudget(rec.tech.governmentBudgetFY25M);

          return (
            <div
              key={rec.tech.id}
              className="flex-shrink-0 flex flex-col gap-3 rounded-2xl p-5"
              style={{
                background: COLORS.card,
                border: '1px solid rgba(255,255,255,0.04)',
                width: 240,
                minWidth: 240,
              }}
            >
              {/* Badge */}
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[8px] tracking-[0.15em] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    color: levelColor,
                    background: `${typeof levelColor === 'string' && levelColor.startsWith('rgba') ? 'rgba(255,255,255,0.04)' : levelColor + '14'}`,
                    border: `1px solid ${typeof levelColor === 'string' && levelColor.startsWith('rgba') ? 'rgba(255,255,255,0.06)' : levelColor + '30'}`,
                  }}
                >
                  {rec.level}
                </span>
              </div>

              {/* Technology name */}
              <span className="font-mono text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {rec.tech.name}
              </span>

              {/* Reason */}
              <p className="font-mono text-[9px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {rec.reason}
              </p>

              {/* Bottom stats */}
              <div className="mt-auto flex flex-col gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                {/* Confidence */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[7px] tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.15)' }}>
                    Confidence
                  </span>
                  <div className="flex items-center gap-1">
                    {(['high', 'medium', 'low'] as const).map((level, i) => (
                      <div
                        key={level}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background:
                            (rec.confidence === 'high' && i <= 2) ||
                            (rec.confidence === 'medium' && i <= 1) ||
                            (rec.confidence === 'low' && i === 0)
                              ? accentColor
                              : 'rgba(255,255,255,0.06)',
                        }}
                      />
                    ))}
                    <span className="font-mono text-[7px] ml-1 uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {rec.confidence}
                    </span>
                  </div>
                </div>

                {/* Time horizon */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[7px] tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.15)' }}>
                    Horizon
                  </span>
                  <span className="font-mono text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {rec.timeHorizon}
                  </span>
                </div>

                {/* Budget */}
                {budgetStr && (
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[7px] tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.15)' }}>
                      Gov Budget
                    </span>
                    <span className="font-mono text-[8px] font-bold" style={{ color: COLORS.gold }}>
                      {budgetStr}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
