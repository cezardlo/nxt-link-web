import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getStoredFeedItems, runFeedAgent } from '@/lib/agents/feed-agent';
import { getTrending, type WindowSpec, type TrendingItemType } from '@/lib/engines/trending-engine';

export const dynamic = 'force-dynamic';

const VALID_WINDOWS: WindowSpec[] = ['2h', '6h', '12h', '24h'];
const VALID_TYPES = ['technology', 'company', 'topic', 'keyword', 'all'] as const;

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({
    key: `intelligence-trending:${ip}`,
    maxRequests: 60,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  try {
    const url = new URL(request.url);

    const rawWindow = url.searchParams.get('window') ?? '6h';
    const window: WindowSpec = (VALID_WINDOWS as readonly string[]).includes(rawWindow)
      ? (rawWindow as WindowSpec)
      : '6h';

    const rawType = url.searchParams.get('type') ?? 'all';
    const typeFilter = (VALID_TYPES as readonly string[]).includes(rawType) ? rawType : 'all';

    const rawLimit = parseInt(url.searchParams.get('limit') ?? '20', 10);
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 50);

    const store = getStoredFeedItems();
    if (!store) runFeedAgent().catch((err) => console.warn('[Trending] runFeedAgent failed:', err));

    const result = getTrending(store?.items ?? null, window);

    const filtered = typeFilter === 'all'
      ? result.trending
      : result.trending.filter((item) => item.type === (typeFilter as TrendingItemType));

    return NextResponse.json(
      {
        ok: true,
        ...result,
        trending: filtered.slice(0, limit),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Trending engine failed.';
    return NextResponse.json({ ok: false, message, trending: [] }, { status: 500 });
  }
}
