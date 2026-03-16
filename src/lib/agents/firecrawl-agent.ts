// src/lib/agents/firecrawl-agent.ts
// Firecrawl Agent — scrapes vendor websites to clean markdown for intelligence extraction.
// Uses Firecrawl API: https://firecrawl.dev (free tier available)
// Requires: FIRECRAWL_API_KEY env var

const FIRECRAWL_API = 'https://api.firecrawl.dev/v1';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ScrapedIntelligence = {
  url: string;
  title: string;
  content: string; // clean markdown, capped at 5k chars
  products: string[];
  technologies: string[];
  contracts: string[];
  extractedAt: string;
};

type FirecrawlScrapeResponse = {
  data?: {
    markdown?: string;
    metadata?: {
      title?: string;
    };
  };
};

// ─── Extraction Helpers ──────────────────────────────────────────────────────

/** Extract capitalized multi-word phrases that look like product names */
function extractProductMentions(text: string): string[] {
  const matches = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}/g) ?? [];
  return [...new Set(matches)].slice(0, 10);
}

/** Match against known tech keyword list */
function extractTechMentions(text: string): string[] {
  const techKeywords = [
    'AI', 'ML', 'drone', 'robot', 'sensor', 'autonomous',
    'cloud', 'cyber', 'defense', 'LiDAR', 'GPU', 'IoT',
    'blockchain', 'quantum', 'edge computing',
  ];
  return techKeywords.filter(kw => text.toLowerCase().includes(kw.toLowerCase()));
}

/** Extract dollar-value contract award mentions */
function extractContractMentions(text: string): string[] {
  const matches = text.match(/\$[\d.,]+[MBKmb]?\s+(?:contract|award|grant)/gi) ?? [];
  return [...new Set(matches)].slice(0, 5);
}

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Scrapes a single vendor website via the Firecrawl API.
 * Returns null if no API key is configured or the request fails.
 */
export async function scrapeVendorSite(url: string): Promise<ScrapedIntelligence | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    console.warn('[firecrawl] No FIRECRAWL_API_KEY — skipping scrape');
    return null;
  }

  try {
    const res = await fetch(`${FIRECRAWL_API}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
      signal: AbortSignal.timeout(15_000), // 15s max per scrape
    });

    if (!res.ok) {
      console.warn(`[firecrawl] HTTP ${res.status} for ${url}`);
      return null;
    }

    const data = (await res.json()) as FirecrawlScrapeResponse;
    const content = data.data?.markdown ?? '';

    return {
      url,
      title: data.data?.metadata?.title ?? url,
      content: content.slice(0, 5000), // cap at 5k chars per the spec
      products: extractProductMentions(content),
      technologies: extractTechMentions(content),
      contracts: extractContractMentions(content),
      extractedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[firecrawl] scrape failed:', err);
    return null;
  }
}

/**
 * Scrapes multiple vendor sites in parallel.
 * Filters out null results (failed or skipped scrapes).
 */
export async function scrapeMultipleVendors(urls: string[]): Promise<ScrapedIntelligence[]> {
  const results = await Promise.allSettled(urls.map(url => scrapeVendorSite(url)));
  return results
    .filter(
      (r): r is PromiseFulfilledResult<ScrapedIntelligence> =>
        r.status === 'fulfilled' && r.value !== null,
    )
    .map(r => r.value);
}

/**
 * Combines scrape results into a summary for downstream analysis.
 * Deduplicates technologies and contracts across all scraped sites.
 */
export function summarizeScrapedIntelligence(items: ScrapedIntelligence[]): {
  totalSites: number;
  allProducts: string[];
  allTechnologies: string[];
  allContracts: string[];
  combinedContent: string;
} {
  const allProducts = [...new Set(items.flatMap(i => i.products))].slice(0, 30);
  const allTechnologies = [...new Set(items.flatMap(i => i.technologies))];
  const allContracts = [...new Set(items.flatMap(i => i.contracts))];
  const combinedContent = items.map(i => `## ${i.title}\n${i.content}`).join('\n\n').slice(0, 10_000);

  return {
    totalSites: items.length,
    allProducts,
    allTechnologies,
    allContracts,
    combinedContent,
  };
}
