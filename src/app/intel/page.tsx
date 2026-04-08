'use client';

import { useEffect, useMemo, useState } from 'react';
import { COLORS } from '@/lib/tokens';
import { PageTransition } from '@/components/PageTransition';

type Signal = {
  id: string;
  title: string;
  evidence: string | null;
  source: string | null;
  industry: string | null;
  importance_score: number | null;
  confidence?: number | null;
  discovered_at: string;
  url: string | null;
  signal_type: string | null;
  company: string | null;
  region?: string | null;
  source_trust?: number | null;
  evidence_quality?: number | null;
  quality_score?: number | null;
  global_significance?: number | null;
  el_paso_relevance?: number | null;
  opportunity_score?: number | null;
  urgency_score?: number | null;
  why_now?: string;
  who_it_matters_to?: string[];
  what_changed_vs_last_week?: string;
  opportunity_type?: string;
  recommended_actions?: string[];
  suggested_targets?: string[];
  local_pathway?: string;
  tracked_technologies?: string[];
  reason_for_ranking?: string[];
  confidence_explanation?: string;
};

type Tab = 'all' | 'high' | 'trending';

type BrainLearning = {
  sourceScores?: Array<{ source: string; trustScore: number; signalCount: number; duplicateRate?: number; noiseScore?: number }>;
  industryMomentum?: Array<{ name: string; momentumScore: number; signalCount: number }>;
  companyPriority?: Array<{ name: string; priorityScore: number; signalCount: number; industries: string[] }>;
  summary?: {
    strongestSource: string | null;
    hottestIndustry: string | null;
    highestPriorityCompany: string | null;
  };
};

type PipelineQuality = {
  duplicatesFiltered?: number;
  lowEvidenceDiscarded?: number;
  noisySourceSignals?: number;
  acceptedSignals?: number;
  scannedSignals?: number;
  topTrustedSources?: Array<{ source: string; trustScore: number; signalCount: number }>;
  weakestSources?: Array<{ source: string; trustScore: number; signalCount: number }>;
};

const REGIONS = [
  { value: 'ALL',           label: 'Global',    flag: '🌍' },
  { value: 'United States', label: 'US',        flag: '🇺🇸' },
  { value: 'China',         label: 'China',     flag: '🇨🇳' },
  { value: 'Europe',        label: 'Europe',    flag: '🇪🇺' },
  { value: 'Israel',        label: 'Israel',    flag: '🇮🇱' },
  { value: 'India',         label: 'India',     flag: '🇮🇳' },
  { value: 'South Korea',   label: 'Korea',     flag: '🇰🇷' },
  { value: 'Japan',         label: 'Japan',     flag: '🇯🇵' },
  { value: 'Emerging',      label: 'Emerging',  flag: '🌍' },
];

function regionFlag(region: string | null | undefined): string {
  if (!region) return '🌍';
  const r = region.toLowerCase();
  if (r.includes('united states') || r === 'us' || r.includes('north america') || r.includes('texas')) return '🇺🇸';
  if (r.includes('china') || r.includes('east asia') || r.includes('cnipa')) return '🇨🇳';
  if (r.includes('europe') || r === 'eu' || r.includes('germany') || r.includes('france') || r.includes('uk')) return '🇪🇺';
  if (r.includes('israel') || r.includes('middle east')) return '🇮🇱';
  if (r.includes('india') || r.includes('south asia')) return '🇮🇳';
  if (r.includes('south korea') || r.includes('korea') || r.includes('kipo')) return '🇰🇷';
  if (r.includes('japan') || r.includes('jpo') || r.includes('jaxa')) return '🇯🇵';
  return '🌍';
}

