'use client';
// src/app/command-center/components/LiveFeed.tsx
// Bottom 32px scrolling feed — 4 types, score > 70 filter, click to drill down.

import type { FeedItem, FeedItemType } from '../types/intel';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCORE_THRESHOLD = 70;

const TYPE_META: Record<FeedItemType, { symbol: string; color: string }> = {
  contract: { symbol: '⚡', color: '#FFD700' },
  patent:   { symbol: '📄', color: '#00D4FF' },
  research: { symbol: '🔬', color: '#A855F7' },
  signal:   { symbol: '📈', color: '#00FF88' },
};

// Map feed category names → our FeedItemType
function categoryToType(category: string): FeedItemType {
  const c = category.toLowerCase();
  if (c.includes('contract') || c.includes('procurement') || c.includes('defense')) return 'contract';
  if (c.includes('patent'))                                                           return 'patent';
  if (c.includes('research') || c.includes('science') || c.includes('ai'))          return 'research';
  return 'signal';
}

// ─── Props ────────────────────────────────────────────────────────────────────

type RawFeedItem = {
  id: string;
  title: string;
  source: string;
  category: string;
  url?: string;
  score?: number;
  publishedAt?: string;
};

type Props = {
  rawItems:  RawFeedItem[];
  onItemClick: (item: FeedItem) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function LiveFeed({ rawItems, onItemClick }: Props) {
  // Normalize + filter
  const items: FeedItem[] = rawItems
    .map(r => ({
      id:          r.id,
      type:        categoryToType(r.category),
      headline:    r.title,
      source:      r.source,
      url:         r.url ?? '',
      score:       r.score ?? 75,             // default 75 if API didn't score it
      publishedAt: r.publishedAt ?? '',
      industry:    r.category,
    }))
    .filter(item => item.score >= SCORE_THRESHOLD);

  // Need at least something to scroll
  const display = items.length > 0 ? items : [{
    id: 'placeholder',
    type: 'signal' as FeedItemType,
    headline: 'Intelligence feed warming up — live signals incoming',
    source: 'NXT//LINK',
    url: '',
    score: 75,
    publishedAt: '',
  }];

  return (
    <div style={{
      height: 32,
      background: 'rgba(0,0,0,0.88)',
      borderTop: '1px solid rgba(0,212,255,0.12)',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Live badge */}
      <div style={{
        padding: '0 10px',
        borderRight: '1px solid rgba(0,212,255,0.12)',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        flexShrink: 0,
      }}>
        <span style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: '#00FF88',
          boxShadow: '0 0 6px #00FF88',
          display: 'inline-block',
          animation: 'feed-pulse 2s ease-in-out infinite',
        }} />
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.12em', color: 'rgba(0,255,136,0.7)', textTransform: 'uppercase' }}>
          Live
        </span>
      </div>

      {/* Scrolling ticker */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          display: 'flex',
          gap: 36,
          animation: 'ticker-scroll 80s linear infinite',
          whiteSpace: 'nowrap',
          paddingLeft: 16,
          alignItems: 'center',
          height: 32,
        }}>
          {/* Duplicate for seamless loop */}
          {[...display, ...display].map((item, i) => {
            const meta = TYPE_META[item.type];
            return (
              <span
                key={i}
                onClick={() => item.url && onItemClick(item)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: item.url ? 'pointer' : 'default',
                }}
              >
                <span style={{ fontSize: 9 }}>{meta.symbol}</span>
                <span style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 8,
                  color: `${meta.color}99`,
                  letterSpacing: '0.06em',
                }}>
                  [{item.type.toUpperCase()}]
                </span>
                <span style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 9,
                  color: item.url ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.35)',
                  textDecoration: item.url ? 'none' : 'none',
                }}>
                  {item.headline}
                </span>
                {item.source && (
                  <span style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 7,
                    color: 'rgba(0,212,255,0.3)',
                  }}>
                    · {item.source}
                  </span>
                )}
                <span style={{ color: 'rgba(0,212,255,0.15)', fontSize: 9 }}>·</span>
              </span>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes feed-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
