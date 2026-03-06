'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageTopBar } from '@/components/PageTopBar';

import { supabase } from '@/lib/supabase';

type VendorRow = {
  id: number;
  company_name: string | null;
  company_url: string | null;
  description: string | null;
  primary_category: string | null;
  extraction_confidence: number | null;
  status: string | null;
  created_at: string | null;
};

const CATEGORY_COLOR: Record<string, string> = {
  'Defense':              '#f97316',
  'Defense IT':           '#f97316',
  'AI / ML':              '#00d4ff',
  'Cybersecurity':        '#ff3b30',
  'Logistics':            '#ffb800',
  'Border Tech':          '#00d4ff',
  'Water Tech':           '#00d4ff',
  'Energy':               '#ffd700',
  'Health Tech':          '#00ff88',
  'Manufacturing':        '#6b7280',
  'FinTech':              '#00d4ff',
  'Analytics':            '#e879f9',
  'Robotics':             '#ec4899',
  'Consulting':           '#ffb800',
  'Construction':         '#f59e0b',
  'Government':           '#00d4ff',
  'IoT':                  '#14b8a6',
  'Enterprise IT':        '#3b82f6',
  'PropTech':             '#a3a3a3',
  'Economic Development': '#22d3ee',
  'Warehousing':          '#8b5cf6',
  'Trucking':             '#8b5cf6',
  'Fabrication':          '#f59e0b',
  'HVAC':                 '#06b6d4',
  'Engineering':          '#3b82f6',
  'Professional':         '#8b8b8b',
  'Education':            '#22d3ee',
  'Real Estate':          '#a3a3a3',
  'Food':                 '#fb923c',
  'Auto / Fleet':         '#737373',
};

