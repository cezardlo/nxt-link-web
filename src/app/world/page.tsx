'use client';

import { Suspense, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Brain } from '@/lib/brain';
import { BottomNav, TopBar } from '@/components/ui';
import { COLORS } from '@/lib/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

type TechKey =
  | 'ai'
  | 'defense'
  | 'biotech'
  | 'energy'
  | 'manufacturing'
  | 'cybersecurity'
  | 'robotics'
  | 'semiconductors';

type Region = 'AMERICAS' | 'EUROPE' | 'ASIA-PACIFIC' | 'OTHER';

type Country = {
  code: string;
  name: string;
  flag: string;
  region: Region;
  scores: Record<TechKey, number>;
};

type IntelSignal = {
  title: string;
  signal_type: string;
  industry: string;
  company: string | null;
  importance: number;
  discovered_at: string;
  url?: string;
  confidence?: number;
};

type SignalDot = {
  id: string;
  signal: IntelSignal;
  lat: number;
  lon: number;
  tier: 'P0' | 'P1' | 'P2';
  color: string;
  x: number; // SVG viewport x (0-100)
  y: number; // SVG viewport y (0-100)
};

type ViewMode = 'MAP' | 'SCOREBOARD' | 'OPS';

type GeoFilter = 'TEXAS' | 'USA' | 'GLOBAL';
type CategoryFilter = 'TECH' | 'MONEY' | 'POLICY' | 'SCIENCE' | 'ALL';

// ─── Static country data ──────────────────────────────────────────────────────

const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', flag: '\u{1F1FA}\u{1F1F8}', region: 'AMERICAS', scores: { ai: 98, defense: 99, biotech: 95, energy: 88, manufacturing: 82, cybersecurity: 97, robotics: 91, semiconductors: 89 } },
  { code: 'CN', name: 'China', flag: '\u{1F1E8}\u{1F1F3}', region: 'ASIA-PACIFIC', scores: { ai: 92, defense: 88, biotech: 78, energy: 85, manufacturing: 99, cybersecurity: 82, robotics: 88, semiconductors: 85 } },
  { code: 'DE', name: 'Germany', flag: '\u{1F1E9}\u{1F1EA}', region: 'EUROPE', scores: { ai: 75, defense: 70, biotech: 80, energy: 82, manufacturing: 95, cybersecurity: 78, robotics: 88, semiconductors: 72 } },
  { code: 'JP', name: 'Japan', flag: '\u{1F1EF}\u{1F1F5}', region: 'ASIA-PACIFIC', scores: { ai: 78, defense: 65, biotech: 82, energy: 75, manufacturing: 92, cybersecurity: 72, robotics: 96, semiconductors: 90 } },
  { code: 'KR', name: 'South Korea', flag: '\u{1F1F0}\u{1F1F7}', region: 'ASIA-PACIFIC', scores: { ai: 80, defense: 72, biotech: 75, energy: 70, manufacturing: 90, cybersecurity: 75, robotics: 82, semiconductors: 95 } },
  { code: 'GB', name: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}', region: 'EUROPE', scores: { ai: 85, defense: 82, biotech: 88, energy: 75, manufacturing: 72, cybersecurity: 88, robotics: 75, semiconductors: 68 } },
  { code: 'IL', name: 'Israel', flag: '\u{1F1EE}\u{1F1F1}', region: 'OTHER', scores: { ai: 88, defense: 92, biotech: 85, energy: 65, manufacturing: 68, cybersecurity: 95, robotics: 78, semiconductors: 72 } },
  { code: 'FR', name: 'France', flag: '\u{1F1EB}\u{1F1F7}', region: 'EUROPE', scores: { ai: 78, defense: 80, biotech: 82, energy: 85, manufacturing: 78, cybersecurity: 75, robotics: 72, semiconductors: 65 } },
  { code: 'SE', name: 'Sweden', flag: '\u{1F1F8}\u{1F1EA}', region: 'EUROPE', scores: { ai: 80, defense: 68, biotech: 78, energy: 88, manufacturing: 75, cybersecurity: 82, robotics: 78, semiconductors: 62 } },
  { code: 'NL', name: 'Netherlands', flag: '\u{1F1F3}\u{1F1F1}', region: 'EUROPE', scores: { ai: 75, defense: 65, biotech: 78, energy: 72, manufacturing: 72, cybersecurity: 78, robotics: 70, semiconductors: 85 } },
  { code: 'CH', name: 'Switzerland', flag: '\u{1F1E8}\u{1F1ED}', region: 'EUROPE', scores: { ai: 82, defense: 60, biotech: 90, energy: 72, manufacturing: 85, cybersecurity: 80, robotics: 75, semiconductors: 70 } },
  { code: 'TW', name: 'Taiwan', flag: '\u{1F1F9}\u{1F1FC}', region: 'ASIA-PACIFIC', scores: { ai: 80, defense: 70, biotech: 72, energy: 65, manufacturing: 88, cybersecurity: 75, robotics: 78, semiconductors: 98 } },
  { code: 'SG', name: 'Singapore', flag: '\u{1F1F8}\u{1F1EC}', region: 'ASIA-PACIFIC', scores: { ai: 82, defense: 65, biotech: 75, energy: 68, manufacturing: 78, cybersecurity: 85, robotics: 72, semiconductors: 80 } },
  { code: 'IN', name: 'India', flag: '\u{1F1EE}\u{1F1F3}', region: 'ASIA-PACIFIC', scores: { ai: 75, defense: 72, biotech: 68, energy: 70, manufacturing: 72, cybersecurity: 70, robotics: 62, semiconductors: 55 } },
  { code: 'AU', name: 'Australia', flag: '\u{1F1E6}\u{1F1FA}', region: 'ASIA-PACIFIC', scores: { ai: 72, defense: 70, biotech: 72, energy: 78, manufacturing: 62, cybersecurity: 75, robotics: 65, semiconductors: 55 } },
  { code: 'CA', name: 'Canada', flag: '\u{1F1E8}\u{1F1E6}', region: 'AMERICAS', scores: { ai: 82, defense: 72, biotech: 80, energy: 82, manufacturing: 68, cybersecurity: 78, robotics: 70, semiconductors: 62 } },
  { code: 'RU', name: 'Russia', flag: '\u{1F1F7}\u{1F1FA}', region: 'EUROPE', scores: { ai: 72, defense: 85, biotech: 65, energy: 78, manufacturing: 75, cybersecurity: 78, robotics: 65, semiconductors: 55 } },
  { code: 'BR', name: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}', region: 'AMERICAS', scores: { ai: 58, defense: 60, biotech: 65, energy: 72, manufacturing: 65, cybersecurity: 55, robotics: 50, semiconductors: 40 } },
  { code: 'MX', name: 'Mexico', flag: '\u{1F1F2}\u{1F1FD}', region: 'AMERICAS', scores: { ai: 52, defense: 55, biotech: 55, energy: 65, manufacturing: 70, cybersecurity: 50, robotics: 48, semiconductors: 38 } },
  { code: 'AE', name: 'UAE', flag: '\u{1F1E6}\u{1F1EA}', region: 'OTHER', scores: { ai: 72, defense: 75, biotech: 60, energy: 78, manufacturing: 62, cybersecurity: 70, robotics: 65, semiconductors: 50 } },
  { code: 'SA', name: 'Saudi Arabia', flag: '\u{1F1F8}\u{1F1E6}', region: 'OTHER', scores: { ai: 62, defense: 70, biotech: 55, energy: 82, manufacturing: 58, cybersecurity: 62, robotics: 55, semiconductors: 42 } },
  { code: 'FI', name: 'Finland', flag: '\u{1F1EB}\u{1F1EE}', region: 'EUROPE', scores: { ai: 78, defense: 65, biotech: 72, energy: 80, manufacturing: 72, cybersecurity: 85, robotics: 72, semiconductors: 60 } },
  { code: 'DK', name: 'Denmark', flag: '\u{1F1E9}\u{1F1F0}', region: 'EUROPE', scores: { ai: 75, defense: 62, biotech: 80, energy: 88, manufacturing: 68, cybersecurity: 80, robotics: 70, semiconductors: 58 } },
  { code: 'NO', name: 'Norway', flag: '\u{1F1F3}\u{1F1F4}', region: 'EUROPE', scores: { ai: 72, defense: 65, biotech: 75, energy: 92, manufacturing: 65, cybersecurity: 78, robotics: 68, semiconductors: 55 } },
  { code: 'EE', name: 'Estonia', flag: '\u{1F1EA}\u{1F1EA}', region: 'EUROPE', scores: { ai: 72, defense: 65, biotech: 58, energy: 65, manufacturing: 58, cybersecurity: 90, robotics: 60, semiconductors: 48 } },
];

