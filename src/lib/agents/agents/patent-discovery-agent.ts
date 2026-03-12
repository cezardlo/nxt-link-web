// src/lib/agents/agents/patent-discovery-agent.ts
// Patent Discovery Agent — monitors global patent filings, grants, and IP activity
// Sources: USPTO, EPO, WIPO, Google Patents via RSS, patent news outlets

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';
import { parseAnyFeed } from '@/lib/rss/parser';
import type { QualityFeedSource } from '@/lib/feeds/quality-source-feeds';

// ── Types ──────────────────────────────────────────────────────────────────────

export type PatentSignal = {
  id: string;
  title: string;
  url: string;
  source: string;
  company?: string;
  technology?: string;
  patentId?: string;
  filingType: 'filing' | 'grant' | 'application' | 'litigation' | 'transfer';
  industry: string;
  country?: string;
  confidence: number;
  discoveredAt: string;
  tags: string[];
};

export type PatentDiscoveryResult = {
  signals: PatentSignal[];
  as_of: string;
  feeds_scanned: number;
  feeds_ok: number;
  total_patents_detected: number;
  by_filing_type: Record<string, number>;
  by_industry: Record<string, number>;
  scan_duration_ms: number;
};

// ── Patent RSS Sources ─────────────────────────────────────────────────────────

const GN = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

const PATENT_FEEDS: QualityFeedSource[] = [
  // Patent news outlets
  { id: 'pat-ipw', name: 'IP Watchdog', url: GN('patent filing technology site:ipwatchdog.com'), type: 'professional', tier: 2, tags: ['patent', 'ip'] },
  { id: 'pat-law360', name: 'Law360 Patents', url: GN('patent granted technology innovation'), type: 'professional', tier: 2, tags: ['patent'] },
  // Technology patent filings by sector
  { id: 'pat-ai', name: 'AI Patents', url: GN('"patent" "artificial intelligence" OR "machine learning" filed OR granted'), type: 'professional', tier: 2, tags: ['patent', 'ai'] },
  { id: 'pat-semi', name: 'Semiconductor Patents', url: GN('"patent" "semiconductor" OR "chip" OR "lithography" filed OR granted'), type: 'professional', tier: 2, tags: ['patent', 'semiconductor'] },
  { id: 'pat-defense', name: 'Defense Patents', url: GN('"patent" "defense" OR "military" OR "missile" OR "radar" filed OR granted'), type: 'professional', tier: 2, tags: ['patent', 'defense'] },
  { id: 'pat-biotech', name: 'Biotech Patents', url: GN('"patent" "biotechnology" OR "CRISPR" OR "gene therapy" filed OR granted'), type: 'professional', tier: 2, tags: ['patent', 'biotech'] },
  { id: 'pat-energy', name: 'Energy Patents', url: GN('"patent" "renewable energy" OR "battery" OR "solar cell" OR "fusion" filed OR granted'), type: 'professional', tier: 2, tags: ['patent', 'energy'] },
  { id: 'pat-quantum', name: 'Quantum Patents', url: GN('"patent" "quantum computing" OR "quantum cryptography" filed OR granted'), type: 'professional', tier: 2, tags: ['patent', 'quantum'] },
  { id: 'pat-robotics', name: 'Robotics Patents', url: GN('"patent" "robotics" OR "autonomous" OR "actuator" filed OR granted'), type: 'professional', tier: 2, tags: ['patent', 'robotics'] },
  { id: 'pat-space', name: 'Space Patents', url: GN('"patent" "satellite" OR "spacecraft" OR "launch vehicle" filed OR granted'), type: 'professional', tier: 2, tags: ['patent', 'space'] },
  { id: 'pat-cyber', name: 'Cybersecurity Patents', url: GN('"patent" "cybersecurity" OR "encryption" OR "zero trust" filed OR granted'), type: 'professional', tier: 2, tags: ['patent', 'cybersecurity'] },
  // Major company patent activity
  { id: 'pat-nvidia', name: 'NVIDIA Patents', url: GN('NVIDIA patent filed OR granted'), type: 'professional', tier: 2, tags: ['patent', 'nvidia'] },
  { id: 'pat-apple', name: 'Apple Patents', url: GN('Apple patent filed OR granted technology'), type: 'professional', tier: 2, tags: ['patent', 'apple'] },
  { id: 'pat-google', name: 'Google Patents', url: GN('Google patent filed OR granted AI'), type: 'professional', tier: 2, tags: ['patent', 'google'] },
  { id: 'pat-samsung', name: 'Samsung Patents', url: GN('Samsung patent filed OR granted semiconductor'), type: 'professional', tier: 2, tags: ['patent', 'samsung'] },
  { id: 'pat-tsmc', name: 'TSMC Patents', url: GN('TSMC patent filed OR granted'), type: 'professional', tier: 2, tags: ['patent', 'tsmc'] },
  // USPTO & international
  { id: 'pat-uspto', name: 'USPTO News', url: GN('"USPTO" patent granted technology'), type: 'professional', tier: 1, tags: ['patent', 'uspto'] },
  { id: 'pat-epo', name: 'EPO News', url: GN('"European Patent Office" OR "EPO" patent granted'), type: 'professional', tier: 1, tags: ['patent', 'epo'] },
  { id: 'pat-wipo', name: 'WIPO News', url: GN('"WIPO" OR "PCT" patent international application'), type: 'professional', tier: 1, tags: ['patent', 'wipo'] },
  // Patent litigation & transfers
  { id: 'pat-lit', name: 'Patent Litigation', url: GN('patent infringement lawsuit technology'), type: 'professional', tier: 3, tags: ['patent', 'litigation'] },
  { id: 'pat-transfer', name: 'Patent Transfers', url: GN('patent acquisition OR transfer OR license technology'), type: 'professional', tier: 3, tags: ['patent', 'transfer'] },
];

