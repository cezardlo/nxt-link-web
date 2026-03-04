import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';
import { boundedDataPrompt } from '@/lib/llm/sanitize';
import { runWithTiming } from '@/lib/agents/agent-helpers';
import type { AgentContext, AgentStepResult, VettingOutput } from '@/lib/agents/types';
import { parseAgentJson } from '@/lib/agents/types';

const SYSTEM_PROMPT = `You are the NXT LINK Vetting Agent.

NXT LINK exists because companies cannot trust vendor-provided information alone. Your role is the verification layer — applying impartial, structured scoring to technology vendors.

Score each vendor across three dimensions (integers 0-10):
- signal_score: Market presence, funding stage, conference presence, awards, press coverage, notable partnerships
- deployment_readiness_score: How fast and easily this vendor can be deployed in a 45-90 day pilot; penalize for long sales cycles or complex integrations
- fit_score: How precisely this vendor's core capability maps to the specific problem stated; must be tied to problem keywords

You MUST also document:
- red_flags: Claims that seem overstated, lack public evidence, or are concerning
- green_flags: Independently verifiable positive signals (public case studies, grants, regulatory approvals, notable clients)
- impartiality_notes: What NXT LINK would specifically verify in due diligence (do not just restate marketing claims)

Rules:
- Never score based on vendor marketing claims alone
- A fit_score of 9-10 requires explicit reasoning tied to problem keywords
- A vendor with no verifiable URL or public presence should have signal_score ≤ 3
- Be honest about uncertainty — score 5 if you cannot find evidence

Return valid JSON only:
{
  "vendor_scores": [
    {
      "vendor_name": "string",
      "signal_score": 7,
      "deployment_readiness_score": 8,
      "fit_score": 9,
      "impartiality_notes": "string",
      "red_flags": ["string"],
      "green_flags": ["string"]
    }
  ],
  "vetting_methodology": "string explaining your scoring approach for this problem domain"
}`;

function buildUserPrompt(ctx: AgentContext): string {
  return boundedDataPrompt(
    'COMPANY PROBLEM',
    `Company: ${ctx.company_name}
Industry: ${ctx.industry}
Location: ${ctx.city}
Problem: ${ctx.problem_statement}
Category: ${ctx.orchestrator_decision.primary_category}

Please vet the top vendors in the "${ctx.orchestrator_decision.primary_category}" space for this specific problem.`,
  );
}

function parseOutput(raw: string): VettingOutput {
  const parsed = parseAgentJson(raw) as Record<string, unknown>;

  const scoresRaw = Array.isArray(parsed.vendor_scores) ? parsed.vendor_scores : [];
  const vendor_scores = scoresRaw
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map((v) => ({
      vendor_name: typeof v.vendor_name === 'string' ? v.vendor_name : 'Unknown',
      signal_score: typeof v.signal_score === 'number' ? Math.max(0, Math.min(10, Math.round(v.signal_score))) : 5,
      deployment_readiness_score: typeof v.deployment_readiness_score === 'number' ? Math.max(0, Math.min(10, Math.round(v.deployment_readiness_score))) : 5,
      fit_score: typeof v.fit_score === 'number' ? Math.max(0, Math.min(10, Math.round(v.fit_score))) : 5,
      impartiality_notes: typeof v.impartiality_notes === 'string' ? v.impartiality_notes : '',
      red_flags: Array.isArray(v.red_flags) ? v.red_flags.filter((f): f is string => typeof f === 'string') : [],
      green_flags: Array.isArray(v.green_flags) ? v.green_flags.filter((f): f is string => typeof f === 'string') : [],
    }));

  return {
    vendor_scores,
    vetting_methodology: typeof parsed.vetting_methodology === 'string' ? parsed.vetting_methodology : '',
  };
}

export function runVettingAgent(ctx: AgentContext): Promise<AgentStepResult> {
  return runWithTiming('vetting', () =>
    runParallelJsonEnsemble<VettingOutput>({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(ctx),
      temperature: 0.1,
      maxProviders: 1,
      budget: { preferLowCostProviders: true, reserveCompletionTokens: 700 },
      parse: parseOutput,
    }),
  );
}
