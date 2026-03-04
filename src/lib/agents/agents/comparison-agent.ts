import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';
import { boundedDataPrompt } from '@/lib/llm/sanitize';
import { runWithTiming } from '@/lib/agents/agent-helpers';
import type { AgentContext, AgentStepResult, ComparisonOutput } from '@/lib/agents/types';
import { parseAgentJson } from '@/lib/agents/types';

const SYSTEM_PROMPT = `You are the NXT LINK Comparison Agent.

NXT LINK creates impartial, structured vendor comparisons for companies making technology acquisition decisions. You have no commercial relationship with any vendor. Your goal is to give the decision-maker exactly what they need to choose confidently.

For each vendor in the relevant space, produce a comparison row covering:
- strengths: Specific to the stated problem (not generic marketing language)
- weaknesses: Honest and evidence-based, not vague
- best_for: The specific operational scenario where this vendor wins
- cost_range: Realistic estimate (e.g. "$500-$2,000/month", "Enterprise pricing, contact required")
- integration_complexity: Low / Medium / High (relative to a lean operations team)
- smb_suitable: true if a small-to-mid business can adopt this without a dedicated IT team

After the table, write a recommendation_narrative (2-3 sentences) and identify clear_winner (vendor name if one clearly wins, or null if genuinely too close to call).

Rules:
- Do NOT recommend a vendor just because it is well-known or has a large brand
- Favor specific fit to this problem over general brand recognition
- If two vendors are equivalent, say so and set clear_winner to null
- Keep strengths and weaknesses to 2-4 bullet points each

Return valid JSON only:
{
  "comparison_table": [
    {
      "vendor_name": "string",
      "strengths": ["string"],
      "weaknesses": ["string"],
      "best_for": "string",
      "cost_range": "string",
      "integration_complexity": "Low",
      "smb_suitable": true
    }
  ],
  "recommendation_narrative": "string",
  "clear_winner": "Vendor Name or null"
}`;

function buildUserPrompt(ctx: AgentContext): string {
  return boundedDataPrompt(
    'COMPANY PROBLEM',
    `Company: ${ctx.company_name}
Industry: ${ctx.industry}
Location: ${ctx.city}
Problem: ${ctx.problem_statement}
Category: ${ctx.orchestrator_decision.primary_category}

Compare the leading vendors in the "${ctx.orchestrator_decision.primary_category}" space for this problem.`,
  );
}

function parseOutput(raw: string): ComparisonOutput {
  const parsed = parseAgentJson(raw) as Record<string, unknown>;

  const tableRaw = Array.isArray(parsed.comparison_table) ? parsed.comparison_table : [];
  const comparison_table = tableRaw
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map((v) => {
      const complexity = v.integration_complexity;
      const validComplexity: 'Low' | 'Medium' | 'High' =
        complexity === 'Low' || complexity === 'Medium' || complexity === 'High'
          ? complexity
          : 'Medium';

      return {
        vendor_name: typeof v.vendor_name === 'string' ? v.vendor_name : 'Unknown',
        strengths: Array.isArray(v.strengths) ? v.strengths.filter((s): s is string => typeof s === 'string') : [],
        weaknesses: Array.isArray(v.weaknesses) ? v.weaknesses.filter((s): s is string => typeof s === 'string') : [],
        best_for: typeof v.best_for === 'string' ? v.best_for : '',
        cost_range: typeof v.cost_range === 'string' ? v.cost_range : 'Contact vendor',
        integration_complexity: validComplexity,
        smb_suitable: typeof v.smb_suitable === 'boolean' ? v.smb_suitable : false,
      };
    });

  const winner = parsed.clear_winner;

  return {
    comparison_table,
    recommendation_narrative: typeof parsed.recommendation_narrative === 'string' ? parsed.recommendation_narrative : '',
    clear_winner: typeof winner === 'string' && winner.toLowerCase() !== 'null' ? winner : null,
  };
}

export function runComparisonAgent(ctx: AgentContext): Promise<AgentStepResult> {
  return runWithTiming('comparison', () =>
    runParallelJsonEnsemble<ComparisonOutput>({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(ctx),
      temperature: 0.15,
      maxProviders: 1,
      budget: { preferLowCostProviders: true, reserveCompletionTokens: 700 },
      parse: parseOutput,
    }),
  );
}
