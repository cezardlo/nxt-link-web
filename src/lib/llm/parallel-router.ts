import { fetchWithRetry } from '@/lib/http/fetch-with-retry';

export type LlmProviderName = 'gemini' | 'openrouter' | 'groq' | 'ollama' | 'openai' | 'together' | 'anthropic' | 'nvidia';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ProviderConfig = {
  provider: LlmProviderName;
  model: string;
  endpoint: string;
  apiKey?: string;
};

export type RouterBudgetOptions = {
  maxTotalEstimatedTokens?: number;
  maxProviders?: number;
  reserveCompletionTokens?: number;
  providerMaxEstimatedTokens?: Partial<Record<LlmProviderName, number>>;
  preferLowCostProviders?: boolean;
};

export type ProviderUsageSummary = {
  provider: LlmProviderName;
  model: string;
  estimatedPromptTokens: number;
  estimatedCompletionTokens: number;
  totalEstimatedTokens: number;
  dailyBudgetTokens: number | null;
  dailyUsedTokens: number;
};

type ProviderSuccess = {
  provider: LlmProviderName;
  model: string;
  content: string;
  latencyMs: number;
};

type ProviderFailure = {
  provider: LlmProviderName;
  model: string;
  error: string;
};

type ParsedCandidate<T> = {
  provider: LlmProviderName;
  parsed: T;
  raw: string;
};

const providerPriority: LlmProviderName[] = ['anthropic', 'nvidia', 'gemini', 'openrouter', 'groq', 'ollama', 'together', 'openai'];
const lowCostProviderPriority: LlmProviderName[] = ['nvidia', 'gemini', 'ollama', 'openrouter', 'groq', 'together', 'openai', 'anthropic'];

type UsageCounter = {
  day: string;
  tokens: number;
};

const usageLedger = new Map<LlmProviderName, UsageCounter>();

function parseOpenAiStyleContent(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const value = payload as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = value.choices?.[0]?.message?.content;
  return typeof content === 'string' && content.trim() ? content : null;
}

function parseOllamaContent(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const value = payload as {
    message?: { content?: string | null };
    response?: string | null;
  };
  const content = value.message?.content || value.response;
  return typeof content === 'string' && content.trim() ? content : null;
}

function parseGeminiContent(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const value = payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string | null }>;
      };
    }>;
  };
  const text = value.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === 'string' && text.trim() ? text : null;
}

function parseAnthropicContent(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const value = payload as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const textBlock = value.content?.find((b) => b.type === 'text');
  return typeof textBlock?.text === 'string' && textBlock.text.trim() ? textBlock.text : null;
}

function ensureJsonModeMessage(messages: ChatMessage[]): ChatMessage[] {
  return [
    ...messages,
    {
      role: 'user',
      content: 'Return valid JSON only. Do not include markdown code fences.',
    },
  ];
}

function parseProviderLock(
  value: string | undefined,
): LlmProviderName[] {
  if (!value) return [];
  const supported: LlmProviderName[] = ['gemini', 'openrouter', 'groq', 'ollama', 'together', 'openai', 'anthropic', 'nvidia'];
  const allowed = new Set(supported);
  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry): entry is LlmProviderName => allowed.has(entry as LlmProviderName));
}

