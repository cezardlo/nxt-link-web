import { NextResponse } from 'next/server';

import { orchestrator } from '@/lib/agents/orchestrator';
import { runIntelDiscoveryAgent } from '@/lib/agents/agents/intel-discovery-agent';
import { runProductDiscoveryAgent } from '@/lib/agents/agents/product-discovery-agent';
import { runConferenceIntelAgent } from '@/lib/agents/agents/conference-intel-agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  // Run all agents in parallel
  const [, intel, products, confIntel] = await Promise.all([
    // Orchestrator: feeds, vendors, swarm pipeline
    orchestrator.run({ trigger: 'hourly' }),

    // Intel discovery: patents, research, case studies, hiring, funding, M&A
    runIntelDiscoveryAgent().catch(err => {
      console.error('[cron] Intel discovery failed:', err);
      return null;
    }),

    // Product discovery: extract machines/solutions from signals + vendors
    runProductDiscoveryAgent().catch(err => {
      console.error('[cron] Product discovery failed:', err);
      return null;
    }),

    // Conference intelligence: companies, tech clusters, trends
    runConferenceIntelAgent().catch(err => {
      console.error('[cron] Conference intel failed:', err);
      return null;
    }),
  ]);

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    intel_signals: intel ? intel.signals.length : 0,
    products_discovered: products ? products.total_discovered : 0,
    conference_signals: confIntel ? confIntel.signals_detected : 0,
  });
}
