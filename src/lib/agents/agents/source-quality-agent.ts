// src/lib/agents/agents/source-quality-agent.ts
// Source Quality Discovery Agent — finds and evaluates high-quality authoritative
// sources (academic papers, government reports, white papers, patents, financial
// filings, professional intelligence) for the NXT//LINK platform.

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';
import { parseAnyFeed, type ParsedItem } from '@/lib/rss/parser';
import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';
import {
  QUALITY_FEEDS,
  type QualityFeedSource,
  type QualityFeedType,
} from '@/lib/feeds/quality-source-feeds';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type SourceType =
  | 'academic'
  | 'whitepaper'
  | 'government'
  | 'patent'
  | 'financial'
  | 'professional';

export type QualitySource = {
  id: string;
  title: string;
  url: string;
  sourceType: SourceType;
  qualityScore: number;
  authority: number;
  recency: number;
  relevance: number;
  verifiability: number;
  authors?: string[];
  publication?: string;
  abstract?: string;
  discoveredAt: string;
  tags: string[];
};

export type QualitySourceStore = {
  sources: QualitySource[];
  as_of: string;
  feed_count: number;
  feeds_ok: number;
  feeds_failed: number;
  total_raw_items: number;
  llm_enriched: boolean;
};

type RawCandidate = {
  title: string;
  url: string;
  description: string;
  pubDate: string;
  feedSource: QualityFeedSource;
};

type LlmScoring = {
  authority: number;
  relevance: number;
  verifiability: number;
  authors: string[];
  publication: string;
  abstract: string;
  tags: string[];
  sourceType: SourceType;
};

// ─── Quality scoring constants ──────────────────────────────────────────────────

const AUTHORITY_BY_TYPE: Record<QualityFeedType, number> = {
  government: 28,
  academic: 26,
  standards: 25,
  whitepaper: 22,
  financial: 18,
  patent: 20,
  professional: 14,
};

const AUTHORITY_BY_TIER: Record<1 | 2 | 3, number> = {
  1: 30,
  2: 22,
  3: 14,
};

// Keywords that boost relevance for El Paso / border corridor
const EP_RELEVANCE_KEYWORDS = [
  'el paso', 'utep', 'fort bliss', 'white sands', 'borderplex',
  'juarez', 'ciudad juarez', 'epwu', 'ep water', 'eppd',
  'paso del norte', 'santa teresa', 'sunland park',
];

const TX_RELEVANCE_KEYWORDS = [
  'texas', 'tx ', 'ercot', 'txdot', 'san antonio', 'austin',
];

const DEFENSE_BORDER_KEYWORDS = [
  'border security', 'border patrol', 'cbp', 'customs', 'dhs',
  'homeland security', 'defense contract', 'military', 'army',
  'darpa', 'diu', 'sbir', 'sttr',
];

const VERIFIABILITY_INDICATORS = {
  doi: /\b10\.\d{4,}\/\S+/i,
  arxivId: /\barxiv:\s?\d{4}\.\d{4,}/i,
  patentNumber: /\b(US|EP|WO)\s?\d{5,}/i,
  namedAuthors: /\b(et al\.|PhD|Dr\.|Prof\.|University|Institute)\b/i,
  orgAttribution: /\b(Department of|Office of|Bureau of|National|Federal)\b/i,
};

// ─── In-memory cache ────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cachedStore: QualitySourceStore | null = null;
let storeExpiresAt = 0;
let inFlightRun: Promise<QualitySourceStore> | null = null;

export function getCachedQualitySources(): QualitySourceStore | null {
  if (cachedStore && Date.now() < storeExpiresAt) return cachedStore;
  return null;
}

function setCachedQualitySources(store: QualitySourceStore): void {
  cachedStore = store;
  storeExpiresAt = Date.now() + CACHE_TTL_MS;
}

// ─── RSS fetching ───────────────────────────────────────────────────────────────

