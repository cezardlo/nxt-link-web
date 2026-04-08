// src/app/api/intelligence/cross-sector/route.ts
// GET /api/intelligence/cross-sector
//
// Runs the Cross-Industry Intelligence Engine and returns insights that
// connect signals from multiple distinct industries. Cached 15 minutes.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getIntelSignals } from '@/db/queries/intel-signals';
import { isSupabaseConfigured } from '@/db/client';
import { getStoredFeedItems, runFeedAgent } from '@/lib/agents/feed-agent';
import { runSignalEngine } from '@/lib/intelligence/signal-engine';
import { runCrossIntelEngine, type CrossIntelSignalInput } from '@/lib/engines/cross-intel-engine';


// In-memory 15-minute result cache (survives across requests within same server instance)
type CacheEntry = {
  data: Awaited<ReturnType<typeof runCrossIntelEngine>>;
  expiresAt: number;
};

let cache: CacheEntry | null = null;

// ─── GET /api/intelligence/cross-sector ──────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({
    key: `cross-sector:${ip}`,
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
    // Serve from cache if still fresh
    if (cache && Date.now() < cache.expiresAt) {
      return NextResponse.json(
        { ok: true, data: cache.data, source: 'cache' },
        { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300' } },
      );
    }

    // ── Gather signals ────────────────────────────────────────────────────────
    let signals: CrossIntelSignalInput[] = [];

    if (isSupabaseConfigured()) {
      const rows = await getIntelSignals({ limit: 50 });
      signals = rows.map((r) => ({
        id: r.id,
        title: r.title,
        industry: r.industry,
        company: r.company ?? undefined,
        type: r.signal_type,
        importance: r.importance_score,
      }));
    }

    // Augment / replace with in-memory feed engine signals if Supabase empty
    if (signals.length < 5) {
      const store = getStoredFeedItems();
      if (!store) {
        runFeedAgent().catch((err) => console.warn('[CrossSector] runFeedAgent failed:', err));
      } else {
        const engine = runSignalEngine(store.items);
        const feedSignals: CrossIntelSignalInput[] = engine.signals.map((s) => ({
          id: s.id,
          title: s.title,
          industry: s.sectorLabel ?? s.entityName ?? 'General',
          company: s.entityName ?? undefined,
          type: s.type,
          importance:
            s.priority === 'critical' ? 0.9
            : s.priority === 'high' ? 0.7
            : s.priority === 'elevated' ? 0.5
            : 0.3,
        }));
        signals = feedSignals;
      }
    }

    // ── Run cross-intel engine ────────────────────────────────────────────────
    const report = await runCrossIntelEngine(signals);

    // Store in cache
    cache = { data: report, expiresAt: Date.now() + 15 * 60 * 1000 };

    return NextResponse.json(
      { ok: true, data: report, source: 'live' },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cross-intel engine failed.';
    return NextResponse.json(
      {
        ok: false,
        message,
        data: {
          timestamp: new Date().toISOString(),
          insights: [],
          total_signals_analyzed: 0,
        },
      },
      { status: 500 },
    );
  }
}
