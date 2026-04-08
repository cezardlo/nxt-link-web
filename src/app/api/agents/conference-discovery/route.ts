// POST /api/agents/conference-discovery — Run conference discovery agent
// GET  /api/agents/conference-discovery — Get last discovery report

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import {

  runConferenceDiscovery,
  type ConferenceDiscoveryReport,
} from '@/lib/agents/agents/conference-discovery-agent';

let lastReport: ConferenceDiscoveryReport | null = null;
let isRunning = false;

export async function POST() {
  if (isRunning) {
    return NextResponse.json(
      { error: 'Conference discovery is already running', status: 'running' },
      { status: 409 },
    );
  }

  isRunning = true;
  try {
    lastReport = await runConferenceDiscovery();
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
    last_report: lastReport,
  });
}
