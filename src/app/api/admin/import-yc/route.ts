// POST /api/admin/import-yc
// Imports Y Combinator companies into the vendors table from YC's public
// Algolia search index. Idempotent — vendors whose normalised URL already
// exists in the table are skipped (we never overwrite an existing row).
// New rows land with status='active' (YC entries are hand-curated by YC,
// they don't need our verification gate).
//
// YC Algolia config can be overridden via env vars if the public keys ever
// rotate (these have been stable for years but anyone can change them):
//   YC_ALGOLIA_APP        - default 45BWZJ1SGC
//   YC_ALGOLIA_SEARCH_KEY - default NhCFs69RWrPKa1UxA0GOj3KNFIJI8
//   YC_ALGOLIA_INDEX      - default YCCompany_production
//
// Protected by CRON_SECRET (header: x-cron-secret OR Authorization: Bearer ...).

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { requireCronSecret } from '@/lib/http/cron-auth';
import { normalizeVendorUrl } from '@/lib/vendors/normalize-url';
import { mapToCanonicalIndustry } from '@/lib/data/sector-mapping';
import { INDUSTRIES, type IndustrySlug } from '@/lib/data/technology-catalog';
import { PRIVATE_ACCESS_CODE } from '@/lib/privateAccess';

function authorize(headers: Headers): { ok: true } | { ok: false; status: number; message: string } {
  if (headers.get('x-access-code') === PRIVATE_ACCESS_CODE) return { ok: true };
  return requireCronSecret(headers);
}

type AlgoliaHit = {
  name?: string;
  website?: string;
  one_liner?: string;
  long_description?: string;
  industries?: string[];
  industry?: string;
  subindustry?: string;
  country?: string;
  regions?: string[];
  team_size?: number;
  batch?: string;
  tags?: string[];
  status?: string;
  small_logo_thumb_url?: string;
};

type AlgoliaResponse = {
  hits: AlgoliaHit[];
  nbHits?: number;
  page?: number;
  nbPages?: number;
  hitsPerPage?: number;
};

// YC's "industries" are messy. Map the common ones to one of our 8 canonical
// industry slugs. Everything else falls back to mapToCanonicalIndustry which
// keyword-matches, then to "Logistics" if nothing fits (since YC's logistics
// presence is light, the long tail tends to be SaaS/tools — better to land
// them under AI/ML for visibility, but err on Logistics if the description
// reads logistics-y).
const YC_INDUSTRY_MAP: Record<string, IndustrySlug> = {
  'Industrials': 'manufacturing',
  'Hardware': 'manufacturing',
  'Robotics': 'manufacturing',
  'Aviation and Space': 'manufacturing',
  'Aerospace': 'manufacturing',
  'Manufacturing and Robotics': 'manufacturing',
  'Construction': 'manufacturing',
  'Healthcare': 'healthcare',
  'Healthcare and Diagnostics': 'healthcare',
  'Healthcare IT': 'healthcare',
  'Healthcare Services': 'healthcare',
  'Therapeutics': 'healthcare',
  'Drug Discovery': 'healthcare',
  'Telehealth': 'healthcare',
  'Medical Devices': 'healthcare',
  'Government': 'defense',
  'Defense and National Security': 'defense',
  'Government and Defense': 'defense',
  'Security': 'cybersecurity',
  'Cybersecurity': 'cybersecurity',
  'Energy': 'energy',
  'Energy and Environment': 'energy',
  'Climate': 'energy',
  'Sustainability': 'energy',
  'Logistics': 'logistics',
  'Logistics and Supply Chain': 'logistics',
  'Supply Chain': 'logistics',
  'Transportation': 'logistics',
  'Transportation and Logistics': 'logistics',
  'Automotive': 'logistics',
  'B2B': 'ai-ml',
  'Engineering, Product and Design': 'ai-ml',
  'Operations': 'ai-ml',
  'Sales': 'ai-ml',
  'Marketing': 'ai-ml',
  'Productivity': 'ai-ml',
  'Analytics': 'ai-ml',
  'Data Engineering': 'ai-ml',
  'Infrastructure': 'ai-ml',
  'DevOps and IT': 'ai-ml',
  'Generative AI': 'ai-ml',
  'AI': 'ai-ml',
  'Artificial Intelligence': 'ai-ml',
  'Machine Learning': 'ai-ml',
};

function pickIndustry(hit: AlgoliaHit): IndustrySlug | null {
  const candidates = [
    ...(hit.industries ?? []),
    hit.industry,
    hit.subindustry,
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    if (YC_INDUSTRY_MAP[c]) return YC_INDUSTRY_MAP[c];
  }
  for (const c of candidates) {
    const slug = mapToCanonicalIndustry(c);
    if (slug) return slug;
  }
  // Fall back to keyword matching against name + descriptions.
  const blob = [hit.one_liner, hit.long_description, hit.name].filter(Boolean).join(' ');
  return mapToCanonicalIndustry(blob);
}

function bucketTeamSize(n?: number): string | null {
  if (!n || n <= 0) return null;
  if (n <= 10) return '1-10';
  if (n <= 50) return '11-50';
  if (n <= 200) return '51-200';
  if (n <= 500) return '201-500';
  if (n <= 1000) return '501-1000';
  if (n <= 5000) return '1001-5000';
  return '5001+';
}

