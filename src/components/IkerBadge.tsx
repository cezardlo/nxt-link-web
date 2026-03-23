'use client';

import { useState } from 'react';
import { COLORS } from '@/lib/tokens';
import { getIkerTier, getIkerColor, IKER_TIERS, type IkerBreakdown } from '@/lib/iker-score';

interface IkerBadgeProps {
  score: number;
  breakdown?: IkerBreakdown | null;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * IkerBadge — Progressive disclosure IKER score display.
 *
 * Level 1 (default): Score badge with color
 * Level 2 (hover): Tier label + key factors
 * Level 3 (click): Full breakdown panel
 */
export function IkerBadge({ score, breakdown, size = 'md' }: IkerBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const tier = getIkerTier(score);
  const color = getIkerColor(score);
  const tierConfig = IKER_TIERS[tier];

  const fontSize = size === 'sm' ? 9 : size === 'lg' ? 14 : 11;
  const padding = size === 'sm' ? '2px 6px' : size === 'lg' ? '6px 14px' : '3px 10px';

  return (
    <div className="relative inline-block">
      {/* Level 1: Badge */}
      <button
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="font-mono font-bold tabular-nums rounded-md transition-all cursor-pointer"
        style={{
          fontSize,
          padding,
          background: `${color}18`,
          color,
          border: `1px solid ${color}33`,
        }}
      >
        {score}
        <span className="ml-1.5 font-normal" style={{ fontSize: fontSize - 2, opacity: 0.7 }}>
          {tier}
        </span>
      </button>

      {/* Level 2: Hover tooltip */}
      {hovered && !expanded && breakdown && (
        <div
          className="absolute z-50 left-0 top-full mt-1 font-mono rounded-lg shadow-xl"
          style={{
            background: COLORS.card,
            border: `1px solid ${color}22`,
            padding: '10px 14px',
            minWidth: 220,
            pointerEvents: 'none',
          }}
        >
          <div className="text-[10px] font-bold mb-2" style={{ color }}>
            {tierConfig.label}
          </div>
          {breakdown.external.factors.slice(0, 2).map((f, i) => (
            <div key={i} className="text-[8px] mb-0.5" style={{ color: `${COLORS.text}66` }}>
              + {f}
            </div>
          ))}
          {breakdown.stability.factors.slice(0, 1).map((f, i) => (
            <div key={`s${i}`} className="text-[8px] mb-0.5" style={{ color: `${COLORS.text}66` }}>
              = {f}
            </div>
          ))}
          {breakdown.context.factors.filter(f => f.includes('No') || f.includes('declining')).slice(0, 1).map((f, i) => (
            <div key={`c${i}`} className="text-[8px] mb-0.5" style={{ color: `${COLORS.red}88` }}>
              - {f}
            </div>
          ))}
        </div>
      )}

      {/* Level 3: Expanded breakdown */}
      {expanded && breakdown && (
        <div
          className="absolute z-50 left-0 top-full mt-1 font-mono rounded-xl shadow-xl"
          style={{
            background: COLORS.card,
            border: `1px solid ${color}22`,
            padding: '16px',
            minWidth: 280,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[14px] font-bold tabular-nums" style={{ color }}>{score}</span>
              <span className="text-[9px] ml-2" style={{ color: `${color}88` }}>{tierConfig.label}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
              className="text-[8px] px-2 py-0.5 rounded cursor-pointer"
              style={{ color: `${COLORS.text}40`, background: `${COLORS.text}08` }}
            >
              CLOSE
            </button>
          </div>

          {/* Score bars */}
          {[
            { label: 'EXTERNAL SIGNALS', data: breakdown.external, barColor: COLORS.cyan },
            { label: 'STABILITY', data: breakdown.stability, barColor: COLORS.green },
            { label: 'BUSINESS CONTEXT', data: breakdown.context, barColor: COLORS.gold },
          ].map(({ label, data, barColor }) => (
            <div key={label} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[7px] tracking-[0.15em]" style={{ color: `${COLORS.text}44` }}>{label}</span>
                <span className="text-[8px] tabular-nums" style={{ color: `${COLORS.text}66` }}>
                  {data.score}/{data.max}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1 rounded-full" style={{ background: `${COLORS.text}0a` }}>
                <div
                  className="h-1 rounded-full transition-all"
                  style={{
                    width: `${(data.score / data.max) * 100}%`,
                    background: barColor,
                    boxShadow: `0 0 6px ${barColor}40`,
                  }}
                />
              </div>
              {/* Factors */}
              {data.factors.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {data.factors.map((f, i) => (
                    <div key={i} className="text-[7px]" style={{ color: `${COLORS.text}44` }}>
                      {f}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
