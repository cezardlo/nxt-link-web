// src/lib/engines/live-search-engine.ts
// On-demand live intelligence collection for /ask queries.
// Fetches from Google News RSS, GDELT, arXiv, OpenAlex, PatentsView, Grants.gov
// All FREE, no API keys required. Returns comprehensive industry intelligence.

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';
import { parseAnyFeed, type ParsedItem } from '@/lib/rss/parser';
import { fetchGdeltEvents, type GdeltArticle } from '@/lib/sources/gdelt';
import { fetchOpenAlexWorks } from '@/lib/sources/openalex';
import { discoverSources } from '@/lib/engines/source-discovery-engine';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LiveArticle = {
  title: string;
  url: string;
  source: string;
  description: string;
  publishedAt: string;
  relevanceScore: number;
  credibilityTier: 1 | 2 | 3 | 4; // 1=top tier, 4=unknown
  sentiment: 'positive' | 'negative' | 'neutral';
  region: string; // country or "Global"
};

export type ExtractedCompany = {
  name: string;
  mentions: number;
  context: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  isHiring: boolean;
  hasRecentFunding: boolean;
};

export type PatentResult = {
  title: string;
  assignee: string;
  date: string;
  patentNumber: string;
  url: string;
};

export type ResearchPaper = {
  title: string;
  authors: string[];
  source: string;
  year: number;
  citations: number;
  url: string;
  abstract: string;
};

export type GrantResult = {
  title: string;
  agency: string;
  amount: string;
  deadline: string;
  url: string;
};

export type MarketDataPoint = {
  metric: string;
  value: string;
  source: string;
};

export type GeographicBreakdown = {
  country: string;
  articleCount: number;
  percentage: number;
};

export type FundingEvent = {
  company: string;
  amount: string;
  round: string;
  date: string;
  source: string;
};

export type WikipediaSummary = {
  title: string;
  extract: string;       // plain text summary (2-3 paragraphs)
  description: string;   // one-line description
  thumbnail: string;     // image URL
  url: string;           // full article URL
};

export type FederalContract = {
  title: string;
  agency: string;
  amount: string;
  vendor: string;
  date: string;
  url: string;
};

export type LiveSearchResult = {
  articles: LiveArticle[];
  companies: ExtractedCompany[];
  patents: PatentResult[];
  research: ResearchPaper[];
  grants: GrantResult[];
  contracts: FederalContract[];
  funding: FundingEvent[];
  market_data: MarketDataPoint[];
  geography: GeographicBreakdown[];
  wikipedia: WikipediaSummary | null;
  image_url: string | null;
  summary: {
    total_sources_checked: number;
    total_articles_found: number;
    total_patents_found: number;
    total_papers_found: number;
    total_grants_found: number;
    total_contracts_found: number;
    top_sources: string[];
    keywords_used: string[];
    freshest_article: string;
    oldest_article: string;
  };
  sentiment: {
    overall: 'positive' | 'negative' | 'neutral' | 'mixed';
    positive_pct: number;
    negative_pct: number;
    neutral_pct: number;
  };
  inferred: {
    what_it_is: string;
    key_trends: string[];
    price_signals: string[];
    market_sizes: string[];
    growth_rates: string[];
    related_industries: string[];
    related_searches: string[];
    hiring_signals: string[];
    regulatory_signals: string[];
    risk_signals: string[];
  };
  duration_ms: number;
};

// ─── Query-level cache (5 min TTL) ───────────────────────────────────────────

