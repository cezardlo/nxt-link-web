// src/lib/agents/agents/vendor-discovery-agent.ts
// Vendor Discovery Pipeline Agent — automatically discovers new companies from
// conferences, news, and signal sources. Uses keyword-first entity recognition
// against a 200+ company dictionary, with LLM fallback for ambiguous entities.

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';
import { parseAnyFeed, type ParsedItem } from '@/lib/rss/parser';
import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';
import { NXT_ENTITIES, findEntityByText, extractContractAmount } from '@/lib/intelligence/nxt-entities';
import {
  scanForKnownCompanies,
  getCompanyEntry,
  KNOWN_COMPANIES_COUNT,
  type CompanyEntry,
} from '@/lib/feeds/known-companies';
import {
  FEED_REGISTRY,
  type FeedSourceEntry,
} from '@/lib/feeds/feed-sources-registry';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type VendorSignalType =
  | 'company_discovered'
  | 'hiring_signal'
  | 'contract_award'
  | 'facility_expansion'
  | 'technology_adoption'
  | 'partnership';

export type VendorSignal = {
  type: VendorSignalType;
  company: string;
  confidence: number;
  source: string;
  evidence: string;
  relevance_to_el_paso: boolean;
  category?: string;
  sector?: string;
  contract_amount_m?: number;
  discovered_at: string;
};

export type DiscoveredVendor = {
  name: string;
  is_new: boolean;             // true = not in KNOWN_COMPANIES or NXT_ENTITIES
  category: string;
  sector: string;
  signal_count: number;
  signals: VendorSignal[];
  first_seen: string;
  relevance_score: number;     // 0-100 composite score
  el_paso_relevant: boolean;
};

export type VendorDiscoveryStore = {
  vendors: DiscoveredVendor[];
  signals: VendorSignal[];
  as_of: string;
  articles_scanned: number;
  companies_matched: number;
  new_companies_found: number;
  llm_calls_made: number;
  scan_duration_ms: number;
};

// ─── Constants ──────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Feed sources to scan — focus on defense, enterprise, supply chain, border
const DISCOVERY_FEED_IDS = new Set([
  // Defense tier 1-2
  'def-defense-one', 'def-breaking-defense', 'def-defense-news', 'def-c4isrnet',
  'def-defensescoop', 'def-dod-news',
  // AI/ML
  'ai-techcrunch-ai', 'ai-venturebeat', 'ai-wired-ai', 'ai-mit-tech-review',
  // Cybersecurity
  'sec-bleeping', 'sec-dark-reading', 'sec-krebs',
  // Supply chain & logistics
  'sc-supply-chain-dive', 'sc-freightwaves',
  // Enterprise
  'ent-techcrunch', 'ent-zdnet', 'ent-ars-technica',
  // Energy
  'nrg-utility-dive', 'nrg-renewables-now',
]);

// Maximum feeds to scan per run (to control latency)
const MAX_FEEDS_PER_RUN = 40;

// Regex patterns for company name indicators in text
const COMPANY_SUFFIX_PATTERNS: RegExp[] = [
  /\b([A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)*)\s+(?:Inc|LLC|Corp|Ltd|Technologies|Systems|Solutions|Robotics|Dynamics|Aerospace|Defense|Networks|Security|Energy|Analytics|Labs|Laboratories)\b/g,
  /\b([A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)*)\s+(?:Group|Partners|Ventures|Capital|Industries|International|Services|Consulting|Engineering)\b/g,
];

// Growth/expansion signal keywords
const GROWTH_KEYWORDS: Array<{ pattern: RegExp; type: VendorSignalType }> = [
  { pattern: /\b(?:hiring|hires|recruits|recruiting|talent acquisition|job openings|new positions)\b/i, type: 'hiring_signal' },
  { pattern: /\b(?:expansion|expands|expanding|new facility|new office|new plant|opens.*facility|opens.*office|headquarter|relocat)\b/i, type: 'facility_expansion' },
  { pattern: /\b(?:contract\s+award|awarded\s+contract|won\s+contract|receives?\s+contract|awarded\s+\$|wins?\s+\$|contract\s+worth|secured?\s+contract)\b/i, type: 'contract_award' },
  { pattern: /\b(?:adopt(?:s|ed|ing)?|implement(?:s|ed|ing)?|deploy(?:s|ed|ing)?|integrat(?:es?|ed|ing)|roll(?:s|ed|ing)?\s*out|launches?|unveiled?|introduces?)\b/i, type: 'technology_adoption' },
  { pattern: /\b(?:partner(?:s|ed|ship|ing)|collaborat(?:es?|ed|ion|ing)|joint venture|teamed? with|teams? up|alliance|strategic agreement)\b/i, type: 'partnership' },
];

