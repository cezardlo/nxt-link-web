// src/db/queries/raw-feed-items.ts — CRUD for raw_feed_items table

import { getDb, isSupabaseConfigured } from '../client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RawFeedItemRow = {
  id: string;
  url: string;
  title: string | null;
  content: string | null;
  source: string | null;
  source_type: string | null;
  published_at: string | null;
  processed: boolean;
  extracted_entities: Record<string, unknown> | null;
  created_at: string;
  // Alias for entity extraction agent compatibility
  source_name: string | null;
};

export type RawFeedItemInsert = {
  url: string;
  title?: string | null;
  content?: string | null;
  source?: string | null;
  source_type?: string | null;
  published_at?: string | null;
};

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Insert a raw feed item, deduplicating by URL (ON CONFLICT DO NOTHING). Returns the id or null. */
export async function insertRawFeedItem(data: RawFeedItemInsert): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb({ admin: true });

  const { data: row, error } = await db
    .from('raw_feed_items')
    .upsert(
      {
        url: data.url,
        title: data.title ?? null,
        content: data.content ?? null,
        source: data.source ?? null,
        source_type: data.source_type ?? null,
        published_at: data.published_at ?? null,
        processed: false,
      },
      { onConflict: 'url', ignoreDuplicates: true },
    )
    .select('id')
    .maybeSingle();

  if (error) {
    console.warn('[raw-feed-items] insert error:', error.message);
    return null;
  }

  // ignoreDuplicates returns null data on conflict — that's expected
  return (row as { id: string } | null)?.id ?? null;
}

/** Get unprocessed feed items, oldest first */
export async function getUnprocessedFeedItems(
  limit: number = 50,
): Promise<RawFeedItemRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const cap = Math.max(1, Math.min(limit, 500));

  const { data, error } = await db
    .from('raw_feed_items')
    .select('*')
    .eq('processed', false)
    .order('created_at', { ascending: true })
    .limit(cap);

  if (error || !data) return [];
  // Map source → source_name for backward compat with entity extraction agent
  return (data as Array<Record<string, unknown>>).map(row => ({
    ...row,
    source_name: row.source as string | null,
  })) as RawFeedItemRow[];
}

/** Mark a feed item as processed, optionally storing extracted entities */
export async function markFeedItemProcessed(
  id: string,
  extractedEntities?: Record<string, unknown>,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const db = getDb({ admin: true });

  const updatePayload: Record<string, unknown> = {
    processed: true,
  };

  if (extractedEntities !== undefined) {
    updatePayload.extracted_entities = extractedEntities;
  }

  const { error } = await db
    .from('raw_feed_items')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    console.warn('[raw-feed-items] markProcessed error:', error.message);
    return false;
  }

  return true;
}