const queryCache = new Map<string, { result: LiveSearchResult; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached(key: string): LiveSearchResult | null {
  const entry = queryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    queryCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCache(key: string, result: LiveSearchResult): void {
  if (queryCache.size > 100) {
    const oldest = queryCache.keys().next().value;
    if (oldest) queryCache.delete(oldest);
  }
  queryCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Google News RSS helper ──────────────────────────────────────────────────

function gnUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

// ─── Source credibility tiers ───────────────────────────────────────────────

const TIER_1_SOURCES = new Set([
  'reuters.com', 'apnews.com', 'bbc.com', 'nytimes.com', 'wsj.com',
  'bloomberg.com', 'ft.com', 'economist.com', 'nature.com', 'science.org',
  'thelancet.com', 'nejm.org', 'ieee.org',
]);
const TIER_2_SOURCES = new Set([
  'techcrunch.com', 'arstechnica.com', 'wired.com', 'theverge.com',
  'venturebeat.com', 'zdnet.com', 'cnbc.com', 'forbes.com', 'fortune.com',
  'mit.edu', 'stanford.edu', 'harvard.edu', 'darkreading.com',
  'defensenews.com', 'spacenews.com', 'scientificamerican.com',
  'technologyreview.com',
]);
const TIER_3_SOURCES = new Set([
  'businessinsider.com', 'axios.com', 'protocol.com', 'theinformation.com',
  'semafor.com', 'politico.com', 'thehill.com', 'defenseone.com',
  'breakingdefense.com', 'supplychaindive.com', 'utilitydive.com',
  'biopharmadive.com', 'constructiondive.com',
]);

function getCredibilityTier(source: string): 1 | 2 | 3 | 4 {
  const domain = source.toLowerCase().replace(/^www\./, '');
  if (TIER_1_SOURCES.has(domain)) return 1;
  if (TIER_2_SOURCES.has(domain)) return 2;
  if (TIER_3_SOURCES.has(domain)) return 3;
  return 4;
}

// ─── Keyword expansion — 10 variants for broader coverage ───────────────────

function expandQuery(query: string): string[] {
  const base = query.trim();
  return [
    base,
    `${base} technology`,
    `${base} companies suppliers vendors`,
    `${base} market industry trends`,
    `${base} cost pricing budget`,
    `${base} startup funding investment`,
    `${base} patents innovation`,
    `${base} regulation policy government`,
    `${base} problems challenges solutions`,
    `${base} future forecast 2025 2026`,
  ];
}

// ─── Fetch a single RSS feed ────────────────────────────────────────────────

async function fetchFeed(url: string, sourceName: string): Promise<ParsedItem[]> {
  try {
    const res = await fetchWithRetry(url, {
      headers: { 'User-Agent': 'NxtLink/1.0' },
    }, {
      retries: 1,
      cacheTtlMs: 5 * 60 * 1000,
      cacheKey: `live-search:${url}`,
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseAnyFeed(xml, sourceName);
  } catch {
    return [];
  }
}

// ─── Sentiment analysis (keyword-based) ─────────────────────────────────────

const POSITIVE_WORDS = new Set([
  'growth', 'breakthrough', 'innovation', 'success', 'launch', 'expand',
  'record', 'surge', 'boost', 'gain', 'win', 'award', 'leading', 'advance',
  'improve', 'milestone', 'achieve', 'revenue', 'profit', 'partnership',
  'deploy', 'upgrade', 'opportunity', 'promising', 'efficient', 'strong',
  'growing', 'accelerate', 'invest', 'raise', 'fund', 'hire', 'hiring',
]);
const NEGATIVE_WORDS = new Set([
  'decline', 'fail', 'risk', 'threat', 'crash', 'breach', 'hack', 'layoff',
  'shutdown', 'recall', 'lawsuit', 'fraud', 'scandal', 'ban', 'penalty',
  'shortage', 'disruption', 'delay', 'loss', 'bankruptcy', 'downturn',
  'vulnerability', 'attack', 'warning', 'crisis', 'cut', 'slash', 'drop',
  'concern', 'problem', 'issue', 'danger', 'collapse', 'fallout',
]);

function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const words = text.toLowerCase().split(/\W+/);
  let pos = 0;
  let neg = 0;
  for (const w of words) {
    if (POSITIVE_WORDS.has(w)) pos++;
    if (NEGATIVE_WORDS.has(w)) neg++;
  }
  if (pos > neg + 1) return 'positive';
  if (neg > pos + 1) return 'negative';
  return 'neutral';
}

// ─── Company extraction ─────────────────────────────────────────────────────

const COMPANY_SUFFIXES = /\b(Inc|Corp|Corporation|LLC|Ltd|Co|Group|Technologies|Solutions|Systems|Industries|Robotics|Automation|Ventures|Partners|Capital|Labs|Dynamics|Therapeutics|Pharmaceuticals|Biotech|Sciences|Energy|Networks|Security|Defense|Aerospace|Analytics|Intelligence|Platforms|Software|Health|Medical|Bio)\b/g;

const COMPANY_PATTERNS = [
  // "Company Inc." style
  /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:Inc|Corp|LLC|Ltd|Co|Group|Technologies|Solutions|Systems|Industries|Robotics|Automation|Ventures|Partners|Capital|Labs)\b/g,
  // "XYZ announced/launched/raised/etc."
  /\b([A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]+){0,2})\s+(?:announced|launched|released|acquired|partnered|raised|secured|unveiled|reported|expanded|signed|closed|completed|introduced|developed|deployed|opened|received|won|filed|submitted|invested)/g,
  // "'s" possessive — "Google's new AI"
  /\b([A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]+){0,1})'s\s+(?:new|latest|first|next|upcoming|recent|annual|quarterly)/g,
];

const STOP_WORDS = new Set([
  'The', 'This', 'That', 'These', 'Those', 'What', 'When', 'Where', 'Which',
  'How', 'Why', 'Who', 'New', 'More', 'Most', 'Some', 'Many', 'Several',
  'First', 'Last', 'Next', 'Other', 'Another', 'Every', 'Each', 'All',
  'Top', 'Best', 'Big', 'Global', 'World', 'Market', 'Report', 'Study',
  'News', 'Update', 'Breaking', 'Today', 'Here', 'According', 'After',
  'Before', 'Between', 'Under', 'Over', 'While', 'Despite', 'About',
  'Against', 'Through', 'During', 'Without', 'Within', 'Recent', 'Former',
  'Current', 'Major', 'Key', 'Watch', 'Read', 'See', 'Get', 'Make',
  'Can', 'Will', 'May', 'Could', 'Should', 'Would', 'Must', 'Just',
]);

function extractCompaniesFromText(articles: LiveArticle[]): ExtractedCompany[] {
  const mentions = new Map<string, { count: number; context: string; texts: string[] }>();

  for (const article of articles) {
    const text = `${article.title}. ${article.description}`;

    // Pattern-based extraction
    for (const pattern of COMPANY_PATTERNS) {
      pattern.lastIndex = 0;
      let match = pattern.exec(text);
      while (match) {
        const name = match[1].trim();
        if (name.length >= 3 && name.length <= 40 && !STOP_WORDS.has(name.split(' ')[0])) {
          const existing = mentions.get(name);
          if (existing) {
            existing.count += 1;
            existing.texts.push(text);
          } else {
            const sentenceMatch = text.match(new RegExp(`[^.]*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]*\\.?`));
            mentions.set(name, {
              count: 1,
              context: sentenceMatch?.[0]?.trim().slice(0, 200) ?? '',
              texts: [text],
            });
          }
        }
        match = pattern.exec(text);
      }
    }

    // Also match corporate suffixes directly
    COMPANY_SUFFIXES.lastIndex = 0;
    const suffixMatches = text.matchAll(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z]?[a-zA-Z]+)*\s+(?:Inc|Corp|LLC|Ltd|Technologies|Solutions|Systems))\b/g);
    for (const sm of suffixMatches) {
      const name = sm[1].trim();
      if (name.length >= 5 && !STOP_WORDS.has(name.split(' ')[0])) {
        const existing = mentions.get(name);
        if (existing) {
          existing.count += 1;
        } else {
          mentions.set(name, { count: 1, context: '', texts: [text] });
        }
      }
    }
  }

  return Array.from(mentions.entries() as Iterable<[string, { count: number; context: string; texts: string[] }]>)
    .filter(([, data]) => data.count >= 1)
    .map(([name, data]) => {
      const allText = data.texts.join(' ').toLowerCase();
      return {
        name,
        mentions: data.count,
        context: data.context,
        sentiment: analyzeSentiment(allText),
        isHiring: /\b(hiring|hires|recruit|job|talent|workforce|headcount)\b/i.test(allText),
        hasRecentFunding: /\b(raised|funding|series [a-e]|seed|investment|valuation|ipo)\b/i.test(allText),
      };
    })
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 25);
}

