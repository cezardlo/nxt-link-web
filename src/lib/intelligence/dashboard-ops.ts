import { differenceInCalendarDays } from 'date-fns';

import { prisma } from '@/lib/prisma';
import {
  createOpsAction,
  listOpsActions,
  listOpsAlerts,
  listOpsScanRuns,
  listOpsViews,
  listOpsWorkspaces,
  type OpsAction,
  type SourceType,
} from '@/lib/intelligence/ops-store';
import {
  isBlockedSourceDomain,
  isLowTrustDomain,
  sourceDomainCredibility,
  type SourceTrustType,
} from '@/lib/intelligence/source-quality';

type DashboardRole = 'operator' | 'analyst' | 'executive';
type ScanProduct = {
  company_name: string;
  company_url: string;
  source_title: string;
  source_type: SourceType;
  source_snippet: string;
  product_summary: string;
  problems_solved: string[];
  countries: string[];
  confidence: number;
};
type ScanResultPayload = {
  products: ScanProduct[];
};

export type DashboardKpiCard = {
  id: string;
  label: string;
  value: string;
  confidence: number;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  drilldown_url: string;
  provenance: Array<{ title: string; url: string; source_type: SourceType; snippet: string }>;
};

function riskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (score >= 0.67) return 'HIGH';
  if (score >= 0.38) return 'MEDIUM';
  return 'LOW';
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function roleWeight(role: DashboardRole): number {
  if (role === 'operator') return 1;
  if (role === 'analyst') return 1.15;
  return 1.32;
}

export async function ensureOpsDashboardSeedData() {
  const existingActions = await listOpsActions(2);
  if (existingActions.length > 0) return;

  await createOpsAction({
    title: 'Validate top whitepaper source credibility',
    owner: 'Analyst Team',
    status: 'in_review',
    notes: 'Review top 5 whitepaper citations from latest scan.',
  });

  await createOpsAction({
    title: 'Resolve low-quality crawl sources',
    owner: 'Crawler Ops',
    status: 'todo',
    notes: 'Retry sources flagged with requires_js_render_pass.',
  });
}

