'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { IKERPanel } from '@/components/IKERPanel';
import { ScoreBar } from '@/components/right-panel/shared/ScoreBar';
import { LoadingSkeleton } from '@/components/right-panel/shared/LoadingSkeleton';
import { formatUsd } from '@/lib/utils/format';
import { GRADE_COLORS, CONTRACT_TYPE_COLORS } from '@/lib/utils/design-tokens';
import { NXT_ENTITIES } from '@/lib/intelligence/nxt-entities';

// ─── Exported types (other files import SelectedPoint from here) ──────────────

export type SelectedPoint = {
  id: string;
  label: string;
  category: string;
  entity_id?: string;
  layer?: string;
};

// ─── Local types ──────────────────────────────────────────────────────────────

type VendorDetail = {
  id?: string;
  name?: string;
  description?: string;
  website?: string;
  tags?: string[];
  evidence?: string[];
  category?: string;
  ikerScore?: number;
  growthScore?: number;
  automationScore?: number;
  opportunityScore?: number;
  riskScore?: number;
  compositeScore?: number;
  grade?: 'A' | 'B' | 'C' | 'D' | 'F';
  industrialSignals?: string[];
};

type ContractAward = {
  id: string;
  source: 'usaspending' | 'sbir' | 'sam';
  vendor: string;
  title: string;
  amount: number | null;
  awardDate: string;
  agency: string;
  naicsCode?: string;
  description: string;
  url?: string;
  phase?: string;
  type: 'award' | 'solicitation' | 'grant';
};

type ContractsApiResponse = {
  ok: boolean;
  awards: ContractAward[];
  totalValueM: number;
  awardCount: number;
  solicitationCount: number;
  topAgency: string;
  asOf: string;
  cached?: boolean;
};

type Props = {
  selectedPoint: SelectedPoint | null;
};

// ─── VendorTab ────────────────────────────────────────────────────────────────

