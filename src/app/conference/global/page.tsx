'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { COLORS } from '@/lib/tokens';

// ─── Types ──────────────────────────────────────────────────────────────────────

type Continent = 'North America' | 'South America' | 'Europe' | 'Asia' | 'Africa' | 'Oceania' | 'Middle East';

type Conference = {
  id: string;
  name: string;
  category: string;
  location: string;
  month: string;
  description: string;
  estimatedExhibitors: number;
  relevanceScore: number;
  website: string;
  lat: number;
  lon: number;
  country: string;
  continent: Continent;
};

type ContinentStat = {
  continent: Continent;
  count: number;
  totalExhibitors: number;
  countries: string[];
};

type CountryEntry = { name: string; count: number };
type CategoryEntry = { name: string; count: number };

// ─── Constants ──────────────────────────────────────────────────────────────────

const CONTINENT_ICONS: Record<string, string> = {
  'North America': '\u{1F30E}',
  'South America': '\u{1F30E}',
  'Europe': '\u{1F30D}',
  'Asia': '\u{1F30F}',
  'Africa': '\u{1F30D}',
  'Oceania': '\u{1F30F}',
  'Middle East': '\u{1F30D}',
};

const CONTINENT_COLORS: Record<string, string> = {
  'North America': '#00d4ff',
  'South America': '#00ff88',
  'Europe': '#a855f7',
  'Asia': '#ff6600',
  'Africa': '#ffd700',
  'Oceania': '#3b82f6',
  'Middle East': '#ff3b30',
};

