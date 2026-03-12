// src/lib/agents/agents/startup-discovery-agent.ts
// Startup Discovery Agent — monitors global startup funding, launches, accelerators
// Sources: TechCrunch, Crunchbase news, VentureBeat, startup ecosystems via RSS

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';
import { parseAnyFeed } from '@/lib/rss/parser';
import type { QualityFeedSource } from '@/lib/feeds/quality-source-feeds';

// ── Types ──────────────────────────────────────────────────────────────────────

export type StartupSignal = {
  id: string;
  title: string;
  url: string;
  source: string;
  companyName?: string;
  fundingStage?: 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'series-d-plus' | 'ipo' | 'acquisition' | 'unknown';
  amountUsd?: number;
  industry: string;
  country?: string;
  investors?: string;
  confidence: number;
  discoveredAt: string;
  tags: string[];
};

export type StartupDiscoveryResult = {
  signals: StartupSignal[];
  as_of: string;
  feeds_scanned: number;
  feeds_ok: number;
  total_startups_detected: number;
  by_stage: Record<string, number>;
  by_industry: Record<string, number>;
  total_funding_detected_usd: number;
  scan_duration_ms: number;
};

// ── Startup RSS Sources ────────────────────────────────────────────────────────

const GN = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

const STARTUP_FEEDS: QualityFeedSource[] = [
  // Global startup news
  { id: 'su-tc', name: 'TechCrunch Startups', url: GN('startup funding round raised site:techcrunch.com'), type: 'professional', tier: 1, tags: ['startup', 'funding'] },
  { id: 'su-vb', name: 'VentureBeat Startups', url: GN('startup funding site:venturebeat.com'), type: 'professional', tier: 2, tags: ['startup'] },
  { id: 'su-cb', name: 'Crunchbase News', url: GN('startup funding round site:crunchbase.com'), type: 'professional', tier: 1, tags: ['startup', 'funding'] },
  // Funding rounds by stage
  { id: 'su-seed', name: 'Seed Rounds', url: GN('"seed round" OR "pre-seed" startup raised million'), type: 'financial', tier: 2, tags: ['startup', 'seed'] },
  { id: 'su-a', name: 'Series A', url: GN('"series a" startup raised million funding'), type: 'financial', tier: 2, tags: ['startup', 'series-a'] },
  { id: 'su-b', name: 'Series B+', url: GN('"series b" OR "series c" OR "series d" startup raised million'), type: 'financial', tier: 2, tags: ['startup', 'growth'] },
  { id: 'su-mega', name: 'Mega Rounds', url: GN('startup raises billion funding round unicorn'), type: 'financial', tier: 1, tags: ['startup', 'unicorn'] },
  // Sector-specific startup funding
  { id: 'su-ai', name: 'AI Startups', url: GN('"artificial intelligence" startup funding raised'), type: 'professional', tier: 2, tags: ['startup', 'ai'] },
  { id: 'su-defense', name: 'Defense Startups', url: GN('defense startup funding OR "defense tech" raised'), type: 'professional', tier: 2, tags: ['startup', 'defense'] },
  { id: 'su-climate', name: 'Climate Tech', url: GN('climate tech startup funding raised OR cleantech'), type: 'professional', tier: 2, tags: ['startup', 'climate'] },
  { id: 'su-bio', name: 'Biotech Startups', url: GN('biotech startup funding raised series'), type: 'professional', tier: 2, tags: ['startup', 'biotech'] },
  { id: 'su-fintech', name: 'FinTech Startups', url: GN('fintech startup funding raised series'), type: 'professional', tier: 2, tags: ['startup', 'fintech'] },
  { id: 'su-space', name: 'Space Startups', url: GN('space startup funding raised OR "space tech" OR "NewSpace"'), type: 'professional', tier: 2, tags: ['startup', 'space'] },
  { id: 'su-cyber', name: 'Cyber Startups', url: GN('cybersecurity startup funding raised series'), type: 'professional', tier: 2, tags: ['startup', 'cybersecurity'] },
  // Regional startup ecosystems
  { id: 'su-eu', name: 'EU Startups', url: GN('European startup funding raised million'), type: 'professional', tier: 2, tags: ['startup', 'europe'] },
  { id: 'su-asia', name: 'Asia Startups', url: GN('Asia startup funding raised million Singapore India'), type: 'professional', tier: 2, tags: ['startup', 'asia'] },
  { id: 'su-latam', name: 'LATAM Startups', url: GN('Latin America startup funding raised million Brazil'), type: 'professional', tier: 2, tags: ['startup', 'latam'] },
  { id: 'su-africa', name: 'Africa Startups', url: GN('Africa startup funding raised million Nigeria Kenya'), type: 'professional', tier: 2, tags: ['startup', 'africa'] },
  { id: 'su-me', name: 'Middle East Startups', url: GN('Middle East startup funding raised UAE Saudi Israel'), type: 'professional', tier: 2, tags: ['startup', 'middle-east'] },
  // Accelerators & exits
  { id: 'su-yc', name: 'YC & Accelerators', url: GN('"Y Combinator" OR "Techstars" OR "500 Startups" batch launch'), type: 'professional', tier: 2, tags: ['startup', 'accelerator'] },
  { id: 'su-ipo', name: 'Startup IPOs', url: GN('startup IPO filing OR "goes public" OR SPAC technology'), type: 'financial', tier: 1, tags: ['startup', 'ipo'] },
  { id: 'su-acq', name: 'Startup Acquisitions', url: GN('startup acquired acquisition technology million billion'), type: 'financial', tier: 1, tags: ['startup', 'acquisition'] },
];

