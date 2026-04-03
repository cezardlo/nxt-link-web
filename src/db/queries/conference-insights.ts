import { getDb, isSupabaseConfigured } from '../client';

// ─── Types ──────────────────────────────────────────────────────────────────────────────

export type ConferenceInsightInsert = {
  conference_id: string;
  conference_name: string;
  insight_type?: string;
  insight: string;
  why_it_matters: string;
  recommendation: string;
  supporting_vendors?: string[];
  technologies?: string[];
  problem_area?: string | null;
  confidence?: number;
  vendor_count?: number;
};

export type MarketInsightInsert = {
  insight_type?: string;
  insight: string;
  why_it_matters: string;
  recommendation: string;
  supporting_vendors?: string[];
  technologies?: string[];
  problem_area?: string | null;
  source_conferences?: string[];
  confidence?: number;
  vendor_count?: number;
};

// ─── Persistence ────────────────────────────────────────────────────────────────────

/** Upsert conference insights in batches */
export async function upsertConferenceInsights(
  records: ConferenceInsightInsert[],
): Promise<number> {
  if (!isSupabaseConfigured() || records.length === 0) return 0;

  const db = getDb({ admin: true });
  let persisted = 0;

  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { error, count } = await db
      .from('conference_insights')
      .upsert(
        batch.map((r) => ({
          conference_id: r.conference_id,
          conference_name: r.conference_name,
          insight_type: r.insight_type ?? 'trend',
          insight: r.insight,
          why_it_matters: r.why_it_matters,
          recommendation: r.recommendation,
          supporting_vendors: r.supporting_vendors ?? [],
          technologies: r.technologies ?? [],
          problem_area: r.problem_area ?? null,
          confidence: r.confidence ?? 0.7,
          vendor_count: r.vendor_count ?? 0,
        })),
        { onConflict: 'id', ignoreDuplicates: false },
      )
      .select();

    if (error) {
      console.error('[conference-insights] upsert error:', error.message);
    } else {
      persisted += count ?? batch.length;
    }
  }

  return persisted;
}

/** Upsert market insights in batches */
export async function upsertMarketInsights(
  records: MarketInsightInsert[],
): Promise<number> {
  if (!isSupabaseConfigured() || records.length === 0) return 0;

  const db = getDb({ admin: true });
  let persisted = 0;

  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { error, count } = await db
      .from('market_insights')
      .upsert(
        batch.map((r) => ({
          insight_type: r.insight_type ?? 'market_trend',
          insight: r.insight,
          why_it_matters: r.why_it_matters,
          recommendation: r.recommendation,
          supporting_vendors: r.supporting_vendors ?? [],
          technologies: r.technologies ?? [],
          problem_area: r.problem_area ?? null,
          source_conferences: r.source_conferences ?? [],
          confidence: r.confidence ?? 0.7,
          vendor_count: r.vendor_count ?? 0,
        })),
        { onConflict: 'id', ignoreDuplicates: false },
      )
      .select();

    if (error) {
      console.error('[market-insights] upsert error:', error.message);
    } else {
      persisted += count ?? batch.length;
    }
  }

  return persisted;
}
