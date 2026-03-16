'use client';

import { useMemo } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────────

type AdoptionStage =
  | 'innovators'
  | 'early_adopters'
  | 'early_majority'
  | 'late_majority'
  | 'laggards';

type AdoptionCurveChartProps = {
  stage?: AdoptionStage;
  score?: number;
  momentum?: 'accelerating' | 'steady' | 'decelerating';
  accentColor?: string;
  label?: string;
};

// ─── Constants ──────────────────────────────────────────────────────────────────

const STAGES: { key: AdoptionStage; label: string; start: number; end: number }[] = [
  { key: 'innovators',      label: 'INNOVATORS',      start: 0,   end: 0.16 },
  { key: 'early_adopters',  label: 'EARLY ADOPTERS',  start: 0.16, end: 0.36 },
  { key: 'early_majority',  label: 'EARLY MAJORITY',  start: 0.36, end: 0.64 },
  { key: 'late_majority',   label: 'LATE MAJORITY',   start: 0.64, end: 0.84 },
  { key: 'laggards',        label: 'LAGGARDS',        start: 0.84, end: 1.0 },
];

const MOMENTUM_INDICATORS: Record<string, { symbol: string; color: string; label: string }> = {
  accelerating: { symbol: '\u2191', color: '#00ff88', label: 'ACCELERATING' },
  steady:       { symbol: '\u2192', color: '#6b7280', label: 'STEADY' },
  decelerating: { symbol: '\u2193', color: '#f97316', label: 'DECELERATING' },
};

// ─── S-curve math ───────────────────────────────────────────────────────────────

