'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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

const URGENCY_CONFIG = {
  act_now:     { label: 'ACT NOW',     bg: `${COLORS.red}18`,    border: `${COLORS.red}40`,    color: COLORS.red },
  watch:       { label: 'WATCH',       bg: `${COLORS.amber}12`,  border: `${COLORS.amber}35`,  color: COLORS.amber },
  opportunity: { label: 'OPPORTUNITY', bg: `${COLORS.green}12`,  border: `${COLORS.green}35`,  color: COLORS.green },
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
  { href: '/industry', label: 'Industries',    icon: '🏭', desc: 'Sector intelligence' },
];

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

// ── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  // Decision state
  const [loading, setLoading] = useState(true);
  const [top3, setTop3] = useState<Decision[] | null>(null);
  const [totalAnalyzed, setTotalAnalyzed] = useState(0);
  const [error, setError] = useState('');

  // Search state
  const [input, setInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [inputFocused, setInputFocused] = useState(false);

  // Stats state (from existing page)
  const [stats, setStats] = useState<{ total: number; companies: number; notes: number } | null>(null);

  // Ticker state
  const [tickerSignals, setTickerSignals] = useState<TickerSignal[]>([]);

  // Load top 3 decisions on mount
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
    <div className="min-h-screen bg-black">
      {/* ═══ A. Command Bar ═══════════════════════════════════════════════ */}
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-6">
          {/* Title row */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1
                className="text-xl sm:text-2xl font-bold tracking-tight text-white"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                NXT LINK
              </h1>
              <p className="text-[10px] tracking-[0.16em] uppercase mt-0.5" style={{ color: COLORS.dim }}>
                Mission Control
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest" style={{ color: COLORS.muted }}>
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-900/40 bg-emerald-950/40 px-2.5 py-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{stats ? `${stats.total.toLocaleString()} signals` : 'Live'}</span>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch}>
            <div
              className="relative transition-all duration-200"
              style={{
                borderRadius: '14px',
                boxShadow: inputFocused
                  ? `0 0 0 1px ${COLORS.accent}50, 0 0 16px ${COLORS.accent}10`
                  : `0 0 0 1px ${COLORS.border}`,
              }}
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Describe a problem or ask anything..."
                className="w-full text-[14px] outline-none min-h-[48px] px-4 py-3 pr-12"
                style={{
                  background: COLORS.card,
                  border: 'none',
                  borderRadius: '14px',
                  color: COLORS.text,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              />
              <button
                type="submit"
                disabled={input.trim().length < 3 || searching}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center transition-all disabled:opacity-20"
                style={{
                  background: COLORS.accent,
                  borderRadius: '10px',
                  border: 'none',
                  cursor: input.trim().length >= 3 ? 'pointer' : 'default',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                {searching ? '...' : '→'}
              </button>
            </div>
          </form>

          {/* Back button when showing search results */}
          {searchResult && (
            <button
              onClick={clearSearch}
              className="text-[11px] tracking-wide mt-3"
              style={{ color: COLORS.muted, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ← Back to Mission Control
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* ═══ Error ═══════════════════════════════════════════════════════ */}
        {error && (
          <div
            className="p-3 rounded-xl text-[12px]"
            style={{ background: `${COLORS.red}08`, border: `1px solid ${COLORS.red}25`, color: COLORS.red }}
          >
            {error}
          </div>
        )}

        {/* ═══ Search Results ═════════════════════════════════════════════ */}
        {searching && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div
              className="w-7 h-7 border-2 rounded-full animate-spin"
              style={{ borderColor: `${COLORS.accent}25`, borderTopColor: COLORS.accent }}
            />
            <span className="text-[10px] tracking-[0.12em] uppercase" style={{ color: COLORS.dim }}>
              Searching live signals...
            </span>
          </div>
        )}

        {!searching && searchResult && (
          <div
            className="p-5 rounded-xl"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
          >
            <div className="mb-3">
              <UrgencyBadge urgency={searchResult.urgency as 'act_now' | 'watch' | 'opportunity'} />
              <span className="text-[10px] ml-2" style={{ color: COLORS.dim }}>
                {searchResult.total_signals_searched} signals searched
              </span>
            </div>

            <div className="mb-3">
              <SectionLabel text="CAUSE" />
              <p className="text-[13px] leading-relaxed mt-1" style={{ color: `${COLORS.text}cc` }}>
                {searchResult.cause}
              </p>
            </div>

            <div className="mb-3">
              <SectionLabel text="EFFECT" />
              <p className="text-[12px] leading-relaxed mt-1" style={{ color: `${COLORS.text}a0` }}>
                {searchResult.effect}
              </p>
            </div>

            <div className="mb-4">
              <SectionLabel text="IF YOU DON'T ACT" />
              <p className="text-[12px] leading-relaxed mt-1" style={{ color: COLORS.amber }}>
                {searchResult.consequence}
              </p>
            </div>

            <div className="mb-4">
              <SectionLabel text="ACTION" />
              <div className="flex flex-col gap-2 mt-2">
                {searchResult.what_to_do.map((action, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span
                      className="text-[10px] font-bold shrink-0 w-5 h-5 flex items-center justify-center mt-0.5"
                      style={{ background: `${COLORS.accent}15`, borderRadius: '6px', color: COLORS.accent }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[12px] leading-relaxed" style={{ color: `${COLORS.text}b0` }}>
                      {action}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {searchResult.who_can_help.length > 0 && (
              <div className="mb-3">
                <SectionLabel text="WHO CAN HELP" />
                <div className="flex flex-wrap gap-2 mt-2">
                  {searchResult.who_can_help.map((v, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2.5 py-1 rounded-lg"
                      style={{ background: `${COLORS.cyan}10`, border: `1px solid ${COLORS.cyan}25`, color: COLORS.cyan }}
                    >
                      {v.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {searchResult.signals.length > 0 && (
              <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                <SectionLabel text="SUPPORTING SIGNALS" />
                <div className="flex flex-col gap-2 mt-2">
                  {searchResult.signals.map(s => (
                    <div
                      key={s.id}
                      className="p-2.5 rounded-lg"
                      style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
                    >
                      <div className="text-[11px] font-medium" style={{ color: COLORS.text }}>{s.title}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[9px]" style={{ color: COLORS.dim }}>{s.industry}</span>
                        {s.company && <span className="text-[9px]" style={{ color: COLORS.muted }}>{s.company}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ B. Top 3 Decisions ═════════════════════════════════════════ */}
        {!searchResult && !searching && (
          <>
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Top 3 Things to Act On
                  </h2>
                  <p className="text-[11px] mt-0.5" style={{ color: COLORS.dim }}>
                    {loading ? 'Analyzing live signals...' : `From ${totalAnalyzed} signals this week`}
                  </p>
                </div>
              </div>

              {loading && (
                <div className="flex flex-col items-center justify-center gap-3 py-16">
                  <div
                    className="w-7 h-7 border-2 rounded-full animate-spin"
                    style={{ borderColor: `${COLORS.accent}25`, borderTopColor: COLORS.accent }}
                  />
                  <span className="text-[10px] tracking-[0.12em] uppercase" style={{ color: COLORS.dim }}>
                    Analyzing intelligence...
                  </span>
                </div>
              )}

              {!loading && top3 && (
                <div className="grid gap-4 md:grid-cols-3">
                  {top3.map(d => (
                    <DecisionCard key={d.signal_id} decision={d} />
                  ))}
                </div>
              )}

              {!loading && !top3 && !error && (
                <p className="text-sm text-center py-8" style={{ color: COLORS.muted }}>
                  No decisions available right now.
                </p>
              )}
            </section>

            {/* ═══ C. Stats Bar ═══════════════════════════════════════════ */}
            <section
              className="grid grid-cols-3 gap-4 p-4 rounded-xl"
              style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
            >
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: COLORS.dim }}>Signals</div>
                <div className="mt-1 text-2xl font-mono font-bold text-white">
                  {stats?.total?.toLocaleString() ?? '---'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: COLORS.dim }}>Companies</div>
                <div className="mt-1 text-2xl font-mono font-bold text-white">
                  {stats?.companies?.toLocaleString() ?? '---'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: COLORS.dim }}>Research</div>
                <div className="mt-1 text-2xl font-mono font-bold text-white">
                  {stats?.notes?.toLocaleString() ?? '---'}
                </div>
              </div>
            </section>

            {/* ═══ D. Quick Navigation ════════════════════════════════════ */}
            <section>
              <h2 className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: COLORS.dim }}>
                Navigate
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {QUICK_NAV.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] hover:border-zinc-600"
                    style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, textDecoration: 'none' }}
                  >
                    <div className="text-xl mb-2">{item.icon}</div>
                    <div className="text-[13px] font-semibold text-white">{item.label}</div>
                    <div className="text-[10px] mt-1" style={{ color: COLORS.dim }}>{item.desc}</div>
                  </Link>
                ))}
              </div>
            </section>

            {/* ═══ E. Signal Ticker ═══════════════════════════════════════ */}
            {signalTape.length > 0 && (
              <section className="border-t border-zinc-800 pt-5">
                <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: COLORS.dim }}>
                  Latest Signals
                </div>
                <div className="overflow-hidden">
                  <div className="flex gap-4 animate-marquee">
                    {signalTape.map((signal, index) => {
                      const typeInfo = SIGNAL_TYPE_LABELS[signal.signal_type] || { label: signal.signal_type, color: '#6b6b76' };
                      return (
                        <div key={`${signal.id}-${index}`} className="flex items-center gap-2 shrink-0">
                          <span
                            className="rounded px-1.5 py-0.5 font-mono text-[10px]"
                            style={{ background: `${typeInfo.color}18`, color: typeInfo.color }}
                          >
                            {typeInfo.label}
                          </span>
                          <span className="max-w-[340px] truncate whitespace-nowrap text-xs" style={{ color: COLORS.secondary }}>
                            {signal.title}
                          </span>
                          <span className="text-[10px] font-mono" style={{ color: COLORS.dim }}>
                            {timeAgo(signal.discovered_at)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ── Decision Card ───────────────────────────────────────────────────────────

function DecisionCard({ decision: d }: { decision: Decision }) {
  return (
    <div
      className="p-4 rounded-xl transition-all duration-200 hover:scale-[1.01] hover:border-zinc-600 flex flex-col"
      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
    >
      {/* Urgency + industry */}
      <div className="flex items-center gap-2 mb-2">
        <UrgencyBadge urgency={d.urgency} />
        <span className="text-[9px] tracking-wide uppercase" style={{ color: COLORS.dim }}>{d.industry}</span>
      </div>

      {/* Title */}
      <h3 className="text-[13px] font-semibold leading-snug mb-2 text-white">{d.title}</h3>

      {/* Cause */}
      <p className="text-[11px] leading-relaxed mb-3 flex-1" style={{ color: `${COLORS.text}90` }}>
        {d.cause}
      </p>

      {/* Recommended action */}
      {d.what_to_do.length > 0 && (
        <div className="mb-3">
          <SectionLabel text="ACTION" />
          <p className="text-[11px] leading-relaxed mt-1" style={{ color: `${COLORS.text}b0` }}>
            {d.what_to_do[0]}
          </p>
        </div>
      )}

      {/* Vendors */}
      {d.who_can_help.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto pt-2" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          {d.who_can_help.map((v, i) => (
            <span
              key={i}
              className="text-[9px] px-2 py-0.5 rounded-md"
              style={{ background: `${COLORS.cyan}10`, border: `1px solid ${COLORS.cyan}20`, color: COLORS.cyan }}
            >
              {v.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <span className="text-[8px] tracking-[0.18em] font-bold" style={{ color: COLORS.dim }}>
      {text}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: 'act_now' | 'watch' | 'opportunity' }) {
  const config = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.watch;
  return (
    <span
      className="text-[8px] tracking-[0.12em] font-bold px-2 py-0.5"
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: '8px',
        color: config.color,
      }}
    >
      {config.label}
    </span>
  );
}
