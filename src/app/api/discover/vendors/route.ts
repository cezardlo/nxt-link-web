import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { EL_PASO_VENDORS, VendorRecord } from '@/lib/data/el-paso-vendors';

export const dynamic = 'force-dynamic';

// Unique sorted list of all categories and tags present in the vendor dataset
function buildFilterMeta(vendors: VendorRecord[]) {
  const categories = Array.from(new Set(vendors.map((v) => v.category))).sort();
  const tags = Array.from(new Set(vendors.flatMap((v) => v.tags))).sort();
  const layers = Array.from(new Set(vendors.map((v) => v.layer))).sort();
  return { categories, tags, layers };
}

// GET /api/discover/vendors?category=Defense&minScore=70&maxScore=100&tag=AI%2FML&layer=vendors&limit=50
export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({ key: `discover-vendors:${ip}`, maxRequests: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const url = new URL(request.url);
  const categoryFilter = url.searchParams.get('category');
  const tagFilter = url.searchParams.get('tag');
  const sectorFilter = url.searchParams.get('sector');   // alias for tag
  const layerFilter = url.searchParams.get('layer');
  const minScoreParam = url.searchParams.get('minScore');
  const maxScoreParam = url.searchParams.get('maxScore');
  const limitParam = url.searchParams.get('limit');
  const limit = Math.min(200, Math.max(1, parseInt(limitParam ?? '50', 10) || 50));

  const minScore = minScoreParam !== null ? parseFloat(minScoreParam) : 0;
  const maxScore = maxScoreParam !== null ? parseFloat(maxScoreParam) : 100;

  if (isNaN(minScore) || isNaN(maxScore) || minScore < 0 || maxScore > 100 || minScore > maxScore) {
    return NextResponse.json(
      { ok: false, message: 'minScore and maxScore must be numbers between 0 and 100, with minScore ≤ maxScore.' },
      { status: 400 },
    );
  }

  try {
    let vendors = Object.values(EL_PASO_VENDORS) as VendorRecord[];

    // Apply category filter (case-insensitive partial match)
    if (categoryFilter) {
      const lower = categoryFilter.toLowerCase();
      vendors = vendors.filter((v) => v.category.toLowerCase().includes(lower));
    }

    // Apply tag/sector filter (case-insensitive, checks entire tags array)
    const activeTagFilter = tagFilter ?? sectorFilter;
    if (activeTagFilter) {
      const lower = activeTagFilter.toLowerCase();
      vendors = vendors.filter((v) =>
        v.tags.some((t) => t.toLowerCase().includes(lower)),
      );
    }

    // Apply layer filter (exact match)
    if (layerFilter) {
      const validLayers = ['vendors', 'momentum', 'funding'] as const;
      type LayerType = typeof validLayers[number];
      if (!validLayers.includes(layerFilter as LayerType)) {
        return NextResponse.json(
          { ok: false, message: `Invalid layer. Allowed: ${validLayers.join(', ')}` },
          { status: 400 },
        );
      }
      vendors = vendors.filter((v) => v.layer === layerFilter);
    }

    // Apply ikerScore range
    vendors = vendors.filter(
      (v) => v.ikerScore >= minScore && v.ikerScore <= maxScore,
    );

    // Sort by ikerScore descending, then by name
    vendors = vendors
      .sort((a, b) => b.ikerScore - a.ikerScore || a.name.localeCompare(b.name))
      .slice(0, limit);

    const allVendors = Object.values(EL_PASO_VENDORS) as VendorRecord[];
    const filterMeta = buildFilterMeta(allVendors);

    return NextResponse.json(
      {
        ok: true,
        vendors,
        total: vendors.length,
        filters: {
          category: categoryFilter ?? null,
          tag: activeTagFilter ?? null,
          layer: layerFilter ?? null,
          minScore,
          maxScore,
          limit,
          available: filterMeta,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : 'Vendor discovery failed.' },
      { status: 500 },
    );
  }
}
