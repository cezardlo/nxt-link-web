import assert from 'node:assert/strict';
import test from 'node:test';

import { callGeminiVisionJson } from '@/lib/llm/gemini-vision';

// Direct Gemini multimodal call used only for photo-based listing
// extraction (src/lib/marketplace/extract.ts). Fails closed: every failure
// mode here must throw so the caller can degrade gracefully — never return
// a partial/garbage result silently.

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

test('callGeminiVisionJson: throws when GEMINI_API_KEY is not configured', async () => {
  await withEnv('GEMINI_API_KEY', undefined, async () => {
    await assert.rejects(
      () => callGeminiVisionJson({ systemPrompt: 'sys', userPrompt: 'user', images: [{ base64: 'AAAA', mimeType: 'image/png' }] }),
      /GEMINI_API_KEY/,
    );
  });
});

test('callGeminiVisionJson: throws when no images are provided (never silently calls with no evidence)', async () => {
  await withEnv('GEMINI_API_KEY', 'test-key', async () => {
    await assert.rejects(
      () => callGeminiVisionJson({ systemPrompt: 'sys', userPrompt: 'user', images: [] }),
      /no images provided/,
    );
  });
});

test('callGeminiVisionJson: sends one inlineData part per image plus the text prompt, JSON mode on', async () => {
  await withEnv('GEMINI_API_KEY', 'test-key', async () => {
    let capturedRaw: unknown = null;
    const restore = setFetch(async (_input, init) => {
      capturedRaw = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"name":"Forklift"}' }] } }] }), { status: 200 });
    });
    try {
      const text = await callGeminiVisionJson({
        systemPrompt: 'sys',
        userPrompt: 'user',
        images: [
          { base64: 'AAAA', mimeType: 'image/png' },
          { base64: 'BBBB', mimeType: 'image/jpeg' },
        ],
      });
      assert.equal(text, '{"name":"Forklift"}');
      assert.ok(capturedRaw);
      const capturedBody = capturedRaw as { contents: Array<{ parts: Array<Record<string, unknown>> }>; generationConfig: { responseMimeType: string } };
      const parts = capturedBody.contents[0].parts;
      assert.equal(parts.length, 3); // 1 text prompt + 2 images
      assert.deepEqual(parts[0], { text: 'user' });
      assert.deepEqual(parts[1], { inlineData: { mimeType: 'image/png', data: 'AAAA' } });
      assert.deepEqual(parts[2], { inlineData: { mimeType: 'image/jpeg', data: 'BBBB' } });
      assert.equal(capturedBody.generationConfig.responseMimeType, 'application/json');
    } finally {
      restore();
    }
  });
});

test('callGeminiVisionJson: throws on a non-OK HTTP response', async () => {
  await withEnv('GEMINI_API_KEY', 'test-key', async () => {
    const restore = setFetch(async () => new Response(JSON.stringify({ error: { message: 'API key expired' } }), { status: 400 }));
    try {
      await assert.rejects(
        () => callGeminiVisionJson({ systemPrompt: 'sys', userPrompt: 'user', images: [{ base64: 'A', mimeType: 'image/png' }] }),
        /gemini_vision_http_400/,
      );
    } finally {
      restore();
    }
  });
});

test('callGeminiVisionJson: throws when the response has no usable candidate text', async () => {
  await withEnv('GEMINI_API_KEY', 'test-key', async () => {
    const restore = setFetch(async () => new Response(JSON.stringify({ candidates: [] }), { status: 200 }));
    try {
      await assert.rejects(
        () => callGeminiVisionJson({ systemPrompt: 'sys', userPrompt: 'user', images: [{ base64: 'A', mimeType: 'image/png' }] }),
        /gemini_vision_empty_response/,
      );
    } finally {
      restore();
    }
  });
});

test('callGeminiVisionJson: passes an AbortSignal on the fetch init so a hung provider cannot block forever', async () => {
  await withEnv('GEMINI_API_KEY', 'test-key', async () => {
    let capturedSignal: unknown;
    const restore = setFetch(async (_input, init) => {
      capturedSignal = init?.signal;
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }), { status: 200 });
    });
    try {
      await callGeminiVisionJson({ systemPrompt: 'sys', userPrompt: 'user', images: [{ base64: 'A', mimeType: 'image/png' }] });
      assert.ok(capturedSignal instanceof AbortSignal);
    } finally {
      restore();
    }
  });
});

test('callGeminiVisionJson: a provider timeout rejects instead of hanging (mirrors what AbortSignal.timeout() throws)', async () => {
  await withEnv('GEMINI_API_KEY', 'test-key', async () => {
    const restore = setFetch(async () => {
      const timeoutError = new Error('The operation was aborted due to timeout');
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    });
    try {
      await assert.rejects(
        () => callGeminiVisionJson({ systemPrompt: 'sys', userPrompt: 'user', images: [{ base64: 'A', mimeType: 'image/png' }] }),
      );
    } finally {
      restore();
    }
  });
});
