// src/lib/agents/persist/feed-persister.ts
// Bulk-inserts raw feed items into the raw_feed_items table with URL dedup.

import { getDb, isSupabaseConfigured } from '@/db/client';

// ── Types ──────────────────────────────────────────────────────────────────────

export type RawFeedItemInput = {
  title: string;
  url: string;
  source: string;
  source_type: 'news' | 'research' | 'patent' | 'startup' | 'policy' | 'social';
  content?: string;
  published_at?: string;
};

type RawFeedItemRow = {
  source: string;
  source_type: string;
  title: string;
  url: string;
  content: string | null;
  published_at: string | null;
};

// ── Persistence ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 100;

/**
 * Bulk-insert raw feed items into `raw_feed_items`.
 * Uses upsert with `ignoreDuplicates: true` on the `url` unique constraint
 * to achieve ON CONFLICT(url) DO NOTHING semantics.
 *
 * Returns the count of newly inserted items.
 */
export async function persistRawFeedItems(
  items: RawFeedItemInput[],
): Promise<number> {
  if (!isSupabaseConfigured() || items.length === 0) return 0;

  // Deduplicate by URL within the batch itself
  const seenUrls = new Set<string>();
  const uniqueItems: RawFeedItemInput[] = [];
  for (const item of items) {
    if (!item.url || seenUrls.has(item.url)) continue;
    seenUrls.add(item.url);
    uniqueItems.push(item);
  }

  if (uniqueItems.length === 0) return 0;

  const db = getDb({ admin: true });
  let inserted = 0;

  const rows: RawFeedItemRow[] = uniqueItems.map((item) => ({
    source: item.source,
    source_type: item.source_type,
    title: item.title.slice(0, 500),
    url: item.url,
    content: item.content?.slice(0, 5000) ?? null,
    published_at: item.published_at ?? null,
  }));

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { data, error } = await db
      .from('raw_feed_items')
      .upsert(batch, { onConflict: 'url', ignoreDuplicates: true })
      .select('id');

    if (error) {
      console.warn('[feed-persister] upsert batch error:', error.message);
    } else {
      inserted += data?.length ?? 0;
    }
  }

  return inserted;
}
