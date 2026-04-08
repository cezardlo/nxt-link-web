export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { runInsightAgent } from '@/lib/agents/agents/insight-agent';

export const maxDuration = 30;

// GET /api/insights — structured intelligence: patterns, clusters, implications, opportunities
export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `insights:${ip}`, maxRequests: 15, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  try {
    const result = await runInsightAgent();

    // Optional filtering by type
    const url = new URL(request.url);
    const typeFilter = url.searchParams.get('type');
    const industryFilter = url.searchParams.get('industry');
    const limit = parseInt(url.searchParams.get('limit') ?? '20', 10);

    let filtered = result.insights;

    if (typeFilter) {
      filtered = filtered.filter(i => i.type === typeFilter);
    }
    if (industryFilter) {
      filtered = filtered.filter(i => i.industries.includes(industryFilter));
    }

    filtered = filtered.slice(0, limit);

    return NextResponse.json({
      ok: true,
      insights: filtered,
      patterns: result.patterns,
      clusters: result.clusters,
      implications: result.implications,
      opportunities: result.opportunities,
      signals_analyzed: result.signals_analyzed,
      is_live: result.signals_analyzed > 0,
      duration_ms: result.duration_ms,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Insight generation failed.' },
      { status: 500 },
    );
  }
}
