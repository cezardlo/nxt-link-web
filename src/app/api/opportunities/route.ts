export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { runOpportunityEngine } from '@/lib/engines/opportunity-engine';


// ── GET /api/opportunities ──────────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `opportunities:${ip}`, maxRequests: 20, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  try {
    const report = await runOpportunityEngine();

    return NextResponse.json(
      { ok: true, data: report },
      { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1200' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error running opportunity engine.';
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
