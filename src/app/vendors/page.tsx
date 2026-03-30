'use client';

import { useState, useEffect, useCallback } from 'react';
import { COLORS } from '@/lib/tokens';

/* --- Types --- */
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
  credibility_score: number | null;
  tags: string[] | null;
  funding_stage: string | null;
  employee_count_range: string | null;
  industries: string[] | null;
}

interface SectorInfo { name: string; count: number; }

const SECTOR_COLORS: Record<string, string> = {
  'Logistics': '#3b82f6', 'Manufacturing': '#f59e0b', 'Robotics': '#8b5cf6',
  'Defense': '#ef4444', 'Trucking': '#10b981', 'AI / ML': '#ec4899',
  'Technology': '#6366f1', 'Supply Chain Technology': '#0ea5e9',
  'Cybersecurity': '#f43f5e', 'Energy': '#eab308', 'IoT': '#14b8a6',
  'Warehousing': '#a855f7', 'FinTech': '#22c55e', 'Defense & Intelligence': '#dc2626',
  'Analytics': '#0284c7',
};

function scoreColor(s: number | null): string {
  if (!s) return COLORS.dim;
  if (s >= 90) return COLORS.green;
  if (s >= 75) return COLORS.accent;
  if (s >= 60) return COLORS.amber;
  return COLORS.muted;
}

