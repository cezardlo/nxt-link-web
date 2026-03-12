type RateLimitConfig = {
  key: string;
  maxRequests: number;
  windowMs: number;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

const store = new Map<string, RateLimitState>();

function nowMs(): number {
  return Date.now();
}

function cleanupExpired(current: number) {
  store.forEach((state, key) => {
    if (state.resetAt <= current) {
      store.delete(key);
    }
  });
}

export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const current = nowMs();
  cleanupExpired(current);

  const existing = store.get(config.key);

  if (!existing || existing.resetAt <= current) {
    store.set(config.key, {
      count: 1,
      resetAt: current + config.windowMs,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      retryAfterMs: config.windowMs,
    };
  }

  if (existing.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(1, existing.resetAt - current),
    };
  }

  existing.count += 1;
  store.set(config.key, existing);

  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    retryAfterMs: Math.max(1, existing.resetAt - current),
  };
}
