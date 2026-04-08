// src/app/api/agents/intel-signals/route.ts
// GET: Query persisted intel signals from Supabase (with filters)

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getIntelSignals, getIntelSignalStats } from '@/db/queries/intel-signals';


export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({
    key: `intel-signals-db:${ip}`,
    maxRequests: 30,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  const url = new URL(request.url);
  const signal_type = url.searchParams.get('type') ?? undefined;
  const industry = url.searchParams.get('industry') ?? undefined;
  const since = url.searchParams.get('since') ?? undefined;
  const min_importance = url.searchParams.get('min_importance')
    ? parseFloat(url.searchParams.get('min_importance')!)
    : undefined;
  const limit = url.searchParams.get('limit')
    ? parseInt(url.searchParams.get('limit')!, 10)
    : 100;

  const [signals, stats] = await Promise.all([
    getIntelSignals({ signal_type, industry, since, min_importance, limit }),
    getIntelSignalStats(since),
  ]);

  return NextResponse.json({
    ok: true,
    total: stats.total,
    by_type: stats.by_type,
    by_industry: stats.by_industry,
    avg_importance: stats.avg_importance,
    signals,
  });
}
