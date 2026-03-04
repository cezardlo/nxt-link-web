'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';
import type { VendorRecord } from '@/lib/data/el-paso-vendors';
import type { SectorScore } from '@/lib/intelligence/signal-engine';

// ─── Sector → vendor category mapping ────────────────────────────────────────

const SECTOR_TO_CATEGORIES: Record<string, string[]> = {
  'defense_tech':       ['Defense', 'Defense IT', 'Border Tech'],
  'manufacturing_tech': ['Manufacturing', 'Robotics', 'Fabrication', 'Warehousing'],
  'energy_tech':        ['Energy', 'Water Tech'],
  'supply_chain':       ['Logistics', 'Warehousing', 'Trucking'],
  'ai_ml':              ['AI / ML', 'IoT', 'Analytics'],
  'cybersecurity':      ['Cybersecurity'],
};

// ─── Grade helpers ────────────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  A: '#00ff88',
  B: '#00d4ff',
  C: '#ffb800',
  D: '#f97316',
  F: '#ff3b30',
};

function getGrade(ikerScore: number): string {
  if (ikerScore >= 80) return 'A';
  if (ikerScore >= 65) return 'B';
  if (ikerScore >= 50) return 'C';
  if (ikerScore >= 35) return 'D';
  return 'F';
}

// ─── Local helpers ────────────────────────────────────────────────────────────

type FilterOption = 'all' | 'rising' | 'stable' | 'falling';
type SortOption   = 'score' | 'signals' | 'contracts';

const TREND_ICON: Record<string, string> = {
  rising:  '↑',
  stable:  '→',
  falling: '↓',
};

const TREND_COLOR: Record<string, string> = {
  rising:  '#00ff88',
  stable:  'rgba(255,255,255,0.45)',
  falling: '#ff3b30',
};

const TREND_LABEL: Record<string, string> = {
  rising:  'RISING',
  stable:  'STABLE',
  falling: 'FALLING',
};

function levelFromScore(score: number): { label: string; color: string } {
  if (score >= 70) return { label: 'ELEVATED', color: '#ff6400' };
  if (score >= 45) return { label: 'ACTIVE',   color: '#ffb800' };
  if (score >= 20) return { label: 'NOMINAL',  color: '#00d4ff' };
  return { label: 'QUIET', color: 'rgba(255,255,255,0.2)' };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div
      className="h-0.5 w-full rounded-full overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.06)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${Math.min(100, score)}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 6px ${color}66`,
        }}
      />
    </div>
  );
}

