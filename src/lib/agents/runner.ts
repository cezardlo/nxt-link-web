import { randomUUID } from 'node:crypto';

import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';
import { sanitizeUntrustedLlmInput, boundedDataPrompt } from '@/lib/llm/sanitize';
import { runOrchestrator } from '@/lib/agents/orchestrator';
import { runDiscoveryAgent } from '@/lib/agents/agents/discovery-agent';
import { runVettingAgent } from '@/lib/agents/agents/vetting-agent';
import { runComparisonAgent } from '@/lib/agents/agents/comparison-agent';
import { runPilotDesignAgent } from '@/lib/agents/agents/pilot-design-agent';
import { runMarketIntelAgent } from '@/lib/agents/agents/market-intel-agent';
import type {
  AgentContext,
  AgentName,
  AgentRunOutput,
  AgentRunRequest,
  AgentStepResult,
  SynthesisOutput,
} from '@/lib/agents/types';
import { parseAgentJson } from '@/lib/agents/types';
import { logger } from '@/lib/observability/logger';

const SYNTHESIS_SYSTEM_PROMPT = `You are the NXT LINK Synthesis Agent.

You receive outputs from multiple specialist agents (Discovery, Vetting, Comparison, Pilot Design, Market Intelligence) and synthesize them into a final executive briefing for a company decision-maker.

Your synthesis must:
1. Write an executive_summary (3-5 sentences) that communicates the clearest path forward
2. List top_vendors (2-4 vendor names that best match this problem based on all agent outputs)
3. Write recommended_pilot_path (1-2 sentences on what to test first and why)
4. List next_actions (3-5 concrete, ordered steps the company should take this week)
5. Assign confidence_score (0-10 integer) reflecting how confident NXT LINK is in these recommendations

Rules:
- Do not repeat raw data from agent outputs; synthesize and interpret it
- Be direct and actionable — this is for a busy operations decision-maker
- If agents returned conflicting information, acknowledge it honestly
- confidence_score should reflect data quality and agent consensus, not just positive framing

Return valid JSON only:
{
  "executive_summary": "string",
  "top_vendors": ["string"],
  "recommended_pilot_path": "string",
  "next_actions": ["string"],
  "confidence_score": 8
}`;

function buildSynthesisPrompt(ctx: AgentContext, steps: AgentStepResult[]): string {
  const successfulSteps = steps.filter((s) => s.status === 'success');
  const agentOutputsSummary = successfulSteps
    .map((s) => `=== ${s.agent.toUpperCase()} AGENT OUTPUT ===\n${JSON.stringify(s.output, null, 2)}`)
    .join('\n\n');

  return boundedDataPrompt(
    'AGENT OUTPUTS',
    `Company: ${ctx.company_name}
Industry: ${ctx.industry}
Problem: ${ctx.problem_statement}
Agents run: ${steps.map((s) => s.agent).join(', ')}
Successful agents: ${successfulSteps.map((s) => s.agent).join(', ')}

${agentOutputsSummary}`,
  );
}

function parseSynthesisOutput(raw: string): SynthesisOutput {
  const parsed = parseAgentJson(raw) as Record<string, unknown>;

  return {
    executive_summary: typeof parsed.executive_summary === 'string' ? parsed.executive_summary : '',
    top_vendors: Array.isArray(parsed.top_vendors)
      ? parsed.top_vendors.filter((v): v is string => typeof v === 'string')
      : [],
    recommended_pilot_path: typeof parsed.recommended_pilot_path === 'string' ? parsed.recommended_pilot_path : '',
    next_actions: Array.isArray(parsed.next_actions)
      ? parsed.next_actions.filter((a): a is string => typeof a === 'string')
      : [],
    confidence_score: typeof parsed.confidence_score === 'number'
      ? Math.max(0, Math.min(10, Math.round(parsed.confidence_score)))
      : 5,
  };
}

async function runSynthesisStep(
  ctx: AgentContext,
  steps: AgentStepResult[],
): Promise<SynthesisOutput> {
  try {
    const { result } = await runParallelJsonEnsemble<SynthesisOutput>({
      systemPrompt: SYNTHESIS_SYSTEM_PROMPT,
      userPrompt: buildSynthesisPrompt(ctx, steps),
      temperature: 0.15,
      maxProviders: 1,
      budget: { preferLowCostProviders: true, reserveCompletionTokens: 500 },
      parse: (content) => parseSynthesisOutput(content),
    });
    return result;
  } catch {
    // Graceful fallback if synthesis fails
    return {
      executive_summary: 'Agent analysis complete. Review individual agent outputs for details.',
      top_vendors: [],
      recommended_pilot_path: 'Review discovery and vetting outputs to select a pilot candidate.',
      next_actions: ['Review the agent outputs above', 'Select top vendor candidates', 'Schedule a pilot design session'],
      confidence_score: 5,
    };
  }
}

const agentRunners: Record<AgentName, (ctx: AgentContext) => Promise<AgentStepResult>> = {
  discovery: runDiscoveryAgent,
  vetting: runVettingAgent,
  comparison: runComparisonAgent,
  pilot_design: runPilotDesignAgent,
  market_intel: runMarketIntelAgent,
};

export async function runAgentSystem(request: AgentRunRequest): Promise<AgentRunOutput> {
  const runId = `agent-run-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const globalStart = Date.now();

  // Step 1: Sanitize problem statement
  const sanitized = sanitizeUntrustedLlmInput(request.problem_statement, 4000);
  const safeRequest: AgentRunRequest = {
    ...request,
    problem_statement: sanitized.sanitized_text,
  };

  // Step 2: Orchestrate — determine which agents to run
  const decision = await runOrchestrator(safeRequest);

  const ctx: AgentContext = {
    run_id: runId,
    problem_statement: safeRequest.problem_statement,
    company_name: safeRequest.company_name,
    industry: safeRequest.industry,
    city: safeRequest.city,
    orchestrator_decision: decision,
  };

  // Step 3: Fan out to specialist agents in parallel
  const settled = await Promise.allSettled(
    decision.agents_to_run.map((name) => agentRunners[name](ctx)),
  );

  const steps: AgentStepResult[] = settled.map((result, index) => {
    const agentName = decision.agents_to_run[index] as AgentName;
    if (result.status === 'fulfilled') return result.value;

    const errorMessage = result.reason instanceof Error ? result.reason.message : 'agent_failed';
    logger.error({ event: 'agent_step_failed', run_id: ctx.run_id, agent: agentName, error: errorMessage });
    return {
      agent: agentName,
      status: 'failed' as const,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      latency_ms: 0,
      provider_used: 'none',
      output: {} as Record<string, never>,
      error: errorMessage,
    };
  });

  // Step 4: Synthesize across all step results
  const synthesis = await runSynthesisStep(ctx, steps);

  const providersUsed = Array.from(new Set(
    steps.map((s) => s.provider_used).filter((p) => p && p !== 'none'),
  ));

  return {
    run_id: runId,
    problem_statement: safeRequest.problem_statement,
    company_name: safeRequest.company_name,
    industry: safeRequest.industry,
    routing: decision,
    steps,
    synthesis,
    total_latency_ms: Date.now() - globalStart,
    providers_used: providersUsed,
    created_at: new Date().toISOString(),
  };
}
