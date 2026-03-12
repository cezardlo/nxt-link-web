// src/db/queries/kg-technologies.ts — CRUD for kg_technologies table

import { getDb, isSupabaseConfigured } from '../client';

// ─── Types (matches actual DB schema) ────────────────────────────────────────

export type KgTechnologyRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  maturity_stage: string | null;
  adoption_curve_position: string | null;
  radar_quadrant: string | null;
  iker_score: number | null;
  signal_velocity: number | null;
  fts: string | null;
  created_at: string;
  updated_at: string;
};

export type KgTechnologyInsert = {
  slug: string;
  name: string;
  description?: string | null;
  maturity_stage?: string | null;
  adoption_curve_position?: string | null;
  radar_quadrant?: string | null;
  iker_score?: number | null;
  signal_velocity?: number | null;
  // Backward compat aliases
  maturity?: string | null;
  quadrant?: string | null;
  tags?: string[];
  aliases?: string[];
  metadata?: Record<string, unknown>;
};

export type KgTechnologyQueryOptions = {
  limit?: number;
  maturity_stage?: string;
  radar_quadrant?: string;
};

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Upsert a technology by slug. Returns the row id or null. */
export async function upsertKgTechnology(data: KgTechnologyInsert): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb({ admin: true });
  const now = new Date().toISOString();

  const { data: row, error } = await db
    .from('kg_technologies')
    .upsert(
      {
        slug: data.slug,
        name: data.name,
        description: data.description ?? null,
        maturity_stage: data.maturity_stage ?? data.maturity ?? null,
        radar_quadrant: data.radar_quadrant ?? data.quadrant ?? null,
        iker_score: data.iker_score ?? null,
        signal_velocity: data.signal_velocity ?? null,
        updated_at: now,
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .maybeSingle();

  if (error) {
    console.warn('[kg-technologies] upsert error:', error.message);
    return null;
  }

  return (row as { id: string } | null)?.id ?? null;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** List technologies with optional filters */
export async function getKgTechnologies(
  opts: KgTechnologyQueryOptions = {},
): Promise<KgTechnologyRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const limit = Math.max(1, Math.min(opts.limit ?? 100, 1000));

  let query = db
    .from('kg_technologies')
    .select('*')
    .order('name')
    .limit(limit);

  if (opts.maturity_stage) query = query.eq('maturity_stage', opts.maturity_stage);
  if (opts.radar_quadrant) query = query.eq('radar_quadrant', opts.radar_quadrant);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as KgTechnologyRow[];
}

/** Get a single technology by slug */
export async function getKgTechnologyBySlug(slug: string): Promise<KgTechnologyRow | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb();
  const { data, error } = await db
    .from('kg_technologies')
    .select('*')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as KgTechnologyRow;
}

/** Full-text search technologies using the fts column */
export async function searchKgTechnologies(
  query: string,
  limit: number = 20,
): Promise<KgTechnologyRow[]> {
  if (!isSupabaseConfigured() || !query.trim()) return [];

  const db = getDb();
  const cap = Math.max(1, Math.min(limit, 200));

  // Try FTS first, fall back to ilike if no results
  const { data, error } = await db
    .from('kg_technologies')
    .select('*')
    .textSearch('fts', query, { type: 'websearch' })
    .limit(cap);

  if (error || !data || data.length === 0) {
    // Fallback to ilike search
    const { data: fallback } = await db
      .from('kg_technologies')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(cap);
    return (fallback ?? []) as KgTechnologyRow[];
  }

  return data as KgTechnologyRow[];
}
