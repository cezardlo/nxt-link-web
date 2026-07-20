import assert from 'node:assert/strict';
import test from 'node:test';

import {
  estimateMessageTokens,
  getConfiguredProviders,
  getProviderUsageSnapshot,
  pickConsensusCandidate,
  stableJsonStringify,
} from '@/lib/llm/parallel-router';

test('getConfiguredProviders returns providers from env flags', () => {
  const providers = getConfiguredProviders({
    OPENROUTER_API_KEY: 'x',
    GROQ_API_KEY: 'y',
    OLLAMA_BASE_URL: 'http://localhost:11434',
    TOGETHER_API_KEY: 'z',
    NODE_ENV: 'test',
  } as NodeJS.ProcessEnv);

  assert.equal(providers.length, 4);
  assert.equal(providers[0]?.provider, 'openrouter');
  assert.equal(providers[1]?.provider, 'groq');
  assert.equal(providers[2]?.provider, 'ollama');
  assert.equal(providers[3]?.provider, 'together');
});

test('getConfiguredProviders includes gemini when GEMINI_API_KEY is set', () => {
  const providers = getConfiguredProviders({
    GEMINI_API_KEY: 'g',
    NODE_ENV: 'test',
  } as NodeJS.ProcessEnv);

  assert.equal(providers.length, 1);
  assert.equal(providers[0]?.provider, 'gemini');
  assert.equal(providers[0]?.model, 'gemini-2.0-flash');
});

test('estimateMessageTokens returns deterministic positive estimate', () => {
  const a = estimateMessageTokens([
    { role: 'system', content: 'Return JSON only' },
    { role: 'user', content: 'Analyze logistics vendors in El Paso' },
  ]);

  const b = estimateMessageTokens([
    { role: 'system', content: 'Return JSON only' },
    { role: 'user', content: 'Analyze logistics vendors in El Paso' },
  ]);

  assert.ok(a > 0);
  assert.equal(a, b);
});

test('getProviderUsageSnapshot respects provider daily budget env', () => {
  const snapshot = getProviderUsageSnapshot('openrouter', {
    OPENROUTER_DAILY_TOKEN_BUDGET: '1000',
    NODE_ENV: 'test',
  } as NodeJS.ProcessEnv);

  assert.equal(snapshot.dailyBudgetTokens, 1000);
  assert.ok(snapshot.usedTokens >= 0);
});

test('stableJsonStringify sorts object keys deterministically', () => {
  const a = stableJsonStringify({ b: 2, a: 1 });
  const b = stableJsonStringify({ a: 1, b: 2 });
  assert.equal(a, b);
});

test('pickConsensusCandidate chooses majority JSON result', () => {
  const winner = pickConsensusCandidate([
    {
      provider: 'openrouter',
      parsed: { value: 1, items: ['x'] },
      raw: '{"value":1,"items":["x"]}',
    },
    {
      provider: 'groq',
      parsed: { items: ['x'], value: 1 },
      raw: '{"items":["x"],"value":1}',
    },
    {
      provider: 'openai',
      parsed: { value: 2, items: ['y'] },
      raw: '{"value":2,"items":["y"]}',
    },
  ]);

  assert.ok(winner);
  assert.equal(winner?.provider, 'openrouter');
  assert.equal((winner?.parsed as { value: number }).value, 1);
});
