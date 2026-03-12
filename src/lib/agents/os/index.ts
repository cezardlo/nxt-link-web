// src/lib/agents/os/index.ts
// Agent Operating System — public API

export { runIntelligenceLoop, getLastPipelineResult, getSystemStatus } from './pipeline';
export { eventBus, createEvent } from './event-bus';
export { taskBoard } from './task-board';
export { sharedMemory } from './shared-memory';
export type {
  AgentEvent,
  EventType,
  Task,
  TaskType,
  TaskPriority,
  TaskStatus,
  LayerName,
  LayerStatus,
  PipelineResult,
  LayerRunResult,
  AgentRole,
} from './types';