export function getConfiguredProviders(env: NodeJS.ProcessEnv = process.env): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  if (env.GEMINI_API_KEY) {
    providers.push({
      provider: 'gemini',
      model: env.GEMINI_MODEL || 'gemini-2.0-flash',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      apiKey: env.GEMINI_API_KEY,
    });
  }

  if (env.OPENROUTER_API_KEY) {
    providers.push({
      provider: 'openrouter',
      model: env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: env.OPENROUTER_API_KEY,
    });
  }

  if (env.GROQ_API_KEY) {
    providers.push({
      provider: 'groq',
      model: env.GROQ_MODEL || 'llama-3.1-8b-instant',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: env.GROQ_API_KEY,
    });
  }

  if (env.OLLAMA_BASE_URL || env.OLLAMA_MODEL) {
    providers.push({
      provider: 'ollama',
      model: env.OLLAMA_MODEL || 'llama3.2:3b',
      endpoint: `${(env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '')}/api/chat`,
    });
  }

  if (env.OPENAI_API_KEY) {
    providers.push({
      provider: 'openai',
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      apiKey: env.OPENAI_API_KEY,
    });
  }

  if (env.TOGETHER_API_KEY) {
    providers.push({
      provider: 'together',
      model: env.TOGETHER_MODEL || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
      endpoint: 'https://api.together.xyz/v1/chat/completions',
      apiKey: env.TOGETHER_API_KEY,
    });
  }

  if (env.ANTHROPIC_API_KEY) {
    providers.push({
      provider: 'anthropic',
      model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      endpoint: 'https://api.anthropic.com/v1/messages',
      apiKey: env.ANTHROPIC_API_KEY,
    });
  }

  if (env.NVIDIA_API_KEY) {
    providers.push({
      provider: 'nvidia',
      model: env.NVIDIA_MODEL || 'nvidia/llama-3.1-nemotron-ultra-253b-v1',
      endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
      apiKey: env.NVIDIA_API_KEY,
    });
  }

  return providers;
}

function providerRank(provider: LlmProviderName): number {
  const index = providerPriority.indexOf(provider);
  return index === -1 ? 999 : index;
}

function providerLowCostRank(provider: LlmProviderName): number {
  const index = lowCostProviderPriority.indexOf(provider);
  return index === -1 ? 999 : index;
}

function getUtcDayKey(timestamp = Date.now()): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function readPositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed <= 0) return null;
  return Math.round(parsed);
}

function estimateTextTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 1;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

export function estimateMessageTokens(messages: ChatMessage[]): number {
  const raw = messages.reduce((total, message) => total + estimateTextTokens(message.content), 0);
  return raw + messages.length * 8;
}

function getProviderDefaultDailyBudget(
  provider: LlmProviderName,
  env: NodeJS.ProcessEnv = process.env,
): number | null {
  const providerValue = readPositiveInt(env[`${provider.toUpperCase()}_DAILY_TOKEN_BUDGET`]);
  if (providerValue !== null) {
    return providerValue;
  }
  const sharedValue = readPositiveInt(env.LLM_DAILY_TOKEN_BUDGET);
  return sharedValue;
}

function getProviderUsageCounter(
  provider: LlmProviderName,
  timestamp = Date.now(),
): UsageCounter {
  const day = getUtcDayKey(timestamp);
  const existing = usageLedger.get(provider);
  if (!existing || existing.day !== day) {
    const next = { day, tokens: 0 };
    usageLedger.set(provider, next);
    return next;
  }
  return existing;
}

function getProviderUsedTokens(provider: LlmProviderName, timestamp = Date.now()): number {
  return getProviderUsageCounter(provider, timestamp).tokens;
}

export function getProviderUsageSnapshot(
  provider: LlmProviderName,
  env: NodeJS.ProcessEnv = process.env,
): {
  usedTokens: number;
  dailyBudgetTokens: number | null;
  remainingTokens: number | null;
} {
  const dailyBudgetTokens = getProviderDefaultDailyBudget(provider, env);
  const usedTokens = getProviderUsedTokens(provider);
  const remainingTokens =
    dailyBudgetTokens === null ? null : Math.max(0, dailyBudgetTokens - usedTokens);

  return { usedTokens, dailyBudgetTokens, remainingTokens };
}

function getProviderRemainingBudget(
  provider: LlmProviderName,
  env: NodeJS.ProcessEnv = process.env,
): number {
  const budget = getProviderDefaultDailyBudget(provider, env);
  if (budget === null) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, budget - getProviderUsedTokens(provider));
}

function recordProviderUsage(provider: LlmProviderName, estimatedTokens: number): void {
  if (!Number.isFinite(estimatedTokens) || estimatedTokens <= 0) return;
  const counter = getProviderUsageCounter(provider);
  counter.tokens += Math.round(estimatedTokens);
}

