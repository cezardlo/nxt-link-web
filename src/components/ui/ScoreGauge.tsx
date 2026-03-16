'use client';

type ScoreGaugeProps = {
  score: number;        // 0-100
  label?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
};

const SIZES = {
  sm: { outer: 'px-3 py-2', number: 'text-[16px]', label: 'text-[6px]' },
  md: { outer: 'px-5 py-3', number: 'text-[24px]', label: 'text-[7px]' },
  lg: { outer: 'px-6 py-4', number: 'text-[32px]', label: 'text-[7px]' },
} as const;

/**
 * Circular-ish score display — colored number with glow + label.
 * Used for IKER scores, sector scores, disruption index.
 */
export function ScoreGauge({ score, label, color = '#00d4ff', size = 'md' }: ScoreGaugeProps) {
  const s = SIZES[size];

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`rounded-full ${s.outer} text-center`}
        style={{ background: `${color}0d`, border: `1px solid ${color}22` }}
      >
        <div
          className={`font-mono ${s.number} font-bold leading-none tracking-tight`}
          style={{ color, textShadow: `0 0 20px ${color}55` }}
        >
          {score}
        </div>
      </div>
      {label && (
        <div className={`font-mono ${s.label} tracking-[0.35em] text-white/20 uppercase`}>
          {label}
        </div>
      )}
    </div>
  );
}
