// POST /api/ask — Jarvis Strategic Intelligence Assembler
// Full Jarvis-style answer: queries Supabase intel_signals, vendors, and kg_discoveries,
// then synthesizes with Gemini into a structured strategic intelligence report.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';

export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────

type IntelSignal = {
  title: string;
  evidence: string | null;
  company: string | null;
  industry: string | null;
  signal_type: string | null;
  importance_score: number | null;
  discovered_at: string | null;
};

type Vendor = {
  company_name: string;
  description: string | null;
  sector: string | null;
  iker_score: number | null;
};

type Discovery = {
  title: string;
  summary: string | null;
  discovery_type: string | null;
  iker_impact_score: number | null;
};

// ─── Jarvis system prompt ──────────────────────────────────────────────────────

const JARVIS_SYSTEM_PROMPT = `You are Jarvis — NXT LINK's strategic intelligence analyst for El Paso's Space Valley and Borderplex ecosystem.

Answer questions with strategic intelligence, not just facts. Structure your answer with these exact sections:

**THE SITUATION**
2-3 sentences: what's happening and what pattern it indicates.

**KEY PLAYERS**
Name specific companies/institutions from the data. Bullet points.

**WHY EL PASO CARES**
1-2 sentences specific to Fort Bliss, UTEP, Borderplex, and the $126B US-Mexico trade corridor.

**WHAT TO WATCH**
1-2 forward-looking signals to monitor. Be specific.

**RECOMMENDED ACTION**
1 specific, actionable step for an El Paso operator, investor, or government official.

Use the intelligence data provided. Be specific. No filler phrases. Think like a Palantir analyst. Keep the total response under 400 words.`;

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = typeof body?.query === 'string' ? body.query.trim() : '';

    if (query.length < 2) {
      return NextResponse.json({ ok: false, message: 'Query required (2+ characters)' }, { status: 400 });
    }
    if (query.length > 400) {
      return NextResponse.json({ ok: false, message: 'Query too long (max 400 characters)' }, { status: 400 });
    }

    const supabase = createClient();

    // ── Parallel Supabase queries ──────────────────────────────────────────────

    const [signalsResult, vendorsResult, discoveriesResult] = await Promise.allSettled([
      supabase
        .from('intel_signals')
        .select('title, evidence, company, industry, signal_type, importance_score, discovered_at')
        .or(`title.ilike.%${query}%,evidence.ilike.%${query}%,company.ilike.%${query}%`)
        .not('source', 'ilike', '%arxiv%')
        .order('importance_score', { ascending: false })
        .limit(10),

      supabase
        .from('vendors')
        .select('company_name, description, sector, iker_score')
        .or(`company_name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(5),

      supabase
        .from('kg_discoveries')
        .select('title, summary, discovery_type, iker_impact_score')
        .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
        .limit(5),
    ]);

    const signals: IntelSignal[] =
      signalsResult.status === 'fulfilled' ? (signalsResult.value.data ?? []) : [];
    const vendors: Vendor[] =
      vendorsResult.status === 'fulfilled' ? (vendorsResult.value.data ?? []) : [];
    const discoveries: Discovery[] =
      discoveriesResult.status === 'fulfilled' ? (discoveriesResult.value.data ?? []) : [];

    // ── Call Gemini via parallel-router ────────────────────────────────────────

    const userPrompt = `Question: "${query}"

Signals (${signals.length} results):
${JSON.stringify(signals.slice(0, 8), null, 2)}

Vendors (${vendors.length} results):
${JSON.stringify(vendors, null, 2)}

Discoveries (${discoveries.length} results):
${JSON.stringify(discoveries.slice(0, 5), null, 2)}`;

    let answer = '';
    let providerUsed = 'unknown';

    try {
      const { result, selectedProvider } = await runParallelJsonEnsemble<{ answer: string }>({
        systemPrompt: JARVIS_SYSTEM_PROMPT,
        userPrompt,
        temperature: 0.3,
        preferredProviders: ['gemini'],
        budget: { maxProviders: 1 },
        parse: (content) => ({ answer: content }),
      });
      answer = result.answer;
      providerUsed = selectedProvider;
    } catch {
      // Graceful fallback if LLM unavailable
      answer = buildFallbackAnswer(query, signals, vendors, discoveries);
      providerUsed = 'fallback';
    }

    return NextResponse.json({
      ok: true,
      answer,
      signals,
      vendors,
      discoveries,
      query,
      provider: providerUsed,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[/api/ask] Error:', err);
    return NextResponse.json({ ok: false, message: 'Internal error assembling intelligence' }, { status: 500 });
  }
}

// ─── Fallback answer builder ──────────────────────────────────────────────────

function buildFallbackAnswer(
  query: string,
  signals: IntelSignal[],
  vendors: Vendor[],
  discoveries: Discovery[],
): string {
  const topSignal = signals[0];
  const topVendor = vendors[0];

  const parts: string[] = [];

  parts.push(`**THE SITUATION**`);
  if (topSignal) {
    parts.push(`Active intelligence signals detected for "${query}". ${topSignal.title}${topSignal.company ? ` (${topSignal.company})` : ''} is the highest-priority signal with importance score ${topSignal.importance_score ?? 'N/A'}.`);
  } else {
    parts.push(`Limited direct signals found for "${query}". This may indicate an emerging opportunity not yet tracked in the system, or a niche area requiring targeted monitoring.`);
  }

  parts.push(`\n**KEY PLAYERS**`);
  if (vendors.length > 0) {
    vendors.forEach(v => {
      parts.push(`• ${v.company_name}${v.sector ? ` (${v.sector})` : ''}${v.iker_score ? ` — IKER ${v.iker_score}` : ''}`);
    });
  } else {
    parts.push(`• No specific vendors matched — consider a broader search term.`);
  }

  parts.push(`\n**WHY EL PASO CARES**`);
  parts.push(`El Paso's position as a $126B trade corridor hub and home to Fort Bliss makes "${query}" directly relevant to defense modernization, border technology, and regional economic development. UTEP research capabilities could accelerate local adoption.`);

  parts.push(`\n**WHAT TO WATCH**`);
  if (discoveries.length > 0) {
    parts.push(`• ${discoveries[0].title}`);
  }
  parts.push(`• Monitor contract awards and funding rounds in this category over the next 90 days.`);

  parts.push(`\n**RECOMMENDED ACTION**`);
  if (topVendor) {
    parts.push(`Contact ${topVendor.company_name} to assess alignment with El Paso regional needs — they have the highest IKER score for this topic area.`);
  } else {
    parts.push(`Run the NXT LINK vendor discovery agent targeting "${query}" to identify qualified local and regional players with active contract vehicles.`);
  }

  return parts.join('\n');
}
