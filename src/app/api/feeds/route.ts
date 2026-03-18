import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getStoredFeedItems, runFeedAgent } from '@/lib/agents/feed-agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // allow up to 60s for RSS fetching

// GET /api/feeds?timeRange=7d
// Returns cached enriched feed items. If cache is cold, returns empty + warms in background.
// Shape: { ok, all: [...], as_of, enriched, source_count }
export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers((request as Request).headers));
  const rl = checkRateLimit({ key: `feeds-get:${ip}`, maxRequests: 60, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const cached = getStoredFeedItems();
  if (cached) {
    return NextResponse.json({
      ok: true,
      all: cached.items,
      as_of: cached.as_of,
      enriched: cached.enriched,
      source_count: cached.source_count,
      sourceHealth: cached.sourceHealth,
    }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } });
  }

  // Cold start: try to warm for up to 45s before responding empty
  try {
    const store = await Promise.race([
      runFeedAgent(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 45_000)),
    ]);
    if (store) {
      return NextResponse.json({
        ok: true,
        all: store.items,
        as_of: store.as_of,
        enriched: store.enriched,
        source_count: store.source_count,
        sourceHealth: store.sourceHealth,
      }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } });
    }
  } catch { /* fall through */ }

  return NextResponse.json({
    ok: true,
    all: [],
    as_of: null,
    enriched: false,
    source_count: 0,
    sourceHealth: [],
    warming: true,
  }, { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' } });
}

// POST /api/feeds — forces a fresh run, bypasses cache
export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers((request as Request).headers));
  const rl = checkRateLimit({ key: `feeds-post:${ip}`, maxRequests: 6, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Too many manual triggers. Max 6 per minute.' },
      { status: 429 },
    );
  }

  try {
    const store = await runFeedAgent();
    return NextResponse.json({
      ok: true,
      all: store.items,
      enriched: store.enriched,
      source_count: store.source_count,
      as_of: store.as_of,
      sourceHealth: store.sourceHealth,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Feed agent failed.', all: [] },
      { status: 500 },
    );
  }
}
