// GET /api/iker/leaderboard
// Returns top entities sorted by IKER score.
// Sources: Supabase knowledge graph entities (with iker_score in metadata)
// + ml_patterns persisted IKER scores from the learning loop.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getDb, isSupabaseConfigured } from '@/db/client';
import { loadAllPatterns } from '@/db/queries/ml-patterns';
import { NXT_ENTITIES } from '@/lib/intelligence/nxt-entities';


export type IkerEntry = {
  id: string;
  name: string;
  category: string;
  iker_score: number;
  delta: number;       // Change since last update
  trend: 'rising' | 'stable' | 'falling';
  signal_count: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
  const category = searchParams.get('category') ?? null;

  // Build leaderboard from 3 sources (merged, deduped by id):
  // 1. ml_patterns IKER scores (most up-to-date — updated every cron run)
  // 2. Supabase entities table (seeded IKER scores)
  // 3. Hardcoded NXT_ENTITIES (fallback)

  const ikerMap = new Map<string, IkerEntry>();

  // Layer 1: Hardcoded entity baseline
  for (const entity of NXT_ENTITIES) {
    if (entity.ikerScore === undefined) continue;
    if (category && entity.category !== category) continue;
    ikerMap.set(entity.id, {
      id: entity.id,
      name: entity.name,
      category: entity.category,
      iker_score: entity.ikerScore,
      delta: 0,
      trend: 'stable',
      signal_count: 0,
    });
  }

  // Layer 2: Supabase entities (overrides hardcoded if exists)
  if (isSupabaseConfigured()) {
    const db = getDb();
    const { data } = await db
      .from('entities')
      .select('slug, name, entity_type, metadata')
      .eq('entity_type', 'company')
      .not('metadata->iker_score', 'is', null)
      .order('metadata->iker_score' as 'metadata', { ascending: false })
      .limit(500);

    if (data) {
      for (const row of data as Array<{ slug: string; name: string; entity_type: string; metadata: Record<string, unknown> }>) {
        const score = typeof row.metadata?.iker_score === 'number' ? row.metadata.iker_score : null;
        if (score === null) continue;
        const cat = (row.metadata?.category as string) ?? 'Unknown';
        if (category && cat !== category) continue;
        const existing = ikerMap.get(row.slug);
        ikerMap.set(row.slug, {
          id: row.slug,
          name: row.name,
          category: cat,
          iker_score: score,
          delta: existing ? score - existing.iker_score : 0,
          trend: 'stable',
          signal_count: 0,
        });
      }
    }
  }

  // Layer 3: ml_patterns IKER overrides (most current)
  const patterns = await loadAllPatterns().catch(() => new Map<string, Record<string, unknown>>());
  for (const [key, data] of Array.from(patterns.entries() as Iterable<[string, Record<string, unknown>]>)) {
    if (!key.startsWith('learning:iker:')) continue;
    const entityId = key.replace('learning:iker:', '');
    const newScore = typeof data.score === 'number' ? data.score : null;
    if (newScore === null) continue;

    const existing = ikerMap.get(entityId);
    if (existing) {
      const delta = newScore - existing.iker_score;
      ikerMap.set(entityId, {
        ...existing,
        iker_score: newScore,
        delta,
        trend: delta > 2 ? 'rising' : delta < -2 ? 'falling' : 'stable',
      });
    }
  }

  // Sort by IKER score descending
  const sorted = Array.from(ikerMap.values())
    .sort((a, b) => b.iker_score - a.iker_score)
    .slice(0, limit);

  return NextResponse.json({
    ok: true,
    count: sorted.length,
    leaderboard: sorted,
    source: isSupabaseConfigured() ? 'supabase+patterns' : 'hardcoded',
    updated_at: new Date().toISOString(),
  });
}
