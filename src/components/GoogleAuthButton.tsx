'use client';

// Fiverr-style "Continue with Google" button — the ONE shared component
// every sign-in/sign-up screen renders (process doc §5: never fork a second
// version of something that exists). Renders nothing unless
// NEXT_PUBLIC_AUTH_GOOGLE === '1' (see src/lib/auth/google.ts) — no dead
// button while Cesar hasn't enabled the provider.
//
// Click-wrap gate: pass `disabled` bound to the page's own click-wrap
// checkbox state — the button must not be clickable until the box is
// ticked. The acceptance itself can only be RECORDED once we know who
// signed in (OAuth reveals the email only after the provider redirect
// returns), so /auth/callback records it at that first authenticated touch
// and is fail-closed: if recording fails, the callback bounces back to
// `from` with `?err=google_terms` instead of finishing sign-in silently —
// the caller should check for that param on mount and surface it as its
// normal bilingual error.

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import {
  GOOGLE_AUTH_ENABLED,
  GOOGLE_LABEL,
  GOOGLE_LABEL_BUSY,
  GOOGLE_UNAVAILABLE_MSG,
  bilingualCopy,
  buildGoogleRedirectTo,
  type GoogleOAuthLane,
} from '@/lib/auth/google';

export { GOOGLE_AUTH_ENABLED };

export interface GoogleAuthButtonProps {
  /** Language the button's own label renders in. Pages without a language
   *  toggle should pass 'en' (their own idiom — see /login, /signup). */
  lang: 'en' | 'es';
  /** Post-sign-in destination (same shape as the magic-link `next`). */
  next?: string;
  /** The page to bounce back to on a fail-closed terms-recording error. */
  from: string;
  /** Bind to the page's click-wrap checkbox — button is inert until true. */
  disabled?: boolean;
  lane?: GoogleOAuthLane;
  inviteToken?: string;
  companyName?: string;
  categories?: string[];
  onError: (message: string) => void;
  className?: string;
  /** Pages with no language toggle show both languages in one string
   *  ("… / …"), matching their existing error-copy idiom. */
  bilingualErrors?: boolean;
}

export default function GoogleAuthButton({
  lang, next, from, disabled, lane, inviteToken, companyName, categories, onError, className, bilingualErrors,
}: GoogleAuthButtonProps) {
  const [busy, setBusy] = useState(false);
  if (!GOOGLE_AUTH_ENABLED) return null;

  async function go() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const redirectTo = buildGoogleRedirectTo({
        origin: window.location.origin, next, from, lane, locale: lang, inviteToken, companyName, categories,
      });
      const sb = createBrowserSupabaseClient();
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
      if (error) {
        onError(bilingualErrors ? bilingualCopy(GOOGLE_UNAVAILABLE_MSG) : GOOGLE_UNAVAILABLE_MSG[lang]);
        setBusy(false);
      }
      // else: the browser is already navigating to Google — nothing else to do.
    } catch {
      onError(bilingualErrors ? bilingualCopy(GOOGLE_UNAVAILABLE_MSG) : GOOGLE_UNAVAILABLE_MSG[lang]);
      setBusy(false);
    }
  }

  const label = busy ? GOOGLE_LABEL_BUSY[lang] : GOOGLE_LABEL[lang];
  return (
    <button type="button" className={className} disabled={disabled || busy} onClick={go} aria-label={label}>
      <GoogleMark />
      <span>{label}</span>
    </button>
  );
}

/** The standard 4-color Google "G" mark, inline (no icon dependency). */
export function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.2C29.3 35 26.8 36 24 36c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.3 5.2C41.1 36.5 44 30.8 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}
