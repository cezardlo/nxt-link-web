// src/app/api/agents/intel-discovery/route.ts
// GET: Returns discovered intelligence signals (cached 45 min)
// POST: Forces a fresh discovery scan across all industries

import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import {
  getCachedIntelDiscovery,
  runIntelDiscoveryAgent,
  getIntelStats,
} from '@/lib/agents/agents/intel-discovery-agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({
    key: `intel-discovery-get:${ip}`,
    maxRequests: 30,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  // Return cached if available
  const cached = getCachedIntelDiscovery();
  if (cached) {
    return NextResponse.json(
      {
        ok: true,
        ...getIntelStats(cached),
        signals: cached.signals,
        as_of: cached.as_of,
        feeds_scanned: cached.feeds_scanned,
        feeds_ok: cached.feeds_ok,
        feeds_failed: cached.feeds_failed,
        total_raw_items: cached.total_raw_items,
        scan_duration_ms: cached.scan_duration_ms,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // No cache — trigger fresh discovery
  try {
    const store = await runIntelDiscoveryAgent();
    return NextResponse.json({
      ok: true,
      ...getIntelStats(store),
      signals: store.signals,
      as_of: store.as_of,
      feeds_scanned: store.feeds_scanned,
      feeds_ok: store.feeds_ok,
      feeds_failed: store.feeds_failed,
      total_raw_items: store.total_raw_items,
      scan_duration_ms: store.scan_duration_ms,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Intel discovery agent failed.',
        signals: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({
    key: `intel-discovery-post:${ip}`,
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
    const store = await runIntelDiscoveryAgent();
    return NextResponse.json({
      ok: true,
      ...getIntelStats(store),
      signals: store.signals,
      as_of: store.as_of,
      feeds_scanned: store.feeds_scanned,
      feeds_ok: store.feeds_ok,
      feeds_failed: store.feeds_failed,
      total_raw_items: store.total_raw_items,
      scan_duration_ms: store.scan_duration_ms,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Intel discovery agent failed.',
        signals: [],
      },
      { status: 500 },
    );
  }
}
