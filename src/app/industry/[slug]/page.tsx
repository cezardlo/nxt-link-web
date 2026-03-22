'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { COLORS } from '@/lib/tokens';
import { getIndustryBySlug, getTechByCategory } from '@/lib/data/technology-catalog';
import { INDUSTRY_STORIES } from '@/lib/data/industry-stories';
import {
  getIndustryTrajectory,
} from '@/lib/data/industry-trajectory-timeline';
import { COUNTRY_TECH_MAP } from '@/lib/data/country-tech-map';
import type { CountryTechProfile } from '@/lib/data/country-tech-map';
import { CONFERENCES } from '@/lib/data/conferences';
import { PageTopBar } from '@/components/PageTopBar';
import { SectionNav } from '@/components/SectionNav';
import { ProblemSolver } from '@/components/ProblemSolver';
import { BottomNav } from '@/components/ui';
import { HeroSection } from './components/HeroSection';
import TrajectoryMatrix from './components/TrajectoryMatrix';
import { RecommendedMoves } from './components/RecommendedMoves';
import { KeyMetrics } from './components/KeyMetrics';
import { TechnologyCatalog } from './components/TechnologyCatalog';
import { CountriesSection } from './components/CountriesSection';
import { ConferencesSection } from './components/ConferencesSection';
import { LiveSignals } from './components/LiveSignals';
import { KeyPlayers } from './components/KeyPlayers';

// ─── Types for API responses ────────────────────────────────────────────────

interface ApiSignal {
  id: string;
  title: string;
  source: string;
  timestamp: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
}

interface ApiConference {
  id: string;
  name: string;
  date: string;
  location: string;
  relevance: number;
  url?: string;
  tags: string[];
}

interface ApiVendor {
  id: string;
  name: string;
  description: string;
  category: string;
  relevance: number;
  hq?: string;
  url?: string;
}

interface IndustryApiData {
  signals: ApiSignal[];
  conferences: ApiConference[];
  vendors: ApiVendor[];
}

interface IndustryProfile {
  overview?: string;
  marketSize?: string;
  growth?: string;
  keyTrends?: string[];
}

interface CountryActivity {
  countries: CountryTechProfile[];
}

// ─── Section definitions ────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'matrix', label: 'Matrix' },
  { id: 'countries', label: 'Countries' },
  { id: 'moves', label: 'Moves' },
  { id: 'solver', label: 'Solver' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'technologies', label: 'Tech' },
  { id: 'conferences', label: 'Events' },
  { id: 'signals', label: 'Signals' },
  { id: 'players', label: 'Players' },
] as const;

// ─── Auto-refresh interval (10 minutes) ─────────────────────────────────────

const REFRESH_INTERVAL = 10 * 60 * 1000;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── SessionStorage cache helpers ────────────────────────────────────────────

function getCached<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { data: T; timestamp: number };
    if (Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
    sessionStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Private browsing or quota exceeded — ignore
  }
}

// ─── Slug → intel-signal industry categories mapping ──────────────────────────

const SLUG_SIGNAL_CATEGORIES: Record<string, string[]> = {
  'logistics':      ['Logistics', 'Supply Chain'],
  'defense':        ['Defense'],
  'ai-ml':          ['AI/ML'],
  'cybersecurity':  ['Cybersecurity'],
  'manufacturing':  ['Manufacturing'],
  'energy':         ['Energy'],
  'healthcare':     ['Healthcare'],
  'border-tech':    ['Border Tech', 'Supply Chain'],
};

// ─── Slug → conference categories mapping ────────────────────────────────────

