import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { FALLBACK_INTEL_SIGNALS } from '@/lib/intelligence/fallback-signals';

export const dynamic = 'force-dynamic';

// Canonical industry labels — normalizes messy DB values
const INDUSTRY_MAP: Record<string, string> = {
  'ai-ml': 'ai-ml',
  'ai/ml': 'ai-ml',
  'artificial intelligence': 'ai-ml',
  'machine learning': 'ai-ml',
  'tech': 'ai-ml',
  'technology': 'ai-ml',
  'cybersecurity': 'cybersecurity',
  'cyber': 'cybersecurity',
  'security': 'cybersecurity',
  'defense': 'defense',
  'government': 'defense',
  'border-tech': 'border-tech',
  'bordertech': 'border-tech',
  'border': 'border-tech',
  'manufacturing': 'manufacturing',
  'industrial': 'manufacturing',
  'logistics': 'logistics',
  'transportation': 'logistics',
  'supply chain': 'logistics',
  'supply-chain': 'logistics',
  'energy': 'energy',
  'healthcare': 'healthcare',
  'health': 'healthcare',
  'biotech': 'healthcare',
  'finance': 'finance',
  'fintech': 'finance',
  'space': 'space',
  'telecom': 'space',
  'startup': 'startup',
  'education': 'education',
  'robotics': 'manufacturing',
  'automotive': 'logistics',
  'construction': 'manufacturing',
  'agriculture': 'energy',
  'food': 'energy',
};

function normalizeIndustry(raw: string | null): string {
  if (!raw) return 'general';
  const key = raw.toLowerCase().trim();
  return INDUSTRY_MAP[key] ?? raw.toLowerCase().trim();
}

// Sources that are purely academic — not business intelligence
const ACADEMIC_SOURCES = ['arxiv', 'arxiv.org', 'ar5iv', 'semanticscholar'];

function isAcademic(source: string | null, title: string | null): boolean {
  if (!source) return false;
  const s = source.toLowerCase();
  if (ACADEMIC_SOURCES.some(a => s.includes(a))) return true;
  // arXiv papers often have titles starting with "arxiv:" or look like papers
  if (title?.toLowerCase().startsWith('arxiv')) return true;
  return false;
}

/**
 * GET /api/intel/feed
 * Global tech intelligence feed — signals from all sectors and regions worldwide.
 * Pulls directly from intel_signals table. No complex pipeline filtering.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const tab        = searchParams.get('tab') ?? 'all';
  const industry   = searchParams.get('industry') ?? 'ALL';
  const regionParam = searchParams.get('region') ?? 'ALL';
  const signalType = searchParams.get('signal_type') ?? 'ALL';
  const queryText  = (searchParams.get('q') ?? '').trim();
  const minScore   = Number(searchParams.get('min_score') ?? 0);
  const page       = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10) || 0);
  const pageSize   = Math.min(100, Math.max(1, parseInt(searchParams.get('page_size') ?? '25', 10) || 25));
  const offset     = page * pageSize;

  if (!isSupabaseConfigured()) {
    const fallback = FALLBACK_INTEL_SIGNALS.slice(offset, offset + pageSize);
    return NextResponse.json({
      signals: fallback,
      totalCount: FALLBACK_INTEL_SIGNALS.length,
      highCount: FALLBACK_INTEL_SIGNALS.filter(s => s.importance_score >= 0.75).length,
      filteredCount: FALLBACK_INTEL_SIGNALS.length,
      page,
      pageSize,
      source: 'fallback',
    });
  }

  try {
    const supabase = createClient();

    // Base query — exclude academic arXiv noise
    let query = supabase
      .from('intel_signals')
      .select('id, title, evidence, source, industry, importance_score, confidence, discovered_at, url, signal_type, company, region', { count: 'exact' })
      .not('source', 'ilike', '%arxiv%')
      .not('source', 'ilike', '%ar5iv%')
      .order('discovered_at', { ascending: false });

    // Tab filters
    if (tab === 'high') {
      query = query.gte('importance_score', 0.65);
    } else if (tab === 'trending') {
      query = query.gte('importance_score', 0.5);
    }

    // Industry filter — match against normalized values
    if (industry !== 'ALL') {
      // Match the raw industry value OR common variants
      const variants = Object.entries(INDUSTRY_MAP)
        .filter(([, v]) => v === industry)
        .map(([k]) => k);
      // Use OR across known variants + exact match
      const allVariants = Array.from(new Set([industry, ...variants]));
      query = query.in('industry', allVariants);
    }

    // Signal type filter
    if (signalType !== 'ALL') {
      query = query.eq('signal_type', signalType);
    }

    // Region filter
    if (regionParam !== 'ALL') {
      const regionVariants: Record<string, string[]> = {
        'United States': ['United States', 'US', 'North America', 'Texas', 'Texas / El Paso'],
        'China':         ['China', 'East Asia'],
        'Europe':        ['Europe', 'EU', 'Germany', 'France', 'UK', 'United Kingdom'],
        'Israel':        ['Israel', 'Middle East'],
        'India':         ['India', 'South Asia'],
        'South Korea':   ['South Korea', 'Korea', 'East Asia'],
        'Japan':         ['Japan', 'East Asia'],
        'Emerging':      ['Africa', 'South America', 'Southeast Asia', 'Latin America', 'Global'],
      };
      const variants = regionVariants[regionParam] ?? [regionParam];
      query = query.in('region', variants);
    }

    // Min score filter
    if (minScore > 0) {
      const normalized = minScore > 1 ? minScore / 100 : minScore;
      query = query.gte('importance_score', normalized);
    }

    // Text search
    if (queryText) {
      const safe = queryText.replace(/[%_]/g, '');
      query = query.or(
        `title.ilike.%${safe}%,evidence.ilike.%${safe}%,company.ilike.%${safe}%`
      );
    }

    // Paginate
    const { data, count, error } = await query.range(offset, offset + pageSize - 1);

    if (error) throw error;

    // Get counts
    const [totalResult, highResult] = await Promise.all([
      supabase
        .from('intel_signals')
        .select('*', { count: 'exact', head: true })
        .not('source', 'ilike', '%arxiv%'),
      supabase
        .from('intel_signals')
        .select('*', { count: 'exact', head: true })
        .not('source', 'ilike', '%arxiv%')
        .gte('importance_score', 0.65),
    ]);

    const signals = (data ?? []).map(s => ({
      ...s,
      industry: normalizeIndustry(s.industry),
    }));

    return NextResponse.json(
      {
        signals,
        totalCount: totalResult.count ?? 0,
        highCount: highResult.count ?? 0,
        filteredCount: count ?? 0,
        page,
        pageSize,
        source: 'supabase',
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (err) {
    console.error('[intel/feed] Error:', err);

    // Always return something — never a blank page
    const fallback = FALLBACK_INTEL_SIGNALS.slice(offset, offset + pageSize);
    return NextResponse.json({
      signals: fallback,
      totalCount: FALLBACK_INTEL_SIGNALS.length,
      highCount: FALLBACK_INTEL_SIGNALS.filter(s => s.importance_score >= 0.75).length,
      filteredCount: FALLBACK_INTEL_SIGNALS.length,
      page,
      pageSize,
      source: 'fallback',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
