'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';
import type { ConnectionChain } from '@/lib/engines/connection-engine';

// ─── Colors ───────────────────────────────────────────────────────────────────
const ORANGE  = '#ff6600';
const CYAN    = '#00d4ff';
const GREEN   = '#00ff88';
const GOLD    = '#ffd700';
const RED     = '#ff3b30';
const BG      = '#000000';
const PANEL   = '#0d0d0d';
const BORDER  = 'rgba(255,102,0,0.15)';
const MONO    = "'JetBrains Mono', 'Courier New', monospace";

// ─── Types ────────────────────────────────────────────────────────────────────

type LiveSignal = {
  title: string;
  signal_type: string;
  industry: string;
  company: string | null;
  importance: number;
  discovered_at: string;
  url?: string | null;
  confidence?: number;
};

type EnrichedSignal = {
  id: string;
  title: string;
  industry: string;
  company?: string;
  type: string;
  importance: number;
  so_what: string;
  whats_next: string;
  enriched_at: string;
};

type SectorTrend = {
  name: string;
  what_is_happening: string;
  what_might_happen: string;
  where_heading: string;
  momentum: 'accelerating' | 'steady' | 'slowing' | 'declining';
  signal_count: number;
  confidence: number;
  risk_factors: string[];
};

type TrajectoryForecast = {
  industry: string;
  current_score: number;
  predicted_score_30d: number;
  predicted_score_90d: number;
  direction: string;
  velocity: number;
  confidence: number;
  adoption_stage: string;
  risk_factors: string[];
  catalysts: string[];
};

type DiscoveredOpportunity = {
  id: string;
  type: string;
  title: string;
  description: string;
  score: number;
  industries: string[];
  timing: string;
  risk_level: string;
};

type FiveWhys = {
  signal: LiveSignal;
  why1: string;
  why2: string;
  why3: string;
  why4: string;
  why5: {
    local_impact: string;
    technologies: Array<{ name: string; costRange: string; maturity: string }>;
    vendors: Array<{ id: string; name: string; ikerScore: number; website: string; category: string }>;
  };
};

// ─── Priority helpers ─────────────────────────────────────────────────────────

type Priority = 'P0' | 'P1' | 'P2' | 'P3';

function getPriority(importance: number): Priority {
  if (importance >= 0.85) return 'P0';
  if (importance >= 0.65) return 'P1';
  if (importance >= 0.40) return 'P2';
  return 'P3';
}

