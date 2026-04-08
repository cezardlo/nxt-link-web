export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';


import { fetchLiveRssFeeds } from '@/lib/rss/live-feeds';

export async function GET() {
  try {
    const payload = await fetchLiveRssFeeds();
    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to load live feeds.',
      },
      { status: 500 },
    );
  }
}

