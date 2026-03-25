'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { COLORS } from '@/lib/tokens';
import { INDUSTRIES } from '@/lib/data/nav';
import { AppShell } from '@/components/AppShell';
import { relativeTime } from '@/lib/utils';

// ── Suggestions per industry ─────────────────────────────────────────────────

const SUGGESTIONS: Record<string, string[]> = {
  'defense':       ['Find defense contractors', 'Track government contracts', 'Monitor Fort Bliss activity', 'Find SBIR opportunities'],
  'ai-ml':         ['Automate operations with AI', 'Find ML vendors', 'Track AI funding rounds', 'Compare AI platforms'],
  'cybersecurity': ['Improve security posture', 'Find compliance solutions', 'Track cyber threats', 'Compare SIEM vendors'],
  'manufacturing': ['Reduce production cost', 'Automate factory floor', 'Find robotics vendors', 'Track industry 4.0 trends'],
  'logistics':     ['Speed up warehouse', 'Optimize fleet routes', 'Track shipments', 'Find last-mile solutions'],
  'energy':        ['Find solar vendors', 'Track grid modernization', 'Compare EV charging', 'Monitor energy policy'],
  'healthcare':    ['Find medical device vendors', 'Track FDA approvals', 'Compare telehealth platforms', 'Monitor biotech funding'],
  'border-tech':   ['Speed up customs', 'Track CBP technology', 'Find cross-border solutions', 'Monitor trade policy'],
};

const ALL_SUGGESTIONS = [
  'Find the best tech vendor for my problem',
  'Reduce operational costs with AI',
  'Track government contracts near me',
  'Find cybersecurity solutions',
  'Automate my warehouse',
  'Compare solar energy vendors',
  'Monitor defense industry trends',
  'Speed up cross-border logistics',
];

// ── Types ────────────────────────────────────────────────────────────────────

type Solution = {
  technology: string;
  product: string;
  price: string;
  buy_now: boolean;
  industry: string;
};

type Region = { region: string; reason: string };
type Vendor = { name: string; sector: string; score: number; website: string };

type DecideResponse = {
  ok: boolean;
  problem: string;
  user_input: string;
  matched_industries: string[];
  recommended_solution: {
    technology: string;
    product: string;
    price: string;
    website: string;
    reason: string;
    local_option: string | null;
    local_phone: string | null;
    value_pick: string | null;
    value_price: string | null;
    value_why: string | null;
    avoid: string | null;
    avoid_why: string | null;
  } | null;
  all_solutions: Solution[];
  best_regions: Region[];
  market_insight: { growth: string; competition: string; summary: string };
  vendors: Vendor[];
  next_step: string;
  error?: string;
};

// ── Signal helpers ───────────────────────────────────────────────────────────

type IntelSignal = {
  signal_type: string;
  title: string;
  discovered_at: string;
};

const SIGNAL_COLORS: Record<string, string> = {
  contracts: COLORS.green, product: COLORS.green,
  patents: COLORS.cyan, technology: COLORS.cyan,
  funding: COLORS.gold,
  policy: COLORS.orange, direction: COLORS.orange,
  research: COLORS.dim, discovery: COLORS.dim,
  who: COLORS.dim, connection: COLORS.dim,
};

