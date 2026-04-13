import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { askJarvis, parseJarvisJSON } from '@/lib/ai/provider';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const db = getSupabase();
    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 5;

    const { data: sources } = await db
      .from('discovery_sources')
      .select('name, url, description, config, industries')
      .in('category', ['startup_directory', 'startup_reports'])
      .eq('status', 'active')
      .limit(limit);

    if (!sources?.length) {
      return NextResponse.json({ ok: true, message: 'No sources to scrape', vendors_found: 0 });
    }

    const allVendors: Array<{ name: string; country: string; url: string; description: string; nxt_link_fit: string; fit_reason: string }> = [];

    for (const source of sources) {
      try {
        const resp = await fetch(source.url, {
          headers: { 'User-Agent': 'NXT-LINK-Bot/1.0 (logistics-intelligence)' },
          signal: AbortSignal.timeout(10000),
        });
        if (!resp.ok) continue;
        const html = await resp.text();
        const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 4000);

        const result = await askJarvis({
          agent: 'source-scraper',
          systemPrompt: 'You are a venture scout for NXT LINK, a logistics intelligence platform in El Paso TX. Extract company information from web content. Return ONLY a JSON array.',
          userPrompt: 'Source: ' + source.name + ' (' + source.url + '). ' +
            'Description: ' + (source.description || '') + '. ' +
            'Extract companies from this content. For each return JSON: ' +
            '{name, country, url, description, nxt_link_fit (high/medium/low), fit_reason}. ' +
            'Filter: founded 2018+, logistics/supply-chain/manufacturing, prefer non-US, cross-border corridor matches. ' +
            'Content: ' + textContent,
        });

        const vendors = parseJarvisJSON(result.text, []);
        if (Array.isArray(vendors)) {
          allVendors.push(...vendors.filter((v: { nxt_link_fit: string }) => v.nxt_link_fit !== 'low'));
        }

        await db.from('discovery_sources').update({ last_crawled_at: new Date().toISOString() }).eq('url', source.url);
      } catch { /* skip failed source */ }
    }

    let inserted = 0;
    for (const v of allVendors) {
      const { error } = await db.from('vendors').upsert({
        company_name: v.name,
        hq_country: v.country || 'Unknown',
        company_url: v.url || '',
        description: v.description || '',
        nxt_link_fit: v.nxt_link_fit || 'medium',
        fit_reason: v.fit_reason || '',
        status: 'active',
        source: 'scrape-sources',
      }, { onConflict: 'company_name' });
      if (!error) inserted++;
    }

    await db.from('swarm_memory').insert({
      agent_name: 'source-scraper',
      entry_type: 'scrape-run',
      content: { sources_checked: sources.length, vendors_found: allVendors.length, vendors_inserted: inserted, timestamp: new Date().toISOString() },
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return NextResponse.json({ ok: true, sources_checked: sources.length, vendors_found: allVendors.length, vendors_inserted: inserted });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
