'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Signal } from './useSignals';

/**
 * useRealtimeSignals — Subscribe to Supabase Realtime for live signal inserts.
 *
 * Uses postgres_changes to listen for INSERTs on intel_signals table.
 * Falls back gracefully if Supabase is not configured.
 *
 * Usage:
 *   const { newSignals, clearNew } = useRealtimeSignals();
 *   // newSignals contains signals inserted AFTER page load
 */
export function useRealtimeSignals() {
  const [newSignals, setNewSignals] = useState<Signal[]>([]);
  const [connected, setConnected] = useState(false);

  const clearNew = useCallback(() => setNewSignals([]), []);

  useEffect(() => {
    // Dynamic import to avoid SSR issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;
    let cleanup = false;

    async function subscribe() {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) return;

        const supabase = createClient(url, key);

        const ch = supabase
          .channel('intel-signals-realtime')
          .on(
            'postgres_changes' as 'system',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'intel_signals',
            } as Record<string, string>,
            (payload: { new: Record<string, unknown> }) => {
              if (cleanup) return;
              const row = payload.new;
              const signal: Signal = {
                id: String(row.id ?? ''),
                title: String(row.title ?? ''),
                signal_type: String(row.signal_type ?? 'news'),
                industry: String(row.industry ?? 'General'),
                company: row.company ? String(row.company) : null,
                importance: Number(row.importance_score ?? 0.5),
                discovered_at: String(row.discovered_at ?? new Date().toISOString()),
                url: row.url ? String(row.url) : null,
              };
              setNewSignals(prev => [signal, ...prev].slice(0, 20));
            },
          )
          .subscribe((status: string) => {
            if (!cleanup) setConnected(status === 'SUBSCRIBED');
          });

        channel = ch;
      } catch {
        // Supabase not available — fail silently
      }
    }

    subscribe();

    return () => {
      cleanup = true;
      // Channel cleanup handled by Supabase client
    };
  }, []);

  return { newSignals, connected, clearNew, count: newSignals.length };
}
