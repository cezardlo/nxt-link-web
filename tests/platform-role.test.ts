import assert from 'node:assert/strict';
import test from 'node:test';

import { resolvePlatformRole } from '@/lib/assistant/auth';

// ROOT CAUSE (2026-07-30): the vendor storefront preview ("View as a buyer")
// could dead-end into "Vendor not found" for Cesar even though he's the
// owner-admin, because isAdminRequest() only trusted platform_users.role from
// the DB — it never consulted the ADMIN_EMAILS allowlist that /auth/callback
// and /api/auth/me already use to route an owner to /admin. An owner whose DB
// role hadn't separately been promoted to 'admin' (e.g. a vendor lane touched
// their platform_users row first) was silently treated as a non-admin by
// every isAdminRequest gate. resolvePlatformRole is the extracted pure fix —
// these tests prove the allowlist now always wins, fail-closed when unset.

test('an ADMIN_EMAILS-listed email is admin even when the DB role is a plain vendor', () => {
  assert.equal(resolvePlatformRole('vendor', 'delaocesar65@gmail.com', 'delaocesar65@gmail.com'), 'admin');
});

test('an ADMIN_EMAILS-listed email is admin even when there is no platform_users row yet', () => {
  assert.equal(resolvePlatformRole(null, 'delaocesar65@gmail.com', 'delaocesar65@gmail.com'), 'admin');
  assert.equal(resolvePlatformRole(undefined, 'delaocesar65@gmail.com', 'delaocesar65@gmail.com'), 'admin');
});

test('a DB role of admin is preserved when the allowlist is unset (fail-closed, no behavior change)', () => {
  assert.equal(resolvePlatformRole('admin', 'delaocesar65@gmail.com', undefined), 'admin');
});

test('a non-allowlisted email keeps its plain DB role', () => {
  assert.equal(resolvePlatformRole('vendor', 'someone@example.com', 'delaocesar65@gmail.com'), 'vendor');
  assert.equal(resolvePlatformRole('client', 'someone@example.com', 'delaocesar65@gmail.com'), 'client');
});

test('no DB row and not allowlisted defaults to client', () => {
  assert.equal(resolvePlatformRole(null, 'someone@example.com', 'delaocesar65@gmail.com'), 'client');
  assert.equal(resolvePlatformRole(undefined, null, null), 'client');
});

test('empty/unset ADMIN_EMAILS never grants admin (fail-closed)', () => {
  assert.equal(resolvePlatformRole('vendor', 'delaocesar65@gmail.com', ''), 'vendor');
  assert.equal(resolvePlatformRole('vendor', 'delaocesar65@gmail.com', undefined), 'vendor');
});

test('super_admin DB role is preserved untouched when not allowlisted', () => {
  assert.equal(resolvePlatformRole('super_admin', 'ops@example.com', 'delaocesar65@gmail.com'), 'super_admin');
});
