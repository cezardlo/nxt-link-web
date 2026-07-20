import { NextResponse, type NextRequest } from 'next/server';

/* -------------------------------------------------------------------------- */
/*  In-memory sliding-window rate limiter (Edge Runtime compatible)            */
/*                                                                            */
/*  On Vercel each edge instance keeps its own Map — this gives *per-instance */
/*  best-effort* protection.  For strict global enforcement, wire up Upstash  */
/*  (see the UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN env vars).     */
/* -------------------------------------------------------------------------- */

const WINDOW_MS = 60_000;        // 1 minute
const MAX_REQUESTS = 100;        // per IP per window

type BucketEntry = { count: number; resetAt: number };

const buckets = new Map<string, BucketEntry>();

// Periodic cleanup so the Map doesn't grow unbounded.
// Edge Runtime supports Date.now() but not setInterval —
// we piggyback cleanup onto every Nth request instead.
let requestsSinceCleanup = 0;
const CLEANUP_EVERY = 500;

function cleanup(now: number) {
  buckets.forEach((entry, key) => {
    if (entry.resetAt <= now) buckets.delete(key);
  });
}

function rateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();

  // Piggyback cleanup
  requestsSinceCleanup++;
  if (requestsSinceCleanup >= CLEANUP_EVERY) {
    requestsSinceCleanup = 0;
    cleanup(now);
  }

  const existing = buckets.get(ip);

  // No entry or window expired — start a new window
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + WINDOW_MS;
    buckets.set(ip, { count: 1, resetAt });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt };
  }

  // Window active — check if over the limit
  if (existing.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  // Increment
  existing.count += 1;
  return {
    allowed: true,
    remaining: MAX_REQUESTS - existing.count,
    resetAt: existing.resetAt,
  };
}

/* -------------------------------------------------------------------------- */
/*  Optional: Upstash-backed distributed rate limiter                         */
/*  Activated automatically when UPSTASH_REDIS_REST_URL and                   */
/*  UPSTASH_REDIS_REST_TOKEN are set.                                         */
/* -------------------------------------------------------------------------- */

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const useUpstash = Boolean(upstashUrl && upstashToken);

async function rateLimitUpstash(
  ip: string,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const bucket = Math.floor(Date.now() / WINDOW_MS);
  const bucketKey = `rl:mw:${ip}:${bucket}`;

  const res = await fetch(`${upstashUrl}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${upstashToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', bucketKey],
      ['PEXPIRE', bucketKey, String(WINDOW_MS), 'NX'],
      ['PTTL', bucketKey],
    ]),
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`Upstash error: ${res.status}`);

  type PipelineItem = { result?: unknown; error?: string };
  const data = (await res.json()) as PipelineItem[];
  if (!Array.isArray(data) || data.length < 3 || data.some((d) => d.error)) {
    throw new Error('Upstash pipeline invalid');
  }

  const currentCount = Math.max(1, Math.floor(Number(data[0]?.result) || 1));
  const ttlMs = Math.max(1, Math.floor(Number(data[2]?.result) || WINDOW_MS));
  const resetAt = Date.now() + ttlMs;

  return {
    allowed: currentCount <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - currentCount),
    resetAt,
  };
}

/* -------------------------------------------------------------------------- */
/*  Middleware                                                                 */
/* -------------------------------------------------------------------------- */

export async function middleware(request: NextRequest) {
  // ---- Request ID (preserve existing behaviour) --------------------------
  const requestId =
    request.headers.get('x-request-id') || crypto.randomUUID();
  const reqHeaders = new Headers(request.headers);
  reqHeaders.set('x-request-id', requestId);

  // ---- Rate limiting -----------------------------------------------------
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    '127.0.0.1';

  let rl: { allowed: boolean; remaining: number; resetAt: number };

  if (useUpstash) {
    try {
      rl = await rateLimitUpstash(ip);
    } catch {
      // Upstash unavailable — fall back to in-memory
      rl = rateLimit(ip);
    }
  } else {
    rl = rateLimit(ip);
  }

  const resetSeconds = Math.ceil(rl.resetAt / 1000);

  // ---- Blocked: 429 Too Many Requests ------------------------------------
  if (!rl.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
    return new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${retryAfter}s.`,
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(MAX_REQUESTS),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(resetSeconds),
          'x-request-id': requestId,
        },
      },
    );
  }

  // ---- Allowed: continue with rate-limit headers -------------------------
  const response = NextResponse.next({
    request: { headers: reqHeaders },
  });

  response.headers.set('x-request-id', requestId);
  response.headers.set('X-RateLimit-Limit', String(MAX_REQUESTS));
  response.headers.set('X-RateLimit-Remaining', String(rl.remaining));
  response.headers.set('X-RateLimit-Reset', String(resetSeconds));

  return response;
}

export const config = {
  // Only run middleware on API routes — page routes are static and must be
  // served directly from Vercel's CDN without middleware interference.
  matcher: ['/api/:path*'],
};
