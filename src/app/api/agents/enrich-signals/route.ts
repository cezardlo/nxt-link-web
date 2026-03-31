import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BATCH_SIZE = 5;
const MAX_SIGNALS = 50;

const SYSTEM_PROMPT = `You are a supply chain intelligence analyst.
Given a signal, extract exactly 4 fields as JSON:
- problem: Real-world problem addressed (1-5 words)
- technology: Primary technology involved (1-3 words)
- industry: Primary industry sector (1-2 words)
- region: Country or geographic region

Rules:
- Be specific, not generic
- If unclear, use "unknown"
- Return ONLY valid JSON, no explanation

Format: {"problem":"...","technology":"...","industry":"...","region":"..."}`;

interface Tags {
  problem: string;
  technology: string;
  industry: string;
  region: string;
}

async function callNvidia(title: string, evidence: string): Promise<Tags> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error('NVIDIA_API_KEY not configured');

  const endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';
  const signal = `Title: ${title}\nDetails: ${(evidence || '').slice(0, 300)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'meta/llama-3.3-70b-instruct',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: signal },
      ],
      temperature: 0.1,
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`NVIDIA ${response.status}: ${body.slice(0, 200)}`);
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = payload.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty NVIDIA response');

  const jsonMatch = text.match(/\{[^}]+\}/);
  if (!jsonMatch) throw new Error('No JSON in response: ' + text.slice(0, 100));

  const parsed = JSON.parse(jsonMatch[0]);

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
    return NextResponse.json({ message: 'All signals tagged', tagged: 0, remaining: 0 });
  }

  if (dryRun) {
    return NextResponse.json({ message: 'Dry run', untagged: signals.length, sample: signals.slice(0, 3) });
  }

  let tagged = 0;
  let failed = 0;
  const errors: string[] = [];
  const results: Array<{ id: string; tags: Tags }> = [];

  for (let i = 0; i < signals.length; i += BATCH_SIZE) {
    const batch = signals.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (signal) => {
        try {
          const tags = await callNvidia(signal.title, signal.evidence ?? '');
          const { error: updateError } = await db
            .from('intel_signals')
            .update({ problem: tags.problem, technology: tags.technology, industry: tags.industry, region: tags.region })
            .eq('id', signal.id);

          if (updateError) {
            errors.push(`db:${signal.id}: ${updateError.message}`);
            failed++;
            return null;
          }
          tagged++;
          return { id: signal.id, tags };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`llm:${signal.id}: ${msg.slice(0, 200)}`);
          failed++;
          return null;
        }
      }),
    );

    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) results.push(r.value);
    }

    if (i + BATCH_SIZE < signals.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const { count: remaining } = await db
    .from('intel_signals')
    .select('id', { count: 'exact', head: true })
    .is('problem', null);

  return NextResponse.json({ tagged, failed, remaining: remaining ?? 0, errors: errors.slice(0, 10), sample: results.slice(0, 5) });
}
