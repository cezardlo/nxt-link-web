// Minimal, direct Gemini multimodal (image + text) call — used ONLY for
// photo-based listing extraction (src/lib/marketplace/extract.ts). This is
// intentionally NOT part of runParallelJsonEnsemble (src/lib/llm/parallel-router.ts):
// that router's provider abstraction is text-only (ChatMessage.content is a
// plain string), and every configured provider except Gemini has no vision
// support, so a "parallel image ensemble" would just be Gemini-or-nothing
// with extra weight. This helper mirrors the router's proven Gemini request
// shape (same endpoint, same generationConfig.responseMimeType JSON mode,
// same fetchWithRetry usage) and adds `inlineData` image parts.
//
// Fails closed: throws on missing key / bad response / empty content. Callers
// (extractListingDraftFromImages) MUST catch and degrade to the same
// friendly "AI unavailable" draft used by the text path — never let a raw
// provider error reach the vendor.

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';

export interface GeminiImagePart {
  /** Raw base64 (no "data:image/...;base64," prefix). */
  base64: string;
  mimeType: string;
}

export interface GeminiVisionInput {
  systemPrompt: string;
  userPrompt: string;
  images: GeminiImagePart[];
  temperature?: number;
}

/** Call Gemini's generateContent with image parts and return the raw text
 * response (expected to be a JSON string — caller parses it). Throws on any
 * failure; never returns a partial/garbage result silently. */
export async function callGeminiVisionJson(input: GeminiVisionInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
  if (!input.images.length) throw new Error('no images provided');

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const parts: Array<Record<string, unknown>> = [{ text: input.userPrompt }];
  for (const img of input.images) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
  }

  const body = {
    systemInstruction: { parts: [{ text: input.systemPrompt }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: input.temperature ?? 0.2,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetchWithRetry(
    endpoint,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    },
    { retries: 1, retryDelayMs: 600, dedupeInFlight: false },
  );

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(`gemini_vision_http_${response.status}`);
  }

  const candidates = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string | null }> } }> } | null)?.candidates;
  const text = candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('gemini_vision_empty_response');
  }
  return text;
}
