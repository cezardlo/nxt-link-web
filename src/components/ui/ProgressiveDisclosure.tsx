'use client';

import { useState, type ReactNode } from 'react';
import { COLORS } from '@/lib/tokens';

// ─── Progressive Disclosure ──────────────────────────────────────────────────
// Three-level depth control for data-dense interfaces.
// Level 1: Headline (always visible)
// Level 2: Details (expand on click/hover)
// Level 3: Full data (expand further)
//
// "Not everything needs to be visible. Bloomberg shows 3 levels of depth
//  for every data point." — Frontend Architecture doc

type Props = {
  /** Always-visible headline content */
  headline: ReactNode;
  /** Second-level detail (shown on first expand) */
  details?: ReactNode;
  /** Third-level full data (shown on second expand) */
  full?: ReactNode;
  /** Accent color for expand indicator */
  accent?: string;
  /** Start expanded at this level (0=collapsed, 1=details, 2=full) */
  defaultLevel?: 0 | 1 | 2;
};

export function ProgressiveDisclosure({
  headline,
  details,
  full,
  accent = COLORS.cyan,
  defaultLevel = 0,
}: Props) {
  const [level, setLevel] = useState(defaultLevel);
  const maxLevel = full ? 2 : details ? 1 : 0;

  function toggle() {
    setLevel(prev => (prev >= maxLevel ? 0 : (prev + 1)) as 0 | 1 | 2);
  }

  return (
    <div className="group">
      {/* Level 1: Headline — always visible */}
      <button
        onClick={toggle}
        className="w-full text-left flex items-center gap-2 transition-colors hover:bg-white/[0.02] rounded-md px-2 py-1.5"
        aria-expanded={level > 0}
      >
        <div className="flex-1 min-w-0">{headline}</div>
        {maxLevel > 0 && (
          <span
            className="shrink-0 text-[8px] font-mono tracking-wider transition-all duration-200"
            style={{
              color: level > 0 ? accent : `${COLORS.text}25`,
              transform: level > 0 ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            ▶
          </span>
        )}
      </button>

      {/* Level 2: Details */}
      {level >= 1 && details && (
        <div
          className="pl-4 pr-2 pb-2 animate-fade-up"
          style={{ borderLeft: `1px solid ${accent}20` }}
        >
          {details}
        </div>
      )}

      {/* Level 3: Full data */}
      {level >= 2 && full && (
        <div
          className="pl-4 pr-2 pb-2 ml-2 animate-fade-up"
          style={{ borderLeft: `1px solid ${accent}10` }}
        >
          {full}
        </div>
      )}
    </div>
  );
}

// ─── Compact variant for signal cards ────────────────────────────────────────

type CompactProps = {
  summary: ReactNode;
  expanded: ReactNode;
  accent?: string;
};

export function ExpandableCard({ summary, expanded, accent = COLORS.cyan }: CompactProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-lg transition-all duration-200"
      style={{
        background: COLORS.card,
        border: `1px solid ${open ? `${accent}30` : COLORS.border}`,
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left p-3 flex items-center gap-2"
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">{summary}</div>
        <span
          className="text-[10px] font-mono shrink-0"
          style={{ color: `${COLORS.text}30` }}
        >
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-0 animate-fade-up" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          {expanded}
        </div>
      )}
    </div>
  );
}
