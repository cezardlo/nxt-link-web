'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { IKERPanel } from '@/components/IKERPanel';
import { SectorMomentumBoard } from '@/components/SectorMomentumBoard';
import { SignalsFeed } from '@/components/SignalsFeed';
import type { SectorScore } from '@/lib/intelligence/signal-engine';
import type { FlightPoint, FlightCategory } from '@/components/MapCanvas';
import { NXT_ENTITIES } from '@/lib/intelligence/nxt-entities';

export type SelectedPoint = {
  id: string;
  label: string;
  category: string;
  entity_id?: string;
  layer?: string;
};

type BriefingData = {
  movement?: string[];
  risk?: string[];
  opportunity?: string[];
  briefing?: string;
  _provider?: string;
};

type VendorDetail = {
  id?: string;
  name?: string;
  description?: string;
  website?: string;
  tags?: string[];
  evidence?: string[];
  category?: string;
  ikerScore?: number;
};

type Tab = 'briefing' | 'dossier' | 'iker' | 'feeds' | 'flights' | 'market' | 'momentum' | 'opportunities' | 'contracts' | 'signals';

type Props = {
  selectedPoint: SelectedPoint | null;
  missionBriefing: BriefingData | null;
  briefingLoading: boolean;
  sectorScores?: SectorScore[];
  flights?: FlightPoint[];
  onMobileClose?: () => void;
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'briefing', label: 'BRIEF' },
  { id: 'dossier',  label: 'DOSSR' },
  { id: 'iker',     label: 'IKER'  },
  { id: 'feeds',    label: 'FEEDS' },
  { id: 'signals',  label: 'SGNLS' },
  { id: 'flights',  label: 'FLT'   },
  { id: 'opportunities', label: 'OPPS' },
  { id: 'contracts', label: 'CNTRCT' },
  { id: 'market',   label: 'MKT'   },
  { id: 'momentum', label: 'MTM'   },
];

