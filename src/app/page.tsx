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

// ─── Insight card type ────────────────────────────────────────────────────────

type InsightCard = {
  title: string;
  desc: string;
  industries: string[];
  companies: string[];
  color: string;
  type: string;
  confidence: number;
  momentum: string;
};

const TYPE_LABELS: Record<string, string> = {
  pattern: 'PATTERN',
  cluster: 'CLUSTER',
  implication: 'IMPLICATION',
  opportunity: 'OPPORTUNITY',
};

const FALLBACK_INSIGHTS: InsightCard[] = [
  {
    title: 'Warehouse automation accelerating',
    desc: 'Labor shortages driving rapid adoption of autonomous mobile robots. 12 signals detected across funding, hiring, and patents.',
    industries: ['Supply Chain', 'Manufacturing'],
    companies: ['AutoStore', 'Locus Robotics', 'GreyOrange'],
    color: '#00ff88',
    type: 'pattern',
    confidence: 85,
    momentum: 'accelerating',
  },
  {
    title: 'AI entering industrial inspection',
    desc: 'Computer vision and acoustic sensors detecting pipeline anomalies and infrastructure failures weeks before traditional methods.',
    industries: ['Energy', 'AI/ML'],
    companies: ['Gecko Robotics', 'Percepto', 'Flyability'],
    color: '#00d4ff',
    type: 'cluster',
    confidence: 78,
    momentum: 'accelerating',
  },
  {
    title: 'Major capital flowing into new sectors',
    desc: 'Significant funding rounds detected across cybersecurity, defense tech, and supply chain. Capital formation signals upcoming product launches.',
    industries: ['Cybersecurity', 'Defense'],
    companies: ['CrowdStrike', 'Anduril'],
    color: '#ffd700',
    type: 'implication',
    confidence: 82,
    momentum: 'steady',
  },
  {
    title: 'Cybersecurity: high momentum',
    desc: 'Driven by capital inflow, workforce expansion, and contract awards. Zero-trust and OT security are fastest-growing segments.',
    industries: ['Cybersecurity'],
    companies: ['Palo Alto Networks', 'Dragos'],
    color: '#f97316',
    type: 'opportunity',
    confidence: 88,
    momentum: 'accelerating',
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [insights, setInsights] = useState<InsightCard[]>(FALLBACK_INSIGHTS);
  const [isLive, setIsLive] = useState(false);
  const [signalsAnalyzed, setSignalsAnalyzed] = useState(0);

  // Fetch live insights from insight agent
  useEffect(() => {
    let cancelled = false;
    async function loadInsights() {
      try {
        const res = await fetch('/api/insights?limit=6');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data.ok || !data.insights?.length) return;

        type RawInsight = {
          title: string;
          description: string;
          industries: string[];
          companies: string[];
          color: string;
          type: string;
          confidence: number;
          momentum: string;
        };

        const live: InsightCard[] = data.insights.slice(0, 6).map((i: RawInsight) => ({
          title: i.title,
          desc: i.description,
          industries: i.industries.slice(0, 3),
          companies: i.companies?.slice(0, 3) ?? [],
          color: i.color,
          type: i.type,
          confidence: i.confidence,
          momentum: i.momentum,
        }));
        setInsights(live);
        setIsLive(data.is_live ?? false);
        setSignalsAnalyzed(data.signals_analyzed ?? 0);
      } catch { /* keep fallback */ }
    }
    void loadInsights();
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

      {/* ── Intelligence Insights ─────────────────────────────────── */}
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
                {isLive ? `LIVE INTELLIGENCE · ${signalsAnalyzed} SIGNALS ANALYZED` : 'GLOBAL INTELLIGENCE'}
              </span>
            </div>
            <div className="h-px flex-1 bg-white/[0.04]" />
          </div>

          {/* Insight cards — 2-col grid, up to 6 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {insights.map((insight) => (
              <div
                key={insight.title}
                className="group border border-white/[0.05] rounded-sm p-5 hover:border-white/[0.10] hover:bg-white/[0.015] transition-all duration-300 cursor-default"
              >
                {/* Type badge + accent bar */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-6 h-[2px] rounded-full transition-all duration-300 group-hover:w-10"
                    style={{ backgroundColor: insight.color, opacity: 0.6 }}
                  />
                  <span
                    className="font-mono text-[6px] tracking-[0.25em] uppercase"
                    style={{ color: `${insight.color}80` }}
                  >
                    {TYPE_LABELS[insight.type] ?? insight.type}
                  </span>
                  {insight.confidence >= 80 && (
                    <span className="font-mono text-[6px] tracking-wider text-white/15 ml-auto">
                      {insight.confidence}%
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-mono text-[11px] text-white/65 font-medium mb-2 group-hover:text-white/80 transition-colors">
                  {insight.title}
                </h3>

                {/* Description */}
                <p className="font-mono text-[9px] text-white/25 leading-[1.7] mb-3 group-hover:text-white/35 transition-colors">
                  {insight.desc}
                </p>

                {/* Companies (if present) */}
                {insight.companies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {insight.companies.map((c) => (
                      <span
                        key={c}
                        className="font-mono text-[7px] text-[#00d4ff]/30 group-hover:text-[#00d4ff]/50 transition-colors"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {/* Industry tags */}
                <div className="flex flex-wrap gap-1.5">
                  {insight.industries.map((ind) => (
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

          {/* View all link */}
          <div className="text-center mt-4">
            <Link
              href="/signals"
              className="font-mono text-[8px] tracking-[0.3em] text-white/15 hover:text-white/35 transition-colors uppercase"
            >
              VIEW ALL SIGNALS →
            </Link>
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
