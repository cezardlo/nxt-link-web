'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Brain, type MorningData, type BrainSignal } from '@/lib/brain';
import { COLORS } from '@/lib/tokens';
import { BottomNav, TopBar } from '@/components/ui';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
// Philosophy: user opens the app and instantly knows what matters.
// 3 elements only: one insight, three opportunities, momentum chips.
// Nothing else. Calm, spacious, effortless.

export default function TodayPage() {
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

      <div className="max-w-[560px] mx-auto px-6 sm:px-10">

        {/* ── Greeting — barely there ────────────────────────── */}
        <p
          className="pt-16 sm:pt-24 pb-6 font-grotesk text-[15px] font-light"
          style={{ color: `${COLORS.text}40` }}
        >
          {greeting}
        </p>

        {/* ── Loading ────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-8 animate-pulse">
            <div className="h-10 rounded-nxt-sm w-4/5 shimmer" />
            <div className="h-5 rounded-nxt-sm w-3/5 shimmer" />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            ELEMENT 1 — The One Thing
            The entire page exists for this. One headline.
            One explanation. One action. Nothing else competes.
           ═══════════════════════════════════════════════════════ */}
        {!loading && oneThing && (
          <div className="pb-20 animate-fade-up">
            <h1
              className="font-grotesk text-[28px] sm:text-[38px] lg:text-[44px] font-semibold leading-[1.1] tracking-[-0.02em] mb-8"
              style={{ color: COLORS.text }}
            >
              {oneThing.headline}
            </h1>

            <p
              className="font-grotesk text-[16px] sm:text-[18px] leading-[1.8] font-light mb-12"
              style={{ color: `${COLORS.text}45` }}
            >
              {oneThing.detail}
            </p>

            <Link
              href={oneThing.vendor_url ?? `/search?q=${encodeURIComponent(signals[0]?.industry ?? 'technology')}`}
              {...(oneThing.vendor_url ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="inline-block font-mono text-[10px] tracking-[0.15em] font-semibold px-7 py-3.5 transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
              style={{
                background: COLORS.accent,
                color: COLORS.bg,
                borderRadius: '14px',
                boxShadow: `0 0 24px ${COLORS.accent}12`,
              }}
            >
              EXPLORE THIS
            </Link>

            <p className="font-mono text-[8px] tracking-[0.12em] mt-8" style={{ color: `${COLORS.text}12` }}>
              {signals[0]?.discovered_at ? timeAgo(signals[0].discovered_at) : ''}
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            ELEMENT 2 — Three Opportunities
            Clean cards. Title + industry. That's it.
           ═══════════════════════════════════════════════════════ */}
        {signals.length > 0 && (
          <div className="pb-16">
            <div className="h-px mb-12" style={{ background: `linear-gradient(90deg, transparent, ${COLORS.accent}18, transparent)` }} />

            <div className="flex flex-col gap-4">
              {signals.map((s: BrainSignal, i: number) => (
                <Link
                  key={`${s.industry}-${i}`}
                  href={`/search?q=${encodeURIComponent(s.title.split(' ').slice(0, 5).join(' '))}`}
                  className="group flex items-start gap-4 p-5 transition-all duration-300 hover:translate-x-1"
                  style={{
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '16px',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-grotesk text-[14px] sm:text-[15px] font-medium leading-snug mb-2" style={{ color: `${COLORS.text}dd` }}>
                      {s.title.length > 80 ? s.title.slice(0, 77) + '...' : s.title}
                    </p>
                    <span className="font-mono text-[9px] tracking-[0.12em] uppercase" style={{ color: `${COLORS.text}22` }}>
                      {s.industry}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-[12px] mt-1 opacity-0 group-hover:opacity-30 transition-opacity" style={{ color: COLORS.accent }}>
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            ELEMENT 3 — Momentum
            Tiny pills. Glanceable. No interaction needed.
           ═══════════════════════════════════════════════════════ */}
        {movement.length > 0 && (
          <div className="pb-20">
            <div className="flex gap-2 flex-wrap">
              {movement.slice(0, 6).map(m => {
                const isUp = m.momentum === 'accelerating' || m.momentum === 'rising';
                const isDown = m.momentum === 'declining';
                const color = isUp ? COLORS.green : isDown ? COLORS.red : COLORS.dim;
                const arrow = isUp ? '↑' : isDown ? '↓' : '→';
                return (
                  <span
                    key={m.sector}
                    className="inline-flex items-center gap-1.5 font-mono text-[8px] tracking-[0.1em] px-3 py-1.5"
                    style={{ color: `${color}90`, background: `${color}06`, border: `1px solid ${color}10`, borderRadius: '9999px' }}
                  >
                    {arrow} {m.sector}
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
