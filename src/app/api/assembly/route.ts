/**
 * POST /api/assembly — Run the assembly layer
 *
 * This is the cron endpoint that builds clusters, detects trends,
 * generates narratives, and matches recommendations.
 *
 * Designed to run every 15-30 minutes via Vercel Cron or external scheduler.
 *
 * GET /api/assembly — Read assembled intelligence (clusters + narratives)
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildClusters, detectTrends, persistAssembly } from '@/lib/engines/assembly-engine';
import { generateNarratives, persistNarratives } from '@/lib/engines/narrative-engine';
import { createClient } from '@/lib/supabase/client';

// ─── POST: Run assembly pipeline ────────────────────────────────────

export async function POST(request: NextRequest) {
  const start = Date.now();

  try {
    // Verify cron secret (optional, for Vercel Cron)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Layer 1: Build clusters (SQL + code, no AI)
    const clusters = await buildClusters();

    // Layer 2: Detect trends (SQL + code, no AI)
    const trends = await detectTrends(clusters);

    // Persist clusters and trends
    await persistAssembly(clusters, trends);

    // Layer 3: Generate narratives (AI, only for top clusters)
    const maxAI = parseInt(request.nextUrl.searchParams.get('max_ai') || '10');
    const narratives = await generateNarratives(clusters, trends, maxAI);

    // Persist narratives
    await persistNarratives(narratives);

    const elapsed = Date.now() - start;

    return NextResponse.json({
      success: true,
      stats: {
        clusters_found: clusters.length,
        trends_found: trends.length,
        narratives_generated: narratives.length,
        ai_calls: narratives.filter(n => n.model_used !== 'fallback').length,
        fallback_calls: narratives.filter(n => n.model_used === 'fallback').length,
        elapsed_ms: elapsed,
      },
      top_clusters: clusters.slice(0, 5).map(c => ({
        title: c.title,
        signal_count: c.signal_count,
        strength: c.strength,
        companies: c.companies,
        causal_chain: c.causal_chain,
      })),
      trends: trends.slice(0, 5).map(t => ({
        name: t.name,
        type: t.trend_type,
        velocity: t.velocity,
        direction: t.direction,
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
  const topClusterIds = (briefings || []).slice(0, 5).map(b => b.id);
  const recommendations: Record<string, unknown[]> = {};
  if (topClusterIds.length > 0) {
    const { data: recs } = await supabase
      .from('cluster_recommendations')
      .select('*')
      .in('cluster_id', topClusterIds)
      .order('relevance', { ascending: false });

    if (recs) {
      for (const r of recs) {
        if (!recommendations[r.cluster_id]) recommendations[r.cluster_id] = [];
        recommendations[r.cluster_id].push(r);
      }
    }
  }

  return NextResponse.json({
    briefings: (briefings || []).map(b => ({
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
