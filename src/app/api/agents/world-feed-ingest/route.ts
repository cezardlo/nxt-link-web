// @ts-nocheck
/**
 * POST /api/agents/world-feed-ingest
 * 
 * Fetches from 500+ global news sources and persists to Supabase.
 * Covers: science journals, tech news, government agencies, defense,
 *         climate, agriculture, life sciences, space — from 40+ countries.
 * 
 * GET: Returns source stats and health
 * POST: Runs ingestion (pass ?sectors= to filter)
 */

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { WORLD_SOURCES, SOURCE_STATS } from '@/lib/feeds/mega/world-sources';

export const maxDuration = 300;

const TIMEOUT = 15_000;

async function fetchRSS(url: string): Promise<any[]> {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), TIMEOUT);
    const r = await fetch(url, {
      signal: c.signal,
      headers: { 'User-Agent': 'NXTLink-Intelligence/1.0 (nxtlink.io; intel@nxtlink.io)', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
    }).finally(() => clearTimeout(t));
    if (!r.ok) return [];
    const text = await r.text();
    return parseRSS(text);
  } catch { return []; }
}

function parseRSS(text: string): any[] {
  const isAtom = text.includes('<feed');
  const itemTag = isAtom ? 'entry' : 'item';
  const items = text.match(new RegExp(`<${itemTag}>[\s\S]*?<\/${itemTag}>`, 'g')) ?? [];
  return items.slice(0, 25).map(item => {
    const get = (tag: string) => {
      const cdata = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, 'i'))?.[1];
      const direct = item.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'))?.[1];
      const content = (cdata ?? direct ?? '').replace(/<[^>]+>/g, '').trim();
      return content;
    };
    const link = item.match(/href="([^"]+)"/)?.[1] ?? item.match(/<link>([^<]+)<\/link>/)?.[1] ?? get('link');
    const pubDate = get('pubDate') || get('published') || get('updated') || get('dc:date');
    return {
      title: get('title').slice(0, 500),
      summary: (get('description') || get('summary') || get('content')).slice(0, 1000),
      url: link,
      published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
    };
  }).filter(item => item.title?.length > 5);
}

function calcImportance(source: typeof WORLD_SOURCES[0], title: string, summary: string): number {
  let score = source.tier === 1 ? 0.55 : source.tier === 2 ? 0.40 : 0.25;
  if (source.humanity_impact === 'transformative') score += 0.15;
  const text = `${title} ${summary}`.toLowerCase();
  const epTerms = ['el paso', 'fort bliss', 'juarez', 'juárez', 'borderplex', 'cbp', 'utep', 'bota'];
  if (epTerms.some(k => text.includes(k))) score += 0.25;
  const highValueTerms = ['breakthrough', 'discovery', 'first ever', 'record', 'milestone', 'launches', 'deployed', 'contract', 'funding', 'patent'];
  if (highValueTerms.some(k => text.includes(k))) score += 0.10;
  return Math.min(0.97, score);
}

function inferSignalType(title: string, source: typeof WORLD_SOURCES[0]): string {
  const t = title.toLowerCase();
  if (t.includes('patent') || t.includes('intellectual property')) return 'patent_filing';
  if (t.includes('raise') || t.includes('funding') || t.includes('million') || t.includes('invest')) return 'funding_round';
  if (t.includes('contract') || t.includes('award') || t.includes('win') || t.includes('procure')) return 'contract_award';
  if (t.includes('launch') || t.includes('release') || t.includes('unveil') || t.includes('introduce')) return 'product_launch';
  if (t.includes('breakthrough') || t.includes('discovery') || t.includes('first') || t.includes('achieve') || t.includes('record')) return 'research_breakthrough';
  if (t.includes('regulation') || t.includes('law') || t.includes('policy') || t.includes('ban') || t.includes('approve')) return 'regulation';
  if (source.type === 'journal' || source.type === 'institution') return 'research_breakthrough';
  if (source.type === 'government') return 'contract_award';
  return 'technology';
}

