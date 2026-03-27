'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { COLORS } from '@/lib/tokens';

/* \u2500\u2500\u2500 Types \u2500\u2500\u2500 */
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

/* \u2500\u2500\u2500 Industry filter list \u2500\u2500\u2500 */
const INDUSTRIES = [
  'ALL', 'manufacturing', 'logistics', 'cybersecurity', 'defense',
  'ai-ml', 'energy', 'border-tech', 'healthcare',
  'government', 'education', 'general',
];

/* \u2500\u2500\u2500 Extract source display name \u2500\u2500\u2500 */
function sourceName(source: string | null): string {
  if (!source) return '';
  try {
    const hostname = new URL(source).hostname.replace('www.', '');
    const map: Record<string, string> = {
      'news.google.com': 'GOOGLE NEWS',
      'sam.gov': 'SAM.GOV',
      'grants.gov': 'GRANTS.GOV',
      'news.ycombinator.com': 'HACKER NEWS',
      'arxiv.org': 'ARXIV',
      'patentsview.org': 'PATENTS',
      'federalregister.gov': 'FED REGISTER',
    };
    return map[hostname] || hostname.split('.')[0].toUpperCase();
  } catch {
    return source.toUpperCase().slice(0, 20);
  }
}

/* \u2500\u2500\u2500 Score display (handles both 0-1 and 0-100 scales) \u2500\u2500\u2500 */
function displayScore(score: number | null): number {
  if (!score) return 0;
  return Math.round(score <= 1 ? score * 100 : score);
}

function scoreClass(display: number): { color: string; borderColor: string } {
  if (display >= 75) return { color: COLORS.accent, borderColor: `${COLORS.accent}66` };
  if (display >= 50) return { color: '#eab308', borderColor: 'rgba(234,179,8,0.3)' };
  return { color: COLORS.dim, borderColor: COLORS.border };
}

