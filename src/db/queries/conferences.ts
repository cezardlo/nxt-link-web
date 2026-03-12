// src/db/queries/conferences.ts — conference data access with TS fallback

import { getDb, isSupabaseConfigured } from '../client';
import { CONFERENCES, type ConferenceRecord } from '@/lib/data/conferences';

export type { ConferenceRecord };

/** Get all conferences — tries Supabase first, falls back to hardcoded data */
export async function getConferences(): Promise<readonly ConferenceRecord[]> {
  if (!isSupabaseConfigured()) return CONFERENCES;

  try {
    const db = getDb();
    const { data, error } = await db
      .from('conferences')
      .select('*')
      .order('relevance_score', { ascending: false });

    if (error || !data || data.length === 0) return CONFERENCES;

    const records: ConferenceRecord[] = data.map(row => ({
      id: row.id as string,
      name: row.name as string,
      category: row.category as ConferenceRecord['category'],
      location: row.location as string,
      month: (row.month ?? '') as string,
      description: (row.description ?? '') as string,
      estimatedExhibitors: (row.estimated_exhibitors ?? 0) as number,
      relevanceScore: (row.relevance_score ?? 50) as number,
      website: (row.website ?? '') as string,
      lat: (row.lat ?? 0) as number,
      lon: (row.lon ?? 0) as number,
    }));

    return records.length > 0 ? records : CONFERENCES;
  } catch {
    return CONFERENCES;
  }
}

/** Search conferences by name/category */
export async function searchConferences(query: string): Promise<ConferenceRecord[]> {
  const q = query.toLowerCase();
  // Always search from TS data (fast, no network)
  return CONFERENCES.filter(
    c => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.location.toLowerCase().includes(q)
  ).slice(0, 20) as ConferenceRecord[];
}

/** Upsert conferences into Supabase (for seed script) */
export async function upsertConferences(conferences: readonly ConferenceRecord[]): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const db = getDb({ admin: true });
  let count = 0;

  for (let i = 0; i < conferences.length; i += 100) {
    const batch = conferences.slice(i, i + 100).map(c => ({
      id: c.id,
      name: c.name,
      category: c.category,
      location: c.location,
      month: c.month,
      description: c.description,
      estimated_exhibitors: c.estimatedExhibitors,
      relevance_score: c.relevanceScore,
      website: c.website,
      lat: c.lat,
      lon: c.lon,
    }));

    const { error } = await db
      .from('conferences')
      .upsert(batch, { onConflict: 'id' });

    if (!error) count += batch.length;
  }

  return count;
}