const INDUSTRIES = [
  { value: 'ALL',              label: 'All Sectors',     emoji: '🌐' },
  { value: 'ai-ml',            label: 'AI / ML',         emoji: '🤖' },
  { value: 'defense',          label: 'Defense',         emoji: '🛡️' },
  { value: 'cybersecurity',    label: 'Cybersecurity',   emoji: '🔐' },
  { value: 'logistics',        label: 'Logistics',       emoji: '🚚' },
  { value: 'manufacturing',    label: 'Manufacturing',   emoji: '🏭' },
  { value: 'border-tech',      label: 'Border Tech',     emoji: '🌉' },
  { value: 'energy',           label: 'Energy',          emoji: '⚡' },
  { value: 'healthcare',       label: 'Healthcare',      emoji: '🏥' },
  { value: 'space',            label: 'Space',           emoji: '🚀' },
  { value: 'finance',          label: 'Finance',         emoji: '💹' },
  { value: 'startup',          label: 'Startups',        emoji: '💡' },
  // Earth Tracker sectors
  { value: 'industrial-tech', label: 'Industrial',      emoji: '⚙️' },
  { value: 'commercial-tech', label: 'Commercial',      emoji: '🏪' },
  { value: 'semiconductor',   label: 'Semiconductors',  emoji: '💾' },
  { value: 'renewable-energy', label: 'Renewable',      emoji: '☀️' },
  { value: 'agriculture',      label: 'Agriculture',     emoji: '🌾' },
  { value: 'life-sciences',    label: 'Life Sciences',   emoji: '🧬' },
  { value: 'climate-tech',     label: 'Climate',         emoji: '🌍' },
  { value: 'quantum',          label: 'Quantum',         emoji: '⚛️' },
  { value: 'neural-tech',      label: 'Neural Tech',     emoji: '🧠' },
  { value: 'synthetic-bio',    label: 'Synth Bio',       emoji: '🔬' },
];

const SIGNAL_TYPES = [
  { value: 'ALL',              label: 'All Types' },
  { value: 'technology',       label: 'Technology' },
  { value: 'product_launch',   label: 'Product Launch' },
  { value: 'funding_round',    label: 'Funding' },
  { value: 'contract_award',   label: 'Contract' },
  { value: 'patent_filing',    label: 'Patent' },
  { value: 'market_shift',     label: 'Market Shift' },
  { value: 'direction',        label: 'Direction' },
  { value: 'partnership',      label: 'Partnership' },
];
const SCORE_FILTERS = [0, 50, 70, 85];

function sourceName(source: string | null): string {
  if (!source) return 'Unknown source';
  try {
    const hostname = new URL(source).hostname.replace('www.', '');
    const map: Record<string, string> = {
      'news.google.com': 'Google News',
      'sam.gov': 'SAM.gov',
      'grants.gov': 'Grants.gov',
      'news.ycombinator.com': 'Hacker News',
      'arxiv.org': 'arXiv',
      'patentsview.org': 'Patents',
      'federalregister.gov': 'Federal Register',
    };
    return map[hostname] || hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
  } catch {
    return source.slice(0, 28);
  }
}

function displayScore(score: number | null): number {
  if (!score) return 0;
  return Math.round(score <= 1 ? score * 100 : score);
}

function displayConfidence(score: number | null | undefined): number {
  if (!score) return 0;
  return Math.round(score <= 1 ? score * 100 : score);
}

function scoreColor(display: number): string {
  if (display >= 85) return COLORS.green;
  if (display >= 70) return COLORS.accent;
  if (display >= 50) return COLORS.amber;
  return COLORS.muted;
}

function trustLabel(score: number, confidence: number, signal: Signal): string {
  let value = score * 0.5 + confidence * 0.35;
  if (signal.source) value += 8;
  if (signal.evidence) value += 7;
  if (signal.company) value += 5;
  if (value >= 82) return 'High trust';
  if (value >= 62) return 'Medium trust';
  return 'Early signal';
}

function relTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function signalTypeColor(type: string | null): string {
  if (!type) return COLORS.muted;
  const map: Record<string, string> = {
    contract_award: COLORS.green,
    funding_round: '#a855f7',
    patent_filing: COLORS.cyan,
    partnership: COLORS.amber,
    product_launch: COLORS.orange,
    regulation: COLORS.red,
    market_expansion: COLORS.emerald,
  };
  return map[type] || COLORS.muted;
}

