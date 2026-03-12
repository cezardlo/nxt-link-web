'use client';
import { useState, type ReactNode } from 'react';

type Props = {
  title: string;
  defaultOpen?: boolean;
  count?: number;
  accentColor?: string;
  children: ReactNode;
};

export function AccordionSection({ title, defaultOpen = false, count, accentColor = '#00d4ff', children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-white/[0.04]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors"
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: accentColor, boxShadow: `0 0 4px ${accentColor}` }}
        />
        <span className="font-mono text-[8px] tracking-[0.25em] text-white/20 uppercase flex-1 text-left">
          {title}
        </span>
        {count !== undefined && (
          <span
            className="font-mono text-[7px] px-1 py-px rounded-sm font-bold"
            style={{ color: accentColor, background: `${accentColor}18` }}
          >
            {count}
          </span>
        )}
        <span className="font-mono text-[8px] text-white/20">
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && children}
    </div>
  );
}