// ─── Price/cost signal extraction ───────────────────────────────────────────

const PRICE_PATTERNS = [
  /\$[\d,.]+\s*(?:billion|million|thousand|B|M|K)\b/gi,
  /(?:costs?|pricing|priced|worth|valued)\s+(?:at\s+)?\$[\d,.]+[BMK]?/gi,
  /\$[\d,.]+\s*(?:per|\/)\s*(?:month|year|unit|license|seat|user|kwh|mwh)/gi,
  /(?:budget|invest(?:ment)?|revenue|funding|raised|round)\s+(?:of\s+)?\$[\d,.]+[BMK]?/gi,
  /(?:market\s+(?:size|worth|value|cap))\s+(?:of\s+|at\s+|reached?\s+)?\$[\d,.]+[BMK]?/gi,
  /(?:contract|deal|order)\s+(?:worth|valued at)?\s*\$[\d,.]+[BMK]?/gi,
];

function extractPriceSignals(articles: LiveArticle[]): string[] {
  const signals = new Set<string>();
  for (const article of articles) {
    const text = `${article.title}. ${article.description}`;
    for (const pattern of PRICE_PATTERNS) {
      pattern.lastIndex = 0;
      let match = pattern.exec(text);
      while (match) {
        signals.add(match[0].trim());
        match = pattern.exec(text);
      }
    }
  }
  return Array.from(signals).slice(0, 15);
}

// ─── Market size extraction ─────────────────────────────────────────────────

function extractMarketSizes(articles: LiveArticle[]): string[] {
  const sizes: string[] = [];
  const pattern = /(?:market\s+(?:size|worth|value|cap|opportunity)|valued at|reach|expected to (?:reach|grow to)|projected at|estimated at)\s+\$[\d,.]+\s*(?:billion|million|B|M)\b[^.]{0,60}/gi;
  for (const article of articles) {
    const text = `${article.title}. ${article.description}`;
    pattern.lastIndex = 0;
    let match = pattern.exec(text);
    while (match) {
      sizes.push(match[0].trim());
      match = pattern.exec(text);
    }
  }
  return [...new Set(sizes)].slice(0, 5);
}

// ─── Growth rate extraction ─────────────────────────────────────────────────

function extractGrowthRates(articles: LiveArticle[]): string[] {
  const rates: string[] = [];
  const pattern = /(?:CAGR|growth rate|growing at|YoY|year-over-year|annual growth)\s*(?:of\s+)?[\d.]+%[^.]{0,40}/gi;
  for (const article of articles) {
    const text = `${article.title}. ${article.description}`;
    pattern.lastIndex = 0;
    let match = pattern.exec(text);
    while (match) {
      rates.push(match[0].trim());
      match = pattern.exec(text);
    }
  }
  return [...new Set(rates)].slice(0, 5);
}

// ─── Funding event extraction ───────────────────────────────────────────────

function extractFundingEvents(articles: LiveArticle[]): FundingEvent[] {
  const events: FundingEvent[] = [];
  const pattern = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\s+(?:raised?|secures?|closed?|announced?)\s+\$?([\d,.]+\s*(?:million|billion|M|B|K))\s*(?:in\s+)?(?:a\s+)?(seed|pre-seed|Series\s+[A-F]|growth|venture|debt|equity)?/gi;

  for (const article of articles) {
    const text = `${article.title}. ${article.description}`;
    pattern.lastIndex = 0;
    let match = pattern.exec(text);
    while (match) {
      if (!STOP_WORDS.has(match[1].split(' ')[0])) {
        events.push({
          company: match[1].trim(),
          amount: `$${match[2].trim()}`,
          round: match[3]?.trim() ?? 'undisclosed',
          date: article.publishedAt,
          source: article.source,
        });
      }
      match = pattern.exec(text);
    }
  }
  return events.slice(0, 10);
}

// ─── Hiring signal extraction ───────────────────────────────────────────────

