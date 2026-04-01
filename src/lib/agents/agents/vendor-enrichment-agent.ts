// src/lib/agents/agents/vendor-enrichment-agent.ts
// Vendor Enrichment Agent — takes raw exhibitor names and enriches them with
// official website, products, technologies, description, and classification.
// Uses web search → website scrape → AI extraction pipeline.

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';
import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';
import {
  getCompanyEntry,
} from '@/lib/feeds/known-companies';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type EnrichedVendor = {
  id: string;
  canonical_name: string;
  official_domain: string;
  description: string;
  products: string[];
  technologies: string[];
  industries: string[];
  country: string;
  vendor_type: 'startup' | 'enterprise' | 'manufacturer' | 'distributor' | 'software' | 'services' | 'robotics' | 'unknown';
  use_cases: string[];
  employee_estimate: string;
  conference_sources: string[];
  confidence: number;
  enriched_at: string;
};

export type EnrichmentReport = {
  vendors_processed: number;
  vendors_enriched: number;
  vendors_skipped: number;
  vendors_failed: number;
  results: EnrichedVendor[];
  errors: Array<{ name: string; error: string }>;
  llm_calls: number;
  duration_ms: number;
};

// ─── Website Search ─────────────────────────────────────────────────────────────

/**
 * Find the most likely official website for a company via Google-style search.
 * Uses a simple heuristic: search for "[company] official website" and pick
 * the most likely domain from results.
 */
async function findOfficialWebsite(companyName: string): Promise<string> {
  // Strategy 1: Try common domain patterns
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 30);

  const guesses = [
    `https://www.${slug}.com`,
    `https://${slug}.com`,
    `https://www.${slug}.io`,
    `https://${slug}.ai`,
  ];

  for (const url of guesses) {
    try {
      const res = await fetchWithRetry(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'NXTLink-Intel-Bot/1.0' },
        redirect: 'follow',
      }, { retries: 0, cacheTtlMs: 86400_000, cacheKey: `vnd-web:${url}` });
      if (res.ok) return new URL(res.url).origin;
    } catch { /* try next */ }
  }

  // Strategy 2: Use Google search via fetchWithRetry
  try {
    const q = encodeURIComponent(`${companyName} official website`);
    const res = await fetchWithRetry(
      `https://www.google.com/search?q=${q}&num=5`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NXTLink/1.0)' } },
      { retries: 0, cacheTtlMs: 86400_000, cacheKey: `vnd-gsearch:${companyName}` },
    );
    if (res.ok) {
      const html = await res.text();
      // Extract URLs from Google results
      const urlMatches = html.match(/https?:\/\/(?:www\.)?[a-z0-9-]+\.[a-z]{2,6}/gi) ?? [];
      // Filter out Google/search engine domains
      const filtered = urlMatches.filter(
        (u) => !/(google|bing|yahoo|duckduckgo|facebook|twitter|linkedin|youtube|wikipedia|reddit)/i.test(u),
      );
      if (filtered.length > 0) return filtered[0];
    }
  } catch { /* no search results */ }

  return '';
}

// ─── Website Content Extraction ─────────────────────────────────────────────────

async function scrapeCompanyPages(domain: string): Promise<string> {
  if (!domain) return '';

  const pages = ['', '/about', '/products', '/solutions', '/services'];
  const texts: string[] = [];

  for (const path of pages) {
    try {
      const url = `${domain}${path}`;
      const res = await fetchWithRetry(url, {
        headers: { 'User-Agent': 'NXTLink-Intel-Bot/1.0' },
      }, {
        retries: 0,
        cacheTtlMs: 86400_000,
        cacheKey: `vnd-page:${url}`,
      });
      if (!res.ok) continue;

      const html = await res.text();
      // Strip tags, scripts, styles
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000);

      texts.push(text);
    } catch { /* skip page */ }

    // Limit total content
    if (texts.join(' ').length > 8000) break;
  }

  return texts.join('\n\n').slice(0, 10000);
}

// ─── AI Extraction ──────────────────────────────────────────────────────────────

type AiExtractionResult = {
  description: string;
  products: string[];
  technologies: string[];
  industries: string[];
  vendor_type: EnrichedVendor['vendor_type'];
  use_cases: string[];
  country: string;
  employee_estimate: string;
  logistics_category?: string;
};

