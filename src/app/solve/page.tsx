'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { COLORS } from '@/lib/tokens';
import { INDUSTRIES } from '@/lib/data/nav';
import { AppShell } from '@/components/AppShell';

// ── Types ────────────────────────────────────────────────────────────────────

type Vendor = {
  name: string;
  category: string | null;
  iker_score: number | null;
  website: string | null;
};

type CausalEffect = {
  label: string;
  severity: 'high' | 'medium' | 'low';
  timeframe: 'immediate' | 'weeks' | 'months';
};

type CausalData = {
  event_type: string;
  event_confidence: number;
  effects: CausalEffect[];
  technologies: string[];
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
  causal?: CausalData;
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
  causal?: CausalData | null;
};

// ── Urgency badge ────────────────────────────────────────────────────────────

const URGENCY_CONFIG = {
  act_now:     { label: 'ACT NOW',     bg: `${COLORS.red}18`,    border: `${COLORS.red}40`,    color: COLORS.red },
  watch:       { label: 'WATCH',       bg: `${COLORS.amber}12`,  border: `${COLORS.amber}35`,  color: COLORS.amber },
  opportunity: { label: 'OPPORTUNITY', bg: `${COLORS.green}12`,  border: `${COLORS.green}35`,  color: COLORS.green },
} as const;

// ── Suggestions ──────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Reduce fleet downtime',
  'Speed up cross-border customs',
  'Find warehouse automation',
  'Cut freight costs',
  'Solve driver shortage',
  'Improve shipment visibility',
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SolvePage() {
  return (
    <AppShell>
      <Suspense>
        <SolveInner />
      </Suspense>
    </AppShell>
  );
}

