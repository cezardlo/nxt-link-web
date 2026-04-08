import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ── Types ────────────────────────────────────────────────────────────────────

export type ConnectionNodeType =
  | 'signal'
  | 'company'
  | 'technology'
  | 'industry'
  | 'geography';

export type ConnectionEdgeType =
  | 'causal'
  | 'temporal'
  | 'entity'
  | 'geographic'
  | 'thematic'
  | 'cluster';

export type Severity = 'P0' | 'P1' | 'P2' | 'P3';

export interface ConnectionNode {
  id: string;
  label: string;
  type: ConnectionNodeType;
  severity?: Severity;          // only for signal nodes
  date?: string;                // ISO date for signals
  summary?: string;             // short description
  source?: string;              // e.g. "SAM.gov", "SEC Filing"
  confidence?: number;          // 0-1 connection confidence
}

export interface ConnectionEdge {
  id: string;
  source: string;
  target: string;
  type: ConnectionEdgeType;
  label?: string;               // e.g. "won by", "30 days prior"
  weight?: number;              // 0-1, thicker = stronger
}

export interface ConnectionGraphResponse {
  signalId: string;
  nodes: ConnectionNode[];
  edges: ConnectionEdge[];
  meta: {
    depth: number;
    totalNodes: number;
    totalEdges: number;
    generatedAt: string;
  };
}

// ── Mock Data ────────────────────────────────────────────────────────────────

