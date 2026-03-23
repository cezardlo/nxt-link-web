'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { KgSignalRow, KgSignalPriority, KgSignalType } from '@/db/queries/kg-signals';
import type { IntelSignalRow } from '@/db/queries/intel-signals';
import { playAlertSound } from '@/lib/alert-sound';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Unified signal type that covers both kg_signals and intel_signals tables */
export type RealtimeSignal = (KgSignalRow | IntelSignalRow) & {
  _source_table: 'kg_signals' | 'intel_signals';
};

export type SignalFilterParams = {
  /** Filter kg_signals by priority (P0-P3) */
  priority?: KgSignalPriority;
  /** Filter kg_signals by signal_type */
  signalType?: KgSignalType | string;
  /** Filter intel_signals by minimum importance_score */
  minImportance?: number;
  /** Filter by industry (intel_signals only) */
  industry?: string;
  /** Which tables to subscribe to */
  tables?: Array<'kg_signals' | 'intel_signals'>;
};

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'polling-fallback';

const PAGE_SIZE = 50;
const POLLING_INTERVAL = 30_000;

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * useRealtimeSignals — Supabase Realtime signal subscription with cursor pagination.
 *
 * Replaces the 30-second polling pattern. Does an initial fetch, then listens
 * for INSERT events via Supabase Realtime on both `kg_signals` and `intel_signals`.
 *
 * Falls back to polling if the Realtime subscription fails.
 *
 * Usage:
 *   const { signals, isLoading, loadMore, isRealtime } = useRealtimeSignals({
 *     priority: 'P0',
 *     tables: ['kg_signals'],
 *   });
 */
