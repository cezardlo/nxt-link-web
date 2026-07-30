'use client';

// Shared motion primitives — the Airbnb-style motion pass for signed-in
// surfaces (2026-07-30: /buyer dashboard, /vendor/leads, accept celebration).
// ONE definition of easing/duration/keyframes/stagger so every page draws
// from the same vocabulary instead of re-inventing transitions per page —
// same shared-CSS-constant pattern as MATCH_REASONS_CSS (components/
// marketplace/MatchReasons.tsx) / OFFER_CARD_CSS / EMPTY_ACTION_CSS: a page
// imports MOTION_CSS and concatenates it into its own single <style> tag.
//
// Tokens: reuses the sitewide --spec-ease / --spec-duration-fast /
// --spec-duration-reveal already defined in src/app/globals.css (public-page
// motion system) instead of inventing a second, competing set — this file
// only adds the few additional durations/keyframes those tokens don't cover
// (press scale, panel slide-up, stagger, one-shot pulse). Namespaced --nxm-*
// / .nxm-* throughout so it can never collide with --spec-*, the per-page
// prefixes (by-/ld-/vo-/mrx/qcd-/qct-/ofc-/bec-), or the nxtlink-design skill
// kit's own (unprefixed) --ease-*/--duration-* tokens.
//
// Reduced motion: every rule below is a plain CSS `animation`/`transition`,
// so the EXISTING sitewide rule in globals.css —
//   @media (prefers-reduced-motion: reduce) {
//     *, *::before, *::after { animation-duration: .01ms !important;
//       animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
//   }
// — already collapses ALL of it to effectively instant, the same pattern
// documented on vendor/onboarding's CheckDraw. No per-component override
// needed for pure-CSS motion. The one thing that global rule can't reach is
// the JS rAF loop in <CountUp> below (rAF isn't a CSS transition/animation),
// so CountUp calls prefersReducedMotion() itself and skips straight to the
// exact final formatted value.

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Inline `--nxm-i` for CSS-only stagger (`animation-delay: calc(var(--nxm-i) * step)`)
 * — one custom property per card, no per-frame JS. Cast is needed because
 * React.CSSProperties doesn't type custom properties. */
export function staggerStyle(index: number): CSSProperties {
  return { ['--nxm-i' as string]: index } as CSSProperties;
}

/**
 * Display-only count-up: animates the shown text from 0 toward `value` over
 * `duration`ms, but ALWAYS renders `format(value)` — the caller's own money
 * formatter — for both the resting state and the final frame, so the number
 * that lands on screen is byte-identical to calling `format(value)` directly.
 * Never a second formatter, never re-math: this component only interpolates
 * the raw number fed into the SAME formatter the page already uses.
 * Reduced-motion: renders the final value immediately, no rAF loop at all.
 */
export function CountUp({
  value, duration = 400, format, className,
}: {
  value: number;
  duration?: number;
  format: (n: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion() || !(duration > 0)) {
      setDisplay(value);
      return;
    }
    let start: number | null = null;
    function tick(ts: number) {
      if (start == null) start = ts;
      const elapsed = ts - start;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      if (p < 1) {
        setDisplay(value * eased);
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(value); // land on the EXACT prop value, never an eased fraction
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
}

export const MOTION_CSS = `
:root{
  --nxm-ease: var(--spec-ease, cubic-bezier(.2,.8,.2,1));
  --nxm-ease-entrance: cubic-bezier(.16,1,.3,1);
  --nxm-duration-hover: var(--spec-duration-fast, 150ms);
  --nxm-duration-press: 100ms;
  --nxm-duration-entrance: var(--spec-duration-reveal, 280ms);
  --nxm-duration-panel: 260ms;
  --nxm-stagger-step: 70ms;
  --nxm-lift-y: -2px;
  --nxm-press-scale: .98;
}
/* Entrance — fade + translateY(10px)->0, staggered per-card via --nxm-i
   (set with staggerStyle(i)); content appears with intent, never pops. */
@keyframes nxm-rise{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
.nxm-in{animation:nxm-rise var(--nxm-duration-entrance) var(--nxm-ease-entrance) both;animation-delay:calc(var(--nxm-i,0) * var(--nxm-stagger-step));}

/* Hover lift — any interactive card. */
.nxm-lift{transition:transform var(--nxm-duration-hover) var(--nxm-ease),box-shadow var(--nxm-duration-hover) var(--nxm-ease);}
.nxm-lift:hover{transform:translateY(var(--nxm-lift-y));box-shadow:0 10px 24px rgba(20,19,32,.10);}

/* Press feedback — primary buttons / actionable cards. */
.nxm-press{transition:transform var(--nxm-duration-press) var(--nxm-ease);}
.nxm-press:active{transform:scale(var(--nxm-press-scale));}

/* Panel / sheet — modals + expandable quote & chat panels. Slide up + fade on
   mount (a conditionally-rendered React panel already unmounts instantly on
   close — there is no frame to animate on the way out without new state, so
   per the vocabulary this covers the "open" direction, the moment actually
   being evaluated). --nxm-panel-rise is bigger on narrow viewports so the
   same class reads as a bottom-sheet slide-up on phones. */
.nxm-panel{--nxm-panel-rise:20px;animation:nxm-panel-in var(--nxm-duration-panel) var(--nxm-ease-entrance) both;}
@keyframes nxm-panel-in{from{opacity:0;transform:translateY(var(--nxm-panel-rise));}to{opacity:1;transform:translateY(0);}}
@media(max-width:640px){.nxm-panel{--nxm-panel-rise:28px;}}

/* Backdrop fade — full-screen overlays (accept celebration). */
.nxm-backdrop{animation:nxm-fade-in 200ms var(--nxm-ease) both;}
@keyframes nxm-fade-in{from{opacity:0;}to{opacity:1;}}

/* One soft violet pulse then settle — design addendum #2 (best-value tag). */
.nxm-pulse{animation:nxm-pulse-settle 900ms var(--nxm-ease) 1 both;}
@keyframes nxm-pulse-settle{
  0%{box-shadow:0 0 0 0 rgba(108,92,224,.45);}
  60%{box-shadow:0 0 0 8px rgba(108,92,224,0);}
  100%{box-shadow:0 0 0 0 rgba(108,92,224,0);}
}
`;
