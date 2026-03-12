import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getStoredFeedItems, runFeedAgent } from '@/lib/agents/feed-agent';
import { runSignalEngine } from '@/lib/intelligence/signal-engine';
import { getIntelSignals, getIntelSignalStats } from '@/db/queries/intel-signals';
import { isSupabaseConfigured } from '@/db/client';

export const dynamic = 'force-dynamic';

const STALE_MS = 4 * 60 * 60 * 1000;

// GET /api/intel-signals
// Priority: 1) Supabase persisted signals (survive restarts, built by daily cron)
//           2) In-memory feed-agent cache (fast, resets on restart)
//           3) Empty + background warm (cold start)
export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `intel-signals:${ip}`, maxRequests: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  try {
    // 1. Supabase first (persisted, survives restarts)
    if (isSupabaseConfigured()) {
      const [dbSignals, stats] = await Promise.all([
        getIntelSignals({ limit: 50 }),
        getIntelSignalStats(),
      ]);

      if (dbSignals.length >= 5) {
        const latestMs = dbSignals[0]?.discovered_at
          ? new Date(dbSignals[0].discovered_at).getTime()
          : 0;
        const isStale = Date.now() - latestMs > STALE_MS;
        if (isStale) {
          import('@/lib/agents/agents/intel-discovery-agent')
            .then(({ runIntelDiscoveryAgent }) => runIntelDiscoveryAgent())
            .catch(() => {});
        }

        const signals = dbSignals.map(s => ({
          title: s.title,
          signal_type: s.signal_type,
          industry: s.industry,
          company: s.company,
          importance: s.importance_score,
          discovered_at: s.discovered_at,
          url: s.url,
          confidence: s.confidence,
        }));

        return NextResponse.json(
          {
            ok: true,
            signals,
            findings: signals,
            total: stats.total,
            by_type: stats.by_type,
            by_industry: stats.by_industry,
            avg_importance: stats.avg_importance,
            source: 'supabase',
            is_stale: isStale,
            detectedAt: new Date().toISOString(),
          },
          { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } },
        );
      }
    }

    // 2. Fall back to in-memory feed cache
    const store = getStoredFeedItems();
    if (!store) {
      runFeedAgent().catch(() => {});
      return NextResponse.json(
        {
          ok: true,
          signals: [],
          findings: [],
          sectorScores: [],
          activeVendorIds: [],
          clusterCount: 0,
          detectedAt: new Date().toISOString(),
          feedAsOf: null,
          warming: true,
          source: 'warming',
        },
        { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' } },
      );
    }

    const engine = runSignalEngine(store.items);
    const signals = engine.signals.map(s => ({
      title: s.title,
      signal_type: s.type,
      industry: s.sectorLabel ?? s.entityName ?? 'General',
      company: s.entityName ?? null,
      importance: s.priority === 'critical' ? 0.9 : s.priority === 'high' ? 0.7 : 0.5,
      discovered_at: s.detectedAt,
    }));

    return NextResponse.json(
      {
        ok: true,
        signals,
        findings: signals,
        sectorScores: engine.sectorScores,
        activeVendorIds: engine.activeVendorIds,
        clusterCount: engine.clusters.length,
        detectedAt: engine.detectedAt,
        feedAsOf: store.as_of,
        source: 'memory',
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : 'Signal engine failed.',
        signals: [],
        findings: [],
        sectorScores: [],
        activeVendorIds: [],
        source: 'error',
      },
      { status: 500 },
    );
  }
}