// El Paso / border corridor relevance keywords
const EP_RELEVANCE_KEYWORDS: string[] = [
  'el paso', 'elpaso', 'ep texas', 'sun city',
  'ciudad juarez', 'juarez',
  'fort bliss', 'white sands', 'holloman',
  'utep', 'university texas el paso',
  'borderplex', 'paso del norte',
  'maquiladora', 'maquila', 'nearshoring',
  'ysleta', 'socorro', 'horizon city',
  'sunland park', 'santa teresa',
  'chihuahua', 'border corridor',
  'west texas', 'southern new mexico',
  'las cruces', 'dona ana',
  'william beaumont', 'sierra medical',
];

// ─── In-memory cache ────────────────────────────────────────────────────────────

let cachedStore: VendorDiscoveryStore | null = null;
let storeExpiresAt = 0;
let inFlightRun: Promise<VendorDiscoveryStore> | null = null;

export function getCachedVendorDiscovery(): VendorDiscoveryStore | null {
  if (cachedStore && Date.now() < storeExpiresAt) return cachedStore;
  return null;
}

function setCachedVendorDiscovery(store: VendorDiscoveryStore): void {
  cachedStore = store;
  storeExpiresAt = Date.now() + CACHE_TTL_MS;
}

// ─── Feed fetching ──────────────────────────────────────────────────────────────

type ArticleCandidate = {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  sourceId: string;
};

function selectDiscoveryFeeds(): FeedSourceEntry[] {
  // Prioritize feeds from our discovery set, then add tier 1-2 sources
  const selected: FeedSourceEntry[] = [];
  const seen = new Set<string>();

  // First pass: known discovery feeds
  for (const feed of FEED_REGISTRY) {
    if (DISCOVERY_FEED_IDS.has(feed.id) && !seen.has(feed.id)) {
      selected.push(feed);
      seen.add(feed.id);
    }
  }

  // Second pass: all tier 1-2 non-crime feeds up to limit
  for (const feed of FEED_REGISTRY) {
    if (selected.length >= MAX_FEEDS_PER_RUN) break;
    if (seen.has(feed.id)) continue;
    if (feed.tier <= 2 && feed.category !== 'Crime') {
      selected.push(feed);
      seen.add(feed.id);
    }
  }

  return selected.slice(0, MAX_FEEDS_PER_RUN);
}

