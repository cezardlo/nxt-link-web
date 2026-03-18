'use client';

import { useEffect, useState } from 'react';

import type { TimeRange } from '@/hooks/useMapLayers';

type FeedItem = {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  score?: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  category?: string;
};

type FeedResponse = {
  all?: FeedItem[];
};

const STUB_ITEMS: FeedItem[] = [
  { title: 'NVIDIA announces next-gen GPU for edge AI inference',             link: '#', source: 'TechCrunch', pubDate: '', sentiment: 'positive', category: 'AI/ML'        },
  { title: 'Amazon robotics hiring accelerates across 12 fulfillment centers', link: '#', source: 'Reuters',    pubDate: '', sentiment: 'positive', category: 'Enterprise'   },
  { title: 'New patent filings in cold chain monitoring surge 34% YoY',       link: '#', source: 'USPTO',      pubDate: '', sentiment: 'positive', category: 'Supply Chain' },
  { title: 'MIT researchers publish autonomous route optimization framework',   link: '#', source: 'MIT AI',     pubDate: '', sentiment: 'neutral',  category: 'AI/ML'        },
  { title: 'Palantir expands AIP to mid-market logistics sector',             link: '#', source: 'Bloomberg',  pubDate: '', sentiment: 'positive', category: 'Enterprise'   },
  { title: 'Water tech funding rounds hit $2.1B in Q1 2026',                 link: '#', source: 'PitchBook',  pubDate: '', sentiment: 'positive', category: 'Energy'       },
  { title: 'OpenAI releases GPT-5o with real-time sensor data integration',   link: '#', source: 'TechCrunch', pubDate: '', sentiment: 'positive', category: 'AI/ML'        },
  { title: 'EU industrial AI regulation enters enforcement phase',            link: '#', source: 'Reuters',    pubDate: '', sentiment: 'negative', category: 'Cybersecurity' },
];

const CATEGORY_COLORS: Record<string, string> = {
  'AI/ML':        '#00d4ff',
  'Cybersecurity':'#ff3b30',
  'Defense':      '#f97316',
  'Enterprise':   '#00ff88',
  'Supply Chain': '#ffb800',
  'Energy':       '#ffd700',
  'Finance':      '#00d4ff',
  'Crime':        '#f97316',
  'General':      '#6b7280',
};

const CATEGORY_ABBREV: Record<string, string> = {
  'AI/ML':        'AI',
  'Cybersecurity':'CYBER',
  'Defense':      'DEF',
  'Enterprise':   'ENT',
  'Supply Chain': 'SC',
  'Energy':       'NRG',
  'Finance':      'FIN',
  'Crime':        'CRIME',
  'General':      'GEN',
};

const SOURCE_COLORS: Record<string, string> = {
  TechCrunch: '#00d4ff',
  Reuters:    '#f97316',
  'MIT AI':   '#00ff88',
  Bloomberg:  '#ffd700',
  PitchBook:  '#ffb800',
  USPTO:      '#00d4ff',
  default:    '#6b7280',
};

const POSITIVE_WORDS = new Set([
  'surge', 'surges', 'growth', 'grow', 'grows', 'expand', 'expands', 'expansion',
  'wins', 'win', 'award', 'awards', 'awarded', 'secure', 'secures', 'secured',
  'breakthrough', 'accelerate', 'accelerates', 'record', 'milestone', 'launch', 'launches',
  'invests', 'investment', 'funding', 'raises', 'rise', 'rises', 'hits', 'reaches',
  'new', 'advance', 'advances', 'innovation', 'announces', 'releases', 'publishes',
]);

const NEGATIVE_WORDS = new Set([
  'risk', 'risks', 'delay', 'delays', 'concern', 'concerns', 'drop', 'drops',
  'fall', 'falls', 'breach', 'layoff', 'layoffs', 'shutdown', 'failure', 'failures',
  'disruption', 'disruptions', 'threat', 'threats', 'warning', 'violation', 'fine',
  'fines', 'cuts', 'cut', 'loses', 'lose', 'decline', 'declines', 'slows', 'stalls',
]);

function detectSentiment(title: string): 'positive' | 'negative' | 'neutral' {
  const words = title.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  let pos = 0, neg = 0;
  for (const w of words) {
    if (POSITIVE_WORDS.has(w)) pos++;
    if (NEGATIVE_WORDS.has(w)) neg++;
  }
  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}

const SENTIMENT_COLOR: Record<string, string> = {
  positive: '#00ff88',
  negative: '#ff3b30',
  neutral:  'rgba(255,255,255,0.15)',
};

