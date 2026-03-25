/**
 * GET /api/assembly/run — Vercel Cron target
 * Runs the full assembly pipeline: cluster → trend → narrative → recommend
 * Schedule: every 30 minutes via vercel.json
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildClusters, detectTrends, persistAssembly } from '@/lib/engines/assembly-engine';
import { generateNarratives, persistNarratives } from '@/lib/engines/narrative-engine';

export const maxDuration = 60; // Allow up to 60s for assembly

export async function GET(request: NextRequest) {
  const start = Date.now();

  try {
    // Verify Vercel Cron secret
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
    });
  } catch (error) {
    console.error('[Assembly] Pipeline failed:', error);
    return NextResponse.json(
      { error: 'Assembly pipeline failed', details: String(error) },
      { status: 500 }
    );
  }
}
