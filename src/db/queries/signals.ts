import { getDb, isSupabaseConfigured } from '../client';

// Matches `public.signals` table shape from full-schema.sql.

export type SignalRow = {
  id: string;
  title: string;
  source: string;
  source_url: string | null;
  category: string | null;
  vendor_name: string | null;
  sentiment: 'positive' | 'negative' | 'neutral' | null;
  iker_score: number | null;
  published_at: string | null;
  created_at: string;
};

export type SignalInsert = {
  id?: string;
  title: string;
  source: string;
  source_url?: string | null;
  category?: string | null;
  vendor_name?: string | null;
  sentiment?: 'positive' | 'negative' | 'neutral' | null;
  iker_score?: number | null;
  published_at?: string | null;
};

export async function insertSignal(signal: SignalInsert): Promise<SignalRow | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('signals')
    .insert(signal)
    .select()
    .maybeSingle();

  if (error) {
    console.warn('[signals] insert warning:', error.message);
    return null;
  }

  return data as SignalRow | null;
}

export type SignalQueryOptions = {
  category?: string;
  vendor_name?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  limit?: number;
  since?: string;
};

export async function getActiveSignals(options: SignalQueryOptions = {}): Promise<SignalRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const limit = Math.max(1, Math.min(options.limit ?? 100, 1000));

  let query = db
    .from('signals')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (options.category) {
    query = query.eq('category', options.category);
  }
  if (options.vendor_name) {
    query = query.eq('vendor_name', options.vendor_name);
  }
  if (options.sentiment) {
    query = query.eq('sentiment', options.sentiment);
  }
  if (options.since) {
    query = query.gte('published_at', options.since);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data as SignalRow[];
}
