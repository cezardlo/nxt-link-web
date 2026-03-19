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

type SwarmReliabilityMap = Record<string, { successRate: number; totalRuns: number }>;

function toAgentId(agentName: string): string {
  const known: Record<string, string> = {
    FeedAgent: 'feed-agent',
    EntityAgent: 'vendor-discovery',
    IKERAgent: 'source-quality',
    TrendAgent: 'signal-engine',
    NarrativeAgent: 'docs-sync',
    AlertAgent: 'product-scanner',
    Orchestrator: 'orchestrator',
  };

  if (known[agentName]) return known[agentName];
  return agentName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

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

    const coordinatorStatus = swarmCoordinator.getStatus();
    const coordinator = {
      ...coordinatorStatus,
      // Backward-compatible aliases used by existing UI clients.
      lastRun: coordinatorStatus.last_dispatch,
      isRunning: false,
    };

    const recent_comms = events.map((event) => ({
      timestamp: event.created_at,
      source_agent: event.source_agent,
      event_type: event.event_type,
      payload: event.payload,
    }));

    const agent_reliability = reliability.map((row) => {
      const score = Math.max(0, Math.min(1, row.reliability_score));
      return {
        agent_id: toAgentId(row.agent_name),
        agent_name: row.agent_name,
        total_findings: row.total_findings,
        useful_count: row.useful_count,
        noise_count: row.noise_count,
        critical_count: row.critical_count,
        reliability_score: Math.round(score * 100),
      };
    });

    const reliability_map: SwarmReliabilityMap = Object.fromEntries(
      agent_reliability.map((row) => [
        row.agent_id,
        {
          successRate: row.reliability_score / 100,
          totalRuns: row.total_findings,
        },
      ]),
    );

    const memory_entries = memory.map((entry) => ({
      id: entry.id,
      topic: entry.topic,
      entry_type: entry.entry_type,
      confidence: entry.confidence,
      created_at: entry.created_at,
    }));

    const activeCutoffMs = 10 * 60 * 1000;
    const now = Date.now();
    const lastDispatchMs = coordinatorStatus.last_dispatch
      ? new Date(coordinatorStatus.last_dispatch).getTime()
      : NaN;
    const hasRecentDispatch =
      Number.isFinite(lastDispatchMs) && now - lastDispatchMs <= activeCutoffMs;
    const hasRecentEvent = events.some(
      (event) => now - new Date(event.created_at).getTime() <= activeCutoffMs,
    );
    const is_active = Boolean(hasRecentDispatch || hasRecentEvent);
    const agent_count = agent_reliability.length;

    return NextResponse.json(
      {
        ok: true,
        message: null,
        data: {
          memory,
          events,
          reliability,
          reliability_map,
          coordinator,
          agent_count,
          is_active,
        },
        // Canonical fields
        memory,
        events,
        reliability,
        coordinator,
        // Backward-compatible aliases (used by existing dashboards)
        recent_comms,
        agent_reliability,
        memory_entries,
        reliability_map,
        agent_count,
        is_active,
      },
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
      {
        ok: true,
        message: 'Swarm cycle started.',
        data: { result },
        result,
      },
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
