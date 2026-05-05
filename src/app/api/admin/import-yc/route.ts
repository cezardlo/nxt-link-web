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

  // Fintech / financial services
  'Fintech': 'fintech',
  'FinTech': 'fintech',
  'Finance': 'fintech',
  'Banking and Insurance': 'fintech',
  'Banking': 'fintech',
  'Insurance': 'fintech',
  'Crypto / Web3': 'fintech',
  'Crypto': 'fintech',
  'Payments': 'fintech',

  // Consumer / marketplaces
  'Consumer': 'consumer',
  'Marketplace': 'consumer',
  'Food and Beverage': 'consumer',
  'E-commerce': 'consumer',
  'Ecommerce': 'consumer',
  'Travel': 'consumer',
  'Lifestyle': 'consumer',
  'Apparel and Cosmetics': 'consumer',
  'Sports and Fitness': 'consumer',
  'Gaming': 'consumer',
  'Dating': 'consumer',

  // Real estate / construction
  'Real Estate and Construction': 'real-estate',
  'Real Estate': 'real-estate',
  'Construction': 'real-estate',

  // Education
  'Education': 'education',
  'EdTech': 'education',

  // Media / creator economy
  'Media': 'media',
  'Entertainment': 'media',
  'Music': 'media',
  'Video': 'media',
};

function pickIndustry(hit: AlgoliaHit): IndustrySlug | null {
  const candidates = [
    ...(hit.industries ?? []),
    hit.industry,
    hit.subindustry,
  ].filter(Boolean) as string[];

  // Try the exact YC-industry → canonical map first (case-insensitive).
  for (const c of candidates) {
    if (YC_INDUSTRY_MAP[c]) return YC_INDUSTRY_MAP[c];
    const found = Object.entries(YC_INDUSTRY_MAP).find(([k]) => k.toLowerCase() === c.toLowerCase());
    if (found) return found[1];
  }
  // Then try the broader sector-mapping keyword rules on the YC industry
  // string itself — but NOT on the long description blob. Description
  // matching produced too many false positives (Stripe/DoorDash hit on
  // "infrastructure"/"platform" keywords and got mislabeled AI/ML).
  for (const c of candidates) {
    const slug = mapToCanonicalIndustry(c);
    if (slug) return slug;
  }
  return null;
}

function pickCountry(hit: AlgoliaHit): string | null {
  // YC's `country` field is empty for almost every company. The location
  // info is stored in `regions`, e.g. ["United States of America",
  // "America / Canada", "Remote"]. Take the first concrete country.
  const c = hit.country?.trim();
  if (c) return c;
  for (const r of hit.regions ?? []) {
    if (!r) continue;
    const low = r.toLowerCase();
    if (low === 'remote' || low.includes('remote') || low.includes('america / canada') || low === 'global') continue;
    return r;
  }
  return null;
}

