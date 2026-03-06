'use client';

import type { ConferenceRecord } from '@/lib/data/conference-intel';
import { CONFERENCE_CATEGORY_HEX } from '@/lib/utils/design-tokens';

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  conf: ConferenceRecord;
  onClose: () => void;
};

export function ConferenceSection({ conf, onClose }: Props) {
  const catColor = CONFERENCE_CATEGORY_HEX[conf.category] ?? '#888';

  return (
    <div className="flex flex-col gap-3 px-3 py-2">
      {/* Header: name + close */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-mono text-[11px] font-bold text-white/90 leading-tight">{conf.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="font-mono text-[7px] tracking-wider px-1.5 py-0.5 rounded-sm"
              style={{ background: `${catColor}20`, color: catColor, border: `1px solid ${catColor}30` }}
            >
              {(conf.category ?? '').toUpperCase()}
            </span>
            <span className="font-mono text-[8px] text-white/30">{conf.month}</span>
          </div>
        </div>
        <button onClick={onClose} className="font-mono text-[9px] text-white/20 hover:text-white/50 transition-colors">
          ✕
        </button>
      </div>

      {/* Location */}
      <div className="font-mono text-[8px] text-white/40 flex items-center gap-1">
        <span style={{ color: catColor }}>◆</span> {conf.location}
      </div>

      {/* Stats row */}
      <div className="flex gap-3">
        <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-sm px-2 py-1.5">
          <div className="font-mono text-[7px] text-white/25 tracking-wider">EXHIBITORS</div>
          <div className="font-mono text-[14px] font-bold" style={{ color: catColor }}>
            {conf.estimatedExhibitors.toLocaleString()}
          </div>
        </div>
        <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-sm px-2 py-1.5">
          <div className="font-mono text-[7px] text-white/25 tracking-wider">RELEVANCE</div>
          <div className="font-mono text-[14px] font-bold" style={{ color: '#00d4ff' }}>
            {conf.relevanceScore}<span className="text-[9px] text-white/30">/100</span>
          </div>
        </div>
      </div>

      {/* Relevance bar */}
      <div>
        <div className="font-mono text-[7px] text-white/25 tracking-wider mb-1">EP RELEVANCE INDEX</div>
        <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${conf.relevanceScore}%`,
              background: `linear-gradient(90deg, ${catColor}88, ${catColor})`,
              boxShadow: `0 0 6px ${catColor}66`,
            }}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <div className="font-mono text-[7px] text-white/25 tracking-wider mb-1">INTELLIGENCE BRIEF</div>
        <p className="font-mono text-[9px] text-white/50 leading-relaxed">{conf.description}</p>
      </div>

      {/* Website */}
      {conf.website && (
        <a
          href={conf.website}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[8px] tracking-wider px-2 py-1.5 rounded-sm border text-center transition-colors"
          style={{ borderColor: `${catColor}30`, color: catColor, background: `${catColor}08` }}
        >
          OPEN WEBSITE →
        </a>
      )}
    </div>
  );
}
