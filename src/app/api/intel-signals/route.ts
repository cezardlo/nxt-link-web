export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getStoredFeedItems, runFeedAgent } from '@/lib/agents/feed-agent';
import { runSignalEngine } from '@/lib/intelligence/signal-engine';
import { getIntelSignals, getIntelSignalStats } from '@/db/queries/intel-signals';
import { isSupabaseConfigured } from '@/db/client';


const STALE_MS = 4 * 60 * 60 * 1000;

// Seed signals — always available even on cold start / no Supabase / no feed cache
// signal_type uses the 6-track system: technology, product, discovery, direction, who, connection
const SEED_SIGNALS = [
  { title: 'DOD awards $2.3B in next-gen missile defense contracts across border region', signal_type: 'product', industry: 'Defense', company: 'RTX Raytheon', importance: 0.92, discovered_at: new Date().toISOString() },
  { title: 'NVIDIA DGX shipments to Fort Bliss AI research lab confirmed for Q2', signal_type: 'technology', industry: 'AI/ML', company: 'NVIDIA', importance: 0.88, discovered_at: new Date().toISOString() },
  { title: 'El Paso Electric files $400M grid modernization plan with Texas PUC', signal_type: 'direction', industry: 'Energy', company: 'El Paso Electric', importance: 0.85, discovered_at: new Date().toISOString() },
  { title: 'CrowdStrike Falcon deployment mandated across all FORSCOM installations', signal_type: 'product', industry: 'Cybersecurity', company: 'CrowdStrike', importance: 0.83, discovered_at: new Date().toISOString() },
  { title: 'Cross-border trade volume at BOTA port hits 18-month high', signal_type: 'discovery', industry: 'Supply Chain', company: null, importance: 0.80, discovered_at: new Date().toISOString() },
  { title: 'UTEP secures $12M NSF grant for autonomous vehicle testing corridor', signal_type: 'discovery', industry: 'AI/ML', company: 'UTEP', importance: 0.78, discovered_at: new Date().toISOString() },
  { title: 'L3Harris expands El Paso C4ISR facility, adding 200 engineering positions', signal_type: 'who', industry: 'Defense', company: 'L3Harris', importance: 0.82, discovered_at: new Date().toISOString() },
  { title: 'Palantir Foundry selected for CBP border analytics modernization', signal_type: 'product', industry: 'Defense', company: 'Palantir', importance: 0.86, discovered_at: new Date().toISOString() },
  { title: 'Schneider Electric EcoStruxure deployed at new Foxconn PCB facility', signal_type: 'technology', industry: 'Manufacturing', company: 'Schneider Electric', importance: 0.74, discovered_at: new Date().toISOString() },
  { title: 'SBA approves $8M in SBIR awards for El Paso defense startups', signal_type: 'connection', industry: 'Defense', company: null, importance: 0.76, discovered_at: new Date().toISOString() },
  { title: 'Benchmark Electronics reports 22% revenue increase from defense contracts', signal_type: 'direction', industry: 'Manufacturing', company: 'Benchmark Electronics', importance: 0.72, discovered_at: new Date().toISOString() },
  { title: 'Shield AI Hivemind autonomous drone system completes Fort Bliss evaluation', signal_type: 'technology', industry: 'Defense', company: 'Shield AI', importance: 0.84, discovered_at: new Date().toISOString() },
  { title: 'Anduril Lattice selected for Army base perimeter security upgrade', signal_type: 'product', industry: 'Defense', company: 'Anduril', importance: 0.81, discovered_at: new Date().toISOString() },
  { title: 'Texas workforce commission allocates $5M for El Paso cybersecurity training', signal_type: 'direction', industry: 'Cybersecurity', company: null, importance: 0.70, discovered_at: new Date().toISOString() },
  { title: 'Amazon announces second fulfillment center in Horizon City industrial zone', signal_type: 'who', industry: 'Supply Chain', company: 'Amazon', importance: 0.77, discovered_at: new Date().toISOString() },
];

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
            .catch((err) => console.warn('[IntelSignals] runIntelDiscoveryAgent failed:', err));
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
      runFeedAgent().catch((err) => console.warn('[IntelSignals] runFeedAgent failed:', err));
      // Return seed signals so the homepage always has content during warm-up
      return NextResponse.json(
        {
          ok: true,
          signals: SEED_SIGNALS,
          findings: SEED_SIGNALS,
          sectorScores: [],
          activeVendorIds: [],
          clusterCount: 0,
          detectedAt: new Date().toISOString(),
          feedAsOf: null,
          warming: true,
          source: 'seed',
        },
        { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
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
    // Even on error, return seed signals so the UI never shows empty
    return NextResponse.json(
      {
        ok: true,
        message: err instanceof Error ? err.message : 'Signal engine failed, showing seed data.',
        signals: SEED_SIGNALS,
        findings: SEED_SIGNALS,
        sectorScores: [],
        activeVendorIds: [],
        source: 'seed',
      },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
    );
  }
}