const SLUG_CONFERENCE_CATEGORIES: Record<string, string[]> = {
  'logistics':      ['Logistics', 'Supply Chain', 'Trucking', 'Aviation', 'Maritime', 'Rail', 'Automotive', 'Fleet Management', 'Warehousing'],
  'defense':        ['Defense', 'Aerospace', 'Government IT', 'Homeland Security', 'Intelligence'],
  'border-tech':    ['Border/Gov', 'Homeland Security', 'Government IT'],
  'ai-ml':          ['AI/ML', 'Robotics', 'Software', 'Cloud Computing', 'Data Centers', 'IoT', 'Smart Cities', 'Semiconductors', 'Quantum Computing'],
  'cybersecurity':  ['Cybersecurity', 'Government IT'],
  'manufacturing':  ['Manufacturing', '3D Printing', 'Construction', 'Fabrication', 'Chemical', 'Packaging', 'Plastics', 'Quality/Testing', 'HVAC', 'Textiles'],
  'energy':         ['Energy', 'Solar', 'Wind', 'Nuclear', 'Oil & Gas', 'Environmental', 'Water', 'Mining', 'Waste Management'],
  'healthcare':     ['Healthcare', 'Pharma', 'Biotech', 'Medical Devices', 'Dental', 'Veterinary'],
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function IndustryCommandCenter() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';

  // ── Static data lookups ──────────────────────────────────────────────────
  const industry = useMemo(() => getIndustryBySlug(slug), [slug]);
  const story = useMemo(
    () => (slug ? INDUSTRY_STORIES[slug as keyof typeof INDUSTRY_STORIES] : undefined),
    [slug],
  );
  const trajectory = useMemo(
    () => (slug ? getIndustryTrajectory(slug) : undefined),
    [slug],
  );
  const technologies = useMemo(
    () => (industry ? getTechByCategory(industry.category) : []),
    [industry],
  );
  const staticConferences = useMemo(() => {
    const cats = SLUG_CONFERENCE_CATEGORIES[slug];
    if (!cats) return [];
    return CONFERENCES.filter((c) => cats.includes(c.category));
  }, [slug]);

  // ── API data state ───────────────────────────────────────────────────────
  const [apiData, setApiData] = useState<IndustryApiData | null>(null);
  const [mergedSignals, setMergedSignals] = useState<Record<string, any>[]>([]);
  const [, setProfile] = useState<IndustryProfile | null>(null);
  const [, setCountryActivity] = useState<CountryActivity | null>(null);
  const [, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);

  // Track whether we restored from cache (skip loading state on repeat visits)
  const restoredFromCache = useRef(false);

  // ── Boot sequence state ──────────────────────────────────────────────────
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const key = `nxtlink-boot-seen-${slug}`;
    if (typeof window !== 'undefined' && !sessionStorage.getItem(key)) {
      setIsFirstVisit(true);
      sessionStorage.setItem(key, '1');
    }
  }, [slug]);

  // ── Bidirectional state: TrajectoryMatrix <-> CountriesSection ──────────
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);

  const highlightedCountries = useMemo(() => {
    if (!selectedTechId || !industry) return [];
    const tech = technologies.find((t) => t.id === selectedTechId);
    if (!tech) return [];
    return COUNTRY_TECH_MAP.filter((c) =>
      c.primarySectors.some(
        (s) => s.toLowerCase() === tech.category.toLowerCase(),
      ),
    ).map((c) => c.code);
  }, [selectedTechId, technologies, industry]);

  const highlightedTechIds = useMemo(() => {
    if (!selectedCountryCode) return [];
    const country = COUNTRY_TECH_MAP.find((c) => c.code === selectedCountryCode);
    if (!country) return [];
    return technologies
      .filter((t) =>
        country.primarySectors.some(
          (s) => s.toLowerCase() === t.category.toLowerCase(),
        ),
      )
      .map((t) => t.id);
  }, [selectedCountryCode, technologies]);

  const handleTechSelect = useCallback((techId: string | null) => {
    setSelectedTechId(techId);
    setSelectedCountryCode(null);
  }, []);

  const handleCountrySelect = useCallback((code: string | null) => {
    setSelectedCountryCode(code);
    setSelectedTechId(null);
  }, []);

  // ── Data fetching with sessionStorage cache ─────────────────────────────
  const fetchData = useCallback(async (isBackgroundRefresh = false) => {
    if (!slug) return;

    // Only show loading state if no cached data was restored
    if (!isBackgroundRefresh) {
      setLoading(true);
    }
    setError(null);

    try {
      const [industryRes, profileRes, countryRes] = await Promise.allSettled([
        fetch(`/api/industry/${slug}`),
        fetch(`/api/industry/${slug}/profile`),
        fetch(`/api/country-activity`),
      ]);

      let industrySignals: Record<string, any>[] = [];

      if (industryRes.status === 'fulfilled' && industryRes.value.ok) {
        const data = await industryRes.value.json();
        setApiData(data);
        setCache(`nxtlink-cache-${slug}-industry`, data);
        industrySignals = data.signals ?? [];
      }

      // Fallback: if industry API returned fewer than 3 signals, fetch from intel-signals
      if (industrySignals.length < 3) {
        try {
          const intelRes = await fetch(`/api/intel-signals?limit=15`);
          if (intelRes.ok) {
            const intelData = await intelRes.json();
            const intelSignals: Record<string, any>[] = intelData.signals ?? [];

            // Filter by industry category OR title keywords (case-insensitive)
            const cats = SLUG_SIGNAL_CATEGORIES[slug] ?? [];
            const catsLower = cats.map((c: string) => c.toLowerCase());
            const keywords = catsLower.flatMap((c: string) => c.split(/[\s/]+/));
            const filtered = intelSignals.filter((s: Record<string, unknown>) => {
              const ind = String(s.industry ?? '').toLowerCase();
              const title = String(s.title ?? '').toLowerCase();
              // Match by industry field
              if (ind !== 'general' && catsLower.includes(ind)) return true;
              // Match by keywords in title
              if (keywords.some(kw => kw.length > 2 && title.includes(kw))) return true;
              return false;
            });
            // If no industry-specific signals found, show all signals
            const signalsToUse = filtered.length >= 2 ? filtered : intelSignals;

            // Map intel-signals shape to LiveSignals shape
            const mapped = signalsToUse.map((s: Record<string, unknown>, idx: number) => ({
              id: String(s.url ?? `intel-${idx}-${Date.now()}`),
              title: String(s.title ?? ''),
              type: String(s.signal_type ?? 'intel'),
              source: String(s.company ?? s.industry ?? 'Intel'),
              timestamp: String(s.discovered_at ?? new Date().toISOString()),
              importance: Number(s.importance ?? s.confidence ?? 0.5),
              company: s.company ? String(s.company) : null,
              industry: String(s.industry ?? 'General'),
            }));

            // Merge, deduplicate by title, sort by importance descending
            const allSignals = [...industrySignals, ...mapped];
            const seen = new Set<string>();
            const deduped = allSignals.filter((s) => {
              const key = (s.title ?? '').toLowerCase();
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            deduped.sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0));

            setMergedSignals(deduped);
            return; // skip the default setMergedSignals below
          }
        } catch (err) {
          console.error('[IndustryCommandCenter] intel-signals fallback error:', err);
        }
      }

      // Default: use industry signals as-is
      setMergedSignals(industrySignals);

      if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
        const data = await profileRes.value.json();
        setProfile(data);
        setCache(`nxtlink-cache-${slug}-profile`, data);
      }

      if (countryRes.status === 'fulfilled' && countryRes.value.ok) {
        const data = await countryRes.value.json();
        setCountryActivity(data);
        setCache(`nxtlink-cache-${slug}-country`, data);
      }
    } catch (err) {
      // Only set error if this wasn't a silent background refresh
      if (!isBackgroundRefresh) {
        setError('Failed to load intelligence data');
      }
      console.error('[IndustryCommandCenter] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;

    // 1. Try to restore from sessionStorage cache
    const cachedIndustry = getCached<IndustryApiData>(`nxtlink-cache-${slug}-industry`);
    const cachedProfile = getCached<IndustryProfile>(`nxtlink-cache-${slug}-profile`);
    const cachedCountry = getCached<CountryActivity>(`nxtlink-cache-${slug}-country`);

    const hasCachedData = !!(cachedIndustry || cachedProfile || cachedCountry);

    if (hasCachedData) {
      // Restore cached data instantly — no loading shimmer
      restoredFromCache.current = true;
      if (cachedIndustry) setApiData(cachedIndustry);
      if (cachedProfile) setProfile(cachedProfile);
      if (cachedCountry) setCountryActivity(cachedCountry);
      setLoading(false);

      // Still fetch in background to refresh stale data
      fetchData(true);
    } else {
      // No cache — show loading state, fetch normally
      fetchData(false);
    }

    // Set up auto-refresh interval
    const interval = setInterval(() => fetchData(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [slug, fetchData]);

  // ── Dynamic vendor list from signals ─────────────────────────────────────
  const dynamicVendors = useMemo(() => {
    const existing = apiData?.vendors ?? [];

    // Count signal mentions per company
    const companyMap = new Map<string, { count: number; totalImportance: number; types: Set<string>; industry: string }>();
    for (const sig of mergedSignals) {
      const company = sig.company as string | undefined;
      if (!company || !company.trim()) continue;
      const name = company.trim();
      const entry = companyMap.get(name) ?? { count: 0, totalImportance: 0, types: new Set<string>(), industry: '' };
      entry.count += 1;
      entry.totalImportance += (sig.importance as number) ?? 0;
      if (sig.type) entry.types.add(sig.type as string);
      if (sig.industry) entry.industry = sig.industry as string;
      companyMap.set(name, entry);
    }

    // Build vendor objects from signal companies
    const signalVendors = Array.from(companyMap.entries()).map(([name, info]) => ({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name,
      category: info.industry || slug,
      ikerScore: Math.round(info.count * 15 + (info.totalImportance / info.count) * 50),
      tags: Array.from(info.types),
    }));

    // Merge: existing vendors take priority (deduplicate by lowercase name)
    const existingNames = new Set(existing.map((v) => v.name.toLowerCase()));
    const merged = [
      ...existing.map((v) => ({
        id: v.id,
        name: v.name,
        category: v.category,
        ikerScore: v.relevance != null ? Math.round(v.relevance) : undefined,
        description: v.description,
        website: v.url,
      })),
      ...signalVendors.filter((v) => !existingNames.has(v.name.toLowerCase())),
    ];

    // Sort by ikerScore descending, take top 20
    merged.sort((a, b) => (b.ikerScore ?? 0) - (a.ikerScore ?? 0));
    return merged.slice(0, 20);
  }, [apiData?.vendors, mergedSignals, slug]);

  // ── Accent color ─────────────────────────────────────────────────────────
  const accentColor = industry?.color ?? COLORS.accent;

  // ── Not found ────────────────────────────────────────────────────────────
  if (!industry) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: COLORS.bg }}
      >
        <div className="text-center space-y-3">
          <div className="font-mono text-[10px] text-white/30 tracking-[0.3em]">
            INDUSTRY NOT FOUND
          </div>
          <Link
            href="/explore"
            className="font-mono text-[9px] tracking-[0.2em] hover:text-[#00d4ff] transition-colors"
            style={{ color: `${COLORS.accent}80` }}
          >
            &larr; BACK TO INDUSTRIES
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: COLORS.bg }}>
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <PageTopBar
        backHref="/industries"
        backLabel="INDUSTRIES"
        breadcrumbs={[{ label: industry.label }]}
        showLiveDot
      />

      {/* ── Section nav ──────────────────────────────────────────────────── */}
      <SectionNav sections={[...SECTIONS]} accentColor={accentColor} />

      {/* ── Sections ─────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-28">
        {/* Overview / Hero */}
        <div id="overview" className="pt-6">
          <HeroSection
            industry={industry}
            story={story ?? null}
            trajectory={trajectory ?? null}
            accentColor={accentColor}
            isFirstVisit={isFirstVisit}
          />
        </div>

        {/* Trajectory Matrix */}
        <div id="matrix" className="pt-12">
          <TrajectoryMatrix
            industry={industry}
            technologies={technologies}
            accentColor={accentColor}
            selectedTechId={selectedTechId}
            onTechSelect={handleTechSelect}
            highlightedCountries={highlightedCountries}
          />
        </div>

        {/* Matrix ↔ Countries connector */}
        <div className="font-mono text-[7px] text-white/10 text-center py-2">
          ↕ Click a technology above to see which countries lead · Click a country below to highlight technologies
        </div>

        {/* Countries */}
        <div id="countries" className="pt-4">
          <CountriesSection
            countries={COUNTRY_TECH_MAP}
            industry={industry}
            accentColor={accentColor}
            highlightedTechIds={highlightedTechIds}
            onCountrySelect={handleCountrySelect}
            signals={mergedSignals}
          />
        </div>

        {/* Recommended Moves */}
        <div id="moves" className="pt-12">
          <RecommendedMoves technologies={technologies} accentColor={accentColor} />
        </div>

        {/* Problem Solver */}
        <div id="solver" className="pt-12">
          <div
            className="rounded-xl p-6"
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: accentColor }}
              />
              <span
                className="font-mono text-[10px] tracking-[0.2em]"
                style={{ color: `${COLORS.text}cc` }}
              >
                PROBLEM SOLVER
              </span>
            </div>
            <ProblemSolver
              industrySlug={slug}
              industryLabel={industry.label}
              accentColor={accentColor}
            />
          </div>
        </div>

        {/* Key Metrics */}
        <div id="metrics" className="pt-12">
          <KeyMetrics
            industry={industry}
            technologies={technologies}
            countries={COUNTRY_TECH_MAP}
            signals={mergedSignals}
            accentColor={accentColor}
          />
        </div>

        {/* Technology Catalog */}
        <div id="technologies" className="pt-12">
          <TechnologyCatalog
            technologies={technologies}
            accentColor={accentColor}
            industry={industry}
          />
        </div>

        {/* Conferences */}
        <div id="conferences" className="pt-12">
          <ConferencesSection
            conferences={
              apiData?.conferences?.length
                ? apiData.conferences.map((c) => ({
                    id: c.id,
                    name: c.name,
                    category: c.tags?.[0] ?? 'General',
                    location: c.location,
                    month: c.date ? new Date(c.date).toLocaleString('en', { month: 'long' }) : 'TBD',
                    description: '',
                    estimatedExhibitors: 0,
                    relevanceScore: c.relevance ?? 50,
                    website: c.url ?? '',
                    lat: 0,
                    lon: 0,
                  }))
                : staticConferences
            }
            accentColor={accentColor}
          />
        </div>

        {/* Live Signals */}
        <div id="signals" className="pt-12">
          <LiveSignals signals={mergedSignals} accentColor={accentColor} />
        </div>

        {/* Key Players */}
        <div id="players" className="pt-12">
          <KeyPlayers vendors={dynamicVendors} accentColor={accentColor} />
        </div>

        {/* Sweep Radar link */}
        <div className="pt-12 text-center">
          <Link
            href="/sweep"
            className="inline-block px-8 py-4 rounded-xl transition-all hover:translate-y-[-2px]"
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              textDecoration: 'none',
            }}
          >
            <div className="font-mono text-[11px] tracking-[0.15em] font-bold" style={{ color: '#ff6600' }}>
              ⊞ SWEEP RADAR
            </div>
            <div className="font-mono text-[9px] mt-1" style={{ color: `${COLORS.text}40` }}>
              Discover companies across 40 cells
            </div>
          </Link>
        </div>
      </main>

      {/* ── Bottom nav ───────────────────────────────────────────────────── */}
      <BottomNav />
    </div>
  );
}
