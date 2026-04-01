// src/lib/agents/agents/vendor-matcher.ts
// Fuzzy vendor matching — links conference companies/exhibitors to the vendors table.
// Used by conference-intel-agent and vendor-pipeline-orchestrator.

import { getDb, isSupabaseConfigured } from '@/db/client';
import {
  upsertConferenceVendorLinks,
  type ConferenceVendorLinkInsert,
} from '@/db/queries/conference-vendor-links';
import { detectAllTechClusters } from './tech-cluster-detector';
import type { ConferenceIntelInsert } from '@/db/queries/conference-intel';

// ─── Token-based fuzzy matching ─────────────────────────────────────────────────

function tokenize(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 1),
  );
}

function tokenOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) overlap++;
  }
  return overlap / Math.max(a.size, b.size);
}

type VendorRef = { id: string; company_name: string; tokens: Set<string> };

/** Load all vendor names from the vendors table for matching */
async function loadVendorNames(): Promise<VendorRef[]> {
  if (!isSupabaseConfigured()) return [];
  const db = getDb();
  const { data, error } = await db
    .from('vendors')
    .select('id, company_name')
    .in('status', ['active', 'approved']);
  if (error || !data) return [];
  return (data as Array<{ id: string; company_name: string }>).map((v) => ({
    id: v.id,
    company_name: v.company_name,
    tokens: tokenize(v.company_name),
  }));
}

/** Find best vendor match for a company name */
function findBestMatch(
  companyName: string,
  vendors: VendorRef[],
): { vendor: VendorRef; confidence: number; type: 'exact' | 'fuzzy' } | null {
  const normalizedName = companyName.toLowerCase().trim();

  // Exact match (case-insensitive)
  const exact = vendors.find(
    (v) => v.company_name.toLowerCase().trim() === normalizedName,
  );
  if (exact) return { vendor: exact, confidence: 1.0, type: 'exact' };

  // Token overlap fuzzy match
  const inputTokens = tokenize(companyName);
  let best: VendorRef | null = null;
  let bestScore = 0;
  for (const v of vendors) {
    const score = tokenOverlap(inputTokens, v.tokens);
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }

  if (best && bestScore >= 0.8) {
    return { vendor: best, confidence: bestScore, type: 'fuzzy' };
  }

  return null;
}

// ─── Match conference intel companies to vendors ────────────────────────────────

/**
 * After conference intel is persisted, match extracted company names
 * against the vendors table and create conference_vendor_links entries.
 * Returns number of links created.
 */
export async function matchConferenceCompaniesToVendors(
  records: ConferenceIntelInsert[],
): Promise<number> {
  if (!isSupabaseConfigured() || records.length === 0) return 0;

  const vendors = await loadVendorNames();
  if (vendors.length === 0) return 0;

  // Group records by conference + company
  const companyConferences = new Map<string, {
    conference_id: string;
    company_name: string;
    signal_types: Set<string>;
    technologies: Set<string>;
    max_importance: number;
  }>();

  for (const r of records) {
    if (!r.company_name || !r.conference_id) continue;
    const key = `${r.conference_id}::${r.company_name.toLowerCase()}`;
    const existing = companyConferences.get(key);
    if (existing) {
      if (r.signal_type) existing.signal_types.add(r.signal_type);
      if (r.technology_cluster) existing.technologies.add(r.technology_cluster);
      existing.max_importance = Math.max(existing.max_importance, r.importance_score ?? 0.5);
    } else {
      companyConferences.set(key, {
        conference_id: r.conference_id,
        company_name: r.company_name,
        signal_types: new Set(r.signal_type ? [r.signal_type] : []),
        technologies: new Set(r.technology_cluster ? [r.technology_cluster] : []),
        max_importance: r.importance_score ?? 0.5,
      });
    }
  }

  const links: ConferenceVendorLinkInsert[] = [];

  for (const entry of companyConferences.values()) {
    const match = findBestMatch(entry.company_name, vendors);
    links.push({
      conference_id: entry.conference_id,
      vendor_id: match?.vendor.id ?? null,
      company_name: entry.company_name,
      match_type: match?.type ?? 'unmatched',
      match_confidence: match?.confidence ?? 0,
      technologies: Array.from(entry.technologies),
      signal_types: Array.from(entry.signal_types),
    });
  }

  return upsertConferenceVendorLinks(links);
}

// ─── Match exhibitors to vendors ────────────────────────────────────────────────

export type ExhibitorForMatching = {
  id: string;
  conference_id: string;
  normalized_name: string;
  description?: string;
  technologies?: string[];
};

/**
 * Match a batch of exhibitors against the vendors table.
 * Creates conference_vendor_links and optionally stubs new vendors
 * for high-confidence unmatched exhibitors.
 * Returns number of links created.
 */
export async function matchExhibitorsToVendors(
  exhibitors: ExhibitorForMatching[],
): Promise<number> {
  if (!isSupabaseConfigured() || exhibitors.length === 0) return 0;

  const vendors = await loadVendorNames();
  if (vendors.length === 0) return 0;

  const links: ConferenceVendorLinkInsert[] = [];
  const seen = new Set<string>();

  for (const exh of exhibitors) {
    const key = `${exh.conference_id}::${exh.normalized_name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const match = findBestMatch(exh.normalized_name, vendors);
    const techs = exh.technologies?.length
      ? exh.technologies
      : detectAllTechClusters(exh.description ?? '');

    links.push({
      conference_id: exh.conference_id,
      vendor_id: match?.vendor.id ?? null,
      exhibitor_id: exh.id,
      company_name: exh.normalized_name,
      match_type: match?.type ?? 'unmatched',
      match_confidence: match?.confidence ?? 0,
      technologies: techs,
    });
  }

  return upsertConferenceVendorLinks(links);
}
