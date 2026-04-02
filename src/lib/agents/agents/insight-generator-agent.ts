// src/lib/agents/agents/insight-generator-agent.ts
// Generates "Why It Matters + Recommendation" insights from conference vendor/tech data.
// Two modes: per-conference insights + cross-conference market insights.
// Uses algorithmic grouping first, then optional LLM enrichment.

import { getDb, isSupabaseConfigured } from '@/db/client';
import { runParallelJsonEnsemble } from '@/lib/llm/parallel-router';
import {
  upsertConferenceInsights,
  upsertMarketInsights,
  type ConferenceInsightInsert,
  type MarketInsightInsert,
} from '@/db/queries/conference-insights';
// TECH_CLUSTERS available from './tech-cluster-detector' when needed

// ─── Types ──────────────────────────────────────────────────────────────────────

export type InsightGeneratorReport = {
  conference_insights_generated: number;
  market_insights_generated: number;
  conferences_analyzed: number;
  vendor_clusters_found: number;
  duration_ms: number;
};

// ─── Problem Areas (logistics/trucking focus) ───────────────────────────────────

const PROBLEM_AREAS: Array<{ area: string; keywords: RegExp; description: string }> = [
  { area: 'Border & Customs Delays', keywords: /\b(border|customs|clearance|import|export|cross.?border|cbp|tariff|duty)\b/i, description: 'Delays at border crossings and customs processing create cost inefficiencies and unpredictable delivery times.' },
  { area: 'Fleet Inefficiency', keywords: /\b(fleet|idle|fuel|mpg|utilization|deadhead|empty\s+miles|downtime)\b/i, description: 'Underutilized fleets and excessive deadhead miles drive up operating costs across the industry.' },
  { area: 'Driver Shortage & Safety', keywords: /\b(driver|CDL|shortage|retention|fatigue|ELD|safety|compliance|hours\s+of\s+service)\b/i, description: 'The ongoing driver shortage and safety compliance demands require new technology solutions.' },
  { area: 'Last Mile Delivery', keywords: /\b(last\s+mile|delivery|parcel|e.?commerce|fulfillment|same.?day|next.?day)\b/i, description: 'Rising e-commerce demand pressures last-mile delivery costs and customer expectations.' },
  { area: 'Supply Chain Visibility', keywords: /\b(visibility|track|trace|real.?time|predictive|ETA|disruption|risk)\b/i, description: 'Lack of end-to-end supply chain visibility leads to reactive rather than proactive decision-making.' },
  { area: 'Warehouse Operations', keywords: /\b(warehouse|inventory|picking|sorting|WMS|fulfillment\s+center|distribution\s+center)\b/i, description: 'Manual warehouse operations limit throughput and accuracy as order volumes grow.' },
  { area: 'Freight Cost Optimization', keywords: /\b(freight|rate|cost|pricing|bid|contract|spot\s+market|load\s+board|broker)\b/i, description: 'Volatile freight rates and opaque pricing make cost optimization a persistent challenge.' },
  { area: 'Sustainability & Emissions', keywords: /\b(emission|carbon|green|sustainability|electric|EV|hydrogen|clean|zero.?emission|ESG)\b/i, description: 'Regulatory pressure and corporate ESG goals demand fleet decarbonization and sustainable operations.' },
  { area: 'Route & Load Optimization', keywords: /\b(route|optim|load|capacity|consolidat|multi.?stop|backhaul|network\s+design)\b/i, description: 'Suboptimal routing and load planning waste fuel, time, and capacity across transportation networks.' },
  { area: 'Digital Transformation', keywords: /\b(digital|automat|AI|machine\s+learning|IoT|API|integration|platform|TMS|SaaS)\b/i, description: 'Legacy systems and manual processes prevent carriers and shippers from scaling efficiently.' },
];

// ─── Recommendation Templates ───────────────────────────────────────────────────

const RECOMMENDATION_TEMPLATES: Record<string, string> = {
  'Border & Customs Delays': 'Evaluate automated pre-clearance and digital customs documentation tools to reduce processing time.',
  'Fleet Inefficiency': 'Deploy telematics and AI-powered fleet optimization platforms to reduce deadhead miles and improve utilization.',
  'Driver Shortage & Safety': 'Invest in driver retention technology, automated compliance tools, and advanced safety systems.',
  'Last Mile Delivery': 'Consider route optimization and delivery management platforms that offer real-time customer visibility.',
  'Supply Chain Visibility': 'Adopt end-to-end visibility platforms that provide predictive ETAs and proactive disruption alerts.',
  'Warehouse Operations': 'Evaluate warehouse automation and WMS solutions that can scale with growing order volumes.',
  'Freight Cost Optimization': 'Use AI-powered pricing tools and digital freight platforms to benchmark rates and optimize spend.',
  'Sustainability & Emissions': 'Assess electric fleet options and carbon tracking tools to meet ESG targets ahead of regulations.',
  'Route & Load Optimization': 'Deploy AI routing and load consolidation tools to maximize capacity utilization and reduce costs.',
  'Digital Transformation': 'Prioritize API-first TMS and logistics platforms that integrate with existing systems.',
};

