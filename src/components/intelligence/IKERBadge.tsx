import { getIkerTier, getIkerColor } from '@/lib/iker-score';

type Props = {
  score: number;
  compact?: boolean;
};

/**
 * Lightweight IKER badge for lists and cards.
 * Uses the same scoring thresholds as the full IkerBadge.
 */
export function IKERBadge({ score, compact = false }: Props) {
  const tier = getIkerTier(score);
  const color = getIkerColor(score);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: compact ? '3px 6px' : '4px 8px',
        border: `1px solid ${color}44`,
        borderRadius: 4,
        background: `${color}14`,
        color,
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        fontSize: compact ? 9 : 10,
        letterSpacing: '0.08em',
      }}
    >
      <span>{tier}</span>
      <span style={{ opacity: 0.85 }}>{Math.round(score)}</span>
    </span>
  );
}
