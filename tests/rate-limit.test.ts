import assert from 'node:assert/strict';
import test from 'node:test';

import { checkRateLimit } from '@/lib/http/rate-limit';

test('rate limit blocks requests after maxRequests in window', () => {
  const key = `test-${Date.now()}`;
  const first = checkRateLimit({
    key,
    maxRequests: 2,
    windowMs: 5_000,
  });
  const second = checkRateLimit({
    key,
    maxRequests: 2,
    windowMs: 5_000,
  });
  const third = checkRateLimit({
    key,
    maxRequests: 2,
    windowMs: 5_000,
  });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
  assert.ok(third.retryAfterMs > 0);
});
