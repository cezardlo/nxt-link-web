type RetryOptions = {
  retries?: number;
  retryDelayMs?: number;
  retryOnStatuses?: number[];
  cacheKey?: string;
  cacheTtlMs?: number;
  staleIfErrorMs?: number;
  dedupeInFlight?: boolean;
  negativeCacheStatuses?: number[];
};

const DEFAULT_RETRY_STATUSES = [429, 500, 502, 503, 504];
const DEFAULT_NEGATIVE_CACHE_STATUSES = [404, 410, 429];
const MAX_CACHE_ENTRIES = 400;

type ResponseSnapshot = {
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  body: ArrayBuffer;
  capturedAt: number;
};

type CacheEntry = {
  snapshot: ResponseSnapshot;
  expiresAt: number;
  staleUntil: number;
};

const responseCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<Response>>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function methodFromInit(init?: RequestInit): string {
  return (init?.method || 'GET').toUpperCase();
}

function deriveCacheKey(input: RequestInfo | URL, init?: RequestInit): string {
  const method = methodFromInit(init);
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  return `${method}:${url}`;
}

function shouldCacheResponse(
  method: string,
  status: number,
  cacheTtlMs: number,
  negativeCacheStatuses: number[],
): boolean {
  if (cacheTtlMs <= 0) return false;
  if (method !== 'GET' && method !== 'HEAD') return false;
  if (status >= 200 && status < 400) return true;
  return negativeCacheStatuses.includes(status);
}

function restoreResponse(snapshot: ResponseSnapshot): Response {
  return new Response(snapshot.body.slice(0), {
    status: snapshot.status,
    statusText: snapshot.statusText,
    headers: snapshot.headers,
  });
}

async function snapshotResponse(response: Response): Promise<ResponseSnapshot> {
  const clone = response.clone();
  return {
    status: clone.status,
    statusText: clone.statusText,
    headers: Array.from(clone.headers.entries()),
    body: await clone.arrayBuffer(),
    capturedAt: Date.now(),
  };
}

function pruneCache(): void {
  const now = Date.now();
  for (const [key, entry] of Array.from(responseCache.entries())) {
    if (entry.staleUntil <= now) {
      responseCache.delete(key);
    }
  }
  if (responseCache.size <= MAX_CACHE_ENTRIES) return;
  const keys = Array.from(responseCache.keys());
  for (const key of keys.slice(0, responseCache.size - MAX_CACHE_ENTRIES)) {
    responseCache.delete(key);
  }
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: RetryOptions,
): Promise<Response> {
  const retries = options?.retries ?? 2;
  const retryDelayMs = options?.retryDelayMs ?? 400;
  const retryOnStatuses = options?.retryOnStatuses ?? DEFAULT_RETRY_STATUSES;
  const cacheTtlMs = options?.cacheTtlMs ?? 0;
  const staleIfErrorMs = options?.staleIfErrorMs ?? 0;
  const method = methodFromInit(init);
  const negativeCacheStatuses = options?.negativeCacheStatuses ?? DEFAULT_NEGATIVE_CACHE_STATUSES;
  const dedupeInFlight =
    options?.dedupeInFlight ?? (method === 'GET' || method === 'HEAD');
  const cacheKey = options?.cacheKey || deriveCacheKey(input, init);
  const now = Date.now();
  const cached = cacheTtlMs > 0 ? responseCache.get(cacheKey) : undefined;

  if (cached && cached.expiresAt > now) {
    return restoreResponse(cached.snapshot);
  }

  if (dedupeInFlight && inFlightRequests.has(cacheKey)) {
    const shared = inFlightRequests.get(cacheKey);
    if (shared) {
      const resolved = await shared;
      return resolved.clone();
    }
  }

  let attempt = 0;
  let lastError: unknown;
  let lastResponseStatus: number | null = null;
  const runner = async (): Promise<Response> => {
    while (attempt <= retries) {
      try {
        const response = await fetch(input, init);
        lastResponseStatus = response.status;
        if (!retryOnStatuses.includes(response.status) || attempt === retries) {
          if (shouldCacheResponse(method, response.status, cacheTtlMs, negativeCacheStatuses)) {
            const snapshot = await snapshotResponse(response);
            responseCache.set(cacheKey, {
              snapshot,
              expiresAt: now + cacheTtlMs,
              staleUntil: now + cacheTtlMs + staleIfErrorMs,
            });
            pruneCache();
          }
          return response;
        }

        const jitterMs = Math.floor(Math.random() * 140);
        await sleep(retryDelayMs * (attempt + 1) + jitterMs);
      } catch (error) {
        lastError = error;
        if (attempt === retries) {
          break;
        }
        const jitterMs = Math.floor(Math.random() * 140);
        await sleep(retryDelayMs * (attempt + 1) + jitterMs);
      }

      attempt += 1;
    }

    if (cached && cached.staleUntil > Date.now() && staleIfErrorMs > 0) {
      return restoreResponse(cached.snapshot);
    }

    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new Error(
      `Request failed after retries.${lastResponseStatus ? ` Last status: ${lastResponseStatus}.` : ''}`,
    );
  };

  if (dedupeInFlight) {
    const promise = runner();
    inFlightRequests.set(cacheKey, promise);
    try {
      const response = await promise;
      return response.clone();
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  }

  return runner();
}
