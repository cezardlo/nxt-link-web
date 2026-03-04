'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const FEATURES = [
  {
    icon: '◎',
    title: 'VENDOR MAP',
    desc: '40+ EP defense & logistics companies at real coordinates with IKER health scores.',
    color: '#00d4ff',
    accent: 'border-[#00d4ff]/15 hover:border-[#00d4ff]/30 hover:bg-[#00d4ff]/[0.03]',
    tag: 'LIVE',
    tagColor: '#00d4ff',
  },
  {
    icon: '⚡',
    title: 'SIGNAL INTEL',
    desc: 'Sector momentum, AI briefings, contract detection & opportunity signals.',
    color: '#ffd700',
    accent: 'border-[#ffd700]/15 hover:border-[#ffd700]/30 hover:bg-[#ffd700]/[0.03]',
    tag: 'IKER',
    tagColor: '#ffd700',
  },
  {
    icon: '▣',
    title: 'BORDER DATA',
    desc: 'Live CBP commercial wait times, BTS truck volumes & TxDOT camera feeds.',
    color: '#00ff88',
    accent: 'border-[#00ff88]/15 hover:border-[#00ff88]/30 hover:bg-[#00ff88]/[0.03]',
    tag: 'CBP',
    tagColor: '#00ff88',
  },
  {
    icon: '✈',
    title: 'LIVE FEEDS',
    desc: 'Flight tracking, seismic events, military activity & border crossing volumes.',
    color: '#ff8c00',
    accent: 'border-[#ff8c00]/15 hover:border-[#ff8c00]/30 hover:bg-[#ff8c00]/[0.03]',
    tag: 'ADS-B',
    tagColor: '#ff8c00',
  },
] as const;

const STATS = [
  { value: '40+',  label: 'EP VENDORS',   color: '#ffffff' },
  { value: 'CBP',  label: 'WAIT TIMES',   color: '#00ff88' },
  { value: 'LIVE', label: 'INTEL FEEDS',  color: '#00d4ff' },
  { value: 'IKER', label: 'SCORES',       color: '#ffd700' },
] as const;

