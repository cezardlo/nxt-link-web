'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BottomNav, TopBar, CardSkeleton, ErrorState } from '@/components/ui';
import { COLORS } from '@/lib/tokens';

// ─── Type definitions ─────────────────────────────────────────────────────────

type SectorMomentum = 'accelerating' | 'steady' | 'slowing' | 'declining';

type SectorSnapshot = {
  sector: string;
  one_liner: string;
  momentum: SectorMomentum;
  signal_count: number;
};

type MorningBrief = {
  timestamp: string;
  lead_story: {
    headline: string;
    narrative: string;
    signal_count: number;
  };
  sector_snapshots: SectorSnapshot[];
  risk_alert: { active: boolean; message: string } | null;
  opportunity_spotlight: { title: string; description: string; score: number } | null;
  ai_generated: boolean;
};

type SectorTrend = {
  name: string;
  momentum: SectorMomentum;
  signal_count: number;
  what_is_happening: string;
};

type TrendAnalysis = {
  timestamp: string;
  overall_narrative: string;
  sectors: SectorTrend[];
  biggest_story: string;
  total_signals_analyzed: number;
  ai_enhanced: boolean;
};

type TopSignal = {
  title: string;
  signal_type: string;
  industry: string;
  company: string | null;
  importance: number;
  discovered_at: string;
};

type TrajectoryChange = {
  industry: string;
  from: string;
  to: string;
};

type WhatChanged = {
  generated_at: string;
  signals_today: number;
  signals_week: number;
  new_industries: string[];
  trajectory_changes: TrajectoryChange[];
  top_signals: TopSignal[];
  active_industries: string[];
  funding_total_30d: number;
};

type CrossInsight = {
  headline: string;
  narrative: string;
  industries_involved: string[];
  implication: string;
  confidence: number;
};

type CrossSectorData = {
  timestamp: string;
  insights: CrossInsight[];
  total_signals_analyzed: number;
};

// ─── Utility hooks ────────────────────────────────────────────────────────────

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function getGreeting(now: Date | null): string {
  if (!now) return 'Good morning, Cesar.';
  const h = now.getHours();
  if (h < 12) return 'Good morning, Cesar.';
  if (h < 17) return 'Good afternoon, Cesar.';
  return 'Good evening, Cesar.';
}

function momentumColor(m: SectorMomentum): string {
  if (m === 'accelerating') return COLORS.emerald;
  if (m === 'steady')       return COLORS.amber;
  if (m === 'slowing')      return COLORS.amber;
  return COLORS.red;
}

function momentumLabel(m: SectorMomentum): string {
  if (m === 'accelerating') return 'SURGING';
  if (m === 'steady')       return 'STEADY';
  if (m === 'slowing')      return 'SLOWING';
  return 'DECLINING';
}

function signalTypeLabel(t: string): string {
  const map: Record<string, string> = {
    // 6-track system
    technology:         'Technology',
    product:            'Product',
    discovery:          'Discovery',
    direction:          'Direction',
    who:                'Who',
    connection:         'Connection',
    // Legacy types (still in DB)
    funding_round:      'Investment',
    contract_award:     'Contract',
    merger_acquisition: 'M&A',
    patent_filing:      'Patent',
    product_launch:     'Launch',
    regulatory_change:  'Regulatory',
    executive_move:     'Leadership',
    market_expansion:   'Expansion',
    research_paper:     'Research',
  };
  return map[t] ?? t.replace(/_/g, ' ');
}