async function extractWithAi(
  companyName: string,
  websiteText: string,
): Promise<AiExtractionResult | null> {
  const prompt = `Analyze this company and extract structured intelligence.

Company: ${companyName}

Website content:
${websiteText.slice(0, 8000)}

Return ONLY a JSON object with:
{
  "description": "1-2 sentence description of what the company does",
  "products": ["list of specific products or platforms they sell"],
  "technologies": ["technologies they use or provide (e.g. AI, robotics, IoT, blockchain)"],
  "industries": ["industries they serve (e.g. manufacturing, logistics, healthcare)"],
  "vendor_type": "one of: startup, enterprise, manufacturer, distributor, software, services, robotics, unknown",
  "use_cases": ["specific problems they solve"],
  "country": "headquarters country",
  "employee_estimate": "rough estimate like '50-200' or '1000+' or 'unknown'",
  "logistics_category": "one of: TMS, Fleet Management, Freight Brokerage, Warehouse/WMS, Telematics/ELD, Cold Chain, Last Mile, Cross-Border/Customs, Material Handling, Autonomous/Robotics, General Logistics Tech, Not Logistics"
}`;

  try {
    const { result } = await runParallelJsonEnsemble<AiExtractionResult>({
      systemPrompt: 'You are a business intelligence analyst. Extract structured company data. Return valid JSON only.',
      userPrompt: prompt,
      budget: { maxProviders: 1, preferLowCostProviders: true },
      parse: (content) => {
        const cleaned = content.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned) as AiExtractionResult;
      },
    });
    return result;
  } catch {
    return null;
  }
}

// ─── Main Agent ─────────────────────────────────────────────────────────────────

export type VendorEnrichmentOptions = {
  vendors: Array<{
    name: string;
    conference_source: string;
    website_hint?: string;
  }>;
  maxConcurrent?: number;
  skipKnown?: boolean;
};

export async function runVendorEnrichment(
  options: VendorEnrichmentOptions,
): Promise<EnrichmentReport> {
  const start = Date.now();
  const { vendors, maxConcurrent = 3, skipKnown = false } = options;

  const results: EnrichedVendor[] = [];
  const errors: Array<{ name: string; error: string }> = [];
  let llmCalls = 0;
  let skipped = 0;

  // Deduplicate input by normalized name
  const seen = new Map<string, typeof vendors[number]>();
  for (const v of vendors) {
    const key = v.name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.set(key, v);
    } else {
      // Merge conference sources
      const existing = seen.get(key)!;
      existing.conference_source += `, ${v.conference_source}`;
    }
  }
  const deduped = Array.from(seen.values());

  // Process in batches
  for (let i = 0; i < deduped.length; i += maxConcurrent) {
    const batch = deduped.slice(i, i + maxConcurrent);

    const batchResults = await Promise.allSettled(
      batch.map(async (vendor) => {
        // Check if already known
        if (skipKnown) {
          const known = getCompanyEntry(vendor.name);
          if (known) {
            skipped++;
            return null;
          }
        }

        try {
          // Step 1: Find official website
          const domain = vendor.website_hint || (await findOfficialWebsite(vendor.name));

          // Step 2: Scrape key pages
          const websiteText = domain ? await scrapeCompanyPages(domain) : '';

          // Step 3: AI extraction
          let aiResult: AiExtractionResult | null = null;
          if (websiteText.length > 100) {
            aiResult = await extractWithAi(vendor.name, websiteText);
            llmCalls++;
          }

          // Step 4: Build enriched vendor
          const id = vendor.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/-+$/, '');

          const enriched: EnrichedVendor = {
            id,
            canonical_name: vendor.name,
            official_domain: domain,
            description: aiResult?.description ?? '',
            products: aiResult?.products ?? [],
            technologies: aiResult?.technologies ?? [],
            industries: aiResult?.industries ?? [],
            country: aiResult?.country ?? '',
            vendor_type: aiResult?.vendor_type ?? 'unknown',
            use_cases: aiResult?.use_cases ?? [],
            employee_estimate: aiResult?.employee_estimate ?? 'unknown',
            conference_sources: vendor.conference_source.split(', ').filter(Boolean),
            confidence: websiteText.length > 500 ? 0.8 : websiteText.length > 100 ? 0.5 : 0.3,
            enriched_at: new Date().toISOString(),
          };

          return enriched;
        } catch (e) {
          errors.push({ name: vendor.name, error: (e as Error).message });
          return null;
        }
      }),
    );

    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) {
        results.push(r.value);
      }
    }
  }

  return {
    vendors_processed: deduped.length,
    vendors_enriched: results.length,
    vendors_skipped: skipped,
    vendors_failed: errors.length,
    results,
    errors,
    llm_calls: llmCalls,
    duration_ms: Date.now() - start,
  };
}
