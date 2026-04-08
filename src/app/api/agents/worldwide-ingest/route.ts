/**
 * POST /api/agents/worldwide-ingest
 * 
 * The world's best free intelligence ingestion pipeline.
 * Collects from 16+ sources across every major tech region on Earth,
 * deduplicates, normalizes, and persists to Supabase.
 * 
 * Sources: USPTO, EPO, WIPO, DARPA, NASA, SBIR, SAM.gov, USASpending,
 *          OpenAlex, arXiv, GDELT, SIPRI, Horizon Europe, World Bank,
 *          Hacker News, Product Hunt — all FREE, no API keys.
 * 
 * Covers: US, EU, China, Israel, India, South Korea, Japan, Global
 */

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { runWorldwideCollector, type WorldSignal } from '@/lib/sources/worldwide-collector';

export const maxDuration = 300; // 5 minutes for comprehensive collection

// El Paso relevance keywords — boost signals mentioning these
const EP_BOOST_KEYWORDS = [
  'el paso', 'juarez', 'juárez', 'fort bliss', 'utep', 'borderplex',
  'bota', 'ysleta', 'santa teresa', 'horizon city', 'cbp', 'usbp',
  'nearshoring', 'maquiladora', 'cross-border', 'border crossing',
  '1st armored', 'thaad', 'new mexico', 'starbase', 'space valley',
];

const EP_SECTOR_WEIGHTS: Record<string, number> = {
  'border-tech': 70, 'defense': 60, 'logistics': 55,
  'manufacturing': 50, 'ai-ml': 45, 'space': 40, 'energy': 35,
  'cybersecurity': 40, 'healthcare': 25,
};

function calcEPRelevance(signal: WorldSignal): number {
  const text = `${signal.title} ${signal.summary} ${signal.tags.join(' ')}`.toLowerCase();
  let score = EP_SECTOR_WEIGHTS[signal.industry] ?? 20;
  for (const kw of EP_BOOST_KEYWORDS) {
    if (text.includes(kw)) score += 30;
  }
  if (signal.region?.toLowerCase().includes('texas') || signal.region?.toLowerCase().includes('new mexico')) score += 20;
  if (signal.region?.toLowerCase().includes('el paso')) score += 50;
  return Math.min(100, score);
}

function calcImportanceScore(signal: WorldSignal): number {
  let score = 0.3;
  if (signal.signal_type === 'patent_filing') score = 0.55;
  if (signal.signal_type === 'contract_award') score = 0.7;
  if (signal.signal_type === 'funding_round') score = 0.65;
  if (signal.signal_type === 'research_breakthrough') score = 0.6;
  if (signal.signal_type === 'product_launch') score = 0.65;
  if (signal.amount_usd && signal.amount_usd > 1_000_000) score += 0.1;
  if (signal.amount_usd && signal.amount_usd > 100_000_000) score += 0.15;
  if (signal.source_name.includes('DARPA') || signal.source_name.includes('DARPA')) score += 0.15;
  if (signal.source_name.includes('USPTO') || signal.source_name.includes('EPO')) score += 0.1;
  const ep = calcEPRelevance(signal) / 100;
  score = score * 0.7 + ep * 0.3;
  return Math.min(0.99, score);
}

function normalizeIndustry(raw: string): string {
  const map: Record<string, string> = {
    'ai-ml': 'ai-ml', 'artificial intelligence': 'ai-ml', 'machine learning': 'ai-ml',
    'cybersecurity': 'cybersecurity', 'cyber': 'cybersecurity',
    'defense': 'defense', 'military': 'defense', 'government': 'defense',
    'logistics': 'logistics', 'transportation': 'logistics', 'supply chain': 'logistics',
    'manufacturing': 'manufacturing', 'industrial': 'manufacturing',
    'border-tech': 'border-tech', 'border': 'border-tech',
    'energy': 'energy', 'healthcare': 'healthcare', 'space': 'space',
    'finance': 'finance', 'general': 'general',
  };
  return map[raw.toLowerCase()] ?? raw;
}

