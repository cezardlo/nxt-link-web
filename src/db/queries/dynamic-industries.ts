// src/db/queries/dynamic-industries.ts
// CRUD for dynamic_industries table — auto-discovered industries with parent-child hierarchy

import { getDb, isSupabaseConfigured } from '../client';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type DynamicIndustryRow = {
  id: string;
  slug: string;
  label: string;
  parent_slug: string | null;
  color: string;
  description: string | null;
  signal_count: number;
  product_count: number;
  source_count: number;
  last_scanned_at: string | null;
  scan_quality: 'pass' | 'warning' | 'fail' | null;
  executive_summary: string | null;
  is_core: boolean;
  popularity: number;
  created_at: string;
  updated_at: string;
};

export type DynamicIndustryUpsert = {
  slug: string;
  label: string;
  parent_slug?: string | null;
  color?: string;
  description?: string | null;
  signal_count?: number;
  product_count?: number;
  source_count?: number;
  last_scanned_at?: string | null;
  scan_quality?: 'pass' | 'warning' | 'fail' | null;
  executive_summary?: string | null;
  is_core?: boolean;
};

// ─── Queries ───────────────────────────────────────────────────────────────────

/** Get top industries by popularity (for homepage) */
export async function getTopIndustries(limit = 20): Promise<DynamicIndustryRow[]> {
  if (!isSupabaseConfigured()) return [];
  const db = getDb();
  const { data } = await db
    .from('dynamic_industries')
    .select('*')
    .order('popularity', { ascending: false })
    .limit(limit);
  return (data ?? []) as DynamicIndustryRow[];
}

/** Get recently scanned (active) industries */
export async function getRecentIndustries(limit = 10): Promise<DynamicIndustryRow[]> {
  if (!isSupabaseConfigured()) return [];
  const db = getDb();
  const { data } = await db
    .from('dynamic_industries')
    .select('*')
    .not('last_scanned_at', 'is', null)
    .eq('is_core', false)
    .order('last_scanned_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as DynamicIndustryRow[];
}

/** Get industry by slug */
export async function getDynamicIndustry(slug: string): Promise<DynamicIndustryRow | null> {
  if (!isSupabaseConfigured()) return null;
  const db = getDb();
  const { data } = await db
    .from('dynamic_industries')
    .select('*')
    .eq('slug', slug)
    .single();
  return (data as DynamicIndustryRow) ?? null;
}

/** Get children of a parent industry */
export async function getChildIndustries(parentSlug: string): Promise<DynamicIndustryRow[]> {
  if (!isSupabaseConfigured()) return [];
  const db = getDb();
  const { data } = await db
    .from('dynamic_industries')
    .select('*')
    .eq('parent_slug', parentSlug)
    .order('popularity', { ascending: false });
  return (data ?? []) as DynamicIndustryRow[];
}

/** Upsert an industry (create or update). Bumps popularity +1 on conflict. */
export async function upsertDynamicIndustry(industry: DynamicIndustryUpsert): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const db = getDb();

  // Check if exists
  const { data: existing } = await db
    .from('dynamic_industries')
    .select('id, popularity')
    .eq('slug', industry.slug)
    .single();

  if (existing) {
    // Update: bump popularity, update scan data
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      popularity: (existing.popularity ?? 0) + 1,
    };
    if (industry.label) updates.label = industry.label;
    if (industry.description !== undefined) updates.description = industry.description;
    if (industry.signal_count !== undefined) updates.signal_count = industry.signal_count;
    if (industry.product_count !== undefined) updates.product_count = industry.product_count;
    if (industry.source_count !== undefined) updates.source_count = industry.source_count;
    if (industry.last_scanned_at !== undefined) updates.last_scanned_at = industry.last_scanned_at;
    if (industry.scan_quality !== undefined) updates.scan_quality = industry.scan_quality;
    if (industry.executive_summary !== undefined) updates.executive_summary = industry.executive_summary;
    if (industry.parent_slug !== undefined) updates.parent_slug = industry.parent_slug;

    await db.from('dynamic_industries').update(updates).eq('slug', industry.slug);
  } else {
    // Insert new
    await db.from('dynamic_industries').insert({
      slug: industry.slug,
      label: industry.label,
      parent_slug: industry.parent_slug ?? null,
      color: industry.color ?? '#00d4ff',
      description: industry.description ?? null,
      signal_count: industry.signal_count ?? 0,
      product_count: industry.product_count ?? 0,
      source_count: industry.source_count ?? 0,
      last_scanned_at: industry.last_scanned_at ?? null,
      scan_quality: industry.scan_quality ?? null,
      executive_summary: industry.executive_summary ?? null,
      is_core: industry.is_core ?? false,
      popularity: 1,
    });
  }
}

/** Increment popularity without a full scan (just viewing the page) */
export async function bumpIndustryPopularity(slug: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const db = getDb();
  const { data } = await db
    .from('dynamic_industries')
    .select('popularity')
    .eq('slug', slug)
    .single();
  if (data) {
    await db
      .from('dynamic_industries')
      .update({ popularity: (data.popularity ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq('slug', slug);
  }
}

/** Search industries by label text */
export async function searchDynamicIndustries(query: string, limit = 10): Promise<DynamicIndustryRow[]> {
  if (!isSupabaseConfigured()) return [];
  const db = getDb();
  const { data } = await db
    .from('dynamic_industries')
    .select('*')
    .ilike('label', `%${query}%`)
    .order('popularity', { ascending: false })
    .limit(limit);
  return (data ?? []) as DynamicIndustryRow[];
}
