'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Color constants ──────────────────────────────────────────────────────────
const CYAN   = '#00d4ff';
const GREEN  = '#10b981';
const AMBER  = '#f59e0b';
const ROSE   = '#f43f5e';
const PANEL  = '#080c14';
const BORDER = '#1a2332';

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
  if (m === 'accelerating') return GREEN;
  if (m === 'steady')       return AMBER;
  if (m === 'slowing')      return AMBER;
  return ROSE;
}

function momentumLabel(m: SectorMomentum): string {
  if (m === 'accelerating') return 'SURGING';
  if (m === 'steady')       return 'STEADY';
  if (m === 'slowing')      return 'SLOWING';
  return 'DECLINING';
}

function signalTypeLabel(t: string): string {
  const map: Record<string, string> = {
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

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = 12, radius = 2 }: { w?: string | number; h?: number; radius?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'linear-gradient(90deg, #0d1520 25%, #1a2332 50%, #0d1520 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.6s ease-in-out infinite',
    }} />
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.28)',
      fontFamily: 'IBM Plex Mono, monospace', marginBottom: 12,
      textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ display: 'inline-block', width: 14, height: 1, background: `${CYAN}44` }} />
      {children}
      <span style={{ display: 'inline-block', flex: 1, height: 1, background: `${BORDER}` }} />
    </div>
  );
}