function applyBudgetSelection(
  providers: ProviderConfig[],
  estimatedPromptTokens: number,
  budget?: RouterBudgetOptions,
  env: NodeJS.ProcessEnv = process.env,
): ProviderConfig[] {
  if (providers.length === 0) return [];

  const reserveCompletionTokens = Math.max(0, budget?.reserveCompletionTokens ?? 500);
  const estimatedTotalPerProvider = estimatedPromptTokens + reserveCompletionTokens;

  const globalMaxTokens = budget?.maxTotalEstimatedTokens;
  const globalMaxProviders = budget?.maxProviders;

  let remainingGlobal = Number.POSITIVE_INFINITY;
  if (Number.isFinite(globalMaxTokens ?? Number.NaN) && typeof globalMaxTokens === 'number' && globalMaxTokens > 0) {
    remainingGlobal = globalMaxTokens;
  }

  const sorted = [...providers].sort((a, b) => {
    if (budget?.preferLowCostProviders) {
      const costDiff = providerLowCostRank(a.provider) - providerLowCostRank(b.provider);
      if (costDiff !== 0) return costDiff;
    }
    return providerRank(a.provider) - providerRank(b.provider);
  });

  const selected: ProviderConfig[] = [];
  for (const provider of sorted) {
    if (typeof globalMaxProviders === 'number' && globalMaxProviders > 0 && selected.length >= globalMaxProviders) {
      break;
    }

    const providerCap = budget?.providerMaxEstimatedTokens?.[provider.provider];
    if (typeof providerCap === 'number' && providerCap > 0 && estimatedTotalPerProvider > providerCap) {
      continue;
    }

    const providerRemaining = getProviderRemainingBudget(provider.provider, env);
    if (Number.isFinite(providerRemaining) && providerRemaining < estimatedTotalPerProvider) {
      continue;
    }

    if (Number.isFinite(remainingGlobal) && remainingGlobal < estimatedTotalPerProvider) {
      continue;
    }

    selected.push(provider);
    if (Number.isFinite(remainingGlobal)) {
      remainingGlobal -= estimatedTotalPerProvider;
    }
  }

  if (selected.length > 0) {
    return selected;
  }

  // Never hard-fail purely on budget heuristics; return best candidate for graceful degradation.
  return [sorted[0]];
}