async function fetchQualityFeeds(): Promise<{
  candidates: RawCandidate[];
  feedsOk: number;
  feedsFailed: number;
  totalRawItems: number;
}> {
  const CONCURRENCY = 10;
  const feedBatches: QualityFeedSource[][] = [];
  for (let i = 0; i < QUALITY_FEEDS.length; i += CONCURRENCY) {
    feedBatches.push(QUALITY_FEEDS.slice(i, i + CONCURRENCY));
  }

  const allCandidates: RawCandidate[] = [];
  let feedsOk = 0;
  let feedsFailed = 0;
  let totalRawItems = 0;

  for (const batch of feedBatches) {
    const settled = await Promise.allSettled(
      batch.map(async (source) => {
        const response = await fetchWithRetry(
          source.url,
          {
            headers: {
              Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
              'User-Agent': 'NXTLinkQualityAgent/1.0',
            },
            signal: AbortSignal.timeout(8_000),
          },
          {
            retries: 1,
            cacheKey: `quality-feed:${source.id}`,
            cacheTtlMs: 30 * 60 * 1000, // 30 min per source
            staleIfErrorMs: 60 * 60 * 1000,
            dedupeInFlight: true,
          },
        );
        if (!response.ok) return { source, items: [] as ParsedItem[] };
        const xml = await response.text();
        const items = parseAnyFeed(xml, source.name);
        return { source, items };
      }),
    );

    for (const result of settled) {
      if (result.status === 'fulfilled' && result.value.items.length > 0) {
        feedsOk++;
        const { source, items } = result.value;
        totalRawItems += items.length;
        for (const item of items) {
          allCandidates.push({
            title: item.title,
            url: item.link,
            description: item.description,
            pubDate: item.pubDate,
            feedSource: source,
          });
        }
      } else {
        feedsFailed++;
      }
    }
  }

  return { candidates: allCandidates, feedsOk, feedsFailed, totalRawItems };
}

// ─── Heuristic quality scoring (no LLM) ────────────────────────────────────────

function computeRecencyScore(pubDate: string): number {
  if (!pubDate) return 5;
  const published = new Date(pubDate).getTime();
  if (Number.isNaN(published)) return 5;
  const daysAgo = (Date.now() - published) / (1000 * 60 * 60 * 24);
  if (daysAgo <= 30) return 20;
  if (daysAgo <= 90) return 15;
  if (daysAgo <= 365) return 10;
  return 5;
}

function computeHeuristicAuthority(feed: QualityFeedSource): number {
  // Blend feed type authority with tier authority
  const typeAuth = AUTHORITY_BY_TYPE[feed.type] ?? 10;
  const tierAuth = AUTHORITY_BY_TIER[feed.tier] ?? 10;
  return Math.round((typeAuth + tierAuth) / 2);
}

function computeHeuristicRelevance(text: string): number {
  const lower = text.toLowerCase();
  // Direct El Paso mention = 30
  for (const kw of EP_RELEVANCE_KEYWORDS) {
    if (lower.includes(kw)) return 30;
  }
  // Texas mention = 20
  for (const kw of TX_RELEVANCE_KEYWORDS) {
    if (lower.includes(kw)) return 20;
  }
  // Defense/border general = 15
  for (const kw of DEFENSE_BORDER_KEYWORDS) {
    if (lower.includes(kw)) return 15;
  }
  // Tech general = 10
  return 10;
}

function computeHeuristicVerifiability(text: string): number {
  const lower = text.toLowerCase();
  if (VERIFIABILITY_INDICATORS.doi.test(text)) return 20;
  if (VERIFIABILITY_INDICATORS.arxivId.test(lower)) return 20;
  if (VERIFIABILITY_INDICATORS.patentNumber.test(text)) return 20;
  if (VERIFIABILITY_INDICATORS.namedAuthors.test(text)) return 15;
  if (VERIFIABILITY_INDICATORS.orgAttribution.test(text)) return 10;
  return 5;
}

function mapFeedTypeToSourceType(feedType: QualityFeedType): SourceType {
  switch (feedType) {
    case 'government': return 'government';
    case 'academic': return 'academic';
    case 'whitepaper': return 'whitepaper';
    case 'patent': return 'patent';
    case 'financial': return 'financial';
    case 'standards': return 'government';
    case 'professional': return 'professional';
    default: return 'professional';
  }
}

