import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';
import { boundedDataPrompt } from '@/lib/llm/sanitize';
import { runWithTiming } from '@/lib/agents/agent-helpers';
import type { AgentContext, AgentStepResult, PilotDesignOutput } from '@/lib/agents/types';
import { parseAgentJson } from '@/lib/agents/types';

const SYSTEM_PROMPT = `You are the NXT LINK Pilot Design Agent.

NXT LINK's core value proposition: companies should be able to test technology before buying it. Your role is to design a structured, time-bounded pilot that generates measurable evidence before any purchase commitment is made.

Design a pilot that:
1. Can be completed in 30-90 days (optimize for the shortest window that produces meaningful data)
2. Has clear, numeric success criteria per phase
3. Has explicit go/no-go decision gates
4. Accounts for lean operations teams with limited IT capacity
5. Minimizes disruption to current operations

Phase structure (use these exact 4 phases):
1. "Baseline Measurement" - establish current state metrics
2. "Configuration & Integration" - set up the technology in a controlled environment
3. "Live Execution" - run the technology in a real operational window
4. "Decision Readout" - measure results vs. baseline and make go/no-go decision

Budget estimates should be conservative, realistic, and itemized (software license + implementation + training).

Return valid JSON only:
{
  "pilot_duration_days": 45,
  "phases": [
    {
      "phase": "Baseline Measurement",
      "days": "Days 1-7",
      "objectives": ["string"],
      "success_metrics": ["string"]
    }
  ],
  "go_no_go_criteria": ["string — numeric threshold that determines proceed/stop"],
  "risk_mitigations": ["string — specific risk and how to mitigate it"],
  "budget_estimate_usd": "$5,000-$15,000 (itemized: software $X, implementation $Y, training $Z)"
}`;

function buildUserPrompt(ctx: AgentContext): string {
  return boundedDataPrompt(
    'COMPANY PROBLEM',
    `Company: ${ctx.company_name}
Industry: ${ctx.industry}
Location: ${ctx.city}
Problem: ${ctx.problem_statement}
Category: ${ctx.orchestrator_decision.primary_category}
Urgency: ${ctx.orchestrator_decision.urgency_hint}/10

Design a pilot test plan for adopting technology in the "${ctx.orchestrator_decision.primary_category}" space to address this problem.`,
  );
}

function parseOutput(raw: string): PilotDesignOutput {
  const parsed = parseAgentJson(raw) as Record<string, unknown>;

  const phasesRaw = Array.isArray(parsed.phases) ? parsed.phases : [];
  const phases = phasesRaw
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
    .map((p) => ({
      phase: typeof p.phase === 'string' ? p.phase : '',
      days: typeof p.days === 'string' ? p.days : '',
      objectives: Array.isArray(p.objectives) ? p.objectives.filter((o): o is string => typeof o === 'string') : [],
      success_metrics: Array.isArray(p.success_metrics) ? p.success_metrics.filter((m): m is string => typeof m === 'string') : [],
    }));

  return {
    pilot_duration_days: typeof parsed.pilot_duration_days === 'number' ? Math.max(14, Math.min(90, parsed.pilot_duration_days)) : 45,
    phases,
    go_no_go_criteria: Array.isArray(parsed.go_no_go_criteria)
      ? parsed.go_no_go_criteria.filter((c): c is string => typeof c === 'string')
      : [],
    risk_mitigations: Array.isArray(parsed.risk_mitigations)
      ? parsed.risk_mitigations.filter((r): r is string => typeof r === 'string')
      : [],
    budget_estimate_usd: typeof parsed.budget_estimate_usd === 'string' ? parsed.budget_estimate_usd : 'Contact vendors for quotes',
  };
}

export function runPilotDesignAgent(ctx: AgentContext): Promise<AgentStepResult> {
  return runWithTiming('pilot_design', () =>
    runParallelJsonEnsemble<PilotDesignOutput>({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(ctx),
      temperature: 0.15,
      maxProviders: 1,
      budget: { preferLowCostProviders: true, reserveCompletionTokens: 600 },
      parse: parseOutput,
    }),
  );
}
