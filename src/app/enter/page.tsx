'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { AskResponse, KeyPlayer, ExpertBrief } from '@/lib/engines/ask-engine';
import type { PatentResult, ResearchPaper, FederalContract } from '@/lib/engines/live-search-engine';

// ─── Constants ───────────────────────────────────────────────────────────────

const QUICK_CHIPS = [
  { label: 'Cybersecurity', query: 'cybersecurity' },
  { label: 'Battery Storage', query: 'battery storage technology' },
  { label: 'Drone Logistics', query: 'drone delivery logistics' },
  { label: 'AI Healthcare', query: 'AI healthcare' },
  { label: 'Smart Grid', query: 'smart grid infrastructure' },
];

const LOADING_STEPS = [
  'Scanning market signals',
  'Analyzing competition density',
  'Checking government contracts',
  'Scoring entry timing',
  'Building recommendation',
];

// ─── Scoring ─────────────────────────────────────────────────────────────────

type ScoreCard = {
  label: string;
  score: number;
  explanation: string;
};

type RecommendationTier = {
  label: string;
  color: string;
  bg: string;
  border: string;
};

function getRecommendation(score: number): RecommendationTier {
  if (score >= 70) return { label: 'STRONG OPPORTUNITY', color: '#00ff88', bg: 'bg-[#00ff88]/10', border: 'border-[#00ff88]/30' };
  if (score >= 55) return { label: 'MODERATE OPPORTUNITY', color: '#ffd700', bg: 'bg-[#ffd700]/10', border: 'border-[#ffd700]/30' };
  if (score >= 40) return { label: 'PROCEED WITH CAUTION', color: '#f97316', bg: 'bg-[#f97316]/10', border: 'border-[#f97316]/30' };
  return { label: 'HIGH RISK ENTRY', color: '#ff3b30', bg: 'bg-[#ff3b30]/10', border: 'border-[#ff3b30]/30' };
}

function scoreColor(score: number): string {
  if (score >= 70) return '#00ff88';
  if (score >= 55) return '#ffd700';
  if (score >= 40) return '#f97316';
  return '#ff3b30';
}

function computeScores(data: AskResponse): { cards: ScoreCard[]; overall: number } {
  const players: KeyPlayer[] = data.sections?.key_players ?? [];
  const contracts: FederalContract[] = data.sections?.contracts?.items ?? [];
  const patents: PatentResult[] = data.sections?.patents?.items ?? [];
  const papers: ResearchPaper[] = data.sections?.research?.papers ?? [];
  const brief: ExpertBrief | undefined = data.sections?.expert_brief;
  const marketData = data.sections?.what_it_is?.market_data ?? [];

  // 1. Market Opportunity
  let marketScore = players.length > 0 ? 70 : 50;
  if (marketData.some(d => d.metric?.toLowerCase().includes('size') || d.metric?.toLowerCase().includes('market'))) marketScore += 10;
  if (marketData.some(d => d.metric?.toLowerCase().includes('growth') || d.metric?.toLowerCase().includes('rate'))) marketScore += 10;
  marketScore = Math.min(marketScore, 95);

  // 2. Competition Density (inverse: fewer players = better entry window)
  let competitionScore: number;
  let competitionExplanation: string;
  if (players.length < 3) {
    competitionScore = 80;
    competitionExplanation = `Only ${players.length} major player${players.length !== 1 ? 's' : ''} detected — open field`;
  } else if (players.length <= 7) {
    competitionScore = 55;
    competitionExplanation = `${players.length} established players — competitive but enterable`;
  } else {
    competitionScore = 30;
    competitionExplanation = `${players.length}+ players — highly contested market`;
  }

  // 3. Government Interest
  const govScore = Math.min(contracts.length * 8, 90);
  const govExplanation = contracts.length === 0
    ? 'No government contracts detected yet'
    : `${contracts.length} active government contract${contracts.length !== 1 ? 's' : ''} found`;

  // 4. Innovation Velocity
  const velScore = Math.min(patents.length * 5 + papers.length * 3, 85);
  const velExplanation = (patents.length + papers.length) === 0
    ? 'Limited R&D activity detected'
    : `${patents.length} patent${patents.length !== 1 ? 's' : ''} + ${papers.length} research paper${papers.length !== 1 ? 's' : ''}`;

  // 5. Entry Timing
  const maturity = brief?.maturity ?? 'growth';
  const momentum = brief?.market_momentum ?? 'growing';
  let timingScore: number;
  let timingExplanation: string;
  if (maturity === 'nascent' || maturity === 'emerging' || momentum === 'emerging' || momentum === 'surging') {
    timingScore = 85;
    timingExplanation = 'Early-stage market — strong first-mover window';
  } else if (momentum === 'growing' || maturity === 'growth') {
    timingScore = 65;
    timingExplanation = 'Growth phase — healthy entry opportunity';
  } else {
    timingScore = 35;
    timingExplanation = 'Mature or declining market — late entry risk';
  }

  const cards: ScoreCard[] = [
    { label: 'MARKET OPPORTUNITY', score: marketScore, explanation: `${marketData.length} market data points analyzed` },
    { label: 'COMPETITION DENSITY', score: competitionScore, explanation: competitionExplanation },
    { label: 'GOVT INTEREST', score: govScore, explanation: govExplanation },
    { label: 'INNOVATION VELOCITY', score: velScore, explanation: velExplanation },
    { label: 'ENTRY TIMING', score: timingScore, explanation: timingExplanation },
  ];

  const overall = Math.round(cards.reduce((sum, c) => sum + c.score, 0) / cards.length);

  return { cards, overall };
}

function toKebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function sentimentColor(s: string): string {
  if (s === 'positive') return '#00ff88';
  if (s === 'negative') return '#ff3b30';
  return '#94a3b8';
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ScoreGauge({ score, color }: { score: number; color: string }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <svg width="110" height="110" viewBox="0 0 110 110" className="shrink-0">
      <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      <circle
        cx="55" cy="55" r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ filter: `drop-shadow(0 0 6px ${color}99)` }}
      />
      <text x="55" y="59" textAnchor="middle" fontSize="22" fontWeight="700" fill={color} fontFamily="'IBM Plex Mono', monospace">{score}</text>
    </svg>
  );
}

function BarScore({ score, color }: { score: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${score}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}80` }}
      />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EnterPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // URL param support: /enter?q=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q && q.length >= 2) {
      setQuery(q);
      handleAnalyze(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcut: / to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') inputRef.current?.blur();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleAnalyze = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setQuery(trimmed);
    setLoading(true);
    setError(null);
    setResult(null);
    setCompletedSteps(-1);

    window.history.replaceState(null, '', `/enter?q=${encodeURIComponent(trimmed)}`);

    // Animate loading steps
    for (let i = 0; i < LOADING_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 420));
      setCompletedSteps(i);
    }

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message ?? 'Analysis failed. Please try again.');
      } else {
        setResult(data as AskResponse);
      }
    } catch {
      setError('Failed to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAnalyze(query);
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setQuery('');
    setCompletedSteps(-1);
    window.history.replaceState(null, '', '/enter');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── Derived data ────────────────────────────────────────────────────────────
  const scored = result ? computeScores(result) : null;
  const recommendation = scored ? getRecommendation(scored.overall) : null;
  const slug = result?.slug ?? toKebab(query);

  const players: KeyPlayer[] = result?.sections?.key_players ?? [];
  const leaders = players.filter(p => p.role === 'leader').slice(0, 3);
  const challengers = players.filter(p => p.role === 'challenger').slice(0, 3);
  const emerging = players.filter(p => p.role === 'emerging' || p.role === 'niche').slice(0, 4);

  const articles = (result?.sections?.live_signals?.signals ?? []).slice(0, 5);

  const localVendors = result?.sections?.local_vendors?.vendors ?? [];
  const localCount = localVendors.length;
  const localMessage =
    localCount === 0 ? 'FIRST MOVER opportunity in El Paso — no local vendors detected in this space.'
    : localCount <= 3 ? `${localCount} local vendor${localCount !== 1 ? 's' : ''} operating in this space — limited local competition.`
    : `${localCount} local vendors already active — established El Paso market.`;
  const localBadge =
    localCount === 0 ? { label: 'FIRST MOVER', color: '#00ff88' }
    : localCount <= 3 ? { label: 'LIMITED COMPETITION', color: '#ffd700' }
    : { label: 'ESTABLISHED', color: '#f97316' };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black text-white font-mono">

      {/* ── Top nav bar ── */}
      <header className="h-10 border-b border-white/[0.06] flex items-center px-5 gap-4">
        <a href="/" className="text-[10px] tracking-widest text-white/30 hover:text-[#00d4ff] transition-colors">NXT//LINK</a>
        <span className="text-white/10 text-[10px]">/</span>
        <span className="text-[10px] tracking-widest text-[#00d4ff]">MARKET ENTRY ADVISOR</span>
        <div className="ml-auto flex items-center gap-2">
          {result && (
            <button
              onClick={handleReset}
              className="text-[9px] tracking-widest text-white/30 hover:text-white/60 transition-colors border border-white/[0.06] px-2.5 py-1 rounded-sm"
            >
              NEW ANALYSIS
            </button>
          )}
          <a href="/ask" className="text-[9px] tracking-widest text-white/30 hover:text-[#00d4ff] transition-colors">
            /ASK
          </a>
        </div>
      </header>

      {/* ── State 1: Input ── */}
      {!loading && !result && (
        <div className="flex flex-col items-center justify-center pt-[13vh] pb-16 px-4">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" style={{ boxShadow: '0 0 8px #00ff88' }} />
            <span className="text-[9px] tracking-[0.25em] text-[#00ff88]/70 uppercase">Live market analysis</span>
          </div>

          {/* Headline */}
          <h1 className="text-2xl font-bold tracking-tight text-center mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Should you enter this market?
          </h1>
          <p className="text-[11px] text-white/30 tracking-wide mb-8 text-center">
            We analyze 10+ live signals to score your market entry opportunity
          </p>

          {/* Search form */}
          <form onSubmit={handleSubmit} className="w-full max-w-2xl">
            <div className="relative flex items-center border border-white/[0.06] rounded-sm bg-white/[0.02] focus-within:border-[#00d4ff]/40 focus-within:bg-[#00d4ff]/[0.03] transition-all duration-200">
              <span className="pl-4 text-[#00d4ff]/40 text-sm shrink-0 select-none">→</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Enter an industry or technology..."
                className="flex-1 bg-transparent px-3 py-4 text-sm text-white placeholder-white/20 outline-none font-mono"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={query.trim().length < 2}
                className="mr-2 px-4 py-2 text-[10px] tracking-widest font-mono rounded-sm transition-all duration-150
                  bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff]
                  hover:bg-[#00d4ff]/20 hover:border-[#00d4ff]/40
                  disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ANALYZE ENTRY →
              </button>
            </div>
          </form>

          {/* Error */}
          {error && (
            <p className="mt-4 text-[11px] text-[#ff3b30] border border-[#ff3b30]/20 bg-[#ff3b30]/5 px-4 py-2 rounded-sm">
              {error}
            </p>
          )}

          {/* Quick chips */}
          <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
            <span className="text-[9px] tracking-widest text-white/20">EXAMPLES:</span>
            {QUICK_CHIPS.map(chip => (
              <button
                key={chip.query}
                onClick={() => { setQuery(chip.query); handleAnalyze(chip.query); }}
                className="text-[10px] tracking-wide px-3 py-1.5 border border-white/[0.08] rounded-sm text-white/40 hover:text-[#00d4ff] hover:border-[#00d4ff]/30 transition-all duration-150 bg-white/[0.02]"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── State 2: Loading ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center pt-[15vh] pb-16 px-4">
          <p className="text-[10px] tracking-widest text-[#00d4ff]/60 mb-6 uppercase">
            Analyzing market conditions for <span className="text-[#00d4ff]">{query}</span>...
          </p>

          {/* Scanning bar */}
          <div className="w-full max-w-md h-0.5 bg-white/[0.04] rounded-full overflow-hidden mb-8">
            <div
              className="h-full bg-[#00d4ff] rounded-full"
              style={{
                width: `${((completedSteps + 2) / (LOADING_STEPS.length + 1)) * 100}%`,
                transition: 'width 0.4s ease',
                boxShadow: '0 0 8px #00d4ff80',
              }}
            />
          </div>

          {/* Steps checklist */}
          <div className="flex flex-col gap-3 w-full max-w-xs">
            {LOADING_STEPS.map((step, i) => {
              const done = i <= completedSteps;
              const active = i === completedSteps + 1;
              return (
                <div key={step} className="flex items-center gap-3">
                  <span
                    className="text-[10px] w-4 shrink-0 transition-all duration-300"
                    style={{ color: done ? '#00ff88' : active ? '#00d4ff' : '#ffffff20' }}
                  >
                    {done ? '✓' : active ? '·' : '·'}
                  </span>
                  <span
                    className="text-[11px] tracking-wide transition-all duration-300"
                    style={{ color: done ? '#ffffff80' : active ? '#fff' : '#ffffff20' }}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── State 3: Results ── */}
      {result && scored && recommendation && (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

          {/* ── Hero recommendation banner ── */}
          <div className={`border ${recommendation.border} ${recommendation.bg} rounded-sm p-6 flex items-center gap-6`}>
            <ScoreGauge score={scored.overall} color={recommendation.color} />
            <div className="flex-1 min-w-0">
              <p className="text-[9px] tracking-[0.25em] text-white/30 mb-1">MARKET ENTRY VERDICT — {result.label.toUpperCase()}</p>
              <h2
                className="text-2xl font-bold tracking-tight mb-2"
                style={{ color: recommendation.color, fontFamily: "'Space Grotesk', sans-serif", textShadow: `0 0 20px ${recommendation.color}50` }}
              >
                {recommendation.label}
              </h2>
              {result.sections?.expert_brief && (
                <p className="text-[11px] text-white/50 leading-relaxed max-w-xl">
                  {result.sections.expert_brief.key_insight}
                </p>
              )}
            </div>
            <div className="shrink-0 hidden sm:flex flex-col items-end gap-2">
              <span className="text-[9px] tracking-widest text-white/20">OVERALL SCORE</span>
              <span
                className="text-4xl font-bold font-mono"
                style={{ color: recommendation.color, textShadow: `0 0 16px ${recommendation.color}60` }}
              >
                {scored.overall}
              </span>
              <span className="text-[9px] text-white/20">/ 100</span>
            </div>
          </div>

          {/* ── 5 Score cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {scored.cards.map(card => {
              const c = scoreColor(card.score);
              return (
                <div key={card.label} className="border border-white/[0.06] bg-white/[0.02] rounded-sm p-3 flex flex-col gap-2">
                  <p className="text-[8px] tracking-widest text-white/30">{card.label}</p>
                  <p className="text-2xl font-bold font-mono" style={{ color: c, textShadow: `0 0 10px ${c}50` }}>
                    {card.score}
                  </p>
                  <BarScore score={card.score} color={c} />
                  <p className="text-[9px] text-white/30 leading-tight">{card.explanation}</p>
                </div>
              );
            })}
          </div>

          {/* ── Competitive Landscape ── */}
          {players.length > 0 && (
            <div className="border border-white/[0.06] rounded-sm overflow-hidden">
              <div className="border-b border-white/[0.06] px-4 py-2.5 flex items-center gap-2">
                <span className="text-[9px] tracking-widest text-white/40">COMPETITIVE LANDSCAPE</span>
                <span className="text-[9px] text-white/20">— {players.length} player{players.length !== 1 ? 's' : ''} detected</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {/* Leaders */}
                {leaders.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-[8px] tracking-widest text-[#ff3b30]/60 mb-2">LEADERS</p>
                    <div className="flex flex-wrap gap-2">
                      {leaders.map(p => (
                        <div key={p.name} className="flex items-center gap-2 border border-[#ff3b30]/20 bg-[#ff3b30]/5 rounded-sm px-2.5 py-1.5">
                          <span className="text-[10px] text-white/80">{p.name}</span>
                          {p.mentions > 0 && <span className="text-[8px] text-[#ff3b30]/60">{p.mentions}×</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Challengers */}
                {challengers.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-[8px] tracking-widest text-[#ffd700]/60 mb-2">CHALLENGERS</p>
                    <div className="flex flex-wrap gap-2">
                      {challengers.map(p => (
                        <div key={p.name} className="flex items-center gap-2 border border-[#ffd700]/20 bg-[#ffd700]/5 rounded-sm px-2.5 py-1.5">
                          <span className="text-[10px] text-white/80">{p.name}</span>
                          {p.mentions > 0 && <span className="text-[8px] text-[#ffd700]/60">{p.mentions}×</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Emerging */}
                {emerging.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-[8px] tracking-widest text-[#00ff88]/60 mb-2">EMERGING</p>
                    <div className="flex flex-wrap gap-2">
                      {emerging.map(p => (
                        <div key={p.name} className="flex items-center gap-2 border border-[#00ff88]/20 bg-[#00ff88]/5 rounded-sm px-2.5 py-1.5">
                          <span className="text-[10px] text-white/80">{p.name}</span>
                          {p.mentions > 0 && <span className="text-[8px] text-[#00ff88]/60">{p.mentions}×</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Market Signals ── */}
          {articles.length > 0 && (
            <div className="border border-white/[0.06] rounded-sm overflow-hidden">
              <div className="border-b border-white/[0.06] px-4 py-2.5">
                <span className="text-[9px] tracking-widest text-white/40">MARKET SIGNALS</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {articles.map((sig, i) => (
                  <div key={i} className="px-4 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors">
                    <div
                      className="w-1 h-1 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: sentimentColor(sig.type), boxShadow: `0 0 4px ${sentimentColor(sig.type)}` }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-white/70 leading-snug truncate">{sig.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {sig.source && <span className="text-[9px] text-white/25">{sig.source}</span>}
                        <span className="text-[9px] text-white/20">{sig.discovered_at ? new Date(sig.discovered_at).toLocaleDateString() : ''}</span>
                      </div>
                    </div>
                    <span
                      className="text-[8px] tracking-wide shrink-0 px-1.5 py-0.5 rounded-sm border"
                      style={{
                        color: sentimentColor(sig.type),
                        borderColor: `${sentimentColor(sig.type)}30`,
                        backgroundColor: `${sentimentColor(sig.type)}08`,
                      }}
                    >
                      {sig.type.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── El Paso Angle ── */}
          <div className="border border-white/[0.06] rounded-sm overflow-hidden">
            <div className="border-b border-white/[0.06] px-4 py-2.5 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]" style={{ boxShadow: '0 0 6px #00d4ff' }} />
              <span className="text-[9px] tracking-widest text-[#00d4ff]/70">EL PASO OPPORTUNITY</span>
            </div>
            <div className="px-4 py-4 flex items-center gap-4">
              <div
                className="shrink-0 px-2.5 py-1 rounded-sm border text-[8px] tracking-widest font-bold"
                style={{
                  color: localBadge.color,
                  borderColor: `${localBadge.color}30`,
                  backgroundColor: `${localBadge.color}10`,
                  textShadow: `0 0 8px ${localBadge.color}60`,
                }}
              >
                {localBadge.label}
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">{localMessage}</p>
            </div>
            {localCount > 0 && (
              <div className="px-4 pb-4 flex flex-wrap gap-2">
                {localVendors.slice(0, 6).map(v => (
                  <span key={v.id} className="text-[9px] px-2 py-1 border border-white/[0.06] text-white/30 rounded-sm bg-white/[0.02]">
                    {v.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Risk signals ── */}
          {(result.risk_signals?.length > 0 || result.regulatory_signals?.length > 0) && (
            <div className="border border-[#f97316]/20 bg-[#f97316]/5 rounded-sm px-4 py-3">
              <p className="text-[8px] tracking-widest text-[#f97316]/60 mb-2">RISK FACTORS</p>
              <div className="flex flex-col gap-1.5">
                {[...result.risk_signals ?? [], ...result.regulatory_signals ?? []].slice(0, 4).map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[#f97316]/50 text-[9px] mt-0.5 shrink-0">!</span>
                    <p className="text-[10px] text-white/40 leading-snug">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Action Recommendations ── */}
          <div>
            <p className="text-[9px] tracking-widest text-white/20 mb-3">NEXT STEPS</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <a
                href={`/industry/${slug}`}
                className="group border border-white/[0.06] bg-white/[0.02] rounded-sm p-4 flex flex-col gap-2 hover:border-[#00d4ff]/30 hover:bg-[#00d4ff]/[0.03] transition-all duration-150"
              >
                <span className="text-[9px] tracking-widest text-[#00d4ff]/50 group-hover:text-[#00d4ff]/80 transition-colors">01</span>
                <p className="text-[11px] text-white/70 group-hover:text-white/90 transition-colors">Deep scan this industry</p>
                <p className="text-[9px] text-white/25">Full 11-block intelligence report</p>
                <span className="text-[9px] text-[#00d4ff]/40 group-hover:text-[#00d4ff] mt-1 transition-colors">/industry/{slug} →</span>
              </a>
              <a
                href="/compare"
                className="group border border-white/[0.06] bg-white/[0.02] rounded-sm p-4 flex flex-col gap-2 hover:border-[#ffd700]/30 hover:bg-[#ffd700]/[0.03] transition-all duration-150"
              >
                <span className="text-[9px] tracking-widest text-[#ffd700]/50 group-hover:text-[#ffd700]/80 transition-colors">02</span>
                <p className="text-[11px] text-white/70 group-hover:text-white/90 transition-colors">Find local vendors</p>
                <p className="text-[9px] text-white/25">Compare El Paso technology providers</p>
                <span className="text-[9px] text-[#ffd700]/40 group-hover:text-[#ffd700] mt-1 transition-colors">/compare →</span>
              </a>
              <a
                href={`/report/${slug}`}
                className="group border border-white/[0.06] bg-white/[0.02] rounded-sm p-4 flex flex-col gap-2 hover:border-[#00ff88]/30 hover:bg-[#00ff88]/[0.03] transition-all duration-150"
              >
                <span className="text-[9px] tracking-widest text-[#00ff88]/50 group-hover:text-[#00ff88]/80 transition-colors">03</span>
                <p className="text-[11px] text-white/70 group-hover:text-white/90 transition-colors">View full report</p>
                <p className="text-[9px] text-white/25">Export complete market entry report</p>
                <span className="text-[9px] text-[#00ff88]/40 group-hover:text-[#00ff88] mt-1 transition-colors">/report/{slug} →</span>
              </a>
            </div>
          </div>

          {/* Footer meta */}
          <div className="border-t border-white/[0.04] pt-4 flex items-center justify-between">
            <p className="text-[9px] text-white/15">
              Analysis generated {result.generated_at ? new Date(result.generated_at).toLocaleString() : 'just now'}
            </p>
            <button
              onClick={handleReset}
              className="text-[9px] tracking-widest text-white/20 hover:text-[#00d4ff]/60 transition-colors"
            >
              ← NEW ANALYSIS
            </button>
          </div>

        </div>
      )}

      {/* Error state (post-load) */}
      {!loading && error && !result && (
        <div className="flex flex-col items-center justify-center pt-[15vh] px-4">
          <p className="text-[11px] text-[#ff3b30] border border-[#ff3b30]/20 bg-[#ff3b30]/5 px-5 py-3 rounded-sm mb-4">
            {error}
          </p>
          <button
            onClick={handleReset}
            className="text-[10px] tracking-widest text-white/30 hover:text-white/60 transition-colors"
          >
            ← TRY AGAIN
          </button>
        </div>
      )}

    </div>
  );
}
