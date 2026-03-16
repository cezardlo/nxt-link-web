'use client';

type BadgeProps = {
  label: string;
  color?: string;
  size?: 'sm' | 'md';
  className?: string;
};

/**
 * Shared status badge — monospace label with colored border.
 * Sizes: sm (7px), md (8px). Default: sm.
 */
export function Badge({ label, color = '#00d4ff', size = 'sm', className = '' }: BadgeProps) {
  const fontSize = size === 'sm' ? 'text-[7px]' : 'text-[8px]';
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-0.5';

  return (
    <span
      className={`inline-block font-mono ${fontSize} tracking-[0.15em] uppercase ${padding} rounded-sm border ${className}`}
      style={{
        color: `${color}cc`,
        borderColor: `${color}33`,
        backgroundColor: `${color}0a`,
      }}
    >
      {label}
    </span>
  );
}
