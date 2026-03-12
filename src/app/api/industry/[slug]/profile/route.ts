import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { buildIndustryProfile } from '@/lib/engines/industry-profile';

export const dynamic = 'force-dynamic';

// ── Route context ─────────────────────────────────────────────────────────────

type RouteContext = { params: Promise<{ slug: string }> };

// ── GET /api/industry/[slug]/profile ─────────────────────────────────────────

export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  const { slug } = await context.params;

  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `industry-profile:${ip}`, maxRequests: 30, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  try {
    const data = await buildIndustryProfile(slug);

    return NextResponse.json(
      { ok: true, data },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error building industry profile.';
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
