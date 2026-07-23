'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

// Designed empty state (design spec §06 "Every state has one clear next
// action"): title + hint + exactly one primary action, optional secondary.

export const EMPTY_ACTION_CSS = `
.eax{text-align:center;padding:30px 20px;border:1px dashed var(--spec-border,#E2DFEC);border-radius:16px;background:var(--spec-surface,#EFEDF5);}
.eax-ico{display:grid;place-items:center;margin:0 auto 10px;width:38px;height:38px;border-radius:12px;background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);}
.eax-ico svg{width:20px;height:20px;}
.eax b{display:block;font-size:15px;font-weight:700;color:var(--spec-ink,#141320);}
.eax p{margin:6px auto 0;font-size:13px;line-height:1.5;color:var(--spec-text-2nd,#615F72);max-width:420px;}
.eax-actions{display:flex;gap:9px;justify-content:center;margin-top:14px;flex-wrap:wrap;}
.eax-cta{display:inline-block;background:var(--spec-violet,#6C5CE0);color:#fff;font-size:13px;font-weight:700;padding:9px 18px;border-radius:10px;border:none;cursor:pointer;text-decoration:none;font-family:inherit;}
.eax-cta:hover{background:var(--spec-violet-deep,#4A3DB0);}
.eax-alt{display:inline-block;background:#fff;color:var(--spec-violet-deep,#4A3DB0);font-size:13px;font-weight:600;padding:9px 14px;border-radius:10px;border:1px solid rgba(108,92,224,.35);cursor:pointer;text-decoration:none;font-family:inherit;}
.eax.sm{padding:20px 16px;}
.eax.sm b{font-size:13.5px;}
.eax.sm p{font-size:12.5px;}
`;

export function EmptyAction({
  icon,
  title,
  hint,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel,
  secondaryHref,
  size,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={size === 'sm' ? 'eax sm' : 'eax'}>
      {icon && <div className="eax-ico" aria-hidden>{icon}</div>}
      <b>{title}</b>
      {hint && <p>{hint}</p>}
      {(actionLabel || secondaryLabel) && (
        <div className="eax-actions">
          {actionLabel && actionHref && <Link className="eax-cta" href={actionHref}>{actionLabel}</Link>}
          {actionLabel && !actionHref && <button type="button" className="eax-cta" onClick={onAction}>{actionLabel}</button>}
          {secondaryLabel && secondaryHref && <Link className="eax-alt" href={secondaryHref}>{secondaryLabel}</Link>}
        </div>
      )}
    </div>
  );
}
