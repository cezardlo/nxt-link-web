'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { INDUSTRIES } from '@/lib/data/technology-catalog';

// ─── Suggestion prompts that rotate ──────────────────────────────────────────

const SUGGESTIONS = [
  'pipeline inspection',
  'solar maintenance',
  'warehouse automation',
  'drone inspection',
  'water desalination',
  'autonomous vehicles',
  'border surveillance',
  'medical robotics',
  'smart grid',
  'cold chain logistics',
];

// ─── Global shift insights (fallback when trend API unavailable) ─────────────

type ShiftCard = {
  title: string;
  desc: string;
  industries: string[];
  color: string;
};

const FALLBACK_SHIFTS: ShiftCard[] = [
  {
    title: 'Robotics entering solar maintenance',
    desc: 'Autonomous cleaning and inspection systems are replacing manual field crews across utility-scale solar farms.',
    industries: ['Energy', 'Robotics', 'Manufacturing'],
    color: '#ffd700',
  },
  {
    title: 'AI monitoring transforming pipelines',
    desc: 'Computer vision and acoustic sensors are detecting pipeline anomalies weeks before traditional inspection methods.',
    industries: ['Energy', 'AI/ML', 'Infrastructure'],
    color: '#00d4ff',
  },
  {
    title: 'Warehouse automation accelerating',
    desc: 'Labor shortages are driving rapid adoption of autonomous mobile robots and pick-and-place systems.',
    industries: ['Logistics', 'Robotics', 'Manufacturing'],
    color: '#00ff88',
  },
  {
    title: 'Border technology modernization',
    desc: 'Integrated sensor networks and AI-powered surveillance are replacing legacy detection systems across US borders.',
    industries: ['Defense', 'Cybersecurity', 'AI/ML'],
    color: '#f97316',
  },
];

