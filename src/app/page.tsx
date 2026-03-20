'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Brain, type MorningData, type BrainSignal } from '@/lib/brain';
import { COLORS } from '@/lib/tokens';
import { BottomNav, TopBar } from '@/components/ui';

// ─── Hooks ────────────────────────────────────────────────────────────────────

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Map signal types to 6-track labels
function signalIcon(type: string): string {
  const map: Record<string, string> = {
    technology: '//TECH',
    product: '//PROD',
    discovery: '//DISC',
    direction: '//DRCT',
    who: '//WHO',
    connection: '//CONN',
  };
  return map[type] ?? '//--';
}

function impactLabel(importance: number): { label: string; color: string } {
  if (importance >= 0.85) return { label: 'HIGH IMPACT', color: COLORS.red };
  if (importance >= 0.7) return { label: 'NOTABLE', color: COLORS.gold };
  return { label: 'MONITOR', color: COLORS.dim };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const streak = useStreak();
  const [data, setData] = useState<MorningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await Brain.morning()); }
    catch { /* Brain has fallback */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const greeting = now
    ? now.getHours() < 12 ? 'Good morning'
      : now.getHours() < 17 ? 'Good afternoon'
      : 'Good evening'
    : '';

  const signals = (data?.top_signals ?? []).slice(0, 3);
  const movement = data?.industry_movement ?? [];
  const oneThing = data?.one_thing;

  return (
    <div className="min-h-screen pb-20 overflow-y-auto" style={{ background: COLORS.bg }}>
      <TopBar />

      {/* ── Content — single centered column, calm and spacious ── */}
      <div className="max-w-[620px] mx-auto px-6 sm:px-10">

        {/* ── Greeting ─────────────────────────────────────────── */}
        <div className="pt-14 sm:pt-20 pb-3 flex items-baseline gap-3">
          <span
            className="font-grotesk text-[15px] sm:text-[17px] font-light"
            style={{ color: `${COLORS.text}50` }}
          >
            {greeting}
          </span>
          {streak > 1 && (
            <span
              className="font-mono text-[8px] tracking-[0.18em] px-2.5 py-1 rounded-full"
              style={{
                color: `${COLORS.gold}90`,
                background: `${COLORS.gold}08`,
                border: `1px solid ${COLORS.gold}18`,
              }}
            >
              DAY {streak}
            </span>
          )}
        </div>

        {/* ── Loading skeleton ──────────────────────────────────── */}
        {loading && (
          <div className="pt-8 space-y-6 animate-pulse">
            <div className="h-10 rounded-nxt-sm w-4/5 shimmer" />
            <div className="h-5 rounded-nxt-sm w-3/5 shimmer" />
            <div className="h-4 rounded-nxt-sm w-2/5 shimmer" />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            HERO — "One Thing" focal block
            This is the page's center of gravity. Occupies top third.
            Large typography, breathing room, subtle accent glow.
           ══════════════════════════════════════════════════════════ */}
        {!loading && oneThing && (
          <div className="pt-6 pb-16 animate-fade-up">
            {/* Micro label */}
            <p
              className="font-mono text-[8px] tracking-[0.35em] uppercase mb-8"
              style={{ color: `${COLORS.accent}90` }}
            >
              TODAY&apos;S INTELLIGENCE
            </p>

            {/* Headline — large, dominant */}
            <h1
              className="font-grotesk text-[28px] sm:text-[36px] lg:text-[42px] font-semibold leading-[1.12] tracking-[-0.01em] mb-6"
              style={{ color: COLORS.text }}
            >
              {oneThing.headline}
            </h1>

            {/* Explanation — subdued, readable */}
            <p
              className="font-grotesk text-[15px] sm:text-[17px] leading-[1.75] font-light mb-10"
              style={{ color: `${COLORS.text}48` }}
            >
              {oneThing.detail}
            </p>

            {/* CTA + context */}
            <div className="flex items-center gap-5">
              <Link
                href={oneThing.vendor_url
                  ? oneThing.vendor_url
                  : `/search?q=${encodeURIComponent(signals[0]?.industry ?? 'technology')}`
                }
                {...(oneThing.vendor_url ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                <button
                  className="font-mono text-[10px] tracking-[0.14em] font-semibold px-7 py-3.5 cursor-pointer transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
                  style={{
                    background: COLORS.accent,
                    color: COLORS.bg,
                    borderRadius: '14px',
                    border: 'none',
                    boxShadow: `0 0 20px ${COLORS.accent}15`,
                  }}
                >
                  EXPLORE THIS
                </button>
              </Link>

              {oneThing.vendor_name && (
                <span
                  className="font-mono text-[9px] tracking-[0.06em]"
                  style={{ color: `${COLORS.text}28` }}
                >
                  via {oneThing.vendor_name}
                </span>
              )}
            </div>

            {/* "Why now" micro line */}
            <p
              className="font-mono text-[8px] tracking-[0.12em] mt-6"
              style={{ color: `${COLORS.text}15` }}
            >
              Updated {signals[0]?.discovered_at ? timeAgo(signals[0].discovered_at) : 'just now'}
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            OPPORTUNITY STRIP — 3 cards max, horizontal on desktop
           ══════════════════════════════════════════════════════════ */}
        {signals.length > 0 && (
          <div className="pb-14">
            {/* Section divider */}
            <div className="divider-glow mb-10" />

            <p
              className="font-mono text-[8px] tracking-[0.35em] uppercase mb-6"
              style={{ color: `${COLORS.text}20` }}
            >
              OPPORTUNITIES
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {signals.map((s: BrainSignal, i: number) => {
                const impact = impactLabel(s.importance);
                return (
                  <Link
                    key={`${s.industry}-${i}`}
                    href={`/search?q=${encodeURIComponent(s.title.split(' ').slice(0, 4).join(' '))}`}
                    className="group flex flex-col p-5 no-underline transition-all duration-300 hover:translate-y-[-2px]"
                    style={{
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '20px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${COLORS.accent}25`;
                      e.currentTarget.style.boxShadow = `0 8px 32px ${COLORS.bg}`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = COLORS.border;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Signal index */}
                    <span
                      className="font-mono text-[9px] tracking-[0.12em] mb-4"
                      style={{ color: `${COLORS.accent}50` }}
                    >
                      {signalIcon(s.signal_type)}
                    </span>

                    {/* Title */}
                    <p
                      className="font-grotesk text-[13px] sm:text-[14px] font-medium leading-snug mb-4 flex-1"
                      style={{ color: `${COLORS.text}e0` }}
                    >
                      {s.title.length > 60 ? s.title.slice(0, 57) + '...' : s.title}
                    </p>

                    {/* Industry + impact */}
                    <div className="flex items-center justify-between">
                      <span
                        className="font-mono text-[8px] tracking-[0.12em] uppercase"
                        style={{ color: `${COLORS.text}25` }}
                      >
                        {s.industry}
                      </span>
                      <span
                        className="font-mono text-[7px] tracking-[0.15em] px-2 py-0.5 rounded-full"
                        style={{
                          color: impact.color,
                          background: `${impact.color}0c`,
                          border: `1px solid ${impact.color}18`,
                        }}
                      >
                        {impact.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            MICRO-TRENDS — subtle signal badges
           ══════════════════════════════════════════════════════════ */}
        {movement.length > 0 && (
          <div className="pb-16">
            <div className="flex gap-2 flex-wrap">
              {movement.slice(0, 8).map(m => {
                const isUp = m.momentum === 'accelerating' || m.momentum === 'rising';
                const isDown = m.momentum === 'declining';
                const color = isUp ? COLORS.green : isDown ? COLORS.red : COLORS.dim;
                const arrow = isUp ? '↑' : isDown ? '↓' : '→';
                return (
                  <span
                    key={m.sector}
                    className="inline-flex items-center gap-1.5 font-mono text-[8px] tracking-[0.1em] px-3 py-1.5 whitespace-nowrap transition-opacity duration-200 hover:opacity-80"
                    style={{
                      color: `${color}c0`,
                      background: `${color}06`,
                      border: `1px solid ${color}12`,
                      borderRadius: '9999px',
                    }}
                  >
                    <span>{arrow}</span>
                    {m.sector}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
