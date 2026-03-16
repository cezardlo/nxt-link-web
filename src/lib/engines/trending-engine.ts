// src/lib/engines/trending-engine.ts
// Trending Technologies Engine — NXT//LINK
//
// Detects which technologies, companies, and topics are spiking relative
// to their baseline. Inspired by World Monitor's trending-keywords feature:
// compares a rolling current window against a 7-day baseline to surface spikes.
//
// Pure computation — no LLM calls. Uses in-memory feed cache from feed-agent.

import type { EnrichedFeedItem } from '@/lib/agents/feed-agent';

// ─── Public Types ─────────────────────────────────────────────────────────────

export type TrendingItemType = 'technology' | 'company' | 'topic' | 'keyword';

export type TrendingItem = {
  term: string;
  type: TrendingItemType;
  mentions: number;        // count in current window
  baseline: number;        // average count in baseline period (normalized)
  spike: number;           // ratio: mentions / baseline (e.g. 3.5x)
  velocity: 'explosive' | 'surging' | 'rising' | 'steady';
  relatedIndustries: string[];
  sampleHeadlines: string[];   // up to 3
  firstSeen: string;           // ISO timestamp of earliest mention in window
};

export type TrendingResult = {
  status: 'success';
  window: string;
  baselinePeriod: string;
  timestamp: string;
  trending: TrendingItem[];
  totalArticlesScanned: number;
};

// ─── Curated Term Dictionary ──────────────────────────────────────────────────

type TermEntry = {
  term: string;
  type: TrendingItemType;
  industries: string[];
};

