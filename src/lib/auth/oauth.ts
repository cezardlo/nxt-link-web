// Continue-with-{Google,LinkedIn,Microsoft} — shared building blocks for
// every sign-in/sign-up screen (process doc §5: "never fork a second version
// of something that exists"). One provider-aware implementation backs all
// three buttons; src/components/OAuthButton.tsx renders them, and
// src/lib/auth/google.ts re-exports the Google-named pieces so nothing that
// already imports from it has to change.
//
// FLAG-GATED (binding requirement, unchanged from the original Google-only
// rule): a provider's button renders ONLY when its own flag is '1'. Cesar
// enables providers in Supabase Auth (+ the provider's own developer portal)
// on his own schedule — an unflagged button would be a dead click. Default
// absent → every screen renders exactly as it does today.
//
// Why lane/locale/invite ride on `redirectTo` instead of user metadata:
// signInWithOtp() (the magic-link path) accepts an `options.data` bag that
// /auth/callback reads back as user_metadata (signup_lane, company_name,
// supply_categories, …). signInWithOAuth() has no such option for ANY
// provider — an OAuth identity's user_metadata is populated from the
// provider's own profile fields (name/email/picture), not from anything the
// caller passes. So the ONE way to tell /auth/callback which lane a click
// came from is a query param on `redirectTo` — Supabase always echoes the
// exact URL back verbatim (appending `&code=...`), the same trick the
// magic-link path already uses for `next`. This threading is IDENTICAL for
// Google, LinkedIn, and Azure — none of it varies by provider, which is why
// buildOAuthRedirectTo below takes no `provider` argument at all.
export type OAuthProvider = 'google' | 'linkedin_oidc' | 'azure';

/** Azure (Microsoft) needs an explicit scopes list per Supabase's docs;
 *  Google and LinkedIn OIDC need none beyond their default. Kept as a pure,
 *  unit-testable function instead of inlined in the button component so the
 *  per-provider branch has direct test coverage. */
export const AZURE_SCOPES = 'email openid profile';

export function buildOAuthSignInOptions(
  provider: OAuthProvider,
  redirectTo: string,
): { redirectTo: string; scopes?: string } {
  return provider === 'azure' ? { redirectTo, scopes: AZURE_SCOPES } : { redirectTo };
}

/** Pure so it's testable without mutating process.env: fold whatever raw
 *  NEXT_PUBLIC_AUTH_* values the caller has into the same '1'-means-on rule
 *  every flag in this codebase already follows. */
export function computeOAuthFlags(env: {
  google?: string;
  linkedin?: string;
  azure?: string;
}): Record<OAuthProvider, boolean> {
  return {
    google: env.google === '1',
    linkedin_oidc: env.linkedin === '1',
    azure: env.azure === '1',
  };
}

const OAUTH_FLAGS = computeOAuthFlags({
  google: process.env.NEXT_PUBLIC_AUTH_GOOGLE,
  linkedin: process.env.NEXT_PUBLIC_AUTH_LINKEDIN,
  azure: process.env.NEXT_PUBLIC_AUTH_AZURE,
});

export const GOOGLE_AUTH_ENABLED = OAUTH_FLAGS.google;
export const LINKEDIN_AUTH_ENABLED = OAUTH_FLAGS.linkedin_oidc;
export const AZURE_AUTH_ENABLED = OAUTH_FLAGS.azure;
/** Gates copy that talks about "continuing" in general (e.g. the terms
 *  disclaimer under the button stack) — true the moment ANY one provider is
 *  on, regardless of which. */
export const ANY_OAUTH_ENABLED = GOOGLE_AUTH_ENABLED || LINKEDIN_AUTH_ENABLED || AZURE_AUTH_ENABLED;

export function isOAuthEnabled(provider: OAuthProvider): boolean {
  return OAUTH_FLAGS[provider];
}