// ─── Panel wrapper ────────────────────────────────────────────────────────────

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: PANEL,
      border: `1px solid ${BORDER}`,
      borderRadius: 2,
      padding: '16px 20px',
      position: 'relative',
      overflow: 'hidden',
      ...style,
    }}>
      {/* top glow line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${CYAN}18, transparent)`,
        pointerEvents: 'none',
      }} />
      {children}
    </div>
  );
}

// ─── Big Story Card ───────────────────────────────────────────────────────────

function BigStoryCard({ brief, loading }: { brief: MorningBrief | null; loading: boolean }) {
  if (loading) {
    return (
      <Panel style={{ borderLeft: `3px solid ${CYAN}44` }}>
        <SectionLabel>Lead Story</SectionLabel>
        <Skeleton h={18} w="75%" />
        <div style={{ height: 8 }} />
        <Skeleton h={11} />
        <div style={{ height: 4 }} />
        <Skeleton h={11} w="85%" />
        <div style={{ height: 4 }} />
        <Skeleton h={11} w="60%" />
      </Panel>
    );
  }

  if (!brief) {
    return (
      <Panel style={{ borderLeft: `3px solid ${CYAN}22` }}>
        <SectionLabel>Lead Story</SectionLabel>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
          Analyzing signals — check back in a moment.
        </p>
      </Panel>
    );
  }

  return (
    <Panel style={{ borderLeft: `3px solid ${CYAN}` }}>
      <SectionLabel>
        Lead Story
        {brief.ai_generated && (
          <span style={{ color: `${CYAN}88`, fontSize: 7 }}>AI WRITTEN</span>
        )}
      </SectionLabel>
      <h2 style={{
        fontFamily: 'Space Grotesk, sans-serif', fontSize: 'clamp(13px, 2vw, 16px)',
        fontWeight: 600, color: '#fff', margin: '0 0 10px',
        lineHeight: 1.35, letterSpacing: '-0.01em',
      }}>
        {brief.lead_story.headline}
      </h2>
      <p style={{
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
        color: 'rgba(255,255,255,0.65)', margin: '0 0 12px', lineHeight: 1.65,
      }}>
        {brief.lead_story.narrative}
      </p>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 9,
          color: `${CYAN}88`, letterSpacing: '0.1em',
        }}>
          {brief.lead_story.signal_count} signals behind this story
        </span>
        {brief.risk_alert?.active && (
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 9,
            color: ROSE, letterSpacing: '0.08em',
            background: `${ROSE}12`, border: `1px solid ${ROSE}30`,
            padding: '2px 8px', borderRadius: 2,
          }}>
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
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 10,
      }}>
        {loading ? (
          [0, 1, 2].map(i => (
            <Panel key={i} style={{ padding: '14px 16px' }}>
              <Skeleton h={9} w="40%" />
              <div style={{ height: 8 }} />
              <Skeleton h={11} />
              <div style={{ height: 4 }} />
              <Skeleton h={11} w="70%" />
            </Panel>
          ))
        ) : items.length === 0 ? (
          [0, 1, 2].map(i => (
            <Panel key={i} style={{ padding: '14px 16px' }}>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
                Analyzing...
              </p>
            </Panel>
          ))
        ) : (
          items.map((snap, i) => {
            const col = momentumColor(snap.momentum);
            return (
              <Panel key={i} style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 8, color: col, lineHeight: 1 }}>●</span>
                  <span style={{
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 9,
                    color: col, letterSpacing: '0.12em', textTransform: 'uppercase',
                  }}>
                    {snap.sector}
                  </span>
                  <span style={{
                    marginLeft: 'auto', fontFamily: 'IBM Plex Mono, monospace', fontSize: 7,
                    color: `${col}66`, letterSpacing: '0.1em',
                  }}>
                    {momentumLabel(snap.momentum)}
                  </span>
                </div>
                <p style={{
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
                  color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.55,
                }}>
                  {snap.one_liner}
                </p>
                <div style={{ marginTop: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>
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
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      <Panel style={{ padding: '16px 20px' }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="What do you want to know?"
          style={{
            width: '100%', height: 44, boxSizing: 'border-box',
            background: focused ? 'rgba(0,212,255,0.05)' : 'rgba(0,0,0,0.4)',
            border: `1px solid ${focused ? `${CYAN}40` : BORDER}`,
            borderRadius: 2, padding: '0 16px',
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 13,
            color: '#fff', outline: 'none',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        />
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {QUICK_PICKS.map(chip => (
            <button
              key={chip}
              onClick={() => go(chip)}
              style={{
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 9,
                color: `${CYAN}99`, letterSpacing: '0.1em',
                background: `${CYAN}08`, border: `1px solid ${CYAN}22`,
                borderRadius: 2, padding: '4px 10px', cursor: 'pointer',
                textTransform: 'uppercase', transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = `${CYAN}18`;
                (e.currentTarget as HTMLButtonElement).style.borderColor = `${CYAN}44`;
                (e.currentTarget as HTMLButtonElement).style.color = CYAN;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = `${CYAN}08`;
                (e.currentTarget as HTMLButtonElement).style.borderColor = `${CYAN}22`;
                (e.currentTarget as HTMLButtonElement).style.color = `${CYAN}99`;
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Skeleton w={90} h={9} />
                <div style={{ flex: 1 }}>
                  <Skeleton h={8} w={`${40 + i * 10}%`} />
                </div>
                <Skeleton w={30} h={9} />
              </div>
            ))}
          </div>
        ) : sectors.length === 0 ? (
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            Scanning sectors — check back shortly.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sectors.map((s, i) => {
              const col = momentumColor(s.momentum);
              const pct = Math.max(4, Math.round((s.signal_count / maxCount) * 100));
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* sector name */}
                  <div style={{
                    width: 110, flexShrink: 0,
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 9,
                    color: 'rgba(255,255,255,0.7)', letterSpacing: '0.06em',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {s.name}
                  </div>
                  {/* bar track */}
                  <div style={{
                    flex: 1, height: 6, background: 'rgba(255,255,255,0.04)',
                    borderRadius: 1, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${pct}%`, height: '100%',
                      background: col,
                      boxShadow: `0 0 8px ${col}55`,
                      borderRadius: 1,
                      transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                    }} />
                  </div>
                  {/* pct label */}
                  <div style={{
                    width: 28, flexShrink: 0, textAlign: 'right',
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: col,
                  }}>
                    {pct}%
                  </div>
                  {/* momentum tag */}
                  <div style={{
                    width: 68, flexShrink: 0,
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 7,
                    color: `${col}77`, letterSpacing: '0.09em',
                    textTransform: 'uppercase', textAlign: 'right',
                  }}>
                    {momentumLabel(s.momentum)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {trends && (
          <div style={{
            marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BORDER}`,
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 9,
            color: 'rgba(255,255,255,0.35)', lineHeight: 1.5,
          }}>
            {trends.biggest_story}
          </div>
        )}
      </Panel>
    </div>
  );
}

// ─── Biggest Movers ───────────────────────────────────────────────────────────

