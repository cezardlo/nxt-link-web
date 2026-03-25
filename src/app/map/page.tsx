'use client';

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { COLORS } from '@/lib/tokens';

// ── Map-mode imports (from /map/page.tsx) ───────────────────────────────────
import type { SignalFinding, SectorScore } from '@/lib/intelligence/signal-engine';
import type { ConferenceRecord } from '@/lib/data/conference-intel';
import type { ConferenceCluster } from '@/lib/utils/conference-clusters';

import { FeedBar } from '@/components/FeedBar';
import { MapCanvas } from '@/components/MapCanvas';
import type { FlyToTarget, MapPoint } from '@/components/MapCanvas';
import type { FilterMode } from '@/components/MapFilterPanel';
import { MapFilterPanel } from '@/components/MapFilterPanel';
import { MapLayerPanel } from '@/components/MapLayerPanel';
import { RightPanel } from '@/components/right-panel/RightPanel';
import type { SelectedPoint } from '@/components/right-panel/RightPanel';
import { MapTopBar } from '@/components/MapTopBar';
import { CmdK } from '@/components/CmdK';

import { useMapLayers } from '@/hooks/useMapLayers';
import type { LayerState } from '@/hooks/useMapLayers';
import { useMapData } from '@/hooks/useMapData';
import { useMissionBriefing } from '@/hooks/useMissionBriefing';

// Re-export types consumed by other components
export type { TimeRange, Mode, LayerState } from '@/hooks/useMapLayers';

// ─── Scoreboard types ────────────────────────────────────────────────────────

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

type ViewMode = 'MAP' | 'SCOREBOARD';

// ─── Static country data ─────────────────────────────────────────────────────

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

// ─── Scoreboard config ───────────────────────────────────────────────────────

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

// ─── Scoreboard primitives ───────────────────────────────────────────────────

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

// ─── Scoreboard components ───────────────────────────────────────────────────

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

// ═══════════════════════════════════════════════════════════════════════════════
// MAP VIEW — Full deck.gl map experience (from /map/page.tsx)
// ═══════════════════════════════════════════════════════════════════════════════

// CSS filter class + overlay per visual mode
const FILTER_CONFIG: Record<FilterMode, { mapClass: string; overlayClass: string }> = {
  STANDARD: { mapClass: '',           overlayClass: '' },
  CRT:      { mapClass: 'filter-crt', overlayClass: 'scanlines' },
  NVG:      { mapClass: 'filter-nvg', overlayClass: 'nvg-vignette' },
  FLIR:     { mapClass: 'filter-flir', overlayClass: 'flir-vignette' },
};