/** Which lane /auth/callback should run for a given OAuth click — identical
 *  meaning for every provider (see src/app/auth/callback/route.ts, which
 *  keys off this param, never off which provider the code came from).
 *  'organic' — quick vendor signup (/vendor-signup, /signup vendor step,
 *              /vendor-login signup tab): ensureVendorProfile lane 'organic'
 *              — born PENDING, same review gate as the magic-link quick lane.
 *  'invite'  — /join/[token]: matched by invite token first (falls back to
 *              email), born PENDING (F1 decision, 2026-07-22) — same as the
 *              magic-link invite lane; admin approval activates it.
 *  'buyer'   — a buyer-role signup screen: no profile to create, but the
 *              click-wrap acceptance is still recorded fail-closed. */
export type OAuthLane = 'organic' | 'invite' | 'buyer';

export interface OAuthRedirectInput {
  /** window.location.origin — passed in by the caller so this stays a pure,
   *  DOM-free function (unit-testable under node:test). */
  origin: string;
  /** Post-sign-in destination, same shape as the magic-link `next` param.
   *  Omit to let /auth/callback fall back to its default role routing. */
  next?: string;
  /** The page to bounce back to (with ?err=google_terms) if the callback's
   *  fail-closed terms recording fails. Always set this to the calling page. */
  from: string;
  lane?: OAuthLane;
  locale?: 'en' | 'es';
  /** /join/[token] only. */
  inviteToken?: string;
  /** Opportunistic: only sent if the vendor had already typed it before
   *  clicking the button (the button sits above those fields, so usually
   *  empty). */
  companyName?: string;
  categories?: string[];
}

const MAX_PARAM_LEN = 120;
const MAX_CATEGORIES = 10;

/** Builds the redirectTo Supabase echoes back to /auth/callback. Deliberately
 *  takes NO `provider` argument — every provider threads lane/from/invite/
 *  locale the exact same way, because /auth/callback's handling keys off
 *  these params, never off which provider the code came from. */
export function buildOAuthRedirectTo(input: OAuthRedirectInput): string {
  const params = new URLSearchParams();
  if (input.next) params.set('next', input.next);
  params.set('oauth_from', input.from);
  if (input.lane) params.set('oauth_lane', input.lane);
  params.set('oauth_locale', input.locale === 'es' ? 'es' : 'en');
  if (input.inviteToken) params.set('oauth_invite', input.inviteToken);
  const company = input.companyName?.trim().slice(0, MAX_PARAM_LEN);
  if (company) params.set('oauth_company', company);
  if (input.categories?.length) {
    const cats = input.categories
      .map((c) => c.trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, MAX_CATEGORIES);
    if (cats.length) params.set('oauth_categories', cats.join('|'));
  }
  return `${input.origin}/auth/callback?${params.toString()}`;
}

/** The query param /auth/callback bounces back with when the fail-closed
 *  terms recording fails on ANY OAuth path (table not migrated yet, DB
 *  hiccup, …) — the originating page reads this and shows its own error UI.
 *  Value kept as 'google_terms' (not renamed to something provider-neutral)
 *  because every page's callback-error check and every redirect in
 *  route.ts already hardcode that literal string — renaming it would mean
 *  touching five already-hardened files for a cosmetic win. It now means
 *  "an OAuth terms recording failed", not "specifically Google". */
export const GOOGLE_OAUTH_ERROR_PARAM = 'err';
export const GOOGLE_OAUTH_ERROR_VALUE = 'google_terms';

