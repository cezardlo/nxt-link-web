// src/db/queries/kg-industries.ts — CRUD for kg_industries table

import { getDb, isSupabaseConfigured } from '../client';

// ─── Types (matches actual DB schema) ────────────────────────────────────────

export type KgIndustryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parent_industry_id: string | null;
  iker_score: number | null;
  created_at: string;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/** List all industries, ordered by name */
export async function getKgIndustries(): Promise<KgIndustryRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const { data, error } = await db
    .from('kg_industries')
    .select('*')
    .order('name');

  if (error || !data) return [];
  return data as KgIndustryRow[];
}

/** Get a single industry by slug */
export async function getKgIndustryBySlug(slug: string): Promise<KgIndustryRow | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb();
  const { data, error } = await db
    .from('kg_industries')
    .select('*')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as KgIndustryRow;
}

/** Search industries by name (ilike) */
export async function searchKgIndustries(
  query: string,
  limit: number = 20,
): Promise<KgIndustryRow[]> {
  if (!isSupabaseConfigured() || !query.trim()) return [];

  const db = getDb();
  const cap = Math.max(1, Math.min(limit, 200));

  const { data, error } = await db
    .from('kg_industries')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(cap);

  if (error || !data) return [];
  return data as KgIndustryRow[];
}
