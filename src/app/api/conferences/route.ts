import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  
  const { data: conferences } = await supabase
    .from('conferences')
    .select('id, name, category, city, country, start_date, end_date, website, description, relevance_score')
    .not('start_date', 'is', null)
    .not('city', 'is', null)
    .order('start_date', { ascending: true });

  const now = new Date().toISOString().split('T')[0];
  const items = (conferences || []).map(c => ({
    ...c,
    status: !c.start_date ? 'unknown' : c.end_date && c.end_date < now ? 'past' : c.start_date <= now && (!c.end_date || c.end_date >= now) ? 'live' : 'upcoming',
  }));

  return NextResponse.json({ conferences: items });
}
