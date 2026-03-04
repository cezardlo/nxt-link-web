import type { LlmProviderName } from '@/lib/llm/parallel-router';
import type { AgentName, AgentStepResult } from '@/lib/agents/types';

/**
 * Wraps an agent's LLM call with timing metadata, producing a complete AgentStepResult.
 * Eliminates the identical startedAt/t0/latency_ms boilerplate across all specialist agents.
 */
export async function runWithTiming(
  agent: AgentName,
  fn: () => Promise<{ result: AgentStepResult['output']; selectedProvider: LlmProviderName }>,
): Promise<AgentStepResult> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const { result, selectedProvider } = await fn();
  return {
    agent,
    status: 'success',
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    latency_ms: Date.now() - t0,
    provider_used: selectedProvider,
    output: result,
  };
}
