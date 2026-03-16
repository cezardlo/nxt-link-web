import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';

export const dynamic = 'force-dynamic';

// Country name lookup — ISO 3166-1 alpha-2 to display name
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', CN: 'China', DE: 'Germany', JP: 'Japan',
  KR: 'South Korea', IL: 'Israel', GB: 'United Kingdom', IN: 'India',
  FR: 'France', CA: 'Canada', AU: 'Australia', BR: 'Brazil',
  SG: 'Singapore', SE: 'Sweden', CH: 'Switzerland', NL: 'Netherlands',
  FI: 'Finland', DK: 'Denmark', NO: 'Norway', TW: 'Taiwan',
};

type WorldBankSeries = [
  { page: number; pages: number; per_page: number; total: number },
  Array<{ value: number | null; date: string }> | null,
];

type CountryIntelResponse = {
  code: string;
  name: string;
  patents_recent: number | null;
  rd_gdp_percent: number | null;
  cached_at: string;
  source: 'world_bank' | 'fallback';
};

type RouteContext = { params: Promise<{ code: string }> };

async function fetchWorldBank(
  code: string,
  indicator: string,
): Promise<number | null> {
  try {
    const url =
      `https://api.worldbank.org/v2/country/${code}/indicator/${indicator}` +
      `?format=json&mrv=3`;
    const res = await fetch(url, {
      cache: 'force-cache',
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json() as WorldBankSeries;
    const rows = data[1];
    if (!Array.isArray(rows)) return null;
    // Return the most recent non-null value
    for (const row of rows) {
      if (row.value !== null) return row.value;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `world-country:${ip}`, maxRequests: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const { code } = await context.params;
  const upper = code.toUpperCase();

  if (!upper || upper.length !== 2) {
    return NextResponse.json({ ok: false, message: 'Invalid country code. Use ISO 3166-1 alpha-2.' }, { status: 400 });
  }

  const name = COUNTRY_NAMES[upper] ?? upper;

  // Fetch patents and R&D in parallel — both 24h cached at World Bank layer
  const [patents_recent, rd_gdp_percent] = await Promise.all([
    fetchWorldBank(upper, 'IP.PAT.RESD'),
    fetchWorldBank(upper, 'GB.XPD.RSDV.GD.ZS'),
  ]);

  const source: 'world_bank' | 'fallback' =
    patents_recent !== null || rd_gdp_percent !== null ? 'world_bank' : 'fallback';

  const data: CountryIntelResponse = {
    code: upper,
    name,
    patents_recent,
    rd_gdp_percent,
    cached_at: new Date().toISOString(),
    source,
  };

  return NextResponse.json(
    { ok: true, data },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
