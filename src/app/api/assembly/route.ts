/**
 * GET /api/assembly — Read assembled intelligence (clusters + narratives + trends)
 * POST /api/assembly — Manually trigger assembly pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildClusters, detectTrends, persistAssembly } from '@/lib/engines/assembly-engine';
import { generateNarratives, persistNarratives } from '@/lib/engines/narrative-engine';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

// ─── GET: Read assembled intelligence ───────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
  const minStrength = parseInt(request.nextUrl.searchParams.get('min_strength') || '30');

  // Fetch clusters with narratives via the view
  const { data: briefings, error } = await supabase
    .from('v_cluster_briefings')
    .select('*')
    .gte('strength', minStrength)
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch recent trends
  const { data: trends } = await supabase
    .from('intel_trends')
    .select('*')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('confidence', { ascending: false })
    .limit(10);

  // Fetch recommendations for top clusters
  const topClusterIds = (briefings || []).slice(0, 5).map((b: { id: string }) => b.id);
  const recommendations: Record<string, unknown[]> = {};
  if (topClusterIds.length > 0) {
    const { data: recs } = await supabase
      .from('cluster_recommendations')
      .select('*')
      .in('cluster_id', topClusterIds)
      .order('relevance', { ascending: false });

    if (recs) {
      for (const r of recs as { cluster_id: string }[]) {
        if (!recommendations[r.cluster_id]) recommendations[r.cluster_id] = [];
        recommendations[r.cluster_id].push(r);
      }
    }
  }

  return NextResponse.json({
    briefings: (briefings || []).map((b: { id: string }) => ({
      ...b,
      recommendations: recommendations[b.id] || [],
    })),
    trends: trends || [],
    meta: {
      total_clusters: briefings?.length || 0,
      total_trends: trends?.length || 0,
      generated_at: new Date().toISOString(),
    },
  });
}

// ─── POST: Manually trigger assembly ────────────────────────────────

export async function POST(request: NextRequest) {
  const start = Date.now();

  try {
    const clusters = await buildClusters();
    const trends = await detectTrends(clusters);
    await persistAssembly(clusters, trends);

    const maxAI = parseInt(request.nextUrl.searchParams.get('max_ai') || '10');
    const narratives = await generateNarratives(clusters, trends, maxAI);
    await persistNarratives(narratives);

    return NextResponse.json({
      success: true,
      stats: {
        clusters_found: clusters.length,
        trends_found: trends.length,
        narratives_generated: narratives.length,
        ai_calls: narratives.filter(n => n.model_used !== 'fallback').length,
        elapsed_ms: Date.now() - start,
      },
      top_clusters: clusters.slice(0, 5).map(c => ({
        title: c.title,
        signal_count: c.signal_count,
        strength: c.strength,
        companies: c.companies,
        causal_chain: c.causal_chain,
      })),
    });
  } catch (error) {
    console.error('[Assembly] Pipeline failed:', error);
    return NextResponse.json(
      { error: 'Assembly pipeline failed', details: String(error) },
      { status: 500 }
    );
  }
}