async function fetchDiscoveryFeeds(): Promise<{
  articles: ArticleCandidate[];
  feedsOk: number;
  feedsFailed: number;
}> {
  const feeds = selectDiscoveryFeeds();
  const CONCURRENCY = 8;
  const batches: FeedSourceEntry[][] = [];
  for (let i = 0; i < feeds.length; i += CONCURRENCY) {
    batches.push(feeds.slice(i, i + CONCURRENCY));
  }

  const allArticles: ArticleCandidate[] = [];
  let feedsOk = 0;
  let feedsFailed = 0;

  for (const batch of batches) {
    const settled = await Promise.allSettled(
      batch.map(async (source) => {
        const response = await fetchWithRetry(
          source.url,
          {
            headers: {
              Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
              'User-Agent': 'NXTLinkDiscoveryAgent/1.0',
            },
            signal: AbortSignal.timeout(8_000),
          },
          {
            retries: 1,
            cacheKey: `vendor-disc:${source.id}`,
            cacheTtlMs: 15 * 60 * 1000, // 15 min per source
            staleIfErrorMs: 30 * 60 * 1000,
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
        for (const item of items) {
          allArticles.push({
            title: item.title,
            description: item.description,
            link: item.link,
            pubDate: item.pubDate,
            source: item.source || source.name,
            sourceId: source.id,
          });
        }
      } else {
        feedsFailed++;
      }
    }
  }

  // Deduplicate by link
  const seenLinks = new Set<string>();
  const deduped: ArticleCandidate[] = [];
  for (const article of allArticles) {
    if (seenLinks.has(article.link)) continue;
    seenLinks.add(article.link);
    deduped.push(article);
  }

  return { articles: deduped, feedsOk, feedsFailed };
}

// ─── Company extraction (keyword-first) ─────────────────────────────────────────

type ExtractedCompany = {
  name: string;
  known: boolean;
  entry: CompanyEntry | undefined;
  nxtEntity: boolean;
};

function extractCompaniesFromArticle(article: ArticleCandidate): ExtractedCompany[] {
  const combinedText = `${article.title} ${article.description}`;
  const found = new Map<string, ExtractedCompany>();

  // Phase 1: Check against KNOWN_COMPANIES dictionary (200+ companies)
  const knownMatches = scanForKnownCompanies(combinedText);
  for (const name of knownMatches) {
    found.set(name.toLowerCase(), {
      name,
      known: true,
      entry: getCompanyEntry(name),
      nxtEntity: false,
    });
  }

  // Phase 2: Check against NXT_ENTITIES (El Paso vendors)
  const entityMatches = findEntityByText(combinedText);
  for (const entity of entityMatches) {
    const lowerName = entity.name.toLowerCase();
    if (found.has(lowerName)) {
      // Already found via dictionary — mark as NXT entity too
      const existing = found.get(lowerName);
      if (existing) {
        existing.nxtEntity = true;
      }
    } else {
      found.set(lowerName, {
        name: entity.name,
        known: true,
        entry: { category: entity.category.toLowerCase().replace(/ \/ | /g, '_'), sector: entity.category },
        nxtEntity: true,
      });
    }
  }

  // Phase 3: Regex-based extraction for potentially new companies
  for (const pattern of COMPANY_SUFFIX_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(combinedText)) !== null) {
      const fullMatch = match[0].trim();
      const lowerMatch = fullMatch.toLowerCase();
      // Skip if already found or too short
      if (found.has(lowerMatch) || fullMatch.length < 4) continue;
      // Skip common false positives
      if (isCommonFalsePositive(fullMatch)) continue;
      found.set(lowerMatch, {
        name: fullMatch,
        known: false,
        entry: undefined,
        nxtEntity: false,
      });
    }
  }

  return Array.from(found.values());
}

// Common words that match company suffix patterns but are not companies
const FALSE_POSITIVE_SET = new Set([
  'united states', 'the united', 'new york', 'los angeles', 'san francisco',
  'white house', 'supreme court', 'state department', 'justice department',
  'national security', 'federal government', 'social media', 'artificial intelligence',
  'real estate', 'public health', 'climate change', 'economic development',
  'foreign affairs', 'human rights', 'joint chiefs', 'armed forces',
  'north america', 'south america', 'middle east', 'pacific rim',
  'first quarter', 'second quarter', 'third quarter', 'fourth quarter',
  'fiscal year', 'national guard', 'private sector', 'public sector',
]);

function isCommonFalsePositive(name: string): boolean {
  return FALSE_POSITIVE_SET.has(name.toLowerCase());
}

// ─── Signal detection ───────────────────────────────────────────────────────────

function detectSignals(
  article: ArticleCandidate,
  companies: ExtractedCompany[],
): VendorSignal[] {
  const combinedText = `${article.title} ${article.description}`;
  const signals: VendorSignal[] = [];
  const isElPasoRelevant = checkElPasoRelevance(combinedText);
  const contractAmount = extractContractAmount(combinedText);

  for (const company of companies) {
    // Detect growth/expansion signal types
    let signalType: VendorSignalType = 'company_discovered';
    let bestConfidence = company.known ? 0.8 : 0.5;

    for (const { pattern, type } of GROWTH_KEYWORDS) {
      if (pattern.test(combinedText)) {
        signalType = type;
        // Higher confidence when a specific signal is detected
        bestConfidence = Math.min(1, bestConfidence + 0.1);
        break;
      }
    }

    // Boost confidence for known companies
    if (company.nxtEntity) {
      bestConfidence = Math.min(1, bestConfidence + 0.15);
    }

    // Boost for El Paso relevance
    if (isElPasoRelevant) {
      bestConfidence = Math.min(1, bestConfidence + 0.1);
    }

    // Build evidence string from article
    const evidence = article.title.length > 120
      ? article.title.slice(0, 120) + '...'
      : article.title;

    const signal: VendorSignal = {
      type: signalType,
      company: company.name,
      confidence: Math.round(bestConfidence * 100) / 100,
      source: article.source,
      evidence,
      relevance_to_el_paso: isElPasoRelevant,
      category: company.entry?.category,
      sector: company.entry?.sector,
      discovered_at: new Date().toISOString(),
    };

    if (contractAmount !== null && signalType === 'contract_award') {
      signal.contract_amount_m = contractAmount;
    }

    signals.push(signal);
  }

  return signals;
}

function checkElPasoRelevance(text: string): boolean {
  const lower = text.toLowerCase();
  return EP_RELEVANCE_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── LLM fallback for unknown entities ──────────────────────────────────────────

type LlmEntityResult = {
  company: string;
  category: string;
  sector: string;
  is_real_company: boolean;
  el_paso_relevant: boolean;
  confidence: number;
};

const LLM_SYSTEM_PROMPT = `You are the NXT LINK Vendor Discovery Agent for El Paso, Texas.

You receive article snippets containing possible company names that were extracted via regex.
Your job is to validate whether each name is a real technology/defense/logistics company and classify it.

For each company name, return a JSON array of objects with:
- "company": the company name (cleaned/corrected if needed)
- "category": one of "defense", "robotics", "manufacturing", "logistics", "cybersecurity", "ai_ml", "energy", "border_tech", "water", "healthtech", "semiconductor", "cloud", "supply_chain", "autonomous", "drones", "fintech", "other"
- "sector": human-readable sector like "Defense Tech", "Robotics & Automation", "Manufacturing Tech", "Cybersecurity", "AI/ML", "Energy Tech", "Border Tech", "Logistics", "Supply Chain Software", "Enterprise", etc.
- "is_real_company": boolean — true if this is a real company, false if it is a generic phrase, acronym, or false positive
- "el_paso_relevant": boolean — true if this company operates in El Paso, does defense/border work, or is relevant to the El Paso tech ecosystem
- "confidence": 0.0-1.0 how confident you are in this classification

Return valid JSON array only. Filter out obvious non-companies.`;

function parseLlmEntityResults(raw: string): LlmEntityResult[] {
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
      company: typeof item['company'] === 'string' ? item['company'] : '',
      category: typeof item['category'] === 'string' ? item['category'] : 'other',
      sector: typeof item['sector'] === 'string' ? item['sector'] : 'Other',
      is_real_company: item['is_real_company'] === true,
      el_paso_relevant: item['el_paso_relevant'] === true,
      confidence: typeof item['confidence'] === 'number'
        ? Math.max(0, Math.min(1, item['confidence']))
        : 0.5,
    }))
    .filter((r) => r.company.length > 0);
}

