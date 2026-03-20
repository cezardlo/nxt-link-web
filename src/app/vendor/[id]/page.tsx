'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { COLORS } from '@/lib/tokens';
import { TopBar, BottomNav } from '@/components/ui';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';
import { supabase } from '@/lib/supabase';

/* ─── Types ───────────────────────────────────────────────────────────── */

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

type SupabaseSignalRow = {
  id: number;
  title: string | null;
  summary: string | null;
  source_url: string | null;
  created_at: string | null;
  signal_type: string | null;
};

type DataSource = 'supabase' | 'static' | 'api' | null;

const STUB: VendorDetail = {
  name: 'Loading...',
  category: 'Technology',
  tags: [],
  evidence: [],
};

/* ─── Helpers ─────────────────────────────────────────────────────────── */

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

function scoreColor(score: number): string {
  if (score >= 80) return COLORS.green;
  if (score >= 65) return COLORS.accent;
  if (score >= 50) return COLORS.amber;
  return COLORS.red;
}

function stateColor(state: string): string {
  const s = state.toUpperCase();
  if (s === 'ACCELERATING') return COLORS.green;
  if (s === 'EMERGING') return COLORS.accent;
  if (s === 'STABLE') return COLORS.amber;
  return COLORS.red;
}

/* ─── Card wrapper ────────────────────────────────────────────────────── */

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`p-5 ${className}`}
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 20,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-grotesk text-[13px] font-semibold tracking-[0.04em] uppercase mb-3"
      style={{ color: `${COLORS.text}90` }}
    >
      {children}
    </h2>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────── */

