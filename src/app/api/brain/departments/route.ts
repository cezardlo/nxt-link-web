// GET /api/brain/departments — Department status dashboard
// POST /api/brain/departments — Run full pipeline or specific department

import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import {
  getDepartmentStatus,
  runFullPipeline,
  runSignalCollection,
  generateDailyBrief,
} from '@/lib/agents/departments';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({ key: `dept:${ip}`, maxRequests: 30, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ ok: false, message: 'Rate limit.' }, { status: 429 });

  return NextResponse.json({
    ok: true,
    departments: getDepartmentStatus(),
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({ key: `dept-run:${ip}`, maxRequests: 5, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ ok: false, message: 'Rate limit.' }, { status: 429 });

  try {
    const body = (await request.json()) as { mode?: string };
    const mode = body.mode ?? 'full';

    if (mode === 'brief') {
      const brief = generateDailyBrief();
      return NextResponse.json({ ok: true, mode: 'brief', brief });
    }

    if (mode === 'collect') {
      const collection = runSignalCollection();
      return NextResponse.json({ ok: true, mode: 'collect', collection });
    }

    if (mode === 'full') {
      const pipeline = runFullPipeline();
      return NextResponse.json({ ok: true, mode: 'full', ...pipeline });
    }

    return NextResponse.json({ ok: false, message: `Unknown mode: ${mode}. Use full, brief, or collect.` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, message: err instanceof Error ? err.message : 'Pipeline failed.' }, { status: 500 });
  }
}
