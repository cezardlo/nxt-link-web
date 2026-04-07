/**
 * POST /api/agents/enrich-signals
 * 
 * Takes raw intel_signals and converts them into structured intelligence objects.
 * Each signal gets: subsystem, capability_layer, meaning, direction
 * 
 * This is what makes NXT LINK smart — not just a news reader,
 * but a system that converts information into understanding.
 */

import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// ── Structured signal schema ────────────────────────────────────────────────
interface EnrichedSignal {
  id: string;
  industry: string;        // normalized canonical industry
  subsystem: string;       // sub-category within industry
  capability_layer: string; // Autonomous | Platform | Infrastructure | Application | Research | Policy
  type: string;            // funding | research | product | contract | patent | regulation | news
  importance: 'low' | 'medium' | 'high' | 'critical';
  meaning: string;         // what it means strategically (1-2 sentences)
  direction: string;       // growing | stable | declining | emerging | converging
}

// ── Industry normalizer ─────────────────────────────────────────────────────
const INDUSTRY_MAP: Record<string, string> = {
  'ai-ml': 'ai-ml', 'ai/ml': 'ai-ml', 'artificial intelligence': 'ai-ml',
  'machine learning': 'ai-ml', 'tech': 'ai-ml', 'technology': 'ai-ml',
  'cybersecurity': 'cybersecurity', 'cyber': 'cybersecurity', 'security': 'cybersecurity',
  'defense': 'defense', 'government': 'defense', 'military': 'defense',
  'border-tech': 'border-tech', 'bordertech': 'border-tech', 'border': 'border-tech',
  'manufacturing': 'manufacturing', 'industrial': 'manufacturing', 'robotics': 'manufacturing',
  'logistics': 'logistics', 'transportation': 'logistics', 'supply chain': 'logistics',
  'energy': 'energy', 'healthcare': 'healthcare', 'health': 'healthcare',
  'finance': 'finance', 'fintech': 'finance', 'space': 'space', 'telecom': 'space',
  'startup': 'ai-ml', 'education': 'ai-ml', 'general': 'general',
};

function normalizeIndustry(raw: string | null): string {
  if (!raw) return 'general';
  return INDUSTRY_MAP[raw.toLowerCase().trim()] ?? raw.toLowerCase().trim();
}

// ── Main extraction prompt ──────────────────────────────────────────────────
const EXTRACTION_SYSTEM = `You are an intelligence extraction system. Your job is to convert raw news signals into structured intelligence objects.

For each signal, extract:
1. industry — one of: ai-ml, defense, cybersecurity, logistics, manufacturing, border-tech, energy, healthcare, space, finance, general
2. subsystem — specific sub-area within the industry (e.g. "Autonomous Vehicles", "Missile Defense", "Border Surveillance", "Route Optimization")
3. capability_layer — one of: Autonomous | Platform | Infrastructure | Application | Research | Policy | Funding
4. importance — one of: low | medium | high | critical
5. meaning — 1-2 sentences: NOT what happened, but what it MEANS strategically. What pattern does this signal? What shift does it indicate?
6. direction — one of: growing | stable | declining | emerging | converging

Rules:
- Never describe the event. Explain the strategic implication.
- "growing" = this area is getting more signals, investment, and activity
- "emerging" = this area is new and accelerating fast
- "converging" = this area is merging with another sector
- "declining" = less activity, less investment, losing momentum
- Critical importance = affects multiple sectors, major shift, Fort Bliss / Borderplex directly impacted
- Be specific: name the capability, name the shift, name the direction

Respond with a JSON array only. No markdown.`;

// ── GET: status / health ────────────────────────────────────────────────────
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase not configured' });
  }

  const supabase = createClient();
  
  const [totalRes, enrichedRes, pendingRes] = await Promise.all([
    supabase.from('intel_signals').select('*', { count: 'exact', head: true })
      .not('source', 'ilike', '%arxiv%'),
    supabase.from('intel_signals').select('*', { count: 'exact', head: true })
      .not('enriched_at', 'is', null),
    supabase.from('intel_signals').select('*', { count: 'exact', head: true })
      .is('enriched_at', null)
      .not('source', 'ilike', '%arxiv%'),
  ]);

  return NextResponse.json({
    ok: true,
    total: totalRes.count ?? 0,
    enriched: enrichedRes.count ?? 0,
    pending: pendingRes.count ?? 0,
    coverage_pct: totalRes.count 
      ? Math.round(((enrichedRes.count ?? 0) / totalRes.count) * 100) 
      : 0,
  });
}