// ─── Scoreboard config ────────────────────────────────────────────────────────

const TECH_DIMS: { key: TechKey; label: string; color: string }[] = [
  { key: 'ai',             label: 'AI',            color: COLORS.cyan },
  { key: 'defense',        label: 'DEFENSE',       color: COLORS.red },
  { key: 'biotech',        label: 'BIOTECH',       color: COLORS.green },
  { key: 'energy',         label: 'ENERGY',        color: COLORS.amber },
  { key: 'manufacturing',  label: 'MANUFACTURING', color: '#f97316' },
  { key: 'cybersecurity',  label: 'CYBERSECURITY', color: '#8b5cf6' },
  { key: 'robotics',       label: 'ROBOTICS',      color: '#06b6d4' },
  { key: 'semiconductors', label: 'SEMICONDUCTORS',color: '#ec4899' },
];

const TECH_COLOR: Record<TechKey, string> = Object.fromEntries(
  TECH_DIMS.map((d) => [d.key, d.color])
) as Record<TechKey, string>;

const REGIONS: Region[] = ['AMERICAS', 'EUROPE', 'ASIA-PACIFIC', 'OTHER'];

// ─── Signal dot helpers ───────────────────────────────────────────────────────

// Approximate lat/lon per industry keyword
const INDUSTRY_COORDS: Record<string, [number, number]> = {
  defense:        [31.7,  -106.4],
  military:       [31.7,  -106.4],
  'ai-ml':        [37.4,  -122.0],
  ai:             [37.4,  -122.0],
  'artificial intelligence': [37.4, -122.0],
  energy:         [31.8,  -102.0],
  oil:            [29.8,   -95.4],
  cybersecurity:  [38.9,   -77.0],
  cyber:          [38.9,   -77.0],
  healthcare:     [29.7,   -95.4],
  health:         [29.7,   -95.4],
  biotech:        [42.3,   -71.1],
  logistics:      [32.8,  -117.1],
  'supply chain': [41.8,   -87.6],
  manufacturing:  [42.4,   -83.0],
  finance:        [40.7,   -74.0],
  fintech:        [40.7,   -74.0],
  semiconductors: [37.4,  -122.0],
  robotics:       [37.8,  -122.4],
  aerospace:      [34.0,  -118.4],
  agriculture:    [39.8,   -98.5],
  water:          [33.4,  -112.0],
  construction:   [29.4,   -98.5],
  general:        [39.8,   -98.5],
  enterprise:     [37.7,  -122.4],
};

// Global coords for non-US industries
const GLOBAL_COORDS: Record<string, [number, number]> = {
  europe:   [51.5,   -0.1],
  asia:     [35.7,  139.7],
  china:    [39.9,  116.4],
  germany:  [52.5,   13.4],
  japan:    [35.7,  139.7],
  israel:   [31.8,   35.2],
  uk:       [51.5,   -0.1],
  india:    [28.6,   77.2],
  taiwan:   [25.0,  121.5],
};

// Seeded pseudo-random jitter so dots don't stack but remain consistent
function seededJitter(seed: string, range: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return ((h & 0xffff) / 0xffff - 0.5) * range * 2;
}

function industryToCoords(industry: string, id: string): [number, number] {
  const key = industry.toLowerCase();
  for (const [k, v] of Object.entries(INDUSTRY_COORDS)) {
    if (key.includes(k)) {
      const jLat = seededJitter(id + 'lat', 0.8);
      const jLon = seededJitter(id + 'lon', 0.8);
      return [v[0] + jLat, v[1] + jLon];
    }
  }
  for (const [k, v] of Object.entries(GLOBAL_COORDS)) {
    if (key.includes(k)) {
      const jLat = seededJitter(id + 'lat', 1.2);
      const jLon = seededJitter(id + 'lon', 1.2);
      return [v[0] + jLat, v[1] + jLon];
    }
  }
  // default: scattered across US
  return [
    39.8 + seededJitter(id + 'lat', 4),
    -98.5 + seededJitter(id + 'lon', 10),
  ];
}

function importanceToTier(importance: number): 'P0' | 'P1' | 'P2' {
  if (importance >= 0.85) return 'P0';
  if (importance >= 0.65) return 'P1';
  return 'P2';
}

function tierToDotSize(tier: 'P0' | 'P1' | 'P2'): number {
  if (tier === 'P0') return 16;
  if (tier === 'P1') return 10;
  return 6;
}