async function enrichUnknownCompanies(
  unknowns: Array<{ name: string; evidence: string }>,
): Promise<{ results: LlmEntityResult[]; callsMade: number }> {
  if (unknowns.length === 0) return { results: [], callsMade: 0 };

  // Cap at 30 unknowns per LLM call to avoid excessive token usage
  const batch = unknowns.slice(0, 30);
  const numberedList = batch
    .map((u, i) => `${i + 1}. Company: "${u.name}" — Context: "${u.evidence}"`)
    .join('\n');

  try {
    const { result: entities } = await runParallelJsonEnsemble<LlmEntityResult[]>({
      systemPrompt: LLM_SYSTEM_PROMPT,
      userPrompt: `Validate and classify these ${batch.length} potential company names extracted from news articles:\n\n${numberedList}`,
      temperature: 0.1,
      maxProviders: 1,
      budget: { preferLowCostProviders: true, reserveCompletionTokens: 600 },
      parse: (content) => parseLlmEntityResults(content),
    });

    return { results: entities, callsMade: 1 };
  } catch {
    // LLM failed — return empty, keep heuristic data
    return { results: [], callsMade: 0 };
  }
}

// ─── Relevance scoring ──────────────────────────────────────────────────────────

function computeRelevanceScore(vendor: {
  signals: VendorSignal[];
  is_new: boolean;
  el_paso_relevant: boolean;
  category: string;
}): number {
  let score = 0;

  // Signal count (up to 30 points)
  score += Math.min(30, vendor.signals.length * 10);

  // Signal type variety (up to 20 points)
  const uniqueTypes = new Set(vendor.signals.map((s) => s.type));
  score += Math.min(20, uniqueTypes.size * 5);

  // Average confidence (up to 20 points)
  const avgConfidence = vendor.signals.reduce((sum, s) => sum + s.confidence, 0) / vendor.signals.length;
  score += Math.round(avgConfidence * 20);

  // El Paso relevance (15 points)
  if (vendor.el_paso_relevant) {
    score += 15;
  }

  // Priority sector bonus (up to 15 points)
  const prioritySectors = new Set([
    'defense', 'border_tech', 'logistics', 'cybersecurity', 'ai_ml',
    'robotics', 'manufacturing', 'water', 'energy',
  ]);
  if (prioritySectors.has(vendor.category)) {
    score += 15;
  }

  // Contract amount bonus
  const hasContract = vendor.signals.some((s) => s.contract_amount_m !== undefined && s.contract_amount_m > 0);
  if (hasContract) {
    score += 10;
  }

  return Math.min(100, score);
}

