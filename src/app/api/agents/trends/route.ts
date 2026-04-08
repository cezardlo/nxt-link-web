export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { runTrendAgent } from '@/lib/agents/agents/trend-agent';

export const maxDuration = 30;

// GET /api/agents/trends — detect emerging trends from signal clusters
export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `trends:${ip}`, maxRequests: 10, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  try {
    const result = await runTrendAgent();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Trend detection failed.' },
      { status: 500 },
    );
  }
}