/* --- VendorCard --- */
function VendorCard({ v }: { v: Vendor }) {
  const [expanded, setExpanded] = useState(false);
  const sColor = SECTOR_COLORS[v.sector || ''] || COLORS.muted;

  return (
    <div className="bg-nxt-surface border border-nxt-border rounded-nxt-md p-5 card-hover" style={{ borderLeftWidth: 3, borderLeftColor: sColor }}>
      {/* Header */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {v.company_url ? (
              <a href={v.company_url} target="_blank" rel="noopener noreferrer" className="text-[15px] font-semibold text-nxt-text hover:text-nxt-accent-light transition-colors">
                {v.company_name}
              </a>
            ) : (
              <span className="text-[15px] font-semibold text-nxt-text">{v.company_name}</span>
            )}
            {v.funding_stage && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wide" style={{
                background: v.funding_stage === 'public' ? 'rgba(59,130,246,0.12)' : 'rgba(139,92,246,0.12)',
                color: v.funding_stage === 'public' ? '#60a5fa' : '#a78bfa',
              }}>
                {v.funding_stage}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {v.sector && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ background: sColor + '14', color: sColor }}>
                {v.sector}
              </span>
            )}
            {v.primary_category && v.primary_category !== v.sector && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-nxt-card text-nxt-muted">{v.primary_category}</span>
            )}
            {(v.hq_city || v.hq_country) && (
              <span className="text-[11px] text-nxt-dim">{v.hq_city ? `${v.hq_city}, ${v.hq_country}` : v.hq_country}</span>
            )}
            {v.employee_count_range && (
              <span className="text-[11px] text-nxt-dim">{v.employee_count_range}</span>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center shrink-0" title="Vendor quality score (0-100) based on credibility, funding, market presence, and technology fit">
          <div className="w-11 h-11 rounded-lg flex flex-col items-center justify-center" style={{
            background: scoreColor(v.iker_score) + '12',
            border: `1px solid ${scoreColor(v.iker_score)}20`,
          }}>
            <span className="text-base font-bold font-mono" style={{ color: scoreColor(v.iker_score) }}>{v.iker_score ?? '-'}</span>
          </div>
          <span className="text-[8px] text-nxt-dim mt-1 uppercase tracking-wider">Score</span>
        </div>
      </div>

      {/* Description */}
      {v.description && (
        <p className="text-[13px] leading-relaxed text-nxt-muted mt-3" style={{
          display: '-webkit-box', WebkitLineClamp: expanded ? 999 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {v.description}
        </p>
      )}

      {/* Tags */}
      {v.tags && v.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap mt-3">
          {(expanded ? v.tags : v.tags.slice(0, 5)).map((tag, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-nxt-card text-nxt-dim">{tag}</span>
          ))}
          {!expanded && v.tags.length > 5 && <span className="text-[10px] text-nxt-dim">+{v.tags.length - 5}</span>}
        </div>
      )}

      {/* Expand */}
      {(v.description || (v.tags && v.tags.length > 5)) && (
        <button onClick={() => setExpanded(!expanded)} className="text-[11px] font-medium text-nxt-accent-light mt-2 hover:underline">
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

/* --- Main Page --- */
export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [sectors, setSectors] = useState<SectorInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [offset, setOffset] = useState(0);
  const PAGE_SIZE = 50;

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeSector) params.set('sector', activeSector);
      if (search) params.set('search', search);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));
      const res = await fetch(`/api/vendors?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setVendors(data.vendors || []);
      setTotal(data.total || 0);
      if (data.sectors) setSectors(data.sectors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [activeSector, search, offset]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const handleSearch = () => { setSearch(searchInput.trim()); setOffset(0); };
  const handleSector = (s: string | null) => { setActiveSector(s); setOffset(0); };

  const avgScore = vendors.length ? Math.round(vendors.reduce((sum, v) => sum + (v.iker_score || 0), 0) / vendors.length) : 0;
  const countriesSet = new Set(vendors.map(v => v.hq_country).filter(Boolean));

  return (
    <div className="min-h-screen">
      <div className="max-w-[1100px] mx-auto px-6 py-10 pb-20">

        {/* Header */}
        <div className="mb-8 slide-up">
          <h1 className="text-xl font-semibold text-nxt-text mb-1">Vendor Directory</h1>
          <p className="text-sm text-nxt-muted">
            {total} logistics and supply chain vendors — scored on credibility, funding, and market fit.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Vendors', value: total },
            { label: 'Sectors', value: sectors.length },
            { label: 'Avg Quality', value: avgScore },
            { label: 'Countries', value: countriesSet.size },
          ].map((s, i) => (
            <div key={i} className="bg-nxt-surface border border-nxt-border rounded-nxt-md p-4 text-center">
              <div className="text-2xl font-bold font-mono text-nxt-text">{s.value}</div>
              <div className="text-[11px] text-nxt-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-2.5 rounded-lg bg-nxt-surface border border-nxt-border text-nxt-text text-sm placeholder:text-nxt-dim focus:outline-none focus:border-nxt-accent/30 transition-colors"
          />
          <button onClick={handleSearch} className="px-5 py-2.5 rounded-lg bg-nxt-accent text-white text-sm font-medium hover:opacity-90 transition-opacity">
            Search
          </button>
          {(search || activeSector) && (
            <button
              onClick={() => { setSearch(''); setSearchInput(''); setActiveSector(null); setOffset(0); }}
              className="px-4 py-2.5 rounded-lg border border-nxt-border text-nxt-muted text-sm hover:text-nxt-text transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Sector filters */}
        <div className="flex gap-1.5 flex-wrap mb-6">
          <button
            onClick={() => handleSector(null)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              !activeSector ? 'bg-nxt-accent/10 text-nxt-accent-light border-nxt-accent/20' : 'text-nxt-muted border-nxt-border hover:text-nxt-secondary'
            }`}
          >
            All
          </button>
          {sectors.slice(0, 15).map((s) => (
            <button
              key={s.name}
              onClick={() => handleSector(s.name)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                activeSector === s.name ? 'border-transparent text-white' : 'text-nxt-muted border-nxt-border hover:text-nxt-secondary'
              }`}
              style={activeSector === s.name ? { background: SECTOR_COLORS[s.name] || COLORS.accent } : {}}
            >
              {s.name} ({s.count})
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="p-5 text-center rounded-nxt-md bg-nxt-red/5 border border-nxt-red/20 mb-4">
            <div className="text-sm text-nxt-red mb-3">{error}</div>
            <button onClick={fetchVendors} className="text-sm font-medium px-5 py-2 rounded-lg bg-nxt-red text-white">Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-nxt-surface border border-nxt-border rounded-nxt-md p-5">
                <div className="h-4 w-40 rounded bg-nxt-card shimmer mb-3" />
                <div className="h-3 w-full rounded bg-nxt-card shimmer mb-2" />
                <div className="h-3 w-2/3 rounded bg-nxt-card shimmer" />
              </div>
            ))}
          </div>
        )}

        {/* Vendor grid */}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vendors.map((v) => <VendorCard key={v.id} v={v} />)}
            </div>

            {vendors.length === 0 && (
              <div className="text-center py-20 text-sm text-nxt-dim">
                No vendors found{search ? ` matching "${search}"` : activeSector ? ` in ${activeSector}` : ''}.
              </div>
            )}

            {/* Pagination */}
            {vendors.length > 0 && (
              <div className="flex justify-center items-center gap-3 mt-8 pb-8">
                {offset > 0 && (
                  <button onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className="text-sm font-medium px-4 py-2 rounded-lg border border-nxt-border text-nxt-muted hover:text-nxt-text transition-colors">
                    Previous
                  </button>
                )}
                <span className="text-xs text-nxt-dim font-mono">{offset + 1}--{Math.min(offset + PAGE_SIZE, total)} of {total}</span>
                {offset + PAGE_SIZE < total && (
                  <button onClick={() => setOffset(offset + PAGE_SIZE)} className="text-sm font-medium px-4 py-2 rounded-lg border border-nxt-border text-nxt-muted hover:text-nxt-text transition-colors">
                    Next
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
                                    }
