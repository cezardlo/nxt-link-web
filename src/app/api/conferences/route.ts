import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();

  const [confResult, intelResult] = await Promise.allSettled([
    supabase
      .from('conferences')
      .select('id, name, category, city, country, start_date, end_date, website, description, relevance_score, estimated_exhibitors, sector_tags')
      .not('start_date', 'is', null)
      .not('city', 'is', null)
      .order('start_date', { ascending: true }),
    supabase
      .from('conference_intel')
      .select('id, conference_id, company_name, role, signal_type, title, description, technology_cluster, importance_score')
      .order('importance_score', { ascending: false }),
  ]);

  const conferences = confResult.status === 'fulfilled' ? confResult.value.data || [] : [];
  const intel = intelResult.status === 'fulfilled' ? intelResult.value.data || [] : [];

  // Group intel by conference_id
  const intelByConf: Record<string, typeof intel> = {};
  for (const item of intel) {
    if (!intelByConf[item.conference_id]) intelByConf[item.conference_id] = [];
    intelByConf[item.conference_id].push(item);
  }

  const now = new Date().toISOString().split('T')[0];
  const items = conferences.map((c: any) => ({
    ...c,
    status: !c.start_date ? 'unknown' : c.end_date && c.end_date < now ? 'past' : c.start_date <= now && (!c.end_date || c.end_date >= now) ? 'live' : 'upcoming',
    exhibitors: intelByConf[c.id] || [],
    exhibitor_count: (intelByConf[c.id] || []).length,
  }));

  return NextResponse.json({ conferences: items });
}
