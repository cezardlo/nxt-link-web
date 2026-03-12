import { URL } from 'node:url';

export type SourceTrustType =
  | 'whitepaper'
  | 'case_study'
  | 'company'
  | 'funding'
  | 'news'
  | 'other';

export type SourceTier =
  | 'official'
  | 'institutional_research'
  | 'industry_vendor'
  | 'trade_press'
  | 'community'
  | 'unknown';

const TRUSTED_HOST_HINTS = [
  'arxiv.org',
  'nature.com',
  'science.org',
  'sciencedirect.com',
  'ieee.org',
  'nasa.gov',
  'who.int',
  'oecd.org',
  'worldbank.org',
  'mckinsey.com',
  'deloitte.com',
  'gartner.com',
  'ibm.com',
  'microsoft.com',
  'aws.amazon.com',
  'google.com',
  'cisco.com',
  'accenture.com',
  'mit.edu',
  'stanford.edu',
] as const;

const OFFICIAL_HOST_HINTS = [
  '.gov',
  '.mil',
  'europa.eu',
  'un.org',
  'who.int',
  'oecd.org',
  'worldbank.org',
] as const;

const TRADE_PRESS_HOST_HINTS = [
  'techcrunch.com',
  'bloomberg.com',
  'reuters.com',
  'wsj.com',
  'ft.com',
  'forbes.com',
  'theverge.com',
  'wired.com',
] as const;

const LOW_TRUST_HOST_HINTS = [
  'reddit.com',
  'pinterest.com',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'dictionary.com',
  'merriam-webster.com',
  'collinsdictionary.com',
  'cambridge.org',
  'cambridge.com',
  'wiktionary.org',
] as const;

const BLOCKED_HOST_HINTS = [
  'yellowpages.com',
  'chamberofcommerce.com',
  'mapquest.com',
  'tripadvisor.com',
  'yelp.com',
  'manta.com',
  'merchantcircle.com',
] as const;

