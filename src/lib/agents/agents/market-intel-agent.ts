import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';
import { boundedDataPrompt } from '@/lib/llm/sanitize';
import { runWithTiming } from '@/lib/agents/agent-helpers';
import type { AgentContext, AgentStepResult, MarketIntelOutput } from '@/lib/agents/types';
import { parseAgentJson } from '@/lib/agents/types';

const SYSTEM_PROMPT = `You are the NXT LINK Market Intelligence Agent.

NXT LINK gives companies the same market landscape view that an independent analyst would provide — without selling anything. Your purpose is to give decision-makers a clear picture of who exists, who leads, and what is changing in the technology market relevant to their problem.

Return a structured market landscape covering:
- market_leaders: 3-5 established, dominant vendors with significant market share
- emerging_players: 2-4 newer or smaller vendors gaining traction; these are the ones a company might miss through normal discovery
- declining_players: 1-3 vendors showing weakness signals (losing market share, funding issues, product stagnation) — leave empty array if none
- market_size_signal: Qualitative description of market size and growth trajectory
- key_trends: 3-5 specific market trends most relevant to the problem domain (not generic AI/digital transformation buzzwords)
- competitive_dynamics: How this market is structured — is it fragmented with many small players, or consolidated around 2-3 leaders?
- opportunity_gaps: Underserved segments, capability gaps, or problems no current vendor solves well

Rules:
- Accuracy over completeness. If you are uncertain about a claim, say so explicitly.
- Do not speculate about private company financials.
- key_trends must be specific to the problem domain, not generic.
- opportunity_gaps are your most valuable insight — be specific and honest.

Return valid JSON only:
{
  "market_leaders": ["string"],
  "emerging_players": ["string"],
  "declining_players": ["string"],
  "market_size_signal": "string",
  "key_trends": ["string"],
  "competitive_dynamics": "string",
  "opportunity_gaps": ["string"]
}`;

function buildUserPrompt(ctx: AgentContext): string {
  return boundedDataPrompt(
    'COMPANY PROBLEM',
    `Company: ${ctx.company_name}
Industry: ${ctx.industry}
Location: ${ctx.city}
Problem: ${ctx.problem_statement}
Primary category: ${ctx.orchestrator_decision.primary_category}
Related categories: ${ctx.orchestrator_decision.secondary_categories.join(', ') || 'None'}

Provide market intelligence for the "${ctx.orchestrator_decision.primary_category}" technology market as it relates to this problem.`,
  );
}

function parseOutput(raw: string): MarketIntelOutput {
  const parsed = parseAgentJson(raw) as Record<string, unknown>;

  const toStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string');
  };

  return {
    market_leaders: toStringArray(parsed.market_leaders),
    emerging_players: toStringArray(parsed.emerging_players),
    declining_players: toStringArray(parsed.declining_players),
    market_size_signal: typeof parsed.market_size_signal === 'string' ? parsed.market_size_signal : '',
    key_trends: toStringArray(parsed.key_trends),
    competitive_dynamics: typeof parsed.competitive_dynamics === 'string' ? parsed.competitive_dynamics : '',
    opportunity_gaps: toStringArray(parsed.opportunity_gaps),
  };
}

export function runMarketIntelAgent(ctx: AgentContext): Promise<AgentStepResult> {
  return runWithTiming('market_intel', () =>
    runParallelJsonEnsemble<MarketIntelOutput>({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(ctx),
      temperature: 0.2,
      maxProviders: 1,
      budget: { preferLowCostProviders: true, reserveCompletionTokens: 600 },
      parse: parseOutput,
    }),
  );
}
