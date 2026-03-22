'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageTopBar } from '@/components/PageTopBar';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/tokens';

// ─── Types ─────────────────────────────────────────────────────────────────────

type CompanyRow = {
  id: number;
  company_name: string | null;
  company_url: string | null;
  description: string | null;
  primary_category: string | null;
  extraction_confidence: number | null;
  status: string | null;
  created_at: string | null;
};

// ─── Category Colors ───────────────────────────────────────────────────────────

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

// ─── Constants ─────────────────────────────────────────────────────────────────

const CYAN = COLORS.cyan;
const DEFAULT_VISIBLE = 9;

// ─── IKER Score Bar ────────────────────────────────────────────────────────────

function IkerScoreBar({ conf }: { conf: number | null }) {
  if (conf === null || conf === undefined) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] tracking-widest text-white/20 uppercase">IKER</span>
        <div className="flex-1 h-[3px] rounded-full bg-white/[0.04]" />
        <span className="font-mono text-[9px] text-white/15">--</span>
      </div>
    );
  }
  const score = Math.round(conf * 100);
  const color = score > 80 ? '#00ff88' : score > 60 ? '#ffd700' : score > 40 ? '#f97316' : '#ff3b30';
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9px] tracking-widest text-white/25 uppercase">IKER</span>
      <div className="flex-1 h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${score}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}66`,
          }}
        />
      </div>
      <span
        className="font-mono text-[10px] font-medium tabular-nums"
        style={{ color, textShadow: `0 0 6px ${color}44` }}
      >
        {score}
      </span>
    </div>
  );
}

// ─── Skeleton Card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-black border border-white/[0.06] rounded-sm p-5 flex flex-col gap-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded-sm bg-white/[0.05]" />
        <div className="h-3 w-10 rounded-sm bg-white/[0.05]" />
      </div>
      <div className="h-4 w-3/4 rounded-sm bg-white/[0.04]" />
      <div className="space-y-2">
        <div className="h-2.5 w-full rounded-sm bg-white/[0.03]" />
        <div className="h-2.5 w-2/3 rounded-sm bg-white/[0.03]" />
      </div>
      <div className="h-[3px] w-full rounded-full bg-white/[0.04]" />
    </div>
  );
}

// ─── Stat Block ────────────────────────────────────────────────────────────────

function StatBlock({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-mono text-[18px] font-medium text-white/90 tabular-nums">{value}</span>
      <span className="font-mono text-[8px] tracking-[0.2em] text-white/30 uppercase">{label}</span>
    </div>
  );
}

// ─── Main Content ──────────────────────────────────────────────────────────────

