'use client';
// src/app/command-center/components/LiveFeed.tsx
// Bottom 32px scrolling feed — color-coded, score badges, pause on hover.

import { useState } from 'react';
import type { FeedItem, FeedItemType } from '../types/intel';

const SCORE_THRESHOLD = 50; // lowered from 70 to show more items

const TYPE_META: Record<FeedItemType, { symbol: string; color: string }> = {
  contract: { symbol: '⚡', color: '#FFD700' },
  patent:   { symbol: '◆',  color: '#00D4FF' },
  research: { symbol: '◉',  color: '#A855F7' },
  signal:   { symbol: '●',  color: '#00FF88' },
};

function categoryToType(category: string): FeedItemType {
  const c = category.toLowerCase();
  if (c.includes('contract') || c.includes('procurement') || c.includes('defense')) return 'contract';
  if (c.includes('patent')) return 'patent';
  if (c.includes('research') || c.includes('science') || c.includes('ai')) return 'research';
  return 'signal';
}

type RawFeedItem = {
  id: string; title: string; source: string; category: string;
  url?: string; score?: number; publishedAt?: string;
};

type Props = {
  rawItems:    RawFeedItem[];
  onItemClick: (item: FeedItem) => void;
};

export default function LiveFeed({ rawItems, onItemClick }: Props) {
  const [paused, setPaused] = useState(false);

  const items: FeedItem[] = rawItems
    .map(r => ({
      id: r.id, type: categoryToType(r.category), headline: r.title,
      source: r.source, url: r.url ?? '', score: r.score ?? 75,
      publishedAt: r.publishedAt ?? '', industry: r.category,
    }))
    .filter(item => item.score >= SCORE_THRESHOLD);

  const display = items.length > 0 ? items : [{
    id: 'init', type: 'signal' as FeedItemType,
    headline: 'Initializing intelligence feed — signals loading',
    source: 'NXT//LINK', url: '', score: 75, publishedAt: '',
  }];

  return (
    <div
      style={{
        height: 32, background: 'rgba(0,0,0,0.92)',
        borderTop: '1px solid rgba(0,212,255,0.10)',
        display: 'flex', alignItems: 'center', overflow: 'hidden', flexShrink: 0,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Live badge */}
      <div style={{
        padding: '0 10px', borderRight: '1px solid rgba(0,212,255,0.10)',
        height: '100%', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: '50%', background: '#00FF88',
          boxShadow: '0 0 6px #00FF88', display: 'inline-block',
          animation: 'feed-pulse 2s ease-in-out infinite',
        }} />
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.12em', color: 'rgba(0,255,136,0.7)' }}>
          LIVE
        </span>
        {items.length > 0 && (
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: 'rgba(0,212,255,0.35)' }}>
            {items.length}
          </span>
        )}
      </div>

      {/* Ticker */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          display: 'flex', gap: 40, whiteSpace: 'nowrap', paddingLeft: 16,
          alignItems: 'center', height: 32,
          animation: `ticker-scroll ${Math.max(40, display.length * 4)}s linear infinite`,
          animationPlayState: paused ? 'paused' : 'running',
        }}>
          {[...display, ...display].map((item, i) => {
            const meta = TYPE_META[item.type];
            const scoreColor = item.score >= 90 ? '#FF3B30' : item.score >= 75 ? '#FFD700' : '#00D4FF';
            return (
              <span
                key={i}
                onClick={() => item.url && onItemClick(item)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: item.url ? 'pointer' : 'default' }}
              >
                <span style={{ fontSize: 8, color: meta.color }}>{meta.symbol}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: meta.color, letterSpacing: '0.06em', opacity: 0.7 }}>
                  {item.type.toUpperCase()}
                </span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.65)' }}>
                  {item.headline.slice(0, 80)}{item.headline.length > 80 ? '…' : ''}
                </span>
                {item.score >= 80 && (
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: scoreColor, background: `${scoreColor}14`, padding: '0 3px', borderRadius: 1 }}>
                    {item.score}
                  </span>
                )}
                {item.source && (
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: 'rgba(0,212,255,0.25)' }}>
                    · {item.source}
                  </span>
                )}
                <span style={{ color: 'rgba(0,212,255,0.12)', fontSize: 9 }}>·</span>
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
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
