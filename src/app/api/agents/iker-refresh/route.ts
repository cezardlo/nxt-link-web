// POST /api/agents/iker-refresh
// Runs the IKER (Innovation Knowledge Entity Rating) scoring agent against all
// known companies, technologies, and legacy vendors. Writes updated scores back
// to Supabase when configured. Safe to call multiple times — scores are
// overwritten, not appended.
//
// Protected by CRON_SECRET (same header used by /api/agents/cron).

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/db/client';
import { runIkerScoringAgent, type IkerScoringResult } from '@/lib/agents/agents/iker-scoring-agent';
import { requireCronSecret } from '@/lib/http/cron-auth';

export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = requireCronSecret(request.headers);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }

  const supabaseReady = isSupabaseConfigured();
  const start = Date.now();

  let result: IkerScoringResult;

  try {
    result = await runIkerScoringAgent();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[iker-refresh] Agent failed:', message);
    return NextResponse.json(
      { ok: false, message: `IKER scoring agent failed: ${message}` },
      { status: 500 },
    );
  }

  // Build top-10 by score for the response summary
  const topScores = [...result.scores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((s) => ({
      name: s.name,
      type: s.entityType,
      score: s.score,
      delta: s.delta ?? null,
    }));

  return NextResponse.json({
    ok: true,
    supabase_configured: supabaseReady,
    companies_scored: result.companies_scored,
    technologies_scored: result.technologies_scored,
    total_scored: result.scores.length,
    duration_ms: result.duration_ms,
    elapsed_ms: Date.now() - start,
    top_scores: topScores,
    message: supabaseReady
      ? `Scored ${result.scores.length} entities and persisted to Supabase`
      : `Scored ${result.scores.length} entities from local data (Supabase not configured)`,
  });
}

// Allow GET so the cron workflow can call this without a body
export async function GET(request: NextRequest): Promise<NextResponse> {
  return POST(request);
}
