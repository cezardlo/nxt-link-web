import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getStoredFeedItems, runFeedAgent } from '@/lib/agents/feed-agent';

// GET /api/feeds?timeRange=7d
// Returns cached enriched feed items, or triggers a fresh run on cache miss.
// Shape: { ok, all: [...], as_of, enriched, source_count }
// FeedBar reads data.all — each item has { title, link, source, pubDate }
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
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const store = await runFeedAgent();
    return NextResponse.json({
      ok: true,
      all: store.items,
      as_of: store.as_of,
      enriched: store.enriched,
      source_count: store.source_count,
      sourceHealth: store.sourceHealth,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Feed agent failed.', all: [] },
      { status: 500 },
    );
  }
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
