import { getDb, isSupabaseConfigured } from '../client';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ExhibitorRow = {
  id: string;
  conference_id: string;
  conference_name: string;
  raw_name: string;
  normalized_name: string;
  booth: string;
  category: string;
  description: string;
  profile_url: string;
  website: string;
  confidence: number;
  source_url: string;
  scraped_at: string;
  created_at: string;
};

export type ExhibitorInsert = {
  id: string;
  conference_id: string;
  conference_name: string;
  raw_name: string;
  normalized_name: string;
  booth?: string;
  category?: string;
  description?: string;
  profile_url?: string;
  website?: string;
  confidence?: number;
  source_url?: string;
};

export type EnrichedVendorRow = {
  id: string;
  canonical_name: string;
  official_domain: string;
  description: string;
  products: string[];
  technologies: string[];
  industries: string[];
  country: string;
  vendor_type: string;
  use_cases: string[];
  employee_estimate: string;
  conference_sources: string[];
  confidence: number;
  enriched_at: string;
  created_at: string;
};

export type EnrichedVendorInsert = {
  id: string;
  canonical_name: string;
  official_domain?: string;
  description?: string;
  products?: string[];
  technologies?: string[];
  industries?: string[];
  country?: string;
  vendor_type?: string;
  use_cases?: string[];
  employee_estimate?: string;
  conference_sources?: string[];
  confidence?: number;
};

// ─── Pipeline Run Tracking ──────────────────────────────────────────────────────

export type ScrapeRunInsert = {
  conferences_scanned: number;
  pages_found: number;
  total_exhibitors: number;
  vendors_enriched: number;
  errors: Record<string, string>[];
  duration_ms: number;
  phase: string;
};

export async function recordScrapeRun(run: ScrapeRunInsert): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('conference_scrape_runs')
    .insert({
      ...run,
      started_at: new Date(Date.now() - run.duration_ms).toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.warn('[scrape_runs] insert error:', error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function getRecentScrapeRuns(limit = 10): Promise<Array<ScrapeRunInsert & { id: string; started_at: string; completed_at: string }>> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const { data, error } = await db
    .from('conference_scrape_runs')
    .select('*')
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data;
}

// ─── Exhibitor Persistence ──────────────────────────────────────────────────────

export async function upsertExhibitors(records: ExhibitorInsert[]): Promise<number> {
  if (!isSupabaseConfigured() || records.length === 0) return 0;

  const db = getDb({ admin: true });
  let persisted = 0;

  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    const { error } = await db
      .from('exhibitors')
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      console.warn('[exhibitors] upsert batch error:', error.message);
    } else {
      persisted += batch.length;
    }
  }

  return persisted;
}

export async function getExhibitors(options: {
  conference_id?: string;
  search?: string;
  limit?: number;
} = {}): Promise<ExhibitorRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const limit = Math.max(1, Math.min(options.limit ?? 200, 1000));

  let query = db
    .from('exhibitors')
    .select('*')
    .order('confidence', { ascending: false })
    .limit(limit);

  if (options.conference_id) {
    query = query.eq('conference_id', options.conference_id);
  }
  if (options.search) {
    query = query.or(
      `normalized_name.ilike.%${options.search}%,category.ilike.%${options.search}%`,
    );
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as ExhibitorRow[];
}

/** Get unique vendor names across all conferences */
export async function getUniqueExhibitorNames(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const { data, error } = await db
    .from('exhibitors')
    .select('normalized_name')
    .order('normalized_name');

  if (error || !data) return [];

  const unique = new Set(data.map((r: { normalized_name: string }) => r.normalized_name));
  return Array.from(unique);
}

// ─── Enriched Vendor Persistence ────────────────────────────────────────────────

export async function upsertEnrichedVendors(records: EnrichedVendorInsert[]): Promise<number> {
  if (!isSupabaseConfigured() || records.length === 0) return 0;

  const db = getDb({ admin: true });
  let persisted = 0;

  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    const { error } = await db
      .from('enriched_vendors')
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      console.warn('[enriched_vendors] upsert batch error:', error.message);
    } else {
      persisted += batch.length;
    }
  }

  return persisted;
}

export async function getEnrichedVendors(options: {
  vendor_type?: string;
  industry?: string;
  technology?: string;
  search?: string;
  minConfidence?: number;
  limit?: number;
} = {}): Promise<EnrichedVendorRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const limit = Math.max(1, Math.min(options.limit ?? 200, 1000));

  let query = db
    .from('enriched_vendors')
    .select('*')
    .order('confidence', { ascending: false })
    .limit(limit);

  if (options.vendor_type) {
    query = query.eq('vendor_type', options.vendor_type);
  }
  if (options.industry) {
    query = query.contains('industries', [options.industry]);
  }
  if (options.technology) {
    query = query.contains('technologies', [options.technology]);
  }
  if (options.search) {
    query = query.or(
      `canonical_name.ilike.%${options.search}%,description.ilike.%${options.search}%`,
    );
  }
  if (options.minConfidence) {
    query = query.gte('confidence', options.minConfidence);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as EnrichedVendorRow[];
}

export async function getEnrichedVendorById(id: string): Promise<EnrichedVendorRow | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb();
  const { data, error } = await db
    .from('enriched_vendors')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as EnrichedVendorRow;
}

/** Get vendor names that have NOT been enriched yet */
export async function getUnenrichedExhibitorNames(limit = 50): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();

  // Get all exhibitor names
  const { data: exhibitors } = await db
    .from('exhibitors')
    .select('normalized_name')
    .order('confidence', { ascending: false });

  // Get already-enriched names
  const { data: enriched } = await db
    .from('enriched_vendors')
    .select('canonical_name');

  if (!exhibitors) return [];

  const enrichedSet = new Set(
    (enriched ?? []).map((r: { canonical_name: string }) => r.canonical_name.toLowerCase()),
  );

  const unique = new Set<string>();
  for (const r of exhibitors) {
    const name = r.normalized_name;
    if (!enrichedSet.has(name.toLowerCase()) && !unique.has(name.toLowerCase())) {
      unique.add(name.toLowerCase());
    }
  }

  return Array.from(unique).slice(0, limit).map((n) =>
    // Capitalize back
    n.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
  );
}
