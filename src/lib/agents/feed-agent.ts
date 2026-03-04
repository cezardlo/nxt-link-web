// src/lib/agents/feed-agent.ts
// Fetches 2000+ RSS/Atom sources via FEED_REGISTRY, classifies with keyword
// agent first (free), falls back to Gemini for low-confidence articles,
// caches in-memory (5-min TTL), optionally persists to Supabase.

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase/client';
import { parseAnyFeed, type ParsedItem } from '@/lib/rss/parser';
import { getSourceTier } from '@/lib/intelligence/signal-engine';
import {
  FEED_REGISTRY,
  CRIME_SOURCE_IDS as REGISTRY_CRIME_IDS,
  REGISTRY_COUNT,
  type FeedSourceEntry,
} from '@/lib/feeds/feed-sources-registry';
import { classifyBatch } from '@/lib/agents/agents/feed-classifier-agent';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type FeedCategory =
  | 'AI/ML'
  | 'Cybersecurity'
  | 'Defense'
  | 'Enterprise'
  | 'Supply Chain'
  | 'Energy'
  | 'Finance'
  | 'Crime'
  | 'General';

export type EnrichedFeedItem = {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  description: string;
  vendor: string;
  score: number;        // 0-10 IKER signal score from Gemini
  sentiment: 'positive' | 'negative' | 'neutral';
  category: FeedCategory;
  sourceTier?: number;  // 1=wire/official, 2=major, 3=specialist, 4=aggregator
};

type GeminiEnrichment = {
  vendor: string;
  score: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  category: FeedCategory;
};

export type SourceHealth = {
  id: string;
  name: string;
  status: 'ok' | 'failed';
  itemCount: number;
};

export type FeedStore = {
  items: EnrichedFeedItem[];
  as_of: string;
  enriched: boolean;    // true = Gemini ran, false = defaults used
  source_count: number;
  sourceHealth: SourceHealth[];
};

// ─── Feed sources (from registry) ────────────────────────────────────────────

// Use the full registry. Tier 1-2 sources are always fetched; tier 3-4 rotate.
const FEED_SOURCES: FeedSourceEntry[] = FEED_REGISTRY;

// Crime source IDs — combines original hardcoded set with registry-detected crime sources
const CRIME_SOURCE_IDS = new Set([
  'ktsm-crime', 'gn-ep-crime', 'gn-ep-police', 'gn-cbp-crime',
  'crm-ktsm-crime', 'crm-ep-crime', 'crm-ep-police', 'crm-cbp-crime',
  ...Array.from(REGISTRY_CRIME_IDS as Iterable<string>),
]);

// name → id lookup built from FEED_SOURCES
const SOURCE_ID_BY_NAME = new Map(FEED_SOURCES.map((s) => [s.name, s.id]));

// ─── Source rotation ────────────────────────────────────────────────────────────
// With 2000+ sources we can't fetch all every cycle. Strategy:
// - Tier 1-2: always fetch (high authority, ~200 sources)
// - Tier 3-4: rotate through batches, different set each cycle
// - Each cycle fetches ~350 sources total (200 core + 150 rotated)

const MAX_SOURCES_PER_CYCLE = 400;
let rotationOffset = 0;

function selectSourcesForCycle(): FeedSourceEntry[] {
  const coreSources = FEED_SOURCES.filter((s) => s.tier <= 2);
  const rotatingSources = FEED_SOURCES.filter((s) => s.tier > 2);

  // How many rotating sources can we add?
  const rotatingBudget = Math.max(0, MAX_SOURCES_PER_CYCLE - coreSources.length);

  // Rotate through the pool
  const start = rotationOffset % rotatingSources.length;
  const selected: FeedSourceEntry[] = [];
  for (let i = 0; i < Math.min(rotatingBudget, rotatingSources.length); i++) {
    selected.push(rotatingSources[(start + i) % rotatingSources.length]);
  }
  rotationOffset += rotatingBudget;

  return [...coreSources, ...selected];
}

// Log registry size on first load (server-side)
if (typeof process !== 'undefined') {
  console.log(`[feed-agent] Registry loaded: ${REGISTRY_COUNT} sources (tier 1-2: ${FEED_SOURCES.filter(s => s.tier <= 2).length}, tier 3-4: ${FEED_SOURCES.filter(s => s.tier > 2).length})`);
}

// ─── In-memory cache + in-flight deduplication ────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedStore: FeedStore | null = null;
let storeExpiresAt = 0;
let inFlightRun: Promise<FeedStore> | null = null;

export function getStoredFeedItems(): FeedStore | null {
  if (cachedStore && Date.now() < storeExpiresAt) return cachedStore;
  return null;
}

