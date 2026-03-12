// src/lib/agents/os/event-bus.ts
// In-memory event bus for agent communication.
// Events flow between layers — agents subscribe to events they care about.

import type { AgentEvent, EventType } from './types';

type EventHandler = (event: AgentEvent) => void | Promise<void>;

// ─── Event Bus ──────────────────────────────────────────────────────────────────

class EventBus {
  private handlers = new Map<EventType, EventHandler[]>();
  private history: AgentEvent[] = [];
  private maxHistory = 500;

  /** Subscribe to an event type */
  on(type: EventType, handler: EventHandler): void {
    const existing = this.handlers.get(type) ?? [];
    existing.push(handler);
    this.handlers.set(type, existing);
  }

  /** Subscribe to multiple event types */
  onMany(types: EventType[], handler: EventHandler): void {
    for (const type of types) {
      this.on(type, handler);
    }
  }

  /** Emit an event — all subscribers are notified */
  async emit(event: AgentEvent): Promise<void> {
    // Store in history
    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    // Notify handlers
    const handlers = this.handlers.get(event.type) ?? [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (err) {
        console.warn(`[event-bus] Handler error for ${event.type}:`, err);
      }
    }
  }

  /** Get recent events, optionally filtered by type */
  getHistory(filter?: { type?: EventType; since?: string; limit?: number }): AgentEvent[] {
    let events = this.history;

    if (filter?.type) {
      events = events.filter(e => e.type === filter.type);
    }
    if (filter?.since) {
      const sinceTs = new Date(filter.since).getTime();
      events = events.filter(e => new Date(e.timestamp).getTime() >= sinceTs);
    }

    const limit = filter?.limit ?? 100;
    return events.slice(-limit);
  }

  /** Count events by type */
  getCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const event of this.history) {
      counts[event.type] = (counts[event.type] ?? 0) + 1;
    }
    return counts;
  }

  /** Clear all handlers and history (for testing) */
  reset(): void {
    this.handlers.clear();
    this.history = [];
  }
}

// Singleton — shared across the pipeline run
export const eventBus = new EventBus();

// ─── Helper to create events ────────────────────────────────────────────────────

let eventCounter = 0;

export function createEvent(
  type: AgentEvent['type'],
  sourceLayer: AgentEvent['source_layer'],
  sourceAgent: string,
  data: Record<string, unknown> = {},
): AgentEvent {
  eventCounter++;
  return {
    id: `evt-${Date.now()}-${eventCounter}`,
    type,
    source_layer: sourceLayer,
    source_agent: sourceAgent,
    timestamp: new Date().toISOString(),
    data,
  };
}
