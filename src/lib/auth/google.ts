// Continue-with-Google — shared building blocks for every sign-in/sign-up
// screen (process doc §5: "never fork a second version of something that
// exists"). The actual button lives in src/components/GoogleAuthButton.tsx;
// this file holds the pure, unit-testable pieces: the feature flag, the
// redirect-URL builder, and the shared bilingual copy.
//
// FLAG-GATED (binding requirement): the button must render ONLY when
// NEXT_PUBLIC_AUTH_GOOGLE === '1'. Cesar has not enabled the Google provider
// in Supabase Auth / Google Cloud yet — an unflagged button would be a dead
// click. Default absent → every screen renders exactly as it does today.
//
// Why lane/locale/invite ride on `redirectTo` instead of user metadata:
// signInWithOtp() (the magic-link path) accepts an `options.data` bag that
// /auth/callback reads back as user_metadata (signup_lane, company_name,
// supply_categories, …). signInWithOAuth() has no such option — an OAuth
// identity's user_metadata is populated from the provider's own profile
// fields (Google's name/email/picture), not from anything the caller passes.
// So the ONE way to tell /auth/callback which lane a Google click came from
// is a query param on `redirectTo` — Supabase always echoes the exact URL
// back verbatim (appending `&code=...`), the same trick the magic-link path
// already uses for `next`.
export const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_GOOGLE === '1';

/** Which lane /auth/callback should run for a given Google click.
 *  'organic' — quick vendor signup (/vendor-signup, /signup vendor step,
 *              /vendor-login signup tab): ensureVendorProfile lane 'organic'
 *              — born PENDING, same review gate as the magic-link quick lane.
 *  'invite'  — /join/[token]: matched by invite token first (falls back to
 *              email), born APPROVED — same as the magic-link invite lane.
 *  'buyer'   — a buyer-role signup screen: no profile to create, but the
 *              click-wrap acceptance is still recorded fail-closed. */
export type GoogleOAuthLane = 'organic' | 'invite' | 'buyer';

export interface GoogleRedirectInput {
  /** window.location.origin — passed in by the caller so this stays a pure,
   *  DOM-free function (unit-testable under node:test). */
  origin: string;
  /** Post-sign-in destination, same shape as the magic-link `next` param.
   *  Omit to let /auth/callback fall back to its default role routing. */
  next?: string;
  /** The page to bounce back to (with ?err=google_terms) if the callback's
   *  fail-closed terms recording fails. Always set this to the calling page. */
  from: string;
  lane?: GoogleOAuthLane;
  locale?: 'en' | 'es';
  /** /join/[token] only. */
  inviteToken?: string;
  /** Opportunistic: only sent if the vendor had already typed it before
   *  clicking Google (the button sits above those fields, so usually empty). */
  companyName?: string;
  categories?: string[];
}

const MAX_PARAM_LEN = 120;
const MAX_CATEGORIES = 10;

export function buildGoogleRedirectTo(input: GoogleRedirectInput): string {
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
 *  terms recording fails on the Google path (table not migrated yet, DB
 *  hiccup, …) — the originating page reads this and shows its own error UI. */
export const GOOGLE_OAUTH_ERROR_PARAM = 'err';
export const GOOGLE_OAUTH_ERROR_VALUE = 'google_terms';

export const GOOGLE_LABEL = { en: 'Continue with Google', es: 'Continuar con Google' } as const;
export const GOOGLE_LABEL_BUSY = { en: 'Connecting…', es: 'Conectando…' } as const;
export const GOOGLE_UNAVAILABLE_MSG = {
  en: 'Google sign-in isn’t available right now. Use the option below.',
  es: 'El inicio de sesión con Google no está disponible ahora. Usa la opción de abajo.',
} as const;
export const GOOGLE_TERMS_ERROR_MSG = {
  en: 'We could not confirm your terms acceptance, so we could not finish your Google sign-in. Please try again.',
  es: 'No pudimos confirmar tu aceptación de los términos, así que no pudimos completar tu inicio de sesión con Google. Intenta de nuevo.',
} as const;
export const GOOGLE_CONTINUE_AGREES_MSG = {
  en: 'By continuing with Google, you agree to our Terms of Service and Privacy Policy.',
  es: 'Al continuar con Google, aceptas nuestros Términos de Servicio y Aviso de Privacidad.',
} as const;

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
