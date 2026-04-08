export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getStoredFeedItems, runFeedAgent } from '@/lib/agents/feed-agent';
import { generateDailyBrief } from '@/lib/engines/daily-brief-engine';


export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({
    key: `intelligence-daily-brief:${ip}`,
    maxRequests: 60,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  try {
    const store = getStoredFeedItems();
    if (!store) runFeedAgent().catch((err) => console.warn('[DailyBrief] runFeedAgent failed:', err));

    const brief = generateDailyBrief(store?.items ?? null, 'today');

    return NextResponse.json(
      { ok: true, data: brief },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=180' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Daily brief engine failed.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
