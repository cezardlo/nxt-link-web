// Swarm learning — NXT//LINK platform
// Agent-to-agent feedback loop. Agents rate each other's memory entries,
// building reliability scores used to weight routing decisions.

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export type SwarmRating = 'useful' | 'noise' | 'critical';

export type SwarmFeedback = {
  id: string;
  memory_entry_id: string;
  rated_by_agent: string;
  rating: SwarmRating;
  context?: string;
  created_at: string;
};

export type AgentReliability = {
  agent_name: string;
  total_findings: number;
  useful_count: number;
  noise_count: number;
  critical_count: number;
  /** 0.0 – 1.0. Weighted: critical=1.2, useful=1.0, noise=0.0 */
  reliability_score: number;
};

// In-memory fallback storage
const feedbackStore: SwarmFeedback[] = [];
let feedbackCounter = 0;

// Weight constants used consistently for scoring
const WEIGHT_CRITICAL = 1.2;
const WEIGHT_USEFUL = 1.0;
const WEIGHT_NOISE = 0.0;

function computeReliabilityScore(useful: number, noise: number, critical: number): number {
  const total = useful + noise + critical;
  if (total === 0) return 0.5; // Default neutral score with no data
  const weightedPositive = critical * WEIGHT_CRITICAL + useful * WEIGHT_USEFUL + noise * WEIGHT_NOISE;
  const maxPossible = total * WEIGHT_CRITICAL;
  return maxPossible > 0 ? Math.min(1, weightedPositive / maxPossible) : 0.5;
}

export async function swarmRateFinding(
  entryId: string,
  agentName: string,
  rating: SwarmRating,
  context?: string,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    feedbackStore.push({
      id: `local-${++feedbackCounter}`,
      memory_entry_id: entryId,
      rated_by_agent: agentName,
      rating,
      context,
      created_at: new Date().toISOString(),
    });
    return;
  }

  const supabase = createClient({ admin: true });
  const { error } = await supabase.from('swarm_learning').insert({
    memory_entry_id: entryId,
    rated_by_agent: agentName,
    rating,
    context: context ?? null,
  });

  if (error) {
    console.warn('[SwarmLearning] RateFinding failed:', error.message);
    // Still persist locally so nothing is lost
    feedbackStore.push({
      id: `local-${++feedbackCounter}`,
      memory_entry_id: entryId,
      rated_by_agent: agentName,
      rating,
      context,
      created_at: new Date().toISOString(),
    });
  }
}

export async function swarmGetAgentReliability(agentName?: string): Promise<AgentReliability[]> {
  if (!isSupabaseConfigured()) {
    // Aggregate local feedback against swarm_memory (in-memory).
    // We only have rating records here, so group by the agent who produced the entry.
    // Since we don't have a cross-reference to memory entries in local mode, group by rated_by_agent
    // and treat ratings as a proxy for the issuing agent's reliability.
    const grouped = new Map<string, { useful: number; noise: number; critical: number }>();

    for (const fb of feedbackStore) {
      if (agentName && fb.rated_by_agent !== agentName) continue;
      const key = fb.rated_by_agent;
      const current = grouped.get(key) ?? { useful: 0, noise: 0, critical: 0 };
      if (fb.rating === 'useful') current.useful += 1;
      else if (fb.rating === 'noise') current.noise += 1;
      else if (fb.rating === 'critical') current.critical += 1;
      grouped.set(key, current);
    }

    return Array.from(grouped.entries() as Iterable<[string, { useful: number; noise: number; critical: number }]>).map(
      ([name, counts]) => ({
        agent_name: name,
        total_findings: counts.useful + counts.noise + counts.critical,
        useful_count: counts.useful,
        noise_count: counts.noise,
        critical_count: counts.critical,
        reliability_score: computeReliabilityScore(counts.useful, counts.noise, counts.critical),
      }),
    );
  }

  const supabase = createClient({ admin: true });

  // Join swarm_learning with swarm_memory to attribute ratings to the original author.
  const { data, error } = await supabase
    .from('swarm_learning')
    .select('rating, swarm_memory(agent_name)');

  if (error) {
    console.warn('[SwarmLearning] GetAgentReliability failed:', error.message);
    return [];
  }

  type LearningRow = {
    rating: string;
    // Supabase returns joined rows as arrays; we take the first element.
    swarm_memory: Array<{ agent_name: string }> | { agent_name: string } | null;
  };

  const rows = (data ?? []) as unknown as LearningRow[];
  const grouped = new Map<string, { useful: number; noise: number; critical: number }>();

  for (const row of rows) {
    // Normalise whether the join came back as object or single-element array
    const memoryEntry = Array.isArray(row.swarm_memory)
      ? row.swarm_memory[0]
      : row.swarm_memory;
    const name = memoryEntry?.agent_name ?? 'unknown';
    if (agentName && name !== agentName) continue;
    const current = grouped.get(name) ?? { useful: 0, noise: 0, critical: 0 };
    if (row.rating === 'useful') current.useful += 1;
    else if (row.rating === 'noise') current.noise += 1;
    else if (row.rating === 'critical') current.critical += 1;
    grouped.set(name, current);
  }

  return Array.from(grouped.entries() as Iterable<[string, { useful: number; noise: number; critical: number }]>).map(
    ([name, counts]) => ({
      agent_name: name,
      total_findings: counts.useful + counts.noise + counts.critical,
      useful_count: counts.useful,
      noise_count: counts.noise,
      critical_count: counts.critical,
      reliability_score: computeReliabilityScore(counts.useful, counts.noise, counts.critical),
    }),
  );
}

export async function swarmGetRoutingWeights(): Promise<Record<string, number>> {
  const reliabilities = await swarmGetAgentReliability();

  const weights: Record<string, number> = {};

  for (const r of reliabilities) {
    // Scale: score 0.5 (neutral) → weight 1.0; score 1.0 → weight 2.0; score 0.0 → weight 0.5
    // Formula: weight = 0.5 + reliability_score * 1.5
    // This keeps unreliable agents at half-weight rather than zero to avoid dead ends.
    weights[r.agent_name] = 0.5 + r.reliability_score * 1.5;
  }

  return weights;
}
