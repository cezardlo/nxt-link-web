// src/db/queries/conference-vendor-links.ts
// Bridge table queries: conference ↔ vendor connections

import { getDb, isSupabaseConfigured } from '../client';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ConferenceVendorLinkRow = {
  id: string;
  conference_id: string;
  vendor_id: string | null;
  exhibitor_id: string | null;
  company_name: string;
  match_type: string;
  match_confidence: number;
  technologies: string[];
  signal_types: string[];
  discovered_at: string;
};

export type ConferenceVendorLinkInsert = {
  conference_id: string;
  vendor_id?: string | null;
  exhibitor_id?: string | null;
  company_name: string;
  match_type?: string;
  match_confidence?: number;
  technologies?: string[];
  signal_types?: string[];
};

// ─── Persistence ────────────────────────────────────────────────────────────────

/** Upsert conference-vendor links in batches */
export async function upsertConferenceVendorLinks(
  links: ConferenceVendorLinkInsert[],
): Promise<number> {
  if (!isSupabaseConfigured() || links.length === 0) return 0;

  const db = getDb({ admin: true });
  let persisted = 0;

  for (let i = 0; i < links.length; i += 100) {
    const batch = links.slice(i, i + 100);
    const { error } = await db
      .from('conference_vendor_links')
      .upsert(batch, { onConflict: 'conference_id,company_name', ignoreDuplicates: false });

    if (error) {
      console.warn('[conference-vendor-links] upsert batch error:', error.message);
    } else {
      persisted += batch.length;
    }
  }

  return persisted;
}

// ─── Queries ────────────────────────────────────────────────────────────────────

/** Get all vendors discovered at a specific conference */
export async function getVendorsForConference(
  conferenceId: string,
): Promise<ConferenceVendorLinkRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const { data, error } = await db
    .from('conference_vendor_links')
    .select('*')
    .eq('conference_id', conferenceId)
    .order('match_confidence', { ascending: false });

  if (error || !data) return [];
  return data as ConferenceVendorLinkRow[];
}

/** Get all conferences where a vendor was discovered */
export async function getConferencesForVendor(
  vendorId: string,
): Promise<ConferenceVendorLinkRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const { data, error } = await db
    .from('conference_vendor_links')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('discovered_at', { ascending: false });

  if (error || !data) return [];
  return data as ConferenceVendorLinkRow[];
}

/** Get summary stats for conference discoveries */
export async function getConferenceDiscoveryStats(): Promise<{
  total_links: number;
  by_conference: Record<string, { vendors: number; technologies: string[] }>;
}> {
  if (!isSupabaseConfigured()) return { total_links: 0, by_conference: {} };

  const db = getDb();
  const { data, error } = await db
    .from('conference_vendor_links')
    .select('conference_id, company_name, technologies, vendor_id');

  if (error || !data) return { total_links: 0, by_conference: {} };

  const by_conference: Record<string, { vendors: number; technologies: string[] }> = {};
  for (const row of data) {
    const cid = row.conference_id as string;
    if (!by_conference[cid]) by_conference[cid] = { vendors: 0, technologies: [] };
    by_conference[cid].vendors++;
    const techs = (row.technologies as string[]) || [];
    for (const t of techs) {
      if (!by_conference[cid].technologies.includes(t)) {
        by_conference[cid].technologies.push(t);
      }
    }
  }

  return { total_links: data.length, by_conference };
}
