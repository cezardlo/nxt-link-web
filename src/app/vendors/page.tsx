'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { COLORS } from '@/lib/tokens';
import { TopBar, BottomNav } from '@/components/ui';
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
  'Defense':              COLORS.orange,
  'Defense IT':           COLORS.orange,
  'AI / ML':              COLORS.accent,
  'Cybersecurity':        COLORS.red,
  'Logistics':            COLORS.amber,
  'Border Tech':          COLORS.accent,
  'Water Tech':           COLORS.accent,
  'Energy':               COLORS.gold,
  'Health Tech':          COLORS.green,
  'Manufacturing':        COLORS.muted,
  'FinTech':              COLORS.accent,
  'Analytics':            '#e879f9',
  'Robotics':             '#ec4899',
  'Consulting':           COLORS.amber,
  'Construction':         COLORS.amber,
  'Government':           COLORS.accent,
  'IoT':                  COLORS.emerald,
  'Enterprise IT':        '#3b82f6',
  'PropTech':             COLORS.dim,
  'Economic Development': COLORS.accent,
  'Warehousing':          '#8b5cf6',
  'Trucking':             '#8b5cf6',
  'Fabrication':          COLORS.amber,
  'HVAC':                 COLORS.accent,
  'Engineering':          '#3b82f6',
  'Professional':         COLORS.muted,
  'Education':            COLORS.accent,
  'Real Estate':          COLORS.dim,
  'Food':                 COLORS.orange,
  'Auto / Fleet':         COLORS.muted,
};

function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function CompanyLogo({ url, name }: { url: string | null; name: string | null }) {
  const domain = extractDomain(url);
  const initials = (name ?? '?').slice(0, 2).toUpperCase();

  if (!domain) {
    return (
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
      >
        <span className="font-grotesk text-[10px] font-medium" style={{ color: COLORS.muted }}>
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div
      className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 overflow-hidden"
      style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
    >
      <img
        src={`https://www.google.com/s2/favicons?sz=32&domain=${domain}`}
        alt=""
        width={18}
        height={18}
        className="w-[18px] h-[18px] object-contain"
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = `<span class="font-grotesk text-[10px] font-medium" style="color:${COLORS.muted}">${initials}</span>`;
          }
        }}
      />
    </div>
  );
}

