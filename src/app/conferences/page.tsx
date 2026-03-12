'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageTopBar } from '@/components/PageTopBar';
import { CONFERENCES } from '@/lib/data/conference-intel';
import type { ConferenceRecord } from '@/lib/data/conference-intel';
import { CONFERENCE_CATEGORY_HEX } from '@/lib/utils/design-tokens';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;
const LAST_UPDATED = '2026-03-05';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const MONTH_ABBR: Record<string, string> = {
  January: 'JAN', February: 'FEB', March: 'MAR', April: 'APR',
  May: 'MAY', June: 'JUN', July: 'JUL', August: 'AUG',
  September: 'SEP', October: 'OCT', November: 'NOV', December: 'DEC',
};

const FALLBACK_COLOR = '#6b7280';

function getCategoryColor(category: string): string {
  return CONFERENCE_CATEGORY_HEX[category] ?? FALLBACK_COLOR;
}

function getScoreColor(score: number): string {
  if (score >= 75) return '#00ff88';
  if (score >= 50) return '#00d4ff';
  if (score >= 30) return '#ffb800';
  return '#6b7280';
}

function getTierInfo(score: number): { label: string; shortLabel: string; color: string } {
  if (score >= 75) return { label: 'TIER-1 FLAGSHIP', shortLabel: 'TIER-1', color: '#00ff88' };
  if (score >= 50) return { label: 'TIER-2 MAJOR', shortLabel: 'TIER-2', color: '#ffd700' };
  return { label: 'TIER-3', shortLabel: 'TIER-3', color: 'rgba(255,255,255,0.30)' };
}

// ─── Derived data ─────────────────────────────────────────────────────────────

const ALL_CONFERENCES: ConferenceRecord[] = [...CONFERENCES].sort(
  (a, b) => b.relevanceScore - a.relevanceScore,
);

const TOP_CONFERENCES = ALL_CONFERENCES.slice(0, 5);

