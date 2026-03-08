import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { runEntityAgent } from '@/lib/agents/agents/entity-agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/agents/entity — trigger entity extraction to populate knowledge graph
export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({ key: `entity-agent:${ip}`, maxRequests: 2, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded. Max 2 triggers per minute.' },
      { status: 429 },
    );
  }

  try {
    const result = await runEntityAgent();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Entity agent failed.' },
      { status: 500 },
    );
  }
}
