import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';
import { EL_PASO_VENDORS, VendorRecord } from '@/lib/data/el-paso-vendors';
import { TECHNOLOGY_CATALOG, Technology } from '@/lib/data/technology-catalog';
import { GLOBAL_TECH_HUBS, TechHub } from '@/lib/data/global-tech-hubs';

export const dynamic = 'force-dynamic';

type SearchResultType = 'vendor' | 'tech' | 'hub';

type SearchResult = {
  type: SearchResultType;
  id: string;
  name: string;
  description: string;
  score: number;
};

type SearchType = 'vendor' | 'tech' | 'hub' | 'all';

// Jaccard similarity between two token sets
function jaccardScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  a.forEach((token) => { if (b.has(token)) intersection++; });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Tokenise a string into lowercase words ≥ 2 characters
function tokenise(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2),
  );
}

// Score a candidate document against the query token set
function scoreDocument(
  query: Set<string>,
  fields: string[],
): number {
  const allText = fields.join(' ');
  const docTokens = tokenise(allText);
  const baseScore = jaccardScore(query, docTokens);

  // Boost: count raw query-token hits in the combined text for a simple TF signal
  const lowerText = allText.toLowerCase();
  let hitBoost = 0;
  query.forEach((token) => {
    if (lowerText.includes(token)) hitBoost += 0.05;
  });

  return Math.min(1, baseScore + hitBoost);
}

function searchVendors(query: Set<string>, limit: number): SearchResult[] {
  const vendors = Object.values(EL_PASO_VENDORS) as VendorRecord[];
  return vendors
    .map((v) => ({
      type: 'vendor' as SearchResultType,
      id: v.id,
      name: v.name,
      description: v.description,
      score: scoreDocument(query, [v.name, v.description, v.category, ...v.tags, ...v.evidence]),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function searchTechnologies(query: Set<string>, limit: number): SearchResult[] {
  return (TECHNOLOGY_CATALOG as Technology[])
    .map((t) => ({
      type: 'tech' as SearchResultType,
      id: t.id,
      name: t.name,
      description: t.description,
      score: scoreDocument(query, [t.name, t.description, t.category, ...t.procurementSignalKeywords]),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function searchHubs(query: Set<string>, limit: number): SearchResult[] {
  return (GLOBAL_TECH_HUBS as TechHub[])
    .map((h) => ({
      type: 'hub' as SearchResultType,
      id: h.id,
      name: h.name,
      description: h.description,
      score: scoreDocument(query, [h.name, h.description, h.region, h.country, ...h.topSectors, h.relevanceToElPaso]),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// GET /api/discover/search?q=&type=all&limit=20
export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(new Headers(request.headers));
  const rl = checkRateLimit({ key: `discover-search:${ip}`, maxRequests: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const rawType = url.searchParams.get('type') ?? 'all';
  const limitParam = url.searchParams.get('limit');
  const limit = Math.min(100, Math.max(1, parseInt(limitParam ?? '20', 10) || 20));

  if (!q) {
    return NextResponse.json(
      { ok: false, message: 'Missing required query parameter: q' },
      { status: 400 },
    );
  }

  const allowedTypes: SearchType[] = ['vendor', 'tech', 'hub', 'all'];
  const searchType: SearchType = allowedTypes.includes(rawType as SearchType)
    ? (rawType as SearchType)
    : 'all';

  try {
    const queryTokens = tokenise(q);

    let results: SearchResult[] = [];

    if (searchType === 'vendor' || searchType === 'all') {
      results = results.concat(searchVendors(queryTokens, limit));
    }
    if (searchType === 'tech' || searchType === 'all') {
      results = results.concat(searchTechnologies(queryTokens, limit));
    }
    if (searchType === 'hub' || searchType === 'all') {
      results = results.concat(searchHubs(queryTokens, limit));
    }

    // When type=all, re-rank by score across all entity kinds and trim to limit
    if (searchType === 'all') {
      results = results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    }

    return NextResponse.json(
      {
        ok: true,
        query: q,
        type: searchType,
        results,
        total: results.length,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : 'Search failed.' },
      { status: 500 },
    );
  }
}
