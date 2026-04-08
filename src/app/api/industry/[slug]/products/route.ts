export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { getIndustryBySlug } from '@/lib/data/technology-catalog';
import { runIndustryScan, type IndustryScanResult } from '@/lib/intelligence/industry-scan';
import { upsertDynamicIndustry, bumpIndustryPopularity } from '@/db/queries/dynamic-industries';

export const maxDuration = 30;

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
// Works for both known industries (ai-ml, defense, etc.) and custom queries
// (window-cleaning, warehouse-automation, solar-panel-maintenance, etc.)

export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  const { slug } = await context.params;

  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `industry-products:${ip}`, maxRequests: 20, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  // Check if it's a known industry or a custom query
  const knownIndustry = getIndustryBySlug(slug);
  const label = knownIndustry
    ? knownIndustry.label
    : slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const color = knownIndustry?.color ?? '#00d4ff';

  // Return cached result if still fresh
  const cached = scanCache.get(slug);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    // Bump popularity in background (fire-and-forget)
    bumpIndustryPopularity(slug).catch((err) => console.warn('[IndustryProducts] bumpIndustryPopularity failed:', err));

    return NextResponse.json(
      {
        ok: true,
        industry: { slug, label, color },
        scan: cached.result,
        _cache: 'hit',
        custom: !knownIndustry,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // Run fresh scan
  try {
    const scanResult = await runIndustryScan({
      industry: label,
      region: 'El Paso',
      maxSources: 30,
    });

    scanCache.set(slug, { result: scanResult, cachedAt: Date.now() });

    // Persist this industry to the dynamic_industries table (fire-and-forget)
    upsertDynamicIndustry({
      slug,
      label,
      color,
      description: scanResult.executive_summary ?? null,
      signal_count: scanResult.products?.length ?? 0,
      product_count: scanResult.products?.length ?? 0,
      source_count: scanResult.sources_discovered ?? 0,
      last_scanned_at: new Date().toISOString(),
      scan_quality: scanResult.quality_gate?.status ?? null,
      executive_summary: scanResult.executive_summary ?? null,
      is_core: !!knownIndustry,
    }).catch(err => {
      console.warn('[industry-scan] Failed to persist industry:', err);
    });

    return NextResponse.json(
      {
        ok: true,
        industry: { slug, label, color },
        scan: scanResult,
        _cache: 'miss',
        custom: !knownIndustry,
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
