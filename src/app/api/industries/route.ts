import { NextResponse } from 'next/server';

import {
  getTopIndustries,
  getRecentIndustries,
  searchDynamicIndustries,
  type DynamicIndustryRow,
} from '@/db/queries/dynamic-industries';
import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';

export const dynamic = 'force-dynamic';

// GET /api/industries
// Query params:
//   ?q=<search>   → { ok: true, results: DynamicIndustryRow[] }
//   (none)        → { ok: true, core: DynamicIndustryRow[], discovered: DynamicIndustryRow[], recent: DynamicIndustryRow[] }
export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `industries:${ip}`, maxRequests: 30, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';

  // Search mode
  if (q.length > 0) {
    const results: DynamicIndustryRow[] = await searchDynamicIndustries(q, 10);
    return NextResponse.json({ ok: true, results }, { headers: { 'Cache-Control': 'no-store' } });
  }

  // Browse mode — fetch both lists in parallel
  const [topIndustries, recent]: [DynamicIndustryRow[], DynamicIndustryRow[]] = await Promise.all([
    getTopIndustries(20),
    getRecentIndustries(10),
  ]);

  const core: DynamicIndustryRow[] = topIndustries.filter((row) => row.is_core);
  const discovered: DynamicIndustryRow[] = topIndustries.filter((row) => !row.is_core);

  return NextResponse.json(
    { ok: true, core, discovered, recent },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
