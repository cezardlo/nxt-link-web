'use client';

// Generic chip/tag input: shows clickable SUGGESTED chips (caller-supplied,
// sourced from real data — never hardcoded here) plus a text box where the
// vendor types their own value and presses Enter or comma to add it as a
// custom chip. Input is never restricted to the suggestion list.
//
// Two modes, one component (reuse over duplicating a "single picker" +
// "multi tag input"):
//   - multi  (default): value is the full list; chips are removable; new
//     values are appended (dedup case-insensitive) up to `max` if given.
//     Used for industries / best_for / use_cases (all string[] columns).
//   - single (max=1): value holds at most one chip; adding a new one
//     REPLACES it. Used for `category`, which persists as a single string —
//     the caller derives that string as `value[0] || ''`.
//
// Presentational only — no data fetching, no i18n baked in. All copy
// (placeholder, aria labels) is passed in by the caller so it can match
// whatever language convention the host page uses.

import { useState, type KeyboardEvent } from 'react';

export interface ChipTagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  max?: number;
  /** Soft per-chip character cap (server enforces the real limit). */
  chipMaxLength?: number;
  removeLabel?: (chip: string) => string;
  inputAriaLabel?: string;
}

export default function ChipTagInput({
  value, onChange, suggestions = [], placeholder = '', max, chipMaxLength = 120,
  removeLabel, inputAriaLabel,
}: ChipTagInputProps) {
  const [text, setText] = useState('');

  function commit(raw: string) {
    const v = raw.trim().slice(0, chipMaxLength);
    if (!v) { setText(''); return; }
    if (max === 1) {
      onChange([v]);
    } else {
      const exists = value.some((x) => x.toLowerCase() === v.toLowerCase());
      if (exists) { setText(''); return; }
      if (max && value.length >= max) { setText(''); return; }
      onChange([...value, v]);
    }
    setText('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(text);
    } else if (e.key === 'Backspace' && !text && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function remove(v: string) { onChange(value.filter((x) => x !== v)); }

  const lower = new Set(value.map((v) => v.toLowerCase()));
  const unselected = suggestions.filter((s) => !lower.has(s.toLowerCase()));

  return (
    <div className="cti">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {value.length > 0 && (
        <div className="cti-chips">
          {value.map((v) => (
            <span className="cti-chip on" key={v}>
              {v}
              <button type="button" className="cti-x" aria-label={removeLabel ? removeLabel(v) : `Remove ${v}`} onClick={() => remove(v)}>×</button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        className="cti-input"
        value={text}
        placeholder={placeholder}
        aria-label={inputAriaLabel || placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => { if (text.trim()) commit(text); }}
      />
      {unselected.length > 0 && (
        <div className="cti-sugg">
          {unselected.slice(0, 24).map((s) => (
            <button type="button" key={s} className="cti-chip sugg" onClick={() => commit(s)}>{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

const CSS = `
.cti{width:100%;display:flex;flex-direction:column;gap:8px;}
.cti-chips{display:flex;flex-wrap:wrap;gap:6px;}
.cti-chip{font-family:inherit;font-size:12.5px;font-weight:600;border-radius:99px;padding:6px 10px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}
.cti-chip.on{color:var(--spec-violet-deep,#4A3DB0);background:rgba(108,92,224,.1);border:1px solid var(--spec-violet,#6C5CE0);}
.cti-chip.sugg{color:var(--spec-ink,#141320);background:#fff;border:1px solid var(--spec-border,#E2DFEC);font-weight:500;}
.cti-chip.sugg:hover{border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.cti-x{font-family:inherit;background:none;border:none;color:inherit;cursor:pointer;font-size:13px;line-height:1;padding:0;}
.cti-input{font-family:inherit;font-size:14px;padding:11px 13px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;width:100%;box-sizing:border-box;}
.cti-input:focus{border-color:var(--spec-violet,#6C5CE0);box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.cti-sugg{display:flex;flex-wrap:wrap;gap:6px;}
`;
