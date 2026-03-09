'use client';

const SIGNAL_COLORS: Record<string, string> = {
  patent: '#a855f7',
  funding: '#00ff88',
  hiring: '#00d4ff',
  contract: '#ffd700',
  research: '#f97316',
  regulatory: '#ff3b30',
  partnership: '#00d4ff',
  product_launch: '#00ff88',
};

type SignalBadgeProps = {
  type: string;
  size?: 'sm' | 'md';
};

export function SignalBadge({ type, size = 'md' }: SignalBadgeProps) {
  const color = SIGNAL_COLORS[type] ?? '#6b7280';
  const label = type.replace(/_/g, ' ').toUpperCase();

  const sizeClasses = size === 'sm'
    ? 'text-[6px] px-1.5 py-0.5'
    : 'text-[8px] px-2 py-1';

  return (
    <span
      className={`inline-flex items-center rounded-full font-mono tracking-wide ${sizeClasses}`}
      style={{
        borderLeft: `2px solid ${color}`,
        backgroundColor: `${color}14`,
        color: `${color}b3`,
      }}
    >
      {label}
    </span>
  );
}
