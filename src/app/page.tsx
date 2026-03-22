'use client';

import { useState, useEffect } from 'react';

// ── Colors ───────────────────────────────────────────────────────────────────

const C = {
  bg:      '#0d0f12',
  card:    '#181b20',
  border:  '#232730',
  text:    '#f0f0f0',
  dim:     '#3a3f4b',
  orange:  '#ff6600',
  cyan:    '#00d4ff',
  green:   '#00ff88',
  gold:    '#ffd700',
  red:     '#ff3b30',
};

// ── Industry Tree ────────────────────────────────────────────────────────────

type Industry = { id: string; label: string; icon: string };
type IndustryGroup = { group: string; color: string; industries: Industry[] };

const INDUSTRY_TREE: IndustryGroup[] = [
  {
    group: 'Food & Service',
    color: C.orange,
    industries: [
      { id: 'restaurant',      label: 'Restaurant',  icon: '◉' },
      { id: 'window_cleaning', label: 'Cleaning',    icon: '◇' },
    ],
  },
  {
    group: 'Industrial',
    color: C.cyan,
    industries: [
      { id: 'construction', label: 'Construction', icon: '▣' },
      { id: 'warehouse',    label: 'Warehouse',    icon: '⬡' },
    ],
  },
  {
    group: 'Trade & Logistics',
    color: C.green,
    industries: [
      { id: 'logistics',   label: 'Logistics',    icon: '◈' },
      { id: 'border_tech', label: 'Border Trade', icon: '◎' },
    ],
  },
];

// Flat list for lookups
const ALL_INDUSTRIES = INDUSTRY_TREE.flatMap(g => g.industries);

// ── Suggestions per industry ─────────────────────────────────────────────────

const SUGGESTIONS: Record<string, string[]> = {
  restaurant:      ['Reduce labor cost', 'Get more customers', 'Improve inventory', 'Modernize billing', 'Improve scheduling'],
  construction:    ['Reduce labor cost', 'Improve scheduling', 'Automate operations', 'Improve compliance', 'Improve security'],
  logistics:       ['Speed up warehouse', 'Automate operations', 'Improve inventory', 'Speed up customs', 'Reduce labor cost'],
  warehouse:       ['Speed up warehouse', 'Reduce labor cost', 'Improve inventory', 'Automate operations', 'Improve security'],
  window_cleaning: ['Get more customers', 'Improve scheduling', 'Modernize billing', 'Reduce labor cost', 'Improve marketing'],
  border_tech:     ['Speed up customs', 'Automate operations', 'Improve compliance', 'Improve security', 'Reduce labor cost'],
};

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
  contracts: C.green, product: C.green,
  patents: C.cyan, technology: C.cyan,
  funding: C.gold,
  policy: C.orange, direction: C.orange,
  research: C.dim, discovery: C.dim,
  who: C.dim, connection: C.dim,
};

