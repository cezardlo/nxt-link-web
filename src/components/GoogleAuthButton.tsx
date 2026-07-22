'use client';

// Back-compat wrapper. This component used to hold all the Google button's
// own logic; that logic is now provider-aware and lives in
// src/components/OAuthButton.tsx (shared by Google, LinkedIn, and Microsoft/
// Azure). This file re-exports the original names — default component,
// GOOGLE_AUTH_ENABLED, GoogleMark — so every existing
// `import GoogleAuthButton from '@/components/GoogleAuthButton'` keeps
// working unchanged. New code should render <OAuthButton provider="..." />
// directly for LinkedIn/Microsoft.

import OAuthButton, { GoogleMark } from './OAuthButton';
import { GOOGLE_AUTH_ENABLED } from '@/lib/auth/oauth';
import type { GoogleOAuthLane } from '@/lib/auth/google';

export { GOOGLE_AUTH_ENABLED, GoogleMark };

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

export default function GoogleAuthButton(props: GoogleAuthButtonProps) {
  return <OAuthButton provider="google" {...props} />;
}
