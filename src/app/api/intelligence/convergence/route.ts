// src/app/api/intelligence/convergence/route.ts
// GET /api/intelligence/convergence
//
// Detects multi-signal convergence events across industries using the
// NXT//LINK Convergence Intelligence Engine. Inspired by World Monitor's
// multi-source convergence detection, adapted for technology/business intelligence.
//
// Query params:
//   window       — '1h' | '6h' | '24h' | '7d'  (default: '24h')
//   region       — 'el-paso' | 'texas' | 'national' | 'global' | 'all'  (default: 'all')
//   min_confidence — 0.0 – 1.0  (default: 0.5)

import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getStoredFeedItems, runFeedAgent } from '@/lib/agents/feed-agent';
import {
  detectConvergence,
  type TimeWindow,
  type Region,
} from '@/lib/engines/convergence-engine';

export const dynamic = 'force-dynamic';

const VALID_WINDOWS: TimeWindow[] = ['1h', '6h', '24h', '7d'];
const VALID_REGIONS: Region[] = ['el-paso', 'texas', 'national', 'global', 'all'];

// ─── GET /api/intelligence/convergence ────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({
    key: `convergence:${ip}`,
    maxRequests: 30,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  try {
    // ── Parse query params ──────────────────────────────────────────────────
    const url = new URL(request.url);

    const rawWindow = url.searchParams.get('window') ?? '24h';
    const window: TimeWindow = (VALID_WINDOWS as string[]).includes(rawWindow)
      ? (rawWindow as TimeWindow)
      : '24h';

    const rawRegion = url.searchParams.get('region') ?? 'all';
    const region: Region = (VALID_REGIONS as string[]).includes(rawRegion)
      ? (rawRegion as Region)
      : 'all';

    const rawMinConf = parseFloat(url.searchParams.get('min_confidence') ?? '0.5');
    const minConfidence =
      isNaN(rawMinConf) || rawMinConf < 0 || rawMinConf > 1 ? 0.5 : rawMinConf;

    // ── Feed data (use cache or warm in background) ─────────────────────────
    const store = getStoredFeedItems();
    const feedItems = store?.items ?? null;

    if (!store) {
      // Warm the cache for the next request — fire-and-forget
      runFeedAgent().catch((err) => console.warn('[Convergence] runFeedAgent failed:', err));
    }

    // ── Run convergence engine (mock fallback included) ─────────────────────
    const result = await detectConvergence(feedItems, window, region, minConfidence);

    return NextResponse.json(
      { ok: true, ...result },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Convergence engine failed.';
    return NextResponse.json(
      {
        ok: false,
        message,
        status: 'error',
        convergenceCount: 0,
        data: [],
      },
      { status: 500 },
    );
  }
}
