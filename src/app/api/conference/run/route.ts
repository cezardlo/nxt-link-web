// POST /api/conference/run
// Runs the full conference intelligence pipeline for a given URL.
// Body: { "url": "https://example-conference.com" }

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { runConferencePipeline } from '@/lib/pipeline/run-conference-pipeline';

export const maxDuration = 120; // Pipeline can take time with Playwright + LLM

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({
    key: `conference-pipeline:${ip}`,
    maxRequests: 5,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, status: 'failed', message: 'Rate limit exceeded. Max 5 requests per minute.' },
      { status: 429 },
    );
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, status: 'failed', message: 'Invalid JSON body. Expected: { "url": "https://..." }' },
      { status: 400 },
    );
  }

  const conferenceUrl = body.url?.trim();

  if (!conferenceUrl) {
    return NextResponse.json(
      { ok: false, status: 'failed', message: 'Missing required field: url' },
      { status: 400 },
    );
  }

  // Validate URL format
  try {
    const parsed = new URL(conferenceUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Only http/https URLs are supported');
    }
  } catch (err) {
    return NextResponse.json(
      { ok: false, status: 'failed', message: `Invalid URL: ${err instanceof Error ? err.message : 'bad format'}` },
      { status: 400 },
    );
  }

  try {
    const result = await runConferencePipeline(conferenceUrl);

    return NextResponse.json({
      ok: result.status !== 'failed',
      ...result,
    });
  } catch (err) {
    console.error('[conference/run] Pipeline crashed:', err);
    return NextResponse.json(
      {
        ok: false,
        status: 'failed',
        message: err instanceof Error ? err.message : 'Pipeline failed unexpectedly',
        data: null,
        pages_scraped: [],
        errors: [err instanceof Error ? err.message : 'unknown_error'],
      },
      { status: 500 },
    );
  }
}