export const OAUTH_LABEL: Record<OAuthProvider, { en: string; es: string }> = {
  google: { en: 'Continue with Google', es: 'Continuar con Google' },
  linkedin_oidc: { en: 'Continue with LinkedIn', es: 'Continuar con LinkedIn' },
  azure: { en: 'Continue with Microsoft', es: 'Continuar con Microsoft' },
};
export const OAUTH_LABEL_BUSY = { en: 'Connecting…', es: 'Conectando…' } as const;
export const OAUTH_UNAVAILABLE_MSG: Record<OAuthProvider, { en: string; es: string }> = {
  google: {
    en: 'Google sign-in isn’t available right now. Use the option below.',
    es: 'El inicio de sesión con Google no está disponible ahora. Usa la opción de abajo.',
  },
  linkedin_oidc: {
    en: 'LinkedIn sign-in isn’t available right now. Use the option below.',
    es: 'El inicio de sesión con LinkedIn no está disponible ahora. Usa la opción de abajo.',
  },
  azure: {
    en: 'Microsoft sign-in isn’t available right now. Use the option below.',
    es: 'El inicio de sesión con Microsoft no está disponible ahora. Usa la opción de abajo.',
  },
};
/** Shown regardless of which provider's callback bounced back here —
 *  /auth/callback doesn't (and shouldn't need to) remember which of the
 *  three providers the failed click came from, so the copy stays generic
 *  rather than naming one provider. */
export const OAUTH_TERMS_ERROR_MSG = {
  en: 'We could not confirm your terms acceptance, so we could not finish your sign-in. Please try again.',
  es: 'No pudimos confirmar tu aceptación de los términos, así que no pudimos completar tu inicio de sesión. Intenta de nuevo.',
} as const;
/** Same reasoning: with up to three buttons stacked, one shared disclaimer
 *  under the stack reads better than repeating a per-provider sentence. */
export const OAUTH_CONTINUE_AGREES_MSG = {
  en: 'By continuing, you agree to our Terms of Service and Privacy Policy.',
  es: 'Al continuar, aceptas nuestros Términos de Servicio y Aviso de Privacidad.',
} as const;

// Back-compat names for the pre-existing Google-only exports (src/lib/auth/
// google.ts re-exports these under their original names).
export const GOOGLE_LABEL = OAUTH_LABEL.google;
export const GOOGLE_LABEL_BUSY = OAUTH_LABEL_BUSY;
export const GOOGLE_UNAVAILABLE_MSG = OAUTH_UNAVAILABLE_MSG.google;
export const GOOGLE_TERMS_ERROR_MSG = OAUTH_TERMS_ERROR_MSG;
export const GOOGLE_CONTINUE_AGREES_MSG = OAUTH_CONTINUE_AGREES_MSG;

/** "en / es" (or "es / en") — the same slash format already used for
 *  bilingual copy on the pages with no language toggle (/login, /signup,
 *  /vendor-login). */
export function bilingualCopy(msg: { en: string; es: string }, first: 'en' | 'es' = 'en'): string {
  return first === 'es' ? `${msg.es} / ${msg.en}` : `${msg.en} / ${msg.es}`;
}

// ---------------------------------------------------------------------------
// Open-redirect guard (Opus G5 review of commit 76f4686, Finding 2). Both
// oauth_from (this file's own param) and next (the pre-existing magic-link
// param, same shape) ride back through Supabase's redirectTo echo and land
// in /auth/callback's query string — pure user input by the time the
// callback reads it. A raw `new URL(value, origin)` treats a
// protocol-relative value like `//evil.com` as cross-origin (browsers
// resolve the missing scheme against the current one), and a backslash
// variant like `/\evil.com` normalizes the same way in most browsers. Accept
// ONLY a same-origin relative path — a single leading slash, not two, and no
// backslashes anywhere — otherwise return the caller's own safe fallback
// instead of the raw value.
/**
 * Validate a redirect target pulled from a query param before it is ever
 * concatenated into `new URL(value, origin)`. Callers pass the lane's own
 * safe default as `fallback` (e.g. '/vendor-signup', '/join/<token>',
 * '/signup') — every rejection path lands there instead of the raw input.
 */
export function safeRelativePath(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  if (value.includes('\\')) return fallback; // browsers can treat \ as / — same-shaped attack as //
  if (!/^\/[^/]/.test(value)) return fallback; // single leading slash only, not protocol-relative
  return value;
}
