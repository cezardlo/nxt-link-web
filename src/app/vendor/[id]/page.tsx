'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { IKERPanel } from '@/components/IKERPanel';
import { PageTopBar } from '@/components/PageTopBar';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';
import { supabase } from '@/lib/supabase';

type VendorDetail = {
  id?: string;
  name?: string;
  description?: string;
  website?: string;
  tags?: string[];
  evidence?: string[];
  category?: string;
  final_score?: number;
  momentum_score?: number;
  state?: string;
  signals?: { funding?: number; patents?: number; hiring?: number };
  briefing?: string;
};

type SupabaseVendorRow = {
  id: number;
  company_name: string | null;
  company_url: string | null;
  description: string | null;
  primary_category: string | null;
  extraction_confidence: number | null;
  status: string | null;
  created_at: string | null;
};

type DataSource = 'supabase' | 'static' | 'api' | null;

const STUB: VendorDetail = {
  name: 'Loading...',
  category: 'Technology',
  tags: [],
  evidence: [],
};

/** Map a Supabase vendor row to VendorDetail shape */
function mapSupabaseRow(row: SupabaseVendorRow): VendorDetail {
  return {
    id: String(row.id),
    name: row.company_name ?? undefined,
    description: row.description ?? undefined,
    website: row.company_url ?? undefined,
    category: row.primary_category ?? undefined,
    final_score: row.extraction_confidence != null
      ? Math.round(row.extraction_confidence * 100)
      : undefined,
    tags: [],
    evidence: [],
  };
}

