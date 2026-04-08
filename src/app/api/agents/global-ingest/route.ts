/**
 * POST /api/agents/global-ingest
 *
 * Runs the full global intelligence collection via runGlobalAPIs and
 * persists results to the intel_signals Supabase table.
 *
 * GET  — returns status (available APIs, last run info)
 * POST — runs collection and saves to Supabase
 */

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { GlobalSignal } from '@/lib/sources/global-apis';

export const maxDuration = 300; // 5 minutes

// ── Helpers ────────────────────────────────────────────────────────────────────

function chunks<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function calcImportance(s: GlobalSignal): number {
  let score = 0.35;
  if (s.signal_type === 'contract_award') score = 0.75;
  if (s.signal_type === 'patent_filing') score = 0.60;
  if (s.signal_type === 'research_breakthrough') score = 0.65;
  if (s.signal_type === 'funding_round') score = 0.70;
  if (s.amount && s.amount > 10_000_000) score += 0.10;
  if (s.amount && s.amount > 100_000_000) score += 0.15;
  // EP relevance boost
  const epTerms = ['el paso', 'fort bliss', 'juarez', 'border', 'cbp', 'bota', 'utep'];
  const text = `${s.title} ${s.summary}`.toLowerCase();
  if (epTerms.some(t => text.includes(t))) score += 0.20;
  return Math.min(0.99, score);
}

// ── GET — status endpoint ──────────────────────────────────────────────────────

export async function GET() {
  let lastRun: string | null = null;
  let lastCount = 0;

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('collection_runs')
        .select('ran_at, signals_inserted')
        .eq('run_type', 'global_ingest')
        .order('ran_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        lastRun = data.ran_at;
        lastCount = data.signals_inserted ?? 0;
      }
    } catch {
      // collection_runs may not exist yet
    }
  }

  return NextResponse.json({
    name: 'NXT LINK Global Intelligence Ingest',
    description: 'Collects from 40+ global APIs: USPTO, EPO, WIPO, JPO, CNIPA, KIPO, OpenAlex, PubMed, Semantic Scholar, CrossRef, SAM.gov, USASpending, SBIR, TED EU, UK Tenders, World Bank, NASA, ESA, ISRO, JAXA, DARPA, SIPRI, and more.',
    apis_available: [
      'USPTO PatentsView', 'WIPO PatentScope', 'EPO Espacenet', 'JPO', 'CNIPA', 'KIPO',
      'OpenAlex', 'PubMed/NCBI', 'Semantic Scholar', 'CrossRef',
      'SAM.gov', 'USASpending.gov', 'SBIR.gov', 'TED EU Procurement', 'UK Find a Tender',
      'World Bank', 'IMF Data', 'FRED', 'UN Comtrade',
      'NASA Tech Transfer', 'ESA', 'ISRO', 'JAXA',
      'DARPA', 'SIPRI', 'Horizon Europe', 'GDELT', 'arXiv',
    ],
    sectors: ['ai-ml', 'defense', 'cybersecurity', 'logistics', 'manufacturing', 'border-tech', 'energy', 'space'],
    coverage: ['US', 'EU', 'China', 'Israel', 'India', 'South Korea', 'Japan', 'Global'],
    last_run: lastRun,
    last_run_inserted: lastCount,
    supabase_configured: isSupabaseConfigured(),
    usage: 'POST with optional { sectors: ["ai-ml","defense"] } body to filter sectors.',
  });
}

// ── POST — run collection ──────────────────────────────────────────────────────

export async function POST(request: Request) {
  const startTime = Date.now();

  let sectors: string[] | undefined;
  try {
    const body = await request.json();
    sectors = Array.isArray(body?.sectors) ? body.sectors : undefined;
  } catch {
    // no body — run all sectors
  }

  // Import and run the global collector
  const { runGlobalAPIs } = await import('@/lib/sources/global-apis');
  let signals: GlobalSignal[] = [];
  let coverage: Record<string, unknown> = {};
  let errors: string[] = [];

  try {
    const result = await runGlobalAPIs({ sectors });
    signals = result.signals ?? [];
    coverage = result.coverage ?? {};
    errors = result.errors ?? [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      ok: false,
      error: `runGlobalAPIs failed: ${msg}`,
      collected: 0,
      inserted: 0,
      duplicates: 0,
      coverage: {},
      errors: [msg],
    }, { status: 500 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: false,
      message: 'Supabase not configured — signals collected but not persisted',
      collected: signals.length,
      inserted: 0,
      duplicates: 0,
      coverage,
      errors: errors.slice(0, 5),
    });
  }

  const supabase = createClient();
  let inserted = 0;
  let duplicates = 0;
  let failed = 0;

  for (const chunk of chunks(signals, 25)) {
    const rows = chunk.map(s => ({
      title: s.title?.slice(0, 500) ?? '',
      evidence: s.summary?.slice(0, 1000) ?? '',
      source: s.source,
      url: s.url,
      signal_type: s.signal_type,
      industry: s.industry,
      region: s.region,
      company: s.company,
      amount_usd: s.amount,
      importance_score: calcImportance(s),
      confidence: 0.75,
      tags: s.tags,
      discovered_at: s.date,
    }));

    try {
      const { data, error } = await supabase
        .from('intel_signals')
        .insert(rows)
        .select('id');

      if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate')) {
          duplicates += chunk.length;
        } else {
          failed += chunk.length;
          console.error('[global-ingest] Insert error:', error.message);
        }
      } else {
        inserted += data?.length ?? 0;
      }
    } catch {
      failed += chunk.length;
    }
  }

  const duration = Math.round((Date.now() - startTime) / 1000);

  // Log run to collection_runs table
  try {
    await supabase.from('collection_runs').insert({
      run_type: 'global_ingest',
      signals_collected: signals.length,
      signals_inserted: inserted,
      signals_duplicated: duplicates,
      signals_failed: failed,
      duration_seconds: duration,
      errors_count: errors.length,
      ran_at: new Date().toISOString(),
    });
  } catch {
    // non-critical
  }

  return NextResponse.json({
    ok: true,
    duration_seconds: duration,
    collected: signals.length,
    inserted,
    duplicates,
    failed,
    coverage,
    errors: errors.slice(0, 5),
  });
}
