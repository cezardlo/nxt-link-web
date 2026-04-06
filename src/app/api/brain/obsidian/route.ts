import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import {
  loadObsidianImportReport,
  persistObsidianImportReport,
} from '@/lib/intelligence/obsidian-import';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({ key: `brain-obsidian:${ip}`, maxRequests: 15, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit.' }, { status: 429 });
  }

  try {
    const report = await loadObsidianImportReport();
    return NextResponse.json({ ok: true, mode: 'preview', ...report });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Obsidian import failed.' },
      { status: 400 }
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({ key: `brain-obsidian-write:${ip}`, maxRequests: 8, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit.' }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const persist = body.persist !== false;
    const report = await loadObsidianImportReport();
    const persisted = persist ? await persistObsidianImportReport(report) : { entities: 0, relationships: 0 };
    return NextResponse.json({
      ok: true,
      mode: persist ? 'persisted' : 'preview',
      persisted,
      ...report,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Obsidian import failed.' },
      { status: 400 }
    );
  }
}