function setStoredFeedItems(store: FeedStore): void {
  cachedStore = store;
  storeExpiresAt = Date.now() + CACHE_TTL_MS;
}

// ─── RSS fetching (with concurrency control & rotation) ─────────────────────

const MAX_CONCURRENT_FETCHES = 50; // fetch 50 feeds at a time to avoid rate limits

async function fetchSourceBatch(sources: FeedSourceEntry[]): Promise<PromiseSettledResult<ParsedItem[]>[]> {
  return Promise.allSettled(
    sources.map(async (source) => {
      const response = await fetchWithRetry(
        source.url,
        {
          headers: {
            Accept: 'application/rss+xml, application/xml, text/xml, */*',
            'User-Agent': 'NXTLinkFeedAgent/1.0',
          },
        },
        {
          retries: 1,
          cacheKey: `feed-agent:${source.id}`,
          cacheTtlMs: 3 * 60 * 1000, // 3 min per source
          staleIfErrorMs: 10 * 60 * 1000,
          dedupeInFlight: true,
        },
      );
      if (!response.ok) return [] as ParsedItem[];
      const xml = await response.text();
      return parseAnyFeed(xml, source.name);
    }),
  );
}

async function fetchAllFeeds(): Promise<{ items: ParsedItem[]; sourceCount: number; sourceHealth: SourceHealth[] }> {
  // Select sources for this cycle (tier 1-2 always, tier 3-4 rotated)
  const cycleSources = selectSourcesForCycle();

  // Fetch in batches of MAX_CONCURRENT_FETCHES to avoid overwhelming the network
  const allSettled: PromiseSettledResult<ParsedItem[]>[] = [];
  for (let i = 0; i < cycleSources.length; i += MAX_CONCURRENT_FETCHES) {
    const batch = cycleSources.slice(i, i + MAX_CONCURRENT_FETCHES);
    const batchResults = await fetchSourceBatch(batch);
    allSettled.push(...batchResults);
  }

  const items: ParsedItem[] = [];
  let sourceCount = 0;
  const sourceHealth: SourceHealth[] = cycleSources.map((source, i) => {
    const result = allSettled[i];
    const ok = result?.status === 'fulfilled' && result.value.length > 0;
    const itemCount = ok && result?.status === 'fulfilled' ? result.value.length : 0;
    if (ok) sourceCount++;
    if (ok && result?.status === 'fulfilled') items.push(...result.value);
    return { id: source.id, name: source.name, status: ok ? 'ok' : 'failed', itemCount };
  });

  // Newest-first, cap at 800 before enrichment (more sources = more items)
  return {
    items: items
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 800),
    sourceCount,
    sourceHealth,
  };
}

// ─── Article scraper ──────────────────────────────────────────────────────────

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600);
}

async function scrapeArticleText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NXTLinkFeedAgent/1.0 (RSS reader)' },
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    // Prefer <article> or <main> body; fall back to full page
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
      ?? html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    return extractTextFromHtml(articleMatch?.[1] ?? html);
  } catch {
    return '';
  }
}

// ─── Gemini batch enrichment ───────────────────────────────────────────────────

const FEED_CATEGORIES: FeedCategory[] = ['AI/ML', 'Cybersecurity', 'Defense', 'Enterprise', 'Supply Chain', 'Energy', 'Finance', 'Crime', 'General'];

const SYSTEM_PROMPT = `You are the NXT LINK Feed Intelligence Agent.
Analyze news headlines for relevance to enterprise technology and industrial operations.

For each numbered headline, return one JSON object with exactly these fields:
- "vendor": the primary technology company or product name (e.g. "NVIDIA", "Palantir"). Use "" if none.
- "score": integer 0-10. 10=critical enterprise signal (major AI deployment, supply chain, regulation). 5=moderate relevance. 0=irrelevant (politics, sports, entertainment).
- "sentiment": exactly "positive", "negative", or "neutral" from an enterprise adoption perspective.
- "category": exactly one of: "AI/ML", "Cybersecurity", "Defense", "Enterprise", "Supply Chain", "Energy", "Finance", "Crime", "General".
  - AI/ML: artificial intelligence, machine learning, LLMs, robotics, computer vision
  - Cybersecurity: hacks, breaches, vulnerabilities, CVEs, ransomware, APT groups, threat actors
  - Defense: military tech, defense contracts, weapons systems, DoD, NATO
  - Crime: arrests, shootings, crime reports, police activity, border seizures, drug busts, criminal incidents
  - Enterprise: SaaS, cloud, ERP, digital transformation, enterprise software
  - Supply Chain: logistics, shipping, manufacturing, semiconductors, procurement
  - Energy: oil, gas, renewables, grid, power infrastructure
  - Finance: markets, banking, fintech, crypto, investment rounds
  - General: anything else

Return a JSON array, one object per headline, in the same order, with the exact same length as the input.
Do not include any text outside the JSON array.`;

