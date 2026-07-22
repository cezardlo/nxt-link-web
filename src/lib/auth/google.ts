// Back-compat shim. Continue-with-Google's helpers used to live entirely in
// this file; Google, LinkedIn, and Microsoft (Azure) sign-in now share one
// provider-aware implementation in src/lib/auth/oauth.ts. This file
// re-exports the Google-flavored names under their ORIGINAL identifiers so
// every existing `import ... from '@/lib/auth/google'` keeps working
// unchanged. New code should import from '@/lib/auth/oauth' directly.
export {
  GOOGLE_AUTH_ENABLED,
  buildOAuthRedirectTo as buildGoogleRedirectTo,
  safeRelativePath,
  bilingualCopy,
  GOOGLE_OAUTH_ERROR_PARAM,
  GOOGLE_OAUTH_ERROR_VALUE,
  GOOGLE_LABEL,
  GOOGLE_LABEL_BUSY,
  GOOGLE_UNAVAILABLE_MSG,
  GOOGLE_TERMS_ERROR_MSG,
  GOOGLE_CONTINUE_AGREES_MSG,
} from './oauth';

export type { OAuthLane as GoogleOAuthLane, OAuthRedirectInput as GoogleRedirectInput } from './oauth';
