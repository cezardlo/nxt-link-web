/**
 * GET /api/briefing — Executive briefing: Top 3 things that matter right now
 *
 * Pulls from:
 *   - intel_clusters (assembled clusters with narratives)
 *   - intel_trends (velocity/patterns)
 *   - vendors (matched to cluster industries)
 *   - products (matched to cluster technologies)
 *   - intel_signals (latest high-importance signals for fallback)
 *
 * Returns a structured decision-ready briefing.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

interface BriefingCluster {
  id: string;
  title: string;
  strength: number;
  signal_count: number;
  companies: string[];
  industries: string[];
  technologies: string[];
  what_is_happening: string | null;
  why_it_matters: string | null;
  what_happens_next: string | null;
  actions: string[] | null;
  vendors: { company_name: string; sector: string; iker_score: number; company_url: string | null }[];
  products: { product_name: string; company: string; category: string | null; description: string | null }[];
}

export async function GET() {
  const supabase = createClient();

  // ── 1. Get top clusters with narratives ──
  const { data: clusters } = await supabase
    .from('v_cluster_briefings')
    .select('*')
    .gte('strength', 30)
    .limit(10);

  // ── 2. Get active trends ──
  const { data: trends } = await supabase
    .from('intel_trends')
    .select('*')
    .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
    .order('confidence', { ascending: false })
    .limit(5);

  // ── 3. Get signal velocity for context ──
  const { data: velocity } = await supabase
    .from('v_signal_velocity')
    .select('*')
    .gt('velocity_ratio', 1.5)
    .limit(5);

  // ── 4. For each top cluster, match vendors and products ──
  const briefingClusters: BriefingCluster[] = [];

  const topClusters = (clusters || []).slice(0, 5);

  for (const c of topClusters) {
    const industries = (c.industries || []) as string[];
    const technologies = (c.technologies || []) as string[];
    const companies = (c.companies || []) as string[];

    // Match vendors by industry
    let vendors: BriefingCluster['vendors'] = [];
    if (industries.length > 0) {
      const { data: v } = await supabase
        .from('vendors')
        .select('company_name, sector, iker_score, company_url')
        .overlaps('industries', industries)
        .order('iker_score', { ascending: false })
        .limit(5);
      if (v) vendors = v;
    }

    // Also match vendors by company name if cluster has companies
    if (vendors.length < 3 && companies.length > 0) {
      for (const name of companies.slice(0, 3)) {
        const { data: v } = await supabase
          .from('vendors')
          .select('company_name, sector, iker_score, company_url')
          .ilike('company_name', `%${name}%`)
          .limit(2);
        if (v) {
          for (const vendor of v) {
            if (!vendors.some(existing => existing.company_name === vendor.company_name)) {
              vendors.push(vendor);
            }
          }
        }
      }
    }

    // Match products by industry or technology
    let products: BriefingCluster['products'] = [];
    if (industries.length > 0) {
      const { data: p } = await supabase
        .from('products')
        .select('product_name, company, category, description')
        .in('industry', industries)
        .not('product_name', 'ilike', '%start making%')
        .not('product_name', 'ilike', '%slew of%')
        .order('confidence', { ascending: false })
        .limit(5);
      if (p) products = p;
    }

    // Also match by technology keywords
    if (products.length < 3 && technologies.length > 0) {
      for (const tech of technologies.slice(0, 2)) {
        const { data: p } = await supabase
          .from('products')
          .select('product_name, company, category, description')
          .or(`product_name.ilike.%${tech}%,category.ilike.%${tech}%`)
          .limit(3);
        if (p) {
          for (const prod of p) {
            if (!products.some(existing => existing.product_name === prod.product_name)) {
              products.push(prod);
            }
          }
        }
      }
    }

    briefingClusters.push({
      id: c.id,
      title: c.title,
      strength: c.strength,
      signal_count: c.signal_count,
      companies: c.companies || [],
      industries: c.industries || [],
      technologies: c.technologies || [],
      what_is_happening: c.what_is_happening,
      why_it_matters: c.why_it_matters,
      what_happens_next: c.what_happens_next,
      actions: c.actions,
      vendors: vendors.slice(0, 5),
      products: products.slice(0, 5),
    });
  }

  // ── 5. Fallback: if no clusters, use top signals directly ──
  let topSignals: unknown[] = [];
  if (briefingClusters.length === 0) {
    const { data: signals } = await supabase
      .from('intel_signals')
      .select('id, title, industry, importance_score, signal_type, company, discovered_at')
      .gte('importance_score', 0.6)
      .order('discovered_at', { ascending: false })
      .limit(10);
    topSignals = signals || [];
  }

  // ── 6. Total signal count for context ──
  const { count: totalSignals } = await supabase
    .from('intel_signals')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({
    briefing: {
      generated_at: new Date().toISOString(),
      total_signals: totalSignals || 0,
      top_clusters: briefingClusters,
      trends: trends || [],
      velocity: velocity || [],
      fallback_signals: topSignals,
    },
  });
}
