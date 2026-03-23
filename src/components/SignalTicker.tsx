'use client';

import { useEffect, useState } from 'react';
import { COLORS } from '@/lib/tokens';

// ─── SignalTicker — Bloomberg-style scrolling signal bar ─────────────────────
// Compact horizontal ticker showing the latest P0/P1 signals.
// Used at the top of /command and /world pages.

type TickerSignal = {
  id: string;
  title: string;
  severity: string;
  detected_at: string;
};

const SEVERITY_COLORS: Record<string, string> = {
  P0: '#ff3b30',
  P1: '#f97316',
  P2: '#ffd700',
  P3: '#00d4ff',
};

type Props = {
  signals?: TickerSignal[];
  onSignalClick?: (id: string) => void;
};

export function SignalTicker({ signals: externalSignals, onSignalClick }: Props) {
  const [signals, setSignals] = useState<TickerSignal[]>(externalSignals ?? []);

  // Fetch if not provided
  useEffect(() => {
    if (externalSignals) return;
    fetch('/api/intel-signals?limit=10')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const items = data.signals ?? data;
        if (Array.isArray(items) && items.length > 0) {
          setSignals(items.map((s: Record<string, unknown>) => ({
            id: String(s.id ?? ''),
            title: String(s.title ?? ''),
            severity: String(s.severity ?? s.priority ?? 'P3'),
            detected_at: String(s.detected_at ?? s.discovered_at ?? ''),
          })));
        }
      })
      .catch(err => console.warn('[SignalTicker] fetch failed:', err));
  }, [externalSignals]);

  if (signals.length === 0) return null;

  // Double the list for seamless loop
  const doubled = [...signals, ...signals];
  const duration = Math.max(30, signals.length * 4); // ~4s per item

  return (
    <div className="h-7 flex items-center overflow-hidden border-b border-white/[0.04] bg-black/40">
      {/* LIVE badge */}
      <div className="shrink-0 flex items-center gap-1.5 px-2.5 border-r border-white/[0.05] h-full">
        <span
          className="w-1.5 h-1.5 rounded-full live-pulse shrink-0"
          style={{ backgroundColor: COLORS.green, boxShadow: `0 0 6px ${COLORS.green}cc` }}
        />
        <span className="font-mono text-[7px] font-bold tracking-[0.25em]" style={{ color: `${COLORS.green}bb` }}>
          LIVE
        </span>
      </div>

      {/* Scrolling ticker */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-6 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.8), transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-6 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.8), transparent)' }} />

        <div
          className="feed-scroll flex items-center whitespace-nowrap"
          style={{ animationDuration: `${duration}s` }}
        >
          {doubled.map((signal, i) => {
            const color = SEVERITY_COLORS[signal.severity] ?? SEVERITY_COLORS.P3;
            return (
              <button
                key={`${signal.id}-${i}`}
                onClick={() => onSignalClick?.(signal.id)}
                className="inline-flex items-center gap-1.5 px-3 hover:opacity-80 transition-opacity cursor-pointer shrink-0"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: color, boxShadow: `0 0 3px ${color}88` }}
                />
                <span className="font-mono text-[8px] font-bold shrink-0" style={{ color }}>
                  {signal.severity}
                </span>
                <span className="font-mono text-[8px]" style={{ color: `${COLORS.text}50` }}>
                  {signal.title.length > 50 ? signal.title.slice(0, 50) + '...' : signal.title}
                </span>
                <span className="font-mono text-[7px] text-white/[0.06] shrink-0 ml-1">|</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
