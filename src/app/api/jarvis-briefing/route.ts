import { NextResponse } from 'next/server';
import { getDb } from '@/lib/supabase/client';
import { askJarvis, parseJarvisJSON } from '@/lib/ai/provider';

export async function GET(req: Request) {
  try {
    const db = getDb();
    const url = new URL(req.url);
    const history = url.searchParams.get('history') === 'true';
    if (history) {
      const { data } = await db.from('daily_briefings').select('*').order('created_at', { ascending: false }).limit(7);
      return NextResponse.json({ status: 'ok', count: (data || []).length, briefings: data || [] });
    }
    const { data: latest } = await db.from('daily_briefings').select('*').order('created_at', { ascending: false }).limit(1).single();
    if (!latest) return NextResponse.json({ status: 'no_briefing', message: 'POST to generate.' });
    return NextResponse.json({ status: 'ok', briefing: latest });
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
}

export async function POST() {
  const startTime = Date.now();
  try {
    const db = getDb();
    const { data: pastBriefings } = await db.from('daily_briefings').select('headline, summary, key_developments, created_at').order('created_at', { ascending: false }).limit(3);
    const { data: latestObs } = await db.from('swarm_memory').select('content, confidence, created_at').eq('agent_name', 'jarvis-observer').eq('entry_type', 'finding').order('created_at', { ascending: false }).limit(1).single();
    const { data: latestConns } = await db.from('swarm_memory').select('topic, content, confidence').eq('agent_name', 'jarvis-connections').eq('entry_type', 'finding').order('created_at', { ascending: false }).limit(7);

    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const dayBefore = new Date(now.getTime() - 172800000);
    const { count: todaySig } = await db.from('intel_signals').select('id', { count: 'exact', head: true }).gte('discovered_at', yesterday.toISOString());
    const { count: yesterdaySig } = await db.from('intel_signals').select('id', { count: 'exact', head: true }).gte('discovered_at', dayBefore.toISOString()).lt('discovered_at', yesterday.toISOString());

    const { data: recentInd } = await db.from('intel_signals').select('industry').gte('discovered_at', yesterday.toISOString());
    const sc: Record<string, number> = {};
    (recentInd || []).forEach((s: any) => { sc[s.industry || 'unknown'] = (sc[s.industry || 'unknown'] || 0) + 1; });
    const topSectors = Object.entries(sc).sort(([,a],[,b]) => b - a).slice(0, 5).map(([sector, count]) => ({ sector, signals_24h: count }));

    const thirtyDays = new Date(now.getTime() + 30 * 86400000);
    const { data: opps } = await db.from('opportunities').select('title, agency, estimated_value, deadline, matched_sectors').gte('deadline', now.toISOString()).lte('deadline', thirtyDays.toISOString()).order('deadline', { ascending: true }).limit(5);
    const { data: topInsights } = await db.from('cluster_insights').select('headline, summary, urgency_score, ep_impact, sector').order('urgency_score', { ascending: false }).limit(5);
    const { count: totalSig } = await db.from('intel_signals').select('id', { count: 'exact', head: true });
    const { count: totalVend } = await db.from('vendors').select('id', { count: 'exact', head: true });

    const systemPrompt = 'You are JARVIS, the intelligence system behind NXT LINK. Brief your boss daily on Earth. You are direct, confident, sometimes wry. Say "I". Reference past briefings naturally. Plain language — never "data indicates". JSON: { "greeting": "one line opener", "the_one_thing": "single most important development", "narrative": "3-4 paragraph briefing", "whats_moving": [{ "sector": "name", "direction": "up|down|shifting|surging|cooling", "headline": "one sentence", "signals_24h": number, "momentum": "accelerating|steady|decelerating" }], "connections_spotted": [{ "title": "headline", "explanation": "1-2 sentences", "sectors_linked": [], "strength": 0-1 }], "deadlines_approaching": [{ "title": "name", "agency": "who", "value": "dollars or TBD", "days_left": number, "urgency": "act_now|this_week|watch" }], "watch_next_24h": ["2-3 items"], "jarvis_mood": "surging|accelerating|steady|shifting|cooling|turbulent|alert", "confidence": 0-1, "signal_volume": { "today": number, "yesterday": number, "trend": "up|down|flat" }, "stats": { "total_signals_tracked": number, "total_vendors_mapped": number, "active_sectors": number } }';

    const trend = (todaySig || 0) > (yesterdaySig || 0) ? 'UP' : (todaySig || 0) < (yesterdaySig || 0) ? 'DOWN' : 'FLAT';
    const userPrompt = 'Generate today briefing.\nPAST BRIEFINGS:\n' + (pastBriefings || []).map((b: any) => '- ' + b.headline).join('\n') + '\nOBSERVER:\n' + (latestObs?.content ? JSON.stringify(latestObs.content).slice(0, 500) : 'none') + '\nCONNECTIONS:\n' + (latestConns || []).map((c: any) => '- ' + c.topic).join('\n') + '\nSIGNAL VOLUME: today ' + (todaySig||0) + ' yesterday ' + (yesterdaySig||0) + ' trend ' + trend + '\nTOP SECTORS:\n' + topSectors.map(s => '- ' + s.sector + ': ' + s.signals_24h).join('\n') + '\nOPPORTUNITIES:\n' + (opps || []).map((o: any) => '- ' + o.title + ' | ' + o.agency + ' | ' + o.deadline).join('\n') + '\nINSIGHTS:\n' + (topInsights || []).map((i: any) => '- ' + i.headline).join('\n') + '\nSTATS: ' + (totalSig||0) + ' signals, ' + (totalVend||0) + ' vendors, ' + topSectors.length + ' sectors';

    const ai = await askJarvis({ agent: 'jarvis-briefing', systemPrompt, userPrompt, maxTokens: 2500 });
    const briefing = parseJarvisJSON(ai.text, { narrative: ai.text, confidence: 0.7 });

    const rec = { headline: briefing.the_one_thing || 'Daily Earth briefing', summary: briefing.narrative || ai.text, key_developments: briefing.whats_moving || [], opportunities_flagged: briefing.deadlines_approaching || [], signal_count: todaySig || 0, sectors_covered: topSectors.map(s => s.sector), model_used: 'gemini-2.5-flash (free)', metadata: { greeting: briefing.greeting, connections_spotted: briefing.connections_spotted, watch_next_24h: briefing.watch_next_24h, jarvis_mood: briefing.jarvis_mood, confidence: briefing.confidence, signal_volume: briefing.signal_volume, stats: briefing.stats } };

    const { data: inserted } = await db.from('daily_briefings').insert(rec).select().single();
    await db.from('swarm_memory').insert({ agent_name: 'jarvis-briefing', entry_type: 'finding', topic: briefing.the_one_thing || 'Daily briefing', content: { headline: briefing.the_one_thing, mood: briefing.jarvis_mood, sectors_moving: (briefing.whats_moving || []).map((w: any) => w.sector), watch_items: briefing.watch_next_24h }, confidence: briefing.confidence || 0.7, tags: ['briefing', 'daily', briefing.jarvis_mood || 'steady'], expires_at: new Date(Date.now() + 90 * 86400000).toISOString() });

    return NextResponse.json({ status: 'ok', briefing, stored_id: inserted?.id, tokens: { input: ai.input_tokens, output: ai.output_tokens, cost: 0 }, duration_ms: Date.now() - startTime, provider: 'gemini-free' });
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
}