const CATEGORY_COLORS: Record<string, string> = {
  Defense: '#ff3b30',
  Cybersecurity: '#ff3b30',
  Manufacturing: '#3b82f6',
  Logistics: '#00d4ff',
  'Supply Chain': '#00d4ff',
  'AI/ML': '#a855f7',
  Energy: '#00ff88',
  Healthcare: '#00d4ff',
  Robotics: '#a855f7',
  'Smart Cities': '#ffd700',
  Construction: '#ff6600',
  Trucking: '#10b981',
  Warehousing: '#3b82f6',
  Aviation: '#ff6600',
  Maritime: '#3b82f6',
  Automotive: '#ff6600',
};

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function GlobalConferencesPage() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [globalStats, setGlobalStats] = useState<ContinentStat[]>([]);
  const [topCountries, setTopCountries] = useState<CountryEntry[]>([]);
  const [topCategories, setTopCategories] = useState<CategoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeContinent, setActiveContinent] = useState<Continent | 'all'>('all');
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeContinent !== 'all') params.set('continent', activeContinent);
    if (activeCountry) params.set('country', activeCountry);
    if (activeCategory) params.set('category', activeCategory);
    if (search) params.set('search', search);
    params.set('limit', '100');

    try {
      const res = await fetch(`/api/conferences/global?${params}`);
      const data = await res.json();
      setConferences(data.conferences ?? []);
      setTotal(data.total ?? 0);
      setGlobalStats(data.global_stats ?? []);
      setTopCountries(data.facets?.countries ?? []);
      setTopCategories(data.facets?.categories ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [activeContinent, activeCountry, activeCategory, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset sub-filters when continent changes
  useEffect(() => {
    setActiveCountry(null);
    setActiveCategory(null);
  }, [activeContinent]);

  return (
    <div className="min-h-screen pb-24" style={{ background: COLORS.bg, color: COLORS.text }}>
      {/* Header */}
      <div className="px-6 pt-8 pb-4 border-b" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-mono text-[22px] font-bold text-white/90 tracking-tight">
            Global Conference Intelligence
          </h1>
          <Link
            href="/conferences"
            className="font-mono text-[9px] uppercase tracking-wider hover:underline"
            style={{ color: COLORS.cyan }}
          >
            Calendar View &rarr;
          </Link>
        </div>
        <p className="font-mono text-[11px]" style={{ color: COLORS.muted }}>
          {globalStats.reduce((s, g) => s + g.count, 0)} conferences across{' '}
          {globalStats.length} continents &middot;{' '}
          {globalStats.reduce((s, g) => s + g.totalExhibitors, 0).toLocaleString()} estimated exhibitors
        </p>
      </div>

      {/* Continent Stats Bar */}
      <div className="px-6 py-4 border-b overflow-x-auto" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-2 min-w-max">
          <button
            onClick={() => setActiveContinent('all')}
            className="font-mono text-[9px] tracking-[0.1em] px-3 py-2 rounded-lg border transition-all uppercase flex items-center gap-1.5"
            style={{
              borderColor: activeContinent === 'all' ? COLORS.cyan : COLORS.border,
              color: activeContinent === 'all' ? COLORS.cyan : COLORS.muted,
              background: activeContinent === 'all' ? COLORS.cyan + '0f' : 'transparent',
            }}
          >
            <span className="text-[12px]">{'\u{1F310}'}</span> Global
          </button>
          {globalStats.map((stat) => (
            <button
              key={stat.continent}
              onClick={() => setActiveContinent(stat.continent)}
              className="font-mono text-[9px] tracking-[0.08em] px-3 py-2 rounded-lg border transition-all flex items-center gap-1.5"
              style={{
                borderColor:
                  activeContinent === stat.continent
                    ? CONTINENT_COLORS[stat.continent]
                    : COLORS.border,
                color:
                  activeContinent === stat.continent
                    ? CONTINENT_COLORS[stat.continent]
                    : COLORS.muted,
                background:
                  activeContinent === stat.continent
                    ? CONTINENT_COLORS[stat.continent] + '0f'
                    : 'transparent',
              }}
            >
              <span className="text-[12px]">{CONTINENT_ICONS[stat.continent]}</span>
              {stat.continent}
              <span className="font-mono text-[8px]" style={{ color: COLORS.dim }}>
                {stat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="px-6 py-3 border-b flex flex-col sm:flex-row gap-3" style={{ borderColor: COLORS.border }}>
        <div className="relative flex-1 max-w-md">
          <svg
            viewBox="0 0 24 24"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: COLORS.dim }}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx={11} cy={11} r={8} />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conferences, countries, industries..."
            className="w-full pl-9 pr-4 py-2 rounded-sm font-mono text-[11px] focus:outline-none transition-colors"
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.text,
            }}
          />
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {topCategories.slice(0, 8).map((cat) => (
            <button
              key={cat.name}
              onClick={() =>
                setActiveCategory(activeCategory === cat.name ? null : cat.name)
              }
              className="font-mono text-[8px] tracking-[0.08em] px-2.5 py-1 rounded-full border transition-all uppercase"
              style={{
                borderColor:
                  activeCategory === cat.name
                    ? CATEGORY_COLORS[cat.name] ?? COLORS.cyan
                    : COLORS.border,
                color:
                  activeCategory === cat.name
                    ? CATEGORY_COLORS[cat.name] ?? COLORS.cyan
                    : COLORS.dim,
                background:
                  activeCategory === cat.name
                    ? (CATEGORY_COLORS[cat.name] ?? COLORS.cyan) + '0f'
                    : 'transparent',
              }}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      <div className="flex">
        {/* Left sidebar — Country breakdown */}
        <aside className="hidden lg:block w-52 shrink-0 border-r overflow-y-auto" style={{ borderColor: COLORS.border, maxHeight: 'calc(100vh - 200px)' }}>
          <div className="p-4">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: COLORS.dim }}>
              Countries
            </span>
            <div className="flex flex-col gap-1 mt-3">
              {topCountries.map((c) => (
                <button
                  key={c.name}
                  onClick={() =>
                    setActiveCountry(activeCountry === c.name ? null : c.name)
                  }
                  className="flex items-center justify-between px-2 py-1.5 rounded-sm transition-all text-left"
                  style={{
                    background:
                      activeCountry === c.name ? COLORS.cyan + '10' : 'transparent',
                    color: activeCountry === c.name ? COLORS.cyan : COLORS.muted,
                  }}
                >
                  <span className="font-mono text-[10px] truncate">{c.name}</span>
                  <span className="font-mono text-[8px]" style={{ color: COLORS.dim }}>
                    {c.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 p-6">
          {/* Result count */}
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: COLORS.dim }}>
              {total} conferences
              {activeContinent !== 'all' && ` in ${activeContinent}`}
              {activeCountry && ` — ${activeCountry}`}
            </span>
            {(activeCountry || activeCategory) && (
              <button
                onClick={() => {
                  setActiveCountry(null);
                  setActiveCategory(null);
                }}
                className="font-mono text-[8px] uppercase tracking-wider"
                style={{ color: COLORS.cyan }}
              >
                Clear filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="h-40 rounded-sm animate-pulse"
                  style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
                />
              ))}
            </div>
          ) : conferences.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <span className="font-mono text-[12px]" style={{ color: COLORS.dim }}>
                No conferences match your filters
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {conferences.map((c) => (
                <ConferenceCard key={c.id} conference={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Conference Card ────────────────────────────────────────────────────────────

function ConferenceCard({ conference: c }: { conference: Conference }) {
  const catColor = CATEGORY_COLORS[c.category] ?? COLORS.cyan;
  const contColor = CONTINENT_COLORS[c.continent] ?? COLORS.cyan;

  return (
    <div
      className="p-4 rounded-sm transition-all hover:border-white/[0.12]"
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderLeft: `3px solid ${catColor}`,
      }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-[8px] tracking-[0.1em] uppercase font-semibold"
            style={{ color: catColor }}
          >
            {c.category}
          </span>
          <span
            className="font-mono text-[7px] tracking-[0.08em] px-1.5 py-0.5 rounded-sm border uppercase"
            style={{
              color: contColor + 'cc',
              borderColor: contColor + '30',
              background: contColor + '08',
            }}
          >
            {c.continent}
          </span>
        </div>
        <div className="text-right">
          <span
            className="font-mono text-[16px] font-bold"
            style={{ color: COLORS.gold }}
          >
            {c.relevanceScore}
          </span>
        </div>
      </div>

      {/* Name */}
      <h3 className="font-mono text-[13px] font-semibold text-white/90 mb-1 leading-tight">
        {c.website ? (
          <a
            href={c.website}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: COLORS.text }}
          >
            {c.name}
          </a>
        ) : (
          c.name
        )}
      </h3>

      {/* Description */}
      <p
        className="font-mono text-[10px] leading-[1.6] line-clamp-2 mb-2"
        style={{ color: COLORS.muted }}
      >
        {c.description}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-mono text-[10px]" style={{ color: COLORS.text }}>
          {c.country}
        </span>
        <span className="font-mono text-[9px]" style={{ color: COLORS.dim }}>
          {c.location}
        </span>
        <span className="font-mono text-[9px]" style={{ color: COLORS.dim }}>
          {c.month}
        </span>
        {c.estimatedExhibitors > 0 && (
          <span className="font-mono text-[8px] uppercase tracking-wider" style={{ color: COLORS.cyan }}>
            {c.estimatedExhibitors.toLocaleString()} exhibitors
          </span>
        )}
      </div>
    </div>
  );
}
