import { getDb, isSupabaseConfigured } from '../client';
import type { IntelSignal } from '@/lib/agents/agents/intel-discovery-agent';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type IntelSignalRow = {
  id: string;
  signal_type: string;
  industry: string;
  title: string;
  url: string | null;
  source: string | null;
  evidence: string | null;
  company: string | null;
  amount_usd: number | null;
  confidence: number;
  importance_score: number;
  tags: string[];
  discovered_at: string;
  created_at: string;
  normalized_source?: string;
  source_label?: string;
  source_trust?: number;
  source_noise?: number;
  evidence_quality?: number;
  duplicate_group_size?: number;
  duplicate_penalty?: number;
  quality_score?: number;
};

export type IntelSignalInsert = {
  id: string;
  signal_type: string;
  industry: string;
  title: string;
  url?: string | null;
  source?: string | null;
  evidence?: string | null;
  company?: string | null;
  amount_usd?: number | null;
  confidence?: number;
  importance_score?: number;
  tags?: string[];
  discovered_at?: string;
};

// ─── Importance Scoring ─────────────────────────────────────────────────────────

const TYPE_WEIGHT: Record<string, number> = {
  // 6-track system (brain departments)
  technology: 0.85,
  product: 0.80,
  discovery: 0.90,
  direction: 0.75,
  who: 0.70,
  connection: 0.65,
  // Legacy types (kept for backward compatibility with older signals)
  merger_acquisition: 0.95,
  funding_round: 0.90,
  contract_award: 0.85,
  facility_expansion: 0.80,
  patent_filing: 0.75,
  regulatory_action: 0.75,
  product_launch: 0.65,
  research_paper: 0.60,
  hiring_signal: 0.50,
  case_study: 0.40,
};

export function computeImportanceScore(signal: IntelSignal): number {
  const typeWeight = TYPE_WEIGHT[signal.type] ?? 0.5;
  const confidenceWeight = signal.confidence;

  // Monetary signals are more important
  let amountBoost = 0;
  if (signal.amountUsd) {
    if (signal.amountUsd >= 1_000_000_000) amountBoost = 0.3;
    else if (signal.amountUsd >= 100_000_000) amountBoost = 0.2;
    else if (signal.amountUsd >= 10_000_000) amountBoost = 0.1;
    else if (signal.amountUsd >= 1_000_000) amountBoost = 0.05;
  }

  // Named companies are more actionable
  const companyBoost = signal.company ? 0.05 : 0;

  // Recency boost (signals < 24h old get a bump)
  let recencyBoost = 0;
  const ageMs = Date.now() - new Date(signal.discoveredAt).getTime();
  if (ageMs < 24 * 60 * 60 * 1000) recencyBoost = 0.1;
  else if (ageMs < 72 * 60 * 60 * 1000) recencyBoost = 0.05;

  const raw = typeWeight * 0.4 + confidenceWeight * 0.3 + amountBoost + companyBoost + recencyBoost;
  return Math.min(1, Math.max(0, Math.round(raw * 1000) / 1000));
}

// ─── Persistence ────────────────────────────────────────────────────────────────

/** Convert agent IntelSignal to DB insert row */
function toRow(signal: IntelSignal): IntelSignalInsert {
  return {
    id: signal.id,
    signal_type: signal.type,
    industry: signal.industry,
    title: signal.title,
    url: signal.url || null,
    source: signal.source || null,
    evidence: signal.evidence || null,
    company: signal.company || null,
    amount_usd: signal.amountUsd || null,
    confidence: signal.confidence,
    importance_score: computeImportanceScore(signal),
    tags: signal.tags,
    discovered_at: signal.discoveredAt,
  };
}

/** Upsert intel signals into Supabase (batch of 100) */
export async function persistIntelSignals(signals: IntelSignal[]): Promise<number> {
  if (!isSupabaseConfigured() || signals.length === 0) return 0;

  const db = getDb({ admin: true });
  let persisted = 0;

  const rows = signals.map(toRow);

  // Batch upsert in chunks of 100
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await db
      .from('intel_signals')
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      console.warn('[intel-signals] upsert batch error:', error.message);
    } else {
      persisted += batch.length;
    }
  }

  return persisted;
}

// ─── Queries ────────────────────────────────────────────────────────────────────

export type IntelSignalQueryOptions = {
  signal_type?: string;
  industry?: string;
  since?: string;
  min_importance?: number;
  limit?: number;
};

/** Get intel signals — freshest first, then by importance */
export async function getIntelSignals(
  options: IntelSignalQueryOptions = {},
): Promise<IntelSignalRow[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb();
  const limit = Math.max(1, Math.min(options.limit ?? 100, 1000));

  let query = db
    .from('intel_signals')
    .select('*')
    .order('created_at', { ascending: false })
    .order('importance_score', { ascending: false })
    .limit(limit);

  if (options.signal_type) query = query.eq('signal_type', options.signal_type);
  if (options.industry) query = query.eq('industry', options.industry);
  if (options.since) query = query.gte('discovered_at', options.since);
  if (options.min_importance) query = query.gte('importance_score', options.min_importance);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as IntelSignalRow[];
}

/** Get signal counts grouped by type and industry for a given time range */
export async function getIntelSignalStats(since?: string): Promise<{
  total: number;
  by_type: Record<string, number>;
  by_industry: Record<string, number>;
  avg_importance: number;
}> {
  if (!isSupabaseConfigured()) {
    return { total: 0, by_type: {}, by_industry: {}, avg_importance: 0 };
  }

  const db = getDb();
  let query = db.from('intel_signals').select('signal_type, industry, importance_score');
  if (since) query = query.gte('discovered_at', since);

  const { data, error } = await query;
  if (error || !data) {
    return { total: 0, by_type: {}, by_industry: {}, avg_importance: 0 };
  }

  const rows = data as Array<{ signal_type: string; industry: string; importance_score: number }>;
  const by_type: Record<string, number> = {};
  const by_industry: Record<string, number> = {};
  let totalImportance = 0;

  for (const row of rows) {
    by_type[row.signal_type] = (by_type[row.signal_type] ?? 0) + 1;
    by_industry[row.industry] = (by_industry[row.industry] ?? 0) + 1;
    totalImportance += row.importance_score;
  }

  return {
    total: rows.length,
    by_type,
    by_industry,
    avg_importance: rows.length > 0 ? Math.round((totalImportance / rows.length) * 1000) / 1000 : 0,
  };
}
