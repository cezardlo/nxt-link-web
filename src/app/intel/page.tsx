'use client';

import { useState, useEffect, useCallback } from 'react';
import { COLORS } from '@/lib/tokens';

/* --- Types --- */
type Signal = {
  id: string;
  title: string;
  evidence: string | null;
  source: string | null;
  industry: string | null;
  importance_score: number | null;
  discovered_at: string;
  url: string | null;
  signal_type: string | null;
  company: string | null;
};

type Tab = 'all' | 'high' | 'trending';

const INDUSTRIES = [
  'ALL', 'manufacturing', 'logistics', 'cybersecurity', 'defense',
  'ai-ml', 'energy', 'border-tech', 'healthcare',
  'government', 'education', 'general',
];

function sourceName(source: string | null): string {
  if (!source) return '';
  try {
    const hostname = new URL(source).hostname.replace('www.', '');
    const map: Record<string, string> = {
      'news.google.com': 'Google News',
      'sam.gov': 'SAM.gov',
      'grants.gov': 'Grants.gov',
      'news.ycombinator.com': 'Hacker News',
      'arxiv.org': 'arXiv',
      'patentsview.org': 'Patents',
      'federalregister.gov': 'Fed Register',
    };
    return map[hostname] || hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
  } catch {
    return source.slice(0, 20);
  }
}

function displayScore(score: number | null): number {
  if (!score) return 0;
  return Math.round(score <= 1 ? score * 100 : score);
}

function scoreColor(display: number): string {
  if (display >= 75) return COLORS.accent;
  if (display >= 50) return COLORS.amber;
  return COLORS.dim;
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

export default function IntelPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [highCount, setHighCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [industry, setIndustry] = useState('ALL');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const fetchSignals = useCallback(async (reset = false) => {
    const currentPage = reset ? 0 : page;
    setError(null);
    try {
      const params = new URLSearchParams({ tab, industry, page: String(currentPage), page_size: String(PAGE_SIZE) });
      const res = await fetch(`/api/intel/feed?${params}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      if (reset || currentPage === 0) {
        setSignals(json.signals ?? []);
      } else {
        setSignals((prev) => [...prev, ...(json.signals ?? [])]);
      }
      setTotalCount(json.totalCount ?? 0);
      setHighCount(json.highCount ?? 0);
      setFilteredCount(json.filteredCount ?? 0);
    } catch (err) {
      console.error('[intel] fetch error:', err);
      setError('Failed to load signals');
    } finally {
      setLoading(false);
    }
  }, [tab, industry, page]);

  useEffect(() => {
    setPage(0);
    setLoading(true);
    fetchSignals(true);
  }, [tab, industry]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (page > 0) fetchSignals();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen">
      <div className="max-w-[900px] mx-auto px-6 py-10 pb-20">

        {/* Header */}
        <div className="mb-8 slide-up">
          <h1 className="text-xl font-semibold text-nxt-text mb-1">Signal Feed</h1>
          <p className="text-sm text-nxt-muted">
            Real-time intelligence -- {totalCount.toLocaleString()} signals tracked, ranked by importance.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 p-1 bg-nxt-surface rounded-lg border border-nxt-border w-fit">
          {([
            { key: 'all' as Tab, label: 'All Signals', count: totalCount },
            { key: 'high' as Tab, label: 'High Priority', count: highCount },
            { key: 'trending' as Tab, label: 'Trending', count: null },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-[13px] font-medium px-4 py-1.5 rounded-md transition-all duration-150 ${
                tab === t.key
                  ? 'bg-nxt-elevated text-nxt-text'
                  : 'text-nxt-muted hover:text-nxt-secondary'
              }`}
            >
              {t.label}
              {t.count !== null && (
                <span className="ml-1.5 text-[11px] text-nxt-dim font-mono">{t.count.toLocaleString()}</span>
              )}
            </button>
          ))}
        </div>

        {/* Industry Filter Pills */}
        <div className="flex items-center gap-1.5 mb-6 flex-wrap">
          {INDUSTRIES.map((ind) => (
            <button
              key={ind}
              onClick={() => setIndustry(ind)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-150 border ${
                industry === ind
                  ? 'bg-nxt-accent/10 text-nxt-accent-light border-nxt-accent/20'
                  : 'text-nxt-muted border-nxt-border hover:text-nxt-secondary hover:border-nxt-border'
              }`}
            >
              {ind === 'ALL' ? 'All' : ind.replace(/-/g, ' ')}
            </button>
          ))}
        </div>

        {/* Signal Feed */}
        <div className="space-y-2">
          {loading && signals.length === 0 ? (
            <div className="py-20">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-nxt-surface border border-nxt-border rounded-nxt-md p-5 mb-3">
                  <div className="h-3 w-48 rounded bg-nxt-card shimmer mb-3" />
                  <div className="h-4 w-full rounded bg-nxt-card shimmer mb-2" />
                  <div className="h-4 w-2/3 rounded bg-nxt-card shimmer" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="text-sm text-nxt-red">{error}</div>
              <button
                onClick={() => { setLoading(true); fetchSignals(true); }}
                className="text-sm font-medium px-5 py-2 rounded-lg border border-nxt-accent/20 text-nxt-accent-light hover:bg-nxt-accent/5 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : signals.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <span className="text-sm text-nxt-dim">No signals found for this filter</span>
            </div>
          ) : (
            signals.map((signal) => {
              const score = displayScore(signal.importance_score);
              const sColor = scoreColor(score);
              return (
                <a
                  key={signal.id}
                  href={signal.url ?? '#'}
                  target={signal.url ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="block bg-nxt-surface border border-nxt-border rounded-nxt-md p-5 card-hover"
                >
                  <div className="flex gap-4">
                    {/* Score */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center font-mono text-sm font-semibold"
                        style={{ color: sColor, background: sColor + '12', border: `1px solid ${sColor}20` }}
                      >
                        {score}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Meta */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {signal.industry && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-nxt-card border border-nxt-border-subtle text-nxt-secondary">
                            {signal.industry.replace(/-/g, ' ')}
                          </span>
                        )}
                        {signal.signal_type && (
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-md"
                            style={{ background: signalTypeColor(signal.signal_type) + '12', color: signalTypeColor(signal.signal_type) }}
                          >
                            {signal.signal_type.replace(/_/g, ' ')}
                          </span>
                        )}
                        {signal.source && (
                          <span className="text-[11px] text-nxt-dim">{sourceName(signal.source)}</span>
                        )}
                        <span className="text-[11px] font-mono text-nxt-dim ml-auto">{relTime(signal.discovered_at)}</span>
                      </div>

                      {/* Title */}
                      <div className="text-[15px] font-medium leading-snug text-nxt-text mb-1.5">
                        {signal.title}
                      </div>

                      {/* Evidence */}
                      {signal.evidence && (
                        <div className="text-[13px] leading-relaxed text-nxt-muted line-clamp-2">
                          {signal.evidence}
                        </div>
                      )}

                      {/* Company */}
                      {signal.company && (
                        <div className="mt-2">
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-nxt-accent/8 text-nxt-accent-light">
                            {signal.company}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              );
            })
          )}
        </div>

        {/* Load More */}
        {signals.length > 0 && signals.length < filteredCount && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={loading}
              className="text-sm font-medium px-6 py-2.5 rounded-lg border border-nxt-border text-nxt-secondary hover:text-nxt-text hover:border-nxt-accent/20 transition-all"
            >
              {loading ? 'Loading...' : 'Load more signals'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
                    }
