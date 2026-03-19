// src/app/api/agents/swarm/route.ts
// GET: Returns swarm status (memory, events, reliability, coordinator).
// POST: Triggers a full swarm cycle via SwarmCoordinator.runPlatformPipeline().

import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { checkRateLimitDurable } from '@/lib/http/rate-limit-distributed';
import { getClientIp } from '@/lib/http/request-context';
import { swarmMemoryReadRecent } from '@/lib/agents/swarm/memory';
import { swarmRecentEvents } from '@/lib/agents/swarm/bus';
import { swarmGetAgentReliability } from '@/lib/agents/swarm/learning';
import { swarmCoordinator } from '@/lib/agents/swarm/coordinator';
import { authorizeAgentMutation } from '@/lib/http/agent-auth';

export const dynamic = 'force-dynamic';
// POST pipeline can take up to ~60 s; this applies to the entire route segment.
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({
    key: `swarm-get:${ip}`,
    maxRequests: 10,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  try {
    const [memory, events, reliability] = await Promise.all([
      swarmMemoryReadRecent(20),
      swarmRecentEvents(50),
      swarmGetAgentReliability(),
    ]);

    const coordinator = swarmCoordinator.getStatus();

    return NextResponse.json(
      { ok: true, memory, events, reliability, coordinator },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to read swarm status.',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const auth = await authorizeAgentMutation(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, message: auth.message },
      { status: auth.status },
    );
  }

  const rl = await checkRateLimitDurable({
    key: `swarm-post:${ip}`,
    maxRequests: 2,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Too many manual triggers. Max 2 per minute.' },
      { status: 429 },
    );
  }

  try {
    const result = await swarmCoordinator.runPlatformPipeline('manual');

    return NextResponse.json(
      { ok: true, result },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Swarm cycle failed.',
      },
      { status: 500 },
    );
  }
}
