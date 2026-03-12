'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { INDUSTRIES, CATALOG_SUMMARY } from '@/lib/data/technology-catalog';
import { INDUSTRY_STORIES } from '@/lib/data/industry-stories';
import { CONTINENT_DEPARTMENTS } from '@/lib/data/continent-departments';
import type { SectorScore } from '@/lib/intelligence/signal-engine';
import type { ContinentActivityRow } from '@/db/queries/continent-activity';

// ─── Types ────────────────────────────────────────────────────────────────────

type IntelSignalsResponse = {
  ok: boolean;
  sectorScores?: SectorScore[];
  by_industry?: Record<string, number>;
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

type ContinentApiResponse = {
  ok: boolean;
  source: 'live' | 'static';
  data: ContinentActivityRow[];
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

const TREND_ICONS: Record<string, string> = {
  rising: '▲',
  stable: '●',
  declining: '▼',
};

const TREND_COLORS: Record<string, string> = {
  rising: '#00ff88',
  stable: '#ffd700',
  declining: '#ff3b30',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IndustriesPage() {
  const router = useRouter();
  const [sectorScores, setSectorScores] = useState<SectorScore[]>([]);
  const [byIndustry, setByIndustry] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [discoveredIndustries, setDiscoveredIndustries] = useState<DiscoveredIndustry[]>([]);
  const [continentData, setContinentData] = useState<ContinentActivityRow[]>([]);
  const [continentLoading, setContinentLoading] = useState(true);
  const [activeContinent, setActiveContinent] = useState<string | null>(null);

  const handleSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) return;
    const slug = q.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    router.push(`/industry/${slug}`);
  }, [searchQuery, router]);

  // Load intel signals
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/intel-signals');
        if (!res.ok) return;
        const data = (await res.json()) as IntelSignalsResponse;
        if (!cancelled && data.ok) {
          setSectorScores(data.sectorScores ?? []);
          if (data.by_industry) {
            const normalized: Record<string, number> = {};
            const SLUG_MAP: Record<string, string> = {
              'ai_ml': 'ai-ml', 'aerospace_defense': 'defense',
              'health_biotech': 'healthcare', 'supply_chain': 'logistics',
            };
            for (const [k, v] of Object.entries(data.by_industry)) {
              const slug = SLUG_MAP[k] ?? k;
              normalized[slug] = (normalized[slug] ?? 0) + v;
            }
            setByIndustry(normalized);
          }
        }
      } catch { /* degrade gracefully */ }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  // Load discovered industries
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

  // Load continent activity data
  useEffect(() => {
    let cancelled = false;
    async function loadContinents() {
      try {
        const res = await fetch('/api/continent-activity');
        if (!res.ok) {
          // API not available yet — use static fallback from definitions
          const fallback: ContinentActivityRow[] = CONTINENT_DEPARTMENTS.map(dept => ({
            continent_id: dept.id,
            label: dept.label,
            color: dept.color,
            signal_count_30d: 0,
            signal_velocity: 0,
            top_industries: dept.industryFocus.slice(0, 5).map(f => ({ name: f.industry, count: 0 })),
            top_countries: dept.countryCodes.slice(0, 5).map(c => ({ code: c, count: 0 })),
            top_companies: [],
            heat_score: 25,
            trend_direction: 'stable',
            last_updated: new Date().toISOString(),
          }));
          if (!cancelled) setContinentData(fallback);
          return;
        }
        const data = (await res.json()) as ContinentApiResponse;
        if (!cancelled && data.ok) {
          setContinentData(data.data ?? []);
        }
      } catch {
        // Use static fallback
        if (!cancelled) {
          setContinentData(CONTINENT_DEPARTMENTS.map(dept => ({
            continent_id: dept.id,
            label: dept.label,
            color: dept.color,
            signal_count_30d: 0,
            signal_velocity: 0,
            top_industries: dept.industryFocus.slice(0, 5).map(f => ({ name: f.industry, count: 0 })),
            top_countries: dept.countryCodes.slice(0, 5).map(c => ({ code: c, count: 0 })),
            top_companies: [],
            heat_score: 25,
            trend_direction: 'stable',
            last_updated: new Date().toISOString(),
          })));
        }
      }
      finally { if (!cancelled) setContinentLoading(false); }
    }
    void loadContinents();
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

  // Total signals across all continents
  const totalGlobalSignals = continentData.reduce((sum, c) => sum + c.signal_count_30d, 0);

  return (
    <div className="bg-black min-h-screen">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[9px] tracking-[0.3em] text-[#00d4ff]/50 uppercase mb-2">
              NXT//LINK CENTRAL HQ
            </p>
            <h1
              className="text-[28px] tracking-[0.04em] text-white/90 font-light"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Global Intelligence
            </h1>
            <p className="font-mono text-[11px] text-white/30 mt-2 tracking-wide">
              5 continent bureaus · {CONTINENT_DEPARTMENTS.reduce((s, d) => s + d.countryCodes.length, 0)} countries · real-time signal routing
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[32px] text-white/80 tabular-nums" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {totalGlobalSignals.toLocaleString()}
            </p>
            <p className="font-mono text-[8px] tracking-[0.3em] text-white/25 uppercase">
              GLOBAL SIGNALS
            </p>
          </div>
        </div>
      </div>

      {/* ── Continent HQ Cards ────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pb-8">
        <p className="font-mono text-[9px] tracking-[0.3em] text-white/25 uppercase mb-4">
          CONTINENT BUREAUS
        </p>
        {continentLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border border-white/[0.04] rounded-sm h-[160px] shimmer" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {continentData.map((cont) => {
              const isActive = activeContinent === cont.continent_id;
              const trend = cont.trend_direction ?? 'stable';
              const topIndustries = (cont.top_industries ?? []) as Array<{ name: string; count: number }>;
              const color = cont.color ?? '#00d4ff';

              return (
                <button
                  key={cont.continent_id}
                  onClick={() => setActiveContinent(isActive ? null : cont.continent_id)}
                  className={`text-left border rounded-sm p-4 transition-all duration-300 ${
                    isActive
                      ? 'border-white/20 bg-white/[0.04]'
                      : 'border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.015]'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: color,
                        display: 'inline-block',
                        boxShadow: `0 0 8px ${color}80`,
                      }}
                    />
                    <span className="font-mono text-[10px] tracking-[0.15em] text-white/70 uppercase font-medium">
                      {cont.label}
                    </span>
                  </div>

                  {/* Heat Score Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[8px] text-white/25 tracking-wide">HEAT</span>
                      <span className="font-mono text-[8px] tabular-nums" style={{ color }}>
                        {cont.heat_score}
                      </span>
                    </div>
                    <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${cont.heat_score}%`,
                          background: color,
                          boxShadow: `0 0 6px ${color}60`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Signal Count + Trend */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-mono text-[16px] text-white/70 tabular-nums">
                      {cont.signal_count_30d}
                    </span>
                    <span className="font-mono text-[7px] text-white/20 tracking-wide">SIGNALS</span>
                    <span
                      className="ml-auto font-mono text-[9px]"
                      style={{ color: TREND_COLORS[trend] ?? '#ffd700' }}
                    >
                      {TREND_ICONS[trend] ?? '●'}
                    </span>
                  </div>

                  {/* Top Industries */}
                  <div className="space-y-1">
                    {topIndustries.slice(0, 3).map((ind) => (
                      <div key={ind.name} className="flex items-center justify-between">
                        <span className="font-mono text-[7px] text-white/30 truncate uppercase tracking-wide">
                          {ind.name}
                        </span>
                        <span className="font-mono text-[7px] text-white/20 tabular-nums ml-1">
                          {ind.count}
                        </span>
                      </div>
                    ))}
                    {topIndustries.length === 0 && (
                      <span className="font-mono text-[7px] text-white/15 italic">Awaiting signals...</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Active continent detail strip */}
        {activeContinent && (() => {
          const cont = continentData.find(c => c.continent_id === activeContinent);
          const dept = CONTINENT_DEPARTMENTS.find(d => d.id === activeContinent);
          if (!cont || !dept) return null;
          const topCompanies = (cont.top_companies ?? []) as Array<{ name: string; count: number }>;
          const topCountries = (cont.top_countries ?? []) as Array<{ code: string; count: number }>;

          return (
            <div
              className="mt-4 border border-white/[0.08] rounded-sm p-5 bg-black/92 backdrop-blur-md"
              style={{ borderColor: `${dept.color}30` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span
                  style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: dept.color, display: 'inline-block',
                    boxShadow: `0 0 10px ${dept.color}80`,
                  }}
                />
                <span
                  className="text-[16px] tracking-[0.08em] text-white/80 font-medium uppercase"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {dept.label} Bureau
                </span>
                <span className="font-mono text-[8px] text-white/20 tracking-wide ml-2">
                  {dept.countryCodes.length} COUNTRIES · {dept.industryFocus.length} INDUSTRIES
                </span>
              </div>
              <p className="font-mono text-[9px] text-white/30 leading-relaxed mb-4">
                {dept.description}
              </p>
              <div className="grid grid-cols-3 gap-6">
                {/* Top Industries */}
                <div>
                  <p className="font-mono text-[7px] tracking-[0.3em] text-white/20 uppercase mb-2">
                    INDUSTRIES
                  </p>
                  <div className="space-y-1.5">
                    {dept.industryFocus.slice(0, 6).map(f => (
                      <div key={f.industry} className="flex items-center justify-between">
                        <span className="font-mono text-[8px] text-white/40 truncate">{f.industry}</span>
                        <div className="h-[2px] flex-1 mx-2 bg-white/[0.04] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${f.weight * 100}%`, background: dept.color, opacity: 0.5 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Top Companies */}
                <div>
                  <p className="font-mono text-[7px] tracking-[0.3em] text-white/20 uppercase mb-2">
                    TOP COMPANIES
                  </p>
                  <div className="space-y-1.5">
                    {topCompanies.length > 0 ? topCompanies.slice(0, 6).map(c => (
                      <p key={c.name} className="font-mono text-[8px] text-white/40">{c.name}</p>
                    )) : (
                      <p className="font-mono text-[8px] text-white/15 italic">Awaiting cron run...</p>
                    )}
                  </div>
                </div>
                {/* Active Countries */}
                <div>
                  <p className="font-mono text-[7px] tracking-[0.3em] text-white/20 uppercase mb-2">
                    ACTIVE COUNTRIES
                  </p>
                  <div className="space-y-1.5">
                    {topCountries.length > 0 ? topCountries.slice(0, 6).map(c => (
                      <div key={c.code} className="flex items-center justify-between">
                        <span className="font-mono text-[8px] text-white/40">{c.code}</span>
                        <span className="font-mono text-[7px] text-white/20 tabular-nums">{c.count} signals</span>
                      </div>
                    )) : (
                      <p className="font-mono text-[8px] text-white/15 italic">Awaiting cron run...</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Search ──────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pb-6">
        <div className="flex items-center gap-3">
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
      <div className="max-w-5xl mx-auto px-6 pb-10">
        <p className="font-mono text-[9px] tracking-[0.3em] text-white/25 uppercase mb-4">
          {activeContinent
            ? `${continentData.find(c => c.continent_id === activeContinent)?.label ?? ''} Industries`
            : 'All Industries'}
        </p>
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
              const signalCount = (live?.signals ?? 0) + (byIndustry[ind.slug] ?? 0);

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
        <div className="max-w-5xl mx-auto px-6 pb-16">
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