// ── Detection Patterns ─────────────────────────────────────────────────────────

const FILING_PATTERNS: Array<{ type: PatentSignal['filingType']; patterns: RegExp[]; confidence: number }> = [
  { type: 'grant', patterns: [/patent\s+(grant|award|issu)/i, /granted\s+patent/i, /receives?\s+patent/i], confidence: 0.85 },
  { type: 'filing', patterns: [/patent\s+(fil|appli|submit)/i, /files?\s+(for\s+)?patent/i, /patent\s+application/i], confidence: 0.75 },
  { type: 'litigation', patterns: [/patent\s+(infring|lawsuit|litigation|dispute|sue)/i, /sues?\s+(over|for)\s+patent/i], confidence: 0.8 },
  { type: 'transfer', patterns: [/patent\s+(acqui|transfer|licens|purchas|sell)/i, /acquires?\s+patent/i], confidence: 0.7 },
  { type: 'application', patterns: [/patent\s+pending/i, /provisional\s+patent/i, /PCT\s+application/i], confidence: 0.65 },
];

const INDUSTRY_KEYWORDS: Record<string, RegExp> = {
  'ai-ml': /\b(artificial intelligence|machine learning|deep learning|neural network|LLM|GPT|transformer)\b/i,
  'semiconductor': /\b(semiconductor|chip|lithography|ASML|EUV|foundry|wafer|fab)\b/i,
  'defense': /\b(defense|military|missile|radar|stealth|drone|UAV|weapon)\b/i,
  'biotech': /\b(biotech|CRISPR|gene therapy|pharma|drug|clinical trial|mRNA)\b/i,
  'energy': /\b(solar|wind|battery|fusion|renewable|hydrogen|energy storage)\b/i,
  'quantum': /\b(quantum computing|qubit|quantum cryptography|quantum sensor)\b/i,
  'robotics': /\b(robot|autonomous|actuator|humanoid|manipulation|cobot)\b/i,
  'cybersecurity': /\b(cybersecurity|encryption|zero trust|firewall|intrusion|vulnerability)\b/i,
  'space': /\b(satellite|spacecraft|orbit|launch vehicle|space station|SpaceX)\b/i,
};

