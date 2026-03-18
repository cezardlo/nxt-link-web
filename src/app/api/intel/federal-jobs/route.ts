import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';

export const dynamic = 'force-dynamic';

const TTL = 10 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

type USAJobsMatchedObject = {
  PositionTitle?: string;
  OrganizationName?: string;
  PositionLocationDisplay?: string;
  PositionRemuneration?: Array<{ MinimumRange?: string; MaximumRange?: string; RateIntervalCode?: string }>;
  ApplyURI?: string[];
  PublicationStartDate?: string;
  ApplicationCloseDate?: string;
};

type USAJobsItem = {
  MatchedObjectDescriptor?: USAJobsMatchedObject;
};

type USAJobsResponse = {
  SearchResult?: {
    SearchResultItems?: USAJobsItem[];
    SearchResultCountAll?: number;
  };
};

type NormalizedJob = {
  title: string;
  organization: string;
  location: string;
  salary: string;
  url: string;
  openDate: string;
  closeDate: string;
};

function formatSalary(rem?: USAJobsMatchedObject['PositionRemuneration']): string {
  if (!rem || rem.length === 0) return 'Not specified';
  const r = rem[0];
  const min = r?.MinimumRange ?? '';
  const max = r?.MaximumRange ?? '';
  const interval = r?.RateIntervalCode ?? '';
  if (min && max) return `$${Number(min).toLocaleString()} – $${Number(max).toLocaleString()} ${interval}`.trim();
  if (min) return `$${Number(min).toLocaleString()} ${interval}`.trim();
  return 'Not specified';
}

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `intel-federal-jobs:${ip}`, maxRequests: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json({ ok: true, data: cache.data }, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' },
    });
  }

  const apiKey = process.env.USAJOBS_API_KEY;
  if (!apiKey) {
    // No API key — return curated El Paso tech job categories
    const fallback = {
      jobs: [
        { title: 'IT Specialist (INFOSEC)', organization: 'U.S. Army — Fort Bliss', location: 'El Paso, TX', salary: '$82,764 – $107,590 Per Year', url: 'https://www.usajobs.gov/Search/Results?k=IT+specialist&l=El+Paso', openDate: '', closeDate: '' },
        { title: 'Cybersecurity Analyst', organization: 'DHS — CBP', location: 'El Paso, TX', salary: '$72,553 – $94,317 Per Year', url: 'https://www.usajobs.gov/Search/Results?k=cybersecurity&l=El+Paso', openDate: '', closeDate: '' },
        { title: 'Electronics Engineer', organization: 'U.S. Army NETCOM', location: 'Fort Bliss, TX', salary: '$98,496 – $128,043 Per Year', url: 'https://www.usajobs.gov/Search/Results?k=electronics+engineer&l=El+Paso', openDate: '', closeDate: '' },
        { title: 'Data Scientist', organization: 'DEA — El Paso Intelligence Center', location: 'El Paso, TX', salary: '$86,962 – $134,435 Per Year', url: 'https://www.usajobs.gov/Search/Results?k=data+scientist&l=El+Paso', openDate: '', closeDate: '' },
        { title: 'Contract Specialist', organization: 'U.S. Army — Fort Bliss', location: 'Fort Bliss, TX', salary: '$59,966 – $94,317 Per Year', url: 'https://www.usajobs.gov/Search/Results?k=contract+specialist&l=El+Paso', openDate: '', closeDate: '' },
      ],
      total: 5,
      note: 'Set USAJOBS_API_KEY env var for live results. Free at developer.usajobs.gov',
    };
    cache = { data: fallback, ts: Date.now() };
    return NextResponse.json({ ok: true, data: fallback }, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' },
    });
  }

  try {
    const res = await fetch(
      'https://data.usajobs.gov/api/search?Keyword=technology&LocationName=El%20Paso%2C%20Texas&ResultsPerPage=20',
      {
        headers: {
          Host: 'data.usajobs.gov',
          'User-Agent': 'nxtlink@nxtlinktech.com',
          'Authorization-Key': apiKey,
        },
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!res.ok) throw new Error(`USAJobs HTTP ${res.status}`);

    const json = await res.json() as USAJobsResponse;
    const items = json.SearchResult?.SearchResultItems ?? [];

    const jobs: NormalizedJob[] = items.map((item) => {
      const d = item.MatchedObjectDescriptor ?? {};
      return {
        title: d.PositionTitle ?? '',
        organization: d.OrganizationName ?? '',
        location: d.PositionLocationDisplay ?? 'El Paso, TX',
        salary: formatSalary(d.PositionRemuneration),
        url: d.ApplyURI?.[0] ?? 'https://www.usajobs.gov',
        openDate: d.PublicationStartDate ?? '',
        closeDate: d.ApplicationCloseDate ?? '',
      };
    });

    const data = { jobs, total: json.SearchResult?.SearchResultCountAll ?? jobs.length };
    cache = { data, ts: Date.now() };

    return NextResponse.json({ ok: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fetch failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
