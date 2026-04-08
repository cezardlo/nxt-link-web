export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SearchKind = 'city' | 'state' | 'university' | 'keyword' | 'all';

const ALLOWED_KINDS: SearchKind[] = ['city', 'state', 'university', 'keyword', 'all'];

export type SbirAward = {
  company: string;
  awardTitle: string;
  agency: string;
  amount: number | null;
  year: number | null;
  abstract: string;
  city: string;
  state: string;
};

// Raw shape returned by api.sbir.gov/public/api/awards (flat JSON array)
type SbirRawAward = {
  firm?: string;
  award_title?: string;
  agency?: string;
  award_amount?: string | number | null;
  award_year?: string | number | null;
  abstract?: string;
  city?: string;
  state?: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SBIR_BASE = 'https://api.sbir.gov/public/api/awards';
const FETCH_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min — serve cached data for up to 30 min

// ---------------------------------------------------------------------------
// In-memory cache — survives across requests in the same serverless instance.
// When SBIR.gov is under maintenance, the app serves the last good response.
// ---------------------------------------------------------------------------

type CacheEntry = { awards: SbirAward[]; fetchedAt: number };
const cache = new Map<string, CacheEntry>();

function cacheKey(kind: string, value: string): string {
  return `${kind}::${value.toLowerCase().trim()}`;
}

function getCached(kind: string, value: string): SbirAward[] | null {
  const entry = cache.get(cacheKey(kind, value));
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  return entry.awards;
}

function setCache(kind: string, value: string, awards: SbirAward[]): void {
  cache.set(cacheKey(kind, value), { awards, fetchedAt: Date.now() });
}

/** Get cached data regardless of TTL — last resort when upstream is down */
function getStaleCached(kind: string, value: string): SbirAward[] | null {
  const entry = cache.get(cacheKey(kind, value));
  return entry?.awards ?? null;
}

// Default values used when the caller does not supply ?q=
const DEFAULTS: Record<SearchKind, string> = {
  city: 'El Paso',
  state: 'TX',
  university: 'University of Texas at El Paso',
  keyword: 'border technology',
  all: '',
};

// SBIR API query parameter names per search kind
const SBIR_PARAM: Record<Exclude<SearchKind, 'all'>, string> = {
  city: 'city',
  state: 'state',
  university: 'ri',
  keyword: 'keyword',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseAmount(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseYear(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : null;
}

function normaliseAward(raw: SbirRawAward): SbirAward {
  return {
    company: (raw.firm ?? '').trim(),
    awardTitle: (raw.award_title ?? '').trim(),
    agency: (raw.agency ?? '').trim(),
    amount: parseAmount(raw.award_amount),
    year: parseYear(raw.award_year),
    abstract: (raw.abstract ?? '').trim(),
    city: (raw.city ?? '').trim(),
    state: (raw.state ?? '').trim(),
  };
}

async function fetchSbir(
  kind: Exclude<SearchKind, 'all'>,
  value: string,
  limit: number,
): Promise<SbirAward[]> {
  // 1. Check fresh cache first
  const cached = getCached(kind, value);
  if (cached) return cached.slice(0, limit);

  // 2. Try live API
  try {
    const paramName = SBIR_PARAM[kind];
    const url = new URL(SBIR_BASE);
    url.searchParams.set('rows', String(limit));
    url.searchParams.set(paramName, value);

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`SBIR API returned ${response.status} for kind="${kind}" value="${value}"`);
    }

    const json: unknown = await response.json();

    if (!Array.isArray(json)) {
      return [];
    }

    const awards = (json as SbirRawAward[]).map(normaliseAward);
    // Save to cache on success
    setCache(kind, value, awards);
    return awards;
  } catch (err) {
    // 3. API failed — fall back to stale cache if available
    const stale = getStaleCached(kind, value);
    if (stale) return stale.slice(0, limit);
    // No cache at all — rethrow
    throw err;
  }
}

function deduplicateAwards(awards: SbirAward[]): SbirAward[] {
  const seen = new Set<string>();
  const result: SbirAward[] = [];
  for (const award of awards) {
    const key = award.awardTitle.toLowerCase().trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(award);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

// GET /api/discover/sbir?search=city|state|university|keyword|all&q=El+Paso&limit=50
export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({ key: `discover-sbir:${ip}`, maxRequests: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  const url = new URL(request.url);
  const rawSearch = (url.searchParams.get('search') ?? 'city').trim().toLowerCase();
  const rawQ = (url.searchParams.get('q') ?? '').trim();
  const limitParam = url.searchParams.get('limit');
  const limit = Math.min(100, Math.max(1, parseInt(limitParam ?? '50', 10) || 50));

  const searchKind: SearchKind = ALLOWED_KINDS.includes(rawSearch as SearchKind)
    ? (rawSearch as SearchKind)
    : 'city';

  try {
    // -----------------------------------------------------------------------
    // search=all — run all four searches concurrently and merge
    // -----------------------------------------------------------------------
    if (searchKind === 'all') {
      const searches: Array<{ kind: Exclude<SearchKind, 'all'>; value: string }> = [
        { kind: 'city', value: 'El Paso' },
        { kind: 'state', value: 'TX' },
        { kind: 'university', value: 'University of Texas at El Paso' },
        { kind: 'keyword', value: 'border technology' },
      ];

      const settled = await Promise.allSettled(
        searches.map(({ kind, value }) => fetchSbir(kind, value, limit)),
      );

      const allAwards: SbirAward[] = [];
      for (const result of settled) {
        if (result.status === 'fulfilled') {
          allAwards.push(...result.value);
        }
        // silently ignore individual search failures in the all-mode merge
      }

      const merged = deduplicateAwards(allAwards).slice(0, limit);

      return NextResponse.json(
        {
          ok: true,
          query: { type: 'all', value: 'El Paso / TX / UTEP / border technology' },
          awards: merged,
          total: merged.length,
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // -----------------------------------------------------------------------
    // Single search kind
    // -----------------------------------------------------------------------
    const queryValue = rawQ || DEFAULTS[searchKind];

    if (!queryValue) {
      return NextResponse.json(
        { ok: false, message: `Missing required query parameter: q (required for search=${searchKind})` },
        { status: 400 },
      );
    }

    const awards = await fetchSbir(searchKind, queryValue, limit);

    return NextResponse.json(
      {
        ok: true,
        query: { type: searchKind, value: queryValue },
        awards,
        total: awards.length,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch SBIR awards.';

    // Last resort: check stale cache for any search kind
    const fallbackKind = searchKind === 'all' ? 'city' : searchKind;
    const fallbackValue = searchKind === 'all' ? 'El Paso' : (rawQ || DEFAULTS[searchKind]);
    const stale = getStaleCached(fallbackKind, fallbackValue);
    if (stale) {
      return NextResponse.json(
        {
          ok: true,
          query: { type: searchKind, value: fallbackValue },
          awards: stale,
          total: stale.length,
          _cached: true,
          _note: 'SBIR.gov may be under maintenance. Showing cached data.',
        },
        { headers: { 'Cache-Control': 'public, max-age=300' } },
      );
    }

    // No cache at all — surface upstream error
    const isUpstreamError = message.includes('SBIR API') || message.includes('fetch');
    return NextResponse.json(
      { ok: false, message: `SBIR.gov may be under maintenance. ${message}` },
      { status: isUpstreamError ? 502 : 500 },
    );
  }
}
