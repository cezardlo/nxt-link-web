// src/lib/agents/agents/conference-discovery-agent.ts
// Conference Discovery Agent — auto-discovers new trucking & logistics conferences
// beyond the hardcoded list. Uses Google News RSS + event listing site scraping.
// Zero LLM tokens — pure keyword/regex matching.

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';
import { getDb, isSupabaseConfigured } from '@/db/client';
import { getConferenceDiscoveryFeeds } from './conference-exhibitor-detector';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type DiscoveredConference = {
  name: string;
  website: string;
  source: string;
  description: string;
  date_text: string;
  location: string;
  logistics_relevance: number;
};

export type ConferenceDiscoveryReport = {
  feeds_scanned: number;
  candidates_found: number;
  new_conferences: number;
  duplicates_skipped: number;
  results: DiscoveredConference[];
  errors: Array<{ source: string; error: string }>;
  duration_ms: number;
};

// ─── Trucking-Specific RSS Queries ──────────────────────────────────────────────

const TRUCKING_QUERIES = [
  '"trucking expo" OR "trucking show" exhibitors',
  '"freight technology" conference exhibitor list',
  '"fleet management" expo 2026',
  '"MATS" OR "Mid-America Trucking Show" exhibitor',
  '"TMC" annual meeting trucking',
  '"FreightWaves" conference logistics',
  '"Manifest" supply chain conference',
  '"CSCMP EDGE" logistics',
  '"Intermodal Expo" freight',
  '"truckload carriers" conference OR expo',
  '"cold chain" expo OR conference exhibitor',
  '"last mile" delivery conference',
  '"drayage" OR "cross-border" logistics expo',
  '"ELD" OR "telematics" fleet conference',
  '"3PL" conference OR summit exhibitors',
];

