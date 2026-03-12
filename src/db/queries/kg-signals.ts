// src/db/queries/kg-signals.ts — CRUD for kg_signals table (P0–P3 structured signals)

import { getDb, isSupabaseConfigured } from '../client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type KgSignalPriority = 'P0' | 'P1' | 'P2' | 'P3';

// Valid signal_type values per check constraint
export type KgSignalType =
  | 'breakthrough'
  | 'investment'
  | 'policy'
  | 'disruption'
  | 'regulatory_change'
  | 'supply_chain_risk'
  | 'startup_formation'
  | 'manufacturing_expansion';

export type KgSignalRow = {
  id: string;
  title: string;
  description: string | null;
  signal_type: string;
  priority: KgSignalPriority;
  source_url: string | null;
  source_name: string | null;
  country_id: string | null;
  detected_at: string;
  is_active: boolean;
  created_at: string;
};

export type KgSignalInsert = {
  signal_type: string;
  priority: KgSignalPriority;
  title: string;
  description?: string | null;
  source_url?: string | null;
  source_name?: string | null;
  country_id?: string | null;
  is_active?: boolean;
  // Aliases for backward compatibility
  summary?: string | null;
  industry?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type KgSignalQueryOptions = {
  limit?: number;
  priority?: KgSignalPriority;
  signal_type?: string;
  active_only?: boolean;
};

// Valid signal types per DB check constraint
const VALID_SIGNAL_TYPES = new Set<string>([
  'breakthrough', 'investment', 'policy', 'disruption',
  'regulatory_change', 'supply_chain_risk', 'startup_formation', 'manufacturing_expansion',
]);

function normalizeSignalType(raw: string): string {
  if (VALID_SIGNAL_TYPES.has(raw)) return raw;
  // Map common aliases to valid types
  const map: Record<string, string> = {
    'research_paper': 'breakthrough',
    'acquisition': 'investment',
    'funding': 'investment',
    'regulatory': 'regulatory_change',
    'regulation': 'regulatory_change',
    'supply_chain': 'supply_chain_risk',
    'startup': 'startup_formation',
    'manufacturing': 'manufacturing_expansion',
    'expansion': 'manufacturing_expansion',
    'threat': 'disruption',
    'risk': 'disruption',
    'partnership': 'investment',
  };
  return map[raw] ?? 'disruption';
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Insert a new signal. Returns the row id or null. */
export async function insertKgSignal(data: KgSignalInsert): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb({ admin: true });

  const { data: row, error } = await db
    .from('kg_signals')
    .insert({
      signal_type: normalizeSignalType(data.signal_type),
      priority: data.priority,
      title: data.title,
      description: data.description ?? data.summary ?? null,
      source_url: data.source_url ?? null,
      source_name: data.source_name ?? null,
      country_id: data.country_id ?? null,
      is_active: data.is_active ?? true,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.warn('[kg-signals] insert error:', error.message);
    return null;
  }

  return (row as { id: string } | null)?.id ?? null;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** List signals with optional filters, ordered by detected_at desc */
export async function getKgSignals(
  opts: KgSignalQueryOptions = {},
): Promise<KgSignalRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const limit = Math.max(1, Math.min(opts.limit ?? 100, 1000));

  let query = db
    .from('kg_signals')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(limit);

  if (opts.priority) query = query.eq('priority', opts.priority);
  if (opts.signal_type) query = query.eq('signal_type', opts.signal_type);
  if (opts.active_only) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as KgSignalRow[];
}

/** Get signals filtered by priority level */
export async function getKgSignalsByPriority(
  priority: KgSignalPriority,
  limit: number = 50,
): Promise<KgSignalRow[]> {
  return getKgSignals({ priority, limit, active_only: true });
}