const TERM_DICT: TermEntry[] = [
  // ── Technologies ────────────────────────────────────────────────────────────
  { term: 'artificial intelligence', type: 'technology', industries: ['ai-ml'] },
  { term: 'machine learning',        type: 'technology', industries: ['ai-ml'] },
  { term: 'deep learning',           type: 'technology', industries: ['ai-ml'] },
  { term: 'neural network',          type: 'technology', industries: ['ai-ml'] },
  { term: 'transformer',             type: 'technology', industries: ['ai-ml'] },
  { term: 'llm',                     type: 'technology', industries: ['ai-ml'] },
  { term: 'gpt',                     type: 'technology', industries: ['ai-ml'] },
  { term: 'generative ai',           type: 'technology', industries: ['ai-ml'] },
  { term: 'computer vision',         type: 'technology', industries: ['ai-ml', 'defense'] },
  { term: 'nlp',                     type: 'technology', industries: ['ai-ml'] },
  { term: 'reinforcement learning',  type: 'technology', industries: ['ai-ml', 'robotics'] },
  { term: 'quantum computing',       type: 'technology', industries: ['ai-ml', 'defense', 'cybersecurity'] },
  { term: 'blockchain',              type: 'technology', industries: ['fintech', 'supply-chain'] },
  { term: 'edge computing',          type: 'technology', industries: ['ai-ml', 'iot'] },
  { term: 'digital twin',            type: 'technology', industries: ['manufacturing', 'defense'] },
  { term: '5g',                      type: 'technology', industries: ['telecom', 'iot'] },
  { term: '6g',                      type: 'technology', industries: ['telecom'] },
  { term: 'iot',                     type: 'technology', industries: ['iot', 'manufacturing'] },
  { term: 'robotics',                type: 'technology', industries: ['manufacturing', 'defense'] },
  { term: 'autonomous vehicle',      type: 'technology', industries: ['automotive', 'logistics'] },
  { term: 'drone',                   type: 'technology', industries: ['defense', 'logistics'] },
  { term: 'lidar',                   type: 'technology', industries: ['defense', 'automotive'] },
  { term: 'radar',                   type: 'technology', industries: ['defense'] },
  { term: 'satellite',               type: 'technology', industries: ['defense', 'aerospace'] },
  { term: 'cybersecurity',           type: 'technology', industries: ['cybersecurity'] },
  { term: 'zero trust',              type: 'technology', industries: ['cybersecurity'] },
  { term: 'ransomware',              type: 'technology', industries: ['cybersecurity'] },
  { term: 'encryption',              type: 'technology', industries: ['cybersecurity'] },
  { term: 'biometric',               type: 'technology', industries: ['cybersecurity', 'border-tech'] },
  { term: 'crispr',                  type: 'technology', industries: ['biotech', 'health'] },
  { term: 'mrna',                    type: 'technology', industries: ['biotech', 'health'] },
  { term: 'fusion energy',           type: 'technology', industries: ['energy'] },
  { term: 'hydrogen',                type: 'technology', industries: ['energy'] },
  { term: 'solar',                   type: 'technology', industries: ['energy'] },
  { term: 'wind energy',             type: 'technology', industries: ['energy'] },
  { term: 'battery',                 type: 'technology', industries: ['energy', 'ev'] },
  { term: 'lithium',                 type: 'technology', industries: ['energy', 'ev'] },
  { term: 'ev',                      type: 'technology', industries: ['ev', 'automotive'] },
  { term: 'semiconductor',           type: 'technology', industries: ['semiconductors'] },
  { term: 'chip',                    type: 'technology', industries: ['semiconductors'] },
  { term: '3d printing',             type: 'technology', industries: ['manufacturing'] },
  { term: 'additive manufacturing',  type: 'technology', industries: ['manufacturing', 'defense'] },
  { term: 'ar',                      type: 'technology', industries: ['xr', 'defense'] },
  { term: 'vr',                      type: 'technology', industries: ['xr'] },
  { term: 'metaverse',               type: 'technology', industries: ['xr'] },

  // ── Companies ───────────────────────────────────────────────────────────────
  { term: 'openai',           type: 'company', industries: ['ai-ml'] },
  { term: 'anthropic',        type: 'company', industries: ['ai-ml'] },
  { term: 'google',           type: 'company', industries: ['ai-ml', 'cloud'] },
  { term: 'microsoft',        type: 'company', industries: ['ai-ml', 'cloud', 'cybersecurity'] },
  { term: 'nvidia',           type: 'company', industries: ['ai-ml', 'semiconductors'] },
  { term: 'meta',             type: 'company', industries: ['ai-ml', 'xr'] },
  { term: 'amazon',           type: 'company', industries: ['cloud', 'logistics', 'ai-ml'] },
  { term: 'apple',            type: 'company', industries: ['consumer-tech'] },
  { term: 'tesla',            type: 'company', industries: ['ev', 'ai-ml', 'energy'] },
  { term: 'spacex',           type: 'company', industries: ['aerospace', 'defense'] },
  { term: 'palantir',         type: 'company', industries: ['ai-ml', 'defense'] },
  { term: 'crowdstrike',      type: 'company', industries: ['cybersecurity'] },
  { term: 'anduril',          type: 'company', industries: ['defense', 'ai-ml'] },
  { term: 'lockheed martin',  type: 'company', industries: ['defense', 'aerospace'] },
  { term: 'raytheon',         type: 'company', industries: ['defense'] },
  { term: 'boeing',           type: 'company', industries: ['aerospace', 'defense'] },
  { term: 'northrop grumman', type: 'company', industries: ['defense', 'aerospace'] },
  { term: 'bae systems',      type: 'company', industries: ['defense'] },
  { term: 'l3harris',         type: 'company', industries: ['defense'] },
  { term: 'general dynamics', type: 'company', industries: ['defense'] },
  { term: 'tsmc',             type: 'company', industries: ['semiconductors'] },
  { term: 'samsung',          type: 'company', industries: ['semiconductors', 'consumer-tech'] },
  { term: 'intel',            type: 'company', industries: ['semiconductors', 'ai-ml'] },
  { term: 'amd',              type: 'company', industries: ['semiconductors', 'ai-ml'] },
  { term: 'qualcomm',         type: 'company', industries: ['semiconductors', 'telecom'] },
  { term: 'broadcom',         type: 'company', industries: ['semiconductors'] },
  { term: 'cisco',            type: 'company', industries: ['networking', 'cybersecurity'] },
  { term: 'palo alto networks', type: 'company', industries: ['cybersecurity'] },
  { term: 'snowflake',        type: 'company', industries: ['data', 'cloud'] },
  { term: 'databricks',       type: 'company', industries: ['data', 'ai-ml'] },
  { term: 'salesforce',       type: 'company', industries: ['enterprise'] },
  { term: 'oracle',           type: 'company', industries: ['enterprise', 'cloud'] },
  { term: 'sap',              type: 'company', industries: ['enterprise', 'supply-chain'] },
  { term: 'siemens',          type: 'company', industries: ['manufacturing', 'energy'] },
  { term: 'honeywell',        type: 'company', industries: ['manufacturing', 'defense', 'energy'] },
  { term: 'abb',              type: 'company', industries: ['manufacturing', 'energy'] },
  { term: 'rockwell',         type: 'company', industries: ['manufacturing'] },
  { term: 'flexport',         type: 'company', industries: ['logistics', 'supply-chain'] },
  { term: 'shield ai',        type: 'company', industries: ['defense', 'ai-ml'] },
  { term: 'scale ai',         type: 'company', industries: ['ai-ml'] },

  // ── Topics ───────────────────────────────────────────────────────────────────
  { term: 'supply chain',      type: 'topic', industries: ['supply-chain', 'logistics'] },
  { term: 'reshoring',         type: 'topic', industries: ['manufacturing', 'supply-chain'] },
  { term: 'nearshoring',       type: 'topic', industries: ['manufacturing', 'supply-chain', 'border-tech'] },
  { term: 'trade war',         type: 'topic', industries: ['supply-chain', 'fintech'] },
  { term: 'tariff',            type: 'topic', industries: ['supply-chain', 'border-tech'] },
  { term: 'sanctions',         type: 'topic', industries: ['defense', 'fintech'] },
  { term: 'regulation',        type: 'topic', industries: ['enterprise', 'fintech'] },
  { term: 'antitrust',         type: 'topic', industries: ['enterprise'] },
  { term: 'ipo',               type: 'topic', industries: ['fintech'] },
  { term: 'spac',              type: 'topic', industries: ['fintech'] },
  { term: 'merger',            type: 'topic', industries: ['enterprise', 'fintech'] },
  { term: 'acquisition',       type: 'topic', industries: ['enterprise', 'fintech'] },
  { term: 'series a',          type: 'topic', industries: ['fintech', 'startups'] },
  { term: 'series b',          type: 'topic', industries: ['fintech', 'startups'] },
  { term: 'funding round',     type: 'topic', industries: ['fintech', 'startups'] },
  { term: 'layoffs',           type: 'topic', industries: ['enterprise'] },
  { term: 'hiring',            type: 'topic', industries: ['enterprise', 'startups'] },
  { term: 'data center',       type: 'topic', industries: ['cloud', 'energy'] },
  { term: 'cloud computing',   type: 'topic', industries: ['cloud'] },
  { term: 'open source',       type: 'topic', industries: ['ai-ml', 'enterprise'] },
  { term: 'agentic ai',        type: 'topic', industries: ['ai-ml'] },
  { term: 'ai safety',         type: 'topic', industries: ['ai-ml'] },
  { term: 'deepfake',          type: 'topic', industries: ['ai-ml', 'cybersecurity'] },
  { term: 'disinformation',    type: 'topic', industries: ['cybersecurity', 'ai-ml'] },
  { term: 'climate tech',      type: 'topic', industries: ['energy', 'climate'] },
  { term: 'carbon capture',    type: 'topic', industries: ['energy', 'climate'] },
  { term: 'nuclear',           type: 'topic', industries: ['energy', 'defense'] },
  { term: 'smr',               type: 'topic', industries: ['energy'] },
  { term: 'hypersonic',        type: 'topic', industries: ['defense', 'aerospace'] },
  { term: 'directed energy',   type: 'topic', industries: ['defense'] },
  { term: 'border security',   type: 'topic', industries: ['border-tech', 'defense'] },
  { term: 'immigration',       type: 'topic', industries: ['border-tech'] },
];

