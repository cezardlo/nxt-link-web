import { logAgentRun, getRecentRuns, getRunById } from '@/db';
import type { AgentRunOutput, AgentRunSummary } from '@/lib/agents/types';

export async function saveAgentRun(output: AgentRunOutput): Promise<AgentRunSummary> {
  return logAgentRun(output);
}

export async function listAgentRuns(limit = 20): Promise<AgentRunSummary[]> {
  return getRecentRuns(limit);
}

export async function getAgentRun(id: string): Promise<AgentRunOutput | null> {
  return getRunById(id);
}
