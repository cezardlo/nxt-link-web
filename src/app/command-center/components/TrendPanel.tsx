'use client';
// src/app/command-center/components/TrendPanel.tsx
// "What's Happening" — cross-sector trend analysis panel.
// Fetches /api/trends/reasoning (10 min cache) and renders:
//   1. Biggest story banner
//   2. Overall narrative
//   3. Sector cards grid (momentum-colored)
//   4. Cross-sector trends
//   5. Watch list

import { useEffect, useRef, useState } from 'react';
import type { TrendAnalysis, SectorMomentum } from '../types/intel';

// ─── Color constants ───────────────────────────────────────────────────────────

const C    = '#00D4FF';
const G    = '#10b981';
const GOLD = '#f59e0b';
const O    = '#F97316';
const R    = '#f43f5e';
const DIM  = 'rgba(0,212,255,0.09)';

const MOMENTUM_COLOR: Record<SectorMomentum, string> = {
  accelerating: G,
  steady:       GOLD,
  slowing:      O,
  declining:    R,
};

const MOMENTUM_LABEL: Record<SectorMomentum, string> = {
  accelerating: 'ACCEL',
  steady:       'STEADY',
  slowing:      'SLOWING',
  declining:    'DECLINE',
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {([100, 60, 80, 60] as const).map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 48 : 28,
          width: `${w}%`,
          background: 'rgba(0,212,255,0.04)',
          border: `1px solid ${DIM}`,
          borderRadius: 2,
          animation: 'tp-shimmer 1.6s ease-in-out infinite',
          animationDelay: `${i * 0.18}s`,
        }} />
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            height: 96,
            background: 'rgba(0,212,255,0.03)',
            border: `1px solid ${DIM}`,
            borderRadius: 2,
            animation: 'tp-shimmer 1.6s ease-in-out infinite',
            animationDelay: `${i * 0.12 + 0.5}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState() {
  return (
    <div style={{ padding: 28, textAlign: 'center' }}>
      <span style={{
        fontSize: 9, color: 'rgba(255,255,255,0.18)',
        fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.12em',
      }}>
        TREND ANALYSIS UNAVAILABLE
      </span>
    </div>
  );
}

// ─── Biggest story banner ──────────────────────────────────────────────────────

function BiggestStory({ text }: { text: string }) {
  return (
    <div style={{
      margin: '0 0 10px',
      padding: '11px 13px',
      background: 'linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(0,212,255,0.02) 100%)',
      borderLeft: `2px solid ${C}`,
      border: `1px solid rgba(0,212,255,0.13)`,
      borderLeftWidth: 2,
      borderRadius: 2,
      position: 'relative',
    }}>
      <div style={{
        fontSize: 7, color: `rgba(0,212,255,0.42)`, letterSpacing: '0.2em',
        marginBottom: 6, fontFamily: 'IBM Plex Mono, monospace',
        textTransform: 'uppercase',
      }}>
        Biggest Story
      </div>
      <p style={{
        margin: 0, fontSize: 11,
        color: 'rgba(255,255,255,0.92)', lineHeight: 1.55,
        fontFamily: 'IBM Plex Mono, monospace', fontWeight: 500,
      }}>
        {text}
      </p>
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 1,
        background: 'linear-gradient(180deg, transparent, rgba(0,212,255,0.15), transparent)',
      }} />
    </div>
  );
}

// ─── Overall narrative ────────────────────────────────────────────────────────

function Narrative({ text }: { text: string }) {
  return (
    <p style={{
      margin: '0 0 12px',
      fontSize: 10, color: 'rgba(255,255,255,0.58)',
      lineHeight: 1.65, fontFamily: 'IBM Plex Mono, monospace',
    }}>
      {text}
    </p>
  );
}

// ─── Sector card ──────────────────────────────────────────────────────────────

type SectorCardProps = {
  name: string;
  momentum: SectorMomentum;
  what_is_happening: string;
  where_heading: string;
  signal_count: number;
  confidence: number;
};

function SectorCard({ name, momentum, what_is_happening, where_heading, signal_count, confidence }: SectorCardProps) {
  const mc = MOMENTUM_COLOR[momentum];
  const ml = MOMENTUM_LABEL[momentum];

  return (
    <div style={{
      padding: 9,
      background: `${mc}04`,
      border: `1px solid ${mc}18`,
      borderLeft: `2px solid ${mc}`,
      borderRadius: 2,
      display: 'flex', flexDirection: 'column', gap: 5,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: mc, boxShadow: `0 0 5px ${mc}88`, flexShrink: 0,
        }} />
        <span style={{
          flex: 1, fontSize: 9, color: 'rgba(255,255,255,0.88)',
          fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600,
          letterSpacing: '0.04em', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </span>
        <span style={{
          fontSize: 7, color: mc,
          background: `${mc}12`, border: `1px solid ${mc}25`,
          borderRadius: 2, padding: '1px 5px',
          letterSpacing: '0.1em', fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0,
        }}>
          {ml}
        </span>
        <span style={{
          fontSize: 7, color: 'rgba(0,212,255,0.30)',
          fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0, marginLeft: 3,
        }}>
          {signal_count}
        </span>
      </div>

      {/* What is happening */}
      <p style={{
        margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.55)',
        lineHeight: 1.5, fontFamily: 'IBM Plex Mono, monospace',
        display: '-webkit-box', WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {what_is_happening}
      </p>

      {/* Where it's heading */}
      <p style={{
        margin: 0, fontSize: 9, color: `${mc}80`,
        lineHeight: 1.4, fontFamily: 'IBM Plex Mono, monospace', fontStyle: 'italic',
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {where_heading}
      </p>

      {/* Confidence */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 7, color: 'rgba(0,212,255,0.28)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.12em', flexShrink: 0 }}>
          CONF
        </span>
        <div style={{ flex: 1, height: 3, background: 'rgba(0,212,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${Math.round(confidence * 100)}%`,
            background: `linear-gradient(90deg, ${mc}99, ${mc})`,
            borderRadius: 2,
            transition: 'width 0.7s cubic-bezier(.25,.46,.45,.94)',
            boxShadow: `0 0 4px ${mc}66`,
          }} />
        </div>
        <span style={{ fontSize: 7, color: mc, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, flexShrink: 0 }}>
          {Math.round(confidence * 100)}%
        </span>
      </div>
    </div>
  );
}