function industryToColor(industry: string, signalType: string): string {
  const i = industry.toLowerCase();
  const s = signalType.toLowerCase();
  if (i.includes('ai') || i.includes('tech') || i.includes('cyber') || i.includes('semi') || i.includes('robot')) return COLORS.cyan;
  if (i.includes('fund') || i.includes('financ') || i.includes('invest') || s.includes('funding')) return COLORS.green;
  if (i.includes('defense') || i.includes('military') || i.includes('alert') || s.includes('risk')) return COLORS.red;
  if (i.includes('energy') || i.includes('oil') || i.includes('gas')) return COLORS.gold;
  if (i.includes('health') || i.includes('bio') || i.includes('pharma') || s.includes('research')) return '#8b5cf6';
  if (i.includes('policy') || i.includes('govern') || i.includes('regulat')) return '#ff8c00';
  return COLORS.cyan; // default cyan
}

function categoryMatchesSignal(cat: CategoryFilter, signal: IntelSignal): boolean {
  if (cat === 'ALL') return true;
  const i = signal.industry.toLowerCase();
  const s = signal.signal_type.toLowerCase();
  if (cat === 'TECH') return i.includes('ai') || i.includes('tech') || i.includes('cyber') || i.includes('robot') || i.includes('semi') || i.includes('software');
  if (cat === 'MONEY') return i.includes('fund') || i.includes('financ') || i.includes('invest') || i.includes('capital') || s.includes('funding');
  if (cat === 'POLICY') return i.includes('policy') || i.includes('govern') || i.includes('regulat') || i.includes('defense') || i.includes('military');
  if (cat === 'SCIENCE') return i.includes('bio') || i.includes('health') || i.includes('pharma') || i.includes('research') || i.includes('energy');
  return true;
}

function geoMatchesSignal(geo: GeoFilter, lat: number, lon: number): boolean {
  if (geo === 'GLOBAL') return true;
  // USA bounding box: roughly lat 24-49, lon -125 to -66
  if (geo === 'USA') return lat >= 24 && lat <= 49 && lon >= -125 && lon <= -66;
  // Texas: lat 26-36.5, lon -107 to -93
  if (geo === 'TEXAS') return lat >= 26 && lat <= 36.5 && lon >= -107 && lon <= -93;
  return true;
}

// Simple Mercator projection onto 0-100 viewport
// Using bounds: lon -180..180 -> x 0..100, lat clamp -70..80 -> y 0..100
function mercatorProject(lat: number, lon: number): [number, number] {
  const x = ((lon + 180) / 360) * 100;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const maxMerc = Math.log(Math.tan(Math.PI / 4 + (80 * Math.PI) / 360));
  const minMerc = Math.log(Math.tan(Math.PI / 4 + (-70 * Math.PI) / 360));
  const y = ((maxMerc - mercN) / (maxMerc - minMerc)) * 100;
  return [Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y))];
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return 'recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Stub signals for cold-start / fallback
const STUB_SIGNALS: IntelSignal[] = [
  { title: 'NVIDIA Blackwell GPU cluster deployment at Texas data centers', signal_type: 'tech', industry: 'AI', company: 'NVIDIA', importance: 0.92, discovered_at: new Date(Date.now() - 3600000).toISOString() },
  { title: 'DoD issues $1.2B contract for next-gen autonomous systems', signal_type: 'contract', industry: 'Defense', company: 'Lockheed Martin', importance: 0.88, discovered_at: new Date(Date.now() - 7200000).toISOString() },
  { title: 'OpenAI raises $6.6B Series F at $157B valuation', signal_type: 'funding', industry: 'AI', company: 'OpenAI', importance: 0.95, discovered_at: new Date(Date.now() - 1800000).toISOString() },
  { title: 'TSMC Arizona fab begins 3nm production ahead of schedule', signal_type: 'manufacturing', industry: 'Semiconductors', company: 'TSMC', importance: 0.87, discovered_at: new Date(Date.now() - 5400000).toISOString() },
  { title: 'CBP deploys AI surveillance along El Paso border corridor', signal_type: 'policy', industry: 'Cybersecurity', company: null, importance: 0.79, discovered_at: new Date(Date.now() - 900000).toISOString() },
  { title: 'MIT researchers publish autonomous swarm robotics framework', signal_type: 'research', industry: 'Robotics', company: null, importance: 0.71, discovered_at: new Date(Date.now() - 10800000).toISOString() },
  { title: 'Saudi Aramco acquires clean hydrogen startup for $820M', signal_type: 'funding', industry: 'Energy', company: 'Saudi Aramco', importance: 0.82, discovered_at: new Date(Date.now() - 14400000).toISOString() },
  { title: 'EU AI Act enforcement begins across member states', signal_type: 'policy', industry: 'Policy', company: null, importance: 0.76, discovered_at: new Date(Date.now() - 21600000).toISOString() },
  { title: 'Fort Bliss expands drone defense program with $340M allocation', signal_type: 'contract', industry: 'Defense', company: null, importance: 0.91, discovered_at: new Date(Date.now() - 2700000).toISOString() },
  { title: "Israel's cybersecurity startup ecosystem reaches $12B valuation", signal_type: 'funding', industry: 'Cybersecurity', company: null, importance: 0.83, discovered_at: new Date(Date.now() - 18000000).toISOString() },
];

// ─── Filter pills ──────────────────────────────────────────────────────────────