function getMockConnections(signalId: string, depth: number): ConnectionGraphResponse {
  const nodes: ConnectionNode[] = [
    // ── The anchor signal (P0)
    {
      id: signalId,
      label: 'Army IDIQ $480M C5ISR Contract Award',
      type: 'signal',
      severity: 'P0',
      date: '2026-03-21',
      summary: 'U.S. Army awards $480M IDIQ contract for C5ISR modernization to Palantir Technologies.',
      source: 'SAM.gov',
      confidence: 1.0,
    },
    // ── Entity: winning company
    {
      id: 'company-palantir',
      label: 'Palantir Technologies',
      type: 'company',
      summary: 'Defense AI & data analytics. NYSE: PLTR. HQ: Denver, CO.',
      confidence: 0.98,
    },
    // ── Temporal: prior RFP
    {
      id: 'signal-rfp-c5isr',
      label: 'Army C5ISR RFP Published',
      type: 'signal',
      severity: 'P2',
      date: '2026-02-19',
      summary: 'Initial RFP posted for C5ISR modernization program, 30-day response window.',
      source: 'SAM.gov',
      confidence: 0.95,
    },
    // ── Thematic: similar defense contract
    {
      id: 'signal-titan-ground',
      label: 'TITAN Ground Station LRIP Award',
      type: 'signal',
      severity: 'P1',
      date: '2026-03-10',
      summary: 'Palantir wins TITAN ground station low-rate initial production contract worth $178M.',
      source: 'Defense News',
      confidence: 0.82,
    },
    // ── Geographic: Fort Bliss signal
    {
      id: 'signal-bliss-expansion',
      label: 'Fort Bliss Network Modernization RFI',
      type: 'signal',
      severity: 'P2',
      date: '2026-03-15',
      summary: 'Fort Bliss issues RFI for tactical network modernization across 1.12M acres.',
      source: 'SAM.gov',
      confidence: 0.75,
    },
    // ── Geography node
    {
      id: 'geo-fort-bliss',
      label: 'Fort Bliss, TX',
      type: 'geography',
      summary: 'U.S. Army installation, El Paso TX. Largest CONUS military complex.',
      confidence: 0.9,
    },
    // ── Technology node
    {
      id: 'tech-c5isr',
      label: 'C5ISR Systems',
      type: 'technology',
      summary: 'Command, Control, Computers, Communications, Cyber, Intelligence, Surveillance, Reconnaissance.',
      confidence: 0.92,
    },
    // ── Industry node
    {
      id: 'industry-defense',
      label: 'Defense & Aerospace',
      type: 'industry',
      summary: 'U.S. defense sector, $886B FY2024 budget.',
      confidence: 0.88,
    },
    // ── Causal: competitor lost
    {
      id: 'signal-raytheon-protest',
      label: 'Raytheon Files GAO Protest on C5ISR',
      type: 'signal',
      severity: 'P1',
      date: '2026-03-22',
      summary: 'Raytheon files bid protest at GAO challenging Palantir C5ISR award decision.',
      source: 'Bloomberg Gov',
      confidence: 0.70,
    },
    // ── Entity: competitor company
    {
      id: 'company-raytheon',
      label: 'RTX Corporation',
      type: 'company',
      summary: 'Defense prime contractor. NYSE: RTX. HQ: Arlington, VA.',
      confidence: 0.85,
    },
  ];

  const edges: ConnectionEdge[] = [
    // Entity edges: signal ↔ companies
    {
      id: 'e-palantir-award',
      source: signalId,
      target: 'company-palantir',
      type: 'entity',
      label: 'awarded to',
      weight: 0.95,
    },
    {
      id: 'e-raytheon-protest',
      source: 'signal-raytheon-protest',
      target: 'company-raytheon',
      type: 'entity',
      label: 'filed by',
      weight: 0.85,
    },
    // Temporal: RFP → Award
    {
      id: 'e-rfp-to-award',
      source: 'signal-rfp-c5isr',
      target: signalId,
      type: 'temporal',
      label: '30 days prior',
      weight: 0.90,
    },
    // Causal: Award → Protest
    {
      id: 'e-award-to-protest',
      source: signalId,
      target: 'signal-raytheon-protest',
      type: 'causal',
      label: 'triggered',
      weight: 0.88,
    },
    // Thematic: similar defense contract
    {
      id: 'e-titan-thematic',
      source: signalId,
      target: 'signal-titan-ground',
      type: 'thematic',
      label: 'Palantir defense wins',
      weight: 0.78,
    },
    // Geographic: Fort Bliss connections
    {
      id: 'e-bliss-geo',
      source: 'signal-bliss-expansion',
      target: 'geo-fort-bliss',
      type: 'geographic',
      label: 'located at',
      weight: 0.82,
    },
    {
      id: 'e-award-geo',
      source: signalId,
      target: 'geo-fort-bliss',
      type: 'geographic',
      label: 'deployment site',
      weight: 0.65,
    },
    // Technology edges
    {
      id: 'e-award-tech',
      source: signalId,
      target: 'tech-c5isr',
      type: 'entity',
      label: 'technology area',
      weight: 0.92,
    },
    {
      id: 'e-rfp-tech',
      source: 'signal-rfp-c5isr',
      target: 'tech-c5isr',
      type: 'entity',
      label: 'technology area',
      weight: 0.90,
    },
    // Industry edges
    {
      id: 'e-palantir-industry',
      source: 'company-palantir',
      target: 'industry-defense',
      type: 'cluster',
      label: 'sector',
      weight: 0.80,
    },
    {
      id: 'e-raytheon-industry',
      source: 'company-raytheon',
      target: 'industry-defense',
      type: 'cluster',
      label: 'sector',
      weight: 0.80,
    },
    // Titan → Palantir entity
    {
      id: 'e-titan-palantir',
      source: 'signal-titan-ground',
      target: 'company-palantir',
      type: 'entity',
      label: 'awarded to',
      weight: 0.88,
    },
    // Bliss → tech thematic
    {
      id: 'e-bliss-thematic',
      source: 'signal-bliss-expansion',
      target: signalId,
      type: 'thematic',
      label: 'related modernization',
      weight: 0.60,
    },
  ];

  // Depth 1: only direct connections from the anchor signal
  if (depth <= 1) {
    const directEdges = edges.filter(
      (e) => e.source === signalId || e.target === signalId,
    );
    const connectedIds = new Set<string>([signalId]);
    for (const e of directEdges) {
      connectedIds.add(e.source);
      connectedIds.add(e.target);
    }
    const directNodes = nodes.filter((n) => connectedIds.has(n.id));
    return {
      signalId,
      nodes: directNodes,
      edges: directEdges,
      meta: {
        depth,
        totalNodes: directNodes.length,
        totalEdges: directEdges.length,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // Depth 2+: return the full graph
  return {
    signalId,
    nodes,
    edges,
    meta: {
      depth,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      generatedAt: new Date().toISOString(),
    },
  };
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const depth = Math.min(
    Math.max(parseInt(request.nextUrl.searchParams.get('depth') ?? '1', 10), 1),
    3,
  );

  const data = getMockConnections(params.id, depth);
  return NextResponse.json(data);
}
