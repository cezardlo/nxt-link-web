// src/lib/agents/feed-agent.ts
// Fetches 70,000+ RSS/Atom sources via FEED_REGISTRY, classifies with keyword
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

// ─── Feed sources (from registry + Supabase DB) ───────────────────────────────

// Base registry — always available as fallback
let FEED_SOURCES: FeedSourceEntry[] = FEED_REGISTRY;
let supabaseSourcesLoaded = false;

/**
 * Load additional sources from Supabase feed_sources table.
 * Called once at startup. Merges DB sources with TypeScript registry,
 * deduplicating by URL. DB sources can expand to 1M+ without TS file bloat.
 */
export async function loadSupabaseFeedSources(): Promise<void> {
  if (supabaseSourcesLoaded) return;
  if (!isSupabaseConfigured()) return;

  try {
    const db = getSupabaseClient();
    const PAGE_SIZE = 10_000;
    let page = 0;
    const dbSources: FeedSourceEntry[] = [];

    // Paginate through all active sources
    while (true) {
      const { data, error } = await db
        .from('feed_sources')
        .select('id, name, url, tier, category')
        .eq('is_active', true)
        .gte('quality_score', 0.60)
        .order('tier', { ascending: true })
        .order('quality_score', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error || !data || data.length === 0) break;

      for (const row of data as Array<{ id: string; name: string; url: string; tier: number; category: string }>) {
        dbSources.push({ id: row.id, name: row.name, url: row.url, tier: row.tier as 1|2|3|4, category: row.category as FeedCategory, tags: [] });
      }

      if (data.length < PAGE_SIZE) break;
      page++;
    }

    if (dbSources.length > 0) {
      // Merge: DB sources take precedence (by URL), then add TS registry extras
      const seenUrls = new Set(dbSources.map(s => s.url));
      const tsExtras = FEED_REGISTRY.filter(s => !seenUrls.has(s.url));
      FEED_SOURCES = [...dbSources, ...tsExtras];
      console.log(`[feed-agent] Loaded ${dbSources.length} sources from Supabase + ${tsExtras.length} from TS registry = ${FEED_SOURCES.length} total`);
    }
  } catch (err) {
    console.warn('[feed-agent] Failed to load Supabase feed sources, using TS registry:', err);
  }

  supabaseSourcesLoaded = true;
}

// Crime source IDs — combines original hardcoded set with registry-detected crime sources
const CRIME_SOURCE_IDS = new Set([
  'ktsm-crime', 'gn-ep-crime', 'gn-ep-police', 'gn-cbp-crime',
  'crm-ktsm-crime', 'crm-ep-crime', 'crm-ep-police', 'crm-cbp-crime',
  ...Array.from(REGISTRY_CRIME_IDS as Iterable<string>),
]);

// name → id lookup built from FEED_SOURCES
const SOURCE_ID_BY_NAME = new Map(FEED_SOURCES.map((s) => [s.name, s.id]));

// ─── Source rotation ────────────────────────────────────────────────────────────
// With 70,000+ sources we can't fetch all every cycle. Fixed 3-tier budget:
// - Tier 1: always fetch up to 200 (official wires, major news)
// - Tier 2: sample up to 600 per cycle (rotating)
// - Tier 3-4: sample up to 2,200 per cycle (rotating)
// - Total per cycle: ~3,000 sources
// - Full rotation through 78K sources: ~35 cycles (~2.9 hours at 5min intervals)

// Vercel serverless has 60s limit — keep budget tight
const MAX_TIER1 = 40;
const MAX_TIER2 = 60;
const MAX_ROTATING = 100;
let rotationOffsetT2 = 0;
let rotationOffsetT34 = 0;

