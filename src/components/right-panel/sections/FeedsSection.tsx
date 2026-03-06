'use client';

import { useEffect, useState } from 'react';
import { timeAgo } from '@/lib/utils/format';
import { FEED_CATEGORY_COLORS, SENTIMENT_COLORS } from '@/lib/utils/design-tokens';
import { LoadingSkeleton } from '@/components/right-panel/shared/LoadingSkeleton';

// ─── Types ────────────────────────────────────────────────────────────────────

type SourceHealthItem = { id: string; name: string; status: 'ok' | 'failed'; itemCount: number };

type FeedItem = {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  score?: number;
  sentiment?: string;
  category?: string;
  description?: string;
  vendor?: string;
};

type FeedsApiResponse = {
  ok?: boolean;
  all?: FeedItem[];
  sourceHealth?: SourceHealthItem[];
  source_count?: number;
  as_of?: string;
  enriched?: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const FEED_CATEGORIES = [
  'ALL', 'AI/ML', 'Cybersecurity', 'Defense', 'Enterprise',
  'Supply Chain', 'Energy', 'Finance', 'Crime', 'General',
] as const;

// WorldMonitor-style trending keyword spike detection
// Compares recent (2h) word frequency vs baseline to surface surging terms
const STOP_WORDS = new Set([
  'the','a','an','and','or','in','on','at','to','for','of','with','by','from','is','are',
  'was','were','be','been','have','has','had','do','does','did','will','would','could',
  'should','may','might','this','that','these','those','it','as','up','out','over','into',
  'after','before','about','more','new','like','just','says','said','report','reports',
  'after','between','through','while','than','then','also','but','not','what','when',
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeTrendingKeywords(items: FeedItem[]): string[] {
  const now = Date.now();
  const RECENT_MS = 2 * 60 * 60 * 1000; // 2-hour window vs baseline

  const allCounts: Record<string, number> = {};
  const recentCounts: Record<string, number> = {};
  let recentItemCount = 0;

  for (const item of items) {
    const isRecent = !item.pubDate || (now - new Date(item.pubDate).getTime()) < RECENT_MS;
    if (isRecent) recentItemCount++;

    const words = item.title
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

    for (const word of words) {
      allCounts[word] = (allCounts[word] ?? 0) + 1;
      if (isRecent) recentCounts[word] = (recentCounts[word] ?? 0) + 1;
    }
  }

  if (recentItemCount === 0 || items.length === 0) return [];

  const baselineFraction = recentItemCount / items.length;
  const spikes: [string, number][] = [];

  for (const [word, recentCount] of Object.entries(recentCounts)) {
    if (recentCount < 2) continue;
    const allCount = allCounts[word] ?? recentCount;
    const expectedCount = allCount * baselineFraction;
    const spikeFactor = recentCount / Math.max(expectedCount, 0.5);
    if (spikeFactor >= 1.8) spikes.push([word, spikeFactor]);
  }

  return spikes
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FeedsSection() {
  const [data, setData] = useState<FeedsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [keywordFilter, setKeywordFilter] = useState<string | null>(null);

  const load = (force = false) => {
    if (force) setRefreshing(true); else setLoading(true);
    const req = force
      ? fetch('/api/feeds', { method: 'POST' })
      : fetch('/api/feeds');
    req
      .then((r) => r.json())
      .then((d: FeedsApiResponse) => setData(d))
      .catch(() => setData(null))
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <LoadingSkeleton label="FETCHING FEEDS" />;
  }

  const allItems = data?.all ?? [];
  const health = data?.sourceHealth ?? [];
  const liveCount = health.filter((s) => s.status === 'ok').length;
  const categoryFiltered = activeCategory === 'ALL' ? allItems : allItems.filter((i) => i.category === activeCategory);
  const items = keywordFilter
    ? categoryFiltered.filter((i) => i.title.toLowerCase().includes(keywordFilter.toLowerCase()))
    : categoryFiltered;
  const trendingKeywords = allItems.length >= 5 ? computeTrendingKeywords(allItems) : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
        <span className="font-mono text-[9px] tracking-[0.15em] text-white/25">
          {items.length}/{allItems.length} SIGNALS
          {keywordFilter && <span className="text-[#ff8c00]/60"> · &quot;{keywordFilter}&quot;</span>}
          {liveCount > 0 && (
            <> — <span style={{ color: '#00ff88' }}>{liveCount}</span>/{health.length} LIVE</>
          )}
          {data?.enriched && <span className="ml-1.5 text-[#00d4ff]/50">GEMINI ✓</span>}
        </span>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="font-mono text-[9px] text-white/20 hover:text-[#00d4ff]/60 transition-colors disabled:opacity-30"
        >
          {refreshing ? '···' : '↻ REFRESH'}
        </button>
      </div>

      {/* Category filter bar */}
      <div className="flex gap-1 px-2 py-1.5 border-b border-white/5 overflow-x-auto shrink-0 scrollbar-none">
        {FEED_CATEGORIES.map((cat) => {
          const count = cat === 'ALL' ? allItems.length : allItems.filter((i) => i.category === cat).length;
          if (count === 0 && cat !== 'ALL' && cat !== 'Crime') return null;
          return (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setKeywordFilter(null); }}
              className={`shrink-0 px-1.5 py-0.5 font-mono text-[8px] rounded-sm transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'text-black font-bold'
                  : 'text-white/30 hover:text-white/60 bg-white/5'
              }`}
              style={activeCategory === cat
                ? { backgroundColor: cat === 'ALL' ? '#00d4ff' : (FEED_CATEGORY_COLORS[cat] ?? '#00d4ff') }
                : {}}
            >
              {cat} {count > 0 && <span className="opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* WorldMonitor-style trending keyword spike chips */}
      {trendingKeywords.length > 0 && (
        <div className="px-2 py-1.5 border-b border-white/5 flex items-center gap-1.5 shrink-0 flex-wrap">
          <span className="font-mono text-[8px] text-white/15 shrink-0">TRENDING ▲</span>
          {trendingKeywords.map((kw) => (
            <button
              key={kw}
              onClick={() => setKeywordFilter((prev) => prev === kw ? null : kw)}
              className={`font-mono text-[8px] px-1.5 py-0.5 rounded-sm border transition-colors ${
                keywordFilter === kw
                  ? 'bg-[#ff8c00]/30 border-[#ff8c00]/50 text-[#ff8c00]'
                  : 'bg-[#ff8c00]/10 border-[#ff8c00]/20 text-[#ff8c00]/70 hover:bg-[#ff8c00]/20'
              }`}
            >
              {kw}
            </button>
          ))}
        </div>
      )}

      {/* Feed items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-4 font-mono text-[10px] text-white/20">No feed data. Click ↻ REFRESH to fetch.</div>
        ) : (
          items.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-0.5 px-3 py-2 border-b border-white/4 hover:bg-white/3 transition-colors group"
            >
              {/* Source + score + category dot + time */}
              <div className="flex items-center gap-1.5">
                {item.category && item.category !== 'General' && (
                  <span
                    className="w-1 h-1 rounded-full shrink-0"
                    style={{ backgroundColor: FEED_CATEGORY_COLORS[item.category] ?? '#6b7280' }}
                  />
                )}
                <span className="font-mono text-[8px] px-1 py-px rounded-sm bg-white/5 text-white/30 shrink-0">
                  {item.source}
                </span>
                {item.vendor && (
                  <span className="font-mono text-[8px] px-1 py-px rounded-sm bg-[#ff8c00]/10 text-[#ff8c00]/70 shrink-0 max-w-[70px] truncate">
                    {item.vendor}
                  </span>
                )}
                {item.score !== undefined && item.score > 0 && (
                  <span
                    className="font-mono text-[8px] shrink-0"
                    style={{ color: item.score >= 7 ? '#ff8c00' : item.score >= 4 ? '#00d4ff' : '#ffffff33' }}
                  >
                    {item.score}
                  </span>
                )}
                {item.sentiment && item.sentiment !== 'neutral' && (
                  <span
                    className="font-mono text-[8px] shrink-0"
                    style={{ color: SENTIMENT_COLORS[item.sentiment] ?? '#fff', opacity: 0.5 }}
                  >
                    {item.sentiment === 'positive' ? '▲' : '▼'}
                  </span>
                )}
                <span className="ml-auto font-mono text-[8px] text-white/15 shrink-0">
                  {timeAgo(item.pubDate)}
                </span>
              </div>
              {/* Title */}
              <p className="font-mono text-[10px] text-white/50 group-hover:text-white/70 leading-snug line-clamp-2 transition-colors">
                {item.title}
              </p>
              {/* Description snippet */}
              {item.description && (
                <p className="font-mono text-[9px] text-white/25 leading-snug line-clamp-1">
                  {item.description}
                </p>
              )}
            </a>
          ))
        )}
      </div>

      {/* Source health toggle */}
      {health.length > 0 && (
        <div className="border-t border-white/5 shrink-0">
          <button
            onClick={() => setShowHealth((v) => !v)}
            className="w-full px-3 py-1.5 font-mono text-[9px] text-white/20 hover:text-white/40 text-left transition-colors flex items-center gap-1"
          >
            <span>{showHealth ? '▾' : '▸'}</span>
            <span>SOURCE HEALTH ({liveCount}/{health.length})</span>
          </button>
          {showHealth && (
            <div className="px-3 pb-2 flex flex-col gap-0">
              {health.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-1 border-b border-white/4 last:border-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: s.status === 'ok' ? '#00ff88' : 'rgba(239,68,68,0.6)' }}
                    />
                    <span className="font-mono text-[9px] text-white/40">{s.name}</span>
                  </div>
                  <span className="font-mono text-[8px] text-white/20">
                    {s.status === 'ok' ? `${s.itemCount}` : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
