/**
 * ASSEMBLY ENGINE — The "thinking" layer
 *
 * Takes individually processed signals and assembles them into clusters,
 * detects trends, and prepares structured context for AI narrative generation.
 *
 * NO AI in this file. Pure SQL + code logic.
 *
 * Pipeline:
 *   1. buildClusters()     — group signals by company, industry+geo, connections
 *   2. detectTrends()      — velocity analysis, chain detection, hotspots
 *   3. matchRecommendations() — join clusters to vendors/products
 *
 * AI is called SEPARATELY in narrative-engine.ts, only for top clusters.
 */

import { createClient } from '@/lib/supabase/client';

// ─── Types ──────────────────────────────────────────────────────────

export interface AssembledCluster {
  id?: string;
  title: string;
  signal_ids: string[];
  signal_count: number;
  companies: string[];
  industries: string[];
  locations: string[];
  technologies: string[];
  primary_type: string | null;
  strength: number;
  first_signal: string;
  last_signal: string;
  // Enrichment for narrative generation
  signals: ClusterSignal[];
  causal_chain: string[];
  total_amount: number;
}

interface ClusterSignal {
  id: string;
  title: string;
  signal_type: string | null;
  industry: string | null;
  company: string | null;
  importance_score: number;
  amount_usd: number | null;
  discovered_at: string;
  source: string | null;
}

export interface DetectedTrend {
  name: string;
  trend_type: 'spike' | 'growth' | 'cooling' | 'hotspot' | 'chain' | 'emergence';
  industry: string | null;
  location: string | null;
  company: string | null;
  signal_count: number;
  cluster_ids: string[];
  velocity: number;
  direction: 'accelerating' | 'stable' | 'decelerating';
  confidence: number;
}

export interface Recommendation {
  rec_type: 'vendor' | 'product' | 'technology';
  entity_id: string | null;
  entity_name: string;
  relevance: number;
  reason: string;
}

// ─── CAUSAL CHAIN ORDER ─────────────────────────────────────────────
// Signals that typically follow each other in sequence

const SIGNAL_ORDER: Record<string, number> = {
  research_publication: 1,
  patent_filing: 2,
  funding_round: 3,
  hiring_surge: 4,
  facility_expansion: 5,
  product_launch: 6,
  contract_award: 7,
  merger_acquisition: 8,
  regulatory_action: 9,
};

// ═══════════════════════════════════════════════════════════════════
// LAYER 1: CLUSTERING
// Groups signals into "stories" using SQL, no AI
// ═══════════════════════════════════════════════════════════════════