// ── POST: enrich a batch of signals ────────────────────────────────────────
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase not configured' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const batchSize = Math.min(body.batch_size ?? 20, 50);
  const forceRe = body.force_re_enrich === true;

  const supabase = createClient();

  // Pull unenriched signals (skip arXiv)
  let query = supabase
    .from('intel_signals')
    .select('id, title, evidence, source, industry, signal_type, company, importance_score')
    .not('source', 'ilike', '%arxiv%')
    .order('importance_score', { ascending: false })
    .limit(batchSize);

  if (!forceRe) {
    query = query.is('enriched_at', null);
  }

  const { data: signals, error } = await query;

  if (error || !signals?.length) {
    return NextResponse.json({ ok: true, enriched: 0, message: 'No signals to enrich' });
  }

  // Build the extraction prompt
  const signalInput = signals.map((s, i) => 
    `[${i}] ID:${s.id} | TITLE: ${s.title} | TYPE: ${s.signal_type ?? 'unknown'} | INDUSTRY: ${s.industry ?? 'unknown'} | COMPANY: ${s.company ?? 'none'} | EVIDENCE: ${(s.evidence ?? '').slice(0, 200)}`
  ).join('\n');

  let enriched: EnrichedSignal[] = [];
  
  try {
    const { result } = await runParallelJsonEnsemble<EnrichedSignal[]>({
      systemPrompt: EXTRACTION_SYSTEM,
      userPrompt: `Extract structured intelligence from these ${signals.length} signals:\n\n${signalInput}\n\nReturn a JSON array of ${signals.length} objects. Each object needs: id (the exact ID from [N]), industry, subsystem, capability_layer, importance, meaning, direction.`,
      temperature: 0.1,
      preferredProviders: ['gemini'],
      budget: { maxProviders: 1, preferLowCostProviders: true },
      parse: (content) => {
        const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned) as EnrichedSignal[];
      },
    });
    enriched = result;
  } catch (err) {
    console.error('[enrich-signals] AI extraction failed:', err);
    // Fallback: basic enrichment from existing fields
    enriched = signals.map(s => ({
      id: s.id,
      industry: normalizeIndustry(s.industry),
      subsystem: s.industry ?? 'General',
      capability_layer: s.signal_type === 'patent_filing' ? 'Research' 
        : s.signal_type === 'funding_round' ? 'Funding'
        : s.signal_type === 'product_launch' ? 'Application'
        : s.signal_type === 'contract_award' ? 'Platform'
        : 'Application',
      importance: (s.importance_score ?? 0) >= 0.85 ? 'critical'
        : (s.importance_score ?? 0) >= 0.65 ? 'high'
        : (s.importance_score ?? 0) >= 0.4 ? 'medium' : 'low',
      meaning: `Signal in ${s.industry ?? 'tech'} sector — ${s.signal_type ?? 'development'} activity detected.`,
      direction: 'stable',
    }));
  }

  // Persist enriched signals back to Supabase
  let savedCount = 0;
  const errors: string[] = [];
  const now = new Date().toISOString();

  for (const enrichedSignal of enriched) {
    // Match by index position if ID extraction fails
    const originalSignal = signals.find(s => s.id === enrichedSignal.id) ?? signals[enriched.indexOf(enrichedSignal)];
    if (!originalSignal) continue;

    const { error: updateError } = await supabase
      .from('intel_signals')
      .update({
        industry: normalizeIndustry(enrichedSignal.industry),
        subsystem: enrichedSignal.subsystem,
        capability_layer: enrichedSignal.capability_layer,
        meaning: enrichedSignal.meaning,
        direction: enrichedSignal.direction,
        enriched_at: now,
      })
      .eq('id', originalSignal.id);

    if (updateError) {
      errors.push(`${originalSignal.id}: ${updateError.message}`);
    } else {
      savedCount++;
    }
  }

  return NextResponse.json({
    ok: true,
    batch_size: batchSize,
    signals_processed: signals.length,
    enriched: savedCount,
    errors: errors.length,
    sample: enriched.slice(0, 3).map(e => ({
      title: signals.find(s => s.id === e.id)?.title?.slice(0, 60),
      industry: e.industry,
      subsystem: e.subsystem,
      layer: e.capability_layer,
      importance: e.importance,
      direction: e.direction,
      meaning: e.meaning?.slice(0, 100),
    })),
  });
}
