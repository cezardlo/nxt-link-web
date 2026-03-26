'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { COLORS } from '@/lib/tokens';
import { createClient } from '@/lib/supabase/client';

/* ─── Types ─── */
type Conference = {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  website: string | null;
  description: string | null;
  estimated_exhibitors: number | null;
  relevance_score: number | null;
  sector_tags: string[] | null;
};

/* ─── Top categories for filters ─── */
const TOP_CATEGORIES = [
  'ALL', 'Defense', 'Homeland Security', 'AI/ML', 'Cybersecurity',
  'Manufacturing', 'Energy', 'Healthcare', 'Logistics',
  'Border/Gov', 'Robotics', 'Software',
];

/* ─── Validate URL before rendering as link ─── */
function isValidUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function displayDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function scoreColor(score: number): string {
  if (score >= 90) return COLORS.cyan;
  if (score >= 70) return COLORS.amber;
  if (score >= 50) return COLORS.muted;
  return COLORS.dim;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function isPastEvent(conf: Conference): boolean {
  const dateStr = conf.end_date ?? conf.start_date;
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr + 'T23:59:59');
    return d.getTime() < Date.now();
  } catch {
    return false;
  }
}

export default function ConferencesPage() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const fetchConferences = useCallback(async (reset = false) => {
    const supabase = createClient();
    const currentPage = reset ? 0 : page;

    let query = supabase
      .from('conferences')
      .select('*', { count: 'exact' })
      .order('start_date', { ascending: true, nullsFirst: false })
      .order('relevance_score', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (category !== 'ALL') {
      query = query.eq('category', category);
    }

    if (search.trim()) {
      query = query.ilike('name', `%${search.trim()}%`);
    }

    const { data, count } = await query;
    if (data) {
      if (reset || currentPage === 0) {
        setConferences(data);
      } else {
        setConferences((prev) => [...prev, ...data]);
      }
    }
    if (count !== null) setTotalCount(count);
    setLoading(false);
  }, [category, search, page]);

  useEffect(() => {
    setPage(0);
    setLoading(true);
    fetchConferences(true);
  }, [category, search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (page > 0) fetchConferences();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen" style={{ background: COLORS.bg }}>
      {/* ─── Top Bar ─── */}
      <header
        className="fixed top-0 left-0 right-0 h-[52px] flex items-center justify-between px-6 z-[100]"
        style={{
          background: `${COLORS.bg}bf`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${COLORS.accent}0f`,
        }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="font-mono text-[15px] font-semibold tracking-[0.12em] text-white">
            NXT<span style={{ color: COLORS.accent }}>{'//'}
            </span>LINK
          </Link>
          <span className="font-mono text-[11px] font-medium tracking-[0.12em] uppercase" style={{ color: COLORS.dim }}>
            Conferences
          </span>
        </div>
        <div className="font-mono text-[10px]" style={{ color: COLORS.dim }}>
          {totalCount.toLocaleString()} events
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="pt-[72px] pb-[100px] px-6 max-w-[1000px] mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="font-mono text-[28px] font-bold tracking-wide text-white mb-1.5">
            CONFERENCES <span style={{ color: COLORS.accent }}>&amp; EVENTS</span>
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: COLORS.muted }}>
            {totalCount.toLocaleString()} industry conferences tracked — defense, tech, border security, manufacturing, and more.
          </p>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search conferences..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2.5 rounded-lg font-mono text-sm bg-transparent outline-none transition-colors"
            style={{
              border: `1px solid ${COLORS.border}`,
              color: COLORS.text,
            }}
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {TOP_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className="font-mono text-[10px] font-medium tracking-wide px-3.5 py-1.5 rounded-[20px] transition-colors cursor-pointer"
              style={{
                border: `1px solid ${category === cat ? `${COLORS.accent}4d` : `${COLORS.accent}1a`}`,
                background: category === cat ? `${COLORS.accent}14` : 'transparent',
                color: category === cat ? COLORS.accent : COLORS.muted,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Conference Grid */}
        {loading && conferences.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <span className="font-mono text-xs tracking-wider animate-pulse-soft" style={{ color: COLORS.dim }}>
              LOADING CONFERENCES...
            </span>
          </div>
        ) : conferences.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <span className="font-mono text-xs tracking-wider" style={{ color: COLORS.dim }}>
              NO CONFERENCES FOUND
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {conferences.map((conf) => {
              const hasValidUrl = isValidUrl(conf.website);
              const score = conf.relevance_score ?? 0;
              const past = isPastEvent(conf);

              return (
                <div
                  key={conf.id}
                  className="flex flex-col rounded-xl p-4 transition-all duration-200 group"
                  style={{
                    background: past ? `${COLORS.surface}80` : COLORS.surface,
                    border: `1px solid ${past ? `${COLORS.border}60` : COLORS.border}`,
                    opacity: past ? 0.6 : 1,
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className={`text-[14px] font-medium leading-tight flex-1 ${past ? '' : 'text-white'}`} style={past ? { color: COLORS.muted } : undefined}>
                      {conf.name}
                    </h3>
                    <span
                      className="font-mono text-[11px] font-bold tabular-nums shrink-0"
                      style={{ color: past ? COLORS.dim : scoreColor(score) }}
                    >
                      {score}
                    </span>
                  </div>

                  {/* Category + Location */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {conf.category && (
                      <span
                        className="font-mono text-[9px] font-semibold tracking-[0.08em] uppercase px-2 py-0.5 rounded"
                        style={{
                          color: past ? COLORS.dim : COLORS.accent,
                          background: past ? `${COLORS.dim}15` : `${COLORS.accent}0f`,
                        }}
                      >
                        {conf.category}
                      </span>
                    )}
                    {conf.city && (
                      <span className="font-mono text-[9px]" style={{ color: COLORS.dim }}>
                        {conf.city}{conf.country ? `, ${conf.country}` : ''}
                      </span>
                    )}
                  </div>

                  {/* Dates */}
                  {conf.start_date && (
                    <div className="flex items-center gap-2 mb-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 shrink-0" style={{ color: past ? COLORS.dim : COLORS.muted }}>
                        <rect x={3} y={4} width={18} height={18} rx={2} /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
                      </svg>
                      <span
                        className="font-mono text-[11px] font-medium"
                        style={{ color: past ? COLORS.dim : COLORS.text }}
                      >
                        {formatDate(conf.start_date)}
                        {conf.end_date && conf.end_date !== conf.start_date
                          ? ` — ${formatDate(conf.end_date)}`
                          : ''}
                      </span>
                      {past && (
                        <span
                          className="font-mono text-[8px] font-semibold tracking-[0.1em] uppercase px-1.5 py-0.5 rounded"
                          style={{ color: COLORS.dim, background: `${COLORS.dim}20` }}
                        >
                          PAST
                        </span>
                      )}
                    </div>
                  )}
                  {!conf.start_date && (
                    <div className="flex items-center gap-2 mb-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 shrink-0" style={{ color: COLORS.dim }}>
                        <rect x={3} y={4} width={18} height={18} rx={2} /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
                      </svg>
                      <span className="font-mono text-[10px]" style={{ color: COLORS.dim }}>
                        Date TBD
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  {conf.description && (
                    <p
                      className="text-[12px] leading-relaxed mb-3 line-clamp-2 flex-1"
                      style={{ color: COLORS.muted }}
                    >
                      {conf.description}
                    </p>
                  )}

                  {!conf.description && <div className="flex-1" />}

                  {/* Exhibitors */}
                  {conf.estimated_exhibitors && conf.estimated_exhibitors > 0 && (
                    <div className="font-mono text-[9px] mb-2" style={{ color: COLORS.dim }}>
                      ~{conf.estimated_exhibitors.toLocaleString()} exhibitors
                    </div>
                  )}

                  {/* Website link */}
                  {hasValidUrl && (
                    <a
                      href={conf.website!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium tracking-wide px-3 py-1.5 rounded-lg transition-colors mt-auto self-start"
                      style={{
                        border: `1px solid ${past ? `${COLORS.dim}30` : `${COLORS.accent}26`}`,
                        color: past ? COLORS.dim : COLORS.accent,
                        background: past ? 'transparent' : `${COLORS.accent}08`,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      {displayDomain(conf.website!)}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {conferences.length > 0 && conferences.length < totalCount && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setPage((p) => p + 1)}
              className="font-mono text-[11px] font-medium tracking-[0.1em] px-8 py-2.5 rounded-[10px] cursor-pointer transition-colors"
              style={{
                border: `1px solid ${COLORS.accent}26`,
                background: 'transparent',
                color: COLORS.accent,
              }}
            >
              LOAD MORE CONFERENCES
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
