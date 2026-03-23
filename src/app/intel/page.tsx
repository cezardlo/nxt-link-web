'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Brain, Lock, Zap, Truck, Activity,
} from 'lucide-react';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';
import type { ConnectionChain } from '@/lib/engines/connection-engine';
import { Radar, IconContainer } from '@/components/ui/radar-effect';
import { BottomNav, TopBar, CardSkeleton } from '@/components/ui';
import { COLORS } from '@/lib/tokens';
import { Brain as BindingBrain } from '@/lib/brain';

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

// ─── Mobile hook ──────────────────────────────────────────────────────────────

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

// ─── Priority helpers ─────────────────────────────────────────────────────────

type Priority = 'P0' | 'P1' | 'P2' | 'P3';

function getPriority(importance: number): Priority {
  if (importance >= 0.85) return 'P0';
  if (importance >= 0.65) return 'P1';
  if (importance >= 0.40) return 'P2';
  return 'P3';
}

const PRIORITY_COLOR: Record<Priority, string> = {
  P0: COLORS.red, P1: COLORS.orange, P2: COLORS.gold, P3: COLORS.cyan,
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

function Panel({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[20px] px-5 py-4 ${className}`}
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        ...style,
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${COLORS.accent}22, transparent)` }}
      />
      {children}
    </div>
  );
}

// ─── TAB BAR ─────────────────────────────────────────────────────────────────

type Tab = 'signals' | 'heading' | 'drilldown';

