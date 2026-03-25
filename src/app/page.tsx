'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Component as Globe } from '@/components/ui/interactive-globe';
import { COLORS } from '@/lib/tokens';
import { createClient } from '@/lib/supabase/client';

/* ─── Module cards data ─── */
const MODULES = [
  {
    href: '/map',
    name: 'Map',
    desc: 'Interactive intelligence map with vendor locations, signal markers, and layer overlays.',
    meta: '229 markers',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
        <path d="m3 7 6-3 6 3 6-3v13l-6 3-6-3-6 3z" /><path d="m9 4v13" /><path d="m15 7v13" />
      </svg>
    ),
  },
  {
    href: '/intel',
    name: 'Intel',
    desc: 'Live signal feed from 9 sources — contracts, patents, news, grants — ranked by importance.',
    meta: 'live feed',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
        <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" /><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
        <circle cx={12} cy={12} r={2} /><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" /><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
      </svg>
    ),
  },
  {
    href: '/solve',
    name: 'Ask',
    desc: 'AI-powered search across all intelligence sources. Natural language, instant answers.',
    meta: '9 sources',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
        <circle cx={11} cy={11} r={8} /><path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    href: '/command',
    name: 'Command',
    desc: 'Sector-level dashboard showing threat posture, signals, and industry heatmap.',
    meta: '6 sectors',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
        <rect width={18} height={18} x={3} y={3} rx={2} /><path d="M3 9h18" /><path d="M9 21V9" />
      </svg>
    ),
  },
  {
    href: '/industry',
    name: 'Industries',
    desc: '14 industries tracked by region with IKER scores — AI/ML, defense, cyber, energy, more.',
    meta: '14 tracked',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
        <path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
      </svg>
    ),
  },
  {
    href: '/conferences',
    name: 'Conferences',
    desc: '1,000+ industry conferences — defense, tech, border security, manufacturing events worldwide.',
    meta: '1,005 events',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
        <rect x={3} y={4} width={18} height={18} rx={2} /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
        <path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" />
      </svg>
    ),
  },
];

const FEATURES = [
  '9 live sources updated every minute',
  'Auto-classified into 14 industries via AI',
  'DEFCON-style threat level scoring',
  'El Paso / Fort Bliss regional focus',
];

/* ─── Clock hook ─── */
function useUTCClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toISOString().slice(11, 19) + ' UTC');
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

/* ─── Signal count hook ─── */
function useSignalCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    createClient()
      .from('intel_signals')
      .select('*', { count: 'exact', head: true })
      .then(({ count: c }) => { if (c) setCount(c); });
  }, []);
  return count;
}

