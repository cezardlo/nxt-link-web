export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';


import { getAgentRun } from '@/lib/agents/store';
import { getClientIp, getRequestId } from '@/lib/http/request-context';
import { checkRateLimit } from '@/lib/http/rate-limit';
import { logger } from '@/lib/observability/logger';

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const requestId = getRequestId(request.headers);
  const clientIp = getClientIp(request.headers);

  const rateLimit = checkRateLimit({
    key: `agents-runs-get:${clientIp}`,
    maxRequests: 30,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      {
        status: 429,
        headers: {
          'x-request-id': requestId,
          'retry-after': String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      },
    );
  }

  try {
    const run = await getAgentRun(params.id);

    if (!run) {
      return NextResponse.json(
        { ok: false, message: 'Agent run not found.' },
        { status: 404, headers: { 'x-request-id': requestId } },
      );
    }

    logger.info({ event: 'agent_run_retrieved', requestId, run_id: params.id });

    return NextResponse.json(
      { ok: true, run },
      { headers: { 'x-request-id': requestId } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve agent run.';
    logger.error({ event: 'agent_run_get_failed', requestId, id: params.id, error: message });

    return NextResponse.json(
      { ok: false, message },
      { status: 500, headers: { 'x-request-id': requestId } },
    );
  }
}