function extractHiringSignals(articles: LiveArticle[]): string[] {
  const signals: string[] = [];
  const pattern = /(?:[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\s+(?:is hiring|hiring|plans to hire|adding|recruits?|looking for|headcount|workforce|talent|jobs?|positions?|roles?)\s+[\d,]+[^.]{0,60}/gi;
  for (const article of articles) {
    const text = `${article.title}. ${article.description}`;
    pattern.lastIndex = 0;
    let match = pattern.exec(text);
    while (match) {
      signals.push(match[0].trim().slice(0, 120));
      match = pattern.exec(text);
    }
  }
  return [...new Set(signals)].slice(0, 5);
}

// ─── Regulatory signal extraction ───────────────────────────────────────────

function extractRegulatorySignals(articles: LiveArticle[]): string[] {
  const signals: string[] = [];
  const regKeywords = /\b(FDA|EPA|SEC|FCC|DOE|OSHA|NIST|EU|regulation|regulatory|compliance|ban|mandate|legislation|executive order|policy|standard|certification|approval|clearance)\b/i;
  for (const article of articles) {
    const text = `${article.title}. ${article.description}`;
    if (regKeywords.test(text)) {
      signals.push(article.title.slice(0, 120));
    }
  }
  return [...new Set(signals)].slice(0, 5);
}

// ─── Risk signal extraction ─────────────────────────────────────────────────

function extractRiskSignals(articles: LiveArticle[]): string[] {
  const signals: string[] = [];
  const riskKeywords = /\b(breach|hack|vulnerability|recall|lawsuit|shortage|disruption|ban|sanction|tariff|embargo|bankruptcy|failure|accident|contamination|scandal|investigation|warning|alert)\b/i;
  for (const article of articles) {
    const text = `${article.title}`;
    if (riskKeywords.test(text)) {
      signals.push(text.slice(0, 120));
    }
  }
  return [...new Set(signals)].slice(0, 5);
}

// ─── Related industry inference ─────────────────────────────────────────────

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  'AI / Machine Learning': ['ai', 'artificial intelligence', 'machine learning', 'deep learning', 'neural', 'llm', 'gpt', 'model', 'inference'],
  'Cybersecurity': ['cyber', 'security', 'ransomware', 'breach', 'firewall', 'encryption', 'threat', 'malware'],
  'Defense & Military': ['defense', 'military', 'pentagon', 'dod', 'weapon', 'drone', 'missile', 'army', 'navy'],
  'Energy & Utilities': ['energy', 'solar', 'wind', 'battery', 'grid', 'renewable', 'nuclear', 'hydrogen', 'power', 'utility'],
  'Healthcare & Biotech': ['health', 'medical', 'pharma', 'biotech', 'clinical', 'patient', 'drug', 'hospital', 'diagnostic'],
  'Manufacturing': ['manufacturing', 'factory', 'robotics', 'automation', 'cnc', 'industrial', '3d printing', 'assembly'],
  'Logistics & Supply Chain': ['logistics', 'shipping', 'freight', 'warehouse', 'supply chain', 'delivery', 'trucking', 'port'],
  'Fintech & Banking': ['fintech', 'banking', 'payment', 'crypto', 'blockchain', 'insurance', 'trading', 'lending'],
  'Construction & Real Estate': ['construction', 'building', 'infrastructure', 'concrete', 'architecture', 'real estate', 'property'],
  'Agriculture & Food': ['agriculture', 'farming', 'crop', 'irrigation', 'food', 'agritech', 'soil', 'livestock'],
  'Aerospace & Space': ['aerospace', 'space', 'satellite', 'rocket', 'orbit', 'nasa', 'launch', 'aviation'],
  'Water Technology': ['water', 'desalination', 'wastewater', 'filtration', 'aquifer', 'treatment', 'purification'],
  'Automotive & EV': ['automotive', 'electric vehicle', 'ev', 'self-driving', 'autonomous vehicle', 'lidar', 'tesla'],
  'Telecom & 5G': ['telecom', '5g', 'spectrum', 'wireless', 'fiber', 'broadband', 'network', '6g'],
  'Retail & E-commerce': ['retail', 'ecommerce', 'consumer', 'shopping', 'marketplace', 'brand', 'omnichannel'],
  'Education & EdTech': ['education', 'edtech', 'university', 'training', 'learning', 'school', 'curriculum'],
  'Cleaning & Facilities': ['cleaning', 'janitorial', 'facility', 'sanitation', 'hygiene', 'maintenance', 'custodial'],
  'Robotics & Automation': ['robot', 'cobot', 'automated', 'servo', 'actuator', 'manipulator', 'autonomous'],
  'Quantum Computing': ['quantum', 'qubit', 'quantum computing', 'quantum error', 'superposition'],
  'Climate & Environment': ['climate', 'carbon', 'emission', 'sustainability', 'green', 'environment', 'esg'],
};

function inferRelatedIndustries(articles: LiveArticle[], query: string): string[] {
  const allText = articles.map(a => `${a.title} ${a.description}`).join(' ').toLowerCase();
  const combinedText = `${allText} ${query.toLowerCase()}`;

  const scores: Array<{ industry: string; score: number }> = [];
  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
      const matches = combinedText.match(regex);
      if (matches) score += matches.length;
    }
    if (score > 0) scores.push({ industry, score });
  }

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.industry);
}

// ─── Related searches generation ────────────────────────────────────────────

function generateRelatedSearches(query: string, companies: ExtractedCompany[], industries: string[]): string[] {
  const suggestions: string[] = [];
  const base = query.toLowerCase().trim();

  // Industry-based suggestions
  for (const ind of industries.slice(0, 2)) {
    suggestions.push(`${base} in ${ind.toLowerCase()}`);
  }

  // Company-based suggestions
  for (const c of companies.slice(0, 3)) {
    suggestions.push(c.name);
  }

  // Angle-based suggestions
  suggestions.push(`${base} startups`);
  suggestions.push(`${base} patents`);
  suggestions.push(`${base} market size`);
  suggestions.push(`${base} El Paso`);

  return suggestions.slice(0, 8);
}

// ─── Geographic breakdown from articles ─────────────────────────────────────

