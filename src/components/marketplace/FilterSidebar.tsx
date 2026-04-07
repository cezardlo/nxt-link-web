'use client';

import { useState } from 'react';
import type { Facets, MarketplaceFilters } from '@/types/marketplace';

type Props = {
  facets: Facets;
  filters: MarketplaceFilters;
  onChange: (filters: MarketplaceFilters) => void;
};

type GroupProps = {
  label: string;
  options: Record<string, number>;
  selected: string[];
  onToggle: (val: string) => void;
};

function FilterGroup({ label, options, selected, onToggle }: GroupProps) {
  const [open, setOpen] = useState(true);
  const entries = Object.entries(options).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full mb-2"
      >
        <span className="font-mono text-[9px] tracking-[0.2em] text-nxt-muted uppercase">
          {label}
        </span>
        <span className="font-mono text-[10px] text-nxt-dim">
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 pl-1">
          {entries.map(([val, count]) => (
            <label
              key={val}
              className="flex items-center gap-2 cursor-pointer group/item"
              onClick={() => onToggle(val)}
            >
              <span
                className="w-3 h-3 rounded-[2px] border flex items-center justify-center transition-colors"
                style={{
                  borderColor: selected.includes(val)
                    ? '#00d4ff'
                    : 'rgba(255,255,255,0.1)',
                  backgroundColor: selected.includes(val)
                    ? '#00d4ff15'
                    : 'transparent',
                }}
              >
                {selected.includes(val) && (
                  <svg viewBox="0 0 12 12" className="w-2 h-2" fill="#00d4ff">
                    <path d="M10 3L5 8.5 2 5.5l1-1 2 2 4-4.5 1 1z" />
                  </svg>
                )}
              </span>
              <span className="font-mono text-[10px] text-nxt-muted group-hover/item:text-nxt-secondary transition-colors capitalize">
                {val}
              </span>
              <span className="font-mono text-[8px] text-nxt-dim ml-auto">
                {count}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function FilterSidebar({ facets, filters, onChange }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggle(key: keyof MarketplaceFilters, val: string) {
    const current = (filters[key] as string[] | undefined) ?? [];
    const next = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    onChange({ ...filters, [key]: next.length ? next : undefined });
  }

  const content = (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[10px] tracking-[0.2em] text-nxt-secondary uppercase">
          Filters
        </span>
        <button
          onClick={() => onChange({ search: filters.search })}
          className="font-mono text-[8px] text-[#00d4ff]/60 hover:text-[#00d4ff] transition-colors uppercase tracking-wider"
        >
          Clear All
        </button>
      </div>

      <FilterGroup
        label="Industry"
        options={facets.industries}
        selected={filters.industries ?? []}
        onToggle={(v) => toggle('industries', v)}
      />
      <FilterGroup
        label="Price Range"
        options={facets.priceEstimate}
        selected={(filters.priceEstimate as string[] | undefined) ?? []}
        onToggle={(v) => toggle('priceEstimate', v)}
      />
      <FilterGroup
        label="Implementation"
        options={facets.implementationSpeed}
        selected={(filters.implementationSpeed as string[] | undefined) ?? []}
        onToggle={(v) => toggle('implementationSpeed', v)}
      />
      <FilterGroup
        label="Maturity"
        options={facets.maturity}
        selected={(filters.maturity as string[] | undefined) ?? []}
        onToggle={(v) => toggle('maturity', v)}
      />
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block w-56 shrink-0 border-r border-white/[0.06] overflow-y-auto rounded-2xl"  >
        {content}
      </aside>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-20 right-4 z-50 w-10 h-10 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#00d4ff]" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M4 6h16M4 12h10M4 18h6" />
        </svg>
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-[#12151a] border-r border-white/[0.06] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <span className="font-mono text-[10px] tracking-[0.2em] text-white/70 uppercase">
                Filters
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="font-mono text-[10px] text-nxt-dim"
              >
                &times;
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
