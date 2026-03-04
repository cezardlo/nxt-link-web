import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getStoredFeedItems, runFeedAgent } from '@/lib/agents/feed-agent';
import { runSignalEngine } from '@/lib/intelligence/signal-engine';

export const dynamic = 'force-dynamic';

// GET /api/intel-signals
// Returns signal intelligence derived from the current feed cache.
// Reuses the feed-agent in-memory cache — no extra RSS fetches.
export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `intel-signals:${ip}`, maxRequests: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  try {
    // Use cached feed if available, otherwise trigger a fresh run
    let store = getStoredFeedItems();
    if (!store) store = await runFeedAgent();

    const engine = runSignalEngine(store.items);

    return NextResponse.json(
      {
        ok: true,
        signals: engine.signals,
        sectorScores: engine.sectorScores,
        activeVendorIds: engine.activeVendorIds,
        clusterCount: engine.clusters.length,
        detectedAt: engine.detectedAt,
        feedAsOf: store.as_of,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : 'Signal engine failed.', signals: [], sectorScores: [], activeVendorIds: [] },
      { status: 500 },
    );
  }
}
