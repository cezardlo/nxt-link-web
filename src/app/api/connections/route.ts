import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { askJarvis, parseJarvisJSON } from '@/lib/ai/provider';

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
    const signalId = body.signal_id;
    const domain = body.domain || 'logistics';

    const { data: signals } = await db
      .from('intel_signals')
      .select('id, title, signal_type, industry, importance_score')
      .eq('is_noise', false)
      .order('importance_score', { ascending: false })
      .limit(30);

    const { data: vendors } = await db
      .from('vendors')
      .select('company_name, description, industries, hq_country')
      .eq('status', 'approved')
      .limit(20);

    const signalList = (signals || []).map(s => s.industry + ': ' + s.title).join('; ');
    const vendorList = (vendors || []).map(v => v.company_name + ' (' + v.hq_country + '): ' + (v.description || '')).join('; ');

    const prompt = 'You are the Connection Engine for NXT LINK. ' +
      'Find cross-domain connections between these signals and vendors. ' +
      'Signals: ' + signalList.substring(0, 2000) + '. ' +
      'Vendors: ' + vendorList.substring(0, 1000) + '. ' +
      'Return JSON array of connections: [{signal_title, vendor_name, connection_type, ' +
      'explanation, strength (1-10), action_suggestion}]. Find at least 3 connections.';

    const result = await askJarvis(prompt);
    const connections = parseJarvisJSON(result);

    await db.from('swarm_memory').insert({
      agent_name: 'connection-engine',
      entry_type: 'connections',
      content: { connections: Array.isArray(connections) ? connections.length : 0, domain, timestamp: new Date().toISOString() },
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return NextResponse.json({ ok: true, connections, signal_count: (signals || []).length, vendor_count: (vendors || []).length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