function signalColor(type: string): string {
  const key = type.toLowerCase();
  for (const [k, v] of Object.entries(SIGNAL_COLORS)) {
    if (key.includes(k)) return v;
  }
  return C.dim;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [industry, setIndustry] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DecideResponse | null>(null);
  const [error, setError] = useState('');
  const [signals, setSignals] = useState<IntelSignal[]>([]);

  useEffect(() => {
    fetch('/api/intel-signals?limit=5')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setSignals(data);
        else if (data?.signals && data.signals.length > 0) setSignals(data.signals);
      })
      .catch(() => {});
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
      setError('Network error — try again');
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

  function startOver() {
    setIndustry(null);
    setInput('');
    setResult(null);
    setError('');
  }

  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{ background: C.bg, color: C.text, fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace" }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="px-6 pt-8 pb-2">
        <div className="text-[11px] tracking-[0.25em] font-bold" style={{ color: C.orange }}>
          NXT<span style={{ color: C.dim }}>{'//'}</span>LINK
        </div>
      </header>

      {/* ── STEP 1: Pick Industry (Tree Map) ─────────────────────── */}
      {!industry && !result && !loading && (
        <div className="flex-1 flex flex-col justify-center px-6 pb-20">
          <h1
            className="text-[22px] sm:text-[28px] font-bold leading-tight mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            What kind of business<br />do you run?
          </h1>
          <p className="text-[11px] mb-8" style={{ color: `${C.text}40` }}>
            Pick your industry. Then describe your problem.
          </p>

          <div className="flex flex-col gap-4">
            {INDUSTRY_TREE.map(grp => (
              <div key={grp.group}>
                {/* Group label */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: grp.color }} />
                  <span
                    className="text-[8px] tracking-[0.2em] font-bold uppercase"
                    style={{ color: `${grp.color}90` }}
                  >
                    {grp.group}
                  </span>
                  <div className="flex-1 h-px" style={{ background: `${grp.color}15` }} />
                </div>
                {/* Industry tiles */}
                <div className="grid grid-cols-2 gap-2">
                  {grp.industries.map(ind => (
                    <button
                      key={ind.id}
                      onClick={() => setIndustry(ind.id)}
                      className="flex items-center gap-3 p-4 text-left transition-all hover:translate-y-[-2px]"
                      style={{
                        background: C.card,
                        border: `1px solid ${C.border}`,
                        borderRadius: '14px',
                        cursor: 'pointer',
                        color: C.text,
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = `${grp.color}40`;
                        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${grp.color}08`;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = C.border;
                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                      }}
                    >
                      <span className="text-[18px]" style={{ color: grp.color }}>{ind.icon}</span>
                      <span
                        className="text-[13px] font-bold"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {ind.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── Live Intelligence Signals ─────────────────────────── */}
          {signals.length > 0 && (
            <div className="mt-8">
              <div className="h-px mb-4" style={{ background: `${C.dim}30` }} />
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: C.cyan }} />
                <span
                  className="text-[8px] tracking-[0.2em] font-bold uppercase"
                  style={{ color: `${C.cyan}90` }}
                >
                  Live Intelligence
                </span>
                <div className="flex-1 h-px" style={{ background: `${C.cyan}15` }} />
              </div>
              <div className="flex flex-col gap-1">
                {signals.map((sig, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <span className="text-[9px] shrink-0 w-6 text-right" style={{ color: `${C.text}30` }}>
                      {relativeTime(sig.discovered_at)}
                    </span>
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: signalColor(sig.signal_type) }}
                    />
                    <span
                      className="text-[10px] truncate"
                      style={{ color: `${C.text}40` }}
                    >
                      {sig.title.length > 60 ? sig.title.slice(0, 60) + '...' : sig.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Describe Problem ──────────────────────────────── */}
      {industry && !result && !loading && (
        <div className="flex-1 flex flex-col justify-center px-6 pb-20">
          {/* Back to industry */}
          <button
            onClick={() => { setIndustry(null); setInput(''); }}
            className="text-[10px] tracking-[0.1em] mb-6 py-1 self-start"
            style={{ color: `${C.text}40`, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← CHANGE INDUSTRY
          </button>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-[9px] tracking-[0.15em] px-2.5 py-1 rounded-full" style={{ background: `${C.orange}15`, color: C.orange, border: `1px solid ${C.orange}30` }}>
              {ALL_INDUSTRIES.find(i => i.id === industry)?.label.toUpperCase()}
            </span>
          </div>

          <h1
            className="text-[22px] sm:text-[28px] font-bold leading-tight mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            What problem are you<br />trying to solve?
          </h1>
          <p className="text-[11px] mb-8" style={{ color: `${C.text}40` }}>
            Describe it in plain English. We will find the best solution.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="e.g. reduce labor cost, get more customers..."
              autoFocus
              className="w-full text-[15px] font-light outline-none min-h-[52px] px-5 py-3"
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: '16px',
                color: C.text,
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            />
            <button
              type="submit"
              disabled={input.trim().length < 3}
              className="w-full text-[13px] font-bold tracking-[0.1em] min-h-[48px] transition-all disabled:opacity-30"
              style={{
                background: C.orange,
                color: '#000',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              GET RECOMMENDATION
            </button>
          </form>

          {/* Suggestions for this industry */}
          <div className="flex flex-wrap gap-2 mt-8">
            {(SUGGESTIONS[industry] ?? []).map(s => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="text-[10px] tracking-[0.05em] px-3 py-1.5 transition-all hover:translate-y-[-1px]"
                style={{
                  background: 'transparent',
                  border: `1px solid ${C.border}`,
                  borderRadius: '20px',
                  color: `${C.text}50`,
                  cursor: 'pointer',
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
            style={{ borderColor: `${C.orange}30`, borderTopColor: C.orange }}
          />
          <span className="text-[10px] tracking-[0.15em]" style={{ color: `${C.text}30` }}>
            MATCHING YOUR PROBLEM TO SOLUTIONS...
          </span>
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-6 p-4 mb-4" style={{ background: `${C.red}10`, border: `1px solid ${C.red}30`, borderRadius: '12px' }}>
          <span className="text-[11px]" style={{ color: C.red }}>{error}</span>
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────────── */}
      {result && (
        <div className="flex-1 overflow-y-auto px-6 pb-20">
          {/* Back button */}
          <button
            onClick={startOver}
            className="text-[10px] tracking-[0.1em] mb-6 py-2"
            style={{ color: `${C.text}40`, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← START OVER
          </button>

          {/* Problem header */}
          <div className="mb-6">
            <span className="text-[8px] tracking-[0.2em]" style={{ color: `${C.text}25` }}>YOUR PROBLEM</span>
            <h2
              className="text-[20px] font-bold mt-1"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: C.text }}
            >
              {result.problem.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </h2>
            <span className="text-[9px] mt-1 inline-block" style={{ color: `${C.text}30` }}>
              Industries: {result.matched_industries.join(', ')}
            </span>
          </div>

          {/* ── SECTION 1: Recommended Solution ────────────────────── */}
          {result.recommended_solution && (
            <Section title="RECOMMENDED SOLUTION" accent={C.orange}>
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-[14px] font-bold" style={{ color: C.text }}>
                    {result.recommended_solution.product}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: `${C.text}50` }}>
                    {result.recommended_solution.technology}
                  </div>
                </div>
                <div className="text-[11px] leading-relaxed" style={{ color: `${C.text}60` }}>
                  {result.recommended_solution.reason}
                </div>
                <div className="flex items-center gap-4">
                  <Badge label="PRICE" value={result.recommended_solution.price} color={C.green} />
                  {result.recommended_solution.website && (
                    <a
                      href={result.recommended_solution.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] tracking-[0.1em]"
                      style={{ color: C.cyan }}
                    >
                      VISIT WEBSITE →
                    </a>
                  )}
                </div>

                {result.recommended_solution.local_option && (
                  <div className="pt-3 mt-1" style={{ borderTop: `1px solid ${C.border}` }}>
                    <span className="text-[8px] tracking-[0.15em]" style={{ color: C.gold }}>LOCAL OPTION</span>
                    <div className="text-[12px] font-bold mt-1">{result.recommended_solution.local_option}</div>
                    {result.recommended_solution.local_phone && (
                      <a href={`tel:${result.recommended_solution.local_phone}`} className="text-[11px] mt-1 inline-block" style={{ color: C.cyan }}>
                        {result.recommended_solution.local_phone}
                      </a>
                    )}
                  </div>
                )}

                {result.recommended_solution.value_pick && (
                  <div className="pt-3 mt-1" style={{ borderTop: `1px solid ${C.border}` }}>
                    <span className="text-[8px] tracking-[0.15em]" style={{ color: C.green }}>BEST VALUE</span>
                    <div className="text-[12px] font-bold mt-1">{result.recommended_solution.value_pick}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: `${C.text}50` }}>
                      {result.recommended_solution.value_price} — {result.recommended_solution.value_why}
                    </div>
                  </div>
                )}

                {result.recommended_solution.avoid && (
                  <div className="pt-3 mt-1" style={{ borderTop: `1px solid ${C.border}` }}>
                    <span className="text-[8px] tracking-[0.15em]" style={{ color: C.red }}>AVOID</span>
                    <div className="text-[12px] font-bold mt-1" style={{ color: C.red }}>
                      {result.recommended_solution.avoid}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: `${C.text}40` }}>
                      {result.recommended_solution.avoid_why}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* ── Other Options ──────────────────────────────────────── */}
          {result.all_solutions.length > 1 && (
            <Section title="OTHER OPTIONS" accent={C.cyan}>
              <div className="flex flex-col gap-2">
                {result.all_solutions.slice(1).map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${C.border}` }}>
                    <div>
                      <div className="text-[11px] font-bold">{s.product}</div>
                      <div className="text-[9px]" style={{ color: `${C.text}40` }}>{s.technology}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px]" style={{ color: C.green }}>{s.price}</div>
                      <div className="text-[8px]" style={{ color: s.buy_now ? C.green : C.gold }}>
                        {s.buy_now ? 'BUY NOW' : 'WAIT'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── SECTION 2: Best Regions ─────────────────────────────── */}
          <Section title="BEST REGIONS" accent={C.cyan}>
            <div className="flex flex-col gap-3">
              {result.best_regions.map((r, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="text-[18px] font-bold shrink-0 w-8 text-center" style={{ color: `${C.text}15` }}>{i + 1}</div>
                  <div>
                    <div className="text-[12px] font-bold">{r.region}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: `${C.text}45` }}>{r.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── SECTION 3: Market Insight ───────────────────────────── */}
          <Section title="MARKET INSIGHT" accent={C.gold}>
            <div className="flex gap-4 mb-3">
              <Badge label="GROWTH" value={result.market_insight.growth.toUpperCase()} color={C.green} />
              <Badge label="COMPETITION" value={result.market_insight.competition.toUpperCase()} color={C.gold} />
            </div>
            <div className="text-[11px] leading-relaxed" style={{ color: `${C.text}55` }}>
              {result.market_insight.summary}
            </div>
          </Section>

          {/* ── SECTION 4: Vendors ──────────────────────────────────── */}
          {result.vendors.length > 0 && (
            <Section title="VENDORS" accent={C.green}>
              <div className="flex flex-col gap-2">
                {result.vendors.map((v, i) => (
                  <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${C.border}` }}>
                    <div>
                      <div className="text-[12px] font-bold">{v.name}</div>
                      <div className="text-[9px]" style={{ color: `${C.text}35` }}>{v.sector}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {v.score > 0 && (
                        <span className="text-[10px] font-bold" style={{ color: v.score >= 80 ? C.green : C.gold }}>{v.score}</span>
                      )}
                      {v.website && (
                        <a
                          href={v.website.startsWith('http') ? v.website : `https://${v.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[8px] tracking-[0.1em]"
                          style={{ color: C.cyan }}
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
          <Section title="NEXT STEP" accent={C.orange}>
            <div className="text-[12px] leading-relaxed" style={{ color: `${C.text}70` }}>
              {result.next_step}
            </div>
          </Section>

          {/* ── CTA ────────────────────────────────────────────────── */}
          <div className="mt-6 mb-10 text-center">
            <div className="text-[9px] tracking-[0.15em] mb-3" style={{ color: `${C.text}25` }}>
              NEED HELP IMPLEMENTING THIS?
            </div>
            <a
              href="mailto:cessar@nxtlinktech.com?subject=NXT LINK Recommendation"
              className="inline-block text-[12px] font-bold tracking-[0.08em] px-8 py-3"
              style={{
                background: `${C.orange}15`,
                border: `1px solid ${C.orange}40`,
                borderRadius: '12px',
                color: C.orange,
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
        <span className="text-[9px] tracking-[0.2em] font-bold" style={{ color: `${C.text}35` }}>{title}</span>
      </div>
      <div className="p-5" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px' }}>
        {children}
      </div>
    </div>
  );
}

function Badge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[7px] tracking-[0.2em]" style={{ color: `${C.text}25` }}>{label}</span>
      <span className="text-[11px] font-bold" style={{ color }}>{value}</span>
    </div>
  );
}
