import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';

type GlobalFetch = typeof globalThis.fetch;

function setFetch(mock: GlobalFetch): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  return () => {
    globalThis.fetch = original;
  };
}

test('fetchWithRetry dedupes concurrent in-flight GET requests', async () => {
  let callCount = 0;
  const restore = setFetch(async () => {
    callCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return new Response('ok', { status: 200 });
  });

  try {
    const url = 'https://example.com/dedupe-check';
    const [a, b, c] = await Promise.all([
      fetchWithRetry(url, { method: 'GET' }, { dedupeInFlight: true }),
      fetchWithRetry(url, { method: 'GET' }, { dedupeInFlight: true }),
      fetchWithRetry(url, { method: 'GET' }, { dedupeInFlight: true }),
    ]);
    assert.equal(await a.text(), 'ok');
    assert.equal(await b.text(), 'ok');
    assert.equal(await c.text(), 'ok');
    assert.equal(callCount, 1);
  } finally {
    restore();
  }
});

test('fetchWithRetry returns stale cache when upstream fails', async () => {
  let mode: 'ok' | 'fail' = 'ok';
  const restore = setFetch(async () => {
    if (mode === 'fail') {
      throw new Error('network down');
    }
    return new Response('cached-body', { status: 200 });
  });

  try {
    const url = 'https://example.com/stale-check';
    const first = await fetchWithRetry(
      url,
      { method: 'GET' },
      { cacheTtlMs: 1, staleIfErrorMs: 1000, dedupeInFlight: false },
    );
    assert.equal(await first.text(), 'cached-body');

    await new Promise((resolve) => setTimeout(resolve, 10));
    mode = 'fail';

    const second = await fetchWithRetry(
      url,
      { method: 'GET' },
      { cacheTtlMs: 1, staleIfErrorMs: 1000, dedupeInFlight: false, retries: 0 },
    );
    assert.equal(await second.text(), 'cached-body');
  } finally {
    restore();
  }
});