function FullMapView() {
  // ── Core layer + time state ────────────────────────────────────────────
  const {
    layers, setLayers, toggleLayer,
    timeRange, setTimeRange,
    activeLayers, initialViewState,
  } = useMapLayers();

  // ── Data fetching ──────────────────────────────────────────────────────
  const {
    flights, seismicEvents, borderCrossings, borderWaitTimes,
    crimeArticles, crimeHotspots,
    contracts, samBusinesses,
    disruptionPoints,
    countrySignalCounts,
    intelSignalPoints,
    dataFreshness, fetchErrors,
  } = useMapData(layers);

  // ── Mission briefing ───────────────────────────────────────────────────
  const { missionBriefing, briefingLoading, handleMissionSubmit } =
    useMissionBriefing(timeRange, activeLayers);

  // ── UI-only state ──────────────────────────────────────────────────────
  const [mode, setMode] = useState<'operator' | 'executive'>('operator');
  const [filterMode, setFilterMode] = useState<FilterMode>('STANDARD');
  const [mobileLayerOpen, setMobileLayerOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
  const [selectedConference, setSelectedConference] = useState<ConferenceRecord | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ConferenceCluster | null>(null);
  const [pointCount, setPointCount] = useState(0);
  const [flyTo, setFlyTo] = useState<FlyToTarget | undefined>(undefined);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [sectorScores, setSectorScores] = useState<SectorScore[]>([]);
  const [activeVendorIds, setActiveVendorIds] = useState<string[]>([]);

  // — Global Cmd+K / Ctrl+K shortcut —
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdkOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setCmdkOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleViewStateChange = useCallback((vs: { longitude: number; latitude: number; zoom: number }) => {
    const params = new URLSearchParams(window.location.search);
    params.set('lat', String(vs.latitude));
    params.set('lon', String(vs.longitude));
    params.set('z', String(vs.zoom));
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, []);

  const handleLayerPreset = useCallback((presetLayers: string[]) => {
    setLayers((prev) => {
      const next = { ...prev };
      (Object.keys(next) as (keyof LayerState)[]).forEach((k) => { next[k] = false; });
      presetLayers.forEach((l) => {
        if (l in next) next[l as keyof LayerState] = true;
      });
      return next;
    });
  }, [setLayers]);

  const handleSignalsLoaded = useCallback(
    (_signals: SignalFinding[], scores: SectorScore[], vendorIds: string[]) => {
      setSectorScores(scores);
      setActiveVendorIds(vendorIds);
    },
    [],
  );

  const handleVendorSelect = useCallback((point: MapPoint | null) => {
    if (!point) { setSelectedPoint(null); return; }
    setSelectedPoint({
      id: point.id,
      label: point.label,
      category: point.category,
      entity_id: point.entity_id,
      layer: point.layer,
    });
  }, []);

  const { mapClass, overlayClass } = FILTER_CONFIG[filterMode];

  // Derive data status for the freshness indicator
  const criticalKeys = ['flights', 'borderTrade', 'borderWait'];
  const criticalFailed = criticalKeys.some((k) => fetchErrors[k]);
  const anyFailed = Object.values(fetchErrors).some(Boolean);
  const dataStatusColor = criticalFailed ? '#ff3b30' : anyFailed ? '#ffb800' : '#00ff88';
  const dataStatusLabel = criticalFailed ? 'DATA: ERR' : anyFailed ? 'DATA: PARTIAL' : 'DATA: OK';
  const hasAnyFreshness = Object.keys(dataFreshness).length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* TOP BAR */}
      <MapTopBar
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onMissionSubmit={handleMissionSubmit}
        loading={briefingLoading}
        activeLayerCount={activeLayers.size}
        pointCount={pointCount}
        mode={mode}
        onModeChange={setMode}
        onFlyTo={setFlyTo}
        onCmdK={() => setCmdkOpen(true)}
        onSignalsLoaded={handleSignalsLoaded}
        onMobileLayerToggle={() => setMobileLayerOpen((v) => !v)}
        onMobileRightToggle={() => setMobileRightOpen((v) => !v)}
      />

      {/* MAIN AREA — 3-column on desktop, full-screen map on mobile */}
      <div className="flex flex-1 min-h-0 relative">

        {/* LEFT — LAYER PANEL: normal column on md+, slide-out drawer on mobile */}
        <div className={`
          md:relative md:flex md:w-40 md:shrink-0
          fixed inset-y-0 left-0 z-30 w-40
          transition-transform duration-200
          ${mobileLayerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <MapLayerPanel
            layers={layers}
            onToggleLayer={(key) => { toggleLayer(key); }}
            dataFreshness={dataFreshness}
          />
        </div>

        {/* Mobile backdrop — tap outside layer panel to close */}
        {mobileLayerOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 md:hidden"
            onClick={() => setMobileLayerOpen(false)}
          />
        )}

        {/* CENTER — MAP with visual filter mode */}
        <div className={`flex-1 relative min-w-0 ${mapClass}`}>
          <MapCanvas
            activeLayers={activeLayers}
            timeRange={timeRange}
            onVendorSelect={(point) => { handleVendorSelect(point); setMobileRightOpen(true); }}
            onConferenceSelect={(conf) => { setSelectedConference(conf); setMobileRightOpen(true); }}
            onClusterSelect={(cluster) => { setSelectedCluster(cluster); setMobileRightOpen(true); }}
            onPointCountChange={setPointCount}
            flyTo={flyTo}
            initialViewState={initialViewState}
            onViewStateChange={handleViewStateChange}
            flights={flights}
            seismicEvents={seismicEvents}
            activeVendorIds={activeVendorIds}
            borderCrossings={borderCrossings}
            borderWaitTimes={borderWaitTimes}
            crimeHotspots={crimeHotspots}
            disruptionPoints={disruptionPoints}
            contracts={contracts}
            samBusinesses={samBusinesses}
            countrySignalCounts={countrySignalCounts}
            intelSignalPoints={intelSignalPoints}
          />

          {/* Mode overlay (scanlines / vignette) */}
          {overlayClass && (
            <div className={`absolute inset-0 pointer-events-none z-10 ${overlayClass}`} />
          )}

          {/* Filter mode switcher */}
          <MapFilterPanel mode={filterMode} onChange={setFilterMode} />



          {/* Data freshness indicator — bottom-right corner, non-intrusive */}
          {hasAnyFreshness && (
            <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 px-2 py-1 bg-black/80 border border-white/8 rounded-sm backdrop-blur-sm pointer-events-none">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: dataStatusColor, boxShadow: `0 0 4px ${dataStatusColor}` }}
              />
              <span
                className="font-mono tracking-widest"
                style={{ fontSize: '7px', color: dataStatusColor }}
              >
                {dataStatusLabel}
              </span>
            </div>
          )}
        </div>

        {/* RIGHT — INTELLIGENCE PANEL: normal column on md+, slide-out drawer on mobile */}
        <div className={`
          md:relative md:flex md:w-72 md:shrink-0
          fixed inset-y-0 right-0 z-30 w-full max-w-sm
          transition-transform duration-200
          ${mobileRightOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}>
          <RightPanel
            selectedPoint={selectedPoint}
            missionBriefing={missionBriefing as Parameters<typeof RightPanel>[0]['missionBriefing']}
            briefingLoading={briefingLoading}
            sectorScores={sectorScores}
            flights={flights}
            selectedConference={selectedConference}
            onConferenceSelect={setSelectedConference}
            selectedCluster={selectedCluster}
            onClusterSelect={setSelectedCluster}
            onMobileClose={() => setMobileRightOpen(false)}
          />
        </div>

        {/* Mobile backdrop — tap outside right panel to close */}
        {mobileRightOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 md:hidden"
            onClick={() => setMobileRightOpen(false)}
          />
        )}

      </div>

      {/* BOTTOM — LIVE FEED BAR */}
      <FeedBar timeRange={timeRange} />

      {/* Cmd+K VENDOR SEARCH MODAL */}
      <CmdK
        context="map"
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        timeRange={timeRange}
        onVendorSelect={(point) => { handleVendorSelect(point); setCmdkOpen(false); setMobileRightOpen(true); }}
        onLayerPreset={handleLayerPreset}
        onFlyTo={setFlyTo}
        contracts={contracts}
        samBusinesses={samBusinesses}
        crimeArticles={crimeArticles}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW TOGGLE — floating pill in the top-right
// ═══════════════════════════════════════════════════════════════════════════════

function ViewToggle({
  viewMode,
  onChange,
}: {
  viewMode: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  const views: { id: ViewMode; label: string }[] = [
    { id: 'MAP',        label: 'MAP' },
    { id: 'SCOREBOARD', label: 'SCORES' },
  ];

  return (
    <div className="absolute top-3 right-3 z-50 flex items-center">
      <div
        className="flex items-center overflow-hidden p-0.5 gap-0.5 backdrop-blur-md"
        style={{
          borderRadius: '9999px',
          backgroundColor: 'rgba(0,0,0,0.75)',
          border: `1px solid ${COLORS.border}`,
          boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
        }}
      >
        {views.map((v) => {
          const isActive = viewMode === v.id;
          return (
            <button
              key={v.id}
              onClick={() => onChange(v.id)}
              className="px-3.5 py-1.5 text-[8px] tracking-[0.2em] font-mono cursor-pointer transition-all duration-200 border-none"
              style={{
                borderRadius: '9999px',
                backgroundColor: isActive ? `${COLORS.cyan}26` : 'transparent',
                color: isActive ? COLORS.cyan : COLORS.muted,
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

// ═══════════════════════════════════════════════════════════════════════════════
// BACK BUTTON — top-left, since no NavRail
// ═══════════════════════════════════════════════════════════════════════════════

function BackButton() {
  return (
    <Link
      href="/solve"
      className="absolute top-3 left-3 z-50 flex items-center gap-1.5 px-3 py-1.5 font-mono text-[8px] tracking-[0.15em] backdrop-blur-md transition-all duration-200 hover:brightness-125 no-underline"
      style={{
        borderRadius: '9999px',
        backgroundColor: 'rgba(0,0,0,0.75)',
        border: `1px solid ${COLORS.border}`,
        color: COLORS.muted,
        boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
      }}
    >
      <span style={{ fontSize: '10px' }}>&larr;</span>
      NAV
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function WorldApp() {
  const [viewMode, setViewMode] = useState<ViewMode>('MAP');

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden font-mono animate-fade-up">
      {/* Floating controls */}
      <BackButton />
      <ViewToggle viewMode={viewMode} onChange={setViewMode} />

      {/* Content */}
      {viewMode === 'MAP' && <FullMapView />}
      {viewMode === 'SCOREBOARD' && (
        <div className="flex flex-col h-full overflow-hidden" style={{ background: COLORS.bg }}>
          {/* Scoreboard header bar */}
          <div
            className="shrink-0 flex items-center px-5 py-3 font-mono"
            style={{ borderBottom: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bg }}
          >
            <span className="text-[9px] tracking-[0.3em]" style={{ color: COLORS.dim }}>WORLD</span>
            <span className="mx-2 text-[8px]" style={{ color: COLORS.border }}>/</span>
            <span className="text-[9px] tracking-[0.2em] font-bold" style={{ color: COLORS.cyan }}>TECH RANKINGS</span>
            <div className="flex-1" />
            <span className="text-[8px] tracking-widest" style={{ color: COLORS.dim }}>{COUNTRIES.length} NATIONS</span>
          </div>

          {/* Scoreboard content */}
          <ScoreboardView />
        </div>
      )}
    </div>
  );
}

// ─── Page export ─────────────────────────────────────────────────────────────

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
