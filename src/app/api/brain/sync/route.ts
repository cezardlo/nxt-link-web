export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import {
  loadUnifiedBrainReport,
  persistUnifiedBrainReport,
} from '@/lib/intelligence/brain-orchestrator';


function parseLimit(value: unknown): number {
  return Math.min(Math.max(Number(value ?? 100), 1), 500);
}

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({ key: `brain-sync:${ip}`, maxRequests: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit.' }, { status: 429 });
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get('limit'));
  const includeObsidian = url.searchParams.get('includeObsidian') !== 'false';

  const report = await loadUnifiedBrainReport({
    signalLimit: limit,
    includeObsidian,
  });

  return NextResponse.json({
    ok: true,
    mode: 'preview',
    ...report,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({ key: `brain-sync-write:${ip}`, maxRequests: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const limit = parseLimit(body.limit);
  const includeObsidian = body.includeObsidian !== false;
  const persist = body.persist !== false;

  const report = await loadUnifiedBrainReport({
    signalLimit: limit,
    includeObsidian,
  });
  const persisted = persist
    ? await persistUnifiedBrainReport(report)
    : { entities: 0, relationships: 0 };

  return NextResponse.json({
    ok: true,
    mode: persist ? 'persisted' : 'preview',
    persisted,
    ...report,
  });
}
