// src/app/api/signals/[id]/insight/route.ts
// Step 8: Insight Generation API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateInsight, shouldGenerateInsight, type Connection } from '@/lib/insights';
import { findConnections } from '@/lib/graph';

export const dynamic = 'force-dynamic';

// Cache insights for 24 hours
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const signalId = params.id;

  if (!signalId || signalId === 'undefined') {
    return NextResponse.json(
      { error: 'Signal ID required' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  try {
    // 1. Check for cached insight
    const { data: cached } = await supabase
      .from('insights')
      .select('*')
      .eq('signal_id', signalId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (cached && isRecent(cached.generated_at)) {
      return NextResponse.json({
        ...cached,
        cached: true
      });
    }

    // 2. Get the signal
    const { data: signal, error: signalError } = await supabase
      .from('intel_signals')
      .select(`
        id,
        title,
        content,
        severity,
        signal_type,
        entities,
        detected_at,
        vendor_id,
        vendors (
          id,
          name,
          industry,
          iker_score,
          city,
          country
        )
      `)
      .eq('id', signalId)
      .single();

    if (signalError || !signal) {
      return NextResponse.json(
        { error: 'Signal not found' },
        { status: 404 }
      );
    }

    // 3. Get connections from Neo4j
    let connections: Connection[] = [];
    try {
      const graphResult = await findConnections(signalId);
      connections = graphResult.edges.map(edge => {
        const targetNode = graphResult.nodes.find(n => n.id === edge.target);
        return {
          type: edge.type.toUpperCase() as Connection['type'],
          target_signal: {
            id: edge.target,
            title: String(targetNode?.properties?.title ?? ''),
            content: String(targetNode?.properties?.title ?? ''),
            severity: Number(targetNode?.properties?.severity ?? 3),
            signal_type: String(targetNode?.properties?.signal_type ?? 'unknown'),
            entities: [],
            detected_at: String(targetNode?.properties?.detected_at ?? new Date().toISOString()),
          },
          confidence: (edge.properties?.confidence as number) ?? 0.7,
          properties: edge.properties,
        };
      });
    } catch (graphError) {
      console.warn('Graph connection lookup failed, continuing without:', graphError);
    }

    // 4. Check if we should generate
    const decision = shouldGenerateInsight(signal, connections);
    
    if (!decision.shouldGenerate && !request.nextUrl.searchParams.has('force')) {
      return NextResponse.json({
        signal_id: signalId,
        meaning: null,
        actions: [],
        pattern: null,
        confidence: 0,
        reason: decision.reason,
        should_generate: false
      });
    }

    // 5. Build vendor context
    const vendorData = Array.isArray(signal.vendors) ? signal.vendors[0] : signal.vendors;
    const vendor_context = vendorData ? {
      name: vendorData.name,
      industry: vendorData.industry,
      iker_score: vendorData.iker_score,
      location: [vendorData.city, vendorData.country].filter(Boolean).join(', ')
    } : undefined;

    // 6. Get user context if authenticated
    let user_context = undefined;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('industry, role')
        .eq('id', user.id)
        .single();

      const { data: watchlist } = await supabase
        .from('user_watchlists')
        .select('vendors(name)')
        .eq('user_id', user.id)
        .limit(10);

      if (profile) {
        user_context = {
          industry: profile.industry,
          role: profile.role,
          watchlist: watchlist?.map((w: Record<string, unknown>) => {
            const v = Array.isArray(w.vendors) ? w.vendors[0] : w.vendors;
            return (v as Record<string, unknown>)?.name as string | undefined;
          }).filter(Boolean) as string[] ?? []
        };
      }
    }

    // 7. Generate insight
    const insight = await generateInsight({
      signal: {
        id: signal.id,
        title: signal.title,
        content: signal.content || signal.title,
        severity: signal.severity,
        signal_type: signal.signal_type,
        entities: signal.entities || [],
        detected_at: signal.detected_at
      },
      connections,
      vendor_context,
      user_context
    });

    // 8. Store in database for caching
    const { error: insertError } = await supabase
      .from('insights')
      .insert({
        signal_id: signalId,
        meaning: insight.meaning,
        actions: insight.actions,
        pattern: insight.pattern,
        confidence: insight.confidence,
        related_signal_ids: insight.related_signals,
        model_used: insight.model_used,
        tokens_used: insight.tokens_used,
        user_id: user?.id || null
      });

    if (insertError) {
      console.warn('Failed to cache insight:', insertError);
      // Continue anyway - the insight was generated successfully
    }

    return NextResponse.json({
      ...insight,
      cached: false
    });

  } catch (error) {
    console.error('Insight generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate insight' },
      { status: 500 }
    );
  }
}

// POST: Submit feedback on an insight
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const signalId = params.id;
  const supabase = createClient();

  try {
    const { rating, feedback } = await request.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be 1-5' },
        { status: 400 }
      );
    }

    // Find the most recent insight for this signal
    const { data: insight } = await supabase
      .from('insights')
      .select('id')
      .eq('signal_id', signalId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (!insight) {
      return NextResponse.json(
        { error: 'No insight found for this signal' },
        { status: 404 }
      );
    }

    // Update with feedback
    const { error: updateError } = await supabase
      .from('insights')
      .update({
        user_rating: rating,
        user_feedback: feedback || null
      })
      .eq('id', insight.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Feedback submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

// Helper: Check if cached insight is still fresh
function isRecent(generatedAt: string): boolean {
  const generated = new Date(generatedAt).getTime();
  const now = Date.now();
  return (now - generated) < CACHE_TTL_MS;
}
