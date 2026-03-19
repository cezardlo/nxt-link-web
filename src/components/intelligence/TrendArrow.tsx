type Props = {
  momentum: string;
};

export function TrendArrow({ momentum }: Props) {
  const key = momentum.toLowerCase();
  const config =
    key === 'accelerating'
      ? { arrow: 'UP', color: '#00ff88' }
      : key === 'declining'
        ? { arrow: 'DOWN', color: '#ff3b30' }
        : key === 'slowing'
          ? { arrow: 'SLOW', color: '#ffd700' }
          : { arrow: 'STEADY', color: '#00d4ff' };

  return (
    <span
      style={{
        color: config.color,
        fontSize: 9,
        letterSpacing: '0.08em',
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      }}
    >
      {config.arrow}
    </span>
  );
}