export function stableJsonStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJsonStringify(entry)).join(',')}]`;
  }
  const objectValue = value as Record<string, unknown>;
  const keys = Object.keys(objectValue).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableJsonStringify(objectValue[key])}`)
    .join(',')}}`;
}

export function pickConsensusCandidate<T>(candidates: ParsedCandidate<T>[]): ParsedCandidate<T> | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const grouped = new Map<
    string,
    { count: number; best: ParsedCandidate<T> }
  >();

  for (const candidate of candidates) {
    const key = stableJsonStringify(candidate.parsed);
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { count: 1, best: candidate });
      continue;
    }
    const better =
      providerRank(candidate.provider) < providerRank(existing.best.provider)
        ? candidate
        : existing.best;
    grouped.set(key, { count: existing.count + 1, best: better });
  }

  const winners = Array.from(grouped.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return providerRank(a.best.provider) - providerRank(b.best.provider);
  });

  return winners[0]?.best || null;
}

async function callProvider(
  config: ProviderConfig,
  messages: ChatMessage[],
  temperature: number,
): Promise<ProviderSuccess> {
  const startedAt = Date.now();
  const jsonModeMessages = ensureJsonModeMessage(messages);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey && config.provider !== 'gemini') {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  if (config.provider === 'anthropic') {
    headers['x-api-key'] = config.apiKey || '';
    headers['anthropic-version'] = '2023-06-01';
    delete headers.Authorization;
  }
  if (config.provider === 'openrouter') {
    headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL || 'https://nxtlinktech.com';
    headers['X-Title'] = 'NXT LINK Command Monitor';
  }

  const requestTarget =
    config.provider === 'gemini'
      ? `${config.endpoint}/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(
          config.apiKey || '',
        )}`
      : config.provider === 'anthropic'
        ? config.endpoint
        : config.endpoint;

  const body =
    config.provider === 'ollama'
      ? {
          model: config.model,
          messages: jsonModeMessages,
          stream: false,
          format: 'json',
          options: {
            temperature,
          },
        }
      : config.provider === 'gemini'
        ? {
            systemInstruction: {
              parts: [{ text: messages.find((message) => message.role === 'system')?.content || '' }],
            },
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: jsonModeMessages
                      .filter((message) => message.role !== 'system')
                      .map((message) => message.content)
                      .join('\n\n'),
                  },
                ],
              },
            ],
            generationConfig: {
              temperature,
              responseMimeType: 'application/json',
            },
          }
        : config.provider === 'anthropic'
          ? {
              model: config.model,
              max_tokens: 2048,
              messages: jsonModeMessages
                .filter((message) => message.role !== 'system')
                .map((message) => ({ role: message.role === 'assistant' ? 'assistant' : 'user', content: message.content })),
              system: messages.find((message) => message.role === 'system')?.content || '',
            }
          : {
              model: config.model,
              temperature,
              response_format: { type: 'json_object' },
              messages: jsonModeMessages,
            };

  const response = await fetchWithRetry(
    requestTarget,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    },
    {
      retries: 1,
      retryDelayMs: 600,
      dedupeInFlight: false,
    },
  );

  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(
      `Provider ${config.provider} failed with ${response.status}: ${
        typeof payload === 'object' && payload && 'error' in payload
          ? JSON.stringify((payload as { error?: unknown }).error)
          : 'unknown_error'
      }`,
    );
  }

  const content =
    config.provider === 'ollama'
      ? parseOllamaContent(payload)
      : config.provider === 'gemini'
        ? parseGeminiContent(payload)
        : config.provider === 'anthropic'
          ? parseAnthropicContent(payload)
          : parseOpenAiStyleContent(payload);

  if (!content) {
    throw new Error(`Provider ${config.provider} returned empty content.`);
  }

  return {
    provider: config.provider,
    model: config.model,
    content,
    latencyMs: Date.now() - startedAt,
  };
}

export async function runParallelJsonEnsemble<T>(input: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  budget?: RouterBudgetOptions;
  preferredProviders?: LlmProviderName[];
  maxProviders?: number;
  parse: (content: string, provider: LlmProviderName) => T;
}): Promise<{
  result: T;
  selectedProvider: LlmProviderName;
  successes: ProviderSuccess[];
  failures: ProviderFailure[];
  usage: ProviderUsageSummary[];
}> {
  const configuredProviders = getConfiguredProviders();
  if (configuredProviders.length === 0) {
    throw new Error(
      'No AI provider configured. Set at least one: ANTHROPIC_API_KEY, GEMINI_API_KEY, NVIDIA_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY, OLLAMA_BASE_URL/OLLAMA_MODEL, TOGETHER_API_KEY, OPENAI_API_KEY.',
    );
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: input.systemPrompt },
    { role: 'user', content: input.userPrompt },
  ];
  const estimatedPromptTokens = estimateMessageTokens(ensureJsonModeMessage(messages));

  let providers = configuredProviders;
  const providerLock = parseProviderLock(process.env.NXT_LINK_LLM_PROVIDER);
  if (providerLock.length > 0) {
    const locked = configuredProviders.filter((provider) => providerLock.includes(provider.provider));
    if (locked.length > 0) {
      providers = locked;
    }
  }

  if (input.preferredProviders && input.preferredProviders.length > 0) {
    const allowed = new Set(input.preferredProviders);
    const preferredSubset = configuredProviders.filter((provider) => allowed.has(provider.provider));
    if (preferredSubset.length > 0) {
      providers = preferredSubset;
    }
  }

  providers = applyBudgetSelection(
    providers,
    estimatedPromptTokens,
    {
      ...(input.budget || {}),
      maxProviders: input.maxProviders ?? input.budget?.maxProviders,
    },
  );

  const settled = await Promise.allSettled(
    providers.map((provider) =>
      callProvider(provider, messages, input.temperature ?? 0.1),
    ),
  );

  const successes: ProviderSuccess[] = [];
  const failures: ProviderFailure[] = [];
  const usageMap = new Map<LlmProviderName, ProviderUsageSummary>();
  settled.forEach((result, index) => {
    const provider = providers[index];
    if (!provider) return;
    if (result.status === 'fulfilled') {
      successes.push(result.value);
      const completionTokens = estimateTextTokens(result.value.content);
      const totalEstimatedTokens = estimatedPromptTokens + completionTokens;
      recordProviderUsage(provider.provider, totalEstimatedTokens);
      usageMap.set(provider.provider, {
        provider: provider.provider,
        model: provider.model,
        estimatedPromptTokens,
        estimatedCompletionTokens: completionTokens,
        totalEstimatedTokens,
        dailyBudgetTokens: getProviderDefaultDailyBudget(provider.provider),
        dailyUsedTokens: getProviderUsedTokens(provider.provider),
      });
      return;
    }
    recordProviderUsage(provider.provider, estimatedPromptTokens);
    failures.push({
      provider: provider.provider,
      model: provider.model,
      error: result.reason instanceof Error ? result.reason.message : 'provider_error',
    });
    usageMap.set(provider.provider, {
      provider: provider.provider,
      model: provider.model,
      estimatedPromptTokens,
      estimatedCompletionTokens: 0,
      totalEstimatedTokens: estimatedPromptTokens,
      dailyBudgetTokens: getProviderDefaultDailyBudget(provider.provider),
      dailyUsedTokens: getProviderUsedTokens(provider.provider),
    });
  });

  const parsedCandidates: ParsedCandidate<T>[] = [];
  const parseFailures: string[] = [];
  for (const success of successes) {
    try {
      const parsed = input.parse(success.content, success.provider);
      parsedCandidates.push({
        provider: success.provider,
        parsed,
        raw: success.content,
      });
    } catch (error) {
      parseFailures.push(
        `${success.provider}: ${error instanceof Error ? error.message : 'parse_error'}`,
      );
    }
  }

  const winner = pickConsensusCandidate(parsedCandidates);
  if (!winner) {
    const failureText = failures.map((entry) => `${entry.provider}: ${entry.error}`).join(' | ');
    const parseText = parseFailures.join(' | ');
    throw new Error(
      `All AI providers failed to produce valid JSON. Provider failures: ${failureText || 'none'}. Parse failures: ${
        parseText || 'none'
      }.`,
    );
  }

  return {
    result: winner.parsed,
    selectedProvider: winner.provider,
    successes,
    failures,
    usage: Array.from(usageMap.values()),
  };
}

export async function runParallelJsonTaskBatch<T>(input: {
  systemPrompt: string;
  tasks: Array<{
    taskId: string;
    userPrompt: string;
    parse: (content: string, provider: LlmProviderName) => T;
  }>;
  temperature?: number;
  budget?: RouterBudgetOptions;
  preferredProviders?: LlmProviderName[];
  maxProvidersPerTask?: number;
  maxConcurrency?: number;
}): Promise<{
  results: Array<{
    taskId: string;
    result: T;
    selectedProvider: LlmProviderName;
  }>;
  failures: Array<{
    taskId: string;
    error: string;
  }>;
}> {
  if (input.tasks.length === 0) {
    return { results: [], failures: [] };
  }

  const maxConcurrency = Math.max(1, Math.min(input.maxConcurrency ?? 4, input.tasks.length));
  const queue = [...input.tasks];
  const results: Array<{ taskId: string; result: T; selectedProvider: LlmProviderName }> = [];
  const failures: Array<{ taskId: string; error: string }> = [];

  const workers = Array.from({ length: maxConcurrency }, async () => {
    while (queue.length > 0) {
      const task = queue.shift();
      if (!task) return;
      try {
        const output = await runParallelJsonEnsemble<T>({
          systemPrompt: input.systemPrompt,
          userPrompt: task.userPrompt,
          temperature: input.temperature,
          budget: input.budget,
          preferredProviders: input.preferredProviders,
          maxProviders: input.maxProvidersPerTask,
          parse: task.parse,
        });
        results.push({
          taskId: task.taskId,
          result: output.result,
          selectedProvider: output.selectedProvider,
        });
      } catch (error) {
        failures.push({
          taskId: task.taskId,
          error: error instanceof Error ? error.message : 'task_failed',
        });
      }
    }
  });

  await Promise.all(workers);

  results.sort((a, b) => a.taskId.localeCompare(b.taskId));
  failures.sort((a, b) => a.taskId.localeCompare(b.taskId));

  return { results, failures };
}
