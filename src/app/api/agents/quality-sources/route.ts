// src/app/api/agents/quality-sources/route.ts
// GET: Returns discovered quality sources (cached 1 hour)
// POST: Forces a fresh discovery scan

import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { checkRateLimitDurable } from '@/lib/http/rate-limit-distributed';
import { getClientIp } from '@/lib/http/request-context';
import { authorizeAgentMutation } from '@/lib/http/agent-auth';
import {
  getCachedQualitySources,
  runQualitySourceAgent,
} from '@/lib/agents/agents/source-quality-agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({
    key: `quality-sources-get:${ip}`,
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
  const cached = getCachedQualitySources();
  if (cached) {
    return NextResponse.json(
      {
        ok: true,
        sources: cached.sources,
        as_of: cached.as_of,
        feed_count: cached.feed_count,
        feeds_ok: cached.feeds_ok,
        feeds_failed: cached.feeds_failed,
        total_raw_items: cached.total_raw_items,
        llm_enriched: cached.llm_enriched,
        source_count: cached.sources.length,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // No cache — trigger fresh discovery
  try {
    const store = await runQualitySourceAgent();
    return NextResponse.json({
      ok: true,
      sources: store.sources,
      as_of: store.as_of,
      feed_count: store.feed_count,
      feeds_ok: store.feeds_ok,
      feeds_failed: store.feeds_failed,
      total_raw_items: store.total_raw_items,
      llm_enriched: store.llm_enriched,
      source_count: store.sources.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Quality source agent failed.',
        sources: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const auth = await authorizeAgentMutation(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }

  const rl = await checkRateLimitDurable({
    key: `quality-sources-post:${ip}`,
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
    const store = await runQualitySourceAgent();
    return NextResponse.json({
      ok: true,
      sources: store.sources,
      as_of: store.as_of,
      feed_count: store.feed_count,
      feeds_ok: store.feeds_ok,
      feeds_failed: store.feeds_failed,
      total_raw_items: store.total_raw_items,
      llm_enriched: store.llm_enriched,
      source_count: store.sources.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Quality source agent failed.',
        sources: [],
      },
      { status: 500 },
    );
  }
}
