'use client';

import { useEffect, useState } from 'react';
import { formatUsd, timeAgo } from '@/lib/utils/format';
import {
  CONTRACT_TYPE_COLORS,
  CONTRACT_SOURCE_COLORS,
} from '@/lib/utils/design-tokens';
import { LoadingSkeleton } from '@/components/right-panel/shared/LoadingSkeleton';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTRACT_SOURCE_LABELS: Record<string, string> = {
  sam: 'SAM.GOV',
  usaspending: 'USASPENDING',
  sbir: 'SBIR',
};

type ContractFilter = 'ALL' | 'AWARDS' | 'SOLICITATIONS' | 'GRANTS';

const CONTRACT_FILTERS: ContractFilter[] = ['ALL', 'AWARDS', 'SOLICITATIONS', 'GRANTS'];

const CONTRACT_FILTER_MAP: Record<ContractFilter, string | null> = {
  ALL: null,
  AWARDS: 'award',
  SOLICITATIONS: 'solicitation',
  GRANTS: 'grant',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ContractsSection() {
  const [data, setData] = useState<ContractsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ContractFilter>('ALL');

  const load = (force = false) => {
    if (force) setRefreshing(true); else setLoading(true);
    fetch('/api/live/contracts')
      .then((r) => r.json())
      .then((d: ContractsApiResponse) => setData(d))
      .catch(() => setData(null))
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <LoadingSkeleton label="LOADING CONTRACTS" />;
  }

  const awards = data?.awards ?? [];
  const filterType = CONTRACT_FILTER_MAP[activeFilter];
  const filtered = filterType ? awards.filter((a) => a.type === filterType) : awards;

  return (
    <div className="flex flex-col h-full">
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
        <span className="font-mono text-[9px] tracking-[0.15em] text-white/25">CONTRACT INTEL</span>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="font-mono text-[9px] text-white/20 hover:text-[#00d4ff]/60 transition-colors disabled:opacity-30"
        >
          {refreshing ? '···' : 'REFRESH'}
        </button>
      </div>

      {/* Stats row */}
      {data && (
        <div className="px-3 py-2 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9px] text-[#00ff88]/70">
              ${data.totalValueM.toFixed(1)}M <span className="text-white/20">tracked</span>
            </span>
            <span className="font-mono text-[9px] text-[#00d4ff]/70">
              {data.awardCount} <span className="text-white/20">awards</span>
            </span>
            <span className="font-mono text-[9px] text-[#ffb800]/70">
              {data.solicitationCount} <span className="text-white/20">solicitations</span>
            </span>
          </div>
          {data.topAgency && (
            <p className="font-mono text-[8px] text-white/15 mt-1">
              TOP AGENCY: {data.topAgency}
            </p>
          )}
        </div>
      )}

      {/* Type filter pills */}
      <div className="flex gap-1 px-2 py-1.5 border-b border-white/5 overflow-x-auto shrink-0 scrollbar-none">
        {CONTRACT_FILTERS.map((filter) => {
          const isActive = activeFilter === filter;
          const color = filter === 'ALL' ? '#00d4ff'
            : filter === 'AWARDS' ? '#00ff88'
            : filter === 'SOLICITATIONS' ? '#00d4ff'
            : '#ffb800';
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`shrink-0 px-1.5 py-0.5 font-mono text-[8px] rounded-sm transition-all whitespace-nowrap ${
                isActive
                  ? 'text-black font-bold'
                  : 'text-white/30 hover:text-white/60 bg-white/5'
              }`}
              style={isActive ? { backgroundColor: color } : {}}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* Awards list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4">
            <p className="font-mono text-[10px] text-white/25">No contract data available.</p>
          </div>
        ) : (
          filtered.map((award) => {
            const srcColor = CONTRACT_SOURCE_COLORS[award.source] ?? '#00d4ff';
            const srcLabel = CONTRACT_SOURCE_LABELS[award.source] ?? (award.source ?? '').toUpperCase();
            const typeColor = CONTRACT_TYPE_COLORS[award.type] ?? '#00d4ff';

            return (
              <div key={award.id} className="px-3 py-2 border-b border-white/5 hover:bg-white/3 transition-colors">
                {/* Row 1: Source badge + Type badge */}
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-mono text-[7px] tracking-wider px-1 py-px rounded-sm font-bold"
                    style={{ backgroundColor: srcColor + '20', color: srcColor }}
                  >
                    {srcLabel}
                  </span>
                  <span
                    className="font-mono text-[7px] tracking-wider px-1 py-px rounded-sm font-bold"
                    style={{ backgroundColor: typeColor + '20', color: typeColor }}
                  >
                    {(award.type ?? '').toUpperCase()}
                  </span>
                  {award.source === 'sbir' && award.phase && (
                    <span className="font-mono text-[7px] px-1 py-px rounded-sm bg-[#ffd700]/15 text-[#ffd700] font-bold">
                      {award.phase}
                    </span>
                  )}
                  <span className="ml-auto font-mono text-[8px] text-white/15">
                    {timeAgo(award.awardDate)}
                  </span>
                </div>

                {/* Title */}
                <p className="font-mono text-[10px] text-white/50 mt-1 leading-snug line-clamp-2">
                  {award.title}
                </p>

                {/* Vendor */}
                <p className="font-mono text-[9px] text-white/35 mt-0.5">{award.vendor}</p>

                {/* Amount + Agency + NAICS */}
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span
                    className="font-mono text-[9px] font-bold"
                    style={{ color: award.amount != null ? '#00ff88' : '#ffffff33' }}
                  >
                    {formatUsd(award.amount)}
                  </span>
                  <span className="font-mono text-[8px] text-white/25 truncate max-w-[100px]">
                    {award.agency}
                  </span>
                  {award.naicsCode && (
                    <span className="font-mono text-[7px] px-1 py-px rounded-sm bg-white/5 text-white/25">
                      NAICS {award.naicsCode}
                    </span>
                  )}
                  {award.url && (
                    <a
                      href={award.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto font-mono text-[8px] text-[#00d4ff]/60 hover:text-[#00d4ff] transition-colors"
                    >
                      OPEN
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-white/5 shrink-0">
        <p className="font-mono text-[8px] text-white/15">
          SAM.gov + USASpending + SBIR.gov · 15min refresh
        </p>
      </div>
    </div>
  );
}
