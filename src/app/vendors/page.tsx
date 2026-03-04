'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

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
  'Defense':        '#ff8c00',
  'Defense IT':     '#ff8c00',
  'AI / ML':        '#00d4ff',
  'Cybersecurity':  '#ff3b30',
  'Logistics':      '#a78bfa',
  'Border Tech':    '#00d4ff',
  'Water Tech':     '#60a5fa',
  'Energy':         '#fbbf24',
  'Health Tech':    '#00ff88',
  'Manufacturing':  '#6b7280',
  'FinTech':        '#34d399',
  'Analytics':      '#e879f9',
};

function categoryColor(cat: string | null): string {
  if (!cat) return '#6b7280';
  for (const [key, val] of Object.entries(CATEGORY_COLOR)) {
    if (cat.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return '#6b7280';
}

function IKERMiniGauge({ conf }: { conf: number | null }) {
  if (conf === null || conf === undefined) return null;
  const pct = Math.round(conf * 100);
  const color = pct >= 80 ? '#00ff88' : pct >= 60 ? '#00d4ff' : pct >= 40 ? '#ffb800' : '#ff3b30';
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[7px] text-white/20 tracking-widest">CONF</span>
      <div className="flex-1 h-px bg-white/[0.06] rounded-full overflow-hidden" style={{ minWidth: 32 }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 4px ${color}88` }}
        />
      </div>
      <span className="font-mono text-[7px] tabular-nums font-bold" style={{ color }}>{pct}%</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="border border-white/[0.05] bg-white/[0.01] rounded-sm p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full shimmer" />
        <div className="h-3 w-32 rounded-sm shimmer" />
      </div>
      <div className="h-2 w-16 rounded-sm shimmer" />
      <div className="flex flex-col gap-1.5">
        <div className="h-2 w-full rounded-sm shimmer" />
        <div className="h-2 w-4/5 rounded-sm shimmer" />
        <div className="h-2 w-2/3 rounded-sm shimmer" />
      </div>
    </div>
  );
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

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

  const filtered = activeCategory === 'ALL'
    ? searchFiltered
    : searchFiltered.filter((v) => v.primary_category === activeCategory);

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">

      {/* Top bar */}
      <div className="shrink-0 h-11 flex items-center gap-3 px-4 bg-black border-b border-white/[0.05]">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" style={{ boxShadow: '0 0 4px #10b981cc' }} />
        </span>
        <Link
          href="/"
          className="font-mono text-[11px] font-black tracking-[0.18em] text-white hover:text-[#00d4ff] transition-colors"
        >
          NXT<span className="text-[#00d4ff]">{'//'}</span>LINK
        </Link>
        <div className="w-px h-3.5 bg-white/[0.07]" />
        <span className="font-mono text-[8px] tracking-[0.3em] text-white/20 uppercase">VENDOR REGISTRY</span>
        <div className="flex-1" />
        {!loading && !error && (
          <div className="flex items-center gap-1.5 font-mono text-[8px]">
            <span className="text-white/15">SHOWING</span>
            <span className="text-[#00d4ff] font-bold tabular-nums">{filtered.length}</span>
            {(search || activeCategory !== 'ALL') && (
              <span className="text-white/15">/ {vendors.length}</span>
            )}
            <span className="text-white/15">VENDORS</span>
          </div>
        )}
        <div className="w-px h-3.5 bg-white/[0.07]" />
        <Link
          href="/map"
          className="font-mono text-[8px] tracking-widest text-white/22 hover:text-[#00d4ff] transition-colors border border-white/[0.07] hover:border-[#00d4ff]/25 px-2 py-0.5 rounded-sm"
        >
          MAP ↗
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-5xl mx-auto px-4 py-5">

          {/* Search + category row */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            {/* Search input */}
            <div className="flex items-center gap-2 border border-white/[0.07] rounded-sm px-3 py-2 bg-white/[0.015] flex-1
                            focus-within:border-[#00d4ff]/25 focus-within:bg-[#00d4ff]/[0.02] transition-all">
              <span className="font-mono text-[8px] text-white/18 shrink-0 tracking-[0.3em] uppercase">Search</span>
              <span className="text-white/15 text-[9px]">›</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="name, category, description..."
                className="flex-1 bg-transparent font-mono text-[10px] text-white/55 placeholder-white/10 outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="font-mono text-[9px] text-white/20 hover:text-white/50 transition-colors shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category filter chips */}
          {!loading && vendors.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-5">
              {categories.map((cat) => {
                const count = cat === 'ALL'
                  ? vendors.length
                  : vendors.filter((v) => v.primary_category === cat).length;
                const color = categoryColor(cat === 'ALL' ? null : cat);
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="font-mono text-[8px] px-2 py-0.5 rounded-sm transition-all duration-150"
                    style={{
                      background: isActive
                        ? (cat === 'ALL' ? '#00d4ff' : color)
                        : 'rgba(255,255,255,0.04)',
                      color: isActive ? '#000' : 'rgba(255,255,255,0.28)',
                      border: isActive
                        ? 'none'
                        : '1px solid rgba(255,255,255,0.07)',
                      fontWeight: isActive ? 700 : 400,
                    }}
                  >
                    {cat === 'ALL' ? 'ALL' : cat.toUpperCase()}
                    {' '}
                    <span style={{ opacity: 0.65 }}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="border border-[#ff3b30]/20 bg-[#ff3b30]/[0.04] rounded-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b30]" style={{ boxShadow: '0 0 4px #ff3b30cc' }} />
                <span className="font-mono text-[9px] text-[#ff3b30]/80 font-bold tracking-wider">REGISTRY ERROR</span>
              </div>
              <p className="font-mono text-[9px] text-white/35 mb-1">{error}</p>
              <p className="font-mono text-[8px] text-white/15">
                Configure NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY to load live data.
              </p>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && filtered.length === 0 && (
            <div className="border border-white/[0.05] rounded-sm p-8 text-center">
              <p className="font-mono text-[10px] text-white/20 mb-1">
                {search || activeCategory !== 'ALL' ? 'NO VENDORS MATCH YOUR FILTERS' : 'NO APPROVED VENDORS FOUND'}
              </p>
              {(search || activeCategory !== 'ALL') && (
                <button
                  onClick={() => { setSearch(''); setActiveCategory('ALL'); }}
                  className="font-mono text-[9px] text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors mt-2"
                >
                  CLEAR FILTERS
                </button>
              )}
            </div>
          )}

          {/* Vendor grid */}
          {!loading && !error && filtered.length > 0 && (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((vendor) => {
                const color = categoryColor(vendor.primary_category);
                return (
                  <div
                    key={vendor.id}
                    className="group border border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.03] rounded-sm
                               transition-all duration-150 flex flex-col gap-0 overflow-hidden"
                    style={{
                      borderTop: `1px solid ${color}28`,
                    }}
                  >
                    {/* Color accent top bar */}
                    <div className="h-px" style={{ background: `linear-gradient(90deg, ${color}60, transparent)` }} />

                    <div className="p-3.5 flex flex-col gap-2.5 flex-1">
                      {/* Category + name */}
                      <div>
                        {vendor.primary_category && (
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span
                              className="w-1 h-1 rounded-full shrink-0"
                              style={{ backgroundColor: color, boxShadow: `0 0 5px ${color}88` }}
                            />
                            <span
                              className="font-mono text-[7px] tracking-[0.25em] font-bold uppercase"
                              style={{ color: `${color}99` }}
                            >
                              {vendor.primary_category}
                            </span>
                          </div>
                        )}
                        <h2 className="font-mono text-[12px] font-bold text-white/80 leading-snug group-hover:text-white transition-colors">
                          {vendor.company_name ?? 'Unnamed'}
                        </h2>
                      </div>

                      {/* Description */}
                      {vendor.description && (
                        <p className="font-mono text-[9px] text-white/28 leading-relaxed line-clamp-3 group-hover:text-white/38 transition-colors">
                          {vendor.description}
                        </p>
                      )}

                      {/* IKER confidence mini gauge */}
                      <IKERMiniGauge conf={vendor.extraction_confidence} />

                      {/* Footer row */}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04] mt-auto">
                        <span className="font-mono text-[7px] text-white/12 tracking-widest">
                          {vendor.created_at
                            ? new Date(vendor.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                            : ''}
                        </span>
                        <div className="flex items-center gap-2 ml-auto">
                          {vendor.company_url && (
                            <a
                              href={vendor.company_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="font-mono text-[8px] text-white/18 hover:text-[#00d4ff]/70 transition-colors"
                            >
                              WEB ↗
                            </a>
                          )}
                          <Link
                            href={`/vendor/${vendor.id}`}
                            className="font-mono text-[8px] text-[#00d4ff]/35 hover:text-[#00d4ff] transition-colors border border-[#00d4ff]/15 hover:border-[#00d4ff]/40 px-1.5 py-0.5 rounded-sm"
                          >
                            DOSSIER →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer meta */}
          {!loading && !error && vendors.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/[0.04] flex items-center gap-3">
              <span className="font-mono text-[8px] text-white/12">
                {vendors.length} approved vendors · NXT//LINK Registry
              </span>
              <Link href="/map" className="ml-auto font-mono text-[8px] text-[#00d4ff]/30 hover:text-[#00d4ff]/70 transition-colors">
                VIEW ON MAP ↗
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
