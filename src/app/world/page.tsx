'use client';

import { Suspense, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

type ViewMode = 'MAP' | 'SCOREBOARD';

type GeoFilter = 'TEXAS' | 'USA' | 'GLOBAL';
type CategoryFilter = 'TECH' | 'MONEY' | 'POLICY' | 'SCIENCE' | 'ALL';

// ─── Static country data ──────────────────────────────────────────────────────

const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', region: 'AMERICAS', scores: { ai: 98, defense: 99, biotech: 95, energy: 88, manufacturing: 82, cybersecurity: 97, robotics: 91, semiconductors: 89 } },
  { code: 'CN', name: 'China', flag: '🇨🇳', region: 'ASIA-PACIFIC', scores: { ai: 92, defense: 88, biotech: 78, energy: 85, manufacturing: 99, cybersecurity: 82, robotics: 88, semiconductors: 85 } },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', region: 'EUROPE', scores: { ai: 75, defense: 70, biotech: 80, energy: 82, manufacturing: 95, cybersecurity: 78, robotics: 88, semiconductors: 72 } },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', region: 'ASIA-PACIFIC', scores: { ai: 78, defense: 65, biotech: 82, energy: 75, manufacturing: 92, cybersecurity: 72, robotics: 96, semiconductors: 90 } },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', region: 'ASIA-PACIFIC', scores: { ai: 80, defense: 72, biotech: 75, energy: 70, manufacturing: 90, cybersecurity: 75, robotics: 82, semiconductors: 95 } },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'EUROPE', scores: { ai: 85, defense: 82, biotech: 88, energy: 75, manufacturing: 72, cybersecurity: 88, robotics: 75, semiconductors: 68 } },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', region: 'OTHER', scores: { ai: 88, defense: 92, biotech: 85, energy: 65, manufacturing: 68, cybersecurity: 95, robotics: 78, semiconductors: 72 } },
  { code: 'FR', name: 'France', flag: '🇫🇷', region: 'EUROPE', scores: { ai: 78, defense: 80, biotech: 82, energy: 85, manufacturing: 78, cybersecurity: 75, robotics: 72, semiconductors: 65 } },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', region: 'EUROPE', scores: { ai: 80, defense: 68, biotech: 78, energy: 88, manufacturing: 75, cybersecurity: 82, robotics: 78, semiconductors: 62 } },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', region: 'EUROPE', scores: { ai: 75, defense: 65, biotech: 78, energy: 72, manufacturing: 72, cybersecurity: 78, robotics: 70, semiconductors: 85 } },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', region: 'EUROPE', scores: { ai: 82, defense: 60, biotech: 90, energy: 72, manufacturing: 85, cybersecurity: 80, robotics: 75, semiconductors: 70 } },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', region: 'ASIA-PACIFIC', scores: { ai: 80, defense: 70, biotech: 72, energy: 65, manufacturing: 88, cybersecurity: 75, robotics: 78, semiconductors: 98 } },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', region: 'ASIA-PACIFIC', scores: { ai: 82, defense: 65, biotech: 75, energy: 68, manufacturing: 78, cybersecurity: 85, robotics: 72, semiconductors: 80 } },
  { code: 'IN', name: 'India', flag: '🇮🇳', region: 'ASIA-PACIFIC', scores: { ai: 75, defense: 72, biotech: 68, energy: 70, manufacturing: 72, cybersecurity: 70, robotics: 62, semiconductors: 55 } },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', region: 'ASIA-PACIFIC', scores: { ai: 72, defense: 70, biotech: 72, energy: 78, manufacturing: 62, cybersecurity: 75, robotics: 65, semiconductors: 55 } },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', region: 'AMERICAS', scores: { ai: 82, defense: 72, biotech: 80, energy: 82, manufacturing: 68, cybersecurity: 78, robotics: 70, semiconductors: 62 } },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', region: 'EUROPE', scores: { ai: 72, defense: 85, biotech: 65, energy: 78, manufacturing: 75, cybersecurity: 78, robotics: 65, semiconductors: 55 } },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', region: 'AMERICAS', scores: { ai: 58, defense: 60, biotech: 65, energy: 72, manufacturing: 65, cybersecurity: 55, robotics: 50, semiconductors: 40 } },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', region: 'AMERICAS', scores: { ai: 52, defense: 55, biotech: 55, energy: 65, manufacturing: 70, cybersecurity: 50, robotics: 48, semiconductors: 38 } },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', region: 'OTHER', scores: { ai: 72, defense: 75, biotech: 60, energy: 78, manufacturing: 62, cybersecurity: 70, robotics: 65, semiconductors: 50 } },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', region: 'OTHER', scores: { ai: 62, defense: 70, biotech: 55, energy: 82, manufacturing: 58, cybersecurity: 62, robotics: 55, semiconductors: 42 } },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', region: 'EUROPE', scores: { ai: 78, defense: 65, biotech: 72, energy: 80, manufacturing: 72, cybersecurity: 85, robotics: 72, semiconductors: 60 } },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', region: 'EUROPE', scores: { ai: 75, defense: 62, biotech: 80, energy: 88, manufacturing: 68, cybersecurity: 80, robotics: 70, semiconductors: 58 } },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', region: 'EUROPE', scores: { ai: 72, defense: 65, biotech: 75, energy: 92, manufacturing: 65, cybersecurity: 78, robotics: 68, semiconductors: 55 } },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', region: 'EUROPE', scores: { ai: 72, defense: 65, biotech: 58, energy: 65, manufacturing: 58, cybersecurity: 90, robotics: 60, semiconductors: 48 } },
];

