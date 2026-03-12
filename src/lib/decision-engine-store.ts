import { randomUUID } from 'node:crypto';

import { type DecisionPack } from '@/lib/decision-engine';
import { getDb, isSupabaseConfigured } from '@/db';

// Decision pack run history.
// Stored in `decision_pack_runs` table in Supabase.
// Functions return gracefully if the table does not exist yet.

export type DecisionPackHistoryItem = {
  id: string;
  pack_id: string;
  company_name: string;
  industry: string;
  city: string;
  urgency_score: number;
  timeline_days: number;
  kpi_name: string;
  target_improvement_percent: number;
  recommended_vendors: number;
  created_at: string;
};

export type DecisionPackHistoryDetail = DecisionPackHistoryItem & {
  baseline_value: number;
  target_value: number;
  budget_ceiling_usd: number;
  markdown: string;
  pack: DecisionPack;
};

type DecisionPackRunRow = {
  id: string;
  pack_id: string;
  company_name: string;
  industry: string;
  city: string;
  urgency_score: number;
  timeline_days: number;
  kpi_name: string;
  baseline_value: number;
  target_value: number;
  target_improvement_percent: number;
  budget_ceiling_usd: number;
  recommended_vendors: number;
  pack_json: string;
  markdown: string;
  created_at: string;
};

function mapHistoryRow(row: DecisionPackRunRow): DecisionPackHistoryItem {
  return {
    id: row.id,
    pack_id: row.pack_id,
    company_name: row.company_name,
    industry: row.industry,
    city: row.city,
    urgency_score: Number(row.urgency_score),
    timeline_days: Number(row.timeline_days),
    kpi_name: row.kpi_name,
    target_improvement_percent: Number(row.target_improvement_percent),
    recommended_vendors: Number(row.recommended_vendors),
    created_at: row.created_at || new Date().toISOString(),
  };
}

export async function saveDecisionPackRun(
  pack: DecisionPack,
  markdown: string,
): Promise<DecisionPackHistoryItem> {
  const rowId = randomUUID();
  const createdAt = new Date().toISOString();

  const stub: DecisionPackHistoryItem = {
    id: rowId,
    pack_id: pack.pack_id,
    company_name: pack.company_profile.company_name,
    industry: pack.company_profile.industry,
    city: pack.company_profile.city,
    urgency_score: pack.interpreted_problem.urgency_score,
    timeline_days: pack.pilot_blueprint.duration_days,
    kpi_name: pack.pilot_blueprint.kpi.name,
    target_improvement_percent: pack.pilot_blueprint.kpi.target_improvement_percent,
    recommended_vendors: pack.vendor_recommendations.length,
    created_at: createdAt,
  };

  if (!isSupabaseConfigured()) return stub;

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('decision_pack_runs')
    .insert({
      id: rowId,
      pack_id: pack.pack_id,
      company_name: pack.company_profile.company_name,
      industry: pack.company_profile.industry,
      city: pack.company_profile.city,
      urgency_score: pack.interpreted_problem.urgency_score,
      timeline_days: pack.pilot_blueprint.duration_days,
      kpi_name: pack.pilot_blueprint.kpi.name,
      baseline_value: pack.pilot_blueprint.kpi.baseline_value,
      target_value: pack.pilot_blueprint.kpi.target_value,
      target_improvement_percent: pack.pilot_blueprint.kpi.target_improvement_percent,
      budget_ceiling_usd: pack.pilot_blueprint.budget_guardrails.ceiling_usd,
      recommended_vendors: pack.vendor_recommendations.length,
      pack_json: JSON.stringify(pack),
      markdown,
      created_at: createdAt,
    })
    .select()
    .maybeSingle();

  if (error || !data) return stub;

  return mapHistoryRow(data as DecisionPackRunRow);
}

export async function listDecisionPackRuns(limit = 20): Promise<DecisionPackHistoryItem[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb({ admin: true });
  const n = Number.isFinite(limit) ? Math.max(1, Math.min(100, limit)) : 20;

  const { data, error } = await db
    .from('decision_pack_runs')
    .select(
      'id,pack_id,company_name,industry,city,urgency_score,timeline_days,kpi_name,target_improvement_percent,recommended_vendors,created_at',
    )
    .order('created_at', { ascending: false })
    .limit(n);

  if (error || !data) return [];

  return (data as DecisionPackRunRow[]).map(mapHistoryRow);
}

export async function getDecisionPackRun(
  id: string,
): Promise<DecisionPackHistoryDetail | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb({ admin: true });
  const { data, error } = await db
    .from('decision_pack_runs')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as DecisionPackRunRow;
  const historyItem = mapHistoryRow(row);

  let parsedPack: DecisionPack;
  try {
    parsedPack = JSON.parse(row.pack_json) as DecisionPack;
  } catch {
    return null;
  }

  return {
    ...historyItem,
    baseline_value: Number(row.baseline_value),
    target_value: Number(row.target_value),
    budget_ceiling_usd: Number(row.budget_ceiling_usd),
    markdown: row.markdown,
    pack: parsedPack,
  };
}
