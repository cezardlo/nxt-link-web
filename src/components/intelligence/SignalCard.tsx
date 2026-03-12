'use client';

import { useState, useCallback } from 'react';
import type { KgSignalPriority, KgSignalRow } from '@/db/queries/kg-signals';

/* ── Priority color mapping ─────────────────────────────────────────────── */

const PRIORITY_COLORS: Record<KgSignalPriority, string> = {
  P0: '#ff3b30',
  P1: '#f97316',
  P2: '#ffd700',
  P3: '#64748b',
};

/* ── Time-ago formatting ─────────────────────────────────────────────────── */

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffS = Math.max(0, Math.floor((now - then) / 1000));

  if (diffS < 60) return `${diffS}s ago`;
  const diffM = Math.floor(diffS / 60);
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  const diffMo = Math.floor(diffD / 30);
  return `${diffMo}mo ago`;
}

/* ── Component ───────────────────────────────────────────────────────────── */

type Props = {
  signal: KgSignalRow;
  isNew?: boolean;
};

export function SignalCard({ signal, isNew }: Props) {
  const [expanded, setExpanded] = useState(false);
  const color = PRIORITY_COLORS[signal.priority];

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`
        w-full text-left px-3 py-2 border-b border-white/[0.04] last:border-0
        hover:bg-white/[0.03] transition-colors duration-150 cursor-pointer
        ${isNew ? 'animate-signal-flash' : ''}
      `}
    >
      {/* Top row: priority badge + title */}
      <div className="flex items-start gap-2">
        {/* Priority pill */}
        <span
          className="shrink-0 mt-0.5 font-mono text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded-sm border"
          style={{
            color,
            borderColor: `${color}40`,
            backgroundColor: `${color}12`,
            boxShadow: signal.priority === 'P0' ? `0 0 6px ${color}44` : undefined,
          }}
        >
          {signal.priority}
        </span>

        {/* Title */}
        <span className="flex-1 min-w-0 font-mono text-[11px] text-white/90 leading-tight line-clamp-2">
          {signal.title}
        </span>
      </div>

      {/* Tags row: signal type + source + time */}
      <div className="flex items-center gap-1.5 mt-1.5 ml-7 flex-wrap">
        {/* Signal type tag */}
        <span
          className="font-mono text-[8px] tracking-[0.1em] uppercase px-1 py-0.5 rounded-sm border border-white/8 bg-white/[0.04] text-[#00d4ff]/70"
        >
          {signal.signal_type}
        </span>

        {/* Source + time */}
        <span className="font-mono text-[9px] text-white/40 ml-auto tabular-nums whitespace-nowrap">
          {signal.source_name ? `${signal.source_name} / ` : ''}
          {timeAgo(signal.detected_at)}
        </span>
      </div>

      {/* Expanded: description */}
      {expanded && signal.description && (
        <div className="mt-2 ml-7 font-mono text-[10px] text-white/55 leading-relaxed">
          {signal.description}
        </div>
      )}

      {/* Expanded: metadata row */}
      {expanded && signal.source_url && (
        <div className="flex items-center gap-2 mt-1.5 ml-7 flex-wrap">
          <a
            href={signal.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-[8px] text-[#00d4ff]/50 hover:text-[#00d4ff]/80 underline ml-auto"
          >
            SOURCE
          </a>
        </div>
      )}
    </button>
  );
}