export function VendorTab({ selectedPoint }: Props) {
  const [vendorDetail, setVendorDetail] = useState<VendorDetail | null>(null);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [matchingContracts, setMatchingContracts] = useState<ContractAward[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);

  // Fetch vendor detail when selection changes
  useEffect(() => {
    if (!selectedPoint) {
      setVendorDetail(null);
      return;
    }

    const entityId = selectedPoint.entity_id ?? selectedPoint.id;
    let cancelled = false;
    setVendorLoading(true);
    setVendorDetail(null);

    fetch(`/api/intel/api/vendors/${entityId}`)
      .then((r) => r.json())
      .then((d: VendorDetail) => {
        if (!cancelled) setVendorDetail(d);
      })
      .catch(() => {
        if (!cancelled)
          setVendorDetail({
            name: selectedPoint.label,
            category: selectedPoint.category,
          });
      })
      .finally(() => {
        if (!cancelled) setVendorLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPoint]);

  // Fetch matching contracts by NAICS code
  useEffect(() => {
    if (!selectedPoint) {
      setMatchingContracts([]);
      return;
    }

    const rawId = selectedPoint.entity_id ?? selectedPoint.id;
    const nxtId = rawId.startsWith('ep-') ? rawId.slice(3) : rawId;
    const entity = NXT_ENTITIES.find((e) => e.id === nxtId);
    const naicsCodes = entity?.naicsCodes;

    if (!naicsCodes || naicsCodes.length === 0) {
      setMatchingContracts([]);
      return;
    }

    let cancelled = false;
    setContractsLoading(true);

    fetch('/api/live/contracts')
      .then((r) => r.json())
      .then((d: ContractsApiResponse) => {
        if (cancelled) return;
        const naicsSet = new Set(naicsCodes);
        const matches = d.awards.filter(
          (a) => a.naicsCode && naicsSet.has(a.naicsCode)
        );
        setMatchingContracts(matches.slice(0, 5));
      })
      .catch(() => {
        if (!cancelled) setMatchingContracts([]);
      })
      .finally(() => {
        if (!cancelled) setContractsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPoint]);

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!selectedPoint) {
    return (
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-white/15" />
          <span className="font-mono text-[8px] tracking-[0.3em] text-white/15 uppercase">
            No Selection
          </span>
        </div>
        <p className="font-mono text-[9px] text-white/30 leading-relaxed">
          Click a vendor dot on the map to load their dossier — name, category, IKER score,
          evidence, and matched government contracts.
        </p>
        <div className="border border-white/[0.05] rounded-sm overflow-hidden">
          <div className="px-2.5 py-1.5 border-b border-white/[0.04] bg-white/[0.015]">
            <span className="font-mono text-[8px] text-white/15 tracking-[0.2em] uppercase">
              How to select
            </span>
          </div>
          {(
            [
              'Enable VENDORS or MOMENTUM layer in the left panel',
              'Click a glowing dot on the map',
              'This tab auto-opens with full dossier',
            ] as const
          ).map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-2 px-2.5 py-1.5 border-b border-white/[0.04] last:border-0"
            >
              <span className="font-mono text-[8px] text-[#00d4ff]/30 shrink-0 mt-px">
                {i + 1}.
              </span>
              <span className="font-mono text-[9px] text-white/25 leading-snug">{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (vendorLoading) {
    return <LoadingSkeleton label="LOADING DOSSIER" />;
  }

  const name = vendorDetail?.name ?? selectedPoint.label;
  const category = vendorDetail?.category ?? selectedPoint.category;
  const tags = vendorDetail?.tags ?? [];
  const evidence = vendorDetail?.evidence ?? [];
  const website = vendorDetail?.website;

  const rawEntityId = selectedPoint.entity_id ?? selectedPoint.id;
  const nxtEntityId = rawEntityId.startsWith('ep-') ? rawEntityId.slice(3) : rawEntityId;
  const entity = NXT_ENTITIES.find((e) => e.id === nxtEntityId);
  const entityNaics = entity?.naicsCodes ?? [];

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* ── Header card ───────────────────────────────────────────────────── */}
      <div className="border border-white/[0.06] rounded-sm overflow-hidden bg-white/[0.015]">
        <div
          className="h-px"
          style={{ background: 'linear-gradient(90deg, #00d4ff44, transparent)' }}
        />
        <div className="p-3 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="font-mono text-[12px] font-bold text-white/90 leading-snug">{name}</h2>
              {category && (
                <p className="font-mono text-[9px] text-[#00d4ff]/50 mt-0.5 tracking-wider uppercase">
                  {category}
                </p>
              )}
              {vendorDetail?.ikerScore !== undefined && (
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="font-mono text-[8px] tracking-widest text-white/20 uppercase">
                    IKER
                  </span>
                  <span
                    className="font-mono text-[13px] font-black tabular-nums"
                    style={{
                      color:
                        vendorDetail.ikerScore >= 80
                          ? '#ffd700'
                          : vendorDetail.ikerScore >= 65
                          ? '#00d4ff'
                          : '#ff8c00',
                      textShadow:
                        vendorDetail.ikerScore >= 80
                          ? '0 0 8px #ffd700aa'
                          : vendorDetail.ikerScore >= 65
                          ? '0 0 8px #00d4ffaa'
                          : '0 0 8px #ff8c00aa',
                    }}
                  >
                    {vendorDetail.ikerScore}
                  </span>
                  <span className="font-mono text-[8px] text-white/20">/100</span>
                  {vendorDetail?.grade && (
                    <span
                      className="font-mono text-[9px] font-black px-1.5 py-px rounded-sm ml-2"
                      style={{
                        color: GRADE_COLORS[vendorDetail.grade] ?? '#6b7280',
                        background: `${GRADE_COLORS[vendorDetail.grade] ?? '#6b7280'}18`,
                        border: `1px solid ${GRADE_COLORS[vendorDetail.grade] ?? '#6b7280'}30`,
                      }}
                    >
                      GRADE {vendorDetail.grade}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {selectedPoint.layer && (
                <span className="font-mono text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm border border-white/[0.08] text-white/25">
                  {(selectedPoint.layer ?? '').toUpperCase()}
                </span>
              )}
              <Link
                href={`/vendor/${selectedPoint.entity_id ?? selectedPoint.id}`}
                className="font-mono text-[8px] tracking-wider text-[#00d4ff]/35 hover:text-[#00d4ff] transition-colors border border-[#00d4ff]/15 hover:border-[#00d4ff]/40 px-1.5 py-0.5 rounded-sm"
              >
                PROFILE →
              </Link>
            </div>
          </div>
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[8px] transition-colors truncate"
              style={{ color: '#00ff8880' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#00ff88')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#00ff8880')}
            >
              {website}
            </a>
          )}
        </div>
      </div>

      {vendorDetail?.description && (
        <p className="font-mono text-[9px] text-white/32 leading-relaxed">
          {vendorDetail.description}
        </p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="font-mono text-[8px] px-1.5 py-0.5 border border-white/[0.06] rounded-sm text-white/25 hover:text-white/40 hover:border-white/12 transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* ── IKER Panel ────────────────────────────────────────────────────── */}
      <IKERPanel vendorId={selectedPoint.entity_id ?? selectedPoint.id} />

      {/* ── Industrial Intel scores ───────────────────────────────────────── */}
      {vendorDetail?.compositeScore !== undefined && (
        <div className="border border-white/[0.04] rounded-sm overflow-hidden">
          <div className="px-2.5 py-1.5 border-b border-white/[0.04] bg-white/[0.01] flex items-center justify-between">
            <span className="font-mono text-[8px] tracking-[0.25em] text-white/18 uppercase">
              Industrial Intel
            </span>
            <span className="font-mono text-[8px] text-white/20 tabular-nums">
              COMP {vendorDetail.compositeScore}
            </span>
          </div>
          <div className="px-2.5 py-2 flex flex-col gap-1.5">
            <ScoreBar label="Growth" score={vendorDetail.growthScore ?? 0} color="#00ff88" />
            <ScoreBar label="Automt" score={vendorDetail.automationScore ?? 0} color="#00d4ff" />
            <ScoreBar label="OpprTy" score={vendorDetail.opportunityScore ?? 0} color="#ffb800" />
            <ScoreBar
              label="Risk"
              score={vendorDetail.riskScore ?? 0}
              color="#ff3b30"
              invert
            />
          </div>
          {(vendorDetail.industrialSignals?.length ?? 0) > 0 && (
            <div className="border-t border-white/[0.04]">
              {vendorDetail.industrialSignals!.slice(0, 3).map((sig, i) => (
                <div
                  key={i}
                  className="flex gap-1.5 px-2.5 py-1 border-b border-white/[0.03] last:border-0"
                >
                  <span className="text-[#00d4ff]/30 text-[8px] shrink-0 mt-px">›</span>
                  <span className="font-mono text-[8px] text-white/22 leading-snug">{sig}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Evidence bullets ──────────────────────────────────────────────── */}
      {evidence.length > 0 && (
        <div className="border border-white/[0.04] rounded-sm overflow-hidden">
          <div className="px-2.5 py-1.5 border-b border-white/[0.04] bg-white/[0.01]">
            <span className="font-mono text-[8px] tracking-[0.25em] text-white/18 uppercase">
              Evidence
            </span>
          </div>
          <ul className="flex flex-col">
            {evidence.slice(0, 4).map((e, i) => (
              <li
                key={i}
                className="font-mono text-[9px] text-white/28 border-b border-white/[0.03] last:border-0 px-2.5 py-2 leading-relaxed hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-[#00d4ff]/30 mr-1.5">›</span>
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── NAICS-matched contracts ───────────────────────────────────────── */}
      {contractsLoading && (
        <div className="flex items-center gap-2 py-2">
          <span className="w-1 h-1 rounded-full bg-[#00d4ff] animate-pulse" />
          <span className="font-mono text-[9px] text-white/20">Loading contract matches...</span>
        </div>
      )}

      {!contractsLoading && matchingContracts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-[9px] tracking-[0.2em] text-[#00d4ff]/70">
              SAM OPPORTUNITIES
            </p>
            <span className="font-mono text-[8px] px-1 py-px rounded-sm bg-[#00d4ff]/15 text-[#00d4ff]/80 font-bold">
              {matchingContracts.length} NAICS MATCHES
            </span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {matchingContracts.map((c) => {
              const typeColor = CONTRACT_TYPE_COLORS[c.type] ?? '#00d4ff';
              const matchedCode = entityNaics.find((code) => code === c.naicsCode);

              return (
                <li
                  key={c.id}
                  className="border border-white/5 rounded-sm p-2 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="font-mono text-[7px] tracking-wider px-1 py-px rounded-sm font-bold"
                      style={{ backgroundColor: typeColor + '20', color: typeColor }}
                    >
                      {(c.type ?? '').toUpperCase()}
                    </span>
                    {matchedCode && (
                      <span className="font-mono text-[7px] px-1 py-px rounded-sm bg-[#00d4ff]/15 text-[#00d4ff]/80 font-bold">
                        NAICS {matchedCode}
                      </span>
                    )}
                    <span
                      className="ml-auto font-mono text-[8px] font-bold"
                      style={{ color: c.amount != null ? '#00ff88' : '#ffffff33' }}
                    >
                      {formatUsd(c.amount)}
                    </span>
                  </div>
                  <p className="font-mono text-[9px] text-white/45 mt-1 leading-snug line-clamp-1">
                    {c.title}
                  </p>
                  <p className="font-mono text-[8px] text-white/25 mt-0.5">{c.agency}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