export default function LandingPage() {
  const clock = useUTCClock();
  const signalCount = useSignalCount();
  const displayCount = signalCount ?? 10732;

  return (
    <div className="min-h-screen" style={{ background: COLORS.bg }}>
      {/* ─── Top Nav ─── */}
      <nav
        className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-8 h-14"
        style={{
          background: `${COLORS.bg}cc`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${COLORS.border}40`,
        }}
      >
        <div className="flex items-center gap-5">
          <Link href="/" className="font-mono text-[15px] font-semibold tracking-wider text-white">
            NXT<span style={{ color: COLORS.accent }}>{'//'}
            </span>LINK
          </Link>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] font-medium tracking-wide"
            style={{ border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}
          >
            <span className="w-[5px] h-[5px] rounded-full bg-amber-400 animate-pulse-soft" />
            DEFCON 3
          </span>
        </div>
        <div className="flex items-center gap-5 font-mono text-[11px]" style={{ color: COLORS.dim }}>
          <span className="flex items-center gap-1.5" style={{ color: '#22c55e' }}>
            <span className="w-[5px] h-[5px] rounded-full bg-green-500 animate-pulse-soft" />
            LIVE
          </span>
          <span>{displayCount.toLocaleString()} signals</span>
          <span>{clock}</span>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex items-center px-8 overflow-hidden">
        {/* Gradient overlay for text readability */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[60%] z-[1] pointer-events-none"
          style={{ background: `linear-gradient(90deg, ${COLORS.bg} 40%, transparent 100%)` }}
        />

        {/* Globe */}
        <div className="absolute right-[-80px] top-1/2 -translate-y-1/2 z-0 opacity-50">
          <Globe
            size={720}
            dotCount={1000}
            dotSize={1.2}
            dotColor="rgba(255, 255, 255, 0.4)"
            arcColor="rgba(0, 212, 255, 0.6)"
            markerColor="rgba(0, 212, 255, 1)"
            rotationSpeed={0.002}
            markers={[
              { lat: 31.77, lng: -106.44, label: 'EL PASO' },
              { lat: 38.91, lng: -77.04, label: 'DC' },
              { lat: 40.71, lng: -74.01, label: 'NYC' },
              { lat: 37.77, lng: -122.42, label: 'SF' },
              { lat: 51.51, lng: -0.13, label: 'London' },
              { lat: 19.43, lng: -99.13, label: 'CDMX' },
              { lat: 35.68, lng: 139.69, label: 'Tokyo' },
            ]}
            connections={[[0, 1], [0, 2], [0, 3], [0, 5], [1, 4], [3, 6]]}
          />
        </div>

        {/* Hero content */}
        <div className="relative z-[2] max-w-[560px] pt-14">
          <p
            className="font-mono text-[11px] font-medium tracking-[0.15em] uppercase mb-5"
            style={{ color: COLORS.dim }}
          >
            Intelligence Command Center — El Paso, TX
          </p>
          <h1 className="text-[56px] font-extrabold tracking-tight leading-[1.05] text-white mb-5 font-grotesk">
            Real-time intelligence<br />for the <span style={{ color: COLORS.accent }}>border region</span>
          </h1>
          <p className="text-[17px] leading-[1.65] mb-9 max-w-[480px]" style={{ color: COLORS.muted }}>
            NXT//LINK monitors {displayCount.toLocaleString()}+ signals across defense, technology, energy, and border security — giving you visibility into opportunities, threats, and market shifts before they hit the headlines.
          </p>

          {/* Stats */}
          <div className="flex gap-7 mb-10">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-xl font-semibold text-white">{displayCount.toLocaleString()}</span>
              <span className="text-[11px] font-medium tracking-wide uppercase" style={{ color: COLORS.dim }}>Signals</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-xl font-semibold text-white">14</span>
              <span className="text-[11px] font-medium tracking-wide uppercase" style={{ color: COLORS.dim }}>Industries</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-xl font-semibold text-white">9</span>
              <span className="text-[11px] font-medium tracking-wide uppercase" style={{ color: COLORS.dim }}>Sources</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex gap-3">
            <Link
              href="/map"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors"
            >
              Open Map
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="m5 12h14" /><path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/intel"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border transition-colors"
              style={{ borderColor: COLORS.border, color: COLORS.muted }}
            >
              View Intel Feed
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Modules ─── */}
      <section className="relative z-[2] px-8 pt-20 pb-16 max-w-[1100px] mx-auto">
        <p className="font-mono text-[11px] font-medium tracking-[0.15em] uppercase mb-8" style={{ color: COLORS.dim }}>
          Modules
        </p>
        <div
          className="grid grid-cols-3 md:grid-cols-6 gap-px rounded-xl overflow-hidden"
          style={{ background: `${COLORS.border}60` }}
        >
          {MODULES.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className="flex flex-col p-7 transition-colors group"
              style={{ background: COLORS.bg }}
            >
              <span className="mb-4 transition-colors" style={{ color: COLORS.muted }}>
                <span className="group-hover:text-nxt-cyan transition-colors">{mod.icon}</span>
              </span>
              <span className="font-mono text-[13px] font-semibold tracking-wide text-white mb-2">{mod.name}</span>
              <span className="text-[13px] leading-relaxed flex-1" style={{ color: COLORS.dim }}>{mod.desc}</span>
              <span className="flex items-center gap-1.5 mt-4 font-mono text-[10px] tracking-wide group-hover:text-nxt-cyan transition-colors" style={{ color: COLORS.border }}>
                {mod.meta}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                  <path d="m5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── About ─── */}
      <section className="px-8 pt-16 pb-20 max-w-[640px] mx-auto">
        <h2 className="text-2xl font-bold text-white tracking-tight mb-4 font-grotesk">What is NXT//LINK?</h2>
        <p className="text-[15px] leading-[1.7] mb-3.5" style={{ color: COLORS.muted }}>
          A <strong className="text-white font-medium">living intelligence system</strong> that continuously monitors the El Paso–Fort Bliss corridor and global markets. It ingests signals from government contract databases, patent filings, academic research, hiring patterns, and breaking news — then classifies, scores, and maps them in real time.
        </p>
        <p className="text-[15px] leading-[1.7] mb-7" style={{ color: COLORS.muted }}>
          Built for <strong className="text-white font-medium">defense contractors, tech companies, and economic development</strong> teams who need to know what{"'"}s happening before it hits the headlines.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <div key={f} className="flex items-start gap-2.5 p-3.5 rounded-lg" style={{ background: `${COLORS.surface}80` }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0 mt-0.5">
                <path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path d="m16.2 16.2 2.9 2.9" />
                <path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path d="m4.9 4.9 2.9 2.9" />
              </svg>
              <span className="text-[13px] leading-snug" style={{ color: COLORS.muted }}>{f}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom spacer for dock */}
      <div className="h-20" />
    </div>
  );
}
