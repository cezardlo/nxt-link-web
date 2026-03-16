type ConfidenceBadgeProps = {
  value: number; // 0-100 or 0-1 (auto-detect)
  label?: string;
  size?: 'sm' | 'md';
};

export function ConfidenceBadge({ value, label, size = 'sm' }: ConfidenceBadgeProps) {
  const pct = value <= 1 ? Math.round(value * 100) : Math.round(value);
  const color = pct < 40 ? '#ff3b30' : pct < 70 ? '#ffb800' : '#00ff88';
  const display = label || `${pct}%`;

  if (size === 'md') {
    return (
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full border flex items-center justify-center"
          style={{ borderColor: `${color}55` }}
        >
          <span className="font-mono text-[9px] font-bold" style={{ color }}>
            {pct}
          </span>
        </div>
        {label && (
          <span className="font-mono text-[8px] tracking-widest text-white/30 uppercase">
            {label}
          </span>
        )}
      </div>
    );
  }

  return (
    <span
      className="font-mono text-[8px] tracking-widest px-2 py-0.5 rounded-sm border inline-block"
      style={{ color, borderColor: `${color}33`, backgroundColor: `${color}0d` }}
    >
      {display}
    </span>
  );
}
