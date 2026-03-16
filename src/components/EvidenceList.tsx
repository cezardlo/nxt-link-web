'use client';

import { useState } from 'react';

export type EvidenceItem = {
  text: string;
  url?: string;
  source?: string;
  date?: string;
};

type EvidenceListProps = {
  items: EvidenceItem[];
  maxVisible?: number;
  label?: string;
};

export function EvidenceList({ items, maxVisible = 3, label = 'EVIDENCE' }: EvidenceListProps) {
  const [expanded, setExpanded] = useState(false);

  if (!items.length) return null;

  const visible = expanded ? items : items.slice(0, maxVisible);
  const remaining = items.length - maxVisible;

  return (
    <div>
      <span className="font-mono text-[8px] tracking-widest text-white/25 uppercase">
        {label}
      </span>
      <ul className="mt-1.5 space-y-1">
        {visible.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-white/20 mt-1.5 shrink-0" />
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-[#00d4ff]/60 hover:text-[#00d4ff]/80 transition-colors leading-snug"
              >
                {item.text}
              </a>
            ) : (
              <span className="font-mono text-[11px] text-white/40 leading-snug">
                {item.text}
              </span>
            )}
            {(item.source || item.date) && (
              <span className="font-mono text-[9px] text-white/15 shrink-0 mt-0.5">
                {[item.source, item.date].filter(Boolean).join(' · ')}
              </span>
            )}
          </li>
        ))}
      </ul>
      {remaining > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="font-mono text-[9px] text-[#00d4ff]/40 hover:text-[#00d4ff]/60 mt-2 transition-colors"
        >
          Show {remaining} more →
        </button>
      )}
    </div>
  );
}