function generateSourceId(url: string, title: string): string {
  // Deterministic ID based on URL hash
  const input = `${url}|${title}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `qs-${Math.abs(hash).toString(36)}`;
}

function scoreAndFilterCandidates(candidates: RawCandidate[]): QualitySource[] {
  const scored: QualitySource[] = [];
  const seenUrls = new Set<string>();

  for (const candidate of candidates) {
    // Deduplicate by URL
    if (seenUrls.has(candidate.url)) continue;
    seenUrls.add(candidate.url);

    const combinedText = `${candidate.title} ${candidate.description}`;
    const authority = computeHeuristicAuthority(candidate.feedSource);
    const recency = computeRecencyScore(candidate.pubDate);
    const relevance = computeHeuristicRelevance(combinedText);
    const verifiability = computeHeuristicVerifiability(combinedText);
    const qualityScore = authority + recency + relevance + verifiability;

    // Only keep sources scoring 60+
    if (qualityScore < 60) continue;

    scored.push({
      id: generateSourceId(candidate.url, candidate.title),
      title: candidate.title,
      url: candidate.url,
      sourceType: mapFeedTypeToSourceType(candidate.feedSource.type),
      qualityScore,
      authority,
      recency,
      relevance,
      verifiability,
      abstract: candidate.description || undefined,
      discoveredAt: new Date().toISOString(),
      tags: [...candidate.feedSource.tags],
    });
  }

  // Sort by quality score descending
  scored.sort((a, b) => b.qualityScore - a.qualityScore);

  return scored;
}

// ─── LLM enrichment (optional, uses Gemini for deeper scoring) ──────────────────

const LLM_SYSTEM_PROMPT = `You are the NXT LINK Source Quality Agent. You evaluate information sources for authority, relevance to El Paso TX technology intelligence, and verifiability.

For each numbered source, return a JSON object with:
- "authority": 0-30 integer. Government official = 28-30, Academic peer-reviewed = 24-27, Think tank = 20-23, Major publication = 16-19, Trade press = 12-15, Blog/unknown = 5-11
- "relevance": 0-30 integer. Direct El Paso/UTEP/Fort Bliss mention = 28-30, Texas = 18-22, Defense/border general = 13-17, Technology general = 8-12, Unrelated = 0-7
- "verifiability": 0-20 integer. Has DOI/patent/arxiv ID = 18-20, Named authors + institution = 13-17, Org attribution only = 8-12, Anonymous/unverifiable = 3-7
- "authors": string array of author names if detectable, empty array otherwise
- "publication": name of journal/institution/org publishing this, empty string if unknown
- "abstract": 1-2 sentence summary of what this source covers
- "tags": string array of 3-5 relevant topic tags (lowercase, no spaces, use hyphens)
- "sourceType": exactly one of "academic", "whitepaper", "government", "patent", "financial", "professional"

Return a JSON array, one object per source, in the same order as input.
Do not include any text outside the JSON array.`;

function parseLlmScoringArray(raw: string): LlmScoring[] {
  const stripped = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed: unknown = JSON.parse(stripped);
  if (!Array.isArray(parsed)) return [];

  const validSourceTypes: SourceType[] = [
    'academic', 'whitepaper', 'government', 'patent', 'financial', 'professional',
  ];

  return parsed
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      authority: typeof item['authority'] === 'number'
        ? Math.max(0, Math.min(30, Math.round(item['authority'])))
        : 15,
      relevance: typeof item['relevance'] === 'number'
        ? Math.max(0, Math.min(30, Math.round(item['relevance'])))
        : 10,
      verifiability: typeof item['verifiability'] === 'number'
        ? Math.max(0, Math.min(20, Math.round(item['verifiability'])))
        : 5,
      authors: Array.isArray(item['authors'])
        ? (item['authors'] as unknown[]).filter((a): a is string => typeof a === 'string')
        : [],
      publication: typeof item['publication'] === 'string' ? item['publication'] : '',
      abstract: typeof item['abstract'] === 'string' ? item['abstract'] : '',
      tags: Array.isArray(item['tags'])
        ? (item['tags'] as unknown[]).filter((t): t is string => typeof t === 'string')
        : [],
      sourceType: validSourceTypes.includes(item['sourceType'] as SourceType)
        ? (item['sourceType'] as SourceType)
        : 'professional',
    }));
}

async function enrichWithLlm(sources: QualitySource[]): Promise<{
  enriched: QualitySource[];
  usedLlm: boolean;
}> {
  // Only enrich top 60 sources to save tokens
  const toEnrich = sources.slice(0, 60);
  const rest = sources.slice(60);

  if (toEnrich.length === 0) {
    return { enriched: sources, usedLlm: false };
  }

  const BATCH_SIZE = 15;
  const batches: QualitySource[][] = [];
  for (let i = 0; i < toEnrich.length; i += BATCH_SIZE) {
    batches.push(toEnrich.slice(i, i + BATCH_SIZE));
  }

  let usedLlm = false;
  const enrichedSources: QualitySource[] = [];

  for (const batch of batches) {
    const numberedList = batch
      .map((s, i) => `${i + 1}. TITLE: ${s.title}\n   URL: ${s.url}\n   DESC: ${s.abstract ?? 'N/A'}`)
      .join('\n\n');

    try {
      const { result: scorings } = await runParallelJsonEnsemble<LlmScoring[]>({
        systemPrompt: LLM_SYSTEM_PROMPT,
        userPrompt: `Evaluate these ${batch.length} sources for the NXT//LINK El Paso technology intelligence platform:\n\n${numberedList}`,
        temperature: 0.1,
        maxProviders: 1,
        budget: { preferLowCostProviders: true, reserveCompletionTokens: 800 },
        parse: (content) => parseLlmScoringArray(content),
      });

      usedLlm = true;

      for (let i = 0; i < batch.length; i++) {
        const source = batch[i];
        if (!source) continue;
        const scoring = scorings[i];

        if (scoring) {
          const authority = scoring.authority;
          const relevance = scoring.relevance;
          const verifiability = scoring.verifiability;
          const recency = source.recency; // keep heuristic recency
          const qualityScore = authority + recency + relevance + verifiability;

          enrichedSources.push({
            ...source,
            sourceType: scoring.sourceType,
            qualityScore,
            authority,
            relevance,
            verifiability,
            authors: scoring.authors.length > 0 ? scoring.authors : source.authors,
            publication: scoring.publication || source.publication,
            abstract: scoring.abstract || source.abstract,
            tags: scoring.tags.length > 0 ? scoring.tags : source.tags,
          });
        } else {
          enrichedSources.push(source);
        }
      }
    } catch {
      // LLM failed for this batch — keep heuristic scores
      enrichedSources.push(...batch);
    }
  }

  // Combine enriched + rest, re-filter and re-sort
  const allSources = [...enrichedSources, ...rest]
    .filter((s) => s.qualityScore >= 60)
    .sort((a, b) => b.qualityScore - a.qualityScore);

  return { enriched: allSources, usedLlm };
}