function buildGeographicBreakdown(articles: LiveArticle[]): GeographicBreakdown[] {
  const countryMap = new Map<string, number>();
  for (const a of articles) {
    const country = a.region || 'Global';
    countryMap.set(country, (countryMap.get(country) ?? 0) + 1);
  }
  const total = articles.length || 1;
  return Array.from(countryMap.entries() as Iterable<[string, number]>)
    .map(([country, count]) => ({
      country,
      articleCount: count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.articleCount - a.articleCount)
    .slice(0, 10);
}

// ─── Market data extraction ─────────────────────────────────────────────────

function extractMarketData(articles: LiveArticle[]): MarketDataPoint[] {
  const data: MarketDataPoint[] = [];
  for (const a of articles) {
    const text = `${a.title}. ${a.description}`;

    // Market size
    const sizeMatch = text.match(/market\s+(?:size|value|worth)[^$]*\$([\d,.]+\s*(?:billion|million|B|M))/i);
    if (sizeMatch) {
      data.push({ metric: 'Market Size', value: `$${sizeMatch[1]}`, source: a.source });
    }

    // CAGR
    const cagrMatch = text.match(/CAGR\s*(?:of\s+)?([\d.]+%)/i);
    if (cagrMatch) {
      data.push({ metric: 'Growth Rate (CAGR)', value: cagrMatch[1], source: a.source });
    }

    // Revenue
    const revMatch = text.match(/revenue\s+(?:of\s+|reached?\s+)?\$([\d,.]+\s*(?:billion|million|B|M))/i);
    if (revMatch) {
      data.push({ metric: 'Revenue', value: `$${revMatch[1]}`, source: a.source });
    }

    // Jobs
    const jobMatch = text.match(/([\d,]+)\s+(?:jobs?|positions?|employees?|workers?)/i);
    if (jobMatch) {
      data.push({ metric: 'Jobs/Workforce', value: jobMatch[1], source: a.source });
    }
  }

  // Deduplicate by metric
  const seen = new Set<string>();
  return data.filter(d => {
    if (seen.has(d.metric)) return false;
    seen.add(d.metric);
    return true;
  }).slice(0, 8);
}

// ─── Deduplication via title similarity ─────────────────────────────────────

function deduplicateArticles(articles: LiveArticle[]): LiveArticle[] {
  const result: LiveArticle[] = [];
  const seenFingerprints = new Set<string>();

  for (const article of articles) {
    // Create a fingerprint from first 6 significant words
    const words = article.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
    const fingerprint = words.slice(0, 6).sort().join('|');

    if (!seenFingerprints.has(fingerprint)) {
      seenFingerprints.add(fingerprint);
      result.push(article);
    }
  }

  return result;
}

// ─── DuckDuckGo Instant Answer ────────────────────────────────────────────────

async function fetchDuckDuckGo(query: string): Promise<{ description: string; image: string | null } | null> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetchWithRetry(url, { headers: { 'User-Agent': 'NxtLink/1.0' } }, {
      retries: 1, cacheTtlMs: 10 * 60 * 1000, cacheKey: `ddg:${query}`,
    });
    if (!res.ok) return null;
    const data = await res.json() as { AbstractText?: string; Image?: string };
    if (!data.AbstractText) return null;
    return {
      description: data.AbstractText,
      image: data.Image ? `https://duckduckgo.com${data.Image}` : null,
    };
  } catch {
    return null;
  }
}

// ─── Generate "What It Is" summary ──────────────────────────────────────────

function generateSummary(
  query: string,
  articles: LiveArticle[],
  companies: ExtractedCompany[],
  relatedIndustries: string[],
  marketData: MarketDataPoint[],
  papers: ResearchPaper[],
  patents: PatentResult[],
  wiki: WikipediaSummary | null,
): string {
  const parts: string[] = [];

  // Wikipedia gives us the REAL explanation — use it first
  if (wiki && wiki.extract) {
    // Take first 2 sentences from Wikipedia
    const sentences = wiki.extract.split(/(?<=[.!?])\s+/).filter(s => s.length > 10);
    const intro = sentences.slice(0, 2).join(' ');
    parts.push(intro);
  } else if (articles.length >= 20) {
    parts.push(`"${query}" is a highly active area with ${articles.length} recent intelligence signals across ${relatedIndustries.length} related sectors.`);
  } else if (articles.length >= 5) {
    parts.push(`Based on ${articles.length} live sources, "${query}" is an active area in ${relatedIndustries[0] ?? 'the technology landscape'}.`);
  } else {
    parts.push(`"${query}" is an emerging area that NXT LINK is tracking across global intelligence sources.`);
  }

  // Market data
  const sizeData = marketData.find(d => d.metric === 'Market Size');
  if (sizeData) {
    parts.push(`The market is valued at ${sizeData.value}.`);
  }
  const growthData = marketData.find(d => d.metric === 'Growth Rate (CAGR)');
  if (growthData) {
    parts.push(`Growing at ${growthData.value} CAGR.`);
  }

  // Companies
  const topCompanies = companies.slice(0, 5).map(c => c.name);
  if (topCompanies.length > 0) {
    parts.push(`Key players include ${topCompanies.join(', ')}.`);
  }

  // Research & Patents
  if (papers.length > 0) {
    parts.push(`${papers.length} recent academic papers found.`);
  }
  if (patents.length > 0) {
    parts.push(`${patents.length} related patents on file.`);
  }

  return parts.join(' ');
}

// ─── Extract key trends ─────────────────────────────────────────────────────