export default function VendorPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  const [vendor, setVendor] = useState<VendorDetail>(STUB);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    async function load() {
      // ── 1. Try Supabase first ──────────────────────────────────────────
      if (supabase) {
        try {
          // Try numeric id match first, then company_name slug match
          const numericId = Number(id);
          const isNumeric = !isNaN(numericId) && String(numericId) === id;

          let row: SupabaseVendorRow | null = null;

          if (isNumeric) {
            const { data } = await supabase
              .from('vendors')
              .select('id, company_name, company_url, description, primary_category, extraction_confidence, status, created_at')
              .eq('id', numericId)
              .single();
            row = data as SupabaseVendorRow | null;
          }

          // If no numeric match, try matching by company_name (slug-ified)
          if (!row) {
            const { data } = await supabase
              .from('vendors')
              .select('id, company_name, company_url, description, primary_category, extraction_confidence, status, created_at')
              .order('created_at', { ascending: false });

            if (data) {
              const rows = data as SupabaseVendorRow[];
              row = rows.find((r) => {
                const slug = (r.company_name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                return slug === id || String(r.id) === id;
              }) ?? null;
            }
          }

          if (row && !cancelled) {
            setVendor(mapSupabaseRow(row));
            setDataSource('supabase');
            setLastUpdated(row.created_at);
            setLoading(false);
            return;
          }
        } catch {
          // Supabase failed — continue to fallback
        }
      }

      // ── 2. Try static EL_PASO_VENDORS data ────────────────────────────
      const staticVendor = EL_PASO_VENDORS[id];
      if (staticVendor && !cancelled) {
        setVendor({
          id: staticVendor.id,
          name: staticVendor.name,
          description: staticVendor.description,
          website: staticVendor.website,
          tags: staticVendor.tags,
          evidence: staticVendor.evidence,
          category: staticVendor.category,
          final_score: staticVendor.ikerScore,
        });
        setDataSource('static');
        setLastUpdated(null);
        setLoading(false);
        return;
      }

      // ── 3. Try API endpoint (original behavior) ───────────────────────
      try {
        const r = await fetch(`/api/intel/api/vendors/${id}`);
        if (r.status === 404) {
          if (!cancelled) setNotFound(true);
        } else {
          const d = (await r.json()) as VendorDetail;
          if (!cancelled && d) {
            setVendor(d);
            setDataSource('api');
            setLastUpdated(null);
          }
        }
      } catch {
        if (!cancelled) {
          setVendor({ ...STUB, name: id, briefing: 'Intel backend offline.' });
          setDataSource('static');
        }
      }

      if (!cancelled) setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [id]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden dot-grid">

      <PageTopBar
        backHref="/vendors"
        backLabel="VENDORS"
        breadcrumbs={[
          { label: 'VENDOR REGISTRY', href: '/vendors' },
          { label: vendor?.name || '···' }
        ]}
        showLiveDot={!loading}
        rightSlot={
          vendor?.website ? (
            <a
              href={vendor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[8px] tracking-[0.2em] text-[#00d4ff]/60 hover:text-[#00d4ff] transition-colors glow-cyan"
            >
              WEBSITE ↗
            </a>
          ) : null
        }
      />

      {/* MAIN CONTENT */}
      {notFound ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-12 h-[1px] bg-[#ff3b30]/40 mx-auto mb-4" />
            <p className="font-mono text-[#ff3b30] text-sm tracking-[0.3em] uppercase">Vendor Not Found</p>
            <p className="font-mono text-white/25 text-[9px] tracking-[0.2em]">ID: {id}</p>
            <Link
              href="/map"
              className="inline-block font-mono text-[9px] tracking-[0.2em] text-[#00d4ff]/60 hover:text-[#00d4ff] transition-colors mt-2"
            >
              ← RETURN TO MAP
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">

          {/* LEFT — IKER panel */}
          <div className="hidden md:flex w-64 shrink-0 flex-col border-r border-white/[0.05] overflow-y-auto scrollbar-thin">
            {/* Left panel header with gold glow */}
            <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-2">
              <div className="w-[3px] h-3 shrink-0" style={{ background: '#ffd700', boxShadow: '0 0 6px #ffd700cc' }} />
              <p
                className="font-mono text-[8px] tracking-[0.3em] uppercase"
                style={{ color: '#ffd700', textShadow: '0 0 8px rgba(255,215,0,0.4)' }}
              >
                IKER INTELLIGENCE
              </p>
            </div>
            <IKERPanel vendorId={id} />
          </div>

          {/* RIGHT — Dossier detail */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-8 py-6">

            {/* Header block */}
            <div className="border-b border-white/[0.06] pb-6 mb-7">
              <div className="font-mono text-[8px] tracking-[0.3em] text-white/20 uppercase mb-4">
                VENDOR DOSSIER
              </div>

              {loading ? (
                <div className="space-y-3">
                  <div className="h-5 bg-white/[0.05] shimmer w-56 rounded-sm" />
                  <div className="h-3 bg-white/[0.03] shimmer w-32 mt-1 rounded-sm" />
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <h1 className="font-mono text-[20px] tracking-[0.08em] text-white/90 font-medium leading-tight">
                      {vendor.name ?? id}
                    </h1>
                    {/* Mobile-only IKER score badge */}
                    {vendor.final_score != null && (
                      <span
                        className="md:hidden font-mono text-[10px] font-bold tracking-widest px-2.5 py-1 border shrink-0 rounded-sm"
                        style={{
                          color: '#ffd700',
                          borderColor: 'rgba(255,215,0,0.25)',
                          background: 'rgba(255,215,0,0.08)',
                          textShadow: '0 0 8px rgba(255,215,0,0.5)',
                        }}
                      >
                        IKER {vendor.final_score}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    {/* Category badge */}
                    <span
                      className="font-mono text-[8px] tracking-[0.2em] uppercase px-2 py-0.5 border"
                      style={{
                        color: 'rgba(0,212,255,0.7)',
                        borderColor: 'rgba(0,212,255,0.18)',
                        background: 'rgba(0,212,255,0.06)',
                      }}
                    >
                      {vendor.category ?? '—'}
                    </span>

                    {/* State badge */}
                    {vendor.state && (
                      <span
                        className="font-mono text-[8px] tracking-[0.2em] px-2.5 py-0.5 border uppercase font-medium"
                        style={{
                          color: stateColor(vendor.state),
                          borderColor: `${stateColor(vendor.state)}35`,
                          background: `${stateColor(vendor.state)}10`,
                          textShadow: `0 0 8px ${stateColor(vendor.state)}60`,
                        }}
                      >
                        {vendor.state}
                      </span>
                    )}

                    {/* Website link */}
                    {vendor.website && (
                      <a
                        href={vendor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[8px] tracking-[0.15em] text-[#00d4ff]/60 hover:text-[#00d4ff] transition-colors"
                        style={{ textShadow: 'none' }}
                      >
                        ↗ WEBSITE
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* OVERVIEW */}
            {vendor.description && (
              <div className="mb-7">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-[3px] h-3 shrink-0 rounded-full" style={{ background: '#00d4ff', boxShadow: '0 0 6px #00d4ffaa' }} />
                  <div className="font-mono text-[8px] tracking-[0.3em] text-white/30 uppercase">OVERVIEW</div>
                </div>
                <p className="font-mono text-[10px] leading-relaxed text-white/50 pl-[11px]">
                  {vendor.description}
                </p>
              </div>
            )}

            {/* CAPABILITIES */}
            {vendor.tags && vendor.tags.length > 0 && (
              <div className="mb-7">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-[3px] h-3 shrink-0 rounded-full" style={{ background: '#f97316', boxShadow: '0 0 6px #f97316aa' }} />
                  <div className="font-mono text-[8px] tracking-[0.3em] text-white/30 uppercase">CAPABILITIES</div>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-[11px]">
                  {vendor.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[8px] tracking-[0.1em] px-2 py-0.5 border border-white/[0.08] text-white/40 hover:bg-white/[0.04] hover:border-white/[0.15] hover:text-white/60 transition-all duration-150 cursor-default rounded-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* EVIDENCE */}
            {vendor.evidence && vendor.evidence.length > 0 && (
              <div className="mb-7">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-[3px] h-3 shrink-0 rounded-full" style={{ background: '#00ff88', boxShadow: '0 0 6px #00ff88aa' }} />
                  <div className="font-mono text-[8px] tracking-[0.3em] text-white/30 uppercase">
                    EVIDENCE <span className="text-white/15">({vendor.evidence.length})</span>
                  </div>
                </div>
                <div className="pl-[11px]">
                  {vendor.evidence.map((item, i) => (
                    <div
                      key={i}
                      className="py-2.5 border-b border-white/[0.04] flex items-start gap-2.5 border-l-2 pl-3 mb-0.5"
                      style={{ borderLeftColor: 'rgba(0,255,136,0.10)' }}
                    >
                      <span className="font-mono text-[9px] text-[#00ff88]/50 mt-0.5 shrink-0">›</span>
                      <span className="font-mono text-[9px] text-white/45 leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading skeleton for evidence */}
            {loading && (
              <div className="mb-7">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-[3px] h-3 shrink-0 rounded-full bg-[#00ff88]/30" />
                  <div className="font-mono text-[8px] tracking-[0.3em] text-white/20 uppercase">EVIDENCE</div>
                </div>
                <div className="space-y-1.5 pl-[11px]">
                  {[72, 88, 60, 80].map((w, i) => (
                    <div key={i} className="py-2.5 border-b border-white/[0.04] flex items-start gap-2.5 border-l-2 pl-3" style={{ borderLeftColor: 'rgba(0,255,136,0.05)' }}>
                      <span className="font-mono text-[9px] text-white/10 shrink-0">›</span>
                      <div className="h-2.5 bg-white/[0.05] shimmer rounded-sm" style={{ width: `${w}%` }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* IKER ANALYSIS */}
            {vendor.briefing && (
              <div
                className="border p-5 mb-7 rounded-sm"
                style={{
                  borderColor: 'rgba(255,215,0,0.15)',
                  background: 'rgba(255,215,0,0.03)',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-[3px] h-3 shrink-0 rounded-full" style={{ background: '#ffd700', boxShadow: '0 0 6px #ffd700aa' }} />
                  <div
                    className="font-mono text-[8px] tracking-[0.3em] uppercase"
                    style={{ color: 'rgba(255,215,0,0.55)' }}
                  >
                    IKER ANALYSIS
                  </div>
                </div>
                <p className="font-mono text-[9px] leading-relaxed text-white/40 pl-[11px]">
                  {vendor.briefing}
                </p>
              </div>
            )}

            {/* RELATED VENDORS */}
            {vendor && vendor.category && (
              <div className="pt-5 border-t border-white/[0.05]">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-[3px] h-3 shrink-0 rounded-full" style={{ background: '#00d4ff', boxShadow: '0 0 6px #00d4ffaa' }} />
                  <div className="font-mono text-[8px] tracking-[0.3em] text-white/30 uppercase">RELATED VENDORS</div>
                </div>
                <div className="space-y-0 pl-[11px]">
                  {Object.values(EL_PASO_VENDORS)
                    .filter((v) => v.id !== id && v.category === vendor.category)
                    .slice(0, 4)
                    .map((related) => {
                      const score = related.ikerScore;
                      const scoreColor = score >= 80 ? '#00ff88' : score >= 65 ? '#00d4ff' : score >= 50 ? '#ffb800' : '#ff3b30';
                      return (
                        <Link
                          key={related.id}
                          href={`/vendor/${related.id}`}
                          className="group flex items-center justify-between gap-3 border-b border-white/[0.04] hover:bg-white/[0.03] py-3 px-2 transition-all duration-150 rounded-sm"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono text-[9px] text-[#00d4ff]/20 group-hover:text-[#00d4ff]/60 transition-colors shrink-0">›</span>
                            <div className="min-w-0">
                              <p className="font-mono text-[9px] text-white/50 group-hover:text-white/75 transition-colors truncate">
                                {related.name}
                              </p>
                              <p className="font-mono text-[7px] tracking-[0.2em] text-white/18 mt-0.5 truncate uppercase">
                                {related.category}
                              </p>
                            </div>
                          </div>
                          <span
                            className="font-mono text-[11px] font-bold tabular-nums shrink-0"
                            style={{
                              color: scoreColor,
                              textShadow: `0 0 8px ${scoreColor}70`,
                            }}
                          >
                            {score}
                          </span>
                        </Link>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Raw ID footer */}
            <div className="pt-6 mt-2 border-t border-white/[0.03] flex items-center justify-between flex-wrap gap-2">
              <p className="font-mono text-[7px] tracking-[0.25em] text-white/12 uppercase">
                VENDOR ID: {id}
              </p>
              {!loading && dataSource && (
                <div className="flex items-center gap-3">
                  {lastUpdated && (
                    <span className="font-mono text-[7px] tracking-[0.15em] text-white/15">
                      UPDATED {new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                    </span>
                  )}
                  <span
                    className="font-mono text-[7px] tracking-[0.2em] uppercase px-1.5 py-0.5 border rounded-sm"
                    style={{
                      color: dataSource === 'supabase' ? '#00ff88' : dataSource === 'api' ? '#00d4ff' : '#ffb800',
                      borderColor: dataSource === 'supabase' ? 'rgba(0,255,136,0.2)' : dataSource === 'api' ? 'rgba(0,212,255,0.2)' : 'rgba(255,184,0,0.2)',
                      background: dataSource === 'supabase' ? 'rgba(0,255,136,0.05)' : dataSource === 'api' ? 'rgba(0,212,255,0.05)' : 'rgba(255,184,0,0.05)',
                    }}
                  >
                    {dataSource === 'supabase' ? 'LIVE DB' : dataSource === 'api' ? 'API' : 'STATIC'}
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function stateColor(state: string): string {
  const s = state.toUpperCase();
  if (s === 'ACCELERATING') return '#00ff88';
  if (s === 'EMERGING') return '#00d4ff';
  if (s === 'STABLE') return '#ffb800';
  return '#ff3b30';
}
