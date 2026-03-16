// src/lib/engines/source-discovery-engine.ts
// NXT//LINK Source Auto-Discovery Engine
// Generates and discovers new RSS/news sources from keywords, industry slugs,
// domain patterns, and trending topics.

import type { FeedCategory } from '@/lib/agents/feed-agent';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DiscoveredSource = {
  id: string;
  name: string;
  url: string;
  category: FeedCategory;
  tags: string[];
  tier: 3 | 4;
  discoveredAt: string;
  discoveryMethod: 'keyword-expansion' | 'domain-scan' | 'related-search' | 'trending-topic';
  confidence: number; // 0–100
};

export type DiscoveryConfig = {
  keyword: string;
  maxSources?: number;
  includeGoogleNews?: boolean;
  includeDomainScan?: boolean;
  relatedTerms?: string[];
};

type DiscoveryResult = {
  sources: DiscoveredSource[];
  keyword: string;
  method: string;
  durationMs: number;
};

// ─── Google News RSS helper ───────────────────────────────────────────────────

function gnUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

// ─── Keyword → FeedCategory mapping ──────────────────────────────────────────

const KEYWORD_CATEGORY_MAP: Array<{ patterns: string[]; category: FeedCategory }> = [
  { patterns: ['cyber', 'security', 'ransomware', 'zero trust', 'siem', 'soc', 'threat', 'malware', 'phishing', 'hack'], category: 'Cybersecurity' },
  { patterns: ['ai', 'machine learning', 'deep learning', 'llm', 'neural', 'nlp', 'generative', 'gpt', 'model', 'inference'], category: 'AI/ML' },
  { patterns: ['defense', 'military', 'army', 'navy', 'pentagon', 'dod', 'contractor', 'weapon', 'munition', 'drone warfare'], category: 'Defense' },
  { patterns: ['supply chain', 'logistics', 'warehouse', 'shipping', 'freight', 'port', 'inventory', 'procurement'], category: 'Supply Chain' },
  { patterns: ['energy', 'solar', 'wind', 'grid', 'battery', 'renewable', 'fossil', 'nuclear', 'hydrogen', 'power'], category: 'Energy' },
  { patterns: ['finance', 'fintech', 'bank', 'payment', 'crypto', 'blockchain', 'investment', 'fund', 'trading', 'defi'], category: 'Finance' },
  { patterns: ['health', 'medical', 'pharma', 'biotech', 'clinical', 'hospital', 'patient', 'drug', 'genomic', 'diagnostic'], category: 'Enterprise' },
  { patterns: ['crime', 'police', 'law enforcement', 'border patrol', 'cartel', 'fentanyl', 'smuggling'], category: 'Crime' },
];

function inferCategory(keyword: string): FeedCategory {
  const lk = keyword.toLowerCase();
  for (const { patterns, category } of KEYWORD_CATEGORY_MAP) {
    if (patterns.some((p) => lk.includes(p))) return category;
  }
  return 'General';
}

// ─── Slug → keyword + related-terms map ──────────────────────────────────────

