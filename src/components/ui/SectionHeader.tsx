'use client';

import { type ReactNode } from 'react';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  color?: string;
  live?: boolean;
  right?: ReactNode;
};

/**
 * Shared section header — colored dot + title + optional subtitle + right slot.
 * Used as the standard heading pattern across all platform pages.
 */
export function SectionHeader({ title, subtitle, color = '#00d4ff', live, right }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-4 sm:mb-6">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}cc` }}
      />
      <span className="font-mono text-[9px] tracking-[0.25em] text-white/35 uppercase">
        {title}
      </span>
      {live && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" title="Live data" />
      )}
      {subtitle && (
        <span className="font-mono text-[8px] text-white/20 hidden sm:inline">
          {subtitle}
        </span>
      )}
      <div className="flex-1 h-px bg-white/[0.04] ml-3" />
      {right}
    </div>
  );
}
