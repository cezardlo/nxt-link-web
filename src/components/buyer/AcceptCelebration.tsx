'use client';

// Accept celebration overlay — RFQ design addendum #5 (workplace/plans/
// rfq-seamless-build-2026-07-29.md, "DESIGN ADDENDUM" item 5), WITH the
// binding copy deviation: "your order is protected" is BANNED (implies
// buyer-protection/fund-holding NXT//LINK doesn't offer) — the neutral,
// honest line below is used instead. Pure presentation: this component takes
// no part in the accept decision itself. The caller (src/app/buyer/page.tsx)
// renders it AFTER its existing decide() call resolves successfully — this
// file has zero knowledge of quote_request_id, fees, or the API call.
//
// Self-drawing checkmark reuses the CheckDraw stroke-dasharray/dashoffset
// technique already established in src/app/vendor/onboarding/page.tsx
// (search "vo-checkdraw") — same idea, new namespace (acx-) so it drops in
// without touching that file. Reduced-motion safe the same way: this is a
// plain CSS `animation`, already collapsed by the sitewide
// `@media (prefers-reduced-motion: reduce)` rule in globals.css.
//
// No haptics (explicit design-addendum deviation — "optional subtle haptic"
// dropped). Single CTA closes the overlay; the post-accept "what happens
// next" panel underneath was already rendered by the page's existing
// optimistic update before this overlay ever opened, so closing just reveals
// it — no extra wiring needed for the "auto-continues" behavior.

import { useEffect, useRef } from 'react';

export interface AcceptCelebrationLabels {
  headline: string;
  cta: string;
}

export function AcceptCelebration({
  labels, onClose,
}: {
  labels: AcceptCelebrationLabels;
  onClose: () => void;
}) {
  const ctaRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    ctaRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="acx-backdrop nxm-backdrop" role="dialog" aria-modal="true" aria-label={labels.headline}>
      <div className="acx-panel nxm-panel">
        <span className="acx-check" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7.1" stroke="currentColor" strokeWidth="1.1" className="acx-ring" />
            <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="acx-draw" />
          </svg>
        </span>
        <h2>{labels.headline}</h2>
        <button type="button" className="acx-cta nxm-press" ref={ctaRef} onClick={onClose}>{labels.cta}</button>
      </div>
    </div>
  );
}

// Namespaced (acx-). One violet accent (the tinted icon chip + backdrop
// glow), soft-shadowed panel per the design charter's card language — no new
// color introduced (spec-violet / spec-ink / #fff only).
export const ACCEPT_CELEBRATION_CSS = `
.acx-backdrop{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(circle at 50% 32%,rgba(108,92,224,.24),rgba(20,19,32,.55));}
.acx-panel{background:#fff;border-radius:20px;padding:36px 30px;max-width:360px;width:100%;text-align:center;box-shadow:0 24px 60px rgba(20,19,32,.28);}
.acx-check{display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:rgba(108,92,224,.1);color:var(--spec-violet,#6C5CE0);margin-bottom:18px;}
.acx-ring{opacity:.35;}
.acx-draw{stroke-dasharray:20;stroke-dashoffset:20;animation:acx-draw 480ms 220ms var(--nxm-ease-entrance,ease-out) forwards;}
@keyframes acx-draw{to{stroke-dashoffset:0;}}
.acx-panel h2{margin:0 0 22px;font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:19px;font-weight:700;color:var(--spec-ink,#141320);line-height:1.4;}
.acx-cta{font-family:inherit;font-size:14.5px;font-weight:700;background:var(--spec-violet,#6C5CE0);color:#fff;border:none;border-radius:10px;padding:12px 26px;min-height:44px;cursor:pointer;}
.acx-cta:hover{background:var(--spec-violet-deep,#4A3DB0);}
`;
