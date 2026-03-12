'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { KgSignalPriority, KgSignalRow } from '@/db/queries/kg-signals';
import { SignalCard } from '@/components/intelligence/SignalCard';

/* ── Constants ───────────────────────────────────────────────────────────── */

const MAX_SIGNALS = 50;
const PRIORITY_ORDER: Record<KgSignalPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const FILTER_TABS: Array<{ id: KgSignalPriority | 'ALL'; label: string }> = [
  { id: 'ALL', label: 'ALL' },
  { id: 'P0', label: 'P0' },
  { id: 'P1', label: 'P1' },
  { id: 'P2', label: 'P2' },
  { id: 'P3', label: 'P3' },
];

/* ── Sort: P0 first, then by detected_at desc ───────────────────────────── */

function sortSignals(list: KgSignalRow[]): KgSignalRow[] {
  return [...list].sort((a, b) => {
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pDiff !== 0) return pDiff;
    return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
  });
}

/* ── Component ───────────────────────────────────────────────────────────── */

export function SignalFeed() {
  const [signals, setSignals] = useState<KgSignalRow[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<KgSignalPriority | 'ALL'>('ALL');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ── Initial fetch ───────────────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;

    async function fetchInitial() {
      try {
        const res = await fetch('/api/kg-signals?limit=50');
        if (!res.ok) return;
        const json: { ok: boolean; signals: KgSignalRow[] } = await res.json();
        if (!cancelled && json.ok) {
          setSignals(sortSignals(json.signals));
        }
      } catch {
        // Silently fail, feed will show empty state
      }
    }

    fetchInitial();
    return () => { cancelled = true; };
  }, []);

  /* ── Supabase Realtime subscription ─────────────────────────────────── */

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;

    function subscribe() {
      try {
        const supabase = createClient();
        channel = supabase
          .channel('kg_signals_realtime')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'kg_signals' },
            (payload) => {
              const newSignal = payload.new as KgSignalRow;
              setSignals((prev) => {
                const updated = [newSignal, ...prev].slice(0, MAX_SIGNALS);
                return sortSignals(updated);
              });

              // Mark as new for flash animation
              setNewIds((prev) => {
                const next = new Set(prev);
                next.add(newSignal.id);
                return next;
              });

              // Clear flash after animation
              setTimeout(() => {
                setNewIds((prev) => {
                  const next = new Set(prev);
                  next.delete(newSignal.id);
                  return next;
                });
              }, 1500);

              // Auto-scroll to top
              if (scrollRef.current) {
                scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
              }
            },
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setConnectionStatus('connected');
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              setConnectionStatus('disconnected');
            } else {
              setConnectionStatus('connecting');
            }
          });
      } catch {
        setConnectionStatus('disconnected');
      }
    }

    subscribe();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, []);

  /* ── Filter logic ────────────────────────────────────────────────────── */

  const filteredSignals = filter === 'ALL'
    ? signals
    : signals.filter((s) => s.priority === filter);

  const handleFilter = useCallback((tab: KgSignalPriority | 'ALL') => {
    setFilter(tab);
  }, []);

  /* ── Connection status color ──────────────────────────────────────────── */

  const statusColor = connectionStatus === 'connected'
    ? '#00ff88'
    : connectionStatus === 'connecting'
      ? '#ffd700'
      : '#ff3b30';

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <div className="bg-black/92 border border-white/8 backdrop-blur-md rounded-sm overflow-hidden flex flex-col max-h-[600px]">

      {/* Header */}
      <div className="px-3 py-2.5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Pulsing status dot */}
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                backgroundColor: statusColor,
                boxShadow: `0 0 6px ${statusColor}cc`,
                animation: connectionStatus === 'connected' ? 'pulse 2s ease-in-out infinite' : undefined,
              }}
            />
            <span className="font-mono text-[10px] tracking-widest text-[#00d4ff]">
              LIVE INTELLIGENCE FEED
            </span>
          </div>
          <span className="font-mono text-[7px] tabular-nums text-white/20">
            {filteredSignals.length}/{signals.length}
          </span>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-0.5 mt-2">
          {FILTER_TABS.map((tab) => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleFilter(tab.id)}
                className={`
                  font-mono text-[8px] tracking-[0.12em] px-2 py-0.5 rounded-sm transition-colors duration-100
                  ${isActive
                    ? 'bg-white/10 text-[#00d4ff]'
                    : 'text-white/20 hover:text-white/40 hover:bg-white/[0.03]'
                  }
                `}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Signal list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
      >
        {filteredSignals.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <span className="font-mono text-[9px] text-white/20 tracking-wide">
              {signals.length === 0 ? 'AWAITING SIGNALS' : 'NO SIGNALS AT THIS PRIORITY'}
            </span>
          </div>
        ) : (
          filteredSignals.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              isNew={newIds.has(signal.id)}
            />
          ))
        )}
      </div>

      {/* Inline styles for animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes signal-flash-kf {
          0% { background-color: rgba(0, 212, 255, 0.15); }
          100% { background-color: transparent; }
        }
        .animate-signal-flash {
          animation: signal-flash-kf 1.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