function formatFunding(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(0)}K`;
  return n > 0 ? `$${n}` : '—';
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3 font-mono text-[8px] tracking-[0.2em] text-white/[0.28] uppercase">
      <span className="inline-block w-3.5 h-px" style={{ background: `${COLORS.cyan}44` }} />
      {children}
      <span className="inline-block flex-1 h-px bg-white/[0.06]" />
    </div>
  );
}

// ─── Panel wrapper ────────────────────────────────────────────────────────────

function Panel({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`relative overflow-hidden rounded-sm border border-white/[0.06] bg-[#080c14] px-5 py-4 ${className}`} style={style}>
      {/* top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${COLORS.cyan}18, transparent)` }} />
      {children}
    </div>
  );
}

// ─── Big Story Card ───────────────────────────────────────────────────────────

function BigStoryCard({ brief, loading }: { brief: MorningBrief | null; loading: boolean }) {
  if (loading) {
    return (
      <Panel className="border-l-[3px]" style={{ borderLeftColor: `${COLORS.cyan}44` } as React.CSSProperties}>
        <SectionLabel>Lead Story</SectionLabel>
        <CardSkeleton />
      </Panel>
    );
  }

  if (!brief) {
    return (
      <Panel className="border-l-[3px]" style={{ borderLeftColor: `${COLORS.cyan}22` } as React.CSSProperties}>
        <SectionLabel>Lead Story</SectionLabel>
        <p className="font-mono text-[11px] text-white/30 m-0">
          Analyzing signals — check back in a moment.
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="border-l-[3px]" style={{ borderLeftColor: COLORS.cyan } as React.CSSProperties}>
      <SectionLabel>
        Lead Story
        {brief.ai_generated && (
          <span className="text-[7px]" style={{ color: `${COLORS.cyan}88` }}>AI WRITTEN</span>
        )}
      </SectionLabel>
      <h2 className="font-sans text-[clamp(13px,2vw,16px)] font-semibold text-white mb-2.5 leading-[1.35] tracking-[-0.01em]">
        {brief.lead_story.headline}
      </h2>
      <p className="font-mono text-[11px] text-white/65 mb-3 leading-[1.65]">
        {brief.lead_story.narrative}
      </p>
      <div className="flex gap-4 items-center flex-wrap">
        <span className="font-mono text-[9px] tracking-[0.1em]" style={{ color: `${COLORS.cyan}88` }}>
          {brief.lead_story.signal_count} signals behind this story
        </span>
        {brief.risk_alert?.active && (
          <span
            className="font-mono text-[9px] tracking-[0.08em] px-2 py-0.5 rounded-sm"
            style={{
              color: COLORS.red,
              background: `${COLORS.red}12`,
              border: `1px solid ${COLORS.red}30`,
            }}
          >
            ● RISK ALERT
          </span>
        )}
      </div>
    </Panel>
  );
}

// ─── Three Things to Know ─────────────────────────────────────────────────────

function ThreeThings({ snapshots, loading }: { snapshots: SectorSnapshot[]; loading: boolean }) {
  const items = snapshots.slice(0, 3);

  return (
    <div>
      <SectionLabel>Three Things to Know</SectionLabel>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2.5">
        {loading ? (
          [0, 1, 2].map(i => (
            <CardSkeleton key={i} />
          ))
        ) : items.length === 0 ? (
          [0, 1, 2].map(i => (
            <Panel key={i} className="px-4 py-3.5">
              <p className="font-mono text-[10px] text-white/25 m-0">
                Analyzing...
              </p>
            </Panel>
          ))
        ) : (
          items.map((snap, i) => {
            const col = momentumColor(snap.momentum);
            return (
              <Panel key={i} className="px-4 py-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[8px] leading-none" style={{ color: col }}>●</span>
                  <span
                    className="font-mono text-[9px] tracking-[0.12em] uppercase"
                    style={{ color: col }}
                    title={snap.sector}
                  >
                    {snap.sector}
                  </span>
                  <span
                    className="ml-auto font-mono text-[7px] tracking-[0.1em]"
                    style={{ color: `${col}66` }}
                  >
                    {momentumLabel(snap.momentum)}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-white/65 m-0 leading-[1.55]">
                  {snap.one_liner}
                </p>
                <div className="mt-2 font-mono text-[8px] text-white/25">
                  {snap.signal_count} signals
                </div>
              </Panel>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Search Box ───────────────────────────────────────────────────────────────

const QUICK_PICKS = ['solar', 'drones', 'cybersecurity', 'water', 'AI/ML', 'defense'];

function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const go = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/ask?q=${encodeURIComponent(trimmed)}`);
  }, [router]);

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') go(query);
  }

  return (
    <div>
      <SectionLabel>Intelligence Search</SectionLabel>
      <Panel>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="What do you want to know?"
          className="w-full h-11 min-h-[44px] box-border rounded-sm px-4 font-mono text-[13px] text-white outline-none transition-all duration-150 bg-black/40 border border-white/[0.06] focus:bg-[rgba(0,212,255,0.05)] focus:border-[rgba(0,212,255,0.25)]"
        />
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {QUICK_PICKS.map(chip => (
            <button
              key={chip}
              onClick={() => go(chip)}
              className="font-mono text-[9px] tracking-[0.1em] uppercase rounded-sm px-2.5 py-1 min-h-[44px] cursor-pointer transition-all duration-150 border hover:brightness-125"
              style={{
                color: `${COLORS.cyan}99`,
                background: `${COLORS.cyan}08`,
                borderColor: `${COLORS.cyan}22`,
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ─── What's Surging ───────────────────────────────────────────────────────────

function SurgePanel({ trends, loading }: { trends: TrendAnalysis | null; loading: boolean }) {
  const sectors = trends?.sectors
    .slice()
    .sort((a, b) => b.signal_count - a.signal_count)
    .slice(0, 8) ?? [];

  const maxCount = sectors[0]?.signal_count ?? 1;

  return (
    <div>
      <SectionLabel>What&apos;s Surging Right Now</SectionLabel>
      <Panel>
        {loading ? (
          <div className="flex flex-col gap-2.5">
            {[0,1,2,3,4].map(i => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : sectors.length === 0 ? (
          <p className="font-mono text-[10px] text-white/30 m-0">
            Scanning sectors — check back shortly.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {sectors.map((s, i) => {
              const col = momentumColor(s.momentum);
              const pct = Math.max(4, Math.round((s.signal_count / maxCount) * 100));
              return (
                <div key={i} className="flex items-center gap-2.5">
                  {/* sector name */}
                  <div
                    className="w-[110px] shrink-0 font-mono text-[9px] text-white/70 tracking-[0.06em] truncate"
                    title={s.name}
                  >
                    {s.name}
                  </div>
                  {/* bar track */}
                  <div className="flex-1 h-1.5 bg-white/[0.04] rounded-[1px] overflow-hidden">
                    <div
                      className="h-full rounded-[1px] transition-[width] duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                      style={{
                        width: `${pct}%`,
                        background: col,
                        boxShadow: `0 0 8px ${col}55`,
                      }}
                    />
                  </div>
                  {/* pct label */}
                  <div
                    className="w-7 shrink-0 text-right font-mono text-[9px]"
                    style={{ color: col }}
                    title={`${pct}%`}
                  >
                    {pct}%
                  </div>
                  {/* momentum tag */}
                  <div
                    className="w-[68px] shrink-0 text-right font-mono text-[7px] tracking-[0.09em] uppercase"
                    style={{ color: `${col}77` }}
                    title={momentumLabel(s.momentum)}
                  >
                    {momentumLabel(s.momentum)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {trends && (
          <div className="mt-3.5 pt-3 border-t border-white/[0.06] font-mono text-[9px] text-white/35 leading-[1.5]">
            {trends.biggest_story}
          </div>
        )}
      </Panel>
    </div>
  );
}

