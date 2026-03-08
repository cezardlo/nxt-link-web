import { getDb, isSupabaseConfigured } from '../client';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ConferenceIntelRow = {
  id: string;
  conference_id: string | null;
  conference_name: string;
  company_name: string | null;
  role: string | null;
  signal_type: string | null;
  title: string | null;
  description: string | null;
  industry: string | null;
  technology_cluster: string | null;
  importance_score: number;
  source_url: string | null;
  event_date: string | null;
  discovered_at: string;
  created_at: string;
};

export type ConferenceIntelInsert = {
  id: string;
  conference_id?: string | null;
  conference_name: string;
  company_name?: string | null;
  role?: string | null;
  signal_type?: string | null;
  title?: string | null;
  description?: string | null;
  industry?: string | null;
  technology_cluster?: string | null;
  importance_score?: number;
  source_url?: string | null;
  event_date?: string | null;
};

// ─── Persistence ────────────────────────────────────────────────────────────────

/** Upsert conference intel records in batches */
export async function persistConferenceIntel(records: ConferenceIntelInsert[]): Promise<number> {
  if (!isSupabaseConfigured() || records.length === 0) return 0;

  const db = getDb({ admin: true });
  let persisted = 0;

  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    const { error } = await db
      .from('conference_intel')
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      console.warn('[conference-intel] upsert batch error:', error.message);
    } else {
      persisted += batch.length;
    }
  }

  return persisted;
}

// ─── Queries ────────────────────────────────────────────────────────────────────

export type ConferenceIntelQueryOptions = {
  conference_id?: string;
  company_name?: string;
  industry?: string;
  signal_type?: string;
  since?: string;
  limit?: number;
};

/** Query conference intelligence records */
export async function getConferenceIntel(
  options: ConferenceIntelQueryOptions = {},
): Promise<ConferenceIntelRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const limit = Math.max(1, Math.min(options.limit ?? 100, 500));

  let query = db
    .from('conference_intel')
    .select('*')
    .order('importance_score', { ascending: false })
    .order('discovered_at', { ascending: false })
    .limit(limit);

  if (options.conference_id) query = query.eq('conference_id', options.conference_id);
  if (options.company_name) query = query.ilike('company_name', `%${options.company_name}%`);
  if (options.industry) query = query.eq('industry', options.industry);
  if (options.signal_type) query = query.eq('signal_type', options.signal_type);
  if (options.since) query = query.gte('discovered_at', options.since);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as ConferenceIntelRow[];
}

/** Get conference activity stats */
export async function getConferenceIntelStats(): Promise<{
  total: number;
  by_conference: Record<string, number>;
  by_industry: Record<string, number>;
  top_companies: Array<{ name: string; count: number }>;
}> {
  if (!isSupabaseConfigured()) {
    return { total: 0, by_conference: {}, by_industry: {}, top_companies: [] };
  }

  const db = getDb();
  const { data, error } = await db
    .from('conference_intel')
    .select('conference_name, industry, company_name');

  if (error || !data) {
    return { total: 0, by_conference: {}, by_industry: {}, top_companies: [] };
  }

  const rows = data as Array<{ conference_name: string; industry: string | null; company_name: string | null }>;
  const by_conference: Record<string, number> = {};
  const by_industry: Record<string, number> = {};
  const companyCounts: Record<string, number> = {};

  for (const row of rows) {
    by_conference[row.conference_name] = (by_conference[row.conference_name] ?? 0) + 1;
    if (row.industry) by_industry[row.industry] = (by_industry[row.industry] ?? 0) + 1;
    if (row.company_name) companyCounts[row.company_name] = (companyCounts[row.company_name] ?? 0) + 1;
  }

  const top_companies = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, count]) => ({ name, count }));

  return { total: rows.length, by_conference, by_industry, top_companies };
}
