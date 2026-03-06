import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getIndustryBySlug } from '@/lib/data/technology-catalog';
import { runIndustryScan, type IndustryScanResult } from '@/lib/intelligence/industry-scan';

export const dynamic = 'force-dynamic';

// ── In-memory cache (1-hour TTL, keyed by slug) ───────────────────────────────

type CacheEntry = {
  result: IndustryScanResult;
  cachedAt: number;
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const scanCache = new Map<string, CacheEntry>();

// ── Route context ─────────────────────────────────────────────────────────────

type RouteContext = { params: Promise<{ slug: string }> };

// ── GET /api/industry/[slug]/products ─────────────────────────────────────────

export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  const { slug } = await context.params;

  // Rate limit: 20 requests per IP per minute — scans are expensive
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `industry-products:${ip}`, maxRequests: 20, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  // Validate slug against known industries
  const industry = getIndustryBySlug(slug);

  if (!industry) {
    return NextResponse.json(
      { ok: false, message: `Industry slug '${slug}' not found.` },
      { status: 404 },
    );
  }

  // Return cached result if still fresh
  const cached = scanCache.get(slug);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(
      {
        ok: true,
        industry: { slug: industry.slug, label: industry.label, color: industry.color },
        scan: cached.result,
        _cache: 'hit',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // Run fresh scan
  try {
    const scanResult = await runIndustryScan({
      industry: industry.label,
      region: 'El Paso',
      maxSources: 30,
    });

    scanCache.set(slug, { result: scanResult, cachedAt: Date.now() });

    return NextResponse.json(
      {
        ok: true,
        industry: { slug: industry.slug, label: industry.label, color: industry.color },
        scan: scanResult,
        _cache: 'miss',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during industry scan.';
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
