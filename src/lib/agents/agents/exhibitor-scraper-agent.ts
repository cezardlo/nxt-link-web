// src/lib/agents/agents/exhibitor-scraper-agent.ts
// Exhibitor Scraper Agent — discovers exhibitor/vendor pages from conference websites,
// extracts company names, and persists to the exhibitors pipeline.
// Uses static HTML parsing first, with LLM fallback for unstructured pages.

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';
import { fetchWithBrowser } from '@/lib/http/browser-fetch';
import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';
import { CONFERENCES, type ConferenceRecord } from '@/lib/data/conferences';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ExhibitorEntry = {
  raw_name: string;
  normalized_name: string;
  booth: string;
  category: string;
  description: string;
  website: string;
  confidence: number;
};

export type ConferenceExhibitorResult = {
  conference_id: string;
  conference_name: string;
  exhibitor_page_url: string;
  page_type: 'exhibitors' | 'sponsors' | 'directory' | 'unknown';
  exhibitors: ExhibitorEntry[];
  scrape_method: 'html' | 'llm' | 'combined';
  scraped_at: string;
};

export type ExhibitorScrapeReport = {
  conferences_scanned: number;
  pages_found: number;
  total_exhibitors: number;
  results: ConferenceExhibitorResult[];
  errors: Array<{ conference_id: string; error: string }>;
  duration_ms: number;
};

// ─── Exhibitor Page Discovery ───────────────────────────────────────────────────

const EXHIBITOR_PAGE_PATHS = [
  '/exhibitors',
  '/sponsors',
  '/directory',
  '/expo',
  '/showcase',
  '/partners',
  '/attendees',
  '/marketplace',
  '/exhibitor-list',
  '/sponsor-list',
  '/vendor-directory',
  '/exhibitor-directory',
  '/companies',
  '/participants',
];

const EXHIBITOR_LINK_RE = /href=["']([^"']*(?:exhibitor|sponsor|directory|vendor|expo|showcase|partner|booth|companies|participant)[^"']*)["']/gi;

/**
 * Try to find the exhibitor/vendor page on a conference website.
 * Strategy: probe known paths, then scan homepage for exhibitor-related links.
 */
async function findExhibitorPage(
  conference: ConferenceRecord,
): Promise<{ url: string; type: ConferenceExhibitorResult['page_type'] } | null> {
  const base = conference.website.replace(/\/+$/, '');

  // Strategy 1: Probe known paths
  for (const path of EXHIBITOR_PAGE_PATHS) {
    try {
      const url = `${base}${path}`;
      const res = await fetchWithRetry(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'NXTLink-Intel-Bot/1.0' },
      }, { retries: 0, cacheTtlMs: 3600_000, cacheKey: `exh-probe:${url}` });
      if (res.ok) {
        const type = path.includes('sponsor') ? 'sponsors'
          : path.includes('directory') || path.includes('vendor') ? 'directory'
          : 'exhibitors';
        return { url, type };
      }
    } catch { /* try next */ }
  }

  // Strategy 2: Scan homepage for exhibitor-related links
  try {
    const res = await fetchWithRetry(base, {
      headers: { 'User-Agent': 'NXTLink-Intel-Bot/1.0' },
    }, { retries: 1, cacheTtlMs: 3600_000, cacheKey: `exh-home:${base}` });
    if (!res.ok) return null;
    const html = await res.text();

    const matches: string[] = [];
    let m: RegExpExecArray | null;
    EXHIBITOR_LINK_RE.lastIndex = 0;
    while ((m = EXHIBITOR_LINK_RE.exec(html)) !== null) {
      matches.push(m[1]);
    }

    if (matches.length > 0) {
      const link = matches[0];
      const fullUrl = link.startsWith('http') ? link : `${base}${link.startsWith('/') ? '' : '/'}${link}`;
      return { url: fullUrl, type: 'exhibitors' };
    }
  } catch { /* no homepage */ }

  return null;
}

// ─── Exhibitor Name Extraction ──────────────────────────────────────────────────

