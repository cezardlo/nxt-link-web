// src/lib/agents/agents/intel-discovery-agent.ts
// Intelligence Discovery Agent — cross-industry tracking of patents, research
// papers, case studies, hiring signals, funding rounds, M&A, and contracts.
// Aggregates from quality-source-feeds + vendor-discovery + opportunities.

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';
import { parseAnyFeed, type ParsedItem } from '@/lib/rss/parser';
import {
  QUALITY_FEEDS,
  type QualityFeedSource,
} from '@/lib/feeds/quality-source-feeds';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type IntelSignalType =
  | 'patent_filing'
  | 'research_paper'
  | 'case_study'
  | 'hiring_signal'
  | 'funding_round'
  | 'merger_acquisition'
  | 'contract_award'
  | 'product_launch'
  | 'regulatory_action'
  | 'facility_expansion';

export type IntelIndustry =
  | 'health_biotech'
  | 'manufacturing'
  | 'aerospace_defense'
  | 'agriculture'
  | 'construction'
  | 'energy'
  | 'fintech'
  | 'cybersecurity'
  | 'ai_ml'
  | 'supply_chain'
  | 'general';

export type IntelSignal = {
  id: string;
  type: IntelSignalType;
  industry: IntelIndustry;
  title: string;
  url: string;
  source: string;
  evidence: string;
  company?: string;
  amountUsd?: number;
  confidence: number;
  discoveredAt: string;
  tags: string[];
};

export type IntelDiscoveryStore = {
  signals: IntelSignal[];
  as_of: string;
  feeds_scanned: number;
  feeds_ok: number;
  feeds_failed: number;
  total_raw_items: number;
  signals_by_type: Record<string, number>;
  signals_by_industry: Record<string, number>;
  scan_duration_ms: number;
};

// ─── Signal Detection Patterns ──────────────────────────────────────────────────