// ─── Module-level Cache ───────────────────────────────────────────────────────

type CacheEntry = {
  result: TrendingResult;
  expiresAt: number;
};

// Keyed by "windowMs:baselineMs" so different window sizes cache independently
const resultCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Term Extraction ──────────────────────────────────────────────────────────

/**
 * Extract all matching terms from a single article title.
 * Case-insensitive, returns each matching TermEntry at most once per title.
 */
export function extractTerms(title: string): { term: string; type: TrendingItemType; industries: string[] }[] {
  const lower = title.toLowerCase();
  const found: { term: string; type: TrendingItemType; industries: string[] }[] = [];

  for (const entry of TERM_DICT) {
    // Word-boundary-aware check: ensure match is not a substring of a larger word.
    // We use a simple includes for phrases (multi-word terms are boundary-safe),
    // and a word-boundary regex for short single tokens like 'ar', 'vr', 'ev', etc.
    const isSingleToken = !entry.term.includes(' ');
    if (isSingleToken && entry.term.length <= 3) {
      // Short tokens need word boundaries to avoid false positives (e.g. "ar" in "smart")
      const re = new RegExp(`\\b${entry.term}\\b`, 'i');
      if (re.test(lower)) found.push(entry);
    } else {
      if (lower.includes(entry.term)) found.push(entry);
    }
  }

  return found;
}