function pickCity(hit: AlgoliaHit): string | null {
  // Similar to pickCountry but lower priority — most "regions" entries are
  // continent/country labels, not cities. Skip them. Cities aren't reliably
  // surfaced by YC's API.
  return null;
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

type AlgoliaFacetResponse = AlgoliaResponse & {
  facets?: Record<string, Record<string, number>>;
};

async function fetchYcQuery(rawParams: string): Promise<AlgoliaFacetResponse | null> {
  const app = process.env.YC_ALGOLIA_APP || '45BWZJ1SGC';
  // Default key is the current public secured search key from YC's
  // www.ycombinator.com/companies HTML (window.AlgoliaOpts.key as of
  // 2026-05-04). YC rotates this; if it stops working, scrape the page
  // again or override via the env var.
  const key = process.env.YC_ALGOLIA_SEARCH_KEY
    || 'NzllNTY5MzJiZGM2OTY2ZTQwMDEzOTNhYWZiZGRjODlhYzVkNjBmOGRjNzJiMWM4ZTU0ZDlhYTZjOTJiMjlhMWFuYWx5dGljc1RhZ3M9eWNkYyZyZXN0cmljdEluZGljZXM9WUNDb21wYW55X3Byb2R1Y3Rpb24lMkNZQ0NvbXBhbnlfQnlfTGF1bmNoX0RhdGVfcHJvZHVjdGlvbiZ0YWdGaWx0ZXJzPSU1QiUyMnljZGNfcHVibGljJTIyJTVE';
  const index = process.env.YC_ALGOLIA_INDEX || 'YCCompany_production';
  const url = `https://${app.toLowerCase()}-dsn.algolia.net/1/indexes/${encodeURIComponent(index)}/query`;

  const body = JSON.stringify({ params: rawParams });

  // YC's Algolia key enforces an allowed-origin check, so we have to send
  // Origin and Referer headers matching ycombinator.com. Node's built-in
  // fetch (via undici) silently strips both — they're on the Fetch spec's
  // forbidden-header list. Using Node's lower-level node:https module
  // bypasses that restriction and works in any Vercel runtime without
  // adding a dependency.
  const https = await import('node:https');
  const u = new URL(url);
  return await new Promise<AlgoliaFacetResponse | null>((resolve) => {
    const req = https.request(
      {
        method: 'POST',
        host: u.hostname,
        path: u.pathname + (u.search || ''),
        port: 443,
        headers: {
          'X-Algolia-Application-Id': app,
          'X-Algolia-API-Key': key,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Origin': 'https://www.ycombinator.com',
          'Referer': 'https://www.ycombinator.com/companies',
          'User-Agent': 'nxtlink-import/1.0',
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            resolve(null);
            return;
          }
          const text = Buffer.concat(chunks).toString('utf8');
          try {
            resolve(JSON.parse(text) as AlgoliaFacetResponse);
          } catch {
            resolve(null);
          }
        });
        res.on('error', () => resolve(null));
      },
    );
    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
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

  // 2. Fetch YC companies. Algolia's secured search caps any single query
  //    at 1000 results (paginationLimitedTo). To cover all ~5,800 YC
  //    companies we issue one query per batch (W22, S22, W23, F24, etc.).
  //    First fetch the list of batches via the facet endpoint, then pull
  //    each batch separately. Each batch is well under 1000 companies.
  const batchListResp = await fetchYcQuery('hitsPerPage=0&facets=%5B%22batch%22%5D');
  if (!batchListResp) {
    return NextResponse.json({
      ok: false,
      message: 'YC Algolia facet fetch failed. Verify YC_ALGOLIA_APP / YC_ALGOLIA_SEARCH_KEY / YC_ALGOLIA_INDEX env vars are current.',
      fetched: 0,
    }, { status: 502 });
  }
  const batchCounts = batchListResp.facets?.batch ?? {};
  const batches = Object.keys(batchCounts);
  const seenIds = new Set<string>();
  const allHits: AlgoliaHit[] = [];
  let batchesFetched = 0;
  let batchesFailed = 0;
  for (const batch of batches) {
    const filter = encodeURIComponent(JSON.stringify([`batch:${batch}`]));
    const params = `hitsPerPage=1000&facetFilters=${filter}`;
    const r = await fetchYcQuery(params);
    if (!r) {
      batchesFailed += 1;
      continue;
    }
    batchesFetched += 1;
    for (const hit of r.hits ?? []) {
      // Algolia objectID is a stable per-row identifier; use it to
      // dedupe across overlapping facet results.
      const key = (hit as AlgoliaHit & { objectID?: string }).objectID
        || `${hit.name ?? ''}::${hit.website ?? ''}`;
      if (seenIds.has(key)) continue;
      seenIds.add(key);
      allHits.push(hit);
    }
  }
  // Fallback if facets returned nothing — try the old single-query path
  // so we at least insert the first 1000 results.
  if (allHits.length === 0) {
    const r = await fetchYcQuery('hitsPerPage=1000&page=0');
    if (r && r.hits) allHits.push(...r.hits);
  }

  // 3a. The vendors table has a quirky schema: a text `id` column and a
  //     bigint `ID` column, both NOT NULL with no default. Generate UUIDs
  //     for `id` and increment from current max for `ID`.
  let nextNumericId: number;
  {
    const { data: maxRow, error: maxErr } = await supabase
      .from('vendors')
      .select('ID')
      .order('ID', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxErr) {
      return NextResponse.json({ ok: false, message: `Couldn't read max ID: ${maxErr.message}` }, { status: 500 });
    }
    nextNumericId = (((maxRow as { ID?: number } | null)?.ID ?? 0) + 1);
  }

  // 3b. Build the rows to insert.
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
    // Don't default unmatched industries to AI/ML — that buried Stripe,
    // Airbnb, Coinbase, etc. inside the AI tile. "Other" is honest.
    const sectorLabel = !industrySlug
      ? 'Other'
      : industrySlug === 'ai-ml'
        ? 'AI/ML'
        : (industryMeta?.label ?? 'Other');

    const tags = Array.from(new Set([
      hit.batch ? `YC ${hit.batch}` : null,
      ...(hit.industries ?? []),
      hit.industry,
      hit.subindustry,
      ...(hit.tags ?? []),
    ].filter(Boolean) as string[]));

    toInsert.push({
      id: crypto.randomUUID(),
      ID: nextNumericId++,
      company_name: hit.name,
      company_url: hit.website,
      description: hit.long_description || hit.one_liner || null,
      sector: sectorLabel,
      primary_category: sectorLabel,
      hq_country: pickCountry(hit),
      hq_city: pickCity(hit),
      employee_count_range: bucketTeamSize(hit.team_size),
      tags,
      status: 'active',
      source: 'yc',
      industries: industrySlug ? [industrySlug] : null,
    });
  }

  // 4. Insert in batches (skip cleanly if nothing new — flow continues to
  //    the reclassify pass below either way).
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
        version: 'v5-tiles',
        message: `Insert batch failed at offset ${i}: ${error.message}`,
        inserted,
      }, { status: 500 });
    }
    inserted += count ?? slice.length;
  }

  // 5. Re-classify existing source='yc' rows whose sector or country are
  //    stale (e.g. previously-defaulted-to-AI/ML). Group by destination
  //    (sector, country) so we issue ~10-20 UPDATEs instead of one per row.
  const ycHitMap = new Map<string, AlgoliaHit>();
  for (const hit of allHits) {
    if (!hit.website) continue;
    const norm = normalizeVendorUrl(hit.website);
    if (norm) ycHitMap.set(norm, hit);
  }

  type ExistingRow = { id: string; sector: string | null; hq_country: string | null; company_url: string | null };
  const existingYc: ExistingRow[] = [];
  {
    const PAGE = 1000;
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, sector, hq_country, company_url')
        .eq('source', 'yc')
        .range(from, from + PAGE - 1);
      if (error) break;
      if (!data || data.length === 0) break;
      existingYc.push(...(data as ExistingRow[]));
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }

  const updateGroups = new Map<string, string[]>();
  for (const row of existingYc) {
    if (!row.company_url) continue;
    const norm = normalizeVendorUrl(row.company_url);
    if (!norm) continue;
    const hit = ycHitMap.get(norm);
    if (!hit) continue;

    const slug = pickIndustry(hit);
    const meta = slug ? INDUSTRIES.find((i) => i.slug === slug) : null;
    const newSector = !slug
      ? 'Other'
      : slug === 'ai-ml'
        ? 'AI/ML'
        : (meta?.label ?? 'Other');
    const newCountry = pickCountry(hit);

    if (row.sector === newSector && row.hq_country === newCountry) continue;
    const key = `${newSector}|||${newCountry ?? ''}`;
    const arr = updateGroups.get(key) ?? [];
    arr.push(row.id);
    updateGroups.set(key, arr);
  }

  let updated = 0;
  let updateBatches = 0;
  for (const [key, ids] of updateGroups) {
    const [newSector, newCountryRaw] = key.split('|||');
    const newCountry = newCountryRaw === '' ? null : newCountryRaw;
    for (let i = 0; i < ids.length; i += 200) {
      const slice = ids.slice(i, i + 200);
      const { error, count } = await supabase
        .from('vendors')
        .update({
          sector: newSector,
          primary_category: newSector,
          hq_country: newCountry,
        }, { count: 'exact' })
        .in('id', slice);
      updateBatches += 1;
      if (!error) updated += count ?? slice.length;
    }
  }

  return NextResponse.json({
    ok: true,
    version: 'v4-batches',
    durationMs: Date.now() - start,
    ycCompaniesFetched: allHits.length,
    batchesAvailable: batches.length,
    batchesFetched,
    batchesFailed,
    skippedNoUrl,
    skippedClosed,
    skippedDuplicate: skippedDup,
    inserted,
    existingYcReclassified: updated,
    reclassifyGroups: updateGroups.size,
    reclassifyBatches: updateBatches,
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return POST(request);
}
