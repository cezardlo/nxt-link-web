// src/lib/ollama/client.ts — Ollama API wrapper for local LLM inference

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'mistral';

// ─── Types ────────────────────────────────────────────────────────────────────

type OllamaGenerateResponse = {
  model: string;
  response: string;
  done: boolean;
};

type GeminiCandidate = {
  content: {
    parts: Array<{ text: string }>;
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
};

// ─── Gemini fallback ──────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

function isGeminiProvider(): boolean {
  return process.env.NXT_LINK_LLM_PROVIDER === 'gemini';
}

async function geminiGenerate(prompt: string, retries: number = 3): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.warn('[ollama/client] Gemini provider selected but GEMINI_API_KEY is not set');
    return '';
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 429 && attempt < retries - 1) {
        const waitSec = Math.pow(2, attempt + 1) * 5; // 10s, 20s, 40s
        console.warn(`[ollama/client] Gemini 429 rate limited — retrying in ${waitSec}s (attempt ${attempt + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, waitSec * 1000));
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        console.error(`[ollama/client] Gemini error ${res.status}:`, body.slice(0, 300));
        return '';
      }

      const data = (await res.json()) as GeminiResponse;
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('[ollama/client] Gemini request timed out after 60s');
      } else {
        console.error('[ollama/client] Gemini request failed:', err instanceof Error ? err.message : err);
      }
      return '';
    }
  }

  return '';
}

// ─── Ollama generate ──────────────────────────────────────────────────────────

/**
 * Call Ollama's /api/generate endpoint (or Gemini fallback).
 * Returns the generated text, or empty string on error.
 */
export async function ollamaGenerate(prompt: string, model?: string): Promise<string> {
  // Route to Gemini if configured
  if (isGeminiProvider()) {
    return geminiGenerate(prompt);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 2048,
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[ollama/client] generate error ${res.status}:`, body.slice(0, 300));
      return '';
    }

    const data = (await res.json()) as OllamaGenerateResponse;
    return data.response ?? '';
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[ollama/client] request timed out after 60s');
    } else {
      console.error('[ollama/client] request failed:', err instanceof Error ? err.message : err);
    }
    return '';
  } finally {
    clearTimeout(timeout);
  }
}

// ─── JSON extraction ──────────────────────────────────────────────────────────

/**
 * Call the LLM and parse the response as JSON.
 * Strips markdown ```json``` fences before parsing.
 * Returns null on parse failure.
 */
export async function ollamaExtractJSON<T>(prompt: string): Promise<T | null> {
  const raw = await ollamaGenerate(prompt);
  if (!raw) return null;

  // Strip markdown code fences
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.warn(
      '[ollama/client] JSON parse error:',
      err instanceof Error ? err.message : err,
      '\nRaw (first 500 chars):',
      raw.slice(0, 500),
    );
    return null;
  }
}

// ─── Availability check ──────────────────────────────────────────────────────

/**
 * Check whether the LLM backend is reachable.
 * For Ollama: GET /api/tags. For Gemini: checks that the API key is set.
 */
export async function isOllamaAvailable(): Promise<boolean> {
  if (isGeminiProvider()) {
    return Boolean(GEMINI_API_KEY);
  }

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
