import { NextResponse } from 'next/server';

import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase/client';
import { isVectorEnabled } from '@/lib/vector';
import { isGraphEnabled } from '@/lib/graph';
import { isEmbeddingEnabled } from '@/lib/embeddings';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Env-var inventory — report which keys are present without exposing values
// ---------------------------------------------------------------------------
const ENV_KEYS = [
  'GEMINI_API_KEY',
  'USAJOBS_API_KEY',
  'SAM_GOV_API_KEY',
  'USPTO_PATENTSVIEW_API_KEY',
  'FIRECRAWL_API_KEY',
  'OPENCORPORATES_API_TOKEN',
  'CRON_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'OLLAMA_BASE_URL',
  'INTEL_API_URL',
  'NEXT_PUBLIC_SITE_URL',
  'VERCEL_URL',
  'QDRANT_URL',
  'QDRANT_API_KEY',
  'NEO4J_URI',
  'NEO4J_PASSWORD',
  'OPENAI_API_KEY',
  'PIPELINE_API_KEY',
  'MCP_API_KEY',
] as const;

type EnvKey = (typeof ENV_KEYS)[number];

type EnvStatus = {
  key: EnvKey;
  set: boolean;
};

type HealthReport = {
  ok: boolean;
  timestamp: string;
  overall_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  supabase: {
    connected: boolean;
    vendors?: number;
    signals?: number;
    entities?: number;
    cron_last_run?: string | null;
  };
  feeds: {
    note: string;
    warm_endpoint: string;
  };
  env: EnvStatus[];
  summary: string;
};

export async function GET(): Promise<NextResponse> {
  // ── 1. Supabase connection ────────────────────────────────────────────────
  let supabase: HealthReport['supabase'] = { connected: false };

  if (isSupabaseConfigured()) {
    try {
      const db = getSupabaseClient();

      // Count rows in 3 tables + fetch last cron run timestamp in parallel.
      // The cron route writes its started_at to agent_runs; if that table
      // doesn't exist the query gracefully returns null.
      const [v, s, e, cronRow] = await Promise.all([
        db.from('vendors').select('id', { count: 'exact', head: true }),
        db.from('intel_signals').select('id', { count: 'exact', head: true }),
        db.from('kg_entities').select('id', { count: 'exact', head: true }),
        db
          .from('agent_runs')
          .select('started_at')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      supabase = {
        connected: true,
        vendors: v.count ?? 0,
        signals: s.count ?? 0,
        entities: e.count ?? 0,
        cron_last_run: (cronRow.data as { started_at: string } | null)?.started_at ?? null,
      };
    } catch {
      supabase = { connected: false };
    }
  }

  // ── 1b. Intelligence layer services ──────────────────────────────────────
  const intelligence = {
    qdrant: isVectorEnabled(),
    neo4j: isGraphEnabled(),
    openai: isEmbeddingEnabled(),
    hybridSearch: isVectorEnabled() && isEmbeddingEnabled(),
    connectionEngine: isGraphEnabled(),
    pipeline: isEmbeddingEnabled(), // at minimum needs embeddings
  };

  // ── 2. Feed cache note (in-memory cache is per-instance; no cross-check) ──
  const feeds: HealthReport['feeds'] = {
    note: 'Feed cache is in-memory per serverless instance. POST /api/feeds to warm, or rely on the cron pipeline.',
    warm_endpoint: '/api/feeds',
  };

  // ── 3. Env-var inventory ──────────────────────────────────────────────────
  const env: EnvStatus[] = ENV_KEYS.map((key) => ({
    key,
    set: Boolean(process.env[key]),
  }));

  // ── 4. Grade based on Supabase + critical env vars ────────────────────────
  const criticalKeys: EnvKey[] = ['GEMINI_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  const criticalMissing = criticalKeys.filter((k) => !process.env[k]);
  const optionalMissing = ENV_KEYS.filter(
    (k) => !criticalKeys.includes(k) && !process.env[k],
  );

  const problems: string[] = [];
  if (!supabase.connected) problems.push('Supabase disconnected');
  for (const k of criticalMissing) problems.push(`Missing critical env var: ${k}`);
  for (const k of optionalMissing) problems.push(`Missing optional env var: ${k}`);

  const criticalOk = supabase.connected && criticalMissing.length === 0;
  let grade: HealthReport['overall_grade'] = 'F';
  if (criticalOk && optionalMissing.length === 0) grade = 'A';
  else if (criticalOk && optionalMissing.length <= 3) grade = 'B';
  else if (criticalOk && optionalMissing.length <= 6) grade = 'C';
  else if (criticalOk) grade = 'D';

  const report = {
    ok: grade !== 'F',
    timestamp: new Date().toISOString(),
    overall_grade: grade,
    supabase,
    intelligence,
    feeds,
    env,
    summary:
      problems.length === 0
        ? 'All checks passed. Platform healthy.'
        : `${problems.length} issue(s): ${problems.join('; ')}`,
  };

  return NextResponse.json(report, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
