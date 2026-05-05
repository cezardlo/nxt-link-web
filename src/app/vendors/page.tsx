'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Factory,
  Filter,
  Globe2,
  PackageSearch,
  Radar,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';

interface Vendor {
  id: string;
  company_name: string;
  company_url: string | null;
  description: string | null;
  primary_category: string | null;
  sector: string | null;
  hq_country: string | null;
  hq_city: string | null;
  iker_score: number | null;
  tags: string[] | null;
  funding_stage: string | null;
  employee_count_range: string | null;
  created_at?: string | null;
}

interface CountOption {
  name: string;
  count: number;
}

interface VendorsResponse {
  vendors: Vendor[];
  topVendors: Vendor[];
  total: number;
  catalogTotal: number;
  sectors: CountOption[];
  filters: {
    countries: CountOption[];
    fundingStages: CountOption[];
    employeeSizes: CountOption[];
    scoreRanges: CountOption[];
  };
}

const PAGE_SIZE = 36;
const ALL = '';

const SECTOR_COLORS: Record<string, string> = {
  Defense: '#ef4444',
  'Defense Tech': '#ef4444',
  Robotics: '#a855f7',
  Logistics: '#3b82f6',
  Manufacturing: '#f59e0b',
  Cybersecurity: '#06b6d4',
  'AI/ML': '#818cf8',
  Healthcare: '#22c55e',
  Energy: '#eab308',
  Aerospace: '#f97316',
  Technology: '#6366f1',
  Trucking: '#10b981',
};

const SECTOR_ICONS: Record<string, typeof Shield> = {
  Defense: Shield,
  'Defense Tech': Shield,
  Robotics: Radar,
  Logistics: Truck,
  Manufacturing: Factory,
  Cybersecurity: Shield,
  'AI/ML': Sparkles,
  Healthcare: CheckCircle2,
  Energy: Sparkles,
  Aerospace: Radar,
};

function sectorColor(sector: string | null) {
  return SECTOR_COLORS[sector || ''] || '#818cf8';
}

function scoreColor(score: number | null) {
  if (!score) return '#6b6b76';
  if (score >= 90) return '#22c55e';
  if (score >= 75) return '#818cf8';
  if (score >= 60) return '#f59e0b';
  return '#6b6b76';
}

function cleanUrl(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return null;
  }
}

function CompanyLogo({ url, name, color }: { url: string | null; name: string; color: string }) {
  const [imgError, setImgError] = useState(false);
  const domain = cleanUrl(url);
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0] || '')
    .join('')
    .toUpperCase();

  if (domain && !imgError) {
    return (
      <img
        src={`https://logo.clearbit.com/${domain}`}
        alt={name}
        width={48}
        height={48}
        className="h-12 w-12 rounded-2xl object-contain"
        style={{ background: 'rgba(255,255,255,0.06)', padding: 6 }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
      style={{ background: `${color}22`, color }}
    >
      {initials || 'NX'}
    </div>
  );
}

function SectorTile({ sector, active, onClick }: { sector: CountOption; active: boolean; onClick: () => void }) {
  const color = sectorColor(sector.name);
  const Icon = SECTOR_ICONS[sector.name] || Building2;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-2xl border p-4 text-left transition-all duration-200 ${
        active
          ? 'border-nxt-accent/60 bg-nxt-accent/10 shadow-lg shadow-nxt-accent/10'
          : 'border-white/[0.07] bg-white/[0.025] hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.045]'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `${color}18`, color }}>
          <Icon className="h-5 w-5" />
        </span>
        <ChevronRight className="h-4 w-4 text-nxt-dim transition group-hover:translate-x-0.5 group-hover:text-nxt-secondary" />
      </div>
      <div className="mt-5 text-base font-semibold text-nxt-text">{sector.name}</div>
      <div className="mt-1 font-mono text-xs text-nxt-dim">{sector.count.toLocaleString()} vendors</div>
    </button>
  );
}