const LOW_SIGNAL_PATH_HINTS = [
  '/dictionary/',
  '/definition/',
  '/tag/',
  '/category/',
  '/forum/',
  '/comments/',
  '/profile/',
] as const;

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'that',
  'this',
  'into',
  'over',
  'under',
  'global',
  'world',
  'solution',
  'solutions',
  'industry',
  'technology',
  'systems',
  'system',
  'platform',
]);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalize(input: string): string {
  return input.toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseUrl(urlValue: string | null | undefined): URL | null {
  if (!urlValue) return null;
  try {
    return new URL(urlValue);
  } catch {
    return null;
  }
}

function hostIncludes(hostname: string, hint: string): boolean {
  return hostname === hint || hostname.endsWith(`.${hint}`);
}

function tierBaseScore(tier: SourceTier): number {
  if (tier === 'official') return 0.94;
  if (tier === 'institutional_research') return 0.88;
  if (tier === 'industry_vendor') return 0.76;
  if (tier === 'trade_press') return 0.68;
  if (tier === 'community') return 0.42;
  return 0.56;
}

function tokenizeTopic(input: string): string[] {
  return normalize(input)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

export function isLowTrustDomain(urlValue: string | null | undefined): boolean {
  const parsed = parseUrl(urlValue);
  if (!parsed) return false;
  const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
  return LOW_TRUST_HOST_HINTS.some((hint) => hostIncludes(hostname, hint));
}

export function isBlockedSourceDomain(urlValue: string | null | undefined): boolean {
  const parsed = parseUrl(urlValue);
  if (!parsed) return false;
  const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
  return BLOCKED_HOST_HINTS.some((hint) => hostIncludes(hostname, hint));
}

export function sourceTierFromUrl(urlValue: string | null | undefined): SourceTier {
  const parsed = parseUrl(urlValue);
  if (!parsed) return 'unknown';
  const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();

  if (
    hostname.endsWith('.gov') ||
    hostname.endsWith('.mil') ||
    OFFICIAL_HOST_HINTS.some((hint) => hint.startsWith('.') ? hostname.endsWith(hint) : hostIncludes(hostname, hint))
  ) {
    return 'official';
  }

  if (
    hostname.endsWith('.edu') ||
    TRUSTED_HOST_HINTS.some((hint) => hostIncludes(hostname, hint))
  ) {
    return 'institutional_research';
  }

  if (LOW_TRUST_HOST_HINTS.some((hint) => hostIncludes(hostname, hint))) {
    return 'community';
  }

  if (TRADE_PRESS_HOST_HINTS.some((hint) => hostIncludes(hostname, hint))) {
    return 'trade_press';
  }

  if (/[a-z0-9-]+\.(com|io|ai|co|net|org)$/.test(hostname)) {
    return 'industry_vendor';
  }

  return 'unknown';
}

export function sourceDomainCredibility(
  urlValue: string | null | undefined,
  sourceType: SourceTrustType = 'other',
): number {
  const parsed = parseUrl(urlValue);
  if (!parsed) return 0.42;

  const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
  const path = parsed.pathname.toLowerCase();
  const sourceTier = sourceTierFromUrl(urlValue);
  let score = tierBaseScore(sourceTier);

  if (hostname.endsWith('.gov') || hostname.endsWith('.edu') || sourceTier === 'official') {
    score += 0.24;
  }

  if (TRUSTED_HOST_HINTS.some((hint) => hostIncludes(hostname, hint))) {
    score += 0.16;
  }

  if (LOW_TRUST_HOST_HINTS.some((hint) => hostIncludes(hostname, hint))) {
    score -= 0.36;
  }

  if (LOW_SIGNAL_PATH_HINTS.some((hint) => path.includes(hint))) {
    score -= 0.14;
  }

  if (sourceTier === 'trade_press') {
    score += 0.04;
  } else if (sourceTier === 'community') {
    score -= 0.12;
  }

  if (sourceType === 'whitepaper') {
    if (/\.pdf$|arxiv|research|journal|paper|report/.test(`${hostname}${path}`)) {
      score += 0.1;
    } else {
      score -= 0.08;
    }
  } else if (sourceType === 'case_study') {
    if (/case-study|case_study|customer-story|success-story|use-case/.test(path)) {
      score += 0.08;
    } else {
      score -= 0.05;
    }
  } else if (sourceType === 'funding') {
    if (/funding|investor|venture|series|press/.test(`${hostname}${path}`)) {
      score += 0.06;
    }
  } else if (sourceType === 'company') {
    if (/product|platform|solutions|technology/.test(`${hostname}${path}`)) {
      score += 0.04;
    }
  }

  return Number(clamp(score, 0.12, 0.98).toFixed(3));
}

export function topicalRelevanceScore(
  text: string,
  topic: string,
  region?: string,
  extraTerms: string[] = [],
): number {
  const normalizedText = normalize(text);
  const normalizedTopic = normalize(topic);
  const topicTokens = tokenizeTopic(normalizedTopic);
  const topicBigrams = topicTokens
    .slice(0, Math.max(0, topicTokens.length - 1))
    .map((_, index) => `${topicTokens[index]} ${topicTokens[index + 1]}`);
  const phraseTerms = [topic, region || '', ...extraTerms]
    .map((entry) => normalize(entry))
    .filter((entry) => entry.length >= 3);

  const phraseHits = phraseTerms.filter((entry) => normalizedText.includes(entry)).length;

  const tokenTerms = Array.from(
    new Set(
      phraseTerms
        .flatMap((entry) => tokenizeTopic(entry))
        .filter((entry) => entry.length >= 3),
    ),
  );

  if (tokenTerms.length === 0) {
    return phraseHits > 0 ? 0.7 : 0.5;
  }

  const tokenHits = tokenTerms.filter((entry) => normalizedText.includes(entry)).length;
  const topicTokenHits = topicTokens.filter((entry) => normalizedText.includes(entry)).length;
  const topicBigramHits = topicBigrams.filter((entry) => normalizedText.includes(entry)).length;
  const ratio = tokenHits / tokenTerms.length;
  const phraseBoost = Math.min(0.36, phraseHits * 0.14);
  const topicAlignmentBoost =
    normalizedTopic.length >= 3 && normalizedText.includes(normalizedTopic)
      ? 0.24
      : Math.min(0.2, topicBigramHits * 0.1 + topicTokenHits * 0.03);

  let score = ratio * 0.58 + phraseBoost + topicAlignmentBoost;
  if (topicTokens.length >= 2 && topicBigramHits === 0 && topicTokenHits < 2) {
    score = Math.min(score, 0.22);
  }

  return Number(clamp(score, 0, 1).toFixed(3));
}

export function sourceTrustScore(input: {
  url: string | null | undefined;
  source_type: SourceTrustType;
  text: string;
  industry: string;
  region?: string;
  extra_terms?: string[];
}): number {
  const domain = sourceDomainCredibility(input.url, input.source_type);
  const topic = topicalRelevanceScore(input.text, input.industry, input.region, input.extra_terms || []);
  const tier = sourceTierFromUrl(input.url);
  const tierSignal =
    tier === 'official'
      ? 0.08
      : tier === 'institutional_research'
        ? 0.06
        : tier === 'industry_vendor'
          ? 0.02
          : tier === 'community'
            ? -0.06
            : 0;
  return Number(clamp(topic * 0.68 + domain * 0.26 + tierSignal, 0, 1).toFixed(3));
}
