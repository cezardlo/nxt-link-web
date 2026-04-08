export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/http/cron-auth';

export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Phase 1 — DISCOVERY
// Runs all data-gathering agents in parallel batches.
// ---------------------------------------------------------------------------
async function runPhase1() {
  const {
    orchestrator,
  } = await import('@/lib/agents/orchestrator');
  const { runIntelDiscoveryAgent } = await import('@/lib/agents/agents/intel-discovery-agent');
  const { runProductDiscoveryAgent } = await import('@/lib/agents/agents/product-discovery-agent');
  const { runConferenceIntelAgent } = await import('@/lib/agents/agents/conference-intel-agent');
  const { runEntityAgent } = await import('@/lib/agents/agents/entity-agent');
  const { runPatentDiscoveryAgent } = await import('@/lib/agents/agents/patent-discovery-agent');
  const { runStartupDiscoveryAgent } = await import('@/lib/agents/agents/startup-discovery-agent');
  const { runResearchDiscoveryAgent } = await import('@/lib/agents/agents/research-discovery-agent');
  const { runSupplyChainAgent } = await import('@/lib/agents/agents/supply-chain-agent');
  const { runDisruptionMonitorAgent } = await import('@/lib/agents/agents/disruption-monitor-agent');
  const { persistCronResults } = await import('@/lib/agents/persist/cron-persist');
  const { loadLearningFromSupabase } = await import('@/lib/agents/swarm/learning');

  // Phase 0: warm in-memory learning state
  const loaded = await loadLearningFromSupabase().catch(() => ({ patterns: 0, iker: 0, clusters: 0 }));

  // Phase 1a: primary discovery agents
  const [, intel, products, confIntel, entityResult] = await Promise.all([
    orchestrator.run({ trigger: 'hourly' }).catch(err => {
      console.error('[cron/phase1] Orchestrator failed:', err);
      return null;
    }),
    runIntelDiscoveryAgent().catch(err => {
      console.error('[cron/phase1] Intel discovery failed:', err);
      return null;
    }),
    runProductDiscoveryAgent().catch(err => {
      console.error('[cron/phase1] Product discovery failed:', err);
      return null;
    }),
    runConferenceIntelAgent().catch(err => {
      console.error('[cron/phase1] Conference intel failed:', err);
      return null;
    }),
    runEntityAgent().catch(err => {
      console.error('[cron/phase1] Entity agent failed:', err);
      return null;
    }),
  ]);

  // Phase 1b: specialised discovery agents
  const [patents, startups, research, supplyChain, disruptions] = await Promise.all([
    runPatentDiscoveryAgent().catch(err => {
      console.error('[cron/phase1] Patent discovery failed:', err);
      return null;
    }),
    runStartupDiscoveryAgent().catch(err => {
      console.error('[cron/phase1] Startup discovery failed:', err);
      return null;
    }),
    runResearchDiscoveryAgent().catch(err => {
      console.error('[cron/phase1] Research discovery failed:', err);
      return null;
    }),
    runSupplyChainAgent().catch(err => {
      console.error('[cron/phase1] Supply chain agent failed:', err);
      return null;
    }),
    runDisruptionMonitorAgent().catch(err => {
      console.error('[cron/phase1] Disruption monitor failed:', err);
      return null;
    }),
  ]);

  // Phase 1c: persist specialised results to knowledge-graph tables
  const cronPersistence = await persistCronResults({
    patents,
    startups,
    research,
    supplyChain,
    disruptions,
  }).catch(err => {
    console.error('[cron/phase1] KG persistence failed:', err);
    return { persisted: 0, errors: [String(err)] };
  });

  return {
    phase: 1,
    learning_loaded: loaded,
    intel_signals: intel?.signals.length ?? 0,
    products_discovered: products?.total_discovered ?? 0,
    conference_signals: confIntel?.signals_detected ?? 0,
    entities_created: entityResult?.entities_created ?? 0,
    relationships_created: entityResult?.relationships_created ?? 0,
    patents_detected: patents?.total_patents_detected ?? 0,
    startups_detected: startups?.total_startups_detected ?? 0,
    startups_funding_usd: startups?.total_funding_detected_usd ?? 0,
    research_detected: research?.total_research_detected ?? 0,
    supply_chain_disruptions: supplyChain?.total_disruptions_detected ?? 0,
    supply_chain_critical: supplyChain?.critical_count ?? 0,
    global_disruptions: disruptions?.total_disruptions ?? 0,
    disruptions_p0: disruptions?.p0_count ?? 0,
    disruptions_p1: disruptions?.p1_count ?? 0,
    kg_persisted: cronPersistence.persisted,
    kg_errors: cronPersistence.errors.length,
  };
}

