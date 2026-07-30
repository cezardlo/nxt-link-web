'use client';

// Fiverr-style "Continue with {Google,LinkedIn,Microsoft}" button — the ONE
// shared component every sign-in/sign-up screen renders for every provider
// (process doc §5: never fork a second version of something that exists).
// GoogleAuthButton.tsx is now a thin `provider="google"` wrapper around this
// component, kept only so nothing importing it has to change.
//
// Renders nothing unless that provider's own flag is on (see
// src/lib/auth/oauth.ts) — no dead button while Cesar hasn't enabled it in
// Supabase + the provider's developer portal.
//
// Click-wrap gate: pass `disabled` bound to the page's own click-wrap
// checkbox state — the button must not be clickable until the box is
// ticked. The acceptance itself can only be RECORDED once we know who
// signed in (OAuth reveals the email only after the provider redirect
// returns), so /auth/callback records it at that first authenticated touch
// and is fail-closed: if recording fails, the callback bounces back to
// `from` with `?err=google_terms` instead of finishing sign-in silently —
// the caller should check for that param on mount and surface it as its
// normal bilingual error. This is identical for all three providers.

import { useEffect, useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import {
  buildGoogleDirectCallback,
  createGoogleNonce,
  loadGoogleIdentity,
  type GoogleCredentialResponse,
} from '@/lib/auth/google-identity';
import {
  isOAuthEnabled,
  OAUTH_LABEL,
  OAUTH_LABEL_BUSY,
  OAUTH_UNAVAILABLE_MSG,
  bilingualCopy,
  buildOAuthRedirectTo,
  buildOAuthSignInOptions,
  type OAuthLane,
  type OAuthProvider,
} from '@/lib/auth/oauth';

export interface OAuthButtonProps {
  provider: OAuthProvider;
  /** Language the button's own label renders in. Pages without a language
   *  toggle should pass 'en' (their own idiom — see /login, /signup). */
  lang: 'en' | 'es';
  /** Post-sign-in destination (same shape as the magic-link `next`). */
  next?: string;
  /** The page to bounce back to on a fail-closed terms-recording error. */
  from: string;
  /** Bind to the page's click-wrap checkbox — button is inert until true. */
  disabled?: boolean;
  lane?: OAuthLane;
  inviteToken?: string;
  companyName?: string;
  categories?: string[];
  onError: (message: string) => void;
  className?: string;
  /** Pages with no language toggle show both languages in one string
   *  ("… / …"), matching their existing error-copy idiom. */
  bilingualErrors?: boolean;
}

export default function OAuthButton({
  provider, lang, next, from, disabled, lane, inviteToken, companyName, categories, onError, className, bilingualErrors,
}: OAuthButtonProps) {
  const [busy, setBusy] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleFailed, setGoogleFailed] = useState(false);
  const googleHost = useRef<HTMLDivElement>(null);
  const directGoogle = provider === 'google'
    && isOAuthEnabled(provider)
    && process.env.NEXT_PUBLIC_GOOGLE_DIRECT_SIGNIN === '1'
    && Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)
    && !googleFailed;

  const unavailable = () => {
    onError(bilingualErrors ? bilingualCopy(OAUTH_UNAVAILABLE_MSG[provider]) : OAUTH_UNAVAILABLE_MSG[provider][lang]);
  };

  // Google requires its official rendered button; there is intentionally no
  // supported API for opening the chooser from a custom button. The callback
  // exchanges Google's signed ID token for the same Supabase cookie session
  // the rest of the app already uses, then enters the shared server callback.
  useEffect(() => {
    if (!directGoogle || disabled || !googleHost.current) {
      setGoogleReady(false);
      return;
    }

    let active = true;
    const host = googleHost.current;
    host.replaceChildren();

    async function mountGoogleButton() {
      try {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!clientId) throw new Error('Missing Google client ID.');
        const [google, noncePair] = await Promise.all([loadGoogleIdentity(), createGoogleNonce()]);
        if (!active) return;

        google.accounts.id.initialize({
          client_id: clientId,
          nonce: noncePair.hashedNonce,
          ux_mode: 'popup',
          callback: async (response: GoogleCredentialResponse) => {
            if (!active || !response.credential) {
              if (active) unavailable();
              return;
            }
            setBusy(true);
            try {
              const redirectTo = buildOAuthRedirectTo({
                origin: window.location.origin,
                next,
                from,
                lane,
                locale: lang,
                inviteToken,
                companyName,
                categories,
              });
              const sb = createBrowserSupabaseClient();
              const { error } = await sb.auth.signInWithIdToken({
                provider: 'google',
                token: response.credential,
                nonce: noncePair.nonce,
              });
              if (error) throw error;
              window.location.assign(buildGoogleDirectCallback(redirectTo));
            } catch {
              unavailable();
              setBusy(false);
            }
          },
        });

        const width = Math.min(400, Math.max(200, Math.floor(host.getBoundingClientRect().width || 320)));
        google.accounts.id.renderButton(host, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width,
          locale: lang,
        });
        setGoogleReady(true);
      } catch {
        if (active) {
          setGoogleReady(false);
          // Keep sign-in available if GIS is blocked or fails to load: this
          // remounts the existing hosted Supabase OAuth button as rollback.
          setGoogleFailed(true);
        }
      }
    }

    void mountGoogleButton();
    return () => {
      active = false;
      host.replaceChildren();
    };
    // Primitive category signature avoids remounting because an array literal
    // received a new identity while preserving the callback's exact values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directGoogle, disabled, next, from, lane, lang, inviteToken, companyName, categories?.join('|')]);

  if (!isOAuthEnabled(provider)) return null;

  async function go() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const redirectTo = buildOAuthRedirectTo({
        origin: window.location.origin, next, from, lane, locale: lang, inviteToken, companyName, categories,
      });
      const sb = createBrowserSupabaseClient();
      const { error } = await sb.auth.signInWithOAuth({
        provider,
        options: buildOAuthSignInOptions(provider, redirectTo),
      });
      if (error) {
        unavailable();
        setBusy(false);
      }
      // else: the browser is already navigating to the provider — nothing else to do.
    } catch {
      unavailable();
      setBusy(false);
    }
  }

  const label = busy ? OAUTH_LABEL_BUSY[lang] : OAUTH_LABEL[provider][lang];
  if (directGoogle && !disabled) {
    return (
      <div
        className={className}
        aria-busy={!googleReady || busy}
        style={{ padding: 0, border: 0, background: 'transparent', overflow: 'hidden' }}
      >
        <div ref={googleHost} style={{ display: busy ? 'none' : 'flex', width: '100%', justifyContent: 'center' }} />
        {(!googleReady || busy) && (
          <span role="status" style={{ display: 'flex', minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            {OAUTH_LABEL_BUSY[lang]}
          </span>
        )}
      </div>
    );
  }

  return (
    <button type="button" className={className} disabled={disabled || busy} onClick={go} aria-label={label}>
      <OAuthMark provider={provider} />
      <span>{label}</span>
    </button>
  );
}

export function OAuthMark({ provider }: { provider: OAuthProvider }) {
  if (provider === 'google') return <GoogleMark />;
  if (provider === 'linkedin_oidc') return <LinkedInMark />;
  return <MicrosoftMark />;
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

/** LinkedIn's rounded-square "in" mark — brand blue (#0A66C2), inline (no
 *  icon dependency). */
export function LinkedInMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect width="24" height="24" rx="4" fill="#0A66C2" />
      <circle cx="7.2" cy="7.2" r="1.85" fill="#fff" />
      <rect x="5.85" y="10.2" width="2.7" height="8.2" rx="0.6" fill="#fff" />
      <path fill="#fff" d="M11.1 10.2h2.6v1.12c.62-.86 1.6-1.32 2.75-1.32 2.1 0 3.4 1.38 3.4 3.86v4.54h-2.7v-4.06c0-1.24-.5-2.02-1.62-2.02-1.1 0-1.8.75-1.8 2.1v3.98h-2.63V10.2z" />
    </svg>
  );
}

/** Microsoft's 4-square mark, official brand colors, inline (no icon
 *  dependency). Used for Azure AD sign-in, user-facing as "Microsoft". */
export function MicrosoftMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