async function fetchYcPage(page: number): Promise<AlgoliaResponse | null> {
  const app = process.env.YC_ALGOLIA_APP || '45BWZJ1SGC';
  const key = process.env.YC_ALGOLIA_SEARCH_KEY || 'NhCFs69RWrPKa1UxA0GOj3KNFIJI8';
  const index = process.env.YC_ALGOLIA_INDEX || 'YCCompany_production';
  const url = `https://${app.toLowerCase()}-dsn.algolia.net/1/indexes/${encodeURIComponent(index)}/query`;

  const body = JSON.stringify({
    params: `hitsPerPage=1000&page=${page}`,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Algolia-Application-Id': app,
      'X-Algolia-API-Key': key,
      'Content-Type': 'application/json',
    },
    body,
  });
  if (!res.ok) return null;
  return (await res.json()) as AlgoliaResponse;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = authorize(request.headers);
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase not configured' }, { status: 503 });
  }

  const supabase = getSupabaseClient({ admin: true });
  const start = Date.now();

  // 1. Fetch existing vendor URLs so we can skip duplicates.
  const existingNorms = new Set<string>();
  {
    const PAGE = 1000;
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from('vendors')
        .select('company_url')
        .not('company_url', 'is', null)
        .neq('company_url', '')
        .range(from, from + PAGE - 1);
      if (error) {
        return NextResponse.json({ ok: false, message: `Reading existing URLs failed: ${error.message}` }, { status: 500 });
      }
      if (!data || data.length === 0) break;
      for (const row of data) {
        const norm = normalizeVendorUrl((row as { company_url: string | null }).company_url);
        if (norm) existingNorms.add(norm);
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }

  // 2. Fetch YC companies, paging through Algolia.
  const allHits: AlgoliaHit[] = [];
  for (let page = 0; page < 12; page++) { // up to 12k YC companies, plenty of headroom
    const r = await fetchYcPage(page);
    if (!r) {
      return NextResponse.json({
        ok: false,
        message: `YC Algolia fetch failed on page ${page}. Verify YC_ALGOLIA_APP / YC_ALGOLIA_SEARCH_KEY / YC_ALGOLIA_INDEX env vars are current.`,
        fetched: allHits.length,
      }, { status: 502 });
    }
    if (!r.hits || r.hits.length === 0) break;
    allHits.push(...r.hits);
    if (r.nbPages !== undefined && page + 1 >= r.nbPages) break;
    if (r.hits.length < (r.hitsPerPage ?? 1000)) break;
  }

  // 3. Build the rows to insert.
  const toInsert: Record<string, unknown>[] = [];
  let skippedNoUrl = 0;
  let skippedDup = 0;
  let skippedClosed = 0;
  for (const hit of allHits) {
    if (!hit.name || !hit.website) {
      skippedNoUrl += 1;
      continue;
    }
    if (hit.status && /^dead$|^acquired$|^inactive$/i.test(hit.status)) {
      // YC marks closed companies; skip.
      skippedClosed += 1;
      continue;
    }
    const norm = normalizeVendorUrl(hit.website);
    if (!norm) {
      skippedNoUrl += 1;
      continue;
    }
    if (existingNorms.has(norm)) {
      skippedDup += 1;
      continue;
    }
    existingNorms.add(norm);

    const industrySlug = pickIndustry(hit);
    const industryMeta = industrySlug ? INDUSTRIES.find((i) => i.slug === industrySlug) : null;
    const sectorLabel = industrySlug === 'ai-ml'
      ? 'AI/ML'
      : industryMeta?.label ?? 'AI/ML';

    const tags = Array.from(new Set([
      hit.batch ? `YC ${hit.batch}` : null,
      ...(hit.industries ?? []),
      hit.industry,
      hit.subindustry,
      ...(hit.tags ?? []),
    ].filter(Boolean) as string[]));

    toInsert.push({
      company_name: hit.name,
      company_url: hit.website,
      description: hit.long_description || hit.one_liner || null,
      sector: sectorLabel,
      primary_category: sectorLabel,
      hq_country: hit.country || null,
      hq_city: hit.regions?.[0] || null,
      employee_count_range: bucketTeamSize(hit.team_size),
      tags,
      status: 'active',
      source: 'yc',
      industries: industrySlug ? [industrySlug] : null,
    });
  }

  // 4. Insert in batches. Use upsert with ignoreDuplicates against `id` to be safe.
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const slice = toInsert.slice(i, i + BATCH);
    const { error, count } = await supabase
      .from('vendors')
      .insert(slice, { count: 'exact' });
    if (error) {
      return NextResponse.json({
        ok: false,
        message: `Insert batch failed at offset ${i}: ${error.message}`,
        inserted,
      }, { status: 500 });
    }
    inserted += count ?? slice.length;
  }

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - start,
    ycCompaniesFetched: allHits.length,
    skippedNoUrl,
    skippedClosed,
    skippedDuplicate: skippedDup,
    inserted,
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return POST(request);
}
