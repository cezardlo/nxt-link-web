// POST /api/connections/detect
//
// Finds hidden connections between recent signals.
// Returns ranked list of connections + clusters.
// Saves to Supabase signal_connections table when available.
//
// Body: { limit?: number }  (default 100 signals, max 500)

import { NextResponse } from 'next/server';
import { detectSignalConnections, type RawSignal } from '@/lib/engines/signal-connections-engine';
import { isSupabaseConfigured, getDb } from '@/db/client';

export const dynamic = 'force-dynamic';

const FALLBACK_SIGNALS: RawSignal[] = [
  { title: 'Army AI/ML pilot program lead awarded at Fort Bliss', signal_type: 'contract_award', industry: 'defense', company: 'Booz Allen Hamilton', importance_score: 0.85, discovered_at: new Date().toISOString() },
  { title: 'Generative AI deployment in Army decision support systems', signal_type: 'product_launch', industry: 'ai-ml', company: null, importance_score: 0.78, discovered_at: new Date(Date.now() - 3600000).toISOString() },
  { title: 'CBP expands computer vision surveillance at border crossings', signal_type: 'contract_award', industry: 'defense', company: 'L3Harris Technologies', importance_score: 0.80, discovered_at: new Date(Date.now() - 7200000).toISOString() },
  { title: 'CMMC compliance deadline drives cybersecurity procurement surge', signal_type: 'regulatory_action', industry: 'cybersecurity', company: null, importance_score: 0.75, discovered_at: new Date(Date.now() - 14400000).toISOString() },
  { title: 'El Paso Electric renewable energy microgrid expansion', signal_type: 'facility_expansion', industry: 'energy', company: 'El Paso Electric', importance_score: 0.70, discovered_at: new Date(Date.now() - 18000000).toISOString() },
  { title: 'Fort Bliss counter-UAS system deployment contract', signal_type: 'contract_award', industry: 'defense', company: 'Northrop Grumman', importance_score: 0.78, discovered_at: new Date(Date.now() - 21600000).toISOString() },
  { title: 'Cross-border logistics automation investment in Juarez', signal_type: 'funding_round', industry: 'logistics', company: null, importance_score: 0.65, discovered_at: new Date(Date.now() - 25200000).toISOString() },
  { title: 'WBAMC Health IT contract renewal with AI diagnostics scope', signal_type: 'contract_award', industry: 'healthcare', company: 'Leidos', importance_score: 0.68, discovered_at: new Date(Date.now() - 28800000).toISOString() },
  { title: 'Booz Allen Hamilton awarded second Fort Bliss advisory contract', signal_type: 'contract_award', industry: 'defense', company: 'Booz Allen Hamilton', importance_score: 0.72, discovered_at: new Date(Date.now() - 32400000).toISOString() },
  { title: 'AI startup raises $150M for defense autonomy systems', signal_type: 'funding_round', industry: 'ai-ml', company: 'Shield AI', importance_score: 0.80, discovered_at: new Date(Date.now() - 36000000).toISOString() },
];

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = Math.min(Number(body?.limit ?? 100), 500);

    let signals: RawSignal[] = FALLBACK_SIGNALS;

    // Pull live signals from Supabase
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getDb()
          .from('intel_signals')
          .select('id, title, signal_type, industry, company, importance_score, discovered_at')
          .order('discovered_at', { ascending: false })
          .limit(limit);

        if (!error && data && data.length >= 5) {
          signals = data as RawSignal[];
        }
      } catch {
        // fallback signals already set
      }
    }

    const report = detectSignalConnections(signals);

    // Persist top connections to Supabase (fire-and-forget)
    if (isSupabaseConfigured() && report.connections.length > 0) {
      (async () => {
        try {
          const rows = report.connections.slice(0, 50).map(c => ({
            signal_a_id: c.signal_a_id,
            signal_b_id: c.signal_b_id,
            connection_type: c.connection_type,
            strength: c.strength,
            explanation: c.explanation,
            detected_at: c.detected_at,
            confirmed: false,
          }));
          await getDb()
            .from('signal_connections')
            .upsert(rows, { onConflict: 'signal_a_id,signal_b_id' })
            .throwOnError();
        } catch {
          // Persist failed — table may not exist yet, ignore
        }
      })();
    }

    return NextResponse.json({
      ok: true,
      ...report,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : 'Connection detection failed.' },
      { status: 500 },
    );
  }
}
