import { NextResponse } from 'next/server';
import { getDb } from '@/lib/supabase/client';
import { askJarvis, parseJarvisJSON } from '@/lib/ai/provider';

export async function GET() {
  try {
    const db = getDb();
    const { data: latest } = await db.from('swarm_memory').select('*').eq('agent_name', 'jarvis-observer').eq('entry_type', 'finding').order('created_at', { ascending: false }).limit(1).single();
    if (!latest) return NextResponse.json({ status: 'no_observations', message: 'POST to trigger first observation.' });
    return NextResponse.json({ status: 'ok', observation: latest.content, observed_at: latest.created_at, confidence: latest.confidence, topic: latest.topic });
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
}

export async function POST() {
  const startTime = Date.now();
  try {
    const db = getDb();
    const { data: pastObs } = await db.from('swarm_memory').select('topic, content, confidence, created_at').eq('agent_name', 'jarvis-observer').eq('entry_type', 'finding').order('created_at', { ascending: false }).limit(5);
    const memory = (pastObs || []).map((o: any) => ({ when: o.created_at, topic: o.topic, what_i_saw: o.content?.narrative || '', confidence: o.confidence }));

    const { data: sig48 } = await db.from('intel_signals').select('industry').gte('discovered_at', new Date(Date.now() - 48 * 3600000).toISOString());
    const counts: Record<string, number> = {};
    (sig48 || []).forEach((s: any) => { counts[s.industry || 'unknown'] = (counts[s.industry || 'unknown'] || 0) + 1; });
    const sectors = Object.entries(counts).map(([s, c]) => ({ sector: s, count_48h: c })).sort((a, b) => b.count_48h - a.count_48h).slice(0, 10);

    const { data: fresh } = await db.from('intel_signals').select('title, industry, direction, meaning, el_paso_score').order('discovered_at', { ascending: false }).limit(20);
    const { data: opps } = await db.from('opportunities').select('title, agency, estimated_value, deadline').gte('deadline', new Date().toISOString()).order('deadline', { ascending: true }).limit(5);
    const { data: insights } = await db.from('cluster_insights').select('headline, urgency_score, ep_impact').order('urgency_score', { ascending: false }).limit(5);
    const { data: regs } = await db.from('region_intelligence').select('region, industry, opportunity_score').order('opportunity_score', { ascending: false }).limit(5);

    const systemPrompt = 'You are JARVIS, an intelligence system watching Earth from El Paso, Texas. UNDERSTAND what is happening and explain like a brilliant analyst. You have MEMORY of past observations — if something changed, SAY SO. Rules: plain language, connect to El Paso, identify THE ONE most important thing, name companies/agencies/dollars, surface cross-sector connections, end with what to watch next 24-48h. JSON format: { "narrative": "2-3 paragraphs", "the_one_thing": "one sentence", "whats_changed": ["3-5 items"], "connections": ["cross-sector links"], "watch_next": ["2-3 items"], "el_paso_impact": "Borderplex impact", "confidence": 0.0-1.0, "mood": "surging|accelerating|steady|shifting|cooling|turbulent" }';

    const userPrompt = 'Earth right now:\n\nPAST OBSERVATIONS:\n' + (memory.length > 0 ? memory.map((m: any) => '- [' + m.when + '] ' + m.topic + ': ' + m.what_i_saw).join('\n') : 'First observation.') + '\n\nSECTORS (48h): ' + JSON.stringify(sectors) + '\n\nFRESH SIGNALS:\n' + (fresh || []).slice(0, 12).map((s: any) => '- [' + s.industry + '] ' + s.title + ' | ' + s.direction + ' | EP:' + s.el_paso_score).join('\n') + '\n\nOPPORTUNITIES:\n' + (opps || []).map((o: any) => '- ' + o.title + ' | ' + o.agency + ' | ' + o.deadline).join('\n') + '\n\nINSIGHTS:\n' + (insights || []).map((c: any) => '- [urgency ' + c.urgency_score + '] ' + c.headline).join('\n') + '\n\nREGIONS:\n' + (regs || []).map((r: any) => '- ' + r.region + '/' + r.industry + ': ' + r.opportunity_score).join('\n') + '\n\nWhat is happening? What changed? What matters?';

    const ai = await askJarvis({ agent: 'jarvis-observer', systemPrompt, userPrompt, maxTokens: 1200 });
    const obs = parseJarvisJSON(ai.text, { narrative: ai.text, confidence: 0.7, mood: 'steady' });

    await db.from('swarm_memory').insert({ agent_name: 'jarvis-observer', entry_type: 'finding', topic: obs.the_one_thing || 'Earth observation', content: obs, confidence: obs.confidence || 0.7, tags: ['observation', 'earth-state', obs.mood || 'steady'], expires_at: new Date(Date.now() + 60 * 86400000).toISOString() });

    return NextResponse.json({ status: 'ok', observation: obs, tokens: { input: ai.input_tokens, output: ai.output_tokens, cost: 0 }, duration_ms: Date.now() - startTime, memory_depth: memory.length, provider: 'gemini-free' });
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
}
