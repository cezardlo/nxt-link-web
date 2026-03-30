// src/app/api/agents/enrich-signals/route.ts
//
// NXT LINK — Signal Enrichment Pipeline
// Tags raw signals with: problem, technology, industry, region
// Runs on untagged signals (WHERE problem IS NULL)
// Safe to call repeatedly — idempotent

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BATCH_SIZE = 10;
const MAX_SIGNALS = 50;

const ENRICHMENT_PROMPT = `You are a supply chain intelligence analyst.

Given the following signal, extract exactly 4 fields:

- problem: What real-world problem is being addressed (1-5 words)
- technology: The primary technology involved (1-3 words)
- industry: The primary industry sector (1-2 words, e.g. logistics, defense, energy, manufacturing, healthcare, agriculture, fintech, cybersecurity, aerospace, automotive)
- region: Country or geographic region (e.g. "United States", "Germany", "Southeast Asia", "Global")

Rules:
- Be specific, not generic
- If unclear, use "unknown"
- Return ONLY valid JSON, no explanation

Return format:
{"problem":"...","technology":"...","industry":"...","region":"..."}`;

async function callGemini(title: string, evidence: string): Promise<{
  problem: string;
  technology: string;
  industry: string;
  region: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const signal = `Title: ${title}\nDetails: ${(evidence || '').slice(0, 300)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: ENRICHMENT_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: signal }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini ${response.status}: ${body.slice(0, 200)}`);
  }

  const payload = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');

  const parsed = JSON.parse(text);

  return {
    problem: typeof parsed.problem === 'string' ? parsed.problem : 'unknown',
    technology: typeof parsed.technology === 'string' ? parsed.technology : 'unknown',
    industry: typeof parsed.industry === 'string' ? parsed.industry : 'unknown',
    region: typeof parsed.region === 'string' ? parsed.region : 'unknown',
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? String(MAX_SIGNALS), 10), 200);
  const dryRun = searchParams.get('dry') === '1';

  const { createClient } = await import('@supabase/supabase-js');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const db = createClient(supabaseUrl, supabaseKey);

  const { data: signals, error: fetchError } = await db
    .from('intel_signals')
    .select('id, title, evidence, industry')
    .is('problem', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!signals || signals.length === 0) {
    return NextResponse.json({ message: 'All signals are tagged', tagged: 0, remaining: 0 });
  }

  if (dryRun) {
    return NextResponse.json({ message: 'Dry run', untagged: signals.length, sample: signals.slice(0, 3) });
  }

  let tagged = 0;
  let failed = 0;
  const errors: string[] = [];
  const results: Array<{ id: string; tags: Record<string, string> }> = [];

  for (let i = 0; i < signals.length; i += BATCH_SIZE) {
    const batch = signals.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (signal) => {
        try {
          const tags = await callGemini(signal.title, signal.evidence ?? '');

          const { error: updateError } = await db
            .from('intel_signals')
            .update({
              problem: tags.problem,
              technology: tags.technology,
              industry: tags.industry,
              region: tags.region,
            })
            .eq('id', signal.id);

          if (updateError) {
            errors.push(`update:${signal.id}: ${updateError.message}`);
            failed++;
            return null;
          }

          tagged++;
          return { id: signal.id, tags };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`gemini:${signal.id}: ${msg.slice(0, 200)}`);
          failed++;
          return null;
        }
      }),
    );

    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) {
        results.push(r.value);
      }
    }

    if (i + BATCH_SIZE < signals.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const { count: remaining } = await db
    .from('intel_signals')
    .select('id', { count: 'exact', head: true })
    .is('problem', null);

  return NextResponse.json({
    tagged,
    failed,
    remaining: remaining ?? 0,
    errors: errors.slice(0, 10),
    sample: results.slice(0, 5),
  });
}
