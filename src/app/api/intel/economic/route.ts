import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';

export const dynamic = 'force-dynamic';

const TTL = 10 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

type FredObservation = {
  date: string;
  value: string;
};

type FredResponse = {
  observations?: FredObservation[];
};

type EconPoint = {
  date: string;
  value: number | null;
};

function normalizeFred(observations: FredObservation[]): EconPoint[] {
  return observations
    .filter((o) => o.value !== '.' && o.date !== '')
    .map((o) => ({
      date: o.date,
      value: o.value === '.' ? null : parseFloat(o.value),
    }));
}

async function fetchFred(seriesId: string): Promise<FredObservation[]> {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=DEMO_KEY&file_type=json&sort_order=desc&limit=12`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'NXTLink/1.0 (nxtlink@nxtlinktech.com)' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`FRED HTTP ${res.status} for ${seriesId}`);
  const json = await res.json() as FredResponse;
  return json.observations ?? [];
}

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `intel-economic:${ip}`, maxRequests: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json({ ok: true, data: cache.data }, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' },
    });
  }

  try {
    // Fetch employment and unemployment in parallel
    const [empObs, unempObs] = await Promise.all([
      fetchFred('ELPTX'),
      fetchFred('ELPASOTXURN'),
    ]);

    const employment = normalizeFred(empObs);
    const unemployment = normalizeFred(unempObs);

    const data = { employment, unemployment, metro: 'El Paso' };
    cache = { data, ts: Date.now() };

    return NextResponse.json({ ok: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fetch failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
