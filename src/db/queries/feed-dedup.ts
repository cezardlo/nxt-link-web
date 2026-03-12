// src/db/queries/feed-dedup.ts
// Feed deduplication — tracks URLs already ingested so the same article
// is never processed twice across runs. In-memory Set fallback for dev.

import { getDb, isSupabaseConfigured } from '../client';

// ─── In-memory fallback (dev / no Supabase) ──────────────────────────────────
const seenLocal = new Set<string>();

function hashUrl(url: string): string {
  // Simple deterministic hash — good enough for dedup
  let h = 0;
  for (let i = 0; i < url.length; i++) {
    h = (Math.imul(31, h) + url.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, '0');
}

// ─── Check if a batch of URLs has been seen ───────────────────────────────────

/**
 * Returns a Set of URL hashes that are already in the seen table.
 * Use this to filter articles before processing.
 */
export async function getSeenUrlHashes(urls: string[]): Promise<Set<string>> {
  if (!isSupabaseConfigured()) {
    return new Set(urls.filter(u => seenLocal.has(u)).map(hashUrl));
  }

  const hashes = urls.map(hashUrl);
  const db = getDb();
  const { data, error } = await db
    .from('feed_seen_urls')
    .select('url_hash')
    .in('url_hash', hashes);

  if (error || !data) return new Set<string>();
  return new Set((data as Array<{ url_hash: string }>).map(r => r.url_hash));
}

/**
 * Filter a list of items (with a `url` field) to only unseen ones.
 */
export async function filterUnseen<T extends { url?: string | null }>(
  items: T[],
  _sourceId?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<T[]> {
  const withUrls = items.filter(i => i.url);
  if (withUrls.length === 0) return items;

  const urls = withUrls.map(i => i.url!);

  if (!isSupabaseConfigured()) {
    const fresh = withUrls.filter(i => !seenLocal.has(i.url!));
    // Mark all as seen locally
    for (const i of withUrls) seenLocal.add(i.url!);
    return fresh;
  }

  const seenHashes = await getSeenUrlHashes(urls);
  return withUrls.filter(i => !seenHashes.has(hashUrl(i.url!)));
}

/**
 * Mark a list of URLs as seen in Supabase.
 * Call this AFTER successfully processing articles.
 */
export async function markUrlsSeen(urls: string[], sourceId?: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    for (const u of urls) seenLocal.add(u);
    return;
  }

  const rows = urls.map(url => ({
    url_hash: hashUrl(url),
    url,
    source_id: sourceId ?? null,
  }));

  const db = getDb({ admin: true });
  // Ignore conflicts — url_hash is the PK, duplicates are fine to skip
  await db.from('feed_seen_urls').upsert(rows, { onConflict: 'url_hash', ignoreDuplicates: true });
}

/**
 * Check if a single URL has been seen.
 */
export async function isUrlSeen(url: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return seenLocal.has(url);
  const seenSet = await getSeenUrlHashes([url]);
  return seenSet.has(hashUrl(url));
}
