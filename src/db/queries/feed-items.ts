import { getDb, isSupabaseConfigured } from '../client';

// Feed items stored in `feed_signals` table (matches full-schema.sql shape).
// Functions return gracefully when Supabase is not configured or table errors occur.

export type FeedItemRow = {
  id: string;
  title: string;
  source: string;
  source_url: string;
  category: string;
  vendor: string | null;
  sentiment: string | null;
  iker_score: number | null;
  published_at: string | null;
  created_at: string;
};

export type FeedItemInsert = {
  id: string;
  title: string;
  source: string;
  source_url: string;
  category: string;
  vendor?: string | null;
  sentiment?: string | null;
  iker_score?: number | null;
  published_at?: string | null;
};

export async function upsertFeedItems(items: FeedItemInsert[]): Promise<void> {
  if (!isSupabaseConfigured() || items.length === 0) return;

  const db = getDb({ admin: true });
  const { error } = await db
    .from('feed_signals')
    .upsert(items, { onConflict: 'id', ignoreDuplicates: true });

  if (error) {
    // Table may not exist yet — swallow gracefully.
    console.warn('[feed-items] upsert warning:', error.message);
  }
}

export type FeedQueryOptions = {
  category?: string;
  limit?: number;
  since?: string;
};

export async function queryFeedItems(options: FeedQueryOptions = {}): Promise<FeedItemRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb({ admin: true });
  const limit = Math.max(1, Math.min(options.limit ?? 50, 500));

  let query = db
    .from('feed_signals')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (options.category) {
    query = query.eq('category', options.category);
  }
  if (options.since) {
    query = query.gte('published_at', options.since);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data as FeedItemRow[];
}

export async function cleanOldItems(olderThanDays = 30): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const db = getDb({ admin: true });
  const cutoff = new Date(Date.now() - olderThanDays * 86_400_000).toISOString();

  const { error } = await db
    .from('feed_signals')
    .delete()
    .lt('published_at', cutoff);

  if (error) {
    console.warn('[feed-items] cleanOldItems warning:', error.message);
  }
}