const DEFAULT_ENRICHMENT: GeminiEnrichment = { vendor: '', score: 5, sentiment: 'neutral', category: 'General' };

function parseEnrichmentJson(raw: string): GeminiEnrichment[] {
  const stripped = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed: unknown = JSON.parse(stripped);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      vendor: typeof item['vendor'] === 'string' ? item['vendor'].trim() : '',
      score: typeof item['score'] === 'number' ? Math.max(0, Math.min(10, Math.round(item['score']))) : 5,
      sentiment: (['positive', 'negative', 'neutral'].includes(item['sentiment'] as string)
        ? (item['sentiment'] as 'positive' | 'negative' | 'neutral')
        : 'neutral'),
      category: (FEED_CATEGORIES.includes(item['category'] as FeedCategory)
        ? (item['category'] as FeedCategory)
        : 'General'),
    }));
}

async function callGeminiBatch(titles: string[]): Promise<GeminiEnrichment[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
  const defaults = titles.map(() => DEFAULT_ENRICHMENT);

  if (!apiKey) return defaults;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const numberedList = titles.map((t, i) => `${i + 1}. ${t}`).join('\n');

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{
      role: 'user',
      parts: [{ text: `Analyze these ${titles.length} headlines:\n\n${numberedList}` }],
    }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) return defaults;

    // Parse using same shape as parseGeminiContent in parallel-router.ts
    const payload = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return defaults;

    const enrichments = parseEnrichmentJson(text);
    // Align length: Gemini may return fewer items than sent
    return titles.map((_, i) => enrichments[i] ?? DEFAULT_ENRICHMENT);
  } catch {
    return defaults;
  }
}

async function enrichAllItems(items: ParsedItem[]): Promise<{ enriched: EnrichedFeedItem[]; usedGemini: boolean }> {
  const BATCH_SIZE = 15;   // headlines per Gemini call
  const CONCURRENCY = 6;   // parallel Gemini calls
  const CONFIDENCE_THRESHOLD = 0.4; // below this → fall back to Gemini
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);

  // ── Step 1: Keyword classification (free, instant) ──────────────────────────
  const articleInputs = items.map((item) => ({
    title: item.title,
    description: item.description,
    source: item.source,
  }));
  const { results: classifierResults, needsGemini: lowConfidenceIndices } =
    classifyBatch(articleInputs, CONFIDENCE_THRESHOLD);

  // ── Step 2: Scrape article text for top items (max 30) ──────────────────────
  const scrapeTargets = items.slice(0, 30);
  const scrapedTexts = await Promise.allSettled(
    scrapeTargets.map((item) => scrapeArticleText(item.link)),
  );
  const textByIndex = scrapeTargets.map((_, i) =>
    scrapedTexts[i]?.status === 'fulfilled' ? scrapedTexts[i].value : '',
  );

  // ── Step 3: Gemini enrichment ONLY for low-confidence items ─────────────────
  // Build a map: original index → GeminiEnrichment
  const geminiEnrichmentMap = new Map<number, GeminiEnrichment>();

  if (hasGemini && lowConfidenceIndices.length > 0) {
    // Collect the items that need Gemini
    const geminiItems = lowConfidenceIndices.map((idx) => items[idx]);
    const geminiInputs = geminiItems.map((item, j) => {
      const originalIdx = lowConfidenceIndices[j];
      const scraped = textByIndex[originalIdx] ?? '';
      return scraped.length > 60 ? `${item.title}\n\n${scraped}` : item.title;
    });

    // Batch and call Gemini
    const geminiBatches: string[][] = [];
    for (let i = 0; i < geminiInputs.length; i += BATCH_SIZE) {
      geminiBatches.push(geminiInputs.slice(i, i + BATCH_SIZE));
    }

    const allGeminiResults: GeminiEnrichment[][] = new Array(geminiBatches.length);
    for (let i = 0; i < geminiBatches.length; i += CONCURRENCY) {
      const chunk = geminiBatches.slice(i, i + CONCURRENCY);
      const results = await Promise.all(chunk.map((b) => callGeminiBatch(b)));
      for (let j = 0; j < chunk.length; j++) {
        allGeminiResults[i + j] = results[j] ?? [];
      }
    }

    // Flatten and map back to original indices
    let geminiIdx = 0;
    for (let b = 0; b < geminiBatches.length; b++) {
      const enrichments = allGeminiResults[b] ?? [];
      for (let j = 0; j < geminiBatches[b].length; j++) {
        const originalIdx = lowConfidenceIndices[geminiIdx];
        if (enrichments[j]) {
          geminiEnrichmentMap.set(originalIdx, enrichments[j]);
        }
        geminiIdx++;
      }
    }

    console.log(`[feed-agent] Classifier: ${items.length} items, ${lowConfidenceIndices.length} sent to Gemini (${Math.round((lowConfidenceIndices.length / items.length) * 100)}%)`);
  } else {
    console.log(`[feed-agent] Classifier: ${items.length} items, all classified by keywords (no Gemini needed)`);
  }

  // ── Step 4: Merge classifier + Gemini results ──────────────────────────────
  const result: EnrichedFeedItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const sourceId = SOURCE_ID_BY_NAME.get(item.source) ?? '';
    const classResult = classifierResults[i];
    const geminiResult = geminiEnrichmentMap.get(i);

    // If Gemini was used for this item, prefer its enrichment
    if (geminiResult) {
      result.push({
        title: item.title,
        link: item.link,
        source: item.source,
        pubDate: item.pubDate,
        description: item.description,
        vendor: geminiResult.vendor,
        score: geminiResult.score,
        sentiment: geminiResult.sentiment,
        category: CRIME_SOURCE_IDS.has(sourceId) ? 'Crime' : geminiResult.category,
        sourceTier: getSourceTier(item.source),
      });
    } else {
      // Use classifier result
      const entities = classResult.keyEntities;
      const vendor = entities.length > 0 ? entities[0] : '';
      // Derive score from confidence: 0.0→3, 0.5→5, 1.0→8
      const baseScore = Math.round(3 + classResult.confidence * 5);
      result.push({
        title: item.title,
        link: item.link,
        source: item.source,
        pubDate: item.pubDate,
        description: item.description,
        vendor,
        score: baseScore,
        sentiment: classResult.sentiment,
        category: CRIME_SOURCE_IDS.has(sourceId) ? 'Crime' : classResult.category,
        sourceTier: getSourceTier(item.source),
      });
    }
  }

  return { enriched: result, usedGemini: hasGemini && lowConfidenceIndices.length > 0 };
}