const CONCURRENCY = 10;
const MAX_FEEDS = 21; // all patent feeds

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractCompany(text: string): string | undefined {
  const match = text.match(
    /\b(NVIDIA|Apple|Google|Microsoft|Samsung|TSMC|Intel|AMD|Qualcomm|Broadcom|Meta|Amazon|Tesla|SpaceX|Lockheed Martin|Raytheon|Boeing|Northrop Grumman|BAE Systems|Elbit|Rafael|Huawei|DJI|BYD|CATL|Sony|Toyota|Fanuc|ASML|Siemens|SAP|Airbus|Thales|Palantir|CrowdStrike|IBM|Oracle|Moderna|Pfizer|Illumina)\b/i,
  );
  return match ? match[1] : undefined;
}

function extractPatentId(text: string): string | undefined {
  const match = text.match(/\b(US|EP|WO|CN|JP|KR)\s?\d{5,}\s?[AB]?\d?\b/i);
  return match ? match[0] : undefined;
}

function classifyIndustry(text: string): string {
  for (const [ind, re] of Object.entries(INDUSTRY_KEYWORDS)) {
    if (re.test(text)) return ind;
  }
  return 'general';
}

function classifyFilingType(text: string): { type: PatentSignal['filingType']; confidence: number } {
  for (const { type, patterns, confidence } of FILING_PATTERNS) {
    for (const re of patterns) {
      if (re.test(text)) return { type, confidence };
    }
  }
  return { type: 'filing', confidence: 0.5 };
}

// ── Main Runner ───────────────────────────────────────────────────────────────

let _cached: PatentDiscoveryResult | null = null;
let _cachedAt = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 min

export async function runPatentDiscoveryAgent(): Promise<PatentDiscoveryResult> {
  if (_cached && Date.now() - _cachedAt < CACHE_TTL) return _cached;

  const start = Date.now();
  const feeds = PATENT_FEEDS.slice(0, MAX_FEEDS);
  let feedsOk = 0;
  const allSignals: PatentSignal[] = [];
  const seen = new Set<string>();

  // Process feeds in batches
  for (let i = 0; i < feeds.length; i += CONCURRENCY) {
    const batch = feeds.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (feed) => {
        const res = await fetchWithRetry(feed.url, {}, { retries: 1 });
        if (!res.ok) return [];
        const xml = await res.text();
        const items = parseAnyFeed(xml, feed.name);
        return items.map((item) => ({ item, feed }));
      }),
    );

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      feedsOk++;
      for (const { item, feed } of result.value) {
        const text = `${item.title ?? ''} ${item.description ?? ''}`;
        // Must mention "patent" somewhere
        if (!/patent/i.test(text)) continue;

        const key = (item.title ?? '').toLowerCase().slice(0, 80);
        if (seen.has(key)) continue;
        seen.add(key);

        const { type: filingType, confidence } = classifyFilingType(text);
        const industry = classifyIndustry(text);

        allSignals.push({
          id: `pat-${Date.now()}-${allSignals.length}`,
          title: (item.title ?? '').slice(0, 200),
          url: item.link ?? feed.url,
          source: feed.name,
          company: extractCompany(text),
          technology: undefined,
          patentId: extractPatentId(text),
          filingType,
          industry,
          confidence,
          discoveredAt: item.pubDate ?? new Date().toISOString(),
          tags: [...feed.tags, filingType, industry],
        });
      }
    }
  }

  // Deduplicate and sort by confidence
  allSignals.sort((a, b) => b.confidence - a.confidence);

  const byFilingType: Record<string, number> = {};
  const byIndustry: Record<string, number> = {};
  for (const s of allSignals) {
    byFilingType[s.filingType] = (byFilingType[s.filingType] ?? 0) + 1;
    byIndustry[s.industry] = (byIndustry[s.industry] ?? 0) + 1;
  }

  const result: PatentDiscoveryResult = {
    signals: allSignals,
    as_of: new Date().toISOString(),
    feeds_scanned: feeds.length,
    feeds_ok: feedsOk,
    total_patents_detected: allSignals.length,
    by_filing_type: byFilingType,
    by_industry: byIndustry,
    scan_duration_ms: Date.now() - start,
  };

  _cached = result;
  _cachedAt = Date.now();
  return result;
}