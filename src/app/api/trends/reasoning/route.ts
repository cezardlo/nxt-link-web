// src/app/api/trends/reasoning/route.ts
// GET /api/trends/reasoning
// Returns a full TrendAnalysis: what's happening, what might happen, and where
// things are heading — in plain English. Works without any LLM key.
// Cached 10 minutes. Rate-limited to 30 req/min per IP.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getIntelSignals } from '@/db/queries/intel-signals';
import { runTrendReasoningEngine } from '@/lib/engines/trend-reasoning-engine';
import type { TrendAnalysis } from '@/lib/engines/trend-reasoning-engine';


// ─── In-process 10-minute cache ───────────────────────────────────────────────

type CacheEntry = {
  data: TrendAnalysis;
  expiresAt: number;
};

let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ─── GET /api/trends/reasoning ────────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `trends-reasoning:${ip}`, maxRequests: 30, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  // Serve from cache if still valid
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return NextResponse.json(
      { ok: true, data: cache.data, cached: true },
      { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=120' } },
    );
  }

  try {
    // Fetch up to 200 signals — enough for meaningful cross-sector analysis
    // without over-weighting stale data
    const signals = await getIntelSignals({ limit: 200 });

    const analysis = await runTrendReasoningEngine(signals);

    // Update cache
    cache = { data: analysis, expiresAt: now + CACHE_TTL_MS };

    return NextResponse.json(
      { ok: true, data: analysis, cached: false },
      { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=120' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Trend reasoning engine failed.';
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
