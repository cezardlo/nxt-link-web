import { getDb, isSupabaseConfigured } from '../client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PredictionType =
  | 'funding'
  | 'growth'
  | 'legitimacy'
  | 'acquisition'
  | 'sector_heat';

export type PredictionOutcomeRow = {
  id: string;
  entity_id: string;
  entity_name: string | null;
  prediction_type: PredictionType;
  predicted_score: number;
  actual_score: number | null;
  prediction_horizon: number;
  predicted_at: string;
  measured_at: string | null;
  outcome_measured: boolean;
  error: number | null;
  context_data: Record<string, unknown> | null;
  agent: string | null;
  created_at: string;
};

export type PredictionOutcomeInsert = {
  entity_id: string;
  entity_name?: string | null;
  prediction_type: PredictionType;
  predicted_score: number;
  prediction_horizon?: number;
  context_data?: Record<string, unknown> | null;
  agent?: string | null;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Log a new prediction from any agent */
export async function logPrediction(pred: PredictionOutcomeInsert): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const db = getDb({ admin: true });

  const { data, error } = await db
    .from('prediction_outcomes')
    .insert({
      entity_id: pred.entity_id,
      entity_name: pred.entity_name ?? null,
      prediction_type: pred.prediction_type,
      predicted_score: pred.predicted_score,
      prediction_horizon: pred.prediction_horizon ?? 180,
      context_data: pred.context_data ?? null,
      agent: pred.agent ?? null,
    })
    .select('id')
    .maybeSingle();

  if (error || !data) return null;
  return (data as { id: string }).id;
}

/** Record the actual outcome of a prediction */
export async function recordOutcome(
  predictionId: string,
  actualScore: number,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const db = getDb({ admin: true });

  // Get the prediction to compute error
  const { data: pred } = await db
    .from('prediction_outcomes')
    .select('predicted_score')
    .eq('id', predictionId)
    .maybeSingle();

  const error = pred
    ? actualScore - (pred as { predicted_score: number }).predicted_score
    : null;

  const { error: updateError } = await db
    .from('prediction_outcomes')
    .update({
      actual_score: actualScore,
      error,
      outcome_measured: true,
      measured_at: new Date().toISOString(),
    })
    .eq('id', predictionId);

  return !updateError;
}

/** Get predictions ready to be measured (past their horizon date) */
export async function getPredictionsReadyToMeasure(limit = 50): Promise<PredictionOutcomeRow[]> {
  if (!isSupabaseConfigured()) return [];
  const db = getDb();

  // Predictions that haven't been measured yet and are past their horizon
  const { data, error } = await db
    .from('prediction_outcomes')
    .select('*')
    .eq('outcome_measured', false)
    .lt('predicted_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // at least 7d old
    .order('predicted_at', { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data as PredictionOutcomeRow[];
}

/** Get accuracy stats for an agent */
export async function getPredictionAccuracy(agent: string, type?: PredictionType): Promise<{
  total: number;
  measured: number;
  avg_error: number;
  accuracy_rate: number;
}> {
  if (!isSupabaseConfigured()) return { total: 0, measured: 0, avg_error: 0, accuracy_rate: 0 };

  const db = getDb();
  let query = db
    .from('prediction_outcomes')
    .select('predicted_score, actual_score, error, outcome_measured')
    .eq('agent', agent);

  if (type) query = query.eq('prediction_type', type);

  const { data, error } = await query;
  if (error || !data) return { total: 0, measured: 0, avg_error: 0, accuracy_rate: 0 };

  const rows = data as Array<{
    predicted_score: number;
    actual_score: number | null;
    error: number | null;
    outcome_measured: boolean;
  }>;

  const measured = rows.filter(r => r.outcome_measured && r.error !== null);
  const errors = measured.map(r => Math.abs(r.error!));
  const avgError = errors.length > 0 ? errors.reduce((a, b) => a + b, 0) / errors.length : 0;
  const correct = measured.filter(r => Math.abs(r.error!) < 0.15).length;
  const accuracyRate = measured.length > 0 ? correct / measured.length : 0;

  return {
    total: rows.length,
    measured: measured.length,
    avg_error: Math.round(avgError * 1000) / 1000,
    accuracy_rate: Math.round(accuracyRate * 1000) / 1000,
  };
}