function signalColor(type: string): string {
  const key = type.toLowerCase();
  for (const [k, v] of Object.entries(SIGNAL_COLORS)) {
    if (key.includes(k)) return v;
  }
  return COLORS.dim;
}

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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DecideResponse | null>(null);
  const [error, setError] = useState('');
  const [signals, setSignals] = useState<IntelSignal[]>([]);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    fetch('/api/intel-signals?limit=5')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setSignals(data);
        else if (data?.signals && data.signals.length > 0) setSignals(data.signals);
      })
      .catch((err) => console.warn('[SolvePage] intel-signals fetch failed:', err));
  }, []);

  async function solve(text: string) {
    const q = text.trim();
    if (q.length < 3) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: q, industry }),
      });
      const data: DecideResponse = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Something went wrong');
      } else {
        setResult(data);
      }
    } catch {
      setError('Network error -- try again');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    solve(input);
  }

  function handleSuggestion(s: string) {
    setInput(s);
    solve(s);
  }

  function toggleIndustry(id: string) {
    setIndustry(prev => prev === id ? null : id);
  }

  function startOver() {
    setIndustry(null);
    setInput('');
    setResult(null);
    setError('');
  }

  const activeSuggestions = industry && SUGGESTIONS[industry]
    ? SUGGESTIONS[industry]
    : ALL_SUGGESTIONS;

  const selectedIndustry = INDUSTRIES.find(i => i.id === industry);

  return (
    <div
      className="min-h-[100dvh] flex flex-col pb-24"
      style={{ background: COLORS.bg, color: COLORS.text, fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace" }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="px-6 pt-8 pb-2 flex items-center justify-between">
        <div className="text-[11px] tracking-[0.25em] font-bold" style={{ color: COLORS.orange }}>
          NXT<span style={{ color: COLORS.dim }}>{'//'}</span>LINK
        </div>
        <span
          className="text-[9px] tracking-[0.2em] font-bold px-2.5 py-1 rounded-full"
          style={{ background: `${COLORS.orange}12`, color: COLORS.orange, border: `1px solid ${COLORS.orange}25` }}
        >
          SOLVE
        </span>
      </header>

      {/* ── INPUT STATE (no result, not loading) ───────────────────── */}
      {!result && !loading && (
        <div className="flex-1 flex flex-col px-6 animate-fade-up">
          {/* Hero */}
          <div className="mt-8 sm:mt-16 mb-8 text-center">
            <h1
              className="text-[26px] sm:text-[36px] font-bold leading-[1.15] tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              What problem are you<br />trying to solve?
            </h1>
            <p className="text-[11px] mt-3" style={{ color: `${COLORS.text}40` }}>
              Describe it in plain English. We match you to the best solution.
            </p>
          </div>

          {/* Industry filter chips */}
          <div className="flex flex-wrap justify-center gap-1.5 mb-6">
            {INDUSTRIES.map(ind => {
              const active = industry === ind.id;
              return (
                <button
                  key={ind.id}
                  onClick={() => toggleIndustry(ind.id)}
                  className="text-[10px] tracking-[0.04em] px-3 py-1.5 transition-all hover:translate-y-[-1px]"
                  style={{
                    background: active ? `${ind.color}18` : 'transparent',
                    border: `1px solid ${active ? `${ind.color}50` : COLORS.border}`,
                    borderRadius: '20px',
                    color: active ? ind.color : `${COLORS.text}45`,
                    cursor: 'pointer',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: active ? 700 : 400,
                  }}
                >
                  <span style={{ marginRight: 4 }}>{ind.icon}</span>
                  {ind.label}
                </button>
              );
            })}
          </div>

          {/* Search input */}
          <form onSubmit={handleSubmit} className="w-full max-w-[560px] mx-auto flex flex-col gap-3">
            <div
              className="relative transition-all duration-300"
              style={{
                borderRadius: '18px',
                boxShadow: inputFocused
                  ? `0 0 0 1px ${COLORS.orange}60, 0 0 24px ${COLORS.orange}15`
                  : `0 0 0 1px ${COLORS.border}`,
              }}
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="e.g. reduce labor cost, find defense vendors..."
                autoFocus
                className="w-full text-[15px] font-light outline-none min-h-[56px] px-5 py-4 pr-14"
                style={{
                  background: COLORS.card,
                  border: 'none',
                  borderRadius: '18px',
                  color: COLORS.text,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              />
              <button
                type="submit"
                disabled={input.trim().length < 3}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center transition-all disabled:opacity-20"
                style={{
                  background: COLORS.orange,
                  borderRadius: '12px',
                  border: 'none',
                  cursor: input.trim().length >= 3 ? 'pointer' : 'default',
                  color: '#000',
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                →
              </button>
            </div>

            {industry && (
              <div className="text-center">
                <span className="text-[9px] tracking-[0.1em]" style={{ color: `${COLORS.text}30` }}>
                  Filtering by{' '}
                  <span style={{ color: selectedIndustry?.color ?? COLORS.orange, fontWeight: 700 }}>
                    {selectedIndustry?.label ?? industry}
                  </span>
                </span>
              </div>
            )}
          </form>

          {/* Suggestion chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-[560px] mx-auto">
            {activeSuggestions.map(s => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="text-[10px] tracking-[0.04em] px-3 py-1.5 transition-all hover:translate-y-[-1px] hover:border-opacity-60"
                style={{
                  background: 'transparent',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '20px',
                  color: `${COLORS.text}45`,
                  cursor: 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* ── Live Intelligence Signals ───────────────────────────── */}
          {signals.length > 0 && (
            <div className="mt-10 max-w-[560px] mx-auto w-full">
              <div className="h-px mb-4" style={{ background: `${COLORS.dim}25` }} />
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: COLORS.cyan }} />
                <span
                  className="text-[8px] tracking-[0.2em] font-bold uppercase"
                  style={{ color: `${COLORS.cyan}80` }}
                >
                  Live Intelligence
                </span>
                <div className="flex-1 h-px" style={{ background: `${COLORS.cyan}12` }} />
              </div>
              <div className="flex flex-col gap-1">
                {signals.map((sig, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <span className="text-[9px] shrink-0 w-6 text-right" style={{ color: `${COLORS.text}25` }}>
                      {relativeTime(sig.discovered_at)}
                    </span>
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: signalColor(sig.signal_type) }}
                    />
                    <span className="text-[10px] truncate" style={{ color: `${COLORS.text}35` }}>
                      {sig.title.length > 60 ? sig.title.slice(0, 60) + '...' : sig.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Quick Nav ──────────────────────────────────────────── */}
          <div className="mt-8 mb-6 flex gap-2 flex-wrap justify-center">
            <Link
              href="/map"
              className="flex items-center gap-2 px-3 py-2 rounded-[10px] transition-all hover:translate-y-[-1px]"
              style={{ background: `${COLORS.cyan}08`, border: `1px solid ${COLORS.cyan}18`, textDecoration: 'none', color: `${COLORS.cyan}90`, fontSize: 9 }}
            >
              ◎ World Map
            </Link>
            <Link
              href="/industry"
              className="flex items-center gap-2 px-3 py-2 rounded-[10px] transition-all hover:translate-y-[-1px]"
              style={{ background: `${COLORS.green}08`, border: `1px solid ${COLORS.green}18`, textDecoration: 'none', color: `${COLORS.green}90`, fontSize: 9 }}
            >
              ◫ Tech Store
            </Link>
            <Link
              href="/command"
              className="flex items-center gap-2 px-3 py-2 rounded-[10px] transition-all hover:translate-y-[-1px]"
              style={{ background: `${COLORS.gold}08`, border: `1px solid ${COLORS.gold}18`, textDecoration: 'none', color: `${COLORS.gold}90`, fontSize: 9 }}
            >
              ⬡ Command
            </Link>
          </div>
        </div>
      )}

      {/* ── Loading ────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 pb-20">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: `${COLORS.orange}30`, borderTopColor: COLORS.orange }}
          />
          <span className="text-[10px] tracking-[0.15em]" style={{ color: `${COLORS.text}30` }}>
            MATCHING YOUR PROBLEM TO SOLUTIONS...
          </span>
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-6 p-4 mb-4" style={{ background: `${COLORS.red}10`, border: `1px solid ${COLORS.red}30`, borderRadius: '12px' }}>
          <span className="text-[11px]" style={{ color: COLORS.red }}>{error}</span>
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────────── */}
      {result && (
        <div className="flex-1 overflow-y-auto px-6 pb-20">
          {/* Back button */}
          <button
            onClick={startOver}
            className="text-[10px] tracking-[0.1em] mb-6 py-2"
            style={{ color: `${COLORS.text}40`, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← SOLVE ANOTHER
          </button>

          {/* Problem header */}
          <div className="mb-6">
            <span className="text-[8px] tracking-[0.2em]" style={{ color: `${COLORS.text}25` }}>YOUR PROBLEM</span>
            <h2
              className="text-[20px] font-bold mt-1"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: COLORS.text }}
            >
              {result.problem.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </h2>
            <span className="text-[9px] mt-1 inline-block" style={{ color: `${COLORS.text}30` }}>
              Industries: {result.matched_industries.join(', ')}
            </span>
          </div>

          {/* ── SECTION 1: Recommended Solution ────────────────────── */}
          {result.recommended_solution && (
            <Section title="RECOMMENDED SOLUTION" accent={COLORS.orange}>
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-[14px] font-bold" style={{ color: COLORS.text }}>
                    {result.recommended_solution.product}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: `${COLORS.text}50` }}>
                    {result.recommended_solution.technology}
                  </div>
                </div>
                <div className="text-[11px] leading-relaxed" style={{ color: `${COLORS.text}60` }}>
                  {result.recommended_solution.reason}
                </div>
                <div className="flex items-center gap-4">
                  <Badge label="PRICE" value={result.recommended_solution.price} color={COLORS.green} />
                  {result.recommended_solution.website && (
                    <a
                      href={result.recommended_solution.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] tracking-[0.1em]"
                      style={{ color: COLORS.cyan }}
                    >
                      VISIT WEBSITE →
                    </a>
                  )}
                </div>

                {result.recommended_solution.local_option && (
                  <div className="pt-3 mt-1" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                    <span className="text-[8px] tracking-[0.15em]" style={{ color: COLORS.gold }}>LOCAL OPTION</span>
                    <div className="text-[12px] font-bold mt-1">{result.recommended_solution.local_option}</div>
                    {result.recommended_solution.local_phone && (
                      <a href={`tel:${result.recommended_solution.local_phone}`} className="text-[11px] mt-1 inline-block" style={{ color: COLORS.cyan }}>
                        {result.recommended_solution.local_phone}
                      </a>
                    )}
                  </div>
                )}

                {result.recommended_solution.value_pick && (
                  <div className="pt-3 mt-1" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                    <span className="text-[8px] tracking-[0.15em]" style={{ color: COLORS.green }}>BEST VALUE</span>
                    <div className="text-[12px] font-bold mt-1">{result.recommended_solution.value_pick}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: `${COLORS.text}50` }}>
                      {result.recommended_solution.value_price} — {result.recommended_solution.value_why}
                    </div>
                  </div>
                )}

                {result.recommended_solution.avoid && (
                  <div className="pt-3 mt-1" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                    <span className="text-[8px] tracking-[0.15em]" style={{ color: COLORS.red }}>AVOID</span>
                    <div className="text-[12px] font-bold mt-1" style={{ color: COLORS.red }}>
                      {result.recommended_solution.avoid}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: `${COLORS.text}40` }}>
                      {result.recommended_solution.avoid_why}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* ── Other Options ──────────────────────────────────────── */}
          {result.all_solutions.length > 1 && (
            <Section title="OTHER OPTIONS" accent={COLORS.cyan}>
              <div className="flex flex-col gap-2">
                {result.all_solutions.slice(1).map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <div>
                      <div className="text-[11px] font-bold">{s.product}</div>
                      <div className="text-[9px]" style={{ color: `${COLORS.text}40` }}>{s.technology}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px]" style={{ color: COLORS.green }}>{s.price}</div>
                      <div className="text-[8px]" style={{ color: s.buy_now ? COLORS.green : COLORS.gold }}>
                        {s.buy_now ? 'BUY NOW' : 'WAIT'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── SECTION 2: Best Regions ─────────────────────────────── */}
          <Section title="BEST REGIONS" accent={COLORS.cyan}>
            <div className="flex flex-col gap-3">
              {result.best_regions.map((r, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="text-[18px] font-bold shrink-0 w-8 text-center" style={{ color: `${COLORS.text}15` }}>{i + 1}</div>
                  <div>
                    <div className="text-[12px] font-bold">{r.region}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: `${COLORS.text}45` }}>{r.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── SECTION 3: Market Insight ───────────────────────────── */}
          <Section title="MARKET INSIGHT" accent={COLORS.gold}>
            <div className="flex gap-4 mb-3">
              <Badge label="GROWTH" value={result.market_insight.growth.toUpperCase()} color={COLORS.green} />
              <Badge label="COMPETITION" value={result.market_insight.competition.toUpperCase()} color={COLORS.gold} />
            </div>
            <div className="text-[11px] leading-relaxed" style={{ color: `${COLORS.text}55` }}>
              {result.market_insight.summary}
            </div>
          </Section>

          {/* ── SECTION 4: Vendors ──────────────────────────────────── */}
          {result.vendors.length > 0 && (
            <Section title="VENDORS" accent={COLORS.green}>
              <div className="flex flex-col gap-2">
                {result.vendors.map((v, i) => (
                  <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <div>
                      <div className="text-[12px] font-bold">{v.name}</div>
                      <div className="text-[9px]" style={{ color: `${COLORS.text}35` }}>{v.sector}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {v.score > 0 && (
                        <span className="text-[10px] font-bold" style={{ color: v.score >= 80 ? COLORS.green : COLORS.gold }}>{v.score}</span>
                      )}
                      {v.website && (
                        <a
                          href={v.website.startsWith('http') ? v.website : `https://${v.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[8px] tracking-[0.1em]"
                          style={{ color: COLORS.cyan }}
                        >
                          VISIT →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── SECTION 5: Next Step ───────────────────────────────── */}
          <Section title="NEXT STEP" accent={COLORS.orange}>
            <div className="text-[12px] leading-relaxed" style={{ color: `${COLORS.text}70` }}>
              {result.next_step}
            </div>
          </Section>

          {/* ── Go Deeper ──────────────────────────────────────────── */}
          <Section title="GO DEEPER" accent={COLORS.gold}>
            <div className="flex flex-col gap-3">
              {industry && (
                <Link
                  href={`/industry/${industry}`}
                  className="flex items-center justify-between"
                  style={{ textDecoration: 'none', color: COLORS.text }}
                >
                  <div>
                    <div className="text-[12px] font-bold">
                      Explore {selectedIndustry?.label ?? 'Industry'} Intelligence
                    </div>
                    <div className="text-[9px] mt-1" style={{ color: `${COLORS.text}40` }}>
                      Technologies, players, signals, global map
                    </div>
                  </div>
                  <span className="text-[14px]" style={{ color: COLORS.gold }}>→</span>
                </Link>
              )}
              {industry && <div className="h-px" style={{ background: COLORS.border }} />}
              <Link
                href="/industry"
                className="flex items-center justify-between"
                style={{ textDecoration: 'none', color: COLORS.text }}
              >
                <div>
                  <div className="text-[12px] font-bold">Browse the Tech Store</div>
                  <div className="text-[9px] mt-1" style={{ color: `${COLORS.text}40` }}>
                    Ready-to-deploy solutions and vendor marketplace
                  </div>
                </div>
                <span className="text-[14px]" style={{ color: COLORS.green }}>→</span>
              </Link>
            </div>
          </Section>

          {/* ── CTA ────────────────────────────────────────────────── */}
          <div className="mt-6 mb-10 text-center">
            <div className="text-[9px] tracking-[0.15em] mb-3" style={{ color: `${COLORS.text}25` }}>
              NEED HELP IMPLEMENTING THIS?
            </div>
            <a
              href="mailto:cessar@nxtlinktech.com?subject=NXT LINK Recommendation"
              className="inline-block text-[12px] font-bold tracking-[0.08em] px-8 py-3"
              style={{
                background: `${COLORS.orange}15`,
                border: `1px solid ${COLORS.orange}40`,
                borderRadius: '12px',
                color: COLORS.orange,
                textDecoration: 'none',
              }}
            >
              TALK TO A BROKER
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full" style={{ background: accent }} />
        <span className="text-[9px] tracking-[0.2em] font-bold" style={{ color: `${COLORS.text}35` }}>{title}</span>
      </div>
      <div className="p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px' }}>
        {children}
      </div>
    </div>
  );
}

function Badge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[7px] tracking-[0.2em]" style={{ color: `${COLORS.text}25` }}>{label}</span>
      <span className="text-[11px] font-bold" style={{ color }}>{value}</span>
    </div>
  );
}