function categoryColor(cat: string | null): string {
  if (!cat) return COLORS.muted;
  for (const [key, val] of Object.entries(CATEGORY_COLOR)) {
    if (cat.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return COLORS.muted;
}

function IkerBadge({ conf }: { conf: number | null }) {
  if (conf === null || conf === undefined) return null;
  const pct = Math.round(conf * 100);
  const color = pct >= 80 ? COLORS.green : pct >= 60 ? COLORS.accent : pct >= 40 ? COLORS.amber : COLORS.red;
  return (
    <span
      className="font-mono text-[9px] font-medium tabular-nums px-1.5 py-0.5 rounded-full"
      style={{ color, background: `${color}15`, border: `1px solid ${color}25` }}
    >
      IKER {pct}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div
      className="p-4 animate-pulse"
      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-[10px] shimmer" style={{ background: COLORS.surface }} />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 w-28 rounded shimmer" style={{ background: COLORS.surface }} />
          <div className="h-2 w-full rounded shimmer" style={{ background: COLORS.surface }} />
          <div className="h-2 w-3/4 rounded shimmer" style={{ background: COLORS.surface }} />
        </div>
      </div>
    </div>
  );
}

function VendorsContent() {
  const searchParams = useSearchParams();
  const industryParam = searchParams.get('industry');
  const scrollRef = useRef<HTMLDivElement>(null);

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
        const validStatuses = new Set(['active', 'approved']);
        setVendors(rows.filter((r) => validStatuses.has(r.status?.trim().toLowerCase() ?? '')));
      }
      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, []);

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
    <div className="min-h-screen pb-24 overflow-y-auto" style={{ background: COLORS.bg }}>
      <TopBar />

      <main className="max-w-[720px] mx-auto px-5 sm:px-8">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="pt-8 sm:pt-12 mb-1">
          <h1
            className="font-grotesk text-[28px] sm:text-[34px] font-semibold tracking-tight"
            style={{ color: COLORS.text }}
          >
            Vendors
          </h1>
          <p
            className="font-grotesk text-[14px] font-light mt-1"
            style={{ color: COLORS.muted }}
          >
            El Paso tech ecosystem
            {!loading && (
              <span style={{ color: COLORS.dim }}> &middot; {vendors.length} companies</span>
            )}
          </p>
        </div>

        {/* ── Search Bar ─────────────────────────────────────────── */}
        <div className="mt-6 mb-4">
          <div
            className="flex items-center gap-3 px-5 transition-all duration-200 focus-within:border-white/15"
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '20px',
              minHeight: '50px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-40">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendors..."
              className="flex-1 bg-transparent font-grotesk text-[14px] sm:text-[15px] font-light outline-none placeholder:opacity-25 min-h-[44px]"
              style={{ color: COLORS.text }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="shrink-0 font-grotesk text-[12px] px-2 min-h-[44px] flex items-center transition-opacity hover:opacity-60"
                style={{ color: COLORS.muted }}
                aria-label="Clear search"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Category Filter Pills ──────────────────────────────── */}
        <div className="mb-6 -mx-5 sm:-mx-8 px-5 sm:px-8">
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-none"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {/* Industry filter pill */}
            {industryFilter && (
              <button
                onClick={() => setIndustryFilter(null)}
                className="shrink-0 flex items-center gap-1.5 font-grotesk text-[11px] font-medium px-4 py-2 transition-all duration-150"
                style={{
                  borderRadius: '9999px',
                  color: COLORS.accent,
                  background: `${COLORS.accent}15`,
                  border: `1px solid ${COLORS.accent}40`,
                }}
              >
                {industryFilter}
                <span className="text-[9px] opacity-60 ml-0.5">x</span>
              </button>
            )}

            {!loading && categories.map((cat) => {
              const color = cat === 'ALL' ? COLORS.accent : categoryColor(cat);
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="shrink-0 font-grotesk text-[11px] font-medium px-4 py-2 transition-all duration-150 whitespace-nowrap"
                  style={{
                    borderRadius: '9999px',
                    border: `1px solid ${isActive ? `${color}50` : COLORS.border}`,
                    color: isActive ? color : COLORS.muted,
                    background: isActive ? `${color}12` : 'transparent',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Loading Skeleton ───────────────────────────────────── */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Error State ────────────────────────────────────────── */}
        {!loading && error && (
          <div
            className="p-5 mt-4"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: COLORS.red, boxShadow: `0 0 6px ${COLORS.red}` }}
              />
              <span className="font-grotesk text-[13px] font-medium" style={{ color: COLORS.red }}>
                Registry Error
              </span>
            </div>
            <p className="font-grotesk text-[12px] font-light" style={{ color: COLORS.muted }}>
              {error}
            </p>
            <p className="font-grotesk text-[11px] font-light mt-2" style={{ color: COLORS.dim }}>
              Configure NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY to load live data.
            </p>
          </div>
        )}

        {/* ── Empty State ────────────────────────────────────────── */}
        {!loading && !error && filtered.length === 0 && (
          <div className="py-20 text-center">
            <p className="font-grotesk text-[14px] font-light mb-4" style={{ color: COLORS.muted }}>
              {hasFilters ? 'No vendors match your filters' : 'No approved vendors found'}
            </p>
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setActiveCategory('ALL'); setIndustryFilter(null); }}
                className="font-grotesk text-[12px] font-medium px-5 py-2.5 transition-all duration-200 hover:opacity-80"
                style={{
                  color: COLORS.accent,
                  background: `${COLORS.accent}12`,
                  border: `1px solid ${COLORS.accent}30`,
                  borderRadius: '9999px',
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* ── Vendor Grid ────────────────────────────────────────── */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((vendor) => {
              const color = categoryColor(vendor.primary_category);
              return (
                <Link
                  key={vendor.id}
                  href={`/vendor/${vendor.id}`}
                  className="group block p-4 transition-all duration-200 hover:translate-y-[-2px]"
                  style={{
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '20px',
                  }}
                >
                  {/* Logo + Name */}
                  <div className="flex items-start gap-2.5 mb-3">
                    <CompanyLogo url={vendor.company_url} name={vendor.company_name} />
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p
                        className="font-grotesk text-[14px] font-semibold truncate group-hover:opacity-90 transition-opacity"
                        style={{ color: COLORS.text }}
                      >
                        {vendor.company_name ?? 'Unnamed'}
                      </p>
                    </div>
                  </div>

                  {/* Category Badge */}
                  {vendor.primary_category && (
                    <span
                      className="inline-block font-grotesk text-[10px] font-medium px-2.5 py-0.5 mb-2"
                      style={{
                        borderRadius: '9999px',
                        color: `${color}`,
                        background: `${color}15`,
                        border: `1px solid ${color}25`,
                      }}
                    >
                      {vendor.primary_category}
                    </span>
                  )}

                  {/* Description */}
                  {vendor.description && (
                    <p
                      className="font-grotesk text-[12px] font-light leading-[1.5] line-clamp-2 mt-1"
                      style={{ color: COLORS.muted }}
                    >
                      {vendor.description}
                    </p>
                  )}

                  {/* IKER Score */}
                  {vendor.extraction_confidence !== null && vendor.extraction_confidence !== undefined && (
                    <div className="mt-3">
                      <IkerBadge conf={vendor.extraction_confidence} />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────── */}
        {!loading && !error && vendors.length > 0 && (
          <div
            className="mt-6 py-4 flex items-center justify-between"
            style={{ borderTop: `1px solid ${COLORS.border}` }}
          >
            <span className="font-grotesk text-[11px] font-light" style={{ color: COLORS.dim }}>
              {vendors.length} vendors &middot; NXT LINK Registry
            </span>
            <Link
              href="/map"
              className="font-grotesk text-[11px] font-medium transition-opacity hover:opacity-70"
              style={{ color: COLORS.accent }}
            >
              View on Map
            </Link>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default function VendorsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: COLORS.bg }} />}>
      <VendorsContent />
    </Suspense>
  );
}