// Common HTML patterns for exhibitor lists
const COMPANY_LIST_PATTERNS = [
  // <li class="exhibitor">CompanyName</li>
  /<li[^>]*(?:exhibitor|sponsor|vendor|company|participant)[^>]*>([\s\S]*?)<\/li>/gi,
  // <div class="exhibitor-name">CompanyName</div>
  /<(?:div|span|h[23456]|a|p)[^>]*(?:exhibitor|sponsor|company|vendor|booth|participant)[-_]?(?:name|title|info)?[^>]*>([^<]{3,80})<\//gi,
  // <td>CompanyName</td> in tables with exhibitor context
  /<td[^>]*>([A-Z][A-Za-z0-9 &,.'-]{2,60})<\/td>/g,
  // <a href="...">CompanyName</a> inside exhibitor containers
  /<a[^>]+>([A-Z][A-Za-z0-9 &,.'-]{3,60})<\/a>/g,
];

const NOISE_WORDS = new Set([
  'home', 'about', 'contact', 'privacy', 'terms', 'menu', 'search', 'login',
  'register', 'back', 'next', 'prev', 'more', 'less', 'close', 'open',
  'exhibitors', 'sponsors', 'vendors', 'directory', 'floor plan', 'booth',
  'view all', 'see all', 'show more', 'load more', 'cookie', 'accept',
  'read more', 'learn more', 'click here', 'download', 'subscribe',
]);

function cleanName(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidCompanyName(name: string): boolean {
  if (name.length < 3 || name.length > 80) return false;
  if (NOISE_WORDS.has(name.toLowerCase())) return false;
  if (!/[A-Z]/.test(name)) return false;
  if (/^\d+$/.test(name)) return false;
  // Must have at least one word-like token
  if (!/[a-zA-Z]{2,}/.test(name)) return false;
  return true;
}

function normalizeCompanyName(name: string): string {
  return name
    .replace(/\s*(Inc\.?|LLC|Corp\.?|Ltd\.?|Co\.?|GmbH|S\.?A\.?|B\.?V\.?|PLC)$/i, '')
    .replace(/[,.]$/, '')
    .trim();
}

/**
 * Extract exhibitor names from raw HTML using pattern matching.
 */
function extractFromHtml(html: string): ExhibitorEntry[] {
  const seen = new Set<string>();
  const results: ExhibitorEntry[] = [];

  for (const pattern of COMPANY_LIST_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const raw = cleanName(match[1]);
      if (!isValidCompanyName(raw)) continue;
      const normalized = normalizeCompanyName(raw);
      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        raw_name: raw,
        normalized_name: normalized,
        booth: '',
        category: '',
        description: '',
        website: '',
        confidence: 0.6,
      });
    }
  }

  return results;
}

// ─── LLM Extraction Fallback ────────────────────────────────────────────────────

async function extractWithLlm(
  html: string,
  conferenceName: string,
): Promise<ExhibitorEntry[]> {
  // Truncate HTML to ~15K chars for LLM
  const truncated = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 15000);

  const prompt = `Extract all company/vendor/exhibitor names from this conference page text.
Conference: ${conferenceName}

Page text:
${truncated}

Return ONLY a JSON array of objects: [{"name":"CompanyName","booth":"if found","category":"if found","website":"if found"}]
Only include real company names. No navigation items, page labels, or generic terms.`;

  try {
    type ExhItem = { name: string; booth?: string; category?: string; website?: string };
    const { result } = await runParallelJsonEnsemble<ExhItem[]>({
      systemPrompt: 'You extract structured company data from conference pages. Return valid JSON only.',
      userPrompt: prompt,
      budget: { maxProviders: 1, preferLowCostProviders: true },
      parse: (content) => {
        const cleaned = content.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned) as ExhItem[];
      },
    });

    if (!result || !Array.isArray(result)) return [];

    return result
      .filter((r) => r.name && isValidCompanyName(r.name))
      .map((r) => ({
        raw_name: r.name,
        normalized_name: normalizeCompanyName(r.name),
        booth: r.booth ?? '',
        category: r.category ?? '',
        description: '',
        website: r.website ?? '',
        confidence: 0.75,
      }));
  } catch {
    return [];
  }
}

// ─── Main Agent ─────────────────────────────────────────────────────────────────

export type ExhibitorScrapeOptions = {
  conferenceIds?: string[];
  maxConferences?: number;
  minRelevanceScore?: number;
  useLlmFallback?: boolean;
};

