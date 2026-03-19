'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Brain, type MorningData, type BrainSignal, type DecisionPayload } from '@/lib/brain';

// ─── Design tokens ────────────────────────────────────────────────────────────
const ORANGE = '#ff6600';
const CYAN   = '#00d4ff';
const GREEN  = '#00ff88';
const GOLD   = '#ffd700';
const RED    = '#ff3b30';
const FONT   = "'JetBrains Mono', 'Courier New', monospace";

// ─── Hooks ────────────────────────────────────────────────────────────────────

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

function useStreak(): number {
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    try {
      const raw  = localStorage.getItem('nxt_streak');
      const data = raw ? JSON.parse(raw) : null;
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (data?.lastDate === today) {
        setStreak(data.count ?? 1);
      } else if (data?.lastDate === yesterday) {
        const n = (data.count ?? 0) + 1;
        localStorage.setItem('nxt_streak', JSON.stringify({ lastDate: today, count: n }));
        setStreak(n);
      } else {
        localStorage.setItem('nxt_streak', JSON.stringify({ lastDate: today, count: 1 }));
        setStreak(1);
      }
    } catch { setStreak(1); }
  }, []);
  return streak;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toPlainEnglish(signal: BrainSignal): string {
  const title      = signal.title || '';
  const industry   = signal.industry || 'technology';
  const importance = signal.importance || 0;

  if (title.length > 20 && !title.includes('_')) {
    const snippet = title.slice(0, 90);
    if (importance >= 0.85) return `${snippet} — needs your attention.`;
    if (importance >= 0.65) return `${snippet} — worth watching.`;
    return snippet;
  }
  if (importance >= 0.85) return `${industry} is changing fast — urgent for El Paso businesses.`;
  return `New activity in ${industry} this week.`;
}

function signalIcon(importance: number): { icon: string; color: string } {
  if (importance >= 0.85) return { icon: '●', color: RED  };
  if (importance >= 0.65) return { icon: '✦', color: GOLD };
  return { icon: '·', color: '#444444' };
}

function industrySlug(name: string): string {
  return name.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-');
}

function badgeFor(type: DecisionPayload['type']): { label: string; color: string } {
  switch (type) {
    case 'ACT_BEFORE_DATE': return { label: 'URGENT', color: RED   };
    case 'WATCH_THIS':      return { label: 'WATCH',  color: GOLD  };
    case 'CALL_SOMEONE':    return { label: 'CALL',   color: CYAN  };
    default:                return { label: 'FYI',    color: '#555555' };
  }
}