export async function buildOpsDashboard(input: {
  role: DashboardRole;
  region?: string;
  source_type?: SourceType | 'all';
}) {
  await ensureOpsDashboardSeedData();

  const [scanRuns, alerts, actions, views, workspaces, pilots, challenges] = await Promise.all([
    listOpsScanRuns(40),
    listOpsAlerts(25),
    listOpsActions(30),
    listOpsViews(12, input.role),
    listOpsWorkspaces(12),
    prisma.pilot.findMany({
      include: { challenge: true, match: { include: { vendor: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 80,
    }),
    prisma.challenge.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 80,
    }),
  ]);

  const products = scanRuns.flatMap((run) => {
    const result = parseJson<ScanResultPayload | null>(run.result_json, null);
    if (!result || !Array.isArray(result.products)) return [];
    return result.products.map((item) => ({
      ...item,
      scanned_at: run.created_at,
      run_id: run.id,
    }));
  });

  const filteredProducts = products.filter((product) => {
    const sourceType = (product.source_type || 'other') as SourceType;
    const matchesSource = !input.source_type || input.source_type === 'all' || sourceType === input.source_type;
    const matchesRegion = !input.region || input.region === 'All Regions' || (Array.isArray(product.countries) && product.countries.some((country: string) => country.toLowerCase().includes(input.region!.toLowerCase())));
    return matchesSource && matchesRegion;
  });

  const activePilots = pilots.filter((pilot) => pilot.status === 'ACTIVE');
  const stalePilots = activePilots.filter((pilot) => differenceInCalendarDays(new Date(), pilot.updatedAt) > 7);
  const openAlerts = alerts.filter((alert) => alert.status === 'open');

  const avgConfidence = filteredProducts.length
    ? Number((filteredProducts.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / filteredProducts.length).toFixed(2))
    : 0.2;
  const weightedConfidence = Number(Math.min(0.99, avgConfidence * roleWeight(input.role)).toFixed(2));

  const highRiskAlerts = openAlerts.filter((alert) => alert.risk_score >= 0.67).length;
  const workflowOpen = actions.filter((action) => action.status !== 'completed').length;
  const solvedSignals = filteredProducts.filter((item) => Array.isArray(item.problems_solved) && item.problems_solved.length > 0).length;

  const topEvidence = filteredProducts
    .map((item) => {
      const source_type = (item.source_type || 'other') as SourceType;
      const trust = sourceDomainCredibility(item.company_url, source_type as SourceTrustType);
      return {
        title: item.source_title || item.company_name,
        url: item.company_url || '',
        source_type,
        snippet: (item.source_snippet || item.product_summary || '').slice(0, 200),
        trust,
        confidence: Number(item.confidence || 0),
      };
    })
    .filter((item) => !isLowTrustDomain(item.url) && !isBlockedSourceDomain(item.url))
    .sort((a, b) => b.confidence + b.trust - (a.confidence + a.trust))
    .slice(0, 10)
    .map(({ title, url, source_type, snippet }) => ({
      title,
      url,
      source_type,
      snippet,
    }));

  const kpis: DashboardKpiCard[] = [
    {
      id: 'signal_coverage',
      label: 'Signal Coverage',
      value: `${filteredProducts.length}`,
      confidence: weightedConfidence,
      risk_score: Number((1 - weightedConfidence).toFixed(2)),
      risk_level: riskLevel(1 - weightedConfidence),
      drilldown_url: '/admin/intelligence',
      provenance: topEvidence.slice(0, 3),
    },
    {
      id: 'problem_solution_hits',
      label: 'Problem-Solution Hits',
      value: `${solvedSignals}`,
      confidence: Number((0.5 + Math.min(0.45, solvedSignals / 25)).toFixed(2)),
      risk_score: Number((Math.max(0.08, 1 - (0.5 + Math.min(0.45, solvedSignals / 25)))).toFixed(2)),
      risk_level: riskLevel(Math.max(0.08, 1 - (0.5 + Math.min(0.45, solvedSignals / 25)))),
      drilldown_url: '/admin/intelligence',
      provenance: topEvidence.slice(3, 6),
    },
    {
      id: 'alert_pressure',
      label: 'Open Alert Pressure',
      value: `${openAlerts.length}`,
      confidence: Number((0.82 - Math.min(0.5, openAlerts.length * 0.04)).toFixed(2)),
      risk_score: Number(Math.min(0.98, 0.25 + highRiskAlerts * 0.2 + stalePilots.length * 0.05).toFixed(2)),
      risk_level: riskLevel(Math.min(0.98, 0.25 + highRiskAlerts * 0.2 + stalePilots.length * 0.05)),
      drilldown_url: '/admin',
      provenance: topEvidence.slice(6, 9),
    },
    {
      id: 'workflow_throughput',
      label: 'Workflow Throughput',
      value: `${Math.max(0, actions.length - workflowOpen)}/${actions.length || 1}`,
      confidence: Number((0.45 + Math.min(0.5, (actions.length - workflowOpen) / Math.max(1, actions.length))).toFixed(2)),
      risk_score: Number((Math.min(0.95, workflowOpen / Math.max(1, actions.length))).toFixed(2)),
      risk_level: riskLevel(Math.min(0.95, workflowOpen / Math.max(1, actions.length))),
      drilldown_url: '/admin',
      provenance: topEvidence.slice(0, 2),
    },
  ];

  const countryMap = new Map<string, number>();
  const sourceMap = new Map<string, number>();
  for (const product of filteredProducts) {
    const countries = Array.isArray(product.countries) ? product.countries : [];
    for (const country of countries) {
      countryMap.set(country, (countryMap.get(country) || 0) + 1);
    }
    const sourceType = (product.source_type || 'other') as SourceType;
    sourceMap.set(sourceType, (sourceMap.get(sourceType) || 0) + 1);
  }

  const region_breakdown = Array.from(countryMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const source_breakdown = Array.from(sourceMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const timeline = [
    ...scanRuns.slice(0, 8).map((run) => ({
      id: `scan-${run.id}`,
      timestamp: run.created_at,
      type: 'scan',
      title: `Scan run: ${run.industry} (${run.region})`,
      detail: `Confidence ${Math.round(run.avg_confidence * 100)}%, risk ${Math.round(run.risk_score * 100)}%.`,
    })),
    ...alerts.slice(0, 8).map((alert) => ({
      id: `alert-${alert.id}`,
      timestamp: alert.updated_at,
      type: 'alert',
      title: `${alert.severity.toUpperCase()} alert: ${alert.title}`,
      detail: alert.description,
    })),
    ...actions.slice(0, 8).map((action) => ({
      id: `action-${action.id}`,
      timestamp: action.updated_at,
      type: 'action',
      title: `Action ${action.status}: ${action.title}`,
      detail: `${action.owner}${action.notes ? ` | ${action.notes}` : ''}`,
    })),
  ]
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
    .slice(0, 18);

  const graphProducts = filteredProducts.slice(0, 18);
  const graphNodes = graphProducts.map((product, index) => ({
    id: `${product.run_id}-${index}`,
    label: product.company_name,
    type: product.source_type || 'company',
    score: Number(product.confidence || 0.5),
  }));
  const graphEdges = graphProducts.flatMap((product, index) => {
    const countries = Array.isArray(product.countries) ? product.countries.slice(0, 2) : [];
    return countries.map((country, countryIndex) => ({
      id: `${product.run_id}-${index}-${countryIndex}`,
      source: `${product.run_id}-${index}`,
      target: `country-${country}`,
      weight: 1 + Number(product.confidence || 0.4),
    }));
  });

  const countryNodeIds = Array.from(new Set(graphEdges.map((edge) => edge.target.replace(/^country-/, ''))));
  const countryNodes = countryNodeIds.map((country) => ({
    id: `country-${country}`,
    label: country,
    type: 'region',
    score: 0.7,
  }));
  const graphNodeSet = new Set([...graphNodes, ...countryNodes].map((node) => node.id));
  const connectedEdges = graphEdges.filter((edge) => graphNodeSet.has(edge.source) && graphNodeSet.has(edge.target));

  const challengeHighlights = challenges
    .filter((challenge) => challenge.status === 'REVIEWING' || challenge.status === 'TESTING')
    .slice(0, 8)
    .map((challenge) => ({
      id: challenge.id,
      title: challenge.title,
      city: challenge.city,
      status: challenge.status,
      priority: challenge.priority,
      updated_at: challenge.updatedAt.toISOString(),
    }));

  return {
    generated_at: new Date().toISOString(),
    role: input.role,
    filters: {
      region: input.region || 'All Regions',
      source_type: input.source_type || 'all',
    },
    kpis,
    alerts,
    timeline,
    actions,
    saved_views: views,
    workspaces,
    region_breakdown,
    source_breakdown,
    investigation_graph: {
      nodes: [...graphNodes, ...countryNodes],
      edges: connectedEdges,
    },
    challenge_highlights: challengeHighlights,
  };
}

export function sanitizeRole(value: string | null): DashboardRole {
  if (value === 'operator' || value === 'analyst' || value === 'executive') return value;
  return 'operator';
}

export function sanitizeSourceType(value: string | null): SourceType | 'all' {
  if (value === 'whitepaper' || value === 'case_study' || value === 'company' || value === 'funding' || value === 'news' || value === 'other') {
    return value;
  }
  return 'all';
}

export function sanitizeActionStatus(value: string | null): OpsAction['status'] {
  if (value === 'todo' || value === 'in_review' || value === 'approved' || value === 'completed') {
    return value;
  }
  return 'todo';
}