const SIGNAL_PATTERNS: Array<{
  type: IntelSignalType;
  patterns: RegExp[];
  confidence: number;
}> = [
  {
    type: 'patent_filing',
    patterns: [
      /\bpatent\s+(fil|grant|approv|award|issu)/i,
      /\b(US|EP|WO|CN|JP)\s?\d{5,}/i,
      /\bUSPTO\b/i,
      /\binvent(or|ion)\b.*\b(fil|patent|claim)/i,
      /\bintellectual\s+property\b/i,
    ],
    confidence: 0.75,
  },
  {
    type: 'research_paper',
    patterns: [
      /\barxiv[.:]\s?\d{4}\.\d{4,}/i,
      /\bpeer[- ]review/i,
      /\bpreprint\b/i,
      /\bpublish(ed|ing)\s+(in|a)\s+\w+\s+(journal|paper|study)/i,
      /\bclinical\s+trial\s+result/i,
      /\bphase\s+[IiIi123]\b.*\b(trial|study|result)/i,
      /\bdoi[.:]\s?10\.\d{4,}/i,
    ],
    confidence: 0.8,
  },
  {
    type: 'case_study',
    patterns: [
      /\bcase\s+stud(y|ies)\b/i,
      /\bcustomer\s+stor(y|ies)\b/i,
      /\bsuccess\s+stor(y|ies)\b/i,
      /\bimplementation\s+(report|review|case)/i,
      /\bdeployed\b.*\b(result|outcome|impact)/i,
    ],
    confidence: 0.65,
  },
  {
    type: 'hiring_signal',
    patterns: [
      /\bhiring\s+\d+/i,
      /\bjob\s+opening/i,
      /\bworkforce\s+expansion/i,
      /\bnew\s+position/i,
      /\brecruiting\s+(drive|push|effort)/i,
      /\bheadcount\s+(growth|increase|expansion)/i,
    ],
    confidence: 0.6,
  },
  {
    type: 'funding_round',
    patterns: [
      /\b(series\s+[A-G]|seed\s+round|pre-seed)\b/i,
      /\braised?\s+\$[\d.,]+\s*(M|B|million|billion)/i,
      /\bfunding\s+round\b/i,
      /\bventure\s+capital\b/i,
      /\b(IPO|SPAC|public\s+offering)\b/i,
    ],
    confidence: 0.8,
  },
  {
    type: 'merger_acquisition',
    patterns: [
      /\b(acquir|merger|takeover|buyout)\b/i,
      /\bmerge(d|r|s)\s+with\b/i,
      /\bacquisition\s+(of|deal|complete|announce)/i,
      /\bbought\s+by\b/i,
    ],
    confidence: 0.8,
  },
  {
    type: 'contract_award',
    patterns: [
      /\bcontract\s+(award|win|won|value)/i,
      /\bawarded?\s+\$[\d.,]+\s*(M|B|million|billion)/i,
      /\b(DoD|DHS|NASA|DOE|NIH|DARPA)\s+contract\b/i,
      /\bgovernment\s+contract\b/i,
      /\bSBIR\b.*\b(award|grant|phase)/i,
    ],
    confidence: 0.75,
  },
  {
    type: 'product_launch',
    patterns: [
      /\b(launch|unveil|introduc|announc)\w*\s+(new|its|a)\s+/i,
      /\bnew\s+product\b/i,
      /\bproduct\s+release\b/i,
      /\bgeneral\s+availability\b/i,
    ],
    confidence: 0.6,
  },
  {
    type: 'regulatory_action',
    patterns: [
      /\bFDA\s+(approv|clear|authoriz)/i,
      /\bFAA\s+(certif|approv)/i,
      /\bFCC\s+(approv|licens)/i,
      /\bregulat(or|ion|ory)\s+(approv|action|update)/i,
      /\bcompliance\s+(certif|achiev)/i,
    ],
    confidence: 0.75,
  },
  {
    type: 'facility_expansion',
    patterns: [
      /\b(new|open|expand)\w*\s+(facility|factory|plant|campus|office|lab|center)/i,
      /\bgroundbreaking\b/i,
      /\bconstruction\s+(begin|start|commence)/i,
      /\bmanufacturing\s+(facility|plant|expansion)/i,
    ],
    confidence: 0.65,
  },
];

// ─── Industry Detection ─────────────────────────────────────────────────────────

const INDUSTRY_KEYWORDS: Array<{ industry: IntelIndustry; keywords: RegExp }> = [
  { industry: 'health_biotech', keywords: /\b(pharma|biotech|medical|health|FDA|clinical|drug|therapy|vaccine|hospital|patient|diagnostic|genomic|CRISPR)\b/i },
  { industry: 'manufacturing', keywords: /\b(manufactur|factory|industrial|CNC|3D\s?print|additive|assembly|production\s+line|quality\s+control|lean|robotics?\s+assembly)\b/i },
  { industry: 'aerospace_defense', keywords: /\b(aerospace|defense|military|DoD|DARPA|satellite|rocket|missile|drone|UAV|fighter|submarine|radar|Pentagon)\b/i },
  { industry: 'agriculture', keywords: /\b(agriculture|farming|crop|livestock|agtech|precision\s+ag|USDA|harvest|irrigation|seed|fertilizer)\b/i },
  { industry: 'construction', keywords: /\b(construction|building|infrastructure|BIM|concrete|HVAC|architect|modular|prefab|real\s+estate|smart\s+building)\b/i },
  { industry: 'energy', keywords: /\b(energy|solar|wind|battery|grid|renewable|hydrogen|nuclear|utility|power\s+plant|EV\s+charg|oil|gas|ERCOT)\b/i },
  { industry: 'fintech', keywords: /\b(fintech|blockchain|cryptocurrency|payment|banking|insurance|lending|trading|DeFi|neobank|regtech)\b/i },
  { industry: 'cybersecurity', keywords: /\b(cybersecurity|zero\s+trust|ransomware|malware|threat|vulnerability|encryption|firewall|SOC|SIEM|penetration\s+test)\b/i },
  { industry: 'ai_ml', keywords: /\b(artificial\s+intelligence|machine\s+learning|deep\s+learning|LLM|GPT|neural\s+network|computer\s+vision|NLP|generative\s+AI)\b/i },
  { industry: 'supply_chain', keywords: /\b(supply\s+chain|logistics|freight|warehouse|shipping|port|customs|trade\s+route|last\s+mile|3PL|TMS|WMS)\b/i },
];

