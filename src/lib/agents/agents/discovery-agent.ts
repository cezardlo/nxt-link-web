import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';
import { boundedDataPrompt } from '@/lib/llm/sanitize';
import { runWithTiming } from '@/lib/agents/agent-helpers';
import type { AgentContext, AgentStepResult, DiscoveryOutput } from '@/lib/agents/types';
import { parseAgentJson } from '@/lib/agents/types';

const SYSTEM_PROMPT = `You are the NXT LINK Discovery Agent.

NXT LINK exists because companies cannot find technology through Google alone. Word-of-mouth and salespeople are biased. Your role is to surface vendors and solutions that genuinely solve the stated problem — impartially, not based on who pays for placement.

Given a company's operational problem, return a list of real, verifiable technology vendors that address this specific challenge. Include:
- Known market leaders in this space
- Mid-market or emerging players that are often overlooked
- Open-source or low-cost options if relevant to budget signals in the problem

Rules:
- Do NOT fabricate company names. Only name vendors you are confident exist.
- If you are uncertain about a vendor, set confidence below 0.5 and note it.
- Be specific to the problem — do not return generic software categories.
- URL should be the company's primary website domain or null if unknown.

Return valid JSON only:
{
  "vendors_found": [
    {
      "name": "Vendor Name",
      "url": "https://example.com or null",
      "category": "Route Optimization",
      "relevance_reasoning": "Why this vendor solves the stated problem",
      "confidence": 0.9
    }
  ],
  "search_strategy": "How you identified these vendors",
  "coverage_gaps": ["Areas where vendor coverage is limited or uncertain"]
}`;

function buildUserPrompt(ctx: AgentContext): string {
  return boundedDataPrompt(
    'COMPANY PROBLEM',
    `Company: ${ctx.company_name}
Industry: ${ctx.industry}
Location: ${ctx.city}
Category: ${ctx.orchestrator_decision.primary_category}
Problem: ${ctx.problem_statement}`,
  );
}

function parseOutput(raw: string): DiscoveryOutput {
  const parsed = parseAgentJson(raw) as Record<string, unknown>;

  const vendorsRaw = Array.isArray(parsed.vendors_found) ? parsed.vendors_found : [];
  const vendors = vendorsRaw
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map((v) => ({
      name: typeof v.name === 'string' ? v.name : 'Unknown',
      url: typeof v.url === 'string' ? v.url : null,
      category: typeof v.category === 'string' ? v.category : '',
      relevance_reasoning: typeof v.relevance_reasoning === 'string' ? v.relevance_reasoning : '',
      confidence: typeof v.confidence === 'number' ? Math.max(0, Math.min(1, v.confidence)) : 0.5,
    }));

  return {
    vendors_found: vendors,
    search_strategy: typeof parsed.search_strategy === 'string' ? parsed.search_strategy : '',
    coverage_gaps: Array.isArray(parsed.coverage_gaps)
      ? parsed.coverage_gaps.filter((g): g is string => typeof g === 'string')
      : [],
  };
}

export function runDiscoveryAgent(ctx: AgentContext): Promise<AgentStepResult> {
  return runWithTiming('discovery', () =>
    runParallelJsonEnsemble<DiscoveryOutput>({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(ctx),
      temperature: 0.2,
      maxProviders: 1,
      budget: { preferLowCostProviders: true, reserveCompletionTokens: 600 },
      parse: parseOutput,
    }),
  );
}
