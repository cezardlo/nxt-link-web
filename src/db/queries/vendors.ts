// src/db/queries/vendors.ts — vendor data access with TS fallback

import { getDb, isSupabaseConfigured } from '../client';
import { EL_PASO_VENDORS, type VendorRecord } from '@/lib/data/el-paso-vendors';

/** El Paso flagship companies — get an IKER anchor bonus */
const EP_FLAGSHIP_ANCHORS = ['boeing', 'l3harris', 'amazon', 'prologis', 'schneider', 'toyota', 'fort bliss', 'utep', 'ep electric'];

/**
 * Algorithmic IKER scoring — runs when DB score is the flat default (70).
 * Differentiates vendors based on verifiable attributes until Python fix_iker.py
 * populates real Gemini-scored values.
 *
 * Dimensions (each 0-20 pts):
 *   Website presence   — real domain vs none/example.com
 *   Evidence density   — how many evidence bullets exist
 *   Description depth  — character count of description
 *   Tag specificity    — number of relevant tags
 *   Confidence signal  — DB confidence field
 */
function computeIkerScore(row: Record<string, unknown>): number {
  const dbScore = row.iker_score as number | null;
  // Trust Gemini-scored values that deviate from the flat default
  if (dbScore !== null && dbScore !== undefined && dbScore !== 70) return dbScore;

  let score = 40; // base

  // Website presence (0-20)
  const website = (row.company_url ?? row.website ?? '') as string;
  if (website && website.startsWith('http') && !website.includes('example.com')) {
    score += 20;
  }

  // Evidence bullets (0-20)
  const evidence = Array.isArray(row.evidence) ? row.evidence as string[] : [];
  score += Math.min(20, evidence.length * 4);

  // Description depth (0-15)
  const desc = (row.description ?? '') as string;
  if (desc.length > 200) score += 15;
  else if (desc.length > 80) score += 8;
  else if (desc.length > 20) score += 3;

  // Tag count (0-10)
  const tags = Array.isArray(row.tags) ? row.tags as string[] : [];
  score += Math.min(10, tags.length * 2);

  // DB confidence field (0-10)
  const confidence = (row.confidence ?? 0) as number;
  score += Math.round(confidence * 10);

  // Named known anchors get a bump (El Paso flagships)
  const name = ((row.company_name ?? row.name ?? '') as string).toLowerCase();
  if (EP_FLAGSHIP_ANCHORS.some(a => name.includes(a))) score += 15;

  return Math.min(99, Math.max(1, score));
}

export type { VendorRecord };

/** Get all vendors — tries Supabase first, falls back to hardcoded data */
export async function getVendors(): Promise<Record<string, VendorRecord>> {
  if (!isSupabaseConfigured()) return EL_PASO_VENDORS;

  try {
    const db = getDb();
    const { data, error } = await db
      .from('vendors')
      .select('*')
      .in('status', ['active', 'approved']);

    if (error || !data || data.length === 0) return EL_PASO_VENDORS;

    // Convert rows to Record<string, VendorRecord> keyed by id
    const result: Record<string, VendorRecord> = {};
    for (const row of data) {
      const id = row.id as string;
      result[id] = {
        id,
        name: (row.company_name ?? row.name ?? '') as string,
        description: (row.description ?? '') as string,
        website: (row.company_url ?? row.website ?? '') as string,
        tags: Array.isArray(row.tags) ? row.tags as string[] : [],
        evidence: Array.isArray(row.evidence) ? row.evidence as string[] : [],
        category: (row.primary_category ?? row.sector ?? '') as string,
        ikerScore: computeIkerScore(row as Record<string, unknown>),
        lat: (row.lat ?? 31.76) as number,
        lon: (row.lon ?? -106.49) as number,
        layer: (row.layer ?? 'vendors') as VendorRecord['layer'],
        weight: (row.weight ?? 0.5) as number,
        confidence: (row.confidence ?? 0.5) as number,
      };
    }

    return Object.keys(result).length > 0 ? result : EL_PASO_VENDORS;
  } catch {
    return EL_PASO_VENDORS;
  }
}

/** Get a single vendor by ID */
export async function getVendorById(id: string): Promise<VendorRecord | null> {
  // Try hardcoded first (fast path)
  if (EL_PASO_VENDORS[id]) return EL_PASO_VENDORS[id];

  if (!isSupabaseConfigured()) return null;

  try {
    const db = getDb();
    const { data, error } = await db
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id as string,
      name: (data.company_name ?? data.name ?? '') as string,
      description: (data.description ?? '') as string,
      website: (data.company_url ?? data.website ?? '') as string,
      tags: Array.isArray(data.tags) ? data.tags as string[] : [],
      evidence: Array.isArray(data.evidence) ? data.evidence as string[] : [],
      category: (data.primary_category ?? data.sector ?? '') as string,
      ikerScore: computeIkerScore(data as Record<string, unknown>),
      lat: (data.lat ?? 31.76) as number,
      lon: (data.lon ?? -106.49) as number,
      layer: (data.layer ?? 'vendors') as VendorRecord['layer'],
      weight: (data.weight ?? 0.5) as number,
      confidence: (data.confidence ?? 0.5) as number,
    };
  } catch {
    return null;
  }
}

/** Upsert vendors into Supabase (for seed script) */
export async function upsertVendors(vendors: VendorRecord[]): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const db = getDb({ admin: true });
  let count = 0;

  // Batch upsert in chunks of 50
  for (let i = 0; i < vendors.length; i += 50) {
    const batch = vendors.slice(i, i + 50).map(v => ({
      id: v.id,
      company_name: v.name,
      company_url: v.website,
      description: v.description,
      primary_category: v.category,
      lat: v.lat,
      lon: v.lon,
      iker_score: v.ikerScore,
      sector: v.category,
      tags: v.tags,
      evidence: v.evidence,
      weight: v.weight,
      confidence: v.confidence,
      layer: v.layer,
      status: 'active',
    }));

    const { error } = await db
      .from('vendors')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error('[vendors] upsert error:', error.message, error.details);
    } else {
      count += batch.length;
    }
  }

  return count;
}
