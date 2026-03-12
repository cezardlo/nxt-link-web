import type { SupabaseClient } from '@supabase/supabase-js';

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';
import {
  routeOptimizationSources,
  type RouteOptimizationSource,
} from '@/lib/ingestion/route-optimization-sources';
import { getSupabaseClient } from '@/lib/supabase/client';

const BOT_USER_AGENT = 'NXTLinkBot/1.0 (+https://nxt-link.local)';

type VendorRowInput = {
  company_name: string;
  company_url: string;
  description: string;
  primary_category: string;
  extraction_confidence: number;
  status: string;
};

type IngestionRowResult = {
  sourceId: string;
  companyName: string;
  companyUrl: string;
  action: 'inserted' | 'updated' | 'skipped' | 'failed';
  reason?: string;
};

export type RouteIngestionResult = {
  totalSources: number;
  processed: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  rows: IngestionRowResult[];
};

function withTimeout(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function canonicalizeUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  parsed.hash = '';
  parsed.search = '';
  const path = parsed.pathname.endsWith('/') ? parsed.pathname.slice(0, -1) : parsed.pathname;
  parsed.pathname = path || '/';
  return parsed.toString();
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function findMetaContent(html: string, name: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      'i',
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["'][^>]*>`,
      'i',
    ),
    new RegExp(
      `<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      'i',
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  return null;
}

function findTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) {
    return null;
  }
  return decodeHtmlEntities(match[1].replace(/\s+/g, ' ').trim());
}

function pickDescription(html: string, text: string): string {
  const metaDescription =
    findMetaContent(html, 'description') || findMetaContent(html, 'og:description');

  if (metaDescription && metaDescription.length >= 40) {
    return metaDescription.slice(0, 280);
  }

  return text.slice(0, 280);
}

function normalizeSources(sources: RouteOptimizationSource[]): RouteOptimizationSource[] {
  const seen = new Set<string>();
  const normalized: RouteOptimizationSource[] = [];

  for (const source of sources) {
    try {
      const url = canonicalizeUrl(source.url);
      const key = url.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      normalized.push({ ...source, url });
    } catch {
      // Invalid source URL is ignored and recorded later by processed results.
    }
  }

  return normalized;
}

async function isRobotsAllowed(url: string): Promise<boolean> {
  let robotsUrl: string;
  try {
    const parsed = new URL(url);
    robotsUrl = `${parsed.origin}/robots.txt`;
  } catch {
    return false;
  }

  try {
    const response = await fetchWithRetry(robotsUrl, {
      method: 'GET',
      headers: {
        'User-Agent': BOT_USER_AGENT,
        Accept: 'text/plain',
      },
      signal: withTimeout(8000),
      cache: 'no-store',
    }, {
      cacheTtlMs: 60 * 60_000,
      staleIfErrorMs: 6 * 60 * 60_000,
      dedupeInFlight: true,
    });

    if (response.status === 404) {
      return true;
    }

    if (!response.ok) {
      return true;
    }

    const robots = await response.text();
    const lines = robots.split('\n').map((line) => line.trim().toLowerCase());
    let wildcardBlock = false;
    let disallowAll = false;

    for (const line of lines) {
      if (line.startsWith('user-agent:')) {
        wildcardBlock = line.includes('*');
      }

      if (wildcardBlock && line.startsWith('disallow:')) {
        const disallowPath = line.replace('disallow:', '').trim();
        if (disallowPath === '/') {
          disallowAll = true;
        }
      }
    }

    return !disallowAll;
  } catch {
    return true;
  }
}

async function fetchSourceSummary(source: RouteOptimizationSource): Promise<VendorRowInput> {
  const allowed = await isRobotsAllowed(source.url);
  if (!allowed) {
    throw new Error('robots.txt disallows crawling this source.');
  }

  const response = await fetchWithRetry(source.url, {
    method: 'GET',
    headers: {
      'User-Agent': BOT_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: withTimeout(20000),
    cache: 'no-store',
  }, {
    cacheTtlMs: 10 * 60_000,
    staleIfErrorMs: 60 * 60_000,
    dedupeInFlight: true,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  const text = stripHtml(html);

  if (text.length < 80) {
    throw new Error('Insufficient page text extracted.');
  }

  const title = findTitle(html) || source.name;
  const description = pickDescription(html, text);

  return {
    company_name: title.length > 120 ? source.name : title,
    company_url: source.url,
    description,
    primary_category: 'Route Optimization',
    extraction_confidence: 0.72,
    status: 'approved',
  };
}

async function upsertVendor(
  supabase: SupabaseClient,
  vendor: VendorRowInput,
): Promise<'inserted' | 'updated'> {
  const { data: existingRows, error: selectError } = await supabase
    .from('vendors')
    .select('id')
    .eq('company_url', vendor.company_url)
    .limit(1);

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (existingRows && existingRows.length > 0) {
    const existingId = existingRows[0]?.id;
    const { error: updateError } = await supabase
      .from('vendors')
      .update(vendor)
      .eq('id', existingId);

    if (updateError) {
      throw new Error(updateError.message);
    }
    return 'updated';
  }

  const { error: insertError } = await supabase.from('vendors').insert(vendor);
  if (insertError) {
    throw new Error(insertError.message);
  }

  return 'inserted';
}

export async function runRouteOptimizationIngestion(limit?: number): Promise<RouteIngestionResult> {
  const supabase = getSupabaseClient({ admin: true });
  const sources = normalizeSources(routeOptimizationSources);
  const limited = typeof limit === 'number' && limit > 0 ? sources.slice(0, limit) : sources;

  const rows: IngestionRowResult[] = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const source of limited) {
    try {
      const vendor = await fetchSourceSummary(source);

      if (!vendor.company_name || !vendor.company_url) {
        skipped += 1;
        rows.push({
          sourceId: source.id,
          companyName: source.name,
          companyUrl: source.url,
          action: 'skipped',
          reason: 'Missing required vendor fields after normalization.',
        });
        continue;
      }

      const action = await upsertVendor(supabase, vendor);
      if (action === 'inserted') {
        inserted += 1;
      } else {
        updated += 1;
      }

      rows.push({
        sourceId: source.id,
        companyName: vendor.company_name,
        companyUrl: vendor.company_url,
        action,
      });
    } catch (error) {
      failed += 1;
      rows.push({
        sourceId: source.id,
        companyName: source.name,
        companyUrl: source.url,
        action: 'failed',
        reason: error instanceof Error ? error.message : 'Unknown ingestion error.',
      });
    }
  }

  return {
    totalSources: limited.length,
    processed: limited.length,
    inserted,
    updated,
    skipped,
    failed,
    rows,
  };
}
