import { NextResponse } from 'next/server';

import { orchestrator } from '@/lib/agents/orchestrator';
import { runIntelDiscoveryAgent } from '@/lib/agents/agents/intel-discovery-agent';
import { runIntelCurationAgent } from '@/lib/agents/agents/intel-curation-agent';
import { runProductDiscoveryAgent } from '@/lib/agents/agents/product-discovery-agent';
import { runConferenceIntelAgent } from '@/lib/agents/agents/conference-intel-agent';
import { runEntityAgent } from '@/lib/agents/agents/entity-agent';
import { runGraphBuilderAgent } from '@/lib/agents/agents/graph-builder-agent';
import { runInsightAgent } from '@/lib/agents/agents/insight-agent';
import { runIntelligenceLoop } from '@/lib/agents/os';
import { updateCountryActivity } from '@/db/queries/country-activity';
import { runContinentIntelAgent } from '@/lib/agents/agents/continent-intel-agent';
import { upsertContinentActivity } from '@/db/queries/continent-activity';
import { runAutoDiscovery } from '@/lib/agents/autonomous/auto-entity-registry';
import { runPatentDiscoveryAgent } from '@/lib/agents/agents/patent-discovery-agent';
import { runStartupDiscoveryAgent } from '@/lib/agents/agents/startup-discovery-agent';
import { runResearchDiscoveryAgent } from '@/lib/agents/agents/research-discovery-agent';
import { runSupplyChainAgent } from '@/lib/agents/agents/supply-chain-agent';
import { runDisruptionMonitorAgent } from '@/lib/agents/agents/disruption-monitor-agent';
import { persistCronResults } from '@/lib/agents/persist/cron-persist';
import {
  loadLearningFromSupabase,
  persistLearningToSupabase,
  batchUpdateIkerScores,
  detectEmergingClusters,
  recordPatternMatch,
  markLearnRun,
} from '@/lib/agents/swarm/learning';
import type { SignalFinding, SignalType } from '@/lib/intelligence/signal-engine';
import { getPredictionsReadyToMeasure, recordOutcome } from '@/db/queries/prediction-outcomes';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  // Optional CRON_SECRET protection — skipped if no secret is configured
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const provided =
      request.headers.get('x-cron-secret') ??
      new URL(request.url).searchParams.get('secret') ??
      // Vercel cron sends Authorization: Bearer <secret>
      request.headers.get('authorization')?.replace('Bearer ', '');
    if (provided !== expected) {
      return new Response('Unauthorized', { status: 401 });
    }
  }
  // Phase 0: Load persisted learning state from Supabase into memory
  // This warms the in-memory pattern store so learning accumulates across runs
  const loaded = await loadLearningFromSupabase().catch(() => ({ patterns: 0, iker: 0, clusters: 0 }));

  // Phase 1: Run legacy discovery agents in parallel
  const [, intel, products, confIntel, entityResult] = await Promise.all([
    orchestrator.run({ trigger: 'hourly' }),

    runIntelDiscoveryAgent().catch(err => {
      console.error('[cron] Intel discovery failed:', err);
      return null;
    }),

    runProductDiscoveryAgent().catch(err => {
      console.error('[cron] Product discovery failed:', err);
      return null;
    }),

    runConferenceIntelAgent().catch(err => {
      console.error('[cron] Conference intel failed:', err);
      return null;
    }),

    runEntityAgent().catch(err => {
      console.error('[cron] Entity agent failed:', err);
      return null;
    }),
  ]);

  // Phase 1.3: Run specialized discovery agents in parallel
  const [patents, startups, research, supplyChain, disruptions] = await Promise.all([
    runPatentDiscoveryAgent().catch(err => {
      console.error('[cron] Patent discovery failed:', err);
      return null;
    }),
    runStartupDiscoveryAgent().catch(err => {
      console.error('[cron] Startup discovery failed:', err);
      return null;
    }),
    runResearchDiscoveryAgent().catch(err => {
      console.error('[cron] Research discovery failed:', err);
      return null;
    }),
    runSupplyChainAgent().catch(err => {
      console.error('[cron] Supply chain agent failed:', err);
      return null;
    }),
    runDisruptionMonitorAgent().catch(err => {
      console.error('[cron] Disruption monitor failed:', err);
      return null;
    }),
  ]);

  // Phase 1.4: Persist specialized agent results to knowledge graph tables
  const cronPersistence = await persistCronResults({
    patents,
    startups,
    research,
    supplyChain,
    disruptions,
  }).catch(err => {
    console.error('[cron] Persistence to KG tables failed:', err);
    return { persisted: 0, errors: [String(err)] };
  });

  // Phase 1.5: Run Intel Curation Agent (Gemini-powered department)
  // Takes discovery signals and curates them into a structured brief
  const curationResult = await runIntelCurationAgent(intel?.signals ?? []).catch(err => {
    console.error('[cron] Intel curation failed:', err);
    return null;
  });

  // Phase 1.6: Auto-Discovery — detect unknown companies from signals
  // Build pseudo-ArticleCluster[] from intel signals for candidate detection
  const autoDiscoveryResult = await (async () => {
    const signals = intel?.signals ?? [];
    if (signals.length < 5) return null;
    const geminiKey = process.env.GEMINI_API_KEY;
    // Group signals by company and build minimal cluster shapes
    const clusterMap = new Map<string, typeof signals>();
    for (const sig of signals) {
      const key = sig.company?.toLowerCase() ?? 'unknown';
      const arr = clusterMap.get(key) ?? [];
      arr.push(sig);
      clusterMap.set(key, arr);
    }
    // Cast to ArticleCluster — detectCandidateEntities only reads articles[].title + description
    const clusters = Array.from(clusterMap.values())
      .filter(arr => arr.length >= 2)
      .map((arr, idx) => ({
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
    return runAutoDiscovery(clusters as never[], geminiKey).catch(err => {
      console.error('[cron] Auto-discovery failed:', err);
      return null;
    });
  })();

  // Phase 2: Build knowledge graph from newly discovered signals
  const graphResult = await runGraphBuilderAgent({ enableAutoDiscovery: true }).catch(err => {
    console.error('[cron] Graph builder failed:', err);
    return null;
  });

  // Phase 3: Run the Agent OS intelligence loop
  // Observe → Structure → Analyze → Create → Publish → Audit
  const pipeline = await runIntelligenceLoop().catch(err => {
    console.error('[cron] Intelligence loop failed:', err);
    return null;
  });

  // Phase 4: Generate insights from freshly collected signals
  const insightResult = await runInsightAgent().catch(err => {
    console.error('[cron] Insight agent failed:', err);
    return null;
  });

  // Phase 5: Update country activity heat map
  const countryCount = await updateCountryActivity().catch(err => {
    console.error('[cron] Country activity update failed:', err);
    return 0;
  });

  // Phase 5.5: Continent intelligence — bucket signals into 5 regional departments
  const continentReport = runContinentIntelAgent(intel?.signals ?? []);
  let continentsUpdated = 0;
  for (const report of continentReport.continentReports) {
    const ok = await upsertContinentActivity(report).catch(() => false);
    if (ok) continentsUpdated++;
  }

  // Phase 6: Learning — update IKER scores + detect patterns from new signals
  // Adapt IntelSignal[] → minimal SignalFinding[] for learning functions
  const rawSignals = intel?.signals ?? [];
  const adaptedSignals: SignalFinding[] = rawSignals.map(s => ({
    id: s.id,
    type: (s.type as SignalType) ?? 'vendor_mention',
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

  // Phase 7.5: Scan new signals against alert rules (fire-and-forget)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  void fetch(`${siteUrl}/api/alerts/matches`, { method: 'POST' }).catch(() => null);

  // Phase 6.5: CEO Agent — run daily briefing + monitor platform health
  // This orchestrates all specialist agents and stores status in shared memory
  const { ceoAgent } = await import('@/lib/agents/ceo-agent');
  const dailyBriefing = await ceoAgent.runDailyBriefing().catch(err => {
    console.error('[cron] CEO daily briefing failed:', err);
    return null;
  });

  // Phase 7: Measure prediction outcomes (close the learning loop)
  const unmeasured = await getPredictionsReadyToMeasure(20).catch(() => []);
  let outcomesMeasured = 0;
  for (const pred of unmeasured) {
    const entitySignals = adaptedSignals.filter(s =>
      s.entityId === pred.entity_id,
    );
    const actualScore = entitySignals.length > 0
      ? Math.min(1, pred.predicted_score + (entitySignals.length * 0.05))
      : Math.max(0, pred.predicted_score - 0.1);
    await recordOutcome(pred.id, actualScore).catch(() => null);
    outcomesMeasured++;
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    // Legacy agent results
    intel_signals: intel ? intel.signals.length : 0,
    products_discovered: products ? products.total_discovered : 0,
    conference_signals: confIntel ? confIntel.signals_detected : 0,
    graph_entities: (entityResult?.entities_created ?? 0) + (graphResult?.entities_created ?? 0),
    graph_relationships: (entityResult?.relationships_created ?? 0) + (graphResult?.relationships_created ?? 0),
    graph_signals_processed: graphResult?.signals_processed ?? 0,
    insights_generated: insightResult ? insightResult.insights.length : 0,
    countries_updated: countryCount,
    learning_loaded: loaded,
    iker_updates: ikerUpdates,
    patterns_persisted: learnPersisted.patterns,
    iker_persisted: learnPersisted.iker,
    clusters_persisted: learnPersisted.clusters,
    outcomes_measured: outcomesMeasured,
    // Curation + Auto-discovery results
    curation: curationResult ? {
      published: curationResult.totalPublished,
      hidden: curationResult.hiddenAsNoise,
      hero: curationResult.homepageHero.length,
      trending: curationResult.homepageTrending.length,
      patterns: curationResult.topPatterns.length,
    } : null,
    auto_discovery: autoDiscoveryResult ? {
      detected: autoDiscoveryResult.detected,
      enriched: autoDiscoveryResult.enriched,
      registered: autoDiscoveryResult.registered,
      new_entities: autoDiscoveryResult.newEntities.map(e => e.name),
    } : null,
    // Knowledge graph persistence
    kg_persisted: cronPersistence.persisted,
    kg_errors: cronPersistence.errors.length,
    // Specialized discovery agents
    patents_detected: patents?.total_patents_detected ?? 0,
    startups_detected: startups?.total_startups_detected ?? 0,
    startups_funding_usd: startups?.total_funding_detected_usd ?? 0,
    research_detected: research?.total_research_detected ?? 0,
    supply_chain_disruptions: supplyChain?.total_disruptions_detected ?? 0,
    supply_chain_critical: supplyChain?.critical_count ?? 0,
    global_disruptions: disruptions?.total_disruptions ?? 0,
    disruptions_p0: disruptions?.p0_count ?? 0,
    disruptions_p1: disruptions?.p1_count ?? 0,
    // Continent intelligence results
    continent_intel: {
      continents_updated: continentsUpdated,
      total_signals_routed: continentReport.totalSignalsRouted,
      reports: continentReport.continentReports.map(r => ({
        id: r.continentId,
        label: r.label,
        signals: r.signalsTotal,
        heat: r.heatScore,
        trend: r.trendDirection,
        top_industry: r.topIndustries[0] ?? null,
      })),
    },
    // CEO Agent daily briefing results
    daily_briefing: dailyBriefing ? {
      run_id: dailyBriefing.runId,
      goals_set: dailyBriefing.goalsSet,
      goals_completed: dailyBriefing.goalsCompleted,
      platform_health: dailyBriefing.platformHealthStatus,
      top_findings: dailyBriefing.topFindings,
      duration_ms: dailyBriefing.durationMs,
    } : null,
    // Agent OS pipeline results
    pipeline: pipeline ? {
      run_id: pipeline.run_id,
      duration_ms: pipeline.duration_ms,
      events_total: pipeline.events_total,
      tasks_total: pipeline.tasks_total,
      errors: pipeline.errors.length,
      layers: Object.fromEntries(
        Object.entries(pipeline.layers).map(([k, v]) => [k, v.status])
      ),
    } : null,
  });
}
