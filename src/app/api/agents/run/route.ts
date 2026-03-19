import { NextResponse } from 'next/server';

import { orchestrator } from '@/lib/agents/orchestrator';
import { runAgentSystem } from '@/lib/agents/runner';
import { saveAgentRun } from '@/lib/agents/store';
import { agentRunRequestSchema } from '@/lib/agents/types';
import { getClientIp, getRequestId } from '@/lib/http/request-context';
import { checkRateLimitDurable } from '@/lib/http/rate-limit-distributed';
import { logger } from '@/lib/observability/logger';
import { createClient } from '@/lib/supabase/server';
import { authorizeAgentMutation } from '@/lib/http/agent-auth';

export const maxDuration = 60;

export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);
  const clientIp = getClientIp(request.headers);

  const auth = await authorizeAgentMutation(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, message: auth.message },
      { status: auth.status, headers: { 'x-request-id': requestId } },
    );
  }

  const rateLimit = await checkRateLimitDurable({
    key: `agents-run:${clientIp}`,
    maxRequests: 6,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded. Agent runs are limited to 6 per minute.' },
      {
        status: 429,
        headers: {
          'x-request-id': requestId,
          'retry-after': String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      },
    );
  }

  logger.info({ event: 'agent_run_started', requestId, clientIp });

  try {
    const rawBody = await request.json().catch(() => ({})) as Record<string, unknown>;

    if (typeof rawBody.trigger === 'string') {
      await orchestrator.run({ trigger: rawBody.trigger });
      return NextResponse.json(
        { success: true, trigger: rawBody.trigger },
        { headers: { 'x-request-id': requestId } },
      );
    }

    const parsed = agentRunRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || 'Invalid request body.';
      return NextResponse.json(
        { ok: false, message },
        { status: 400, headers: { 'x-request-id': requestId } },
      );
    }

    const output = await runAgentSystem(parsed.data);

    let persisted = false;
    if (parsed.data.persist_run !== false) {
      try {
        await saveAgentRun(output);
        persisted = true;
      } catch (persistError) {
        logger.warn({
          event: 'agent_run_persist_failed',
          requestId,
          run_id: output.run_id,
          error: persistError instanceof Error ? persistError.message : 'persist_error',
        });
      }
    }

    logger.info({
      event: 'agent_run_completed',
      requestId,
      run_id: output.run_id,
      agents: output.routing.agents_to_run,
      latency_ms: output.total_latency_ms,
      persisted,
    });

    return NextResponse.json(
      { ok: true, run_id: output.run_id, run: output },
      { headers: { 'x-request-id': requestId } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected agent system error.';
    logger.error({ event: 'agent_run_failed', requestId, error: message });

    return NextResponse.json(
      { ok: false, message },
      { status: 500, headers: { 'x-request-id': requestId } },
    );
  }
}

export async function GET(request: Request) {
  const requestId = getRequestId(request.headers);

  try {
    const supabase = createClient({ admin: true });
    const { data, error } = await supabase
      .from('agent_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        { runs: [], warning: error.message },
        { status: 200, headers: { 'x-request-id': requestId } },
      );
    }

    return NextResponse.json(
      { runs: data ?? [] },
      { headers: { 'x-request-id': requestId } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        runs: [],
        warning: error instanceof Error ? error.message : 'Failed to load run history.',
      },
      { status: 200, headers: { 'x-request-id': requestId } },
    );
  }
}