// ─── Scoreboard config ────────────────────────────────────────────────────────

const TECH_DIMS: { key: TechKey; label: string; color: string }[] = [
  { key: 'ai',             label: 'AI',            color: '#00d4ff' },
  { key: 'defense',        label: 'DEFENSE',       color: '#ff3b30' },
  { key: 'biotech',        label: 'BIOTECH',       color: '#00ff88' },
  { key: 'energy',         label: 'ENERGY',        color: '#ffb800' },
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
  if (i.includes('ai') || i.includes('tech') || i.includes('cyber') || i.includes('semi') || i.includes('robot')) return '#00d4ff';
  if (i.includes('fund') || i.includes('financ') || i.includes('invest') || s.includes('funding')) return '#00ff88';
  if (i.includes('defense') || i.includes('military') || i.includes('alert') || s.includes('risk')) return '#ff3b30';
  if (i.includes('energy') || i.includes('oil') || i.includes('gas')) return '#ffd700';
  if (i.includes('health') || i.includes('bio') || i.includes('pharma') || s.includes('research')) return '#8b5cf6';
  if (i.includes('policy') || i.includes('govern') || i.includes('regulat')) return '#ff8c00';
  return '#00d4ff'; // default cyan
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
  // USA bounding box: roughly lat 24–49, lon -125 to -66
  if (geo === 'USA') return lat >= 24 && lat <= 49 && lon >= -125 && lon <= -66;
  // Texas: lat 26–36.5, lon -107 to -93
  if (geo === 'TEXAS') return lat >= 26 && lat <= 36.5 && lon >= -107 && lon <= -93;
  return true;
}

// Simple Mercator projection onto 0–100 viewport
// Using bounds: lon -180..180 → x 0..100, lat clamp -70..80 → y 0..100
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

// ─── Bottom NavBar ────────────────────────────────────────────────────────────

const NAV_TABS = [
  { id: 'today',    label: 'TODAY',   href: '/',          icon: '◎' },
  { id: 'explore',  label: 'EXPLORE', href: '/explore',   icon: '⬡' },
  { id: 'world',    label: 'WORLD',   href: '/world',     icon: '◉' },
  { id: 'follow',   label: 'FOLLOW',  href: '/following', icon: '◈' },
  { id: 'store',    label: 'STORE',   href: '/store',     icon: '◫' },
  { id: 'dossier',  label: 'DOSSIER', href: '/dossier',   icon: '◆' },
];

