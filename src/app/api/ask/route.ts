// POST /api/ask — single-query intelligence assembler
// Takes { query: string }, returns 7 intelligence sections + product cards.
// No LLM calls — pure data assembly via ask-engine.

import { NextResponse } from 'next/server';
import { assembleAskResponse } from '@/lib/engines/ask-engine';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query =
      typeof body?.query === 'string' ? body.query.trim() : '';

    if (query.length < 2) {
      return NextResponse.json(
        { ok: false, message: 'Query required (2+ characters)' },
        { status: 400 },
      );
    }

    if (query.length > 200) {
      return NextResponse.json(
        { ok: false, message: 'Query too long (max 200 characters)' },
        { status: 400 },
      );
    }

    const response = await assembleAskResponse(query);

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[/api/ask] Error:', err);
    return NextResponse.json(
      { ok: false, message: 'Internal error assembling intelligence' },
      { status: 500 },
    );
  }
}
