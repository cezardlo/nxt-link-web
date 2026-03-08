// src/db/queries/technologies.ts — technology data access with TS fallback

import { getDb, isSupabaseConfigured } from '../client';
import { TECHNOLOGY_CATALOG, type Technology } from '@/lib/data/technology-catalog';

export type { Technology };

/** Get all technologies — tries Supabase first, falls back to hardcoded data */
export async function getTechnologies(): Promise<Technology[]> {
  if (!isSupabaseConfigured()) return TECHNOLOGY_CATALOG;

  try {
    const db = getDb();
    const { data, error } = await db
      .from('technologies')
      .select('*')
      .order('name');

    if (error || !data || data.length === 0) return TECHNOLOGY_CATALOG;

    const techs: Technology[] = data.map(row => ({
      id: row.id as string,
      name: row.name as string,
      category: row.category as Technology['category'],
      description: (row.description ?? '') as string,
      maturityLevel: (row.maturity_level ?? 'emerging') as Technology['maturityLevel'],
      relatedVendorCount: (row.related_vendor_count ?? 0) as number,
      procurementSignalKeywords: Array.isArray(row.procurement_keywords) ? row.procurement_keywords as string[] : [],
      elPasoRelevance: (row.el_paso_relevance ?? 'medium') as Technology['elPasoRelevance'],
      governmentBudgetFY25M: row.govt_budget_fy25m as number | undefined,
    }));

    return techs.length > 0 ? techs : TECHNOLOGY_CATALOG;
  } catch {
    return TECHNOLOGY_CATALOG;
  }
}

/** Search technologies by name/category */
export async function searchTechnologies(query: string): Promise<Technology[]> {
  const q = query.toLowerCase();
  return TECHNOLOGY_CATALOG.filter(
    t => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
  ).slice(0, 10);
}

/** Upsert technologies into Supabase (for seed script) */
export async function upsertTechnologies(techs: Technology[]): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const db = getDb({ admin: true });
  let count = 0;

  for (let i = 0; i < techs.length; i += 50) {
    const batch = techs.slice(i, i + 50).map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      description: t.description,
      maturity_level: t.maturityLevel,
      related_vendor_count: t.relatedVendorCount,
      el_paso_relevance: t.elPasoRelevance,
      govt_budget_fy25m: t.governmentBudgetFY25M ?? null,
      procurement_keywords: t.procurementSignalKeywords,
    }));

    const { error } = await db
      .from('technologies')
      .upsert(batch, { onConflict: 'id' });

    if (!error) count += batch.length;
  }

  return count;
}
