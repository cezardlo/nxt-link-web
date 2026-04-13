import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { askJarvis } from '@/lib/ai/provider';
import { getCache, setCache, logQuota } from '@/lib/cache';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const CACHE_KEY = 'jarvis-briefing';
const CACHE_TTL = 240; // 4 hours in minutes

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const fresh = url.searchParams.get('fresh') === 'true';

    // Check cache first (unless cron asks for fresh)
    if (!fresh) {
      const cached = await getCache<{ briefing: string; meta: Record<string, unknown> }>(CACHE_KEY);
      if (cached) {
        return NextResponse.json({ ok: true, ...cached, from_cache: true });
      }
    }

    const db = getSupabase();

    const { data: signals } = await db
      .from('intel_signals')
      .select('title, signal_type, industry, importance_score, meaning, direction')
      .eq('is_noise', false)
      .order('importance_score', { ascending: false })
      .limit(15);

    const { data: memories } = await db
      .from('swarm_memory')
      .select('agent_name, entry_type, content, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    const { count } = await db
      .from('vendors')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const signalBrief = (signals || []).map(s => s.industry + ': ' + s.title + ' [' + (s.direction || '?') + ']').join('; ');
    const memoryBrief = (memories || []).map(m => m.agent_name + ': ' + JSON.stringify(m.content).substring(0, 200)).join('; ');

    const userPrompt = 'Cover: 1) Top 3 things happening right now, 2) What the swarm agents found, ' +
      '3) One thing to act on today, 4) Vendor pipeline status (' + (count || 0) + ' active vendors). ' +
      'Recent signals: ' + signalBrief.substring(0, 2000) + '. ' +
      'Agent memories: ' + memoryBrief.substring(0, 1000) + '. ' +
      'Keep it under 300 words. Start with Good morning/afternoon based on El Paso time (MST).';

    const result = await askJarvis({
      agent: 'jarvis-briefing',
      systemPrompt: 'You are Jarvis, the AI briefing voice for NXT LINK, a logistics intelligence startup in El Paso TX. Give Cessar (the founder) his daily briefing. Be direct, insightful, slightly witty.',
      userPrompt,
    });

    await logQuota('jarvis-briefing', '/api/jarvis-briefing', result.input_tokens || 0, result.output_tokens || 0);

    const response = {
      briefing: result.text,
      meta: {
        signals_analyzed: (signals || []).length,
        vendor_count: count || 0,
        agent_memories: (memories || []).length,
        generated_at: new Date().toISOString(),
      },
    };

    await setCache(CACHE_KEY, response, CACHE_TTL);

    return NextResponse.json({ ok: true, ...response });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