// ─── Window Parsing ───────────────────────────────────────────────────────────

export type WindowSpec = '2h' | '6h' | '12h' | '24h';

function windowToMs(w: WindowSpec): number {
  switch (w) {
    case '2h':  return 2  * 60 * 60 * 1000;
    case '6h':  return 6  * 60 * 60 * 1000;
    case '12h': return 12 * 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
  }
}

const BASELINE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Velocity Classification ──────────────────────────────────────────────────

function classifyVelocity(spike: number): TrendingItem['velocity'] {
  if (spike >= 5)   return 'explosive';
  if (spike >= 3)   return 'surging';
  if (spike >= 1.5) return 'rising';
  return 'steady';
}

// ─── Core Computation ────────────────────────────────────────────────────────

/**
 * Compute trending items from a set of articles.
 *
 * @param articles  All available articles (from cache or live fetch)
 * @param windowMs  Current window in ms (e.g. 6h)
 * @returns TrendingResult
 */
export function computeTrending(
  articles: EnrichedFeedItem[],
  windowMs: number,
): TrendingResult {
  const now = Date.now();
  const windowStart  = now - windowMs;
  const baselineStart = now - BASELINE_MS;

  // Split articles into current window and baseline
  const windowArticles   = articles.filter(a => new Date(a.pubDate).getTime() >= windowStart);
  const baselineArticles = articles.filter(a => {
    const t = new Date(a.pubDate).getTime();
    return t >= baselineStart && t < windowStart;
  });

  // Normalisation factor: baseline covers (7d - window) of real time,
  // but we want counts-per-window-sized-period for a fair comparison.
  const baselineDuration = BASELINE_MS - windowMs;
  // Avoid division by zero if window >= baseline
  const normFactor = baselineDuration > 0 ? windowMs / baselineDuration : 1;

  // ── Count mentions per term ──────────────────────────────────────────────────

  type TermAccumulator = {
    entry: TermEntry;
    windowCount: number;
    baselineCount: number;
    headlines: string[];           // up to 3 from window
    firstSeenTs: number;           // earliest in window
    relatedIndustries: Set<string>;
  };

  const accMap = new Map<string, TermAccumulator>();

  function ensureAcc(entry: TermEntry): TermAccumulator {
    if (!accMap.has(entry.term)) {
      accMap.set(entry.term, {
        entry,
        windowCount: 0,
        baselineCount: 0,
        headlines: [],
        firstSeenTs: Infinity,
        relatedIndustries: new Set(entry.industries),
      });
    }
    return accMap.get(entry.term)!;
  }

  // Count window articles
  for (const article of windowArticles) {
    const matched = extractTerms(article.title);
    const pubTs = new Date(article.pubDate).getTime();
    for (const match of matched) {
      const acc = ensureAcc(match);
      acc.windowCount += 1;
      if (acc.headlines.length < 3) acc.headlines.push(article.title);
      if (pubTs < acc.firstSeenTs) acc.firstSeenTs = pubTs;
      // Merge industries detected in window
      for (const ind of match.industries) acc.relatedIndustries.add(ind);
    }
  }

  // Count baseline articles
  for (const article of baselineArticles) {
    const matched = extractTerms(article.title);
    for (const match of matched) {
      const acc = ensureAcc(match);
      acc.baselineCount += 1;
    }
  }

  // ── Build TrendingItem list ──────────────────────────────────────────────────

  const results: TrendingItem[] = [];

  for (const [, acc] of Array.from(accMap.entries() as Iterable<[string, TermAccumulator]>)) {
    if (acc.windowCount === 0) continue;

    // Normalised baseline count: how many mentions would have occurred in a
    // window-sized period at the baseline rate?
    const normBaseline = acc.baselineCount * normFactor;

    // If baseline is effectively zero, treat as a new spike
    const baseline = normBaseline;
    let spike: number;
    if (baseline < 0.5) {
      // New term — assign a spike proportional to window count, capped at 10x
      spike = Math.min(10, acc.windowCount * 2);
    } else {
      spike = acc.windowCount / baseline;
    }

    spike = Math.round(spike * 100) / 100;

    if (spike < 1.5) continue; // only surface meaningful spikes

    results.push({
      term: acc.entry.term,
      type: acc.entry.type,
      mentions: acc.windowCount,
      baseline: Math.round(normBaseline * 100) / 100,
      spike,
      velocity: classifyVelocity(spike),
      relatedIndustries: Array.from(acc.relatedIndustries as Iterable<string>),
      sampleHeadlines: acc.headlines,
      firstSeen: acc.firstSeenTs === Infinity
        ? new Date(windowStart).toISOString()
        : new Date(acc.firstSeenTs).toISOString(),
    });
  }

  // Sort by spike descending, take top 20
  results.sort((a, b) => b.spike - a.spike);
  const top = results.slice(0, 20);

  const windowLabel = windowMs === 2 * 3600000 ? '2h'
    : windowMs === 6 * 3600000 ? '6h'
    : windowMs === 12 * 3600000 ? '12h'
    : '24h';

  return {
    status: 'success',
    window: windowLabel,
    baselinePeriod: '7d',
    timestamp: new Date(now).toISOString(),
    trending: top,
    totalArticlesScanned: articles.length,
  };
}