/** Compute S-curve Y for a given t (0-1). Returns 0-1. */
function sCurveY(t: number): number {
  // Logistic function centered at 0.5, steepness k=10
  return 1 / (1 + Math.exp(-10 * (t - 0.5)));
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function AdoptionCurveChart({
  stage = 'early_majority',
  score = 55,
  momentum,
  accentColor = '#00d4ff',
  label,
}: AdoptionCurveChartProps) {
  // SVG viewBox dimensions
  const W = 440;
  const H = 200;
  const PAD_L = 20;
  const PAD_R = 20;
  const PAD_T = 30;
  const PAD_B = 44;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  // Build the S-curve path
  const curvePath = useMemo(() => {
    const steps = 80;
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = PAD_L + t * plotW;
      const y = PAD_T + plotH - sCurveY(t) * plotH;
      pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [plotW, plotH]);

  // Filled area under curve
  const areaPath = useMemo(() => {
    const steps = 80;
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = PAD_L + t * plotW;
      const y = PAD_T + plotH - sCurveY(t) * plotH;
      pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    // Close area to bottom
    pts.push(`L${(PAD_L + plotW).toFixed(1)},${(PAD_T + plotH).toFixed(1)}`);
    pts.push(`L${PAD_L.toFixed(1)},${(PAD_T + plotH).toFixed(1)}`);
    pts.push('Z');
    return pts.join(' ');
  }, [plotW, plotH]);

  // Dot position from score
  const t = Math.max(0, Math.min(100, score)) / 100;
  const dotX = PAD_L + t * plotW;
  const dotY = PAD_T + plotH - sCurveY(t) * plotH;

  const momentumInfo = momentum ? MOMENTUM_INDICATORS[momentum] : undefined;

  return (
    <div className="w-full" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Header */}
      {label && (
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[10px] tracking-widest font-mono uppercase"
            style={{ color: accentColor }}
          >
            {label}
          </span>
          <span className="text-[8px] tracking-wider text-white/30 font-mono">
            ADOPTION CURVE
          </span>
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: 200 }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Glow filter for the dot */}
          <filter id="acg-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Gradient for area fill */}
          <linearGradient id="acg-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.12" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Zone vertical bands */}
        {STAGES.map((s) => {
          const x1 = PAD_L + s.start * plotW;
          const w = (s.end - s.start) * plotW;
          const isActive = s.key === stage;
          return (
            <rect
              key={s.key}
              x={x1}
              y={PAD_T}
              width={w}
              height={plotH}
              fill={isActive ? accentColor : 'white'}
              opacity={isActive ? 0.06 : 0.015}
            />
          );
        })}

        {/* Zone divider lines */}
        {STAGES.slice(1).map((s) => {
          const x = PAD_L + s.start * plotW;
          return (
            <line
              key={`div-${s.key}`}
              x1={x}
              y1={PAD_T}
              x2={x}
              y2={PAD_T + plotH}
              stroke="white"
              strokeOpacity={0.06}
              strokeWidth={0.5}
              strokeDasharray="2 3"
            />
          );
        })}

        {/* Area under curve */}
        <path d={areaPath} fill="url(#acg-area-grad)" />

        {/* S-curve line */}
        <path
          d={curvePath}
          fill="none"
          stroke={accentColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.8}
        />

        {/* Vertical guide line from dot to baseline */}
        <line
          x1={dotX}
          y1={dotY}
          x2={dotX}
          y2={PAD_T + plotH}
          stroke={accentColor}
          strokeOpacity={0.15}
          strokeWidth={0.5}
          strokeDasharray="2 3"
        />

        {/* Glowing dot */}
        <circle
          cx={dotX}
          cy={dotY}
          r={5}
          fill={accentColor}
          filter="url(#acg-glow)"
        />
        <circle cx={dotX} cy={dotY} r={2.5} fill="white" opacity={0.9} />

        {/* Score label near dot */}
        <text
          x={dotX}
          y={dotY - 12}
          textAnchor="middle"
          fill="white"
          fontSize={10}
          fontFamily="'IBM Plex Mono', monospace"
          fontWeight={600}
        >
          {score}
        </text>

        {/* Momentum indicator */}
        {momentumInfo && (
          <g>
            <text
              x={dotX + 14}
              y={dotY - 6}
              fill={momentumInfo.color}
              fontSize={12}
              fontFamily="'IBM Plex Mono', monospace"
              fontWeight={700}
            >
              {momentumInfo.symbol}
            </text>
            <text
              x={dotX + 26}
              y={dotY - 6}
              fill={momentumInfo.color}
              fontSize={7}
              fontFamily="'IBM Plex Mono', monospace"
              opacity={0.7}
            >
              {momentumInfo.label}
            </text>
          </g>
        )}

        {/* Baseline */}
        <line
          x1={PAD_L}
          y1={PAD_T + plotH}
          x2={PAD_L + plotW}
          y2={PAD_T + plotH}
          stroke="white"
          strokeOpacity={0.08}
          strokeWidth={0.5}
        />

        {/* Stage labels at bottom */}
        {STAGES.map((s) => {
          const cx = PAD_L + ((s.start + s.end) / 2) * plotW;
          const isActive = s.key === stage;
          return (
            <text
              key={`lbl-${s.key}`}
              x={cx}
              y={PAD_T + plotH + 14}
              textAnchor="middle"
              fill={isActive ? accentColor : 'rgba(255,255,255,0.3)'}
              fontSize={7}
              fontFamily="'IBM Plex Mono', monospace"
              letterSpacing="0.06em"
              fontWeight={isActive ? 600 : 400}
            >
              {s.label}
            </text>
          );
        })}

        {/* Active stage underline */}
        {(() => {
          const active = STAGES.find((s) => s.key === stage);
          if (!active) return null;
          const x1 = PAD_L + active.start * plotW + 4;
          const x2 = PAD_L + active.end * plotW - 4;
          return (
            <line
              x1={x1}
              y1={PAD_T + plotH + 19}
              x2={x2}
              y2={PAD_T + plotH + 19}
              stroke={accentColor}
              strokeWidth={1}
              strokeOpacity={0.4}
            />
          );
        })()}

        {/* Y-axis: Adoption % labels */}
        <text
          x={PAD_L - 4}
          y={PAD_T + 4}
          textAnchor="end"
          fill="rgba(255,255,255,0.2)"
          fontSize={7}
          fontFamily="'IBM Plex Mono', monospace"
        >
          100%
        </text>
        <text
          x={PAD_L - 4}
          y={PAD_T + plotH}
          textAnchor="end"
          fill="rgba(255,255,255,0.2)"
          fontSize={7}
          fontFamily="'IBM Plex Mono', monospace"
        >
          0%
        </text>
      </svg>
    </div>
  );
}
