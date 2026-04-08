export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';


const RACE_COUNTRIES: Array<{ code: string; name: string }> = [
  { code: 'US', name: 'United States' },
  { code: 'CN', name: 'China' },
  { code: 'DE', name: 'Germany' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'IL', name: 'Israel' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IN', name: 'India' },
];

// Hardcoded fallback scores (AI as baseline) — updated quarterly
const FALLBACK_SCORES: Record<string, Record<string, number>> = {
  ai:        { US: 100, CN: 88, DE: 42, JP: 51, KR: 46, IL: 58, GB: 47, IN: 39 },
  quantum:   { US: 100, CN: 79, DE: 61, JP: 55, KR: 38, IL: 44, GB: 65, IN: 29 },
  biotech:   { US: 100, CN: 72, DE: 68, JP: 58, KR: 49, IL: 63, GB: 71, IN: 41 },
  cyber:     { US: 100, CN: 75, DE: 55, JP: 44, KR: 52, IL: 91, GB: 61, IN: 38 },
  robotics:  { US: 100, CN: 85, DE: 77, JP: 90, KR: 69, IL: 48, GB: 52, IN: 33 },
  energy:    { US: 100, CN: 95, DE: 78, JP: 61, KR: 55, IL: 49, GB: 60, IN: 67 },
};

type PatentsViewResponse = {
  patents: Array<{ assignees?: Array<{ assignee_country?: string }> }> | null;
  total_patent_count?: number;
};

type RankingEntry = {
  rank: number;
  country_code: string;
  country_name: string;
  patent_count: number;
  score: number;
};

type TechRaceResponse = {
  tech: string;
  query_date: string;
  rankings: RankingEntry[];
  source: 'live' | 'cached' | 'fallback';
};

function buildFallback(tech: string): TechRaceResponse {
  const key = tech.toLowerCase().replace(/[^a-z]/g, '');
  const scoreMap = FALLBACK_SCORES[key] ?? FALLBACK_SCORES['ai'];

  const sorted = RACE_COUNTRIES
    .map(c => ({ ...c, score: scoreMap[c.code] ?? 20 }))
    .sort((a, b) => b.score - a.score);

  const max = sorted[0]?.score ?? 100;

  const rankings: RankingEntry[] = sorted.map((c, i) => ({
    rank: i + 1,
    country_code: c.code,
    country_name: c.name,
    patent_count: Math.round((c.score / max) * 850),
    score: Math.round((c.score / max) * 100),
  }));

  return { tech, query_date: new Date().toISOString(), rankings, source: 'fallback' };
}

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `world-tech-race:${ip}`, maxRequests: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const tech = (searchParams.get('tech') ?? '').trim();

  if (!tech) {
    return NextResponse.json({ ok: false, message: 'tech query param is required.' }, { status: 400 });
  }

  // Build PatentsView query — counts patents with the tech keyword in the title since 2023
  const query = JSON.stringify({
    _and: [
      { _text_any: { patent_title: tech } },
      { _gte: { patent_date: '2023-01-01' } },
    ],
  });

  const fields = JSON.stringify(['patent_id', 'assignees.assignee_country']);
  const options = JSON.stringify({ per_page: 100 });

  try {
    const url = `https://api.patentsview.org/patents/query?q=${encodeURIComponent(query)}&f=${encodeURIComponent(fields)}&o=${encodeURIComponent(options)}`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    let pvData: PatentsViewResponse;

    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`PatentsView HTTP ${res.status}`);
      pvData = await res.json() as PatentsViewResponse;
    } finally {
      clearTimeout(timer);
    }

    const patents = pvData.patents ?? [];

    // Count by country
    const counts: Record<string, number> = {};
    for (const patent of patents) {
      for (const assignee of patent.assignees ?? []) {
        const cc = (assignee.assignee_country ?? '').toUpperCase();
        if (cc) counts[cc] = (counts[cc] ?? 0) + 1;
      }
    }

    // Build rankings for the 8 tracked countries
    const withCounts = RACE_COUNTRIES.map(c => ({
      ...c,
      patent_count: counts[c.code] ?? 0,
    })).sort((a, b) => b.patent_count - a.patent_count);

    const maxCount = withCounts[0]?.patent_count ?? 1;

    const rankings: RankingEntry[] = withCounts.map((c, i) => ({
      rank: i + 1,
      country_code: c.code,
      country_name: c.name,
      patent_count: c.patent_count,
      score: maxCount > 0 ? Math.round((c.patent_count / maxCount) * 100) : 0,
    }));

    const data: TechRaceResponse = {
      tech,
      query_date: new Date().toISOString(),
      rankings,
      source: 'live',
    };

    return NextResponse.json({ ok: true, data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    // PatentsView unavailable — return deterministic fallback
    return NextResponse.json(
      { ok: true, data: buildFallback(tech) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
