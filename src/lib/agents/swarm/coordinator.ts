// Swarm coordinator — NXT//LINK platform
// Rule-based routing engine. Receives swarm events, matches routing rules,
// and dispatches to the correct downstream agents. Replaces the hardcoded
// orchestrator pipeline with a data-driven, extensible approach.

import type { AgentRunResult } from '@/lib/agents/base';
import { FeedAgent } from '@/lib/agents/feed-agent-class';
import { EntityAgent } from '@/lib/agents/entity-agent';
import { IKERAgent } from '@/lib/agents/iker-agent';
import { TrendAgent } from '@/lib/agents/trend-agent';
import { NarrativeAgent } from '@/lib/agents/narrative-agent';
import { AlertAgent } from '@/lib/agents/alert-agent';
import { swarmSubscribe, swarmBroadcast, type SwarmEvent, type SwarmEventRecord, type SwarmEventType } from './bus';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type SwarmRule = {
  id: string;
  trigger_event: SwarmEventType;
  /** Only activate if the event has at least one of these tags (empty = any tag) */
  trigger_tags: string[];
  /** Agent names that should be dispatched when this rule matches */
  target_agents: string[];
  /** Optional human-readable description of the condition */
  condition?: string;
  priority: number;
};

type CoordinatorStatus = {
  active_rules: number;
  events_processed: number;
  last_dispatch: string | null;
};

type AgentDispatchMap = Record<string, () => Promise<AgentRunResult>>;

// Default routing rules — ordered by priority (ascending = lower number runs first)
export const SWARM_RULES: SwarmRule[] = [
  {
    id: 'feed-to-entity-iker',
    trigger_event: 'finding_new',
    trigger_tags: [],
    target_agents: ['EntityAgent', 'IKERAgent'],
    condition: 'New finding from FeedAgent triggers entity resolution and IKER scoring',
    priority: 10,
  },
  {
    id: 'entity-to-trend',
    trigger_event: 'entity_discovered',
    trigger_tags: [],
    target_agents: ['TrendAgent'],
    condition: 'Newly discovered entity feeds into trend analysis',
    priority: 20,
  },
  {
    id: 'risk-to-alert-narrative',
    trigger_event: 'risk_detected',
    trigger_tags: [],
    target_agents: ['AlertAgent', 'NarrativeAgent'],
    condition: 'Detected risk fans out to alert + narrative agents',
    priority: 10,
  },
  {
    id: 'contract-to-iker',
    trigger_event: 'contract_alert',
    trigger_tags: [],
    target_agents: ['IKERAgent'],
    condition: 'Contract alert refreshes IKER scoring for affected vendor',
    priority: 15,
  },
  {
    id: 'trend-to-narrative-alert',
    trigger_event: 'trend_shift',
    trigger_tags: [],
    target_agents: ['NarrativeAgent', 'AlertAgent'],
    condition: 'Detected trend shift generates narrative briefing and optional alert',
    priority: 20,
  },
];

export class SwarmCoordinator {
  private feed = new FeedAgent();
  private entity = new EntityAgent();
  private iker = new IKERAgent();
  private trend = new TrendAgent();
  private narrative = new NarrativeAgent();
  private alert = new AlertAgent();

  private eventsProcessed = 0;
  private lastDispatch: string | null = null;
  private channels: Array<RealtimeChannel | null> = [];

  // Map agent name strings to factory functions that produce run promises.
  // Using factories so we can pass different payloads per dispatch.
  private buildDispatchMap(payload: Record<string, unknown>): AgentDispatchMap {
    return {
      FeedAgent: () => this.feed.run(payload),
      EntityAgent: () => this.entity.run(payload),
      IKERAgent: () => this.iker.run(payload),
      TrendAgent: () => this.trend.run(payload),
      NarrativeAgent: () => this.narrative.run(payload),
      AlertAgent: () => this.alert.run(payload),
    };
  }

  // Match rules against an incoming event and return all matching rules
  // sorted by ascending priority (lowest number = highest priority).
  private matchRules(event: SwarmEventRecord): SwarmRule[] {
    return SWARM_RULES
      .filter((rule) => {
        if (rule.trigger_event !== event.event_type) return false;
        // If rule has tag filters, the event must contain at least one
        if (rule.trigger_tags.length > 0) {
          const hasTag = rule.trigger_tags.some((t) => event.tags.includes(t));
          if (!hasTag) return false;
        }
        return true;
      })
      .sort((a, b) => a.priority - b.priority);
  }