const ALL_CATEGORY_COUNTS: [string, number][] = (() => {
  const counts: Record<string, number> = {};
  for (const c of ALL_CONFERENCES) {
    counts[c.category] = (counts[c.category] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
})();

// ─── Row ──────────────────────────────────────────────────────────────────────

function ConferenceRow({ conf }: { conf: ConferenceRecord }) {
  const color = getCategoryColor(conf.category);
  const scoreColor = getScoreColor(conf.relevanceScore);
  const mapHref = `/map?lat=${conf.lat}&lon=${conf.lon}&zoom=10`;
  const tier = getTierInfo(conf.relevanceScore);

  return (
    <div className="border-b border-white/[0.04] py-3.5 flex items-center gap-4 hover:bg-white/[0.03] transition-colors group">

      {/* Category dot + label */}
      <div className="flex items-center gap-1.5 w-28 shrink-0">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}99`,
          }}
        />
        <span
          className="font-mono text-[8px] tracking-[0.1em] uppercase truncate"
          style={{ color: `${color}b3` }}
        >
          {conf.category}
        </span>
      </div>

      {/* Name + tier badge */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Link
          href={`/conference/${conf.id}`}
          className="font-mono text-[10px] text-white/60 hover:text-[#00d4ff] transition-colors leading-tight line-clamp-1"
        >
          {conf.name}
        </Link>
        <span
          className="font-mono text-[6px] tracking-[0.1em] px-1.5 py-0.5 border shrink-0"
          style={{
            color: tier.color,
            borderColor: `${tier.color}30`,
          }}
        >
          {tier.shortLabel}
        </span>
      </div>

      {/* Location */}
      <span className="font-mono text-[9px] text-white/30 w-32 shrink-0 truncate">
        {conf.location}
      </span>

      {/* Month */}
      <span className="font-mono text-[9px] text-white/25 w-8 shrink-0 text-right">
        {MONTH_ABBR[conf.month] ?? conf.month.slice(0, 3).toUpperCase()}
      </span>

      {/* Exhibitors */}
      <span className="font-mono text-[9px] text-white/25 w-16 shrink-0 text-right">
        {conf.estimatedExhibitors.toLocaleString()}
      </span>

      {/* Relevance bar */}
      <div className="w-16 shrink-0 flex items-center gap-1.5">
        <div className="flex-1 h-[3px] bg-white/[0.04] overflow-hidden rounded-full">
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{
              width: `${conf.relevanceScore}%`,
              backgroundColor: scoreColor,
              boxShadow: `0 0 4px ${scoreColor}66`,
            }}
          />
        </div>
      </div>

      {/* Links */}
      <div className="flex items-center gap-2.5 shrink-0">
        <Link
          href={mapHref}
          className="font-mono text-[7px] tracking-[0.1em] text-white/15 hover:text-[#00d4ff]/70 transition-colors"
        >
          MAP
        </Link>
        <a
          href={conf.website}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[7px] tracking-[0.1em] text-white/15 hover:text-[#00d4ff]/70 transition-colors"
        >
          WEB
        </a>
      </div>

    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConferencesPage() {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [activeMonth, setActiveMonth] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const filtered = useMemo(() => {
    let list = ALL_CONFERENCES;

    if (activeCategory !== 'ALL') {
      list = list.filter(c => c.category === activeCategory);
    }
    if (activeMonth !== 'ALL') {
      list = list.filter(c => c.month === activeMonth);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q),
      );
    }

    return list;
  }, [activeCategory, activeMonth, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(startIdx, startIdx + PAGE_SIZE);
  const showingFrom = filtered.length === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(startIdx + PAGE_SIZE, filtered.length);

  // Scroll-to-top visibility
  useEffect(() => {
    function onScroll() {
      setShowScrollTop(window.scrollY > 600);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  function goToPage(page: number) {
    const clamped = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(clamped);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCategoryClick(cat: string) {
    setActiveCategory(cat);
    setCurrentPage(1);
  }

  function handleMonthClick(month: string) {
    setActiveMonth(month);
    setCurrentPage(1);
  }

  function handleSearch(val: string) {
    setSearch(val);
    setCurrentPage(1);
  }

  // Build page number buttons: first, prev cluster, current cluster, next cluster, last
  const pageNumbers = useMemo(() => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('...');
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safePage]);

  return (
    <div className="bg-black min-h-screen grid-pattern">

      <PageTopBar
        backHref="/industries"
        backLabel="EXPLORE"
        breadcrumbs={[{ label: 'CONFERENCES' }]}
      />

      <div className="max-w-6xl mx-auto px-6">

        {/* ── Header strip ── */}
        <div className="flex items-center justify-between pt-8 pb-6 border-b border-white/[0.04]">
          <div className="font-mono text-[14px] tracking-[0.3em] text-white/60 uppercase">
            CONFERENCE INTELLIGENCE
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[7px] text-white/20 tracking-[0.1em]">
              UPDATED {LAST_UPDATED}
            </span>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[16px] font-bold text-[#00d4ff]">
                {ALL_CONFERENCES.length.toLocaleString()}
              </span>
              <span className="font-mono text-[9px] text-white/30 tracking-[0.15em] uppercase">
                GLOBAL EVENTS TRACKED
              </span>
            </div>
          </div>
        </div>

        {/* ── Top conferences ── */}
        <div className="py-6 border-b border-white/[0.04]">
          <div className="font-mono text-[9px] tracking-[0.25em] text-white/25 uppercase mb-4">
            TOP CONFERENCES
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {TOP_CONFERENCES.map((conf) => {
              const tier = getTierInfo(conf.relevanceScore);
              const catColor = getCategoryColor(conf.category);
              return (
                <Link
                  key={conf.id}
                  href={`/conference/${conf.id}`}
                  className="border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all p-3.5 group/card"
                >
                  {/* Tier badge */}
                  <span
                    className="font-mono text-[6px] tracking-[0.1em] px-1.5 py-0.5 border inline-block mb-2"
                    style={{
                      color: tier.color,
                      borderColor: `${tier.color}30`,
                      backgroundColor: `${tier.color}08`,
                    }}
                  >
                    {tier.shortLabel}
                  </span>
                  {/* Score */}
                  <div className="font-mono text-[18px] font-bold mb-1" style={{ color: tier.color }}>
                    {conf.relevanceScore}
                  </div>
                  {/* Name */}
                  <p className="font-mono text-[9px] text-white/60 group-hover/card:text-white/80 transition-colors leading-tight line-clamp-2 mb-2">
                    {conf.name}
                  </p>
                  {/* Category + location */}
                  <span
                    className="font-mono text-[7px] tracking-[0.1em] uppercase block mb-0.5"
                    style={{ color: `${catColor}80` }}
                  >
                    {conf.category}
                  </span>
                  <span className="font-mono text-[7px] text-white/20 truncate block">
                    {conf.location}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="py-5 flex flex-col gap-3 border-b border-white/[0.03]">

          {/* Search */}
          <div className="relative w-full max-w-md">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 font-mono text-[11px] text-white/25 pointer-events-none">
              ⌕
            </span>
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="SEARCH NAME, LOCATION..."
              className="w-full bg-transparent border-b border-white/[0.06] pl-5 pr-2 py-1.5 font-mono text-[11px] text-white/70 placeholder-white/25 focus:outline-none focus:border-[#00d4ff]/30 transition-colors"
            />
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleCategoryClick('ALL')}
              className={`font-mono text-[8px] tracking-[0.1em] px-3 py-1 border transition-colors uppercase ${
                activeCategory === 'ALL'
                  ? 'border-white/20 text-white/60 bg-white/[0.06]'
                  : 'border-white/[0.06] text-white/25 hover:text-white/45 hover:border-white/10'
              }`}
            >
              ALL
              <span className="ml-1.5 text-white/40">{ALL_CONFERENCES.length}</span>
            </button>

            {ALL_CATEGORY_COUNTS.map(([cat, count]) => {
              const color = getCategoryColor(cat);
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryClick(cat)}
                  className="font-mono text-[8px] tracking-[0.1em] px-3 py-1 border transition-colors uppercase"
                  style={
                    isActive
                      ? {
                          borderColor: `${color}60`,
                          backgroundColor: `${color}18`,
                          color: `${color}cc`,
                        }
                      : {
                          borderColor: 'rgba(255,255,255,0.06)',
                          color: 'rgba(255,255,255,0.25)',
                        }
                  }
                >
                  {cat}
                  <span className="ml-1.5" style={{ color: 'rgba(255,255,255,0.40)' }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Month pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleMonthClick('ALL')}
              className={`font-mono text-[8px] tracking-[0.1em] px-3 py-1 border transition-colors ${
                activeMonth === 'ALL'
                  ? 'border-white/20 text-white/60 bg-white/[0.06]'
                  : 'border-white/[0.06] text-white/25 hover:text-white/40 hover:border-white/10'
              }`}
            >
              ALL MO
            </button>

            {MONTHS.map(month => {
              const isActive = activeMonth === month;
              const count = ALL_CONFERENCES.filter(c => c.month === month).length;
              return (
                <button
                  key={month}
                  onClick={() => handleMonthClick(month)}
                  className={`font-mono text-[8px] tracking-[0.1em] px-3 py-1 border transition-colors ${
                    isActive
                      ? 'border-white/20 text-white/60 bg-white/[0.06]'
                      : 'border-white/[0.06] text-white/25 hover:text-white/40 hover:border-white/10'
                  }`}
                >
                  {MONTH_ABBR[month]}
                  <span className="ml-1 text-white/40">{count}</span>
                </button>
              );
            })}
          </div>

        </div>

        {/* ── Table ── */}
        <div className="pb-12">

          {/* Table header */}
          <div className="flex items-center gap-4 py-3 border-b border-white/[0.04] bg-white/[0.02]">
            <div className="font-mono text-[8px] tracking-[0.2em] text-white/25 uppercase w-28 shrink-0">CATEGORY</div>
            <div className="font-mono text-[8px] tracking-[0.2em] text-white/25 uppercase flex-1">EVENT</div>
            <div className="font-mono text-[8px] tracking-[0.2em] text-white/25 uppercase w-32 shrink-0">LOCATION</div>
            <div className="font-mono text-[8px] tracking-[0.2em] text-white/25 uppercase w-8 shrink-0 text-right">DATE</div>
            <div className="font-mono text-[8px] tracking-[0.2em] text-white/25 uppercase w-16 shrink-0 text-right">EXHIBITORS</div>
            <div className="font-mono text-[8px] tracking-[0.2em] text-white/25 uppercase w-16 shrink-0">RELEVANCE</div>
            <div className="w-12 shrink-0" />
          </div>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-28 gap-4">
              <span className="font-mono text-[40px] text-white/15">◎</span>
              <p className="font-mono text-[10px] text-white/30 tracking-[0.25em]">NO CONFERENCES MATCH FILTERS</p>
              <button
                onClick={() => {
                  setActiveCategory('ALL');
                  setActiveMonth('ALL');
                  setSearch('');
                  setCurrentPage(1);
                }}
                className="mt-2 font-mono text-[8px] tracking-[0.15em] text-white/30 hover:text-white/55 transition-colors border border-white/[0.08] hover:border-white/15 px-4 py-2"
              >
                CLEAR FILTERS
              </button>
            </div>
          ) : (
            <>
              {visible.map(conf => (
                <ConferenceRow key={conf.id} conf={conf} />
              ))}

              {/* Result count + pagination */}
              <div className="flex flex-col gap-4 mt-7">

                {/* Count indicator */}
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[7px] text-white/25 tracking-[0.1em]">
                    SHOWING {showingFrom}–{showingTo} OF {filtered.length} CONFERENCES
                  </p>
                  <p className="font-mono text-[7px] text-white/20 tracking-[0.1em]">
                    PAGE {safePage} OF {totalPages}
                  </p>
                </div>

                {/* Page navigation */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1.5">
                    {/* First */}
                    <button
                      onClick={() => goToPage(1)}
                      disabled={safePage === 1}
                      className="font-mono text-[8px] tracking-[0.1em] px-2.5 py-1.5 border border-white/[0.06] transition-colors disabled:opacity-20 disabled:cursor-default text-white/30 hover:text-white/55 hover:border-white/15"
                    >
                      FIRST
                    </button>
                    {/* Prev */}
                    <button
                      onClick={() => goToPage(safePage - 1)}
                      disabled={safePage === 1}
                      className="font-mono text-[8px] tracking-[0.1em] px-2.5 py-1.5 border border-white/[0.06] transition-colors disabled:opacity-20 disabled:cursor-default text-white/30 hover:text-white/55 hover:border-white/15"
                    >
                      PREV
                    </button>

                    {/* Page numbers */}
                    {pageNumbers.map((p, i) =>
                      p === '...' ? (
                        <span key={`dots-${i}`} className="font-mono text-[8px] text-white/20 px-1">
                          ...
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => goToPage(p)}
                          className={`font-mono text-[8px] tracking-[0.1em] w-7 py-1.5 border transition-colors ${
                            p === safePage
                              ? 'border-[#00d4ff]/40 text-[#00d4ff] bg-[#00d4ff]/10'
                              : 'border-white/[0.06] text-white/30 hover:text-white/55 hover:border-white/15'
                          }`}
                        >
                          {p}
                        </button>
                      ),
                    )}

                    {/* Next */}
                    <button
                      onClick={() => goToPage(safePage + 1)}
                      disabled={safePage === totalPages}
                      className="font-mono text-[8px] tracking-[0.1em] px-2.5 py-1.5 border border-white/[0.06] transition-colors disabled:opacity-20 disabled:cursor-default text-white/30 hover:text-white/55 hover:border-white/15"
                    >
                      NEXT
                    </button>
                    {/* Last */}
                    <button
                      onClick={() => goToPage(totalPages)}
                      disabled={safePage === totalPages}
                      className="font-mono text-[8px] tracking-[0.1em] px-2.5 py-1.5 border border-white/[0.06] transition-colors disabled:opacity-20 disabled:cursor-default text-white/30 hover:text-white/55 hover:border-white/15"
                    >
                      LAST
                    </button>
                  </div>
                )}

              </div>
            </>
          )}

        </div>

      </div>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-30 font-mono text-[8px] tracking-[0.15em] text-white/40 hover:text-white/70 bg-black/92 border border-white/[0.08] hover:border-white/20 backdrop-blur-md px-4 py-2.5 transition-all"
        >
          SCROLL TO TOP
        </button>
      )}

    </div>
  );
}
