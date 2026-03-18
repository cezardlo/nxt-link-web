import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';

export const dynamic = 'force-dynamic';

const TTL = 10 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

type PatentRow = {
  patent_title?: string;
  patent_date?: string;
  patent_type?: string;
  assignee_organization?: string;
  patent_abstract?: string;
  cpc_group_title?: string;
};

type NormalizedPatent = {
  title: string;
  date: string;
  assignee: string;
  abstract: string;
  category: string;
};

type PatentsViewResponse = {
  patents?: PatentRow[] | null;
  total_patent_count?: number;
};

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `intel-patents:${ip}`, maxRequests: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json({ ok: true, data: cache.data }, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' },
    });
  }

  try {
    const res = await fetch('https://api.patentsview.org/patents/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: { _gte: { patent_date: '2026-03-10' } },
        f: ['patent_title', 'patent_date', 'patent_type', 'assignee_organization', 'patent_abstract', 'cpc_group_title'],
        o: { per_page: 25, page: 1 },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) throw new Error(`PatentsView HTTP ${res.status}`);

    const json = await res.json() as PatentsViewResponse;
    const rows: PatentRow[] = json.patents ?? [];

    const patents: NormalizedPatent[] = rows.map((p) => ({
      title: p.patent_title ?? '',
      date: p.patent_date ?? '',
      assignee: p.assignee_organization ?? 'Unknown',
      abstract: p.patent_abstract ?? '',
      category: p.cpc_group_title ?? p.patent_type ?? 'Utility',
    }));

    const data = { patents, total: json.total_patent_count ?? patents.length };
    cache = { data, ts: Date.now() };

    return NextResponse.json({ ok: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fetch failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