// ─── Cross-sector trends ──────────────────────────────────────────────────────

function CrossSectorBlock({ trends }: { trends: TrendAnalysis['cross_sector_trends'] }) {
  if (trends.length === 0) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: 7, color: 'rgba(0,212,255,0.38)', letterSpacing: '0.2em',
        marginBottom: 8, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase',
      }}>
        Cross-Sector Signals
      </div>
      {trends.map((t, i) => (
        <div key={i} style={{
          display: 'flex', gap: 7, padding: '5px 0',
          borderBottom: `1px solid ${DIM}`, alignItems: 'flex-start',
        }}>
          <span style={{ color: C, fontSize: 8, flexShrink: 0, marginTop: 1, fontFamily: 'IBM Plex Mono, monospace' }}>
            ◆
          </span>
          <div>
            <p style={{
              margin: '0 0 4px', fontSize: 9,
              color: 'rgba(255,255,255,0.70)', lineHeight: 1.45,
              fontFamily: 'IBM Plex Mono, monospace',
            }}>
              {t.trend}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 3 }}>
              {t.sectors_affected.map(s => (
                <span key={s} style={{
                  fontSize: 7, color: `${C}50`,
                  background: `${C}08`, border: `1px solid ${C}16`,
                  borderRadius: 2, padding: '1px 5px',
                  fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.07em',
                }}>
                  {s}
                </span>
              ))}
            </div>
            <span style={{
              fontSize: 7, color: 'rgba(255,215,0,0.45)',
              fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em',
            }}>
              {t.timeline}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Watch list ───────────────────────────────────────────────────────────────

function WatchListBlock({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      <div style={{
        fontSize: 7, color: 'rgba(0,212,255,0.38)', letterSpacing: '0.2em',
        marginBottom: 8, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase',
      }}>
        Watch List
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, padding: '3px 0', alignItems: 'flex-start' }}>
          <span style={{
            color: 'rgba(0,212,255,0.28)', fontSize: 8, flexShrink: 0, marginTop: 1,
            fontFamily: 'IBM Plex Mono, monospace',
          }}>
            ›
          </span>
          <span style={{
            fontSize: 9, color: 'rgba(255,255,255,0.38)',
            lineHeight: 1.5, fontFamily: 'IBM Plex Mono, monospace',
          }}>
            {item}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── API response shape ───────────────────────────────────────────────────────

type ApiResponse = {
  ok: boolean;
  data?: TrendAnalysis;
  cached?: boolean;
  error?: string;
  message?: string;
};

// ─── Main component ────────────────────────────────────────────────────────────

const REFRESH_MS = 10 * 60 * 1000;

export default function TrendPanel() {
  const [data, setData]       = useState<TrendAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const mountedRef            = useRef(false);

  async function load() {
    setError(false);
    try {
      const res = await fetch('/api/trends/reasoning');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiResponse = await res.json();
      if (!json.ok || !json.data) throw new Error(json.error ?? json.message ?? 'No data');
      setData(json.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const genTime = data?.timestamp
    ? new Date(data.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : null;

  return (
    <div className="cc-panel" style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', borderBottom: `1px solid ${DIM}`,
        background: 'rgba(4,8,18,0.8)', flexShrink: 0,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: C, boxShadow: `0 0 6px ${C}` }} />
        <span style={{
          fontSize: 8, letterSpacing: '0.12em', color: C,
          fontFamily: 'IBM Plex Mono, monospace',
        }}>
          WHAT&apos;S HAPPENING
        </span>
        {data && (
          <span style={{
            marginLeft: 'auto', fontSize: 7,
            color: 'rgba(0,212,255,0.28)', fontFamily: 'IBM Plex Mono, monospace',
          }}>
            {data.total_signals_analyzed} SIG
          </span>
        )}
        {genTime && (
          <span style={{
            fontSize: 7, color: 'rgba(0,212,255,0.22)',
            fontFamily: 'IBM Plex Mono, monospace', marginLeft: 6,
          }}>
            {genTime}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && <Skeleton />}
        {!loading && error && <ErrorState />}
        {!loading && !error && data && (
          <div style={{ padding: '10px 10px 18px' }}>
            <BiggestStory text={data.biggest_story} />
            <Narrative text={data.overall_narrative} />

            {/* Sector grid — 2 columns */}
            {data.sectors.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  fontSize: 7, color: 'rgba(0,212,255,0.38)', letterSpacing: '0.2em',
                  marginBottom: 8, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase',
                }}>
                  Sector Breakdown
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                  {data.sectors.slice(0, 8).map(card => (
                    <SectorCard
                      key={card.name}
                      name={card.name}
                      momentum={card.momentum}
                      what_is_happening={card.what_is_happening}
                      where_heading={card.where_heading}
                      signal_count={card.signal_count}
                      confidence={card.confidence}
                    />
                  ))}
                </div>
              </div>
            )}

            <CrossSectorBlock trends={data.cross_sector_trends} />
            <WatchListBlock items={data.watch_list} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes tp-shimmer {
          0%, 100% { opacity: 0.22; }
          50%       { opacity: 0.55; }
        }
      `}</style>
    </div>
  );
}
