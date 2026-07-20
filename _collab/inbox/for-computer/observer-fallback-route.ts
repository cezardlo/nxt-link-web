export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const industry = body.industry ?? 'defense';

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'DB not configured' });
  }

  const db = createClient();

  // Fetch top 20 signals for this industry
  const { data: signals } = await db
    .from('intel_signals')
    .select('title, signal_type, direction, meaning, el_paso_score, el_paso_angle, importance_score, company, discovered_at')
    .eq('industry', industry)
    .eq('is_noise', false)
    .order('importance_score', { ascending: false })
    .limit(20);

  const sigs = signals ?? [];

  // Build counts
  const rising = sigs.filter(s => s.direction === 'rising').length;
  const falling = sigs.filter(s => s.direction === 'falling').length;
  const emerging = sigs.filter(s => s.direction === 'emerging').length;
  const epDirect = sigs.filter(s => (s.el_paso_score ?? 0) >= 60);
  const epRelevant = sigs.filter(s => (s.el_paso_score ?? 0) >= 25);
  const topSignal = sigs[0];

  // Determine trajectory
  const trajectory = rising > falling * 2 ? 'growing' : falling > rising ? 'declining' : 'stable';
  const acceleration = rising >= 5 ? 'accelerating' : rising >= 2 ? 'stable' : 'decelerating';

  // Build visual map clusters from signal types
  const typeMap: Record<string, number> = {};
  sigs.forEach(s => { typeMap[s.signal_type] = (typeMap[s.signal_type] ?? 0) + 1; });
  const clusters = Object.entries(typeMap).slice(0, 5).map(([type, count], i) => ({
    id: type,
    label: type.replace(/_/g, ' ').toUpperCase(),
    type: 'technology' as const,
    size: Math.min(5, Math.ceil(count / 2)),
    momentum: count > 3 ? 'growing' : 'stable',
    nodes: sigs.filter(s => s.signal_type === type).slice(0, 3).map(s => s.company ?? s.title.slice(0, 30)),
  }));

  // EP chapter based on industry
  const EP_CHAPTERS: Record<string, string> = {
    'defense': 'Fort Bliss and WSMR are active buyers for this technology. DoD procurement cycles directly affect El Paso defense contractors.',
    'ai-ml': 'Fort Bliss has active AI autonomy programs. UTEP runs NSF-funded AI research. Juárez smart factory automation is accelerating.',
    'logistics': 'El Paso is the top US-Mexico trade corridor. $126B flows through BOTA/BOTE annually. XPO, Amazon, and FedEx have major operations here.',
    'manufacturing': '300+ Juárez maquiladoras supply Ford, Foxconn, Bosch, Lear. Nearshoring wave is bringing factories closer to El Paso.',
    'border-tech': 'CBP HQ for this sector is in El Paso. Every scanning, biometric, and crossing technology is deployed here first.',
    'cybersecurity': 'FORSCOM and Fort Bliss require enterprise cybersecurity. CBP digital infrastructure runs through El Paso.',
    'space': 'White Sands Missile Range is 90 miles away. SpaceX Starbase is a 45-minute flight. Army space operations center is nearby.',
  };

  const analysis = {
    industry,
    signals_used: sigs.length,
    observation_timestamp: new Date().toISOString(),
    signal_summary: {
      dominant_signal: topSignal?.title ?? `${industry} sector activity`,
      signal_count: sigs.length,
      signals: sigs.slice(0, 5).map(s => ({
        title: s.title,
        type: (s.el_paso_score ?? 0) >= 60 ? 'explicit' : (s.el_paso_score ?? 0) >= 25 ? 'subtle' : 'anomaly',
        weight: s.importance_score ?? 50,
      })),
      noise_ratio: 'low',
      acceleration,
    },
    visual_map: {
      center: `${industry.toUpperCase()} — ${rising} rising signals`,
      clusters,
      connections: clusters.slice(0, 3).map((c, i) => ({
        from: clusters[0]?.id ?? 'center',
        to: c.id,
        label: 'momentum',
        strength: 2,
      })),
      tension_zones: falling > 0 ? [`${falling} signals declining`] : [],
    },
    story: {
      headline: `${industry.toUpperCase()} sector shows ${trajectory} momentum with ${rising} rising signals`,
      act_1: `The ${industry} sector has ${sigs.length} active signals in the intelligence database. Historical patterns show consistent activity.`,
      act_2: `Currently ${rising} signals are rising, ${falling} falling, and ${emerging} emerging. The dominant signal is: "${topSignal?.title?.slice(0, 100) ?? 'monitoring'}"`,
      act_3: `Trajectory is ${trajectory}. ${epRelevant.length} signals have direct or indirect relevance to El Paso. ${epDirect.length} signals are EP DIRECT.`,
      el_paso_chapter: EP_CHAPTERS[industry] ?? `El Paso has strategic exposure to the ${industry} sector through its border position and Fort Bliss proximity.`,
      tension: `${rising} signals rising vs ${falling} falling — net momentum is ${rising > falling ? 'positive' : 'mixed'}`,
    },
    emerging_discoveries: sigs.filter(s => s.direction === 'emerging').slice(0, 3).map((s, i) => ({
      id: `discovery-${i}`,
      name: s.company ?? s.title.slice(0, 40),
      category: 'technology',
      maturity: 'early_product',
      why_it_matters: s.meaning ?? `${s.signal_type} activity in ${industry}`,
      el_paso_angle: s.el_paso_angle ?? 'Monitor for local relevance',
    })),
    direction: {
      trajectory,
      primary_vector: `${rising} rising signals indicate ${trajectory === 'growing' ? 'sector expansion' : 'mixed momentum'}`,
      secondary_vector: epDirect.length > 0 ? `${epDirect.length} EP DIRECT signals — local impact imminent` : `${epRelevant.length} EP RELEVANT signals — monitor for local effects`,
      timeline: 'weeks to months',
      confidence: Math.min(90, 50 + sigs.length),
      futures: [
        { label: 'Continued growth', probability: trajectory === 'growing' ? 'high' : 'medium', description: `${rising} rising signals support continued expansion` },
        { label: 'Market stabilization', probability: 'medium', description: 'Rising signals plateau as market matures' },
        { label: 'Disruption event', probability: 'low', description: `${falling} falling signals may accelerate if external pressures increase` },
      ],
    },
    what_to_watch: sigs.slice(0, 4).map((s, i) => ({
      signal: s.company ?? s.title.slice(0, 50),
      why: s.meaning ?? `Active ${s.signal_type} in ${industry}`,
      timeframe: i < 2 ? 'weeks' : 'months',
      trigger: s.direction === 'rising' ? 'Follow-on contract or funding announcement' : 'Market adoption confirmation',
    })),
    uncertainty: {
      blind_spots: ['Global macroeconomic shifts', 'Regulatory changes', 'Geopolitical events'],
      what_could_change_everything: `A major ${industry} contract award or technology breakthrough affecting El Paso directly`,
    },
  };

  return NextResponse.json({ ok: true, analysis, mode: 'keyword-fallback' });
}
