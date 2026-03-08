import { NextResponse } from 'next/server';

import { orchestrator } from '@/lib/agents/orchestrator';
import { runIntelDiscoveryAgent } from '@/lib/agents/agents/intel-discovery-agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  // Run orchestrator (feeds, vendors, swarm pipeline)
  const orchResult = orchestrator.run({ trigger: 'hourly' });

  // Run intel discovery in parallel (patents, research, case studies, hiring, funding)
  const intelResult = runIntelDiscoveryAgent().catch(err => {
    console.error('[cron] Intel discovery failed:', err);
    return null;
  });

  const [, intel] = await Promise.all([orchResult, intelResult]);

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    intel_signals: intel ? intel.signals.length : 0,
  });
}
