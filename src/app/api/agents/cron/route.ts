import { NextResponse } from 'next/server';

import { orchestrator } from '@/lib/agents/orchestrator';
import { runIntelDiscoveryAgent } from '@/lib/agents/agents/intel-discovery-agent';
import { runProductDiscoveryAgent } from '@/lib/agents/agents/product-discovery-agent';
import { runConferenceIntelAgent } from '@/lib/agents/agents/conference-intel-agent';
import { runEntityAgent } from '@/lib/agents/agents/entity-agent';
import { runInsightAgent } from '@/lib/agents/agents/insight-agent';
import { runIntelligenceLoop } from '@/lib/agents/os';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
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

  // Phase 2: Run the Agent OS intelligence loop
  // Observe → Structure → Analyze → Create → Publish → Audit
  const pipeline = await runIntelligenceLoop().catch(err => {
    console.error('[cron] Intelligence loop failed:', err);
    return null;
  });

  // Phase 3: Generate insights from freshly collected signals
  const insightResult = await runInsightAgent().catch(err => {
    console.error('[cron] Insight agent failed:', err);
    return null;
  });

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    // Legacy agent results
    intel_signals: intel ? intel.signals.length : 0,
    products_discovered: products ? products.total_discovered : 0,
    conference_signals: confIntel ? confIntel.signals_detected : 0,
    graph_entities: entityResult ? entityResult.entities_created : 0,
    graph_relationships: entityResult ? entityResult.relationships_created : 0,
    insights_generated: insightResult ? insightResult.insights.length : 0,
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