const TAGLINE = 'Discover what technology exists. Who builds it. Where it deploys.';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
    let i = 0;
    const timer = setInterval(() => {
      if (i <= TAGLINE.length) {
        setTypedText(TAGLINE.slice(0, i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 28);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const blink = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(blink);
  }, []);

  return (
    <main className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">

      {/* Layer 1 — dot-grid texture */}
      <div className="absolute inset-0 dot-grid opacity-60" />

      {/* Layer 2 — vertical grid lines (Bloomberg aesthetic) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: 'repeating-linear-gradient(90deg, #00d4ff 0px, #00d4ff 1px, transparent 1px, transparent 80px)',
        }}
      />

      {/* Layer 3 — horizontal grid lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, #00d4ff 0px, #00d4ff 1px, transparent 1px, transparent 60px)',
        }}
      />

      {/* Layer 4 — radar rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute rounded-full border border-[#00d4ff]/[0.08] radar-ring"
            style={{ width: 'min(560px, 88vw)', height: 'min(560px, 88vw)', animationDelay: `${i * 1.2}s` }}
          />
        ))}
      </div>

      {/* Layer 5 — scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="scan-line" />
      </div>

      {/* Layer 6 — radial vignette (deeper) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 15%, rgba(0,0,0,0.88) 100%)' }}
      />

      {/* Content */}
      <div
        className="relative z-10 text-center px-4 sm:px-6 w-full max-w-[640px] overflow-y-auto py-8"
        style={{
          maxHeight: '100dvh',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        {/* Prototype badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span
            className="font-mono text-[9px] tracking-[0.3em] font-bold uppercase px-3 py-1 rounded-sm"
            style={{
              color: '#ffb800',
              background: 'rgba(255,184,0,0.08)',
              border: '1px solid rgba(255,184,0,0.25)',
              textShadow: '0 0 10px rgba(255,184,0,0.3)',
            }}
          >
            PROTOTYPE — PROOF OF CONCEPT
          </span>
        </div>

        {/* System status strip */}
        <div className="flex items-center justify-center gap-3 sm:gap-5 flex-wrap mb-5">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="font-mono text-[9px] tracking-[0.3em] text-emerald-400/70 uppercase">SYS ONLINE</span>
          </div>
          <span className="w-px h-3 bg-white/[0.08] hidden sm:block" />
          <span className="font-mono text-[9px] tracking-[0.2em] text-white/20 uppercase hidden sm:inline">31.76°N 106.48°W</span>
          <span className="w-px h-3 bg-white/[0.08] hidden sm:block" />
          <span className="font-mono text-[9px] tracking-[0.2em] text-[#ffd700]/35 uppercase hidden sm:inline">IKER v2.0 ACTIVE</span>
          <span className="w-px h-3 bg-white/[0.08] hidden sm:block" />
          <span className="font-mono text-[9px] tracking-[0.2em] text-white/20 uppercase hidden sm:inline">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
          </span>
        </div>

        {/* Logo block */}
        <div className="mb-1">
          <div className="inline-flex items-center gap-1 mb-2">
            <span className="font-mono text-[9px] tracking-[0.4em] text-white/15 uppercase">NXT//LINK PLATFORM</span>
          </div>
          <h1 className="font-mono leading-none font-black select-none tracking-tight"
            style={{ fontSize: 'clamp(3rem, 12vw, 5.5rem)' }}>
            <span className="text-white" style={{ textShadow: '0 0 40px rgba(255,255,255,0.08)' }}>NXT</span>
            <span className="text-[#00d4ff]" style={{ textShadow: '0 0 30px rgba(0,212,255,0.5), 0 0 60px rgba(0,212,255,0.2)' }}>{'//'}</span>
            <span className="text-white" style={{ textShadow: '0 0 40px rgba(255,255,255,0.08)' }}>LINK</span>
          </h1>
          <p className="font-mono text-[#00d4ff]/30 text-[9px] tracking-[0.55em] uppercase mt-2">
            Technology Intelligence Platform
          </p>
        </div>

        {/* Typed tagline */}
        <div className="h-8 flex items-center justify-center mt-3 mb-5">
          <p className="text-white/35 text-[12px] font-mono leading-relaxed max-w-md">
            {typedText}
            <span
              className="inline-block w-0.5 h-3 bg-[#00d4ff] ml-0.5 align-middle"
              style={{ opacity: cursorVisible ? 0.8 : 0, transition: 'opacity 0.1s' }}
            />
          </p>
        </div>

        {/* Feature cards — 2×2 grid */}
        <div className="grid grid-cols-2 gap-2 text-left mb-5">
          {FEATURES.map(({ icon, title, desc, color, accent, tag, tagColor }, idx) => (
            <div
              key={title}
              className={`px-3 py-2.5 border rounded-sm bg-white/[0.015] transition-all duration-200 group cursor-default ${accent}`}
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(6px)',
                transition: `opacity 0.5s ease ${0.2 + idx * 0.07}s, transform 0.5s ease ${0.2 + idx * 0.07}s, background 0.2s, border-color 0.2s`,
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm leading-none" style={{ color }}>{icon}</span>
                <span
                  className="font-mono text-[9px] tracking-[0.2em] font-bold flex-1"
                  style={{ color }}
                >
                  {title}
                </span>
                <span
                  className="font-mono text-[7px] px-1 py-px rounded-sm font-bold"
                  style={{ color: tagColor, background: `${tagColor}18`, border: `1px solid ${tagColor}25` }}
                >
                  {tag}
                </span>
              </div>
              <p className="font-mono text-[9px] text-white/22 leading-relaxed group-hover:text-white/35 transition-colors">
                {desc}
              </p>
            </div>
          ))}
        </div>

        {/* CTA row */}
        <div className="flex items-center justify-center gap-5 mb-5 flex-wrap">
          <Link
            href="/map"
            className="group relative inline-flex items-center gap-2.5 border border-[#00d4ff]/40 bg-[#00d4ff]/8 text-[#00d4ff]
                       font-mono font-bold px-8 py-2.5 text-[11px] tracking-[0.25em] uppercase
                       hover:bg-[#00d4ff] hover:text-black hover:border-[#00d4ff]
                       transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-[#00d4ff]/40 rounded-sm"
            style={{ boxShadow: '0 0 20px rgba(0,212,255,0.12)' }}
          >
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d4ff] opacity-60 group-hover:opacity-0" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00d4ff] group-hover:bg-black" />
            </span>
            ENTER PLATFORM
            <span className="text-[#00d4ff]/60 group-hover:text-black/60 transition-colors">▸</span>
          </Link>
          <Link
            href="/vendors"
            className="font-mono text-[9px] tracking-[0.2em] text-white/20
                       hover:text-white/50 transition-colors uppercase border-b border-white/8
                       hover:border-white/25 pb-0.5"
          >
            VIEW VENDORS →
          </Link>
        </div>

        {/* Stats row */}
        <div className="flex gap-6 sm:gap-10 justify-center flex-wrap mb-5">
          {STATS.map(({ value, label, color }, idx) => (
            <div
              key={label}
              className="text-center"
              style={{
                opacity: mounted ? 1 : 0,
                transition: `opacity 0.5s ease ${0.5 + idx * 0.08}s`,
              }}
            >
              <div
                className="font-mono text-xl font-bold tabular-nums"
                style={{ color, textShadow: `0 0 20px ${color}40` }}
              >
                {value}
              </div>
              <div className="font-mono text-[8px] text-white/15 tracking-[0.25em] mt-0.5 uppercase">{label}</div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4 opacity-20">
          <div className="flex-1 h-px bg-white/10" />
          <span className="font-mono text-[8px] tracking-widest text-white/30">NXT//LINK</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Footer note */}
        <p className="font-mono text-[9px] text-white/10 tracking-wider">
          Powered by{' '}
          <span style={{ color: '#ffd700', textShadow: '0 0 8px rgba(255,215,0,0.4)' }} className="font-bold">IKER</span>
          {' '}— Intelligence &amp; Knowledge Engine for Readiness
          <span className="text-white/[0.08]"> · Fort Bliss · UTEP · Border Corridor</span>
        </p>

      </div>
    </main>
  );
}
