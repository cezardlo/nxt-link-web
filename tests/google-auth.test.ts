import assert from 'node:assert/strict';
import test from 'node:test';

import { buildGoogleRedirectTo, safeRelativePath } from '@/lib/auth/google';

const ORIGIN = 'https://nxt-link-web.vercel.app';

test('buildGoogleRedirectTo always sets oauth_from and oauth_locale', () => {
  const url = new URL(buildGoogleRedirectTo({ origin: ORIGIN, from: '/vendor-signup' }));
  assert.equal(url.pathname, '/auth/callback');
  assert.equal(url.searchParams.get('oauth_from'), '/vendor-signup');
  assert.equal(url.searchParams.get('oauth_locale'), 'en');
  assert.equal(url.searchParams.get('next'), null);
  assert.equal(url.searchParams.get('oauth_lane'), null);
});

test('buildGoogleRedirectTo threads next, lane, and locale', () => {
  const url = new URL(buildGoogleRedirectTo({
    origin: ORIGIN, from: '/vendor-signup', next: '/vendor/portal?welcome=1', lane: 'organic', locale: 'es',
  }));
  assert.equal(url.searchParams.get('next'), '/vendor/portal?welcome=1');
  assert.equal(url.searchParams.get('oauth_lane'), 'organic');
  assert.equal(url.searchParams.get('oauth_locale'), 'es');
});

test('buildGoogleRedirectTo threads the invite token for the invite lane', () => {
  const url = new URL(buildGoogleRedirectTo({
    origin: ORIGIN, from: '/join/abc123', lane: 'invite', inviteToken: 'abc123',
  }));
  assert.equal(url.searchParams.get('oauth_lane'), 'invite');
  assert.equal(url.searchParams.get('oauth_invite'), 'abc123');
});

test('buildGoogleRedirectTo carries an already-typed company name and categories', () => {
  const url = new URL(buildGoogleRedirectTo({
    origin: ORIGIN, from: '/vendor-signup', lane: 'organic',
    companyName: '  Borderland Forklift Services  ',
    categories: ['Forklifts', ' Parts ', ''],
  }));
  assert.equal(url.searchParams.get('oauth_company'), 'Borderland Forklift Services');
  assert.equal(url.searchParams.get('oauth_categories'), 'Forklifts|Parts');
});

test('buildGoogleRedirectTo omits empty optional fields entirely', () => {
  const url = new URL(buildGoogleRedirectTo({ origin: ORIGIN, from: '/login', companyName: '   ', categories: [] }));
  assert.equal(url.searchParams.has('oauth_company'), false);
  assert.equal(url.searchParams.has('oauth_categories'), false);
  assert.equal(url.searchParams.has('oauth_invite'), false);
});

test('buildGoogleRedirectTo caps categories at 10 and truncates long values', () => {
  const long = 'x'.repeat(200);
  const many = Array.from({ length: 15 }, (_, i) => `cat${i}`);
  const url = new URL(buildGoogleRedirectTo({
    origin: ORIGIN, from: '/vendor-signup', lane: 'organic', companyName: long, categories: many,
  }));
  assert.equal(url.searchParams.get('oauth_company')?.length, 120);
  assert.equal(url.searchParams.get('oauth_categories')?.split('|').length, 10);
});

// safeRelativePath — Opus G5 review of 76f4686, Finding 2 (open redirect via
// oauth_from / next / the pre-existing `next` sink at /auth/callback).
test('safeRelativePath accepts a normal same-origin relative path', () => {
  assert.equal(safeRelativePath('/vendor/portal?welcome=1', '/login'), '/vendor/portal?welcome=1');
});

test('safeRelativePath rejects a protocol-relative host (//evil.com)', () => {
  assert.equal(safeRelativePath('//evil.com', '/login'), '/login');
});

test('safeRelativePath rejects a backslash variant (/\\evil.com)', () => {
  assert.equal(safeRelativePath('/\\evil.com', '/login'), '/login');
});

test('safeRelativePath rejects an absolute URL (https://evil.com)', () => {
  assert.equal(safeRelativePath('https://evil.com', '/login'), '/login');
});

test('safeRelativePath falls back on an empty string', () => {
  assert.equal(safeRelativePath('', '/login'), '/login');
});

test('safeRelativePath falls back when the value is missing', () => {
  assert.equal(safeRelativePath(null, '/login'), '/login');
  assert.equal(safeRelativePath(undefined, '/login'), '/login');
});