function MoversPanel({ changed: data, loading }: { changed: WhatChanged | null; loading: boolean }) {
  const signals = data?.top_signals?.slice(0, 5) ?? [];
  const trajectories = data?.trajectory_changes?.slice(0, 3) ?? [];

  return (
    <div>
      <SectionLabel>Biggest Movers This Week</SectionLabel>
      <Panel>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Skeleton w={16} h={16} radius={2} />
                <div style={{ flex: 1 }}>
                  <Skeleton h={10} w="80%" />
                  <div style={{ height: 4 }} />
                  <Skeleton h={8} w="35%" />
                </div>
              </div>
            ))}
          </div>
        ) : signals.length === 0 ? (
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            No high-priority signals yet. Data refreshes every 10 minutes.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {signals.map((sig, i) => {
              const isUp = sig.importance >= 0.7;
              const arrowColor = isUp ? GREEN : ROSE;
              const arrow = isUp ? '▲' : '▼';
              const pctLabel = `${Math.round(sig.importance * 100)}`;
              return (
                <div key={i} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '10px 0',
                  borderBottom: i < signals.length - 1 ? `1px solid ${BORDER}` : 'none',
                }}>
                  {/* arrow + score */}
                  <div style={{
                    width: 38, flexShrink: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', paddingTop: 2, gap: 2,
                  }}>
                    <span style={{ fontSize: 12, color: arrowColor, lineHeight: 1 }}>{arrow}</span>
                    <span style={{
                      fontFamily: 'IBM Plex Mono, monospace', fontSize: 9,
                      color: arrowColor, letterSpacing: '0.04em',
                    }}>{pctLabel}</span>
                  </div>
                  {/* title + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
                      color: 'rgba(255,255,255,0.8)', margin: '0 0 5px',
                      lineHeight: 1.4, wordBreak: 'break-word',
                    }}>
                      {sig.title}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {sig.industry && (
                        <span style={{
                          fontFamily: 'IBM Plex Mono, monospace', fontSize: 8,
                          color: `${CYAN}77`, background: `${CYAN}08`,
                          border: `1px solid ${CYAN}22`, padding: '1px 6px', borderRadius: 2,
                          letterSpacing: '0.08em', textTransform: 'uppercase',
                        }}>
                          {sig.industry}
                        </span>
                      )}
                      <span style={{
                        fontFamily: 'IBM Plex Mono, monospace', fontSize: 8,
                        color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em',
                      }}>
                        {signalTypeLabel(sig.signal_type)}
                      </span>
                      {sig.company && (
                        <span style={{
                          fontFamily: 'IBM Plex Mono, monospace', fontSize: 8,
                          color: `${AMBER}77`, letterSpacing: '0.06em',
                        }}>
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
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
            <div style={{
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 8,
              color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em',
              textTransform: 'uppercase', marginBottom: 8,
            }}>
              Direction Changes
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {trajectories.map((t, i) => {
                const isUp = t.to === 'accelerating' || t.to === 'emerging';
                const col = isUp ? GREEN : ROSE;
                return (
                  <div key={i} style={{
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 9,
                    color: col, background: `${col}0d`,
                    border: `1px solid ${col}25`, padding: '3px 8px', borderRadius: 2,
                    display: 'flex', gap: 5, alignItems: 'center',
                  }}>
                    <span>{isUp ? '▲' : '▼'}</span>
                    <span style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t.industry}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats row */}
        {data && (
          <div style={{
            marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BORDER}`,
            display: 'flex', gap: 20, flexWrap: 'wrap',
          }}>
            {[
              { label: 'signals today', value: String(data.signals_today) },
              { label: 'signals this week', value: String(data.signals_week) },
              { label: 'investment tracked', value: formatFunding(data.funding_total_30d) },
              { label: 'active sectors', value: String(data.active_industries.length) },
            ].map(stat => (
              <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 13,
                  color: CYAN, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums',
                }}>
                  {stat.value}
                </span>
                <span style={{
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 8,
                  color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          [0, 1, 2].map(i => (
            <Panel key={i} style={{ padding: '14px 16px' }}>
              <Skeleton h={11} w="65%" />
              <div style={{ height: 6 }} />
              <Skeleton h={10} />
              <div style={{ height: 4 }} />
              <Skeleton h={10} w="80%" />
            </Panel>
          ))
        ) : (
          insights.map((ins, i) => (
            <Panel key={i} style={{
              padding: '14px 16px',
              borderLeft: `2px solid ${CYAN}44`,
            }}>
              <p style={{
                fontFamily: 'Space Grotesk, sans-serif', fontSize: 12,
                fontWeight: 600, color: 'rgba(255,255,255,0.9)',
                margin: '0 0 6px', lineHeight: 1.35,
              }}>
                {ins.headline}
              </p>
              {ins.industries_involved.length > 0 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                  {ins.industries_involved.slice(0, 4).map((ind, j) => (
                    <span key={j} style={{
                      fontFamily: 'IBM Plex Mono, monospace', fontSize: 8,
                      color: `${AMBER}88`, background: `${AMBER}0d`,
                      border: `1px solid ${AMBER}22`, padding: '1px 6px',
                      borderRadius: 2, letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                      {ind}
                    </span>
                  ))}
                </div>
              )}
              <p style={{
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
                color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.55,
              }}>
                {ins.implication}
              </p>
            </Panel>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Top nav bar ──────────────────────────────────────────────────────────────

function TopBar({ now }: { now: Date | null }) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const up = () => setOnline(true);
    const dn = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', dn);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', dn);
    };
  }, []);

  const time = now?.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  }) ?? '--:--:-- --';

  const date = now?.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }) ?? '';

  return (
    <div style={{
      height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', background: '#060a12',
      borderBottom: `1px solid ${BORDER}`, flexShrink: 0,
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      {/* Left: greeting */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif', fontSize: 14,
            fontWeight: 700, color: CYAN, letterSpacing: '0.08em',
          }}>
            NXT<span style={{ color: `${CYAN}44` }}>//</span>LINK
          </span>
        </Link>
        <span style={{ width: 1, height: 16, background: BORDER, flexShrink: 0 }} />
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
          color: 'rgba(255,255,255,0.55)', letterSpacing: '0.02em',
        }}>
          {getGreeting(now)}
        </span>
      </div>

      {/* Right: clock + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Nav links */}
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { label: 'MAP', href: '/map' },
            { label: 'COMMAND', href: '/command-center' },
            { label: 'SEARCH', href: '/ask' },
          ].map(link => (
            <Link key={link.href} href={link.href} style={{
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 8,
              color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em',
              textDecoration: 'none', transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = `${CYAN}99`}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.3)'}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <span style={{ width: 1, height: 16, background: BORDER }} />

        {/* Clock */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
            color: 'rgba(0,212,255,0.7)', fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.04em', lineHeight: 1.1,
          }}>
            {time}
          </div>
          <div style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 8,
            color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em',
          }}>
            {date}
          </div>
        </div>

        <span style={{ width: 1, height: 16, background: BORDER }} />

        {/* System status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: online ? GREEN : ROSE,
            boxShadow: `0 0 8px ${online ? GREEN : ROSE}`,
            display: 'inline-block',
            animation: 'db-pulse 2.5s ease-in-out infinite',
          }} />
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 8,
            color: online ? `${GREEN}88` : `${ROSE}88`,
            letterSpacing: '0.12em',
          }}>
            {online ? 'SYSTEM ONLINE' : 'OFFLINE'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Risk Alert Banner ────────────────────────────────────────────────────────

function RiskBanner({ brief }: { brief: MorningBrief | null }) {
  if (!brief?.risk_alert?.active) return null;
  return (
    <div style={{
      background: `${ROSE}0e`, border: `1px solid ${ROSE}30`,
      borderRadius: 2, padding: '10px 20px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <span style={{ fontSize: 9, color: ROSE, marginTop: 1, flexShrink: 0 }}>●</span>
      <div>
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 8,
          color: ROSE, letterSpacing: '0.14em', marginRight: 10,
        }}>
          RISK ALERT
        </span>
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
          color: 'rgba(255,255,255,0.65)', lineHeight: 1.5,
        }}>
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
    <Panel style={{ borderLeft: `2px solid ${GREEN}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 8, color: GREEN }}>●</span>
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 8,
          color: GREEN, letterSpacing: '0.14em',
        }}>
          OPPORTUNITY SPOTLIGHT
        </span>
        {brief?.opportunity_spotlight && (
          <span style={{
            marginLeft: 'auto', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9,
            color: `${GREEN}88`,
          }}>
            Score: {brief.opportunity_spotlight.score}/100
          </span>
        )}
      </div>
      {loading ? (
        <>
          <Skeleton h={12} w="60%" />
          <div style={{ height: 6 }} />
          <Skeleton h={10} />
          <div style={{ height: 4 }} />
          <Skeleton h={10} w="75%" />
        </>
      ) : brief?.opportunity_spotlight ? (
        <>
          <p style={{
            fontFamily: 'Space Grotesk, sans-serif', fontSize: 12,
            fontWeight: 600, color: 'rgba(255,255,255,0.9)', margin: '0 0 6px',
          }}>
            {brief.opportunity_spotlight.title}
          </p>
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
            color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.55,
          }}>
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

  const [trends, setTrends]         = useState<TrendAnalysis | null>(null);
  const [trendsLoading, setTrendsL] = useState(true);

  const [changed, setChanged]         = useState<WhatChanged | null>(null);
  const [changedLoading, setChangedL] = useState(true);

  const [cross, setCross]         = useState<CrossSectorData | null>(null);
  const [crossLoading, setCrossL] = useState(true);

  const fetchAll = useCallback(async () => {
    // Morning brief
    setBriefL(true);
    fetch('/api/intelligence/morning-brief')
      .then(r => r.json())
      .then((j: { ok?: boolean; data?: MorningBrief }) => {
        if (j.ok && j.data) setBrief(j.data);
      })
      .catch(() => {})
      .finally(() => setBriefL(false));

    // Trends
    setTrendsL(true);
    fetch('/api/trends/reasoning')
      .then(r => r.json())
      .then((j: { ok?: boolean; data?: TrendAnalysis }) => {
        if (j.ok && j.data) setTrends(j.data);
      })
      .catch(() => {})
      .finally(() => setTrendsL(false));

    // What changed
    setChangedL(true);
    fetch('/api/what-changed')
      .then(r => r.json())
      .then((j: { ok?: boolean; data?: WhatChanged }) => {
        if (j.ok && j.data) setChanged(j.data);
      })
      .catch(() => {})
      .finally(() => setChangedL(false));

    // Cross-sector
    setCrossL(true);
    fetch('/api/intelligence/cross-sector')
      .then(r => r.json())
      .then((j: { ok?: boolean; data?: CrossSectorData }) => {
        if (j.ok && j.data) setCross(j.data);
      })
      .catch(() => {})
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

  return (
    <div style={{
      minHeight: '100vh', background: '#000',
      fontFamily: 'IBM Plex Mono, monospace',
      color: 'rgba(255,255,255,0.82)',
    }}>
      {/* Background subtle grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `
          linear-gradient(${CYAN}09 1px, transparent 1px),
          linear-gradient(90deg, ${CYAN}09 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
      }} />

      {/* Scanlines overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,212,255,0.006) 3px, rgba(0,212,255,0.006) 4px)',
      }} />

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <TopBar now={now} />

        <div style={{
          maxWidth: 1140, margin: '0 auto',
          padding: 'clamp(14px, 3vw, 24px) clamp(12px, 2.5vw, 20px)',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>

          {/* Risk banner — above fold if active */}
          <RiskBanner brief={brief} />

          {/* 1. Big story */}
          <BigStoryCard brief={brief} loading={briefLoading} />

          {/* 2. Three things to know */}
          <ThreeThings snapshots={snapshots} loading={briefLoading} />

          {/* 3. Opportunity spotlight */}
          <OpportunityCard brief={brief} loading={briefLoading} />

          {/* 4. Search */}
          <SearchBox />

          {/* 5 + 6. Two-column: surge + movers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
          }}>
            <SurgePanel trends={trends} loading={trendsLoading} />
            <MoversPanel changed={changed} loading={changedLoading} />
          </div>

          {/* 7. Cross-sector connections */}
          <CrossSectorPanel data={cross} loading={crossLoading} />

          {/* Footer */}
          <div style={{
            paddingTop: 16, paddingBottom: 24,
            borderTop: `1px solid ${BORDER}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 8,
          }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em' }}>
              NXT//LINK INTELLIGENCE DASHBOARD — AUTO-REFRESHES EVERY 10 MIN
            </span>
            <div style={{ display: 'flex', gap: 14 }}>
              {[
                { label: 'MAP', href: '/map' },
                { label: 'COMMAND CENTER', href: '/command-center' },
                { label: 'INTELLIGENCE SEARCH', href: '/ask' },
              ].map(l => (
                <Link key={l.href} href={l.href} style={{
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 8,
                  color: `${CYAN}44`, letterSpacing: '0.1em', textDecoration: 'none',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = `${CYAN}99`}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = `${CYAN}44`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes db-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.8); }
        }
        @media (max-width: 768px) {
          /* Force single column on mobile — handled by auto-fit above,
             but make section label text readable */
        }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
