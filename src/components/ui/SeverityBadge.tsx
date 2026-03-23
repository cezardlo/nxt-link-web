'use client';

// ─── SeverityBadge — P0/P1/P2/P3 signal priority indicator ──────────────────
// Used across signal cards, feeds, alerts, and connection graphs.

type Severity = 'P0' | 'P1' | 'P2' | 'P3';

const SEVERITY_CONFIG: Record<Severity, { color: string; bg: string; label: string; glow: boolean }> = {
  P0: { color: '#ff3b30', bg: '#ff3b3018', label: 'CRITICAL', glow: true },
  P1: { color: '#f97316', bg: '#f9731618', label: 'HIGH',     glow: true },
  P2: { color: '#ffd700', bg: '#ffd70018', label: 'ELEVATED', glow: false },
  P3: { color: '#00d4ff', bg: '#00d4ff18', label: 'NORMAL',   glow: false },
};

type Props = {
  severity: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  pulse?: boolean;
};

export function SeverityBadge({ severity, showLabel = false, size = 'md', pulse = false }: Props) {
  const config = SEVERITY_CONFIG[severity as Severity] ?? SEVERITY_CONFIG.P3;
  const sz = size === 'sm'
    ? 'text-[7px] px-1 py-px'
    : 'text-[8px] px-1.5 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-bold tracking-wider rounded-sm border ${sz}`}
      style={{
        color: config.color,
        backgroundColor: config.bg,
        borderColor: `${config.color}40`,
        boxShadow: config.glow ? `0 0 6px ${config.color}44` : undefined,
      }}
    >
      {pulse && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
          style={{ backgroundColor: config.color }}
        />
      )}
      {severity}
      {showLabel && (
        <span style={{ opacity: 0.7 }}>{config.label}</span>
      )}
    </span>
  );
}

/** Dot-only severity indicator for compact layouts */
export function SeverityDot({ severity, size = 6 }: { severity: string; size?: number }) {
  const config = SEVERITY_CONFIG[severity as Severity] ?? SEVERITY_CONFIG.P3;
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: config.color,
        boxShadow: config.glow ? `0 0 4px ${config.color}cc` : undefined,
      }}
    />
  );
}
