'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SectorScore } from '@/lib/intelligence/signal-engine';
import type { VendorRecord } from '@/lib/data/el-paso-vendors';

type Props = {
  scores: SectorScore[];
  vendors?: VendorRecord[];
};

const TREND_ICON: Record<string, string> = {
  rising:  '↑',
  stable:  '→',
  falling: '↓',
};

const TREND_COLOR: Record<string, string> = {
  rising:  '#00ff88',
  stable:  'rgba(255,255,255,0.4)',
  falling: '#ff3b30',
};

const SECTOR_TO_CATEGORIES: Record<string, string[]> = {
  'defense_tech':       ['Defense', 'Defense IT', 'Border Tech'],
  'manufacturing_tech': ['Manufacturing', 'Robotics', 'Fabrication', 'Warehousing'],
  'energy_tech':        ['Energy', 'Water Tech'],
  'supply_chain':       ['Logistics', 'Warehousing', 'Trucking'],
  'ai_ml':              ['AI / ML', 'IoT', 'Analytics'],
  'cybersecurity':      ['Cybersecurity'],
};

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

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="h-0.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
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

export function SectorMomentumBoard({ scores, vendors }: Props) {
  const [expandedSector, setExpandedSector] = useState<string | null>(null);

  if (scores.length === 0) {
    return (
      <div className="px-3 py-4 font-mono text-[9px] text-white/20 text-center">
        Loading sector momentum…
      </div>
    );
  }

  // Sort: highest score first
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col gap-0">
      <div className="px-3 pt-2 pb-1 flex items-center justify-between">
        <span className="font-mono text-[8px] tracking-[0.25em] text-white/25">SECTOR MOMENTUM</span>
        <span className="font-mono text-[8px] text-white/15">LIVE</span>
      </div>

      {sorted.map((sector) => {
        const trendIcon  = TREND_ICON[sector.trend] ?? '→';
        const trendColor = TREND_COLOR[sector.trend] ?? 'rgba(255,255,255,0.4)';
        const isExpanded = expandedSector === sector.id;

        // Score thresholds → level label
        const level =
          sector.score >= 70 ? 'ELEVATED' :
          sector.score >= 45 ? 'ACTIVE' :
          sector.score >= 20 ? 'NOMINAL' : 'QUIET';

        const levelColor =
          sector.score >= 70 ? '#f97316' :
          sector.score >= 45 ? '#ffb800' :
          sector.score >= 20 ? sector.color : 'rgba(255,255,255,0.2)';

        // Vendors for this sector
        const matchingCategories = SECTOR_TO_CATEGORIES[sector.id] ?? [];
        const sectorVendors = vendors
          ? [...vendors]
              .filter((v) => matchingCategories.includes(v.category))
              .sort((a, b) => b.ikerScore - a.ikerScore)
              .slice(0, 5)
          : [];

        return (
          <div
            key={sector.id}
            className="flex flex-col border-b border-white/[0.04] last:border-0"
          >
            {/* Clickable header row */}
            <div
              className="px-3 py-2 flex flex-col gap-1.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
              onClick={() => setExpandedSector(isExpanded ? null : sector.id)}
              role="button"
              aria-expanded={isExpanded}
            >
              {/* Row 1: label + trend + score + expand indicator */}
              <div className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: sector.color, boxShadow: `0 0 4px ${sector.color}` }}
                />
                <span className="font-mono text-[10px] tracking-wide text-white/70 flex-1">
                  {sector.label}
                </span>
                <span className="font-mono text-[10px]" style={{ color: trendColor }}>
                  {trendIcon}
                </span>
                <span className="font-mono text-[10px] font-bold" style={{ color: sector.color }}>
                  {sector.score}
                </span>
                <span className="font-mono text-[8px] text-white/20 ml-1">
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>

              {/* Score bar */}
              <ScoreBar score={sector.score} color={sector.color} />

              {/* Row 3: metadata */}
              <div className="flex items-center gap-3">
                <span
                  className="font-mono text-[7px] tracking-wider px-1 rounded-sm"
                  style={{ background: `${levelColor}15`, color: levelColor }}
                >
                  {level}
                </span>
                <span className="font-mono text-[8px] text-white/20">
                  {sector.articleCount} signals
                </span>
                {sector.contractCount > 0 && (
                  <span className="font-mono text-[8px]" style={{ color: '#ffb800' }}>
                    {sector.contractCount} contract{sector.contractCount > 1 ? 's' : ''}
                  </span>
                )}
                {sector.topVendor && (
                  <span className="ml-auto font-mono text-[8px] text-white/25 truncate max-w-[80px]">
                    {sector.topVendor}
                  </span>
                )}
              </div>

              {/* Top headline */}
              {sector.topHeadline && (
                <p className={`font-mono text-[8px] text-white/20 leading-tight ${isExpanded ? '' : 'line-clamp-1'}`}>
                  {sector.topHeadline}
                </p>
              )}
            </div>

            {/* Expanded vendor list */}
            {isExpanded && (
              <div className="pb-2 border-t border-white/[0.04]">
                {sectorVendors.length === 0 ? (
                  <p className="px-3 py-2 font-mono text-[8px] text-white/15">
                    No vendors mapped to this sector.
                  </p>
                ) : (
                  <>
                    <div className="px-3 pt-2 pb-0.5">
                      <span className="font-mono text-[7px] tracking-[0.2em] text-white/20">
                        TOP VENDORS
                      </span>
                    </div>
                    {sectorVendors.map((v) => {
                      const grade = getGrade(v.ikerScore);
                      const gradeColor = GRADE_COLORS[grade] ?? '#ffffff';
                      return (
                        <div key={v.id} className="flex items-center gap-2 px-2 py-1">
                          <span className="font-mono text-[8px] text-white/50 flex-1 truncate">
                            {v.name}
                          </span>
                          <div
                            className="w-12 h-0.5 rounded-full overflow-hidden"
                            style={{ background: 'rgba(255,255,255,0.06)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${v.ikerScore}%`, background: gradeColor }}
                            />
                          </div>
                          <span
                            className="font-mono text-[7px] w-3 text-center"
                            style={{ color: gradeColor }}
                          >
                            {grade}
                          </span>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Footer link */}
      <div className="px-3 py-2 border-t border-white/[0.04]">
        <Link
          href="/industries"
          className="font-mono text-[8px] tracking-wider text-white/25 hover:text-[#00d4ff]/70 transition-colors"
        >
          VIEW FULL DASHBOARD →
        </Link>
      </div>
    </div>
  );
}