function trustReason(signal: Signal): string {
  const parts: string[] = [];
  if (signal.source) parts.push('named source');
  if (signal.evidence) parts.push('supporting evidence');
  if (signal.company) parts.push('company attached');
  if (parts.length === 0) return 'limited context so far';
  return parts.join(', ');
}

function scorePercent(score: number | null | undefined): number {
  if (!score) return 0;
  return Math.round(score <= 1 ? score * 100 : score);
}

export default function IntelPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [highCount, setHighCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [industry, setIndustry] = useState('ALL');
  const [region, setRegion] = useState('ALL');
  const [signalType, setSignalType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [page, setPage] = useState(0);
  const [learning, setLearning] = useState<BrainLearning | null>(null);
  const [pipeline, setPipeline] = useState<PipelineQuality | null>(null);
  const PAGE_SIZE = 25;

  useEffect(() => {
    let ignore = false;

    async function load(reset: boolean) {
      const nextPage = reset ? 0 : page;
      if (reset) setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          tab,
          industry,
          signal_type: signalType,
          q: search,
          page: String(nextPage),
          page_size: String(PAGE_SIZE),
          min_score: String(minScore),
        });
        if (region !== 'ALL') params.set('region', region);
        const response = await fetch(`/api/intel/feed?${params.toString()}`);
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const json = await response.json();
        if (ignore) return;
        setSignals((current) => (reset ? (json.signals ?? []) : [...current, ...(json.signals ?? [])]));
        setTotalCount(json.totalCount ?? 0);
        setHighCount(json.highCount ?? 0);
        setFilteredCount(json.filteredCount ?? 0);
        if (reset) setPipeline(json.pipeline ?? null);
      } catch (fetchError) {
        if (!ignore) {
          console.error('[intel] fetch error:', fetchError);
          setError('Failed to load signals');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load(page === 0);
    return () => {
      ignore = true;
    };
  }, [tab, industry, region, signalType, search, minScore, page]);

  useEffect(() => {
    let ignore = false;

    async function loadLearning() {
      try {
        const response = await fetch('/api/brain/sync?limit=120');
        if (!response.ok) return;
        const json = await response.json();
        if (ignore) return;
        setLearning(json.learning ?? null);
        setPipeline((current) => current ?? json.pipeline ?? null);
      } catch {}
    }

    loadLearning();
    return () => {
      ignore = true;
    };
  }, []);

  const topIndustry = useMemo(() => {
    const counts = new Map<string, number>();
    for (const signal of signals) {
      const key = signal.industry ?? 'unknown';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none';
  }, [signals]);

  const averageScore = useMemo(() => {
    if (signals.length === 0) return 0;
    const total = signals.reduce((sum, signal) => sum + displayScore(signal.importance_score), 0);
    return Math.round(total / signals.length);
  }, [signals]);

  const confidenceCoverage = useMemo(() => {
    if (signals.length === 0) return 0;
    const covered = signals.filter((signal) => (signal.confidence ?? 0) > 0).length;
    return Math.round((covered / signals.length) * 100);
  }, [signals]);

  return (
    <PageTransition>
    <div className="min-h-screen bg-nxt-bg">
      <div className="mx-auto max-w-[1120px] px-6 py-10 pb-20">
        <section className="slide-up mb-8 border-b border-[rgba(138,160,255,0.12)] pb-8">
          <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="p-0">
            <p className="section-kicker mb-3">Signal Desk</p>
            <h1 className="max-w-[820px] text-[clamp(2.8rem,6vw,5.4rem)] font-bold leading-[0.95] tracking-[-0.04em] text-nxt-text">
              Filter the noise.
              <br />
              Rank the movement.
              <br />
              Read the signal faster.
            </h1>
            <p className="mt-5 max-w-[700px] text-base leading-8 text-nxt-secondary">
              This feed now answers the El Paso question directly: what matters, who it matters to,
              why it matters now, and what teams should do next.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setPage(0);
                  setTab('high');
                }}
                className="rounded-full border border-[rgba(39,209,127,0.24)] bg-[rgba(14,39,30,0.72)] px-3 py-1.5 text-xs font-medium text-nxt-green transition-colors duration-200"
              >
                Highest-priority first
              </button>
              <button
                onClick={() => {
                  setPage(0);
                  setMinScore(70);
                }}
                className="rounded-full border border-nxt-border bg-nxt-surface px-3 py-1.5 text-xs font-medium text-nxt-secondary transition-colors duration-200"
              >
                Show stronger evidence only
              </button>
            </div>
          </div>

          <div className="grid gap-px overflow-hidden border border-[rgba(138,160,255,0.12)] bg-[rgba(138,160,255,0.12)] sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: 'Visible signals', value: filteredCount, hint: `${totalCount.toLocaleString()} total tracked` },
              { label: 'Average priority', value: averageScore, hint: `top industry: ${topIndustry.replace(/-/g, ' ')}` },
              { label: 'Confidence coverage', value: `${confidenceCoverage}%`, hint: `${highCount.toLocaleString()} high-priority signals` },
            ].map((item) => (
              <div key={item.label} className="bg-[rgba(10,13,22,0.96)] p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-nxt-dim">{item.label}</div>
                <div className="mt-2 text-2xl font-mono font-bold text-nxt-text">{item.value}</div>
                <div className="mt-1 text-xs text-nxt-muted">{item.hint}</div>
              </div>
            ))}
          </div>
          </div>
        </section>

        <section className="mb-6 rounded-[24px] border border-nxt-border bg-nxt-surface/80 p-4">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search company, source, headline, or evidence"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      setPage(0);
                      setSearch(searchInput.trim());
                    }
                  }}
                  className="flex-1 rounded-xl border border-nxt-border bg-[rgba(7,10,18,0.9)] px-4 py-3 text-sm text-nxt-text placeholder:text-nxt-dim focus:border-nxt-accent/40 focus:outline-none"
                />
                <button
                  onClick={() => {
                    setPage(0);
                    setSearch(searchInput.trim());
                  }}
                  className="rounded-xl bg-nxt-accent px-4 py-3 text-sm font-semibold text-white transition-colors duration-200"
                >
                  Apply
                </button>
                <button
                  onClick={() => {
                    setPage(0);
                    setSearch('');
                    setSearchInput('');
                    setIndustry('ALL');
                    setRegion('ALL');
                    setSignalType('ALL');
                    setMinScore(0);
                    setTab('all');
                  }}
                  className="rounded-xl border border-nxt-border bg-nxt-card px-4 py-3 text-sm text-nxt-muted transition-colors duration-200"
                >
                  Reset
                </button>
              </div>

              {/* Region filter row */}
              <div className="flex flex-wrap gap-1.5">
                <span className="self-center text-[10px] uppercase tracking-[0.14em] text-nxt-dim pr-1">Region</span>
                {REGIONS.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setPage(0);
                      setRegion(item.value);
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      region === item.value
                        ? 'border-[#0EA5E9]/20 bg-[#0EA5E9]/10 text-[#38bdf8]'
                        : 'border-nxt-border text-nxt-muted'
                    }`}
                  >
                    {item.flag} {item.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(['all', 'high', 'trending'] as Tab[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setPage(0);
                      setTab(item);
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      tab === item
                        ? 'bg-nxt-elevated text-nxt-text shadow-[inset_0_0_0_1px_rgba(138,160,255,0.14)]'
                        : 'border border-nxt-border text-nxt-muted'
                    }`}
                  >
                    {item === 'all' ? 'All signals' : item === 'high' ? 'High priority' : 'Trending'}
                  </button>
                ))}
                {INDUSTRIES.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setPage(0);
                      setIndustry(item.value);
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      industry === item.value
                        ? 'border-nxt-accent/20 bg-nxt-accent/10 text-nxt-accent-light'
                        : 'border-nxt-border text-nxt-muted'
                    }`}
                  >
                    <span className="mr-1">{item.emoji}</span>{item.label}
                  </button>
                ))}
                <div className="w-px h-4 bg-nxt-border mx-1 self-center" />
                {SIGNAL_TYPES.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setPage(0);
                      setSignalType(item.value);
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      signalType === item.value
                        ? 'border-purple-500/20 bg-purple-500/10 text-purple-300'
                        : 'border-nxt-border text-nxt-muted'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[18px] border border-[rgba(138,160,255,0.12)] bg-[rgba(9,13,22,0.86)] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-nxt-dim">Trust guide</div>
              <div className="mt-3 space-y-3 text-sm text-nxt-secondary">
                <p>Priority score measures potential importance. Confidence measures how solid the evidence looks.</p>
                <p>The strongest signals usually have a named source, supporting evidence, and a company attached.</p>
                <div className="flex flex-wrap gap-2">
                  {SCORE_FILTERS.map((value) => (
                    <button
                      key={value}
                      onClick={() => {
                        setPage(0);
                        setMinScore(value);
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-mono ${
                        minScore === value ? 'bg-nxt-accent/15 text-nxt-accent-light' : 'bg-nxt-card text-nxt-muted'
                      }`}
                    >
                      {value === 0 ? 'all scores' : `${value}+ only`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-nxt-accent/5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-nxt-dim">Brain read</div>
            <div className="mt-3 space-y-3 text-sm text-nxt-secondary">
              <div>
                Hottest industry
                <div className="mt-1 text-base font-semibold text-nxt-text">{learning?.summary?.hottestIndustry ?? 'Loading...'}</div>
              </div>
              <div>
                Top company
                <div className="mt-1 text-base font-semibold text-nxt-text">{learning?.summary?.highestPriorityCompany ?? 'Loading...'}</div>
              </div>
              <div>
                Strongest source
                <div className="mt-1 text-sm font-semibold text-nxt-text break-all">{sourceName(learning?.summary?.strongestSource ?? null)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-nxt-accent/5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.18em] text-nxt-dim">Top industries</div>
              <div className="text-[11px] font-mono text-nxt-dim">brain momentum</div>
            </div>
            <div className="space-y-2">
              {(learning?.industryMomentum ?? []).slice(0, 4).map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-3 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]">
                  <div>
                    <div className="text-sm font-medium text-nxt-text">{item.name}</div>
                    <div className="text-[11px] text-nxt-dim">{item.signalCount} signals</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono font-bold text-nxt-text">{Math.round(item.momentumScore * 100)}</div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-nxt-dim">score</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-nxt-accent/5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.18em] text-nxt-dim">Top sources</div>
              <div className="text-[11px] font-mono text-nxt-dim">trust score</div>
            </div>
            <div className="space-y-2">
              {(learning?.sourceScores ?? []).slice(0, 4).map((item) => (
                <div key={item.source} className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-3 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]">
                  <div>
                    <div className="text-sm font-medium text-nxt-text">{sourceName(item.source)}</div>
                    <div className="text-[11px] text-nxt-dim">{item.signalCount} signals</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono font-bold text-nxt-text">{Math.round(item.trustScore * 100)}</div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-nxt-dim">trust</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-nxt-accent/5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-nxt-dim">Pipeline quality</div>
            <div className="mt-3 space-y-3 text-sm text-nxt-secondary">
              <div>Duplicates filtered: <span className="font-semibold text-nxt-text">{pipeline?.duplicatesFiltered ?? 0}</span></div>
              <div>Low evidence discarded: <span className="font-semibold text-nxt-text">{pipeline?.lowEvidenceDiscarded ?? 0}</span></div>
              <div>Noisy source signals: <span className="font-semibold text-nxt-text">{pipeline?.noisySourceSignals ?? 0}</span></div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-nxt-accent/5">
            <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-nxt-dim">Weakest sources</div>
            <div className="space-y-2">
              {(pipeline?.weakestSources ?? []).slice(0, 3).map((item) => (
                <div key={item.source} className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-3 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]">
                  <div className="text-sm font-medium text-nxt-text">{sourceName(item.source)}</div>
                  <div className="text-sm font-mono text-nxt-muted">{Math.round(item.trustScore * 100)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-nxt-accent/5">
            <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-nxt-dim">Intake health</div>
            <div className="space-y-2 text-sm text-nxt-secondary">
              <div>Accepted signals: <span className="font-semibold text-nxt-text">{pipeline?.acceptedSignals ?? filteredCount}</span></div>
              <div>Raw scanned: <span className="font-semibold text-nxt-text">{pipeline?.scannedSignals ?? totalCount}</span></div>
              <div>Best source: <span className="font-semibold text-nxt-text">{sourceName(pipeline?.topTrustedSources?.[0]?.source ?? null)}</span></div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {loading && signals.length === 0 ? (
            <div className="py-20">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="mb-3 rounded-[22px] border border-nxt-border bg-nxt-surface p-5">
                  <div className="mb-3 h-3 w-48 rounded bg-nxt-card shimmer" />
                  <div className="mb-2 h-4 w-full rounded bg-nxt-card shimmer" />
                  <div className="h-4 w-2/3 rounded bg-nxt-card shimmer" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <div className="text-sm text-nxt-red">{error}</div>
              <button
                onClick={() => setPage(0)}
                className="rounded-lg border border-nxt-accent/20 px-5 py-2 text-sm font-medium text-nxt-accent-light transition-colors duration-200"
              >
                Retry
              </button>
            </div>
          ) : signals.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-sm text-nxt-dim">
              No signals found for this filter.
            </div>
          ) : (
            signals.map((signal) => {
              const score = displayScore(signal.importance_score);
              const confidence = displayConfidence(signal.confidence);
              const accent = signalTypeColor(signal.signal_type);
              const label = trustLabel(score, confidence, signal);

              return (
                <a
                  key={signal.id}
                  href={signal.url ?? '#'}
                  target={signal.url ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="block rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-nxt-accent/5"
                  style={{ borderLeftWidth: 3, borderLeftColor: accent }}
                >
                  <div className="grid gap-4 lg:grid-cols-[76px_1fr_210px]">
                    <div className="flex gap-3 lg:block">
                      <div
                        className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl border"
                        style={{ color: scoreColor(score), background: `${scoreColor(score)}14`, borderColor: `${scoreColor(score)}24` }}
                      >
                        <span className="text-lg font-bold font-mono">{score}</span>
                        <span className="text-[9px] uppercase tracking-[0.18em]">Priority</span>
                      </div>
                      <div
                        className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl border"
                        style={{ color: scoreColor(confidence), background: `${scoreColor(confidence)}10`, borderColor: `${scoreColor(confidence)}20` }}
                      >
                        <span className="text-lg font-bold font-mono">{confidence}</span>
                        <span className="text-[9px] uppercase tracking-[0.18em]">Conf</span>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {signal.industry && (
                          <span className="rounded-full border border-nxt-border bg-nxt-card px-2.5 py-1 text-[11px] text-nxt-secondary">
                            {signal.industry.replace(/-/g, ' ')}
                          </span>
                        )}
                        {signal.signal_type && (
                          <span className="rounded-full px-2.5 py-1 text-[11px]" style={{ background: `${accent}16`, color: accent }}>
                            {signal.signal_type.replace(/_/g, ' ')}
                          </span>
                        )}
                        <span className="text-[11px] text-nxt-dim">{sourceName(signal.source)}</span>
                        {signal.region && (
                          <span className="text-sm" title={signal.region}>{regionFlag(signal.region)}</span>
                        )}
                        <span className="ml-auto text-[11px] font-mono text-nxt-dim">{relTime(signal.discovered_at)}</span>
                      </div>

                      <div className="text-[16px] font-medium leading-snug text-nxt-text">{signal.title}</div>

                      {signal.evidence && (
                        <p className="mt-2 text-[13px] leading-6 text-nxt-muted">{signal.evidence}</p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {signal.company && (
                          <span className="rounded-full bg-nxt-accent/10 px-2.5 py-1 text-[11px] text-nxt-accent-light">
                            {signal.company}
                          </span>
                        )}
                        <span className="rounded-full bg-nxt-card px-2.5 py-1 text-[11px] text-nxt-secondary">
                          Source trust {displayConfidence(signal.source_trust)}
                        </span>
                        <span className="rounded-full bg-nxt-card px-2.5 py-1 text-[11px] text-nxt-secondary">
                          Evidence {displayConfidence(signal.evidence_quality)}
                        </span>
                        <span className="text-[11px] text-nxt-dim">Trust basis: {trustReason(signal)}</span>
                      </div>

                      <div className="mt-4 grid gap-2 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-3 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]">
                          <div className="text-[10px] uppercase tracking-[0.16em] text-nxt-dim">El Paso relevance</div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="text-base font-semibold text-nxt-text">{scorePercent(signal.el_paso_relevance)}</div>
                            <div className="text-[11px] text-nxt-dim">opportunity {scorePercent(signal.opportunity_score)}</div>
                          </div>
                          <p className="mt-2 text-[11px] leading-5 text-nxt-secondary">
                            {signal.local_pathway ?? 'Local pathway still being determined.'}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-3 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]">
                          <div className="text-[10px] uppercase tracking-[0.16em] text-nxt-dim">Why now</div>
                          <div className="mt-2 text-[12px] leading-5 text-nxt-secondary">
                            {signal.why_now ?? 'This is still an early read.'}
                          </div>
                          <div className="mt-2 text-[11px] text-nxt-dim">
                            Urgency {scorePercent(signal.urgency_score)} | Global {scorePercent(signal.global_significance)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {(signal.recommended_actions ?? []).slice(0, 3).map((action) => (
                          <span key={action} className="rounded-full border border-[rgba(39,209,127,0.16)] bg-[rgba(12,30,23,0.4)] px-2.5 py-1 text-[11px] text-nxt-green">
                            {action.replace(/-/g, ' ')}
                          </span>
                        ))}
                        {(signal.tracked_technologies ?? []).slice(0, 3).map((technology) => (
                          <span key={technology} className="rounded-full bg-nxt-card px-2.5 py-1 text-[11px] text-nxt-secondary">
                            {technology}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[18px] border border-[rgba(138,160,255,0.12)] bg-[rgba(9,13,22,0.86)] p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-nxt-dim">Decision read</div>
                      <div className="mt-2 text-sm font-semibold text-nxt-text">{label}</div>
                      <p className="mt-2 text-xs leading-6 text-nxt-secondary">
                        {label === 'High trust'
                          ? 'Ready to brief or route to a team without much extra cleanup.'
                          : label === 'Medium trust'
                            ? 'Strong enough to watch closely, but still benefits from follow-up.'
                            : 'Useful as an early indicator, not as a finished decision by itself.'}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-nxt-dim">
                        <span>Why this matters</span>
                        <span className="font-mono">{Math.max(score, confidence)} / 100</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-nxt-card">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.max(score, confidence)}%`, background: accent }}
                        />
                      </div>
                      <div className="mt-3 space-y-2 text-[11px] leading-5 text-nxt-secondary">
                        <div>{signal.confidence_explanation ?? 'Confidence is based on source and evidence quality.'}</div>
                        {signal.what_changed_vs_last_week && (
                          <div className="text-nxt-muted">{signal.what_changed_vs_last_week}</div>
                        )}
                        {(signal.suggested_targets ?? []).length > 0 && (
                          <div>
                            <span className="text-nxt-dim">Targets:</span>{' '}
                            {(signal.suggested_targets ?? []).slice(0, 3).join(', ')}
                          </div>
                        )}
                        {(signal.who_it_matters_to ?? []).length > 0 && (
                          <div>
                            <span className="text-nxt-dim">For:</span>{' '}
                            {(signal.who_it_matters_to ?? []).slice(0, 3).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              );
            })
          )}
        </section>

        {signals.length > 0 && signals.length < filteredCount && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setPage((current) => current + 1)}
              disabled={loading}
              className="rounded-xl border border-nxt-border px-6 py-2.5 text-sm font-medium text-nxt-secondary transition-colors duration-200 hover:border-nxt-accent/20 hover:text-nxt-text hover:bg-nxt-surface"
            >
              {loading ? 'Loading...' : 'Load more signals'}
            </button>
          </div>
        )}
      </div>
    </div>
    </PageTransition>
  );
}
