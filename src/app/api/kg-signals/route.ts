export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getKgSignals } from '@/db/queries/kg-signals';
import type { KgSignalPriority } from '@/db/queries/kg-signals';
import { isSupabaseConfigured } from '@/db/client';


const VALID_PRIORITIES = new Set<string>(['P0', 'P1', 'P2', 'P3']);

// GET /api/kg-signals?priority=P0&limit=50
export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `kg-signals:${ip}`, maxRequests: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { ok: true, signals: [], source: 'unconfigured' },
        { headers: { 'Cache-Control': 'public, s-maxage=30' } },
      );
    }

    const url = new URL(request.url);
    const priorityParam = url.searchParams.get('priority');
    const limitParam = url.searchParams.get('limit');

    const priority = priorityParam && VALID_PRIORITIES.has(priorityParam)
      ? (priorityParam as KgSignalPriority)
      : undefined;

    const limit = limitParam ? Math.max(1, Math.min(Number(limitParam) || 50, 200)) : 50;

    const signals = await getKgSignals({
      priority,
      limit,
      active_only: true,
    });

    return NextResponse.json(
      {
        ok: true,
        signals,
        count: signals.length,
        source: 'supabase',
        fetched_at: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to fetch kg_signals.',
        signals: [],
        source: 'error',
      },
      { status: 500 },
    );
  }
}
