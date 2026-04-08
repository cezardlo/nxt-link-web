export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { fetchWithRetry } from '@/lib/http/fetch-with-retry';

export const maxDuration = 30;

// ─── Types ──────────────────────────────────────────────────────────────────

type SweepHit = {
  name: string;
  hq: string;
  product: string;
  stage: string;       // seed, series-a, series-b, growth, public, unknown
  signal: string;      // funding, acquisition, product_launch, expansion, contract, none
  signalDetail: string;
  url: string;
  confidence: number;
};

type SweepResult = {
  category: string;
  region: string;
  country: string;
  hits: SweepHit[];
  scannedAt: string;
  source: string;
};

// ─── Google News RSS (free, no key) ─────────────────────────────────────────

async function searchGoogleNews(query: string, limit = 8): Promise<Array<{ title: string; link: string; snippet: string }>> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&gl=US&ceid=US:en`;
    const res = await fetchWithRetry(url, {
      headers: { Accept: 'application/xml' },
      signal: AbortSignal.timeout(8000),
    }, { retries: 1, cacheTtlMs: 10 * 60 * 1000 });

    if (!res.ok) return [];
    const xml = await res.text();

    const items: Array<{ title: string; link: string; snippet: string }> = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) && items.length < limit) {
      const block = match[1];
      const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() ?? '';
      const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? '';
      const desc = block.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').trim() ?? '';
      if (title) items.push({ title, link, snippet: desc });
    }
    return items;
  } catch {
    return [];
  }
}

// ─── Extract companies from search results ──────────────────────────────────

const COMPANY_SUFFIXES = /\b(Inc\.?|LLC|Corp\.?|Ltd\.?|SA|GmbH|BV|Pty|PLC|Technologies|Systems|Solutions|Software|Logistics|Group|Labs|AI)\b/i;
const FUNDING_PATTERN = /\$[\d.]+\s*[BMK]?\s*(seed|series\s*[a-f]|round|funding|raised|valuation)/i;
const ACQUISITION_PATTERN = /\b(acquir|bought|merger|merged|acquisition)\b/i;
const LAUNCH_PATTERN = /\b(launch|released|unveiled|announced|new product|new platform)\b/i;
const EXPANSION_PATTERN = /\b(expan|new office|new facility|opened|headquarter|relocat)\b/i;

function extractCompanies(results: Array<{ title: string; link: string; snippet: string }>, country: string): SweepHit[] {
  const hits: SweepHit[] = [];
  const seen = new Set<string>();

  for (const r of results) {
    const text = `${r.title} ${r.snippet}`;

    // Try to extract company name from title (before " - ", " | ", " : ")
    const titleParts = r.title.split(/\s*[-|:–]\s*/);
    let companyName = '';

    for (const part of titleParts) {
      if (COMPANY_SUFFIXES.test(part) || (part.length > 2 && part.length < 50 && /^[A-Z]/.test(part))) {
        companyName = part.trim();
        break;
      }
    }

    if (!companyName && titleParts[0]) {
      companyName = titleParts[0].trim();
    }

    // Skip duplicates
    const key = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(key) || key.length < 3) continue;
    seen.add(key);

    // Detect signal type
    let signal = 'none';
    let signalDetail = '';
    const fundingMatch = text.match(FUNDING_PATTERN);
    if (fundingMatch) {
      signal = 'funding';
      signalDetail = fundingMatch[0];
    } else if (ACQUISITION_PATTERN.test(text)) {
      signal = 'acquisition';
      signalDetail = text.match(ACQUISITION_PATTERN)?.[0] ?? '';
    } else if (LAUNCH_PATTERN.test(text)) {
      signal = 'product_launch';
      signalDetail = text.match(LAUNCH_PATTERN)?.[0] ?? '';
    } else if (EXPANSION_PATTERN.test(text)) {
      signal = 'expansion';
      signalDetail = text.match(EXPANSION_PATTERN)?.[0] ?? '';
    }

    // Detect stage from context
    let stage = 'unknown';
    if (/\bseed\b/i.test(text)) stage = 'seed';
    else if (/\bseries\s*a\b/i.test(text)) stage = 'series-a';
    else if (/\bseries\s*[b-f]\b/i.test(text)) stage = 'series-b+';
    else if (/\b(IPO|public|NYSE|NASDAQ)\b/i.test(text)) stage = 'public';
    else if (/\bgrowth\b/i.test(text)) stage = 'growth';

    // Extract product from snippet
    const product = r.snippet.length > 100 ? r.snippet.slice(0, 100) + '...' : r.snippet;

    hits.push({
      name: companyName.slice(0, 60),
      hq: country,
      product,
      stage,
      signal,
      signalDetail,
      url: r.link,
      confidence: signal !== 'none' ? 0.7 : 0.4,
    });
  }

  return hits;
}

// ─── POST /api/sweep ────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `sweep:${ip}`, maxRequests: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  try {
    const body = await request.json() as { category: string; region: string; countries: string[] };
    const { category, region, countries } = body;

    if (!category || !region || !countries?.length) {
      return NextResponse.json({ ok: false, message: 'Missing category, region, or countries' }, { status: 400 });
    }

    // Search each country in parallel
    const results: SweepResult[] = await Promise.all(
      countries.map(async (country) => {
        const query = `"${category}" software companies ${country} 2024 2025`;
        const searchResults = await searchGoogleNews(query, 8);
        const hits = extractCompanies(searchResults, country);

        return {
          category,
          region,
          country,
          hits,
          scannedAt: new Date().toISOString(),
          source: 'google_news',
        };
      }),
    );

    const totalHits = results.reduce((sum, r) => sum + r.hits.length, 0);

    return NextResponse.json({
      ok: true,
      results,
      totalHits,
      category,
      region,
      scannedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : 'Sweep failed' },
      { status: 500 },
    );
  }
}
