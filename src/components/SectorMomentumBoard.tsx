'use client';

import type { SectorScore } from '@/lib/intelligence/signal-engine';

type Props = {
  scores: SectorScore[];
};

const TREND_ICON: Record<string, string> = {
  rising:  '↑',
  stable:  '→',
  falling: '↓',
};

const TREND_COLOR: Record<string, string> = {
  rising:  '#00ff88',
  stable:  'rgba(255,255,255,0.4)',
  falling: '#ff3b30',
};

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="h-0.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${Math.min(100, score)}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 6px ${color}66`,
        }}
      />
    </div>
  );
}

export function SectorMomentumBoard({ scores }: Props) {
  if (scores.length === 0) {
    return (
      <div className="px-3 py-4 font-mono text-[9px] text-white/20 text-center">
        Loading sector momentum…
      </div>
    );
  }

  // Sort: highest score first
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col gap-0">
      <div className="px-3 pt-2 pb-1 flex items-center justify-between">
        <span className="font-mono text-[8px] tracking-[0.25em] text-white/25">SECTOR MOMENTUM</span>
        <span className="font-mono text-[8px] text-white/15">LIVE</span>
      </div>

      {sorted.map((sector) => {
        const trendIcon  = TREND_ICON[sector.trend] ?? '→';
        const trendColor = TREND_COLOR[sector.trend] ?? 'rgba(255,255,255,0.4)';

        // Score thresholds → level label
        const level =
          sector.score >= 70 ? 'ELEVATED' :
          sector.score >= 45 ? 'ACTIVE' :
          sector.score >= 20 ? 'NOMINAL' : 'QUIET';

        const levelColor =
          sector.score >= 70 ? '#ff6400' :
          sector.score >= 45 ? '#ffb800' :
          sector.score >= 20 ? sector.color : 'rgba(255,255,255,0.2)';

        return (
          <div
            key={sector.id}
            className="px-3 py-2 flex flex-col gap-1.5 border-b border-white/[0.04] last:border-0"
          >
            {/* Row 1: label + trend + score */}
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: sector.color, boxShadow: `0 0 4px ${sector.color}` }}
              />
              <span className="font-mono text-[10px] tracking-wide text-white/70 flex-1">
                {sector.label}
              </span>
              <span className="font-mono text-[10px]" style={{ color: trendColor }}>
                {trendIcon}
              </span>
              <span className="font-mono text-[10px] font-bold" style={{ color: sector.color }}>
                {sector.score}
              </span>
            </div>

            {/* Score bar */}
            <ScoreBar score={sector.score} color={sector.color} />

            {/* Row 3: metadata */}
            <div className="flex items-center gap-3">
              <span
                className="font-mono text-[7px] tracking-wider px-1 rounded-sm"
                style={{ background: `${levelColor}15`, color: levelColor }}
              >
                {level}
              </span>
              <span className="font-mono text-[8px] text-white/20">
                {sector.articleCount} signals
              </span>
              {sector.contractCount > 0 && (
                <span className="font-mono text-[8px]" style={{ color: '#ffb800' }}>
                  {sector.contractCount} contract{sector.contractCount > 1 ? 's' : ''}
                </span>
              )}
              {sector.topVendor && (
                <span className="ml-auto font-mono text-[8px] text-white/25 truncate max-w-[80px]">
                  {sector.topVendor}
                </span>
              )}
            </div>

            {/* Top headline */}
            {sector.topHeadline && (
              <p className="font-mono text-[8px] text-white/20 leading-tight line-clamp-1">
                {sector.topHeadline}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