export async function buildClusters(): Promise<AssembledCluster[]> {
  const supabase = createClient();
  const clusters: Map<string, AssembledCluster> = new Map();

  // ── Step 1: Fetch recent signals (last 14 days) ──
  const { data: signals } = await supabase
    .from('intel_signals')
    .select('id, title, signal_type, industry, company, importance_score, amount_usd, discovered_at, source, tags')
    .gte('discovered_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
    .order('discovered_at', { ascending: false })
    .limit(500);

  if (!signals || signals.length === 0) return [];

  // ── Step 2: Cluster by COMPANY (same company within 14 days) ──
  const byCompany = new Map<string, ClusterSignal[]>();
  for (const s of signals) {
    if (!s.company) continue;
    const key = s.company.toLowerCase().trim();
    if (!byCompany.has(key)) byCompany.set(key, []);
    byCompany.get(key)!.push(s as ClusterSignal);
  }

  for (const [company, sigs] of byCompany) {
    if (sigs.length < 2) continue; // Need at least 2 signals to form a cluster
    const clusterId = `company:${company}`;
    const industries = [...new Set(sigs.map(s => s.industry).filter(Boolean))] as string[];
    const types = sigs.map(s => s.signal_type).filter(Boolean) as string[];
    const primaryType = mode(types);
    const chain = buildCausalChain(types);

    clusters.set(clusterId, {
      title: `${titleCase(company)} — ${describeActivity(types)}`,
      signal_ids: sigs.map(s => s.id),
      signal_count: sigs.length,
      companies: [titleCase(company)],
      industries,
      locations: [],
      technologies: extractTechKeywords(sigs),
      primary_type: primaryType,
      strength: computeClusterStrength(sigs, chain.length),
      first_signal: sigs[sigs.length - 1].discovered_at,
      last_signal: sigs[0].discovered_at,
      signals: sigs,
      causal_chain: chain,
      total_amount: sigs.reduce((sum, s) => sum + (s.amount_usd || 0), 0),
    });
  }

  // ── Step 3: Cluster by INDUSTRY + similar time window ──
  // For signals without a company, group by industry within 7-day windows
  const unclusteredSignals = signals.filter(s =>
    !s.company || !byCompany.has(s.company.toLowerCase().trim()) ||
    byCompany.get(s.company.toLowerCase().trim())!.length < 2
  );

  const byIndustry = new Map<string, ClusterSignal[]>();
  for (const s of unclusteredSignals) {
    if (!s.industry) continue;
    const key = s.industry.toLowerCase();
    if (!byIndustry.has(key)) byIndustry.set(key, []);
    byIndustry.get(key)!.push(s as ClusterSignal);
  }

  for (const [industry, sigs] of byIndustry) {
    // Sub-group by 7-day windows
    const windows = groupByTimeWindow(sigs, 7);
    for (const windowSigs of windows) {
      if (windowSigs.length < 3) continue; // Need 3+ signals for industry cluster
      const types = windowSigs.map(s => s.signal_type).filter(Boolean) as string[];
      const companies = [...new Set(windowSigs.map(s => s.company).filter(Boolean))] as string[];
      const chain = buildCausalChain(types);
      const clusterId = `industry:${industry}:${windowSigs[0].discovered_at.slice(0, 10)}`;

      if (!clusters.has(clusterId)) {
        clusters.set(clusterId, {
          title: `${titleCase(industry)} sector — ${describeActivity(types)}`,
          signal_ids: windowSigs.map(s => s.id),
          signal_count: windowSigs.length,
          companies,
          industries: [industry],
          locations: [],
          technologies: extractTechKeywords(windowSigs),
          primary_type: mode(types),
          strength: computeClusterStrength(windowSigs, chain.length),
          first_signal: windowSigs[windowSigs.length - 1].discovered_at,
          last_signal: windowSigs[0].discovered_at,
          signals: windowSigs,
          causal_chain: chain,
          total_amount: windowSigs.reduce((sum, s) => sum + (s.amount_usd || 0), 0),
        });
      }
    }
  }

  // ── Step 4: Merge clusters that share 2+ signals ──
  const clusterArray = [...clusters.values()];
  const merged = mergeSimilarClusters(clusterArray);

  return merged.sort((a, b) => b.strength - a.strength);
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 2: TREND DETECTION
// Analyzes velocity, chains, and concentration. No AI.
// ═══════════════════════════════════════════════════════════════════

export async function detectTrends(clusters: AssembledCluster[]): Promise<DetectedTrend[]> {
  const supabase = createClient();
  const trends: DetectedTrend[] = [];

  // ── Velocity trends from SQL view ──
  const { data: velocityData } = await supabase
    .from('v_signal_velocity')  // The view we created in the migration
    .select('*')
    .gt('velocity_ratio', 1.5); // Only industries with significant acceleration

  if (velocityData) {
    for (const v of velocityData) {
      const relatedClusters = clusters.filter(c =>
        c.industries.some(i => i.toLowerCase() === v.industry?.toLowerCase())
      );

      if (v.velocity_ratio >= 2.0) {
        trends.push({
          name: `${titleCase(v.industry)} signal spike`,
          trend_type: 'spike',
          industry: v.industry,
          location: null,
          company: null,
          signal_count: v.signals_7d,
          cluster_ids: relatedClusters.map(c => c.id).filter(Boolean) as string[],
          velocity: v.velocity_ratio,
          direction: 'accelerating',
          confidence: Math.min(90, 50 + v.signals_7d * 2),
        });
      } else if (v.velocity_ratio >= 1.5) {
        trends.push({
          name: `${titleCase(v.industry)} activity increasing`,
          trend_type: 'growth',
          industry: v.industry,
          location: null,
          company: null,
          signal_count: v.signals_7d,
          cluster_ids: relatedClusters.map(c => c.id).filter(Boolean) as string[],
          velocity: v.velocity_ratio,
          direction: 'accelerating',
          confidence: Math.min(80, 40 + v.signals_7d * 2),
        });
      }
    }
  }

  // ── Causal chain trends (from clusters) ──
  for (const cluster of clusters) {
    if (cluster.causal_chain.length >= 3) {
      trends.push({
        name: `${cluster.companies[0] || cluster.industries[0]} — ${cluster.causal_chain.join(' → ')}`,
        trend_type: 'chain',
        industry: cluster.industries[0] || null,
        location: cluster.locations[0] || null,
        company: cluster.companies[0] || null,
        signal_count: cluster.signal_count,
        cluster_ids: cluster.id ? [cluster.id] : [],
        velocity: 0,
        direction: 'accelerating',
        confidence: Math.min(85, 50 + cluster.causal_chain.length * 10),
      });
    }
  }

  // ── Company concentration (from SQL view) ──
  const { data: companyData } = await supabase
    .from('v_company_activity')
    .select('*')
    .gte('signal_count', 3);

  if (companyData) {
    for (const c of companyData) {
      if (c.type_diversity >= 3) {
        // Company has 3+ different signal types = multi-front activity
        trends.push({
          name: `${c.company} multi-front expansion`,
          trend_type: 'emergence',
          industry: null,
          location: null,
          company: c.company,
          signal_count: c.signal_count,
          cluster_ids: [],
          velocity: c.signal_count / 3, // rough activity ratio
          direction: c.signal_count >= 5 ? 'accelerating' : 'stable',
          confidence: Math.min(80, 40 + c.type_diversity * 10),
        });
      }
    }
  }

  // ── Cooling trends (industries with dropping velocity) ──
  const { data: coolingData } = await supabase
    .from('v_signal_velocity')
    .select('*')
    .lt('velocity_ratio', 0.5)
    .gt('signals_28d', 10); // Only flag cooling for industries that were active

  if (coolingData) {
    for (const v of coolingData) {
      trends.push({
        name: `${titleCase(v.industry)} activity declining`,
        trend_type: 'cooling',
        industry: v.industry,
        location: null,
        company: null,
        signal_count: v.signals_7d,
        cluster_ids: [],
        velocity: v.velocity_ratio,
        direction: 'decelerating',
        confidence: Math.min(75, 40 + (v.signals_28d - v.signals_7d)),
      });
    }
  }

  return trends.sort((a, b) => b.confidence - a.confidence);
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 4: RECOMMENDATIONS (SQL joins, no AI)
// Matches clusters to vendors, products, technologies
// ═══════════════════════════════════════════════════════════════════

export async function matchRecommendations(
  cluster: AssembledCluster
): Promise<Recommendation[]> {
  const supabase = createClient();
  const recs: Recommendation[] = [];

  // ── Match vendors by industry ──
  if (cluster.industries.length > 0) {
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id, name, industry, iker_score')
      .in('industry', cluster.industries)
      .order('iker_score', { ascending: false })
      .limit(5);

    if (vendors) {
      for (const v of vendors) {
        recs.push({
          rec_type: 'vendor',
          entity_id: v.id,
          entity_name: v.name,
          relevance: Math.round((v.iker_score || 50) * 0.8 + 20),
          reason: `Active in ${v.industry}, IKER score ${v.iker_score || 'N/A'}`,
        });
      }
    }
  }

  // ── Match products by technology keywords ──
  if (cluster.technologies.length > 0) {
    for (const tech of cluster.technologies.slice(0, 3)) {
      const { data: products } = await supabase
        .from('products')
        .select('id, name, category')
        .ilike('name', `%${tech}%`)
        .limit(3);

      if (products) {
        for (const p of products) {
          recs.push({
            rec_type: 'product',
            entity_id: p.id,
            entity_name: p.name,
            relevance: 60,
            reason: `Matches technology: ${tech}`,
          });
        }
      }
    }
  }

  // Dedupe by entity_name
  const seen = new Set<string>();
  return recs.filter(r => {
    const key = `${r.rec_type}:${r.entity_name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ═══════════════════════════════════════════════════════════════════
// PERSIST — Save clusters, trends, and recommendations to DB
// ═══════════════════════════════════════════════════════════════════

export async function persistAssembly(
  clusters: AssembledCluster[],
  trends: DetectedTrend[]
): Promise<void> {
  const supabase = createClient();

  // Mark old clusters as stale
  await supabase
    .from('intel_clusters')
    .update({ status: 'stale' })
    .eq('status', 'active')
    .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  // Upsert clusters
  for (const cluster of clusters.slice(0, 50)) { // Top 50 clusters
    const { data: inserted } = await supabase
      .from('intel_clusters')
      .upsert({
        title: cluster.title,
        signal_ids: cluster.signal_ids,
        signal_count: cluster.signal_count,
        companies: cluster.companies,
        industries: cluster.industries,
        locations: cluster.locations,
        technologies: cluster.technologies,
        primary_type: cluster.primary_type,
        strength: cluster.strength,
        first_signal: cluster.first_signal,
        last_signal: cluster.last_signal,
        status: 'active',
      }, { onConflict: 'title' })  // Dedupe by title
      .select('id')
      .single();

    // Match recommendations for strong clusters
    if (inserted && cluster.strength >= 40) {
      const recs = await matchRecommendations(cluster);
      if (recs.length > 0) {
        // Clear old recs for this cluster
        await supabase
          .from('cluster_recommendations')
          .delete()
          .eq('cluster_id', inserted.id);

        await supabase
          .from('cluster_recommendations')
          .insert(recs.map(r => ({ ...r, cluster_id: inserted.id })));
      }
    }
  }

  // Insert trends (append, don't replace — they're time-stamped)
  if (trends.length > 0) {
    await supabase
      .from('intel_trends')
      .insert(trends.slice(0, 30).map(t => ({
        name: t.name,
        trend_type: t.trend_type,
        industry: t.industry,
        location: t.location,
        company: t.company,
        signal_count: t.signal_count,
        cluster_ids: t.cluster_ids,
        velocity: t.velocity,
        direction: t.direction,
        confidence: t.confidence,
        window_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        window_end: new Date().toISOString(),
      })));
  }
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

function mode(arr: string[]): string | null {
  if (arr.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of arr) counts.set(v, (counts.get(v) || 0) + 1);
  let max = 0, result = arr[0];
  for (const [k, v] of counts) { if (v > max) { max = v; result = k; } }
  return result;
}

function buildCausalChain(types: string[]): string[] {
  const unique = [...new Set(types)];
  return unique
    .filter(t => t in SIGNAL_ORDER)
    .sort((a, b) => (SIGNAL_ORDER[a] || 99) - (SIGNAL_ORDER[b] || 99))
    .map(t => t.replace(/_/g, ' '));
}

function describeActivity(types: string[]): string {
  const unique = [...new Set(types)];
  if (unique.length === 1) return unique[0].replace(/_/g, ' ');
  if (unique.length <= 3) return unique.map(t => t.replace(/_/g, ' ')).join(', ');
  return `${unique.length} signal types`;
}

function computeClusterStrength(signals: ClusterSignal[], chainLength: number): number {
  const count = signals.length;
  const avgImportance = signals.reduce((s, sig) => s + (sig.importance_score || 0), 0) / count;
  const hasAmount = signals.some(s => (s.amount_usd || 0) > 0);
  const typeDiversity = new Set(signals.map(s => s.signal_type).filter(Boolean)).size;

  let strength = 0;
  strength += Math.min(30, count * 5);          // More signals = stronger (max 30)
  strength += avgImportance * 30;               // Higher importance = stronger (max 30)
  strength += chainLength * 8;                  // Causal chain = stronger (max ~24)
  strength += typeDiversity * 3;                // Type diversity = stronger (max ~15)
  strength += hasAmount ? 10 : 0;               // Financial signal = stronger

  return Math.min(100, Math.round(strength));
}

function extractTechKeywords(signals: ClusterSignal[]): string[] {
  const TECH_TERMS = [
    'ai', 'ml', 'machine learning', 'deep learning', 'llm', 'nlp',
    'blockchain', 'quantum', '5g', 'iot', 'cloud', 'edge computing',
    'cybersecurity', 'autonomous', 'robotics', 'drone', 'solar', 'ev',
    'battery', 'lidar', 'radar', 'satellite', 'biometric', 'sensor',
  ];
  const text = signals.map(s => s.title.toLowerCase()).join(' ');
  return TECH_TERMS.filter(t => text.includes(t));
}

function groupByTimeWindow(signals: ClusterSignal[], dayWindow: number): ClusterSignal[][] {
  if (signals.length === 0) return [];
  const sorted = [...signals].sort((a, b) =>
    new Date(a.discovered_at).getTime() - new Date(b.discovered_at).getTime()
  );
  const windows: ClusterSignal[][] = [[]];
  let windowStart = new Date(sorted[0].discovered_at).getTime();
  const ms = dayWindow * 24 * 60 * 60 * 1000;

  for (const s of sorted) {
    const t = new Date(s.discovered_at).getTime();
    if (t - windowStart > ms) {
      windows.push([]);
      windowStart = t;
    }
    windows[windows.length - 1].push(s);
  }
  return windows;
}

function mergeSimilarClusters(clusters: AssembledCluster[]): AssembledCluster[] {
  // If two clusters share 50%+ of their signals, merge the smaller into the larger
  const merged: AssembledCluster[] = [];
  const consumed = new Set<number>();

  for (let i = 0; i < clusters.length; i++) {
    if (consumed.has(i)) continue;
    let current = clusters[i];

    for (let j = i + 1; j < clusters.length; j++) {
      if (consumed.has(j)) continue;
      const other = clusters[j];
      const overlap = current.signal_ids.filter(id => other.signal_ids.includes(id)).length;
      const minSize = Math.min(current.signal_ids.length, other.signal_ids.length);

      if (overlap >= minSize * 0.5) {
        // Merge: take the larger cluster and add missing signals
        const allIds = [...new Set([...current.signal_ids, ...other.signal_ids])];
        const allSignals = [...current.signals];
        for (const s of other.signals) {
          if (!allSignals.some(e => e.id === s.id)) allSignals.push(s);
        }

        current = {
          ...current,
          signal_ids: allIds,
          signal_count: allIds.length,
          companies: [...new Set([...current.companies, ...other.companies])],
          industries: [...new Set([...current.industries, ...other.industries])],
          technologies: [...new Set([...current.technologies, ...other.technologies])],
          signals: allSignals,
          strength: Math.max(current.strength, other.strength),
          causal_chain: current.causal_chain.length >= other.causal_chain.length
            ? current.causal_chain : other.causal_chain,
          total_amount: current.total_amount + other.total_amount,
        };
        consumed.add(j);
      }
    }

    merged.push(current);
  }

  return merged;
}