const INDUSTRY_SLUG_MAP: Record<string, { keyword: string; relatedTerms: string[] }> = {
  'ai-ml':              { keyword: 'artificial intelligence machine learning', relatedTerms: ['LLM', 'generative AI', 'neural network', 'AI startup funding', 'AI regulation'] },
  'cybersecurity':      { keyword: 'cybersecurity threat intelligence', relatedTerms: ['zero trust', 'ransomware', 'SOC automation', 'CISA advisory', 'endpoint detection'] },
  'defense':            { keyword: 'defense technology contracts', relatedTerms: ['DoD acquisition', 'Pentagon budget', 'NDAA', 'hypersonic', 'C4ISR'] },
  'energy':             { keyword: 'energy technology transition', relatedTerms: ['smart grid', 'battery storage', 'solar deployment', 'hydrogen fuel', 'ERCOT'] },
  'manufacturing':      { keyword: 'advanced manufacturing automation', relatedTerms: ['robotics', 'digital twin', 'Industry 4.0', 'CNC', 'predictive maintenance'] },
  'logistics':          { keyword: 'logistics supply chain technology', relatedTerms: ['last mile delivery', 'autonomous trucks', 'warehouse robotics', 'RFID', 'cold chain'] },
  'healthcare':         { keyword: 'healthcare technology digital health', relatedTerms: ['EHR', 'telemedicine', 'AI diagnostics', 'precision medicine', 'FDA clearance'] },
  'water-tech':         { keyword: 'water technology desalination', relatedTerms: ['smart irrigation', 'water recycling', 'aquifer', 'PFAS treatment', 'water scarcity'] },
  'border-tech':        { keyword: 'border technology CBP customs', relatedTerms: ['biometrics', 'license plate recognition', 'cargo scanning', 'wait time', 'USMCA'] },
  'construction':       { keyword: 'construction technology smart buildings', relatedTerms: ['BIM', 'drone inspection', 'modular construction', 'infrastructure', 'concrete tech'] },
  'agriculture':        { keyword: 'agriculture technology precision farming', relatedTerms: ['drone agri', 'soil sensor', 'crop monitoring', 'vertical farming', 'food tech'] },
  'fintech':            { keyword: 'fintech financial technology startup', relatedTerms: ['payments', 'neobank', 'RegTech', 'crypto regulation', 'open banking'] },
  'aerospace':          { keyword: 'aerospace technology space commercialization', relatedTerms: ['satellite', 'launch vehicle', 'UAV', 'VTOL', 'SpaceX Starlink'] },
  'biotech':            { keyword: 'biotech genomics drug discovery', relatedTerms: ['CRISPR', 'mRNA', 'clinical trial', 'FDA approval', 'synthetic biology'] },
  'quantum-computing':  { keyword: 'quantum computing hardware software', relatedTerms: ['qubit', 'quantum error correction', 'IBM quantum', 'D-Wave', 'post-quantum crypto'] },
  'autonomous-vehicles':{ keyword: 'autonomous vehicles self-driving', relatedTerms: ['LiDAR', 'ADAS', 'waymo', 'Tesla FSD', 'V2X communication'] },
};

// ─── Trending tech topics ─────────────────────────────────────────────────────

const TRENDING_TOPICS: Array<{ keyword: string; tags: string[] }> = [
  { keyword: 'agentic AI autonomous agents 2025', tags: ['ai', 'agents', 'automation'] },
  { keyword: 'quantum computing error correction breakthrough', tags: ['quantum', 'computing', 'hardware'] },
  { keyword: 'humanoid robots manufacturing deployment', tags: ['robotics', 'manufacturing', 'ai'] },
  { keyword: 'edge AI inference chips 2025', tags: ['ai', 'semiconductors', 'edge-computing'] },
  { keyword: 'small modular reactor nuclear energy SMR', tags: ['energy', 'nuclear', 'smr'] },
  { keyword: 'autonomous underwater vehicles defense', tags: ['defense', 'maritime', 'autonomous'] },
  { keyword: 'digital twin manufacturing aerospace', tags: ['digital-twin', 'manufacturing', 'simulation'] },
  { keyword: 'post-quantum cryptography NIST standard', tags: ['cybersecurity', 'quantum', 'encryption'] },
  { keyword: 'hypersonic missile defense contract award', tags: ['defense', 'hypersonic', 'contracts'] },
  { keyword: 'AI chip semiconductor shortage 2025', tags: ['semiconductors', 'ai', 'supply-chain'] },
  { keyword: 'carbon capture utilization storage technology', tags: ['energy', 'climate', 'ccs'] },
  { keyword: 'space debris removal satellite', tags: ['space', 'satellite', 'defense'] },
];

// ─── RSS-rich domains for domain scanning ────────────────────────────────────

