import { URL } from 'node:url';

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';
import { normalizePublicHttpUrl } from '@/lib/http/url-safety';
import {
  isBlockedSourceDomain,
  isLowTrustDomain,
  sourceDomainCredibility,
  sourceTrustScore,
  topicalRelevanceScore,
  type SourceTrustType,
} from '@/lib/intelligence/source-quality';
import {
  classifyOntology,
  type OntologyClassification,
} from '@/lib/intelligence/ontology';

export type IndustrySourceType =
  | 'whitepaper'
  | 'case_study'
  | 'company'
  | 'funding'
  | 'news'
  | 'other';

type DiscoveredSource = {
  title: string;
  link: string;
  snippet: string;
  query: string;
  source_type: IndustrySourceType;
};

type RankedDiscoveredSource = DiscoveredSource & {
  relevance_score: number;
  domain_score: number;
  trust_score: number;
};

type ScrapedSource = {
  title: string;
  link: string;
  text: string;
  fetched: boolean;
  snippet: string;
  source_type: IndustrySourceType;
};

export type IndustryAreaScore = {
  area: string;
  score: number;
};

export type CountryMention = {
  country: string;
  mentions: number;
};

export type IndustryProduct = {
  company_name: string;
  company_url: string;
  source_title: string;
  source_type: IndustrySourceType;
  source_snippet: string;
  product_summary: string;
  problems_solved: string[];
  industry_areas: string[];
  countries: string[];
  confidence: number;
  classification: OntologyClassification;
};

export type FundingSignal = {
  company_name: string;
  signal: string;
  stage: string | null;
  amount: string | null;
};

export type IndustryScanResult = {
  industry: string;
  region: string;
  scanned_at: string;
  queries: string[];
  sources_discovered: number;
  sources_scraped: number;
  source_breakdown: Array<{ source_type: IndustrySourceType; count: number }>;
  industry_areas: IndustryAreaScore[];
  countries: CountryMention[];
  products: IndustryProduct[];
  funding_signals: FundingSignal[];
  quality_gate: {
    score: number;
    status: 'pass' | 'warning' | 'fail';
    reasons: string[];
  };
  executive_summary: string;
};

type IndustryScanInput = {
  industry: string;
  region: string;
  maxSources: number;
};

const AREA_KEYWORDS: Record<string, string[]> = {
  'Route Optimization': ['route', 'dispatch', 'fleet', 'delivery', 'routing', 'miles'],
  'Supply Chain Visibility': ['visibility', 'tracking', 'traceability', 'shipment', 'logistics'],
  'AI Analytics': ['analytics', 'ai', 'machine learning', 'forecast', 'intelligence'],
  'Workflow Automation': ['automation', 'workflow', 'manual', 'orchestration', 'process'],
  'Predictive Maintenance': ['maintenance', 'downtime', 'repair', 'asset', 'predictive'],
  'Energy Management': ['energy', 'electricity', 'power', 'grid', 'demand'],
  'Water Management': ['water', 'leak', 'filtration', 'wastewater', 'gallons'],
  Cybersecurity: ['security', 'cyber', 'threat', 'vulnerability', 'identity'],
};

const COUNTRY_KEYWORDS = [
  'United States',
  'Canada',
  'Mexico',
  'Brazil',
  'United Kingdom',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Netherlands',
  'Sweden',
  'Norway',
  'Poland',
  'Turkey',
  'India',
  'China',
  'Japan',
  'South Korea',
  'Singapore',
  'Australia',
  'New Zealand',
  'United Arab Emirates',
  'Saudi Arabia',
  'South Africa',
  'Nigeria',
  'Kenya',
] as const;