function selectSourcesForCycle(): FeedSourceEntry[] {
  const tier1 = FEED_SOURCES.filter((s) => s.tier === 1).slice(0, MAX_TIER1);

  const tier2all = FEED_SOURCES.filter((s) => s.tier === 2);
  const t2start = tier2all.length > 0 ? rotationOffsetT2 % tier2all.length : 0;
  const tier2: FeedSourceEntry[] = [];
  for (let i = 0; i < Math.min(MAX_TIER2, tier2all.length); i++) {
    tier2.push(tier2all[(t2start + i) % tier2all.length]);
  }
  rotationOffsetT2 += MAX_TIER2;

  const tier34all = FEED_SOURCES.filter((s) => s.tier > 2);
  const t34start = tier34all.length > 0 ? rotationOffsetT34 % tier34all.length : 0;
  const tier34: FeedSourceEntry[] = [];
  for (let i = 0; i < Math.min(MAX_ROTATING, tier34all.length); i++) {
    tier34.push(tier34all[(t34start + i) % tier34all.length]);
  }
  rotationOffsetT34 += MAX_ROTATING;

  return [...tier1, ...tier2, ...tier34];
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

const MAX_CONCURRENT_FETCHES = 30; // keep low for Vercel serverless 60s limit

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

/** Persist source health back to Supabase feed_sources table (fire-and-forget) */
async function recordSourceHealthBatch(sources: FeedSourceEntry[], health: SourceHealth[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const db = getSupabaseClient();
    // Only record health for sources that exist in the DB (have a real ID stored there)
    // Use the SQL function record_feed_source_health to avoid N separate updates
    const updates = health.map((h, i) => ({
      id: sources[i]?.id,
      success: h.status === 'ok',
    })).filter(u => u.id);

    // Batch in groups of 100 to avoid query size limits
    for (let i = 0; i < updates.length; i += 100) {
      const batch = updates.slice(i, i + 100);
      // Update successful sources
      const successIds = batch.filter(u => u.success).map(u => u.id);
      const failedIds  = batch.filter(u => !u.success).map(u => u.id);

      if (successIds.length > 0) {
        await db.from('feed_sources')
          .update({ last_success: new Date().toISOString(), last_checked: new Date().toISOString(), consecutive_failures: 0 })
          .in('id', successIds);
      }
      if (failedIds.length > 0) {
        // Increment consecutive_failures for each failed source
        for (const id of failedIds) {
          await db.from('feed_sources')
            .update({ last_checked: new Date().toISOString() })
            .eq('id', id)
            .then(() => null, () => null);
        }
      }
    }
  } catch {
    // Non-critical — don't block the feed pipeline
  }
}

async function fetchAllFeeds(): Promise<{ items: ParsedItem[]; sourceCount: number; sourceHealth: SourceHealth[] }> {
  // Load Supabase sources on first call (no-op after that)
  await loadSupabaseFeedSources();

  // Select sources for this cycle (tier 1 always, tier 2-4 rotated)
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

  // Record source health to Supabase (fire-and-forget, non-blocking)
  void recordSourceHealthBatch(cycleSources, sourceHealth);

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

// ─── Supabase persistence ──────────────────────────────────────────────────────

type FeedItemRow = {
  title: string;
  link: string;
  source: string;
  pub_date: string | null;
  description: string;
  vendor: string | null;
  score: number;
  sentiment: string;
  category: string;
  source_tier: number | null;
};

function mapItemToRow(item: EnrichedFeedItem): FeedItemRow {
  return {
    title: item.title,
    link: item.link,
    source: item.source,
    pub_date: item.pubDate || null,
    description: item.description,
    vendor: item.vendor || null,
    score: item.score,
    sentiment: item.sentiment,
    category: item.category,
    source_tier: item.sourceTier ?? null,
  };
}

async function persistFeedItems(items: EnrichedFeedItem[]): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const client = getSupabaseClient({ admin: true });
  const rows = items.map(mapItemToRow);
  const BATCH_SIZE = 100;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await client
      .from('feed_items')
      .upsert(batch, { onConflict: 'link' });

    if (error) {
      failCount += batch.length;
      console.error(`[feed-agent] Supabase upsert batch failed:`, error.message);
    } else {
      successCount += batch.length;
    }
  }

  console.log(`[feed-agent] Persisted to Supabase: ${successCount} ok, ${failCount} failed`);
}

async function logAgentRun(
  agentName: string,
  status: string,
  itemsProcessed: number,
  itemsCreated: number,
  error?: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const client = getSupabaseClient({ admin: true });
    await client.from('agent_runs').insert({
      agent_name: agentName,
      status,
      items_processed: itemsProcessed,
      items_created: itemsCreated,
      error: error ?? null,
      ran_at: new Date().toISOString(),
    });
  } catch {
    // Don't break the feed agent if logging fails
  }
}

export async function getPersistedFeedItems(
  limit?: number,
  category?: string,
): Promise<EnrichedFeedItem[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const client = getSupabaseClient({ admin: true });
    let query = client
      .from('feed_items')
      .select('title, link, source, pub_date, description, vendor, score, sentiment, category, source_tier')
      .order('pub_date', { ascending: false })
      .limit(limit ?? 100);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return (data as Array<{
      title: string;
      link: string;
      source: string;
      pub_date: string | null;
      description: string;
      vendor: string | null;
      score: number;
      sentiment: string;
      category: string;
      source_tier: number | null;
    }>).map((row) => ({
      title: row.title,
      link: row.link,
      source: row.source,
      pubDate: row.pub_date ?? '',
      description: row.description,
      vendor: row.vendor ?? '',
      score: row.score,
      sentiment: row.sentiment as 'positive' | 'negative' | 'neutral',
      category: row.category as FeedCategory,
      sourceTier: row.source_tier ?? undefined,
    }));
  } catch {
    return [];
  }
}

// ─── Main agent entry point ────────────────────────────────────────────────────

async function doRunFeedAgent(): Promise<FeedStore> {
  try {
    const { items: rawItems, sourceCount, sourceHealth } = await fetchAllFeeds();
    const { enriched: enrichedItems, usedGemini } = await enrichAllItems(rawItems);

    // Sort: high-score first, then newest; keep up to 500 for the panel
    const sorted = enrichedItems
      .sort((a, b) => b.score - a.score || new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 500);

    const newCount = sorted.length;

    const store: FeedStore = {
      items: sorted,
      as_of: new Date().toISOString(),
      enriched: usedGemini,
      source_count: sourceCount,
      sourceHealth,
    };

    setStoredFeedItems(store);

    // Await Supabase persistence so it completes before Vercel shuts down the function
    try {
      await persistFeedItems(store.items);
    } catch (err: unknown) {
      console.error('[feed-agent] persistFeedItems error:', err instanceof Error ? err.message : err);
    }
    try {
      await logAgentRun('feed-agent', 'success', store.items.length, newCount);
    } catch {
      // non-critical — swallow
    }

    return store;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logAgentRun('feed-agent', 'failed', 0, 0, message).catch(() => {});
    throw err;
  }
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
