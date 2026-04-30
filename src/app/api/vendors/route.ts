export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';

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

  let vendorsQuery = supabase
    .from('vendors')
    .select(VENDOR_SELECT)
    .not('sector', 'is', null)
    .neq('sector', '');

  let countQuery = supabase
    .from('vendors')
    .select('*', { count: 'exact', head: true })
    .not('sector', 'is', null)
    .neq('sector', '');

  let topQuery = supabase
    .from('vendors')
    .select(VENDOR_SELECT)
    .not('sector', 'is', null)
    .neq('sector', '');

  const applySharedFilters = <T extends typeof vendorsQuery>(query: T): T => {
    let next = query;
    if (sector) next = next.eq('sector', sector) as T;
    if (category) next = next.eq('primary_category', category) as T;
    if (search) next = next.ilike('company_name', `%${search}%`) as T;
    if (continent) next = next.eq('continent', continent) as T;
    if (country) next = next.eq('hq_country', country) as T;
    if (employee) next = next.eq('employee_count_range', employee) as T;
    if (funding) next = next.eq('funding_stage', funding) as T;
    if (scoreRange) {
      next = next.gte('iker_score', scoreRange.min).lte('iker_score', scoreRange.max) as T;
    }
    return next;
  };

  vendorsQuery = applySharedFilters(vendorsQuery);
  countQuery = applySharedFilters(countQuery as typeof vendorsQuery) as typeof countQuery;
  topQuery = applySharedFilters(topQuery);

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
    supabase
      .from('vendors')
      .select('sector, hq_country, funding_stage, employee_count_range, iker_score', { count: 'exact' })
      .not('sector', 'is', null)
      .neq('sector', '')
      .range(0, 9999),
  ]);

  const vendors = vendorsResult.status === 'fulfilled' ? vendorsResult.value.data || [] : [];
  const total = countResult.status === 'fulfilled' ? countResult.value.count || 0 : 0;
  const topVendors = topResult.status === 'fulfilled' ? topResult.value.data || [] : [];
  const facetRows = facetsResult.status === 'fulfilled' ? (facetsResult.value.data || []) as VendorFacetRow[] : [];
  const catalogTotal = facetsResult.status === 'fulfilled' ? facetsResult.value.count || facetRows.length : facetRows.length;

  const sectorCounts: CountMap = {};
  const countryCounts: CountMap = {};
  const fundingCounts: CountMap = {};
  const employeeCounts: CountMap = {};
  const scoreCounts: CountMap = { '90-100': 0, '75-89': 0, '60-74': 0, '0-59': 0 };

  for (const row of facetRows) {
    addCount(sectorCounts, row.sector);
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
