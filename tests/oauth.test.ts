import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildOAuthRedirectTo,
  buildOAuthSignInOptions,
  computeOAuthFlags,
  AZURE_SCOPES,
} from '@/lib/auth/oauth';

const ORIGIN = 'https://nxt-link-web.vercel.app';

// computeOAuthFlags — the '1'-means-on rule, same as every other flag in
// this codebase, now fanned out across all three providers independently.
test('computeOAuthFlags: all off when nothing is set', () => {
  assert.deepEqual(computeOAuthFlags({}), { google: false, linkedin_oidc: false, azure: false });
});

test('computeOAuthFlags: each provider flag is independent', () => {
  assert.deepEqual(
    computeOAuthFlags({ google: '1' }),
    { google: true, linkedin_oidc: false, azure: false },
  );
  assert.deepEqual(
    computeOAuthFlags({ linkedin: '1' }),
    { google: false, linkedin_oidc: true, azure: false },
  );
  assert.deepEqual(
    computeOAuthFlags({ azure: '1' }),
    { google: false, linkedin_oidc: false, azure: true },
  );
});

test('computeOAuthFlags: all three on at once', () => {
  assert.deepEqual(
    computeOAuthFlags({ google: '1', linkedin: '1', azure: '1' }),
    { google: true, linkedin_oidc: true, azure: true },
  );
});

test('computeOAuthFlags: only the literal string "1" turns a flag on', () => {
  assert.deepEqual(
    computeOAuthFlags({ google: 'true', linkedin: '0', azure: 'yes' }),
    { google: false, linkedin_oidc: false, azure: false },
  );
});

// buildOAuthRedirectTo takes no `provider` argument at all — the redirectTo
// threading (lane/from/invite/locale) is identical no matter which button
// a user clicked, because /auth/callback keys off oauth_* params, never off
// the provider. This is the core design invariant the task calls out.
test('buildOAuthRedirectTo output is identical regardless of which provider called it', () => {
  const input = {
    origin: ORIGIN, from: '/vendor-signup', next: '/vendor/portal?welcome=1',
    lane: 'organic' as const, locale: 'es' as const, companyName: 'Acme',
  };
  // Same input, called as if from three different buttons — output must be
  // byte-for-byte identical since the function has no provider concept.
  const a = buildOAuthRedirectTo(input);
  const b = buildOAuthRedirectTo(input);
  const c = buildOAuthRedirectTo(input);
  assert.equal(a, b);
  assert.equal(b, c);
  const url = new URL(a);
  assert.equal(url.searchParams.get('oauth_lane'), 'organic');
  assert.equal(url.searchParams.get('oauth_locale'), 'es');
  assert.equal(url.searchParams.get('next'), '/vendor/portal?welcome=1');
});

// buildOAuthSignInOptions — the one place the provider actually matters:
// Azure needs an explicit scopes list per Supabase's docs, Google and
// LinkedIn OIDC don't.
test('buildOAuthSignInOptions: azure gets the required scopes', () => {
  const opts = buildOAuthSignInOptions('azure', `${ORIGIN}/auth/callback`);
  assert.equal(opts.redirectTo, `${ORIGIN}/auth/callback`);
  assert.equal(opts.scopes, AZURE_SCOPES);
  assert.equal(opts.scopes, 'email openid profile');
});

test('buildOAuthSignInOptions: google gets no scopes override', () => {
  const opts = buildOAuthSignInOptions('google', `${ORIGIN}/auth/callback`);
  assert.equal(opts.redirectTo, `${ORIGIN}/auth/callback`);
  assert.equal('scopes' in opts, false);
});

test('buildOAuthSignInOptions: linkedin_oidc gets no scopes override', () => {
  const opts = buildOAuthSignInOptions('linkedin_oidc', `${ORIGIN}/auth/callback`);
  assert.equal(opts.redirectTo, `${ORIGIN}/auth/callback`);
  assert.equal('scopes' in opts, false);
});
