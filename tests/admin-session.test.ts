import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_MS,
  accessCodeHeaderOk,
  adminCookieOk,
  createAdminSessionToken,
  safeEqual,
  verifyAdminSessionToken,
} from '@/lib/server/admin-session';

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    saved[key] = process.env[key];
    if (vars[key] === undefined) delete process.env[key];
    else process.env[key] = vars[key];
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

test('safeEqual matches equal strings and rejects different ones', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(safeEqual('', ''), true);
});

test('admin session token round-trips', () => {
  withEnv({ ADMIN_ACCESS_CODE: 'code-1', ADMIN_SESSION_SECRET: 'secret-1' }, () => {
    const token = createAdminSessionToken();
    assert.ok(token, 'token should be minted when env is configured');
    assert.equal(verifyAdminSessionToken(token), true);
  });
});

test('admin session token expires', () => {
  withEnv({ ADMIN_ACCESS_CODE: 'code-1', ADMIN_SESSION_SECRET: 'secret-1' }, () => {
    const now = 1_000_000;
    const token = createAdminSessionToken(now);
    assert.ok(token);
    assert.equal(verifyAdminSessionToken(token, now + ADMIN_SESSION_TTL_MS - 1), true);
    assert.equal(verifyAdminSessionToken(token, now + ADMIN_SESSION_TTL_MS + 1), false);
  });
});

test('tampered or malformed tokens are rejected', () => {
  withEnv({ ADMIN_ACCESS_CODE: 'code-1', ADMIN_SESSION_SECRET: 'secret-1' }, () => {
    const token = createAdminSessionToken();
    assert.ok(token);
    const flipped = token.slice(0, -1) + (token.endsWith('0') ? '1' : '0');
    assert.equal(verifyAdminSessionToken(flipped), false);
    assert.equal(verifyAdminSessionToken('garbage'), false);
    assert.equal(verifyAdminSessionToken('v1.notanumber.deadbeef'), false);
    assert.equal(verifyAdminSessionToken(null), false);
    assert.equal(verifyAdminSessionToken(undefined), false);
  });
});

test('tokens signed with a different secret are rejected', () => {
  let token: string | null = null;
  withEnv({ ADMIN_ACCESS_CODE: 'code-1', ADMIN_SESSION_SECRET: 'secret-1' }, () => {
    token = createAdminSessionToken();
  });
  withEnv({ ADMIN_ACCESS_CODE: 'code-1', ADMIN_SESSION_SECRET: 'secret-2' }, () => {
    assert.equal(verifyAdminSessionToken(token), false);
  });
});

test('nothing is minted or verified when env is unconfigured', () => {
  withEnv({ ADMIN_ACCESS_CODE: undefined, ADMIN_SESSION_SECRET: undefined }, () => {
    assert.equal(createAdminSessionToken(), null);
    assert.equal(verifyAdminSessionToken('v1.99999999999999.abc'), false);
    const headers = new Headers({ 'x-access-code': 'anything' });
    assert.equal(accessCodeHeaderOk(headers), false);
  });
});

test('accessCodeHeaderOk compares against the env code', () => {
  withEnv({ ADMIN_ACCESS_CODE: 'right-code', ADMIN_SESSION_SECRET: undefined }, () => {
    assert.equal(accessCodeHeaderOk(new Headers({ 'x-access-code': 'right-code' })), true);
    assert.equal(accessCodeHeaderOk(new Headers({ 'x-access-code': 'wrong-code' })), false);
    assert.equal(accessCodeHeaderOk(new Headers()), false);
  });
});

test('adminCookieOk accepts a valid cookie and rejects bad ones', () => {
  withEnv({ ADMIN_ACCESS_CODE: 'code-1', ADMIN_SESSION_SECRET: 'secret-1' }, () => {
    const token = createAdminSessionToken();
    assert.ok(token);
    const good = new Headers({ cookie: `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token!)}` });
    assert.equal(adminCookieOk(good), true);
    const other = new Headers({ cookie: `other=1; ${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token!)}; more=2` });
    assert.equal(adminCookieOk(other), true);
    const bad = new Headers({ cookie: `${ADMIN_SESSION_COOKIE}=v1.123.tampered` });
    assert.equal(adminCookieOk(bad), false);
    const missing = new Headers({ cookie: 'unrelated=1' });
    assert.equal(adminCookieOk(missing), false);
  });
});
