import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import {
  discoverSources,
  discoverForIndustry,
  discoverTrending,
  type DiscoveredSource,
} from '@/lib/engines/source-discovery-engine';

export const dynamic = 'force-dynamic';

// ─── Simple in-process cache (5 min TTL) ─────────────────────────────────────

type CacheEntry = {
  data: DiscoveredSource[];
  expiresAt: number;
};

const _cache = new Map<string, CacheEntry>();

function getCached(key: string): DiscoveredSource[] | null {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: DiscoveredSource[], ttlMs = 5 * 60 * 1000): void {
  _cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ─── Request body type ────────────────────────────────────────────────────────

type PostBody =
  | { keyword: string; industrySlug?: never; trending?: never; relatedTerms?: string[]; maxSources?: number }
  | { industrySlug: string; keyword?: never; trending?: never }
  | { trending: true; keyword?: never; industrySlug?: never };

// ─── GET — return recently cached discoveries ─────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `discover-sources-get:${ip}`, maxRequests: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  // Collect all non-expired cache entries
  const allCached: DiscoveredSource[] = [];
  const now = Date.now();
  for (const [, entry] of Array.from(_cache.entries() as Iterable<[string, CacheEntry]>)) {
    if (entry.expiresAt > now) {
      allCached.push(...entry.data);
    }
  }

  // Deduplicate by id (different cache keys may surface same source)
  const seenIds = new Set<string>();
  const deduped = allCached.filter((s) => {
    if (seenIds.has(s.id)) return false;
    seenIds.add(s.id);
    return true;
  });

  return NextResponse.json(
    { ok: true, discovered: deduped, count: deduped.length },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

// ─── POST — run discovery ─────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `discover-sources-post:${ip}`, maxRequests: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  let body: PostBody;
  try {
    body = await request.json() as PostBody;
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON body.' }, { status: 400 });
  }

  // Branch 1: trending
  if ('trending' in body && body.trending === true) {
    const cacheKey = 'trending';
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(
        { ok: true, discovered: cached, count: cached.length, source: 'cache' },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const sources = await discoverTrending();
    setCache(cacheKey, sources);

    return NextResponse.json(
      { ok: true, discovered: sources, count: sources.length, source: 'live' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // Branch 2: industry slug
  if ('industrySlug' in body && body.industrySlug) {
    const slug = (body.industrySlug as string).trim().toLowerCase();
    if (!slug) {
      return NextResponse.json({ ok: false, message: 'industrySlug is required.' }, { status: 400 });
    }

    const cacheKey = `industry:${slug}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(
        { ok: true, discovered: cached, count: cached.length, source: 'cache' },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const result = await discoverForIndustry(slug);
    setCache(cacheKey, result.sources);

    return NextResponse.json(
      { ok: true, discovered: result.sources, count: result.sources.length, keyword: result.keyword, durationMs: result.durationMs, source: 'live' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // Branch 3: keyword
  if ('keyword' in body && body.keyword) {
    const keyword = (body.keyword as string).trim();
    if (!keyword) {
      return NextResponse.json({ ok: false, message: 'keyword is required.' }, { status: 400 });
    }

    const cacheKey = `keyword:${keyword.toLowerCase()}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(
        { ok: true, discovered: cached, count: cached.length, source: 'cache' },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const result = await discoverSources({
      keyword,
      maxSources: body.maxSources ?? 30,
      includeGoogleNews: true,
      includeDomainScan: true,
      relatedTerms: body.relatedTerms ?? [],
    });

    setCache(cacheKey, result.sources);

    return NextResponse.json(
      {
        ok: true,
        discovered: result.sources,
        count: result.sources.length,
        keyword: result.keyword,
        method: result.method,
        durationMs: result.durationMs,
        source: 'live',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.json(
    { ok: false, message: 'Provide one of: keyword, industrySlug, or trending: true' },
    { status: 400 },
  );
}