function FilterPills({
  geo,
  category,
  onGeo,
  onCategory,
  dotCount,
}: {
  geo: GeoFilter;
  category: CategoryFilter;
  onGeo: (g: GeoFilter) => void;
  onCategory: (c: CategoryFilter) => void;
  dotCount: number;
}) {
  const geoOpts: GeoFilter[] = ['TEXAS', 'USA', 'GLOBAL'];
  const catOpts: CategoryFilter[] = ['ALL', 'TECH', 'MONEY', 'POLICY', 'SCIENCE'];

  const catColors: Record<CategoryFilter, string> = {
    ALL: COLORS.cyan, TECH: COLORS.cyan, MONEY: COLORS.green, POLICY: '#ff8c00', SCIENCE: '#8b5cf6',
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-20 flex flex-col gap-2 p-3 font-mono">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Geo pills */}
        <div className="flex items-center gap-1.5">
          {geoOpts.map((g) => {
            const isActive = geo === g;
            return (
              <button
                key={g}
                onClick={() => onGeo(g)}
                className="min-h-[44px] sm:min-h-0 px-3 py-1.5 text-[8px] tracking-[0.2em] font-mono rounded-full backdrop-blur-md cursor-pointer transition-all duration-200 border"
                style={isActive ? {
                  borderColor: COLORS.cyan,
                  backgroundColor: `${COLORS.cyan}22`,
                  color: COLORS.cyan,
                } : {
                  borderColor: COLORS.border,
                  backgroundColor: `${COLORS.surface}cc`,
                  color: COLORS.muted,
                }}
              >
                {g}
              </button>
            );
          })}
        </div>

        <div className="w-px h-3.5" style={{ backgroundColor: COLORS.border }} />

        {/* Category pills */}
        <div className="flex items-center gap-1.5">
          {catOpts.map((c) => {
            const col = catColors[c];
            const isActive = category === c;
            return (
              <button
                key={c}
                onClick={() => onCategory(c)}
                className="min-h-[44px] sm:min-h-0 px-3 py-1.5 text-[8px] tracking-[0.2em] font-mono rounded-full backdrop-blur-md cursor-pointer transition-all duration-200 border"
                style={isActive ? {
                  borderColor: col,
                  backgroundColor: `${col}22`,
                  color: col,
                } : {
                  borderColor: COLORS.border,
                  backgroundColor: `${COLORS.surface}cc`,
                  color: COLORS.muted,
                }}
              >
                {c}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Signal count badge */}
        <div
          className="px-3 py-1.5 text-[8px] tracking-[0.15em] font-mono rounded-full backdrop-blur-md"
          style={{
            border: `1px solid ${COLORS.green}40`,
            backgroundColor: `${COLORS.green}14`,
            color: COLORS.green,
          }}
        >
          {dotCount} LIVE
        </div>
      </div>
    </div>
  );
}

// ─── Signal bottom sheet ───────────────────────────────────────────────────────

function SignalBottomSheet({
  dot,
  onClose,
}: {
  dot: SignalDot;
  onClose: () => void;
}) {
  const router = useRouter();
  const sig = dot.signal;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30"
        style={{ backgroundColor: `${COLORS.bg}dd` }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 z-40 bottom-12 font-mono max-h-[55vh] overflow-hidden flex flex-col"
        style={{
          backgroundColor: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderBottom: 'none',
          borderRadius: '24px 24px 0 0',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1.5">
          <div className="w-10 h-[3px] rounded-full" style={{ backgroundColor: COLORS.dim }} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2 max-h-[calc(55vh-80px)]">

          {/* Tier + color indicator */}
          <div className="flex items-center gap-2.5 mb-4">
            <div
              className="rounded-full shrink-0"
              style={{
                width: tierToDotSize(dot.tier),
                height: tierToDotSize(dot.tier),
                backgroundColor: dot.color,
                boxShadow: `0 0 ${tierToDotSize(dot.tier)}px ${dot.color}88`,
              }}
            />
            <span className="text-[9px] tracking-[0.2em] font-mono" style={{ color: dot.color }}>{dot.tier}</span>
            <div className="flex-1" />
            <span className="text-[8px] tracking-[0.1em] font-mono" style={{ color: COLORS.muted }}>
              {timeAgo(sig.discovered_at)}
            </span>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-sm cursor-pointer bg-transparent border-none pl-2"
              style={{ color: COLORS.muted }}
            >
              &#x2715;
            </button>
          </div>

          {/* Title */}
          <div className="text-sm leading-relaxed mb-4 tracking-[0.02em] font-grotesk" style={{ color: COLORS.text }}>
            {sig.title}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-2 mb-5">
            {sig.industry && (
              <span
                className="text-[8px] tracking-[0.15em] px-2.5 py-1 rounded-full font-mono"
                style={{
                  border: `1px solid ${dot.color}40`,
                  backgroundColor: `${dot.color}12`,
                  color: dot.color,
                }}
              >
                {sig.industry.toUpperCase()}
              </span>
            )}
            {sig.signal_type && (
              <span
                className="text-[8px] tracking-[0.15em] px-2.5 py-1 rounded-full font-mono"
                style={{
                  border: `1px solid ${COLORS.border}`,
                  backgroundColor: `${COLORS.card}`,
                  color: COLORS.muted,
                }}
              >
                {sig.signal_type.toUpperCase()}
              </span>
            )}
            {sig.company && (
              <span
                className="text-[8px] tracking-[0.15em] px-2.5 py-1 rounded-full font-mono"
                style={{
                  border: `1px solid ${COLORS.gold}4D`,
                  backgroundColor: `${COLORS.gold}14`,
                  color: COLORS.gold,
                }}
              >
                {sig.company}
              </span>
            )}
          </div>

          {/* Importance bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[8px] tracking-[0.2em] font-mono" style={{ color: COLORS.dim }}>IMPORTANCE</span>
              <span className="text-[9px] font-bold font-mono" style={{ color: dot.color }}>
                {Math.round(sig.importance * 100)}%
              </span>
            </div>
            <div className="w-full h-[3px] rounded-full" style={{ backgroundColor: `${COLORS.border}` }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${sig.importance * 100}%`,
                  backgroundColor: dot.color,
                  boxShadow: `0 0 6px ${dot.color}66`,
                }}
              />
            </div>
          </div>

          {/* Drill down button */}
          <button
            onClick={() => router.push('/map?tab=intel')}
            className="w-full min-h-[44px] text-[9px] tracking-[0.25em] font-bold font-mono cursor-pointer transition-all duration-200 hover:brightness-110"
            style={{
              border: `1px solid ${COLORS.orange}`,
              backgroundColor: `${COLORS.orange}1F`,
              color: COLORS.orange,
              borderRadius: '20px',
              background: `linear-gradient(135deg, ${COLORS.orange}1F, ${COLORS.orange}0A)`,
            }}
          >
            DRILL DOWN &rarr;
          </button>
        </div>
      </div>
    </>
  );
}

// ─── World map (SVG Mercator + signal dots) ───────────────────────────────────

// Simplified world outline paths (approximated continents, Mercator-projected 0-100)
// These paths trace continent outlines as rough polygons for a dark map aesthetic
const CONTINENT_PATHS = [
  // North America
  `M 14,18 L 18,16 L 22,14 L 26,15 L 28,18 L 30,22 L 32,28 L 30,32 L 28,36 L 26,38 L 24,42 L 22,45 L 20,48 L 18,44 L 16,40 L 14,35 L 12,30 L 12,24 Z`,
  // Central America / Caribbean (small)
  `M 22,45 L 24,47 L 23,50 L 21,49 Z`,
  // South America
  `M 22,45 L 26,44 L 30,46 L 33,50 L 35,54 L 34,60 L 32,66 L 30,70 L 27,72 L 24,70 L 22,66 L 21,60 L 20,54 L 20,48 Z`,
  // Europe
  `M 45,14 L 50,12 L 55,13 L 58,16 L 60,20 L 58,23 L 55,24 L 52,25 L 48,24 L 45,22 L 43,19 Z`,
  // Africa
  `M 46,24 L 52,22 L 58,23 L 62,28 L 63,35 L 62,42 L 60,50 L 57,56 L 54,58 L 50,57 L 46,55 L 44,50 L 43,44 L 43,38 L 44,30 Z`,
  // Asia (large)
  `M 58,10 L 68,9 L 78,10 L 85,12 L 88,16 L 86,20 L 82,22 L 78,24 L 72,26 L 68,30 L 65,28 L 62,25 L 60,22 L 58,18 Z`,
  // South/SE Asia
  `M 68,28 L 75,28 L 80,32 L 82,38 L 78,40 L 72,38 L 68,34 Z`,
  // Australia
  `M 74,56 L 80,54 L 86,55 L 89,60 L 88,66 L 84,68 L 78,68 L 74,65 L 72,60 Z`,
  // Japan/Korea (tiny)
  `M 80,22 L 83,21 L 84,23 L 82,24 Z`,
  // UK (tiny)
  `M 46,17 L 48,16 L 49,18 L 47,19 Z`,
  // Greenland
  `M 30,8 L 36,7 L 40,9 L 38,13 L 34,14 L 30,12 Z`,
  // Iceland
  `M 40,12 L 43,11 L 44,13 L 41,14 Z`,
];

function WorldMapSVG({
  dots,
  onDotClick,
  selectedId,
}: {
  dots: SignalDot[];
  onDotClick: (dot: SignalDot) => void;
  selectedId: string | null;
}) {
  const [pulsePhase, setPulsePhase] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      setPulsePhase(((ts - startRef.current) % 2000) / 2000);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full"
      style={{ backgroundColor: COLORS.bg }}
    >
      {/* Dot-grid texture via SVG pattern */}
      <defs>
        <pattern id="dotgrid" x="0" y="0" width="2" height="2" patternUnits="userSpaceOnUse">
          <circle cx="0.5" cy="0.5" r="0.15" fill="rgba(255,255,255,0.06)" />
        </pattern>
        <filter id="glow-cyan">
          <feGaussianBlur stdDeviation="0.4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-strong">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="100%" stopColor={`${COLORS.bg}99`} />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect x="0" y="0" width="100" height="100" fill="url(#dotgrid)" />

      {/* Ocean tint */}
      <rect x="0" y="0" width="100" height="100" fill="rgba(0,30,50,0.18)" />

      {/* Continent fills */}
      {CONTINENT_PATHS.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="rgba(255,255,255,0.035)"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="0.15"
        />
      ))}

      {/* Latitude lines */}
      {[20, 40, 60, 80].map((pct) => (
        <line
          key={pct}
          x1="0" y1={pct} x2="100" y2={pct}
          stroke={`${COLORS.cyan}0F`}
          strokeWidth="0.2"
          strokeDasharray="0.5,1.5"
        />
      ))}

      {/* Longitude lines */}
      {[20, 40, 60, 80].map((pct) => (
        <line
          key={pct}
          x1={pct} y1="0" x2={pct} y2="100"
          stroke={`${COLORS.cyan}0F`}
          strokeWidth="0.2"
          strokeDasharray="0.5,1.5"
        />
      ))}

      {/* Vignette overlay */}
      <rect x="0" y="0" width="100" height="100" fill="url(#vignette)" />

      {/* Signal dots */}
      {dots.map((dot) => {
        const size = tierToDotSize(dot.tier);
        const r = size / 2 / 10; // scale to SVG units (100-wide viewport)
        const isSelected = dot.id === selectedId;
        // Pulse ring radius expands with pulsePhase
        const pulseR = r * (1.5 + pulsePhase * 2.5);
        const pulseOpacity = (1 - pulsePhase) * 0.5;

        return (
          <g
            key={dot.id}
            className="cursor-pointer"
            onClick={() => onDotClick(dot)}
          >
            {/* Pulse ring */}
            {(dot.tier === 'P0' || dot.tier === 'P1' || isSelected) && (
              <circle
                cx={dot.x}
                cy={dot.y}
                r={pulseR}
                fill="none"
                stroke={dot.color}
                strokeWidth="0.15"
                opacity={isSelected ? pulseOpacity * 1.5 : pulseOpacity}
              />
            )}

            {/* Second pulse ring offset */}
            {dot.tier === 'P0' && (
              <circle
                cx={dot.x}
                cy={dot.y}
                r={r * (1 + ((pulsePhase + 0.5) % 1) * 2.5)}
                fill="none"
                stroke={dot.color}
                strokeWidth="0.1"
                opacity={(1 - ((pulsePhase + 0.5) % 1)) * 0.3}
              />
            )}

            {/* Selection ring */}
            {isSelected && (
              <circle
                cx={dot.x}
                cy={dot.y}
                r={r + 0.4}
                fill="none"
                stroke={dot.color}
                strokeWidth="0.2"
                opacity={0.9}
              />
            )}

            {/* Main dot */}
            <circle
              cx={dot.x}
              cy={dot.y}
              r={r}
              fill={dot.color}
              opacity={isSelected ? 1 : 0.85}
              filter={dot.tier === 'P0' ? 'url(#glow-strong)' : 'url(#glow-cyan)'}
            />

            {/* Inner bright core for P0 */}
            {dot.tier === 'P0' && (
              <circle
                cx={dot.x}
                cy={dot.y}
                r={r * 0.4}
                fill="white"
                opacity={0.7}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Map view ────────────────────────────────────────────────────────────────

function MapView() {
  const [signals, setSignals] = useState<IntelSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [geo, setGeo] = useState<GeoFilter>('USA');
  const [category, setCategory] = useState<CategoryFilter>('ALL');
  const [selectedDot, setSelectedDot] = useState<SignalDot | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Safety timeout — stop loading after 5s even if fetch hangs
    const timeout = setTimeout(() => {
      if (!cancelled) { setSignals(STUB_SIGNALS); setLoading(false); }
    }, 5000);
    Brain.map()
      .then((data) => {
        if (cancelled) return;
        clearTimeout(timeout);
        setSignals(data.signals.length > 0 ? (data.signals as IntelSignal[]) : STUB_SIGNALS);
      })
      .catch(() => {
        if (!cancelled) { clearTimeout(timeout); setSignals(STUB_SIGNALS); }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; clearTimeout(timeout); };
  }, []);

  const allDots = useMemo<SignalDot[]>(() => {
    const src = signals.length > 0 ? signals : STUB_SIGNALS;
    return src.map((sig, idx) => {
      const id = `${sig.industry}-${idx}`;
      const [lat, lon] = industryToCoords(sig.industry, id);
      const [x, y] = mercatorProject(lat, lon);
      const tier = importanceToTier(sig.importance);
      const color = industryToColor(sig.industry, sig.signal_type);
      return { id, signal: sig, lat, lon, tier, color, x, y };
    });
  }, [signals]);

  const filteredDots = useMemo<SignalDot[]>(() => {
    return allDots.filter((dot) => {
      if (!categoryMatchesSignal(category, dot.signal)) return false;
      if (!geoMatchesSignal(geo, dot.lat, dot.lon)) return false;
      return true;
    });
  }, [allDots, geo, category]);

  const handleDotClick = useCallback((dot: SignalDot) => {
    setSelectedDot((prev) => (prev?.id === dot.id ? null : dot));
  }, []);

  const handleCloseSheet = useCallback(() => setSelectedDot(null), []);

  return (
    <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: COLORS.bg }}>
      {/* Map — overflow-x-auto with min-width for scroll on mobile */}
      <div className="overflow-x-auto w-full h-full min-w-[480px]">
        <WorldMapSVG
          dots={filteredDots}
          onDotClick={handleDotClick}
          selectedId={selectedDot?.id ?? null}
        />
      </div>

      {/* Filter pills (top overlay) */}
      <FilterPills
        geo={geo}
        category={category}
        onGeo={setGeo}
        onCategory={setCategory}
        dotCount={filteredDots.length}
      />

      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div
            className="flex flex-col items-center gap-3 px-6 py-5 rounded-[20px] backdrop-blur-md"
            style={{
              backgroundColor: `${COLORS.surface}dd`,
              border: `1px solid ${COLORS.cyan}30`,
            }}
          >
            <div
              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: `${COLORS.cyan}60`, borderTopColor: 'transparent' }}
            />
            <span
              className="font-mono text-[9px] tracking-[0.2em]"
              style={{ color: COLORS.cyan }}
            >
              LOADING WORLD DATA...
            </span>
          </div>
        </div>
      )}

      {/* Legend — relative on mobile, absolute on desktop */}
      <div
        className="static sm:absolute sm:bottom-4 sm:left-4 z-20 flex flex-col gap-1.5 font-mono backdrop-blur-md mx-3 mt-2 sm:mx-0 sm:mt-0 p-3 px-3.5"
        style={{
          backgroundColor: `${COLORS.surface}cc`,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '24px',
        }}
      >
        {[
          { color: COLORS.cyan, label: 'TECH / AI' },
          { color: COLORS.green, label: 'FUNDING' },
          { color: COLORS.red, label: 'DEFENSE / ALERT' },
          { color: COLORS.gold, label: 'ENERGY' },
          { color: '#8b5cf6', label: 'SCIENCE' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}88` }}
            />
            <span className="text-[7px] tracking-[0.15em]" style={{ color: COLORS.muted }}>{label}</span>
          </div>
        ))}
        <div className="h-px my-0.5" style={{ backgroundColor: COLORS.border }} />
        {[
          { size: 8, label: 'P0 CRITICAL' },
          { size: 5, label: 'P1 HIGH' },
          { size: 3, label: 'P2 NORMAL' },
        ].map(({ size, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className="rounded-full shrink-0"
              style={{ width: `${size}px`, height: `${size}px`, backgroundColor: COLORS.dim }}
            />
            <span className="text-[7px] tracking-[0.15em]" style={{ color: COLORS.dim }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Signal bottom sheet */}
      {selectedDot && (
        <SignalBottomSheet dot={selectedDot} onClose={handleCloseSheet} />
      )}
    </div>
  );
}

// ─── Scoreboard primitives ────────────────────────────────────────────────────

function scoreBarColor(score: number): string {
  if (score >= 90) return COLORS.green;
  if (score >= 75) return COLORS.cyan;
  if (score >= 60) return COLORS.amber;
  return '#f97316';
}

function rankBadgeStyle(rank: number): { bg: string; text: string; border: string } {
  if (rank === 1) return { bg: `${COLORS.amber}1F`, text: COLORS.amber, border: `${COLORS.amber}59` };
  if (rank === 2) return { bg: `${COLORS.cyan}1A`, text: COLORS.cyan, border: `${COLORS.cyan}47` };
  if (rank === 3) return { bg: `${COLORS.green}1A`, text: COLORS.green, border: `${COLORS.green}47` };
  return { bg: 'transparent', text: COLORS.dim, border: COLORS.border };
}

function ScoreBar({ score, color, height = 'h-1' }: { score: number; color: string; height?: string }) {
  return (
    <div className={`w-full ${height} rounded-full overflow-hidden`} style={{ backgroundColor: `${COLORS.border}` }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${score}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}55` }}
      />
    </div>
  );
}

// ─── Scoreboard components ────────────────────────────────────────────────────

function TechFilterPanel({ active, onToggle }: { active: TechKey; onToggle: (k: TechKey) => void }) {
  return (
    <div
      className="w-56 shrink-0 flex flex-col overflow-hidden"
      style={{
        borderRight: `1px solid ${COLORS.border}`,
        backgroundColor: COLORS.bg,
      }}
    >
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <div className="font-mono text-[8px] tracking-[0.3em] mb-0.5" style={{ color: COLORS.dim }}>TECH DIMENSION</div>
        <div className="font-grotesk text-[10px] tracking-[0.15em]" style={{ color: COLORS.muted }}>Select Focus Sector</div>
      </div>
      <div className="p-3 flex flex-col gap-2">
        {TECH_DIMS.map((dim) => {
          const isActive = active === dim.key;
          return (
            <button
              key={dim.key}
              onClick={() => onToggle(dim.key)}
              className="flex items-center gap-3 px-3 py-2.5 transition-all duration-200 text-left min-h-[44px]"
              style={{
                borderRadius: '16px',
                border: `1px solid ${isActive ? `${dim.color}50` : COLORS.border}`,
                backgroundColor: isActive ? `${dim.color}18` : 'transparent',
                boxShadow: isActive ? `0 0 12px ${dim.color}22` : 'none',
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: isActive ? dim.color : 'transparent',
                  border: `1.5px solid ${dim.color}`,
                  boxShadow: isActive ? `0 0 8px ${dim.color}88` : 'none',
                }}
              />
              <span
                className="font-mono text-[9px] tracking-[0.12em] flex-1"
                style={{ color: isActive ? dim.color : COLORS.muted }}
              >
                {dim.label}
              </span>
              {isActive && (
                <span
                  className="font-mono text-[7px] tracking-[0.1em] px-2 py-0.5 rounded-full"
                  style={{ color: dim.color, backgroundColor: `${dim.color}20`, border: `1px solid ${dim.color}30` }}
                >
                  ACTIVE
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-auto px-4 pb-4 pt-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <div className="font-mono text-[7px] tracking-[0.2em] mb-2" style={{ color: COLORS.dim }}>SCORE SCALE</div>
        {[
          { label: '90+  ELITE',       color: COLORS.green },
          { label: '75+  STRONG',      color: COLORS.cyan },
          { label: '60+  SOLID',       color: COLORS.amber },
          { label: '<60  DEVELOPING',  color: '#f97316' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="font-mono text-[8px]" style={{ color: COLORS.dim }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CountryCard({
  country, tech, rank, isSelected, onClick,
}: {
  country: Country; tech: TechKey; rank: number; isSelected: boolean; onClick: () => void;
}) {
  const score = country.scores[tech];
  const color = scoreBarColor(score);
  const techColor = TECH_COLOR[tech];
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-2 p-3 transition-all duration-200 text-left min-h-[44px] hover:shadow-lg"
      style={{
        borderRadius: '20px',
        border: `1px solid ${isSelected ? `${techColor}45` : COLORS.border}`,
        backgroundColor: isSelected ? `${techColor}15` : COLORS.card,
        boxShadow: isSelected ? `0 0 10px ${techColor}20` : 'none',
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-base leading-none shrink-0">{country.flag}</span>
        <span className="font-grotesk text-[9px] sm:text-[10px] tracking-[0.1em] flex-1 min-w-0 truncate"
          style={{ color: isSelected ? techColor : COLORS.text }}>
          {country.name}
        </span>
        <span
          className="font-mono text-[8px] tabular-nums px-1.5 py-0.5 rounded-full border shrink-0"
          style={
            rank <= 3
              ? { color: rankBadgeStyle(rank).text, borderColor: rankBadgeStyle(rank).border, backgroundColor: rankBadgeStyle(rank).bg }
              : { color: COLORS.dim, borderColor: COLORS.border, backgroundColor: 'transparent' }
          }
        >
          #{rank}
        </span>
      </div>
      <ScoreBar score={score} color={color} />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[8px] tracking-widest" style={{ color: COLORS.dim }}>{country.code}</span>
        <span className="font-mono text-[10px] sm:text-xs tabular-nums font-bold" style={{ color }}>{score}</span>
      </div>
    </button>
  );
}

function WorldScoreboard({
  tech, selectedCountry, onSelect,
}: {
  tech: TechKey; selectedCountry: Country | null; onSelect: (c: Country) => void;
}) {
  const techDim = TECH_DIMS.find((d) => d.key === tech)!;
  const ranked = useMemo(() => {
    const sorted = [...COUNTRIES].sort((a, b) => b.scores[tech] - a.scores[tech]);
    const rankMap = new Map<string, number>();
    sorted.forEach((c, i) => rankMap.set(c.code, i + 1));
    return rankMap;
  }, [tech]);

  const byRegion = useMemo(() => {
    const map: Partial<Record<Region, Country[]>> = {};
    for (const region of REGIONS) {
      const list = COUNTRIES.filter((c) => c.region === region).sort(
        (a, b) => b.scores[tech] - a.scores[tech]
      );
      if (list.length > 0) map[region] = list;
    }
    return map;
  }, [tech]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div
        className="shrink-0 px-5 py-3 flex items-center gap-3"
        style={{ backgroundColor: `${techDim.color}08`, borderBottom: `1px solid ${COLORS.border}` }}
      >
        <span className="w-2 h-2 rounded-full shrink-0 live-pulse" style={{ backgroundColor: techDim.color, boxShadow: `0 0 8px ${techDim.color}` }} />
        <span className="font-grotesk text-[10px] tracking-[0.2em]" style={{ color: techDim.color }}>GLOBAL TECH INTELLIGENCE</span>
        <span className="font-mono text-[10px] tracking-[0.1em]" style={{ color: COLORS.dim }}>&mdash;</span>
        <span className="font-grotesk text-[10px] tracking-[0.15em] font-bold" style={{ color: techDim.color, textShadow: `0 0 10px ${techDim.color}66` }}>{techDim.label}</span>
        <div className="flex-1" />
        <span className="font-mono text-[8px] tracking-widest" style={{ color: COLORS.dim }}>{COUNTRIES.length} COUNTRIES</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 flex flex-col gap-6">
        {REGIONS.map((region) => {
          const list = byRegion[region];
          if (!list) return null;
          return (
            <div key={region}>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-grotesk text-[8px] tracking-[0.3em]" style={{ color: COLORS.dim }}>{region}</span>
                <div className="flex-1 h-px" style={{ backgroundColor: COLORS.border }} />
                <span className="font-mono text-[8px]" style={{ color: COLORS.dim }}>{list.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {list.map((country) => (
                  <CountryCard
                    key={country.code}
                    country={country}
                    tech={tech}
                    rank={ranked.get(country.code) ?? 99}
                    isSelected={selectedCountry?.code === country.code}
                    onClick={() => onSelect(country)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CountryDetailPanel({ country, tech }: { country: Country | null; tech: TechKey }) {
  if (!country) {
    return (
      <div
        className="w-72 shrink-0 flex flex-col items-center justify-center p-6"
        style={{
          borderLeft: `1px solid ${COLORS.border}`,
          backgroundColor: COLORS.bg,
        }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
          style={{ border: `1px solid ${COLORS.border}`, backgroundColor: `${COLORS.cyan}0D` }}
        >
          <span className="font-mono text-[10px]" style={{ color: COLORS.dim }}>&#x25CE;</span>
        </div>
        <div className="font-grotesk text-[8px] tracking-[0.25em] text-center leading-6" style={{ color: COLORS.dim }}>
          SELECT A COUNTRY<br />TO VIEW INTEL
        </div>
        <div className="mt-3 font-mono text-[8px] text-center" style={{ color: COLORS.dim }}>{COUNTRIES.length} COUNTRIES &middot; 8 TECH DIMENSIONS</div>
      </div>
    );
  }

  const techDim = TECH_DIMS.find((d) => d.key === tech)!;
  return (
    <div
      className="w-72 shrink-0 flex flex-col overflow-hidden"
      style={{
        borderLeft: `1px solid ${COLORS.border}`,
        backgroundColor: COLORS.bg,
      }}
    >
      <div className="px-4 py-4" style={{ borderBottom: `1px solid ${COLORS.border}`, backgroundColor: `${techDim.color}08` }}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl leading-none">{country.flag}</span>
          <div className="flex-1 min-w-0">
            <div className="font-grotesk text-[11px] tracking-[0.15em] truncate" style={{ color: COLORS.text }}>{country.name.toUpperCase()}</div>
            <div className="font-mono text-[8px] tracking-[0.2em] mt-0.5" style={{ color: COLORS.dim }}>{country.code} &middot; {country.region}</div>
          </div>
        </div>
        <div
          className="flex items-center gap-3 px-3 py-2.5"
          style={{ borderRadius: '16px', border: `1px solid ${techDim.color}30`, backgroundColor: `${techDim.color}10` }}
        >
          <span className="font-mono text-[8px] tracking-[0.15em]" style={{ color: techDim.color }}>{techDim.label}</span>
          <div className="flex-1"><ScoreBar score={country.scores[tech]} color={techDim.color} /></div>
          <span className="font-mono text-sm font-bold tabular-nums" style={{ color: techDim.color, textShadow: `0 0 10px ${techDim.color}66` }}>{country.scores[tech]}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 flex flex-col gap-3">
        <div className="font-mono text-[8px] tracking-[0.3em] mb-1" style={{ color: COLORS.dim }}>8 TECH DIMENSIONS</div>
        {TECH_DIMS.map((dim) => {
          const s = country.scores[dim.key];
          const barColor = scoreBarColor(s);
          const isActive = dim.key === tech;
          return (
            <div
              key={dim.key}
              className="px-2.5 py-2 transition-all"
              style={{
                borderRadius: '14px',
                backgroundColor: isActive ? `${dim.color}10` : 'transparent',
                border: isActive ? `1px solid ${dim.color}25` : '1px solid transparent',
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[8px] tracking-[0.1em]" style={{ color: isActive ? dim.color : COLORS.muted }}>{dim.label}</span>
                <span className="font-mono text-[9px] tabular-nums" style={{ color: barColor }}>{s}</span>
              </div>
              <ScoreBar score={s} color={barColor} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScoreboardView() {
  const [activeTech, setActiveTech] = useState<TechKey>('ai');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  return (
    <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
      {/* Tech filter: horizontal scroll on mobile, sidebar on desktop */}
      <div className="sm:hidden shrink-0 overflow-x-auto" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <div className="flex gap-1.5 p-2 min-w-max">
          {TECH_DIMS.map((dim) => {
            const isActive = activeTech === dim.key;
            return (
              <button
                key={dim.key}
                onClick={() => { setActiveTech(dim.key); setSelectedCountry(null); }}
                className="px-3 py-2 text-[8px] tracking-[0.15em] font-mono rounded-full whitespace-nowrap transition-all duration-200"
                style={{
                  border: `1px solid ${isActive ? `${dim.color}50` : COLORS.border}`,
                  backgroundColor: isActive ? `${dim.color}18` : 'transparent',
                  color: isActive ? dim.color : COLORS.muted,
                }}
              >
                {dim.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="hidden sm:flex">
        <TechFilterPanel active={activeTech} onToggle={(k) => { setActiveTech(k); setSelectedCountry(null); }} />
      </div>
      <WorldScoreboard tech={activeTech} selectedCountry={selectedCountry} onSelect={(c) => setSelectedCountry((prev) => prev?.code === c.code ? null : c)} />
      {/* Country detail: hidden on mobile, visible on lg+ */}
      <div className="hidden lg:flex">
        <CountryDetailPanel country={selectedCountry} tech={activeTech} />
      </div>
    </div>
  );
}

// ─── View mode toggle bar ─────────────────────────────────────────────────────

function ViewModeBar({ viewMode, onToggleView }: { viewMode: ViewMode; onToggleView: (v: ViewMode) => void }) {
  const views: { id: ViewMode; label: string }[] = [
    { id: 'MAP',        label: 'SIGNALS' },
    { id: 'SCOREBOARD', label: 'RANKINGS' },
    { id: 'OPS',        label: 'LIVE OPS' },
  ];

  return (
    <div
      className="shrink-0 flex items-center justify-end px-4 py-2 font-mono"
      style={{ borderBottom: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bg }}
    >
      <div
        className="flex items-center overflow-hidden p-1 gap-1"
        style={{
          borderRadius: '9999px',
          backgroundColor: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        {views.map((v) => {
          const isActive = viewMode === v.id;
          const activeColor = v.id === 'OPS' ? COLORS.orange : COLORS.cyan;
          return (
            <button
              key={v.id}
              onClick={() => onToggleView(v.id)}
              className="min-h-[36px] px-4 py-1.5 text-[8px] tracking-[0.2em] font-mono cursor-pointer transition-all duration-200 border-none"
              style={{
                borderRadius: '9999px',
                backgroundColor: isActive ? `${activeColor}26` : 'transparent',
                color: isActive ? activeColor : COLORS.muted,
              }}
            >
              {v.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main app ─────────────────────────────────────────────────────────────────

function WorldApp() {
  const [viewMode, setViewMode] = useState<ViewMode>('MAP');

  return (
    <div className="flex flex-col overflow-hidden h-dvh font-mono animate-fade-up" style={{ background: COLORS.bg }}>
      <TopBar />
      <ViewModeBar viewMode={viewMode} onToggleView={setViewMode} />

      {/* Content area — pb-16 for bottom nav */}
      <div
        className={`flex flex-1 min-h-0 flex-col ${viewMode === 'OPS' ? '' : 'pb-16'}`}
        style={{
          overflowY: viewMode === 'SCOREBOARD' ? 'auto' : 'hidden',
        }}
      >
        {viewMode === 'MAP' && <MapView />}
        {viewMode === 'SCOREBOARD' && <ScoreboardView />}
        {viewMode === 'OPS' && (
          <iframe
            src="/map"
            title="Live Operations Platform"
            className="w-full h-full border-none block"
            allow="fullscreen"
          />
        )}
      </div>

      <BottomNav />
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function WorldPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center font-mono" style={{ background: COLORS.bg }}>
          <span className="text-[10px] tracking-[0.3em]" style={{ color: COLORS.dim }}>
            LOADING WORLD INTEL...
          </span>
        </div>
      }
    >
      <WorldApp />
    </Suspense>
  );
}
