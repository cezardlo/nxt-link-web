'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { timeAgo } from '@/lib/utils/format';
import type {
  AskResponse,
  AskVendor,
  AskProduct,
  AskSignal,
  WhatItIsSection,
  DirectionSection,
  LiveSearchMeta,
  CostsSection,
  ExpertBrief,
  KeyPlayer,
  TechTheme,
  InnovationPipeline,
  InnovationItem,
} from '@/lib/engines/ask-engine';
import type {
  TimelineEvent,
  OpportunityEntry,
} from '@/lib/engines/industry-profile';
import type {
  PatentResult,
  ResearchPaper,
  GrantResult,
  GeographicBreakdown,
  MarketDataPoint,
  FederalContract,
  WikipediaSummary,
} from '@/lib/engines/live-search-engine';

// ─── Constants ──────────────────────────────────────────────────────────────────

const QUICK_PICKS = [
  { label: 'AI / ML', query: 'artificial intelligence' },
  { label: 'Cybersecurity', query: 'cybersecurity' },
  { label: 'Defense', query: 'defense technology' },
  { label: 'Manufacturing', query: 'manufacturing automation' },
  { label: 'Energy', query: 'energy technology' },
  { label: 'Healthcare', query: 'healthcare technology' },
  { label: 'Logistics', query: 'logistics supply chain' },
  { label: 'Border Tech', query: 'border technology' },
  { label: 'Robotics', query: 'robotics automation' },
  { label: 'Construction', query: 'construction technology' },
  { label: 'Water', query: 'water desalination' },
  { label: 'Agriculture', query: 'agriculture farming tech' },
  { label: 'Fintech', query: 'fintech banking' },
  { label: 'Aerospace', query: 'aerospace space' },
  { label: 'Quantum', query: 'quantum computing' },
  { label: 'Climate', query: 'climate carbon technology' },
];

const SIGNAL_TYPE_COLORS: Record<string, string> = {
  patent_filing: '#a855f7', funding_round: '#00ff88', contract_award: '#ffd700',
  merger_acquisition: '#ff3b30', product_launch: '#00d4ff', hiring_signal: '#f97316',
  research_paper: '#60a5fa', regulatory_action: '#ef4444', facility_expansion: '#34d399',
  case_study: '#94a3b8', news: '#64748b', milestone: '#f97316', forecast: '#00d4ff',
};

function ikerBadgeColor(score: number): string {
  if (score >= 80) return '#00ff88';
  if (score >= 60) return '#ffd700';
  return '#ff3b30';
}

// ─── Page ───────────────────────────────────────────────────────────────────────

const ROTATING_EXAMPLES = [
  'battery storage technology',
  'autonomous vehicles suppliers',
  'cybersecurity AI defense',
  'solar panel manufacturers',
  'water desalination costs',
  'drone delivery logistics',
  'quantum computing startups',
  'medical robotics patents',
  'carbon capture vendors',
  'smart grid infrastructure',
  '3D printing construction',
  'border surveillance tech',
];

const SOURCE_BADGES = [
  { name: 'Google News', color: '#4285F4' },
  { name: 'GDELT', color: '#e53935' },
  { name: 'PatentsView', color: '#a855f7' },
  { name: 'OpenAlex', color: '#60a5fa' },
  { name: 'Grants.gov', color: '#34d399' },
  { name: 'SAM.gov', color: '#ffd700' },
  { name: 'Wikipedia', color: '#999' },
  { name: 'Hacker News', color: '#ff6600' },
  { name: 'PubMed', color: '#2196F3' },
];