// ─── Amount Extraction ──────────────────────────────────────────────────────────

const AMOUNT_RE = /\$\s?([\d.,]+)\s*(B|billion|M|million|K|thousand)/i;

function extractAmount(text: string): number | undefined {
  const match = AMOUNT_RE.exec(text);
  if (!match) return undefined;
  const num = parseFloat(match[1].replace(/,/g, ''));
  const unit = match[2].toLowerCase();
  if (unit === 'b' || unit === 'billion') return num * 1_000_000_000;
  if (unit === 'm' || unit === 'million') return num * 1_000_000;
  if (unit === 'k' || unit === 'thousand') return num * 1_000;
  return num;
}

// ─── Company Extraction (simple heuristic) ──────────────────────────────────────

const COMPANY_RE = /\b([A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)*)\s+(?:Inc|LLC|Corp|Ltd|Technologies|Systems|Therapeutics|Pharmaceuticals|Biotech|Sciences|Semiconductor|Aerospace|Aviation)\b/g;

function extractCompany(text: string): string | undefined {
  COMPANY_RE.lastIndex = 0;
  const match = COMPANY_RE.exec(text);
  return match ? match[0] : undefined;
}

// ─── Cache ──────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 45 * 60 * 1000; // 45 minutes
let cachedStore: IntelDiscoveryStore | null = null;
let storeExpiresAt = 0;
let inFlightRun: Promise<IntelDiscoveryStore> | null = null;

export function getCachedIntelDiscovery(): IntelDiscoveryStore | null {
  if (cachedStore && Date.now() < storeExpiresAt) return cachedStore;
  return null;
}

function setCachedIntelDiscovery(store: IntelDiscoveryStore): void {
  cachedStore = store;
  storeExpiresAt = Date.now() + CACHE_TTL_MS;
}

// ─── Main Runner ────────────────────────────────────────────────────────────────

export async function runIntelDiscoveryAgent(): Promise<IntelDiscoveryStore> {
  if (inFlightRun) return inFlightRun;
  inFlightRun = doRun().finally(() => { inFlightRun = null; });
  return inFlightRun;
}

const CONCURRENCY = 10;
const MAX_FEEDS = 80;

