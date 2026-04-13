import { GoogleGenAI } from '@google/genai';

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const DEFAULT_MODEL = 'gemini-2.5-flash';
const DAILY_REQUEST_LIMIT = 400;
const requestLog: Map<string, number> = new Map();

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function getRequestCount(agent: string): number {
  return requestLog.get(getTodayKey() + '_' + agent) || 0;
}

function incrementRequestCount(agent: string): void {
  const key = getTodayKey() + '_' + agent;
  requestLog.set(key, (requestLog.get(key) || 0) + 1);
  const today = getTodayKey();
  for (const k of requestLog.keys()) {
    if (!k.startsWith(today)) requestLog.delete(k);
  }
}

export interface JarvisAIRequest {
  agent: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  model?: string;
  temperature?: number;
}

export interface JarvisAIResponse {
  text: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  request_count_today: number;
}


async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (i < retries - 1 && (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand'))) {
        await new Promise(r => setTimeout(r, delayMs * Math.pow(2, i)));
        continue;
      }
      throw e;
    }
  }
  throw new Error('withRetry exhausted');
}

export async function askJarvis(req: JarvisAIRequest): Promise<JarvisAIResponse> {
  if (!GEMINI_KEY) {
    throw new Error('GEMINI_API_KEY not set. Get a free key at https://aistudio.google.com/apikey');
  }
  const agentLimit = Math.floor(DAILY_REQUEST_LIMIT / 3);
  const currentCount = getRequestCount(req.agent);
  if (currentCount >= agentLimit) {
    throw new Error('Daily request limit reached for ' + req.agent);
  }
  const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
  const model = req.model || DEFAULT_MODEL;
  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: req.userPrompt,
    config: {
      systemInstruction: req.systemPrompt,
      maxOutputTokens: req.maxTokens || 2000,
      temperature: req.temperature ?? 0.7,
    },
  }));
  incrementRequestCount(req.agent);
  const text = response.text || '';
  const usage = response.usageMetadata;
  return {
    text,
    model,
    input_tokens: usage?.promptTokenCount || 0,
    output_tokens: usage?.candidatesTokenCount || 0,
    cost: 0,
    request_count_today: getRequestCount(req.agent),
  };
}

export function parseJarvisJSON<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/{[\s\S]*}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as T;
    return fallback;
  } catch { return fallback; }
}

export function getJarvisUsageStats() {
  const today = getTodayKey();
  const agents: Record<string, number> = {};
  let total = 0;
  for (const [key, count] of requestLog.entries()) {
    if (key.startsWith(today)) {
      agents[key.replace(today + '_', '')] = count;
      total += count;
    }
  }
  return { date: today, agents, total, limit: DAILY_REQUEST_LIMIT };
}
