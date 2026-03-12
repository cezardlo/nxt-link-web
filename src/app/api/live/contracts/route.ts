import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import {
  fetchUSASpending,
  fetchSBIR,
  fetchSAMOpportunities,
  buildContractsFallback,
  type ContractAward,
} from '@/lib/contracts/fetchers';

export const dynamic = 'force-dynamic';

// Aggregates live contract intelligence from 3 free government APIs:
//   1. USASpending.gov  — federal awards to El Paso vendors
//   2. SBIR.gov         — SBIR/STTR awards (R&D contracts)
//   3. SAM.gov          — active solicitations (opportunities)
// No API keys required for USASpending or SBIR; SAM.gov uses SAM_GOV_API_KEY.

export type { ContractAward };

export type ContractsResponse = {
  ok: boolean;
  awards: ContractAward[];
  totalValueM: number;
  awardCount: number;
  solicitationCount: number;
  topAgency: string;
  asOf: string;
  cached?: boolean;
};

let _cache: { data: ContractsResponse; ts: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;

function buildFallbackResponse(): ContractsResponse {
  const awards = buildContractsFallback();
  const totalValueM = awards.reduce((s, a) => s + (a.amount ?? 0), 0) / 1_000_000;
  return {
    ok: true,
    awards,
    totalValueM: Math.round(totalValueM * 10) / 10,
    awardCount: awards.filter((a) => a.type === 'award').length,
    solicitationCount: awards.filter((a) => a.type === 'solicitation').length,
    topAgency: 'Department of the Army',
    asOf: new Date().toISOString(),
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `contracts:${ip}`, maxRequests: 15, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const refresh = new URL(request.url).searchParams.get('refresh') === '1';

  if (!refresh && _cache && Date.now() - _cache.ts < CACHE_TTL_MS) {
    return NextResponse.json({ ..._cache.data, cached: true });
  }

  try {
    const [usaAwards, sbirAwards, samOpps] = await Promise.allSettled([
      fetchUSASpending(),
      fetchSBIR(),
      fetchSAMOpportunities(),
    ]);

    const allAwards: ContractAward[] = [
      ...(usaAwards.status === 'fulfilled' ? usaAwards.value : []),
      ...(sbirAwards.status === 'fulfilled' ? sbirAwards.value : []),
      ...(samOpps.status === 'fulfilled' ? samOpps.value : []),
    ];

    if (allAwards.length === 0) {
      const fallback = buildFallbackResponse();
      _cache = { data: fallback, ts: Date.now() };
      return NextResponse.json(fallback);
    }

    const totalValueM = allAwards.reduce((s, a) => s + (a.amount ?? 0), 0) / 1_000_000;
    const agencyCounts = new Map<string, number>();
    for (const a of allAwards) {
      agencyCounts.set(a.agency, (agencyCounts.get(a.agency) ?? 0) + 1);
    }
    const topAgency = [...agencyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Federal Agency';

    const response: ContractsResponse = {
      ok: true,
      awards: allAwards.slice(0, 75),
      totalValueM: Math.round(totalValueM * 10) / 10,
      awardCount: allAwards.filter((a) => a.type === 'award').length,
      solicitationCount: allAwards.filter((a) => a.type === 'solicitation').length,
      topAgency,
      asOf: new Date().toISOString(),
    };

    _cache = { data: response, ts: Date.now() };
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });

  } catch {
    const fallback = buildFallbackResponse();
    _cache = { data: fallback, ts: Date.now() };
    return NextResponse.json(fallback);
  }
}
