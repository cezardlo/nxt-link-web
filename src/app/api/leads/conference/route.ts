// GET /api/leads/conference — Query conference leads with filters
// Supports: tier, category, conference, search, el_paso, limit, offset

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, isSupabaseConfigured } from '@/db/client';


export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ leads: [], total: 0, filters: {} });
  }

  const params = req.nextUrl.searchParams;
  const tier = params.get('tier');
  const category = params.get('category');
  const conference = params.get('conference');
  const search = params.get('search');
  const elPaso = params.get('el_paso');
  const limit = Math.min(Math.max(1, parseInt(params.get('limit') || '50', 10)), 200);
  const offset = Math.max(0, parseInt(params.get('offset') || '0', 10));

  const db = getDb();

  // Build query
  let query = db
    .from('conference_leads')
    .select('*', { count: 'exact' })
    .order('logistics_score', { ascending: false })
    .range(offset, offset + limit - 1);

  if (tier) {
    query = query.eq('lead_tier', tier);
  }
  if (category) {
    query = query.eq('logistics_category', category);
  }
  if (conference) {
    query = query.contains('conference_names', [conference]);
  }
  if (search) {
    query = query.or(
      `canonical_name.ilike.%${search}%,description.ilike.%${search}%,logistics_category.ilike.%${search}%`,
    );
  }
  if (elPaso === 'true') {
    query = query.eq('el_paso_relevant', true);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get filter facets
  const { data: allLeads } = await db
    .from('conference_leads')
    .select('lead_tier, logistics_category, el_paso_relevant');

  const tierCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  let epCount = 0;

  if (allLeads) {
    for (const l of allLeads as Array<{ lead_tier: string; logistics_category: string; el_paso_relevant: boolean }>) {
      tierCounts[l.lead_tier] = (tierCounts[l.lead_tier] ?? 0) + 1;
      if (l.logistics_category) {
        categoryCounts[l.logistics_category] = (categoryCounts[l.logistics_category] ?? 0) + 1;
      }
      if (l.el_paso_relevant) epCount++;
    }
  }

  return NextResponse.json({
    leads: data ?? [],
    total: count ?? 0,
    filters: {
      tiers: tierCounts,
      categories: categoryCounts,
      el_paso_count: epCount,
    },
  });
}
