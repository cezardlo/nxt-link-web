'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { INDUSTRIES, CATALOG_SUMMARY } from '@/lib/data/technology-catalog';
import { PageTopBar } from '@/components/PageTopBar';
import { INDUSTRY_STORIES } from '@/lib/data/industry-stories';
import type { SectorScore } from '@/lib/intelligence/signal-engine';

// ─── Types ────────────────────────────────────────────────────────────────────

type IntelSignalsResponse = {
  ok: boolean;
  sectorScores: SectorScore[];
};

type DiscoveredIndustry = {
  slug: string;
  label: string;
  color: string;
  description: string | null;
  product_count: number;
  source_count: number;
  popularity: number;
  last_scanned_at: string | null;
  scan_quality: string | null;
};

// ─── Vendor counts per industry (static approximations) ──────────────────────

const VENDOR_COUNTS: Record<string, number> = {
  'ai-ml':         12,
  'cybersecurity': 9,
  'defense':       18,
  'border-tech':   7,
  'manufacturing': 11,
  'energy':        8,
  'healthcare':    6,
  'logistics':     14,
};

// Map signal engine sector IDs → industry slugs
const SECTOR_TO_SLUG: Record<string, string> = {
  'defense':              'defense',
  'border-trade':         'border-tech',
  'logistics':            'logistics',
  'water':                'energy',
  'energy':               'energy',
  'robotics':             'manufacturing',
  'warehouse-automation': 'logistics',
  'manufacturing-tech':   'manufacturing',
  'industrial-ai':        'ai-ml',
  'supply-chain-software':'logistics',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IndustriesPage() {
  const router = useRouter();
  const [sectorScores, setSectorScores] = useState<SectorScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [discoveredIndustries, setDiscoveredIndustries] = useState<DiscoveredIndustry[]>([]);

  const handleSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) return;
    const slug = q.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    router.push(`/industry/${slug}`);
  }, [searchQuery, router]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/intel-signals');
        if (!res.ok) return;
        const data = (await res.json()) as IntelSignalsResponse;
        if (!cancelled && data.ok) setSectorScores(data.sectorScores);
      } catch { /* degrade gracefully */ }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  // Load discovered industries from Supabase
  useEffect(() => {
    let cancelled = false;
    async function loadDiscovered() {
      try {
        const res = await fetch('/api/industries');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.ok) {
          setDiscoveredIndustries(data.discovered ?? []);
        }
      } catch { /* degrade */ }
    }
    void loadDiscovered();
    return () => { cancelled = true; };
  }, []);

  // Build score lookup by industry slug
  const scoreBySlug: Record<string, { score: number; trend: string; signals: number }> = {};
  for (const s of sectorScores) {
    const slug = SECTOR_TO_SLUG[s.id];
    if (slug) {
      if (!scoreBySlug[slug]) {
        scoreBySlug[slug] = { score: s.score, trend: s.trend, signals: s.articleCount };
      } else {
        scoreBySlug[slug].score = Math.max(scoreBySlug[slug].score, s.score);
        scoreBySlug[slug].signals += s.articleCount;
      }
    }
  }

  const totalSignals = sectorScores.reduce((acc, s) => acc + s.articleCount, 0);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
  }).toUpperCase();

  return (
    <div className="bg-black min-h-screen font-mono grid-pattern">
      <PageTopBar
        backHref="/map"
        backLabel="MAP"
        breadcrumbs={[{ label: 'INDUSTRIES' }]}
        showLiveDot={true}
        rightSlot={
          <span className="font-mono text-[8px] tracking-[0.2em] text-white/30">
            {INDUSTRIES.length + discoveredIndustries.length} SECTORS
          </span>
        }
      />

      <div className="max-w-6xl mx-auto px-6">

        {/* ── Section 1: Header + Search ──────────────────────────────────── */}
        <div className="py-6 border-b border-white/[0.05]">
          <h1 className="text-[14px] tracking-[0.3em] text-white/60 uppercase leading-none">
            Industry Monitor
          </h1>
          <p className="text-[10px] text-white/30 mt-1.5 tabular-nums tracking-wide">
            {dateStr}&nbsp;&nbsp;·&nbsp;&nbsp;
            {loading ? '—' : totalSignals} LIVE SIGNALS&nbsp;&nbsp;·&nbsp;&nbsp;
            {INDUSTRIES.length + discoveredIndustries.length} SECTORS TRACKED
          </p>

          {/* Search any industry */}
          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Explore any industry... (e.g. window cleaning, warehouse robotics, solar maintenance)"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm px-3 py-2 font-mono text-[10px] text-white/60 placeholder:text-white/20 focus:outline-none focus:border-[#00d4ff]/30 transition-colors"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim()}
              className="font-mono text-[8px] tracking-[0.2em] border border-[#00d4ff]/30 text-[#00d4ff]/70 rounded-sm px-3 py-2 hover:bg-[#00d4ff]/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              EXPLORE →
            </button>
          </div>
        </div>

        {/* ── Section 2: Sector momentum strip ─────────────────────────────── */}
        <div className="flex items-center py-3 border-b border-white/[0.05] overflow-x-auto scrollbar-thin gap-0">
          {INDUSTRIES.map((ind, i) => {
            const live = scoreBySlug[ind.slug];
            const score = live?.score ?? 0;
            const barWidth = loading ? 0 : Math.max(4, score) / 100;
            return (
              <div
                key={ind.slug}
                className="flex items-center gap-2 px-3 shrink-0"
                style={{
                  borderRight: i < INDUSTRIES.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}
              >
                <span
                  className="shrink-0"
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: ind.color,
                    opacity: live ? 1 : 0.35,
                    display: 'inline-block',
                    boxShadow: live ? `0 0 6px ${ind.color}99` : 'none',
                  }}
                />
                <span className="text-[9px] text-white/40 tracking-wide whitespace-nowrap uppercase">
                  {ind.label}
                </span>
                <span
                  className="text-[12px] font-bold tabular-nums w-7 text-right leading-none"
                  style={{ color: live ? ind.color : 'rgba(255,255,255,0.25)' }}
                >
                  {loading ? '–' : score > 0 ? score : '—'}
                </span>
                <div className="w-12 h-[3px] bg-white/[0.06] overflow-hidden shrink-0 rounded-full">
                  <div
                    className="h-full transition-all duration-700 rounded-full"
                    style={{
                      width: `${barWidth * 100}%`,
                      background: ind.color,
                      boxShadow: live ? `0 0 4px ${ind.color}80` : 'none',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Section 3: Industry grid ─────────────────────────────────────── */}
        <div className="mt-6 mb-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-white/[0.06] rounded-sm h-[148px] shimmer"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {INDUSTRIES.map((ind) => {
                const story = INDUSTRY_STORIES[ind.slug];
                const live = scoreBySlug[ind.slug];
                const techCount = CATALOG_SUMMARY.byCategory[ind.category] ?? 0;
                const vendorCount = VENDOR_COUNTS[ind.slug] ?? 0;
                const signalCount = live?.signals ?? 0;

                return (
                  <Link
                    key={ind.slug}
                    href={`/industry/${ind.slug}`}
                    className="group block border border-white/[0.06] rounded-sm p-6 hover:border-white/[0.12] hover:bg-white/[0.02] hover:-translate-y-px transition-all duration-300"
                  >
                    {/* Top row: name + score */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="shrink-0"
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: ind.color,
                            display: 'inline-block',
                            boxShadow: `0 0 8px ${ind.color}80`,
                          }}
                        />
                        <span className="text-[13px] tracking-[0.12em] text-white/80 font-medium uppercase">
                          {ind.label}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-0.5 shrink-0">
                        <span
                          className="text-[22px] font-bold tabular-nums leading-none"
                          style={{ color: live ? ind.color : 'rgba(255,255,255,0.18)' }}
                        >
                          {live ? live.score : '—'}
                        </span>
                        <span className="text-[9px] text-white/20 ml-0.5">/100</span>
                      </div>
                    </div>

                    {/* Score bar */}
                    <div className="mt-3 h-[3px] w-full bg-white/[0.05] overflow-hidden rounded-full">
                      <div
                        className="h-full transition-all duration-700 rounded-full"
                        style={{
                          width: live ? `${Math.min(100, live.score)}%` : '0%',
                          background: ind.color,
                          boxShadow: live ? `0 0 6px ${ind.color}60` : 'none',
                        }}
                      />
                    </div>

                    {/* Headline */}
                    {story && (
                      <p className="text-[10px] leading-relaxed text-white/35 mt-3 line-clamp-2">
                        {story.headline}
                      </p>
                    )}
                    {!story && (
                      <p className="text-[10px] leading-relaxed text-white/20 mt-3 line-clamp-2 italic">
                        {ind.description}
                      </p>
                    )}

                    {/* Bottom stats row */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.04]">
                      <span className="text-[9px] text-white/25 tabular-nums">
                        {techCount}&nbsp;<span className="text-white/15">TECH</span>
                      </span>
                      <span className="text-[9px] text-white/25 tabular-nums">
                        {vendorCount}&nbsp;<span className="text-white/15">VENDORS</span>
                      </span>
                      <span className="text-[9px] text-white/25 tabular-nums">
                        {signalCount}&nbsp;<span className="text-white/15">SIGNALS</span>
                      </span>
                      <span className="ml-auto text-[9px] tracking-[0.2em] uppercase text-white/20 group-hover:text-[#00d4ff]/60 transition-colors duration-200">
                        EXPLORE →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Section 4: Discovered industries ─────────────────────────────── */}
        {discoveredIndustries.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-[3px] h-4 bg-[#00d4ff]/40" style={{ boxShadow: '0 0 8px rgba(0,212,255,0.3)' }} />
              <span className="text-[9px] tracking-[0.3em] text-white/30 uppercase">DISCOVERED INDUSTRIES</span>
              <span className="text-[8px] text-white/15">{discoveredIndustries.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {discoveredIndustries.map((di) => (
                <Link
                  key={di.slug}
                  href={`/industry/${di.slug}`}
                  className="group block border border-white/[0.05] rounded-sm p-4 hover:border-white/[0.10] hover:bg-white/[0.02] transition-all duration-300"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="shrink-0"
                      style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: di.color || '#00d4ff', display: 'inline-block',
                        boxShadow: `0 0 6px ${di.color || '#00d4ff'}60`,
                      }}
                    />
                    <span className="text-[11px] tracking-[0.08em] text-white/65 font-medium uppercase truncate">
                      {di.label}
                    </span>
                  </div>
                  {di.description && (
                    <p className="text-[9px] text-white/25 leading-relaxed line-clamp-2 mb-2">
                      {di.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-[8px] text-white/20 tabular-nums">
                      {di.product_count}&nbsp;<span className="text-white/10">PRODUCTS</span>
                    </span>
                    <span className="text-[8px] text-white/20 tabular-nums">
                      {di.source_count}&nbsp;<span className="text-white/10">SOURCES</span>
                    </span>
                    {di.scan_quality && (
                      <span className={`text-[7px] tracking-wider px-1 py-0.5 border rounded-sm ${
                        di.scan_quality === 'pass'
                          ? 'text-[#00ff88]/50 border-[#00ff88]/20'
                          : di.scan_quality === 'warning'
                          ? 'text-[#ffb800]/50 border-[#ffb800]/20'
                          : 'text-[#ff3b30]/50 border-[#ff3b30]/20'
                      }`}>
                        {di.scan_quality.toUpperCase()}
                      </span>
                    )}
                    <span className="ml-auto text-[8px] text-white/15 group-hover:text-[#00d4ff]/50 transition-colors">
                      EXPLORE →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Section 5: Problem Solver CTA ───────────────────────────────── */}
        <div className="border border-white/[0.06] rounded-sm p-4 mb-6 flex items-center justify-between hover:border-white/[0.10] transition-colors duration-300">
          <div>
            <p className="text-[10px] text-white/35 tracking-wide">Have a technology problem?</p>
            <p className="text-[9px] text-white/20 mt-0.5">
              We match El Paso organizations with the right vendors.
            </p>
          </div>
          <Link
            href="/solve"
            className="text-[9px] tracking-[0.2em] text-[#00ff88]/50 hover:text-[#00ff88]/90 transition-colors uppercase font-medium shrink-0 ml-6 hover:[text-shadow:0_0_12px_rgba(0,255,136,0.5)]"
          >
            PROBLEM SOLVER →
          </Link>
        </div>

      </div>
    </div>
  );
}
