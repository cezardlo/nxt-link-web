import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);

  const sector = searchParams.get('sector');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = supabase
    .from('vendors')
    .select('id, company_name, company_url, description, primary_category, sector, hq_country, hq_city, iker_score, credibility_score, tags, funding_stage, employee_count_range, industries')
    .order('iker_score', { ascending: false, nullsFirst: false });

  if (sector) query = query.eq('sector', sector);
  if (category) query = query.eq('primary_category', category);
  if (search) query = query.ilike('company_name', `%${search}%`);

  query = query.range(offset, offset + limit - 1);

  const [vendorsResult, countResult, sectorsResult] = await Promise.allSettled([
    query,
    supabase.from('vendors').select('id', { count: 'exact', head: true }),
    supabase.from('vendors').select('sector').not('sector', 'is', null),
  ]);

  const vendors = vendorsResult.status === 'fulfilled' ? vendorsResult.value.data || [] : [];
  const total = countResult.status === 'fulfilled' ? countResult.value.count || 0 : 0;

  // Extract unique sectors with counts
  const sectorRows = sectorsResult.status === 'fulfilled' ? sectorsResult.value.data || [] : [];
  const sectorCounts: Record<string, number> = {};
  for (const row of sectorRows) {
    if (row.sector) sectorCounts[row.sector] = (sectorCounts[row.sector] || 0) + 1;
  }
  const sectors = Object.entries(sectorCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ vendors, total, sectors });
}