  // Process a single swarm event through all matching rules.
  async process(event: SwarmEventRecord): Promise<void> {
    const matchedRules = this.matchRules(event);

    if (matchedRules.length === 0) {
      console.log(`[SwarmCoordinator] No rules matched for event: ${event.event_type}`);
      return;
    }

    // Collect unique target agents across all matched rules
    const targetSet = new Set<string>();
    for (const rule of matchedRules) {
      for (const agent of rule.target_agents) {
        targetSet.add(agent);
      }
    }

    const targets = Array.from(targetSet as Iterable<string>);
    console.log(
      `[SwarmCoordinator] Event "${event.event_type}" matched ${matchedRules.length} rule(s) → dispatching to: ${targets.join(', ')}`,
    );

    const dispatchPayload: Record<string, unknown> = {
      ...event.payload,
      swarm_source_agent: event.source_agent,
      swarm_event_type: event.event_type,
      swarm_tags: event.tags,
    };
    const dispatchMap = this.buildDispatchMap(dispatchPayload);

    await Promise.all(
      targets.map(async (agentName) => {
        const runner = dispatchMap[agentName];
        if (!runner) {
          console.warn(`[SwarmCoordinator] Unknown agent in rule: "${agentName}"`);
          return;
        }
        try {
          await runner();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[SwarmCoordinator] Agent "${agentName}" failed:`, msg);
        }
      }),
    );

    this.eventsProcessed += 1;
    this.lastDispatch = new Date().toISOString();
  }

  // Subscribe to every known swarm event type and route dynamically.
  startSwarm(): void {
    const eventTypes: SwarmEventType[] = [
      'finding_new',
      'entity_discovered',
      'risk_detected',
      'trend_shift',
      'contract_alert',
      'swarm_heartbeat',
    ];

    for (const eventType of eventTypes) {
      const channel = swarmSubscribe(eventType, async (event) => {
        await this.process(event);
      });
      this.channels.push(channel);
    }

    console.log('[SwarmCoordinator] Listening on', eventTypes.length, 'event types.');
  }

  // Explicit linear pipeline — mirrors the existing orchestrator.execute() flow
  // but broadcasts swarm events between stages so other listeners can react.
  async runPlatformPipeline(trigger = 'manual'): Promise<AgentRunResult> {
    console.log(`[SwarmCoordinator] Running platform pipeline (trigger: ${trigger})`);

    // Stage 1: Feed
    const feedResult = await this.feed.run({ trigger });

    await swarmBroadcast({
      event_type: 'finding_new',
      source_agent: 'FeedAgent',
      payload: {
        trigger,
        itemsOut: feedResult.itemsOut,
        metadata: feedResult.metadata,
      },
      tags: ['feed', 'pipeline'],
      priority: 10,
    } satisfies SwarmEvent);

    // Stage 2: Entity + IKER (parallel, only if feed returned items)
    if (feedResult.itemsOut > 0) {
      await Promise.all([
        this.entity.run({ signalCount: feedResult.itemsOut }),
        this.iker.run({ signalCount: feedResult.itemsOut }),
      ]);

      await swarmBroadcast({
        event_type: 'entity_discovered',
        source_agent: 'EntityAgent',
        payload: { signalCount: feedResult.itemsOut },
        tags: ['entity', 'pipeline'],
        priority: 20,
      } satisfies SwarmEvent);
    }

    // Stage 3: Trend
    await this.trend.run({});

    await swarmBroadcast({
      event_type: 'trend_shift',
      source_agent: 'TrendAgent',
      payload: { stage: 'post-trend' },
      tags: ['trend', 'pipeline'],
      priority: 20,
    } satisfies SwarmEvent);

    // Stage 4: Narrative + Alerts (parallel)
    await Promise.all([
      this.narrative.run({}),
      this.alert.run({ signalCount: feedResult.itemsOut }),
    ]);

    this.eventsProcessed += 1;
    this.lastDispatch = new Date().toISOString();

    return {
      itemsIn: feedResult.itemsIn,
      itemsOut: feedResult.itemsOut,
      metadata: {
        trigger,
        timestamp: this.lastDispatch,
        pipeline: 'feed->entity+iker->trend->narrative+alert',
      },
    };
  }

  getStatus(): CoordinatorStatus {
    return {
      active_rules: SWARM_RULES.length,
      events_processed: this.eventsProcessed,
      last_dispatch: this.lastDispatch,
    };
  }
}

// Singleton instance — import this from API routes and cron handlers.
export const swarmCoordinator = new SwarmCoordinator();