// ─── arXiv API fetching (supplements RSS with structured data) ──────────────────

type ArxivEntry = {
  title: string;
  url: string;
  authors: string[];
  abstract: string;
  published: string;
  categories: string[];
};

async function fetchArxivApi(query: string, maxResults: number = 20): Promise<ArxivEntry[]> {
  const encoded = encodeURIComponent(query);
  const apiUrl = `https://export.arxiv.org/api/query?search_query=${encoded}&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;

  try {
    const response = await fetchWithRetry(
      apiUrl,
      {
        headers: { 'User-Agent': 'NXTLinkQualityAgent/1.0' },
        signal: AbortSignal.timeout(10_000),
      },
      {
        retries: 1,
        cacheKey: `arxiv-api:${query}`,
        cacheTtlMs: 60 * 60 * 1000, // 1 hour
        staleIfErrorMs: 2 * 60 * 60 * 1000,
        dedupeInFlight: true,
      },
    );

    if (!response.ok) return [];
    const xml = await response.text();

    // Parse arXiv Atom entries
    const entries = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi));
    return entries.map((match) => {
      const block = match[1] ?? '';

      // Title
      const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = (titleMatch?.[1] ?? '').replace(/\s+/g, ' ').trim();

      // Link
      const linkMatch = block.match(/<id[^>]*>([\s\S]*?)<\/id>/i);
      const url = (linkMatch?.[1] ?? '').trim();

      // Authors
      const authorMatches = Array.from(block.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/gi));
      const authors = authorMatches.map((m) => (m[1] ?? '').trim()).filter(Boolean);

      // Abstract / summary
      const summaryMatch = block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
      const abstract = (summaryMatch?.[1] ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);

      // Published date
      const pubMatch = block.match(/<published[^>]*>([\s\S]*?)<\/published>/i);
      const published = (pubMatch?.[1] ?? '').trim();

      // Categories
      const catMatches = Array.from(block.matchAll(/<category[^>]+term=["']([^"']+)["']/gi));
      const categories = catMatches.map((m) => (m[1] ?? '').trim()).filter(Boolean);

      return { title, url, authors, abstract, published, categories };
    }).filter((e) => e.title.length > 4 && e.url.length > 0);
  } catch {
    return [];
  }
}

const ARXIV_QUERIES = [
  'all:border AND all:security AND all:technology',
  'all:defense AND all:autonomous AND all:systems',
  'all:critical AND all:infrastructure AND all:cybersecurity',
  'all:water AND all:desalination AND all:technology',
  'all:supply AND all:chain AND all:optimization',
];

async function fetchArxivSources(): Promise<QualitySource[]> {
  const settled = await Promise.allSettled(
    ARXIV_QUERIES.map((q) => fetchArxivApi(q, 15)),
  );

  const sources: QualitySource[] = [];
  const seenUrls = new Set<string>();

  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    for (const entry of result.value) {
      if (seenUrls.has(entry.url)) continue;
      seenUrls.add(entry.url);

      const combinedText = `${entry.title} ${entry.abstract} ${entry.authors.join(' ')}`;
      const authority = 26; // Academic preprint
      const recency = computeRecencyScore(entry.published);
      const relevance = computeHeuristicRelevance(combinedText);
      const verifiability = 20; // arXiv always has ID + named authors
      const qualityScore = authority + recency + relevance + verifiability;

      if (qualityScore < 60) continue;

      sources.push({
        id: generateSourceId(entry.url, entry.title),
        title: entry.title,
        url: entry.url,
        sourceType: 'academic',
        qualityScore,
        authority,
        recency,
        relevance,
        verifiability,
        authors: entry.authors.length > 0 ? entry.authors : undefined,
        abstract: entry.abstract || undefined,
        discoveredAt: new Date().toISOString(),
        tags: [
          'arxiv',
          'preprint',
          ...entry.categories.slice(0, 3),
        ],
      });
    }
  }

  return sources;
}

// ─── Main agent entry point ─────────────────────────────────────────────────────

async function doRunQualitySourceAgent(): Promise<QualitySourceStore> {
  // Phase 1: Fetch all quality RSS feeds in parallel
  const { candidates, feedsOk, feedsFailed, totalRawItems } = await fetchQualityFeeds();

  // Phase 2: Fetch arXiv API sources
  const arxivSources = await fetchArxivSources();

  // Phase 3: Score and filter RSS candidates (heuristic pass)
  const heuristicSources = scoreAndFilterCandidates(candidates);

  // Phase 4: Combine RSS + arXiv, deduplicate
  const seenUrls = new Set<string>();
  const combined: QualitySource[] = [];
  for (const source of [...heuristicSources, ...arxivSources]) {
    if (seenUrls.has(source.url)) continue;
    seenUrls.add(source.url);
    combined.push(source);
  }

  // Phase 5: LLM enrichment for top candidates
  const { enriched, usedLlm } = await enrichWithLlm(combined);

  // Cap at 200 sources
  const final = enriched.slice(0, 200);

  const store: QualitySourceStore = {
    sources: final,
    as_of: new Date().toISOString(),
    feed_count: QUALITY_FEEDS.length,
    feeds_ok: feedsOk,
    feeds_failed: feedsFailed,
    total_raw_items: totalRawItems + arxivSources.length,
    llm_enriched: usedLlm,
  };

  setCachedQualitySources(store);
  return store;
}

export async function runQualitySourceAgent(): Promise<QualitySourceStore> {
  // Deduplicate in-flight runs
  if (inFlightRun) return inFlightRun;
  inFlightRun = doRunQualitySourceAgent().finally(() => {
    inFlightRun = null;
  });
  return inFlightRun;
}
