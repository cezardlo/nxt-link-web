import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { swarmMemoryWrite } from '@/lib/agents/swarm/memory';
import { swarmBroadcast } from '@/lib/agents/swarm/bus';

export type AgentStatus = 'idle' | 'running' | 'done' | 'failed';

export interface AgentRunResult {
  itemsIn: number;
  itemsOut: number;
  metadata: Record<string, unknown>;
}

export abstract class BaseAgent {
  abstract name: string;
  abstract description: string;

  // Lazy — only initialized on first access to avoid throwing at module-import time
  private _supabase: SupabaseClient | null = null;
  protected get supabase(): SupabaseClient {
    if (!this._supabase) this._supabase = createClient({ admin: true });
    return this._supabase;
  }

  abstract execute(payload: Record<string, unknown>): Promise<AgentRunResult>;

  async run(payload: Record<string, unknown> = {}): Promise<AgentRunResult> {
    const runId = await this.startRun();
    console.log(`[${this.name}] Starting...`);

    try {
      const result = await this.execute(payload);
      await this.finishRun(runId, 'done', result);
      console.log(`[${this.name}] Done:`, result);

      await this.emit('agent_complete', {
        agent: this.name,
        result,
        payload,
      });

      // ── Swarm integration: write to shared memory + broadcast ──
      try {
        await swarmMemoryWrite({
          agent_name: this.name,
          entry_type: 'finding',
          topic: this.name,
          content: result.metadata,
          confidence: 0.7,
          tags: [this.name, 'auto'],
        });
        await swarmBroadcast({
          event_type: 'finding_new',
          source_agent: this.name,
          payload: { agent: this.name, itemsOut: result.itemsOut, ...result.metadata },
          tags: [this.name],
          priority: 5,
        });
      } catch {
        // Swarm integration is best-effort — never block agent execution
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown agent error';
      await this.failRun(runId, message);
      console.error(`[${this.name}] Failed:`, error);
      throw error;
    }
  }

  async emit(eventType: string, payload: Record<string, unknown> = {}, targetAgent?: string) {
    if (!isSupabaseConfigured()) return;
    await this.supabase.from('agent_events').insert({
      event_type: eventType,
      source_agent: this.name,
      target_agent: targetAgent ?? null,
      payload,
      processed: false,
    });
  }

  subscribeToEvents(
    eventType: string,
    handler: (payload: Record<string, unknown>) => Promise<void>,
  ) {
    if (!isSupabaseConfigured()) return;
    return this.supabase
      .channel(`agent_events_${this.name}_${eventType}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_events',
          filter: `event_type=eq.${eventType}`,
        },
        async (change) => {
          const event = change.new as {
            id: string;
            processed?: boolean;
            payload?: Record<string, unknown>;
            target_agent?: string | null;
          };

          if (event.processed) return;
          if (event.target_agent && event.target_agent !== this.name) return;

          await handler(event.payload ?? {});

          await this.supabase
            .from('agent_events')
            .update({ processed: true })
            .eq('id', event.id);
        },
      )
      .subscribe();
  }

  private async startRun(): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;
    const { data } = await this.supabase
      .from('agent_runs')
      .insert({
        agent_name: this.name,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    return data?.id ?? null;
  }

  private async finishRun(id: string | null, status: AgentStatus, result: AgentRunResult) {
    if (!id || !isSupabaseConfigured()) return;

    await this.supabase
      .from('agent_runs')
      .update({
        status,
        finished_at: new Date().toISOString(),
        items_in: result.itemsIn,
        items_out: result.itemsOut,
        metadata: result.metadata,
      })
      .eq('id', id);
  }

  private async failRun(id: string | null, error: string) {
    if (!id || !isSupabaseConfigured()) return;

    await this.supabase
      .from('agent_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error,
      })
      .eq('id', id);
  }
}
