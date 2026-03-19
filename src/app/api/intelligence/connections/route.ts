// src/app/api/intelligence/connections/route.ts
// GET /api/intelligence/connections
//
// Returns ConnectionReport — ranked chains linking:
//   Signal → Technology → Products → Industries → Target Companies → Vendors
//
// Cache: 15 minutes (server + CDN).
// Falls back gracefully if Supabase is unavailable (uses in-memory feed cache).

import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { buildConnectionsFromApiResponse, type ConnectionReport } from '@/lib/engines/connection-engine';
import { isSupabaseConfigured } from '@/db/client';

export const dynamic = 'force-dynamic';

const CACHE_SECONDS = 15 * 60; // 15 minutes

// ─── Static fallback signals for cold-start / no-Supabase mode ─────────────────

const FALLBACK_SIGNALS = [
  {
    title: 'Army AI/ML pilot program lead awarded at Fort Bliss',
    signal_type: 'contract_award',
    industry: 'Defense',
    company: 'Booz Allen Hamilton',
    importance: 0.85,
    discovered_at: new Date().toISOString(),
  },
  {
    title: 'CBP expands computer vision surveillance at border crossings',
    signal_type: 'contract_award',
    industry: 'Border Security',
    company: 'L3Harris Technologies',
    importance: 0.80,
    discovered_at: new Date().toISOString(),
  },
  {
    title: 'Fort Bliss counter-UAS system deployment contract',
    signal_type: 'contract_award',
    industry: 'Defense',
    company: 'Northrop Grumman',
    importance: 0.78,
    discovered_at: new Date().toISOString(),
  },
  {
    title: 'CMMC compliance deadline drives cybersecurity procurement surge',
    signal_type: 'regulatory_action',
    industry: 'Cybersecurity',
    company: null,
    importance: 0.75,
    discovered_at: new Date().toISOString(),
  },
  {
    title: 'El Paso Electric renewable energy microgrid expansion',
    signal_type: 'facility_expansion',
    industry: 'Energy',
    company: 'El Paso Electric',
    importance: 0.70,
    discovered_at: new Date().toISOString(),
  },
  {
    title: 'Generative AI deployment in Army decision support systems',
    signal_type: 'product_launch',
    industry: 'AI/ML',
    company: null,
    importance: 0.72,
    discovered_at: new Date().toISOString(),
  },
  {
    title: 'Cross-border logistics automation investment in Juarez maquiladora zone',
    signal_type: 'funding_round',
    industry: 'Logistics',
    company: null,
    importance: 0.65,
    discovered_at: new Date().toISOString(),
  },
  {
    title: 'WBAMC Health IT contract renewal — AI diagnostics added to scope',
    signal_type: 'contract_award',
    industry: 'Healthcare',
    company: 'Leidos',
    importance: 0.68,
    discovered_at: new Date().toISOString(),
  },
];

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `connections:${ip}`, maxRequests: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  try {
    let signals = FALLBACK_SIGNALS as Array<{
      title: string;
      signal_type: string;
      industry: string;
      company: string | null;
      importance: number;
      discovered_at: string;
      url?: string | null;
      confidence?: number;
    }>;

    // Attempt to pull live signals from Supabase
    if (isSupabaseConfigured()) {
      try {
        const { getIntelSignals } = await import('@/db/queries/intel-signals');
        const dbSignals = await getIntelSignals({ limit: 80 });
        if (dbSignals.length >= 5) {
          signals = dbSignals.map((s) => ({
            title: s.title,
            signal_type: s.signal_type,
            industry: s.industry,
            company: s.company,
            importance: s.importance_score,
            discovered_at: s.discovered_at,
            url: s.url,
            confidence: s.confidence,
          }));
        }
      } catch {
        // Supabase query failed — fallback signals already set
      }
    } else {
      // Try in-memory feed cache as secondary source
      try {
        const { getStoredFeedItems } = await import('@/lib/agents/feed-agent');
        const { runSignalEngine } = await import('@/lib/intelligence/signal-engine');
        const store = getStoredFeedItems();
        if (store && store.items.length >= 5) {
          const engine = runSignalEngine(store.items);
          const memSignals = engine.signals.map((s) => ({
            title: s.title,
            signal_type: s.type,
            industry: s.sectorLabel ?? s.entityName ?? 'General',
            company: s.entityName ?? null,
            importance:
              s.priority === 'critical' ? 0.9
              : s.priority === 'high' ? 0.7
              : 0.5,
            discovered_at: s.detectedAt,
            url: null as string | null,
            confidence: s.confidence,
          }));
          if (memSignals.length >= 3) {
            signals = memSignals;
          }
        }
      } catch {
        // Use static fallback
      }
    }

    const report: ConnectionReport = buildConnectionsFromApiResponse(signals);

    return NextResponse.json(
      { ok: true, ...report },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 2}`,
        },
      },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : 'Connection engine failed.',
        timestamp: new Date().toISOString(),
        chains: [],
        total_signals_processed: 0,
        total_opportunities: 0,
      },
      { status: 500 },
    );
  }
}
