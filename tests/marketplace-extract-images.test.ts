import assert from 'node:assert/strict';
import test from 'node:test';

import { extractListingDraftFromImages } from '@/lib/marketplace/extract';

// Photo -> AI draft path (src/lib/marketplace/extract.ts). Same
// never-invent / draft-only contract as the text path, but sourced from
// product photos via Gemini vision (src/lib/llm/gemini-vision.ts). Every
// case here must resolve, never throw or reject — the extract API route
// relies on that to keep the manual/PDF/text paths unaffected when the
// vision call can't produce anything.

type GlobalFetch = typeof globalThis.fetch;
function setFetch(mock: GlobalFetch): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  return () => { globalThis.fetch = original; };
}
function withEnv(key: string, value: string | undefined, fn: () => Promise<void>): Promise<void> {
  const original = process.env[key];
  if (value === undefined) delete process.env[key]; else process.env[key] = value;
  return fn().finally(() => {
    if (original === undefined) delete process.env[key]; else process.env[key] = original;
  });
}

test('extractListingDraftFromImages: no GEMINI_API_KEY configured -> friendly fallback, never throws', async () => {
  await withEnv('GEMINI_API_KEY', undefined, async () => {
    const { draft, provider } = await extractListingDraftFromImages('product', [{ base64: 'AAAA', mimeType: 'image/png' }]);
    assert.equal(provider, 'fallback');
    assert.deepEqual(draft.fields, {});
    assert.match(draft.summary, /manually|brochure/i);
  });
});

test('extractListingDraftFromImages: a successful vision call parses through the same normalizer as the text path', async () => {
  await withEnv('GEMINI_API_KEY', 'test-key', async () => {
    const restore = setFetch(async () => new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              name: 'Pallet Jack 5000lb',
              summary: 'Found the model name on the nameplate; nothing else was legible.',
            }),
          }],
        },
      }],
    }), { status: 200 }));
    try {
      const { draft, provider } = await extractListingDraftFromImages('product', [{ base64: 'AAAA', mimeType: 'image/jpeg' }]);
      assert.equal(provider, 'gemini');
      assert.equal(draft.fields.name, 'Pallet Jack 5000lb');
      assert.equal(draft.summary, 'Found the model name on the nameplate; nothing else was legible.');
    } finally {
      restore();
    }
  });
});

test('extractListingDraftFromImages: malformed model output degrades gracefully instead of throwing', async () => {
  await withEnv('GEMINI_API_KEY', 'test-key', async () => {
    const restore = setFetch(async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'not json at all' }] } }],
    }), { status: 200 }));
    try {
      const { draft, provider } = await extractListingDraftFromImages('service', [{ base64: 'AAAA', mimeType: 'image/png' }]);
      assert.equal(provider, 'fallback');
      assert.deepEqual(draft.fields, {});
    } finally {
      restore();
    }
  });
});

test('extractListingDraftFromImages: a provider error (e.g. a stale/expired key) degrades gracefully, does not leak the reason', async () => {
  await withEnv('GEMINI_API_KEY', 'stale-key', async () => {
    const restore = setFetch(async () => new Response(JSON.stringify({ error: { message: 'API key expired' } }), { status: 401 }));
    try {
      const { draft, provider } = await extractListingDraftFromImages('product', [{ base64: 'AAAA', mimeType: 'image/png' }]);
      assert.equal(provider, 'fallback');
      assert.doesNotMatch(draft.summary, /expired|401|api key/i);
    } finally {
      restore();
    }
  });
});

test('extractListingDraftFromImages: a provider timeout (25s AbortSignal firing) degrades to the friendly fallback draft, never hangs or throws', async () => {
  await withEnv('GEMINI_API_KEY', 'test-key', async () => {
    const restore = setFetch(async () => {
      const timeoutError = new Error('The operation was aborted due to timeout');
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    });
    try {
      const { draft, provider } = await extractListingDraftFromImages('product', [{ base64: 'AAAA', mimeType: 'image/png' }]);
      assert.equal(provider, 'fallback');
      assert.deepEqual(draft.fields, {});
      assert.match(draft.summary, /manually|brochure/i);
    } finally {
      restore();
    }
  });
});
