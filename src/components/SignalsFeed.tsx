'use client';

import { useState, useMemo } from 'react';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';

// ─── Types ────────────────────────────────────────────────────────────────────

type SignalItemType = 'patent_filing' | 'funding' | 'contract_award' | 'partnership' | 'expansion' | 'risk';

type SignalItem = {
  id: string;
  type: SignalItemType;
  title: string;
  vendor?: string;
  confidence: number;    // 0-1
  timestamp: string;     // ISO string
  category: string;
};

type FilterChip = 'ALL' | 'PATENTS' | 'FUNDING' | 'CONTRACTS' | 'RISK';

// ─── Design constants ─────────────────────────────────────────────────────────

const TYPE_COLOR: Record<SignalItemType, string> = {
  patent_filing:  '#a855f7',
  funding:        '#ffb800',
  contract_award: '#00ff88',
  partnership:    '#00d4ff',
  expansion:      '#60a5fa',
  risk:           '#ff3b30',
};

const TYPE_LABEL: Record<SignalItemType, string> = {
  patent_filing:  'PATENT',
  funding:        'FUNDING',
  contract_award: 'CONTRACT',
  partnership:    'PARTNER',
  expansion:      'EXPANSION',
  risk:           'RISK',
};

const FILTER_TO_TYPES: Record<FilterChip, SignalItemType[] | null> = {
  ALL:       null,
  PATENTS:   ['patent_filing'],
  FUNDING:   ['funding'],
  CONTRACTS: ['contract_award', 'partnership'],
  RISK:      ['risk'],
};

// ─── Mock signal generation ───────────────────────────────────────────────────
// Deterministic mock signals generated from vendor data so the feed is always
// populated without requiring a live API call.

const PATENT_TEMPLATES = [
  (name: string) => `${name} files patent for autonomous sensor fusion pipeline`,
  (name: string) => `${name} awarded USPTO patent: AI-driven logistics optimizer`,
  (name: string) => `${name} submits provisional patent — next-gen edge inference`,
  (name: string) => `New IP filing detected: ${name} border surveillance system`,
  (name: string) => `${name} patent grant: predictive maintenance ML module`,
];

const FUNDING_TEMPLATES = [
  (name: string) => `${name} raises $42M Series B for border tech expansion`,
  (name: string) => `${name} secures SBIR Phase II — $1.8M DoD award`,
  (name: string) => `${name} closes seed round; targets Fort Bliss corridor`,
  (name: string) => `UTEP-backed venture fund invests in ${name}`,
  (name: string) => `${name} announces $15M grant from Texas Enterprise Fund`,
];

const CONTRACT_TEMPLATES = [
  (name: string) => `${name} wins Army IDIQ task order — undisclosed amount`,
  (name: string) => `CBP awards ${name} $28M surveillance infrastructure contract`,
  (name: string) => `${name} secures DoD Other Transaction Agreement`,
  (name: string) => `SAM.gov award: ${name} — data analytics platform ($11.4M)`,
  (name: string) => `${name} added to GSA Schedule; Fort Bliss procurement eligible`,
  (name: string) => `${name} wins White Sands Missile Range IT modernization`,
];

const PARTNERSHIP_TEMPLATES = [
  (name: string) => `${name} partners with UTEP Research Institute on AI pilot`,
  (name: string) => `${name} + El Paso Electric sign smart-grid MOU`,
  (name: string) => `${name} joins Texas Tech Commercialization Consortium`,
  (name: string) => `${name} establishes joint venture for border-tech R&D`,
  (name: string) => `${name} signs teaming agreement with prime defense contractor`,
];

const EXPANSION_TEMPLATES = [
  (name: string) => `${name} opens second El Paso operations center — +80 jobs`,
  (name: string) => `${name} relocates HQ to El Paso Innovation District`,
  (name: string) => `${name} expands manufacturing floor by 40% — Eastside campus`,
  (name: string) => `${name} announces remote-hire drive; targets cleared engineers`,
  (name: string) => `${name} breaks ground on Juarez-EP cross-border tech hub`,
];

const RISK_TEMPLATES = [
  (name: string) => `${name} faces supply chain disruption; chip shortage flagged`,
  (name: string) => `Workforce reduction reported at ${name} — 12% headcount cut`,
  (name: string) => `${name} contract protest filed with GAO`,
  (name: string) => `${name} cybersecurity audit — critical findings disclosed`,
  (name: string) => `${name} SBIR award protest; outcome pending`,
];