/* \u2500\u2500\u2500 Relative time helper \u2500\u2500\u2500 */
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
      const params = new URLSearchParams({
        tab,
        industry,
        page: String(currentPage),
        page_size: String(PAGE_SIZE),
      });

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
      setError('Failed to load signals. Tap to retry.');
    } finally {
      setLoading(false);
    }
  }, [tab, industry, page]);

  // Re-fetch when tab/industry changes
  useEffect(() => {
    setPage(0);
    setLoading(true);
    fetchSignals(true);
  }, [tab, industry]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch more when page changes (but not on reset)
  useEffect(() => {
    if (page > 0) fetchSignals();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen" style={{ background: COLORS.bg }}>
      {/* Top Bar */}
      <header
        className="fixed top-0 left-0 right-0 h-[52px] flex items-center justify-between px-6 z-[100]"
        style={{
          background: `${COLORS.bg}bf`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${COLORS.accent}0f`,
        }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="font-mono text-[15px] font-semibold tracking-[0.12em] text-white">
            NXT<span style={{ color: COLORS.accent }}>{'//'}
            </span>LINK
          </Link>
          <span className="font-mono text-[11px] font-medium tracking-[0.12em] uppercase" style={{ color: COLORS.dim }}>
            Intel Feed
          </span>
        </div>
        <div className="flex items-center gap-3.5">
          <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em]" style={{ color: '#22c55e' }}>
            <span className="w-[5px] h-[5px] rounded-full bg-green-500 animate-pulse" />
            LIVE
          </span>
          <span className="font-mono text-[10px]" style={{ color: COLORS.dim }}>
            {totalCount.toLocaleString()} signals
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-[72px] pb-[100px] px-6 max-w-[900px] mx-auto">
        <div className="mb-8">
          <h1 className="font-mono text-[28px] font-bold tracking-wide text-white mb-1.5">
            LIVE <span style={{ color: COLORS.accent }}>SIGNALS</span>
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: COLORS.muted }}>
            Real-time intelligence feed — ranked by importance score, filtered by industry.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 mb-6" style={{ borderBottom: `1px solid ${COLORS.accent}0f` }}>
          {([
            { key: 'all' as Tab, label: 'ALL SIGNALS', count: totalCount },
            { key: 'high' as Tab, label: 'HIGH PRIORITY', count: highCount },
            { key: 'trending' as Tab, label: 'TRENDING', count: null },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="font-mono text-xs font-medium tracking-wide px-5 py-3 transition-colors"
              style={{
                color: tab === t.key ? COLORS.accent : COLORS.dim,
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${tab === t.key ? COLORS.accent : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              {t.label}
              {t.count !== null && (
                <span className="ml-1.5 text-[10px]" style={{ color: COLORS.border }}>
                  {t.count.toLocaleString()}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Industry Filter Pills */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {INDUSTRIES.map((ind) => (
            <button
              key={ind}
              onClick={() => setIndustry(ind)}
              className="font-mono text-[10px] font-medium tracking-wide px-3.5 py-1.5 rounded-[20px] transition-colors cursor-pointer"
              style={{
                border: `1px solid ${industry === ind ? `${COLORS.accent}4d` : `${COLORS.accent}1a`}`,
                background: industry === ind ? `${COLORS.accent}14` : 'transparent',
                color: industry === ind ? COLORS.accent : COLORS.muted,
              }}
            >
              {ind === 'ALL' ? 'ALL' : ind.replace(/-/g, ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {/* Signal Feed */}
        <div className="flex flex-col gap-2">
          {loading && signals.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <span className="font-mono text-xs tracking-wider animate-pulse" style={{ color: COLORS.dim }}>
                LOADING SIGNALS...
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <span className="font-mono text-xs tracking-wider" style={{ color: COLORS.red }}>
                {error}
              </span>
              <button
                onClick={() => { setLoading(true); fetchSignals(true); }}
                className="font-mono text-[11px] tracking-[0.1em] px-6 py-2 rounded-[10px] cursor-pointer transition-colors"
                style={{
                  border: `1px solid ${COLORS.accent}26`,
                  background: 'transparent',
                  color: COLORS.accent,
                }}
              >
                RETRY
              </button>
            </div>
          ) : signals.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <span className="font-mono text-xs tracking-wider" style={{ color: COLORS.dim }}>
                NO SIGNALS FOUND
              </span>
            </div>
          ) : (
            signals.map((signal) => {
              const score = displayScore(signal.importance_score);
              const sc = scoreClass(score);
              return (
                <a
                  key={signal.id}
                  href={signal.url ?? '#'}
                  target={signal.url ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="flex gap-4 p-4 rounded-[14px] transition-all duration-200 group"
                  style={{
                    background: 'rgba(8, 12, 20, 0.4)',
                    border: `1px solid ${COLORS.accent}0a`,
                  }}
                >
                  {/* Score ring */}
                  <div className="flex flex-col items-center gap-1 min-w-[44px]">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-mono text-sm font-semibold"
                      style={{ color: sc.color, border: `2px solid ${sc.borderColor}` }}
                    >
                      {score}
                    </div>
                    <span className="font-mono text-[8px] tracking-wide" style={{ color: COLORS.border }}>SCORE</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {signal.industry && (
                        <span
                          className="font-mono text-[9px] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 rounded"
                          style={{ color: COLORS.accent, background: `${COLORS.accent}0f` }}
                        >
                          {signal.industry.replace(/-/g, ' ')}
                        </span>
                      )}
                      {signal.signal_type && (
                        <span
                          className="font-mono text-[9px] px-2 py-0.5 rounded"
                          style={{ color: COLORS.dim, background: 'rgba(255,255,255,0.03)' }}
                        >
                          {signal.signal_type.replace(/_/g, ' ')}
                        </span>
                      )}
                      {signal.source && (
                        <span className="font-mono text-[9px] tracking-wide" style={{ color: COLORS.border }}>
                          {sourceName(signal.source)}
                        </span>
                      )}
                      <span className="font-mono text-[9px] ml-auto" style={{ color: COLORS.dim }}>
                        {relTime(signal.discovered_at)}
                      </span>
                    </div>
                    <div className="text-[15px] font-medium leading-[1.45] mb-1.5 text-zinc-300 group-hover:text-white transition-colors">
                      {signal.title}
                    </div>
                    {signal.evidence && (
                      <div className="text-[13px] leading-relaxed line-clamp-2" style={{ color: COLORS.muted }}>
                        {signal.evidence}
                      </div>
                    )}
                    {signal.company && (
                      <div className="mt-2">
                        <span
                          className="font-mono text-[9px] px-2 py-0.5 rounded"
                          style={{ color: COLORS.accent, background: `${COLORS.accent}08` }}
                        >
                          {signal.company}
                        </span>
                      </div>
                    )}
                  </div>
                </a>
              );
            })
          )}
        </div>

        {/* Load More */}
        {signals.length > 0 && signals.length < filteredCount && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={loading}
              className="font-mono text-[11px] font-medium tracking-[0.1em] px-8 py-2.5 rounded-[10px] cursor-pointer transition-colors"
              style={{
                border: `1px solid ${COLORS.accent}26`,
                background: 'transparent',
                color: loading ? COLORS.dim : COLORS.accent,
              }}
            >
              {loading ? 'LOADING...' : 'LOAD MORE SIGNALS'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
                          }
