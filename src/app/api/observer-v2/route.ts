import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { askJarvis } from '@/lib/ai/provider';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const db = getSupabase();
    const body = await req.json().catch(() => ({}));
    const industry = body.industry || 'logistics';
    const limit = body.limit || 20;

    const { data: signals } = await db
      .from('intel_signals')
      .select('title, signal_type, industry, importance_score, source_domain, discovered_at')
      .eq('is_noise', false)
      .order('discovered_at', { ascending: false })
      .limit(limit);

    const { data: memories } = await db
      .from('swarm_memory')
      .select('content, created_at')
      .eq('agent_name', 'observer-v2')
      .order('created_at', { ascending: false })
      .limit(3);

    const signalSummary = (signals || []).map(s => s.title).join('; ');
    const recentMemory = (memories || []).map(m => JSON.stringify(m.content)).join(' ');

    const prompt = 'You are the Observer — NXT LINK intelligence system in El Paso TX. ' +
      'Analyze these recent signals and provide: 1) Top 3 patterns you see, ' +
      '2) What this means for El Paso cross-border logistics, ' +
      '3) One emerging opportunity, 4) One risk to watch. ' +
      'Previous observations: ' + recentMemory.substring(0, 500) + '. ' +
      'Current signals: ' + signalSummary.substring(0, 2000) + '. ' +
      'Return JSON with fields: patterns (array of {title, detail}), ' +
      'el_paso_impact (string), opportunity (string), risk (string), confidence (0-100).';

    const analysis = await askJarvis(prompt);

    await db.from('swarm_memory').insert({
      agent_name: 'observer-v2',
      entry_type: 'observation',
      content: { analysis: analysis.substring(0, 1000), signal_count: (signals || []).length, industry, timestamp: new Date().toISOString() },
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return NextResponse.json({ ok: true, analysis, signal_count: (signals || []).length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { askJarvis } from '@/lib/ai/provider';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const db = getSupabase();
    const body = await req.json().catch(() => ({}));
    const industry = body.industry || 'logistics';
    const limit = body.limit || 20;

    const { data: signals } = await db
      .from('intel_signals')
      .select('title, signal_type, industry, importance_score, source_domain, discovered_at')
      .eq('is_noise', false)
      .order('discovered_at', { ascending: false })
      .limit(limit);

    const { data: memories } = await db
      .from('swarm_memory')
      .select('content, created_at')
      .eq('agent_name', 'observer-v2')
      .order('created_at', { ascending: false })
      .limit(3);

    const signalSummary = (signals || []).map(s => s.title).join('; ');
    const recentMemory = (memories || []).map(m => JSON.stringify(m.content)).join(' ');

    const prompt = 'You are the Observer — NXT LINK intelligence system in El Paso TX. ' +
      'Analyze these recent signals and provide: 1) Top 3 patterns you see, ' +
      '2) What this means for El Paso cross-border logistics, ' +
      '3) One emerging opportunity, 4) One risk to watch. ' +
      'Previous observations: ' + recentMemory.substring(0, 500) + '. ' +
      'Current signals: ' + signalSummary.substring(0, 2000) + '. ' +
      'Return JSON with fields: patterns (array of {title, detail}), ' +
      'el_paso_impact (string), opportunity (string), risk (string), confidence (0-100).';

    const analysis = await askJarvis(prompt);

    await db.from('swarm_memory').insert({
      agent_name: 'observer-v2',
      entry_type: 'observation',
      content: { analysis: analysis.substring(0, 1000), signal_count: (signals || []).length, industry, timestamp: new Date().toISOString() },
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return NextResponse.json({ ok: true, analysis, signal_count: (signals || []).length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { askJarvis } from '@/lib/ai/provider';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const db = getSupabase();
    const body = await req.json().catch(() => ({}));
    const industry = body.industry || 'logistics';
    const limit = body.limit || 20;

    // Get latest signals
    const { data: signals } = await db
      .from('intel_signals')
      .select('title, signal_type, industry, importance, source_domain, discovered_at')
      .eq('is_noise', false)
      .order('discovered_at', { ascending: false })
      .limit(limit);

    // Check swarm memory for recent observations
    const { data: memories } = await db
      .from('swarm_memory')
      .select('content, created_at')
      .eq('agent', 'observer-v2')
      .order('created_at', { ascending: false })
      .limit(3);

    const signalSummary = (signals || []).map(s => s.title).join('; ');
    const recentMemory = (memories || []).map(m => JSON.stringify(m.content)).join(' ');

    const prompt = 'You are the Observer — NXT LINK intelligence system in El Paso TX. ' +
      'Analyze these recent signals and provide: 1) Top 3 patterns you see, ' +
      '2) What this means for El Paso cross-border logistics, ' +
      '3) One emerging opportunity, 4) One risk to watch. ' +
      'Previous observations: ' + recentMemory.substring(0, 500) + '. ' +
      'Current signals: ' + signalSummary.substring(0, 2000) + '. ' +
      'Return JSON with fields: patterns (array of {title, detail}), ' +
      'el_paso_impact (string), opportunity (string), risk (string), confidence (0-100).';

    const analysis = await askJarvis(prompt);

    // Store observation in swarm memory
    await db.from('swarm_memory').insert({
      agent: 'observer-v2',
      memory_type: 'observation',
      content: { analysis: analysis.substring(0, 1000), signal_count: (signals || []).length, industry, timestamp: new Date().toISOString() },
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return NextResponse.json({ ok: true, analysis, signal_count: (signals || []).length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
