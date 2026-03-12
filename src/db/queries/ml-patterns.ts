import { getDb, isSupabaseConfigured } from '../client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MlPatternRow = {
  pattern_key: string;
  pattern_data: Record<string, unknown>;
  agent: string | null;
  version: number;
  updated_at: string;
  created_at: string;
};

export type MlPatternUpsert = {
  pattern_key: string;
  pattern_data: Record<string, unknown>;
  agent?: string;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Get a single pattern by key */
export async function getMlPattern(key: string): Promise<MlPatternRow | null> {
  if (!isSupabaseConfigured()) return null;
  const db = getDb();
  const { data, error } = await db
    .from('ml_patterns')
    .select('*')
    .eq('pattern_key', key)
    .maybeSingle();
  if (error || !data) return null;
  return data as MlPatternRow;
}

/** Get all patterns for an agent */
export async function getMlPatternsByAgent(agent: string): Promise<MlPatternRow[]> {
  if (!isSupabaseConfigured()) return [];
  const db = getDb();
  const { data, error } = await db
    .from('ml_patterns')
    .select('*')
    .eq('agent', agent)
    .order('updated_at', { ascending: false });
  if (error || !data) return [];
  return data as MlPatternRow[];
}

/** Upsert a pattern (increments version on update) */
export async function setMlPattern(pattern: MlPatternUpsert): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const db = getDb({ admin: true });
  const now = new Date().toISOString();

  // Get current version
  const { data: existing } = await db
    .from('ml_patterns')
    .select('version')
    .eq('pattern_key', pattern.pattern_key)
    .maybeSingle();

  const version = existing ? (existing as { version: number }).version + 1 : 1;

  const { error } = await db
    .from('ml_patterns')
    .upsert(
      {
        pattern_key: pattern.pattern_key,
        pattern_data: pattern.pattern_data,
        agent: pattern.agent ?? null,
        version,
        updated_at: now,
      },
      { onConflict: 'pattern_key' },
    );

  return !error;
}

/** Bulk-load all patterns into a Map (for on-startup cache warm) */
export async function loadAllPatterns(): Promise<Map<string, Record<string, unknown>>> {
  if (!isSupabaseConfigured()) return new Map();
  const db = getDb();
  const { data, error } = await db.from('ml_patterns').select('pattern_key, pattern_data');
  if (error || !data) return new Map();
  const map = new Map<string, Record<string, unknown>>();
  for (const row of data as Array<{ pattern_key: string; pattern_data: Record<string, unknown> }>) {
    map.set(row.pattern_key, row.pattern_data);
  }
  return map;
}

/** Delete a pattern by key */
export async function deleteMlPattern(key: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const db = getDb({ admin: true });
  const { error } = await db.from('ml_patterns').delete().eq('pattern_key', key);
  return !error;
}