function extractKeyTrends(articles: LiveArticle[]): string[] {
  if (articles.length === 0) return [];
  return articles
    .filter(a => a.credibilityTier <= 3) // Only from credible sources
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 7)
    .map(a => a.title.length > 120 ? a.title.slice(0, 117) + '...' : a.title);
}

// ─── Score article relevance ────────────────────────────────────────────────

function scoreRelevance(article: { title: string; description: string }, keywords: string[]): number {
  const titleLower = article.title.toLowerCase();
  const descLower = article.description.toLowerCase();
  let score = 0;

  for (const kw of keywords) {
    if (titleLower.includes(kw)) score += 3;
    if (descLower.includes(kw)) score += 1;
  }

  // Bonus for exact phrase match
  const fullQuery = keywords.join(' ');
  if (titleLower.includes(fullQuery)) score += 5;

  return Math.min(score / (keywords.length * 4 + 5), 1);
}

// ─── PatentsView API ────────────────────────────────────────────────────────

async function fetchPatents(query: string): Promise<PatentResult[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    const body = JSON.stringify({
      q: { _text_any: { patent_title: query } },
      f: ['patent_title', 'patent_date', 'patent_number', 'assignees'],
      o: { per_page: 15, matched_subentities_only: true },
      s: [{ patent_date: 'desc' }],
    });

    const res = await fetch('https://search.patentsview.org/api/v1/patent/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'NxtLink/1.0' },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return [];

    const data = await res.json() as {
      patents?: Array<{
        patent_title: string;
        patent_date: string;
        patent_number: string;
        assignees?: Array<{ assignee_organization?: string }>;
      }>;
    };

    return (data.patents ?? []).map(p => ({
      title: p.patent_title ?? '',
      assignee: p.assignees?.[0]?.assignee_organization ?? 'Unknown',
      date: p.patent_date ?? '',
      patentNumber: p.patent_number ?? '',
      url: `https://patents.google.com/patent/US${p.patent_number}`,
    }));
  } catch {
    return [];
  }
}

// ─── Grants.gov API ─────────────────────────────────────────────────────────

async function fetchGrants(query: string): Promise<GrantResult[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch('https://api.grants.gov/v1/api/search2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: query,
        oppStatuses: 'posted',
        rows: 10,
        sortBy: 'openDate|desc',
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return [];

    const data = await res.json() as {
      oppHits?: Array<{
        title?: string;
        agencyName?: string;
        awardCeiling?: string;
        closeDate?: string;
        id?: string;
      }>;
    };

    return (data.oppHits ?? []).map(g => ({
      title: g.title ?? '',
      agency: g.agencyName ?? '',
      amount: g.awardCeiling ? `$${Number(g.awardCeiling).toLocaleString()}` : 'Varies',
      deadline: g.closeDate ?? '',
      url: g.id ? `https://www.grants.gov/search-results-detail/${g.id}` : '',
    }));
  } catch {
    return [];
  }
}

// ─── OpenAlex keyword search ────────────────────────────────────────────────

async function fetchResearchPapers(query: string): Promise<ResearchPaper[]> {
  try {
    const works = await fetchOpenAlexWorks(
      `default.search:${encodeURIComponent(query)},publication_year:2024|2025|2026`,
      15,
    );
    return works.map(w => ({
      title: w.title,
      authors: w.authors.slice(0, 3),
      source: w.source,
      year: w.publishedYear,
      citations: w.citationCount,
      url: w.url,
      abstract: w.abstract.slice(0, 200),
    }));
  } catch {
    return [];
  }
}

// ─── Overall sentiment calculation ──────────────────────────────────────────

function calculateOverallSentiment(articles: LiveArticle[]): LiveSearchResult['sentiment'] {
  let pos = 0;
  let neg = 0;
  let neut = 0;
  for (const a of articles) {
    if (a.sentiment === 'positive') pos++;
    else if (a.sentiment === 'negative') neg++;
    else neut++;
  }
  const total = articles.length || 1;
  const posPct = Math.round((pos / total) * 100);
  const negPct = Math.round((neg / total) * 100);
  const neutPct = Math.round((neut / total) * 100);

  let overall: LiveSearchResult['sentiment']['overall'] = 'neutral';
  if (posPct >= 50) overall = 'positive';
  else if (negPct >= 40) overall = 'negative';
  else if (posPct >= 25 && negPct >= 25) overall = 'mixed';

  return { overall, positive_pct: posPct, negative_pct: negPct, neutral_pct: neutPct };
}

// ─── Freshness helpers ──────────────────────────────────────────────────────

function findFreshest(articles: LiveArticle[]): string {
  if (articles.length === 0) return '';
  const sorted = [...articles].sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  return sorted[0].publishedAt;
}

function findOldest(articles: LiveArticle[]): string {
  if (articles.length === 0) return '';
  const sorted = [...articles].sort((a, b) =>
    new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  );
  return sorted[0].publishedAt;
}

// ─── Wikipedia API (free, no key, instant industry explanation) ──────────────

async function fetchWikipedia(query: string): Promise<WikipediaSummary | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6_000);

    // Step 1: Search for the best matching article
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, { signal: controller.signal });
    if (!searchRes.ok) { clearTimeout(timer); return null; }
    const searchData = await searchRes.json() as {
      query?: { search?: Array<{ title: string }> };
    };
    const pageTitle = searchData.query?.search?.[0]?.title;
    if (!pageTitle) { clearTimeout(timer); return null; }

    // Step 2: Get the summary via REST API
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
    const summaryRes = await fetch(summaryUrl, {
      headers: { 'User-Agent': 'NxtLink/1.0 (nxtlink@example.com)' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!summaryRes.ok) return null;

    const data = await summaryRes.json() as {
      title?: string;
      extract?: string;
      description?: string;
      thumbnail?: { source?: string };
      content_urls?: { desktop?: { page?: string } };
    };

    if (!data.extract || data.extract.length < 50) return null;

    return {
      title: data.title ?? pageTitle,
      extract: data.extract,
      description: data.description ?? '',
      thumbnail: data.thumbnail?.source ?? '',
      url: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
    };
  } catch {
    return null;
  }
}

