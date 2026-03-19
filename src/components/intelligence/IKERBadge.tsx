type Props = {
  score: number;
  compact?: boolean;
};

function band(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'TRUSTED', color: '#00ff88' };
  if (score >= 70) return { label: 'STRONG', color: '#00d4ff' };
  if (score >= 50) return { label: 'WATCH', color: '#ffd700' };
  return { label: 'RISK', color: '#ff3b30' };
}

export function IKERBadge({ score, compact = false }: Props) {
  const b = band(score);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: compact ? '3px 6px' : '4px 8px',
        border: `1px solid ${b.color}44`,
        borderRadius: 4,
        background: `${b.color}14`,
        color: b.color,
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        fontSize: compact ? 9 : 10,
        letterSpacing: '0.08em',
      }}
    >
      <span>{b.label}</span>
      <span style={{ opacity: 0.85 }}>{Math.round(score)}</span>
    </span>
  );
}