const RSS_RICH_DOMAINS: Array<{ domain: string; feedPath: string; name: string; tags: string[] }> = [
  { domain: 'techcrunch.com',        feedPath: '/feed/',                  name: 'TechCrunch',        tags: ['startup', 'tech', 'funding'] },
  { domain: 'arstechnica.com',       feedPath: '/feed/',                  name: 'Ars Technica',      tags: ['tech', 'science', 'deep-dive'] },
  { domain: 'wired.com',             feedPath: '/feed/rss',               name: 'WIRED',             tags: ['tech', 'culture', 'policy'] },
  { domain: 'theverge.com',          feedPath: '/rss/index.xml',          name: 'The Verge',         tags: ['tech', 'consumer', 'gadgets'] },
  { domain: 'venturebeat.com',       feedPath: '/feed/',                  name: 'VentureBeat',       tags: ['ai', 'enterprise', 'startup'] },
  { domain: 'zdnet.com',             feedPath: '/news/rss.xml',           name: 'ZDNet',             tags: ['enterprise', 'security', 'tech'] },
  { domain: 'darkreading.com',       feedPath: '/rss/all',                name: 'Dark Reading',      tags: ['cybersecurity', 'threats'] },
  { domain: 'securityweek.com',      feedPath: '/feed/',                  name: 'SecurityWeek',      tags: ['cybersecurity', 'vulnerabilities'] },
  { domain: 'ieee.org',              feedPath: '/feeds/topics/artificial-intelligence.rss', name: 'IEEE Spectrum AI', tags: ['ieee', 'ai', 'research'] },
  { domain: 'thenextweb.com',        feedPath: '/feed/',                  name: 'The Next Web',      tags: ['tech', 'startup', 'europe'] },
  { domain: 'axios.com',             feedPath: '/feed/',                  name: 'Axios Tech',        tags: ['tech', 'policy', 'business'] },
  { domain: 'protocol.com',          feedPath: '/rss',                    name: 'Protocol',          tags: ['tech', 'policy', 'enterprise'] },
  { domain: 'defensenews.com',       feedPath: '/arc/outboundfeeds/rss/', name: 'Defense News',      tags: ['defense', 'procurement', 'military'] },
  { domain: 'breakingdefense.com',   feedPath: '/feed/',                  name: 'Breaking Defense',  tags: ['defense', 'contracts', 'dod'] },
  { domain: 'spaceflightnow.com',    feedPath: '/feed/',                  name: 'Spaceflight Now',   tags: ['space', 'launch', 'satellite'] },
  { domain: 'greentechmedia.com',    feedPath: '/feed/',                  name: 'Greentech Media',   tags: ['energy', 'cleantech', 'solar'] },
  { domain: 'biopharmadive.com',     feedPath: '/feeds/news/',            name: 'BioPharma Dive',    tags: ['biotech', 'pharma', 'fda'] },
  { domain: 'supplychaindive.com',   feedPath: '/feeds/news/',            name: 'Supply Chain Dive', tags: ['supply-chain', 'logistics'] },
  { domain: 'constructiondive.com',  feedPath: '/feeds/news/',            name: 'Construction Dive', tags: ['construction', 'infrastructure'] },
  { domain: 'agriculturedive.com',   feedPath: '/feeds/news/',            name: 'Agriculture Dive',  tags: ['agriculture', 'food-tech'] },
];

// ─── Query suffix expansion templates ────────────────────────────────────────

const QUERY_SUFFIXES = [
  'technology',
  'startup funding',
  'patent',
  'contract award',
  'research breakthrough',
  'market growth',
  'regulation policy',
  'acquisition merger',
  'deployment',
  'company',
] as const;

// ─── ID slug helper ───────────────────────────────────────────────────────────

function toId(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 64);
}

// ─── Existing source ID set (from registry) ───────────────────────────────────
// We keep a runtime Set that grows as sources are discovered in the session.
// Callers can also pass a pre-populated set to deduplicate against the registry.

let _sessionDiscoveredIds = new Set<string>();

export function resetDiscoverySession(): void {
  _sessionDiscoveredIds = new Set<string>();
}

// ─── Core discovery function ──────────────────────────────────────────────────

