'use client';
// @ts-nocheck

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ConvergenceEvent {
  id: string;
  sectors?: string[];
  industry?: string;
  industries?: string[];
  confidence: number;
  summary?: string;
  narrative?: string;
  signalCount?: number;
  signal_count?: number;
}

interface ConvergenceResponse {
  ok: boolean;
  convergenceCount?: number;
  data?: ConvergenceEvent[];
  events?: ConvergenceEvent[];
}

export function ConvergenceAlertBanner() {
  const [events, setEvents] = useState<ConvergenceEvent[]>([]);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/intelligence/convergence?window=24h&min_confidence=0.6')
      .then(r => r.json())
      .then((d: ConvergenceResponse) => {
        const all = d.data ?? d.events ?? [];
        const filtered = all.filter(e => (e.confidence ?? 0) >= 0.6);
        setEvents(filtered);
      })
      .catch(() => {});
  }, []);

  if (dismissed || events.length === 0) return null;

  const event = events[index];
  const sectors = event.sectors ?? event.industries ?? (event.industry ? [event.industry] : []);
  const count = event.signalCount ?? event.signal_count ?? 0;
  const text = event.summary ?? event.narrative ?? '';
  const pct = Math.round((event.confidence ?? 0) * 100);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="mb-5 rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3 animate-pulse-border"
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <span className="text-amber-400 text-base flex-shrink-0 mt-0.5">⚡</span>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
                CONVERGENCE DETECTED
              </span>
              {sectors.length > 0 && (
                <span className="font-mono text-[10px] text-white/70">
                  {sectors.join(' × ')}
                </span>
              )}
              <span className="font-mono text-[10px] text-amber-600">
                {pct}% confidence{count > 0 ? ` · ${count} signals` : ''}
              </span>
            </div>
            {text && (
              <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">
                {text.length > 160 ? text.slice(0, 157) + '...' : text}
              </p>
            )}
          </div>

          {/* Nav + dismiss */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {events.length > 1 && (
              <>
                <button
                  onClick={() => setIndex(i => (i - 1 + events.length) % events.length)}
                  className="text-gray-600 hover:text-gray-400 text-xs"
                >
                  ‹
                </button>
                <span className="font-mono text-[10px] text-gray-600">
                  {index + 1}/{events.length}
                </span>
                <button
                  onClick={() => setIndex(i => (i + 1) % events.length)}
                  className="text-gray-600 hover:text-gray-400 text-xs"
                >
                  ›
                </button>
              </>
            )}
            <button
              onClick={() => setDismissed(true)}
              className="text-gray-600 hover:text-gray-400 text-xs ml-1"
            >
              ✕
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
