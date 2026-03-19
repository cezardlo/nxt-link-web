import { getDb, isSupabaseConfigured } from '../client';
import {
  PRODUCTS_CATALOG,
  type CatalogProduct,
} from '@/lib/data/products-catalog';

export type { CatalogProduct };

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ProductRow = {
  id: string;
  product_name: string;
  company: string | null;
  company_url: string | null;
  industry: string;
  category: string | null;
  technology: string | null;
  product_type: string;
  description: string | null;
  use_cases: string[];
  benefits: string[];
  price_range: string | null;
  region_available: string | null;
  maturity: string;
  confidence: number;
  source: string | null;
  source_url: string | null;
  related_tech_ids: string[];
  tags: string[];
  discovered_at: string;
  updated_at: string;
  created_at: string;
};

export type ProductInsert = {
  id: string;
  product_name: string;
  company?: string | null;
  company_url?: string | null;
  industry: string;
  category?: string | null;
  technology?: string | null;
  product_type?: string;
  description?: string | null;
  use_cases?: string[];
  benefits?: string[];
  price_range?: string | null;
  region_available?: string | null;
  maturity?: string;
  confidence?: number;
  source?: string | null;
  source_url?: string | null;
  related_tech_ids?: string[];
  tags?: string[];
};

// ─── Persistence ────────────────────────────────────────────────────────────────

/** Upsert products in batches of 100 */
export async function upsertProducts(products: ProductInsert[]): Promise<number> {
  if (!isSupabaseConfigured() || products.length === 0) return 0;

  const db = getDb({ admin: true });
  let persisted = 0;

  for (let i = 0; i < products.length; i += 100) {
    const batch = products.slice(i, i + 100);
    const { error } = await db
      .from('products')
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      console.warn('[products] upsert batch error:', error.message);
    } else {
      persisted += batch.length;
    }
  }

  return persisted;
}

// ─── Queries ────────────────────────────────────────────────────────────────────

export type ProductQueryOptions = {
  industry?: string;
  category?: string;
  company?: string;
  product_type?: string;
  search?: string;
  limit?: number;
};

/** Query products with optional filters */
export async function getProducts(options: ProductQueryOptions = {}): Promise<ProductRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const limit = Math.max(1, Math.min(options.limit ?? 100, 1000));

  let query = db
    .from('products')
    .select('*')
    .order('confidence', { ascending: false })
    .order('discovered_at', { ascending: false })
    .limit(limit);

  if (options.industry) query = query.eq('industry', options.industry);
  if (options.category) query = query.eq('category', options.category);
  if (options.company) query = query.ilike('company', `%${options.company}%`);
  if (options.product_type) query = query.eq('product_type', options.product_type);
  if (options.search) query = query.or(`product_name.ilike.%${options.search}%,description.ilike.%${options.search}%`);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as ProductRow[];
}

/** Get product counts by industry */
export async function getProductStats(): Promise<{
  total: number;
  by_industry: Record<string, number>;
  by_category: Record<string, number>;
  by_type: Record<string, number>;
}> {
  if (!isSupabaseConfigured()) {
    return { total: 0, by_industry: {}, by_category: {}, by_type: {} };
  }

  const db = getDb();
  const { data, error } = await db
    .from('products')
    .select('industry, category, product_type');

  if (error || !data) {
    return { total: 0, by_industry: {}, by_category: {}, by_type: {} };
  }

  const rows = data as Array<{ industry: string; category: string | null; product_type: string }>;
  const by_industry: Record<string, number> = {};
  const by_category: Record<string, number> = {};
  const by_type: Record<string, number> = {};

  for (const row of rows) {
    by_industry[row.industry] = (by_industry[row.industry] ?? 0) + 1;
    if (row.category) by_category[row.category] = (by_category[row.category] ?? 0) + 1;
    by_type[row.product_type] = (by_type[row.product_type] ?? 0) + 1;
  }

  return { total: rows.length, by_industry, by_category, by_type };
}

/** Search products by problem/use case */
export async function searchProductsByUseCase(problem: string, limit = 20): Promise<ProductRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const { data, error } = await db
    .from('products')
    .select('*')
    .or(`description.ilike.%${problem}%,product_name.ilike.%${problem}%`)
    .order('confidence', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as ProductRow[];
}

// ─── Catalog Queries (static fallback data) ───────────────────────────────────

export type CatalogQueryOptions = {
  industry?: string;
  category?: CatalogProduct['category'];
  maxCost?: number;
  vendor?: string;
  search?: string;
};

/** Get catalog products with optional filters — always returns static data */
export async function getCatalogProducts(
  options: CatalogQueryOptions = {}
): Promise<CatalogProduct[]> {
  let results = PRODUCTS_CATALOG.slice();

  if (options.industry) {
    const q = options.industry.toLowerCase();
    results = results.filter((p) => p.industry.toLowerCase() === q);
  }

  if (options.category) {
    results = results.filter((p) => p.category === options.category);
  }

  if (typeof options.maxCost === 'number') {
    results = results.filter((p) => p.costRange.min <= options.maxCost!);
  }

  if (options.vendor) {
    const q = options.vendor.toLowerCase();
    results = results.filter(
      (p) =>
        p.vendor.toLowerCase().includes(q) ||
        p.alternateVendors.some((v) => v.toLowerCase().includes(q))
    );
  }

  if (options.search) {
    const q = options.search.toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.problemSolved.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  return results;
}

/** Get a single catalog product by ID */
export async function getCatalogProductById(
  id: string
): Promise<CatalogProduct | null> {
  return PRODUCTS_CATALOG.find((p) => p.id === id) ?? null;
}

/** Get catalog products by primary or alternate vendor name (partial match) */
export async function getCatalogProductsByVendor(
  vendor: string
): Promise<CatalogProduct[]> {
  const q = vendor.toLowerCase();
  return PRODUCTS_CATALOG.filter(
    (p) =>
      p.vendor.toLowerCase().includes(q) ||
      p.alternateVendors.some((v) => v.toLowerCase().includes(q))
  );
}

/** Get catalog products that use a specific technology */
export async function getCatalogProductsByTechnology(
  tech: string
): Promise<CatalogProduct[]> {
  const q = tech.toLowerCase();
  return PRODUCTS_CATALOG.filter((p) =>
    p.relatedTechnologies.some((t) => t.toLowerCase().includes(q))
  );
}
