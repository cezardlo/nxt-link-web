// src/db/queries/kg-discoveries.ts — CRUD for kg_discoveries table

import { getDb, isSupabaseConfigured } from '../client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type KgDiscoveryRow = {
  id: string;
  title: string;
  summary: string | null;
  discovery_type: string;
  source_url: string | null;
  source_name: string | null;
  research_institution: string | null;
  country_id: string | null;
  trl_level: number | null;
  published_at: string | null;
  iker_impact_score: number | null;
  created_at: string;
};

export type KgDiscoveryInsert = {
  title: string;
  discovery_type?: string;
  summary?: string | null;
  source_url?: string | null;
  source_name?: string | null;
  research_institution?: string | null;
  country_id?: string | null;
  trl_level?: number | null;
  published_at?: string | null;
  iker_impact_score?: number | null;
  // Aliases for backward compatibility with entity extraction agent
  type?: string;
  industry?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type KgDiscoveryQueryOptions = {
  limit?: number;
  discovery_type?: string;
  country_id?: string;
};

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Insert a new discovery. Returns the row id or null. */
export async function insertKgDiscovery(data: KgDiscoveryInsert): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb({ admin: true });

  const institution = data.research_institution
    ?? (data.metadata as Record<string, unknown> | undefined)?.institution as string | undefined
    ?? null;

  const trl = data.trl_level
    ?? (data.metadata as Record<string, unknown> | undefined)?.trl as number | undefined
    ?? null;

  const { data: row, error } = await db
    .from('kg_discoveries')
    .insert({
      title: data.title,
      summary: data.summary ?? null,
      discovery_type: data.discovery_type ?? data.type ?? 'technology',
      source_url: data.source_url ?? null,
      source_name: data.source_name ?? null,
      research_institution: institution,
      country_id: data.country_id ?? null,
      trl_level: trl,
      published_at: data.published_at ?? null,
      iker_impact_score: data.iker_impact_score ?? null,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.warn('[kg-discoveries] insert error:', error.message);
    return null;
  }

  return (row as { id: string } | null)?.id ?? null;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** List discoveries with optional filters, ordered by created_at desc */
export async function getKgDiscoveries(
  opts: KgDiscoveryQueryOptions = {},
): Promise<KgDiscoveryRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const limit = Math.max(1, Math.min(opts.limit ?? 100, 1000));

  let query = db
    .from('kg_discoveries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (opts.discovery_type) query = query.eq('discovery_type', opts.discovery_type);
  if (opts.country_id) query = query.eq('country_id', opts.country_id);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as KgDiscoveryRow[];
}
