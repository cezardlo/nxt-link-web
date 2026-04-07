'use client';

import { useState, useEffect, useCallback } from 'react';
import { COLORS } from '@/lib/tokens';

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
}

interface SectorInfo { name: string; count: number; }

const SECTOR_COLORS: Record<string, string> = {
  Logistics: '#3b82f6',
  Manufacturing: '#f59e0b',
  Robotics: '#8b5cf6',
  Defense: '#ef4444',
  Trucking: '#10b981',
  Technology: '#6366f1',
};

function scoreColor(s: number | null): string {
  if (!s) return COLORS.dim;
  if (s >= 90) return COLORS.green;
  if (s >= 75) return COLORS.accent;
  if (s >= 60) return COLORS.amber;
  return COLORS.muted;
}

function VendorCard({ v }: { v: Vendor }) {
  const sColor = SECTOR_COLORS[v.sector || ''] || COLORS.muted;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-nxt-accent/5" style={{ borderLeftWidth: 3, borderLeftColor: sColor }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {v.company_url ? (
            <a href={v.company_url} target="_blank" rel="noopener noreferrer" className="text-[18px] font-semibold text-nxt-text transition-colors duration-200 hover:text-nxt-accent-light">
              {v.company_name}
            </a>
          ) : (
            <div className="text-[18px] font-semibold text-nxt-text">{v.company_name}</div>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-nxt-dim">
            {v.sector && <span style={{ color: sColor }}>{v.sector}</span>}
            {v.primary_category && <span>{v.primary_category}</span>}
            {(v.hq_city || v.hq_country) && <span>{v.hq_city ? `${v.hq_city}, ${v.hq_country}` : v.hq_country}</span>}
            {v.employee_count_range && <span>{v.employee_count_range}</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono font-bold" style={{ color: scoreColor(v.iker_score) }}>{v.iker_score ?? '-'}</div>
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-nxt-dim">Score</div>
        </div>
      </div>

      {v.description && <p className="mt-4 text-[13px] leading-7 text-nxt-secondary">{v.description}</p>}

      {v.tags && v.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {v.tags.slice(0, 6).map((tag, i) => (
            <span key={i} className="rounded-full bg-[rgba(13,18,30,0.42)] px-3 py-1 text-[10px] text-nxt-dim">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

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

  const avgScore = vendors.length ? Math.round(vendors.reduce((sum, v) => sum + (v.iker_score || 0), 0) / vendors.length) : 0;
  const countries = new Set(vendors.map((v) => v.hq_country).filter(Boolean)).size;

  return (
    <div className="min-h-screen bg-nxt-bg">
      <div className="mx-auto max-w-[1240px] px-6 py-10 pb-20">
        <section className="mb-8 border-b border-[rgba(138,160,255,0.12)] pb-8">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="section-kicker mb-3">Vendor Directory</p>
              <h1 className="max-w-[760px] text-[clamp(2.8rem,6vw,5.4rem)] font-bold leading-[0.95] tracking-[-0.04em] text-nxt-text">
                Find the companies
                <br />
                behind the movement.
              </h1>
              <p className="mt-5 max-w-[680px] text-base leading-8 text-nxt-secondary">
                A ranked field guide to the vendors showing up across supply chain, logistics, and industrial activity.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden border border-[rgba(138,160,255,0.12)] bg-[rgba(138,160,255,0.12)] sm:grid-cols-2">
              {[
                ['Total vendors', String(total)],
                ['Sectors', String(sectors.length)],
                ['Average score', String(avgScore)],
                ['Countries', String(countries)],
              ].map(([label, value]) => (
                <div key={label} className="bg-[rgba(10,13,22,0.96)] p-4 text-center">
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-nxt-dim">{label}</div>
                  <div className="mt-2 text-2xl font-mono font-bold text-nxt-text">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 grid-cols-1 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search vendors"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (setSearch(searchInput.trim()), setOffset(0))}
                className="flex-1 rounded-xl border border-nxt-border bg-[rgba(7,10,18,0.9)] px-4 py-3 text-sm text-nxt-text placeholder:text-nxt-dim focus:border-nxt-accent/40 focus:outline-none transition-colors duration-200"
              />
              <button onClick={() => { setSearch(searchInput.trim()); setOffset(0); }} className="rounded-xl bg-nxt-accent px-5 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-nxt-accent/90">Search</button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-nxt-dim">Filter by sector</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button onClick={() => { setActiveSector(null); setOffset(0); }} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${!activeSector ? 'bg-nxt-accent/10 text-nxt-accent-light' : 'border border-nxt-border text-nxt-muted hover:text-nxt-secondary'}`}>All</button>
              {sectors.slice(0, 12).map((s) => (
                <button key={s.name} onClick={() => { setActiveSector(s.name); setOffset(0); }} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${activeSector === s.name ? 'bg-nxt-elevated text-nxt-text' : 'border border-nxt-border text-nxt-muted hover:text-nxt-secondary'}`}>
                  {s.name} ({s.count})
                </button>
              ))}
            </div>
          </div>
        </section>

        {error && <div className="mb-4 rounded-xl border border-nxt-red/20 bg-nxt-red/5 p-5 text-sm text-nxt-red">{error}</div>}

        {loading && !error ? (
          <div className="py-20 text-center text-sm text-nxt-dim">Loading vendor directory...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {vendors.map((v) => <VendorCard key={v.id} v={v} />)}
            </div>

            {vendors.length === 0 && <div className="py-20 text-center text-sm text-nxt-dim">No vendors found for this search.</div>}

            {vendors.length > 0 && (
              <div className="mt-8 flex items-center justify-center gap-3 pb-8">
                {offset > 0 && <button onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className="rounded-xl border border-nxt-border px-4 py-2 text-sm text-nxt-muted transition-colors duration-200 hover:text-nxt-text hover:border-nxt-accent/20">Previous</button>}
                <span className="text-xs font-mono text-nxt-dim">{offset + 1}-{Math.min(offset + PAGE_SIZE, total)} of {total}</span>
                {offset + PAGE_SIZE < total && <button onClick={() => setOffset(offset + PAGE_SIZE)} className="rounded-xl border border-nxt-border px-4 py-2 text-sm text-nxt-muted transition-colors duration-200 hover:text-nxt-text hover:border-nxt-accent/20">Next</button>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
