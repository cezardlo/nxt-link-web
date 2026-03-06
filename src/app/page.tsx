'use client';

import Link from 'next/link';
import { EL_PASO_VENDORS } from '@/lib/data/el-paso-vendors';
import { TECHNOLOGY_CATALOG } from '@/lib/data/technology-catalog';
import { CONFERENCES } from '@/lib/data/conferences';
import { INNOVATION_CYCLES } from '@/lib/data/innovation-cycle';

const VENDOR_COUNT = Object.keys(EL_PASO_VENDORS).length;
const TECH_COUNT = TECHNOLOGY_CATALOG.length;
const CONF_COUNT = CONFERENCES.length;
const CYCLE_COUNT = INNOVATION_CYCLES.length;

const VALUE_BLOCKS = [
  {
    color: '#00d4ff',
    title: 'MONITOR',
    desc: 'Track vendor activity, contracts, patents, and hiring signals in real-time.',
  },
  {
    color: '#ffd700',
    title: 'ANALYZE',
    desc: 'AI-powered industry analysis with structured problem solving.',
  },
  {
    color: '#00ff88',
    title: 'CONNECT',
    desc: 'Map technologies to vendors, vendors to contracts, contracts to opportunities.',
  },
] as const;

const QUICK_ACCESS = [
  { href: '/map',                        label: 'INTELLIGENCE MAP',  sub: 'Live platform',                              color: '#00d4ff' },
  { href: '/universe',                   label: 'INDUSTRY UNIVERSE', sub: '70+ entities',                               color: '#a855f7' },
  { href: '/radar',                      label: 'GLOBAL RADAR',      sub: '12 domains',                                 color: '#ff3b30' },
  { href: '/industries',                 label: 'INDUSTRIES',        sub: '8 sectors',                                  color: '#ffd700' },
  { href: '/vendors',                    label: 'VENDOR REGISTRY',   sub: `${VENDOR_COUNT} companies`,                  color: '#ff8c00' },
  { href: '/solve',                      label: 'PROBLEM SOLVER',    sub: 'AI analysis',                                color: '#00ff88' },
  { href: '/innovation',                 label: 'INNOVATION CYCLE',  sub: `${CYCLE_COUNT} lifecycles`,                  color: '#a855f7' },
  { href: '/signals',                    label: 'SIGNAL FEED',       sub: 'Prioritized intel',                          color: '#ffb800' },
  { href: '/opportunities',              label: 'OPPORTUNITIES',     sub: '15 emerging',                                color: '#00ff88' },
  { href: '/simulate',                   label: 'IMPACT SIMULATOR',  sub: '8 scenarios',                                color: '#f97316' },
  { href: '/conferences',                label: 'CONFERENCES',       sub: `${CONF_COUNT.toLocaleString()} events`,      color: '#00d4ff' },
  { href: '/technology/tech-zero-trust', label: 'TECHNOLOGIES',      sub: `${TECH_COUNT} tracked`,                      color: 'rgba(255,255,255,0.55)' },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-black flex flex-col relative overflow-hidden">

      {/* Grid background */}
      <div className="fixed inset-0 grid-pattern pointer-events-none" />

      {/* Subtle radial vignette to focus center */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 70% at 50% 40%, transparent 0%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* Scan line animation */}
      <div className="scan-line" />

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="relative z-10 h-11 flex items-center justify-between px-6 border-b border-white/[0.06] shrink-0 bg-black/60 backdrop-blur-sm">
        <span className="font-mono text-[12px] tracking-[0.45em] text-white/90 glow-cyan">
          NXT<span style={{ color: '#00d4ff' }}>{'//'}</span>LINK
        </span>

        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: '#00ff88', boxShadow: '0 0 6px #00ff88cc' }}
          />
          <span className="font-mono text-[8px] tracking-[0.3em] text-white/40 uppercase">
            PROTOTYPE · PROOF OF CONCEPT
          </span>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-4 sm:px-8 pb-12">

        {/* ── Hero section ──────────────────────────────────────── */}
        <section className="w-full max-w-3xl text-center pt-20 pb-4 slide-up">

          {/* Eyebrow label */}
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="h-px w-8" style={{ background: 'rgba(0,212,255,0.4)' }} />
            <span className="font-mono text-[8px] tracking-[0.5em] text-white/40 uppercase">
              El Paso, Texas
            </span>
            <div className="h-px w-8" style={{ background: 'rgba(0,212,255,0.4)' }} />
          </div>

          {/* Main heading */}
          <h1
            className="font-mono font-bold tracking-[0.18em] text-white/90 leading-none mb-3"
            style={{ fontSize: 'clamp(28px, 5vw, 52px)', letterSpacing: '0.18em' }}
          >
            TECHNOLOGY
            <br />
            <span style={{ color: '#00d4ff' }} className="glow-cyan">INTELLIGENCE</span>
          </h1>

          {/* Sub-label */}
          <p className="font-mono text-[9px] tracking-[0.6em] text-white/25 uppercase mb-6">
            PLATFORM
          </p>

          {/* Description */}
          <p className="font-mono text-[11px] leading-relaxed text-white/50 max-w-xl mx-auto mb-10">
            Real-time monitoring of {VENDOR_COUNT} vendors, {TECH_COUNT} technologies, and {CONF_COUNT.toLocaleString()} conferences
            across 8 industries. El Paso, Texas.
          </p>

          {/* CTA buttons */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/map"
              className="font-mono text-[10px] tracking-[0.3em] text-[#00d4ff] border border-[#00d4ff]/40 bg-[#00d4ff]/8 px-8 py-3 rounded-sm hover:bg-[#00d4ff]/18 hover:border-[#00d4ff]/70 transition-all duration-200"
              style={{ boxShadow: '0 0 0 0 rgba(0,212,255,0)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 18px rgba(0,212,255,0.2)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 0 0 rgba(0,212,255,0)';
              }}
            >
              ENTER PLATFORM →
            </Link>
            <Link
              href="/industries"
              className="font-mono text-[10px] tracking-[0.3em] text-white/50 border border-white/[0.15] px-8 py-3 rounded-sm hover:text-white/75 hover:border-white/30 hover:bg-white/[0.03] transition-all duration-200"
            >
              EXPLORE INDUSTRIES
            </Link>
          </div>
        </section>

        {/* ── Stats strip ───────────────────────────────────────── */}
        <div className="w-full max-w-3xl slide-up-delay-1">
          <div className="divider-glow" />
          <div className="border-x border-white/[0.06] grid grid-cols-5 bg-black/40">

            <div className="text-center border-r border-white/[0.06] px-3 py-4">
              <div
                className="font-mono text-[18px] font-bold leading-none"
                style={{ color: '#00d4ff', textShadow: '0 0 14px rgba(0,212,255,0.5)' }}
              >
                {VENDOR_COUNT}
              </div>
              <div className="font-mono text-[8px] tracking-[0.3em] text-white/30 uppercase mt-1.5">
                Vendors
              </div>
            </div>

            <div className="text-center border-r border-white/[0.06] px-3 py-4">
              <div className="font-mono text-[18px] font-bold text-white/80 leading-none">{TECH_COUNT}</div>
              <div className="font-mono text-[8px] tracking-[0.3em] text-white/30 uppercase mt-1.5">
                Technologies
              </div>
            </div>

            <div className="text-center border-r border-white/[0.06] px-3 py-4">
              <div
                className="font-mono text-[18px] font-bold leading-none glow-gold"
                style={{ color: '#ffd700' }}
              >
                8
              </div>
              <div className="font-mono text-[8px] tracking-[0.3em] text-white/30 uppercase mt-1.5">
                Industries
              </div>
            </div>

            <div className="text-center border-r border-white/[0.06] px-3 py-4">
              <div className="font-mono text-[18px] font-bold text-white/80 leading-none">
                {CONF_COUNT.toLocaleString()}
              </div>
              <div className="font-mono text-[8px] tracking-[0.3em] text-white/30 uppercase mt-1.5">
                Conferences
              </div>
            </div>

            <div className="text-center px-3 py-4">
              <div className="flex items-center justify-center gap-1.5 leading-none">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                    style={{ backgroundColor: '#00ff88' }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{ backgroundColor: '#00ff88', boxShadow: '0 0 6px #00ff88cc' }}
                  />
                </span>
                <span
                  className="font-mono text-[18px] font-bold glow-green"
                  style={{ color: '#00ff88' }}
                >
                  LIVE
                </span>
              </div>
              <div className="font-mono text-[8px] tracking-[0.3em] text-white/30 uppercase mt-1.5">
                Intel Feeds
              </div>
            </div>

          </div>
          <div className="divider-glow" />
        </div>

        {/* ── Value proposition cards ────────────────────────────── */}
        <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10 slide-up-delay-2">
          {VALUE_BLOCKS.map(({ color, title, desc }) => (
            <div
              key={title}
              className="group border border-white/[0.06] rounded-sm p-6 bg-black/20 hover:bg-black/40 hover:border-white/[0.12] transition-all duration-200"
            >
              {/* Accent line */}
              <div
                className="w-8 h-[2px] mb-4 transition-all duration-200 group-hover:w-12"
                style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }}
              />
              <div
                className="font-mono text-[11px] tracking-[0.25em] mb-3 uppercase"
                style={{ color }}
              >
                {title}
              </div>
              <p className="font-mono text-[10px] leading-relaxed text-white/40 group-hover:text-white/55 transition-colors duration-200">
                {desc}
              </p>
            </div>
          ))}
        </div>

        {/* ── Section label ─────────────────────────────────────── */}
        <div className="w-full max-w-3xl flex items-center gap-4 mt-12 mb-4 slide-up-delay-3">
          <div className="h-px flex-1 bg-white/[0.05]" />
          <span className="font-mono text-[8px] tracking-[0.4em] text-white/25 uppercase">
            Quick Access
          </span>
          <div className="h-px flex-1 bg-white/[0.05]" />
        </div>

        {/* ── Quick access grid ─────────────────────────────────── */}
        <div className="w-full max-w-3xl grid grid-cols-2 sm:grid-cols-3 gap-2 slide-up-delay-4">
          {QUICK_ACCESS.map(({ href, label, sub, color }) => (
            <Link
              key={href}
              href={href}
              className="group border border-white/[0.05] rounded-sm p-4 hover:border-white/[0.12] hover:bg-white/[0.02] transition-all duration-150"
              style={{ transform: 'translateY(0)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: color, boxShadow: `0 0 5px ${color}99` }}
                />
                <span className="font-mono text-[9px] tracking-[0.2em] text-white/55 group-hover:text-white/80 transition-colors uppercase">
                  {label}
                </span>
              </div>
              <div className="font-mono text-[8px] text-white/25 pl-3.5 group-hover:text-white/40 transition-colors">
                {sub}
              </div>
            </Link>
          ))}
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div className="mt-14 pb-2 text-center slide-up-delay-5">
          <div className="divider-glow w-48 mx-auto mb-5" />
          <span className="font-mono text-[7px] tracking-[0.35em] text-white/20 uppercase">
            {'NXT//LINK · El Paso, TX · IKER Intelligence Engine v2.0'}
          </span>
        </div>

      </div>
    </main>
  );
}