// ── Detection Patterns ─────────────────────────────────────────────────────────

const STAGE_PATTERNS: Array<{ stage: StartupSignal['fundingStage']; patterns: RegExp[] }> = [
  { stage: 'pre-seed', patterns: [/pre[- ]seed/i] },
  { stage: 'seed', patterns: [/\bseed\s+(round|funding|invest)/i, /\braised?\s+.*seed/i] },
  { stage: 'series-a', patterns: [/series\s+a\b/i] },
  { stage: 'series-b', patterns: [/series\s+b\b/i] },
  { stage: 'series-c', patterns: [/series\s+c\b/i] },
  { stage: 'series-d-plus', patterns: [/series\s+[d-z]\b/i] },
  { stage: 'ipo', patterns: [/\bIPO\b/, /goes?\s+public/i, /\bSPAC\b/i] },
  { stage: 'acquisition', patterns: [/\bacquir/i, /\bbought\s+by\b/i, /\btakeover\b/i] },
];

function detectStage(text: string): StartupSignal['fundingStage'] {
  for (const { stage, patterns } of STAGE_PATTERNS) {
    for (const re of patterns) {
      if (re.test(text)) return stage;
    }
  }
  return 'unknown';
}

function extractAmount(text: string): number | undefined {
  // Match "$X million" or "$X billion" or "$X.Xm/b"
  const match = text.match(/\$\s?([\d,.]+)\s*(billion|million|B|M|bn|mn)/i);
  if (!match) return undefined;
  const num = parseFloat(match[1].replace(/,/g, ''));
  const unit = match[2].toLowerCase();
  if (unit.startsWith('b')) return num * 1_000_000_000;
  return num * 1_000_000;
}

const INDUSTRY_KEYWORDS: Record<string, RegExp> = {
  'ai-ml': /\b(artificial intelligence|machine learning|AI|LLM|generative AI)\b/i,
  'defense': /\b(defense|military|national security)\b/i,
  'cybersecurity': /\b(cybersecurity|cyber|security|zero trust)\b/i,
  'fintech': /\b(fintech|financial technology|payments|neobank)\b/i,
  'biotech': /\b(biotech|pharma|drug|clinical|genomics)\b/i,
  'climate': /\b(climate|cleantech|renewable|carbon|sustainability)\b/i,
  'space': /\b(space|satellite|launch|orbit|NewSpace)\b/i,
  'robotics': /\b(robot|autonomous|drone|UAV)\b/i,
  'semiconductor': /\b(semiconductor|chip|foundry)\b/i,
  'enterprise': /\b(SaaS|enterprise|B2B|cloud|infrastructure)\b/i,
};

function classifyIndustry(text: string): string {
  for (const [ind, re] of Object.entries(INDUSTRY_KEYWORDS)) {
    if (re.test(text)) return ind;
  }
  return 'general';
}

// ── Main Runner ───────────────────────────────────────────────────────────────

const CONCURRENCY = 10;
let _cached: StartupDiscoveryResult | null = null;
let _cachedAt = 0;
const CACHE_TTL = 10 * 60 * 1000;

export async function runStartupDiscoveryAgent(): Promise<StartupDiscoveryResult> {
  if (_cached && Date.now() - _cachedAt < CACHE_TTL) return _cached;

  const start = Date.now();
  const feeds = STARTUP_FEEDS;
  let feedsOk = 0;
  const allSignals: StartupSignal[] = [];
  const seen = new Set<string>();

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
        // Must mention funding, startup, raised, etc.
        if (!/\b(fund|rais|startup|seed|series|invest|unicorn|IPO|acqui)/i.test(text)) continue;

        const key = (item.title ?? '').toLowerCase().slice(0, 80);
        if (seen.has(key)) continue;
        seen.add(key);

        const stage = detectStage(text);
        const amount = extractAmount(text);

        allSignals.push({
          id: `su-${Date.now()}-${allSignals.length}`,
          title: (item.title ?? '').slice(0, 200),
          url: item.link ?? feed.url,
          source: feed.name,
          fundingStage: stage,
          amountUsd: amount,
          industry: classifyIndustry(text),
          confidence: stage !== 'unknown' ? 0.8 : 0.5,
          discoveredAt: item.pubDate ?? new Date().toISOString(),
          tags: [...feed.tags, stage ?? 'unknown'],
        });
      }
    }
  }

  allSignals.sort((a, b) => (b.amountUsd ?? 0) - (a.amountUsd ?? 0));

  const byStage: Record<string, number> = {};
  const byIndustry: Record<string, number> = {};
  let totalFunding = 0;
  for (const s of allSignals) {
    byStage[s.fundingStage ?? 'unknown'] = (byStage[s.fundingStage ?? 'unknown'] ?? 0) + 1;
    byIndustry[s.industry] = (byIndustry[s.industry] ?? 0) + 1;
    if (s.amountUsd) totalFunding += s.amountUsd;
  }

  const result: StartupDiscoveryResult = {
    signals: allSignals,
    as_of: new Date().toISOString(),
    feeds_scanned: feeds.length,
    feeds_ok: feedsOk,
    total_startups_detected: allSignals.length,
    by_stage: byStage,
    by_industry: byIndustry,
    total_funding_detected_usd: totalFunding,
    scan_duration_ms: Date.now() - start,
  };

  _cached = result;
  _cachedAt = Date.now();
  return result;
}