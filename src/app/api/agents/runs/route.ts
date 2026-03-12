import { NextResponse } from 'next/server';
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase/client';
import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';

export const dynamic = 'force-dynamic';

interface AgentRunRow {
  id: string;
  agent_id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  items_processed: number | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
}

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({
    key: `agent-runs-list:${ip}`,
    maxRequests: 15,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, runs: [] });
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('agent_runs')
      .select('id, agent_id, status, started_at, finished_at, items_processed, error_message, metadata')
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 },
      );
    }

    const runs: AgentRunRow[] = (data ?? []) as AgentRunRow[];

    return NextResponse.json({ ok: true, runs });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch agent runs.';
    return NextResponse.json(
      { ok: false, message },
      { status: 500 },
    );
  }
}