// ---------------------------------------------------------------------------
// Phase 2 — PROCESSING
// Curates the signals discovered in phase 1, runs auto-discovery, builds graph.
// ---------------------------------------------------------------------------
async function runPhase2() {
  const { runIntelDiscoveryAgent } = await import('@/lib/agents/agents/intel-discovery-agent');
  const { runIntelCurationAgent } = await import('@/lib/agents/agents/intel-curation-agent');
  const { runAutoDiscovery } = await import('@/lib/agents/autonomous/auto-entity-registry');
  const { runGraphBuilderAgent } = await import('@/lib/agents/agents/graph-builder-agent');

  // Re-fetch a fresh (cached) intel store so this phase is self-contained
  const intel = await runIntelDiscoveryAgent().catch(err => {
    console.error('[cron/phase2] Intel discovery (re-fetch) failed:', err);
    return null;
  });

  const signals = intel?.signals ?? [];

  // Phase 2a: curation
  const curationResult = await runIntelCurationAgent(signals).catch(err => {
    console.error('[cron/phase2] Intel curation failed:', err);
    return null;
  });

  // Phase 2b: auto-discovery
  const autoDiscoveryResult = await (async () => {
    if (signals.length < 5) return null;
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
    return runAutoDiscovery(clusters as never[], geminiKey).catch(err => {
      console.error('[cron/phase2] Auto-discovery failed:', err);
      return null;
    });
  })();

  // Phase 2c: graph builder
  const graphResult = await runGraphBuilderAgent({ enableAutoDiscovery: true }).catch(err => {
    console.error('[cron/phase2] Graph builder failed:', err);
    return null;
  });

  return {
    phase: 2,
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
      new_entities: autoDiscoveryResult.newEntities.map((e: { name: string }) => e.name),
    } : null,
    graph_entities: graphResult?.entities_created ?? 0,
    graph_relationships: graphResult?.relationships_created ?? 0,
    graph_signals_processed: graphResult?.signals_processed ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Phase 3 — INTELLIGENCE
// Runs the Agent OS loop, insight agent, and geographic heat maps.
// ---------------------------------------------------------------------------
async function runPhase3() {
  const { runIntelligenceLoop } = await import('@/lib/agents/os');
  const { runInsightAgent } = await import('@/lib/agents/agents/insight-agent');
  const { updateCountryActivity } = await import('@/db/queries/country-activity');
  const { runContinentIntelAgent } = await import('@/lib/agents/agents/continent-intel-agent');
  const { upsertContinentActivity } = await import('@/db/queries/continent-activity');
  const { runIntelDiscoveryAgent } = await import('@/lib/agents/agents/intel-discovery-agent');

  // Grab fresh signals for continent routing (cached, so fast)
  const intel = await runIntelDiscoveryAgent().catch(() => null);
  const signals = intel?.signals ?? [];

  // Phase 3a: Agent OS pipeline
  const pipeline = await runIntelligenceLoop().catch(err => {
    console.error('[cron/phase3] Intelligence loop failed:', err);
    return null;
  });

  // Phase 3b: insight agent
  const insightResult = await runInsightAgent().catch(err => {
    console.error('[cron/phase3] Insight agent failed:', err);
    return null;
  });

  // Phase 3c: country activity heat map
  const countryCount = await updateCountryActivity().catch(err => {
    console.error('[cron/phase3] Country activity update failed:', err);
    return 0;
  });

  // Phase 3d: continent intelligence buckets
  const continentReport = runContinentIntelAgent(signals);
  let continentsUpdated = 0;
  for (const report of continentReport.continentReports) {
    const ok = await upsertContinentActivity(report).catch(() => false);
    if (ok) continentsUpdated++;
  }

  return {
    phase: 3,
    pipeline: pipeline ? {
      run_id: pipeline.run_id,
      duration_ms: pipeline.duration_ms,
      events_total: pipeline.events_total,
      tasks_total: pipeline.tasks_total,
      errors: pipeline.errors.length,
      layers: Object.fromEntries(
        Object.entries(pipeline.layers).map(([k, v]) => [k, v.status]),
      ),
    } : null,
    insights_generated: insightResult?.insights.length ?? 0,
    countries_updated: countryCount,
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
  };
}

// ---------------------------------------------------------------------------
// Phase 4 — LEARNING
// Updates IKER scores, detects patterns, runs CEO briefing, measures outcomes.
// ---------------------------------------------------------------------------
async function runPhase4() {
  const { runIntelDiscoveryAgent } = await import('@/lib/agents/agents/intel-discovery-agent');
  const {
    loadLearningFromSupabase,
    persistLearningToSupabase,
    batchUpdateIkerScores,
    detectEmergingClusters,
    recordPatternMatch,
    markLearnRun,
  } = await import('@/lib/agents/swarm/learning');
  const { getPredictionsReadyToMeasure, recordOutcome } = await import('@/db/queries/prediction-outcomes');
  type SignalFindingLocal = import('@/lib/intelligence/signal-engine').SignalFinding;
  type SignalTypeLocal = import('@/lib/intelligence/signal-engine').SignalType;

  // Warm learning state
  await loadLearningFromSupabase().catch(() => null);

  // Get signals (cached)
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

  // Fire-and-forget alert scan (does not count toward the 60s budget)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  void fetch(`${siteUrl}/api/alerts/matches`, { method: 'POST' }).catch(() => null);

  // CEO daily briefing
  const { ceoAgent } = await import('@/lib/agents/ceo-agent');
  const dailyBriefing = await ceoAgent.runDailyBriefing().catch(err => {
    console.error('[cron/phase4] CEO daily briefing failed:', err);
    return null;
  });

  // Measure prediction outcomes
  const unmeasured = await getPredictionsReadyToMeasure(20).catch(() => []);
  let outcomesMeasured = 0;
  for (const pred of unmeasured) {
    const entitySignals = adaptedSignals.filter(s => s.entityId === pred.entity_id);
    const actualScore = entitySignals.length > 0
      ? Math.min(1, pred.predicted_score + entitySignals.length * 0.05)
      : Math.max(0, pred.predicted_score - 0.1);
    await recordOutcome(pred.id, actualScore).catch(() => null);
    outcomesMeasured++;
  }

  return {
    phase: 4,
    iker_updates: ikerUpdates,
    patterns_persisted: learnPersisted.patterns,
    iker_persisted: learnPersisted.iker,
    clusters_persisted: learnPersisted.clusters,
    outcomes_measured: outcomesMeasured,
    daily_briefing: dailyBriefing ? {
      run_id: dailyBriefing.runId,
      goals_set: dailyBriefing.goalsSet,
      goals_completed: dailyBriefing.goalsCompleted,
      platform_health: dailyBriefing.platformHealthStatus,
      top_findings: dailyBriefing.topFindings,
      duration_ms: dailyBriefing.durationMs,
    } : null,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const auth = requireCronSecret(request.headers);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const phase = searchParams.get('phase');

  const timestamp = new Date().toISOString();

  try {
    if (phase === '1') {
      const result = await runPhase1();
      return NextResponse.json({ ok: true, timestamp, ...result });
    }

    if (phase === '2') {
      const result = await runPhase2();
      return NextResponse.json({ ok: true, timestamp, ...result });
    }

    if (phase === '3') {
      const result = await runPhase3();
      return NextResponse.json({ ok: true, timestamp, ...result });
    }

    if (phase === '4') {
      const result = await runPhase4();
      return NextResponse.json({ ok: true, timestamp, ...result });
    }

    // No phase specified — run Phase 1 only (Vercel cron backward compat)
    // Callers should use ?phase=1 through ?phase=4 for full pipeline.
    if (!phase) {
      const result = await runPhase1();
      return NextResponse.json({
        ok: true,
        timestamp,
        note: 'No phase specified — ran phase 1 (discovery) by default. Call ?phase=1 through ?phase=4 sequentially for the full pipeline.',
        ...result,
      });
    }

    return NextResponse.json(
      {
        ok: false,
        message: `Unknown phase "${phase}". Use ?phase=1 (discovery), ?phase=2 (processing), ?phase=3 (intelligence), or ?phase=4 (learning).`,
      },
      { status: 400 },
    );
  } catch (err) {
    console.error('[cron] Unhandled error in phase', phase, err);
    return NextResponse.json(
      { ok: false, message: 'Internal error', error: String(err) },
      { status: 500 },
    );
  }
}
