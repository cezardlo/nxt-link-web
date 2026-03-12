import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizePublicHttpUrl } from '@/lib/http/url-safety';

test('normalizePublicHttpUrl accepts http/https public URLs', async () => {
  const url = await normalizePublicHttpUrl(
    'https://example.com/path?q=1',
    async () => ['93.184.216.34'],
  );

  assert.equal(url, 'https://example.com/path?q=1');
});

test('normalizePublicHttpUrl rejects localhost hosts', async () => {
  await assert.rejects(
    normalizePublicHttpUrl('http://localhost:3000', async () => ['127.0.0.1']),
    /not allowed/i,
  );
});

test('normalizePublicHttpUrl rejects private IPv4 targets', async () => {
  await assert.rejects(
    normalizePublicHttpUrl('http://192.168.1.20', async () => ['192.168.1.20']),
    /must be public/i,
  );
});

test('normalizePublicHttpUrl rejects domains resolving to private addresses', async () => {
  await assert.rejects(
    normalizePublicHttpUrl('https://safe.example.com', async () => ['10.20.30.40']),
    /resolve to a public address/i,
  );
});

test('normalizePublicHttpUrl rejects non-http schemes', async () => {
  await assert.rejects(
    normalizePublicHttpUrl('file:///etc/passwd', async () => ['93.184.216.34']),
    /must start with/i,
  );
});

test('normalizePublicHttpUrl rejects non-standard ports', async () => {
  await assert.rejects(
    normalizePublicHttpUrl('https://example.com:8080/path', async () => ['93.184.216.34']),
    /port is not allowed/i,
  );
});

test('normalizePublicHttpUrl rejects unstable hostname resolution', async () => {
  let callCount = 0;
  await assert.rejects(
    normalizePublicHttpUrl('https://example.com/path', async () => {
      callCount += 1;
      return callCount === 1 ? ['93.184.216.34'] : ['93.184.216.35'];
    }),
    /resolution is unstable/i,
  );
});