// ─── Main agent entry point ─────────────────────────────────────────────────────

async function doRunVendorDiscoveryAgent(): Promise<VendorDiscoveryStore> {
  const t0 = Date.now();

  // Phase 1: Fetch discovery feeds
  const { articles, feedsOk: _feedsOk, feedsFailed: _feedsFailed } = await fetchDiscoveryFeeds();
  void _feedsOk; void _feedsFailed;

  // Phase 2: Extract companies from all articles (keyword-first)
  const allSignals: VendorSignal[] = [];
  const unknownCompanies: Array<{ name: string; evidence: string }> = [];
  const seenUnknowns = new Set<string>();

  for (const article of articles) {
    const companies = extractCompaniesFromArticle(article);
    const signals = detectSignals(article, companies);
    allSignals.push(...signals);

    // Collect unknown companies for LLM enrichment
    for (const company of companies) {
      if (!company.known && !seenUnknowns.has(company.name.toLowerCase())) {
        seenUnknowns.add(company.name.toLowerCase());
        unknownCompanies.push({
          name: company.name,
          evidence: article.title,
        });
      }
    }
  }

  // Phase 3: LLM enrichment for unknown entities
  let llmCallsMade = 0;
  if (unknownCompanies.length > 0) {
    const { results: llmResults, callsMade } = await enrichUnknownCompanies(unknownCompanies);
    llmCallsMade = callsMade;

    // Update signals for validated unknowns
    for (const llmResult of llmResults) {
      if (!llmResult.is_real_company) continue;

      // Find and update signals for this company
      const lowerName = llmResult.company.toLowerCase();
      for (const signal of allSignals) {
        if (signal.company.toLowerCase() === lowerName) {
          signal.category = llmResult.category;
          signal.sector = llmResult.sector;
          signal.confidence = Math.max(signal.confidence, llmResult.confidence);
          if (llmResult.el_paso_relevant) {
            signal.relevance_to_el_paso = true;
          }
        }
      }
    }

    // Remove signals for entities the LLM says are not real companies
    const falsePositives = new Set(
      llmResults
        .filter((r) => !r.is_real_company)
        .map((r) => r.company.toLowerCase()),
    );

    // Filter out false positives from allSignals
    const filtered: VendorSignal[] = [];
    for (const signal of allSignals) {
      if (!falsePositives.has(signal.company.toLowerCase())) {
        filtered.push(signal);
      }
    }
    allSignals.length = 0;
    allSignals.push(...filtered);
  }

  // Phase 4: Aggregate signals per vendor
  const vendorMap = new Map<string, {
    signals: VendorSignal[];
    first_seen: string;
  }>();

  for (const signal of allSignals) {
    const key = signal.company.toLowerCase();
    const existing = vendorMap.get(key);
    if (existing) {
      existing.signals.push(signal);
    } else {
      vendorMap.set(key, {
        signals: [signal],
        first_seen: signal.discovered_at,
      });
    }
  }

  // Phase 5: Build vendor list with scores
  const nxtEntityNames = new Set(NXT_ENTITIES.map((e) => e.name.toLowerCase()));
  const vendors: DiscoveredVendor[] = [];

  for (const [, vendorData] of vendorMap) {
    const firstSignal = vendorData.signals[0];
    if (!firstSignal) continue;

    const isNew = !firstSignal.category && !nxtEntityNames.has(firstSignal.company.toLowerCase());
    const elPasoRelevant = vendorData.signals.some((s) => s.relevance_to_el_paso);

    const vendor: DiscoveredVendor = {
      name: firstSignal.company,
      is_new: isNew,
      category: firstSignal.category || 'unknown',
      sector: firstSignal.sector || 'Unknown',
      signal_count: vendorData.signals.length,
      signals: vendorData.signals,
      first_seen: vendorData.first_seen,
      el_paso_relevant: elPasoRelevant,
      relevance_score: 0,
    };

    vendor.relevance_score = computeRelevanceScore({
      signals: vendor.signals,
      is_new: vendor.is_new,
      el_paso_relevant: vendor.el_paso_relevant,
      category: vendor.category,
    });

    vendors.push(vendor);
  }

  // Sort by relevance score descending, then by signal count
  vendors.sort((a, b) => {
    if (b.relevance_score !== a.relevance_score) return b.relevance_score - a.relevance_score;
    return b.signal_count - a.signal_count;
  });

  // Cap at 200 vendors
  const finalVendors = vendors.slice(0, 200);

  const store: VendorDiscoveryStore = {
    vendors: finalVendors,
    signals: allSignals,
    as_of: new Date().toISOString(),
    articles_scanned: articles.length,
    companies_matched: vendorMap.size,
    new_companies_found: finalVendors.filter((v) => v.is_new).length,
    llm_calls_made: llmCallsMade,
    scan_duration_ms: Date.now() - t0,
  };

  setCachedVendorDiscovery(store);
  return store;
}

