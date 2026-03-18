// src/app/api/intelligence/enriched-signals/route.ts
// GET /api/intelligence/enriched-signals
//
// Returns the top 20 enriched intelligence signals (importance >= 0.7).
// Each signal carries LLM-generated "so_what" and "whats_next" analysis fields.
//
// Cache strategy: 15-minute in-memory cache. Rate limited at 30 req/min per IP.

import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getStoredFeedItems, runFeedAgent } from '@/lib/agents/feed-agent';
import { runSignalEngine } from '@/lib/intelligence/signal-engine';
import { enrichSignals, type EnrichedSignal } from '@/lib/engines/signal-enrichment-engine';
import { getIntelSignals } from '@/db/queries/intel-signals';
import { isSupabaseConfigured } from '@/db/client';

export const dynamic = 'force-dynamic';

// ─── 15-minute in-process cache ───────────────────────────────────────────────

type CacheEntry = {
  signals: EnrichedSignal[];
  cachedAt: number;
};

let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function isCacheFresh(): boolean {
  return cache !== null && Date.now() - cache.cachedAt < CACHE_TTL_MS;
}

// ─── Signal normalisation ─────────────────────────────────────────────────────

type NormalisedSignal = {
  id: string;
  title: string;
  industry: string;
  company?: string;
  type: string;
  importance: number;
  evidence?: string;
};

function normaliseSignals(raw: NormalisedSignal[]): NormalisedSignal[] {
  return raw
    .filter((s) => s.importance >= 0.7)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 20);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({
    key: `enriched-signals:${ip}`,
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  // Serve from cache if fresh
  if (isCacheFresh()) {
    return NextResponse.json(
      { ok: true, data: cache!.signals, cached: true, cachedAt: new Date(cache!.cachedAt).toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const raw: NormalisedSignal[] = [];

    // 1. Supabase persisted signals (survive restarts)
    if (isSupabaseConfigured()) {
      const dbSignals = await getIntelSignals({ limit: 100 });
      if (dbSignals.length > 0) {
        for (const s of dbSignals) {
          raw.push({
            id: s.id ?? `db-${Math.random().toString(36).slice(2)}`,
            title: s.title,
            industry: s.industry ?? 'General',
            company: s.company ?? undefined,
            type: s.signal_type ?? 'general',
            importance: s.importance_score ?? 0,
            evidence: s.url ?? undefined,
          });
        }
      }
    }

    // 2. In-memory feed cache fallback
    if (raw.length === 0) {
      const store = getStoredFeedItems();
      if (!store) {
        // Trigger warm-up in the background; return empty with warming flag
        runFeedAgent().catch(() => {});
        return NextResponse.json(
          {
            ok: true,
            data: [],
            cached: false,
            warming: true,
            message: 'Feed data is warming up — try again in 30 seconds.',
          },
          { headers: { 'Cache-Control': 'no-store' } },
        );
      }

      const engine = runSignalEngine(store.items);
      for (const s of engine.signals) {
        const importance =
          s.priority === 'critical' ? 0.95
          : s.priority === 'high' ? 0.8
          : s.priority === 'elevated' ? 0.65
          : 0.5;

        raw.push({
          id: s.id,
          title: s.title,
          industry: s.sectorLabel ?? s.entityName ?? 'General',
          company: s.entityName ?? undefined,
          type: s.type,
          importance,
          evidence: s.articles[0]?.link,
        });
      }
    }

    const top20 = normaliseSignals(raw);

    if (top20.length === 0) {
      const empty: EnrichedSignal[] = [];
      cache = { signals: empty, cachedAt: Date.now() };
      return NextResponse.json(
        { ok: true, data: empty, cached: false, message: 'No high-importance signals detected.' },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // Enrich with LLM so_what + whats_next
    const enriched = await enrichSignals(top20);

    cache = { signals: enriched, cachedAt: Date.now() };

    return NextResponse.json(
      {
        ok: true,
        data: enriched,
        count: enriched.length,
        cached: false,
        enriched_at: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : 'Signal enrichment failed.',
        data: [],
      },
      { status: 500 },
    );
  }
}