export function useRealtimeSignals(filters?: SignalFilterParams) {
  const [kgSignals, setKgSignals] = useState<KgSignalRow[]>([]);
  const [intelSignals, setIntelSignals] = useState<IntelSignalRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [hasMore, setHasMore] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelsRef = useRef<any[]>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const tables = filters?.tables ?? ['kg_signals', 'intel_signals'];
  const priority = filters?.priority;
  const signalType = filters?.signalType;
  const minImportance = filters?.minImportance;
  const industry = filters?.industry;

  // ─── Fetch helpers ───────────────────────────────────────────────────────

  const fetchKgSignals = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (priority) params.set('priority', priority);
      if (signalType) params.set('signal_type', signalType);
      if (cursor) params.set('before', cursor);

      const res = await fetch(`/api/kg-signals?${params.toString()}`);
      if (!res.ok) throw new Error(`kg-signals fetch failed: ${res.status}`);
      const json: { ok: boolean; signals: KgSignalRow[] } = await res.json();
      return json.signals ?? [];
    },
    [priority, signalType],
  );

  const fetchIntelSignals = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (industry) params.set('industry', industry);
      if (minImportance) params.set('min_score', String(minImportance));
      if (cursor) params.set('before', cursor);

      const res = await fetch(`/api/intel-signals?${params.toString()}`);
      if (!res.ok) throw new Error(`intel-signals fetch failed: ${res.status}`);
      const json: { ok: boolean; signals: IntelSignalRow[] } = await res.json();
      return json.signals ?? [];
    },
    [industry, minImportance],
  );

  // ─── Initial fetch ───────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      setIsLoading(true);
      try {
        const promises: Promise<void>[] = [];

        if (tables.includes('kg_signals')) {
          promises.push(
            fetchKgSignals().then((rows) => {
              if (!cancelled) {
                setKgSignals(rows);
                if (rows.length < PAGE_SIZE) setHasMore(false);
              }
            }),
          );
        }

        if (tables.includes('intel_signals')) {
          promises.push(
            fetchIntelSignals().then((rows) => {
              if (!cancelled) setIntelSignals(rows);
            }),
          );
        }

        await Promise.allSettled(promises);
      } catch (err) {
        console.warn('[useRealtimeSignals] initial fetch error:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadInitial();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priority, signalType, industry, minImportance, tables.join(',')]);

  // ─── Realtime subscription (with polling fallback) ───────────────────────

  useEffect(() => {
    mountedRef.current = true;

    if (!isSupabaseConfigured()) {
      startPolling();
      setConnectionStatus('polling-fallback');
      return cleanup;
    }

    let subscriptionFailed = false;

    try {
      const supabase = createClient();

      // Subscribe to kg_signals
      if (tables.includes('kg_signals')) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const kgChannel = (supabase.channel(`kg_signals_rt_${Date.now()}`) as any)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'kg_signals' },
            (payload: { new: Record<string, unknown> }) => {
              if (!mountedRef.current) return;
              const row = payload.new as KgSignalRow;

              // Apply client-side filter
              if (priority && row.priority !== priority) return;
              if (signalType && row.signal_type !== signalType) return;

              // Play alert sound for high-priority signals
              if (row.priority === 'P0' || row.priority === 'P1') {
                playAlertSound(row.priority);
              }

              setKgSignals((prev) => [row, ...prev].slice(0, PAGE_SIZE * 5));
            },
          )
          .subscribe((status: string) => {
            if (!mountedRef.current) return;
            if (status === 'SUBSCRIBED') {
              setConnectionStatus('connected');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              subscriptionFailed = true;
              fallbackToPolling();
            } else if (status === 'CLOSED') {
              setConnectionStatus('disconnected');
            }
          });

        channelsRef.current.push(kgChannel);
      }

      // Subscribe to intel_signals
      if (tables.includes('intel_signals')) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const intelChannel = (supabase.channel(`intel_signals_rt_${Date.now()}`) as any)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'intel_signals' },
            (payload: { new: Record<string, unknown> }) => {
              if (!mountedRef.current) return;
              const row = payload.new as IntelSignalRow;

              // Apply client-side filter
              if (industry && row.industry !== industry) return;
              if (minImportance && row.importance_score < minImportance) return;

              setIntelSignals((prev) => [row, ...prev].slice(0, PAGE_SIZE * 5));
            },
          )
          .subscribe((status: string) => {
            if (!mountedRef.current) return;
            if (status === 'SUBSCRIBED' && !subscriptionFailed) {
              setConnectionStatus('connected');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              subscriptionFailed = true;
              fallbackToPolling();
            }
          });

        channelsRef.current.push(intelChannel);
      }
    } catch (err) {
      console.warn('[useRealtimeSignals] Realtime setup failed, falling back to polling:', err);
      fallbackToPolling();
    }

    return cleanup;

    // -- helpers --

    function fallbackToPolling() {
      if (!mountedRef.current) return;
      // Tear down any existing channels
      for (const ch of channelsRef.current) {
        try {
          ch.unsubscribe();
        } catch { /* ignore */ }
      }
      channelsRef.current = [];
      setConnectionStatus('polling-fallback');
      startPolling();
    }

    function startPolling() {
      if (pollingRef.current) return; // already polling
      pollingRef.current = setInterval(async () => {
        if (!mountedRef.current) return;
        try {
          if (tables.includes('kg_signals')) {
            const rows = await fetchKgSignals();
            if (mountedRef.current) setKgSignals(rows);
          }
          if (tables.includes('intel_signals')) {
            const rows = await fetchIntelSignals();
            if (mountedRef.current) setIntelSignals(rows);
          }
        } catch {
          // Polling errors are non-fatal
        }
      }, POLLING_INTERVAL);
    }

    function cleanup() {
      mountedRef.current = false;

      // Unsubscribe all channels
      for (const ch of channelsRef.current) {
        try {
          ch.unsubscribe();
        } catch { /* ignore */ }
      }
      channelsRef.current = [];

      // Clear polling timer
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priority, signalType, industry, minImportance, tables.join(',')]);

  // ─── Load more (cursor pagination) ──────────────────────────────────────

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;

    try {
      if (tables.includes('kg_signals') && kgSignals.length > 0) {
        const lastDetectedAt = kgSignals[kgSignals.length - 1].detected_at;
        const more = await fetchKgSignals(lastDetectedAt);
        if (more.length < PAGE_SIZE) setHasMore(false);
        setKgSignals((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const fresh = more.filter((s) => !existingIds.has(s.id));
          return [...prev, ...fresh];
        });
      }
    } catch (err) {
      console.warn('[useRealtimeSignals] loadMore error:', err);
    }
  }, [hasMore, isLoading, kgSignals, tables, fetchKgSignals]);

  // ─── Merged + sorted output ────────────────────────────────────────────

  const signals: RealtimeSignal[] = [
    ...kgSignals.map((s) => ({ ...s, _source_table: 'kg_signals' as const })),
    ...intelSignals.map((s) => ({ ...s, _source_table: 'intel_signals' as const })),
  ].sort((a, b) => {
    const dateA = 'detected_at' in a ? a.detected_at : ('discovered_at' in a ? (a as IntelSignalRow).discovered_at : '');
    const dateB = 'detected_at' in b ? b.detected_at : ('discovered_at' in b ? (b as IntelSignalRow).discovered_at : '');
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return {
    signals,
    kgSignals,
    intelSignals,
    isLoading,
    connectionStatus,
    isRealtime: connectionStatus === 'connected',
    loadMore,
    hasMore,
  };
}