export default function VendorPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  const [vendor, setVendor] = useState<VendorDetail>(STUB);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [signals, setSignals] = useState<SupabaseSignalRow[]>([]);

  /* ── Data fetching (preserved) ──────────────────────────────────────── */

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    async function load() {
      // 1. Try Supabase first
      if (supabase) {
        try {
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

            // Fetch signals mentioning this vendor
            try {
              const companyName = row.company_name ?? '';
              if (companyName) {
                const { data: sigData } = await supabase
                  .from('signals')
                  .select('id, title, summary, source_url, created_at, signal_type')
                  .ilike('summary', `%${companyName}%`)
                  .order('created_at', { ascending: false })
                  .limit(5);
                if (sigData && !cancelled) {
                  setSignals(sigData as SupabaseSignalRow[]);
                }
              }
            } catch {
              // Signals fetch failed silently
            }

            return;
          }
        } catch {
          // Supabase failed — continue to fallback
        }
      }

      // 2. Try static EL_PASO_VENDORS data
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

      // 3. Try API endpoint
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

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen flex flex-col" style={{ background: COLORS.bg }}>
      <TopBar />

      <main className="flex-1 w-full max-w-[640px] mx-auto px-4 pt-4 pb-24">

        {/* Breadcrumb */}
        <Link
          href="/vendors"
          className="inline-flex items-center gap-1.5 font-grotesk text-[13px] tracking-[0.01em] mb-5 no-underline transition-colors duration-150"
          style={{ color: COLORS.muted }}
        >
          <span style={{ color: COLORS.accent }}>←</span>
          <span>Vendors</span>
          {!loading && vendor.name && (
            <>
              <span style={{ color: `${COLORS.text}20` }}>/</span>
              <span style={{ color: `${COLORS.text}70` }}>{vendor.name}</span>
            </>
          )}
        </Link>

        {/* Not found state */}
        {notFound ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-[2px] mb-5" style={{ background: `${COLORS.red}60`, borderRadius: 2 }} />
            <p className="font-grotesk text-[16px] font-semibold mb-2" style={{ color: COLORS.red }}>Vendor Not Found</p>
            <p className="font-grotesk text-[13px] mb-4" style={{ color: COLORS.muted }}>ID: {id}</p>
            <Link
              href="/vendors"
              className="font-grotesk text-[13px] no-underline transition-colors duration-150"
              style={{ color: COLORS.accent }}
            >
              ← Return to Vendors
            </Link>
          </div>
        ) : (
          <>
            {/* ── Company Hero ──────────────────────────────────────── */}
            {loading ? (
              <div className="mb-5 space-y-3">
                <div className="h-7 w-48 rounded-lg" style={{ background: `${COLORS.text}08` }} />
                <div className="h-4 w-24 rounded-full" style={{ background: `${COLORS.text}06` }} />
                <div className="h-4 w-72 rounded-lg" style={{ background: `${COLORS.text}05` }} />
              </div>
            ) : (
              <div className="mb-5">
                <h1
                  className="font-grotesk text-[26px] font-semibold leading-tight mb-2"
                  style={{ color: COLORS.text }}
                >
                  {vendor.name ?? id}
                </h1>

                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {vendor.category && (
                    <span
                      className="font-grotesk text-[11px] font-medium tracking-[0.03em] px-3 py-1"
                      style={{
                        color: COLORS.accent,
                        background: `${COLORS.accent}12`,
                        borderRadius: 9999,
                      }}
                    >
                      {vendor.category}
                    </span>
                  )}
                  {vendor.state && (
                    <span
                      className="font-grotesk text-[11px] font-medium tracking-[0.03em] px-3 py-1"
                      style={{
                        color: stateColor(vendor.state),
                        background: `${stateColor(vendor.state)}12`,
                        borderRadius: 9999,
                      }}
                    >
                      {vendor.state}
                    </span>
                  )}
                </div>

                {vendor.description && (
                  <p
                    className="font-grotesk text-[15px] font-light leading-relaxed"
                    style={{ color: COLORS.muted }}
                  >
                    {vendor.description}
                  </p>
                )}

                {vendor.website && (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-grotesk text-[13px] mt-3 no-underline transition-opacity duration-150 hover:opacity-80"
                    style={{ color: COLORS.accent }}
                  >
                    {vendor.website.replace(/^https?:\/\//, '').replace(/\/$/, '')} ↗
                  </a>
                )}
              </div>
            )}

            {/* ── Stats Row ─────────────────────────────────────────── */}
            {!loading && (
              <div className="flex gap-3 mb-5">
                {vendor.final_score != null && (
                  <div
                    className="flex-1 flex flex-col items-center py-3"
                    style={{
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 20,
                    }}
                  >
                    <span
                      className="font-grotesk text-[22px] font-bold tabular-nums"
                      style={{ color: scoreColor(vendor.final_score) }}
                    >
                      {vendor.final_score}
                    </span>
                    <span className="font-grotesk text-[10px] tracking-[0.06em] mt-0.5" style={{ color: COLORS.muted }}>
                      IKER Score
                    </span>
                  </div>
                )}

                {vendor.final_score != null && (
                  <div
                    className="flex-1 flex flex-col items-center py-3"
                    style={{
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 20,
                    }}
                  >
                    <span
                      className="font-grotesk text-[22px] font-bold tabular-nums"
                      style={{ color: COLORS.accent }}
                    >
                      {vendor.final_score >= 70 ? 'High' : vendor.final_score >= 40 ? 'Med' : 'Low'}
                    </span>
                    <span className="font-grotesk text-[10px] tracking-[0.06em] mt-0.5" style={{ color: COLORS.muted }}>
                      Confidence
                    </span>
                  </div>
                )}

                <div
                  className="flex-1 flex flex-col items-center py-3"
                  style={{
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 20,
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{
                        background: dataSource === 'supabase' ? COLORS.green : COLORS.amber,
                        boxShadow: `0 0 6px ${dataSource === 'supabase' ? COLORS.green : COLORS.amber}60`,
                      }}
                    />
                    <span className="font-grotesk text-[14px] font-semibold" style={{ color: COLORS.text }}>
                      {dataSource === 'supabase' ? 'Live' : dataSource === 'api' ? 'API' : 'Static'}
                    </span>
                  </span>
                  <span className="font-grotesk text-[10px] tracking-[0.06em] mt-0.5" style={{ color: COLORS.muted }}>
                    Status
                  </span>
                </div>
              </div>
            )}

            {/* ── About Card ────────────────────────────────────────── */}
            {vendor.briefing && !loading && (
              <Card className="mb-4">
                <SectionTitle>About</SectionTitle>
                <p
                  className="font-grotesk text-[14px] font-light leading-relaxed"
                  style={{ color: `${COLORS.text}80` }}
                >
                  {vendor.briefing}
                </p>
              </Card>
            )}

            {/* ── Capabilities Card ─────────────────────────────────── */}
            {vendor.tags && vendor.tags.length > 0 && !loading && (
              <Card className="mb-4">
                <SectionTitle>Capabilities</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {vendor.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-grotesk text-[12px] px-3 py-1"
                      style={{
                        color: `${COLORS.text}70`,
                        background: `${COLORS.text}08`,
                        borderRadius: 9999,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* ── Evidence Card ─────────────────────────────────────── */}
            {vendor.evidence && vendor.evidence.length > 0 && !loading && (
              <Card className="mb-4">
                <SectionTitle>Evidence ({vendor.evidence.length})</SectionTitle>
                <div className="space-y-2.5">
                  {vendor.evidence.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 py-2 border-b last:border-b-0"
                      style={{ borderBottomColor: `${COLORS.border}80` }}
                    >
                      <span className="mt-0.5 shrink-0" style={{ color: COLORS.accent }}>›</span>
                      <span
                        className="font-grotesk text-[13px] font-light leading-relaxed"
                        style={{ color: `${COLORS.text}70` }}
                      >
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ── Signals Card ──────────────────────────────────────── */}
            {signals.length > 0 && !loading && (
              <Card className="mb-4">
                <SectionTitle>Signals</SectionTitle>
                <div className="space-y-3">
                  {signals.map((sig) => (
                    <div
                      key={sig.id}
                      className="pb-3 border-b last:border-b-0 last:pb-0"
                      style={{ borderBottomColor: `${COLORS.border}80` }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {sig.signal_type && (
                          <span
                            className="font-grotesk text-[10px] font-medium tracking-[0.03em] px-2 py-0.5"
                            style={{
                              color: COLORS.gold,
                              background: `${COLORS.gold}12`,
                              borderRadius: 9999,
                            }}
                          >
                            {sig.signal_type}
                          </span>
                        )}
                        {sig.created_at && (
                          <span className="font-grotesk text-[10px]" style={{ color: COLORS.dim }}>
                            {new Date(sig.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      {sig.title && (
                        <p className="font-grotesk text-[13px] font-medium mb-0.5" style={{ color: `${COLORS.text}90` }}>
                          {sig.title}
                        </p>
                      )}
                      {sig.summary && (
                        <p className="font-grotesk text-[12px] font-light leading-relaxed" style={{ color: COLORS.muted }}>
                          {sig.summary.length > 160 ? sig.summary.slice(0, 160) + '...' : sig.summary}
                        </p>
                      )}
                      {sig.source_url && (
                        <a
                          href={sig.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-grotesk text-[11px] no-underline mt-1 inline-block transition-opacity hover:opacity-80"
                          style={{ color: COLORS.accent }}
                        >
                          Source ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ── Related Vendors Card ──────────────────────────────── */}
            {vendor.category && !loading && (
              <Card className="mb-4">
                <SectionTitle>Related Vendors</SectionTitle>
                {(() => {
                  const related = Object.values(EL_PASO_VENDORS)
                    .filter((v) => v.id !== id && v.category === vendor.category)
                    .slice(0, 4);

                  if (related.length === 0) {
                    return (
                      <p className="font-grotesk text-[13px]" style={{ color: COLORS.dim }}>
                        No related vendors found.
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-0">
                      {related.map((rel) => {
                        const sc = rel.ikerScore;
                        return (
                          <Link
                            key={rel.id}
                            href={`/vendor/${rel.id}`}
                            className="group flex items-center justify-between py-3 border-b last:border-b-0 no-underline transition-colors duration-150"
                            style={{ borderBottomColor: `${COLORS.border}80` }}
                          >
                            <div className="min-w-0">
                              <p
                                className="font-grotesk text-[14px] font-medium truncate transition-colors duration-150"
                                style={{ color: `${COLORS.text}80` }}
                              >
                                {rel.name}
                              </p>
                              <p className="font-grotesk text-[11px] mt-0.5 truncate" style={{ color: COLORS.dim }}>
                                {rel.category}
                              </p>
                            </div>
                            <span
                              className="font-grotesk text-[16px] font-bold tabular-nums shrink-0 ml-3"
                              style={{ color: scoreColor(sc) }}
                            >
                              {sc}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  );
                })()}
              </Card>
            )}

            {/* ── Footer metadata ───────────────────────────────────── */}
            {!loading && (
              <div className="flex items-center justify-between flex-wrap gap-2 pt-3 pb-2">
                <span className="font-grotesk text-[10px] tracking-[0.04em]" style={{ color: COLORS.dim }}>
                  Vendor ID: {id}
                </span>
                {lastUpdated && (
                  <span className="font-grotesk text-[10px] tracking-[0.04em]" style={{ color: COLORS.dim }}>
                    Updated {new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
            )}

            {/* Loading skeleton cards */}
            {loading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-5 space-y-3"
                    style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 20 }}
                  >
                    <div className="h-3 w-24 rounded-lg" style={{ background: `${COLORS.text}08` }} />
                    <div className="h-3 w-full rounded-lg" style={{ background: `${COLORS.text}05` }} />
                    <div className="h-3 w-3/4 rounded-lg" style={{ background: `${COLORS.text}05` }} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
