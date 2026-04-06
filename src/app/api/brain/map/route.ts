import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import {
  buildMappingReport,
  loadSignalsForMapping,
  persistMappingReport,
} from '@/lib/intelligence/mapping-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({ key: `brain-map:${ip}`, maxRequests: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit.' }, { status: 429 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 100), 1), 500);

  const signals = await loadSignalsForMapping(limit);
  const report = buildMappingReport(signals);

  return NextResponse.json({
    ok: true,
    mode: 'preview',
    ...report,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({ key: `brain-map-write:${ip}`, maxRequests: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const limit = Math.min(Math.max(Number(body.limit ?? 100), 1), 500);
  const persist = body.persist !== false;

  const signals = await loadSignalsForMapping(limit);
  const report = buildMappingReport(signals);
  const persisted = persist ? await persistMappingReport(report) : { entities: 0, relationships: 0 };

  return NextResponse.json({
    ok: true,
    mode: persist ? 'persisted' : 'preview',
    persisted,
    ...report,
  });
}
