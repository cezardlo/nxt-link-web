// src/lib/agents/agents/vendor-data-cleaner.ts
// Data Cleaner — removes garbage, deduplicates, and merges enriched vendors.
// Runs as a post-processor after enrichment or on a schedule.

import { getDb, isSupabaseConfigured } from '@/db/client';
import type { EnrichedVendorRow } from '@/db/queries/exhibitors';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type CleanupReport = {
  vendors_scanned: number;
  removed_no_website: number;
  removed_weak_description: number;
  removed_low_confidence: number;
  merged_duplicates: number;
  total_removed: number;
  total_after: number;
  duration_ms: number;
};

// ─── Rules ──────────────────────────────────────────────────────────────────────

const MIN_DESCRIPTION_LENGTH = 20;
const MIN_CONFIDENCE = 0.3;

const GARBAGE_NAMES = new Set([
  'home', 'about', 'contact', 'menu', 'search', 'login', 'register',
  'privacy policy', 'terms of service', 'cookie policy', 'sitemap',
  'exhibitors', 'sponsors', 'vendors', 'directory', 'floor plan',
  'view all', 'see all', 'show more', 'load more', 'accept',
  'read more', 'learn more', 'click here', 'download', 'subscribe',
  'booth', 'hall', 'conference', 'expo', 'event', 'upcoming',
]);

/** Normalize a domain to its root for comparison */
function normalizeDomain(domain: string): string {
  try {
    const url = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return domain.toLowerCase().replace(/^www\./, '');
  }
}

/** Check if a vendor record is garbage */
function isGarbage(v: EnrichedVendorRow): { remove: boolean; reason: string } {
  const nameLower = v.canonical_name.toLowerCase().trim();

  // Garbage name
  if (GARBAGE_NAMES.has(nameLower)) {
    return { remove: true, reason: 'garbage_name' };
  }

  // Too short name
  if (v.canonical_name.length < 2) {
    return { remove: true, reason: 'name_too_short' };
  }

  // All numbers
  if (/^\d+$/.test(v.canonical_name)) {
    return { remove: true, reason: 'numeric_name' };
  }

  return { remove: false, reason: '' };
}

// ─── Main Cleaner ───────────────────────────────────────────────────────────────

export async function runDataCleaner(): Promise<CleanupReport> {
  const start = Date.now();

  if (!isSupabaseConfigured()) {
    return {
      vendors_scanned: 0, removed_no_website: 0, removed_weak_description: 0,
      removed_low_confidence: 0, merged_duplicates: 0, total_removed: 0,
      total_after: 0, duration_ms: Date.now() - start,
    };
  }

  const db = getDb({ admin: true });

  // Fetch all enriched vendors
  const { data, error } = await db
    .from('enriched_vendors')
    .select('*')
    .order('confidence', { ascending: false });

  if (error || !data) {
    return {
      vendors_scanned: 0, removed_no_website: 0, removed_weak_description: 0,
      removed_low_confidence: 0, merged_duplicates: 0, total_removed: 0,
      total_after: 0, duration_ms: Date.now() - start,
    };
  }

  const vendors = data as EnrichedVendorRow[];
  const toRemove = new Set<string>();
  let removedNoWebsite = 0;
  let removedWeakDesc = 0;
  let removedLowConf = 0;
  let mergedDuplicates = 0;

  // ── Pass 1: Remove garbage ────────────────────────────────────────────────

  for (const v of vendors) {
    const { remove } = isGarbage(v);
    if (remove) {
      toRemove.add(v.id);
      continue;
    }

    // No website AND no description = useless
    if (!v.official_domain && (!v.description || v.description.length < MIN_DESCRIPTION_LENGTH)) {
      toRemove.add(v.id);
      removedNoWebsite++;
      continue;
    }

    // Very low confidence with no products
    if (v.confidence < MIN_CONFIDENCE && (!v.products || v.products.length === 0)) {
      toRemove.add(v.id);
      removedLowConf++;
      continue;
    }

    // Weak description with no other signals
    if (
      v.description.length < MIN_DESCRIPTION_LENGTH &&
      (!v.products || v.products.length === 0) &&
      (!v.technologies || v.technologies.length === 0)
    ) {
      toRemove.add(v.id);
      removedWeakDesc++;
    }
  }

  // ── Pass 2: Deduplicate by domain ─────────────────────────────────────────

  const domainMap = new Map<string, EnrichedVendorRow[]>();
  for (const v of vendors) {
    if (toRemove.has(v.id) || !v.official_domain) continue;
    const domain = normalizeDomain(v.official_domain);
    if (!domain) continue;
    const list = domainMap.get(domain) ?? [];
    list.push(v);
    domainMap.set(domain, list);
  }

  for (const [, group] of domainMap) {
    if (group.length <= 1) continue;

    // Keep the one with highest confidence, merge conference_sources
    group.sort((a, b) => b.confidence - a.confidence);
    const winner = group[0];
    const allSources = new Set<string>();
    const allProducts = new Set<string>();
    const allTech = new Set<string>();

    for (const v of group) {
      for (const s of v.conference_sources) allSources.add(s);
      for (const p of v.products) allProducts.add(p);
      for (const t of v.technologies) allTech.add(t);
    }

    // Mark losers for removal
    for (let i = 1; i < group.length; i++) {
      toRemove.add(group[i].id);
      mergedDuplicates++;
    }

    // Update winner with merged data
    await db
      .from('enriched_vendors')
      .update({
        conference_sources: Array.from(allSources),
        products: Array.from(allProducts),
        technologies: Array.from(allTech),
      })
      .eq('id', winner.id);
  }

  // ── Pass 3: Deduplicate by normalized name ────────────────────────────────

  const nameMap = new Map<string, EnrichedVendorRow[]>();
  for (const v of vendors) {
    if (toRemove.has(v.id)) continue;
    const key = v.canonical_name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const list = nameMap.get(key) ?? [];
    list.push(v);
    nameMap.set(key, list);
  }

  for (const [, group] of nameMap) {
    if (group.length <= 1) continue;
    group.sort((a, b) => b.confidence - a.confidence);
    for (let i = 1; i < group.length; i++) {
      if (!toRemove.has(group[i].id)) {
        toRemove.add(group[i].id);
        mergedDuplicates++;
      }
    }
  }

  // ── Execute removals ──────────────────────────────────────────────────────

  if (toRemove.size > 0) {
    const ids = Array.from(toRemove);
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      await db.from('enriched_vendors').delete().in('id', batch);
    }
  }

  // Count remaining
  const { count } = await db
    .from('enriched_vendors')
    .select('id', { count: 'exact', head: true });

  return {
    vendors_scanned: vendors.length,
    removed_no_website: removedNoWebsite,
    removed_weak_description: removedWeakDesc,
    removed_low_confidence: removedLowConf,
    merged_duplicates: mergedDuplicates,
    total_removed: toRemove.size,
    total_after: count ?? vendors.length - toRemove.size,
    duration_ms: Date.now() - start,
  };
}
