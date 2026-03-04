// Swarm event bus — NXT//LINK platform
// Wraps the agent_events Supabase table with typed swarm event semantics.
// Supports broadcast (all agents) and directed send (single target agent).

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type SwarmEventType =
  | 'finding_new'
  | 'entity_discovered'
  | 'risk_detected'
  | 'trend_shift'
  | 'contract_alert'
  | 'swarm_heartbeat';

export type SwarmEvent = {
  event_type: SwarmEventType;
  source_agent: string;
  payload: Record<string, unknown>;
  tags: string[];
  priority: number;
};

export type SwarmEventRecord = SwarmEvent & {
  id: string;
  target_agent: string | null;
  processed: boolean;
  created_at: string;
};

// In-memory fallback: simple event emitter map
type SwarmEventHandler = (event: SwarmEventRecord) => Promise<void>;
const inMemoryHandlers = new Map<SwarmEventType, SwarmEventHandler[]>();
const inMemoryLog: SwarmEventRecord[] = [];
let inMemoryCounter = 0;

function emitInMemory(record: SwarmEventRecord): void {
  const handlers = inMemoryHandlers.get(record.event_type) ?? [];
  for (const handler of handlers) {
    handler(record).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[SwarmBus] In-memory handler error:', msg);
    });
  }
}

export async function swarmBroadcast(event: SwarmEvent): Promise<void> {
  if (!isSupabaseConfigured()) {
    const record: SwarmEventRecord = {
      ...event,
      id: `local-${++inMemoryCounter}`,
      target_agent: null,
      processed: false,
      created_at: new Date().toISOString(),
    };
    inMemoryLog.push(record);
    emitInMemory(record);
    return;
  }

  const supabase = createClient({ admin: true });
  const { error } = await supabase.from('agent_events').insert({
    event_type: event.event_type,
    source_agent: event.source_agent,
    target_agent: null,
    payload: {
      ...event.payload,
      tags: event.tags,
      priority: event.priority,
    },
    processed: false,
  });

  if (error) {
    console.warn('[SwarmBus] Broadcast failed:', error.message);
  }
}

export async function swarmSend(event: SwarmEvent, targetAgent: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const record: SwarmEventRecord = {
      ...event,
      id: `local-${++inMemoryCounter}`,
      target_agent: targetAgent,
      processed: false,
      created_at: new Date().toISOString(),
    };
    inMemoryLog.push(record);
    emitInMemory(record);
    return;
  }

  const supabase = createClient({ admin: true });
  const { error } = await supabase.from('agent_events').insert({
    event_type: event.event_type,
    source_agent: event.source_agent,
    target_agent: targetAgent,
    payload: {
      ...event.payload,
      tags: event.tags,
      priority: event.priority,
    },
    processed: false,
  });

  if (error) {
    console.warn('[SwarmBus] Send to', targetAgent, 'failed:', error.message);
  }
}

export function swarmSubscribe(
  eventType: SwarmEventType,
  handler: SwarmEventHandler,
): RealtimeChannel | null {
  if (!isSupabaseConfigured()) {
    const existing = inMemoryHandlers.get(eventType) ?? [];
    inMemoryHandlers.set(eventType, [...existing, handler]);
    return null;
  }

  const supabase = createClient({ admin: true });
  return supabase
    .channel(`swarm_bus_${eventType}_${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'agent_events',
        filter: `event_type=eq.${eventType}`,
      },
      async (change) => {
        const raw = change.new as {
          id: string;
          event_type: string;
          source_agent: string;
          target_agent: string | null;
          payload: Record<string, unknown>;
          processed: boolean;
          created_at: string;
        };

        if (raw.processed) return;

        const rawPayload = raw.payload ?? {};
        const tags = Array.isArray(rawPayload.tags)
          ? (rawPayload.tags as string[])
          : [];
        const priority =
          typeof rawPayload.priority === 'number' ? rawPayload.priority : 5;

        const record: SwarmEventRecord = {
          id: raw.id,
          event_type: raw.event_type as SwarmEventType,
          source_agent: raw.source_agent,
          target_agent: raw.target_agent,
          payload: rawPayload,
          tags,
          priority,
          processed: raw.processed,
          created_at: raw.created_at,
        };

        await handler(record);

        await supabase
          .from('agent_events')
          .update({ processed: true })
          .eq('id', raw.id);
      },
    )
    .subscribe();
}

export async function swarmRecentEvents(limit = 50): Promise<SwarmEventRecord[]> {
  if (!isSupabaseConfigured()) {
    return [...inMemoryLog]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  const supabase = createClient({ admin: true });
  const swarmTypes: SwarmEventType[] = [
    'finding_new',
    'entity_discovered',
    'risk_detected',
    'trend_shift',
    'contract_alert',
    'swarm_heartbeat',
  ];

  const { data, error } = await supabase
    .from('agent_events')
    .select('*')
    .in('event_type', swarmTypes)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[SwarmBus] RecentEvents failed:', error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const rawPayload = (row.payload ?? {}) as Record<string, unknown>;
    const tags = Array.isArray(rawPayload.tags) ? (rawPayload.tags as string[]) : [];
    const priority = typeof rawPayload.priority === 'number' ? rawPayload.priority : 5;
    return {
      id: row.id as string,
      event_type: row.event_type as SwarmEventType,
      source_agent: row.source_agent as string,
      target_agent: (row.target_agent as string | null) ?? null,
      payload: rawPayload,
      tags,
      priority,
      processed: Boolean(row.processed),
      created_at: row.created_at as string,
    };
  });
}
