// @ts-nocheck
/**
 * /api/agents/enrich-signals-v2
 * 
 * GET  — returns enrichment status (total, enriched, % coverage, sample enriched signals)
 * POST — enriches a batch of unenriched signals with meaning/direction/EP score
 * 
 * This is the core intelligence agent: converts raw headlines into strategic intelligence.
 * Each signal gets: meaning, direction, subsystem, capability_layer, el_paso_score, el_paso_angle
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';

// ── Types ────────────────────────────────────────────────────────────────────

interface EnrichedResult {
  id: number;
  meaning: string;
  direction: 'growing' | 'stable' | 'declining' | 'emerging' | 'converging' | 'disrupted';
  subsystem: string;
  capability_layer: 'Autonomous' | 'Platform' | 'Infrastructure' | 'Application' | 'Research' | 'Policy' | 'Funding';
  el_paso_score: number;
  el_paso_angle: string;
}

interface RawSignal {
  id: number;
  title: string;
  signal_type: string | null;
  industry: string | null;
  company: string | null;
  evidence: string | null;
  source: string | null;
  region: string | null;
}

// ── Extraction system prompt ─────────────────────────────────────────────────

const EXTRACTION_SYSTEM = `You are a strategic intelligence extraction system for NXT LINK — the global tech intelligence platform for El Paso's Space Valley and Borderplex ecosystem.

Transform raw tech signals into structured strategic intelligence.

El Paso Borderplex context you must understand:
- Fort Bliss: 1st Armored Division, THAAD missile defense, AI autonomy test programs, DoD AI testing corridor
- UTEP: NSF research grants, Space Valley positioning, cross-border engineering programs
- SpaceX Starbase: 45 min from El Paso — commercial space economy emerging in the region
- Ciudad Juárez maquiladoras: 300+ plants (Ford, Foxconn, Bosch, Lear, Foxconn) — nearshoring accelerating
- CBP/DHS/USBP: largest border infrastructure in Western Hemisphere
- $126B annual US-Mexico trade through BOTA/BOTE/Santa Teresa ports

For EACH signal in the batch, return a JSON object with:
- id: the signal ID (integer, exact match to input)
- meaning: NOT what happened, but what PATTERN it signals. "This indicates X heading toward Y." Use present tense. Be specific about technology trajectories. (1-2 sentences max)
- direction: one of exactly: growing | stable | declining | emerging | converging | disrupted
- subsystem: specific technology sub-area (e.g. "Autonomous Border Surveillance", "Hypersonic Propulsion", "Cross-Border Payments", "Quantum Key Distribution")
- capability_layer: one of exactly: Autonomous | Platform | Infrastructure | Application | Research | Policy | Funding
- el_paso_score: integer 0-100 relevance to El Paso Borderplex. 80+ = direct impact on Fort Bliss/maquiladoras/CBP. 60-79 = sector-relevant for regional economy. 40-59 = national context that affects El Paso. Below 40 = global background.
- el_paso_angle: ONE sentence explaining exactly why El Paso cares — connect specifically to Fort Bliss, UTEP, CBP, maquiladoras, SpaceX Starbase, or the $126B trade corridor.

RULES:
- Never describe what happened — always explain what it INDICATES about where a sector is heading
- Always find the El Paso angle, even for global signals (quantum computing → UTEP research, supply chain → Juárez maquiladoras, etc.)
- Be specific: name the technology, name the shift, name the direction
- direction="converging" when two sectors are merging (e.g. AI + defense = converging)
- direction="disrupted" when a technology is being displaced or broken
- Return ONLY a valid JSON array. No markdown, no backticks, no explanation.`;

// ── GET: enrichment status ────────────────────────────────────────────────────

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase not configured' });
  }

  const supabase = createClient();

  const [totalRes, enrichedRes, pendingRes, sampleRes] = await Promise.all([
    supabase
      .from('intel_signals')
      .select('*', { count: 'exact', head: true })
      .not('source', 'ilike', '%arxiv%'),
    supabase
      .from('intel_signals')
      .select('*', { count: 'exact', head: true })
      .not('enriched_at', 'is', null),
    supabase
      .from('intel_signals')
      .select('*', { count: 'exact', head: true })
      .is('enriched_at', null)
      .not('source', 'ilike', '%arxiv%'),
    supabase
      .from('intel_signals')
      .select('id, title, industry, meaning, direction, el_paso_score, el_paso_angle, enriched_at')
      .not('enriched_at', 'is', null)
      .order('enriched_at', { ascending: false })
      .limit(5),
  ]);

  const total = totalRes.count ?? 0;
  const enriched = enrichedRes.count ?? 0;

  return NextResponse.json({
    ok: true,
    total,
    enriched,
    pending: pendingRes.count ?? 0,
    coverage_pct: total ? Math.round((enriched / total) * 100) : 0,
    sample: sampleRes.data ?? [],
    ready_to_run: (pendingRes.count ?? 0) > 0,
  });
}

// ── POST: enrich a batch ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase not configured' }, { status: 503 });
  }

  let batchSize = 25;
  try {
    const body = await req.json();
    if (body.batch_size) batchSize = Math.min(Math.max(1, body.batch_size), 50);
  } catch {
    // default
  }

  const supabase = createClient();

  // ── 1. Fetch unenriched signals ───────────────────────────────────────────

  const { data: raw, error: fetchErr } = await supabase
    .from('intel_signals')
    .select('id, title, signal_type, industry, company, evidence, source, region')
    .is('enriched_at', null)
    .not('source', 'ilike', '%arxiv%')
    .not('title', 'ilike', '%arXiv%')
    .order('importance_score', { ascending: false })
    .limit(batchSize);

  if (fetchErr) {
    return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 });
  }

  if (!raw || raw.length === 0) {
    return NextResponse.json({
      ok: true,
      batch_processed: 0,
      enriched: 0,
      message: 'No unenriched signals found — all signals processed!',
    });
  }

  const signals: RawSignal[] = raw as RawSignal[];

  // ── 2. Process in sub-batches of 10 for AI ───────────────────────────────

  const SUB_BATCH = 10;
  const allResults: EnrichedResult[] = [];
  const failures: { id: number; error: string }[] = [];

  for (let i = 0; i < signals.length; i += SUB_BATCH) {
    const chunk = signals.slice(i, i + SUB_BATCH);

    const prompt = chunk
      .map((s, idx) =>
        `Signal ${idx + 1}:\nID: ${s.id}\nTitle: ${s.title}\nType: ${s.signal_type || 'general'}\nIndustry: ${s.industry || 'unknown'}\nCompany: ${s.company || 'none'}\nEvidence: ${(s.evidence || '').slice(0, 400)}\nSource: ${s.source || 'unknown'}\nRegion: ${s.region || 'global'}`,
      )
      .join('\n\n');

    try {
      const { result } = await runParallelJsonEnsemble<EnrichedResult[]>({
        systemPrompt: EXTRACTION_SYSTEM,
        userPrompt: `Analyze these ${chunk.length} signals. Return a JSON array with exactly ${chunk.length} objects.\n\n${prompt}`,
        temperature: 0.1,
        preferredProviders: ['gemini'],
        budget: { maxProviders: 1, preferLowCostProviders: true },
        parse: (content) => {
          const cleaned = content
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
          const parsed = JSON.parse(cleaned);
          return Array.isArray(parsed) ? parsed : [parsed];
        },
      });

      if (Array.isArray(result)) {
        allResults.push(...result.filter(r => r && typeof r.id !== 'undefined'));
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[enrich-v2] Sub-batch ${i / SUB_BATCH + 1} failed:`, errMsg);
      for (const s of chunk) {
        failures.push({ id: s.id, error: errMsg.slice(0, 100) });
      }
    }
  }

  // ── 3. Write enriched data back to Supabase ──────────────────────────────

  let written = 0;
  for (const result of allResults) {
    const { error: updateErr } = await supabase
      .from('intel_signals')
      .update({
        meaning: result.meaning,
        direction: result.direction,
        subsystem: result.subsystem,
        capability_layer: result.capability_layer,
        el_paso_score: result.el_paso_score,
        el_paso_angle: result.el_paso_angle,
        enriched_at: new Date().toISOString(),
      })
      .eq('id', result.id);

    if (!updateErr) written++;
  }

  // ── 4. Get updated coverage stats ────────────────────────────────────────

  const [totalRes, enrichedRes] = await Promise.all([
    supabase
      .from('intel_signals')
      .select('*', { count: 'exact', head: true })
      .not('source', 'ilike', '%arxiv%'),
    supabase
      .from('intel_signals')
      .select('*', { count: 'exact', head: true })
      .not('enriched_at', 'is', null),
  ]);

  const total = totalRes.count ?? 0;
  const enriched = enrichedRes.count ?? 0;

  return NextResponse.json({
    ok: true,
    batch_processed: signals.length,
    enriched: written,
    failed: failures.length,
    coverage_pct: total ? Math.round((enriched / total) * 100) : 0,
    total_enriched: enriched,
    total_signals: total,
    sample: allResults.slice(0, 3).map(r => ({
      id: r.id,
      meaning: r.meaning,
      direction: r.direction,
      subsystem: r.subsystem,
      el_paso_score: r.el_paso_score,
    })),
    failures: failures.slice(0, 5),
  });
}