export async function GET() {
  return NextResponse.json({
    name: 'NXT LINK World Feed Ingestion',
    description: '500+ global sources: science journals, tech news, government agencies, defense, climate, agriculture, life sciences, space — from 40+ countries',
    stats: SOURCE_STATS,
    tier_1_count: WORLD_SOURCES.filter(s => s.tier === 1).length,
    transformative_sources: WORLD_SOURCES.filter(s => s.humanity_impact === 'transformative').length,
    usage: 'POST to run. Add ?sectors=ai-ml,defense to filter. Add ?tier=1 for tier-1 only.',
  });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const sectorsParam = searchParams.get('sectors');
  const tierParam = searchParams.get('tier');
  const regionParam = searchParams.get('region');
  const maxSourcesParam = parseInt(searchParams.get('max_sources') ?? '100');

  const start = Date.now();

  // Filter sources
  let sources = WORLD_SOURCES.filter(s => s.active);
  if (sectorsParam) {
    const sectors = sectorsParam.split(',');
    sources = sources.filter(s => s.sectors.some(sec => sectors.includes(sec)));
  }
  if (tierParam) {
    sources = sources.filter(s => s.tier <= parseInt(tierParam));
  }
  if (regionParam) {
    sources = sources.filter(s => s.region === regionParam || s.country_code === regionParam);
  }
  sources = sources.slice(0, maxSourcesParam);

  // Fetch all sources in parallel (batches of 20 to avoid overwhelming)
  const allItems: Array<{ source: typeof WORLD_SOURCES[0]; item: any }> = [];
  const sourceStats: Record<string, number> = {};
  const sourceErrors: string[] = [];

  const BATCH = 20;
  for (let i = 0; i < sources.length; i += BATCH) {
    const batch = sources.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async source => {
        const items = await fetchRSS(source.url);
        sourceStats[source.id] = items.length;
        return items.map(item => ({ source, item }));
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled') allItems.push(...r.value);
      else sourceErrors.push(r.reason?.message ?? 'unknown error');
    }
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: false, message: 'Supabase not configured',
      sources_fetched: sources.length, items_collected: allItems.length,
      source_stats: sourceStats,
    });
  }

  const supabase = createClient();
  let inserted = 0;
  let skipped = 0;

  // Process in chunks
  const rows = allItems
    .filter(({ item }) => item.title?.length > 10 && item.url)
    .map(({ source, item }) => ({
      title: item.title.slice(0, 500),
      evidence: item.summary?.slice(0, 1000) ?? '',
      source: source.name,
      url: item.url,
      signal_type: inferSignalType(item.title, source),
      industry: source.sectors[0] ?? 'general',
      region: source.region,
      company: null,
      amount_usd: null,
      importance_score: calcImportance(source, item.title, item.summary ?? ''),
      confidence: source.tier === 1 ? 0.85 : source.tier === 2 ? 0.70 : 0.55,
      tags: [...source.sectors, source.country_code, source.type],
      discovered_at: item.published_at ?? new Date().toISOString(),
    }));

  // Insert in chunks of 50
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const { data, error } = await supabase.from('intel_signals').insert(chunk).select('id');
    if (error) {
      if (error.code === '23505') skipped += chunk.length;
      else sourceErrors.push(error.message);
    } else {
      inserted += data?.length ?? 0;
    }
  }

  const duration = Math.round((Date.now() - start) / 1000);

  return NextResponse.json({
    ok: true,
    duration_seconds: duration,
    sources: { fetched: sources.length, errored: sourceErrors.length },
    items: { collected: allItems.length, inserted, skipped },
    coverage: {
      countries: [...new Set(sources.map(s => s.country_code))],
      sectors: [...new Set(sources.flatMap(s => s.sectors))],
      tier1: sources.filter(s => s.tier === 1).length,
    },
    top_sources: Object.entries(sourceStats).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, cnt]) => ({ id, items: cnt })),
    errors: sourceErrors.slice(0, 5),
  });
}