// ─── Core: Group vendors by problem + technology ────────────────────────────────

type VendorCluster = {
  problem_area: string;
  problem_description: string;
  vendors: Array<{ name: string; conference_id: string; conference_name: string }>;
  technologies: Set<string>;
  conferences: Set<string>;
  conference_names: Set<string>;
  signal_count: number;
};

async function loadVendorData(): Promise<{
  links: Array<{
    conference_id: string;
    conference_name: string;
    company_name: string;
    technologies: string[];
    signal_types: string[];
    match_confidence: number;
  }>;
  intel: Array<{
    conference_id: string;
    conference_name: string;
    company_name: string | null;
    signal_type: string | null;
    technology_cluster: string | null;
    title: string | null;
    importance_score: number;
  }>;
}> {
  if (!isSupabaseConfigured()) return { links: [], intel: [] };
  const db = getDb();

  const [linksRes, intelRes] = await Promise.allSettled([
    db.from('conference_vendor_links')
      .select('conference_id, company_name, technologies, signal_types, match_confidence')
      .order('match_confidence', { ascending: false })
      .limit(500),
    db.from('conference_intel')
      .select('conference_id, conference_name, company_name, signal_type, technology_cluster, title, importance_score')
      .order('importance_score', { ascending: false })
      .limit(1000),
  ]);

  const links = linksRes.status === 'fulfilled' ? (linksRes.value.data ?? []) : [];
  const intel = intelRes.status === 'fulfilled' ? (intelRes.value.data ?? []) : [];

  // Enrich links with conference_name from intel
  const confNames: Record<string, string> = {};
  for (const row of intel) {
    if (row.conference_id && row.conference_name) {
      confNames[row.conference_id as string] = row.conference_name as string;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {
    links: links.map((l: Record<string, unknown>) => ({
      conference_id: l.conference_id as string,
      conference_name: confNames[l.conference_id as string] ?? l.conference_id as string,
      company_name: l.company_name as string,
      technologies: (l.technologies as string[]) ?? [],
      signal_types: (l.signal_types as string[]) ?? [],
      match_confidence: (l.match_confidence as number) ?? 0.5,
    })),
    intel: intel.map((i: Record<string, unknown>) => ({
      conference_id: i.conference_id as string,
      conference_name: i.conference_name as string,
      company_name: (i.company_name as string | null),
      signal_type: (i.signal_type as string | null),
      technology_cluster: (i.technology_cluster as string | null),
      title: (i.title as string | null),
      importance_score: (i.importance_score as number) ?? 0.5,
    })),
  };
}

function buildVendorClusters(
  links: Awaited<ReturnType<typeof loadVendorData>>['links'],
  intel: Awaited<ReturnType<typeof loadVendorData>>['intel'],
): VendorCluster[] {
  const clusters = new Map<string, VendorCluster>();

  // Initialize clusters for each problem area
  for (const pa of PROBLEM_AREAS) {
    clusters.set(pa.area, {
      problem_area: pa.area,
      problem_description: pa.description,
      vendors: [],
      technologies: new Set(),
      conferences: new Set(),
      conference_names: new Set(),
      signal_count: 0,
    });
  }

  // Match vendor links to problem areas by their technology + company context
  for (const link of links) {
    const context = `${link.company_name} ${link.technologies.join(' ')} ${link.signal_types.join(' ')}`;
    for (const pa of PROBLEM_AREAS) {
      if (pa.keywords.test(context)) {
        const cluster = clusters.get(pa.area)!;
        cluster.vendors.push({
          name: link.company_name,
          conference_id: link.conference_id,
          conference_name: link.conference_name,
        });
        for (const t of link.technologies) cluster.technologies.add(t);
        cluster.conferences.add(link.conference_id);
        cluster.conference_names.add(link.conference_name);
      }
    }
  }

  // Match intel signals to problem areas
  for (const signal of intel) {
    const context = `${signal.company_name ?? ''} ${signal.technology_cluster ?? ''} ${signal.title ?? ''} ${signal.signal_type ?? ''}`;
    for (const pa of PROBLEM_AREAS) {
      if (pa.keywords.test(context)) {
        const cluster = clusters.get(pa.area)!;
        cluster.signal_count++;
        if (signal.company_name) {
          // Don't duplicate vendors already added from links
          const exists = cluster.vendors.some(
            (v) => v.name.toLowerCase() === signal.company_name!.toLowerCase(),
          );
          if (!exists) {
            cluster.vendors.push({
              name: signal.company_name,
              conference_id: signal.conference_id,
              conference_name: signal.conference_name,
            });
          }
        }
        if (signal.technology_cluster) cluster.technologies.add(signal.technology_cluster);
        cluster.conferences.add(signal.conference_id);
        cluster.conference_names.add(signal.conference_name);
      }
    }
  }

  // Also match by technology cluster name directly
  for (const link of links) {
    for (const tech of link.technologies) {
      const techLower = tech.toLowerCase();
      for (const pa of PROBLEM_AREAS) {
        if (pa.keywords.test(techLower)) {
          const cluster = clusters.get(pa.area)!;
          cluster.technologies.add(tech);
        }
      }
    }
  }

  // Filter to clusters with actual data
  return Array.from(clusters.values()).filter(
    (c) => c.vendors.length > 0 || c.signal_count > 0,
  );
}

// ─── Generate per-conference insights ───────────────────────────────────────────

function generateConferenceInsights(
  clusters: VendorCluster[],
): ConferenceInsightInsert[] {
  const insights: ConferenceInsightInsert[] = [];

  // Group by conference
  const byConference = new Map<string, {
    conference_name: string;
    problems: Array<{ area: string; vendors: string[]; techs: string[]; signals: number }>;
  }>();

  for (const cluster of clusters) {
    for (const confId of cluster.conferences) {
      if (!byConference.has(confId)) {
        const confName = cluster.conference_names.values().next().value ?? confId;
        byConference.set(confId, { conference_name: confName, problems: [] });
      }
      const confVendors = cluster.vendors
        .filter((v) => v.conference_id === confId)
        .map((v) => v.name);
      if (confVendors.length > 0 || cluster.signal_count > 0) {
        byConference.get(confId)!.problems.push({
          area: cluster.problem_area,
          vendors: [...new Set(confVendors)],
          techs: Array.from(cluster.technologies),
          signals: cluster.signal_count,
        });
      }
    }
  }

  for (const [confId, conf] of byConference) {
    // Top problem for this conference (most vendors)
    const sorted = conf.problems.sort((a, b) => b.vendors.length - a.vendors.length);
    for (const problem of sorted.slice(0, 3)) {
      if (problem.vendors.length === 0) continue;
      const techList = problem.techs.slice(0, 5).join(', ') || 'multiple areas';
      const vendorList = problem.vendors.slice(0, 5);
      const confidence = Math.min(0.95, 0.5 + problem.vendors.length * 0.08 + problem.signals * 0.02);

      insights.push({
        conference_id: confId,
        conference_name: conf.conference_name,
        insight_type: 'trend',
        insight: `${problem.area} solutions are concentrating at this conference. ${vendorList.length} vendor${vendorList.length > 1 ? 's' : ''} working on ${techList}.`,
        why_it_matters: PROBLEM_AREAS.find((p) => p.area === problem.area)?.description ?? `${problem.area} is an active area of innovation in logistics technology.`,
        recommendation: RECOMMENDATION_TEMPLATES[problem.area] ?? `Evaluate ${techList} vendors addressing ${problem.area.toLowerCase()}.`,
        supporting_vendors: vendorList,
        technologies: problem.techs.slice(0, 8),
        problem_area: problem.area,
        confidence,
        vendor_count: problem.vendors.length,
      });
    }
  }

  return insights;
}

// ─── Generate cross-conference market insights ──────────────────────────────────

function generateMarketInsights(clusters: VendorCluster[]): MarketInsightInsert[] {
  const insights: MarketInsightInsert[] = [];

  // Sort by vendor+signal concentration
  const ranked = [...clusters].sort(
    (a, b) => (b.vendors.length + b.signal_count) - (a.vendors.length + a.signal_count),
  );

  for (const cluster of ranked.slice(0, 8)) {
    if (cluster.vendors.length === 0) continue;

    const uniqueVendors = [...new Set(cluster.vendors.map((v) => v.name))];
    const techList = Array.from(cluster.technologies).slice(0, 6);
    const confList = Array.from(cluster.conference_names).slice(0, 5);
    const confidence = Math.min(0.95, 0.5 + uniqueVendors.length * 0.05 + cluster.conferences.size * 0.05);

    const isGrowing = cluster.conferences.size >= 2;
    const velocityNote = isGrowing
      ? ` Appearing across ${cluster.conferences.size} conferences — signals a growing market segment.`
      : '';

    insights.push({
      insight_type: 'market_trend',
      insight: `${cluster.problem_area}: ${uniqueVendors.length} vendor${uniqueVendors.length > 1 ? 's' : ''} active across ${cluster.conferences.size} conference${cluster.conferences.size > 1 ? 's' : ''}.${velocityNote}`,
      why_it_matters: cluster.problem_description,
      recommendation: RECOMMENDATION_TEMPLATES[cluster.problem_area] ?? `Review the ${uniqueVendors.length} vendors offering ${cluster.problem_area.toLowerCase()} solutions.`,
      supporting_vendors: uniqueVendors.slice(0, 10),
      technologies: techList,
      problem_area: cluster.problem_area,
      source_conferences: confList,
      confidence,
      vendor_count: uniqueVendors.length,
    });
  }

  return insights;
}

// ─── Optional: LLM-enhanced insight for top clusters ────────────────────────────

async function enhanceTopInsightWithLlm(
  cluster: VendorCluster,
): Promise<{ insight: string; why_it_matters: string; recommendation: string } | null> {
  const uniqueVendors = [...new Set(cluster.vendors.map((v) => v.name))].slice(0, 8);
  const techs = Array.from(cluster.technologies).slice(0, 6);
  const confs = Array.from(cluster.conference_names).slice(0, 4);

  const prompt = `You are a logistics technology analyst for NXT//LINK, an intelligence platform for trucking and supply chain.

Given this data cluster, generate a brief actionable insight:

Problem Area: ${cluster.problem_area}
Vendors (${uniqueVendors.length}): ${uniqueVendors.join(', ')}
Technologies: ${techs.join(', ')}
Seen at conferences: ${confs.join(', ')}
Signal count: ${cluster.signal_count}

Return JSON:
{
  "insight": "1-2 sentence summary of what's happening",
  "why_it_matters": "1-2 sentences on business impact for trucking/logistics companies",
  "recommendation": "1 specific, actionable recommendation"
}

Be concrete and specific. No generic advice. Focus on trucking, freight, and logistics.`;

  try {
    type InsightResult = { insight: string; why_it_matters: string; recommendation: string };
    const { result } = await runParallelJsonEnsemble<InsightResult>({
      systemPrompt: 'You are a logistics technology analyst. Return valid JSON only. Be specific and actionable.',
      userPrompt: prompt,
      budget: { maxProviders: 1, preferLowCostProviders: true },
      parse: (content) => {
        const cleaned = content.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned) as InsightResult;
      },
    });
    if (result?.insight && result?.why_it_matters && result?.recommendation) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Main Agent ─────────────────────────────────────────────────────────────────

export async function runInsightGenerator(): Promise<InsightGeneratorReport> {
  const start = Date.now();

  // 1. Load all conference-vendor data
  const { links, intel } = await loadVendorData();
  if (links.length === 0 && intel.length === 0) {
    return {
      conference_insights_generated: 0,
      market_insights_generated: 0,
      conferences_analyzed: 0,
      vendor_clusters_found: 0,
      duration_ms: Date.now() - start,
    };
  }

  // 2. Group vendors by problem area
  const clusters = buildVendorClusters(links, intel);

  // 3. Generate per-conference insights (algorithmic)
  const confInsights = generateConferenceInsights(clusters);

  // 4. Generate cross-conference market insights (algorithmic)
  const marketInsights = generateMarketInsights(clusters);

  // 5. LLM-enhance the top 3 market insights if we have budget
  const topClusters = clusters
    .filter((c) => c.vendors.length >= 2)
    .sort((a, b) => (b.vendors.length + b.signal_count) - (a.vendors.length + a.signal_count))
    .slice(0, 3);

  for (const cluster of topClusters) {
    const enhanced = await enhanceTopInsightWithLlm(cluster).catch(() => null);
    if (enhanced) {
      const idx = marketInsights.findIndex((m) => m.problem_area === cluster.problem_area);
      if (idx >= 0) {
        marketInsights[idx].insight = enhanced.insight;
        marketInsights[idx].why_it_matters = enhanced.why_it_matters;
        marketInsights[idx].recommendation = enhanced.recommendation;
        marketInsights[idx].confidence = Math.min(0.95, (marketInsights[idx].confidence ?? 0.7) + 0.1);
      }
    }
  }

  // 6. Persist
  const confPersisted = await upsertConferenceInsights(confInsights).catch(() => 0);
  const marketPersisted = await upsertMarketInsights(marketInsights).catch(() => 0);

  const uniqueConferences = new Set([
    ...confInsights.map((i) => i.conference_id),
  ]);

  console.log(
    `[insight-generator] Generated: ${confPersisted} conference insights, ${marketPersisted} market insights from ${clusters.length} clusters`,
  );

  return {
    conference_insights_generated: confPersisted,
    market_insights_generated: marketPersisted,
    conferences_analyzed: uniqueConferences.size,
    vendor_clusters_found: clusters.length,
    duration_ms: Date.now() - start,
  };
}
