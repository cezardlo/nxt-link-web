'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';
type RealtimeChannel = ReturnType<ReturnType<typeof createClient>['channel']>;

/**
 * useRealtime — Generic Supabase Realtime subscription hook.
 *
 * Subscribes to postgres_changes on a given table and fires a callback
 * for matching events. Cleans up the channel on unmount.
 *
 * Usage:
 *   useRealtime<MyRow>('my_table', 'INSERT', (payload) => {
 *     console.log('New row:', payload);
 *   });
 */
export function useRealtime<T extends Record<string, unknown>>(
  table: string,
  event: RealtimeEvent,
  callback: (payload: T) => void,
  options?: {
    schema?: string;
    filter?: string;
    enabled?: boolean;
  },
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const enabled = options?.enabled ?? true;
  const schema = options?.schema ?? 'public';
  const filter = options?.filter;

  useEffect(() => {
    if (!enabled) return;

    let channel: RealtimeChannel | null = null;

    try {
      const supabase = createClient();

      const channelName = `realtime_${table}_${event}_${Date.now()}`;
      const subscriptionConfig: Record<string, string> = {
        event,
        schema,
        table,
      };
      if (filter) {
        subscriptionConfig.filter = filter;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel = (supabase.channel(channelName) as any)
        .on(
          'postgres_changes',
          subscriptionConfig,
          (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
            const row = (event === 'DELETE' ? payload.old : payload.new) as T;
            callbackRef.current(row);
          },
        )
        .subscribe();
    } catch (err) {
      console.warn(`[useRealtime] Failed to subscribe to ${table}:`, err);
    }

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [table, event, schema, filter, enabled]);
}
