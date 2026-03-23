'use client';

import { COLORS } from '@/lib/tokens';

// ─── StatCard — Bloomberg-style KPI display ──────────────────────────────────
// Compact, data-dense, every pixel earns its place.

type Props = {
  label: string;
  value: string | number;
  change?: number;       // percentage change (+5.2, -3.1)
  changeLabel?: string;  // "vs last week"
  accent?: string;
  size?: 'sm' | 'md' | 'lg';
};

export function StatCard({ label, value, change, changeLabel, accent = COLORS.cyan, size = 'md' }: Props) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const changeColor = isPositive ? COLORS.green : isNegative ? COLORS.red : `${COLORS.text}40`;
  const changeIcon = isPositive ? '▲' : isNegative ? '▼' : '→';

  const labelSize = size === 'sm' ? 'text-[7px]' : size === 'lg' ? 'text-[9px]' : 'text-[8px]';
  const valueSize = size === 'sm' ? 'text-[16px]' : size === 'lg' ? 'text-[28px]' : 'text-[22px]';

  return (
    <div
      className="flex flex-col gap-1 p-3 rounded-lg"
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      {/* Label */}
      <span
        className={`${labelSize} font-mono tracking-[0.2em] uppercase`}
        style={{ color: `${COLORS.text}35` }}
      >
        {label}
      </span>

      {/* Value */}
      <span
        className={`${valueSize} font-bold font-mono tabular-nums leading-none`}
        style={{ color: accent }}
      >
        {value}
      </span>

      {/* Change indicator */}
      {change !== undefined && (
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono font-bold" style={{ color: changeColor }}>
            {changeIcon} {Math.abs(change).toFixed(1)}%
          </span>
          {changeLabel && (
            <span className="text-[7px] font-mono" style={{ color: `${COLORS.text}25` }}>
              {changeLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── StatRow — Inline stat for dense layouts ─────────────────────────────────

type RowProps = {
  label: string;
  value: string | number;
  color?: string;
};

export function StatRow({ label, value, color = COLORS.text }: RowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[9px] font-mono" style={{ color: `${COLORS.text}40` }}>
        {label}
      </span>
      <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