export function MapRightPanel({ selectedPoint, missionBriefing, briefingLoading, sectorScores, flights = [], onMobileClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('briefing');
  const [vendorDetail, setVendorDetail] = useState<VendorDetail | null>(null);
  const [vendorLoading, setVendorLoading] = useState(false);

  useEffect(() => {
    if (!selectedPoint) return;
    setActiveTab('dossier');

    const entityId = selectedPoint.entity_id ?? selectedPoint.id;
    let cancelled = false;
    setVendorLoading(true);

    fetch(`/api/intel/api/vendors/${entityId}`)
      .then((r) => r.json())
      .then((d: VendorDetail) => { if (!cancelled) setVendorDetail(d); })
      .catch(() => {
        if (!cancelled) setVendorDetail({ name: selectedPoint.label, category: selectedPoint.category });
      })
      .finally(() => { if (!cancelled) setVendorLoading(false); });

    return () => { cancelled = true; };
  }, [selectedPoint]);

  return (
    <div className="w-full md:w-72 flex flex-col bg-black/96 md:bg-black/80 border-l border-white/[0.05] backdrop-blur-md h-full pt-11 md:pt-0">
      {/* Mobile drag handle + close */}
      {onMobileClose && (
        <>
          <div className="md:hidden shrink-0 flex justify-center pt-2 pb-1">
            <div className="w-8 h-0.5 rounded-full bg-white/15" />
          </div>
          <div className="md:hidden flex items-center justify-between px-3 py-1 border-b border-white/[0.05] shrink-0">
            <span className="font-mono text-[8px] tracking-[0.3em] text-white/20 uppercase">Intel Panel</span>
            <button
              onClick={onMobileClose}
              className="font-mono text-[10px] text-white/25 hover:text-white/60 transition-colors px-2 py-1"
            >
              ✕
            </button>
          </div>
        </>
      )}
      {/* Tab bar — Bloomberg-style compact tabs */}
      <div className="flex border-b border-white/[0.05] shrink-0 overflow-x-auto scrollbar-thin bg-black/40">
        {TABS.map((tab) => {
          const accentColor = tab.id === 'signals' ? '#f97316' : '#00d4ff';
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 flex-1 py-2 font-mono text-[8px] tracking-[0.15em] transition-all duration-150 min-w-[2.8rem] relative ${
                activeTab === tab.id
                  ? 'font-bold'
                  : 'text-white/18 hover:text-white/40'
              }`}
              style={activeTab === tab.id ? { color: accentColor } : {}}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-px"
                  style={{ background: accentColor, boxShadow: `0 0 4px ${accentColor}cc` }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {activeTab === 'briefing' && (
          <BriefingTab data={missionBriefing} loading={briefingLoading} />
        )}
        {activeTab === 'dossier' && (
          <DossierTab point={selectedPoint} detail={vendorDetail} loading={vendorLoading} />
        )}
        {activeTab === 'iker' && (
          <IKERPanel vendorId={selectedPoint?.entity_id ?? selectedPoint?.id} />
        )}
        {activeTab === 'feeds' && <FeedsTab />}
        {activeTab === 'signals' && <SignalsFeed />}
        {activeTab === 'flights' && <FlightsDirectoryTab flights={flights} />}
        {activeTab === 'opportunities' && <OpportunitiesTab />}
        {activeTab === 'contracts' && <ContractsTab />}
        {activeTab === 'market' && <MarketTab />}
        {activeTab === 'momentum' && <SectorMomentumBoard scores={sectorScores ?? []} />}
      </div>
    </div>
  );
}

// WorldMonitor-style Strategic Posture Assessment for El Paso
// Shows sector readiness bars based on average IKER scores from vendor data
const EL_PASO_SECTORS = [
  { label: 'DEFENSE',     score: 88, color: '#ff8c00' },
  { label: 'LOGISTICS',   score: 78, color: '#00d4ff' },
  { label: 'BORDER TECH', score: 68, color: '#a78bfa' },
  { label: 'ENERGY',      score: 80, color: '#fbbf24' },
  { label: 'HEALTH TECH', score: 73, color: '#00ff88' },
];

function PostureWidget() {
  const overall = Math.round(EL_PASO_SECTORS.reduce((sum, s) => sum + s.score, 0) / EL_PASO_SECTORS.length);
  const statusColor = overall >= 80 ? '#00ff88' : overall >= 65 ? '#00d4ff' : '#ff8c00';

  return (
    <div className="border border-white/[0.05] rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/[0.015] border-b border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: statusColor, boxShadow: `0 0 4px ${statusColor}cc` }} />
          <span className="font-mono text-[8px] tracking-[0.25em] text-white/20 uppercase">EP Sector Posture</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-mono text-[11px] font-black tabular-nums" style={{ color: statusColor }}>{overall}</span>
          <span className="font-mono text-[7px] text-white/15">/100</span>
        </div>
      </div>
      {/* Sectors */}
      <div className="flex flex-col gap-0 px-3 py-2">
        {EL_PASO_SECTORS.map((sector) => (
          <div key={sector.label} className="flex items-center gap-2 py-1">
            <span className="font-mono text-[7px] text-white/25 w-[72px] shrink-0 tracking-wider">{sector.label}</span>
            <div className="flex-1 h-0.5 bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${sector.score}%`, backgroundColor: sector.color, boxShadow: `0 0 4px ${sector.color}44` }}
              />
            </div>
            <span
              className="font-mono text-[8px] w-5 text-right shrink-0 tabular-nums font-bold"
              style={{ color: `${sector.color}88` }}
            >
              {sector.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton({ label }: { label: string }) {
  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-1 h-1 rounded-full bg-[#00d4ff] animate-pulse" style={{ boxShadow: '0 0 4px #00d4ffcc' }} />
        <span className="font-mono text-[8px] tracking-[0.3em] text-white/20 uppercase">{label}</span>
      </div>
      {/* Skeleton lines */}
      <div className="h-2 w-full rounded-sm shimmer" />
      <div className="h-2 w-5/6 rounded-sm shimmer" />
      <div className="h-2 w-4/5 rounded-sm shimmer" />
      <div className="mt-2 h-2 w-full rounded-sm shimmer" />
      <div className="h-2 w-3/4 rounded-sm shimmer" />
      <div className="mt-2 h-2 w-full rounded-sm shimmer" />
      <div className="h-2 w-5/6 rounded-sm shimmer" />
    </div>
  );
}

function BriefingTab({ data, loading }: { data: BriefingData | null; loading: boolean }) {
  if (loading) {
    return <LoadingSkeleton label="ANALYZING MISSION" />;
  }

  if (!data) {
    return (
      <div className="p-4 flex flex-col gap-3">
        {/* Status header */}
        <div className="flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span className="font-mono text-[8px] tracking-[0.3em] text-white/15 uppercase">AWAITING MISSION</span>
        </div>
        <p className="font-mono text-[9px] text-white/25 leading-relaxed">
          Type a mission query in the top bar and press RUN to generate an AI intelligence briefing.
        </p>

        {/* Example queries */}
        <div className="mt-1 border border-white/[0.05] rounded-sm overflow-hidden">
          <div className="px-2.5 py-1.5 border-b border-white/[0.04] bg-white/[0.015]">
            <span className="font-mono text-[8px] text-white/15 tracking-[0.2em] uppercase">Example Queries</span>
          </div>
          {[
            'route optimization tech for logistics',
            'water management solutions El Paso',
            'AI vendors in manufacturing sector',
          ].map((ex) => (
            <div key={ex} className="flex items-center gap-2 px-2.5 py-1.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
              <span className="text-[#00d4ff]/40 text-[8px] shrink-0">›</span>
              <span className="font-mono text-[9px] text-white/28">{ex}</span>
            </div>
          ))}
        </div>

        <div className="mt-1">
          <PostureWidget />
        </div>
      </div>
    );
  }

  const providerLabel = data._provider === 'static' ? 'CURATED' : data._provider ? data._provider.toUpperCase() : 'AI';

  return (
    <div className="flex flex-col gap-3 p-4">
      {data.briefing && (
        <div className="border border-white/[0.05] rounded-sm p-3 bg-white/[0.015]">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-1 h-1 rounded-full bg-[#00d4ff]" style={{ boxShadow: '0 0 4px #00d4ffcc' }} />
            <span className="font-mono text-[8px] tracking-[0.25em] text-[#00d4ff]/60 uppercase">Intel Briefing</span>
            <span
              className="ml-auto font-mono text-[7px] px-1.5 py-px rounded-sm tracking-wider"
              style={{ color: '#00d4ff88', background: '#00d4ff12', border: '1px solid #00d4ff22' }}
            >
              {providerLabel}
            </span>
          </div>
          <p className="font-mono text-[9px] text-white/40 leading-relaxed">{data.briefing}</p>
        </div>
      )}
      <BulletSection label="MOVEMENT" bullets={data.movement ?? []} color="#00d4ff" />
      <BulletSection label="RISK" bullets={data.risk ?? []} color="#ff3b30" />
      <BulletSection label="OPPORTUNITY" bullets={data.opportunity ?? []} color="#00ff88" />
      <div className="mt-1">
        <PostureWidget />
      </div>
    </div>
  );
}

function BulletSection({ label, bullets, color }: { label: string; bullets: string[]; color: string }) {
  if (bullets.length === 0) return null;
  return (
    <div className="border border-white/[0.04] rounded-sm overflow-hidden">
      {/* Section header */}
      <div
        className="px-2.5 py-1.5 flex items-center gap-2"
        style={{ background: `${color}0a`, borderBottom: `1px solid ${color}20` }}
      >
        <span
          className="w-1 h-1 rounded-full shrink-0"
          style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}cc` }}
        />
        <span className="font-mono text-[8px] tracking-[0.25em] font-bold" style={{ color: `${color}bb` }}>
          {label}
        </span>
        <span
          className="ml-auto font-mono text-[7px] px-1 py-px rounded-sm font-bold"
          style={{ color, background: `${color}18` }}
        >
          {bullets.length}
        </span>
      </div>
      <ul className="flex flex-col">
        {bullets.map((b, i) => (
          <li
            key={i}
            className="flex gap-2 px-2.5 py-1.5 text-[9px] font-mono text-white/38 leading-relaxed border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
          >
            <span style={{ color, opacity: 0.5 }} className="shrink-0 mt-px">›</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Contract types & helpers (shared by DossierTab + ContractsTab) ──────────

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

const CONTRACT_TYPE_COLORS: Record<string, string> = {
  award: '#00ff88',
  solicitation: '#00d4ff',
  grant: '#ffb800',
};

function formatContractAmount(amount: number | null): string {
  if (amount == null) return 'undisclosed';
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

// ─────────────────────────────────────────────────────────────────────────────

function DossierTab({
  point,
  detail,
  loading,
}: {
  point: SelectedPoint | null;
  detail: VendorDetail | null;
  loading: boolean;
}) {
  const [matchingContracts, setMatchingContracts] = useState<ContractAward[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);

  useEffect(() => {
    if (!point) {
      setMatchingContracts([]);
      return;
    }

    const rawId = point.entity_id ?? point.id;
    // NXT_ENTITIES uses bare IDs (e.g. 'l3harris'); EL_PASO_STUBS uses 'ep-l3harris'
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
        const matches = d.awards.filter((a) => a.naicsCode && naicsSet.has(a.naicsCode));
        setMatchingContracts(matches.slice(0, 5));
      })
      .catch(() => {
        if (!cancelled) setMatchingContracts([]);
      })
      .finally(() => {
        if (!cancelled) setContractsLoading(false);
      });

    return () => { cancelled = true; };
  }, [point]);

  if (!point) {
    return (
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-white/15" />
          <span className="font-mono text-[8px] tracking-[0.3em] text-white/15 uppercase">No Selection</span>
        </div>
        <p className="font-mono text-[9px] text-white/30 leading-relaxed">
          Click a vendor dot on the map to load their dossier — name, category, IKER score, evidence, and matched government contracts.
        </p>
        <div className="border border-white/[0.05] rounded-sm overflow-hidden">
          <div className="px-2.5 py-1.5 border-b border-white/[0.04] bg-white/[0.015]">
            <span className="font-mono text-[8px] text-white/15 tracking-[0.2em] uppercase">How to select</span>
          </div>
          {([
            'Enable VENDORS or MOMENTUM layer in the left panel',
            'Click a glowing dot on the map',
            'This tab auto-opens with full dossier',
          ] as const).map((step, i) => (
            <div key={i} className="flex items-start gap-2 px-2.5 py-1.5 border-b border-white/[0.04] last:border-0">
              <span className="font-mono text-[8px] text-[#00d4ff]/30 shrink-0 mt-px">{i + 1}.</span>
              <span className="font-mono text-[9px] text-white/25 leading-snug">{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSkeleton label="LOADING DOSSIER" />;
  }

  const name = detail?.name ?? point.label;
  const category = detail?.category ?? point.category;
  const tags = detail?.tags ?? [];
  const evidence = detail?.evidence ?? [];
  const website = detail?.website;

  // Look up NAICS codes for the current entity (for display in the matching section)
  // Strip 'ep-' prefix so IDs align with NXT_ENTITIES (e.g. 'ep-l3harris' → 'l3harris')
  const rawEntityId = point.entity_id ?? point.id;
  const nxtEntityId = rawEntityId.startsWith('ep-') ? rawEntityId.slice(3) : rawEntityId;
  const entity = NXT_ENTITIES.find((e) => e.id === nxtEntityId);
  const entityNaics = entity?.naicsCodes ?? [];

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Header card */}
      <div className="border border-white/[0.06] rounded-sm overflow-hidden bg-white/[0.015]">
        <div className="h-px" style={{ background: 'linear-gradient(90deg, #00d4ff44, transparent)' }} />
        <div className="p-3 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="font-mono text-[12px] font-bold text-white/90 leading-snug">{name}</h2>
              {category && (
                <p className="font-mono text-[9px] text-[#00d4ff]/50 mt-0.5 tracking-wider uppercase">{category}</p>
              )}
              {detail?.ikerScore !== undefined && (
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="font-mono text-[8px] tracking-widest text-white/20 uppercase">IKER</span>
                  <span
                    className="font-mono text-[13px] font-black tabular-nums"
                    style={{
                      color: detail.ikerScore >= 80 ? '#ffd700' : detail.ikerScore >= 65 ? '#00d4ff' : '#ff8c00',
                      textShadow: detail.ikerScore >= 80 ? '0 0 8px #ffd700aa' : detail.ikerScore >= 65 ? '0 0 8px #00d4ffaa' : '0 0 8px #ff8c00aa',
                    }}
                  >
                    {detail.ikerScore}
                  </span>
                  <span className="font-mono text-[8px] text-white/20">/100</span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {point.layer && (
                <span className="font-mono text-[7px] tracking-widest px-1.5 py-0.5 rounded-sm border border-white/[0.08] text-white/25">
                  {point.layer.toUpperCase()}
                </span>
              )}
              <Link
                href={`/vendor/${point.entity_id ?? point.id}`}
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
              className="font-mono text-[8px] text-emerald-400/50 hover:text-emerald-400 transition-colors truncate"
            >
              {website}
            </a>
          )}
        </div>
      </div>

      {detail?.description && (
        <p className="font-mono text-[9px] text-white/32 leading-relaxed">{detail.description}</p>
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

      {evidence.length > 0 && (
        <div className="border border-white/[0.04] rounded-sm overflow-hidden">
          <div className="px-2.5 py-1.5 border-b border-white/[0.04] bg-white/[0.01]">
            <span className="font-mono text-[8px] tracking-[0.25em] text-white/18 uppercase">Evidence</span>
          </div>
          <ul className="flex flex-col">
            {evidence.slice(0, 4).map((e, i) => (
              <li key={i} className="font-mono text-[9px] text-white/28 border-b border-white/[0.03] last:border-0 px-2.5 py-2 leading-relaxed hover:bg-white/[0.02] transition-colors">
                <span className="text-[#00d4ff]/30 mr-1.5">›</span>{e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* SAM OPPORTUNITIES — NAICS matching */}
      {contractsLoading && (
        <div className="flex items-center gap-2 py-2">
          <span className="w-1 h-1 rounded-full bg-[#00d4ff] animate-pulse" />
          <span className="font-mono text-[9px] text-white/20">Loading contract matches...</span>
        </div>
      )}

      {!contractsLoading && matchingContracts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-[9px] tracking-[0.2em] text-[#00d4ff]/70">SAM OPPORTUNITIES</p>
            <span className="font-mono text-[8px] px-1 py-px rounded-sm bg-[#00d4ff]/15 text-[#00d4ff]/80 font-bold">
              {matchingContracts.length} NAICS MATCHES
            </span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {matchingContracts.map((c) => {
              const typeColor = CONTRACT_TYPE_COLORS[c.type] ?? '#00d4ff';
              const matchedCode = entityNaics.find((code) => code === c.naicsCode);

              return (
                <li key={c.id} className="border border-white/5 rounded-sm p-2 hover:bg-white/3 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="font-mono text-[7px] tracking-wider px-1 py-px rounded-sm font-bold"
                      style={{ backgroundColor: typeColor + '20', color: typeColor }}
                    >
                      {c.type.toUpperCase()}
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
                      {formatContractAmount(c.amount)}
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

type SourceHealthItem = { id: string; name: string; status: 'ok' | 'failed'; itemCount: number };
type FeedItem = {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  score?: number;
  sentiment?: string;
  category?: string;
  description?: string;
  vendor?: string;
};
type FeedsApiResponse = {
  ok?: boolean;
  all?: FeedItem[];
  sourceHealth?: SourceHealthItem[];
  source_count?: number;
  as_of?: string;
  enriched?: boolean;
};

const FEED_CATEGORIES = ['ALL', 'AI/ML', 'Cybersecurity', 'Defense', 'Enterprise', 'Supply Chain', 'Energy', 'Finance', 'Crime', 'General'] as const;
const CATEGORY_COLOR: Record<string, string> = {
  'AI/ML':        '#00d4ff',
  'Cybersecurity':'#ff3b30',
  'Defense':      '#ff8c00',
  'Enterprise':   '#00ff88',
  'Supply Chain': '#a78bfa',
  'Energy':       '#fbbf24',
  'Finance':      '#34d399',
  'Crime':        '#f97316',
  'General':      '#6b7280',
};

const SENTIMENT_COLOR: Record<string, string> = {
  positive: '#00ff88',
  negative: '#ff3b30',
  neutral: '#ffffff',
};

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  if (isNaN(ms)) return '';
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// WorldMonitor-style trending keyword spike detection
// Compares recent (2h) word frequency vs baseline to surface surging terms
const STOP_WORDS = new Set([
  'the','a','an','and','or','in','on','at','to','for','of','with','by','from','is','are',
  'was','were','be','been','have','has','had','do','does','did','will','would','could',
  'should','may','might','this','that','these','those','it','as','up','out','over','into',
  'after','before','about','more','new','like','just','says','said','report','reports',
  'after','between','through','while','than','then','also','but','not','what','when',
]);

function computeTrendingKeywords(items: FeedItem[]): string[] {
  const now = Date.now();
  const RECENT_MS = 2 * 60 * 60 * 1000; // 2-hour window vs baseline

  const allCounts: Record<string, number> = {};
  const recentCounts: Record<string, number> = {};
  let recentItemCount = 0;

  for (const item of items) {
    const isRecent = !item.pubDate || (now - new Date(item.pubDate).getTime()) < RECENT_MS;
    if (isRecent) recentItemCount++;

    const words = item.title
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

    for (const word of words) {
      allCounts[word] = (allCounts[word] ?? 0) + 1;
      if (isRecent) recentCounts[word] = (recentCounts[word] ?? 0) + 1;
    }
  }

  if (recentItemCount === 0 || items.length === 0) return [];

  const baselineFraction = recentItemCount / items.length;
  const spikes: [string, number][] = [];

  for (const [word, recentCount] of Object.entries(recentCounts)) {
    if (recentCount < 2) continue;
    const allCount = allCounts[word] ?? recentCount;
    const expectedCount = allCount * baselineFraction;
    const spikeFactor = recentCount / Math.max(expectedCount, 0.5);
    if (spikeFactor >= 1.8) spikes.push([word, spikeFactor]);
  }

  return spikes
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word);
}

function FeedsTab() {
  const [data, setData] = useState<FeedsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [keywordFilter, setKeywordFilter] = useState<string | null>(null);

  const load = (force = false) => {
    if (force) setRefreshing(true); else setLoading(true);
    const req = force
      ? fetch('/api/feeds', { method: 'POST' })
      : fetch('/api/feeds');
    req
      .then((r) => r.json())
      .then((d: FeedsApiResponse) => setData(d))
      .catch(() => setData(null))
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <LoadingSkeleton label="FETCHING FEEDS" />;
  }

  const allItems = data?.all ?? [];
  const health = data?.sourceHealth ?? [];
  const liveCount = health.filter((s) => s.status === 'ok').length;
  const categoryFiltered = activeCategory === 'ALL' ? allItems : allItems.filter((i) => i.category === activeCategory);
  const items = keywordFilter
    ? categoryFiltered.filter((i) => i.title.toLowerCase().includes(keywordFilter.toLowerCase()))
    : categoryFiltered;
  const trendingKeywords = allItems.length >= 5 ? computeTrendingKeywords(allItems) : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
        <span className="font-mono text-[9px] tracking-[0.15em] text-white/25">
          {items.length}/{allItems.length} SIGNALS
          {keywordFilter && <span className="text-[#ff8c00]/60"> · &quot;{keywordFilter}&quot;</span>}
          {liveCount > 0 && (
            <> — <span className="text-emerald-400">{liveCount}</span>/{health.length} LIVE</>
          )}
          {data?.enriched && <span className="ml-1.5 text-[#00d4ff]/50">GEMINI ✓</span>}
        </span>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="font-mono text-[9px] text-white/20 hover:text-[#00d4ff]/60 transition-colors disabled:opacity-30"
        >
          {refreshing ? '···' : '↻ REFRESH'}
        </button>
      </div>

      {/* Category filter bar */}
      <div className="flex gap-1 px-2 py-1.5 border-b border-white/5 overflow-x-auto shrink-0 scrollbar-none">
        {FEED_CATEGORIES.map((cat) => {
          const count = cat === 'ALL' ? allItems.length : allItems.filter((i) => i.category === cat).length;
          if (count === 0 && cat !== 'ALL' && cat !== 'Crime') return null;
          return (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setKeywordFilter(null); }}
              className={`shrink-0 px-1.5 py-0.5 font-mono text-[8px] rounded-sm transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'text-black font-bold'
                  : 'text-white/30 hover:text-white/60 bg-white/5'
              }`}
              style={activeCategory === cat
                ? { backgroundColor: cat === 'ALL' ? '#00d4ff' : (CATEGORY_COLOR[cat] ?? '#00d4ff') }
                : {}}
            >
              {cat} {count > 0 && <span className="opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* WorldMonitor-style trending keyword spike chips */}
      {trendingKeywords.length > 0 && (
        <div className="px-2 py-1.5 border-b border-white/5 flex items-center gap-1.5 shrink-0 flex-wrap">
          <span className="font-mono text-[8px] text-white/15 shrink-0">TRENDING ▲</span>
          {trendingKeywords.map((kw) => (
            <button
              key={kw}
              onClick={() => setKeywordFilter((prev) => prev === kw ? null : kw)}
              className={`font-mono text-[8px] px-1.5 py-0.5 rounded-sm border transition-colors ${
                keywordFilter === kw
                  ? 'bg-[#ff8c00]/30 border-[#ff8c00]/50 text-[#ff8c00]'
                  : 'bg-[#ff8c00]/10 border-[#ff8c00]/20 text-[#ff8c00]/70 hover:bg-[#ff8c00]/20'
              }`}
            >
              {kw}
            </button>
          ))}
        </div>
      )}

      {/* Feed items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-4 font-mono text-[10px] text-white/20">No feed data. Click ↻ REFRESH to fetch.</div>
        ) : (
          items.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-0.5 px-3 py-2 border-b border-white/4 hover:bg-white/3 transition-colors group"
            >
              {/* Source + score + category dot + time */}
              <div className="flex items-center gap-1.5">
                {item.category && item.category !== 'General' && (
                  <span
                    className="w-1 h-1 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLOR[item.category] ?? '#6b7280' }}
                  />
                )}
                <span className="font-mono text-[8px] px-1 py-px rounded-sm bg-white/5 text-white/30 shrink-0">
                  {item.source}
                </span>
                {item.vendor && (
                  <span className="font-mono text-[8px] px-1 py-px rounded-sm bg-[#ff8c00]/10 text-[#ff8c00]/70 shrink-0 max-w-[70px] truncate">
                    {item.vendor}
                  </span>
                )}
                {item.score !== undefined && item.score > 0 && (
                  <span
                    className="font-mono text-[8px] shrink-0"
                    style={{ color: item.score >= 7 ? '#ff8c00' : item.score >= 4 ? '#00d4ff' : '#ffffff33' }}
                  >
                    {item.score}
                  </span>
                )}
                {item.sentiment && item.sentiment !== 'neutral' && (
                  <span
                    className="font-mono text-[8px] shrink-0"
                    style={{ color: SENTIMENT_COLOR[item.sentiment] ?? '#fff', opacity: 0.5 }}
                  >
                    {item.sentiment === 'positive' ? '▲' : '▼'}
                  </span>
                )}
                <span className="ml-auto font-mono text-[8px] text-white/15 shrink-0">
                  {timeAgo(item.pubDate)}
                </span>
              </div>
              {/* Title */}
              <p className="font-mono text-[10px] text-white/50 group-hover:text-white/70 leading-snug line-clamp-2 transition-colors">
                {item.title}
              </p>
              {/* Description snippet */}
              {item.description && (
                <p className="font-mono text-[9px] text-white/25 leading-snug line-clamp-1">
                  {item.description}
                </p>
              )}
            </a>
          ))
        )}
      </div>

      {/* Source health toggle */}
      {health.length > 0 && (
        <div className="border-t border-white/5 shrink-0">
          <button
            onClick={() => setShowHealth((v) => !v)}
            className="w-full px-3 py-1.5 font-mono text-[9px] text-white/20 hover:text-white/40 text-left transition-colors flex items-center gap-1"
          >
            <span>{showHealth ? '▾' : '▸'}</span>
            <span>SOURCE HEALTH ({liveCount}/{health.length})</span>
          </button>
          {showHealth && (
            <div className="px-3 pb-2 flex flex-col gap-0">
              {health.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-1 border-b border-white/4 last:border-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500/60'}`} />
                    <span className="font-mono text-[9px] text-white/40">{s.name}</span>
                  </div>
                  <span className="font-mono text-[8px] text-white/20">
                    {s.status === 'ok' ? `${s.itemCount}` : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── FLIGHTS DIRECTORY tab ────────────────────────────────────────────────────

const FLIGHT_CAT_COLORS: Record<FlightCategory, string> = {
  VIP:        '#ff0080',
  MILITARY:   '#ff6400',
  CARGO:      '#7878a0',
  COMMERCIAL: '#ffb800',
  PRIVATE:    '#50506e',
};

const FLIGHT_CATEGORIES = ['ALL', 'VIP', 'MILITARY', 'CARGO', 'COMMERCIAL', 'PRIVATE'] as const;

function headingToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8] ?? 'N';
}

const EMERGENCY_SQUAWKS = new Set(['7500', '7600', '7700']);

function FlightsDirectoryTab({ flights }: { flights: FlightPoint[] }) {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const categoryFiltered = activeCategory === 'ALL'
    ? flights
    : flights.filter((f) => f.category === activeCategory);
  const filtered = search
    ? categoryFiltered.filter((f) => f.callsign.toLowerCase().includes(search.toLowerCase()) || f.operator.toLowerCase().includes(search.toLowerCase()))
    : categoryFiltered;

  // Sort: VIP first, then military, then by altitude descending
  const sorted = [...filtered].sort((a, b) => {
    const order: Record<string, number> = { VIP: 0, MILITARY: 1, CARGO: 2, COMMERCIAL: 3, PRIVATE: 4 };
    const diff = (order[a.category] ?? 5) - (order[b.category] ?? 5);
    if (diff !== 0) return diff;
    return b.altitudeFt - a.altitudeFt;
  });

  // Category counts
  const counts: Record<string, number> = { ALL: flights.length };
  for (const f of flights) counts[f.category] = (counts[f.category] ?? 0) + 1;

  return (
    <div className="flex flex-col h-full">
      {/* Header with category breakdown */}
      <div className="px-3 py-2 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] tracking-[0.15em] text-white/25">AIRCRAFT DIRECTORY</span>
          <span className="font-mono text-[9px] text-white/30">{flights.length > 0 ? `${flights.length} LIVE` : ''}</span>
        </div>
        {flights.length > 0 && (
          <div className="flex items-center gap-2 mt-1">
            {(['COMMERCIAL', 'MILITARY', 'VIP', 'CARGO', 'PRIVATE'] as const).map((cat) => {
              const count = flights.filter((f) => f.category === cat).length;
              if (count === 0) return null;
              const label = cat === 'COMMERCIAL' ? 'COMM' : cat === 'MILITARY' ? 'MIL' : cat;
              return (
                <span key={cat} className="font-mono text-[8px]" style={{ color: FLIGHT_CAT_COLORS[cat] }}>
                  {count} {label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Category filter pills */}
      <div className="flex gap-1 px-2 py-1.5 border-b border-white/5 overflow-x-auto shrink-0 scrollbar-none">
        {FLIGHT_CATEGORIES.map((cat) => {
          const count = counts[cat] ?? 0;
          if (count === 0 && cat !== 'ALL') return null;
          const color = cat === 'ALL' ? '#ffb800' : FLIGHT_CAT_COLORS[cat as FlightCategory];
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-1.5 py-0.5 font-mono text-[8px] rounded-sm transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'text-black font-bold'
                  : 'text-white/30 hover:text-white/60 bg-white/5'
              }`}
              style={activeCategory === cat ? { backgroundColor: color } : {}}
            >
              {cat} {count > 0 && <span className="opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Callsign search */}
      <div className="px-2 py-1.5 border-b border-white/5 shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search callsign or operator..."
          className="w-full bg-white/5 border border-white/8 rounded-sm px-2 py-1 font-mono text-[9px] text-white/60 placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
        />
      </div>

      {/* Aircraft list */}
      <div className="flex-1 overflow-y-auto">
        {flights.length === 0 ? (
          <div className="p-4 flex flex-col gap-2">
            <p className="font-mono text-[10px] text-white/25">No aircraft tracked.</p>
            <p className="font-mono text-[9px] text-white/15 leading-relaxed">
              Enable the FLIGHTS or MILITARY layer to track live aircraft over El Paso.
            </p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-4">
            <p className="font-mono text-[10px] text-white/25">No aircraft in this category.</p>
          </div>
        ) : (
          sorted.map((f) => {
            const catColor = FLIGHT_CAT_COLORS[f.category];
            const isEmergency = EMERGENCY_SQUAWKS.has(f.squawk);
            const phaseIcon = f.phase === 'CLIMBING' ? '\u2197' : f.phase === 'DESCENDING' ? '\u2198' : '\u2192';
            const phaseColor = f.phase === 'CLIMBING' ? '#00ff88' : f.phase === 'DESCENDING' ? '#ff3b30' : '#ffffff33';

            return (
              <div key={f.id} className="px-3 py-2 border-b border-white/5 hover:bg-white/3 transition-colors">
                {/* Row 1: Category badge + Callsign + Squawk */}
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-mono text-[7px] tracking-wider px-1 py-px rounded-sm font-bold"
                    style={{ backgroundColor: catColor + '25', color: catColor }}
                  >
                    {f.category}
                  </span>
                  <span className="font-mono text-xs font-bold text-white/80">{f.callsign}</span>
                  {f.approachingELP && (
                    <span className="font-mono text-[7px] px-1 py-px rounded-sm bg-[#00ff88]/15 text-[#00ff88] font-bold">
                      APPROACH ELP
                    </span>
                  )}
                  {isEmergency && (
                    <span className="font-mono text-[7px] px-1 py-px rounded-sm bg-red-500/20 text-red-400 font-bold animate-pulse">
                      SQUAWK {f.squawk}
                    </span>
                  )}
                  {f.squawk && !isEmergency && (
                    <span className="ml-auto font-mono text-[8px] text-white/15">{f.squawk}</span>
                  )}
                </div>

                {/* Row 2: Operator + Country */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[9px] text-white/40">{f.operator}</span>
                  {f.country && (
                    <span className="ml-auto font-mono text-[8px] text-white/20 truncate max-w-[80px]">{f.country}</span>
                  )}
                </div>

                {/* Row 3: Alt + Speed + Heading + Phase */}
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono text-[9px] text-white/30">
                    {f.altitudeFt.toLocaleString()} <span className="text-white/15">ft</span>
                  </span>
                  <span className="font-mono text-[9px] text-white/30">
                    {f.velocityKts} <span className="text-white/15">kts</span>
                  </span>
                  <span className="font-mono text-[9px] text-white/30">
                    {headingToCompass(f.headingDeg)} {f.headingDeg}°
                  </span>
                  <span className="ml-auto font-mono text-[9px] flex items-center gap-0.5" style={{ color: phaseColor }}>
                    {phaseIcon} {f.phase}
                    {f.verticalFpm !== 0 && (
                      <span className="text-[8px] text-white/20 ml-0.5">
                        {f.verticalFpm > 0 ? '+' : ''}{f.verticalFpm}fpm
                      </span>
                    )}
                  </span>
                </div>

                {/* Row 4: ICAO24 hex */}
                <div className="mt-0.5">
                  <span className="font-mono text-[7px] text-white/10">ICAO {f.id.toUpperCase()}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer summary */}
      {flights.length > 0 && (
        <div className="px-3 py-1.5 border-t border-white/5 shrink-0">
          <p className="font-mono text-[8px] text-white/15">
            Live via OpenSky Network · 30s refresh
          </p>
        </div>
      )}
    </div>
  );
}

// ─── MARKET tab ───────────────────────────────────────────────────────────────

type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  currency: string;
  marketState: string;
};
type MarketApiResponse = { ok?: boolean; quotes?: StockQuote[]; as_of?: string };

function MarketTab() {
  const [data, setData] = useState<MarketApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = (force = false) => {
    if (force) setRefreshing(true); else setLoading(true);
    fetch('/api/market')
      .then((r) => r.json())
      .then((d: MarketApiResponse) => setData(d))
      .catch(() => setData(null))
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <LoadingSkeleton label="LOADING MARKET" />;
  }

  const quotes = data?.quotes ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
        <span className="font-mono text-[9px] tracking-[0.15em] text-white/25">
          ENTERPRISE WATCHLIST
          {data?.as_of && (
            <span className="ml-1.5 text-white/15">{timeAgo(data.as_of)}</span>
          )}
        </span>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="font-mono text-[9px] text-white/20 hover:text-[#00d4ff]/60 transition-colors disabled:opacity-30"
        >
          {refreshing ? '···' : '↻'}
        </button>
      </div>

      {/* Quote list */}
      <div className="flex-1 overflow-y-auto">
        {quotes.length === 0 ? (
          <div className="p-4 flex flex-col gap-2">
            <p className="font-mono text-[10px] text-white/25">Market data unavailable.</p>
            <p className="font-mono text-[9px] text-white/15 leading-relaxed">
              Yahoo Finance may be blocking requests. Try refreshing or check your network.
            </p>
          </div>
        ) : (
          quotes
            .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
            .map((q) => {
              const isUp = q.changePct >= 0;
              const changeColor = isUp ? '#00ff88' : '#ff3b30';
              const bigMover = Math.abs(q.changePct) >= 3;
              return (
                <div
                  key={q.symbol}
                  className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors"
                  style={{ borderLeft: bigMover ? `2px solid ${changeColor}55` : '2px solid transparent' }}
                >
                  {/* Left: symbol + name */}
                  <div className="flex flex-col min-w-0">
                    <span className="font-mono text-[11px] font-black text-white/80">{q.symbol}</span>
                    <span className="font-mono text-[7px] text-white/22 truncate max-w-[100px] tracking-wider">{q.name}</span>
                  </div>
                  {/* Right: price + change */}
                  <div className="flex flex-col items-end shrink-0">
                    <span className="font-mono text-[11px] font-bold text-white/65 tabular-nums">
                      {q.currency === 'USD' ? '$' : ''}{q.price.toFixed(2)}
                    </span>
                    <span
                      className="font-mono text-[9px] font-bold tabular-nums"
                      style={{ color: changeColor, textShadow: bigMover ? `0 0 6px ${changeColor}66` : 'none' }}
                    >
                      {isUp ? '▲' : '▼'} {Math.abs(q.changePct).toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Market state note */}
      {quotes.length > 0 && (
        <div className="px-3 py-1.5 border-t border-white/5 shrink-0">
          <p className="font-mono text-[8px] text-white/15">
            {quotes[0]?.marketState === 'REGULAR'
              ? 'Markets open · 15-min delay'
              : `Markets ${quotes[0]?.marketState?.toLowerCase() ?? 'closed'} · cached 15min`}
          </p>
        </div>
      )}
    </div>
  );
}

type OpportunitySourceId =
  | 'sam'
  | 'usaspending'
  | 'sbir'
  | 'nsf'
  | 'uspto'
  | 'bts'
  | 'ercot'
  | 'grants'
  | 'opencorporates';

type OpportunitySignal = {
  id: string;
  source: OpportunitySourceId;
  sourceLabel: string;
  whatItAdds: string;
  nxtLinkUse: string;
  headline: string;
  detectedAt: string;
  amountUsd?: number | null;
  location?: string;
  url?: string;
};

type OpportunitySourceStatus = {
  id: OpportunitySourceId;
  name: string;
  status: 'live' | 'fallback' | 'unavailable';
  count: number;
  note?: string;
};

type OpportunitiesApiResponse = {
  ok?: boolean;
  asOf?: string;
  signals?: OpportunitySignal[];
  sources?: OpportunitySourceStatus[];
};

const SOURCE_ACCENT: Record<OpportunitySourceId, string> = {
  sam: '#00d4ff',
  usaspending: '#00ff88',
  sbir: '#fbbf24',
  nsf: '#a78bfa',
  uspto: '#ff8c00',
  bts: '#60a5fa',
  ercot: '#ff3b30',
  grants: '#22c55e',
  opencorporates: '#eab308',
};

function compactUsd(value: number | null | undefined): string {
  if (value == null) return 'undisclosed';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function OpportunitiesTab() {
  const [data, setData] = useState<OpportunitiesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = (force = false) => {
    if (force) setRefreshing(true); else setLoading(true);
    fetch('/api/live/opportunities')
      .then((r) => r.json())
      .then((d: OpportunitiesApiResponse) => setData(d))
      .catch(() => setData(null))
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <LoadingSkeleton label="LOADING OPPORTUNITIES" />;
  }

  const signals = data?.signals ?? [];
  const sources = data?.sources ?? [];
  const liveCount = sources.filter((s) => s.status === 'live').length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
        <span className="font-mono text-[9px] tracking-[0.15em] text-white/25">
          OPPORTUNITY SIGNALS
          {data?.asOf && <span className="ml-1.5 text-white/15">{timeAgo(data.asOf)}</span>}
        </span>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="font-mono text-[9px] text-white/20 hover:text-[#00d4ff]/60 transition-colors disabled:opacity-30"
        >
          {refreshing ? '...' : 'REFRESH'}
        </button>
      </div>

      {sources.length > 0 && (
        <div className="px-3 py-2 border-b border-white/5 shrink-0">
          <p className="font-mono text-[9px] text-white/20">
            LIVE SOURCES: <span className="text-emerald-400">{liveCount}</span>/{sources.length}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {sources.map((src) => (
              <span
                key={src.id}
                className="font-mono text-[8px] px-1.5 py-0.5 rounded-sm border"
                style={{
                  color: src.status === 'live' ? '#00ff88' : src.status === 'fallback' ? '#fbbf24' : '#ff3b30',
                  borderColor: 'rgba(255,255,255,0.12)',
                }}
                title={src.note}
              >
                {src.name} {src.count > 0 ? src.count : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {signals.length === 0 ? (
          <div className="p-4">
            <p className="font-mono text-[10px] text-white/25">No opportunity signals available.</p>
          </div>
        ) : (
          signals.map((signal) => (
            <div key={signal.id} className="px-3 py-2 border-b border-white/5">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: SOURCE_ACCENT[signal.source] ?? '#00d4ff' }}
                />
                <span className="font-mono text-[8px] text-white/35">{signal.sourceLabel}</span>
                <span className="ml-auto font-mono text-[8px] text-white/15">{timeAgo(signal.detectedAt)}</span>
              </div>
              <p className="font-mono text-[10px] text-white/60 mt-1 leading-snug">{signal.headline}</p>
              <p className="font-mono text-[9px] text-white/35 mt-1">{signal.nxtLinkUse}</p>
              <div className="mt-1 flex items-center gap-2">
                {signal.amountUsd != null && (
                  <span className="font-mono text-[8px] text-emerald-400/80">{compactUsd(signal.amountUsd)}</span>
                )}
                {signal.location && (
                  <span className="font-mono text-[8px] text-white/25">{signal.location}</span>
                )}
                {signal.url && (
                  <a
                    href={signal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto font-mono text-[8px] text-[#00d4ff]/60 hover:text-[#00d4ff]"
                  >
                    OPEN
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── CONTRACTS tab ────────────────────────────────────────────────────────────

const CONTRACT_SOURCE_COLORS: Record<string, string> = {
  sam: '#00d4ff',
  usaspending: '#00ff88',
  sbir: '#fbbf24',
};

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

function ContractsTab() {
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
            const srcLabel = CONTRACT_SOURCE_LABELS[award.source] ?? award.source.toUpperCase();
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
                    {award.type.toUpperCase()}
                  </span>
                  {award.source === 'sbir' && award.phase && (
                    <span className="font-mono text-[7px] px-1 py-px rounded-sm bg-[#fbbf24]/15 text-[#fbbf24] font-bold">
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
                    {formatContractAmount(award.amount)}
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