const SENTIMENT_SYMBOL: Record<string, string> = {
  positive: '▲',
  negative: '▼',
  neutral:  '·',
};

type Props = { timeRange: TimeRange };

export function FeedBar({ timeRange }: Props) {
  const [items, setItems] = useState<FeedItem[]>(STUB_ITEMS);

  useEffect(() => {
    fetch(`/api/feeds?timeRange=${timeRange}`)
      .then((r) => r.json())
      .then((data: FeedResponse) => {
        if (Array.isArray(data.all) && data.all.length > 0) {
          const enriched = data.all.map((item) => ({
            ...item,
            sentiment: item.sentiment ?? detectSentiment(item.title),
          }));
          setItems(enriched);
        }
      })
      .catch(() => {});
  }, [timeRange]);

  // Cap displayed items to keep ticker readable (max 40 headlines)
  const displayItems = items.slice(0, 40);
  const doubled = [...displayItems, ...displayItems];
  // Scale animation: ~3s per item = comfortable reading speed
  const animDuration = Math.max(60, displayItems.length * 3);

  return (
    <div className="shrink-0 h-9 md:h-7 bg-black border-t border-white/[0.05] flex items-center overflow-hidden">

      {/* LIVE badge */}
      <div className="shrink-0 flex items-center gap-1.5 px-2.5 border-r border-white/[0.05] h-full bg-[#00ff88]/[0.03]">
        <span className="w-1.5 h-1.5 rounded-full live-pulse shrink-0" style={{ backgroundColor: '#00ff88', boxShadow: '0 0 6px #00ff88cc' }} />
        <span className="font-mono text-[7px] sm:text-[8px] font-bold tracking-[0.25em]" style={{ color: 'rgba(0,255,136,0.8)' }}>LIVE</span>
      </div>

      {/* Scrolling feed */}
      <div className="flex-1 overflow-hidden relative">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, #000, transparent)' }} />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, #000, transparent)' }} />

        <div className="feed-scroll flex items-center whitespace-nowrap" style={{ animationDuration: `${animDuration}s` }}>
          {doubled.map((item, i) => {
            const sentiment = item.sentiment ?? detectSentiment(item.title);
            const catColor  = item.category ? (CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.General) : undefined;
            const srcColor  = SOURCE_COLORS[item.source] ?? SOURCE_COLORS.default;
            const sentColor = SENTIMENT_COLOR[sentiment];
            const sentSym   = SENTIMENT_SYMBOL[sentiment];
            const isHigh    = (item.score ?? 0) >= 7;

            const catAbbrev = item.category ? (CATEGORY_ABBREV[item.category] ?? 'GEN') : undefined;

            return (
              <a
                key={i}
                href={item.link !== '#' ? item.link : undefined}
                target={item.link !== '#' ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 hover:opacity-80 transition-opacity cursor-pointer"
              >
                {/* Category badge: dot + abbreviation */}
                {catColor && catAbbrev && (
                  <span className="inline-flex items-center gap-0.5 shrink-0">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: catColor, boxShadow: `0 0 4px ${catColor}99` }}
                    />
                    <span
                      className="font-mono text-[7px] font-bold tracking-widest shrink-0"
                      style={{ color: catColor, opacity: 0.85 }}
                    >
                      {catAbbrev}
                    </span>
                  </span>
                )}

                {/* Sentiment indicator */}
                <span
                  className="font-mono text-[8px] shrink-0 tabular-nums"
                  style={{ color: sentColor }}
                >
                  {sentSym}
                </span>

                {/* Title */}
                <span
                  className="font-mono text-[9px]"
                  style={{
                    color: isHigh ? '#f97316' : 'rgba(255,255,255,0.42)',
                    textShadow: isHigh ? '0 0 8px rgba(255,140,0,0.3)' : 'none',
                  }}
                >
                  {item.title}
                </span>

                {/* Source name after title */}
                <span className="font-mono text-[8px] text-white/20 shrink-0">—</span>
                <span
                  className="font-mono text-[8px] font-bold tracking-wider shrink-0"
                  style={{ color: srcColor, opacity: 0.7 }}
                >
                  {(item.source ?? '').toUpperCase()}
                </span>

                {/* Separator dot */}
                <span className="font-mono text-[8px] text-white/[0.06] shrink-0 ml-1">◈</span>
              </a>
            );
          })}
        </div>
      </div>

    </div>
  );
}