export async function runVendorDiscoveryAgent(): Promise<VendorDiscoveryStore> {
  // Deduplicate in-flight runs
  if (inFlightRun) return inFlightRun;
  inFlightRun = doRunVendorDiscoveryAgent().finally(() => {
    inFlightRun = null;
  });
  return inFlightRun;
}

// ─── Stats helper ───────────────────────────────────────────────────────────────

export function getDiscoveryStats(store: VendorDiscoveryStore): {
  total_vendors: number;
  new_vendors: number;
  known_vendors: number;
  el_paso_relevant: number;
  by_sector: Record<string, number>;
  by_signal_type: Record<string, number>;
  top_signals: VendorSignal[];
  dictionary_size: number;
} {
  const bySector: Record<string, number> = {};
  const bySignalType: Record<string, number> = {};
  let elPasoCount = 0;

  for (const vendor of store.vendors) {
    bySector[vendor.sector] = (bySector[vendor.sector] ?? 0) + 1;
    if (vendor.el_paso_relevant) elPasoCount++;
  }

  for (const signal of store.signals) {
    bySignalType[signal.type] = (bySignalType[signal.type] ?? 0) + 1;
  }

  // Top signals: highest confidence, most recent
  const topSignals = [...store.signals]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 20);

  return {
    total_vendors: store.vendors.length,
    new_vendors: store.new_companies_found,
    known_vendors: store.vendors.length - store.new_companies_found,
    el_paso_relevant: elPasoCount,
    by_sector: bySector,
    by_signal_type: bySignalType,
    top_signals: topSignals,
    dictionary_size: KNOWN_COMPANIES_COUNT,
  };
}
