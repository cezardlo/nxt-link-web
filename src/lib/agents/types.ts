import { z } from 'zod';

// ---- Agent identifiers ----
export const AGENT_NAMES = ['discovery', 'vetting', 'comparison', 'pilot_design', 'market_intel'] as const;
export type AgentName = typeof AGENT_NAMES[number];
export type AgentStatus = 'pending' | 'running' | 'success' | 'failed';

// ---- Orchestrator routing decision ----
export type OrchestratorDecision = {
  agents_to_run: AgentName[];
  routing_reasoning: string;
  problem_summary: string;
  urgency_hint: number;
  primary_category: string;
  secondary_categories: string[];
};

// ---- Context passed from orchestrator to each specialist agent ----
export type AgentContext = {
  run_id: string;
  problem_statement: string;
  company_name: string;
  industry: string;
  city: string;
  orchestrator_decision: OrchestratorDecision;
};

// ---- Typed outputs per specialist agent ----
export type DiscoveryOutput = {
  vendors_found: Array<{
    name: string;
    url: string | null;
    category: string;
    relevance_reasoning: string;
    confidence: number;
  }>;
  search_strategy: string;
  coverage_gaps: string[];
};

export type VettingOutput = {
  vendor_scores: Array<{
    vendor_name: string;
    signal_score: number;
    deployment_readiness_score: number;
    fit_score: number;
    impartiality_notes: string;
    red_flags: string[];
    green_flags: string[];
  }>;
  vetting_methodology: string;
};

export type ComparisonOutput = {
  comparison_table: Array<{
    vendor_name: string;
    strengths: string[];
    weaknesses: string[];
    best_for: string;
    cost_range: string;
    integration_complexity: 'Low' | 'Medium' | 'High';
    smb_suitable: boolean;
  }>;
  recommendation_narrative: string;
  clear_winner: string | null;
};

export type PilotDesignOutput = {
  pilot_duration_days: number;
  phases: Array<{
    phase: string;
    days: string;
    objectives: string[];
    success_metrics: string[];
  }>;
  go_no_go_criteria: string[];
  risk_mitigations: string[];
  budget_estimate_usd: string;
};

export type MarketIntelOutput = {
  market_leaders: string[];
  emerging_players: string[];
  declining_players: string[];
  market_size_signal: string;
  key_trends: string[];
  competitive_dynamics: string;
  opportunity_gaps: string[];
};

export type SynthesisOutput = {
  executive_summary: string;
  top_vendors: string[];
  recommended_pilot_path: string;
  next_actions: string[];
  confidence_score: number;
};

// ---- Per-step result ----
export type AgentStepResult = {
  agent: AgentName;
  status: AgentStatus;
  started_at: string;
  completed_at: string;
  latency_ms: number;
  provider_used: string;
  output: DiscoveryOutput | VettingOutput | ComparisonOutput | PilotDesignOutput | MarketIntelOutput | Record<string, never>;
  error?: string;
};

// ---- Full run output ----
export type AgentRunOutput = {
  run_id: string;
  problem_statement: string;
  company_name: string;
  industry: string;
  routing: OrchestratorDecision;
  steps: AgentStepResult[];
  synthesis: SynthesisOutput;
  total_latency_ms: number;
  providers_used: string[];
  created_at: string;
};

// ---- Run history summary (for listing) ----
export type AgentRunSummary = {
  id: string;
  run_id: string;
  company_name: string;
  industry: string;
  problem_summary: string;
  agents_run: string;
  total_latency_ms: number;
  created_at: string;
};

// ---- API shapes ----
export const agentRunRequestSchema = z.object({
  company_name: z.string().trim().min(2).max(200),
  industry: z.string().trim().min(2).max(100),
  city: z.string().trim().min(1).max(100).default('El Paso, Texas'),
  problem_statement: z.string().trim().min(40).max(4000),
  agents: z.array(z.enum(AGENT_NAMES)).max(5).optional(),
  persist_run: z.boolean().default(true),
});

export type AgentRunRequest = z.infer<typeof agentRunRequestSchema>;

export type AgentRunResponse = {
  ok: boolean;
  message?: string;
  run_id?: string;
  run?: AgentRunOutput;
};

// ---- JSON parse helper (shared across agents) ----
export function parseAgentJson(raw: string): unknown {
  const trimmed = raw.trim();
  const stripped = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  return JSON.parse(stripped);
}
