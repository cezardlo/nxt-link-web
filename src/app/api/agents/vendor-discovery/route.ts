// src/app/api/agents/vendor-discovery/route.ts
// GET: Returns recently discovered vendors/signals (cached 30 min)
// POST: Forces a fresh discovery scan

import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import {
  getCachedVendorDiscovery,
  runVendorDiscoveryAgent,
  getDiscoveryStats,
} from '@/lib/agents/agents/vendor-discovery-agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({
    key: `vendor-discovery-get:${ip}`,
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
  const cached = getCachedVendorDiscovery();
  if (cached) {
    const stats = getDiscoveryStats(cached);
    return NextResponse.json(
      {
        ok: true,
        vendors: cached.vendors,
        stats,
        as_of: cached.as_of,
        articles_scanned: cached.articles_scanned,
        companies_matched: cached.companies_matched,
        new_companies_found: cached.new_companies_found,
        llm_calls_made: cached.llm_calls_made,
        scan_duration_ms: cached.scan_duration_ms,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // No cache — trigger fresh discovery
  try {
    const store = await runVendorDiscoveryAgent();
    const stats = getDiscoveryStats(store);
    return NextResponse.json({
      ok: true,
      vendors: store.vendors,
      stats,
      as_of: store.as_of,
      articles_scanned: store.articles_scanned,
      companies_matched: store.companies_matched,
      new_companies_found: store.new_companies_found,
      llm_calls_made: store.llm_calls_made,
      scan_duration_ms: store.scan_duration_ms,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Vendor discovery agent failed.',
        vendors: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({
    key: `vendor-discovery-post:${ip}`,
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
    const store = await runVendorDiscoveryAgent();
    const stats = getDiscoveryStats(store);
    return NextResponse.json({
      ok: true,
      vendors: store.vendors,
      stats,
      as_of: store.as_of,
      articles_scanned: store.articles_scanned,
      companies_matched: store.companies_matched,
      new_companies_found: store.new_companies_found,
      llm_calls_made: store.llm_calls_made,
      scan_duration_ms: store.scan_duration_ms,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Vendor discovery agent failed.',
        vendors: [],
      },
      { status: 500 },
    );
  }
}
