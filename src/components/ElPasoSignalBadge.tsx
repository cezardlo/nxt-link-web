'use client';
// @ts-nocheck

interface ElPasoSignalBadgeProps {
  score: number;
  angle?: string;
  size?: 'sm' | 'md';
}

export function ElPasoSignalBadge({ score, angle, size = 'sm' }: ElPasoSignalBadgeProps) {
  if (!score || score < 40) return null;

  const textSize = size === 'md' ? 'text-[11px]' : 'text-[10px]';

  if (score >= 80) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono uppercase tracking-wide ${textSize} bg-amber-500/15 text-amber-400 border border-amber-500/30`}
        title={angle}
      >
        🎯 EP DIRECT
      </span>
    );
  }

  if (score >= 60) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono uppercase tracking-wide ${textSize} bg-teal-500/10 text-teal-400 border border-teal-500/20`}
        title={angle}
      >
        📡 EP RELEVANT
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono uppercase tracking-wide ${textSize} bg-gray-500/10 text-gray-400 border border-gray-500/20`}
      title={angle}
    >
      🌎 EP CONTEXT
    </span>
  );
}

export function DirectionBadge({ direction }: { direction: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    growing:    { label: '↑ GROWING',    className: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
    emerging:   { label: '⚡ EMERGING',   className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    converging: { label: '⊕ CONVERGING', className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    disrupted:  { label: '⚠ DISRUPTED',  className: 'bg-red-500/10 text-red-400 border-red-500/20' },
    declining:  { label: '↓ DECLINING',  className: 'bg-red-500/10 text-red-400 border-red-500/20' },
    stable:     { label: '→ STABLE',     className: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  };

  const config = configs[direction?.toLowerCase()] ?? configs['stable'];

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-mono uppercase text-[10px] tracking-wide border ${config.className}`}>
      {config.label}
    </span>
  );
}
