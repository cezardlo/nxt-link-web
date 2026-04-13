import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { askJarvis, parseJarvisJSON } from '@/lib/ai/provider';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const READING_LIST = [
  { name: 'Top Logistics Startups 2026', url: 'https://startus-insights.com/innovators-guide/logistics-startups-and-companies/' },
  { name: 'Top Logistics Startups 2025', url: 'https://startus-insights.com/innovators-guide/logistics-startups/' },
  { name: 'Supply Chain Startups', url: 'https://startus-insights.com/innovators-guide/supply-chain-startups/' },
  { name: 'Manufacturing Startups', url: 'https://startus-insights.com/innovators-guide/manufacturing-startups/' },
  { name: 'AI in Supply Chain Trends', url: 'https://startus-insights.com/innovators-guide/trend-tracking-tools/' },
  { name: 'Industry 4.0 Startups', url: 'https://startus-insights.com/innovators-guide/industries/industry-4-0/' },
];

interface DiscoveredVendor {
  name: string;
  country: string;
  founded_year: number | null;
  problem_solved: string;
  website: string;
  sectors: string[];
  nxt_link_fit: 'high' | 'medium' | 'low' | 'skip';
  fit_reason: string;
  skip_reason: string | null;
}

export async function GET(req: Request) {
  try {
    const db = getSupabase();
    const url = new URL(req.url);
    const minFit = url.searchParams.get('min_fit') || 'medium';
    const fitOrder = ['high', 'medium', 'low', 'skip'];
    const minIdx = fitOrder.indexOf(minFit);
    const allowed = fitOrder.slice(0, minIdx + 1);
    const { data, error } = await db
      .from('vendors')
      .select('*')
      .in('nxt_link_fit', allowed)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, vendors: data, count: (data || []).length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
export async function POST(req: Request) {
  try {
    const db = getSupabase();
    const body = await req.json().catch(() => ({}));
    const sources = body.sources || READING_LIST;
    const allVendors: DiscoveredVendor[] = [];

    for (const source of sources) {
      const prompt = 'You are a venture scout for NXT LINK, a logistics intelligence platform based in El Paso TX. ' +
        'Analyze the following URL and extract companies mentioned: ' + source.url + '. ' +
        'For each company, return JSON array with fields: name, country, founded_year, problem_solved, website, sectors (array), ' +
        'nxt_link_fit (high/medium/low/skip), fit_reason, skip_reason. ' +
        'Filter criteria: founded 2018-2024, outside US preferred, not e-commerce, not already US-dominant. ' +
        'Prioritize cross-border corridor matches (Mexico, LATAM, Europe-Asia trade). ' +
        'Return ONLY the JSON array, no markdown.';

      try {
        const aiResult = await askJarvis(prompt);
        const vendors = parseJarvisJSON(aiResult) as DiscoveredVendor[];
        if (Array.isArray(vendors)) {
          allVendors.push(...vendors.filter(v => v.nxt_link_fit !== 'skip'));
        }
      } catch { /* skip failed source */ }
    }

    if (allVendors.length > 0) {
      const rows = allVendors.map(v => ({
        name: v.name,
        country: v.country,
        website: v.website || null,
        description: v.problem_solved,
        sectors: v.sectors,
        nxt_link_fit: v.nxt_link_fit,
        fit_reason: v.fit_reason,
        source: 'startus-insights',
        status: 'discovered',
      }));
      await db.from('vendors').upsert(rows, { onConflict: 'name' });

      await db.from('swarm_memory').insert({
        agent: 'vendor-discovery',
        memory_type: 'discovery_run',
        content: { vendors_found: allVendors.length, sources: sources.length, timestamp: new Date().toISOString() },
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      discovered: allVendors.length,
      sources_checked: sources.length,
      vendors: allVendors,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
