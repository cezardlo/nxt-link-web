import assert from 'node:assert/strict';
import test from 'node:test';

import { parseAdminEmails, isAdminEmail } from '@/lib/auth/admin-allowlist';

// parseAdminEmails — normalize the raw ADMIN_EMAILS env value.
test('parseAdminEmails: empty / unset yields an empty list', () => {
  assert.deepEqual(parseAdminEmails(undefined), []);
  assert.deepEqual(parseAdminEmails(null), []);
  assert.deepEqual(parseAdminEmails(''), []);
  assert.deepEqual(parseAdminEmails('   '), []);
});

test('parseAdminEmails: splits, trims, lowercases, drops blanks', () => {
  assert.deepEqual(
    parseAdminEmails('  Owner@Example.com , second@x.io ,, THIRD@Y.io '),
    ['owner@example.com', 'second@x.io', 'third@y.io'],
  );
});

// isAdminEmail — the fail-closed membership check consulted wherever role is
// derived (auth/callback + api/auth/me).
test('isAdminEmail: empty/unset allowlist means nobody is admin (fail-closed)', () => {
  assert.equal(isAdminEmail('owner@example.com', undefined), false);
  assert.equal(isAdminEmail('owner@example.com', ''), false);
  assert.equal(isAdminEmail('owner@example.com', null), false);
});

test('isAdminEmail: a null/empty email is never admin', () => {
  assert.equal(isAdminEmail(null, 'owner@example.com'), false);
  assert.equal(isAdminEmail(undefined, 'owner@example.com'), false);
  assert.equal(isAdminEmail('', 'owner@example.com'), false);
});

test('isAdminEmail: case-insensitive, whitespace-tolerant match', () => {
  assert.equal(isAdminEmail('OWNER@example.com', 'owner@example.com'), true);
  assert.equal(isAdminEmail('  owner@example.com  ', 'owner@example.com'), true);
  assert.equal(isAdminEmail('owner@example.com', ' Owner@Example.com '), true);
});

test('isAdminEmail: matches any entry in a multi-email allowlist', () => {
  const list = 'a@x.io, delaocesar65@gmail.com, c@z.io';
  assert.equal(isAdminEmail('delaocesar65@gmail.com', list), true);
  assert.equal(isAdminEmail('c@z.io', list), true);
  assert.equal(isAdminEmail('notlisted@x.io', list), false);
});

test('isAdminEmail: a near-miss (different domain) is not admin', () => {
  assert.equal(isAdminEmail('owner@evil.com', 'owner@example.com'), false);
});
