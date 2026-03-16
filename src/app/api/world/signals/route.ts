import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';

export const dynamic = 'force-dynamic';

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', CN: 'China', DE: 'Germany', JP: 'Japan',
  KR: 'South Korea', IL: 'Israel', GB: 'United Kingdom', IN: 'India',
  FR: 'France', CA: 'Canada', AU: 'Australia', BR: 'Brazil',
  SG: 'Singapore', SE: 'Sweden', CH: 'Switzerland', NL: 'Netherlands',
};

type GdeltArticle = {
  title?: string;
  url?: string;
  domain?: string;
  seendate?: string;
  language?: string;
};

type GdeltResponse = {
  articles?: GdeltArticle[];
};

type SignalCategory = 'funding' | 'patent' | 'policy' | 'product' | 'general';

type Signal = {
  title: string;
  url: string;
  source: string;
  published: string;
  category: SignalCategory;
};

type SignalsResponse = {
  country: string;
  signals: Signal[];
  total: number;
};

function classifyCategory(title: string): SignalCategory {
  const t = title.toLowerCase();
  if (t.includes('fund') || t.includes('invest') || t.includes('raise') || t.includes('billion') || t.includes('million')) return 'funding';
  if (t.includes('patent') || t.includes('ip ') || t.includes('intellectual property')) return 'patent';
  if (t.includes('law') || t.includes('regulat') || t.includes('policy') || t.includes('government') || t.includes('bill') || t.includes('sanction')) return 'policy';
  if (t.includes('launch') || t.includes('product') || t.includes('release') || t.includes('announc')) return 'product';
  return 'general';
}

function gdeltDateToIso(seendate: string): string {
  // GDELT date format: YYYYMMDDTHHMMSSZ
  if (seendate.length >= 15) {
    const y = seendate.slice(0, 4);
    const mo = seendate.slice(4, 6);
    const d = seendate.slice(6, 8);
    const h = seendate.slice(9, 11);
    const mi = seendate.slice(11, 13);
    return `${y}-${mo}-${d}T${h}:${mi}:00Z`;
  }
  return new Date().toISOString();
}

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `world-signals:${ip}`, maxRequests: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const countryCode = (searchParams.get('country') ?? '').toUpperCase().trim();

  if (!countryCode || countryCode.length !== 2) {
    return NextResponse.json({ ok: false, message: 'country query param is required (ISO 3166-1 alpha-2).' }, { status: 400 });
  }

  const countryName = COUNTRY_NAMES[countryCode] ?? countryCode;
  const signals: Signal[] = [];

  // Query GDELT for recent news about this country + technology
  try {
    const q = encodeURIComponent(`${countryName} technology`);
    const gdeltUrl =
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}` +
      `&mode=artlist&maxrecords=10&format=json`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);

    try {
      const res = await fetch(gdeltUrl, { signal: ctrl.signal });
      if (res.ok) {
        const gdelt = await res.json() as GdeltResponse;
        for (const article of gdelt.articles ?? []) {
          if (!article.title || !article.url) continue;
          // Only English articles for signal quality
          if (article.language && article.language !== 'English') continue;
          signals.push({
            title: article.title,
            url: article.url,
            source: article.domain ?? 'gdelt',
            published: article.seendate ? gdeltDateToIso(article.seendate) : new Date().toISOString(),
            category: classifyCategory(article.title),
          });
        }
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // GDELT unavailable — continue with empty signals
  }

  const data: SignalsResponse = {
    country: countryName,
    signals,
    total: signals.length,
  };

  return NextResponse.json(
    { ok: true, data },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
