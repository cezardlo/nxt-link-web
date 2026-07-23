'use client';

// Project stage tracker (design spec §03 "Project stage tracker").
// Segmented progress bar + stage pills: done stages get a check, the
// current stage is highlighted, upcoming stages are dimmed. Extracted from
// the bespoke pd-pipe on the project page so every surface tracks stages
// the same way.

export const STAGE_TRACKER_CSS = `
.stx-bar{display:flex;gap:4px;margin-bottom:10px;}
.stx-bar i{flex:1;height:5px;border-radius:3px;background:var(--spec-border,#E2DFEC);}
.stx-bar i.done{background:#6C5CE0;}
.stx-bar i.now{background:linear-gradient(90deg,#6C5CE0,#2F9E6A);}
.stx-labels{display:flex;flex-wrap:wrap;gap:6px;}
.stx-labels span{font-size:11px;font-weight:600;padding:4px 10px;border-radius:99px;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-text-2nd,#615F72);background:#fff;white-space:nowrap;}
.stx-labels span.done{color:var(--spec-violet-deep,#4A3DB0);border-color:rgba(108,92,224,.3);background:rgba(108,92,224,.06);}
.stx-labels span.now{color:var(--spec-ink,#141320);border-color:rgba(47,158,106,.4);background:#E9F7F0;font-weight:700;}
`;

export function StageTracker({
  stages,
  current,
  compact,
}: {
  stages: { key: string; label: string }[];
  current: string;
  compact?: boolean;
}) {
  const idx = Math.max(0, stages.findIndex((s) => s.key === current));
  return (
    <div>
      <div className="stx-bar" role="progressbar" aria-valuemin={1} aria-valuemax={stages.length} aria-valuenow={idx + 1} aria-valuetext={stages[idx]?.label}>
        {stages.map((s, i) => (
          <i key={s.key} className={i < idx ? 'done' : i === idx ? 'now' : ''} />
        ))}
      </div>
      {!compact && (
        <div className="stx-labels">
          {stages.map((s, i) => (
            <span key={s.key} className={i < idx ? 'done' : i === idx ? 'now' : ''}>
              {i < idx ? '✓ ' : i === idx ? '› ' : ''}{s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
