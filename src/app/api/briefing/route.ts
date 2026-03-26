/**
 * GET /api/briefing — Top 3 things happening in supply chain today
 *
 * Pulls from v_cluster_briefings filtered to supply chain / logistics / manufacturing.
 * Falls back to top scored signals if no clusters exist yet.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

const SC_INDUSTRIES = ['supply-chain', 'logistics', 'manufacturing', 'supply_chain', 'border-tech'];

interface BriefingCluster {
  id: string;
  title: string;
  strength: number;
  signal_count: number;
  industries: string[];
  what_is_happening: string | null;
  why_it_matters: string | null;
  what_happens_next: string | null;
  vendors: { company_name: string; sector: string; iker_score: number; company_url: string | null }[];
  products: { product_name: string; company: string; category: string | null }[];
}

export async function GET() {
  const supabase = createClient();

  // ── 1. Get top clusters with narratives ──
  const { data: allClusters } = await supabase
    .from('v_cluster_briefings')
    .select('*')
    .gte('strength', 25)
    .order('strength', { ascending: false })
    .limit(20);

  // Filter to supply chain related industries
  const scClusters = (allClusters || []).filter((c) => {
    const industries = (c.industries || []) as string[];
    return industries.some((ind) => SC_INDUSTRIES.some((sc) => ind.toLowerCase().includes(sc)))
      || (c.title || '').toLowerCase().match(/supply|logistics|manufactur|warehouse|freight|shipping|trade|tariff|nearshore|port|cargo/);
  });

  // Take top 3
  const top3 = scClusters.slice(0, 3);

  // ── 2. For each cluster, match vendors and products ──
  const briefingClusters: BriefingCluster[] = [];

  for (const c of top3) {
    const industries = (c.industries || []) as string[];

    // Match vendors
    let vendors: BriefingCluster['vendors'] = [];
    if (industries.length > 0) {
      const { data: v } = await supabase
        .from('vendors')
        .select('company_name, sector, iker_score, company_url')
        .order('iker_score', { ascending: false })
        .limit(3);
      if (v) vendors = v;
    }

    // Match products
    let products: BriefingCluster['products'] = [];
    if (industries.length > 0) {
      const { data: p } = await supabase
        .from('products')
        .select('product_name, company, category')
        .in('industry', industries)
        .order('confidence', { ascending: false })
        .limit(3);
      if (p) products = p;
    }

    briefingClusters.push({
      id: c.id,
      title: c.title,
      strength: c.strength,
      signal_count: c.signal_count,
      industries,
      what_is_happening: c.what_is_happening,
      why_it_matters: c.why_it_matters,
      what_happens_next: c.what_happens_next,
      vendors: vendors.slice(0, 3),
      products: products.slice(0, 3),
    });
  }

  // ── 3. Fallback: if no SC clusters, use top signals ──
  let fallbackSignals: { id: string; title: string; industry: string; score: number }[] = [];
  if (briefingClusters.length === 0) {
    // Try all clusters if no SC-specific ones
    const anyClusters = (allClusters || []).slice(0, 3);
    if (anyClusters.length > 0) {
      for (const c of anyClusters) {
        briefingClusters.push({
          id: c.id,
          title: c.title,
          strength: c.strength,
          signal_count: c.signal_count,
          industries: c.industries || [],
          what_is_happening: c.what_is_happening,
          why_it_matters: c.why_it_matters,
          what_happens_next: c.what_happens_next,
          vendors: [],
          products: [],
        });
      }
    } else {
      // No clusters at all — fall back to raw signals
      const { data: signals } = await supabase
        .from('intel_signals')
        .select('id, title, industry, importance_score')
        .order('importance_score', { ascending: false })
        .limit(3);
      fallbackSignals = (signals || []).map((s) => ({
        id: s.id,
        title: s.title,
        industry: s.industry,
        score: Math.round((s.importance_score || 0) * 100),
      }));
    }
  }

  // ── 4. Signal count ──
  const { count: totalSignals } = await supabase
    .from('intel_signals')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({
    briefing: {
      generated_at: new Date().toISOString(),
      total_signals: totalSignals || 0,
      top_3: briefingClusters,
      fallback_signals: fallbackSignals,
    },
  });
}
