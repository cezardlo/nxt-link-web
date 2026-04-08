export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getConfiguredProviders } from '@/lib/llm/parallel-router';


// 4-tier LLM fallback chain for industry topic explanations:
// Tier 1: Ollama   (local — fastest, free, private)
// Tier 2: Groq     (cloud — fast inference, cheap)
// Tier 3: Gemini   (cloud — Google, high quality)
// Tier 4: OpenRouter (cloud — multi-model fallback)
// Tier 5: Static plain-language fallback (always available)

type ExplainRequest = {
  topic: string;
  industry?: string;
};

type ExplainResult = {
  what: string;
  why: string;
  who: string[];
  analogy: string;
};

const STATIC_FALLBACK: ExplainResult = {
  what: 'This technology helps companies work smarter and faster by automating tasks that used to be done manually.',
  why: 'It saves time, reduces errors, and helps companies stay competitive in a fast-moving market.',
  who: ['Amazon', 'Google', 'Microsoft'],
  analogy:
    'Think of it like upgrading from a bicycle to a car — same destination, but much faster and more efficient.',
};

function buildPrompt(topic: string, industry: string): string {
  return `You are an industry technology explainer. Explain the following topic in simple, everyday language that anyone can understand. No jargon. Use short sentences. Include:
1. What it is (2-3 sentences)
2. Why it matters (2-3 sentences)
3. Who uses it (list 3-5 companies)
4. A simple analogy that makes it click

Topic: ${topic}
Industry context: ${industry}

Return ONLY valid JSON matching this exact schema (no markdown, no preamble):
{
  "what": "...",
  "why": "...",
  "who": ["Company 1", "Company 2", "..."],
  "analogy": "..."
}`;
}

function isValidResult(r: unknown): r is ExplainResult {
  if (typeof r !== 'object' || r === null) return false;
  const obj = r as Record<string, unknown>;
  return (
    typeof obj.what === 'string' &&
    typeof obj.why === 'string' &&
    Array.isArray(obj.who) &&
    typeof obj.analogy === 'string'
  );
}

// Call an OpenAI-compatible provider (Groq, OpenRouter, Together, OpenAI)
async function callOpenAiCompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs = 12000,
): Promise<ExplainResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 512,
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content ?? '';
    return JSON.parse(text) as ExplainResult;
  } finally {
    clearTimeout(timer);
  }
}

// Call Ollama (local — different format, no auth)
async function callOllama(
  baseUrl: string,
  model: string,
  prompt: string,
  timeoutMs = 8000,
): Promise<ExplainResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        format: 'json',
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json() as { message?: { content?: string }; response?: string };
    const text = json.message?.content ?? json.response ?? '';
    return JSON.parse(text) as ExplainResult;
  } finally {
    clearTimeout(timer);
  }
}

// Call Gemini REST API (different format from OpenAI)
async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs = 12000,
): Promise<ExplainResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.4,
            maxOutputTokens: 512,
          },
        }),
        signal: ctrl.signal,
      },
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return JSON.parse(text) as ExplainResult;
  } finally {
    clearTimeout(timer);
  }
}

async function callAnthropic(
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs = 15000,
): Promise<ExplainResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json() as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = json.content?.find((b) => b.type === 'text')?.text ?? '';
    return JSON.parse(text) as ExplainResult;
  } finally {
    clearTimeout(timer);
  }
}

// POST /api/industry/explain
// Body: { topic: string, industry?: string }
// Returns: { ok: true, explanation: ExplainResult, _provider: string }
export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `industry-explain:${ip}`, maxRequests: 30, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const body = await request.json() as ExplainRequest;
  const topic = (body.topic ?? '').trim();

  if (!topic) {
    return NextResponse.json({ ok: false, message: 'topic is required.' }, { status: 400 });
  }

  if (topic.length < 5 || topic.length > 500) {
    return NextResponse.json(
      { ok: false, message: 'topic must be between 5 and 500 characters.' },
      { status: 400 },
    );
  }

  const industry = (body.industry ?? '').trim() || 'general technology';
  const prompt = buildPrompt(topic, industry);
  const providers = getConfiguredProviders();

  const PROVIDER_ORDER = ['anthropic', 'ollama', 'groq', 'gemini', 'openrouter', 'together', 'openai'] as const;

  const sortedProviders = [...providers].sort((a, b) => {
    const ai = PROVIDER_ORDER.indexOf(a.provider as (typeof PROVIDER_ORDER)[number]);
    const bi = PROVIDER_ORDER.indexOf(b.provider as (typeof PROVIDER_ORDER)[number]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  for (const config of sortedProviders) {
    try {
      let result: ExplainResult;

      if (config.provider === 'anthropic') {
        result = await callAnthropic(config.apiKey!, config.model, prompt);
      } else if (config.provider === 'ollama') {
        const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';
        result = await callOllama(baseUrl, config.model, prompt);
      } else if (config.provider === 'gemini') {
        result = await callGemini(config.apiKey!, config.model, prompt);
      } else {
        result = await callOpenAiCompatible(config.endpoint, config.apiKey!, config.model, prompt);
      }

      if (isValidResult(result)) {
        return NextResponse.json(
          { ok: true, explanation: result, _provider: config.provider },
          { headers: { 'Cache-Control': 'no-store' } },
        );
      }
    } catch {
      // Provider failed — try next tier
      continue;
    }
  }

  // All providers failed or none configured — return static fallback
  return NextResponse.json(
    { ok: true, explanation: STATIC_FALLBACK, _provider: 'static' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
