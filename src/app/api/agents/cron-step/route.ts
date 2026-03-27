/**
 * GET /api/agents/cron-step?agent=<name>
 *
 * Runs a SINGLE agent per request (fits within Vercel's 60s limit).
 * Called by GitHub Actions in sequence instead of the monolithic /api/agents/cron.
 *
 * Agents:
 *   Phase 1 (Discovery):
 *     orchestrator, intel-discovery, product-discovery, conference-intel,
 *     entity, patent-discovery, startup-discovery, research-discovery,
 *     supply-chain, disruption-monitor, persist-kg
 *
 *   Phase 2 (Processing):
 *     intel-curation, auto-discovery, graph-builder
 *
 *   Phase 3 (Intelligence):
 *     intelligence-loop, insight, country-activity, continent-intel
 *
 *   Phase 4 (Learning):
 *     iker-learn, ceo-briefing, prediction-outcomes
 */

import { NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/http/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = requireCronSecret(request.headers);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const agent = searchParams.get('agent');
  const timestamp = new Date().toISOString();

  if (!agent) {
    return NextResponse.json(
      { ok: false, message: 'Missing ?agent= parameter' },
      { status: 400 },
    );
  }

  try {
    const result = await runAgent(agent);
    return NextResponse.json({ ok: true, agent, timestamp, ...result });
  } catch (err) {
    console.error(`[cron-step] Agent "${agent}" failed:`, err);
    return NextResponse.json(
      { ok: false, agent, timestamp, error: String(err) },
      { status: 500 },
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runAgent(agent: string): Promise<Record<string, any>> {
  switch (agent) {
    // ── Phase 1: Discovery ──────────────────────────────────────────────
    case 'orchestrator': {
      const { orchestrator } = await import('@/lib/agents/orchestrator');
      const { loadLearningFromSupabase } = await import('@/lib/agents/swarm/learning');
      const loaded = await loadLearningFromSupabase().catch(() => ({ patterns: 0, iker: 0, clusters: 0 }));
      await orchestrator.run({ trigger: 'hourly' });
      return { learning_loaded: loaded };
    }

    case 'intel-discovery': {
      const { runIntelDiscoveryAgent } = await import('@/lib/agents/agents/intel-discovery-agent');
      const intel = await runIntelDiscoveryAgent();
      return { signals: intel?.signals.length ?? 0 };
    }

    case 'product-discovery': {
      const { runProductDiscoveryAgent } = await import('@/lib/agents/agents/product-discovery-agent');
      const products = await runProductDiscoveryAgent();
      return { products_discovered: products?.total_discovered ?? 0 };
    }

    case 'conference-intel': {
      const { runConferenceIntelAgent } = await import('@/lib/agents/agents/conference-intel-agent');
      const conf = await runConferenceIntelAgent();
      return { signals_detected: conf?.signals_detected ?? 0 };
    }

    case 'entity': {
      const { runEntityAgent } = await import('@/lib/agents/agents/entity-agent');
      const e = await runEntityAgent();
      return { entities_created: e?.entities_created ?? 0, relationships: e?.relationships_created ?? 0 };
    }

    case 'patent-discovery': {
      const { runPatentDiscoveryAgent } = await import('@/lib/agents/agents/patent-discovery-agent');
      const patents = await runPatentDiscoveryAgent();
      return { patents_detected: patents?.total_patents_detected ?? 0 };
    }

    case 'startup-discovery': {
      const { runStartupDiscoveryAgent } = await import('@/lib/agents/agents/startup-discovery-agent');
      const startups = await runStartupDiscoveryAgent();
      return { startups_detected: startups?.total_startups_detected ?? 0, funding_usd: startups?.total_funding_detected_usd ?? 0 };
    }

    case 'research-discovery': {
      const { runResearchDiscoveryAgent } = await import('@/lib/agents/agents/research-discovery-agent');
      const research = await runResearchDiscoveryAgent();
      return { research_detected: research?.total_research_detected ?? 0 };
    }

    case 'supply-chain': {
      const { runSupplyChainAgent } = await import('@/lib/agents/agents/supply-chain-agent');
      const sc = await runSupplyChainAgent();
      return { disruptions: sc?.total_disruptions_detected ?? 0, critical: sc?.critical_count ?? 0 };
    }

    case 'disruption-monitor': {
      const { runDisruptionMonitorAgent } = await import('@/lib/agents/agents/disruption-monitor-agent');
      const d = await runDisruptionMonitorAgent();
      return { disruptions: d?.total_disruptions ?? 0, p0: d?.p0_count ?? 0, p1: d?.p1_count ?? 0 };
    }

    case 'persist-kg': {
      // Re-run the specialized agents that produce persistable results, then persist.
      // This is intentionally lightweight — agents use in-memory caches from earlier calls.
      const { runPatentDiscoveryAgent } = await import('@/lib/agents/agents/patent-discovery-agent');
      const { runStartupDiscoveryAgent } = await import('@/lib/agents/agents/startup-discovery-agent');
      const { runResearchDiscoveryAgent } = await import('@/lib/agents/agents/research-discovery-agent');
      const { runSupplyChainAgent } = await import('@/lib/agents/agents/supply-chain-agent');
      const { runDisruptionMonitorAgent } = await import('@/lib/agents/agents/disruption-monitor-agent');
      const { persistCronResults } = await import('@/lib/agents/persist/cron-persist');

      const [patents, startups, research, supplyChain, disruptions] = await Promise.all([
        runPatentDiscoveryAgent().catch(() => null),
        runStartupDiscoveryAgent().catch(() => null),
        runResearchDiscoveryAgent().catch(() => null),
        runSupplyChainAgent().catch(() => null),
        runDisruptionMonitorAgent().catch(() => null),
      ]);

      const p = await persistCronResults({ patents, startups, research, supplyChain, disruptions });
      return { persisted: p.persisted, errors: p.errors.length };
    }

    // ── Phase 2: Processing ─────────────────────────────────────────────
    case 'intel-curation': {
      const { runIntelDiscoveryAgent } = await import('@/lib/agents/agents/intel-discovery-agent');
      const { runIntelCurationAgent } = await import('@/lib/agents/agents/intel-curation-agent');
      const intel = await runIntelDiscoveryAgent().catch(() => null);
      const signals = intel?.signals ?? [];
      const c = await runIntelCurationAgent(signals);
      return {
        published: c?.totalPublished ?? 0,
        hidden: c?.hiddenAsNoise ?? 0,
        hero: c?.homepageHero?.length ?? 0,
        trending: c?.homepageTrending?.length ?? 0,
      };
    }

    case 'auto-discovery': {
      const { runIntelDiscoveryAgent } = await import('@/lib/agents/agents/intel-discovery-agent');
      const { runAutoDiscovery } = await import('@/lib/agents/autonomous/auto-entity-registry');
      const intel = await runIntelDiscoveryAgent().catch(() => null);
      const signals = intel?.signals ?? [];
      if (signals.length < 5) return { skipped: true, reason: 'too_few_signals' };

      const geminiKey = process.env.GEMINI_API_KEY;
      const clusterMap = new Map<string, typeof signals>();
      for (const sig of signals) {
        const key = sig.company?.toLowerCase() ?? 'unknown';
        const arr = clusterMap.get(key) ?? [];
        arr.push(sig);
        clusterMap.set(key, arr);
      }
      const clusters = Array.from(clusterMap.entries() as Iterable<[string, typeof signals]>)
        .filter(([, arr]) => arr.length >= 2)
        .map(([, arr], idx) => ({
          id: `auto-${idx}`,
          headline: arr[0].title,
          articles: arr.map(s => ({
            title: s.title,
            description: s.evidence ?? '',
            source: s.source ?? '',
            link: s.url ?? '',
            pubDate: s.discoveredAt ?? new Date().toISOString(),
            category: s.industry ?? 'general',
          })),
          sourceTiers: arr.map(() => 2),
          topTier: 2,
          velocity: 0,
          velocityLevel: 'normal' as const,
          entities: [],
          sectors: [],
          hasContractSignal: false,
          hasSecuritySignal: false,
          similarity: 0,
          clusterLabel: arr[0].company ?? 'Unknown',
          clusterSize: arr.length,
        }));
      const r = await runAutoDiscovery(clusters as never[], geminiKey);
      return { detected: r?.detected ?? 0, enriched: r?.enriched ?? 0, registered: r?.registered ?? 0 };
    }

    case 'graph-builder': {
      const { runGraphBuilderAgent } = await import('@/lib/agents/agents/graph-builder-agent');
      const g = await runGraphBuilderAgent({ enableAutoDiscovery: true });
      return { entities: g?.entities_created ?? 0, relationships: g?.relationships_created ?? 0, signals_processed: g?.signals_processed ?? 0 };
    }

    // ── Phase 3: Intelligence ───────────────────────────────────────────
    case 'intelligence-loop': {
      const { runIntelligenceLoop } = await import('@/lib/agents/os');
      const p = await runIntelligenceLoop();
      return p ? {
        run_id: p.run_id,
        duration_ms: p.duration_ms,
        events: p.events_total,
        tasks: p.tasks_total,
        errors: p.errors.length,
      } : { skipped: true };
    }

    case 'insight': {
      const { runInsightAgent } = await import('@/lib/agents/agents/insight-agent');
      const i = await runInsightAgent();
      return { insights_generated: i?.insights.length ?? 0 };
    }

    case 'country-activity': {
      const { updateCountryActivity } = await import('@/db/queries/country-activity');
      const count = await updateCountryActivity();
      return { countries_updated: count };
    }

    case 'continent-intel': {
      const { runIntelDiscoveryAgent } = await import('@/lib/agents/agents/intel-discovery-agent');
      const { runContinentIntelAgent } = await import('@/lib/agents/agents/continent-intel-agent');
      const { upsertContinentActivity } = await import('@/db/queries/continent-activity');
      const intel = await runIntelDiscoveryAgent().catch(() => null);
      const signals = intel?.signals ?? [];
      const report = runContinentIntelAgent(signals);
      let updated = 0;
      for (const r of report.continentReports) {
        const ok = await upsertContinentActivity(r).catch(() => false);
        if (ok) updated++;
      }
      return { continents_updated: updated, signals_routed: report.totalSignalsRouted };
    }

    // ── Phase 4: Learning ───────────────────────────────────────────────
    case 'iker-learn': {
      const { runIntelDiscoveryAgent } = await import('@/lib/agents/agents/intel-discovery-agent');
      const {
        loadLearningFromSupabase,
        persistLearningToSupabase,
        batchUpdateIkerScores,
        detectEmergingClusters,
        recordPatternMatch,
        markLearnRun,
      } = await import('@/lib/agents/swarm/learning');
      type SignalFindingLocal = import('@/lib/intelligence/signal-engine').SignalFinding;
      type SignalTypeLocal = import('@/lib/intelligence/signal-engine').SignalType;

      await loadLearningFromSupabase().catch(() => null);
      const intel = await runIntelDiscoveryAgent().catch(() => null);
      const rawSignals = intel?.signals ?? [];

      const adaptedSignals: SignalFindingLocal[] = rawSignals.map(s => ({
        id: s.id,
        type: (s.type as SignalTypeLocal) ?? 'vendor_mention',
        priority: 'normal' as const,
        title: s.title,
        description: s.evidence ?? '',
        whyItMatters: '',
        actionableInsight: '',
        entityId: s.company?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        entityName: s.company ?? undefined,
        sectorId: s.industry?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        sectorLabel: s.industry,
        articleCount: 1,
        sources: s.source ? [s.source] : [],
        confidence: s.confidence,
        detectedAt: new Date().toISOString(),
        articles: [],
      }));

      let ikerUpdates = 0;
      let learnPersisted = { patterns: 0, iker: 0, clusters: 0 };

      if (adaptedSignals.length > 0) {
        for (const sector of ['defense', 'ai-ml', 'cybersecurity', 'logistics', 'energy', 'manufacturing']) {
          const sectorSignals = adaptedSignals.filter(s =>
            (s.sectorId ?? '').includes(sector.replace('-', '')),
          );
          if (sectorSignals.length >= 2) {
            recordPatternMatch(sectorSignals, sector);
          }
        }
        const ikerResult = batchUpdateIkerScores(adaptedSignals);
        ikerUpdates = ikerResult.length;
        detectEmergingClusters(adaptedSignals);
        markLearnRun();
        learnPersisted = await persistLearningToSupabase().catch(() => ({ patterns: 0, iker: 0, clusters: 0 }));
      }

      // Fire-and-forget alert scan
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
      void fetch(`${siteUrl}/api/alerts/matches`, { method: 'POST' }).catch(() => null);

      return { iker_updates: ikerUpdates, ...learnPersisted };
    }

    case 'ceo-briefing': {
      const { ceoAgent } = await import('@/lib/agents/ceo-agent');
      const b = await ceoAgent.runDailyBriefing();
      return b ? {
        run_id: b.runId,
        goals_set: b.goalsSet,
        goals_completed: b.goalsCompleted,
        health: b.platformHealthStatus,
        top_findings: b.topFindings,
      } : { skipped: true };
    }

    case 'prediction-outcomes': {
      const { runIntelDiscoveryAgent } = await import('@/lib/agents/agents/intel-discovery-agent');
      const { getPredictionsReadyToMeasure, recordOutcome } = await import('@/db/queries/prediction-outcomes');
      type SignalFindingLocal = import('@/lib/intelligence/signal-engine').SignalFinding;
      type SignalTypeLocal = import('@/lib/intelligence/signal-engine').SignalType;

      const intel = await runIntelDiscoveryAgent().catch(() => null);
      const rawSignals = intel?.signals ?? [];
      const adaptedSignals: SignalFindingLocal[] = rawSignals.map(s => ({
        id: s.id,
        type: (s.type as SignalTypeLocal) ?? 'vendor_mention',
        priority: 'normal' as const,
        title: s.title,
        description: s.evidence ?? '',
        whyItMatters: '',
        actionableInsight: '',
        entityId: s.company?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        entityName: s.company ?? undefined,
        sectorId: s.industry?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        sectorLabel: s.industry,
        articleCount: 1,
        sources: s.source ? [s.source] : [],
        confidence: s.confidence,
        detectedAt: new Date().toISOString(),
        articles: [],
      }));

      const unmeasured = await getPredictionsReadyToMeasure(20).catch(() => []);
      let measured = 0;
      for (const pred of unmeasured) {
        const entitySignals = adaptedSignals.filter(s => s.entityId === pred.entity_id);
        const actualScore = entitySignals.length > 0
          ? Math.min(1, pred.predicted_score + entitySignals.length * 0.05)
          : Math.max(0, pred.predicted_score - 0.1);
        await recordOutcome(pred.id, actualScore).catch(() => null);
        measured++;
      }
      return { outcomes_measured: measured };
    }

    default:
      throw new Error(`Unknown agent: "${agent}"`);
  }
}
