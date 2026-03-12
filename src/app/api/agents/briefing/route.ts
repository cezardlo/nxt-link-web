// src/app/api/agents/briefing/route.ts
// GET: Generate or return today's daily intelligence briefing
// Called by Vercel cron at 7 AM daily

import { NextResponse } from 'next/server';

import { generateDailyBriefing } from '@/lib/agents/agents/briefing-generator-agent';
import { getRecentBriefings } from '@/db/queries/daily-briefings';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    // Generate today's briefing (skips if already exists)
    const briefing = await generateDailyBriefing();

    if (briefing) {
      return NextResponse.json({
        ok: true,
        briefing,
      });
    }

    // No signals today — return most recent briefings instead
    const recent = await getRecentBriefings(3);
    return NextResponse.json({
      ok: true,
      message: 'No new signals today. Returning recent briefings.',
      briefings: recent,
    });
  } catch (error) {
    console.error('[briefing-cron] Failed:', error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Briefing generation failed.',
      },
      { status: 500 },
    );
  }
}
