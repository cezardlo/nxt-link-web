// src/app/api/intelligence/disruption-index/route.ts
// GET /api/intelligence/disruption-index
//
// Returns the Industry Disruption Index (IDI) — NXT//LINK's equivalent of
// World Monitor's Country Instability Index, applied to technology sectors.
// Each industry is scored 0-100 across four components:
//   Signal Velocity (35%), Funding Activity (25%),
//   Innovation Pulse (25%), Market Movement (15%).
//
// Query params:
//   industry — optional slug (e.g. 'ai-ml') to return a single industry

import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getStoredFeedItems, runFeedAgent } from '@/lib/agents/feed-agent';
import { getIDI } from '@/lib/engines/disruption-index-engine';

export const dynamic = 'force-dynamic';

// ─── GET /api/intelligence/disruption-index ────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({
    key: `disruption-index:${ip}`,
    maxRequests: 60,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  try {
    const url = new URL(request.url);
    const industryFilter = url.searchParams.get('industry')?.trim().toLowerCase() ?? null;

    // Use cached feed items; warm the cache in background if cold
    const store = getStoredFeedItems();
    const feedItems = store?.items ?? null;

    if (!store) {
      runFeedAgent().catch((err) => console.warn('[DisruptionIndex] runFeedAgent failed:', err));
    }

    // Compute (or return cached) IDI
    const result = await getIDI(feedItems);

    // Optional single-industry filter
    if (industryFilter) {
      const match = result.industries.find((i) => i.slug === industryFilter);

      if (!match) {
        return NextResponse.json(
          {
            ok: false,
            message: `Industry slug '${industryFilter}' not found. Valid slugs: ${result.industries.map((i) => i.slug).join(', ')}`,
          },
          { status: 404 },
        );
      }

      return NextResponse.json(
        {
          ok: true,
          status: result.status,
          timestamp: result.timestamp,
          industries: [match],
        },
        {
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }

    return NextResponse.json(
      { ok: true, ...result },
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Disruption index engine failed.';
    return NextResponse.json(
      {
        ok: false,
        message,
        status: 'error',
        timestamp: new Date().toISOString(),
        industries: [],
      },
      { status: 500 },
    );
  }
}