// ─── Optional Supabase persistence ────────────────────────────────────────────

async function tryPersistToSupabase(items: EnrichedFeedItem[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const client = getSupabaseClient({ admin: true });
    await client.from('feed_signals').upsert(
      items.map((item) => ({
        title: item.title,
        link: item.link,
        source: item.source,
        pub_date: item.pubDate || null,
        description: item.description,
        vendor: item.vendor || null,
        iker_score: item.score,
        sentiment: item.sentiment,
        created_at: new Date().toISOString(),
      })),
      { onConflict: 'link', ignoreDuplicates: true },
    );
  } catch {
    // Persistence is always optional — swallow errors
  }
}

// ─── Main agent entry point ────────────────────────────────────────────────────

async function doRunFeedAgent(): Promise<FeedStore> {
  const { items: rawItems, sourceCount, sourceHealth } = await fetchAllFeeds();
  const { enriched: enrichedItems, usedGemini } = await enrichAllItems(rawItems);

  // Sort: high-score first, then newest; keep up to 500 for the panel
  const sorted = enrichedItems
    .sort((a, b) => b.score - a.score || new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 500);

  const store: FeedStore = {
    items: sorted,
    as_of: new Date().toISOString(),
    enriched: usedGemini,
    source_count: sourceCount,
    sourceHealth,
  };

  setStoredFeedItems(store);

  // Fire-and-forget — never awaited
  void tryPersistToSupabase(sorted);

  return store;
}

export async function runFeedAgent(): Promise<FeedStore> {
  if (inFlightRun) return inFlightRun;
  inFlightRun = doRunFeedAgent().finally(() => {
    inFlightRun = null;
  });
  return inFlightRun;
}

export function scoreIKER(input: {
  vendorName?: string;
  sentiment?: number;
  source?: string;
  sourceReliability?: number;
  category?: string;
  title?: string;
}): number {
  const sentiment = input.sentiment ?? 0;
  const reliability = Math.max(0, Math.min(1, input.sourceReliability ?? 0.75));
  const title = (input.title ?? '').toLowerCase();

  let score = 50;
  score += sentiment * 20;
  score += reliability * 20;

  if (input.vendorName && input.vendorName.trim().length > 1) score += 5;

  const highSignalWords = ['contract', 'deployment', 'funding', 'acquired', 'partnership', 'award', 'launch'];
  for (const word of highSignalWords) {
    if (title.includes(word)) {
      score += 4;
    }
  }

  const lowSignalWords = ['rumor', 'alleged', 'opinion', 'speculation'];
  for (const word of lowSignalWords) {
    if (title.includes(word)) {
      score -= 6;
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
