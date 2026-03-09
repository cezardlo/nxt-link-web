'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { INDUSTRIES, CATALOG_SUMMARY } from '@/lib/data/technology-catalog';
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

  return (
    <div className="bg-black min-h-screen">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-10">
        <h1
          className="text-[28px] tracking-[0.04em] text-white/90 font-light"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Industries
        </h1>
        <p className="font-mono text-[11px] text-white/30 mt-2 tracking-wide">
          Explore technology ecosystems across every sector
        </p>

        {/* ── Search ──────────────────────────────────────────────────── */}
        <div className="mt-8 flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search any industry — e.g. warehouse robotics, solar maintenance, window cleaning..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm px-4 py-3 font-mono text-[12px] text-white/60 placeholder:text-white/20 focus:outline-none focus:border-[#00d4ff]/30 transition-colors"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim()}
            className="font-mono text-[9px] tracking-[0.2em] border border-[#00d4ff]/30 text-[#00d4ff]/70 rounded-sm px-5 py-3 hover:bg-[#00d4ff]/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            EXPLORE →
          </button>
        </div>
      </div>

      {/* ── Industry grid ───────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 pb-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="border border-white/[0.04] rounded-sm h-[120px] shimmer"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="group block border border-white/[0.04] rounded-sm p-5 hover:border-white/[0.10] hover:bg-white/[0.015] transition-all duration-300"
                >
                  {/* Name */}
                  <div className="flex items-center gap-2.5">
                    <span
                      className="shrink-0"
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: ind.color,
                        display: 'inline-block',
                        boxShadow: `0 0 8px ${ind.color}60`,
                      }}
                    />
                    <span className="text-[13px] tracking-[0.10em] text-white/75 font-medium uppercase">
                      {ind.label}
                    </span>
                  </div>

                  {/* Headline */}
                  {story ? (
                    <p className="text-[10px] leading-relaxed text-white/30 mt-3 line-clamp-2">
                      {story.headline}
                    </p>
                  ) : (
                    <p className="text-[10px] leading-relaxed text-white/20 mt-3 line-clamp-2">
                      {ind.description}
                    </p>
                  )}

                  {/* Bottom stats row */}
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.04]">
                    <span className="font-mono text-[8px] text-white/25 tabular-nums">
                      {techCount} <span className="text-white/15">TECH</span>
                    </span>
                    <span className="font-mono text-[8px] text-white/25 tabular-nums">
                      {vendorCount} <span className="text-white/15">VENDORS</span>
                    </span>
                    <span className="font-mono text-[8px] text-white/25 tabular-nums">
                      {signalCount} <span className="text-white/15">SIGNALS</span>
                    </span>
                    <span className="ml-auto font-mono text-[8px] tracking-[0.2em] uppercase text-white/20 group-hover:text-[#00d4ff]/60 transition-colors duration-200">
                      EXPLORE →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Discovered industries ────────────────────────────────────────── */}
      {discoveredIndustries.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-16">
          <p className="font-mono text-[9px] tracking-[0.3em] text-white/25 uppercase mb-4">
            Discovered Industries
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {discoveredIndustries.map((di) => (
              <Link
                key={di.slug}
                href={`/industry/${di.slug}`}
                className="group block border border-white/[0.04] rounded-sm p-4 hover:border-white/[0.10] hover:bg-white/[0.015] transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="shrink-0"
                    style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: di.color || '#00d4ff', display: 'inline-block',
                      boxShadow: `0 0 6px ${di.color || '#00d4ff'}40`,
                    }}
                  />
                  <span className="text-[11px] tracking-[0.08em] text-white/60 font-medium uppercase truncate">
                    {di.label}
                  </span>
                </div>
                {di.description && (
                  <p className="text-[9px] text-white/20 leading-relaxed line-clamp-2 mb-3">
                    {di.description}
                  </p>
                )}
                <span className="font-mono text-[8px] text-white/15 group-hover:text-[#00d4ff]/50 transition-colors">
                  EXPLORE →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
