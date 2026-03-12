type Props = {
  score: number;
  color: string;
  label?: string;
  max?: number;
  invert?: boolean;
};

export function ScoreBar({ score, color, label, max = 100, invert }: Props) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100));
  const barColor = invert
    ? (score <= 30 ? '#00ff88' : score <= 60 ? '#ffb800' : '#ff3b30')
    : color;

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="font-mono text-[7px] text-white/20 tracking-widest w-[52px] shrink-0 uppercase">
          {label}
        </span>
      )}
      <div className="flex-1 h-[2px] bg-white/[0.06] rounded-full overflow-hidden" style={{ minWidth: 40 }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${invert ? 100 - pct : pct}%`,
            background: `linear-gradient(90deg, ${barColor}88, ${barColor})`,
            boxShadow: `0 0 5px ${barColor}66`,
          }}
        />
      </div>
      <span
        className="font-mono text-[8px] tabular-nums font-bold w-6 text-right shrink-0"
        style={{ color: barColor }}
      >
        {score}
      </span>
    </div>
  );
}