// ─── Biggest Movers ───────────────────────────────────────────────────────────

function MoversPanel({ changed: data, loading }: { changed: WhatChanged | null; loading: boolean }) {
  const signals = data?.top_signals?.slice(0, 12) ?? [];
  const trajectories = data?.trajectory_changes?.slice(0, 6) ?? [];

  return (
    <div>
      <SectionLabel>Biggest Movers This Week</SectionLabel>
      <Panel>
        {loading ? (
          <div className="flex flex-col gap-3">
            {[0,1,2,3,4].map(i => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : signals.length === 0 ? (
          <p className="font-mono text-[10px] text-white/30 m-0">
            No high-priority signals yet. Data refreshes every 10 minutes.
          </p>
        ) : (
          <div className="flex flex-col">
            {signals.map((sig, i) => {
              const isUp = sig.importance >= 0.7;
              const arrowColor = isUp ? COLORS.emerald : COLORS.red;
              const arrow = isUp ? '▲' : '▼';
              const pctLabel = `${Math.round(sig.importance * 100)}`;
              return (
                <div
                  key={i}
                  className={`flex gap-3 items-start py-2.5 ${i < signals.length - 1 ? 'border-b border-white/[0.06]' : ''}`}
                >
                  {/* arrow + score */}
                  <div className="w-[38px] shrink-0 flex flex-col items-center pt-0.5 gap-0.5">
                    <span className="text-xs leading-none" style={{ color: arrowColor }}>{arrow}</span>
                    <span className="font-mono text-[9px] tracking-[0.04em]" style={{ color: arrowColor }}>{pctLabel}</span>
                  </div>
                  {/* title + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] text-white/80 mb-1.5 leading-[1.4] break-words" title={sig.title}>
                      {sig.title}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {sig.industry && (
                        <span
                          className="font-mono text-[8px] tracking-[0.08em] uppercase px-1.5 py-px rounded-sm"
                          style={{
                            color: `${COLORS.cyan}77`,
                            background: `${COLORS.cyan}08`,
                            border: `1px solid ${COLORS.cyan}22`,
                          }}
                          title={sig.industry}
                        >
                          {sig.industry}
                        </span>
                      )}
                      <span className="font-mono text-[8px] text-white/30 tracking-[0.06em]">
                        {signalTypeLabel(sig.signal_type)}
                      </span>
                      {sig.company && (
                        <span className="font-mono text-[8px] tracking-[0.06em]" style={{ color: `${COLORS.amber}77` }}>
                          {sig.company}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Trajectory changes summary */}
        {trajectories.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-white/[0.06]">
            <div className="font-mono text-[8px] text-white/25 tracking-[0.12em] uppercase mb-2">
              Direction Changes
            </div>
            <div className="flex flex-wrap gap-1.5">
              {trajectories.map((t, i) => {
                const isUp = t.to === 'accelerating' || t.to === 'emerging';
                const col = isUp ? COLORS.emerald : COLORS.red;
                return (
                  <div
                    key={i}
                    className="font-mono text-[9px] flex items-center gap-1.5 px-2 py-0.5 rounded-sm"
                    style={{
                      color: col,
                      background: `${col}0d`,
                      border: `1px solid ${col}25`,
                    }}
                    title={`${t.industry}: ${t.from} → ${t.to}`}
                  >
                    <span>{isUp ? '▲' : '▼'}</span>
                    <span className="tracking-[0.06em] uppercase">{t.industry}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats row */}
        {data && (
          <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex gap-5 flex-wrap">
            {[
              { label: 'signals today', value: String(data.signals_today) },
              { label: 'signals this week', value: String(data.signals_week) },
              { label: 'investment tracked', value: formatFunding(data.funding_total_30d) },
              { label: 'active sectors', value: String(data.active_industries.length) },
            ].map(stat => (
              <div key={stat.label} className="flex flex-col gap-0.5">
                <span
                  className="font-mono text-[13px] tracking-[-0.01em] tabular-nums"
                  style={{ color: COLORS.cyan }}
                >
                  {stat.value}
                </span>
                <span className="font-mono text-[8px] text-white/30 tracking-[0.1em] uppercase">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

// ─── Cross-Sector Connections ─────────────────────────────────────────────────

function CrossSectorPanel({ data, loading }: { data: CrossSectorData | null; loading: boolean }) {
  const insights = data?.insights?.slice(0, 3) ?? [];

  if (!loading && insights.length === 0) return null;

  return (
    <div>
      <SectionLabel>Cross-Sector Connections</SectionLabel>
      <div className="flex flex-col gap-2.5">
        {loading ? (
          [0, 1, 2].map(i => (
            <CardSkeleton key={i} />
          ))
        ) : (
          insights.map((ins, i) => (
            <Panel
              key={i}
              className="px-4 py-3.5 border-l-2"
              style={{ borderLeftColor: `${COLORS.cyan}44` } as React.CSSProperties}
            >
              <p className="font-sans text-xs font-semibold text-white/90 mb-1.5 leading-[1.35]">
                {ins.headline}
              </p>
              {ins.industries_involved.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {ins.industries_involved.slice(0, 4).map((ind, j) => (
                    <span
                      key={j}
                      className="font-mono text-[8px] tracking-[0.08em] uppercase px-1.5 py-px rounded-sm"
                      style={{
                        color: `${COLORS.amber}88`,
                        background: `${COLORS.amber}0d`,
                        border: `1px solid ${COLORS.amber}22`,
                      }}
                      title={ind}
                    >
                      {ind}
                    </span>
                  ))}
                </div>
              )}
              <p className="font-mono text-[10px] text-white/55 m-0 leading-[1.55]">
                {ins.implication}
              </p>
            </Panel>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Risk Alert Banner ────────────────────────────────────────────────────────

function RiskBanner({ brief }: { brief: MorningBrief | null }) {
  if (!brief?.risk_alert?.active) return null;
  return (
    <div
      className="flex items-start gap-3 rounded-sm px-5 py-2.5"
      style={{
        background: `${COLORS.red}0e`,
        border: `1px solid ${COLORS.red}30`,
      }}
    >
      <span className="text-[9px] mt-px shrink-0" style={{ color: COLORS.red }}>●</span>
      <div>
        <span className="font-mono text-[8px] tracking-[0.14em] mr-2.5" style={{ color: COLORS.red }}>
          RISK ALERT
        </span>
        <span className="font-mono text-[10px] text-white/65 leading-[1.5]">
          {brief.risk_alert.message}
        </span>
      </div>
    </div>
  );
}

// ─── Opportunity Spotlight ────────────────────────────────────────────────────

function OpportunityCard({ brief, loading }: { brief: MorningBrief | null; loading: boolean }) {
  if (!loading && !brief?.opportunity_spotlight) return null;

  return (
    <Panel className="border-l-2" style={{ borderLeftColor: COLORS.emerald } as React.CSSProperties}>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[8px]" style={{ color: COLORS.emerald }}>●</span>
        <span className="font-mono text-[8px] tracking-[0.14em]" style={{ color: COLORS.emerald }}>
          OPPORTUNITY SPOTLIGHT
        </span>
        {brief?.opportunity_spotlight && (
          <span className="ml-auto font-mono text-[9px]" style={{ color: `${COLORS.emerald}88` }}>
            Score: {brief.opportunity_spotlight.score}/100
          </span>
        )}
      </div>
      {loading ? (
        <CardSkeleton />
      ) : brief?.opportunity_spotlight ? (
        <>
          <p className="font-sans text-xs font-semibold text-white/90 mb-1.5">
            {brief.opportunity_spotlight.title}
          </p>
          <p className="font-mono text-[10px] text-white/55 m-0 leading-[1.55]">
            {brief.opportunity_spotlight.description}
          </p>
        </>
      ) : null}
    </Panel>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const now = useClock();

  const [brief, setBrief]         = useState<MorningBrief | null>(null);
  const [briefLoading, setBriefL] = useState(true);
  const [briefError, setBriefE]   = useState(false);

  const [trends, setTrends]         = useState<TrendAnalysis | null>(null);
  const [trendsLoading, setTrendsL] = useState(true);
  const [trendsError, setTrendsE]   = useState(false);

  const [changed, setChanged]         = useState<WhatChanged | null>(null);
  const [changedLoading, setChangedL] = useState(true);
  const [changedError, setChangedE]   = useState(false);

  const [cross, setCross]         = useState<CrossSectorData | null>(null);
  const [crossLoading, setCrossL] = useState(true);
  const [crossError, setCrossE]   = useState(false);

  const fetchAll = useCallback(async () => {
    // Morning brief
    setBriefL(true);
    setBriefE(false);
    fetch('/api/intelligence/morning-brief')
      .then(r => r.json())
      .then((j: { ok?: boolean; data?: MorningBrief }) => {
        if (j.ok && j.data) setBrief(j.data);
        else setBriefE(true);
      })
      .catch(() => setBriefE(true))
      .finally(() => setBriefL(false));

    // Trends
    setTrendsL(true);
    setTrendsE(false);
    fetch('/api/trends/reasoning')
      .then(r => r.json())
      .then((j: { ok?: boolean; data?: TrendAnalysis }) => {
        if (j.ok && j.data) setTrends(j.data);
        else setTrendsE(true);
      })
      .catch(() => setTrendsE(true))
      .finally(() => setTrendsL(false));

    // What changed
    setChangedL(true);
    setChangedE(false);
    fetch('/api/what-changed')
      .then(r => r.json())
      .then((j: { ok?: boolean; data?: WhatChanged }) => {
        if (j.ok && j.data) setChanged(j.data);
        else setChangedE(true);
      })
      .catch(() => setChangedE(true))
      .finally(() => setChangedL(false));

    // Cross-sector
    setCrossL(true);
    setCrossE(false);
    fetch('/api/intelligence/cross-sector')
      .then(r => r.json())
      .then((j: { ok?: boolean; data?: CrossSectorData }) => {
        if (j.ok && j.data) setCross(j.data);
        else setCrossE(true);
      })
      .catch(() => setCrossE(true))
      .finally(() => setCrossL(false));
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    const id = setInterval(fetchAll, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const snapshots = brief?.sector_snapshots ?? [];
  const greeting = getGreeting(now);

  // Check if everything failed (no data at all)
  const allFailed = !briefLoading && !trendsLoading && !changedLoading && !crossLoading
    && briefError && trendsError && changedError && crossError;

  return (
    <div className="min-h-screen bg-black font-mono text-white/[0.82] pb-16">
      {/* Background dot grid from globals.css */}
      <div className="fixed inset-0 pointer-events-none z-0 dot-grid" />

      {/* Scanlines overlay from globals.css — no fixed-position CPU hog */}
      <div className="fixed inset-0 pointer-events-none z-[1] scanlines" />

      {/* Main content */}
      <div className="relative z-[2]">
        <TopBar />

        {/* Greeting bar */}
        <div className="sticky top-11 z-40 h-9 px-5 flex items-center justify-between bg-black/80 backdrop-blur-md border-b border-white/[0.06]">
          <span className="font-mono text-[11px] text-white/55 tracking-[0.02em]">
            {greeting}
          </span>
          <div className="flex gap-3">
            {[
              { label: 'MAP', href: '/map' },
              { label: 'COMMAND', href: '/command-center' },
              { label: 'SEARCH', href: '/ask' },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="font-mono text-[8px] text-white/30 tracking-[0.12em] no-underline transition-colors duration-150 hover:text-cyan-400/60 min-h-[44px] flex items-center"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="max-w-[1140px] mx-auto px-[clamp(12px,2.5vw,20px)] py-[clamp(14px,3vw,24px)] flex flex-col gap-5">

          {/* Global error state with retry */}
          {allFailed && (
            <ErrorState
              message="Failed to load dashboard data. Check your connection and try again."
              onRetry={fetchAll}
            />
          )}

          {/* Risk banner — above fold if active */}
          <RiskBanner brief={brief} />

          {/* 1. Big story */}
          {briefError && !briefLoading && !brief ? (
            <ErrorState message="Could not load morning brief." onRetry={fetchAll} />
          ) : (
            <BigStoryCard brief={brief} loading={briefLoading} />
          )}

          {/* 2. Three things to know */}
          <ThreeThings snapshots={snapshots} loading={briefLoading} />

          {/* 3. Opportunity spotlight */}
          <OpportunityCard brief={brief} loading={briefLoading} />

          {/* 4. Search */}
          <SearchBox />

          {/* 5 + 6. Two-column: surge + movers */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
            {trendsError && !trendsLoading && !trends ? (
              <ErrorState message="Could not load trend data." onRetry={fetchAll} />
            ) : (
              <SurgePanel trends={trends} loading={trendsLoading} />
            )}
            {changedError && !changedLoading && !changed ? (
              <ErrorState message="Could not load movers data." onRetry={fetchAll} />
            ) : (
              <MoversPanel changed={changed} loading={changedLoading} />
            )}
          </div>

          {/* 7. Cross-sector connections */}
          {crossError && !crossLoading && !cross ? (
            <ErrorState message="Could not load cross-sector insights." onRetry={fetchAll} />
          ) : (
            <CrossSectorPanel data={cross} loading={crossLoading} />
          )}

          {/* Footer */}
          <div className="pt-4 pb-6 border-t border-white/[0.06] flex justify-between items-center flex-wrap gap-2">
            <span className="font-mono text-[9px] text-white/20 tracking-[0.12em]">
              NXT//LINK INTELLIGENCE DASHBOARD — AUTO-REFRESHES EVERY 10 MIN
            </span>
            <div className="flex gap-3.5">
              {[
                { label: 'MAP', href: '/map' },
                { label: 'COMMAND CENTER', href: '/command-center' },
                { label: 'INTELLIGENCE SEARCH', href: '/ask' },
              ].map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="font-mono text-[8px] tracking-[0.1em] no-underline transition-colors duration-150 min-h-[44px] flex items-center hover:text-cyan-400/60"
                  style={{ color: `${COLORS.cyan}44` }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