export async function runExhibitorScraper(
  options: ExhibitorScrapeOptions = {},
): Promise<ExhibitorScrapeReport> {
  const start = Date.now();
  const {
    conferenceIds,
    maxConferences = 20,
    minRelevanceScore = 50,
    useLlmFallback = true,
  } = options;

  // Filter conferences
  let targets: ConferenceRecord[] = conferenceIds
    ? CONFERENCES.filter((c) => conferenceIds.includes(c.id))
    : CONFERENCES.filter((c) => c.relevanceScore >= minRelevanceScore)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, maxConferences);

  // Dedupe by website domain
  const seenDomains = new Set<string>();
  targets = targets.filter((c) => {
    try {
      const domain = new URL(c.website).hostname;
      if (seenDomains.has(domain)) return false;
      seenDomains.add(domain);
      return true;
    } catch {
      return false;
    }
  });

  const results: ConferenceExhibitorResult[] = [];
  const errors: Array<{ conference_id: string; error: string }> = [];

  // Process conferences in batches of 5
  for (let i = 0; i < targets.length; i += 5) {
    const batch = targets.slice(i, i + 5);
    const batchResults = await Promise.allSettled(
      batch.map(async (conf) => {
        // Step 1: Find exhibitor page
        const page = await findExhibitorPage(conf);
        if (!page) {
          errors.push({ conference_id: conf.id, error: 'No exhibitor page found' });
          return null;
        }

        // Step 2: Fetch the exhibitor page
        let html: string;
        try {
          const res = await fetchWithRetry(page.url, {
            headers: { 'User-Agent': 'NXTLink-Intel-Bot/1.0' },
          }, { retries: 1, cacheTtlMs: 86400_000, cacheKey: `exh-page:${page.url}` });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          html = await res.text();
        } catch (e) {
          errors.push({ conference_id: conf.id, error: `Fetch failed: ${(e as Error).message}` });
          return null;
        }

        // Step 3: Extract exhibitors from static HTML
        const exhibitors = extractFromHtml(html);
        let method: ConferenceExhibitorResult['scrape_method'] = 'html';

        // Step 3b: Browser fallback for JS-heavy sites (Playwright)
        // If static HTML found too few results, try rendering with a real browser
        if (exhibitors.length < 5) {
          const browserHtml = await fetchWithBrowser(page.url, {
            timeout: 12_000,
            actions: [
              { type: 'scroll', pixels: 3000 },
              { type: 'wait', ms: 1500 },
            ],
          });
          if (browserHtml && browserHtml.length > html.length * 1.2) {
            // Browser rendered significantly more content — re-extract
            const browserResults = extractFromHtml(browserHtml);
            if (browserResults.length > exhibitors.length) {
              const seen = new Set(exhibitors.map((e) => e.normalized_name.toLowerCase()));
              for (const r of browserResults) {
                if (!seen.has(r.normalized_name.toLowerCase())) {
                  exhibitors.push(r);
                  seen.add(r.normalized_name.toLowerCase());
                }
              }
              method = 'combined';
              // Update html for potential LLM fallback below
              html = browserHtml;
            }
          }
        }

        // Step 4: LLM fallback if still too few results
        if (exhibitors.length < 5 && useLlmFallback) {
          const llmResults = await extractWithLlm(html, conf.name);
          if (llmResults.length > exhibitors.length) {
            // Merge — dedup by normalized name
            const seen = new Set(exhibitors.map((e) => e.normalized_name.toLowerCase()));
            for (const r of llmResults) {
              if (!seen.has(r.normalized_name.toLowerCase())) {
                exhibitors.push(r);
                seen.add(r.normalized_name.toLowerCase());
              }
            }
            method = exhibitors.length > llmResults.length ? 'combined' : 'llm';
          }
        }

        const result: ConferenceExhibitorResult = {
          conference_id: conf.id,
          conference_name: conf.name,
          exhibitor_page_url: page.url,
          page_type: page.type,
          exhibitors,
          scrape_method: method,
          scraped_at: new Date().toISOString(),
        };

        return result;
      }),
    );

    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) {
        results.push(r.value);
      }
    }
  }

  return {
    conferences_scanned: targets.length,
    pages_found: results.length,
    total_exhibitors: results.reduce((sum, r) => sum + r.exhibitors.length, 0),
    results,
    errors,
    duration_ms: Date.now() - start,
  };
}