export async function GET() {
  return NextResponse.json({
    name: 'NXT LINK Worldwide Intelligence Collector',
    description: 'Collects from 16+ free global sources: USPTO, EPO, WIPO, DARPA, NASA, SBIR, OpenAlex, GDELT, SIPRI, Horizon Europe, World Bank, Hacker News, Product Hunt',
    sources: ['gdelt', 'patents', 'epo', 'wipo', 'openalex', 'arxiv', 'sipri', 'usaspending', 'horizon', 'darpa', 'nasa', 'sbir', 'hackernews', 'producthunt', 'worldbank'],
    coverage: ['US', 'EU', 'China', 'Israel', 'India', 'South Korea', 'Japan', 'Global'],
    sectors: ['ai-ml', 'defense', 'cybersecurity', 'logistics', 'manufacturing', 'border-tech', 'energy', 'space'],
    usage: 'POST to run ingestion. Add ?sectors=ai-ml,defense to filter sectors.',
  });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const sectorsParam = searchParams.get('sectors');
  const sectors = sectorsParam ? sectorsParam.split(',') : undefined;
  const dryRun = searchParams.get('dry_run') === 'true';

  const startTime = Date.now();

  // 1. Collect from all worldwide sources
  console.log('[worldwide-ingest] Starting global collection...');
  const { signals, stats, errors } = await runWorldwideCollector({ sectors });
  
  console.log(`[worldwide-ingest] Collected ${signals.length} signals from ${stats.sources_run} source tasks`);

  if (dryRun) {
    return NextResponse.json({
      dry_run: true, collected: signals.length, stats, errors,
      sample: signals.slice(0, 5).map(s => ({
        title: s.title.slice(0, 80),
        source: s.source_name, industry: s.industry,
        region: s.region, type: s.signal_type,
      })),
    });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase not configured', collected: signals.length, stats });
  }

  // 2. Persist to Supabase
  const supabase = createClient();
  let inserted = 0;
  let duplicates = 0;
  let failed = 0;

  // Process in chunks of 25 to avoid overwhelming Supabase
  const chunks: WorldSignal[][] = [];
  for (let i = 0; i < signals.length; i += 25) {
    chunks.push(signals.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    const rows = chunk.map(signal => ({
      title: signal.title?.slice(0, 500) ?? '',
      evidence: signal.summary?.slice(0, 1000) ?? '',
      source: signal.source_name,
      url: signal.source_url,
      signal_type: signal.signal_type,
      industry: normalizeIndustry(signal.industry),
      region: signal.region,
      company: signal.company,
      amount_usd: signal.amount_usd,
      importance_score: calcImportanceScore(signal),
      confidence: 0.7,
      tags: signal.tags,
      discovered_at: signal.published_at,
      // Metadata for deduplication
      external_id: signal.external_id,
    }));

    try {
      const { data, error } = await supabase
        .from('intel_signals')
        .insert(rows)
        .select('id');

      if (error) {
        // Likely duplicate — try upsert on external_id if column exists
        if (error.code === '23505' || error.message.includes('duplicate')) {
          duplicates += chunk.length;
        } else {
          failed += chunk.length;
          console.error('[worldwide-ingest] Insert error:', error.message);
        }
      } else {
        inserted += data?.length ?? 0;
      }
    } catch (e) {
      failed += chunk.length;
    }
  }

  const duration = Math.round((Date.now() - startTime) / 1000);

  // 3. Log collection run
  try {
    await supabase.from('collection_runs').insert({
      run_type: 'worldwide_ingest',
      signals_collected: signals.length,
      signals_inserted: inserted,
      signals_duplicated: duplicates,
      signals_failed: failed,
      source_stats: stats,
      duration_seconds: duration,
      errors_count: errors.length,
      ran_at: new Date().toISOString(),
    }).select();
  } catch {
    // collection_runs table might not exist yet — not critical
  }

  return NextResponse.json({
    ok: true,
    duration_seconds: duration,
    collection: { total: signals.length, sources: stats.sources_run ?? 0 },
    persistence: { inserted, duplicates, failed },
    coverage: {
      sectors: sectors ?? 'all',
      regions: ['US', 'EU', 'China', 'India', 'Korea', 'Japan', 'Israel', 'Global'],
      sources: ['USPTO', 'EPO', 'DARPA', 'OpenAlex', 'GDELT', 'SIPRI', 'USASpending', 'World Bank', 'SBIR', 'Hacker News'],
    },
    stats,
    errors: errors.slice(0, 10),
  });
}