export async function discoverSources(
  config: DiscoveryConfig,
  existingIds: Set<string> = new Set(),
): Promise<DiscoveryResult> {
  const startMs = Date.now();
  const {
    keyword,
    maxSources = 30,
    includeGoogleNews = true,
    includeDomainScan = true,
    relatedTerms = [],
  } = config;

  const discovered: DiscoveredSource[] = [];
  const seenUrls = new Set<string>();
  const seenIds = new Set([...existingIds, ..._sessionDiscoveredIds]);
  const now = new Date().toISOString();
  const category = inferCategory(keyword);

  function addSource(s: DiscoveredSource): void {
    if (seenIds.has(s.id) || seenUrls.has(s.url)) return;
    if (discovered.length >= maxSources) return;
    seenIds.add(s.id);
    seenUrls.add(s.url);
    _sessionDiscoveredIds.add(s.id);
    discovered.push(s);
  }

  // 1. Keyword expansion via Google News RSS
  if (includeGoogleNews) {
    for (const suffix of QUERY_SUFFIXES) {
      const query = `${keyword} ${suffix}`;
      const url = gnUrl(query);
      const slugBase = toId(`disc-gn-${keyword}-${suffix}`);
      addSource({
        id: slugBase,
        name: `GN: ${keyword} ${suffix}`,
        url,
        category,
        tags: [toId(keyword), suffix.replace(/\s+/g, '-')],
        tier: 4,
        discoveredAt: now,
        discoveryMethod: 'keyword-expansion',
        confidence: 72,
      });
    }

    // Related terms — lower confidence since they're derived
    for (const term of relatedTerms) {
      const url = gnUrl(term);
      const id = toId(`disc-gn-related-${term}`);
      addSource({
        id,
        name: `GN: ${term}`,
        url,
        category,
        tags: [toId(term), 'related'],
        tier: 4,
        discoveredAt: now,
        discoveryMethod: 'related-search',
        confidence: 58,
      });
    }
  }

  // 2. Domain scanning — build feed URLs from RSS-rich domains filtered to keyword relevance
  if (includeDomainScan) {
    const lk = keyword.toLowerCase();
    for (const dom of RSS_RICH_DOMAINS) {
      // Only include domain if at least one tag overlaps with keyword terms
      const domTags = dom.tags.join(' ');
      const keyTerms = lk.split(/\s+/);
      const overlaps = keyTerms.some((t) => t.length > 3 && domTags.includes(t));
      if (!overlaps && category === 'General') {
        // For General category include all domains since we have no category signal
      } else if (!overlaps) {
        continue;
      }
      const url = `https://${dom.domain}${dom.feedPath}`;
      const id = toId(`disc-domain-${dom.domain}-${keyword}`);
      addSource({
        id,
        name: dom.name,
        url,
        category,
        tags: dom.tags,
        tier: 3,
        discoveredAt: now,
        discoveryMethod: 'domain-scan',
        confidence: 85,
      });
    }
  }

  return {
    sources: discovered,
    keyword,
    method: [includeGoogleNews && 'keyword-expansion', includeDomainScan && 'domain-scan', relatedTerms.length > 0 && 'related-search']
      .filter(Boolean)
      .join(', '),
    durationMs: Date.now() - startMs,
  };
}

// ─── Industry slug entry point ────────────────────────────────────────────────

export async function discoverForIndustry(
  slug: string,
  existingIds: Set<string> = new Set(),
): Promise<DiscoveryResult> {
  const mapping = INDUSTRY_SLUG_MAP[slug];

  // Unknown slug: derive keyword from slug itself
  const keyword = mapping?.keyword ?? slug.replace(/-/g, ' ');
  const relatedTerms = mapping?.relatedTerms ?? [];

  return discoverSources(
    {
      keyword,
      maxSources: 25,
      includeGoogleNews: true,
      includeDomainScan: true,
      relatedTerms,
    },
    existingIds,
  );
}

// ─── Trending topics discovery ────────────────────────────────────────────────

export async function discoverTrending(
  existingIds: Set<string> = new Set(),
): Promise<DiscoveredSource[]> {
  const now = new Date().toISOString();
  const seenIds = new Set([...existingIds, ..._sessionDiscoveredIds]);
  const seenUrls = new Set<string>();
  const sources: DiscoveredSource[] = [];

  for (const topic of TRENDING_TOPICS) {
    const url = gnUrl(topic.keyword);
    const id = toId(`disc-trending-${topic.keyword}`);

    if (seenIds.has(id) || seenUrls.has(url)) continue;
    seenIds.add(id);
    seenUrls.add(url);
    _sessionDiscoveredIds.add(id);

    sources.push({
      id,
      name: `Trending: ${topic.keyword.slice(0, 60)}`,
      url,
      category: inferCategory(topic.keyword),
      tags: topic.tags,
      tier: 4,
      discoveredAt: now,
      discoveryMethod: 'trending-topic',
      confidence: 65,
    });
  }

  return sources;
}

// ─── Batch discover across multiple keywords ──────────────────────────────────

export async function discoverBatch(
  keywords: string[],
  existingIds: Set<string> = new Set(),
): Promise<DiscoveredSource[]> {
  const results: DiscoveredSource[] = [];
  const seen = new Set(existingIds);

  for (const kw of keywords) {
    const r = await discoverSources({ keyword: kw, maxSources: 15 }, seen);
    r.sources.forEach((s) => {
      seen.add(s.id);
      results.push(s);
    });
  }

  return results;
}