// ─── SAM.gov API (federal contracts, free, no key) ──────────────────────────

async function fetchFederalContracts(query: string): Promise<FederalContract[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    const params = new URLSearchParams({
      api_key: 'DEMO_KEY',
      q: query,
      limit: '10',
      postedFrom: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });
    const res = await fetch(`https://api.sam.gov/opportunities/v2/search?${params}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NxtLink/1.0' },
    });
    clearTimeout(timer);

    if (!res.ok) return [];

    const data = await res.json() as {
      opportunitiesData?: Array<{
        title?: string;
        department?: string;
        award?: { amount?: string; awardee?: { name?: string } };
        postedDate?: string;
        uiLink?: string;
      }>;
    };

    return (data.opportunitiesData ?? []).slice(0, 10).map(c => ({
      title: c.title ?? '',
      agency: c.department ?? '',
      amount: c.award?.amount ? `$${Number(c.award.amount).toLocaleString()}` : 'TBD',
      vendor: c.award?.awardee?.name ?? '',
      date: c.postedDate ?? '',
      url: c.uiLink ?? '',
    }));
  } catch {
    return [];
  }
}

// ─── Hacker News search (Algolia API, free, no key) ─────────────────────────

async function fetchHackerNews(query: string): Promise<ParsedItem[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);

    const res = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=10`,
      { signal: controller.signal },
    );
    clearTimeout(timer);
    if (!res.ok) return [];

    const data = await res.json() as {
      hits?: Array<{
        title?: string;
        url?: string;
        points?: number;
        created_at?: string;
        objectID?: string;
      }>;
    };

    return (data.hits ?? [])
      .filter(h => h.title && h.url)
      .map(h => ({
        title: h.title ?? '',
        link: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
        description: `${h.points ?? 0} points on Hacker News`,
        pubDate: h.created_at ?? '',
        source: 'Hacker News',
      }));
  } catch {
    return [];
  }
}

// ─── PubMed search (NCBI E-utilities, free, no key needed for low volume) ───

async function fetchPubMed(query: string): Promise<ResearchPaper[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    // Step 1: Search for IDs
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=8&sort=date&retmode=json`;
    const searchRes = await fetch(searchUrl, { signal: controller.signal });
    if (!searchRes.ok) { clearTimeout(timer); return []; }

    const searchData = await searchRes.json() as {
      esearchresult?: { idlist?: string[] };
    };
    const ids = searchData.esearchresult?.idlist;
    if (!ids || ids.length === 0) { clearTimeout(timer); return []; }

    // Step 2: Fetch summaries
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
    const summaryRes = await fetch(summaryUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!summaryRes.ok) return [];

    const summaryData = await summaryRes.json() as {
      result?: Record<string, {
        title?: string;
        sortfirstauthor?: string;
        source?: string;
        pubdate?: string;
        uid?: string;
      }>;
    };

    if (!summaryData.result) return [];

    return ids
      .filter(id => summaryData.result?.[id]?.title)
      .map(id => {
        const r = summaryData.result![id];
        return {
          title: r.title ?? '',
          authors: [r.sortfirstauthor ?? 'Unknown'],
          source: r.source ?? 'PubMed',
          year: r.pubdate ? parseInt(r.pubdate.slice(0, 4)) || 2025 : 2025,
          citations: 0,
          url: `https://pubmed.ncbi.nlm.nih.gov/${r.uid}/`,
          abstract: '',
        };
      });
  } catch {
    return [];
  }
}

// ─── Main: Live search ──────────────────────────────────────────────────────