function TabBar({
  active, onSelect, hasDrilldown,
}: { active: Tab; onSelect: (t: Tab) => void; hasDrilldown: boolean }) {
  const isMobile = useIsMobile();
  const tabs: Array<{ key: Tab; label: string; short: string }> = [
    { key: 'signals',   label: '01 \u2014 SIGNALS NOW',    short: '01 SIGNALS' },
    { key: 'heading',   label: '02 \u2014 WHERE HEADING',  short: '02 HEADING' },
    { key: 'drilldown', label: '03 \u2014 DRILL DOWN',     short: '03 DRILL' },
  ];
  return (
    <div
      className={`flex ${isMobile ? 'px-2' : 'px-5'}`}
      style={{ borderBottom: `1px solid ${COLORS.border}` }}
    >
      {tabs.map(t => {
        const disabled = t.key === 'drilldown' && !hasDrilldown;
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            disabled={disabled}
            onClick={() => !disabled && onSelect(t.key)}
            className={`
              font-mono min-h-[44px] min-w-[44px] bg-transparent border-none whitespace-nowrap
              transition-colors duration-150 -mb-px border-b-2
              ${isMobile ? 'flex-1 text-[8px] tracking-[0.04em] px-1 py-2.5' : 'text-[10px] tracking-[0.12em] px-5 py-3'}
              ${isActive
                ? 'cursor-pointer'
                : disabled
                  ? 'opacity-30 cursor-not-allowed'
                  : 'cursor-pointer text-white/40 border-transparent hover:text-white/60'
              }
            `}
            style={{
              color: isActive ? COLORS.accent : undefined,
              borderBottomColor: isActive ? COLORS.accent : 'transparent',
            }}
          >
            {isMobile ? t.short : t.label}
            {t.key === 'drilldown' && hasDrilldown && !isMobile && (
              <span className="ml-2 text-[7px]" style={{ color: COLORS.green }}>● ACTIVE</span>
            )}
            {t.key === 'drilldown' && hasDrilldown && isMobile && (
              <span className="ml-1 text-[6px]" style={{ color: COLORS.green }}>●</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── RADAR HEADER ────────────────────────────────────────────────────────────

const RADAR_INDUSTRIES = [
  { icon: <Shield size={20} color={COLORS.accent} />, text: 'DEFENSE',  delay: 0.1 },
  { icon: <Brain  size={20} color={COLORS.cyan} />,   text: 'AI/ML',    delay: 0.2 },
  { icon: <Lock   size={20} color={COLORS.green} />,  text: 'CYBER',    delay: 0.3 },
  { icon: <Zap    size={20} color={COLORS.gold} />,   text: 'ENERGY',   delay: 0.4 },
  { icon: <Truck  size={20} color={COLORS.accent} />, text: 'LOGISTICS',delay: 0.5 },
  { icon: <Activity size={20} color={COLORS.cyan} />, text: 'HEALTH',   delay: 0.6 },
];

// Positions for 6 icons evenly spaced in a ring around the radar center
const ICON_POSITIONS = [
  { top: '0%',   left: '50%',  transform: 'translate(-50%, -50%)' },
  { top: '25%',  left: '92%',  transform: 'translate(-50%, -50%)' },
  { top: '75%',  left: '92%',  transform: 'translate(-50%, -50%)' },
  { top: '100%', left: '50%',  transform: 'translate(-50%, -50%)' },
  { top: '75%',  left: '8%',   transform: 'translate(-50%, -50%)' },
  { top: '25%',  left: '8%',   transform: 'translate(-50%, -50%)' },
];

function RadarHeader() {
  return (
    <div
      className="flex flex-col items-center pt-8 pb-6 mb-4 rounded-[20px]"
      style={{ borderBottom: `1px solid ${COLORS.border}` }}
    >
      {/* Eyebrow label */}
      <span className="font-mono text-[8px] tracking-[0.2em] mb-4" style={{ color: `${COLORS.accent}80` }}>
        NXT//LINK SECTOR COVERAGE
      </span>

      {/* Radar + orbiting icons — responsive container */}
      <div className="relative w-full max-w-[260px] aspect-square mx-auto">
        {/* Center radar */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Radar />
        </div>

        {/* Industry icons in orbit */}
        {RADAR_INDUSTRIES.map((industry, i) => (
          <div
            key={industry.text}
            className="absolute"
            style={ICON_POSITIONS[i]}
          >
            <IconContainer
              icon={industry.icon}
              text={industry.text}
              delay={industry.delay}
            />
          </div>
        ))}
      </div>

      {/* Subtitle */}
      <span className="font-mono text-[9px] tracking-[0.12em] mt-2" style={{ color: COLORS.muted }}>
        GLOBAL TECHNOLOGY INTELLIGENCE — LIVE
      </span>
    </div>
  );
}

// ─── SCREEN 1 — SIGNALS NOW ──────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: Priority }) {
  const color = PRIORITY_COLOR[priority];
  return (
    <span
      className="font-mono text-[8px] tracking-[0.1em] px-[7px] py-[2px] rounded-full shrink-0"
      style={{
        color,
        background: `${color}18`,
        border: `1px solid ${color}44`,
      }}
    >
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
      className="px-4 py-3.5 cursor-pointer transition-colors duration-150 rounded-[16px] mb-2"
      style={{
        borderLeft: `3px solid ${color}`,
        background: hover ? `${color}08` : `${COLORS.surface}`,
        border: `1px solid ${hover ? `${color}33` : COLORS.border}`,
        borderLeftWidth: '3px',
        borderLeftColor: color,
      }}
    >
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <PriorityBadge priority={priority} />
        <span className="font-mono text-[8px] tracking-[0.1em] uppercase" style={{ color: COLORS.accent }}>
          {signal.industry}
        </span>
        <span className="font-mono text-[7px] tracking-[0.08em]" style={{ color: COLORS.muted }}>
          {signalLabel(signal.signal_type)}
        </span>
        <span className="ml-auto font-mono text-[7px]" style={{ color: COLORS.muted }}>
          {timeAgo(signal.discovered_at)}
        </span>
      </div>
      <p className="font-mono text-[11px] text-white/85 m-0 mb-1.5 leading-relaxed">
        {signal.title}
      </p>
      <div className="flex items-center justify-between flex-wrap gap-1.5">
        {signal.company && (
          <span className="font-mono text-[8px] tracking-[0.06em]" style={{ color: COLORS.gold }}>
            {signal.company}
          </span>
        )}
        <button
          onClick={() => onDrillDown(signal)}
          className="ml-auto font-mono text-[8px] tracking-[0.1em] px-2.5 py-[3px] rounded-full cursor-pointer transition-all duration-150 min-h-[44px] min-w-[44px]"
          style={{
            color: COLORS.accent,
            background: `${COLORS.accent}10`,
            border: `1px solid ${COLORS.accent}40`,
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
    <Panel className="px-4 py-4">
      <div className="font-grotesk text-[10px] font-semibold tracking-[0.14em] mb-3" style={{ color: COLORS.accent }}>
        SEVERITY HEATMAP
      </div>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: '90px repeat(4, 1fr)' }}>
        {/* Header */}
        <div />
        {priorities.map(p => (
          <div key={p} className="font-mono text-[7px] text-center tracking-[0.08em]" style={{ color: PRIORITY_COLOR[p] }}>
            {p}
          </div>
        ))}
        {/* Rows */}
        {sectorList.map(sector => (
          <>
            <div key={`${sector}-label`} className="font-mono text-[8px] tracking-[0.04em] leading-tight pr-1 flex items-center overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: COLORS.muted }}>
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
                  className="h-[22px] rounded-[8px] flex items-center justify-center transition-colors duration-150 min-h-[44px] min-w-[44px]"
                  style={{
                    background: count > 0 ? `${color}${Math.round(intensity * 55 + 10).toString(16).padStart(2, '0')}` : `${COLORS.surface}`,
                    border: `1px solid ${count > 0 ? `${color}22` : COLORS.border}`,
                    cursor: count > 0 ? 'pointer' : 'default',
                  }}
                >
                  {count > 0 && (
                    <span className="font-mono text-[8px] leading-none" style={{ color }}>
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
        className="mt-3 w-full font-mono text-[7px] bg-transparent rounded-full py-1 cursor-pointer tracking-[0.1em] min-h-[44px] min-w-[44px] transition-colors duration-150"
        style={{
          color: COLORS.muted,
          border: `1px solid ${COLORS.border}`,
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
  const isMobile = useIsMobile();
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
    <>
      <RadarHeader />
      <div className={`grid gap-5 items-start ${isMobile ? 'grid-cols-1' : 'grid-cols-[1fr_280px]'}`}>
        {/* Signal feed */}
        <div>
          <div className="flex items-center gap-3 pb-3 mb-1 flex-wrap">
            <span className="font-grotesk text-[10px] font-semibold tracking-[0.14em]" style={{ color: COLORS.accent }}>
              SIGNALS NOW
            </span>
            {(industryFilter || priorityFilter) && (
              <span className="font-mono text-[8px] tracking-[0.08em] rounded-full px-2 py-0.5" style={{ color: COLORS.gold, background: `${COLORS.gold}14` }}>
                FILTERED: {[industryFilter, priorityFilter].filter(Boolean).join(' + ')}
              </span>
            )}
            <span className="ml-auto font-mono text-[8px]" style={{ color: COLORS.muted }}>
              {sorted.length} signals
            </span>
          </div>
          <Panel className="!p-3">
            {loading ? (
              <div className="p-4 flex flex-col gap-3.5">
                {[0,1,2,3,4,5].map(i => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div className="p-6 font-mono text-[10px] text-center" style={{ color: COLORS.muted }}>
                {signals.length === 0 ? 'Warming up signal feed — check back in 30 seconds.' : 'No signals match the current filter.'}
              </div>
            ) : (
              sorted.map((sig, i) => (
                <SignalCard key={`${sig.title}-${i}`} signal={sig} onDrillDown={onDrillDown} />
              ))
            )}
          </Panel>
        </div>
        {/* Heatmap — inline on mobile (below feed), sticky on desktop */}
        <div className={isMobile ? '' : 'sticky top-14'}>
          <SeverityHeatmap signals={signals} onFilter={handleFilter} />
        </div>
      </div>
    </>
  );
}

// ─── SCREEN 2 — WHERE HEADING ─────────────────────────────────────────────────

function plainMomentum(m: string): { label: string; color: string; emoji: string } {
  if (m === 'accelerating') return { label: 'Growing fast', color: COLORS.green, emoji: '\u2191' };
  if (m === 'slowing')      return { label: 'Slowing down', color: COLORS.gold,  emoji: '\u2198' };
  if (m === 'declining')    return { label: 'Shrinking',    color: COLORS.red,   emoji: '\u2193' };
  return                           { label: 'Holding steady', color: COLORS.cyan, emoji: '\u2192' };
}

// Static plain-English summaries per sector (used when API has no trend data)
const SECTOR_SUMMARY: Record<string, { happening: string; next: string; heading: string }> = {
  'Defense':      { happening: 'The military is buying more AI and autonomous systems. Fort Bliss contracts are active.', next: 'Expect more software-defined weapons and drone programs.', heading: 'Spending will keep rising through the decade.' },
  'AI/ML':        { happening: 'Companies across every industry are deploying AI to cut costs and speed up decisions.', next: 'The next 12 months will see AI move from pilots to mandatory infrastructure.', heading: 'Every business will need an AI strategy or lose to competitors who have one.' },
  'Cybersecurity':{ happening: 'Government contractors must meet new CMMC compliance rules or lose contracts.', next: 'A wave of security audits and vendor replacements is coming.', heading: 'Cybersecurity spending will not stop growing — the threat environment forces it.' },
  'Energy':       { happening: 'Grid modernization and clean energy mandates are creating long-term infrastructure projects.', next: 'Microgrids, battery storage, and solar will dominate procurement for 10+ years.', heading: 'The energy transition is funded and irreversible.' },
  'Manufacturing':{ happening: 'Labor shortages and reshoring policy are making automation the only economic option.', next: 'Robotics and cobots will replace repetitive tasks in most factories within 5 years.', heading: 'Factories that do not automate will not be able to compete on price.' },
  'Healthcare':   { happening: 'Hospitals and clinics are adopting AI diagnostics and electronic health systems at speed.', next: 'AI-assisted diagnostics will become standard of care in most specialties.', heading: 'Healthcare technology spending will double in the next 8 years.' },
  'Logistics':    { happening: 'Same-day delivery expectations are forcing every logistics company to automate warehouses.', next: 'Autonomous forklifts and AI route optimization will become table stakes.', heading: 'The logistics gap between automated and manual operations will become too large to bridge.' },
  'Border Tech':  { happening: 'CBP and DHS are investing heavily in biometrics, cameras, and AI screening at ports of entry.', next: 'Every major crossing will have AI-assisted inspection within 3 years.', heading: 'Border technology is a permanent and growing budget line — it does not follow political cycles.' },
  'Finance':      { happening: 'Digital payment platforms and AI fraud detection are replacing legacy banking infrastructure.', next: 'Community banks that do not modernize will lose customers to digital-native competitors.', heading: 'The cost of not having modern financial technology will exceed the cost of building it.' },
};

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
  const staticSummary = SECTOR_SUMMARY[sector];

  const momentum = trend ? plainMomentum(trend.momentum) : null;
  const happening = trend?.what_is_happening ?? staticSummary?.happening ?? '';
  const next = trend?.what_might_happen ?? staticSummary?.next ?? '';
  const heading = trend?.where_heading ?? staticSummary?.heading ?? '';

  const dir30 = forecast ? (forecast.predicted_score_30d > forecast.current_score + 3 ? 'more active' : forecast.predicted_score_30d < forecast.current_score - 3 ? 'less active' : 'about the same') : null;
  const dir90 = forecast ? (forecast.predicted_score_90d > forecast.current_score + 3 ? 'more active' : forecast.predicted_score_90d < forecast.current_score - 3 ? 'less active' : 'about the same') : null;

  return (
    <div>
      {/* Sector pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {SECTORS.map(s => {
          const t = trends.find(x => x.name.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(x.name.toLowerCase()));
          const pm = t ? plainMomentum(t.momentum) : null;
          const isActive = s === sector;
          return (
            <button
              key={s}
              onClick={() => setSector(s)}
              className="font-mono text-[9px] tracking-[0.08em] px-3.5 py-1.5 rounded-full cursor-pointer transition-all duration-150 min-h-[44px] min-w-[44px]"
              style={{
                background: isActive ? `${COLORS.accent}18` : COLORS.surface,
                border: `1px solid ${isActive ? COLORS.accent : COLORS.border}`,
                color: isActive ? COLORS.accent : COLORS.muted,
              }}
            >
              {s}
              {pm && <span className="ml-1.5 text-[9px]" style={{ color: pm.color }}>{pm.emoji}</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[0,1,2].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-5">

          {/* Big status banner */}
          <Panel className="!border-l-4" style={{ borderLeftColor: momentum?.color ?? COLORS.accent }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[28px] leading-none">{momentum?.emoji ?? '\u2192'}</span>
              <div>
                <div className="font-grotesk text-lg leading-none tracking-[0.04em] font-semibold" style={{ color: momentum?.color ?? COLORS.accent }}>
                  {momentum?.label ?? 'Holding steady'}
                </div>
                <div className="font-mono text-[8px] mt-[3px] tracking-[0.1em]" style={{ color: COLORS.muted }}>
                  {sector.toUpperCase()} RIGHT NOW
                </div>
              </div>
              {dir30 && (
                <div className="ml-auto text-right">
                  <div className="font-mono text-[9px] leading-relaxed" style={{ color: COLORS.muted }}>
                    In 30 days:{' '}
                    <span style={{ color: dir30 === 'more active' ? COLORS.green : dir30 === 'less active' ? COLORS.red : COLORS.gold }}>
                      {dir30}
                    </span>
                  </div>
                  {dir90 && (
                    <div className="font-mono text-[9px] leading-relaxed" style={{ color: COLORS.muted }}>
                      In 90 days:{' '}
                      <span style={{ color: dir90 === 'more active' ? COLORS.green : dir90 === 'less active' ? COLORS.red : COLORS.gold }}>
                        {dir90}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {happening && (
                <div>
                  <div className="font-mono text-[7px] tracking-[0.14em] mb-1" style={{ color: `${COLORS.accent}88` }}>WHAT IS HAPPENING</div>
                  <p className="font-mono text-xs text-white/85 m-0 leading-relaxed">{happening}</p>
                </div>
              )}
              {next && (
                <div>
                  <div className="font-mono text-[7px] tracking-[0.14em] mb-1" style={{ color: `${COLORS.gold}88` }}>WHAT HAPPENS NEXT</div>
                  <p className="font-mono text-xs text-white/70 m-0 leading-relaxed">{next}</p>
                </div>
              )}
              {heading && (
                <div>
                  <div className="font-mono text-[7px] tracking-[0.14em] mb-1" style={{ color: `${COLORS.green}88` }}>WHERE THIS IS HEADING</div>
                  <p className="font-mono text-xs text-white/70 m-0 leading-relaxed">{heading}</p>
                </div>
              )}
            </div>
          </Panel>

          {/* Opportunities */}
          {sectorOpps.length > 0 && (
            <Panel>
              <div className="font-grotesk text-[10px] font-semibold tracking-[0.14em] mb-3" style={{ color: COLORS.accent }}>
                OPENINGS DETECTED IN {sector.toUpperCase()}
              </div>
              <div className="flex flex-col gap-3">
                {sectorOpps.map(opp => (
                  <div
                    key={opp.id}
                    className="px-4 py-3.5 rounded-[16px]"
                    style={{
                      borderLeft: `3px solid ${COLORS.green}`,
                      background: `${COLORS.green}06`,
                      border: `1px solid ${COLORS.green}22`,
                      borderLeftWidth: '3px',
                      borderLeftColor: COLORS.green,
                    }}
                  >
                    <div className="font-mono text-xs text-white/90 mb-1.5 leading-relaxed">
                      {opp.title}
                    </div>
                    <div className="font-mono text-[10px] text-white/50 leading-relaxed mb-2">
                      {opp.description}
                    </div>
                    <div className="flex gap-3">
                      <span className="font-mono text-[8px] rounded-full px-2 py-0.5" style={{ color: COLORS.gold, background: `${COLORS.gold}14` }}>
                        Act: {opp.timing.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-[8px]" style={{ color: COLORS.muted }}>
                        Risk: {opp.risk_level}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {sectorOpps.length === 0 && !loading && (
            <Panel>
              <div className="font-mono text-[10px] text-center py-3" style={{ color: COLORS.muted }}>
                No specific openings detected yet for {sector}. Check back after the next intelligence refresh.
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
  const accentColor = special ? COLORS.green : COLORS.accent;
  return (
    <div
      className={`pl-5 mb-5 rounded-r-[16px] slide-up slide-up-delay-${num} ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{
        borderLeft: `3px solid ${accentColor}${visible ? 'ff' : '22'}`,
        transition: 'opacity 0.4s ease',
      }}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="font-grotesk text-[9px] tracking-[0.16em] font-semibold" style={{ color: accentColor }}>
          WHY {num} {special ? '\u2014 WHAT THIS MEANS FOR YOU' : ''}
        </span>
        <span className="font-mono text-[8px] tracking-[0.1em]" style={{ color: COLORS.muted }}>
          {label}
        </span>
        <div className="flex-1 h-px" style={{ background: `${accentColor}22` }} />
      </div>
      {visible && (
        <div className="font-mono text-[11px] text-white/75 leading-relaxed">
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
      <Panel className="mb-6" style={{ borderLeft: `3px solid ${PRIORITY_COLOR[priority]}` }}>
        <div className="flex items-center gap-2.5 mb-2 flex-wrap">
          <PriorityBadge priority={priority} />
          <span className="font-mono text-[8px] tracking-[0.1em] uppercase" style={{ color: COLORS.accent }}>
            {signal.industry}
          </span>
          <span className="font-mono text-[7px] ml-auto" style={{ color: COLORS.muted }}>
            {timeAgo(signal.discovered_at)}
          </span>
        </div>
        <h2 className="font-grotesk text-sm text-white m-0 leading-snug tracking-tight font-semibold">
          {signal.title}
        </h2>
        {signal.company && (
          <div className="mt-1.5 font-mono text-[9px]" style={{ color: COLORS.gold }}>
            {signal.company}
          </div>
        )}
      </Panel>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[0,1,2,3,4].map(i => (
            <CardSkeleton key={i} />
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
                <p className="m-0 mb-4 text-white/80">
                  {fiveWhys.why5.local_impact}
                </p>

                {fiveWhys.why5.technologies.length > 0 && (
                  <div className="mb-5">
                    <div className="font-mono text-[7px] tracking-[0.14em] mb-2" style={{ color: `${COLORS.green}88` }}>
                      TECHNOLOGY THAT EXISTS TO RESPOND
                    </div>
                    <div className="flex flex-col gap-2">
                      {fiveWhys.why5.technologies.map((t, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-[12px]"
                          style={{
                            border: `1px solid ${COLORS.green}22`,
                            background: `${COLORS.green}06`,
                          }}
                        >
                          <div className="flex-1">
                            <div className="font-mono text-[10px] text-white/85">{t.name}</div>
                            <div className="font-mono text-[8px] mt-0.5" style={{ color: `${COLORS.green}99` }}>{t.costRange}</div>
                          </div>
                          <span className="font-mono text-[7px] tracking-[0.08em] uppercase rounded-full px-2 py-0.5" style={{ color: `${COLORS.accent}88`, background: `${COLORS.accent}10` }}>
                            {t.maturity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fiveWhys.why5.vendors.length > 0 && (
                  <div>
                    <div className="font-mono text-[7px] tracking-[0.14em] mb-2" style={{ color: `${COLORS.gold}88` }}>
                      EL PASO VENDORS — RANKED BY IKER SCORE
                    </div>
                    <div className="flex flex-col gap-2">
                      {fiveWhys.why5.vendors.map((v, i) => (
                        <div
                          key={v.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-[12px]"
                          style={{
                            border: `1px solid ${COLORS.gold}22`,
                            background: `${COLORS.gold}06`,
                          }}
                        >
                          <div className="font-mono text-[9px] w-4 shrink-0" style={{ color: COLORS.muted }}>
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-mono text-[10px] text-white/85">{v.name}</div>
                            <div className="font-mono text-[8px] mt-0.5" style={{ color: COLORS.dim }}>{v.category}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono text-sm leading-none" style={{ color: COLORS.gold }}>{v.ikerScore}</div>
                            <div className="font-mono text-[6px] tracking-[0.08em]" style={{ color: `${COLORS.gold}55` }}>IKER</div>
                          </div>
                          <a
                            href={v.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="font-mono text-[7px] tracking-[0.08em] px-2 py-[3px] rounded-full no-underline shrink-0 min-h-[44px] min-w-[44px] flex items-center"
                            style={{
                              color: COLORS.accent,
                              border: `1px solid ${COLORS.accent}33`,
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

  const isMobilePage = useIsMobile();

  const fetchAll = useCallback(async () => {
    setSignalsLoading(true);
    setScreen2Loading(true);
    try {
      const data = await BindingBrain.signals();
      const rawSignals = data.signals.length > 0
        ? (data.signals.map((s) => ({ ...s, importance: s.importance ?? 0 })) as LiveSignal[])
        : STATIC_SIGNALS;

      const seen = new Set<string>();
      const deduped = rawSignals.filter((s) => {
        const key = s.title.toLowerCase().slice(0, 50).replace(/\s+/g, ' ').trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setSignals(deduped);
      setTrends(data.trends as SectorTrend[]);
      setForecasts(data.forecasts as TrajectoryForecast[]);
      setOpportunities(data.opportunities as DiscoveredOpportunity[]);
      setConnections(data.connections as ConnectionChain[]);
    } catch {
      setSignals(STATIC_SIGNALS);
      setTrends([]);
      setForecasts([]);
      setOpportunities([]);
      setConnections([]);
    } finally {
      setSignalsLoading(false);
      setScreen2Loading(false);
    }
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
      const enrichedSignals = await BindingBrain.enrichedSignals().catch(() => []);
      const enriched = Array.isArray(enrichedSignals)
        ? (enrichedSignals as EnrichedSignal[]).find((e: EnrichedSignal) => e.title.toLowerCase().includes(signal.title.toLowerCase().slice(0, 30)))
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
    <div className="min-h-screen font-mono pb-16 animate-fade-up" style={{ background: COLORS.bg }}>
      {/* Scanlines — uses CSS class from globals.css instead of fixed overlay */}
      <div className="scanlines fixed inset-0 z-0 pointer-events-none" />

      <div className="relative z-[1]">
        <TopBar />
        <TabBar active={activeTab} onSelect={setActiveTab} hasDrilldown={activeSignal !== null} />

        <div className={`max-w-[1200px] mx-auto ${isMobilePage ? 'px-3 pt-4 pb-12' : 'px-6 pt-6 pb-12'}`}>
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

      <BottomNav />
    </div>
  );
}
