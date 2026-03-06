// src/lib/agents/conference-agent.ts
// NXT//LINK Conference Intelligence Agent
// Discovers, classifies, and ranks industry conferences

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';
import { parseAnyFeed, type ParsedItem } from '@/lib/rss/parser';
import { classifyBatch } from '@/lib/agents/agents/feed-classifier-agent';
import { CONFERENCE_PROFILES } from '@/lib/data/conference-profiles';
import {
  scoreConference,
  type ConferenceScore,
  type ConferenceProfile,
} from '@/lib/intelligence/conference-scorer';

// ─── Types ─────────────────────────────────────────────────────────

export type ConferenceIntelItem = {
  conferenceId: string;
  conferenceName: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
  industry: string;
};

export type ConferenceIntelStore = {
  profiles: Array<ConferenceProfile & { computedScore: ConferenceScore }>;
  news: ConferenceIntelItem[];
  as_of: string;
  conferenceCount: number;
};

// ─── Google News RSS helper ────────────────────────────────────────

const GN = (q: string): string =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

// ─── In-memory cache ───────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedStore: ConferenceIntelStore | null = null;
let storeExpiresAt = 0;
let inFlightRun: Promise<ConferenceIntelStore> | null = null;

export function getConferenceIntelStore(): ConferenceIntelStore | null {
  if (cachedStore && Date.now() < storeExpiresAt) return cachedStore;
  return null;
}

// ─── Conference news fetcher ───────────────────────────────────────

type ConferenceFeed = {
  id: string;
  name: string;
  url: string;
  conferenceId: string;
};

const MAX_CONCURRENT = 20;

async function fetchConferenceNewsBatch(
  feeds: ConferenceFeed[]
): Promise<ConferenceIntelItem[]> {
  const items: ConferenceIntelItem[] = [];

  for (let i = 0; i < feeds.length; i += MAX_CONCURRENT) {
    const batch = feeds.slice(i, i + MAX_CONCURRENT);
    const results = await Promise.allSettled(
      batch.map(async (feed): Promise<ConferenceIntelItem[]> => {
        const resp = await fetchWithRetry(
          feed.url,
          {
            headers: {
              Accept: 'application/rss+xml, application/xml, text/xml, */*',
              'User-Agent': 'NXTLinkConfAgent/1.0',
            },
          },
          {
            retries: 1,
            cacheKey: `conf-agent:${feed.id}`,
            cacheTtlMs: 5 * 60 * 1000,
            staleIfErrorMs: 15 * 60 * 1000,
            dedupeInFlight: true,
          }
        );
        if (!resp.ok) return [];
        const xml = await resp.text();
        const parsed: ParsedItem[] = parseAnyFeed(xml, feed.name);
        return parsed.slice(0, 5).map((p: ParsedItem): ConferenceIntelItem => ({
          conferenceId: feed.conferenceId,
          conferenceName: feed.name.replace('GN: ', ''),
          title: p.title,
          link: p.link,
          pubDate: p.pubDate,
          source: p.source,
          industry: '', // classified in a later step
        }));
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') items.push(...r.value);
    }
  }

  return items;
}

// ─── Main agent run ────────────────────────────────────────────────

export async function runConferenceAgent(): Promise<ConferenceIntelStore> {
  // Return in-flight promise if one is already running (deduplication)
  if (inFlightRun) return inFlightRun;

  const run = async (): Promise<ConferenceIntelStore> => {
    try {
      // 1. Score all conference profiles
      const scoredProfiles = CONFERENCE_PROFILES.map(
        (conf): ConferenceProfile & { computedScore: ConferenceScore } => ({
          ...conf,
          computedScore: scoreConference(conf),
        })
      );

      // 2. Fetch latest news for the top 30 conferences (by score) to save bandwidth
      const topConfs = scoredProfiles
        .slice()
        .sort((a, b) => b.computedScore.total - a.computedScore.total)
        .slice(0, 30);

      const feeds: ConferenceFeed[] = topConfs.map((conf) => ({
        id: `conf-news-${conf.id}`,
        name: `GN: ${conf.name}`,
        url: GN(`${conf.name} conference ${new Date().getFullYear()}`),
        conferenceId: conf.id,
      }));

      const newsItems = await fetchConferenceNewsBatch(feeds);

      // 3. Classify news items by industry using the keyword classifier
      if (newsItems.length > 0) {
        const { results: classified } = classifyBatch(
          newsItems.map((n) => ({
            title: n.title,
            description: '',
            source: n.source,
          }))
        );
        for (let i = 0; i < newsItems.length; i++) {
          newsItems[i].industry = classified[i]?.category ?? 'General';
        }
      }

      // 4. Sort news by date (newest first) and cap at 200 items
      newsItems.sort(
        (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      );

      const store: ConferenceIntelStore = {
        profiles: scoredProfiles,
        news: newsItems.slice(0, 200),
        as_of: new Date().toISOString(),
        conferenceCount: CONFERENCE_PROFILES.length,
      };

      cachedStore = store;
      storeExpiresAt = Date.now() + CACHE_TTL_MS;

      return store;
    } finally {
      inFlightRun = null;
    }
  };

  inFlightRun = run();
  return inFlightRun;
}
