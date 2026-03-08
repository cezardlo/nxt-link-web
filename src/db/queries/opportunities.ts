import { getDb, isSupabaseConfigured } from '../client';

// "Opportunities" maps to the ops scan run concept originally in SQLite.
// Stored in `ops_scan_runs` table; table may not exist yet in Supabase,
// so all functions return gracefully on error.

export type OpportunityRow = {
  id: string;
  query: string;
  industry: string;
  region: string;
  intent_mode: string;
  source_types_json: string;
  avg_confidence: number;
  risk_score: number;
  result_json: string;
  citations_json: string;
  created_at: string;
};

export type OpportunityInsert = {
  id?: string;
  query: string;
  industry: string;
  region: string;
  intent_mode: string;
  source_types_json: string;
  avg_confidence: number;
  risk_score: number;
  result_json: string;
  citations_json: string;
};

export async function upsertOpportunity(input: OpportunityInsert): Promise<OpportunityRow | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('ops_scan_runs')
    .upsert(input, { onConflict: 'id' })
    .select()
    .maybeSingle();

  if (error) {
    console.warn('[opportunities] upsert warning:', error.message);
    return null;
  }

  return data as OpportunityRow | null;
}

export type OpportunityQueryOptions = {
  industry?: string;
  region?: string;
  limit?: number;
};

export async function queryOpportunities(
  options: OpportunityQueryOptions = {},
): Promise<OpportunityRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb({ admin: true });
  const limit = Math.max(1, Math.min(options.limit ?? 50, 200));

  let query = db
    .from('ops_scan_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options.industry) {
    query = query.eq('industry', options.industry);
  }
  if (options.region) {
    query = query.eq('region', options.region);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data as OpportunityRow[];
}