// Stage → color mapping for live trends
const STAGE_COLORS: Record<string, string> = {
  emerging: '#f97316',
  accelerating: '#00d4ff',
  established: '#00ff88',
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [shifts, setShifts] = useState<ShiftCard[]>(FALLBACK_SHIFTS);
  const [isLive, setIsLive] = useState(false);

  // Fetch live trends from trend agent
  useEffect(() => {
    let cancelled = false;
    async function loadTrends() {
      try {
        const res = await fetch('/api/agents/trends');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data.ok || !data.trends?.length) return;
        const live: ShiftCard[] = data.trends.slice(0, 4).map((t: { keyword: string; stage: string; signal_count: number; industries: string[]; latest_signal: string }) => ({
          title: `${t.keyword.charAt(0).toUpperCase() + t.keyword.slice(1)} is ${t.stage}`,
          desc: t.latest_signal || `${t.signal_count} signals detected across multiple sources.`,
          industries: t.industries.slice(0, 3),
          color: STAGE_COLORS[t.stage] ?? '#00d4ff',
        }));
        setShifts(live);
        setIsLive(true);
      } catch { /* keep fallback */ }
    }
    void loadTrends();
    return () => { cancelled = true; };
  }, []);

  // Typing animation for placeholder
  useEffect(() => {
    if (isFocused || query) return;
    const suggestion = SUGGESTIONS[suggestionIdx];
    if (charIdx <= suggestion.length) {
      const timer = setTimeout(() => {
        setPlaceholder(suggestion.slice(0, charIdx));
        setCharIdx((c) => c + 1);
      }, 60);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setCharIdx(0);
        setSuggestionIdx((i) => (i + 1) % SUGGESTIONS.length);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [charIdx, suggestionIdx, isFocused, query]);

  const handleSearch = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    const slug = q.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    router.push(`/industry/${slug}`);
  }, [query, router]);

  return (
    <main className="min-h-screen bg-black flex flex-col relative overflow-hidden">

      {/* Subtle radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(0,212,255,0.03) 0%, transparent 70%)',
        }}
      />

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="relative z-10 h-12 flex items-center justify-between px-6 shrink-0">
        <span className="font-mono text-[12px] tracking-[0.45em] text-white/80">
          NXT<span style={{ color: '#00d4ff' }}>{'//'}</span>LINK
        </span>

        <div className="flex items-center gap-4">
          <Link
            href="/map"
            className="font-mono text-[8px] tracking-[0.25em] text-white/25 hover:text-white/50 transition-colors uppercase"
          >
            MAP
          </Link>
          <Link
            href="/industries"
            className="font-mono text-[8px] tracking-[0.25em] text-white/25 hover:text-white/50 transition-colors uppercase"
          >
            INDUSTRIES
          </Link>
          <Link
            href="/signals"
            className="font-mono text-[8px] tracking-[0.25em] text-white/25 hover:text-white/50 transition-colors uppercase"
          >
            SIGNALS
          </Link>
        </div>
      </header>

      {/* ── Hero: Search ────────────────────────────────────────── */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 -mt-16">

        {/* Eyebrow */}
        <div className="font-mono text-[8px] tracking-[0.5em] text-white/20 uppercase mb-6">
          GLOBAL INDUSTRY INTELLIGENCE
        </div>

        {/* Main heading — minimal */}
        <h1
          className="text-center font-semibold tracking-tight text-white/90 leading-[1.1] mb-10"
          style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 'clamp(28px, 4.5vw, 48px)' }}
        >
          Explore any industry
        </h1>

        {/* Search bar — large, centered, calm */}
        <div className="w-full max-w-xl relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={isFocused ? 'Type an industry or technology...' : placeholder || ' '}
            className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-5 py-4 font-mono text-[13px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-[#00d4ff]/30 focus:bg-white/[0.06] transition-all duration-300"
          />
          {query.trim() && (
            <button
              onClick={handleSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] tracking-[0.2em] text-[#00d4ff]/70 hover:text-[#00d4ff] transition-colors"
            >
              EXPLORE →
            </button>
          )}
        </div>

        {/* Quick suggestions */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 max-w-xl">
          {SUGGESTIONS.slice(0, 5).map((s) => (
            <button
              key={s}
              onClick={() => {
                setQuery(s);
                const slug = s.replace(/\s+/g, '-');
                router.push(`/industry/${slug}`);
              }}
              className="font-mono text-[8px] tracking-wider text-white/20 border border-white/[0.06] rounded-full px-3 py-1.5 hover:text-white/40 hover:border-white/[0.12] hover:bg-white/[0.03] transition-all duration-200"
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* ── Global Shifts ───────────────────────────────────────── */}
      <section className="relative z-10 px-6 pb-16">
        <div className="max-w-4xl mx-auto">

          {/* Section label */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-white/[0.04]" />
            <div className="flex items-center gap-2">
              {isLive && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ backgroundColor: '#00ff88' }} />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: '#00ff88' }} />
                </span>
              )}
              <span className="font-mono text-[7px] tracking-[0.4em] text-white/15 uppercase">
                {isLive ? 'LIVE TRENDS' : 'GLOBAL SHIFTS'}
              </span>
            </div>
            <div className="h-px flex-1 bg-white/[0.04]" />
          </div>

          {/* Shift cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shifts.map((shift) => (
              <div
                key={shift.title}
                className="group border border-white/[0.05] rounded-sm p-5 hover:border-white/[0.10] hover:bg-white/[0.015] transition-all duration-300 cursor-default"
              >
                <div
                  className="w-6 h-[2px] mb-3 rounded-full transition-all duration-300 group-hover:w-10"
                  style={{ backgroundColor: shift.color, opacity: 0.6 }}
                />
                <h3 className="font-mono text-[11px] text-white/65 font-medium mb-2 group-hover:text-white/80 transition-colors">
                  {shift.title}
                </h3>
                <p className="font-mono text-[9px] text-white/25 leading-[1.7] mb-3 group-hover:text-white/35 transition-colors">
                  {shift.desc}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {shift.industries.map((ind) => (
                    <span
                      key={ind}
                      className="font-mono text-[6px] tracking-[0.15em] text-white/15 border border-white/[0.06] rounded-full px-2 py-0.5 uppercase"
                    >
                      {ind}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industry Explorer (bottom grid) ─────────────────────── */}
      <section className="relative z-10 px-6 pb-20">
        <div className="max-w-4xl mx-auto">

          {/* Section label */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-white/[0.04]" />
            <span className="font-mono text-[7px] tracking-[0.4em] text-white/15 uppercase">
              INDUSTRIES
            </span>
            <div className="h-px flex-1 bg-white/[0.04]" />
          </div>

          {/* Sector grid — clean, minimal */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {INDUSTRIES.map((ind) => (
              <Link
                key={ind.slug}
                href={`/industry/${ind.slug}`}
                className="group flex flex-col items-center justify-center py-6 border border-white/[0.05] rounded-sm hover:border-white/[0.12] hover:bg-white/[0.02] transition-all duration-300"
              >
                <div
                  className="w-2 h-2 rounded-full mb-3 transition-transform duration-300 group-hover:scale-125"
                  style={{ backgroundColor: ind.color, boxShadow: `0 0 10px ${ind.color}50` }}
                />
                <span className="font-mono text-[10px] tracking-[0.15em] text-white/45 group-hover:text-white/70 transition-colors uppercase">
                  {ind.label}
                </span>
              </Link>
            ))}
          </div>

          {/* Subtle "explore all" */}
          <div className="text-center mt-6">
            <Link
              href="/industries"
              className="font-mono text-[8px] tracking-[0.3em] text-white/15 hover:text-white/35 transition-colors uppercase"
            >
              VIEW ALL SECTORS →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="relative z-10 py-4 text-center border-t border-white/[0.04]">
        <span className="font-mono text-[7px] tracking-[0.35em] text-white/10 uppercase">
          NXT//LINK
        </span>
      </footer>
    </main>
  );
}
