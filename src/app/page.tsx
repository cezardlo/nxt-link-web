'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { COLORS } from '@/lib/tokens';

// ── Types (mirrored from solve page / API) ──────────────────────────────────

type Vendor = {
  name: string;
  category: string | null;
  iker_score: number | null;
  website: string | null;
};

type Decision = {
  rank: number;
  signal_id: string;
  title: string;
  industry: string;
  signal_type: string;
  company: string | null;
  amount_usd: number | null;
  source: string | null;
  discovered_at: string;
  score: {
    final: number;
    cluster_volume: number;
    cluster_velocity: number;
    ep_relevance: number;
    source_quality: number;
  };
  cause: string;
  effect: string;
  consequence: string;
  what_to_do: string[];
  who_can_help: Vendor[];
  urgency: 'act_now' | 'watch' | 'opportunity';
  why_el_paso: string;
  related_count: number;
};

type Top3Response = {
  ok: boolean;
  mode: 'top3';
  generated_at: string;
  decisions: Decision[];
  total_signals_analyzed: number;
};

type SearchResponse = {
  ok: boolean;
  mode: 'search';
  query: string;
  cause: string;
  effect: string;
  consequence: string;
  what_to_do: string[];
  urgency: string;
  why_el_paso: string;
  signals: { id: string; title: string; industry: string; company: string | null; source: string | null; discovered_at: string; score: number }[];
  who_can_help: Vendor[];
  total_signals_searched: number;
};

type TickerSignal = {
  id: string;
  title: string;
  signal_type: string;
  industry: string;
  discovered_at: string;
};

type BriefingResponse = {
  briefing?: {
    total_signals?: number;
    recent_signals?: TickerSignal[];
  };
};

type BrainResponse = {
  scannedSignals?: number;
  notesScanned?: number;
  entities?: Array<{ id: string; type: string; name: string }>;
};

// ── Urgency config ──────────────────────────────────────────────────────────

const URGENCY_STYLES = {
  act_now: {
    label: 'ACT NOW',
    classes: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/10',
  },
  watch: {
    label: 'WATCH',
    classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/10',
  },
  opportunity: {
    label: 'OPPORTUNITY',
    classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10',
  },
} as const;

// ── Signal type labels for ticker ───────────────────────────────────────────

const SIGNAL_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  contract_award: { label: 'Contract', color: '#22c55e' },
  funding_round:  { label: 'Funding',  color: '#a855f7' },
  patent_filing:  { label: 'Patent',   color: '#06b6d4' },
  partnership:    { label: 'Partner',   color: '#f59e0b' },
  product_launch: { label: 'Launch',    color: '#f97316' },
  regulation:     { label: 'Rule',      color: '#ef4444' },
  market_expansion: { label: 'Expand',  color: '#10b981' },
};

// ── Quick nav items ─────────────────────────────────────────────────────────

const QUICK_NAV = [
  { href: '/briefing', label: 'Daily Brief',  icon: '📋', desc: 'Today\'s intelligence summary' },
  { href: '/intel',    label: 'Signal Feed',   icon: '📡', desc: 'Live ranked signals' },
  { href: '/map',      label: 'Brain Map',     icon: '🌐', desc: 'Place-based clusters' },
  { href: '/vendors',  label: 'Vendors',       icon: '🏢', desc: 'Browse by category' },
  { href: '/products', label: 'Products',      icon: '📦', desc: 'Solution marketplace' },
  { href: '/industry', label: 'Industries',    icon: '🏭', desc: 'Sector intelligence' },
  { href: '/explore',  label: 'Explore',        icon: '🔗', desc: 'Relationship graph' },
];

// ── Animation variants ──────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

// ── Animated Number Counter ─────────────────────────────────────────────────

