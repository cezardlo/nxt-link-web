# Google direct sign-in — 2026-07-30

## Outcome

Google's account chooser identifies the relying app as **NXT//LINK**, not the
Supabase project hostname, while Supabase remains the session and user system.

## Scope and safety

- Google only: LinkedIn and Microsoft keep the existing Supabase OAuth path.
- Use Google's official Identity Services button and ID token callback.
- Use a fresh SHA-256 nonce for every rendered Google button.
- Exchange the Google ID token with Supabase `signInWithIdToken`.
- Re-enter the existing `/auth/callback` post-auth pipeline so role routing,
  invite linking, vendor profile creation, and legal acceptance stay singular.
- Gate the new path behind `NEXT_PUBLIC_GOOGLE_DIRECT_SIGNIN=1`; the current
  Supabase-hosted Google redirect remains the instant rollback.
- No fee-engine changes, database migration, production push, or deployment.

## Configuration

The browser-safe Google web client ID is supplied as
`NEXT_PUBLIC_GOOGLE_CLIENT_ID`. Google must list the production and preview
origins under Authorized JavaScript origins.

## Verification

Run focused auth tests, the full typecheck, and a production build. Manually
verify login, buyer signup, organic vendor signup, and invite signup in preview
before Cesar enables the flag in production.