function buildBars(
  movement: Array<{ sector: string; momentum: string; signal_count: number }>,
): Array<{ sector: string; momentum: string; signal_count: number; bars: string; arrow: string; arrowColor: string; countLabel: string }> {
  const top = movement.slice(0, 6);
  const max = Math.max(...top.map(m => m.signal_count), 1);
  return top.map(m => {
    const filled  = Math.round((m.signal_count / max) * 12);
    const bars    = '█'.repeat(filled).padEnd(12, ' ');
    const [arrow, arrowColor] =
      m.momentum === 'accelerating' ? ['↑', GREEN] :
      m.momentum === 'declining'    ? ['↓', RED]   :
                                      ['→', GOLD];
    const countLabel =
      m.momentum === 'accelerating' ? `+${m.signal_count} signals` :
      m.momentum === 'declining'    ? `-${m.signal_count} signals` :
                                      'steady';
    return { ...m, bars, arrow, arrowColor, countLabel };
  });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const NAV_TABS = [
  { label: 'TODAY',   href: '/'          },
  { label: 'EXPLORE', href: '/explore'   },
  { label: 'WORLD',   href: '/world'     },
  { label: 'FOLLOW',  href: '/following' },
  { label: 'STORE',   href: '/store'     },
  { label: 'DOSSIER', href: '/dossier'   },
];

function BottomNav() {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 48,
      background: '#0f0f0f', borderTop: '1px solid #222',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      fontFamily: FONT, zIndex: 100,
    }}>
      {NAV_TABS.map((t, i) => (
        <Link key={t.label} href={t.href} style={{
          color: i === 0 ? ORANGE : '#444444',
          fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
          textDecoration: 'none', padding: '8px 4px',
          borderTop: i === 0 ? `2px solid ${ORANGE}` : '2px solid transparent',
          flex: 1, textAlign: 'center', display: 'block',
        }}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}

function ActionCard({ one_thing }: { one_thing: DecisionPayload }) {
  const badge = badgeFor(one_thing.type);
  return (
    <div style={{
      background: '#161616',
      border: '1px solid #2a1a0a',
      borderLeft: `4px solid ${ORANGE}`,
      borderRadius: 4,
      padding: 16,
      marginBottom: 24,
    }}>
      {/* header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 9, color: '#555555', letterSpacing: '0.2em', fontFamily: FONT }}>
          TODAY&apos;S ACTION
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
          color: badge.color, background: `${badge.color}18`,
          padding: '2px 7px', borderRadius: 2, fontFamily: FONT,
        }}>
          {badge.label}
        </span>
      </div>

      {/* headline */}
      <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', marginBottom: 6, lineHeight: 1.3 }}>
        {one_thing.headline}
      </div>

      {/* detail */}
      <div style={{ fontSize: 13, color: '#888888', lineHeight: 1.55, marginBottom: 12 }}>
        {one_thing.detail}
      </div>

      {/* vendor */}
      {one_thing.vendor_name && (
        <div style={{ fontSize: 12, color: CYAN, fontFamily: FONT, marginBottom: 12 }}>
          {one_thing.vendor_name}
        </div>
      )}

      {/* buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{
          background: ORANGE, color: '#000', border: 'none',
          padding: '7px 16px', borderRadius: 2, fontSize: 12,
          fontWeight: 700, fontFamily: FONT, cursor: 'pointer', letterSpacing: '0.05em',
        }}>
          ACT NOW ▸
        </button>
        <button style={{
          background: 'transparent', color: '#555555',
          border: '1px solid #333', padding: '7px 16px',
          borderRadius: 2, fontSize: 12, fontFamily: FONT, cursor: 'pointer',
        }}>
          REMIND ME LATER
        </button>
      </div>
    </div>
  );
}

function SignalCard({ signal }: { signal: BrainSignal }) {
  const { icon, color } = signalIcon(signal.importance);
  const slug  = industrySlug(signal.industry || 'general');
  const plain = toPlainEnglish(signal);

  return (
    <div style={{
      background: '#161616',
      border: '1px solid #222',
      borderRadius: 4,
      padding: 14,
      marginBottom: 8,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 10, color, fontFamily: FONT }}>{icon}</span>
          <span style={{ fontSize: 10, color: '#555555', letterSpacing: '0.15em', fontFamily: FONT }}>
            {(signal.industry || 'GENERAL').toUpperCase()}
          </span>
        </div>
        <div style={{ fontSize: 13, color: '#aaaaaa', lineHeight: 1.5 }}>
          {plain}
        </div>
      </div>
      <Link href={`/dossier/${slug}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
        <span style={{
          fontSize: 10, color: CYAN, fontFamily: FONT,
          letterSpacing: '0.05em', whiteSpace: 'nowrap',
        }}>
          TELL ME MORE ▸
        </span>
      </Link>
    </div>
  );
}

function IndustryBars({ movement }: { movement: MorningData['industry_movement'] }) {
  const rows = buildBars(movement);
  if (rows.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
      }}>
        <span style={{ fontSize: 10, color: '#555555', letterSpacing: '0.2em', fontFamily: FONT }}>
          INDUSTRIES THIS WEEK
        </span>
      </div>
      <div style={{ height: 1, background: '#222', marginBottom: 12 }} />

      {rows.map(row => (
        <div key={row.sector} style={{
          display: 'grid',
          gridTemplateColumns: '12px 110px 1fr auto',
          alignItems: 'center',
          gap: 10,
          marginBottom: 7,
        }}>
          <span style={{ fontSize: 12, color: row.arrowColor, fontFamily: FONT }}>{row.arrow}</span>
          <span style={{ fontSize: 12, color: '#aaaaaa', fontFamily: FONT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.sector}
          </span>
          <span style={{
            fontSize: 11, color: CYAN, fontFamily: FONT,
            letterSpacing: '0.02em', overflow: 'hidden',
          }}>
            {row.bars}
          </span>
          <span style={{ fontSize: 11, color: '#555555', fontFamily: FONT, whiteSpace: 'nowrap' }}>
            {row.countLabel}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const isMobile = useIsMobile();
  const streak   = useStreak();

  const [data,    setData]    = useState<MorningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [now,     setNow]     = useState<Date | null>(null);

  // Clock — starts on client only to avoid hydration mismatch
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await Brain.morning();
      setData(d);
    } catch { /* silent — fallback already in Brain */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const greeting = now
    ? now.getHours() < 12 ? 'Good morning'
      : now.getHours() < 17 ? 'Good afternoon'
      : 'Good evening'
    : 'Good morning';

  const dateLabel = now ? formatDate(now) : '';

  const topSignals = (data?.top_signals ?? []).slice(0, 3);
  const movement   = data?.industry_movement ?? [];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f0f',
      fontFamily: FONT,
      color: '#ffffff',
      paddingBottom: 72,
    }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{
        height: 44,
        padding: '0 16px',
        background: '#0f0f0f',
        borderBottom: '1px solid #222',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: ORANGE, letterSpacing: '0.05em' }}>
          NXT<span style={{ color: 'rgba(255,102,0,0.35)' }}>{'//'}</span>LINK
        </span>

        <span style={{ fontSize: 10, color: '#555555', letterSpacing: '0.15em' }}>
          {dateLabel.toUpperCase()}
        </span>

        <span style={{ fontSize: 10, color: GREEN, letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            display: 'inline-block', width: 6, height: 6,
            borderRadius: '50%', background: GREEN,
            animation: 'pulse 2s infinite',
          }} />
          LIVE
        </span>
      </div>

      {/* ── Greeting ───────────────────────────────────────────────── */}
      <div style={{ padding: '12px 16px 0', fontSize: 14, color: '#aaaaaa' }}>
        {greeting}, Cessar.
        {streak > 1 && (
          <span style={{ marginLeft: 10, fontSize: 10, color: GOLD }}>
            Day {streak} in a row.
          </span>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div style={{ padding: isMobile ? '12px 12px 0' : '16px 16px 0' }}>

        {/* TODAY'S ACTION */}
        {loading && !data ? (
          <div style={{
            background: '#161616', border: '1px solid #222',
            borderLeft: `4px solid ${ORANGE}`, borderRadius: 4,
            padding: 16, marginBottom: 24,
            fontSize: 13, color: '#444',
          }}>
            Loading intelligence…
          </div>
        ) : data?.one_thing ? (
          <ActionCard one_thing={data.one_thing} />
        ) : null}

        {/* THIS MORNING */}
        {topSignals.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
            }}>
              <span style={{ fontSize: 10, color: '#555555', letterSpacing: '0.2em' }}>
                THIS MORNING
              </span>
              <button
                onClick={load}
                style={{
                  background: 'transparent', border: '1px solid #333',
                  color: '#444', fontSize: 9, fontFamily: FONT,
                  padding: '3px 8px', borderRadius: 2, cursor: 'pointer',
                  letterSpacing: '0.1em',
                }}
              >
                REFRESH
              </button>
            </div>
            <div style={{ height: 1, background: '#222', marginBottom: 12 }} />

            {topSignals.map((s, i) => (
              <SignalCard key={`${s.industry}-${i}`} signal={s} />
            ))}
          </div>
        )}

        {/* INDUSTRIES THIS WEEK */}
        {movement.length > 0 && <IndustryBars movement={movement} />}

        {/* Empty / loading state */}
        {!loading && !data && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#333', fontSize: 12 }}>
            No data yet. Try refreshing.
          </div>
        )}

      </div>

      <BottomNav />

      {/* Pulse keyframe injected inline */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