function getTruckingDiscoveryFeeds(): Array<{ id: string; name: string; url: string }> {
  return TRUCKING_QUERIES.map((query, i) => ({
    id: `trucking-discovery-${i}`,
    name: `Trucking Discovery: ${query.slice(0, 40)}...`,
    url: `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
  }));
}

// ─── Logistics Relevance Keywords ───────────────────────────────────────────────

const HIGH_VALUE_KEYWORDS = [
  'trucking', 'freight', 'fleet', 'drayage', 'intermodal', 'ltl', 'ftl',
  'tms', 'eld', 'telematics', 'cold chain', '3pl', 'cross-border',
  'truckload', 'flatbed', 'reefer', 'trailer', 'cdl', 'dispatch',
  'broker', 'brokerage', 'carrier', 'shipper', 'load board',
];

const MEDIUM_VALUE_KEYWORDS = [
  'warehouse', 'fulfillment', 'material handling', 'supply chain',
  'logistics', 'distribution', 'transportation', 'shipping',
  'last mile', 'delivery', 'port', 'customs', 'cargo',
];

/**
 * Score conference relevance to trucking/logistics (0-100).
 */
function scoreLogisticsRelevance(name: string, description: string): number {
  const text = `${name} ${description}`.toLowerCase();
  let score = 0;

  for (const kw of HIGH_VALUE_KEYWORDS) {
    if (text.includes(kw)) score += 8;
  }
  for (const kw of MEDIUM_VALUE_KEYWORDS) {
    if (text.includes(kw)) score += 4;
  }

  return Math.min(100, score);
}

// ─── RSS Feed Parser ────────────────────────────────────────────────────────────

type RssItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRe.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] ?? '';
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] ?? '';
    const desc = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1] ?? '';
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? '';

    if (title) {
      items.push({
        title: title.replace(/<[^>]+>/g, '').trim(),
        link: link.trim(),
        description: desc.replace(/<[^>]+>/g, '').trim(),
        pubDate,
      });
    }
  }

  return items;
}

// ─── Conference Name Extraction ─────────────────────────────────────────────────

const CONFERENCE_NAME_PATTERNS = [
  // "ExpoName 2026" or "ExpoName 2025"
  /\b([A-Z][A-Za-z0-9 &'-]{4,40}(?:Expo|Show|Summit|Conference|Convention|Forum|Congress|Symposium|World|Fest|Fair)(?:\s+20\d{2})?)\b/g,
  // "20XX ConferenceName"
  /\b(20\d{2}\s+[A-Z][A-Za-z0-9 &'-]{4,40}(?:Expo|Show|Summit|Conference|Convention|Forum|Congress))\b/g,
  // Known trucking events
  /\b(MATS|Mid-America Trucking Show|TMC Annual Meeting|Truckload Carriers Association|TCA Annual|GATS|Great American Trucking Show|FreightWaves LIVE|Manifest|CSCMP EDGE|Intermodal Expo|SMC3 Jump Start|TMSA Elevate|McLeod Software User Conference|Trimble Insight)\b/gi,
];

function extractConferenceNames(text: string): string[] {
  const names = new Set<string>();
  for (const pattern of CONFERENCE_NAME_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      const name = m[1].trim();
      if (name.length >= 5 && name.length <= 80) {
        names.add(name);
      }
    }
  }
  return Array.from(names);
}

// ─── Event Listing Site Scrapers ────────────────────────────────────────────────

async function scrapeEventListingSite(
  url: string,
  sourceName: string,
): Promise<DiscoveredConference[]> {
  try {
    const res = await fetchWithRetry(url, {
      headers: { 'User-Agent': 'NXTLink-Intel-Bot/1.0' },
    }, {
      retries: 1,
      cacheTtlMs: 86400_000,
      cacheKey: `conf-disc:${url}`,
    });

    if (!res.ok) return [];

    const html = await res.text();
    // Strip tags but keep structure hints
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ');

    const names = extractConferenceNames(text);
    const results: DiscoveredConference[] = [];

    for (const name of names) {
      const relevance = scoreLogisticsRelevance(name, text.slice(0, 2000));
      if (relevance >= 20) {
        results.push({
          name,
          website: '',
          source: sourceName,
          description: '',
          date_text: '',
          location: '',
          logistics_relevance: relevance,
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}

// ─── Fuzzy Name Match ───────────────────────────────────────────────────────────

function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(20\d{2})\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function isFuzzyMatch(a: string, b: string): boolean {
  const na = normalizeForMatch(a);
  const nb = normalizeForMatch(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  // Levenshtein-lite: if one is >80% of the other, close enough
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  if (shorter.length > 5 && longer.startsWith(shorter.slice(0, Math.floor(shorter.length * 0.8)))) return true;
  return false;
}

// ─── Main Agent ─────────────────────────────────────────────────────────────────

export async function runConferenceDiscovery(): Promise<ConferenceDiscoveryReport> {
  const start = Date.now();
  const results: DiscoveredConference[] = [];
  const errors: Array<{ source: string; error: string }> = [];
  let candidatesFound = 0;
  let duplicatesSkipped = 0;

  // Get existing conference names from Supabase for dedup
  const existingNames: string[] = [];
  if (isSupabaseConfigured()) {
    const db = getDb();
    const { data } = await db.from('conferences').select('name').limit(5000);
    if (data) {
      for (const r of data as Array<{ name: string }>) {
        existingNames.push(r.name);
      }
    }
  }

  // ── Source 1: Trucking-specific RSS feeds ──────────────────────────────────

  const truckingFeeds = getTruckingDiscoveryFeeds();
  const genericFeeds = getConferenceDiscoveryFeeds();
  const allFeeds = [...truckingFeeds, ...genericFeeds];

  // Process feeds in batches of 5
  for (let i = 0; i < allFeeds.length; i += 5) {
    const batch = allFeeds.slice(i, i + 5);
    const batchResults = await Promise.allSettled(
      batch.map(async (feed) => {
        try {
          const res = await fetchWithRetry(feed.url, {
            headers: { 'User-Agent': 'NXTLink-Intel-Bot/1.0' },
          }, {
            retries: 0,
            cacheTtlMs: 14400_000, // 4hr cache
            cacheKey: `conf-rss:${feed.id}`,
          });

          if (!res.ok) return [];

          const xml = await res.text();
          const items = parseRssItems(xml);
          const discovered: DiscoveredConference[] = [];

          for (const item of items) {
            const names = extractConferenceNames(`${item.title} ${item.description}`);
            for (const name of names) {
              const relevance = scoreLogisticsRelevance(name, item.description);
              if (relevance >= 20) {
                discovered.push({
                  name,
                  website: item.link,
                  source: `rss:${feed.id}`,
                  description: item.description.slice(0, 500),
                  date_text: item.pubDate,
                  location: '',
                  logistics_relevance: relevance,
                });
              }
            }
          }

          return discovered;
        } catch (e) {
          errors.push({ source: feed.id, error: (e as Error).message });
          return [];
        }
      }),
    );

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        candidatesFound += r.value.length;
        for (const conf of r.value) {
          // Dedup against existing conferences
          const isDuplicate = existingNames.some((n) => isFuzzyMatch(n, conf.name));
          if (isDuplicate) {
            duplicatesSkipped++;
            continue;
          }
          // Dedup against already-found results
          const alreadyFound = results.some((r) => isFuzzyMatch(r.name, conf.name));
          if (!alreadyFound) {
            results.push(conf);
          }
        }
      }
    }
  }

  // ── Source 2: Event listing sites ──────────────────────────────────────────

  const eventListingSites = [
    { url: 'https://10times.com/logistics', name: '10times-logistics' },
    { url: 'https://10times.com/trucking', name: '10times-trucking' },
    { url: 'https://10times.com/supply-chain', name: '10times-supply-chain' },
    { url: 'https://10times.com/freight', name: '10times-freight' },
    { url: 'https://www.tradefairdates.com/Logistics-Trade-Shows-P20-S1.html', name: 'tradefairdates-logistics' },
    { url: 'https://www.tradefairdates.com/Transport-Trade-Shows-P37-S1.html', name: 'tradefairdates-transport' },
  ];

  const siteResults = await Promise.allSettled(
    eventListingSites.map((site) => scrapeEventListingSite(site.url, site.name)),
  );

  for (const r of siteResults) {
    if (r.status === 'fulfilled') {
      candidatesFound += r.value.length;
      for (const conf of r.value) {
        const isDuplicate = existingNames.some((n) => isFuzzyMatch(n, conf.name));
        if (isDuplicate) {
          duplicatesSkipped++;
          continue;
        }
        const alreadyFound = results.some((r) => isFuzzyMatch(r.name, conf.name));
        if (!alreadyFound) {
          results.push(conf);
        }
      }
    }
  }

  // ── Persist new discoveries ───────────────────────────────────────────────

  if (isSupabaseConfigured() && results.length > 0) {
    const db = getDb({ admin: true });
    const inserts = results.map((r) => ({
      name: r.name,
      type: 'conference',
      industry: 'Logistics',
      description: r.description || `Auto-discovered logistics conference: ${r.name}`,
      website: r.website || '',
      source: 'auto-discovered',
      updated_at: new Date().toISOString(),
    }));

    // Batch insert
    for (let i = 0; i < inserts.length; i += 50) {
      const batch = inserts.slice(i, i + 50);
      const { error } = await db.from('conferences').upsert(batch, {
        onConflict: 'name',
        ignoreDuplicates: true,
      });
      if (error) {
        console.warn('[conference-discovery] upsert error:', error.message);
      }
    }
  }

  // Sort by relevance
  results.sort((a, b) => b.logistics_relevance - a.logistics_relevance);

  return {
    feeds_scanned: allFeeds.length + eventListingSites.length,
    candidates_found: candidatesFound,
    new_conferences: results.length,
    duplicates_skipped: duplicatesSkipped,
    results,
    errors,
    duration_ms: Date.now() - start,
  };
}
