'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type SSESignal = {
  id: string;
  title: string;
  signal_type: string;
  industry: string;
  company: string | null;
  importance: number;
  discovered_at: string;
  url: string | null;
};

export type UseSSESignalsOptions = {
  /** Filter by severity tiers: P0 (critical), P1 (high), P2 (medium), P3 (low) */
  severity?: string[];
  /** Maximum number of signals to keep in memory (default: 100) */
  maxSignals?: number;
  /** Whether the hook should connect (default: true) */
  enabled?: boolean;
};

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

// ─── Constants ──────────────────────────────────────────────────────────────────

const MAX_SIGNALS_DEFAULT = 100;
const INITIAL_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 60_000;
const RECONNECT_MULTIPLIER = 2;

// ─── Hook ───────────────────────────────────────────────────────────────────────

/**
 * useSSESignals — Connect to /api/signals/stream via Server-Sent Events.
 *
 * Parses incoming signal events, maintains a rolling list of recent signals,
 * tracks connection status, and reconnects on error with exponential backoff.
 *
 * Usage:
 *   const { signals, latestSignal, isConnected } = useSSESignals({
 *     severity: ['P0', 'P1'],
 *   });
 */
export function useSSESignals(options?: UseSSESignalsOptions) {
  const severity = options?.severity;
  const maxSignals = options?.maxSignals ?? MAX_SIGNALS_DEFAULT;
  const enabled = options?.enabled ?? true;

  const [signals, setSignals] = useState<SSESignal[]>([]);
  const [latestSignal, setLatestSignal] = useState<SSESignal | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_MS);
  const mountedRef = useRef(true);

  // Stable reference for severity to avoid re-renders
  const severityKey = severity?.sort().join(',') ?? '';

  // ─── Build URL ──────────────────────────────────────────────────────────

  const buildUrl = useCallback(() => {
    const base = '/api/signals/stream';
    if (!severity || severity.length === 0) return base;
    const params = new URLSearchParams({ severity: severity.join(',') });
    return `${base}?${params.toString()}`;
  }, [severityKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Merge helper ───────────────────────────────────────────────────────

  const addSignals = useCallback(
    (incoming: SSESignal[]) => {
      setSignals((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const fresh = incoming.filter((s) => !existingIds.has(s.id));
        if (fresh.length === 0) return prev;

        // Update latest signal
        const newest = fresh[0];
        if (newest) setLatestSignal(newest);

        return [...fresh, ...prev].slice(0, maxSignals);
      });
    },
    [maxSignals],
  );

  // ─── Connect ────────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!mountedRef.current) return;

    // Clean up any existing connection
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    setConnectionState('connecting');
    setError(null);

    try {
      const url = buildUrl();
      const es = new EventSource(url);
      esRef.current = es;

      // ── Connected event ─────────────────────────────────────────────
      es.addEventListener('connected', () => {
        if (!mountedRef.current) return;
        setConnectionState('connected');
        reconnectDelayRef.current = INITIAL_RECONNECT_MS; // Reset backoff
      });

      // ── Subscribed event (realtime channel active) ──────────────────
      es.addEventListener('subscribed', () => {
        if (!mountedRef.current) return;
        setConnectionState('connected');
      });

      // ── Batch event (initial signals on connect) ────────────────────
      es.addEventListener('batch', (e) => {
        if (!mountedRef.current) return;
        try {
          const batch: SSESignal[] = JSON.parse(e.data);
          addSignals(batch);
        } catch {
          // Ignore parse errors
        }
      });

      // ── Default message event (individual signal from realtime) ─────
      es.onmessage = (e) => {
        if (!mountedRef.current) return;
        try {
          const signal: SSESignal = JSON.parse(e.data);
          if (signal && signal.id) {
            addSignals([signal]);
          }
        } catch {
          // Ignore parse errors
        }
      };

      // ── Error event from server ─────────────────────────────────────
      es.addEventListener('error', (e) => {
        if (!mountedRef.current) return;

        // Try to parse server error data
        if (e instanceof MessageEvent && e.data) {
          try {
            const errData = JSON.parse(e.data);
            setError(errData.message ?? 'Stream error');
          } catch {
            // Not a server error event, just connection issue
          }
        }
      });

      // ── Connection error / disconnect ───────────────────────────────
      es.onerror = () => {
        if (!mountedRef.current) return;

        setConnectionState('error');
        es.close();
        esRef.current = null;

        // Exponential backoff reconnect
        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(
          delay * RECONNECT_MULTIPLIER,
          MAX_RECONNECT_MS,
        );

        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            connect();
          }
        }, delay);
      };
    } catch {
      setConnectionState('error');

      // Schedule reconnect
      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(
        delay * RECONNECT_MULTIPLIER,
        MAX_RECONNECT_MS,
      );

      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, delay);
    }
  }, [buildUrl, addSignals]);

  // ─── Lifecycle ──────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      connect();
    }

    return () => {
      mountedRef.current = false;

      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [connect, enabled]);

  // ─── Manual reconnect ───────────────────────────────────────────────────

  const reconnect = useCallback(() => {
    reconnectDelayRef.current = INITIAL_RECONNECT_MS;
    connect();
  }, [connect]);

  // ─── Clear signals ─────────────────────────────────────────────────────

  const clearSignals = useCallback(() => {
    setSignals([]);
    setLatestSignal(null);
  }, []);

  return {
    /** All received signals, most recent first (max `maxSignals`) */
    signals,
    /** The most recently received individual signal */
    latestSignal,
    /** Whether the EventSource is currently connected */
    isConnected: connectionState === 'connected',
    /** Detailed connection state: connecting | connected | disconnected | error */
    connectionState,
    /** Last error message, if any */
    error,
    /** Manually trigger a reconnect (resets backoff) */
    reconnect,
    /** Clear accumulated signals from memory */
    clearSignals,
    /** Number of signals currently in the buffer */
    count: signals.length,
  };
}
