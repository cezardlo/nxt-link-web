// src/lib/agents/os/pipeline.ts
// The Intelligence Loop — the main pipeline that runs all 6 layers in sequence.
//
//   Observe → Structure → Analyze → Create → Publish → Audit
//   (Layer 1)  (Layer 2)  (Layer 3) (Layer 4) (Layer 5) (Layer 6)
//
// This is called by the cron job every 6 hours.

import type { PipelineResult, LayerName, LayerRunResult } from './types';
import { eventBus } from './event-bus';
import { taskBoard } from './task-board';
import { sharedMemory } from './shared-memory';
import {
  runSignalIntake,
  runKnowledgeEngine,
  runReasoningEngine,
  runPredictionEngine,
  runCreationEngine,
  runPublishingEngine,
  runQualityControl,
} from './layers';

// ─── Pipeline ───────────────────────────────────────────────────────────────────

/**
 * Run the full intelligence loop.
 * Each layer feeds the next. If a layer fails, subsequent layers still run
 * with whatever data is available.
 */
export async function runIntelligenceLoop(): Promise<PipelineResult> {
  const runId = `run-${Date.now()}`;
  const startedAt = new Date().toISOString();
  const start = Date.now();

  console.log(`[agent-os] Intelligence loop ${runId} starting...`);

  // Reset event bus for this run (keep shared memory persistent)
  eventBus.reset();

  // Store run metadata
  sharedMemory.set('current_run_id', runId);
  sharedMemory.set('current_run_started', startedAt);

  const layers: Record<LayerName, LayerRunResult> = {
    signal_intake: { status: 'skipped', duration_ms: 0, tasks_completed: 0, events_emitted: 0, errors: [] },
    knowledge_engine: { status: 'skipped', duration_ms: 0, tasks_completed: 0, events_emitted: 0, errors: [] },
    reasoning_engine: { status: 'skipped', duration_ms: 0, tasks_completed: 0, events_emitted: 0, errors: [] },
    prediction_engine: { status: 'skipped', duration_ms: 0, tasks_completed: 0, events_emitted: 0, errors: [] },
    creation_engine: { status: 'skipped', duration_ms: 0, tasks_completed: 0, events_emitted: 0, errors: [] },
    publishing_engine: { status: 'skipped', duration_ms: 0, tasks_completed: 0, events_emitted: 0, errors: [] },
    quality_control: { status: 'skipped', duration_ms: 0, tasks_completed: 0, events_emitted: 0, errors: [] },
  };

  const allErrors: string[] = [];

  // ── Layer 1: Signal Intake (Observe) ──
  console.log('[agent-os] Layer 1: Signal Intake...');
  try {
    layers.signal_intake = await runSignalIntake();
    console.log(`[agent-os] Layer 1 done: ${layers.signal_intake.events_emitted} events, ${layers.signal_intake.duration_ms}ms`);
  } catch (err) {
    const msg = `Layer 1 crashed: ${err instanceof Error ? err.message : 'unknown'}`;
    layers.signal_intake = { status: 'failed', duration_ms: 0, tasks_completed: 0, events_emitted: 0, errors: [msg] };
    allErrors.push(msg);
  }

  // ── Layer 2: Knowledge Engine (Structure) ──
  console.log('[agent-os] Layer 2: Knowledge Engine...');
  try {
    layers.knowledge_engine = await runKnowledgeEngine();
    console.log(`[agent-os] Layer 2 done: ${layers.knowledge_engine.events_emitted} events, ${layers.knowledge_engine.duration_ms}ms`);
  } catch (err) {
    const msg = `Layer 2 crashed: ${err instanceof Error ? err.message : 'unknown'}`;
    layers.knowledge_engine = { status: 'failed', duration_ms: 0, tasks_completed: 0, events_emitted: 0, errors: [msg] };
    allErrors.push(msg);
  }

  // ── Layer 3: Reasoning Engine (Analyze) ──
  console.log('[agent-os] Layer 3: Reasoning Engine...');
  try {
    layers.reasoning_engine = await runReasoningEngine();
    console.log(`[agent-os] Layer 3 done: ${layers.reasoning_engine.events_emitted} events, ${layers.reasoning_engine.duration_ms}ms`);
  } catch (err) {
    const msg = `Layer 3 crashed: ${err instanceof Error ? err.message : 'unknown'}`;
    layers.reasoning_engine = { status: 'failed', duration_ms: 0, tasks_completed: 0, events_emitted: 0, errors: [msg] };
    allErrors.push(msg);
  }

  // ── Layer 3.5: Prediction Engine (Predict) ──
  console.log('[agent-os] Layer 3.5: Prediction Engine...');
  try {
    layers.prediction_engine = await runPredictionEngine();
    console.log(`[agent-os] Layer 3.5 done: ${layers.prediction_engine.events_emitted} events, ${layers.prediction_engine.duration_ms}ms`);
  } catch (err) {
    const msg = `Layer 3.5 crashed: ${err instanceof Error ? err.message : 'unknown'}`;
    layers.prediction_engine = { status: 'failed', duration_ms: 0, tasks_completed: 0, events_emitted: 0, errors: [msg] };
    allErrors.push(msg);
  }

  // ── Layer 4: Creation Engine (Create) ──
  console.log('[agent-os] Layer 4: Creation Engine...');
  try {
    layers.creation_engine = await runCreationEngine();
    console.log(`[agent-os] Layer 4 done: ${layers.creation_engine.events_emitted} events, ${layers.creation_engine.duration_ms}ms`);
  } catch (err) {
    const msg = `Layer 4 crashed: ${err instanceof Error ? err.message : 'unknown'}`;
    layers.creation_engine = { status: 'failed', duration_ms: 0, tasks_completed: 0, events_emitted: 0, errors: [msg] };
    allErrors.push(msg);
  }

  // ── Layer 5: Publishing Engine (Publish) ──
  console.log('[agent-os] Layer 5: Publishing Engine...');
  try {
    layers.publishing_engine = await runPublishingEngine();
    console.log(`[agent-os] Layer 5 done: ${layers.publishing_engine.events_emitted} events, ${layers.publishing_engine.duration_ms}ms`);
  } catch (err) {
    const msg = `Layer 5 crashed: ${err instanceof Error ? err.message : 'unknown'}`;
    layers.publishing_engine = { status: 'failed', duration_ms: 0, tasks_completed: 0, events_emitted: 0, errors: [msg] };
    allErrors.push(msg);
  }

  // ── Layer 6: Quality Control (Audit) ──
  console.log('[agent-os] Layer 6: Quality Control...');
  try {
    layers.quality_control = await runQualityControl();
    console.log(`[agent-os] Layer 6 done: ${layers.quality_control.events_emitted} events, ${layers.quality_control.duration_ms}ms`);
  } catch (err) {
    const msg = `Layer 6 crashed: ${err instanceof Error ? err.message : 'unknown'}`;
    layers.quality_control = { status: 'failed', duration_ms: 0, tasks_completed: 0, events_emitted: 0, errors: [msg] };
    allErrors.push(msg);
  }

  // ── Compile results ──
  const completedAt = new Date().toISOString();
  const durationMs = Date.now() - start;

  let eventsTotal = 0;
  let tasksTotal = 0;
  for (const layer of Object.values(layers)) {
    eventsTotal += layer.events_emitted;
    tasksTotal += layer.tasks_completed;
  }

  const result: PipelineResult = {
    run_id: runId,
    started_at: startedAt,
    completed_at: completedAt,
    duration_ms: durationMs,
    layers,
    events_total: eventsTotal,
    tasks_total: tasksTotal,
    errors: allErrors,
  };

  // Store result in shared memory
  sharedMemory.set('last_pipeline_result', result);
  sharedMemory.set('last_pipeline_run', completedAt);

  console.log(`[agent-os] Intelligence loop ${runId} complete: ${eventsTotal} events, ${tasksTotal} tasks, ${durationMs}ms, ${allErrors.length} errors`);

  return result;
}

/** Get the last pipeline result from shared memory */
export function getLastPipelineResult(): PipelineResult | undefined {
  return sharedMemory.get<PipelineResult>('last_pipeline_result');
}

/** Get a summary of the current system state */
export function getSystemStatus(): Record<string, unknown> {
  return {
    last_run: sharedMemory.get('last_pipeline_run'),
    last_scan_count: sharedMemory.get('last_scan_count'),
    graph_signals_processed: sharedMemory.get('graph_signals_processed'),
    emerging_candidates: sharedMemory.get('emerging_candidates'),
    published_count: sharedMemory.get('published_count'),
    event_counts: eventBus.getCounts(),
    task_stats: taskBoard.getStats(),
    memory_keys: sharedMemory.keys().length,
  };
}
