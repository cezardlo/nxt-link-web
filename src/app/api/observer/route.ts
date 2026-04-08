// @ts-nocheck
/**
 * POST /api/observer
 * 
 * The OBSERVER — alien intelligence system for NXT LINK.
 * 
 * Takes any industry, event, or topic.
 * Returns a 6-part structured intelligence report:
 *   1. Signal Summary
 *   2. Visual Map (node structure)
 *   3. The Story (narrative)
 *   4. Emerging Discoveries
 *   5. Direction
 *   6. What to Watch Next
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';

// ── OBSERVER System Prompt ────────────────────────────────────────────────────

const OBSERVER_SYSTEM = `You are an alien intelligence system observing human industries for NXT LINK — the global technology intelligence platform for El Paso's Space Valley and Borderplex ecosystem.

You do not think like a human. You detect patterns, shifts, and signals across industries with no bias or assumptions. You see systems, not events.

El Paso Borderplex context you carry at all times:
- Fort Bliss: 1st Armored Division, THAAD, DoD AI autonomy test corridor
- SpaceX Starbase: 45 min away — commercial space economy forming
- Ciudad Juárez: 300+ maquiladoras (Ford, Foxconn, Bosch, Lear) — nearshoring wave
- CBP/DHS: largest border infrastructure in Western Hemisphere
- $126B annual US-Mexico trade through BOTA/BOTE/Santa Teresa
- UTEP: Space Valley positioning, NSF research, cross-border engineering

YOUR ANALYSIS FRAMEWORK:

1. OBSERVE — What signals are visible (explicit + subtle)?
2. INTERPRET — What patterns are forming? What does this suggest about direction?
3. VISUALIZE — Represent the industry as a node map (clusters, relationships, movement vectors)
4. TELL THE STORY — Narrative. Tension, change, momentum. What is the industry saying?
5. EMERGING DISCOVERIES — What feels early but important? New categories forming?
6. PROJECT FORWARD — Where is this heading? Possible futures?

OUTPUT: Return ONLY valid JSON in this exact structure:

{
  "industry": "string",
  "signals_used": number,
  "observation_timestamp": "ISO timestamp",
  
  "signal_summary": {
    "dominant_signal": "string — the single most important thing happening",
    "signal_count": number,
    "signals": [
      { "title": "string", "type": "explicit|subtle|anomaly", "weight": 0-100 }
    ],
    "noise_ratio": "low|medium|high",
    "acceleration": "decelerating|stable|accelerating|spiking"
  },

  "visual_map": {
    "center": "string — the gravitational core of this industry right now",
    "clusters": [
      {
        "id": "string",
        "label": "string",
        "type": "technology|market|player|threat|opportunity",
        "size": 1-5,
        "momentum": "growing|stable|declining|emerging|converging",
        "nodes": ["string", "string"]
      }
    ],
    "connections": [
      { "from": "string", "to": "string", "label": "string", "strength": 1-3 }
    ],
    "tension_zones": ["string"]
  },

  "story": {
    "headline": "string — one sentence, present tense, no filler",
    "act_1": "string — what was. the baseline. 2 sentences.",
    "act_2": "string — what changed. the disruption or shift. 2-3 sentences.",
    "act_3": "string — what is becoming. the emerging new state. 2-3 sentences.",
    "el_paso_chapter": "string — how this story specifically plays out in the Borderplex. 2-3 sentences. Name Fort Bliss, Juárez, CBP, UTEP, or Starbase specifically.",
    "tension": "string — the central conflict or unresolved question in this industry"
  },

  "emerging_discoveries": [
    {
      "id": "string",
      "name": "string",
      "category": "technology|business_model|market|behavior|convergence",
      "maturity": "idea|prototype|early_product|scaling|mainstream",
      "why_it_matters": "string",
      "el_paso_angle": "string"
    }
  ],

  "direction": {
    "trajectory": "growing|stable|declining|converging|disrupted|bifurcating",
    "primary_vector": "string — where the industry is clearly heading",
    "secondary_vector": "string — the less obvious, potentially larger shift",
    "timeline": "string — rough timeframe for the main shift",
    "confidence": 0-100,
    "futures": [
      { "label": "string", "probability": "high|medium|low", "description": "string" }
    ]
  },

  "what_to_watch": [
    {
      "signal": "string",
      "why": "string",
      "timeframe": "days|weeks|months|quarters",
      "trigger": "string — what event would confirm this matters"
    }
  ],

  "uncertainty": {
    "blind_spots": ["string"],
    "what_could_change_everything": "string"
  }
}`;

// ── Helper: fetch real signals from Supabase ──────────────────────────────────

async function fetchSignalsForIndustry(industry: string, limit = 20) {
  if (!isSupabaseConfigured()) return [];
  
  const supabase = createClient();
  
  // Normalize industry slug
  const slug = industry.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  // Try direct match first, then fuzzy
  const { data } = await supabase
    .from('intel_signals')
    .select('id, title, signal_type, company, evidence, source, region, importance_score, meaning, direction, el_paso_score')
    .or(`industry.eq.${slug},industry.ilike.%${slug.replace(/-/g, '%')}%`)
    .not('source', 'ilike', '%arxiv%')
    .not('title', 'ilike', '%drug%')
    .not('title', 'ilike', '%murder%')
    .order('importance_score', { ascending: false })
    .limit(limit);
  
  return data ?? [];
}

// ── POST /api/observer ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const industry: string = body.industry ?? 'defense';
    const mode: string = body.mode ?? 'full'; // 'full' | 'quick'

    // Fetch real signals from database
    const signals = await fetchSignalsForIndustry(industry, 25);
    
    // Build signal context for prompt
    const signalContext = signals.length > 0
      ? signals.slice(0, 20).map((s, i) =>
          `Signal ${i + 1}: [${s.signal_type ?? 'general'}] ${s.title}${s.company ? ` (${s.company})` : ''}${s.meaning ? ` → MEANING: ${s.meaning}` : ''}${s.direction ? ` | DIR: ${s.direction}` : ''}`
        ).join('\n')
      : `No live signals found for ${industry}. Generate analysis from your knowledge of this industry's current state.`;

    const userPrompt = `INDUSTRY: ${industry.toUpperCase()}
LIVE SIGNALS (${signals.length} from database):
${signalContext}

Run your full OBSERVER analysis on this industry. Connect everything to the El Paso Borderplex where relevant.
Return ONLY valid JSON matching the exact structure specified. No markdown, no explanation.`;

    // Run OBSERVER intelligence
    const { result } = await runParallelJsonEnsemble({
      systemPrompt: OBSERVER_SYSTEM,
      userPrompt,
      temperature: 0.35,
      preferredProviders: ['gemini'],
      budget: { maxProviders: 1, preferLowCostProviders: true },
      parse: (content) => {
        const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned);
      },
    });

    return NextResponse.json({
      ok: true,
      industry,
      signals_used: signals.length,
      analysis: result,
      generated_at: new Date().toISOString(),
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'OBSERVER analysis failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// ── GET /api/observer?industry=defense ───────────────────────────────────────

export async function GET(req: NextRequest) {
  const industry = req.nextUrl.searchParams.get('industry') ?? 'defense';
  
  // Quick signal count + acceleration for dashboard use
  const supabase = isSupabaseConfigured() ? createClient() : null;
  if (!supabase) return NextResponse.json({ ok: false, error: 'DB not configured' });

  const slug = industry.toLowerCase().replace(/\s+/g, '-');
  const since48h = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const [recent, week] = await Promise.all([
    supabase.from('intel_signals').select('*', { count: 'exact', head: true })
      .or(`industry.eq.${slug},industry.ilike.%${slug}%`)
      .gte('discovered_at', since48h)
      .not('source', 'ilike', '%arxiv%'),
    supabase.from('intel_signals').select('*', { count: 'exact', head: true })
      .or(`industry.eq.${slug},industry.ilike.%${slug}%`)
      .gte('discovered_at', since7d)
      .not('source', 'ilike', '%arxiv%'),
  ]);

  const recentCount = recent.count ?? 0;
  const weekCount = week.count ?? 0;
  const dailyAvg = weekCount / 7;
  const acceleration = recentCount / 2 > dailyAvg * 1.5 ? 'spiking'
    : recentCount / 2 > dailyAvg ? 'accelerating'
    : recentCount / 2 < dailyAvg * 0.5 ? 'decelerating' : 'stable';

  return NextResponse.json({
    ok: true,
    industry,
    signals_48h: recentCount,
    signals_7d: weekCount,
    daily_avg: Math.round(dailyAvg * 10) / 10,
    acceleration,
  });
}
