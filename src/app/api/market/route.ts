export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';


import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getStoredMarketData, runMarketAgent } from '@/lib/agents/market-agent';

// GET /api/market
// Returns cached stock quotes for the enterprise tech watchlist.
// Shape: { ok, quotes: StockQuote[], as_of }
export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers((request as Request).headers));
  const rl = checkRateLimit({ key: `market-get:${ip}`, maxRequests: 30, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const cached = getStoredMarketData();
  if (cached) {
    return NextResponse.json({ ok: true, ...cached }, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const store = await runMarketAgent();
    return NextResponse.json({ ok: true, ...store });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Market agent failed.', quotes: [] },
      { status: 500 },
    );
  }
}
