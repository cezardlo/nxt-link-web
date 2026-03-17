'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';

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

// ─── Static data ─────────────────────────────────────────────────────────────

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
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', region: 'OTHER', scores: { ai: 48, defense: 55, biotech: 52, energy: 58, manufacturing: 52, cybersecurity: 50, robotics: 42, semiconductors: 35 } },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', region: 'OTHER', scores: { ai: 72, defense: 75, biotech: 60, energy: 78, manufacturing: 62, cybersecurity: 70, robotics: 65, semiconductors: 50 } },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', region: 'OTHER', scores: { ai: 62, defense: 70, biotech: 55, energy: 82, manufacturing: 58, cybersecurity: 62, robotics: 55, semiconductors: 42 } },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', region: 'EUROPE', scores: { ai: 78, defense: 65, biotech: 72, energy: 80, manufacturing: 72, cybersecurity: 85, robotics: 72, semiconductors: 60 } },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', region: 'EUROPE', scores: { ai: 75, defense: 62, biotech: 80, energy: 88, manufacturing: 68, cybersecurity: 80, robotics: 70, semiconductors: 58 } },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', region: 'EUROPE', scores: { ai: 72, defense: 65, biotech: 75, energy: 92, manufacturing: 65, cybersecurity: 78, robotics: 68, semiconductors: 55 } },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', region: 'EUROPE', scores: { ai: 68, defense: 65, biotech: 72, energy: 78, manufacturing: 70, cybersecurity: 65, robotics: 65, semiconductors: 55 } },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', region: 'EUROPE', scores: { ai: 68, defense: 65, biotech: 72, energy: 72, manufacturing: 80, cybersecurity: 65, robotics: 70, semiconductors: 58 } },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', region: 'EUROPE', scores: { ai: 65, defense: 68, biotech: 62, energy: 62, manufacturing: 72, cybersecurity: 68, robotics: 60, semiconductors: 52 } },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', region: 'EUROPE', scores: { ai: 62, defense: 62, biotech: 62, energy: 62, manufacturing: 75, cybersecurity: 65, robotics: 62, semiconductors: 50 } },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', region: 'EUROPE', scores: { ai: 72, defense: 65, biotech: 58, energy: 65, manufacturing: 58, cybersecurity: 90, robotics: 60, semiconductors: 48 } },
];

// ─── Config ───────────────────────────────────────────────────────────────────

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

// Acquisition intel copy per country+tech combination (top pairings)
const ACQUIRE_INTEL: Partial<Record<string, string>> = {
  'TW-semiconductors': 'ACQUIRE: Taiwan for Semiconductors — World leader in TSMC-class foundry technology',
  'US-ai':             'ACQUIRE: United States for AI — Deepest ecosystem of AI/ML talent and foundation models',
  'US-defense':        'ACQUIRE: United States for Defense — Unmatched R&D budget and prime contractor network',
  'IL-cybersecurity':  'ACQUIRE: Israel for Cybersecurity — Highest density of elite offensive/defensive cyber firms',
  'JP-robotics':       'ACQUIRE: Japan for Robotics — Industrial robotics heritage with Fanuc, Yaskawa, Kawasaki',
  'CN-manufacturing':  'ACQUIRE: China for Manufacturing — Largest precision manufacturing base at scale',
  'DE-manufacturing':  'ACQUIRE: Germany for Manufacturing — Mittelstand engineering + Industry 4.0 leadership',
  'KR-semiconductors': 'ACQUIRE: South Korea for Semiconductors — Samsung/SK Hynix memory chip dominance',
  'CH-biotech':        'ACQUIRE: Switzerland for Biotech — Novartis/Roche cluster with deep pharma IP',
  'NO-energy':         'ACQUIRE: Norway for Energy — Green hydrogen + offshore wind technology leaders',
  'EE-cybersecurity':  'ACQUIRE: Estonia for Cybersecurity — Digital-native government + NATO cyber doctrine',
  'GB-biotech':        'ACQUIRE: United Kingdom for Biotech — AstraZeneca, GSK, and Oxford research pipeline',
  'NL-semiconductors': 'ACQUIRE: Netherlands for Semiconductors — ASML EUV lithography monopoly',
  'SE-energy':         'ACQUIRE: Sweden for Energy — Green steel + battery technology (Northvolt)',
  'SG-cybersecurity':  'ACQUIRE: Singapore for Cybersecurity — Asia-Pacific security hub with strong talent pipeline',
};

