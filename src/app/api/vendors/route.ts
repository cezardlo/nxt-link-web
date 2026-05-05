export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { INDUSTRIES } from '@/lib/data/technology-catalog';
import {
  industryToRawSectors,
  isCanonicalIndustryToken,
  mapToCanonicalIndustry,
} from '@/lib/data/sector-mapping';

const VENDOR_SELECT = 'id, company_name, company_url, description, primary_category, sector, hq_country, hq_city, continent, iker_score, credibility_score, tags, funding_stage, employee_count_range, industries, created_at';

type VendorFacetRow = {
  sector: string | null;
  hq_country: string | null;
  funding_stage: string | null;
  employee_count_range: string | null;
  iker_score: number | null;
};

type CountMap = Record<string, number>;

function addCount(map: CountMap, value: string | null | undefined) {
  const key = value?.trim();
  if (!key) return;
  map[key] = (map[key] || 0) + 1;
}

function toCountRows(map: CountMap) {
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function parseScoreRange(value: string | null) {
  if (!value) return null;
  const [min, max] = value.split('-').map((part) => Number(part));
  if (Number.isNaN(min)) return null;
  return { min, max: Number.isNaN(max) ? 100 : max };
}

export async function GET(request: Request) {
  const supabase = getSupabaseClient({ admin: true });
  const { searchParams } = new URL(request.url);

  const sector = searchParams.get('sector');
  const category = searchParams.get('category');
  const search = searchParams.get('search')?.trim();
  const continent = searchParams.get('continent');
  const country = searchParams.get('country');
  const employee = searchParams.get('employee');
  const funding = searchParams.get('funding');
  const scoreRange = parseScoreRange(searchParams.get('score'));
  const sort = searchParams.get('sort') || 'score';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
  // Quality gate: by default, hide entries that have neither a company URL
  // nor a description — those are mostly conference-page scraping artifacts
  // (booth numbers, sponsor tier labels, generic topic strings, country
  // names). Roughly 62% of rows fall into this bucket. Pass
  // ?include_unverified=true to see them anyway.
  const includeUnverified = searchParams.get('include_unverified') === 'true';
  const VERIFIED_FILTER = 'company_url.not.is.null,description.not.is.null';

  let vendorsQuery = supabase
    .from('vendors')
    .select(VENDOR_SELECT)
    .not('sector', 'is', null)
    .neq('sector', '')
    .neq('status', 'duplicate');
  if (!includeUnverified) vendorsQuery = vendorsQuery.or(VERIFIED_FILTER);

  let countQuery = supabase
    .from('vendors')
    .select('*', { count: 'exact', head: true })
    .not('sector', 'is', null)
    .neq('sector', '')
    .neq('status', 'duplicate');
  if (!includeUnverified) countQuery = countQuery.or(VERIFIED_FILTER);

  let topQuery = supabase
    .from('vendors')
    .select(VENDOR_SELECT)
    .not('sector', 'is', null)
    .neq('sector', '')
    .neq('status', 'duplicate');
  if (!includeUnverified) topQuery = topQuery.or(VERIFIED_FILTER);

  if (sector) {
    // If the user passed a canonical industry name (e.g. "Logistics"), expand
    // it to all underlying raw sector strings the catalog uses for that
    // industry. Otherwise treat it as an exact raw-sector filter.
    const canonicalSlug = isCanonicalIndustryToken(sector);
    if (canonicalSlug) {
      const rawSectors = industryToRawSectors(canonicalSlug);
      if (rawSectors.length > 0) {
        vendorsQuery = vendorsQuery.in('sector', rawSectors);
        countQuery = countQuery.in('sector', rawSectors);
        topQuery = topQuery.in('sector', rawSectors);
      }
    } else {
      vendorsQuery = vendorsQuery.eq('sector', sector);
      countQuery = countQuery.eq('sector', sector);
      topQuery = topQuery.eq('sector', sector);
    }
  }

  if (category) {
    vendorsQuery = vendorsQuery.eq('primary_category', category);
    countQuery = countQuery.eq('primary_category', category);
    topQuery = topQuery.eq('primary_category', category);
  }

  if (search) {
    vendorsQuery = vendorsQuery.ilike('company_name', `%${search}%`);
    countQuery = countQuery.ilike('company_name', `%${search}%`);
    topQuery = topQuery.ilike('company_name', `%${search}%`);
  }

  if (continent) {
    vendorsQuery = vendorsQuery.eq('continent', continent);
    countQuery = countQuery.eq('continent', continent);
    topQuery = topQuery.eq('continent', continent);
  }

  if (country) {
    vendorsQuery = vendorsQuery.eq('hq_country', country);
    countQuery = countQuery.eq('hq_country', country);
    topQuery = topQuery.eq('hq_country', country);
  }

  if (employee) {
    vendorsQuery = vendorsQuery.eq('employee_count_range', employee);
    countQuery = countQuery.eq('employee_count_range', employee);
    topQuery = topQuery.eq('employee_count_range', employee);
  }

  if (funding) {
    vendorsQuery = vendorsQuery.eq('funding_stage', funding);
    countQuery = countQuery.eq('funding_stage', funding);
    topQuery = topQuery.eq('funding_stage', funding);
  }

  if (scoreRange) {
    vendorsQuery = vendorsQuery.gte('iker_score', scoreRange.min).lte('iker_score', scoreRange.max);
    countQuery = countQuery.gte('iker_score', scoreRange.min).lte('iker_score', scoreRange.max);
    topQuery = topQuery.gte('iker_score', scoreRange.min).lte('iker_score', scoreRange.max);
  }

  if (sort === 'az') {
    vendorsQuery = vendorsQuery.order('company_name', { ascending: true });
  } else if (sort === 'newest') {
    vendorsQuery = vendorsQuery.order('created_at', { ascending: false, nullsFirst: false });
  } else {
    vendorsQuery = vendorsQuery.order('iker_score', { ascending: false, nullsFirst: false });
  }

  vendorsQuery = vendorsQuery.range(offset, offset + limit - 1);
  topQuery = topQuery.order('iker_score', { ascending: false, nullsFirst: false }).range(0, 4);

  const [vendorsResult, countResult, topResult, facetsResult] = await Promise.allSettled([
    vendorsQuery,
    countQuery,
    topQuery,
    (() => {
      let q = supabase
        .from('vendors')
        .select('sector, hq_country, funding_stage, employee_count_range, iker_score', { count: 'exact' })
        .not('sector', 'is', null)
        .neq('sector', '')
        .neq('status', 'duplicate');
      if (!includeUnverified) q = q.or(VERIFIED_FILTER);
      return q.range(0, 49999);
    })(),
  ]);

  const vendors = vendorsResult.status === 'fulfilled' ? vendorsResult.value.data || [] : [];
  const total = countResult.status === 'fulfilled' ? countResult.value.count || 0 : 0;
  const topVendors = topResult.status === 'fulfilled' ? topResult.value.data || [] : [];
  const facetRows = facetsResult.status === 'fulfilled' ? (facetsResult.value.data || []) as VendorFacetRow[] : [];
  const catalogTotal = facetsResult.status === 'fulfilled' ? facetsResult.value.count || facetRows.length : facetRows.length;

  // The /vendors page tiles look up colors and icons under the key "AI/ML"
  // (no spaces), but the canonical INDUSTRIES label is "AI / ML". Alias to
  // keep the lookups consistent on the client.
  const labelForSlug = (slug: string): string => {
    if (slug === 'ai-ml') return 'AI/ML';
    return INDUSTRIES.find((i) => i.slug === slug)?.label || 'Other';
  };

  // Pre-seed every canonical industry at 0 so the catalog always renders the
  // same 8 tiles even when a particular industry has no vendors yet.
  const sectorCounts: CountMap = {};
  for (const ind of INDUSTRIES) sectorCounts[labelForSlug(ind.slug)] = 0;
  const countryCounts: CountMap = {};
  const fundingCounts: CountMap = {};
  const employeeCounts: CountMap = {};
  const scoreCounts: CountMap = { '90-100': 0, '75-89': 0, '60-74': 0, '0-59': 0 };

  for (const row of facetRows) {
    // Aggregate raw sector strings under their canonical industry label.
    // Vendors that don't map to one of the 8 industries fall into "Other".
    const slug = mapToCanonicalIndustry(row.sector);
    const industryLabel = slug ? labelForSlug(slug) : 'Other';
    addCount(sectorCounts, industryLabel);
    addCount(countryCounts, row.hq_country);
    addCount(fundingCounts, row.funding_stage);
    addCount(employeeCounts, row.employee_count_range);

    const score = row.iker_score ?? 0;
    if (score >= 90) scoreCounts['90-100'] += 1;
    else if (score >= 75) scoreCounts['75-89'] += 1;
    else if (score >= 60) scoreCounts['60-74'] += 1;
    else scoreCounts['0-59'] += 1;
  }

  return NextResponse.json({
    vendors,
    topVendors,
    total,
    catalogTotal,
    sectors: toCountRows(sectorCounts),
    filters: {
      countries: toCountRows(countryCounts),
      fundingStages: toCountRows(fundingCounts),
      employeeSizes: toCountRows(employeeCounts),
      scoreRanges: toCountRows(scoreCounts).filter((row) => row.count > 0),
    },
  });
}
