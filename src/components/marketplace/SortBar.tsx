'use client';

import type { SortKey } from '@/types/marketplace';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'nxt-recommended', label: 'NXT Recommended' },
  { key: 'best-rated', label: 'Best Rated' },
  { key: 'trending', label: 'Trending' },
  { key: 'lowest-cost', label: 'Lowest Cost' },
  { key: 'fastest-impl', label: 'Fastest to Implement' },
];

type Props = {
  active: SortKey;
  onChange: (key: SortKey) => void;
};

export function SortBar({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className="font-mono text-[9px] tracking-[0.1em] px-3 py-1.5 rounded-full border transition-all duration-150 uppercase"
          style={{
            borderColor:
              active === opt.key ? '#00d4ff' : 'rgba(255,255,255,0.06)',
            color: active === opt.key ? '#00d4ff' : 'rgba(255,255,255,0.3)',
            backgroundColor:
              active === opt.key ? '#00d4ff0f' : 'transparent',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
