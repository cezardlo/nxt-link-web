'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { COLORS } from '@/lib/tokens';
import { INDUSTRIES } from '@/lib/data/nav';
import { AppShell } from '@/components/AppShell';

// ── Suggestions per industry ─────────────────────────────────────────────────

const SUGGESTIONS: Record<string, string[]> = {
  'manufacturing': ['Reduce production downtime', 'Automate factory floor', 'Improve inventory tracking', 'Find robotics vendors'],
  'logistics':     ['Optimize fleet routes', 'Speed up warehouse', 'Reduce freight costs', 'Solve driver shortage'],
};

const ALL_SUGGESTIONS = [
  'Reduce fleet downtime',
  'Optimize my routes and cut fuel costs',
  'Speed up my warehouse operations',
  'Improve shipment tracking and visibility',
  'Speed up cross-border customs',
  'Solve driver shortage and retention',
  'Reduce freight and carrier costs',
  'Automate manual logistics processes',
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
  const [inputFocused, setInputFocused] = useState(false);

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
    <div className="min-h-screen pb-20">
      {/* ── INPUT STATE (no result, not loading) ───────────────────── */}
      {!result && !loading && (
        <div className="max-w-[700px] mx-auto px-6 pt-10 animate-fade-up">
          {/* Hero */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-grotesk font-bold text-nxt-text leading-tight mb-2">
              What logistics problem are you trying to solve?
            </h1>
            <p className="text-sm text-nxt-muted">
              Describe it in plain English — we match you to the right technology and vendors.
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
                  ? `0 0 0 1px ${COLORS.accent}60, 0 0 24px ${COLORS.accent}15`
                  : `0 0 0 1px ${COLORS.border}`,
              }}
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="e.g. trucks breaking down, warehouse is slow, freight costs too high..."
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
                  background: COLORS.accent,
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
                  <span style={{ color: selectedIndustry?.color ?? COLORS.accent, fontWeight: 700 }}>
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

        </div>
      )}

      {/* ── Loading ────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 pb-20">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: `${COLORS.accent}30`, borderTopColor: COLORS.accent }}
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
            <Section title="RECOMMENDED SOLUTION" accent={COLORS.accent}>
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
          <Section title="NEXT STEP" accent={COLORS.accent}>
            <div className="text-[12px] leading-relaxed" style={{ color: `${COLORS.text}70` }}>
              {result.next_step}
            </div>
          </Section>

          {/* ── Explore more ────────────────────────────────────────── */}
          <div className="flex gap-3 mt-6 mb-10">
            <Link
              href="/vendors"
              className="flex-1 p-4 rounded-nxt-md bg-nxt-surface border border-nxt-border card-hover text-center"
              style={{ textDecoration: 'none' }}
            >
              <div className="text-sm font-semibold text-nxt-text mb-1">Browse Vendors</div>
              <div className="text-[11px] text-nxt-muted">Find and compare logistics vendors</div>
            </Link>
            <Link
              href="/products"
              className="flex-1 p-4 rounded-nxt-md bg-nxt-surface border border-nxt-border card-hover text-center"
              style={{ textDecoration: 'none' }}
            >
              <div className="text-sm font-semibold text-nxt-text mb-1">Browse Products</div>
              <div className="text-[11px] text-nxt-muted">Compare supply chain technology</div>
            </Link>
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