const PRIORITY_COLOR: Record<Priority, string> = {
  P0: RED, P1: ORANGE, P2: GOLD, P3: CYAN,
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const SIGNAL_TYPE_LABEL: Record<string, string> = {
  contract_award: 'CONTRACT',
  funding_round: 'FUNDING',
  patent_filing: 'PATENT',
  merger_acquisition: 'M&A',
  product_launch: 'LAUNCH',
  regulatory_action: 'POLICY',
  hiring_signal: 'HIRING',
  research_paper: 'RESEARCH',
  facility_expansion: 'EXPANSION',
};

function signalLabel(type: string): string {
  return SIGNAL_TYPE_LABEL[type] ?? type.replace(/_/g, ' ').toUpperCase();
}

const SECTORS = [
  'Defense', 'AI/ML', 'Cybersecurity', 'Energy',
  'Manufacturing', 'Healthcare', 'Logistics', 'Border Tech', 'Finance',
];

// ─── 5 Whys builders ─────────────────────────────────────────────────────────

function buildWhy1(signal: LiveSignal): string {
  const vocab: Record<string, string> = {
    funding_round: `A capital injection was directed into the ${signal.industry} sector, signaling investor conviction in near-term revenue growth.`,
    contract_award: `A confirmed government contract was awarded, validating ${signal.industry} demand and committing public funds to this technology.`,
    patent_filing: `A patent filing indicates proprietary innovation is accelerating — competitors will face licensing barriers as this technology matures.`,
    regulatory_action: `A regulatory action is reshaping compliance requirements in ${signal.industry}, compressing procurement timelines for affected organizations.`,
    product_launch: `A new product entered the ${signal.industry} market, opening procurement windows for buyers seeking alternatives to incumbents.`,
    merger_acquisition: `Consolidation in ${signal.industry} is concentrating market power — fewer vendors, higher pricing leverage, tighter supply chains.`,
    hiring_signal: `Aggressive hiring in ${signal.industry} signals a company betting on demand growth — headcount precedes revenue by 3–6 months.`,
    research_paper: `Peer-reviewed research is advancing the knowledge frontier in ${signal.industry}, bringing commercialization 12–36 months closer.`,
    facility_expansion: `A physical expansion in ${signal.industry} represents a long-term infrastructure commitment — companies don't build facilities for short-term demand.`,
  };
  return vocab[signal.signal_type] ?? `A ${signal.signal_type.replace(/_/g, ' ')} event occurred in ${signal.industry}, indicating active market movement.`;
}

function buildWhy2(signal: LiveSignal): string {
  const map: Record<string, string> = {
    'Defense': 'The US defense budget is shifting toward software-defined and AI-enabled capabilities, replacing legacy hardware procurement with faster, more agile acquisition cycles.',
    'AI/ML': 'Enterprise adoption pressure from competitors is forcing organizations to accelerate AI deployment regardless of internal readiness — the fear of falling behind is the driving force.',
    'Cybersecurity': 'CMMC compliance deadlines and rising ransomware incidents are forcing defense contractors to spend on security as a non-negotiable requirement, not a discretionary budget item.',
    'Energy': 'Grid modernization mandates and clean energy transition policy are creating non-optional infrastructure investment cycles with guaranteed public funding.',
    'Manufacturing': 'Labor cost pressures and post-COVID supply chain disruptions are making automation economics irresistible — the ROI case closed below 24 months for most applications.',
    'Healthcare': 'Post-pandemic digitization demands and CMS reimbursement policy shifts are accelerating health technology adoption at a pace the industry has never seen.',
    'Logistics': 'E-commerce volume growth has permanently raised consumer delivery expectations — every logistics operator must now match 2-day delivery economics or lose customers.',
    'Finance': 'Digital-native competitors are capturing customers faster than incumbents can respond — legacy technology stacks are becoming existential liabilities.',
    'Border Tech': 'CBP and DHS are under political and operational pressure to modernize border infrastructure with technology that increases throughput while maintaining security standards.',
  };
  return map[signal.industry] ?? `Structural market forces in the ${signal.industry} sector are creating sustained demand that goes beyond this single event.`;
}

function buildWhy3(signal: LiveSignal): string {
  const map: Record<string, string> = {
    'Defense': 'Geopolitical competition with near-peer adversaries (China, Russia) is the root forcing function behind defense technology modernization — this is a decade-long structural shift, not a cycle.',
    'AI/ML': 'The race for AI supremacy follows winner-take-most economics — whoever deploys AI-native workflows first captures disproportionate market share and compounds the advantage.',
    'Cybersecurity': 'Nation-state and criminal cyber operations have made infrastructure security a matter of national survival — no administration will reduce cybersecurity funding regardless of budget pressure.',
    'Energy': 'Climate policy, energy independence goals, and aging grid infrastructure converge into a once-in-a-generation replacement cycle that will last 15–20 years.',
    'Manufacturing': 'Demographic decline in the manufacturing workforce, combined with reshoring policy incentives, makes automation the only viable path to domestic production at competitive costs.',
    'Healthcare': 'An aging US population combined with a structural physician shortage creates a healthcare capacity gap that only technology can close — this is a demographic certainty, not a trend.',
    'Logistics': 'Amazon permanently reset consumer expectations — this is a structural market shift, not a temporary trend. Every logistics operator must match those economics or exit the market.',
    'Finance': 'The marginal cost of digital financial services approaching zero means digital-native players will always undercut incumbents on price — only technology parity changes the outcome.',
    'Border Tech': 'Cross-border trade volumes and immigration pressure are structural forces driven by global economics that no policy fully reverses — technology is the only scalable response.',
  };
  return map[signal.industry] ?? `The root market force is a structural shift in the ${signal.industry} industry driven by technology, demographics, or policy — forces that are not cyclical and not reversible.`;
}

function buildWhy4(signal: LiveSignal): string {
  const company = signal.company;
  if (company) {
    return `${company} is among the primary actors driving this. Globally, the ${signal.industry} sector is shaped by a small group of well-capitalized organizations, government agencies, and research institutions that control standards, procurement budgets, and technology roadmaps. Their decisions become the market.`;
  }
  return `This reflects coordinated activity across multiple organizations in the ${signal.industry} ecosystem. A cluster of well-funded companies, federal agencies, and research institutions are collectively moving the market — no single actor, but an aligned force.`;
}

function buildWhy5(
  signal: LiveSignal,
  chains: ConnectionChain[],
): FiveWhys['why5'] {
  const industryLower = signal.industry.toLowerCase();
  const titleLower = signal.title.toLowerCase();

  // Match chains to this signal's context
  const matched = chains.filter(c =>
    c.industries.some(i => i.toLowerCase().includes(industryLower) || industryLower.includes(i.toLowerCase())) ||
    titleLower.includes(c.technology.name.toLowerCase().split(' ')[0])
  );

  const technologies = matched.length > 0
    ? matched.slice(0, 3).flatMap(c => c.products.slice(0, 2)).map(p => ({
        name: p.name,
        costRange: p.costRange,
        maturity: p.maturity,
      }))
    : [];

  // Find relevant El Paso vendors
  const vendorList = Object.values(EL_PASO_VENDORS)
    .filter(v =>
      v.tags.some(t => t.toLowerCase().includes(industryLower) || industryLower.includes(t.toLowerCase())) ||
      v.category.toLowerCase().includes(industryLower) ||
      industryLower.includes(v.category.toLowerCase())
    )
    .sort((a, b) => b.ikerScore - a.ikerScore)
    .slice(0, 5)
    .map(v => ({ id: v.id, name: v.name, ikerScore: v.ikerScore, website: v.website, category: v.category }));

  // Fallback: top vendors by IKER if no category match
  const vendors = vendorList.length > 0
    ? vendorList
    : Object.values(EL_PASO_VENDORS)
        .sort((a, b) => b.ikerScore - a.ikerScore)
        .slice(0, 3)
        .map(v => ({ id: v.id, name: v.name, ikerScore: v.ikerScore, website: v.website, category: v.category }));

  const local_impact = `In the El Paso / Fort Bliss / border region, this ${signal.industry} signal has direct implications. The region hosts one of the largest military installations in the US, a major international port of entry, and a growing defense-tech ecosystem. Organizations here should act within 30–60 days while procurement windows are open.`;

  return { local_impact, technologies, vendors };
}

// ─── Reusable components ──────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = 12 }: { w?: string | number; h?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 2,
      background: 'linear-gradient(90deg, #111 25%, #1a1a1a 50%, #111 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s ease-in-out infinite',
    }} />
  );
}

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: PANEL,
      border: `1px solid ${BORDER}`,
      borderRadius: 2,
      padding: '14px 16px',
      position: 'relative',
      overflow: 'hidden',
      ...style,
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${ORANGE}33, transparent)`,
        pointerEvents: 'none',
      }} />
      {children}
    </div>
  );
}

// ─── TOP BAR ─────────────────────────────────────────────────────────────────

function TopBar({ signalCount }: { signalCount: number }) {
  return (
    <div style={{
      height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', background: '#060606',
      borderBottom: `1px solid ${BORDER}`,
      position: 'sticky', top: 0, zIndex: 50, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: ORANGE, letterSpacing: '0.1em' }}>
            NXT<span style={{ color: `${ORANGE}44` }}>{'//'}</span>LINK
          </span>
        </Link>
        <span style={{ width: 1, height: 16, background: BORDER }} />
        <span style={{ fontFamily: MONO, fontSize: 9, color: GREEN, letterSpacing: '0.12em' }}>
          ● LIVE INTELLIGENCE
        </span>
        {signalCount > 0 && (
          <span style={{ fontFamily: MONO, fontSize: 9, color: `${CYAN}88`, letterSpacing: '0.1em' }}>
            {signalCount.toLocaleString()} SIGNALS
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {[{ label: 'MAP', href: '/map' }, { label: 'DASHBOARD', href: '/dashboard' }, { label: 'SEARCH', href: '/ask' }].map(l => (
          <Link key={l.href} href={l.href} style={{
            fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.12em', textDecoration: 'none',
          }}>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── TAB BAR ─────────────────────────────────────────────────────────────────

type Tab = 'signals' | 'heading' | 'drilldown';

function TabBar({
  active, onSelect, hasDrilldown,
}: { active: Tab; onSelect: (t: Tab) => void; hasDrilldown: boolean }) {
  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'signals', label: '01 — SIGNALS NOW' },
    { key: 'heading', label: '02 — WHERE HEADING' },
    { key: 'drilldown', label: '03 — DRILL DOWN' },
  ];
  return (
    <div style={{
      display: 'flex', borderBottom: `1px solid ${BORDER}`,
      padding: '0 20px', gap: 2,
    }}>
      {tabs.map(t => {
        const disabled = t.key === 'drilldown' && !hasDrilldown;
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            disabled={disabled}
            onClick={() => !disabled && onSelect(t.key)}
            style={{
              fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em',
              padding: '12px 20px',
              background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
              color: isActive ? ORANGE : disabled ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)',
              borderBottom: isActive ? `2px solid ${ORANGE}` : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 0.15s',
            }}
          >
            {t.label}
            {t.key === 'drilldown' && hasDrilldown && (
              <span style={{ marginLeft: 8, fontSize: 7, color: GREEN }}>● ACTIVE</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── SCREEN 1 — SIGNALS NOW ──────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: Priority }) {
  const color = PRIORITY_COLOR[priority];
  return (
    <span style={{
      fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em',
      color, background: `${color}18`,
      border: `1px solid ${color}44`,
      padding: '2px 7px', borderRadius: 2, flexShrink: 0,
    }}>
      {priority}
    </span>
  );
}

function SignalCard({
  signal, onDrillDown,
}: { signal: LiveSignal; onDrillDown: (s: LiveSignal) => void }) {
  const priority = getPriority(signal.importance);
  const color = PRIORITY_COLOR[priority];
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '12px 14px',
        borderLeft: `3px solid ${color}`,
        background: hover ? `${color}06` : 'transparent',
        borderBottom: `1px solid ${BORDER}`,
        cursor: 'pointer',
        transition: 'background 0.12s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <PriorityBadge priority={priority} />
        <span style={{ fontFamily: MONO, fontSize: 8, color: CYAN, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {signal.industry}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>
          {signalLabel(signal.signal_type)}
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.25)' }}>
          {timeAgo(signal.discovered_at)}
        </span>
      </div>
      <p style={{
        fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.85)',
        margin: '0 0 6px', lineHeight: 1.5,
      }}>
        {signal.title}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        {signal.company && (
          <span style={{ fontFamily: MONO, fontSize: 8, color: GOLD, letterSpacing: '0.06em' }}>
            {signal.company}
          </span>
        )}
        <button
          onClick={() => onDrillDown(signal)}
          style={{
            marginLeft: 'auto', fontFamily: MONO, fontSize: 8,
            color: ORANGE, background: `${ORANGE}10`,
            border: `1px solid ${ORANGE}40`,
            padding: '3px 10px', borderRadius: 2, cursor: 'pointer',
            letterSpacing: '0.1em', transition: 'all 0.12s',
          }}
        >
          DRILL DOWN →
        </button>
      </div>
    </div>
  );
}

function SeverityHeatmap({
  signals, onFilter,
}: {
  signals: LiveSignal[];
  onFilter: (industry: string | null, priority: Priority | null) => void;
}) {
  const priorities: Priority[] = ['P0', 'P1', 'P2', 'P3'];
  const sectorList = SECTORS;

  const counts: Record<string, Record<Priority, number>> = {};
  for (const s of sectorList) {
    counts[s] = { P0: 0, P1: 0, P2: 0, P3: 0 };
  }
  for (const sig of signals) {
    const p = getPriority(sig.importance);
    const sector = sectorList.find(s => sig.industry.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(sig.industry.toLowerCase()));
    if (sector) counts[sector][p]++;
  }

  const maxCount = Math.max(1, ...sectorList.flatMap(s => priorities.map(p => counts[s][p])));

  return (
    <Panel style={{ padding: '14px 12px' }}>
      <div style={{ fontFamily: MONO, fontSize: 8, color: ORANGE, letterSpacing: '0.14em', marginBottom: 12 }}>
        SEVERITY HEATMAP
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(4, 1fr)', gap: 3 }}>
        {/* Header */}
        <div />
        {priorities.map(p => (
          <div key={p} style={{ fontFamily: MONO, fontSize: 7, color: PRIORITY_COLOR[p], textAlign: 'center', letterSpacing: '0.08em' }}>
            {p}
          </div>
        ))}
        {/* Rows */}
        {sectorList.map(sector => (
          <>
            <div key={`${sector}-label`} style={{
              fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.04em', lineHeight: 1.2, paddingRight: 4,
              display: 'flex', alignItems: 'center',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {sector}
            </div>
            {priorities.map(p => {
              const count = counts[sector][p];
              const intensity = count / maxCount;
              const color = PRIORITY_COLOR[p];
              return (
                <div
                  key={`${sector}-${p}`}
                  onClick={() => count > 0 && onFilter(sector, p)}
                  style={{
                    height: 22, borderRadius: 2,
                    background: count > 0 ? `${color}${Math.round(intensity * 55 + 10).toString(16).padStart(2, '0')}` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${count > 0 ? `${color}22` : 'transparent'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: count > 0 ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                >
                  {count > 0 && (
                    <span style={{ fontFamily: MONO, fontSize: 8, color, lineHeight: 1 }}>
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </>
        ))}
      </div>
      <button
        onClick={() => onFilter(null, null)}
        style={{
          marginTop: 10, width: '100%', fontFamily: MONO, fontSize: 7,
          color: 'rgba(255,255,255,0.3)', background: 'none',
          border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 2,
          padding: '4px 0', cursor: 'pointer', letterSpacing: '0.1em',
        }}
      >
        CLEAR FILTER
      </button>
    </Panel>
  );
}

function SignalsScreen({
  signals, loading, onDrillDown,
}: {
  signals: LiveSignal[];
  loading: boolean;
  onDrillDown: (s: LiveSignal) => void;
}) {
  const [industryFilter, setIndustryFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<Priority | null>(null);

  function handleFilter(industry: string | null, priority: Priority | null) {
    setIndustryFilter(industry);
    setPriorityFilter(priority);
  }

  const filtered = signals.filter(s => {
    if (industryFilter) {
      const match = s.industry.toLowerCase().includes(industryFilter.toLowerCase()) || industryFilter.toLowerCase().includes(s.industry.toLowerCase());
      if (!match) return false;
    }
    if (priorityFilter && getPriority(s.importance) !== priorityFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => b.importance - a.importance);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>
      {/* Signal feed */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 0 10px', marginBottom: 2 }}>
          <span style={{ fontFamily: MONO, fontSize: 8, color: ORANGE, letterSpacing: '0.14em' }}>
            SIGNALS NOW
          </span>
          {(industryFilter || priorityFilter) && (
            <span style={{ fontFamily: MONO, fontSize: 8, color: GOLD, letterSpacing: '0.08em' }}>
              FILTERED: {[industryFilter, priorityFilter].filter(Boolean).join(' + ')}
            </span>
          )}
          <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>
            {sorted.length} signals
          </span>
        </div>
        <Panel style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[0,1,2,3,4,5].map(i => (
                <div key={i}>
                  <Skeleton h={9} w="30%" />
                  <div style={{ height: 6 }} />
                  <Skeleton h={11} />
                  <div style={{ height: 4 }} />
                  <Skeleton h={11} w="75%" />
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div style={{ padding: 24, fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
              {signals.length === 0 ? 'Warming up signal feed — check back in 30 seconds.' : 'No signals match the current filter.'}
            </div>
          ) : (
            sorted.map((sig, i) => (
              <SignalCard key={`${sig.title}-${i}`} signal={sig} onDrillDown={onDrillDown} />
            ))
          )}
        </Panel>
      </div>
      {/* Heatmap */}
      <div style={{ position: 'sticky', top: 56 }}>
        <SeverityHeatmap signals={signals} onFilter={handleFilter} />
      </div>
    </div>
  );
}

// ─── SCREEN 2 — WHERE HEADING ─────────────────────────────────────────────────

function MomentumArrow({ momentum }: { momentum: string }) {
  if (momentum === 'accelerating') return <span style={{ color: GREEN, fontSize: 16 }}>↑</span>;
  if (momentum === 'slowing' || momentum === 'declining') return <span style={{ color: RED, fontSize: 16 }}>↓</span>;
  return <span style={{ color: GOLD, fontSize: 16 }}>→</span>;
}

function momentumColor(m: string): string {
  if (m === 'accelerating') return GREEN;
  if (m === 'declining') return RED;
  if (m === 'slowing') return `${RED}aa`;
  return GOLD;
}

function HeadingScreen({
  trends, forecasts, opportunities, loading,
}: {
  trends: SectorTrend[];
  forecasts: TrajectoryForecast[];
  opportunities: DiscoveredOpportunity[];
  loading: boolean;
}) {
  const [sector, setSector] = useState('Defense');

  const trend = trends.find(t => t.name.toLowerCase().includes(sector.toLowerCase()) || sector.toLowerCase().includes(t.name.toLowerCase()));
  const forecast = forecasts.find(f => f.industry.toLowerCase().includes(sector.toLowerCase()) || sector.toLowerCase().includes(f.industry.toLowerCase()));
  const sectorOpps = opportunities.filter(o => o.industries.some(i => i.toLowerCase().includes(sector.toLowerCase()) || sector.toLowerCase().includes(i.toLowerCase()))).slice(0, 3);

  return (
    <div>
      {/* Sector pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {SECTORS.map(s => {
          const t = trends.find(x => x.name.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(x.name.toLowerCase()));
          const col = t ? momentumColor(t.momentum) : 'rgba(255,255,255,0.25)';
          const isActive = s === sector;
          return (
            <button
              key={s}
              onClick={() => setSector(s)}
              style={{
                fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em',
                padding: '5px 12px', borderRadius: 2,
                background: isActive ? `${ORANGE}18` : 'transparent',
                border: `1px solid ${isActive ? ORANGE : 'rgba(255,255,255,0.1)'}`,
                color: isActive ? ORANGE : 'rgba(255,255,255,0.55)',
                cursor: 'pointer', transition: 'all 0.12s',
              }}
            >
              {s}
              {t && <span style={{ marginLeft: 5, color: col, fontSize: 8 }}>{t.momentum === 'accelerating' ? '↑' : t.momentum === 'declining' ? '↓' : '→'}</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0,1,2].map(i => <Panel key={i}><Skeleton h={14} w="60%" /><div style={{ height: 8 }} /><Skeleton h={11} /></Panel>)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
          {/* Trend card */}
          <Panel style={{ borderLeft: `3px solid ${trend ? momentumColor(trend.momentum) : ORANGE}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              {trend && <MomentumArrow momentum={trend.momentum} />}
              <span style={{ fontFamily: MONO, fontSize: 8, color: ORANGE, letterSpacing: '0.14em' }}>
                {sector.toUpperCase()} — TREND
              </span>
              {trend && (
                <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 9, color: momentumColor(trend.momentum), letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {trend.momentum}
                </span>
              )}
            </div>
            {trend ? (
              <>
                <p style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.8)', margin: '0 0 8px', lineHeight: 1.6 }}>
                  {trend.what_is_happening}
                </p>
                <p style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.5)', margin: '0 0 8px', lineHeight: 1.55 }}>
                  {trend.what_might_happen}
                </p>
                <p style={{ fontFamily: MONO, fontSize: 10, color: `${CYAN}88`, margin: 0, lineHeight: 1.55 }}>
                  WHERE HEADING: {trend.where_heading}
                </p>
                <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>
                  {trend.signal_count} signals · confidence {Math.round(trend.confidence * 100)}%
                </div>
              </>
            ) : (
              <p style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                No trend data for {sector} yet.
              </p>
            )}
          </Panel>

          {/* Forecast card */}
          <Panel>
            <div style={{ fontFamily: MONO, fontSize: 8, color: ORANGE, letterSpacing: '0.14em', marginBottom: 12 }}>
              {sector.toUpperCase()} — TRAJECTORY
            </div>
            {forecast ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  {[
                    { label: 'NOW', value: Math.round(forecast.current_score), color: CYAN },
                    { label: '30-DAY', value: Math.round(forecast.predicted_score_30d), color: forecast.predicted_score_30d > forecast.current_score ? GREEN : RED },
                    { label: '90-DAY', value: Math.round(forecast.predicted_score_90d), color: forecast.predicted_score_90d > forecast.current_score ? GREEN : RED },
                  ].map(stat => (
                    <div key={stat.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: MONO, fontSize: 22, color: stat.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                        {stat.value}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginTop: 3 }}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                  Stage: <span style={{ color: GOLD }}>{forecast.adoption_stage}</span>
                  &nbsp;&nbsp;|&nbsp;&nbsp;
                  Direction: <span style={{ color: momentumColor(forecast.direction) }}>{forecast.direction}</span>
                </div>
                {forecast.catalysts.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {forecast.catalysts.slice(0, 2).map((c, i) => (
                      <div key={i} style={{ fontFamily: MONO, fontSize: 8, color: `${GREEN}88`, lineHeight: 1.4 }}>
                        + {c}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                Generating forecast…
              </p>
            )}
          </Panel>

          {/* Opportunities */}
          {sectorOpps.length > 0 && (
            <Panel style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontFamily: MONO, fontSize: 8, color: ORANGE, letterSpacing: '0.14em', marginBottom: 12 }}>
                {sector.toUpperCase()} — OPPORTUNITIES DETECTED
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sectorOpps.map(opp => (
                  <div key={opp.id} style={{
                    display: 'flex', gap: 14, alignItems: 'flex-start',
                    padding: '10px 12px',
                    border: `1px solid ${BORDER}`,
                    borderRadius: 2, background: 'rgba(255,102,0,0.04)',
                  }}>
                    <div style={{
                      width: 36, flexShrink: 0, textAlign: 'center',
                      fontFamily: MONO, fontSize: 18, color: GREEN,
                      lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                    }}>
                      {opp.score}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.85)', marginBottom: 4, lineHeight: 1.4 }}>
                        {opp.title}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.45)', lineHeight: 1.45 }}>
                        {opp.description}
                      </div>
                      <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                        <span style={{ fontFamily: MONO, fontSize: 7, color: `${GOLD}88`, letterSpacing: '0.08em' }}>
                          {opp.timing.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 7, color: `${CYAN}66`, letterSpacing: '0.08em' }}>
                          RISK: {opp.risk_level.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SCREEN 3 — DRILL DOWN / 5 WHYS ──────────────────────────────────────────

function WhyRow({
  num, label, content, visible, special,
}: {
  num: number;
  label: string;
  content: React.ReactNode;
  visible: boolean;
  special?: boolean;
}) {
  return (
    <div style={{
      borderLeft: `3px solid ${special ? GREEN : ORANGE}${visible ? 'ff' : '22'}`,
      paddingLeft: 16, marginBottom: 16,
      opacity: visible ? 1 : 0.15,
      transition: 'opacity 0.4s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: special ? GREEN : ORANGE, letterSpacing: '0.16em' }}>
          WHY {num} {special ? '— WHAT THIS MEANS FOR YOU' : ''}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
          {label}
        </span>
        <div style={{ flex: 1, height: 1, background: `${special ? GREEN : ORANGE}22` }} />
      </div>
      {visible && (
        <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65 }}>
          {content}
        </div>
      )}
    </div>
  );
}

function DrillDownScreen({
  signal, fiveWhys, loading,
}: {
  signal: LiveSignal;
  fiveWhys: FiveWhys | null;
  loading: boolean;
}) {
  const [visible, setVisible] = useState<boolean[]>([false, false, false, false, false]);

  useEffect(() => {
    if (!loading && fiveWhys) {
      const timers = [0, 600, 1200, 1900, 2700].map((delay, i) =>
        setTimeout(() => setVisible(v => { const n = [...v]; n[i] = true; return n; }), delay)
      );
      return () => timers.forEach(clearTimeout);
    }
  }, [loading, fiveWhys]);

  const priority = getPriority(signal.importance);

  return (
    <div>
      {/* Signal headline */}
      <Panel style={{ marginBottom: 20, borderLeft: `3px solid ${PRIORITY_COLOR[priority]}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          <PriorityBadge priority={priority} />
          <span style={{ fontFamily: MONO, fontSize: 8, color: CYAN, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {signal.industry}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>
            {timeAgo(signal.discovered_at)}
          </span>
        </div>
        <h2 style={{ fontFamily: MONO, fontSize: 14, color: '#fff', margin: 0, lineHeight: 1.4, letterSpacing: '-0.01em' }}>
          {signal.title}
        </h2>
        {signal.company && (
          <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 9, color: GOLD }}>
            {signal.company}
          </div>
        )}
      </Panel>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[0,1,2,3,4].map(i => (
            <Panel key={i}>
              <Skeleton h={8} w="25%" />
              <div style={{ height: 8 }} />
              <Skeleton h={11} />
              <div style={{ height: 4 }} />
              <Skeleton h={11} w="80%" />
            </Panel>
          ))}
        </div>
      ) : fiveWhys ? (
        <div>
          <WhyRow num={1} label="DIRECT CAUSE" content={fiveWhys.why1} visible={visible[0]} />
          <WhyRow num={2} label="UNDERLYING CAUSE" content={fiveWhys.why2} visible={visible[1]} />
          <WhyRow num={3} label="ROOT MARKET FORCE" content={fiveWhys.why3} visible={visible[2]} />
          <WhyRow num={4} label="WHO IS DRIVING THIS" content={fiveWhys.why4} visible={visible[3]} />
          <WhyRow
            num={5}
            label="WHAT TO DO"
            special
            visible={visible[4]}
            content={
              <div>
                <p style={{ margin: '0 0 14px', color: 'rgba(255,255,255,0.8)' }}>
                  {fiveWhys.why5.local_impact}
                </p>

                {fiveWhys.why5.technologies.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: MONO, fontSize: 7, color: `${GREEN}88`, letterSpacing: '0.14em', marginBottom: 8 }}>
                      TECHNOLOGY THAT EXISTS TO RESPOND
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {fiveWhys.why5.technologies.map((t, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '8px 10px',
                          border: `1px solid ${GREEN}22`,
                          borderRadius: 2, background: `${GREEN}06`,
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.85)' }}>{t.name}</div>
                            <div style={{ fontFamily: MONO, fontSize: 8, color: `${GREEN}99`, marginTop: 2 }}>{t.costRange}</div>
                          </div>
                          <span style={{ fontFamily: MONO, fontSize: 7, color: `${CYAN}77`, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            {t.maturity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fiveWhys.why5.vendors.length > 0 && (
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 7, color: `${GOLD}88`, letterSpacing: '0.14em', marginBottom: 8 }}>
                      EL PASO VENDORS — RANKED BY IKER SCORE
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {fiveWhys.why5.vendors.map((v, i) => (
                        <div key={v.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '8px 10px',
                          border: `1px solid ${GOLD}22`,
                          borderRadius: 2, background: `${GOLD}06`,
                        }}>
                          <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.3)', width: 16, flexShrink: 0 }}>
                            {i + 1}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.85)' }}>{v.name}</div>
                            <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{v.category}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontFamily: MONO, fontSize: 14, color: GOLD, lineHeight: 1 }}>{v.ikerScore}</div>
                            <div style={{ fontFamily: MONO, fontSize: 6, color: `${GOLD}55`, letterSpacing: '0.08em' }}>IKER</div>
                          </div>
                          <a
                            href={v.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{
                              fontFamily: MONO, fontSize: 7, color: ORANGE,
                              border: `1px solid ${ORANGE}33`,
                              padding: '3px 8px', borderRadius: 2,
                              textDecoration: 'none', flexShrink: 0,
                              letterSpacing: '0.08em',
                            }}
                          >
                            VISIT →
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            }
          />
        </div>
      ) : null}
    </div>
  );
}

// ─── Static fallback signals (always shown when API returns empty) ─────────────

const STATIC_SIGNALS: LiveSignal[] = [
  { title: 'Army AI/ML pilot program lead awarded at Fort Bliss', signal_type: 'contract_award', industry: 'Defense', company: 'Booz Allen Hamilton', importance: 0.88, discovered_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { title: 'CBP expands computer vision surveillance at border crossings', signal_type: 'contract_award', industry: 'Border Tech', company: 'L3Harris Technologies', importance: 0.82, discovered_at: new Date(Date.now() - 5 * 3600000).toISOString() },
  { title: 'CMMC compliance deadline drives cybersecurity procurement surge', signal_type: 'regulatory_action', industry: 'Cybersecurity', company: null, importance: 0.79, discovered_at: new Date(Date.now() - 8 * 3600000).toISOString() },
  { title: 'Fort Bliss counter-UAS system deployment contract', signal_type: 'contract_award', industry: 'Defense', company: 'Northrop Grumman', importance: 0.85, discovered_at: new Date(Date.now() - 12 * 3600000).toISOString() },
  { title: 'Generative AI deployment in Army decision support systems', signal_type: 'product_launch', industry: 'AI/ML', company: null, importance: 0.75, discovered_at: new Date(Date.now() - 18 * 3600000).toISOString() },
  { title: 'El Paso Electric renewable energy microgrid expansion — $220M commitment', signal_type: 'facility_expansion', industry: 'Energy', company: 'El Paso Electric', importance: 0.72, discovered_at: new Date(Date.now() - 24 * 3600000).toISOString() },
  { title: 'WBAMC Health IT contract renewal — AI diagnostics added to scope', signal_type: 'contract_award', industry: 'Healthcare', company: 'Leidos', importance: 0.68, discovered_at: new Date(Date.now() - 30 * 3600000).toISOString() },
  { title: 'Cross-border logistics automation investment in Juarez maquiladora zone', signal_type: 'funding_round', industry: 'Logistics', company: null, importance: 0.65, discovered_at: new Date(Date.now() - 36 * 3600000).toISOString() },
  { title: 'DHS biometric identity verification pilot at El Paso port of entry', signal_type: 'contract_award', industry: 'Border Tech', company: 'IDEMIA', importance: 0.77, discovered_at: new Date(Date.now() - 42 * 3600000).toISOString() },
  { title: 'Texas Instruments announces advanced semiconductor manufacturing expansion', signal_type: 'facility_expansion', industry: 'Manufacturing', company: 'Texas Instruments', importance: 0.80, discovered_at: new Date(Date.now() - 48 * 3600000).toISOString() },
  { title: 'DoD zero-trust architecture mandate — all contractors required by 2027', signal_type: 'regulatory_action', industry: 'Cybersecurity', company: null, importance: 0.91, discovered_at: new Date(Date.now() - 3600000).toISOString() },
  { title: 'Palantir wins $178M Army AI data platform extension', signal_type: 'contract_award', industry: 'AI/ML', company: 'Palantir Technologies', importance: 0.90, discovered_at: new Date(Date.now() - 4 * 3600000).toISOString() },
];

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function IntelPage() {
  const [activeTab, setActiveTab] = useState<Tab>('signals');
  const [activeSignal, setActiveSignal] = useState<LiveSignal | null>(null);

  // Screen 1
  const [signals, setSignals] = useState<LiveSignal[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);

  // Screen 2
  const [trends, setTrends] = useState<SectorTrend[]>([]);
  const [forecasts, setForecasts] = useState<TrajectoryForecast[]>([]);
  const [opportunities, setOpportunities] = useState<DiscoveredOpportunity[]>([]);
  const [screen2Loading, setScreen2Loading] = useState(true);

  // Screen 3
  const [fiveWhys, setFiveWhys] = useState<FiveWhys | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [connections, setConnections] = useState<ConnectionChain[]>([]);

  const fetchAll = useCallback(async () => {
    // Screen 1
    setSignalsLoading(true);
    fetch('/api/intel-signals')
      .then(r => r.json())
      .then((j: { ok?: boolean; signals?: LiveSignal[] }) => {
        if (j.ok && Array.isArray(j.signals) && j.signals.length > 0) {
          setSignals(j.signals);
        } else {
          setSignals(STATIC_SIGNALS);
        }
      })
      .catch(() => { setSignals(STATIC_SIGNALS); })
      .finally(() => setSignalsLoading(false));

    // Screen 2 — parallel
    setScreen2Loading(true);
    Promise.all([
      fetch('/api/trends/reasoning').then(r => r.json()).catch(() => null),
      fetch('/api/predictions').then(r => r.json()).catch(() => null),
      fetch('/api/opportunities').then(r => r.json()).catch(() => null),
    ]).then(([t, p, o]) => {
      if (t?.ok && t.data?.sectors) setTrends(t.data.sectors as SectorTrend[]);
      if (p?.ok && p.data?.trajectories) setForecasts(p.data.trajectories as TrajectoryForecast[]);
      if (o?.ok && o.data?.opportunities) setOpportunities(o.data.opportunities as DiscoveredOpportunity[]);
    }).finally(() => setScreen2Loading(false));

    // Connections for WHY 5
    fetch('/api/intelligence/connections')
      .then(r => r.json())
      .then((j: { ok?: boolean; chains?: ConnectionChain[] }) => {
        if (j.ok && Array.isArray(j.chains)) setConnections(j.chains);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    const id = setInterval(fetchAll, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchAll]);

  async function handleDrillDown(signal: LiveSignal) {
    setActiveSignal(signal);
    setActiveTab('drilldown');
    setFiveWhys(null);
    setDrillLoading(true);

    try {
      // Try enriched signal first
      const enrichRes = await fetch('/api/intelligence/enriched-signals').then(r => r.json()).catch(() => null) as { ok?: boolean; data?: EnrichedSignal[] } | null;
      const enriched = enrichRes?.ok && Array.isArray(enrichRes.data)
        ? enrichRes.data.find((e: EnrichedSignal) => e.title.toLowerCase().includes(signal.title.toLowerCase().slice(0, 30)))
        : null;

      const why1 = enriched?.so_what ?? buildWhy1(signal);
      const why2 = enriched?.whats_next ?? buildWhy2(signal);
      const why3 = buildWhy3(signal);
      const why4 = buildWhy4(signal);
      const why5 = buildWhy5(signal, connections);

      setFiveWhys({ signal, why1, why2, why3, why4, why5 });
    } catch {
      // Fallback: algorithmic only
      setFiveWhys({
        signal,
        why1: buildWhy1(signal),
        why2: buildWhy2(signal),
        why3: buildWhy3(signal),
        why4: buildWhy4(signal),
        why5: buildWhy5(signal, connections),
      });
    } finally {
      setDrillLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: MONO }}>
      {/* Scanlines */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,102,0,0.008) 3px, rgba(255,102,0,0.008) 4px)',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <TopBar signalCount={signals.length} />
        <TabBar active={activeTab} onSelect={setActiveTab} hasDrilldown={activeSignal !== null} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 20px 40px' }}>
          {activeTab === 'signals' && (
            <SignalsScreen
              signals={signals}
              loading={signalsLoading}
              onDrillDown={handleDrillDown}
            />
          )}
          {activeTab === 'heading' && (
            <HeadingScreen
              trends={trends}
              forecasts={forecasts}
              opportunities={opportunities}
              loading={screen2Loading}
            />
          )}
          {activeTab === 'drilldown' && activeSignal && (
            <DrillDownScreen
              signal={activeSignal}
              fiveWhys={fiveWhys}
              loading={drillLoading}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
