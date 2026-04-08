// POST /api/agents/patent-discovery
// Fetches real patents from PatentsView API and persists them to kg_discoveries.
// Covers sectors relevant to El Paso's Space Valley / Borderplex ecosystem:
// AI, logistics, defense, border-tech, manufacturing, energy.
//
// Schedule: daily at 10:00 UTC (see vercel.json)

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const maxDuration = 120;

// ─── Types ────────────────────────────────────────────────────────────────────

type PatentsViewPatent = {
  patent_id?: string;
  patent_title?: string;
  patent_abstract?: string;
  patent_date?: string;
  assignee_organization?: string | null;
  cpc_section_id?: string | null;
};

type PatentsViewResponse = {
  patents?: PatentsViewPatent[] | null;
  total_patent_count?: number;
  count?: number;
};

type PatentResult = {
  sector: string;
  query: string;
  fetched: number;
  inserted: number;
  skipped: number;
  errors: number;
};

// ─── Sector queries ───────────────────────────────────────────────────────────

const SECTOR_QUERIES: Array<{ sector: string; query: string }> = [
  { sector: 'AI / Machine Learning',  query: 'autonomous machine learning neural network' },
  { sector: 'Logistics & Supply Chain', query: 'autonomous logistics supply chain optimization' },
  { sector: 'Defense Technology',     query: 'defense unmanned autonomous systems military' },
  { sector: 'Border Technology',      query: 'border surveillance detection crossing security' },
  { sector: 'Advanced Manufacturing', query: 'robotics additive manufacturing smart factory' },
  { sector: 'Energy Technology',      query: 'renewable energy storage grid optimization' },
];

// ─── PatentsView API helper ───────────────────────────────────────────────────

async function fetchPatentsForQuery(query: string): Promise<PatentsViewPatent[]> {
  const url = 'https://api.patentsview.org/patents/query';
  const body = {
    q: { _text_phrase: { patent_abstract: query } },
    f: ['patent_id', 'patent_title', 'patent_abstract', 'patent_date', 'assignee_organization', 'cpc_section_id'],
    o: { per_page: 20, sort: [{ patent_date: 'desc' }] },
    // Only get recent patents (2023+)
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`[patent-discovery] PatentsView returned ${res.status} for "${query}"`);
      return [];
    }

    const data: PatentsViewResponse = await res.json();
    return data.patents ?? [];
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn(`[patent-discovery] Timeout for query "${query}"`);
    } else {
      console.warn(`[patent-discovery] Fetch error for "${query}":`, err);
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// ─── IKER impact score calculator ────────────────────────────────────────────

function calcIkerScore(patent: PatentsViewPatent): number {
  let score = 50; // base

  // Boost for known high-value assignees
  const assignee = (patent.assignee_organization ?? '').toLowerCase();
  const highValueOrgs = ['lockheed', 'raytheon', 'boeing', 'northrop', 'bae', 'l3harris',
    'google', 'microsoft', 'amazon', 'nvidia', 'qualcomm', 'intel',
    'university', 'mit', 'stanford', 'darpa', 'dod', 'army', 'navy'];
  if (highValueOrgs.some(org => assignee.includes(org))) score += 20;

  // Boost for CPC section G (Physics) or H (Electricity) — most relevant
  const cpc = (patent.cpc_section_id ?? '').toUpperCase();
  if (cpc === 'G' || cpc === 'H') score += 10;

  // Boost for recent patents (2024+)
  const date = patent.patent_date ?? '';
  if (date >= '2024-01-01') score += 15;
  else if (date >= '2023-01-01') score += 8;

  return Math.min(99, score);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  // Optional secret auth (same pattern as other agents)
  const authHeader = request.headers.get('authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const startMs = Date.now();
  const supabase = createClient();
  const results: PatentResult[] = [];
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // Check if kg_discoveries table is available
  const { error: tableCheck } = await supabase
    .from('kg_discoveries')
    .select('id')
    .limit(1);

  if (tableCheck) {
    console.warn('[patent-discovery] kg_discoveries table may not exist:', tableCheck.message);
  }

  // Fetch existing patent titles to avoid duplicates
  const { data: existingRows } = await supabase
    .from('kg_discoveries')
    .select('title')
    .eq('discovery_type', 'patent')
    .limit(1000);

  const existingTitles = new Set(
    (existingRows ?? []).map(r => (r.title ?? '').toLowerCase().trim())
  );

  // Process each sector query sequentially to avoid rate limits
  for (const { sector, query } of SECTOR_QUERIES) {
    const patents = await fetchPatentsForQuery(query);
    let inserted = 0, skipped = 0, errors = 0;

    for (const patent of patents) {
      const title = (patent.patent_title ?? '').trim();
      if (!title) { skipped++; continue; }

      // Skip duplicates
      if (existingTitles.has(title.toLowerCase())) { skipped++; continue; }

      const ikerScore = calcIkerScore(patent);
      const patentUrl = patent.patent_id
        ? `https://patents.google.com/patent/US${patent.patent_id}`
        : 'https://patentsview.org';

      // Build discovery row
      const discoveryRow = {
        title,
        summary: patent.patent_abstract
          ? patent.patent_abstract.slice(0, 1000)
          : `Patent in ${sector}. Assigned to: ${patent.assignee_organization ?? 'Unknown'}.`,
        discovery_type: 'patent',
        source_url: patentUrl,
        source_name: 'PatentsView / USPTO',
        research_institution: patent.assignee_organization ?? null,
        published_at: patent.patent_date ?? null,
        iker_impact_score: ikerScore,
        // Additional metadata stored in summary for rich context
      };

      const { error: insertError } = await supabase
        .from('kg_discoveries')
        .insert(discoveryRow);

      if (insertError) {
        console.warn(`[patent-discovery] Insert error for "${title}":`, insertError.message);
        errors++;
      } else {
        existingTitles.add(title.toLowerCase()); // prevent re-insert in same run
        inserted++;
        totalInserted++;
      }
    }

    totalSkipped += skipped;
    totalErrors += errors;

    results.push({
      sector,
      query,
      fetched: patents.length,
      inserted,
      skipped,
      errors,
    });

    // Brief pause between API calls
    await new Promise(r => setTimeout(r, 300));
  }

  return NextResponse.json({
    ok: true,
    total_inserted: totalInserted,
    total_skipped: totalSkipped,
    total_errors: totalErrors,
    duration_ms: Date.now() - startMs,
    sectors_processed: results.length,
    results,
    generated_at: new Date().toISOString(),
  });
}

// ─── GET — health check ───────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    agent: 'patent-discovery',
    description: 'Fetches patents from PatentsView / USPTO and persists to kg_discoveries',
    sectors: SECTOR_QUERIES.map(q => q.sector),
    schedule: '0 10 * * * (daily at 10:00 UTC)',
    method: 'POST to trigger',
  });
}
