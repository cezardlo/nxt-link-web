// src/app/api/agents/product-scanner/route.ts
// GET: Returns cached product scan report (1hr TTL)
// POST: Forces a fresh product scan run

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import {
  getCachedProductScan,
  runProductScanAgent,
} from '@/lib/agents/agents/product-scanner-agent';

export const maxDuration = 30;

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({
    key: `product-scanner-get:${ip}`,
    maxRequests: 30,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  const cached = getCachedProductScan();
  if (cached) {
    return NextResponse.json(
      { ok: true, report: cached, cached: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const report = await runProductScanAgent();
    return NextResponse.json(
      { ok: true, report, cached: false },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Product scanner agent failed.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({
    key: `product-scanner-post:${ip}`,
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
    const report = await runProductScanAgent();
    return NextResponse.json(
      { ok: true, report, cached: false },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Product scanner agent failed.' },
      { status: 500 },
    );
  }
}