function SolveInner() {
  const searchParams = useSearchParams();
  const presetIndustry = searchParams.get('industry');

  const [industry, setIndustry] = useState<string | null>(
    presetIndustry && INDUSTRIES.some(i => i.id === presetIndustry) ? presetIndustry : null
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [top3, setTop3] = useState<Decision[] | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState('');
  const [totalAnalyzed, setTotalAnalyzed] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);

  // Load top 3 on mount
  useEffect(() => {
    loadTop3();
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
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function search(text: string) {
    const q = text.trim();
    if (q.length < 3) return;
    setSearching(true);
    setSearchResult(null);
    setError('');

    try {
      const res = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: q, industry }),
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    search(input);
  }

  function clearSearch() {
    setSearchResult(null);
    setInput('');
    setError('');
  }

  function toggleIndustry(id: string) {
    setIndustry(prev => prev === id ? null : id);
  }

  const selectedIndustry = INDUSTRIES.find(i => i.id === industry);

  return (
    <div className="min-h-screen pb-24">
      {/* ── Header + Search ───────────────────────────────────────── */}
      <div className="max-w-[720px] mx-auto px-6 pt-8">
        <div className="mb-6">
          <h1
            className="text-xl sm:text-2xl font-bold leading-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: COLORS.text }}
          >
            {searchResult ? 'Search Results' : 'Top 3 Things to Act On'}
          </h1>
          <p className="text-[12px] mt-1" style={{ color: COLORS.muted }}>
            {searchResult
              ? `${searchResult.total_signals_searched} signals searched`
              : loading
                ? 'Analyzing live signals...'
                : `From ${totalAnalyzed} signals this week`}
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="mb-4">
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
              placeholder="Describe a logistics problem..."
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

        {/* Industry filter chips */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {INDUSTRIES.map(ind => {
            const active = industry === ind.id;
            return (
              <button
                key={ind.id}
                onClick={() => toggleIndustry(ind.id)}
                className="text-[10px] tracking-[0.04em] px-2.5 py-1 transition-all"
                style={{
                  background: active ? `${ind.color}15` : 'transparent',
                  border: `1px solid ${active ? `${ind.color}40` : COLORS.border}`,
                  borderRadius: '16px',
                  color: active ? ind.color : COLORS.dim,
                  cursor: 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: active ? 700 : 400,
                }}
              >
                <span style={{ marginRight: 3 }}>{ind.icon}</span>
                {ind.label}
              </button>
            );
          })}
        </div>

        {industry && (
          <div className="text-[9px] tracking-[0.08em] mb-3" style={{ color: COLORS.dim }}>
            Filtering: <span style={{ color: selectedIndustry?.color, fontWeight: 700 }}>{selectedIndustry?.label}</span>
          </div>
        )}

        {/* Suggestion chips (only when no search result) */}
        {!searchResult && !loading && (
          <div className="flex flex-wrap gap-1.5 mt-3 mb-6">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => { setInput(s); search(s); }}
                className="text-[10px] px-2.5 py-1 transition-all hover:translate-y-[-1px]"
                style={{
                  background: 'transparent',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '16px',
                  color: COLORS.dim,
                  cursor: 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {searchResult && (
          <button
            onClick={clearSearch}
            className="text-[10px] tracking-[0.08em] mb-4 py-1"
            style={{ color: COLORS.muted, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Back to Top 3
          </button>
        )}
      </div>

      {/* ── Error ─────────────────────────────────────────────────── */}
      {error && (
        <div className="max-w-[720px] mx-auto px-6">
          <div className="p-3 mb-4" style={{ background: `${COLORS.red}08`, border: `1px solid ${COLORS.red}25`, borderRadius: '10px' }}>
            <span className="text-[11px]" style={{ color: COLORS.red }}>{error}</span>
          </div>
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────────── */}
      {(loading || searching) && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div
            className="w-7 h-7 border-2 rounded-full animate-spin"
            style={{ borderColor: `${COLORS.accent}25`, borderTopColor: COLORS.accent }}
          />
          <span className="text-[10px] tracking-[0.12em]" style={{ color: COLORS.dim }}>
            {searching ? 'SEARCHING LIVE SIGNALS...' : 'ANALYZING INTELLIGENCE...'}
          </span>
        </div>
      )}

      {/* ── TOP 3 DECISIONS (default view) ────────────────────────── */}
      {!loading && !searching && !searchResult && top3 && (
        <div className="max-w-[720px] mx-auto px-6 flex flex-col gap-4">
          {top3.map(d => (
            <DecisionCard key={d.signal_id} decision={d} />
          ))}

          {/* Footer links */}
          <div className="flex gap-3 mt-4">
            <Link
              href="/briefing"
              className="flex-1 p-3 text-center"
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '12px',
                textDecoration: 'none',
              }}
            >
              <div className="text-[12px] font-semibold" style={{ color: COLORS.text }}>Full Briefing</div>
              <div className="text-[10px]" style={{ color: COLORS.dim }}>Detailed signal analysis</div>
            </Link>
            <Link
              href="/vendors"
              className="flex-1 p-3 text-center"
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '12px',
                textDecoration: 'none',
              }}
            >
              <div className="text-[12px] font-semibold" style={{ color: COLORS.text }}>All Vendors</div>
              <div className="text-[10px]" style={{ color: COLORS.dim }}>Browse by category</div>
            </Link>
          </div>
        </div>
      )}

      {/* ── SEARCH RESULTS ────────────────────────────────────────── */}
      {!searching && searchResult && (
        <div className="max-w-[720px] mx-auto px-6">
          {/* AI Answer */}
          <div
            className="p-5 mb-4"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '14px' }}
          >
            {/* Urgency badge */}
            <div className="mb-3">
              <UrgencyBadge urgency={searchResult.urgency as 'act_now' | 'watch' | 'opportunity'} />
            </div>

            {/* CAUSE */}
            <div className="mb-3">
              <SectionLabel text="CAUSE" />
              <p className="text-[13px] leading-relaxed mt-1" style={{ color: `${COLORS.text}cc` }}>
                {searchResult.cause}
              </p>
            </div>

            {/* EFFECT */}
            <div className="mb-3">
              <SectionLabel text="EFFECT" />
              <p className="text-[12px] leading-relaxed mt-1" style={{ color: `${COLORS.text}a0` }}>
                {searchResult.effect}
              </p>
            </div>

            {/* CONSEQUENCE */}
            <div className="mb-4">
              <SectionLabel text="IF YOU DON'T ACT" />
              <p className="text-[12px] leading-relaxed mt-1" style={{ color: COLORS.amber }}>
                {searchResult.consequence}
              </p>
            </div>

            {/* What to do */}
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

            {/* Who can help */}
            {searchResult.who_can_help.length > 0 && (
              <div className="mb-3">
                <SectionLabel text="WHO CAN HELP" />
                <div className="flex flex-col gap-2 mt-2">
                  {searchResult.who_can_help.map((v, i) => (
                    <VendorRow key={i} vendor={v} />
                  ))}
                </div>
              </div>
            )}

            {/* El Paso context */}
            <div className="pt-3 mt-2" style={{ borderTop: `1px solid ${COLORS.border}` }}>
              <span className="text-[10px]" style={{ color: COLORS.cyan }}>
                EL PASO: {searchResult.why_el_paso}
              </span>
            </div>
          </div>

          {/* Supporting signals */}
          {searchResult.signals.length > 0 && (
            <div className="mb-4">
              <SectionLabel text="SUPPORTING SIGNALS" />
              <div className="flex flex-col gap-2 mt-2">
                {searchResult.signals.map(s => (
                  <div
                    key={s.id}
                    className="p-3"
                    style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '10px' }}
                  >
                    <div className="text-[11px] font-medium" style={{ color: COLORS.text }}>
                      {s.title}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px]" style={{ color: COLORS.dim }}>{s.industry}</span>
                      {s.company && <span className="text-[9px]" style={{ color: COLORS.muted }}>{s.company}</span>}
                      <span className="text-[9px]" style={{ color: COLORS.dim }}>{s.source}</span>
                      <span className="text-[9px]" style={{ color: COLORS.dim }}>
                        {timeAgo(s.discovered_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Decision Card ────────────────────────────────────────────────────────────

function DecisionCard({ decision: d }: { decision: Decision }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="transition-all"
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '14px',
        overflow: 'hidden',
      }}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full text-left p-5 flex items-start gap-4"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        {/* Rank */}
        <div
          className="shrink-0 w-8 h-8 flex items-center justify-center text-[14px] font-bold"
          style={{
            background: `${COLORS.accent}12`,
            borderRadius: '10px',
            color: COLORS.accent,
          }}
        >
          {d.rank}
        </div>

        <div className="flex-1 min-w-0">
          {/* Urgency + industry */}
          <div className="flex items-center gap-2 mb-1.5">
            <UrgencyBadge urgency={d.urgency} />
            <span className="text-[9px] tracking-[0.06em]" style={{ color: COLORS.dim }}>
              {d.industry}
            </span>
            {d.company && (
              <span className="text-[9px] font-medium" style={{ color: COLORS.muted }}>
                {d.company}
              </span>
            )}
          </div>

          {/* Title */}
          <div className="text-[13px] font-semibold leading-snug" style={{ color: COLORS.text }}>
            {d.title}
          </div>

          {/* Cause preview */}
          {!expanded && (
            <div className="text-[11px] mt-1.5 line-clamp-2" style={{ color: `${COLORS.text}80` }}>
              {d.cause}
            </div>
          )}
        </div>

        {/* Expand icon */}
        <span className="text-[12px] shrink-0 mt-1" style={{ color: COLORS.dim }}>
          {expanded ? '−' : '+'}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          {/* CAUSE */}
          <div className="pt-4 mb-3">
            <SectionLabel text="CAUSE" />
            <p className="text-[12px] leading-relaxed mt-1.5" style={{ color: `${COLORS.text}b0` }}>
              {d.cause}
            </p>
          </div>

          {/* EFFECT */}
          <div className="mb-3">
            <SectionLabel text="EFFECT" />
            <p className="text-[12px] leading-relaxed mt-1" style={{ color: `${COLORS.text}90` }}>
              {d.effect}
            </p>
          </div>

          {/* CAUSAL CHAIN — Effects with severity */}
          {d.causal && d.causal.effects.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <SectionLabel text="CHAIN REACTION" />
                <span className="text-[7px] px-1.5 py-0.5" style={{
                  background: `${COLORS.purple}15`,
                  border: `1px solid ${COLORS.purple}30`,
                  borderRadius: '6px',
                  color: COLORS.purple,
                }}>
                  {d.causal.event_type.replace(/_/g, ' ')} ({(d.causal.event_confidence * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {d.causal.effects.map((eff, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px]" style={{ color: COLORS.dim }}>→</span>
                    <span className="text-[11px]" style={{ color: `${COLORS.text}b0` }}>{eff.label}</span>
                    <span
                      className="text-[7px] px-1.5 py-0.5 shrink-0"
                      style={{
                        background: eff.severity === 'high' ? `${COLORS.red}12` : eff.severity === 'medium' ? `${COLORS.amber}10` : `${COLORS.green}10`,
                        border: `1px solid ${eff.severity === 'high' ? `${COLORS.red}30` : eff.severity === 'medium' ? `${COLORS.amber}25` : `${COLORS.green}25`}`,
                        borderRadius: '6px',
                        color: eff.severity === 'high' ? COLORS.red : eff.severity === 'medium' ? COLORS.amber : COLORS.green,
                      }}
                    >
                      {eff.severity} · {eff.timeframe}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TECHNOLOGIES */}
          {d.causal && d.causal.technologies.length > 0 && (
            <div className="mb-4">
              <SectionLabel text="TECHNOLOGIES NEEDED" />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {d.causal.technologies.map((tech, i) => (
                  <span
                    key={i}
                    className="text-[9px] px-2 py-1"
                    style={{
                      background: `${COLORS.cyan}10`,
                      border: `1px solid ${COLORS.cyan}25`,
                      borderRadius: '8px',
                      color: COLORS.cyan,
                    }}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CONSEQUENCE */}
          <div className="mb-4">
            <SectionLabel text="IF YOU DON'T ACT" />
            <p className="text-[12px] leading-relaxed mt-1" style={{ color: COLORS.amber }}>
              {d.consequence}
            </p>
          </div>

          {/* ACTION */}
          <div className="mb-4">
            <SectionLabel text="ACTION" />
            <div className="flex flex-col gap-2 mt-2">
              {d.what_to_do.map((action, i) => (
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

          {/* Who can help */}
          {d.who_can_help.length > 0 && (
            <div className="mb-4">
              <SectionLabel text="WHO CAN HELP" />
              <div className="flex flex-col gap-2 mt-2">
                {d.who_can_help.map((v, i) => (
                  <VendorRow key={i} vendor={v} />
                ))}
              </div>
            </div>
          )}

          {/* El Paso context */}
          <div className="pt-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
            <span className="text-[10px]" style={{ color: COLORS.cyan }}>
              EL PASO: {d.why_el_paso}
            </span>
          </div>

          {/* Meta + Score breakdown */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span className="text-[9px]" style={{ color: COLORS.dim }}>{d.source}</span>
            <span className="text-[9px]" style={{ color: COLORS.dim }}>{timeAgo(d.discovered_at)}</span>
            <span className="text-[9px]" style={{ color: COLORS.dim }}>{d.related_count} related</span>
            {d.amount_usd && (
              <span className="text-[9px] font-medium" style={{ color: COLORS.green }}>
                ${(d.amount_usd / 1e6).toFixed(1)}M
              </span>
            )}
          </div>
          {/* Score transparency */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[8px] tracking-[0.1em] font-bold" style={{ color: COLORS.dim }}>
              SCORE {d.score.final}
            </span>
            <span className="text-[7px]" style={{ color: `${COLORS.text}25` }}>
              vol:{d.score.cluster_volume} vel:{d.score.cluster_velocity} ep:{d.score.ep_relevance} src:{d.score.source_quality}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

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

function VendorRow({ vendor: v }: { vendor: Vendor }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div>
        <span className="text-[12px] font-medium" style={{ color: COLORS.text }}>{v.name}</span>
        {v.category && (
          <span className="text-[9px] ml-2" style={{ color: COLORS.dim }}>{v.category}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {v.iker_score != null && v.iker_score > 0 && (
          <span
            className="text-[10px] font-bold"
            style={{ color: v.iker_score >= 80 ? COLORS.green : v.iker_score >= 60 ? COLORS.amber : COLORS.dim }}
          >
            {v.iker_score}
          </span>
        )}
        {v.website && (
          <a
            href={v.website.startsWith('http') ? v.website : `https://${v.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[8px] tracking-[0.08em]"
            style={{ color: COLORS.cyan, textDecoration: 'none' }}
          >
            VISIT →
          </a>
        )}
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
