export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { enrichSignalLocally } from '@/lib/intelligence/keyword-enrichment-worker';

export const maxDuration = 300;

/**
 * POST /api/agents/batch-keyword-enrich
 * 
 * Enriches signals using keyword rules — no AI API key needed.
 * Processes in batches until all signals have meaning/direction/el_paso data.
 * 
 * Body: { batch_size?: number }  (default 200, max 500)
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const batchSize = Math.min(parseInt(body.batch_size ?? '200'), 500);

  const db = createClient();

  // Fetch unenriched, non-noise signals
  const { data: signals, error } = await db
    .from('intel_signals')
    .select('id, title, industry, signal_type, source_domain')
    .is('meaning', null)
    .eq('is_noise', false)
    .limit(batchSize);

  if (error || !signals) {
    return NextResponse.json({ ok: false, error: error?.message ?? 'fetch failed' }, { status: 500 });
  }

  if (signals.length === 0) {
    const { count } = await db
      .from('intel_signals')
      .select('*', { count: 'exact', head: true })
      .is('meaning', null)
      .eq('is_noise', false);
    return NextResponse.json({ ok: true, enriched: 0, remaining: count ?? 0, message: 'All signals enriched' });
  }

  // Enrich each signal locally
  const updates = signals.map(s => {
    const enriched = enrichSignalLocally({
      title: s.title,
      industry: s.industry,
      signal_type: s.signal_type,
      source_domain: s.source_domain ?? undefined,
    });
    return {
      id: s.id,
      meaning: enriched.meaning,
      direction: enriched.direction,
      el_paso_score: enriched.el_paso_score,
      el_paso_angle: enriched.el_paso_angle,
      enriched_at: new Date().toISOString(),
    };
  });

  // Upsert in one batch
  const { error: upsertError } = await db
    .from('intel_signals')
    .upsert(updates, { onConflict: 'id' });

  if (upsertError) {
    return NextResponse.json({ ok: false, error: upsertError.message }, { status: 500 });
  }

  // Count remaining
  const { count: remaining } = await db
    .from('intel_signals')
    .select('*', { count: 'exact', head: true })
    .is('meaning', null)
    .eq('is_noise', false);

  return NextResponse.json({
    ok: true,
    enriched: signals.length,
    remaining: remaining ?? 0,
    coverage_pct: Math.round(((5779 - (remaining ?? 0)) / 5779) * 100),
  });
}

/**
 * GET /api/agents/batch-keyword-enrich
 * Returns enrichment progress stats
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase not configured' });
  }
  const db = createClient();

  const [{ count: total }, { count: enriched }, { count: epRelevant }] = await Promise.all([
    db.from('intel_signals').select('*', { count: 'exact', head: true }).eq('is_noise', false),
    db.from('intel_signals').select('*', { count: 'exact', head: true }).not('meaning', 'is', null).eq('is_noise', false),
    db.from('intel_signals').select('*', { count: 'exact', head: true }).gte('el_paso_score', 30).eq('is_noise', false),
  ]);

  return NextResponse.json({
    ok: true,
    total: total ?? 0,
    enriched: enriched ?? 0,
    remaining: (total ?? 0) - (enriched ?? 0),
    coverage_pct: total ? Math.round(((enriched ?? 0) / total) * 100) : 0,
    ep_relevant: epRelevant ?? 0,
  });
}
