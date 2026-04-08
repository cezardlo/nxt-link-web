/**
 * GET /api/pipeline/health
 *
 * Returns data freshness for every ingestion table.
 * Hit this to see if the pipeline is actually running.
 */

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getDb, isSupabaseConfigured } from '@/db/client';


type TableHealth = {
  table: string;
  latest_row: string | null;
  row_count: number;
  age_minutes: number | null;
  status: 'fresh' | 'stale' | 'dead' | 'empty';
};

const FRESHNESS_TABLES = [
  { table: 'kg_signals', ts_col: 'detected_at', stale_min: 360, dead_min: 1440 },
  { table: 'kg_discoveries', ts_col: 'created_at', stale_min: 720, dead_min: 2880 },
  { table: 'raw_feed_items', ts_col: 'created_at', stale_min: 240, dead_min: 720 },
  { table: 'intel_signals', ts_col: 'created_at', stale_min: 240, dead_min: 720 },
  { table: 'intel_clusters', ts_col: 'updated_at', stale_min: 360, dead_min: 1440 },
  { table: 'intel_trends', ts_col: 'created_at', stale_min: 360, dead_min: 1440 },
  { table: 'cluster_narratives', ts_col: 'generated_at', stale_min: 720, dead_min: 2880 },
] as const;

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase not configured' }, { status: 503 });
  }

  const db = getDb({ admin: true });
  const now = Date.now();
  const results: TableHealth[] = [];
  let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';

  for (const { table, ts_col, stale_min, dead_min } of FRESHNESS_TABLES) {
    try {
      // Get latest row timestamp
      const { data: latest } = await db
        .from(table)
        .select(ts_col)
        .order(ts_col, { ascending: false })
        .limit(1)
        .single();

      // Get approximate count (last 24h)
      const oneDayAgo = new Date(now - 86_400_000).toISOString();
      const { count } = await db
        .from(table)
        .select('*', { count: 'exact', head: true })
        .gte(ts_col, oneDayAgo);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const latestTs = (latest as Record<string, any> | null)?.[ts_col] as string | null;
      const ageMs = latestTs ? now - new Date(latestTs).getTime() : null;
      const ageMinutes = ageMs !== null ? Math.round(ageMs / 60_000) : null;

      let status: TableHealth['status'] = 'empty';
      if (ageMinutes === null) {
        status = 'empty';
      } else if (ageMinutes > dead_min) {
        status = 'dead';
        overallStatus = 'critical';
      } else if (ageMinutes > stale_min) {
        status = 'stale';
        if (overallStatus === 'healthy') overallStatus = 'degraded';
      } else {
        status = 'fresh';
      }

      results.push({
        table,
        latest_row: latestTs,
        row_count: count ?? 0,
        age_minutes: ageMinutes,
        status,
      });
    } catch {
      results.push({
        table,
        latest_row: null,
        row_count: 0,
        age_minutes: null,
        status: 'empty',
      });
    }
  }

  const staleCount = results.filter(r => r.status === 'stale' || r.status === 'dead').length;
  const freshCount = results.filter(r => r.status === 'fresh').length;

  return NextResponse.json({
    ok: true,
    checked_at: new Date().toISOString(),
    overall: overallStatus,
    summary: `${freshCount}/${results.length} tables fresh, ${staleCount} stale/dead`,
    tables: results,
  });
}
