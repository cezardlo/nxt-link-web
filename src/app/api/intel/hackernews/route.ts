export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';


const TTL = 10 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

type HNItem = {
  id: number;
  title?: string;
  url?: string;
  score?: number;
  by?: string;
  time?: number;
  descendants?: number;
  type?: string;
};

type NormalizedStory = {
  id: number;
  title: string;
  url: string;
  score: number;
  by: string;
  time: number;
  comments: number;
};

const TECH_BLACKLIST = ['showhn', 'ask hn', 'who is hiring', 'tell hn'];

function isTechOrBusiness(item: HNItem): boolean {
  if (item.type !== 'story') return false;
  if (!item.title || !item.url) return false;
  const lower = item.title.toLowerCase();
  for (const bl of TECH_BLACKLIST) {
    if (lower.startsWith(bl)) return false;
  }
  return (item.score ?? 0) > 50;
}

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `intel-hackernews:${ip}`, maxRequests: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json({ ok: true, data: cache.data }, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' },
    });
  }

  try {
    const topRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
      signal: AbortSignal.timeout(10_000),
    });
    if (!topRes.ok) throw new Error(`HN top stories HTTP ${topRes.status}`);

    const topIds = await topRes.json() as number[];
    const first50 = topIds.slice(0, 50);

    // Fetch details in parallel
    const settled = await Promise.allSettled(
      first50.map((id) =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
          signal: AbortSignal.timeout(8_000),
        }).then((r) => r.json() as Promise<HNItem>),
      ),
    );

    const items: HNItem[] = settled
      .filter((r): r is PromiseFulfilledResult<HNItem> => r.status === 'fulfilled')
      .map((r) => r.value);

    const filtered = items.filter(isTechOrBusiness).slice(0, 15);

    const stories: NormalizedStory[] = filtered.map((item) => ({
      id: item.id,
      title: item.title ?? '',
      url: item.url ?? `https://news.ycombinator.com/item?id=${item.id}`,
      score: item.score ?? 0,
      by: item.by ?? '',
      time: item.time ?? 0,
      comments: item.descendants ?? 0,
    }));

    const data = { stories, total: stories.length };
    cache = { data, ts: Date.now() };

    return NextResponse.json({ ok: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fetch failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