async function doRun(): Promise<IntelDiscoveryStore> {
  const startMs = Date.now();
  let feedsOk = 0;
  let feedsFailed = 0;
  let totalRawItems = 0;

  // Select feeds — prioritize patent, financial, professional, then academic/government
  const priorityTypes = new Set(['patent', 'financial', 'professional']);
  const priorityFeeds = QUALITY_FEEDS.filter(f => priorityTypes.has(f.type));
  const otherFeeds = QUALITY_FEEDS.filter(f => !priorityTypes.has(f.type));
  const selectedFeeds = [...priorityFeeds, ...otherFeeds].slice(0, MAX_FEEDS);

  // Fetch all feeds in batches
  const allItems: Array<{ item: ParsedItem; feed: QualityFeedSource }> = [];

  const batches: QualityFeedSource[][] = [];
  for (let i = 0; i < selectedFeeds.length; i += CONCURRENCY) {
    batches.push(selectedFeeds.slice(i, i + CONCURRENCY));
  }

  for (const batch of batches) {
    const settled = await Promise.allSettled(
      batch.map(async (feed) => {
        try {
          const response = await fetchWithRetry(
            feed.url,
            {
              headers: {
                Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
                'User-Agent': 'NXTLinkIntelAgent/1.0',
              },
              signal: AbortSignal.timeout(8_000),
            },
            {
              retries: 1,
              cacheKey: `intel-disc:${feed.id}`,
              cacheTtlMs: 20 * 60 * 1000,
              staleIfErrorMs: 60 * 60 * 1000,
              dedupeInFlight: true,
            },
          );
          const text = await response.text();
          const items = parseAnyFeed(text, feed.name);
          return { items, feed };
        } catch {
          return { items: [] as ParsedItem[], feed, failed: true };
        }
      }),
    );

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        const { items, feed, failed } = result.value as { items: ParsedItem[]; feed: QualityFeedSource; failed?: boolean };
        if (failed) {
          feedsFailed++;
        } else {
          feedsOk++;
          totalRawItems += items.length;
          for (const item of items) {
            allItems.push({ item, feed });
          }
        }
      } else {
        feedsFailed++;
      }
    }
  }

  // Detect signals from all items
  const signals: IntelSignal[] = [];
  const seen = new Set<string>();

  for (const { item, feed } of allItems) {
    const text = `${item.title ?? ''} ${item.description ?? ''}`;
    if (text.length < 20) continue;

    // Check for signal patterns
    for (const pattern of SIGNAL_PATTERNS) {
      const matched = pattern.patterns.some(re => re.test(text));
      if (!matched) continue;

      // Deduplicate by URL
      const url = item.link ?? '';
      const dedupeKey = `${pattern.type}:${url}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      // Detect industry
      let industry: IntelIndustry = 'general';
      for (const { industry: ind, keywords } of INDUSTRY_KEYWORDS) {
        if (keywords.test(text)) {
          industry = ind;
          break;
        }
      }

      // Extract metadata
      const amount = extractAmount(text);
      const company = extractCompany(text);

      const id = `intel-${pattern.type}-${hashCode(url || item.title || '')}`;

      signals.push({
        id,
        type: pattern.type,
        industry,
        title: (item.title ?? '').slice(0, 200),
        url,
        source: feed.name,
        evidence: (item.description ?? '').slice(0, 300),
        company,
        amountUsd: amount,
        confidence: pattern.confidence,
        discoveredAt: item.pubDate ?? new Date().toISOString(),
        tags: feed.tags,
      });

      break; // One signal per item (use first match)
    }
  }

  // Sort by confidence descending, then by date
  signals.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime();
  });

  // Build stats
  const signalsByType: Record<string, number> = {};
  const signalsByIndustry: Record<string, number> = {};
  for (const s of signals) {
    signalsByType[s.type] = (signalsByType[s.type] ?? 0) + 1;
    signalsByIndustry[s.industry] = (signalsByIndustry[s.industry] ?? 0) + 1;
  }

  const store: IntelDiscoveryStore = {
    signals: signals.slice(0, 500), // Cap at 500
    as_of: new Date().toISOString(),
    feeds_scanned: selectedFeeds.length,
    feeds_ok: feedsOk,
    feeds_failed: feedsFailed,
    total_raw_items: totalRawItems,
    signals_by_type: signalsByType,
    signals_by_industry: signalsByIndustry,
    scan_duration_ms: Date.now() - startMs,
  };

  setCachedIntelDiscovery(store);
  return store;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function hashCode(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

/** Get stats summary for API response */
export function getIntelStats(store: IntelDiscoveryStore): {
  total_signals: number;
  by_type: Record<string, number>;
  by_industry: Record<string, number>;
  top_signals: IntelSignal[];
} {
  return {
    total_signals: store.signals.length,
    by_type: store.signals_by_type,
    by_industry: store.signals_by_industry,
    top_signals: store.signals.slice(0, 20),
  };
}