function VendorRow({ vendor }: { vendor: VendorRecord }) {
  const grade      = getGrade(vendor.ikerScore);
  const gradeColor = GRADE_COLORS[grade] ?? '#ffffff';
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-white/[0.02] transition-colors">
      <div
        className="w-1 h-1 rounded-full shrink-0"
        style={{ background: gradeColor, boxShadow: `0 0 4px ${gradeColor}` }}
      />
      <span className="font-mono text-[9px] text-white/60 flex-1 truncate">{vendor.name}</span>
      <div
        className="w-14 h-0.5 rounded-full overflow-hidden shrink-0"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${vendor.ikerScore}%`, background: gradeColor }}
        />
      </div>
      <span
        className="font-mono text-[8px] w-4 text-center shrink-0"
        style={{ color: gradeColor }}
      >
        {grade}
      </span>
      <span className="font-mono text-[8px] text-white/20 shrink-0">
        {vendor.ikerScore}
      </span>
    </div>
  );
}

function SectorCard({
  sector,
  vendors,
  isExpanded,
  onToggle,
}: {
  sector: SectorScore;
  vendors: VendorRecord[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const level      = levelFromScore(sector.score);
  const trendIcon  = TREND_ICON[sector.trend] ?? '→';
  const trendColor = TREND_COLOR[sector.trend] ?? 'rgba(255,255,255,0.4)';
  const trendLabel = TREND_LABEL[sector.trend] ?? 'STABLE';

  const categories = SECTOR_TO_CATEGORIES[sector.id] ?? [];
  const sectorVendors = [...vendors]
    .filter((v) => categories.includes(v.category))
    .sort((a, b) => b.ikerScore - a.ikerScore);

  const topVendor = sectorVendors[0];

  return (
    <div
      className={`flex flex-col bg-white/[0.02] border rounded-sm transition-colors cursor-pointer ${
        isExpanded
          ? 'border-white/[0.10]'
          : 'border-white/[0.06] hover:border-white/[0.10]'
      }`}
      onClick={onToggle}
      role="button"
      aria-expanded={isExpanded}
    >
      {/* Card header */}
      <div className="p-4 flex flex-col gap-3">

        {/* Top row: dot + label + score + expand arrow */}
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: sector.color, boxShadow: `0 0 6px ${sector.color}` }}
          />
          <span className="font-mono text-[10px] tracking-wider text-white/80 flex-1">
            {sector.label.toUpperCase()}
          </span>
          <span
            className="font-mono text-[11px] font-bold tabular-nums"
            style={{ color: sector.color }}
          >
            {sector.score}
          </span>
          <span className="font-mono text-[8px] text-white/20 ml-1">
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>

        {/* Score bar */}
        <ScoreBar score={sector.score} color={sector.color} />

        {/* Trend + level badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-mono text-[8px] tracking-wider"
            style={{ color: trendColor }}
          >
            {trendIcon} {trendLabel}
          </span>
          <span
            className="font-mono text-[7px] tracking-wider px-1.5 py-0.5 rounded-sm"
            style={{ background: `${level.color}15`, color: level.color }}
          >
            {level.label}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[9px] font-bold text-white/70">
              {sector.articleCount}
            </span>
            <span className="font-mono text-[7px] tracking-wider text-white/20">SIGNALS</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span
              className="font-mono text-[9px] font-bold"
              style={{ color: sector.contractCount > 0 ? '#ffb800' : 'rgba(255,255,255,0.3)' }}
            >
              {sector.contractCount}
            </span>
            <span className="font-mono text-[7px] tracking-wider text-white/20">CONTRACTS</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[9px] font-bold text-white/50">
              {sectorVendors.length}
            </span>
            <span className="font-mono text-[7px] tracking-wider text-white/20">VENDORS</span>
          </div>
        </div>

        {/* Top vendor chip */}
        {topVendor && (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[7px] tracking-wider text-white/20">TOP</span>
            <span className="font-mono text-[8px] text-white/45 truncate">{topVendor.name}</span>
          </div>
        )}

        {/* Top headline */}
        {sector.topHeadline && (
          <p className={`font-mono text-[8px] text-white/20 leading-tight ${isExpanded ? '' : 'line-clamp-2'}`}>
            {sector.topHeadline}
          </p>
        )}
      </div>

      {/* Expanded vendor list */}
      {isExpanded && (
        <div
          className="border-t border-white/[0.04] px-2 pb-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 pt-3 pb-1">
            <span className="font-mono text-[7px] tracking-[0.25em] text-white/20">
              ALL VENDORS — {sectorVendors.length}
            </span>
          </div>
          {sectorVendors.length === 0 ? (
            <p className="px-2 py-2 font-mono text-[8px] text-white/15">
              No vendors mapped to this sector.
            </p>
          ) : (
            sectorVendors.map((v) => <VendorRow key={v.id} vendor={v} />)
          )}
        </div>
      )}
    </div>
  );
}

// ─── API response shape ───────────────────────────────────────────────────────

type IntelSignalsResponse = {
  ok: boolean;
  sectorScores: SectorScore[];
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IndustriesPage() {
  const [sectorScores, setSectorScores] = useState<SectorScore[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState<FilterOption>('all');
  const [sortBy, setSortBy]             = useState<SortOption>('score');
  const [expandedSector, setExpandedSector] = useState<string | null>(null);

  const allVendors = Object.values(EL_PASO_VENDORS) as VendorRecord[];

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/intel-signals');
        if (!res.ok) return;
        const data = (await res.json()) as IntelSignalsResponse;
        if (!cancelled && data.ok) {
          setSectorScores(data.sectorScores);
        }
      } catch {
        // silently degrade — page still renders with empty scores
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  // Filter
  const filtered = sectorScores.filter((s) => {
    if (filter === 'all') return true;
    return s.trend === filter;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'score')     return b.score - a.score;
    if (sortBy === 'signals')   return b.articleCount - a.articleCount;
    if (sortBy === 'contracts') return b.contractCount - a.contractCount;
    return 0;
  });

  const filterOptions: { key: FilterOption; label: string }[] = [
    { key: 'all',     label: 'ALL'     },
    { key: 'rising',  label: 'RISING'  },
    { key: 'stable',  label: 'STABLE'  },
    { key: 'falling', label: 'FALLING' },
  ];

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: 'score',     label: 'SCORE'     },
    { key: 'signals',   label: 'SIGNALS'   },
    { key: 'contracts', label: 'CONTRACTS' },
  ];

  return (
    <div className="bg-black min-h-screen dot-grid">

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-black/95 border-b border-white/[0.06] backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link
            href="/map"
            className="font-mono text-[9px] tracking-wider text-white/25 hover:text-[#00d4ff]/70 transition-colors"
          >
            ← BACK TO MAP
          </Link>
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#00ff88', boxShadow: '0 0 4px #00ff88' }}
            />
            <span className="font-mono text-[8px] tracking-wider text-white/20">LIVE</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Page header */}
        <div className="flex flex-col gap-1">
          <h1 className="font-sans text-lg tracking-wider text-white/90">
            INDUSTRY INTELLIGENCE
          </h1>
          <p className="font-mono text-[9px] tracking-[0.3em] text-white/25">
            EL PASO SECTOR ANALYSIS — NXT LINK
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">

          {/* Filter buttons */}
          <div className="flex items-center gap-1">
            {filterOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`font-mono text-[8px] tracking-wider px-3 py-1 rounded-sm border transition-colors ${
                  filter === opt.key
                    ? 'border-[#00d4ff]/50 text-[#00d4ff] bg-[#00d4ff]/10'
                    : 'border-white/10 text-white/30 hover:border-white/20 hover:text-white/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-white/[0.06]" />

          {/* Sort buttons */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[7px] tracking-wider text-white/20">SORT</span>
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`font-mono text-[8px] tracking-wider px-2 py-1 rounded-sm border transition-colors ${
                  sortBy === opt.key
                    ? 'border-[#ffb800]/40 text-[#ffb800] bg-[#ffb800]/10'
                    : 'border-white/10 text-white/30 hover:border-white/20 hover:text-white/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Result count */}
          <span className="ml-auto font-mono text-[8px] text-white/15">
            {sorted.length} sector{sorted.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-sm bg-white/[0.02] border border-white/[0.04] shimmer"
              />
            ))}
          </div>
        )}

        {/* Sector grid */}
        {!loading && sorted.length === 0 && (
          <div className="py-16 text-center">
            <p className="font-mono text-[9px] text-white/20">
              No sectors match the selected filter.
            </p>
          </div>
        )}

        {!loading && sorted.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((sector) => (
              <SectorCard
                key={sector.id}
                sector={sector}
                vendors={allVendors}
                isExpanded={expandedSector === sector.id}
                onToggle={() =>
                  setExpandedSector(expandedSector === sector.id ? null : sector.id)
                }
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-white/[0.04] flex items-center justify-between">
          <span className="font-mono text-[8px] tracking-wider text-white/15">
            NXT LINK — SECTOR INTELLIGENCE
          </span>
          <span className="font-mono text-[8px] text-white/10">
            {allVendors.length} vendors indexed
          </span>
        </div>
      </div>
    </div>
  );
}