function BottomNavBar({ active }: { active: string }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
      style={{
        height: '48px',
        backgroundColor: '#000000',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      }}
    >
      {NAV_TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
            style={{ textDecoration: 'none' }}
          >
            {isActive && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2"
                style={{ width: '24px', height: '2px', backgroundColor: '#ff6600', borderRadius: '0 0 2px 2px' }}
              />
            )}
            <span
              style={{
                fontSize: '14px',
                color: isActive ? '#ff6600' : 'rgba(255,255,255,0.25)',
                textShadow: isActive ? '0 0 8px #ff660066' : 'none',
                lineHeight: 1,
              }}
            >
              {tab.icon}
            </span>
            <span
              style={{
                fontSize: '7px',
                letterSpacing: '0.15em',
                color: isActive ? '#ff6600' : 'rgba(255,255,255,0.22)',
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

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

  return (
    <div
      className="absolute top-0 left-0 right-0 z-20 flex flex-col gap-2 p-3"
      style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
    >
      <div className="flex items-center gap-2">
        {/* Geo pills */}
        <div className="flex items-center gap-1">
          {geoOpts.map((g) => (
            <button
              key={g}
              onClick={() => onGeo(g)}
              style={{
                padding: '3px 10px',
                fontSize: '8px',
                letterSpacing: '0.2em',
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                border: `1px solid ${geo === g ? '#00d4ff' : 'rgba(255,255,255,0.12)'}`,
                backgroundColor: geo === g ? 'rgba(0,212,255,0.15)' : 'rgba(0,0,0,0.70)',
                color: geo === g ? '#00d4ff' : 'rgba(255,255,255,0.40)',
                borderRadius: '2px',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.15s',
              }}
            >
              {g}
            </button>
          ))}
        </div>

        <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255,255,255,0.08)' }} />

        {/* Category pills */}
        <div className="flex items-center gap-1">
          {catOpts.map((c) => {
            const catColors: Record<CategoryFilter, string> = {
              ALL: '#00d4ff', TECH: '#00d4ff', MONEY: '#00ff88', POLICY: '#ff8c00', SCIENCE: '#8b5cf6',
            };
            const col = catColors[c];
            const isActive = category === c;
            return (
              <button
                key={c}
                onClick={() => onCategory(c)}
                style={{
                  padding: '3px 10px',
                  fontSize: '8px',
                  letterSpacing: '0.2em',
                  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                  border: `1px solid ${isActive ? col : 'rgba(255,255,255,0.12)'}`,
                  backgroundColor: isActive ? `${col}22` : 'rgba(0,0,0,0.70)',
                  color: isActive ? col : 'rgba(255,255,255,0.40)',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.15s',
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
          style={{
            padding: '3px 10px',
            fontSize: '8px',
            letterSpacing: '0.15em',
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
            border: '1px solid rgba(0,255,136,0.25)',
            backgroundColor: 'rgba(0,255,136,0.08)',
            color: '#00ff88',
            borderRadius: '2px',
            backdropFilter: 'blur(8px)',
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
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 z-40"
        style={{
          bottom: '48px', // above nav bar
          backgroundColor: '#000000',
          border: '1px solid rgba(255,255,255,0.10)',
          borderBottom: 'none',
          borderRadius: '8px 8px 0 0',
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          maxHeight: '55vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div style={{ width: '32px', height: '3px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '2px' }} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-2" style={{ maxHeight: 'calc(55vh - 80px)' }}>

          {/* Tier + color indicator */}
          <div className="flex items-center gap-2 mb-3">
            <div
              style={{
                width: tierToDotSize(dot.tier),
                height: tierToDotSize(dot.tier),
                borderRadius: '50%',
                backgroundColor: dot.color,
                boxShadow: `0 0 ${tierToDotSize(dot.tier)}px ${dot.color}88`,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '9px', letterSpacing: '0.2em', color: dot.color }}>{dot.tier}</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: '8px', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.30)' }}>
              {timeAgo(sig.discovered_at)}
            </span>
            <button
              onClick={onClose}
              style={{ fontSize: '14px', color: 'rgba(255,255,255,0.30)', cursor: 'pointer', background: 'none', border: 'none', padding: '0 0 0 8px' }}
            >
              ✕
            </button>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: '12px',
              lineHeight: '1.55',
              color: 'rgba(255,255,255,0.90)',
              marginBottom: '14px',
              letterSpacing: '0.02em',
            }}
          >
            {sig.title}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-2 mb-4">
            {sig.industry && (
              <span style={{
                fontSize: '8px', letterSpacing: '0.15em', padding: '2px 8px',
                border: `1px solid ${dot.color}40`, backgroundColor: `${dot.color}12`,
                color: dot.color, borderRadius: '2px',
              }}>
                {sig.industry.toUpperCase()}
              </span>
            )}
            {sig.signal_type && (
              <span style={{
                fontSize: '8px', letterSpacing: '0.15em', padding: '2px 8px',
                border: '1px solid rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.45)', borderRadius: '2px',
              }}>
                {sig.signal_type.toUpperCase()}
              </span>
            )}
            {sig.company && (
              <span style={{
                fontSize: '8px', letterSpacing: '0.15em', padding: '2px 8px',
                border: '1px solid rgba(255,215,0,0.30)', backgroundColor: 'rgba(255,215,0,0.08)',
                color: '#ffd700', borderRadius: '2px',
              }}>
                {sig.company}
              </span>
            )}
          </div>

          {/* Importance bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span style={{ fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)' }}>IMPORTANCE</span>
              <span style={{ fontSize: '9px', color: dot.color, fontWeight: 700 }}>
                {Math.round(sig.importance * 100)}%
              </span>
            </div>
            <div style={{ width: '100%', height: '3px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
              <div style={{
                height: '100%',
                width: `${sig.importance * 100}%`,
                backgroundColor: dot.color,
                borderRadius: '2px',
                boxShadow: `0 0 6px ${dot.color}66`,
              }} />
            </div>
          </div>

          {/* Drill down button */}
          <button
            onClick={() => router.push('/map?tab=intel')}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '9px',
              letterSpacing: '0.25em',
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              border: '1px solid #ff6600',
              backgroundColor: 'rgba(255,102,0,0.12)',
              color: '#ff6600',
              borderRadius: '3px',
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontWeight: 700,
            }}
          >
            DRILL DOWN →
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
      style={{ backgroundColor: '#000000' }}
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
          <stop offset="100%" stopColor="rgba(0,0,0,0.6)" />
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
          stroke="rgba(0,212,255,0.06)"
          strokeWidth="0.2"
          strokeDasharray="0.5,1.5"
        />
      ))}

      {/* Longitude lines */}
      {[20, 40, 60, 80].map((pct) => (
        <line
          key={pct}
          x1={pct} y1="0" x2={pct} y2="100"
          stroke="rgba(0,212,255,0.06)"
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
            style={{ cursor: 'pointer' }}
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
    fetch('/api/intel-signals')
      .then(async (res) => {
        if (!res.ok) throw new Error('fetch failed');
        const json = (await res.json()) as { ok: boolean; signals?: IntelSignal[] };
        if (!cancelled && json.ok && Array.isArray(json.signals) && json.signals.length > 0) {
          setSignals(json.signals);
        } else if (!cancelled) {
          setSignals(STUB_SIGNALS);
        }
      })
      .catch(() => {
        if (!cancelled) setSignals(STUB_SIGNALS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
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
    <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: '#000000' }}>
      {/* Map */}
      <WorldMapSVG
        dots={filteredDots}
        onDotClick={handleDotClick}
        selectedId={selectedDot?.id ?? null}
      />

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
        <div
          className="absolute top-10 right-3 z-20"
          style={{
            fontSize: '8px',
            letterSpacing: '0.2em',
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
            color: '#00d4ff',
            backgroundColor: 'rgba(0,0,0,0.70)',
            padding: '3px 8px',
            border: '1px solid rgba(0,212,255,0.25)',
            borderRadius: '2px',
          }}
        >
          LOADING SIGNALS...
        </div>
      )}

      {/* Legend (bottom-left, above nav) */}
      <div
        className="absolute bottom-2 left-3 z-20 flex flex-col gap-1"
        style={{
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          backgroundColor: 'rgba(0,0,0,0.72)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '3px',
          padding: '6px 10px',
          backdropFilter: 'blur(8px)',
        }}
      >
        {[
          { color: '#00d4ff', label: 'TECH / AI' },
          { color: '#00ff88', label: 'FUNDING' },
          { color: '#ff3b30', label: 'DEFENSE / ALERT' },
          { color: '#ffd700', label: 'ENERGY' },
          { color: '#8b5cf6', label: 'SCIENCE' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 4px ${color}88`, flexShrink: 0 }} />
            <span style={{ fontSize: '7px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>{label}</span>
          </div>
        ))}
        <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.07)', margin: '2px 0' }} />
        {[
          { size: 8, label: 'P0 CRITICAL' },
          { size: 5, label: 'P1 HIGH' },
          { size: 3, label: 'P2 NORMAL' },
        ].map(({ size, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
            <span style={{ fontSize: '7px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.25)' }}>{label}</span>
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
  if (score >= 90) return '#00ff88';
  if (score >= 75) return '#00d4ff';
  if (score >= 60) return '#ffb800';
  return '#f97316';
}

function rankBadgeStyle(rank: number): { bg: string; text: string; border: string } {
  if (rank === 1) return { bg: 'rgba(255,184,0,0.12)',  text: '#ffb800', border: 'rgba(255,184,0,0.35)' };
  if (rank === 2) return { bg: 'rgba(0,212,255,0.10)', text: '#00d4ff', border: 'rgba(0,212,255,0.28)' };
  if (rank === 3) return { bg: 'rgba(0,255,136,0.10)', text: '#00ff88', border: 'rgba(0,255,136,0.28)' };
  return { bg: 'transparent', text: 'rgba(255,255,255,0.35)', border: 'rgba(255,255,255,0.10)' };
}

function ScoreBar({ score, color, height = 'h-1' }: { score: number; color: string; height?: string }) {
  return (
    <div className={`w-full ${height} bg-white/[0.06] rounded-full overflow-hidden`}>
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
    <div className="w-56 shrink-0 flex flex-col border-r border-white/[0.06] bg-black overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="font-mono text-[8px] tracking-[0.3em] text-white/30 mb-0.5">TECH DIMENSION</div>
        <div className="font-mono text-[10px] tracking-[0.15em] text-white/60">SELECT FOCUS SECTOR</div>
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        {TECH_DIMS.map((dim) => {
          const isActive = active === dim.key;
          return (
            <button
              key={dim.key}
              onClick={() => onToggle(dim.key)}
              className="flex items-center gap-3 px-3 py-2 rounded-sm border transition-all duration-150 text-left"
              style={
                isActive
                  ? { backgroundColor: `${dim.color}18`, borderColor: `${dim.color}50`, boxShadow: `0 0 12px ${dim.color}22` }
                  : { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.07)' }
              }
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
                style={{ color: isActive ? dim.color : 'rgba(255,255,255,0.45)' }}
              >
                {dim.label}
              </span>
              {isActive && (
                <span
                  className="font-mono text-[7px] tracking-[0.1em] px-1.5 py-0.5 rounded-sm"
                  style={{ color: dim.color, backgroundColor: `${dim.color}20`, border: `1px solid ${dim.color}30` }}
                >
                  ACTIVE
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-auto px-4 pb-4 border-t border-white/[0.06] pt-3">
        <div className="font-mono text-[7px] tracking-[0.2em] text-white/20 mb-2">SCORE SCALE</div>
        {[
          { label: '90+  ELITE',       color: '#00ff88' },
          { label: '75+  STRONG',      color: '#00d4ff' },
          { label: '60+  SOLID',       color: '#ffb800' },
          { label: '<60  DEVELOPING',  color: '#f97316' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="font-mono text-[8px] text-white/30">{label}</span>
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
      className="flex flex-col gap-1.5 p-2.5 rounded-sm border transition-all duration-150 text-left"
      style={
        isSelected
          ? { backgroundColor: `${techColor}15`, borderColor: `${techColor}45`, boxShadow: `0 0 10px ${techColor}20` }
          : { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }
      }
    >
      <div className="flex items-center gap-2">
        <span className="text-base leading-none shrink-0">{country.flag}</span>
        <span className="font-mono text-[9px] tracking-[0.1em] flex-1 min-w-0 truncate"
          style={{ color: isSelected ? techColor : 'rgba(255,255,255,0.7)' }}>
          {country.name}
        </span>
        <span
          className="font-mono text-[8px] tabular-nums px-1 py-0.5 rounded-sm border shrink-0"
          style={
            rank <= 3
              ? { color: rankBadgeStyle(rank).text, borderColor: rankBadgeStyle(rank).border, backgroundColor: rankBadgeStyle(rank).bg }
              : { color: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'transparent' }
          }
        >
          #{rank}
        </span>
      </div>
      <ScoreBar score={score} color={color} />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[8px] text-white/25 tracking-widest">{country.code}</span>
        <span className="font-mono text-[10px] tabular-nums font-bold" style={{ color }}>{score}</span>
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
        className="shrink-0 px-5 py-2.5 border-b border-white/[0.06] flex items-center gap-3"
        style={{ backgroundColor: `${techDim.color}08` }}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: techDim.color, boxShadow: `0 0 8px ${techDim.color}` }} />
        <span className="font-mono text-[10px] tracking-[0.2em]" style={{ color: techDim.color }}>GLOBAL TECH INTELLIGENCE</span>
        <span className="font-mono text-[10px] text-white/30 tracking-[0.1em]">—</span>
        <span className="font-mono text-[10px] tracking-[0.15em] font-bold" style={{ color: techDim.color, textShadow: `0 0 10px ${techDim.color}66` }}>{techDim.label}</span>
        <div className="flex-1" />
        <span className="font-mono text-[8px] text-white/25 tracking-widest">{COUNTRIES.length} COUNTRIES</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 flex flex-col gap-5">
        {REGIONS.map((region) => {
          const list = byRegion[region];
          if (!list) return null;
          return (
            <div key={region}>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-[8px] tracking-[0.3em] text-white/25">{region}</span>
                <div className="flex-1 h-px bg-white/[0.05]" />
                <span className="font-mono text-[8px] text-white/15">{list.length}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
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
      <div className="w-72 shrink-0 border-l border-white/[0.06] bg-black flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-full border border-white/[0.08] flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(0,212,255,0.05)' }}>
          <span className="font-mono text-[10px] text-white/20">◎</span>
        </div>
        <div className="font-mono text-[8px] tracking-[0.25em] text-white/20 text-center leading-6">
          SELECT A COUNTRY<br />TO VIEW INTEL
        </div>
        <div className="mt-3 font-mono text-[8px] text-white/10 text-center">{COUNTRIES.length} COUNTRIES · 8 TECH DIMENSIONS</div>
      </div>
    );
  }

  const techDim = TECH_DIMS.find((d) => d.key === tech)!;
  return (
    <div className="w-72 shrink-0 border-l border-white/[0.06] bg-black flex flex-col overflow-hidden">
      <div className="px-4 py-4 border-b border-white/[0.06]" style={{ backgroundColor: `${techDim.color}08` }}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl leading-none">{country.flag}</span>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[11px] tracking-[0.15em] text-white/90 truncate">{country.name.toUpperCase()}</div>
            <div className="font-mono text-[8px] tracking-[0.2em] text-white/30 mt-0.5">{country.code} · {country.region}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 px-3 py-2 rounded-sm border" style={{ borderColor: `${techDim.color}30`, backgroundColor: `${techDim.color}10` }}>
          <span className="font-mono text-[8px] tracking-[0.15em]" style={{ color: techDim.color }}>{techDim.label}</span>
          <div className="flex-1"><ScoreBar score={country.scores[tech]} color={techDim.color} /></div>
          <span className="font-mono text-sm font-bold tabular-nums" style={{ color: techDim.color, textShadow: `0 0 10px ${techDim.color}66` }}>{country.scores[tech]}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 flex flex-col gap-3">
        <div className="font-mono text-[8px] tracking-[0.3em] text-white/25 mb-1">8 TECH DIMENSIONS</div>
        {TECH_DIMS.map((dim) => {
          const s = country.scores[dim.key];
          const barColor = scoreBarColor(s);
          const isActive = dim.key === tech;
          return (
            <div
              key={dim.key}
              className="rounded-sm px-2 py-1.5 transition-all"
              style={isActive ? { backgroundColor: `${dim.color}10`, border: `1px solid ${dim.color}25` } : { border: '1px solid transparent' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[8px] tracking-[0.1em]" style={{ color: isActive ? dim.color : 'rgba(255,255,255,0.4)' }}>{dim.label}</span>
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
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <TechFilterPanel active={activeTech} onToggle={(k) => { setActiveTech(k); setSelectedCountry(null); }} />
      <WorldScoreboard tech={activeTech} selectedCountry={selectedCountry} onSelect={(c) => setSelectedCountry((prev) => prev?.code === c.code ? null : c)} />
      <CountryDetailPanel country={selectedCountry} tech={activeTech} />
    </div>
  );
}

// ─── Header bar ───────────────────────────────────────────────────────────────

function HeaderBar({ viewMode, onToggleView }: { viewMode: ViewMode; onToggleView: (v: ViewMode) => void }) {
  return (
    <div
      className="shrink-0 flex items-center px-4 gap-3 border-b border-white/[0.06] bg-black"
      style={{ height: '44px', fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 shrink-0">
        <span style={{ fontSize: '10px', letterSpacing: '0.25em', fontWeight: 700, color: '#ff6600', textShadow: '0 0 10px #ff660066' }}>
          ◉ NXT LINK
        </span>
        <span style={{ fontSize: '8px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.20)' }}>
          WORLD INTEL
        </span>
      </div>

      <div style={{ width: '1px', height: '18px', backgroundColor: 'rgba(255,255,255,0.07)' }} />

      {/* Live indicator */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
        <span style={{ fontSize: '8px', letterSpacing: '0.15em', color: '#00ff88' }}>LIVE</span>
      </div>

      <div className="flex-1" />

      {/* View mode toggle */}
      <div
        className="flex items-center rounded-sm overflow-hidden shrink-0"
        style={{ border: '1px solid rgba(255,255,255,0.10)' }}
      >
        {(['MAP', 'SCOREBOARD'] as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => onToggleView(v)}
            style={{
              padding: '3px 12px',
              fontSize: '8px',
              letterSpacing: '0.2em',
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              backgroundColor: viewMode === v ? 'rgba(0,212,255,0.15)' : 'transparent',
              color: viewMode === v ? '#00d4ff' : 'rgba(255,255,255,0.30)',
              borderTop: 'none',
              borderBottom: 'none',
              borderLeft: 'none',
              borderRight: v === 'MAP' ? '1px solid rgba(255,255,255,0.10)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Back to platform */}
      <Link
        href="/map"
        style={{
          fontSize: '8px',
          letterSpacing: '0.2em',
          color: 'rgba(255,255,255,0.25)',
          textDecoration: 'none',
          padding: '3px 8px',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '2px',
        }}
      >
        ← MAP
      </Link>
    </div>
  );
}

// ─── Main app ─────────────────────────────────────────────────────────────────

function WorldApp() {
  const [viewMode, setViewMode] = useState<ViewMode>('MAP');

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: '100dvh', backgroundColor: '#000000', fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
    >
      <HeaderBar viewMode={viewMode} onToggleView={setViewMode} />

      {/* Content area — padded bottom for nav bar */}
      <div className="flex flex-1 min-h-0 flex-col" style={{ paddingBottom: '48px' }}>
        {viewMode === 'MAP' ? <MapView /> : <ScoreboardView />}
      </div>

      <BottomNavBar active="world" />
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function WorldPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex h-screen items-center justify-center"
          style={{ backgroundColor: '#000000', fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
        >
          <span style={{ fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.20)' }}>
            LOADING WORLD INTEL...
          </span>
        </div>
      }
    >
      <WorldApp />
    </Suspense>
  );
}
