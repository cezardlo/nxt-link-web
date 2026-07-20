import { checkRateLimit, type RateLimitConfig, type RateLimitResult } from '@/lib/http/rate-limit';

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

function parsePositiveNumber(value: unknown, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.floor(num);
}

function hasUpstashConfig(): boolean {
  return Boolean(upstashUrl && upstashToken);
}

async function checkRateLimitUpstash(config: RateLimitConfig): Promise<RateLimitResult> {
  const bucket = Math.floor(Date.now() / config.windowMs);
  const bucketKey = `rate-limit:${config.key}:${bucket}`;

  const res = await fetch(`${upstashUrl}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${upstashToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', bucketKey],
      ['PEXPIRE', bucketKey, String(config.windowMs), 'NX'],
      ['PTTL', bucketKey],
    ]),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Upstash rate limit request failed: ${res.status}`);
  }

  type PipelineItem = { result?: unknown; error?: string };
  const data = (await res.json()) as PipelineItem[];
  if (!Array.isArray(data) || data.length < 3 || data.some((item) => item.error)) {
    throw new Error('Upstash rate limit returned invalid pipeline response');
  }

  const currentCount = parsePositiveNumber(data[0]?.result, 1);
  const ttlMs = parsePositiveNumber(data[2]?.result, config.windowMs);

  return {
    allowed: currentCount <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - currentCount),
    retryAfterMs: ttlMs,
  };
}

export async function checkRateLimitDurable(config: RateLimitConfig): Promise<RateLimitResult> {
  if (!hasUpstashConfig()) {
    return checkRateLimit(config);
  }

  try {
    return await checkRateLimitUpstash(config);
  } catch {
    return checkRateLimit(config);
  }
}
