import { NextResponse } from 'next/server';

import { checkRateLimit } from '@/lib/http/rate-limit';
import { getClientIp } from '@/lib/http/request-context';

export const dynamic = 'force-dynamic';

// SAM.gov Exclusions API v2 — debarment / suspension check
// https://api.sam.gov/entity-information/v2/exclusions

export type SamExclusion = {
  name: string;
  classification: string;   // 'Firm' | 'Individual' | 'Special Entity'
  exclusionType: string;    // 'Ineligible' | 'Prohibition' etc.
  activationDate: string;
  terminationDate: string;
  agency: string;
};

export type ExclusionsResponse = {
  ok: boolean;
  query: string;
  excluded: boolean;
  exclusions: SamExclusion[];
  cached?: boolean;
};

// ── SAM.gov exclusions API response shape ─────────────────────────────────────

type SamExcludedRecord = {
  name?: string;
  classification?: string;
  exclusionType?: string;
  activationDate?: string;
  terminationDate?: string;
  excludingAgencyName?: string;
};

type SamExclusionsApiResponse = {
  totalRecords?: number;
  excludedEntity?: SamExcludedRecord[];
};

// ── 30-min cache keyed by lowercase vendor name ───────────────────────────────

type CacheEntry = { data: ExclusionsResponse; ts: number };
const _cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000;

// ── Parse SAM.gov exclusion records into our typed shape ──────────────────────

function parseSamExclusion(record: SamExcludedRecord): SamExclusion {
  return {
    name: record.name ?? '',
    classification: record.classification ?? '',
    exclusionType: record.exclusionType ?? '',
    activationDate: record.activationDate ?? '',
    terminationDate: record.terminationDate ?? '',
    agency: record.excludingAgencyName ?? '',
  };
}

// ── Fetch from SAM.gov exclusions endpoint with 10s timeout ──────────────────

async function fetchSamExclusions(name: string, apiKey: string): Promise<ExclusionsResponse> {
  const url = new URL('https://api.sam.gov/entity-information/v2/exclusions');
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('q', name);

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`SAM.gov exclusions HTTP ${res.status}`);

  const json = await res.json() as SamExclusionsApiResponse;
  const records = json.excludedEntity ?? [];

  const exclusions = records.map(parseSamExclusion);

  return {
    ok: true,
    query: name,
    excluded: exclusions.length > 0,
    exclusions,
  };
}

// ── GET /api/sam/exclusions?name=CompanyName ──────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit({ key: `sam-exclusions:${ip}`, maxRequests: 20, windowMs: 60_000 });

  if (!rl.allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit exceeded.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const name = (searchParams.get('name') ?? '').trim();

  if (!name) {
    return NextResponse.json(
      { ok: false, message: 'Query param "name" is required.' },
      { status: 400 },
    );
  }

  const cacheKey = name.toLowerCase();

  const cached = _cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json({ ...cached.data, cached: true });
  }

  const keys = [process.env.SAM_GOV_API_KEY ?? '', process.env.SAM_GOV_API_KEY_2 ?? ''].filter(Boolean);

  // No API keys — return safe open response (not excluded, no data)
  if (keys.length === 0) {
    const response: ExclusionsResponse = { ok: true, query: name, excluded: false, exclusions: [] };
    _cache.set(cacheKey, { data: response, ts: Date.now() });
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
  }

  // Try each key until one succeeds
  for (const key of keys) {
    try {
      const data = await fetchSamExclusions(name, key);
      _cache.set(cacheKey, { data, ts: Date.now() });
      return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
      continue; // try next key
    }
  }

  // All keys failed — return safe open response to avoid blocking UI
  const fallback: ExclusionsResponse = { ok: true, query: name, excluded: false, exclusions: [] };
  _cache.set(cacheKey, { data: fallback, ts: Date.now() });
  return NextResponse.json(fallback, { headers: { 'Cache-Control': 'no-store' } });
}