function AnimatedNumber({ value }: { value: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(false);

  useEffect(() => {
    if (value <= 0 || ref.current) return;
    ref.current = true;
    let start = 0;
    const duration = 1200;
    const step = 1000 / 60;
    const increment = value / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, step);
    return () => clearInterval(timer);
  }, [value]);

  return <span className="tabular-nums">{count.toLocaleString()}</span>;
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [top3, setTop3] = useState<Decision[] | null>(null);
  const [totalAnalyzed, setTotalAnalyzed] = useState(0);
  const [error, setError] = useState('');

  const [input, setInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [inputFocused, setInputFocused] = useState(false);

  const [stats, setStats] = useState<{ total: number; companies: number; notes: number } | null>(null);
  const [tickerSignals, setTickerSignals] = useState<TickerSignal[]>([]);

  useEffect(() => {
    loadTop3();
    loadStats();
  }, []);

  async function loadTop3() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/decide');
      const data: Top3Response = await res.json();
      if (data.ok) {
        setTop3(data.decisions);
        setTotalAnalyzed(data.total_signals_analyzed);
      } else {
        setError('Failed to load intelligence');
      }
    } catch {
      setError('Network error loading decisions');
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const [briefingRes, brainRes] = await Promise.allSettled([
        fetch('/api/briefing').then(r => r.json() as Promise<BriefingResponse>),
        fetch('/api/brain/sync?limit=80').then(r => r.json() as Promise<BrainResponse>),
      ]);

      if (briefingRes.status === 'fulfilled' && briefingRes.value?.briefing) {
        const recentSignals = briefingRes.value.briefing.recent_signals?.slice(0, 10) || [];
        setTickerSignals(recentSignals);
        const total = briefingRes.value.briefing.total_signals || 0;
        setStats(prev => ({ total, companies: prev?.companies ?? 0, notes: prev?.notes ?? 0 }));
      }

      if (brainRes.status === 'fulfilled') {
        const companyCount = brainRes.value.entities?.filter(e => e.type === 'company').length ?? 0;
        const noteCount = brainRes.value.notesScanned ?? 0;
        setStats(prev => ({ total: prev?.total ?? 0, companies: companyCount, notes: noteCount }));
      }
    } catch {
      // Stats are non-critical
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (q.length < 3) return;

    setSearching(true);
    setSearchResult(null);
    setError('');

    try {
      const res = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: q }),
      });
      const data: SearchResponse = await res.json();
      if (data.ok) {
        setSearchResult(data);
      } else {
        setError('No results found');
      }
    } catch {
      setError('Network error');
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setSearchResult(null);
    setInput('');
    setError('');
  }

  const signalTape = useMemo(() => (tickerSignals.length ? [...tickerSignals, ...tickerSignals] : []), [tickerSignals]);

  return (
    <div className="min-h-screen bg-nxt-bg relative overflow-hidden">

      {/* ═══ Animated Ambient Background ═══════════════════════════════════ */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-nxt-bg via-nxt-surface to-nxt-bg" />
        <div className="absolute top-[15%] left-[20%] w-[500px] h-[500px] bg-nxt-accent/[0.04] rounded-full blur-[120px] animate-pulse-soft" />
        <div className="absolute bottom-[20%] right-[15%] w-[400px] h-[400px] bg-emerald-500/[0.03] rounded-full blur-[100px] animate-pulse-soft" style={{ animationDelay: '1.3s' }} />
        <div className="absolute top-[60%] left-[50%] w-[300px] h-[300px] bg-amber-500/[0.02] rounded-full blur-[80px] animate-pulse-soft" style={{ animationDelay: '2.5s' }} />
      </div>

      {/* ═══ Main Content (above background) ══════════════════════════════ */}
      <div className="relative z-10">

        {/* ═══ A. Command Bar ═══════════════════════════════════════════════ */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="border-b border-white/[0.06] bg-nxt-bg/80 backdrop-blur-xl"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-6">
            {/* Title row */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-grotesk">
                  NXT LINK
                </h1>
                <p className="text-[10px] tracking-[0.16em] uppercase mt-0.5 text-nxt-dim">
                  Mission Control
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-nxt-muted">
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-1 backdrop-blur-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
                  <span className="text-emerald-400/80">{stats ? `${stats.total.toLocaleString()} signals` : 'Live'}</span>
                </div>
              </div>
            </div>

            {/* Premium Search Bar */}
            <form onSubmit={handleSearch}>
              <div className={`relative group transition-all duration-500 ${inputFocused ? 'scale-[1.01]' : ''}`}>
                {/* Glow effect */}
                <div className={`absolute -inset-0.5 bg-gradient-to-r from-nxt-accent/30 via-emerald-500/20 to-nxt-accent/30 rounded-2xl blur-lg transition-opacity duration-500 ${inputFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
                <div className="relative flex items-center gap-3 bg-nxt-surface/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl px-5 py-1 transition-all duration-300 group-hover:border-white/[0.12]">
                  {/* Search icon */}
                  <svg className="w-5 h-5 text-nxt-dim shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    placeholder="Describe a problem or ask anything..."
                    className="flex-1 bg-transparent text-nxt-text placeholder:text-nxt-dim outline-none text-[14px] font-grotesk min-h-[48px]"
                  />
                  <button
                    type="submit"
                    disabled={input.trim().length < 3 || searching}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-nxt-accent text-white font-bold text-[15px] transition-all duration-200 hover:bg-nxt-accent-light disabled:opacity-20 disabled:cursor-default cursor-pointer"
                  >
                    {searching ? '...' : '→'}
                  </button>
                </div>
              </div>
            </form>

            {searchResult && (
              <button
                onClick={clearSearch}
                className="text-[11px] tracking-wide mt-3 text-nxt-muted hover:text-nxt-secondary transition-colors bg-transparent border-none cursor-pointer"
              >
                ← Back to Mission Control
              </button>
            )}
          </div>
        </motion.header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">

          {/* ═══ Error ═════════════════════════════════════════════════════ */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl text-[12px] bg-red-500/[0.06] border border-red-500/20 text-red-400"
            >
              {error}
            </motion.div>
          )}

          {/* ═══ Search Results ═══════════════════════════════════════════ */}
          {searching && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="w-8 h-8 border-2 border-nxt-accent/20 border-t-nxt-accent rounded-full animate-spin" />
              <span className="text-[10px] tracking-[0.12em] uppercase text-nxt-dim">
                Searching live signals...
              </span>
            </div>
          )}

          {!searching && searchResult && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <UrgencyBadge urgency={searchResult.urgency as 'act_now' | 'watch' | 'opportunity'} />
                <span className="text-[10px] text-nxt-dim">
                  {searchResult.total_signals_searched} signals searched
                </span>
              </div>

              <div className="mb-3">
                <SectionLabel text="CAUSE" />
                <p className="text-[13px] leading-relaxed mt-1 text-nxt-text/80">{searchResult.cause}</p>
              </div>

              <div className="mb-3">
                <SectionLabel text="EFFECT" />
                <p className="text-[12px] leading-relaxed mt-1 text-nxt-text/60">{searchResult.effect}</p>
              </div>

              <div className="mb-4">
                <SectionLabel text="IF YOU DON&apos;T ACT" />
                <p className="text-[12px] leading-relaxed mt-1 text-amber-400">{searchResult.consequence}</p>
              </div>

              <div className="mb-4">
                <SectionLabel text="ACTION" />
                <div className="flex flex-col gap-2 mt-2">
                  {searchResult.what_to_do.map((action, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[10px] font-bold shrink-0 w-5 h-5 flex items-center justify-center mt-0.5 bg-nxt-accent/10 rounded-md text-nxt-accent">
                        {i + 1}
                      </span>
                      <span className="text-[12px] leading-relaxed text-nxt-text/70">{action}</span>
                    </div>
                  ))}
                </div>
              </div>

              {searchResult.who_can_help.length > 0 && (
                <div className="mb-3">
                  <SectionLabel text="WHO CAN HELP" />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {searchResult.who_can_help.map((v, i) => (
                      <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                        {v.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {searchResult.signals.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/[0.06]">
                  <SectionLabel text="SUPPORTING SIGNALS" />
                  <div className="flex flex-col gap-2 mt-2">
                    {searchResult.signals.map(s => (
                      <div key={s.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <div className="text-[11px] font-medium text-nxt-text">{s.title}</div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[9px] text-nxt-dim">{s.industry}</span>
                          {s.company && <span className="text-[9px] text-nxt-muted">{s.company}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ B. Top 3 Decisions ═══════════════════════════════════════ */}
          {!searchResult && !searching && (
            <>
              <motion.section
                variants={stagger}
                initial="hidden"
                animate="show"
              >
                <motion.div variants={fadeUp} className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white font-grotesk">
                      Top 3 Things to Act On
                    </h2>
                    <p className="text-[11px] mt-0.5 text-nxt-dim">
                      {loading ? 'Analyzing live signals...' : `From ${totalAnalyzed.toLocaleString()} signals this week`}
                    </p>
                  </div>
                </motion.div>

                {loading && (
                  <div className="flex flex-col items-center justify-center gap-3 py-16">
                    <div className="w-8 h-8 border-2 border-nxt-accent/20 border-t-nxt-accent rounded-full animate-spin" />
                    <span className="text-[10px] tracking-[0.12em] uppercase text-nxt-dim">
                      Analyzing intelligence...
                    </span>
                  </div>
                )}

                {!loading && top3 && (
                  <motion.div variants={stagger} className="grid gap-4 md:grid-cols-3">
                    {top3.map((d, i) => (
                      <motion.div key={d.signal_id} variants={fadeUp} custom={i}>
                        <DecisionCard decision={d} index={i} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {!loading && !top3 && !error && (
                  <p className="text-sm text-center py-8 text-nxt-muted">
                    No decisions available right now.
                  </p>
                )}
              </motion.section>

              {/* ═══ C. Stats Bar ═════════════════════════════════════════ */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="grid grid-cols-3 gap-4 p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm"
              >
                <StatItem label="Signals" value={stats?.total ?? 0} />
                <StatItem label="Companies" value={stats?.companies ?? 0} />
                <StatItem label="Research" value={stats?.notes ?? 0} />
              </motion.section>

              {/* ═══ D. Connection Spotlight ══════════════════════════════ */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
              >
                <Link
                  href="/explore"
                  className="block rounded-2xl border border-white/[0.06] bg-gradient-to-r from-nxt-accent/[0.04] to-emerald-500/[0.04] backdrop-blur-sm p-5 transition-all duration-300 hover:border-white/[0.15] hover:shadow-lg hover:shadow-nxt-accent/5 no-underline group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-nxt-accent mb-1">Knowledge Graph</div>
                      <h3 className="text-[15px] font-semibold text-white group-hover:text-nxt-accent-light transition-colors">
                        Explore {stats ? `${stats.total.toLocaleString()} signals` : ''} across {stats ? stats.companies : '...'} companies
                      </h3>
                      <p className="text-[12px] text-nxt-dim mt-1">Click to see how industries, technologies, vendors, and signals connect.</p>
                    </div>
                    <div className="text-2xl">🔗</div>
                  </div>
                </Link>
              </motion.section>

              {/* ═══ E. Quick Navigation ══════════════════════════════════ */}
              <motion.section
                variants={stagger}
                initial="hidden"
                animate="show"
                transition={{ delayChildren: 0.4 }}
              >
                <motion.h2
                  variants={fadeUp}
                  className="text-[10px] font-mono uppercase tracking-widest mb-3 text-nxt-dim"
                >
                  Navigate
                </motion.h2>
                <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {QUICK_NAV.map((item) => (
                    <motion.div key={item.href} variants={fadeUp}>
                      <Link
                        href={item.href}
                        className="group block p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm
                          transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.05] hover:shadow-lg hover:shadow-nxt-accent/5 hover:scale-[1.02]
                          no-underline"
                      >
                        <div className="text-xl mb-2 transition-transform duration-300 group-hover:scale-110">{item.icon}</div>
                        <div className="text-[13px] font-semibold text-white">{item.label}</div>
                        <div className="text-[10px] mt-1 text-nxt-dim">{item.desc}</div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.section>

              {/* ═══ E. Signal Ticker ═════════════════════════════════════ */}
              {signalTape.length > 0 && (
                <motion.section
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="border-t border-white/[0.06] pt-5"
                >
                  <div className="text-[10px] font-mono uppercase tracking-widest mb-3 text-nxt-dim">
                    Latest Signals
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex gap-4 animate-marquee">
                      {signalTape.map((signal, index) => {
                        const typeInfo = SIGNAL_TYPE_LABELS[signal.signal_type] || { label: signal.signal_type, color: '#6b6b76' };
                        return (
                          <div key={`${signal.id}-${index}`} className="flex items-center gap-2 shrink-0">
                            <span
                              className="rounded-full px-2 py-0.5 font-mono text-[10px]"
                              style={{ background: `${typeInfo.color}15`, color: typeInfo.color, border: `1px solid ${typeInfo.color}25` }}
                            >
                              {typeInfo.label}
                            </span>
                            <span className="max-w-[340px] truncate whitespace-nowrap text-xs text-nxt-secondary">
                              {signal.title}
                            </span>
                            <span className="text-[10px] font-mono text-nxt-dim">
                              {timeAgo(signal.discovered_at)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Decision Card (Glassmorphism) ───────────────────────────────────────────

const CARD_ACCENT_COLORS = [
  'from-nxt-accent/10 to-purple-500/5',
  'from-emerald-500/10 to-cyan-500/5',
  'from-amber-500/10 to-orange-500/5',
];

function DecisionCard({ decision: d, index }: { decision: Decision; index: number }) {
  return (
    <div className="relative group rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5 transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.05] hover:shadow-2xl hover:shadow-nxt-accent/5 flex flex-col">
      {/* Gradient glow on hover */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${CARD_ACCENT_COLORS[index % 3]} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

      <div className="relative">
        {/* Urgency + industry */}
        <div className="flex items-center gap-2 mb-2.5">
          <UrgencyBadge urgency={d.urgency} />
          <span className="text-[9px] tracking-wide uppercase text-nxt-dim">{d.industry}</span>
        </div>

        {/* Title */}
        <h3 className="text-[13px] font-semibold leading-snug mb-2 text-white group-hover:text-nxt-accent-light transition-colors duration-300">
          {d.title}
        </h3>

        {/* Cause */}
        <p className="text-[11px] leading-relaxed mb-3 text-nxt-text/60">
          {d.cause}
        </p>

        {/* Recommended action */}
        {d.what_to_do.length > 0 && (
          <div className="mb-3">
            <SectionLabel text="ACTION" />
            <p className="text-[11px] leading-relaxed mt-1 text-nxt-text/70">
              {d.what_to_do[0]}
            </p>
          </div>
        )}

        {/* Vendors */}
        {d.who_can_help.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-auto pt-2 border-t border-white/[0.06]">
            {d.who_can_help.map((v, i) => (
              <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/15 text-cyan-400 transition-colors duration-200 hover:bg-cyan-500/20">
                {v.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stat Item with Animated Number ──────────────────────────────────────────

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-nxt-dim">{label}</div>
      <div className="mt-1 text-2xl font-mono font-bold text-white">
        {value > 0 ? <AnimatedNumber value={value} /> : '---'}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <span className="text-[8px] tracking-[0.18em] font-bold text-nxt-dim">
      {text}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: 'act_now' | 'watch' | 'opportunity' }) {
  const config = URGENCY_STYLES[urgency] || URGENCY_STYLES.watch;
  return (
    <span className={`inline-flex items-center text-[8px] tracking-[0.12em] font-bold px-2.5 py-0.5 rounded-full border shadow-sm ${config.classes}`}>
      {config.label}
    </span>
  );
}
