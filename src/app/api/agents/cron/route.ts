import { NextResponse } from 'next/server';

import { orchestrator } from '@/lib/agents/orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  await orchestrator.run({ trigger: 'hourly' });

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
}