function CompaniesContent() {
  const searchParams = useSearchParams();
  const industryParam = searchParams.get('industry');

  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [industryFilter, setIndustryFilter] = useState<string | null>(industryParam);
  const [showAll, setShowAll] = useState(false);

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
        const rows = (data as CompanyRow[]) ?? [];
        setCompanies(rows.filter((r) => r.status?.trim().toLowerCase() === 'approved'));
      }
      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  // Build category list from data
  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(companies.map((v) => v.primary_category).filter(Boolean) as string[])
    ).sort();
    return ['ALL', ...cats];
  }, [companies]);

  // Filtered companies
  const filtered = useMemo(() => {
    let result = companies;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (v) =>
          (v.company_name ?? '').toLowerCase().includes(q) ||
          (v.primary_category ?? '').toLowerCase().includes(q) ||
          (v.description ?? '').toLowerCase().includes(q),
      );
    }

    if (activeCategory !== 'ALL') {
      result = result.filter((v) => v.primary_category === activeCategory);
    }

    if (industryFilter) {
      const q = industryFilter.toLowerCase();
      result = result.filter(
        (v) =>
          (v.primary_category ?? '').toLowerCase().includes(q) ||
          (v.company_name ?? '').toLowerCase().includes(q) ||
          (v.description ?? '').toLowerCase().includes(q),
      );
    }

    return result;
  }, [companies, search, activeCategory, industryFilter]);

  // Pagination
  const visible = showAll ? filtered : filtered.slice(0, DEFAULT_VISIBLE);
  const hasMore = filtered.length > DEFAULT_VISIBLE;
  const hasFilters = search.trim() || activeCategory !== 'ALL' || industryFilter;

  // Reset pagination on filter change
  useEffect(() => {
    setShowAll(false);
  }, [search, activeCategory, industryFilter]);

  // Stats
  const avgIker = useMemo(() => {
    const withScore = companies.filter((c) => c.extraction_confidence !== null);
    if (withScore.length === 0) return 0;
    const sum = withScore.reduce((acc, c) => acc + Math.round((c.extraction_confidence ?? 0) * 100), 0);
    return Math.round(sum / withScore.length);
  }, [companies]);

  const categoryCount = useMemo(() => {
    return new Set(companies.map((c) => c.primary_category).filter(Boolean)).size;
  }, [companies]);

  return (
    <div className="min-h-screen bg-black">

      {/* Top Bar */}
      <PageTopBar
        backHref="/"
        backLabel="NXT//LINK"
        breadcrumbs={[{ label: 'COMPANIES' }]}
        showLiveDot
        rightSlot={
          !loading && !error ? (
            <span className="font-mono text-[9px] tracking-[0.15em] text-white/30">
              {companies.length} REGISTERED
            </span>
          ) : null
        }
      />

      {/* Hero Section */}
      <div className="relative border-b border-white/[0.06]">
        {/* Subtle gradient accent */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${CYAN}, transparent)`,
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6 pt-10 pb-8">
          {/* Page Title */}
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: CYAN, boxShadow: `0 0 8px ${CYAN}88` }}
            />
            <h1 className="font-heading text-[28px] sm:text-[32px] tracking-tight text-white/95 font-semibold">
              Company Registry
            </h1>
          </div>
          <p className="font-mono text-[11px] text-white/35 tracking-wide pl-[18px] max-w-xl">
            Vendors, technology providers, and service companies across all sectors.
            Each entity scored by the IKER intelligence framework.
          </p>

          {/* Stats Row */}
          {!loading && !error && companies.length > 0 && (
            <div className="flex items-center gap-8 mt-6 pl-[18px]">
              <StatBlock value={companies.length} label="Companies" />
              <div className="w-px h-6 bg-white/[0.06]" />
              <StatBlock value={categoryCount} label="Sectors" />
              <div className="w-px h-6 bg-white/[0.06]" />
              <StatBlock value={avgIker} label="Avg IKER" />
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6">

        {/* Search Bar — large, centered, premium */}
        <div className="py-6">
          <div className="relative max-w-2xl mx-auto">
            {/* Search Icon */}
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies by name, sector, or capability..."
              className="w-full bg-white/[0.02] font-mono text-[13px] text-white/80 placeholder-white/20
                         pl-12 pr-12 py-3.5 outline-none border border-white/[0.08] rounded-sm
                         focus:border-[#00d4ff]/40 focus:bg-white/[0.03] transition-all duration-200"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[10px] text-white/30
                           hover:text-white/60 transition-colors tracking-wider"
                aria-label="Clear search"
              >
                CLEAR
              </button>
            )}
          </div>
        </div>

        {/* Filter Chips */}
        <div className="pb-5 border-b border-white/[0.05]">
          <div className="flex flex-wrap gap-1.5 justify-center">

            {/* Industry filter pill (from URL param) */}
            {industryFilter && (
              <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.15em] px-3 py-1.5
                               border border-[#00d4ff]/40 text-[#00d4ff]/80 uppercase rounded-sm bg-[#00d4ff]/[0.06]">
                {industryFilter}
                <button
                  onClick={() => setIndustryFilter(null)}
                  className="text-[#00d4ff]/40 hover:text-[#00d4ff] transition-colors ml-1"
                  aria-label="Clear industry filter"
                >
                  x
                </button>
              </span>
            )}

            {/* Category pills */}
            {!loading && categories.map((cat) => {
              const color = cat === 'ALL' ? CYAN : categoryColor(cat);
              const isActive = activeCategory === cat;
              const count = cat === 'ALL'
                ? companies.length
                : companies.filter((c) => c.primary_category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="font-mono text-[9px] tracking-[0.1em] px-3 py-1.5 border uppercase transition-all duration-200 rounded-sm"
                  style={{
                    borderColor: isActive ? `${color}55` : 'rgba(255,255,255,0.05)',
                    color: isActive ? color : 'rgba(255,255,255,0.25)',
                    backgroundColor: isActive ? `${color}12` : 'transparent',
                  }}
                >
                  {cat}{' '}
                  <span style={{ opacity: 0.5 }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Summary */}
        {!loading && !error && (
          <div className="flex items-center justify-between py-4">
            <span className="font-mono text-[10px] tracking-[0.2em] text-white/30 uppercase">
              {filtered.length === companies.length
                ? `${companies.length} companies`
                : `${filtered.length} of ${companies.length} companies`}
            </span>
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setActiveCategory('ALL'); setIndustryFilter(null); }}
                className="font-mono text-[9px] tracking-[0.2em] text-white/25 hover:text-[#00d4ff]/70
                           transition-colors uppercase"
              >
                Reset filters
              </button>
            )}
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-4 pb-12">
            {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="py-16 flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full bg-[#ff3b30]"
                style={{ boxShadow: '0 0 6px #ff3b30cc' }}
              />
              <span className="font-mono text-[10px] text-[#ff3b30]/80 tracking-[0.2em] uppercase">
                Registry Error
              </span>
            </div>
            <p className="font-mono text-[11px] text-white/40 max-w-md">{error}</p>
            <p className="font-mono text-[9px] text-white/15">
              Configure NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY to load live data.
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filtered.length === 0 && (
          <div className="py-20 text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-8 h-px bg-white/10" />
              <span className="font-mono text-[10px] tracking-[0.3em] text-white/25 uppercase">
                No results
              </span>
              <div className="w-8 h-px bg-white/10" />
            </div>
            <p className="font-mono text-[11px] text-white/30 mb-6">
              {hasFilters ? 'No companies match your current filters.' : 'No approved companies found in the registry.'}
            </p>
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setActiveCategory('ALL'); setIndustryFilter(null); }}
                className="font-mono text-[10px] tracking-[0.2em] text-white/30 hover:text-[#00d4ff]/70
                           border border-white/[0.08] hover:border-[#00d4ff]/30 px-5 py-2.5
                           transition-all uppercase rounded-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Company Card Grid */}
        {!loading && !error && filtered.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
              {visible.map((company) => {
                const color = categoryColor(company.primary_category);
                return (
                  <Link
                    key={company.id}
                    href={`/vendor/${company.id}`}
                    className="group bg-black border border-white/[0.08] rounded-sm p-5
                               hover:border-white/[0.20] transition-all duration-300
                               flex flex-col gap-3 cursor-pointer relative overflow-hidden"
                  >
                    {/* Subtle top accent line on hover */}
                    <div
                      className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ backgroundColor: color }}
                    />

                    {/* Top: Category + Date */}
                    <div className="flex items-center justify-between">
                      {company.primary_category ? (
                        <span
                          className="font-mono text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 border rounded-sm"
                          style={{
                            color: `${color}bb`,
                            borderColor: `${color}30`,
                            backgroundColor: `${color}0a`,
                          }}
                        >
                          {company.primary_category}
                        </span>
                      ) : (
                        <span />
                      )}
                      {company.created_at && (
                        <span className="font-mono text-[8px] text-white/15 tracking-wider">
                          {new Date(company.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>

                    {/* Company Name */}
                    <h3 className="font-heading text-[16px] text-white/85 font-medium leading-snug
                                   group-hover:text-white transition-colors">
                      {company.company_name ?? 'Unnamed'}
                    </h3>

                    {/* Description */}
                    {company.description && (
                      <p className="font-mono text-[11px] text-white/35 line-clamp-2 leading-relaxed
                                    group-hover:text-white/45 transition-colors">
                        {company.description}
                      </p>
                    )}

                    {/* IKER Score Bar */}
                    <div className="mt-auto pt-2">
                      <IkerScoreBar conf={company.extraction_confidence} />
                    </div>

                    {/* Bottom Row */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                      <div className="flex items-center gap-2">
                        {company.company_url && (
                          <span className="font-mono text-[8px] text-white/15 group-hover:text-white/30 transition-colors flex items-center gap-1 tracking-wider uppercase">
                            <span
                              className="w-1 h-1 rounded-full"
                              style={{ backgroundColor: '#00ff88', opacity: 0.4 }}
                            />
                            Web
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[9px] text-white/15 group-hover:text-[#00d4ff] transition-colors tracking-wider">
                        VIEW DOSSIER &rarr;
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* View More / Less */}
            {hasMore && (
              <div className="flex justify-center py-8">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="group/btn font-mono text-[10px] tracking-[0.25em] uppercase px-8 py-3 border rounded-sm
                             transition-all duration-300 hover:bg-[#00d4ff]/[0.06]"
                  style={{
                    color: `${CYAN}88`,
                    borderColor: `${CYAN}25`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${CYAN}50`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${CYAN}25`;
                  }}
                >
                  {showAll
                    ? 'Show Less'
                    : `View All ${filtered.length} Companies`}
                </button>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        {!loading && !error && companies.length > 0 && (
          <div className="py-6 border-t border-white/[0.04] flex items-center justify-between mb-8">
            <span className="font-mono text-[8px] text-white/15 tracking-wider">
              {companies.length} ENTITIES IN REGISTRY &middot; NXT//LINK INTELLIGENCE PLATFORM
            </span>
            <Link
              href="/map"
              className="font-mono text-[9px] text-white/20 hover:text-[#00d4ff]/60 transition-colors tracking-wider"
            >
              VIEW ON MAP &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page Export ────────────────────────────────────────────────────────────────

export default function CompaniesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <CompaniesContent />
    </Suspense>
  );
}
