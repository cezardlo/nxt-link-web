import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';
import { sanitizeUntrustedLlmInput } from '@/lib/llm/sanitize';
import type { AgentName, AgentRunRequest, OrchestratorDecision } from '@/lib/agents/types';
import { AGENT_NAMES, parseAgentJson } from '@/lib/agents/types';
import { BaseAgent, type AgentRunResult } from '@/lib/agents/base';
import { FeedAgent } from '@/lib/agents/feed-agent-class';
import { EntityAgent } from '@/lib/agents/entity-agent';
import { IKERAgent } from '@/lib/agents/iker-agent';
import { TrendAgent } from '@/lib/agents/trend-agent';
import { NarrativeAgent } from '@/lib/agents/narrative-agent';
import { AlertAgent } from '@/lib/agents/alert-agent';

const ORCHESTRATOR_SYSTEM_PROMPT = `You are the NXT LINK Orchestration Intelligence.

NXT LINK is an impartial technology acquisition platform. Companies come to us because they cannot trust salespeople, cannot find technology through Google alone, and cannot test technology before buying it. Your role is to analyze a company's problem and route it to the right specialist agents.

Available specialist agents:
- "discovery": Finds vendors and technologies that exist for this problem. Always include unless the problem is purely strategic.
- "vetting": Impartially scores vendor credibility, deployment readiness, and fit. Include when vendor quality evaluation is needed.
- "comparison": Side-by-side vendor comparison table. Include when multiple vendors exist and a decision is imminent.
- "pilot_design": Designs a structured 30-90 day test plan before purchase. Include when budget or timeline is mentioned, or when testing before buying is critical.
- "market_intel": Market landscape — who leads, who is emerging, what trends matter. Include for strategic or executive-level queries.

Return valid JSON only:
{
  "agents_to_run": ["discovery", "vetting"],
  "routing_reasoning": "string explaining why these agents were selected",
  "problem_summary": "concise 1-2 sentence normalized version of the problem",
  "urgency_hint": 7,
  "primary_category": "Route Optimization",
  "secondary_categories": ["Fleet Management"]
}

Rules:
- agents_to_run must be a non-empty array containing only: discovery, vetting, comparison, pilot_design, market_intel
- Always include at least "discovery" unless a specific vendor list is already provided
- Include "pilot_design" if the words budget, test, trial, pilot, cost, timeline appear
- Include "market_intel" for strategic, executive, or landscape queries
- urgency_hint is 1-10; higher for words like: critical, loss, downtime, bleeding, urgent, immediately
- primary_category must be one of: Route Optimization / Fleet Management / Cold Chain / RFID Tracking / Warehouse Robotics / Inventory Intelligence / Last Mile Delivery / Water Filtration / Water Monitoring / Irrigation Tech / Energy Management / Solar Integration / Grid Technology / Predictive Maintenance / AI Analytics / SaaS Platform / IoT Infrastructure / Supply Chain Visibility / Precision Agriculture / Environmental Monitoring / Workforce Automation / Cybersecurity / Compliance Tech / Drone Technology / EV Infrastructure / Other`;

function buildOrchestratorPrompt(request: AgentRunRequest): string {
  return `Company: ${request.company_name}
Industry: ${request.industry}
Location: ${request.city}
Problem: ${request.problem_statement}`;
}

function parseOrchestratorDecision(raw: string, fallbackSummary: string): OrchestratorDecision {
  const parsed = parseAgentJson(raw) as Record<string, unknown>;

  const agentsRaw = Array.isArray(parsed.agents_to_run) ? parsed.agents_to_run : [];
  const validAgents = agentsRaw.filter(
    (a): a is AgentName => typeof a === 'string' && (AGENT_NAMES as readonly string[]).includes(a),
  );

  return {
    agents_to_run: validAgents.length > 0 ? validAgents : ['discovery'],
    routing_reasoning: typeof parsed.routing_reasoning === 'string' ? parsed.routing_reasoning : '',
    problem_summary: typeof parsed.problem_summary === 'string' ? parsed.problem_summary : fallbackSummary,
    urgency_hint: typeof parsed.urgency_hint === 'number' ? Math.max(1, Math.min(10, parsed.urgency_hint)) : 5,
    primary_category: typeof parsed.primary_category === 'string' ? parsed.primary_category : 'Other',
    secondary_categories: Array.isArray(parsed.secondary_categories)
      ? parsed.secondary_categories.filter((c): c is string => typeof c === 'string')
      : [],
  };
}

export async function runOrchestrator(
  request: AgentRunRequest,
): Promise<OrchestratorDecision> {
  const sanitized = sanitizeUntrustedLlmInput(request.problem_statement, 2000);
  const fallbackSummary = sanitized.sanitized_text.slice(0, 200);

  const safeRequest: AgentRunRequest = { ...request, problem_statement: sanitized.sanitized_text };

  const ensemble = await runParallelJsonEnsemble<OrchestratorDecision>({
    systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT,
    userPrompt: buildOrchestratorPrompt(safeRequest),
    temperature: 0.1,
    maxProviders: 1,
    budget: { preferLowCostProviders: true, reserveCompletionTokens: 300 },
    parse: (content) => parseOrchestratorDecision(content, fallbackSummary),
  });

  // If caller passed explicit agent override, respect it
  if (request.agents && request.agents.length > 0) {
    return { ...ensemble.result, agents_to_run: request.agents };
  }

  return ensemble.result;
}

class OrchestratorAgent extends BaseAgent {
  name = 'Orchestrator';
  description = 'Wires lightning agents and executes the swarm-coordinated event pipeline.';

  private feed = new FeedAgent();
  private entity = new EntityAgent();
  private iker = new IKERAgent();
  private trend = new TrendAgent();
  private narrative = new NarrativeAgent();
  private alert = new AlertAgent();

  async execute(payload: Record<string, unknown>): Promise<AgentRunResult> {
    const trigger = typeof payload.trigger === 'string' ? payload.trigger : 'manual';

    if (trigger === 'feed' || trigger === 'manual' || trigger === 'hourly') {
      // Run pipeline through swarm coordinator for dynamic routing + event broadcasting
      const { swarmCoordinator } = await import('@/lib/agents/swarm/coordinator');
      await swarmCoordinator.runPlatformPipeline(trigger);
    }

    return {
      itemsIn: 0,
      itemsOut: 0,
      metadata: {
        trigger,
        timestamp: new Date().toISOString(),
        swarm: true,
      },
    };
  }

  async startListening() {
    // Delegate to SwarmCoordinator for dynamic event-driven routing
    const { swarmCoordinator } = await import('@/lib/agents/swarm/coordinator');
    swarmCoordinator.startSwarm();
    console.log('[Orchestrator] Swarm coordinator active — dynamic routing enabled.');
  }
}

export const orchestrator = new OrchestratorAgent();
