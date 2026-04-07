// src/app/api/agents/research-discovery/route.ts
// POST /api/agents/research-discovery
// Triggers the research discovery agent and persists results to kg_discoveries.
// Secured with CRON_SECRET (optional — if not configured, all POSTs are allowed).

import { NextResponse } from 'next/server';
import { checkCronSecret } from '@/lib/http/cron-auth';
import { runAndPersistResearchDiscoveryAgent } from '@/lib/agents/agents/research-discovery-agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request): Promise<NextResponse> {
  // Auth check — if CRON_SECRET is configured, validate it.
  // If not configured, allow all POST requests (dev/staging convenience).
  const cronCheck = checkCronSecret(new Headers(request.headers), { allowBearer: true });

  if (cronCheck.configured && !cronCheck.valid) {
    return NextResponse.json(
      { ok: false, message: 'Unauthorized — invalid or missing CRON_SECRET.' },
      { status: 401 },
    );
  }

  try {
    const start = Date.now();
    const { result, persist } = await runAndPersistResearchDiscoveryAgent();

    return NextResponse.json({
      ok: true,
      as_of: result.as_of,
      feeds_scanned: result.feeds_scanned,
      feeds_ok: result.feeds_ok,
      total_research_detected: result.total_research_detected,
      by_type: result.by_type,
      by_field: result.by_field,
      scan_duration_ms: result.scan_duration_ms,
      persist: {
        saved: persist.saved,
        skipped: persist.skipped,
        errors: persist.errors,
      },
      total_duration_ms: Date.now() - start,
    });
  } catch (error) {
    console.error('[research-discovery route] error:', error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Research discovery agent failed.',
      },
      { status: 500 },
    );
  }
}

// GET — health check / status
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    endpoint: 'POST /api/agents/research-discovery',
    description: 'Triggers the research discovery agent and persists results to kg_discoveries.',
    auth: 'CRON_SECRET header (x-cron-secret or Bearer token) — required only if CRON_SECRET env var is set.',
  });
}