function getAcquireIntel(country: Country, tech: TechKey): string {
  const key = `${country.code}-${tech}`;
  if (ACQUIRE_INTEL[key]) return ACQUIRE_INTEL[key]!;
  const score = country.scores[tech];
  const techLabel = TECH_DIMS.find((d) => d.key === tech)?.label ?? tech.toUpperCase();
  if (score >= 90) return `ACQUIRE: ${country.name} for ${techLabel} — Tier-1 global supplier, score ${score}/100`;
  if (score >= 75) return `MONITOR: ${country.name} for ${techLabel} — Strong capability at score ${score}/100, evaluate partnerships`;
  return `CAUTION: ${country.name} for ${techLabel} — Developing capability (${score}/100), verify before engaging`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreBarColor(score: number): string {
  if (score >= 90) return '#00ff88';
  if (score >= 75) return '#00d4ff';
  if (score >= 60) return '#ffb800';
  return '#f97316';
}

function rankBadgeStyle(rank: number): { bg: string; text: string; border: string } {
  if (rank === 1) return { bg: '#ffb800/15', text: '#ffb800', border: '#ffb800/40' };
  if (rank === 2) return { bg: '#00d4ff/10', text: '#00d4ff', border: '#00d4ff/30' };
  if (rank === 3) return { bg: '#00ff88/10', text: '#00ff88', border: '#00ff88/30' };
  return { bg: 'white/5', text: 'white/40', border: 'white/10' };
}

// ─── Score bar primitive ──────────────────────────────────────────────────────

function ScoreBar({ score, color, height = 'h-1' }: { score: number; color: string; height?: string }) {
  return (
    <div className={`w-full ${height} bg-white/[0.06] rounded-full overflow-hidden`}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${score}%`,
          backgroundColor: color,
          boxShadow: `0 0 6px ${color}55`,
        }}
      />
    </div>
  );
}

// ─── Left panel: tech dimension toggles ──────────────────────────────────────

function TechFilterPanel({
  active,
  onToggle,
}: {
  active: TechKey;
  onToggle: (k: TechKey) => void;
}) {
  return (
    <div className="w-64 shrink-0 flex flex-col border-r border-white/[0.06] bg-black overflow-hidden">
      {/* Panel title */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="font-mono text-[8px] tracking-[0.3em] text-white/30 mb-0.5">TECH DIMENSION</div>
        <div className="font-mono text-[10px] tracking-[0.15em] text-white/60">SELECT FOCUS SECTOR</div>
      </div>

      {/* Chips */}
      <div className="p-3 flex flex-col gap-2">
        {TECH_DIMS.map((dim) => {
          const isActive = active === dim.key;
          return (
            <button
              key={dim.key}
              onClick={() => onToggle(dim.key)}
              className="flex items-center gap-3 px-3 py-2 rounded-sm border transition-all duration-150 text-left"
              style={
                isActive
                  ? {
                      backgroundColor: `${dim.color}18`,
                      borderColor: `${dim.color}50`,
                      boxShadow: `0 0 12px ${dim.color}22`,
                    }
                  : {
                      backgroundColor: 'transparent',
                      borderColor: 'rgba(255,255,255,0.07)',
                    }
              }
            >
              {/* Color dot */}
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: isActive ? dim.color : 'transparent',
                  border: `1.5px solid ${dim.color}`,
                  boxShadow: isActive ? `0 0 8px ${dim.color}88` : 'none',
                }}
              />
              <span
                className="font-mono text-[10px] tracking-[0.12em] flex-1"
                style={{ color: isActive ? dim.color : 'rgba(255,255,255,0.45)' }}
              >
                {dim.label}
              </span>
              {isActive && (
                <span
                  className="font-mono text-[8px] tracking-[0.1em] px-1.5 py-0.5 rounded-sm"
                  style={{
                    color: dim.color,
                    backgroundColor: `${dim.color}20`,
                    border: `1px solid ${dim.color}30`,
                  }}
                >
                  ACTIVE
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Spacer + legend */}
      <div className="mt-auto px-4 pb-4 border-t border-white/[0.06] pt-3">
        <div className="font-mono text-[7px] tracking-[0.2em] text-white/20 mb-2">SCORE SCALE</div>
        {[
          { label: '90+  ELITE',  color: '#00ff88' },
          { label: '75+  STRONG', color: '#00d4ff' },
          { label: '60+  SOLID',  color: '#ffb800' },
          { label: '<60  DEVELOPING', color: '#f97316' },
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

// ─── Country card ─────────────────────────────────────────────────────────────

function CountryCard({
  country,
  tech,
  rank,
  isSelected,
  onClick,
}: {
  country: Country;
  tech: TechKey;
  rank: number;
  isSelected: boolean;
  onClick: () => void;
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
          ? {
              backgroundColor: `${techColor}15`,
              borderColor: `${techColor}45`,
              boxShadow: `0 0 10px ${techColor}20`,
            }
          : {
              backgroundColor: 'rgba(255,255,255,0.02)',
              borderColor: 'rgba(255,255,255,0.06)',
            }
      }
    >
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span className="text-base leading-none shrink-0">{country.flag}</span>
        <span
          className="font-mono text-[9px] tracking-[0.1em] flex-1 min-w-0 truncate"
          style={{ color: isSelected ? techColor : 'rgba(255,255,255,0.7)' }}
        >
          {country.name}
        </span>
        {/* Rank badge */}
        <span
          className="font-mono text-[8px] tabular-nums px-1 py-0.5 rounded-sm border shrink-0"
          style={
            rank <= 3
              ? {
                  color: rankBadgeStyle(rank).text,
                  borderColor: rankBadgeStyle(rank).border,
                  backgroundColor: rankBadgeStyle(rank).bg,
                }
              : { color: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'transparent' }
          }
        >
          #{rank}
        </span>
      </div>

      {/* Score bar */}
      <ScoreBar score={score} color={color} />

      {/* Score number */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[8px] text-white/25 tracking-widest">{country.code}</span>
        <span className="font-mono text-[10px] tabular-nums font-bold" style={{ color }}>
          {score}
        </span>
      </div>
    </button>
  );
}

// ─── Center: scoreboard grid ──────────────────────────────────────────────────

function WorldScoreboard({
  tech,
  selectedCountry,
  onSelect,
}: {
  tech: TechKey;
  selectedCountry: Country | null;
  onSelect: (c: Country) => void;
}) {
  const techDim = TECH_DIMS.find((d) => d.key === tech)!;

  // Build ranked lookup
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
      {/* Scoreboard title bar */}
      <div
        className="shrink-0 px-5 py-2.5 border-b border-white/[0.06] flex items-center gap-3"
        style={{ backgroundColor: `${techDim.color}08` }}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: techDim.color, boxShadow: `0 0 8px ${techDim.color}` }}
        />
        <span
          className="font-mono text-[10px] tracking-[0.2em]"
          style={{ color: techDim.color }}
        >
          GLOBAL TECH INTELLIGENCE MAP
        </span>
        <span className="font-mono text-[10px] text-white/30 tracking-[0.1em]">—</span>
        <span
          className="font-mono text-[10px] tracking-[0.15em] font-bold"
          style={{ color: techDim.color, textShadow: `0 0 10px ${techDim.color}66` }}
        >
          {techDim.label}
        </span>
        <div className="flex-1" />
        <span className="font-mono text-[8px] text-white/25 tracking-widest">
          {COUNTRIES.length} COUNTRIES INDEXED
        </span>
      </div>

      {/* Region groups */}
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

// ─── Right panel: country detail ──────────────────────────────────────────────

type SignalsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; signals: string[] };

function CountryDetailPanel({
  country,
  tech,
}: {
  country: Country | null;
  tech: TechKey;
}) {
  const [signalsState, setSignalsState] = useState<SignalsState>({ status: 'idle' });

  useEffect(() => {
    if (!country) {
      setSignalsState({ status: 'idle' });
      return;
    }
    setSignalsState({ status: 'loading' });
    const controller = new AbortController();
    fetch(`/api/world/signals?country=${country.code}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { ok: boolean; data?: { signals?: Array<{ title: string; url: string; source: string; category: string }> } };
        const rawSignals = json.data?.signals ?? [];
        setSignalsState({ status: 'ok', signals: rawSignals.map(s => s.title) });
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setSignalsState({ status: 'error', message: 'Signals unavailable' });
      });
    return () => controller.abort();
  }, [country?.code]);

  if (!country) {
    return (
      <div className="w-80 shrink-0 border-l border-white/[0.06] bg-black flex flex-col items-center justify-center p-6">
        <div
          className="w-12 h-12 rounded-full border border-white/[0.08] flex items-center justify-center mb-4"
          style={{ backgroundColor: 'rgba(0,212,255,0.05)' }}
        >
          <span className="font-mono text-[10px] text-white/20">◎</span>
        </div>
        <div className="font-mono text-[8px] tracking-[0.25em] text-white/20 text-center leading-6">
          SELECT A COUNTRY<br />TO VIEW INTEL
        </div>
        <div className="mt-3 font-mono text-[8px] text-white/10 text-center">
          {COUNTRIES.length} COUNTRIES · 8 TECH DIMENSIONS
        </div>
      </div>
    );
  }

  const techDim = TECH_DIMS.find((d) => d.key === tech)!;
  const acquireText = getAcquireIntel(country, tech);

  return (
    <div className="w-80 shrink-0 border-l border-white/[0.06] bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/[0.06]" style={{ backgroundColor: `${techDim.color}08` }}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl leading-none">{country.flag}</span>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[11px] tracking-[0.15em] text-white/90 truncate">
              {country.name.toUpperCase()}
            </div>
            <div className="font-mono text-[8px] tracking-[0.2em] text-white/30 mt-0.5">
              {country.code} · {country.region}
            </div>
          </div>
        </div>
        {/* Focus score */}
        <div
          className="flex items-center gap-3 px-3 py-2 rounded-sm border"
          style={{ borderColor: `${techDim.color}30`, backgroundColor: `${techDim.color}10` }}
        >
          <span className="font-mono text-[8px] tracking-[0.15em]" style={{ color: techDim.color }}>
            {techDim.label}
          </span>
          <div className="flex-1">
            <ScoreBar score={country.scores[tech]} color={techDim.color} />
          </div>
          <span
            className="font-mono text-sm font-bold tabular-nums"
            style={{ color: techDim.color, textShadow: `0 0 10px ${techDim.color}66` }}
          >
            {country.scores[tech]}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 flex flex-col gap-4">

        {/* All 8 dimensions */}
        <div>
          <div className="font-mono text-[8px] tracking-[0.3em] text-white/25 mb-2">8 TECH DIMENSIONS</div>
          <div className="flex flex-col gap-2">
            {TECH_DIMS.map((dim) => {
              const s = country.scores[dim.key];
              const barColor = scoreBarColor(s);
              const isActive = dim.key === tech;
              return (
                <div
                  key={dim.key}
                  className="rounded-sm px-2 py-1.5 transition-all"
                  style={
                    isActive
                      ? { backgroundColor: `${dim.color}10`, border: `1px solid ${dim.color}25` }
                      : { border: '1px solid transparent' }
                  }
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="font-mono text-[8px] tracking-[0.1em]"
                      style={{ color: isActive ? dim.color : 'rgba(255,255,255,0.4)' }}
                    >
                      {dim.label}
                    </span>
                    <span
                      className="font-mono text-[9px] tabular-nums"
                      style={{ color: barColor }}
                    >
                      {s}
                    </span>
                  </div>
                  <ScoreBar score={s} color={barColor} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Live signals */}
        <div>
          <div className="font-mono text-[8px] tracking-[0.3em] text-white/25 mb-2 flex items-center gap-2">
            LIVE SIGNALS
            {signalsState.status === 'loading' && (
              <span className="font-mono text-[8px] text-[#00ff88]/60 loading-dots">LOADING</span>
            )}
            {signalsState.status === 'ok' && (
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: '#00ff88', boxShadow: '0 0 6px #00ff88' }}
              />
            )}
          </div>
          {signalsState.status === 'loading' && (
            <div className="flex flex-col gap-1.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-7 bg-white/[0.04] rounded-sm shimmer" />
              ))}
            </div>
          )}
          {signalsState.status === 'error' && (
            <div className="font-mono text-[8px] text-white/20 italic">{signalsState.message}</div>
          )}
          {signalsState.status === 'ok' && signalsState.signals.length === 0 && (
            <div className="font-mono text-[8px] text-white/20">No signals at this time</div>
          )}
          {signalsState.status === 'ok' && signalsState.signals.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {signalsState.signals.map((sig, i) => (
                <div
                  key={i}
                  className="flex gap-2 px-2 py-1.5 rounded-sm border border-white/[0.06] bg-white/[0.02]"
                >
                  <span className="font-mono text-[8px] text-[#00d4ff]/40 shrink-0 mt-px">◈</span>
                  <span className="font-mono text-[8px] text-white/55 leading-relaxed">{sig}</span>
                </div>
              ))}
            </div>
          )}
          {/* Fallback mock signals when idle (not yet fetched) */}
          {signalsState.status === 'idle' && (
            <div className="flex flex-col gap-1.5">
              {[
                `${country.name} ${techDim.label} sector activity detected`,
                `New ${techDim.label.toLowerCase()} procurement signals in ${country.code}`,
                `R&D investment trend positive for ${country.code} ${techDim.label.toLowerCase()}`,
              ].map((sig, i) => (
                <div
                  key={i}
                  className="flex gap-2 px-2 py-1.5 rounded-sm border border-white/[0.06] bg-white/[0.02]"
                >
                  <span className="font-mono text-[8px] text-[#00d4ff]/30 shrink-0 mt-px">◈</span>
                  <span className="font-mono text-[8px] text-white/40 leading-relaxed">{sig}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Acquisition intel */}
        <div>
          <div className="font-mono text-[8px] tracking-[0.3em] text-white/25 mb-2">ACQUISITION INTEL</div>
          <div
            className="px-3 py-2.5 rounded-sm border"
            style={{
              borderColor: '#00d4ff30',
              backgroundColor: '#00d4ff0a',
              boxShadow: '0 0 12px #00d4ff0a',
            }}
          >
            <div className="flex items-start gap-2">
              <span
                className="font-mono text-[9px] shrink-0 mt-px"
                style={{ color: '#00d4ff' }}
              >
                ◉
              </span>
              <span
                className="font-mono text-[9px] leading-relaxed"
                style={{ color: '#00d4ffcc' }}
              >
                {acquireText}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Header bar + Tech Race banner ───────────────────────────────────────────

function HeaderBar({ tech }: { tech: TechKey }) {
  const techDim = TECH_DIMS.find((d) => d.key === tech)!;

  const top5 = useMemo(() => {
    return [...COUNTRIES]
      .sort((a, b) => b.scores[tech] - a.scores[tech])
      .slice(0, 5);
  }, [tech]);

  return (
    <div className="shrink-0 h-11 border-b border-white/[0.06] bg-black flex items-center px-4 gap-4">
      {/* Title */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className="font-mono text-[10px] tracking-[0.25em] font-bold"
          style={{ color: '#00d4ff', textShadow: '0 0 10px #00d4ff66' }}
        >
          ◉ WORLD INTEL
        </span>
        <span className="font-mono text-[8px] text-white/20 tracking-widest">
          30 COUNTRIES · 8 TECH DIMENSIONS · LIVE SIGNALS
        </span>
      </div>

      <div className="w-px h-5 bg-white/[0.07] shrink-0" />

      {/* Tech race label */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="font-mono text-[8px] tracking-[0.2em] text-white/25">TECH RACE</span>
        <span
          className="font-mono text-[8px] tracking-[0.15em] px-1.5 py-0.5 rounded-sm"
          style={{
            color: techDim.color,
            backgroundColor: `${techDim.color}15`,
            border: `1px solid ${techDim.color}30`,
          }}
        >
          {techDim.label}
        </span>
      </div>

      {/* Top 5 mini leaderboard */}
      <div className="flex items-center gap-3 overflow-x-auto">
        {top5.map((country, i) => {
          const rank = i + 1;
          const score = country.scores[tech];
          const bs = rankBadgeStyle(rank);
          return (
            <div key={country.code} className="flex items-center gap-1.5 shrink-0">
              <span
                className="font-mono text-[8px] tabular-nums px-1 py-0.5 rounded-sm border"
                style={{ color: bs.text, borderColor: bs.border, backgroundColor: bs.bg }}
              >
                #{rank}
              </span>
              <span className="text-sm leading-none">{country.flag}</span>
              <span className="font-mono text-[9px] text-white/55">{country.code}</span>
              <span
                className="font-mono text-[9px] tabular-nums font-bold"
                style={{ color: scoreBarColor(score) }}
              >
                {score}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* Back link */}
      <a
        href="/map"
        className="font-mono text-[8px] tracking-[0.2em] text-white/25 hover:text-white/50 transition-colors px-2 py-1 border border-white/[0.06] rounded-sm"
      >
        ← MAP
      </a>
    </div>
  );
}

// ─── Inner app (client state) ─────────────────────────────────────────────────

function WorldIntelApp() {
  const [activeTech, setActiveTech] = useState<TechKey>('ai');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  function handleTechToggle(k: TechKey) {
    setActiveTech(k);
    setSelectedCountry(null);
  }

  function handleSelectCountry(c: Country) {
    setSelectedCountry((prev) => (prev?.code === c.code ? null : c));
  }

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden">
      <HeaderBar tech={activeTech} />
      <div className="flex flex-1 min-h-0">
        <TechFilterPanel active={activeTech} onToggle={handleTechToggle} />
        <WorldScoreboard
          tech={activeTech}
          selectedCountry={selectedCountry}
          onSelect={handleSelectCountry}
        />
        <CountryDetailPanel country={selectedCountry} tech={activeTech} />
      </div>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function WorldPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-black items-center justify-center">
          <span className="font-mono text-[10px] tracking-[0.3em] text-white/20 loading-dots">
            LOADING WORLD INTEL
          </span>
        </div>
      }
    >
      <WorldIntelApp />
    </Suspense>
  );
}