export async function liveSearch(query: string): Promise<LiveSearchResult> {
  const startMs = Date.now();
  const cacheKey = query.toLowerCase().trim();

  const cached = getCached(cacheKey);
  if (cached) return cached;

  const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
  const queryVariants = expandQuery(query);

  // ── Step 1: Discover source URLs ──
  const discoveredPromise = discoverSources({
    keyword: query,
    maxSources: 15,
    includeGoogleNews: true,
    includeDomainScan: true,
  });

  // ── Step 2: Build feed URLs ──
  const gnFeeds = queryVariants.map(q => ({
    url: gnUrl(q),
    name: `Google News: ${q.slice(0, 40)}`,
  }));

  // ── Step 3: Parallel fetch — ALL sources at once ──
  const [
    discovered,
    gdeltArticles,
    patentResults,
    researchResults,
    grantResults,
    contractResults,
    wikiResult,
    hnResults,
    pubmedResults,
    ddgData,
  ] = await Promise.all([
    discoveredPromise,
    fetchGdeltEvents(query, 40).catch(() => [] as GdeltArticle[]),
    fetchPatents(query).catch(() => [] as PatentResult[]),
    fetchResearchPapers(query).catch(() => [] as ResearchPaper[]),
    fetchGrants(query).catch(() => [] as GrantResult[]),
    fetchFederalContracts(query).catch(() => [] as FederalContract[]),
    fetchWikipedia(query).catch(() => null as WikipediaSummary | null),
    fetchHackerNews(query).catch(() => [] as ParsedItem[]),
    fetchPubMed(query).catch(() => [] as ResearchPaper[]),
    fetchDuckDuckGo(query).catch(() => null as { description: string; image: string | null } | null),
  ]);

  // Merge OpenAlex + PubMed research results
  const allResearch = [...researchResults, ...pubmedResults];

  // Add discovered source URLs to feed list
  const discoveredFeeds = discovered.sources.slice(0, 10).map(s => ({
    url: s.url,
    name: s.name,
  }));
  const allFeeds = [...gnFeeds, ...discoveredFeeds];

  // Fetch all RSS feeds in parallel
  const feedResults = await Promise.allSettled(
    allFeeds.map(f => fetchFeed(f.url, f.name))
  );

  // ── Step 4: Collect all articles ──
  const allArticles: LiveArticle[] = [];
  const seenUrls = new Set<string>();
  let sourcesChecked = 0;

  for (const result of feedResults) {
    sourcesChecked++;
    if (result.status !== 'fulfilled') continue;
    for (const item of result.value) {
      if (seenUrls.has(item.link)) continue;
      seenUrls.add(item.link);
      const sent = analyzeSentiment(`${item.title} ${item.description}`);
      allArticles.push({
        title: item.title,
        url: item.link,
        source: item.source,
        description: item.description,
        publishedAt: item.pubDate || new Date().toISOString(),
        relevanceScore: scoreRelevance(item, keywords),
        credibilityTier: getCredibilityTier(item.source),
        sentiment: sent,
        region: 'Global',
      });
    }
  }

  // Hacker News articles (high-quality tech community)
  sourcesChecked++;
  for (const item of hnResults) {
    if (seenUrls.has(item.link)) continue;
    seenUrls.add(item.link);
    allArticles.push({
      title: item.title,
      url: item.link,
      source: 'Hacker News',
      description: item.description,
      publishedAt: item.pubDate || new Date().toISOString(),
      relevanceScore: scoreRelevance(item, keywords),
      credibilityTier: 2, // HN is curated, high quality
      sentiment: analyzeSentiment(item.title),
      region: 'Global',
    });
  }

  // GDELT articles (with country data!)
  sourcesChecked++;
  for (const g of gdeltArticles) {
    if (seenUrls.has(g.url)) continue;
    seenUrls.add(g.url);
    allArticles.push({
      title: g.title,
      url: g.url,
      source: g.source,
      description: '',
      publishedAt: g.publishedAt || new Date().toISOString(),
      relevanceScore: scoreRelevance({ title: g.title, description: '' }, keywords),
      credibilityTier: getCredibilityTier(g.source),
      sentiment: analyzeSentiment(g.title),
      region: g.country || 'Global',
    });
  }

  // ── Step 5: Sort, deduplicate, keep top ──
  allArticles.sort((a, b) => {
    // Weight by relevance + credibility
    const scoreA = a.relevanceScore * (5 - a.credibilityTier);
    const scoreB = b.relevanceScore * (5 - b.credibilityTier);
    return scoreB - scoreA;
  });

  const dedupedArticles = deduplicateArticles(allArticles);
  const topArticles = dedupedArticles.slice(0, 60);

  // ── Step 6: Extract ALL intelligence ──
  const companies = extractCompaniesFromText(topArticles);
  const priceSignals = extractPriceSignals(topArticles);
  const marketSizes = extractMarketSizes(topArticles);
  const growthRates = extractGrowthRates(topArticles);
  const fundingEvents = extractFundingEvents(topArticles);
  const hiringSignals = extractHiringSignals(topArticles);
  const regulatorySignals = extractRegulatorySignals(topArticles);
  const riskSignals = extractRiskSignals(topArticles);
  const relatedIndustries = inferRelatedIndustries(topArticles, query);
  const relatedSearches = generateRelatedSearches(query, companies, relatedIndustries);
  const keyTrends = extractKeyTrends(topArticles);
  const marketData = extractMarketData(topArticles);
  const geography = buildGeographicBreakdown(topArticles);
  const sentiment = calculateOverallSentiment(topArticles);

  const summary = generateSummary(query, topArticles, companies, relatedIndustries, marketData, allResearch, patentResults, wikiResult);

  // Top sources by frequency
  const sourceCounts = new Map<string, number>();
  for (const a of topArticles) {
    sourceCounts.set(a.source, (sourceCounts.get(a.source) ?? 0) + 1);
  }
  const topSources = Array.from(sourceCounts.entries() as Iterable<[string, number]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name]) => name);

  const result: LiveSearchResult = {
    articles: topArticles.slice(0, 25),
    companies,
    patents: patentResults,
    research: allResearch,
    grants: grantResults,
    contracts: contractResults,
    funding: fundingEvents,
    market_data: marketData,
    geography,
    wikipedia: wikiResult,
    image_url: ddgData?.image ?? wikiResult?.thumbnail ?? null,
    summary: {
      total_sources_checked: sourcesChecked,
      total_articles_found: allArticles.length,
      total_patents_found: patentResults.length,
      total_papers_found: allResearch.length,
      total_grants_found: grantResults.length,
      total_contracts_found: contractResults.length,
      top_sources: topSources,
      keywords_used: keywords,
      freshest_article: findFreshest(topArticles),
      oldest_article: findOldest(topArticles),
    },
    sentiment,
    inferred: {
      what_it_is: summary,
      key_trends: keyTrends,
      price_signals: priceSignals,
      market_sizes: marketSizes,
      growth_rates: growthRates,
      related_industries: relatedIndustries,
      related_searches: relatedSearches,
      hiring_signals: hiringSignals,
      regulatory_signals: regulatorySignals,
      risk_signals: riskSignals,
    },
    duration_ms: Date.now() - startMs,
  };

  setCache(cacheKey, result);
  return result;
}
