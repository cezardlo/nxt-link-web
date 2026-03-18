import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';

export const dynamic = 'force-dynamic';

const TTL = 10 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

type CisaVuln = {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
  shortDescription?: string;
};

type CisaFeed = {
  vulnerabilities?: CisaVuln[];
};

type NormalizedVuln = {
  cveID: string;
  vendorProject: string;
  product: string;
  name: string;
  dateAdded: string;
  dueDate: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
};

function inferSeverity(v: CisaVuln): NormalizedVuln['severity'] {
  const text = `${v.vulnerabilityName} ${v.shortDescription ?? ''}`.toLowerCase();
  if (text.includes('remote code') || text.includes('rce') || text.includes('unauthenticated') || v.knownRansomwareCampaignUse === 'Known') {
    return 'CRITICAL';
  }
  if (text.includes('privilege') || text.includes('escalation') || text.includes('injection')) {
    return 'HIGH';
  }
  return 'MEDIUM';
}

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `intel-cyber:${ip}`, maxRequests: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json({ ok: true, data: cache.data }, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' },
    });
  }

  try {
    const res = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', {
      headers: { 'User-Agent': 'NXTLink/1.0 (nxtlink@nxtlinktech.com)' },
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) throw new Error(`CISA HTTP ${res.status}`);

    const json = await res.json() as CisaFeed;
    const all: CisaVuln[] = json.vulnerabilities ?? [];

    // Sort by dateAdded descending, take top 20
    const sorted = [...all].sort((a, b) => b.dateAdded.localeCompare(a.dateAdded)).slice(0, 20);

    const vulnerabilities: NormalizedVuln[] = sorted.map((v) => ({
      cveID: v.cveID,
      vendorProject: v.vendorProject,
      product: v.product,
      name: v.vulnerabilityName,
      dateAdded: v.dateAdded,
      dueDate: v.dueDate,
      severity: inferSeverity(v),
    }));

    const data = { vulnerabilities, total: all.length };
    cache = { data, ts: Date.now() };

    return NextResponse.json({ ok: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fetch failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