// Fake timestamps spread over the last 24 hours
const OFFSETS_MINUTES = [2, 7, 15, 22, 35, 48, 63, 80, 95, 112, 130, 155, 180,
  210, 245, 290, 340, 400, 480, 600, 720, 900, 1080, 1320];

function formatAgo(minutes: number): string {
  if (minutes < 60) return `${minutes}m ago`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function pickTemplate(templates: Array<(n: string) => string>, seed: number): (n: string) => string {
  return templates[seed % templates.length]!;
}

function buildMockSignals(): SignalItem[] {
  const vendors = Object.values(EL_PASO_VENDORS);
  const signals: SignalItem[] = [];

  // Assign types in a spread pattern so each type appears in the feed
  const typeSequence: SignalItemType[] = [
    'contract_award', 'patent_filing', 'funding', 'partnership',
    'expansion', 'contract_award', 'risk', 'patent_filing',
    'contract_award', 'funding', 'expansion', 'partnership',
    'contract_award', 'patent_filing', 'risk', 'funding',
    'contract_award', 'expansion', 'partnership', 'patent_filing',
    'risk', 'contract_award', 'funding', 'expansion',
    'patent_filing', 'contract_award', 'partnership', 'risk',
  ];

  const templateMap: Record<SignalItemType, Array<(n: string) => string>> = {
    patent_filing:  PATENT_TEMPLATES,
    funding:        FUNDING_TEMPLATES,
    contract_award: CONTRACT_TEMPLATES,
    partnership:    PARTNERSHIP_TEMPLATES,
    expansion:      EXPANSION_TEMPLATES,
    risk:           RISK_TEMPLATES,
  };

  // Generate 24 signals cycling through vendors
  for (let i = 0; i < Math.min(typeSequence.length, 24); i++) {
    const vendor = vendors[i % vendors.length]!;
    const type = typeSequence[i]!;
    const templates = templateMap[type];
    const title = pickTemplate(templates, i)(vendor.name);
    const offsetMin = OFFSETS_MINUTES[i] ?? i * 55;
    const tsMs = Date.now() - offsetMin * 60 * 1000;

    // Confidence: contract/funding higher, risk lower
    let confidence = 0.55 + (vendor.ikerScore / 100) * 0.35;
    if (type === 'risk') confidence = Math.max(0.35, confidence - 0.2);
    if (type === 'contract_award') confidence = Math.min(0.97, confidence + 0.1);

    signals.push({
      id: `sig-${i}-${vendor.id}`,
      type,
      title,
      vendor: vendor.name,
      confidence: Math.round(confidence * 100) / 100,
      timestamp: new Date(tsMs).toISOString(),
      category: vendor.category,
    });
  }

  return signals;
}

// ─── Confidence bar ───────────────────────────────────────────────────────────

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-px bg-white/[0.06] rounded-full overflow-hidden" style={{ maxWidth: 48 }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            boxShadow: `0 0 3px ${color}88`,
          }}
        />
      </div>
      <span className="font-mono text-[7px] tabular-nums" style={{ color: `${color}99` }}>
        {pct}%
      </span>
    </div>
  );
}

// ─── Single signal row ────────────────────────────────────────────────────────

