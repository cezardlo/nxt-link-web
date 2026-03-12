// src/lib/agents/os/types.ts
// Agent Operating System — core types for the 6-layer intelligence pipeline.
//
// WORLD INPUT → Signal Intake → Knowledge Engine → Reasoning Engine
//            → Creation Engine → Publishing Engine → Quality Control
//
// Communication: Event Bus + Task Board + Shared Memory

// ─── Events ─────────────────────────────────────────────────────────────────────

export type EventType =
  // Layer 1 — Signal Intake
  | 'signal_detected'
  | 'source_added'
  | 'source_failed'
  // Layer 2 — Knowledge Engine
  | 'entity_created'
  | 'entity_updated'
  | 'entity_merged'
  | 'relationship_created'
  | 'relationship_strengthened'
  | 'graph_updated'
  // Layer 3 — Reasoning Engine
  | 'pattern_detected'
  | 'trajectory_detected'
  | 'opportunity_detected'
  | 'industry_emerging'
  | 'market_shift'
  | 'convergence_detected'
  // Layer 3.5 — Prediction Engine
  | 'forecast_generated'
  | 'convergence_predicted'
  | 'timing_estimated'
  | 'risk_detected'
  // Layer 3.75 — Opportunity Engine
  | 'opportunity_scored'
  // Layer 4 — Creation Engine
  | 'page_generated'
  | 'profile_updated'
  | 'framework_completed'
  // Layer 5 — Publishing Engine
  | 'page_published'
  | 'feed_updated'
  | 'map_updated'
  // Layer 6 — Quality Control
  | 'quality_check_passed'
  | 'quality_check_failed'
  | 'duplicate_detected'
  | 'stale_entity_flagged';

export type AgentEvent = {
  id: string;
  type: EventType;
  source_layer: LayerName;
  source_agent: string;
  timestamp: string;
  data: Record<string, unknown>;
};

// ─── Tasks ──────────────────────────────────────────────────────────────────────

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'claimed' | 'running' | 'completed' | 'failed';

export type TaskType =
  | 'scan_source'
  | 'extract_signals'
  | 'resolve_entity'
  | 'build_relationships'
  | 'merge_entities'
  | 'score_industry'
  | 'detect_patterns'
  | 'run_predictions'
  | 'run_opportunities'
  | 'run_framework'
  | 'build_industry_page'
  | 'update_profile'
  | 'publish_page'
  | 'quality_check'
  | 'prune_stale';

export type Task = {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  claimed_by?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
};

// ─── Layers ─────────────────────────────────────────────────────────────────────

export type LayerName =
  | 'signal_intake'
  | 'knowledge_engine'
  | 'reasoning_engine'
  | 'prediction_engine'
  | 'creation_engine'
  | 'publishing_engine'
  | 'quality_control';

export type LayerStatus = {
  name: LayerName;
  healthy: boolean;
  last_run: string | null;
  tasks_completed: number;
  tasks_failed: number;
  events_emitted: number;
};

// ─── Agent ──────────────────────────────────────────────────────────────────────

export type AgentRole = {
  id: string;
  name: string;
  layer: LayerName;
  description: string;
  subscribes_to: EventType[];
  emits: EventType[];
  task_types: TaskType[];
};

// ─── Shared Memory ──────────────────────────────────────────────────────────────

export type MemoryKey =
  | 'known_industries'
  | 'known_companies'
  | 'known_technologies'
  | 'aliases'
  | 'confidence_scores'
  | 'publish_queue'
  | 'scan_history'
  | 'layer_status';

// ─── Pipeline Result ────────────────────────────────────────────────────────────

export type PipelineResult = {
  run_id: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  layers: Record<LayerName, LayerRunResult>;
  events_total: number;
  tasks_total: number;
  errors: string[];
};

export type LayerRunResult = {
  status: 'success' | 'partial' | 'failed' | 'skipped';
  duration_ms: number;
  tasks_completed: number;
  events_emitted: number;
  errors: string[];
};