export default function AskPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [introVendor, setIntroVendor] = useState<AskVendor | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rotate placeholder text
  useEffect(() => {
    if (query || result) return;
    const interval = setInterval(() => {
      setPlaceholderIdx(prev => (prev + 1) % ROTATING_EXAMPLES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [query, result]);

  // Load search history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nxt-ask-history');
      if (saved) setSearchHistory(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // URL param support: /ask?q=cybersecurity
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q && q.length >= 2) {
      setQuery(q);
      handleSearch(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setQuery(trimmed);
    setLoading(true);
    setError(null);
    setResult(null);

    // Update URL
    window.history.replaceState(null, '', `/ask?q=${encodeURIComponent(trimmed)}`);

    // Save to history
    setSearchHistory(prev => {
      const updated = [trimmed, ...prev.filter(h => h !== trimmed)].slice(0, 10);
      try { localStorage.setItem('nxt-ask-history', JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message ?? 'Something went wrong');
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
    handleSearch(query);
  };

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Hero / Search ── */}
      <div className={`flex flex-col items-center justify-center transition-all duration-500 ${result ? 'pt-8 pb-4' : 'pt-[12vh] pb-10'}`}>

        {/* Top badge */}
        {!result && (
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" style={{ boxShadow: '0 0 8px #00ff88' }} />
            <span className="font-mono text-[9px] tracking-[0.2em] text-[#00ff88]/70 uppercase">{SOURCE_BADGES.length} live sources</span>
            <span className="font-mono text-[8px] text-white/15">·</span>
            <span className="font-mono text-[8px] text-white/15">Real-time intelligence</span>
          </div>
        )}

        <h1 className={`font-mono tracking-[0.3em] text-white/30 uppercase transition-all duration-500 ${result ? 'text-[9px] mb-1' : 'text-[11px] mb-3'}`}>
          NXT//LINK INTELLIGENCE
        </h1>

        {!result && (
          <p className="text-[28px] sm:text-[36px] tracking-tight text-white mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            What do you need to know?
          </p>
        )}

        {!result && (
          <p className="font-mono text-[11px] text-white/30 mb-6 max-w-lg text-center leading-relaxed">
            Search any industry, technology, or company — get suppliers, costs, patents, research, and live signals in seconds
          </p>
        )}

        <form onSubmit={handleSubmit} className={`w-full px-4 transition-all duration-500 ${result ? 'max-w-3xl' : 'max-w-2xl'}`}>
          <div className="relative group">
            {/* Glow border on focus */}
            <div className="absolute -inset-[1px] rounded-sm bg-gradient-to-r from-[#f97316]/0 via-[#f97316]/0 to-[#f97316]/0 group-focus-within:from-[#f97316]/20 group-focus-within:via-[#f97316]/40 group-focus-within:to-[#f97316]/20 transition-all duration-300 blur-[1px]" />

            <div className="relative">
              {/* Search icon */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/20 group-focus-within:text-[#f97316]/60 transition-colors">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
              </div>

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={ROTATING_EXAMPLES[placeholderIdx]}
                className={`w-full bg-white/[0.04] border border-white/[0.08] rounded-sm pl-11 pr-28 font-mono text-white placeholder:text-white/15 focus:outline-none focus:border-[#f97316]/60 transition-all duration-300 ${result ? 'py-2.5 text-sm' : 'py-4 text-[15px]'}`}
              />

              {/* Scanning animation bar */}
              {loading && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden rounded-b-sm">
                  <div className="h-full bg-gradient-to-r from-transparent via-[#f97316] to-transparent animate-scan" />
                </div>
              )}

              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="font-mono text-[8px] text-white/10 hidden sm:block border border-white/[0.06] px-1.5 py-0.5 rounded-sm">/</span>
                <button
                  type="submit"
                  disabled={loading || query.trim().length < 2}
                  className={`bg-[#f97316] text-black font-mono tracking-[0.15em] uppercase rounded-sm hover:bg-[#f97316]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all ${result ? 'px-3 py-1.5 text-[9px]' : 'px-4 py-2 text-[10px]'}`}
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-black/40 animate-pulse" />
                      SCANNING
                    </span>
                  ) : 'SEARCH'}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Quick picks — only show when no results */}
        {!result && (
          <div className="mt-5 px-4 max-w-4xl w-full">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="h-px flex-1 max-w-[60px] bg-white/[0.06]" />
              <span className="font-mono text-[7px] tracking-[0.3em] text-white/15 uppercase">explore</span>
              <div className="h-px flex-1 max-w-[60px] bg-white/[0.06]" />
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {QUICK_PICKS.map((p) => (
                <button
                  key={p.query}
                  onClick={() => { setQuery(p.query); handleSearch(p.query); }}
                  className="group/pick px-3 py-1 border border-white/[0.06] rounded-sm font-mono text-[8px] tracking-[0.12em] text-white/40 hover:text-[#00d4ff] hover:border-[#00d4ff]/30 hover:bg-[#00d4ff]/[0.03] transition-all uppercase"
                >
                  <span className="inline-block w-1 h-1 rounded-full bg-[#00d4ff]/30 group-hover/pick:bg-[#00d4ff] mr-1.5 transition-colors" />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick pick strip when results shown */}
        {result && (
          <div className="flex flex-wrap gap-1 mt-2 px-4 justify-center max-w-3xl">
            {QUICK_PICKS.slice(0, 8).map((p) => (
              <button
                key={p.query}
                onClick={() => { setQuery(p.query); handleSearch(p.query); window.scrollTo(0, 0); }}
                className="px-2 py-0.5 font-mono text-[7px] tracking-[0.1em] text-white/20 hover:text-[#00d4ff]/60 transition-colors uppercase"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Search history */}
        {!result && searchHistory.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4 px-4 justify-center max-w-3xl">
            <span className="font-mono text-[7px] text-white/15 uppercase tracking-wider self-center mr-1">Recent:</span>
            {searchHistory.slice(0, 5).map((h) => (
              <button
                key={h}
                onClick={() => { setQuery(h); handleSearch(h); }}
                className="px-2.5 py-0.5 font-mono text-[8px] text-white/20 hover:text-white/40 border border-white/[0.04] hover:border-white/[0.08] rounded-sm transition-colors"
              >
                {h}
              </button>
            ))}
          </div>
        )}

        {/* Source strip — bottom of hero */}
        {!result && !loading && (
          <div className="mt-8 px-4">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {SOURCE_BADGES.map((s) => (
                <span key={s.name} className="font-mono text-[7px] tracking-[0.1em] text-white/15 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full" style={{ background: `${s.color}60` }} />
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="p-3 border border-[#ff3b30]/30 bg-[#ff3b30]/5 rounded-sm font-mono text-[11px] text-[#ff3b30]">
            {error}
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && <LiveSearchLoading query={query} />}

      {/* ── Results ── */}
      {result && (
        <div className="max-w-5xl mx-auto px-4 pb-20 space-y-6">
          {/* Live search meta */}
          <LiveSearchBanner meta={result.live_search} />

          {/* Confidence */}
          <ConfidenceBanner confidence={result.confidence} label={result.label} />

          {/* 01 — What It Is */}
          <Section title="WHAT IT IS" number="01" color="#00d4ff">
            <WhatItIs data={result.sections.what_it_is} wikipedia={result.sections.wikipedia} />
          </Section>

          {/* Expert Brief */}
          <ExpertBriefView brief={result.sections.expert_brief} />

          {/* Market Data Bar */}
          {(result.sections.what_it_is.market_data.length > 0 || result.sections.costs.market_sizes.length > 0) && (
            <MarketDataBar
              data={result.sections.what_it_is.market_data}
              sizes={result.sections.costs.market_sizes}
              growth={result.sections.costs.growth_rates}
            />
          )}

          {/* 02 — Key Players */}
          {result.sections.key_players.length > 0 && (
            <Section title="KEY PLAYERS" number="02" color="#00d4ff"
              badge={`${result.sections.key_players.length}`}>
              <KeyPlayersView players={result.sections.key_players} />
            </Section>
          )}

          {/* 03 — Direction + Sentiment */}
          <Section title="WHERE IT&apos;S HEADING" number="03" color="#f97316">
            <Direction data={result.sections.direction} />
          </Section>

          {/* 04 — Tech Landscape */}
          {result.sections.tech_landscape.length > 0 && (
            <Section title="TECHNOLOGY MAP" number="04" color="#a855f7"
              badge={`${result.sections.tech_landscape.length} themes`}>
              <TechLandscapeView themes={result.sections.tech_landscape} />
            </Section>
          )}

          {/* 05 — Innovation Pipeline */}
          {(result.sections.innovation_pipeline.researched.length > 0 ||
            result.sections.innovation_pipeline.patented.length > 0 ||
            result.sections.innovation_pipeline.funded.length > 0 ||
            result.sections.innovation_pipeline.contracted.length > 0) && (
            <Section title="INNOVATION PIPELINE" number="05" color="#00ff88">
              <InnovationPipelineView pipeline={result.sections.innovation_pipeline} />
            </Section>
          )}

          {/* 06 — History */}
          {result.sections.history.events.length > 0 && (
            <Section title="THE HISTORY" number="06" color="#a855f7">
              <Timeline events={result.sections.history.events} />
            </Section>
          )}

          {/* 07 — Costs + Funding */}
          <Section title="WHAT IT COSTS" number="07" color="#ffd700">
            <CostsView data={result.sections.costs} />
          </Section>

          {/* 08 — Global Vendors */}
          <Section title="GLOBAL VENDORS" number="08" color="#00d4ff"
            badge={result.sections.global_vendors.vendors.length > 0 ? `${result.sections.global_vendors.vendors.length}` : undefined}
          >
            {result.sections.global_vendors.vendors.length > 0 ? (
              <VendorGrid vendors={result.sections.global_vendors.vendors} onRequestIntro={setIntroVendor} />
            ) : (
              <EmptyState message="No global vendors discovered yet." />
            )}
          </Section>

          {/* 09 — Local Vendors */}
          <Section title="EL PASO VENDORS" number="09" color="#f97316"
            badge={result.sections.local_vendors.vendors.length > 0 ? `${result.sections.local_vendors.vendors.length}` : undefined}
          >
            {result.sections.local_vendors.vendors.length > 0 ? (
              <VendorGrid vendors={result.sections.local_vendors.vendors} onRequestIntro={setIntroVendor} showIntro />
            ) : (
              <EmptyState message="No El Paso vendors matched." />
            )}
          </Section>

          {/* 10 — Live Signals */}
          <Section title="LIVE SIGNALS" number="10" color="#00ff88"
            badge={result.sections.live_signals.signals.length > 0 ? `${result.sections.live_signals.signals.length}` : undefined}
          >
            {result.sections.live_signals.signals.length > 0 ? (
              <SignalList signals={result.sections.live_signals.signals} />
            ) : (
              <EmptyState message="No recent signals found." />
            )}
          </Section>

          {/* 11 — Patents */}
          <Section title="PATENTS" number="11" color="#a855f7"
            badge={result.sections.patents.items.length > 0 ? `${result.sections.patents.items.length}` : undefined}
          >
            {result.sections.patents.items.length > 0 ? (
              <PatentList patents={result.sections.patents.items} />
            ) : (
              <EmptyState message="No recent patents found for this query." />
            )}
          </Section>

          {/* 12 — Research Papers */}
          <Section title="RESEARCH PAPERS" number="12" color="#60a5fa"
            badge={result.sections.research.papers.length > 0 ? `${result.sections.research.papers.length}` : undefined}
          >
            {result.sections.research.papers.length > 0 ? (
              <ResearchList papers={result.sections.research.papers} />
            ) : (
              <EmptyState message="No academic papers found." />
            )}
          </Section>

          {/* 13 — Government Grants */}
          <Section title="GOVERNMENT GRANTS" number="13" color="#34d399"
            badge={result.sections.grants.items.length > 0 ? `${result.sections.grants.items.length}` : undefined}
          >
            {result.sections.grants.items.length > 0 ? (
              <GrantList grants={result.sections.grants.items} />
            ) : (
              <EmptyState message="No active grants found on Grants.gov." />
            )}
          </Section>

          {/* 14 — Federal Contracts */}
          {result.sections.contracts.items.length > 0 && (
            <Section title="FEDERAL CONTRACTS" number="14" color="#ffd700"
              badge={`${result.sections.contracts.items.length}`}
            >
              <ContractList contracts={result.sections.contracts.items} />
            </Section>
          )}

          {/* 15 — Geographic Breakdown */}
          {result.sections.geography.breakdown.length > 1 && (
            <Section title="GEOGRAPHIC BREAKDOWN" number="15" color="#00d4ff">
              <GeoBreakdown data={result.sections.geography.breakdown} />
            </Section>
          )}

          {/* 16 — Products */}
          <Section title="PRODUCTS" number="16" color="#a855f7"
            badge={result.products.length > 0 ? `${result.products.length}` : undefined}
          >
            {result.products.length > 0 ? (
              <ProductGrid products={result.products} />
            ) : (
              <EmptyState message="No tracked products match this query yet." />
            )}
          </Section>

          {/* Risk & Regulatory Alerts */}
          {(result.risk_signals.length > 0 || result.regulatory_signals.length > 0) && (
            <Section title="ALERTS & RISKS" number="17" color="#ff3b30">
              <AlertsView risks={result.risk_signals} regulatory={result.regulatory_signals} hiring={result.hiring_signals} />
            </Section>
          )}

          {/* Related Searches */}
          {result.related_searches.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-4">
              <span className="font-mono text-[8px] tracking-[0.2em] text-white/20 uppercase">Related:</span>
              {result.related_searches.map((s) => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); handleSearch(s); window.scrollTo(0, 0); }}
                  className="px-2.5 py-1 border border-white/[0.06] rounded-sm font-mono text-[9px] text-[#00d4ff]/50 hover:text-[#00d4ff] hover:border-[#00d4ff]/20 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Intro Request Modal ── */}
      {introVendor && <IntroModal vendor={introVendor} onClose={() => setIntroVendor(null)} />}
    </div>
  );
}

// ─── Live Search Loading ─────────────────────────────────────────────────────

function LiveSearchLoading({ query }: { query: string }) {
  return (
    <div className="max-w-5xl mx-auto px-4 pb-20 space-y-6">
      <div className="border border-[#f97316]/20 rounded-sm overflow-hidden bg-[#f97316]/[0.03]">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="relative w-2 h-2">
            <div className="absolute inset-0 rounded-full bg-[#f97316] animate-ping" />
            <div className="absolute inset-0 rounded-full bg-[#f97316]" />
          </div>
          <span className="font-mono text-[11px] text-[#f97316]">SCANNING LIVE SOURCES</span>
          <span className="font-mono text-[9px] text-white/30 ml-2">&quot;{query}&quot;</span>
        </div>
        <div className="px-4 pb-3 grid grid-cols-2 md:grid-cols-3 gap-1.5">
          {[
            ['Google News RSS', '10 query variants'],
            ['GDELT Global Events', '40 articles, 24h'],
            ['PatentsView API', 'US patents'],
            ['OpenAlex', 'research papers'],
            ['Grants.gov', 'federal grants'],
            ['SAM.gov', 'federal contracts'],
            ['Wikipedia', 'industry context'],
            ['Hacker News', 'tech discourse'],
            ['PubMed / NCBI', 'biomedical research'],
            ['Source Discovery', '15 auto-discovered feeds'],
            ['Company Extraction', 'identifying vendors'],
            ['Sentiment Analysis', 'market mood'],
          ].map(([label, sub], i) => (
            <div key={label} className="flex items-center gap-2 animate-pulse" style={{ animationDelay: `${i * 150}ms` }}>
              <div className="w-1 h-1 rounded-full bg-[#00d4ff]/60" />
              <span className="font-mono text-[8px] text-white/40">{label}</span>
              <span className="font-mono text-[7px] text-white/15">{sub}</span>
            </div>
          ))}
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-white/[0.04] rounded-sm overflow-hidden">
          <div className="px-4 py-2 border-b border-white/[0.04] bg-white/[0.01]">
            <div className="h-3 w-32 bg-white/[0.04] rounded-sm animate-pulse" />
          </div>
          <div className="p-4 space-y-3">
            <div className="h-3 w-full bg-white/[0.03] rounded-sm animate-pulse" />
            <div className="h-3 w-4/5 bg-white/[0.03] rounded-sm animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Live Search Banner ─────────────────────────────────────────────────────

function LiveSearchBanner({ meta }: { meta: LiveSearchMeta }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 border border-[#00ff88]/15 rounded-sm bg-[#00ff88]/[0.03]">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" style={{ boxShadow: '0 0 6px #00ff88' }} />
        <span className="font-mono text-[9px] tracking-[0.15em] text-[#00ff88]/80 uppercase">LIVE</span>
      </div>
      <Stat label="Sources" value={meta.sources_checked} />
      <Stat label="Articles" value={meta.articles_found} />
      <Stat label="Companies" value={meta.companies_discovered} />
      <Stat label="Patents" value={meta.patents_found} />
      <Stat label="Papers" value={meta.papers_found} />
      <Stat label="Grants" value={meta.grants_found} />
      <Stat label="Contracts" value={meta.contracts_found} />
      {meta.freshest_article && (
        <span className="font-mono text-[8px] text-white/15 hidden lg:block">
          Latest: {timeAgo(meta.freshest_article)}
        </span>
      )}
      <span className="ml-auto font-mono text-[8px] text-white/15">
        {meta.duration_ms < 1000 ? `${meta.duration_ms}ms` : `${(meta.duration_ms / 1000).toFixed(1)}s`}
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <span className="font-mono text-[8px] text-white/30">
      <span className="text-white/50">{value}</span> {label.toLowerCase()}
    </span>
  );
}

// ─── Section Wrapper ────────────────────────────────────────────────────────────

function Section({ title, number, color, children, badge }: {
  title: string; number: string; color: string; children: React.ReactNode; badge?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="border border-white/[0.06] rounded-sm overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 px-4 py-2 border-b border-white/[0.06] text-left hover:bg-white/[0.02] transition-colors"
        style={{ background: `${color}08` }}
      >
        <span className="font-mono text-[9px] tracking-[0.2em]" style={{ color: `${color}60` }}>{number}</span>
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color }}>{title}</span>
        {badge && (
          <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-sm bg-white/[0.04] text-white/30">{badge}</span>
        )}
        <span className="ml-auto font-mono text-[9px] text-white/15">{collapsed ? '▶' : '▼'}</span>
      </button>
      {!collapsed && <div className="p-4">{children}</div>}
    </div>
  );
}

// ─── Confidence Banner ──────────────────────────────────────────────────────────

function ConfidenceBanner({ confidence, label }: { confidence: AskResponse['confidence']; label: string }) {
  const levelColors: Record<number, string> = { 1: '#64748b', 2: '#ffd700', 3: '#00ff88' };
  const c = levelColors[confidence.level] ?? '#64748b';
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2 border border-white/[0.06] rounded-sm bg-white/[0.02]">
      <span className="font-mono text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm border"
        style={{ color: c, borderColor: `${c}40`, background: `${c}10` }}>
        L{confidence.level} — {confidence.label}
      </span>
      <span className="font-mono text-sm text-white/80">{label}</span>
      <span className="ml-auto font-mono text-[9px] text-white/20">
        {confidence.signal_count} signals · {confidence.company_count} companies
      </span>
    </div>
  );
}

// ─── Market Data Bar ────────────────────────────────────────────────────────

function MarketDataBar({ data, sizes, growth }: { data: MarketDataPoint[]; sizes: string[]; growth: string[] }) {
  return (
    <div className="flex flex-wrap gap-3 px-4 py-2.5 border border-[#ffd700]/15 rounded-sm bg-[#ffd700]/[0.02]">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="font-mono text-[7px] tracking-[0.15em] text-[#ffd700]/50 uppercase">{d.metric}</span>
          <span className="font-mono text-[11px] text-[#ffd700]">{d.value}</span>
          <span className="font-mono text-[7px] text-white/15">({d.source})</span>
        </div>
      ))}
      {sizes.map((s, i) => (
        <div key={`s-${i}`} className="font-mono text-[9px] text-[#ffd700]/60">{s}</div>
      ))}
      {growth.map((g, i) => (
        <div key={`g-${i}`} className="font-mono text-[9px] text-[#00ff88]/60">{g}</div>
      ))}
    </div>
  );
}

// ─── Expert Brief ────────────────────────────────────────────────────────────

function ExpertBriefView({ brief }: { brief: ExpertBrief }) {
  const momentumColors: Record<string, string> = {
    surging: '#00ff88', growing: '#00d4ff', stable: '#ffd700',
    emerging: '#a855f7', declining: '#ff3b30',
  };
  const riskColors: Record<string, string> = { low: '#00ff88', moderate: '#ffd700', high: '#ff3b30' };
  const mc = momentumColors[brief.market_momentum] ?? '#64748b';
  const rc = riskColors[brief.risk_level] ?? '#64748b';

  return (
    <div className="border border-[#f97316]/20 rounded-sm overflow-hidden bg-[#f97316]/[0.02]">
      <div className="px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[8px] tracking-[0.2em] text-[#f97316]/60 uppercase">Expert Brief</span>
          <div className="flex-1" />
          <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-sm border" style={{ color: mc, borderColor: `${mc}40`, background: `${mc}10` }}>
            {brief.market_momentum.toUpperCase()}
          </span>
          <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-sm border" style={{ color: rc, borderColor: `${rc}40`, background: `${rc}10` }}>
            RISK: {brief.risk_level.toUpperCase()}
          </span>
          <span className="font-mono text-[8px] text-white/20">{brief.maturity}</span>
        </div>
        <p className="font-mono text-[14px] text-white/90 leading-relaxed">{brief.headline}</p>
        {brief.key_insight && (
          <p className="font-mono text-[11px] text-[#f97316]/80 mt-1 leading-relaxed">{brief.key_insight}</p>
        )}
      </div>
      <div className="px-4 py-2.5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
        {brief.bullet_points.map((point, i) => (
          <div key={i} className="flex items-start gap-2 py-0.5">
            <span className="font-mono text-[9px] text-[#f97316]/40 shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
            <span className="font-mono text-[10px] text-white/50 leading-relaxed">{point}</span>
          </div>
        ))}
      </div>
      {/* Data depth bar */}
      <div className="px-4 py-1.5 border-t border-white/[0.03] flex items-center gap-2">
        <span className="font-mono text-[7px] text-white/15 uppercase tracking-wider">Data depth</span>
        <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden max-w-[120px]">
          <div className="h-full rounded-full transition-all" style={{ width: `${brief.data_depth}%`, background: brief.data_depth >= 70 ? '#00ff88' : brief.data_depth >= 40 ? '#ffd700' : '#ff3b30' }} />
        </div>
        <span className="font-mono text-[7px] text-white/20">{brief.data_depth}%</span>
      </div>
    </div>
  );
}

// ─── Key Players ─────────────────────────────────────────────────────────────

function KeyPlayersView({ players }: { players: KeyPlayer[] }) {
  const roleColors: Record<string, string> = {
    leader: '#00ff88', challenger: '#ffd700', emerging: '#00d4ff', niche: '#64748b',
  };

  return (
    <div className="space-y-0">
      {/* Header row */}
      <div className="flex items-center gap-3 px-2 py-1.5 border-b border-white/[0.06]">
        <span className="font-mono text-[7px] text-white/20 uppercase tracking-wider w-6">#</span>
        <span className="font-mono text-[7px] text-white/20 uppercase tracking-wider flex-1">Company</span>
        <span className="font-mono text-[7px] text-white/20 uppercase tracking-wider w-16 text-center">Role</span>
        <span className="font-mono text-[7px] text-white/20 uppercase tracking-wider w-12 text-center">Mentions</span>
        <span className="font-mono text-[7px] text-white/20 uppercase tracking-wider w-20 text-center">Momentum</span>
        <span className="font-mono text-[7px] text-white/20 uppercase tracking-wider w-32 text-right">Badges</span>
      </div>
      {players.map((p, i) => {
        const rc = roleColors[p.role] ?? '#64748b';
        const sentColor = p.sentiment === 'positive' ? '#00ff88' : p.sentiment === 'negative' ? '#ff3b30' : '#64748b';
        return (
          <div key={i} className="flex items-center gap-3 px-2 py-2 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
            <span className="font-mono text-[9px] text-white/15 w-6">{String(i + 1).padStart(2, '0')}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: sentColor, boxShadow: `0 0 4px ${sentColor}60` }} />
                <span className="font-mono text-[11px] text-white/70 truncate">{p.name}</span>
              </div>
              {p.context && <p className="font-mono text-[8px] text-white/20 truncate mt-0.5 ml-3">{p.context}</p>}
            </div>
            <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-sm w-16 text-center" style={{ color: rc, background: `${rc}15` }}>
              {p.role.toUpperCase()}
            </span>
            <span className="font-mono text-[10px] text-white/40 w-12 text-center">{p.mentions}</span>
            <div className="w-20 flex items-center gap-1">
              <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${p.momentum_score}%`, background: p.momentum_score >= 70 ? '#00ff88' : p.momentum_score >= 40 ? '#ffd700' : '#64748b' }} />
              </div>
              <span className="font-mono text-[7px] text-white/20">{p.momentum_score}</span>
            </div>
            <div className="w-32 flex flex-wrap gap-1 justify-end">
              {p.badges.map(b => {
                const bc: Record<string, string> = { PATENTED: '#a855f7', HIRING: '#00ff88', FUNDED: '#ffd700', GOV_CONTRACT: '#00d4ff' };
                return (
                  <span key={b} className="font-mono text-[6px] tracking-[0.1em] px-1 py-0.5 rounded-sm" style={{ color: bc[b] ?? '#64748b', background: `${bc[b] ?? '#64748b'}15` }}>
                    {b}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tech Landscape ─────────────────────────────────────────────────────────

function TechLandscapeView({ themes }: { themes: TechTheme[] }) {
  const maxFreq = themes[0]?.frequency ?? 1;
  const matColors: Record<string, string> = { emerging: '#a855f7', growing: '#00d4ff', mature: '#00ff88' };

  return (
    <div className="space-y-3">
      {/* Tag cloud */}
      <div className="flex flex-wrap gap-2">
        {themes.map((t) => {
          const size = 8 + Math.round((t.frequency / maxFreq) * 6);
          const mc = matColors[t.maturity] ?? '#64748b';
          return (
            <div key={t.keyword} className="group/tag relative">
              <span
                className="font-mono px-2 py-1 rounded-sm border cursor-default transition-all hover:border-white/20"
                style={{
                  fontSize: `${size}px`,
                  color: `${mc}cc`,
                  borderColor: `${mc}20`,
                  background: `${mc}08`,
                }}
              >
                {t.keyword}
                <span className="font-mono text-[7px] ml-1 opacity-40">{t.frequency}</span>
              </span>
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-0 mb-1 hidden group-hover/tag:block z-10 bg-black border border-white/10 rounded-sm px-2 py-1.5 min-w-[140px] shadow-lg">
                <span className="font-mono text-[7px] text-white/30 block">Sources: {t.sources.join(', ')}</span>
                {t.companies.length > 0 && (
                  <span className="font-mono text-[7px] text-white/30 block">Companies: {t.companies.join(', ')}</span>
                )}
                <span className="font-mono text-[7px] block" style={{ color: mc }}>{t.maturity}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Source breakdown */}
      <div className="flex items-center gap-4 pt-1">
        {['patent', 'research', 'news', 'grant'].map(src => {
          const count = themes.filter(t => t.sources.includes(src)).length;
          if (count === 0) return null;
          const colors: Record<string, string> = { patent: '#a855f7', research: '#60a5fa', news: '#f97316', grant: '#34d399' };
          return (
            <span key={src} className="font-mono text-[8px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors[src] }} />
              <span style={{ color: `${colors[src]}80` }}>{count} from {src}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Innovation Pipeline ─────────────────────────────────────────────────────

function InnovationPipelineView({ pipeline }: { pipeline: InnovationPipeline }) {
  return (
    <div className="space-y-4">
      {/* Four-stage funnel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <PipelineColumn label="RESEARCHED" color="#60a5fa" items={pipeline.researched} icon="R" />
        <PipelineColumn label="PATENTED" color="#a855f7" items={pipeline.patented} icon="P" />
        <PipelineColumn label="FUNDED" color="#34d399" items={pipeline.funded} icon="G" />
        <PipelineColumn label="CONTRACTED" color="#ffd700" items={pipeline.contracted} icon="C" />
      </div>

      {/* Flow arrows on desktop */}
      <div className="hidden md:flex items-center justify-center gap-0 -mt-2">
        {['Research', '', 'Patent', '', 'Grant', '', 'Contract'].map((label, i) =>
          label ? (
            <span key={i} className="font-mono text-[7px] text-white/10 uppercase tracking-wider">{label}</span>
          ) : (
            <span key={i} className="font-mono text-[10px] text-white/10 mx-2">→</span>
          )
        )}
      </div>

      {/* Gaps */}
      {pipeline.gaps.length > 0 && (
        <div className="p-3 bg-[#ffd700]/[0.03] border border-[#ffd700]/10 rounded-sm">
          <span className="font-mono text-[8px] tracking-[0.2em] text-[#ffd700]/50 uppercase block mb-1.5">PIPELINE GAPS DETECTED</span>
          {pipeline.gaps.map((gap, i) => (
            <p key={i} className="font-mono text-[9px] text-[#ffd700]/60 leading-relaxed py-0.5">{gap}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function PipelineColumn({ label, color, items, icon }: { label: string; color: string; items: InnovationItem[]; icon: string }) {
  return (
    <div className="border border-white/[0.06] rounded-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.04] flex items-center gap-2" style={{ background: `${color}08` }}>
        <span className="font-mono text-[10px] w-5 h-5 rounded-sm flex items-center justify-center" style={{ color, background: `${color}15` }}>{icon}</span>
        <span className="font-mono text-[8px] tracking-[0.2em] uppercase" style={{ color: `${color}80` }}>{label}</span>
        <span className="ml-auto font-mono text-[8px] text-white/20">{items.length}</span>
      </div>
      <div className="divide-y divide-white/[0.03]">
        {items.length === 0 ? (
          <div className="px-3 py-3 text-center">
            <span className="font-mono text-[8px] text-white/10">None found</span>
          </div>
        ) : items.slice(0, 5).map((item, i) => (
          <div key={i} className="px-3 py-2">
            <p className="font-mono text-[9px] text-white/50 leading-snug truncate">
              {item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-white/70 transition-colors">{item.title}</a> : item.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[7px] text-white/20 truncate">{item.entity}</span>
              {item.date && <span className="font-mono text-[7px] text-white/10">{item.date}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section 1: What It Is ──────────────────────────────────────────────────────

function WhatItIs({ data, wikipedia }: { data: WhatItIsSection; wikipedia?: WikipediaSummary | null }) {
  return (
    <div className="space-y-3">
      {wikipedia && (
        <div className="flex gap-4 p-3 bg-white/[0.02] border border-white/[0.04] rounded-sm">
          {wikipedia.thumbnail && (
            <img
              src={wikipedia.thumbnail}
              alt=""
              className="w-20 h-20 object-cover rounded-sm flex-shrink-0 border border-white/[0.06]"
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[8px] tracking-[0.2em] text-[#00d4ff]/50 uppercase">WIKIPEDIA</span>
              <a
                href={wikipedia.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[8px] text-white/20 hover:text-[#00d4ff]/60 transition-colors"
              >
                source ↗
              </a>
            </div>
            <p className="font-mono text-[12px] leading-relaxed text-white/60 line-clamp-3">{wikipedia.extract}</p>
          </div>
        </div>
      )}
      <p className="font-mono text-[13px] leading-relaxed text-white/80">{data.summary}</p>
      {data.key_points.length > 0 && (
        <ul className="space-y-1.5 pl-4">
          {data.key_points.map((point, i) => (
            <li key={i} className="font-mono text-[11px] text-white/50 list-disc">{point}</li>
          ))}
        </ul>
      )}
      {data.outlook && (
        <div className="mt-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-sm">
          <span className="font-mono text-[8px] tracking-[0.2em] text-[#f97316]/60 uppercase block mb-1">OUTLOOK</span>
          <p className="font-mono text-[11px] text-white/60 leading-relaxed">{data.outlook}</p>
        </div>
      )}
    </div>
  );
}

// ─── Section 2: Direction + Sentiment ───────────────────────────────────────

function Direction({ data }: { data: DirectionSection }) {
  const momentumColors: Record<string, string> = {
    accelerating: '#00ff88', growing: '#00d4ff', steady: '#ffd700',
    decelerating: '#f97316', declining: '#ff3b30',
  };
  const mColor = momentumColors[data.momentum] ?? '#64748b';
  const sentColors = { positive: '#00ff88', negative: '#ff3b30', neutral: '#64748b', mixed: '#ffd700' };
  const sc = sentColors[data.sentiment.overall as keyof typeof sentColors] ?? '#64748b';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <MiniStat label="Stage" value={data.adoption_label} />
        <MiniStat label="Momentum" value={data.momentum} color={mColor} />
        <MiniStat label="Sentiment" value={`${data.sentiment.overall} (${data.sentiment.positive_pct}% pos / ${data.sentiment.negative_pct}% neg)`} color={sc} />
      </div>

      {/* Sentiment bar */}
      <div className="flex h-1.5 rounded-full overflow-hidden bg-white/[0.04]">
        <div className="bg-[#00ff88]" style={{ width: `${data.sentiment.positive_pct}%` }} />
        <div className="bg-[#64748b]" style={{ width: `${data.sentiment.neutral_pct}%` }} />
        <div className="bg-[#ff3b30]" style={{ width: `${data.sentiment.negative_pct}%` }} />
      </div>

      {data.opportunities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {data.opportunities.map((opp, i) => <OpportunityCard key={i} opp={opp} />)}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[8px] tracking-[0.2em] text-white/30 uppercase">{label}</span>
      <span className="font-mono text-[11px] uppercase" style={{ color: color ?? '#fff8' }}>{value}</span>
    </div>
  );
}

function OpportunityCard({ opp }: { opp: OpportunityEntry }) {
  const c = { strong: '#00ff88', moderate: '#ffd700', emerging: '#00d4ff' }[opp.strength] ?? '#64748b';
  return (
    <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-[7px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm"
          style={{ color: c, background: `${c}15` }}>{opp.strength}</span>
        <span className="font-mono text-[11px] text-white/70">{opp.title}</span>
      </div>
      <p className="font-mono text-[9px] text-white/30 leading-relaxed">{opp.reason}</p>
    </div>
  );
}

// ─── Timeline ───────────────────────────────────────────────────────────────

function Timeline({ events }: { events: TimelineEvent[] }) {
  const now = new Date().getFullYear();

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[52px] top-0 bottom-0 w-px bg-white/[0.06]" />

      <div className="space-y-0">
        {events.map((ev, i) => {
          const year = ev.date ? new Date(ev.date).getFullYear() : null;
          const isFuture = year !== null && year > now;
          const isPresent = year !== null && year === now;
          const tc = SIGNAL_TYPE_COLORS[ev.type] ?? '#64748b';
          const dotColor = isFuture ? '#334155' : isPresent ? '#00ff88' : tc;

          return (
            <div key={i} className="flex items-start gap-4 py-2 group">
              {/* Year */}
              <span className={`font-mono text-[10px] w-12 shrink-0 text-right pt-1 tabular-nums ${isFuture ? 'text-white/15' : isPresent ? 'text-[#00ff88]' : 'text-white/30'}`}>
                {year ?? '—'}
              </span>

              {/* Dot on the line */}
              <div className="relative shrink-0 mt-1.5 z-10">
                <div className="w-2 h-2 rounded-full border" style={{
                  background: `${dotColor}30`,
                  borderColor: dotColor,
                  boxShadow: isPresent ? `0 0 6px ${dotColor}` : undefined,
                }} />
              </div>

              {/* Content */}
              <div className={`flex-1 min-w-0 pb-2 border-b border-white/[0.03] last:border-0 ${isFuture ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-mono text-[7px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border shrink-0"
                    style={{ color: tc, borderColor: `${tc}30`, background: `${tc}10` }}>
                    {ev.type.replace(/_/g, ' ')}
                  </span>
                  {isPresent && <span className="font-mono text-[7px] text-[#00ff88]/60 tracking-wider">NOW</span>}
                  {isFuture && <span className="font-mono text-[7px] text-white/20 tracking-wider">PROJECTED</span>}
                </div>
                <p className={`font-mono text-[11px] leading-snug ${isFuture ? 'text-white/40' : 'text-white/70'}`}>
                  {ev.url
                    ? <a href={ev.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#00d4ff] transition-colors">{ev.title}</a>
                    : ev.title}
                </p>
                {ev.company && <span className="font-mono text-[9px] text-[#00d4ff]/40 mt-0.5 block">{ev.company}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Costs View ─────────────────────────────────────────────────────────────

function CostsView({ data }: { data: CostsSection }) {
  const tierColors: Record<string, string> = { budget: '#00ff88', mid: '#ffd700', enterprise: '#f97316' };

  return (
    <div className="space-y-4">
      {data.ranges.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {data.ranges.map((r) => {
            const c = tierColors[r.tier] ?? '#64748b';
            return (
              <div key={r.tier} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-sm text-center">
                <span className="font-mono text-[8px] tracking-[0.2em] uppercase block mb-2" style={{ color: `${c}80` }}>{r.label}</span>
                <span className="font-mono text-lg block mb-3" style={{ color: c }}>{r.range}</span>
                <div className="space-y-1">
                  {r.products.map((name, i) => <p key={i} className="font-mono text-[9px] text-white/30 truncate">{name}</p>)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live price signals */}
      {data.price_signals.length > 0 && (
        <div>
          <span className="font-mono text-[8px] tracking-[0.15em] text-[#ffd700]/50 uppercase block mb-2">LIVE PRICE SIGNALS</span>
          <div className="flex flex-wrap gap-2">
            {data.price_signals.map((s, i) => (
              <span key={i} className="font-mono text-[9px] text-[#ffd700]/70 px-2 py-1 bg-[#ffd700]/[0.05] border border-[#ffd700]/10 rounded-sm">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Funding events */}
      {data.funding_events.length > 0 && (
        <div>
          <span className="font-mono text-[8px] tracking-[0.15em] text-[#00ff88]/50 uppercase block mb-2">RECENT FUNDING</span>
          {data.funding_events.map((f, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5 border-b border-white/[0.03] last:border-0">
              <span className="font-mono text-[10px] text-white/60">{f.company}</span>
              <span className="font-mono text-[10px] text-[#00ff88]">{f.amount}</span>
              <span className="font-mono text-[8px] text-white/20 uppercase">{f.round}</span>
              <span className="ml-auto font-mono text-[8px] text-white/15">{f.source}</span>
            </div>
          ))}
        </div>
      )}

      {data.ranges.length === 0 && data.price_signals.length === 0 && data.funding_events.length === 0 && (
        <EmptyState message="No pricing data found yet." />
      )}
    </div>
  );
}

// ─── Vendors ────────────────────────────────────────────────────────────────

function VendorGrid({ vendors, onRequestIntro, showIntro = false }: {
  vendors: AskVendor[]; onRequestIntro: (v: AskVendor) => void; showIntro?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {vendors.map((v) => <VendorCard key={v.id} vendor={v} onRequestIntro={onRequestIntro} showIntro={showIntro || v.is_local} />)}
    </div>
  );
}

function VendorCard({ vendor, onRequestIntro, showIntro }: {
  vendor: AskVendor; onRequestIntro: (v: AskVendor) => void; showIntro: boolean;
}) {
  const bc = ikerBadgeColor(vendor.iker_score);
  return (
    <div className="p-3 bg-white/[0.015] border border-white/[0.06] rounded-sm hover:border-white/[0.12] transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-sm bg-white/[0.06] flex items-center justify-center shrink-0 overflow-hidden">
          {vendor.logo_url ? (
            <img src={vendor.logo_url} alt="" className="w-7 h-7 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; const p = (e.target as HTMLImageElement).parentElement; if (p) { p.textContent = vendor.name.slice(0, 2).toUpperCase(); p.classList.add('font-mono', 'text-[10px]', 'text-white/30'); } }} />
          ) : (
            <span className="font-mono text-[10px] text-white/30">{vendor.name.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[12px] text-white/80 truncate">{vendor.name}</span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-sm shrink-0"
              style={{ color: bc, background: `${bc}15`, boxShadow: `0 0 6px ${bc}40` }}>{vendor.iker_score}</span>
            {vendor.is_hiring && <span className="font-mono text-[7px] text-[#00ff88] bg-[#00ff88]/10 px-1 rounded-sm">HIRING</span>}
            {vendor.has_recent_funding && <span className="font-mono text-[7px] text-[#ffd700] bg-[#ffd700]/10 px-1 rounded-sm">FUNDED</span>}
          </div>
          <span className="font-mono text-[8px] tracking-[0.15em] text-white/25 uppercase block mb-1">{vendor.category}</span>
          {vendor.description && <p className="font-mono text-[9px] text-white/30 leading-relaxed line-clamp-2 mb-2">{vendor.description}</p>}
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {vendor.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="font-mono text-[7px] tracking-[0.1em] text-white/20 px-1.5 py-0.5 bg-white/[0.03] rounded-sm">{tag}</span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {vendor.website && (
              <a href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                target="_blank" rel="noopener noreferrer"
                className="font-mono text-[8px] tracking-[0.1em] text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors uppercase">WEBSITE</a>
            )}
            {showIntro && (
              <button onClick={() => onRequestIntro(vendor)}
                className="font-mono text-[8px] tracking-[0.15em] text-[#f97316] hover:text-[#f97316]/80 border border-[#f97316]/30 hover:border-[#f97316]/50 px-2 py-1 rounded-sm transition-colors uppercase">REQUEST INTRO</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Signals ────────────────────────────────────────────────────────────────

function SignalList({ signals }: { signals: AskSignal[] }) {
  return (
    <div className="space-y-0">
      {signals.map((s, i) => {
        const tc = SIGNAL_TYPE_COLORS[s.type] ?? '#64748b';
        return (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.03] last:border-0">
            <div className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: s.importance >= 0.7 ? '#00ff88' : s.importance >= 0.4 ? '#ffd700' : '#64748b',
                boxShadow: s.importance >= 0.7 ? '0 0 4px #00ff88' : undefined }} />
            <span className="font-mono text-[8px] tracking-[0.1em] uppercase shrink-0 w-16" style={{ color: `${tc}80` }}>
              {s.type.replace(/_/g, ' ')}
            </span>
            <span className="font-mono text-[11px] text-white/60 truncate flex-1">
              {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#00d4ff] transition-colors">{s.title}</a> : s.title}
            </span>
            {s.source && <span className="font-mono text-[7px] text-white/15 shrink-0 max-w-[80px] truncate">{s.source}</span>}
            <span className="font-mono text-[8px] text-white/15 shrink-0 w-8 text-right">{timeAgo(s.discovered_at)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Patents ────────────────────────────────────────────────────────────────

function PatentList({ patents }: { patents: PatentResult[] }) {
  return (
    <div className="space-y-0">
      {patents.map((p, i) => (
        <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.03] last:border-0">
          <span className="font-mono text-[8px] text-[#a855f7]/50 shrink-0 w-24 truncate">{p.patentNumber}</span>
          <span className="font-mono text-[11px] text-white/60 truncate flex-1">
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#a855f7] transition-colors">{p.title}</a>
          </span>
          <span className="font-mono text-[8px] text-white/20 shrink-0 max-w-[100px] truncate">{p.assignee}</span>
          <span className="font-mono text-[8px] text-white/15 shrink-0">{p.date}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Research Papers ────────────────────────────────────────────────────────

function ResearchList({ papers }: { papers: ResearchPaper[] }) {
  return (
    <div className="space-y-0">
      {papers.map((p, i) => (
        <div key={i} className="py-2.5 border-b border-white/[0.03] last:border-0">
          <div className="flex items-start gap-3">
            <span className="font-mono text-[11px] text-white/60 flex-1">
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#60a5fa] transition-colors">{p.title}</a>
            </span>
            {p.citations > 0 && (
              <span className="font-mono text-[8px] text-[#ffd700]/50 shrink-0">{p.citations} cites</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-[8px] text-white/20">{p.authors.slice(0, 2).join(', ')}{p.authors.length > 2 ? ' et al.' : ''}</span>
            <span className="font-mono text-[8px] text-white/15">{p.source}</span>
            <span className="font-mono text-[8px] text-white/15">{p.year}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Grants ─────────────────────────────────────────────────────────────────

function GrantList({ grants }: { grants: GrantResult[] }) {
  return (
    <div className="space-y-0">
      {grants.map((g, i) => (
        <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.03] last:border-0">
          <span className="font-mono text-[11px] text-white/60 truncate flex-1">
            {g.url ? <a href={g.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#34d399] transition-colors">{g.title}</a> : g.title}
          </span>
          <span className="font-mono text-[9px] text-[#34d399] shrink-0">{g.amount}</span>
          <span className="font-mono text-[8px] text-white/20 shrink-0 max-w-[100px] truncate">{g.agency}</span>
          {g.deadline && <span className="font-mono text-[8px] text-white/15 shrink-0">{g.deadline}</span>}
        </div>
      ))}
    </div>
  );
}

// ─── Federal Contracts ─────────────────────────────────────────────────────

function ContractList({ contracts }: { contracts: FederalContract[] }) {
  return (
    <div className="space-y-0">
      {contracts.map((c, i) => (
        <div key={i} className="flex items-start gap-3 py-2.5 border-b border-white/[0.03] last:border-0">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[11px] text-white/60 truncate">
              {c.url ? (
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#ffd700] transition-colors">{c.title}</a>
              ) : c.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[8px] text-white/20">{c.agency}</span>
              {c.vendor && <span className="font-mono text-[7px] text-[#ffd700]/40 uppercase">{c.vendor}</span>}
            </div>
          </div>
          {c.amount && <span className="font-mono text-[9px] text-[#ffd700] shrink-0">{c.amount}</span>}
          {c.date && <span className="font-mono text-[8px] text-white/15 shrink-0">{c.date}</span>}
        </div>
      ))}
    </div>
  );
}

// ─── Geographic Breakdown ───────────────────────────────────────────────────

function GeoBreakdown({ data }: { data: GeographicBreakdown[] }) {
  const maxCount = data[0]?.articleCount ?? 1;
  return (
    <div className="space-y-1.5">
      {data.map((g, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-white/50 w-24 truncate">{g.country}</span>
          <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <div className="h-full bg-[#00d4ff]/60 rounded-full" style={{ width: `${(g.articleCount / maxCount) * 100}%` }} />
          </div>
          <span className="font-mono text-[8px] text-white/25 w-8 text-right">{g.percentage}%</span>
          <span className="font-mono text-[8px] text-white/15 w-6 text-right">{g.articleCount}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Products ───────────────────────────────────────────────────────────────

const CATEGORY_ACCENT: Record<string, string> = {
  cybersecurity: '#ff3b30', 'ai/ml': '#a855f7', 'ai': '#a855f7', manufacturing: '#3b82f6',
  defense: '#f97316', energy: '#00ff88', healthcare: '#00d4ff', robotics: '#3b82f6',
  logistics: '#ffd700', fintech: '#34d399', aerospace: '#60a5fa', construction: '#f97316',
  water: '#00d4ff', agriculture: '#34d399', border: '#f97316',
};

function getCategoryAccent(category: string): string {
  const key = category.toLowerCase();
  for (const [k, v] of Object.entries(CATEGORY_ACCENT)) {
    if (key.includes(k)) return v;
  }
  return '#64748b';
}

function ProductGrid({ products }: { products: AskProduct[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}

function ProductCard({ product }: { product: AskProduct }) {
  const mc = { emerging: '#00d4ff', growing: '#ffd700', mature: '#00ff88' }[product.maturity] ?? '#64748b';
  const ac = getCategoryAccent(product.category);
  const scoreColor = product.recommendation_score >= 80 ? '#00ff88' : product.recommendation_score >= 60 ? '#ffd700' : '#ff3b30';

  return (
    <div className="relative bg-white/[0.015] border border-white/[0.06] rounded-sm hover:border-white/[0.12] transition-colors overflow-hidden">
      {/* Colored left border accent */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: ac }} />

      <div className="p-3 pl-4">
        {/* Logo + name header */}
        <div className="flex items-start gap-3 mb-2">
          <div className="w-10 h-10 rounded-sm bg-white/90 flex items-center justify-center shrink-0 overflow-hidden border border-white/[0.1]">
            {product.logo_url ? (
              <img src={product.logo_url} alt="" className="w-8 h-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const par = (e.target as HTMLImageElement).parentElement;
                  if (par) {
                    par.textContent = product.company.slice(0, 2).toUpperCase();
                    par.className = 'w-10 h-10 rounded-sm bg-white/[0.06] flex items-center justify-center shrink-0 font-mono text-[10px] text-white/30';
                  }
                }} />
            ) : (
              <span className="font-mono text-[9px] text-black/40">{product.company.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-mono text-[11px] text-white/80 block truncate leading-tight">{product.name}</span>
            <span className="font-mono text-[8px] text-white/30 block truncate">{product.company}</span>
            <span className="font-mono text-[7px] tracking-[0.1em] uppercase mt-0.5 block" style={{ color: `${ac}80` }}>{product.category}</span>
          </div>
        </div>

        {/* Description */}
        <p className="font-mono text-[9px] text-white/30 leading-relaxed line-clamp-2 mb-2">{product.description}</p>

        {/* Price badge */}
        {product.price_range && (
          <div className="mb-2">
            <span className="font-mono text-[10px] text-[#ffd700] font-semibold">{product.price_range}</span>
          </div>
        )}

        {/* IKER/recommendation score bar */}
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[7px] text-white/20 uppercase tracking-wider w-10">Score</span>
          <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${product.recommendation_score}%`, background: scoreColor }} />
          </div>
          <span className="font-mono text-[8px]" style={{ color: scoreColor }}>{product.recommendation_score}</span>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-[7px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-sm" style={{ color: mc, background: `${mc}15` }}>{product.maturity}</span>
          <span className="font-mono text-[7px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-sm" style={{ color: `${ac}cc`, background: `${ac}15` }}>{product.momentum}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Alerts ─────────────────────────────────────────────────────────────────

function AlertsView({ risks, regulatory, hiring }: { risks: string[]; regulatory: string[]; hiring: string[] }) {
  return (
    <div className="space-y-3">
      {risks.length > 0 && (
        <div>
          <span className="font-mono text-[8px] tracking-[0.15em] text-[#ff3b30]/50 uppercase block mb-1.5">RISK SIGNALS</span>
          {risks.map((r, i) => (
            <p key={i} className="font-mono text-[10px] text-white/40 py-1 border-b border-white/[0.03] last:border-0">{r}</p>
          ))}
        </div>
      )}
      {regulatory.length > 0 && (
        <div>
          <span className="font-mono text-[8px] tracking-[0.15em] text-[#ffd700]/50 uppercase block mb-1.5">REGULATORY</span>
          {regulatory.map((r, i) => (
            <p key={i} className="font-mono text-[10px] text-white/40 py-1 border-b border-white/[0.03] last:border-0">{r}</p>
          ))}
        </div>
      )}
      {hiring.length > 0 && (
        <div>
          <span className="font-mono text-[8px] tracking-[0.15em] text-[#00ff88]/50 uppercase block mb-1.5">HIRING SIGNALS</span>
          {hiring.map((h, i) => (
            <p key={i} className="font-mono text-[10px] text-white/40 py-1 border-b border-white/[0.03] last:border-0">{h}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-4 text-center">
      <p className="font-mono text-[10px] text-white/20 leading-relaxed max-w-md mx-auto">{message}</p>
    </div>
  );
}

// ─── Intro Modal ────────────────────────────────────────────────────────────

function IntroModal({ vendor, onClose }: { vendor: AskVendor; onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleSend = () => {
    const subject = encodeURIComponent(`Introduction Request: ${vendor.name}`);
    const body = encodeURIComponent(`Vendor: ${vendor.name}\nCategory: ${vendor.category}\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}`);
    window.open(`mailto:info@nxtlinktech.com?subject=${subject}&body=${body}`, '_self');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md mx-4 bg-black border border-white/[0.1] rounded-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
          <div>
            <span className="font-mono text-[9px] tracking-[0.2em] text-[#f97316]/60 uppercase block">Request Intro</span>
            <span className="font-mono text-sm text-white/80">{vendor.name}</span>
          </div>
          <button onClick={onClose} className="font-mono text-[11px] text-white/30 hover:text-white/60 transition-colors">ESC</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {[
            { label: 'Your name', value: name, set: setName, type: 'text', ph: 'Jane Smith' },
            { label: 'Your email', value: email, set: setEmail, type: 'email', ph: 'jane@company.com' },
            { label: 'Your phone', value: phone, set: setPhone, type: 'tel', ph: '(915) 555-0123' },
          ].map(f => (
            <div key={f.label}>
              <label className="font-mono text-[8px] tracking-[0.2em] text-white/30 uppercase block mb-1">{f.label}</label>
              <input type={f.type} value={f.value} onChange={(e) => f.set(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-sm px-3 py-2 font-mono text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-[#f97316]/40"
                placeholder={f.ph} />
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-white/[0.06]">
          <button onClick={handleSend} disabled={!name.trim() || !email.trim()}
            className="w-full py-2 bg-[#f97316] text-black font-mono text-[10px] tracking-[0.2em] uppercase rounded-sm hover:bg-[#f97316]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity">
            SEND REQUEST
          </button>
          <p className="font-mono text-[8px] text-white/20 text-center mt-2 tracking-wide">We connect you within 24hrs.</p>
        </div>
      </div>
    </div>
  );
}
