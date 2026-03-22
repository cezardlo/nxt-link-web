'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type StreamSignal = {
  id: string;
  title: string;
  signal_type: string;
  industry: string;
  company: string | null;
  importance: number;
  discovered_at: string;
  url: string | null;
};

/**
 * useSignalStream — Subscribe to real-time signal updates via SSE.
 *
 * Returns the latest signals (most recent first) and a connected flag.
 * Auto-reconnects on disconnect. Merges new signals with existing.
 * Max 50 signals kept in memory.
 */
export function useSignalStream(maxSignals = 50) {
  const [signals, setSignals] = useState<StreamSignal[]>([]);
  const [connected, setConnected] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const es = new EventSource('/api/signals/stream');
      esRef.current = es;

      es.addEventListener('connected', () => {
        setConnected(true);
      });

      es.addEventListener('batch', (e) => {
        try {
          const batch: StreamSignal[] = JSON.parse(e.data);
          setSignals(batch.slice(0, maxSignals));
        } catch { /* ignore parse errors */ }
      });

      es.addEventListener('signals', (e) => {
        try {
          const incoming: StreamSignal[] = JSON.parse(e.data);
          setNewCount(prev => prev + incoming.length);
          setSignals(prev => {
            const ids = new Set(prev.map(s => s.id));
            const fresh = incoming.filter(s => !ids.has(s.id));
            return [...fresh, ...prev].slice(0, maxSignals);
          });
        } catch { /* ignore */ }
      });

      es.addEventListener('heartbeat', () => {
        setConnected(true);
      });

      es.addEventListener('error', () => {
        setConnected(false);
        es.close();
        // Reconnect after 5 seconds
        reconnectTimer.current = setTimeout(connect, 5000);
      });

      es.onerror = () => {
        setConnected(false);
        es.close();
        reconnectTimer.current = setTimeout(connect, 5000);
      };
    } catch {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 5000);
    }
  }, [maxSignals]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  const clearNewCount = useCallback(() => setNewCount(0), []);

  return { signals, connected, newCount, clearNewCount };
}
