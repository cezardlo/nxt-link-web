'use client';

// "Why this match" explanation (design spec §03 "Price display & match reason",
// §04 opportunity card). Renders the matching engine's human-readable
// reasons[] either as a tinted sentence box or as compact chips.

export const MATCH_REASONS_CSS = `
.mrx{background:rgba(108,92,224,.06);border:1px solid rgba(108,92,224,.2);border-radius:10px;padding:9px 12px;}
.mrx b{display:block;font-size:9.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--spec-violet-deep,#4A3DB0);margin-bottom:3px;}
.mrx p{margin:0;font-size:12.5px;line-height:1.45;color:var(--spec-text-2nd,#615F72);}
.mrx-chips{display:flex;flex-wrap:wrap;gap:5px;}
.mrx-chips span{font-size:11px;font-weight:600;padding:3px 9px;border-radius:99px;background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);border:1px solid rgba(108,92,224,.25);white-space:nowrap;}
`;

export function MatchReasons({
  reasons,
  compact,
  score,
}: {
  reasons: string[];
  compact?: boolean;
  score?: number;
}) {
  const clean = (reasons || []).filter(Boolean);
  if (clean.length === 0) return null;

  if (compact) {
    return (
      <div className="mrx-chips">
        {typeof score === 'number' && <span title="Match score">{Math.round(score)}% match</span>}
        {clean.map((r) => <span key={r}>{r}</span>)}
      </div>
    );
  }

  const sentence = clean
    .map((r, i) => (i === 0 ? r : r.charAt(0).toLowerCase() + r.slice(1)))
    .join(' · ');
  return (
    <div className="mrx">
      <b>{typeof score === 'number' ? `Why this match · ${Math.round(score)}%` : 'Why this match'}</b>
      <p>{sentence}</p>
    </div>
  );
}