function categoryColor(cat: string | null): string {
  if (!cat) return '#6b7280';
  for (const [key, val] of Object.entries(CATEGORY_COLOR)) {
    if (cat.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return '#6b7280';
}

// Compact confidence bar for the table column
function ConfidenceBar({ conf }: { conf: number | null }) {
  if (conf === null || conf === undefined) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-16 h-[2px] bg-white/[0.06]" />
        <span className="font-mono text-[9px] text-white/20 tabular-nums w-6 text-right">—</span>
      </div>
    );
  }
  const pct = Math.round(conf * 100);
  const color = pct >= 80 ? '#00ff88' : pct >= 60 ? '#00d4ff' : pct >= 40 ? '#ffb800' : '#ff3b30';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-[2px] bg-white/[0.08] overflow-hidden">
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 4px ${color}99` }}
        />
      </div>
      <span className="font-mono text-[9px] tabular-nums w-6 text-right" style={{ color: `${color}cc` }}>
        {pct}%
      </span>
    </div>
  );
}

// Skeleton row matching the table layout
function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-b border-white/[0.05] py-4 px-2">
      {/* dot */}
      <div className="w-1.5 h-1.5 rounded-full shrink-0 shimmer" />
      {/* name + desc */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="h-2.5 w-36 rounded-sm shimmer" />
        <div className="h-2 w-56 rounded-sm shimmer" />
      </div>
      {/* category */}
      <div className="hidden sm:block w-28 h-2 rounded-sm shimmer" />
      {/* confidence */}
      <div className="hidden sm:block w-16 h-[2px] shimmer" />
      {/* action */}
      <div className="w-16 h-2 rounded-sm shimmer" />
    </div>
  );
}

function VendorsContent() {
  const searchParams = useSearchParams();
  const industryParam = searchParams.get('industry');

  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [industryFilter, setIndustryFilter] = useState<string | null>(industryParam);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      if (!supabase) {
        setError('Supabase not configured');
        setLoading(false);
        return;
      }

      const { data, error: qErr } = await supabase
        .from('vendors')
        .select('id, company_name, company_url, description, primary_category, extraction_confidence, status, created_at')
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (qErr) {
        setError(qErr.message);
      } else {
        const rows = (data as VendorRow[]) ?? [];
        setVendors(rows.filter((r) => r.status?.trim().toLowerCase() === 'approved'));
      }
      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  // Build category list from data
  const categories = ['ALL', ...Array.from(new Set(vendors.map((v) => v.primary_category).filter(Boolean) as string[])).sort()];

  const searchFiltered = search.trim()
    ? vendors.filter((v) =>
        (v.company_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (v.primary_category ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (v.description ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : vendors;

  const categoryFiltered = activeCategory === 'ALL'
    ? searchFiltered
    : searchFiltered.filter((v) => v.primary_category === activeCategory);

  const filtered = industryFilter
    ? categoryFiltered.filter((v) =>
        (v.primary_category ?? '').toLowerCase().includes(industryFilter.toLowerCase()) ||
        (v.company_name ?? '').toLowerCase().includes(industryFilter.toLowerCase()) ||
        (v.description ?? '').toLowerCase().includes(industryFilter.toLowerCase()),
      )
    : categoryFiltered;

  const hasFilters = search.trim() || activeCategory !== 'ALL' || industryFilter;

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden dot-grid">

      <PageTopBar
        backHref="/map"
        backLabel="MAP"
        breadcrumbs={[{ label: 'VENDOR REGISTRY' }]}
        showLiveDot={true}
        rightSlot={
          <div className="flex items-center gap-3">
            <span className="font-mono text-[8px] tracking-[0.2em] text-white/30">
              {vendors.length} VENDORS
            </span>
            <a href="/map" className="font-mono text-[8px] tracking-[0.2em] text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors">
              MAP ↗
            </a>
          </div>
        }
      />

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-6xl mx-auto px-6">

          {/* Header strip */}
          <div className="flex items-center justify-between py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[14px] tracking-[0.3em] text-white/60 uppercase">
                VENDOR REGISTRY
              </span>
              {!loading && (
                <span
                  className="font-mono text-[9px] tracking-[0.15em] text-[#00d4ff] px-3 py-1 border border-[#00d4ff]/20 bg-[#00d4ff]/5"
                >
                  {vendors.length}
                </span>
              )}
            </div>
            <span className="font-mono text-[8px] tracking-[0.15em] text-white/20 uppercase">
              El Paso Technology Ecosystem
            </span>
          </div>

          {/* Search + filters row */}
          <div className="py-4 border-b border-white/[0.06]">

            {/* Search input */}
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 font-mono text-[9px] text-white/25 tracking-[0.25em] pointer-events-none select-none">
                SRCH
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vendors..."
                className="w-full bg-transparent font-mono text-[11px] text-white/70 placeholder-white/25
                           pl-10 pb-2 outline-none border-b border-white/[0.08]
                           focus:border-[#00d4ff]/40 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[9px] text-white/25
                             hover:text-white/50 transition-colors"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category pills + industry filter */}
            <div className="flex flex-wrap gap-1.5 mt-3">

              {/* Industry filter pill */}
              {industryFilter && (
                <span className="flex items-center gap-1.5 font-mono text-[8px] tracking-[0.15em] px-3 py-1
                                 border border-[#00d4ff]/40 text-[#00d4ff]/80 uppercase">
                  {industryFilter}
                  <button
                    onClick={() => setIndustryFilter(null)}
                    className="text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors"
                    aria-label="Clear industry filter"
                  >
                    ✕
                  </button>
                </span>
              )}

              {/* Category pills */}
              {!loading && categories.map((cat) => {
                const color = cat === 'ALL' ? '#00d4ff' : categoryColor(cat);
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="font-mono text-[8px] tracking-[0.15em] px-3 py-1 border uppercase transition-all duration-150"
                    style={{
                      borderColor: isActive ? `${color}66` : 'rgba(255,255,255,0.07)',
                      color: isActive ? color : 'rgba(255,255,255,0.30)',
                      backgroundColor: isActive ? `${color}18` : 'transparent',
                    }}
                  >
                    {cat === 'ALL' ? 'ALL' : cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table header */}
          {!loading && !error && filtered.length > 0 && (
            <div className="flex items-center gap-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
              {/* dot placeholder */}
              <div className="w-1.5 shrink-0" />
              {/* vendor / description */}
              <div className="flex-1 min-w-0 font-mono text-[8px] tracking-[0.2em] text-white/20 uppercase">
                Vendor / Description
              </div>
              {/* category */}
              <div className="hidden sm:block w-28 font-mono text-[8px] tracking-[0.2em] text-white/20 uppercase text-right">
                Category
              </div>
              {/* confidence */}
              <div className="hidden sm:block w-24 font-mono text-[8px] tracking-[0.2em] text-white/20 uppercase text-right">
                Confidence
              </div>
              {/* actions */}
              <div className="w-20 font-mono text-[8px] tracking-[0.2em] text-white/20 uppercase text-right">
                Actions
              </div>
            </div>
          )}

          {/* Loading skeleton rows */}
          {loading && (
            <div>
              {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="py-10 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0 bg-[#ff3b30]"
                  style={{ boxShadow: '0 0 6px #ff3b30cc' }}
                />
                <span className="font-mono text-[9px] text-[#ff3b30]/80 tracking-[0.2em] uppercase">
                  Registry Error
                </span>
              </div>
              <p className="font-mono text-[9px] text-white/40 pl-4">{error}</p>
              <p className="font-mono text-[8px] text-white/20 pl-4">
                Configure NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY to load live data.
              </p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="font-mono text-[9px] tracking-[0.2em] text-white/30 uppercase mb-4">
                {hasFilters ? 'No vendors match your filters' : 'No approved vendors found'}
              </p>
              {hasFilters && (
                <button
                  onClick={() => { setSearch(''); setActiveCategory('ALL'); setIndustryFilter(null); }}
                  className="font-mono text-[8px] tracking-[0.2em] text-white/30 hover:text-[#00d4ff]/70
                             border border-white/[0.08] hover:border-[#00d4ff]/30 px-4 py-2
                             transition-all uppercase"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Vendor table rows */}
          {!loading && !error && filtered.length > 0 && (
            <div>
              {filtered.map((vendor) => {
                const color = categoryColor(vendor.primary_category);
                return (
                  <div
                    key={vendor.id}
                    className="flex items-center gap-4 border-b border-white/[0.05] py-4 px-2
                               hover:bg-white/[0.03] transition-colors group"
                  >
                    {/* Col 1: category dot */}
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}aa` }}
                    />

                    {/* Col 2: name + description */}
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[11px] text-white/70 font-medium truncate
                                      group-hover:text-white/90 transition-colors">
                        {vendor.company_name ?? 'Unnamed'}
                      </div>
                      {vendor.description && (
                        <div className="font-mono text-[9px] text-white/30 mt-0.5 line-clamp-1
                                        group-hover:text-white/40 transition-colors">
                          {vendor.description}
                        </div>
                      )}
                    </div>

                    {/* Col 3: category */}
                    <div className="hidden sm:block w-28 text-right">
                      {vendor.primary_category && (
                        <span
                          className="font-mono text-[7px] tracking-[0.15em] uppercase"
                          style={{ color: `${color}99` }}
                        >
                          {vendor.primary_category}
                        </span>
                      )}
                    </div>

                    {/* Col 4: confidence bar */}
                    <div className="hidden sm:flex w-24 justify-end">
                      <ConfidenceBar conf={vendor.extraction_confidence} />
                    </div>

                    {/* Col 5: actions */}
                    <div className="w-20 flex items-center justify-end gap-2 shrink-0">
                      {vendor.company_url && (
                        <a
                          href={vendor.company_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-[9px] text-white/20 hover:text-white/50
                                     transition-colors hidden sm:block"
                        >
                          WEB
                        </a>
                      )}
                      <Link
                        href={`/vendor/${vendor.id}`}
                        className="font-mono text-[9px] text-white/25 group-hover:text-[#00d4ff]
                                   transition-colors whitespace-nowrap"
                      >
                        DOSSIER →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          {!loading && !error && vendors.length > 0 && (
            <div className="py-3 border-t border-white/[0.05] flex items-center justify-between">
              <span className="font-mono text-[8px] text-white/15">
                {vendors.length} vendors · NXT//LINK Registry
              </span>
              <Link
                href="/map"
                className="font-mono text-[8px] text-white/20 hover:text-[#00d4ff]/60 transition-colors"
              >
                VIEW ON MAP →
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function VendorsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <VendorsContent />
    </Suspense>
  );
}
