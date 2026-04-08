// src/app/api/agents/conference-intel/route.ts
// GET: Query persisted conference intelligence
// POST: Force a fresh conference analysis scan

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getConferenceIntel, getConferenceIntelStats } from '@/db/queries/conference-intel';
import { runConferenceIntelAgent } from '@/lib/agents/agents/conference-intel-agent';

export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({
    key: `conf-intel-get:${ip}`,
    maxRequests: 30,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  const url = new URL(request.url);
  const conference_id = url.searchParams.get('conference') ?? undefined;
  const company_name = url.searchParams.get('company') ?? undefined;
  const industry = url.searchParams.get('industry') ?? undefined;
  const signal_type = url.searchParams.get('signal_type') ?? undefined;
  const since = url.searchParams.get('since') ?? undefined;
  const limit = url.searchParams.get('limit')
    ? parseInt(url.searchParams.get('limit')!, 10)
    : 100;

  const [records, stats] = await Promise.all([
    getConferenceIntel({ conference_id, company_name, industry, signal_type, since, limit }),
    getConferenceIntelStats(),
  ]);

  return NextResponse.json({
    ok: true,
    ...stats,
    records,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({
    key: `conf-intel-post:${ip}`,
    maxRequests: 3,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Too many manual triggers. Max 3 per minute.' },
      { status: 429 },
    );
  }

  try {
    const result = await runConferenceIntelAgent();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Conference intel agent failed.',
      },
      { status: 500 },
    );
  }
}