const SOURCE_KEYWORDS: Record<IndustrySourceType, string[]> = {
  whitepaper: ['white paper', 'whitepaper', 'research report', 'technical report', '.pdf'],
  case_study: ['case study', 'customer story', 'success story', 'use case', 'implementation'],
  company: ['company', 'product', 'solution', 'platform', 'software', 'about us'],
  funding: ['funding', 'raised', 'series', 'seed', 'venture', 'investment'],
  news: ['news', 'press release', 'announcement', 'article'],
  other: [],
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(value: string): string[] {
  return value
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function domainToCompany(urlValue: string): string {
  try {
    const host = new URL(urlValue).hostname.replace(/^www\./, '');
    const base = host.split('.')[0].replace(/[-_]/g, ' ');
    return base
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch {
    return 'Unknown Company';
  }
}

function cleanTitle(value: string): string {
  return decodeHtmlEntities(stripHtml(value)).trim();
}

function parseTagFromItem(item: string, tag: 'title' | 'link' | 'description'): string {
  const match = item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match?.[1]?.trim() || '';
}

function normalizeIndustryText(value: string): string {
  return decodeHtmlEntities(stripHtml(value)).toLowerCase();
}

function sourceTextForClassification(input: {
  title?: string;
  link?: string;
  snippet?: string;
  query?: string;
}): string {
  return normalizeIndustryText(
    [input.title || '', input.link || '', input.snippet || ''].join(' '),
  );
}

function matchesSourceTypeKeyword(sourceType: IndustrySourceType, text: string): boolean {
  if (sourceType === 'other') return false;
  return SOURCE_KEYWORDS[sourceType].some((keyword) => text.includes(keyword));
}

function urlTypeHint(urlValue: string): IndustrySourceType | null {
  const normalized = normalizeText(urlValue);
  if (/\.pdf($|\?)/.test(normalized) || /arxiv|research|journal|whitepaper|report/.test(normalized)) {
    return 'whitepaper';
  }
  if (/case-study|case_study|customer-story|success-story|use-case/.test(normalized)) {
    return 'case_study';
  }
  if (/funding|investor|venture|series|seed|acquire|acquisition|press-release/.test(normalized)) {
    return 'funding';
  }
  if (/\/news\/|\/blog\/|article|announcement/.test(normalized)) {
    return 'news';
  }
  if (/\/product|\/platform|\/solutions|\/company|\/about/.test(normalized)) {
    return 'company';
  }
  return null;
}

export function classifySourceType(input: {
  title?: string;
  link?: string;
  snippet?: string;
  query?: string;
  hint?: IndustrySourceType;
}): IndustrySourceType {
  const normalized = sourceTextForClassification(input);
  if (isBlockedSourceDomain(input.link)) {
    return 'other';
  }
  if (isLowTrustDomain(input.link)) {
    return 'other';
  }

  const hintedFromUrl = input.link ? urlTypeHint(input.link) : null;
  if (hintedFromUrl) {
    return hintedFromUrl;
  }

  const ordered: IndustrySourceType[] = ['whitepaper', 'case_study', 'funding', 'company', 'news'];

  for (const sourceType of ordered) {
    const matched = SOURCE_KEYWORDS[sourceType].some((keyword) =>
      normalized.includes(keyword),
    );
    if (matched) {
      return sourceType;
    }
  }

  if (input.hint) {
    const hintValid =
      input.hint === 'whitepaper'
        ? /\.pdf|research|journal|working paper|technical report|arxiv/.test(normalized)
        : input.hint === 'case_study'
          ? /case study|customer story|use case|success story|implementation/.test(normalized)
          : matchesSourceTypeKeyword(input.hint, normalized);
    return hintValid ? input.hint : 'other';
  }

  return 'other';
}

export function parseBingRssXml(
  xml: string,
  query = '',
  hint?: IndustrySourceType,
): DiscoveredSource[] {
  const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi));
  return items
    .map((match) => {
      const block = match[1];
      const title = cleanTitle(parseTagFromItem(block, 'title'));
      const link = decodeHtmlEntities(parseTagFromItem(block, 'link'));
      const snippet = cleanTitle(parseTagFromItem(block, 'description'));
      const sourceType = classifySourceType({ title, link, snippet, query, hint });
      return { title, link, snippet, query, source_type: sourceType };
    })
    .filter((item) => item.title && item.link.startsWith('http') && !isBlockedSourceDomain(item.link));
}

function detectIndustryAreas(text: string): IndustryAreaScore[] {
  const normalized = normalizeText(text);
  const scores = Object.entries(AREA_KEYWORDS)
    .map(([area, keywords]) => {
      let uniqueHits = 0;
      const score = keywords.reduce((acc, keyword) => {
        const re = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        const hits = normalized.match(re)?.length || 0;
        if (hits > 0) uniqueHits += 1;
        return acc + hits;
      }, 0);
      return { area, score: Number((score + uniqueHits * 0.8).toFixed(2)), uniqueHits };
    })
    .filter((entry) => entry.uniqueHits >= 2 || entry.score >= 3)
    .map(({ area, score }) => ({ area, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (scores.length > 0) {
    return scores;
  }

  return [{ area: 'General Industry Technology', score: 1 }];
}

function detectCountryMentions(text: string): CountryMention[] {
  const normalized = normalizeText(text);
  const matches = COUNTRY_KEYWORDS.map((country) => {
    const re = new RegExp(`\\b${country.toLowerCase().replace(/\s+/g, '\\s+')}\\b`, 'gi');
    return {
      country,
      mentions: normalized.match(re)?.length || 0,
    };
  })
    .filter((item) => item.mentions > 0)
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 8);

  return matches.length > 0
    ? matches
    : [{ country: 'Global / Not specified', mentions: 1 }];
}

function extractProductSummary(text: string): string {
  const sentences = splitSentences(text);
  const keywords = ['platform', 'software', 'solution', 'product', 'service', 'tool'];

  const candidate = sentences.find((sentence) =>
    keywords.some((keyword) => sentence.toLowerCase().includes(keyword)),
  );
  if (candidate) {
    return candidate.slice(0, 260);
  }
  return (sentences[0] || 'No product summary found in source text.').slice(0, 260);
}

function isLowSignalText(text: string): boolean {
  const normalized = normalizeText(text);
  if (normalized.length < 120) return true;
  const badPhrases = [
    'skip to main content',
    'sign in',
    'log in',
    'create account',
    'accept cookies',
    'cookie policy',
    'javascript is disabled',
    'terms and conditions',
    'privacy policy',
  ];
  const hits = badPhrases.filter((phrase) => normalized.includes(phrase)).length;
  return hits >= 2;
}

function isReadableSignal(value: string): boolean {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length < 12 || text.length > 220) return false;
  const letters = text.replace(/[^a-zA-Z]/g, '').length;
  if (letters < 8) return false;
  const punctuationRatio = text.replace(/[a-zA-Z0-9 ]/g, '').length / text.length;
  if (punctuationRatio > 0.14) return false;
  return true;
}

export function extractProblemsSolved(text: string): string[] {
  const sentences = splitSentences(text);
  const solutionPattern =
    /(solve|solves|solving|address|addresses|reduces?|improves?|helps?|enables?|prevents?|automates?|optimizes?|cuts?|eliminates?|streamlines?|accelerates?)/i;
  const problemPattern =
    /(problem|challenge|bottleneck|cost|risk|delay|downtime|waste|fraud|error|congestion|visibility|manual)/i;

  const matched = sentences.filter(
    (sentence) => solutionPattern.test(sentence) || problemPattern.test(sentence),
  );

  const unique = new Set<string>();
  for (const sentence of matched) {
    const normalized = sentence.replace(/\s+/g, ' ').trim().slice(0, 220);
    if (!normalized) {
      continue;
    }
    unique.add(normalized);
    if (unique.size >= 3) {
      break;
    }
  }

  return Array.from(unique);
}

function extractFundingSignals(text: string, companyName: string): FundingSignal[] {
  const sentences = splitSentences(text);
  const fundingSentences = sentences.filter((sentence) =>
    /(raised|secured|funding|series|seed|venture|grant)/i.test(sentence),
  );

  return fundingSentences.slice(0, 2).map((sentence) => {
    const stageMatch = sentence.match(/series\s+[a-z]|pre-seed|seed|grant|debt|venture/i);
    const amountMatch = sentence.match(/\$?\d+(?:\.\d+)?\s?(?:m|b|k|million|billion|thousand)/i);

    return {
      company_name: companyName,
      signal: sentence.slice(0, 260),
      stage: stageMatch ? stageMatch[0].toUpperCase() : null,
      amount: amountMatch ? amountMatch[0] : null,
    };
  });
}

type QueryPlan = {
  query: string;
  source_type: IndustrySourceType;
};

const CURATED_SEED_SOURCES: Array<{
  matcher: RegExp;
  sources: Array<{ title: string; link: string; snippet: string; source_type: IndustrySourceType }>;
}> = [
  {
    matcher: /route optimization|fleet routing|dispatch optimization/i,
    sources: [
      {
        title: 'Onfleet Route Optimization',
        link: 'https://onfleet.com/route-optimization-software',
        snippet: 'Route optimization software for last-mile delivery operations.',
        source_type: 'company',
      },
      {
        title: 'OptimoRoute Planning Software',
        link: 'https://optimoroute.com/',
        snippet: 'Route planning and field service scheduling optimization platform.',
        source_type: 'company',
      },
      {
        title: 'Circuit Route Planner',
        link: 'https://getcircuit.com/route-planner',
        snippet: 'Delivery route planner for multi-stop fleet efficiency.',
        source_type: 'company',
      },
      {
        title: 'Samsara Dispatch and Routing',
        link: 'https://www.samsara.com/products/dispatch/',
        snippet: 'Dispatch and routing workflows for transportation fleets.',
        source_type: 'company',
      },
    ],
  },
  {
    matcher: /supply chain visibility|logistics visibility|shipment tracking/i,
    sources: [
      {
        title: 'project44 Visibility Platform',
        link: 'https://www.project44.com/platform/movement/',
        snippet: 'Supply chain visibility platform for multimodal tracking.',
        source_type: 'company',
      },
      {
        title: 'FourKites Real-time Visibility',
        link: 'https://www.fourkites.com/platform/',
        snippet: 'Real-time supply chain visibility and execution intelligence.',
        source_type: 'company',
      },
      {
        title: 'Gartner Supply Chain Visibility',
        link: 'https://www.gartner.com/en/supply-chain/topics/supply-chain-visibility',
        snippet: 'Analyst coverage and market intelligence for visibility solutions.',
        source_type: 'news',
      },
    ],
  },
];

function expandIndustrySearchTerm(industry: string): string {
  const normalized = normalizeText(industry);
  if (normalized.includes('route optimization')) {
    return '("route optimization" OR "fleet routing" OR "dispatch optimization")';
  }
  if (normalized.includes('supply chain visibility')) {
    return '("supply chain visibility" OR "shipment tracking" OR "logistics visibility")';
  }
  if (normalized.includes('predictive maintenance')) {
    return '("predictive maintenance" OR "asset reliability" OR "condition monitoring")';
  }
  if (normalized.includes('energy management')) {
    return '("energy management" OR "grid optimization" OR "energy analytics")';
  }
  if (normalized.includes('water management')) {
    return '("water management" OR "leak detection" OR "water analytics")';
  }
  return industry.includes(' ') ? `"${industry}"` : industry;
}

function curatedSeedSources(industry: string): DiscoveredSource[] {
  const matched = CURATED_SEED_SOURCES.find((entry) => entry.matcher.test(industry));
  if (!matched) return [];
  return matched.sources.map((source) => ({
    ...source,
    query: `${industry} curated source`,
  }));
}

function buildQueryPlan(industry: string, region: string): QueryPlan[] {
  const industryPhrase = expandIndustrySearchTerm(industry);
  const negatives = '-dictionary -definition -reddit -yellowpages -chamberofcommerce';
  return [
    {
      query: `${industryPhrase} ${region} white paper research report enterprise technology ${negatives}`,
      source_type: 'whitepaper',
    },
    {
      query: `${industryPhrase} ${region} case study customer success implementation ${negatives}`,
      source_type: 'case_study',
    },
    {
      query: `${industryPhrase} ${region} software company product platform vendor ${negatives}`,
      source_type: 'company',
    },
    {
      query: `${industryPhrase} ${region} startup funding venture market map ${negatives}`,
      source_type: 'funding',
    },
    {
      query: `${industryPhrase} ${region} industry news analysis report ${negatives}`,
      source_type: 'news',
    },
  ];
}

async function fetchBingRss(query: string, hint: IndustrySourceType): Promise<DiscoveredSource[]> {
  const rssUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&format=rss`;
  const response = await fetchWithRetry(rssUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NXTLinkIndustryScan/1.0)',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
    cache: 'no-store',
  }, {
    cacheTtlMs: 45_000,
    staleIfErrorMs: 8 * 60_000,
    dedupeInFlight: true,
  });

  if (!response.ok) {
    return [];
  }
  const xml = await response.text();
  return parseBingRssXml(xml, query, hint);
}

function extractPdfText(rawBuffer: Buffer): string {
  // Lightweight extraction fallback for PDFs without adding parser dependencies.
  const latinText = rawBuffer.toString('latin1');
  const matches = latinText.match(/[A-Za-z][A-Za-z0-9,.;:()\-/'"% ]{25,}/g);
  if (!matches || matches.length === 0) {
    return '';
  }
  return matches.join(' ').replace(/\s+/g, ' ').trim().slice(0, 20000);
}

async function scrapeSource(source: DiscoveredSource): Promise<ScrapedSource> {
  try {
    const safeUrl = await normalizePublicHttpUrl(source.link);
    const response = await fetchWithRetry(safeUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NXTLinkIndustryScan/1.0)',
        Accept: 'text/html,application/xhtml+xml,text/plain,application/pdf',
      },
      cache: 'no-store',
    }, {
      cacheTtlMs: 15 * 60_000,
      staleIfErrorMs: 2 * 60 * 60_000,
      dedupeInFlight: true,
    });

    if (!response.ok) {
      return {
        title: source.title,
        link: source.link,
        text: source.snippet,
        fetched: false,
        snippet: source.snippet,
        source_type: source.source_type,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    const isPdf =
      contentType.toLowerCase().includes('application/pdf') ||
      source.link.toLowerCase().endsWith('.pdf');

    let pageTitle = source.title;
    let text = source.snippet;

    if (isPdf) {
      const pdfText = extractPdfText(Buffer.from(await response.arrayBuffer()));
      text = pdfText || source.snippet;
    } else {
      const html = await response.text();
      const pageTitleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      pageTitle = pageTitleMatch ? cleanTitle(pageTitleMatch[1]) : source.title;
      text = stripHtml(html).slice(0, 20000);
    }

    if (text.length < 80) {
      return {
        title: pageTitle || source.title,
        link: source.link,
        text: source.snippet,
        fetched: false,
        snippet: source.snippet,
        source_type: source.source_type,
      };
    }

    if (isLowSignalText(text)) {
      return {
        title: pageTitle || source.title,
        link: source.link,
        text: source.snippet,
        fetched: false,
        snippet: source.snippet,
        source_type: source.source_type,
      };
    }

    return {
      title: pageTitle || source.title,
      link: source.link,
      text,
      fetched: true,
      snippet: source.snippet,
      source_type: source.source_type,
    };
  } catch {
    return {
      title: source.title,
      link: source.link,
      text: source.snippet,
      fetched: false,
      snippet: source.snippet,
      source_type: source.source_type,
    };
  }
}

function dedupeSources(sources: DiscoveredSource[]): DiscoveredSource[] {
  const seen = new Set<string>();
  const deduped: DiscoveredSource[] = [];

  for (const source of sources) {
    try {
      const parsed = new URL(source.link);
      const key = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      deduped.push(source);
    } catch {
      continue;
    }
  }

  return deduped;
}

function interleaveDiscoveredLists(lists: DiscoveredSource[][]): DiscoveredSource[] {
  const maxLength = Math.max(...lists.map((list) => list.length), 0);
  const result: DiscoveredSource[] = [];
  const listCount = lists.length;

  for (let row = 0; row < maxLength; row += 1) {
    for (let offset = 0; offset < listCount; offset += 1) {
      // Rotate lead list each row to avoid always preferring the first query channel.
      const listIndex = (offset + row) % listCount;
      const item = lists[listIndex]?.[row];
      if (item) {
        result.push(item);
      }
    }
  }

  return result;
}

function rankDiscoveredSource(
  source: DiscoveredSource,
  industry: string,
  region: string,
): RankedDiscoveredSource {
  const source_type = classifySourceType({
    title: source.title,
    link: source.link,
    snippet: source.snippet,
    query: source.query,
    hint: source.source_type,
  });
  const text = [source.title, source.snippet, source.query].filter(Boolean).join(' ');
  const relevance_score = topicalRelevanceScore(text, industry, region, [source_type.replace('_', ' ')]);
  const domain_score = sourceDomainCredibility(source.link, source_type as SourceTrustType);
  const trust_score = sourceTrustScore({
    url: source.link,
    source_type: source_type as SourceTrustType,
    text,
    industry,
    region,
    extra_terms: [source_type.replace('_', ' ')],
  });
  return {
    ...source,
    source_type,
    relevance_score,
    domain_score,
    trust_score,
  };
}

function inferCompanyName(title: string, urlValue: string): string {
  const fromTitle = title
    .split(/[|\-:]/)[0]
    ?.replace(/\b(white\s*paper|case\s*study|report|news|research)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (fromTitle && fromTitle.length >= 2 && fromTitle.length <= 80) {
    return fromTitle;
  }

  return domainToCompany(urlValue);
}

function buildExecutiveSummary(result: Omit<IndustryScanResult, 'executive_summary'>): string {
  const topArea = result.industry_areas[0]?.area || 'General Industry Technology';
  const topCountry = result.countries[0]?.country || 'Global';
  const topProduct = result.products[0]?.company_name || 'N/A';
  const topSourceType = result.source_breakdown[0]?.source_type || 'other';
  const gateStatus = result.quality_gate.status.toUpperCase();
  return `Scanned ${result.sources_scraped}/${result.sources_discovered} global sources for ${result.industry}. Quality gate: ${gateStatus}. Most common source type: ${topSourceType}. Top area: ${topArea}. Top country signal: ${topCountry}. Top product company match: ${topProduct}.`;
}

function synthesizeFallbackSummary(companyName: string, industry: string): string {
  return `${companyName} offers ${industry} capabilities based on source metadata and snippet evidence.`;
}

function buildQualityGate(input: {
  discovered: number;
  scraped: number;
  products: number;
  avgConfidence: number;
  sourceTypes: number;
}): IndustryScanResult['quality_gate'] {
  const scrapeCoverage = input.discovered > 0 ? input.scraped / input.discovered : 0;
  const productYield = input.scraped > 0 ? input.products / input.scraped : 0;
  const score = Number(
    Math.max(
      0,
      Math.min(
        1,
        scrapeCoverage * 0.35 +
          Math.min(1, productYield) * 0.25 +
          input.avgConfidence * 0.3 +
          Math.min(1, input.sourceTypes / 4) * 0.1,
      ),
    ).toFixed(2),
  );

  const reasons: string[] = [];
  if (scrapeCoverage < 0.45) reasons.push('Low scrape coverage');
  if (input.products < 2) reasons.push('Insufficient extracted products');
  if (input.avgConfidence < 0.55) reasons.push('Low average confidence');
  if (input.sourceTypes < 2) reasons.push('Low source diversity');

  const status = score >= 0.72 ? 'pass' : score >= 0.48 ? 'warning' : 'fail';
  return {
    score,
    status,
    reasons: reasons.length > 0 ? reasons : ['Evidence quality acceptable'],
  };
}

export async function runIndustryScan(input: IndustryScanInput): Promise<IndustryScanResult> {
  const queryPlan = buildQueryPlan(input.industry, input.region);
  const discoveredLists = await Promise.all(
    queryPlan.map((plan) => fetchBingRss(plan.query, plan.source_type)),
  );
  const queries = queryPlan.map((plan) => plan.query);
  const interleavedDiscovered = interleaveDiscoveredLists(discoveredLists);
  const rankedDiscovered = dedupeSources(interleavedDiscovered)
    .map((source) => rankDiscoveredSource(source, input.industry, input.region))
    .filter((source) => {
      if (isBlockedSourceDomain(source.link)) return false;
      if (source.relevance_score < 0.28) return false;
      if (source.domain_score < 0.3) return false;
      if (isLowTrustDomain(source.link) && source.relevance_score < 0.7) return false;
      return true;
    })
    .sort((a, b) => b.trust_score - a.trust_score);

  const fallbackCandidates = dedupeSources(interleavedDiscovered)
    .map((source) => rankDiscoveredSource(source, input.industry, input.region))
    .filter((source) => source.relevance_score >= 0.24 && !isLowTrustDomain(source.link) && !isBlockedSourceDomain(source.link))
    .sort((a, b) => b.trust_score - a.trust_score);

  const discoveredBase = (rankedDiscovered.length > 0 ? rankedDiscovered : fallbackCandidates).slice(
    0,
    input.maxSources,
  );
  const seedSources = curatedSeedSources(input.industry)
    .map((source) => rankDiscoveredSource(source, input.industry, input.region))
    .filter((source) => !isBlockedSourceDomain(source.link))
    .filter((source) => source.relevance_score >= 0.22)
    .sort((a, b) => b.trust_score - a.trust_score)
    .slice(0, 4);
  const discovered = Array.from(
    new Map(
      [...seedSources, ...discoveredBase].map((source) => [source.link.toLowerCase(), source]),
    ).values(),
  )
    .sort((a, b) => b.trust_score - a.trust_score)
    .slice(0, input.maxSources);

  const scraped = await Promise.all(
    discovered.map(async (source) => ({
      source,
      scraped: await scrapeSource(source),
    })),
  );

  const products: IndustryProduct[] = [];
  const fundingSignals: FundingSignal[] = [];
  const sourceBreakdown = new Map<IndustrySourceType, number>();
  const aggregateAreaScores = new Map<string, number>();
  const aggregateCountryScores = new Map<string, number>();

  for (const source of discovered) {
    sourceBreakdown.set(source.source_type, (sourceBreakdown.get(source.source_type) || 0) + 1);
  }

  for (const entry of scraped) {
    const source = entry.scraped;
    const discovery = entry.source;
    const sourceType = classifySourceType({
      title: source.title,
      link: source.link,
      snippet: source.snippet,
      hint: source.source_type,
    });
    if (sourceType === 'other') {
      continue;
    }

    const domainScore = sourceDomainCredibility(source.link, sourceType as SourceTrustType);
    const companyName = inferCompanyName(source.title, source.link);
    const areas = detectIndustryAreas(source.text);
    const countries = detectCountryMentions(source.text);
    const summary = extractProductSummary(source.text);
    const problemsSolved = extractProblemsSolved(source.text).filter((problem) => isReadableSignal(problem));
    const classification = classifyOntology(
      [
        source.title,
        summary,
        problemsSolved.join(' '),
        areas.map((area) => area.area).join(' '),
        countries.map((country) => country.country).join(' '),
      ].join(' '),
    );
    const topicalScore = topicalRelevanceScore(
      [source.title, source.text, source.snippet].join(' '),
      input.industry,
      input.region,
      areas.map((area) => area.area),
    );
    const trustScore = sourceTrustScore({
      url: source.link,
      source_type: sourceType as SourceTrustType,
      text: [source.title, source.text, source.snippet].join(' '),
      industry: input.industry,
      region: input.region,
      extra_terms: areas.map((area) => area.area),
    });

    if (topicalScore < 0.28) {
      continue;
    }
    if (isLowTrustDomain(source.link) && topicalScore < 0.72) {
      continue;
    }
    if (trustScore < 0.38) {
      continue;
    }
    if (!isReadableSignal(summary)) {
      continue;
    }

    areas.forEach((area) => {
      aggregateAreaScores.set(area.area, (aggregateAreaScores.get(area.area) || 0) + area.score);
    });
    countries.forEach((country) => {
      aggregateCountryScores.set(
        country.country,
        (aggregateCountryScores.get(country.country) || 0) + country.mentions,
      );
    });

    const sourceTypeBoost =
      sourceType === 'whitepaper' || sourceType === 'case_study' || sourceType === 'company'
        ? 0.12
        : sourceType === 'funding'
          ? 0.09
          : 0.06;
    const confidence = Math.min(
      0.91,
      Number(
        (
          0.18 +
          (source.fetched ? 0.17 : 0.03) +
          sourceTypeBoost +
          domainScore * 0.21 +
          topicalScore * 0.17 +
          discovery.relevance_score * 0.08 +
          discovery.domain_score * 0.08 +
          Math.min(0.12, areas.length * 0.03) +
          Math.min(0.08, countries.length * 0.02)
        ).toFixed(2),
      ),
    );

    products.push({
      company_name: companyName,
      company_url: source.link,
      source_title: source.title,
      source_type: sourceType,
      source_snippet: source.snippet.slice(0, 260),
      product_summary: summary,
      problems_solved:
        problemsSolved.length > 0
          ? problemsSolved
          : [
              `${companyName} appears to address ${areas[0]?.area.toLowerCase() || 'industry'} challenges according to the scanned source.`,
            ],
      industry_areas: areas.map((area) => area.area).slice(0, 3),
      countries: countries.map((country) => country.country).slice(0, 3),
      confidence,
      classification,
    });

    fundingSignals.push(...extractFundingSignals(source.text, companyName || domainToCompany(source.link)));
  }

  if (products.length < 2) {
    const seenUrls = new Set(products.map((product) => product.company_url.toLowerCase()));
    const fallbackCandidates = scraped
      .map((entry) => {
        const source = entry.scraped;
        const discovery = entry.source;
        const sourceType = classifySourceType({
          title: source.title,
          link: source.link,
          snippet: source.snippet,
          hint: source.source_type,
        });
        return { source, discovery, sourceType };
      })
      .filter((entry) => entry.sourceType !== 'other')
      .filter((entry) => !seenUrls.has(entry.source.link.toLowerCase()))
      .filter((entry) => !isBlockedSourceDomain(entry.source.link))
      .sort((a, b) => b.discovery.trust_score - a.discovery.trust_score)
      .slice(0, 6);

    for (const candidate of fallbackCandidates) {
      const companyName = inferCompanyName(candidate.source.title, candidate.source.link);
      const evidenceText = [candidate.source.snippet, candidate.source.text, candidate.source.title]
        .filter(Boolean)
        .join(' ');
      const areas = detectIndustryAreas(evidenceText);
      const countries = detectCountryMentions(evidenceText);
      const problemsSolved = extractProblemsSolved(evidenceText).filter((problem) =>
        isReadableSignal(problem),
      );
      const summary = isReadableSignal(extractProductSummary(evidenceText))
        ? extractProductSummary(evidenceText)
        : synthesizeFallbackSummary(companyName, input.industry);
      const classification = classifyOntology(
        [
          candidate.source.title,
          summary,
          problemsSolved.join(' '),
          areas.map((area) => area.area).join(' '),
          countries.map((country) => country.country).join(' '),
        ].join(' '),
      );

      areas.forEach((area) => {
        aggregateAreaScores.set(area.area, (aggregateAreaScores.get(area.area) || 0) + area.score);
      });
      countries.forEach((country) => {
        aggregateCountryScores.set(
          country.country,
          (aggregateCountryScores.get(country.country) || 0) + country.mentions,
        );
      });

      const confidence = Number(
        Math.min(0.72, 0.48 + candidate.discovery.relevance_score * 0.16 + candidate.discovery.domain_score * 0.12).toFixed(2),
      );

      products.push({
        company_name: companyName,
        company_url: candidate.source.link,
        source_title: candidate.source.title,
        source_type: candidate.sourceType,
        source_snippet: candidate.source.snippet.slice(0, 260),
        product_summary: summary,
        problems_solved:
          problemsSolved.length > 0
            ? problemsSolved.slice(0, 3)
            : [
                `${companyName} appears relevant to ${input.industry.toLowerCase()} problem solving based on available source evidence.`,
              ],
        industry_areas: areas.map((area) => area.area).slice(0, 3),
        countries: countries.map((country) => country.country).slice(0, 3),
        confidence,
        classification,
      });
      seenUrls.add(candidate.source.link.toLowerCase());

      if (products.length >= 3) {
        break;
      }
    }
  }

  const industryAreas = Array.from(aggregateAreaScores.entries())
    .map(([area, score]) => ({ area, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const countries = Array.from(aggregateCountryScores.entries())
    .map(([country, mentions]) => ({ country, mentions }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 10);

  const sourceBreakdownRows = Array.from(sourceBreakdown.entries())
    .map(([source_type, count]) => ({ source_type, count }))
    .sort((a, b) => b.count - a.count);

  const avgConfidence = products.length
    ? Number((products.reduce((sum, product) => sum + product.confidence, 0) / products.length).toFixed(2))
    : 0;
  const quality_gate = buildQualityGate({
    discovered: discovered.length,
    scraped: scraped.filter((entry) => entry.scraped.fetched).length,
    products: products.length,
    avgConfidence,
    sourceTypes: sourceBreakdownRows.length,
  });

  const resultBase: Omit<IndustryScanResult, 'executive_summary'> = {
    industry: input.industry,
    region: input.region,
    scanned_at: new Date().toISOString(),
    queries,
    sources_discovered: discovered.length,
    sources_scraped: scraped.filter((entry) => entry.scraped.fetched).length,
    source_breakdown:
      sourceBreakdownRows.length > 0 ? sourceBreakdownRows : [{ source_type: 'other', count: 0 }],
    industry_areas: industryAreas.length > 0 ? industryAreas : [{ area: 'General Industry Technology', score: 1 }],
    countries: countries.length > 0 ? countries : [{ country: 'Global / Not specified', mentions: 1 }],
    products: products
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 12),
    funding_signals: fundingSignals.slice(0, 12),
    quality_gate,
  };

  return {
    ...resultBase,
    executive_summary: buildExecutiveSummary(resultBase),
  };
}
