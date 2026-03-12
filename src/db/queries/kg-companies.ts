// src/db/queries/kg-companies.ts — CRUD for kg_companies table

import { getDb, isSupabaseConfigured } from '../client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type KgCompanyRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  country_id: string | null;
  region_id: string | null;
  company_type: string | null;
  founded_year: number | null;
  employee_count_range: string | null;
  total_funding_usd: number | null;
  website: string | null;
  linkedin_url: string | null;
  iker_score: number | null;
  latitude: number | null;
  longitude: number | null;
  fts: string | null;
  created_at: string;
  updated_at: string;
};

export type KgCompanyInsert = {
  slug: string;
  name: string;
  description?: string | null;
  country_id?: string | null;
  region_id?: string | null;
  company_type?: string | null;
  founded_year?: number | null;
  employee_count_range?: string | null;
  total_funding_usd?: number | null;
  website?: string | null;
  linkedin_url?: string | null;
  iker_score?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  // Aliases for backward compatibility with entity extraction agent
  industry?: string | null;
  metadata?: Record<string, unknown>;
};

export type KgCompanyQueryOptions = {
  limit?: number;
  company_type?: string;
  country_id?: string;
};

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Upsert a company by slug. Returns the row id or null. */
export async function upsertKgCompany(data: KgCompanyInsert): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb({ admin: true });
  const now = new Date().toISOString();

  const { data: row, error } = await db
    .from('kg_companies')
    .upsert(
      {
        slug: data.slug,
        name: data.name,
        description: data.description ?? null,
        country_id: data.country_id ?? null,
        region_id: data.region_id ?? null,
        company_type: data.company_type ?? null,
        founded_year: data.founded_year ?? null,
        employee_count_range: data.employee_count_range ?? null,
        total_funding_usd: data.total_funding_usd ?? null,
        website: data.website ?? null,
        linkedin_url: data.linkedin_url ?? null,
        iker_score: data.iker_score ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        updated_at: now,
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .maybeSingle();

  if (error) {
    console.warn('[kg-companies] upsert error:', error.message);
    return null;
  }

  return (row as { id: string } | null)?.id ?? null;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** List companies with optional filters */
export async function getKgCompanies(
  opts: KgCompanyQueryOptions = {},
): Promise<KgCompanyRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const limit = Math.max(1, Math.min(opts.limit ?? 100, 1000));

  let query = db
    .from('kg_companies')
    .select('*')
    .order('name')
    .limit(limit);

  if (opts.company_type) query = query.eq('company_type', opts.company_type);
  if (opts.country_id) query = query.eq('country_id', opts.country_id);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as KgCompanyRow[];
}

/** Get a single company by slug */
export async function getKgCompanyBySlug(slug: string): Promise<KgCompanyRow | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb();
  const { data, error } = await db
    .from('kg_companies')
    .select('*')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as KgCompanyRow;
}

/** Full-text search companies using the fts column */
export async function searchKgCompanies(
  query: string,
  limit: number = 20,
): Promise<KgCompanyRow[]> {
  if (!isSupabaseConfigured() || !query.trim()) return [];

  const db = getDb();
  const cap = Math.max(1, Math.min(limit, 200));

  const { data, error } = await db
    .from('kg_companies')
    .select('*')
    .textSearch('fts', query, { type: 'websearch' })
    .limit(cap);

  if (error || !data) return [];
  return data as KgCompanyRow[];
}