function FilterPill({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
        active ? 'bg-nxt-accent text-white' : 'border border-nxt-border text-nxt-muted hover:border-nxt-accent/40 hover:text-nxt-text'
      }`}
    >
      {children}
    </button>
  );
}

function VendorCard({ vendor }: { vendor: Vendor }) {
  const color = sectorColor(vendor.sector);
  const score = vendor.iker_score;
  const location = [vendor.hq_city, vendor.hq_country].filter(Boolean).join(', ');

  return (
    <article className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.045] hover:shadow-xl hover:shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <CompanyLogo url={vendor.company_url} name={vendor.company_name} color={color} />
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-base font-semibold text-nxt-text">{vendor.company_name}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-nxt-dim">
              {vendor.sector && <span style={{ color }}>{vendor.sector}</span>}
              {vendor.primary_category && vendor.primary_category !== vendor.sector && <span>{vendor.primary_category}</span>}
              {location && <span>{location}</span>}
            </div>
          </div>
        </div>
        {score != null && score > 0 && (
          <div className="shrink-0 text-right">
            <div className="font-mono text-2xl font-bold" style={{ color: scoreColor(score) }}>{score}</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-nxt-dim">Score</div>
          </div>
        )}
      </div>

      {vendor.description && <p className="mt-4 line-clamp-3 text-sm leading-7 text-nxt-secondary">{vendor.description}</p>}

      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-nxt-muted">
        {vendor.employee_count_range && <span className="rounded-full bg-white/[0.04] px-3 py-1">{vendor.employee_count_range}</span>}
        {vendor.funding_stage && <span className="rounded-full bg-white/[0.04] px-3 py-1">{vendor.funding_stage}</span>}
        {(vendor.tags || []).slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full bg-white/[0.04] px-3 py-1">{tag}</span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
        <Link href={`/vendor/${vendor.id}`} className="inline-flex items-center gap-2 rounded-full bg-nxt-accent px-3 py-2 text-xs font-semibold text-white transition hover:bg-nxt-accent-light">
          View Profile <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        {vendor.company_url && (
          <a href={vendor.company_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-nxt-muted transition hover:text-nxt-text">
            Website <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </article>
  );
}

function TopVendorCard({ vendor, rank }: { vendor: Vendor; rank: number }) {
  const color = sectorColor(vendor.sector);

  return (
    <Link href={`/vendor/${vendor.id}`} className="min-w-[260px] rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 transition hover:-translate-y-0.5 hover:border-white/[0.16]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-nxt-dim">Top {rank}</span>
        {vendor.iker_score != null && vendor.iker_score > 0 && (
          <span className="rounded-full px-2.5 py-1 font-mono text-xs font-bold" style={{ background: `${color}18`, color }}>
            {vendor.iker_score}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <CompanyLogo url={vendor.company_url} name={vendor.company_name} color={color} />
        <div className="min-w-0">
          <div className="line-clamp-1 font-semibold text-nxt-text">{vendor.company_name}</div>
          <div className="mt-1 line-clamp-1 text-xs text-nxt-dim">{vendor.sector || vendor.primary_category || 'Vendor'}</div>
        </div>
      </div>
    </Link>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-white/[0.06] pb-5 last:border-0 last:pb-0">
      <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-nxt-dim">{title}</h3>
      {children}
    </div>
  );
}

export default function VendorsPage() {
  const [data, setData] = useState<VendorsResponse | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSector, setActiveSector] = useState(ALL);
  const [country, setCountry] = useState(ALL);
  const [score, setScore] = useState(ALL);
  const [employee, setEmployee] = useState(ALL);
  const [funding, setFunding] = useState(ALL);
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [offset, setOffset] = useState(0);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (activeSector) params.set('sector', activeSector);
      if (country) params.set('country', country);
      if (score) params.set('score', score);
      if (employee) params.set('employee', employee);
      if (funding) params.set('funding', funding);
      if (search) params.set('search', search);
      params.set('sort', sort);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));

      const res = await fetch(`/api/vendors?${params.toString()}`);
      if (!res.ok) throw new Error(`Vendor catalog returned ${res.status}`);
      const nextData = await res.json() as VendorsResponse;
      setData(nextData);
      setVendors(nextData.vendors || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [activeSector, country, score, employee, funding, search, sort, offset]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const visibleSectors = useMemo(() => (data?.sectors || []).slice(0, 10), [data?.sectors]);
  const topVendors = data?.topVendors || [];
  const catalogTotal = data?.catalogTotal || 0;
  const total = data?.total || 0;
  const activeFilterCount = [activeSector, country, score, employee, funding, search].filter(Boolean).length;

  function resetFilters() {
    setActiveSector(ALL);
    setCountry(ALL);
    setScore(ALL);
    setEmployee(ALL);
    setFunding(ALL);
    setSearch('');
    setSearchInput('');
    setOffset(0);
  }

  function runSearch() {
    setSearch(searchInput.trim());
    setOffset(0);
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-nxt-bg text-nxt-text">
        <div className="mx-auto max-w-[1360px] px-4 py-8 pb-24 sm:px-6 lg:px-8">
          <section className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-nxt-accent-light">Vendor catalog</p>
                <h1 className="mt-4 max-w-4xl text-[clamp(2.6rem,6vw,5.8rem)] font-bold leading-[0.92] tracking-[-0.055em] text-white">
                  Find the vendors worth testing.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-nxt-secondary sm:text-lg">
                  Browse real technology vendors by industry, country, employee size, and funding stage. Junk records without an industry stay hidden.
                </p>
              </div>

              <div className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2">
                {[
                  ['Real vendors', catalogTotal.toLocaleString()],
                  ['Showing', total.toLocaleString()],
                  ['Industries', String(data?.sectors.length || 0)],
                  ['Countries', String(data?.filters.countries.length || 0)],
                ].map(([label, value]) => (
                  <div key={label} className="bg-nxt-bg/90 p-5 text-center">
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-nxt-dim">{label}</div>
                    <div className="mt-2 font-mono text-3xl font-bold text-white">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Browse by sector</h2>
                <p className="mt-1 text-xs text-nxt-dim">Click a tile to filter the catalog.</p>
              </div>
              {activeSector && (
                <button type="button" onClick={() => { setActiveSector(ALL); setOffset(0); }} className="inline-flex items-center gap-1.5 text-xs font-medium text-nxt-muted hover:text-white">
                  Clear sector <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {visibleSectors.map((sectorItem) => (
                <SectorTile
                  key={sectorItem.name}
                  sector={sectorItem}
                  active={activeSector === sectorItem.name}
                  onClick={() => { setActiveSector(activeSector === sectorItem.name ? ALL : sectorItem.name); setOffset(0); }}
                />
              ))}
            </div>
          </section>

          {topVendors.some((v) => v.iker_score && v.iker_score > 0) && (
            <section className="mt-8">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-nxt-accent-light" />
                <h2 className="text-sm font-semibold text-white">Top vendors</h2>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {topVendors.filter((v) => v.iker_score && v.iker_score > 0).map((vendor, index) => <TopVendorCard key={vendor.id} vendor={vendor} rank={index + 1} />)}
              </div>
            </section>
          )}

          <section className="mt-8 grid gap-5 lg:grid-cols-[300px_1fr]">
            <aside className="h-fit rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 lg:sticky lg:top-24">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-nxt-accent-light" />
                  <h2 className="text-sm font-semibold text-white">Filters</h2>
                </div>
                {activeFilterCount > 0 && (
                  <button type="button" onClick={resetFilters} className="text-xs font-medium text-nxt-muted hover:text-white">Reset</button>
                )}
              </div>

              <div className="space-y-5">
                <FilterGroup title="Country">
                  <select value={country} onChange={(e) => { setCountry(e.target.value); setOffset(0); }} className="w-full rounded-xl border border-nxt-border bg-nxt-bg px-3 py-2.5 text-sm text-nxt-text outline-none focus:border-nxt-accent/50">
                    <option value="">All countries</option>
                    {(data?.filters.countries || []).slice(0, 80).map((option) => (
                      <option key={option.name} value={option.name}>{option.name} ({option.count})</option>
                    ))}
                  </select>
                </FilterGroup>

                <FilterGroup title="Employee size">
                  <div className="grid gap-2">
                    <FilterPill active={!employee} onClick={() => { setEmployee(ALL); setOffset(0); }}>All sizes</FilterPill>
                    {(data?.filters.employeeSizes || []).slice(0, 8).map((option) => (
                      <FilterPill key={option.name} active={employee === option.name} onClick={() => { setEmployee(option.name); setOffset(0); }}>
                        {option.name} ({option.count})
                      </FilterPill>
                    ))}
                  </div>
                </FilterGroup>

                <FilterGroup title="Funding">
                  <div className="grid gap-2">
                    <FilterPill active={!funding} onClick={() => { setFunding(ALL); setOffset(0); }}>All funding</FilterPill>
                    {(data?.filters.fundingStages || []).slice(0, 8).map((option) => (
                      <FilterPill key={option.name} active={funding === option.name} onClick={() => { setFunding(option.name); setOffset(0); }}>
                        {option.name} ({option.count})
                      </FilterPill>
                    ))}
                  </div>
                </FilterGroup>
              </div>
            </aside>

            <div>
              <div className="mb-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_190px]">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nxt-dim" />
                      <input
                        type="text"
                        placeholder="Search by vendor name"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
                        className="w-full rounded-xl border border-nxt-border bg-nxt-bg py-3 pl-10 pr-4 text-sm text-nxt-text outline-none placeholder:text-nxt-dim focus:border-nxt-accent/50"
                      />
                    </div>
                    <button type="button" onClick={runSearch} className="rounded-xl bg-nxt-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-nxt-accent-light">
                      Search
                    </button>
                  </div>

                  <div className="relative">
                    <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nxt-dim" />
                    <select value={sort} onChange={(e) => { setSort(e.target.value); setOffset(0); }} className="w-full appearance-none rounded-xl border border-nxt-border bg-nxt-bg py-3 pl-10 pr-4 text-sm text-nxt-text outline-none focus:border-nxt-accent/50">
                      <option value="newest">Newest</option>
                      <option value="az">A-Z</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-nxt-dim">
                  <span>
                    Showing {vendors.length ? offset + 1 : 0}-{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()} filtered vendors
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Globe2 className="h-3.5 w-3.5" /> {catalogTotal.toLocaleString()} real catalog records
                  </span>
                </div>
              </div>

              {error && <div className="mb-4 rounded-2xl border border-nxt-red/20 bg-nxt-red/10 p-5 text-sm text-nxt-red">{error}</div>}

              {loading && !error ? (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] py-24 text-center text-sm text-nxt-dim">
                  Loading the vendor catalog...
                </div>
              ) : vendors.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {vendors.map((vendor) => <VendorCard key={vendor.id} vendor={vendor} />)}
                  </div>

                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3 pb-8">
                    <button
                      type="button"
                      onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                      disabled={offset === 0}
                      className="rounded-xl border border-nxt-border px-4 py-2 text-sm text-nxt-muted transition hover:border-nxt-accent/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      Previous
                    </button>
                    <span className="font-mono text-xs text-nxt-dim">Page {Math.floor(offset / PAGE_SIZE) + 1}</span>
                    <button
                      type="button"
                      onClick={() => setOffset(offset + PAGE_SIZE)}
                      disabled={offset + PAGE_SIZE >= total}
                      className="rounded-xl border border-nxt-border px-4 py-2 text-sm text-nxt-muted transition hover:border-nxt-accent/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] py-24 text-center">
                  <PackageSearch className="mx-auto h-10 w-10 text-nxt-dim" />
                  <h3 className="mt-4 text-lg font-semibold text-white">No vendors found</h3>
                  <p className="mt-2 text-sm text-nxt-dim">Try clearing filters or searching a different company name.</p>
                  <button type="button" onClick={resetFilters} className="mt-5 rounded-full bg-nxt-accent px-5 py-2.5 text-sm font-semibold text-white">
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