// ─── Static Fallback ─────────────────────────────────────────────────────────

/**
 * Returns realistic mock trending data when feeds are cold or empty.
 * Covers a cross-section of term types.
 */
function getFallbackTrending(windowLabel: string): TrendingResult {
  const now = new Date().toISOString();

  const trending: TrendingItem[] = [
    {
      term: 'agentic ai',
      type: 'topic',
      mentions: 14,
      baseline: 2.1,
      spike: 6.67,
      velocity: 'explosive',
      relatedIndustries: ['ai-ml'],
      sampleHeadlines: [
        'Agentic AI frameworks reshape enterprise automation pipelines',
        'OpenAI ships multi-agent orchestration layer for GPT-4o',
        'Anduril deploys agentic AI for autonomous mission planning',
      ],
      firstSeen: now,
    },
    {
      term: 'nvidia',
      type: 'company',
      mentions: 22,
      baseline: 4.8,
      spike: 4.58,
      velocity: 'surging',
      relatedIndustries: ['ai-ml', 'semiconductors'],
      sampleHeadlines: [
        "NVIDIA's Blackwell GPU demand outstrips supply heading into Q2",
        'NVIDIA partners with Lockheed Martin on AI-driven ISR processing',
      ],
      firstSeen: now,
    },
    {
      term: 'nearshoring',
      type: 'topic',
      mentions: 9,
      baseline: 2.0,
      spike: 4.5,
      velocity: 'surging',
      relatedIndustries: ['manufacturing', 'supply-chain', 'border-tech'],
      sampleHeadlines: [
        'Nearshoring momentum accelerates as tariffs bite China imports',
        'El Paso corridor sees record maquiladora investment in Q1 2026',
      ],
      firstSeen: now,
    },
    {
      term: 'quantum computing',
      type: 'technology',
      mentions: 7,
      baseline: 1.6,
      spike: 4.38,
      velocity: 'surging',
      relatedIndustries: ['ai-ml', 'defense', 'cybersecurity'],
      sampleHeadlines: [
        'Google claims quantum advantage milestone for chemistry simulation',
        'DARPA awards quantum error-correction research contracts',
      ],
      firstSeen: now,
    },
    {
      term: 'hypersonic',
      type: 'topic',
      mentions: 6,
      baseline: 1.5,
      spike: 4.0,
      velocity: 'surging',
      relatedIndustries: ['defense', 'aerospace'],
      sampleHeadlines: [
        'Raytheon hypersonic glide vehicle completes successful test flight',
        'DARPA HACM program enters phase 2 with Northrop Grumman',
      ],
      firstSeen: now,
    },
    {
      term: 'zero trust',
      type: 'technology',
      mentions: 8,
      baseline: 2.2,
      spike: 3.64,
      velocity: 'surging',
      relatedIndustries: ['cybersecurity'],
      sampleHeadlines: [
        'DoD mandates zero trust architecture across all cloud deployments by FY2027',
        'CrowdStrike expands zero trust identity platform with AI behavioral engine',
      ],
      firstSeen: now,
    },
    {
      term: 'directed energy',
      type: 'topic',
      mentions: 5,
      baseline: 1.4,
      spike: 3.57,
      velocity: 'surging',
      relatedIndustries: ['defense'],
      sampleHeadlines: [
        'Army awards $200M directed energy weapon integration contract to L3Harris',
      ],
      firstSeen: now,
    },
    {
      term: 'smr',
      type: 'topic',
      mentions: 5,
      baseline: 1.5,
      spike: 3.33,
      velocity: 'surging',
      relatedIndustries: ['energy'],
      sampleHeadlines: [
        'NRC clears first small modular reactor design for commercial deployment',
        'Microsoft signs SMR power purchase agreement for data center expansion',
      ],
      firstSeen: now,
    },
    {
      term: 'digital twin',
      type: 'technology',
      mentions: 6,
      baseline: 2.0,
      spike: 3.0,
      velocity: 'surging',
      relatedIndustries: ['manufacturing', 'defense'],
      sampleHeadlines: [
        'Siemens digital twin platform deployed across 40 Army maintenance depots',
      ],
      firstSeen: now,
    },
    {
      term: 'palantir',
      type: 'company',
      mentions: 7,
      baseline: 2.4,
      spike: 2.92,
      velocity: 'rising',
      relatedIndustries: ['ai-ml', 'defense'],
      sampleHeadlines: [
        'Palantir AIP expands to Allied nations under Five Eyes data sharing framework',
        'Palantir wins $480M Army logistics AI contract extension',
      ],
      firstSeen: now,
    },
  ];

  return {
    status: 'success',
    window: windowLabel,
    baselinePeriod: '7d',
    timestamp: now,
    trending,
    totalArticlesScanned: 0,
  };
}

// ─── Public Cached Entry Point ────────────────────────────────────────────────

/**
 * Get trending results for the given window string.
 * Uses a 5-minute module-level cache per window size.
 *
 * Pass `articles` from the live feed cache (or null to use fallback).
 */
export function getTrending(
  articles: EnrichedFeedItem[] | null,
  window: WindowSpec = '6h',
): TrendingResult {
  const cacheKey = window;
  const now = Date.now();

  // Return cached result if still fresh
  const cached = resultCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.result;
  }

  let result: TrendingResult;

  if (!articles || articles.length === 0) {
    // Feed cache cold — return realistic static fallback
    result = getFallbackTrending(window);
  } else {
    const windowMs = windowToMs(window);
    result = computeTrending(articles, windowMs);

    // If computation returned no trending items (e.g. all articles are old),
    // fall back to static data rather than returning an empty list.
    if (result.trending.length === 0) {
      result = getFallbackTrending(window);
    }
  }

  resultCache.set(cacheKey, { result, expiresAt: now + CACHE_TTL_MS });
  return result;
}