function SignalRow({ item }: { item: SignalItem }) {
  const color = TYPE_COLOR[item.type];
  const label = TYPE_LABEL[item.type];
  const offsetMin = Math.round((Date.now() - new Date(item.timestamp).getTime()) / 60000);
  const ago = formatAgo(offsetMin);

  return (
    <div className="flex gap-2.5 px-3 py-2.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors group">
      {/* Type dot + left accent */}
      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: color, boxShadow: `0 0 5px ${color}bb` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {/* Title row */}
        <p className="font-mono text-[9px] text-white/55 leading-snug line-clamp-2 group-hover:text-white/70 transition-colors">
          {item.title}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type chip */}
          <span
            className="font-mono text-[7px] tracking-[0.15em] px-1 py-px rounded-sm font-bold shrink-0"
            style={{
              color,
              backgroundColor: `${color}18`,
              border: `1px solid ${color}30`,
            }}
          >
            {label}
          </span>

          {/* Vendor name */}
          {item.vendor && (
            <span className="font-mono text-[8px] text-white/25 truncate max-w-[100px]">
              {item.vendor}
            </span>
          )}

          {/* Timestamp */}
          <span className="font-mono text-[7px] text-white/18 shrink-0 ml-auto">
            {ago}
          </span>
        </div>

        {/* Confidence bar */}
        <ConfidenceBar value={item.confidence} color={color} />
      </div>
    </div>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

function Chip({
  label,
  active,
  count,
  onClick,
}: {
  label: FilterChip;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-1.5 py-0.5 font-mono text-[8px] rounded-sm transition-all whitespace-nowrap border ${
        active
          ? 'text-black font-bold border-transparent'
          : 'text-white/30 hover:text-white/55 bg-white/[0.04] border-white/[0.06]'
      }`}
      style={active ? { backgroundColor: '#f97316' } : {}}
    >
      {label}
      {count > 0 && (
        <span className={`ml-1 ${active ? 'opacity-60' : 'opacity-40'}`}>{count}</span>
      )}
    </button>
  );
}

// ─── Summary bar ─────────────────────────────────────────────────────────────

function SummaryBar({ signals }: { signals: SignalItem[] }) {
  const counts: Record<SignalItemType, number> = {
    contract_award: 0,
    patent_filing: 0,
    funding: 0,
    partnership: 0,
    expansion: 0,
    risk: 0,
  };
  for (const s of signals) counts[s.type]++;

  const items: Array<{ type: SignalItemType; count: number }> = (
    Object.entries(counts) as Array<[SignalItemType, number]>
  )
    .filter(([, c]) => c > 0)
    .map(([type, count]) => ({ type, count }));

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.05] bg-white/[0.01] overflow-x-auto shrink-0 scrollbar-none">
      <span className="font-mono text-[7px] text-white/15 tracking-[0.2em] shrink-0 uppercase">Summary</span>
      {items.map(({ type, count }) => (
        <div key={type} className="flex items-center gap-1 shrink-0">
          <span
            className="w-1 h-1 rounded-full"
            style={{ backgroundColor: TYPE_COLOR[type], boxShadow: `0 0 3px ${TYPE_COLOR[type]}88` }}
          />
          <span className="font-mono text-[7px] tabular-nums" style={{ color: `${TYPE_COLOR[type]}99` }}>
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SignalsFeed() {
  const [activeFilter, setActiveFilter] = useState<FilterChip>('ALL');

  const allSignals = useMemo(() => buildMockSignals(), []);

  const filtered = useMemo(() => {
    const types = FILTER_TO_TYPES[activeFilter];
    if (!types) return allSignals;
    return allSignals.filter((s) => types.includes(s.type));
  }, [allSignals, activeFilter]);

  const chipCounts: Record<FilterChip, number> = {
    ALL:       allSignals.length,
    PATENTS:   allSignals.filter((s) => s.type === 'patent_filing').length,
    FUNDING:   allSignals.filter((s) => s.type === 'funding').length,
    CONTRACTS: allSignals.filter((s) => s.type === 'contract_award' || s.type === 'partnership').length,
    RISK:      allSignals.filter((s) => s.type === 'risk').length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.05] shrink-0">
        <div className="flex items-center gap-1.5">
          <span
            className="w-1 h-1 rounded-full"
            style={{ backgroundColor: '#f97316', boxShadow: '0 0 4px #f97316cc' }}
          />
          <span className="font-mono text-[8px] tracking-[0.25em] text-white/25 uppercase">
            Intel Signals
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[8px] text-white/18 tabular-nums">
            {filtered.length}/{allSignals.length}
          </span>
          <span
            className="font-mono text-[7px] px-1.5 py-px rounded-sm tracking-wider"
            style={{ color: '#00ff88bb', background: '#00ff8815', border: '1px solid #00ff8825' }}
          >
            LIVE
          </span>
        </div>
      </div>

      {/* Summary bar */}
      <SummaryBar signals={allSignals} />

      {/* Filter chips */}
      <div className="flex gap-1 px-2.5 py-1.5 border-b border-white/[0.05] overflow-x-auto shrink-0 scrollbar-none">
        {(Object.keys(FILTER_TO_TYPES) as FilterChip[]).map((chip) => (
          <Chip
            key={chip}
            label={chip}
            active={activeFilter === chip}
            count={chip === 'ALL' ? 0 : chipCounts[chip]}
            onClick={() => setActiveFilter(chip)}
          />
        ))}
      </div>

      {/* Feed list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <span className="font-mono text-[8px] text-white/20">No signals for this filter</span>
          </div>
        ) : (
          filtered.map((item) => <SignalRow key={item.id} item={item} />)
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-3 py-1.5 border-t border-white/[0.04] flex items-center justify-between">
        <span className="font-mono text-[7px] text-white/12 tracking-[0.15em] uppercase">
          NXT//LINK Signal Engine v2
        </span>
        <span className="font-mono text-[7px] text-white/12">
          Auto-refresh 5m
        </span>
      </div>
    </div>
  );
}
