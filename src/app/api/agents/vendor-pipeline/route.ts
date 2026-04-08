// POST /api/agents/vendor-pipeline — Run the full vendor discovery pipeline
// GET  /api/agents/vendor-pipeline — Get pipeline status and recent results

import { NextRequest, NextResponse } from 'next/server';
import {

export const dynamic = 'force-dynamic';
  runVendorPipeline,
  runVendorMaintenance,
  runVendorEnrichmentCycle,
  type PipelineOptions,
  type PipelineReport,
} from '@/lib/agents/agents/vendor-pipeline-orchestrator';

// In-memory state
let lastReport: PipelineReport | null = null;
let isRunning = false;
let runCount = 0;

export async function POST(req: NextRequest) {
  if (isRunning) {
    return NextResponse.json(
      { error: 'Pipeline is already running', status: 'running' },
      { status: 409 },
    );
  }

  let body: PipelineOptions & { mode?: 'full' | 'maintain' | 'enrich' } = {};
  try {
    body = await req.json();
  } catch {
    // use defaults
  }

  isRunning = true;
  runCount++;
  try {
    // Shortcut modes
    if (body.mode === 'maintain') {
      lastReport = await runVendorMaintenance();
    } else if (body.mode === 'enrich') {
      lastReport = await runVendorEnrichmentCycle(body.maxEnrichments ?? 20);
    } else {
      lastReport = await runVendorPipeline(body);
    }
    return NextResponse.json(lastReport);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  } finally {
    isRunning = false;
  }
}

export async function GET() {
  return NextResponse.json({
    status: isRunning ? 'running' : 'idle',
    run_count: runCount,
    last_report: lastReport,
  });
}
