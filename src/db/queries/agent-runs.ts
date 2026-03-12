import { randomUUID } from 'node:crypto';

import { getDb, isSupabaseConfigured } from '../client';
import type { AgentRunOutput, AgentRunSummary } from '@/lib/agents/types';

// This table mirrors the shape originally created by store.ts in SQLite.
// The Supabase table name is "agent_run_history" to avoid collision with the
// existing `agent_runs` table (which tracks background agent lifecycle).
// Functions return gracefully when Supabase is not configured.

type AgentRunHistoryRow = {
  id: string;
  run_id: string;
  company_name: string;
  industry: string;
  problem_summary: string;
  agents_run: string;
  total_latency_ms: number;
  output_json: string;
  created_at: string;
};

function mapSummaryRow(row: AgentRunHistoryRow): AgentRunSummary {
  return {
    id: row.id,
    run_id: row.run_id,
    company_name: row.company_name,
    industry: row.industry,
    problem_summary: row.problem_summary,
    agents_run: row.agents_run,
    total_latency_ms: Number(row.total_latency_ms),
    created_at: row.created_at,
  };
}

export async function logAgentRun(output: AgentRunOutput): Promise<AgentRunSummary> {
  if (!isSupabaseConfigured()) {
    const createdAt = new Date().toISOString();
    const agentsRun = output.steps.map((s) => s.agent).join(',');
    const problemSummary = output.routing.problem_summary.slice(0, 300);
    return {
      id: randomUUID(),
      run_id: output.run_id,
      company_name: output.company_name,
      industry: output.industry,
      problem_summary: problemSummary,
      agents_run: agentsRun,
      total_latency_ms: output.total_latency_ms,
      created_at: createdAt,
    };
  }

  const db = getDb({ admin: true });
  const rowId = randomUUID();
  const agentsRun = output.steps.map((s) => s.agent).join(',');
  const problemSummary = output.routing.problem_summary.slice(0, 300);
  const createdAt = new Date().toISOString();

  const { error } = await db.from('agent_run_history').insert({
    id: rowId,
    run_id: output.run_id,
    company_name: output.company_name,
    industry: output.industry,
    problem_summary: problemSummary,
    agents_run: agentsRun,
    total_latency_ms: output.total_latency_ms,
    output_json: JSON.stringify(output),
    created_at: createdAt,
  });

  if (error) {
    // Table may not exist yet — return a constructed summary without throwing.
    return {
      id: rowId,
      run_id: output.run_id,
      company_name: output.company_name,
      industry: output.industry,
      problem_summary: problemSummary,
      agents_run: agentsRun,
      total_latency_ms: output.total_latency_ms,
      created_at: createdAt,
    };
  }

  return {
    id: rowId,
    run_id: output.run_id,
    company_name: output.company_name,
    industry: output.industry,
    problem_summary: problemSummary,
    agents_run: agentsRun,
    total_latency_ms: output.total_latency_ms,
    created_at: createdAt,
  };
}

export async function getRecentRuns(limit = 20): Promise<AgentRunSummary[]> {
  if (!isSupabaseConfigured()) return [];

  const db = getDb({ admin: true });
  const n = Math.max(1, Math.min(100, limit));

  const { data, error } = await db
    .from('agent_run_history')
    .select('id,run_id,company_name,industry,problem_summary,agents_run,total_latency_ms,created_at')
    .order('created_at', { ascending: false })
    .limit(n);

  if (error || !data) return [];

  return (data as AgentRunHistoryRow[]).map(mapSummaryRow);
}

export async function getRunById(id: string): Promise<AgentRunOutput | null> {
  if (!isSupabaseConfigured()) return null;

  const db = getDb({ admin: true });

  const { data, error } = await db
    .from('agent_run_history')
    .select('output_json')
    .or(`id.eq.${id},run_id.eq.${id}`)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  try {
    return JSON.parse((data as { output_json: string }).output_json) as AgentRunOutput;
  } catch {
    return null;
  }
}
