'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import type { Core, NodeSingular, ElementDefinition } from 'cytoscape';
import cytoscape from 'cytoscape';
import useSWR from 'swr';
import { COLORS } from '@/lib/tokens';
import type {
  ConnectionNode,
  ConnectionGraphResponse,
  ConnectionNodeType,
  ConnectionEdgeType,
  Severity,
} from '@/app/api/signals/[id]/connections/route';

// ── Props ────────────────────────────────────────────────────────────────────

interface ConnectionGraphProps {
  signalId: string;
  depth?: number; // 1 = direct, 2 = 2-hop
}

// ── Node color map by type + severity ────────────────────────────────────────

const SEVERITY_COLORS: Record<Severity, string> = {
  P0: COLORS.red,     // #ff3b30
  P1: COLORS.orange,  // #ff6600
  P2: COLORS.gold,    // #ffd700
  P3: COLORS.cyan,    // #00d4ff
};

const NODE_TYPE_COLORS: Record<ConnectionNodeType, string> = {
  signal:     COLORS.red,
  company:    COLORS.cyan,
  technology: COLORS.gold,
  industry:   '#a855f7',
  geography:  COLORS.green,
};

const NODE_TYPE_LABELS: Record<ConnectionNodeType, string> = {
  signal:     'SIGNAL',
  company:    'COMPANY',
  technology: 'TECHNOLOGY',
  industry:   'INDUSTRY',
  geography:  'GEOGRAPHY',
};

// ── Edge style map ───────────────────────────────────────────────────────────

const EDGE_STYLES: Record<ConnectionEdgeType, {
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
  label: string;
}> = {
  causal:     { color: COLORS.red,    style: 'solid',  label: 'CAUSAL' },
  temporal:   { color: COLORS.muted,  style: 'dashed', label: 'TEMPORAL' },
  entity:     { color: COLORS.orange, style: 'solid',  label: 'ENTITY' },
  geographic: { color: COLORS.green,  style: 'dotted', label: 'GEOGRAPHIC' },
  thematic:   { color: COLORS.cyan,   style: 'solid',  label: 'THEMATIC' },
  cluster:    { color: '#a855f7',     style: 'dashed', label: 'CLUSTER' },
};

// ── Node sizing ──────────────────────────────────────────────────────────────

function getNodeSize(node: ConnectionNode, anchorId: string): number {
  if (node.id === anchorId) return 60; // anchor signal always largest
  if (node.type === 'signal') {
    switch (node.severity) {
      case 'P0': return 60;
      case 'P1': return 45;
      case 'P2': return 30;
      case 'P3': return 25;
      default:   return 30;
    }
  }
  return 25; // entity nodes
}

function getNodeColor(node: ConnectionNode): string {
  if (node.type === 'signal' && node.severity) {
    return SEVERITY_COLORS[node.severity];
  }
  return NODE_TYPE_COLORS[node.type];
}

// ── Hex → rgba ───────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Cytoscape stylesheet ────────────────────────────────────────────────────

const STYLESHEET: cytoscape.StylesheetJsonBlock[] = [
  // Base node style
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      'border-width': 1.5,
      'border-color': 'data(borderColor)',
      'border-opacity': 0.8,
      'label': 'data(label)',
      'font-family': '"IBM Plex Mono", monospace',
      'font-size': 7,
      'color': '#ffffff',
      'text-opacity': 0.6,
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 5,
      'text-wrap': 'wrap',
      'text-max-width': '90px',
      'width': 'data(size)',
      'height': 'data(size)',
      'transition-property': 'border-width, border-opacity, opacity',
      'transition-duration': 150,
    },
  },
  // Anchor signal node
  {
    selector: 'node[nodeType="anchor"]',
    style: {
      'border-width': 3,
      'font-size': 9,
      'font-weight': 'bold' as cytoscape.Css.FontWeight,
      'text-opacity': 1,
      'color': '#ffffff',
      'z-index': 10,
    },
  },
  // Severity badge labels on signal nodes
  {
    selector: 'node[nodeType="signal"]',
    style: {
      'font-size': 7,
    },
  },
  // Selected node
  {
    selector: 'node:selected',
    style: {
      'border-width': 3,
      'border-opacity': 1,
    },
  },
  // Hovered node
  {
    selector: 'node.hover',
    style: {
      'border-width': 3,
      'border-opacity': 1,
      'z-index': 20,
    },
  },
  // Dimmed (non-connected) nodes during hover
  {
    selector: 'node.dimmed',
    style: {
      'opacity': 0.15,
    },
  },
  // Base edge style
  {
    selector: 'edge',
    style: {
      'width': 'data(weight)',
      'line-color': 'data(edgeColor)',
      'line-style': 'solid',
      'curve-style': 'bezier',
      'opacity': 0.5,
      'target-arrow-shape': 'triangle',
      'target-arrow-color': 'data(edgeColor)',
      'arrow-scale': 0.6,
      'transition-property': 'opacity, width',
      'transition-duration': 150,
    },
  },
  // Dashed edges (temporal, cluster)
  {
    selector: 'edge[lineStyle="dashed"]',
    style: {
      'line-style': 'dashed',
      'line-dash-pattern': [6, 3],
    },
  },
  // Dotted edges (geographic)
  {
    selector: 'edge[lineStyle="dotted"]',
    style: {
      'line-style': 'dotted',
      'line-dash-pattern': [2, 4],
    },
  },
  // Highlighted edges during hover
  {
    selector: 'edge.highlight',
    style: {
      'opacity': 1,
      'width': 2.5,
      'z-index': 20,
    },
  },
  // Dimmed edges during hover
  {
    selector: 'edge.dimmed',
    style: {
      'opacity': 0.06,
    },
  },
];

// ── Cose layout ──────────────────────────────────────────────────────────────

const LAYOUT = {
  name: 'cose' as const,
  animate: true,
  animationDuration: 700,
  randomize: false,
  nodeRepulsion: () => 8000,
  idealEdgeLength: () => 100,
  edgeElasticity: () => 100,
  gravity: 0.2,
  numIter: 1200,
  fit: true,
  padding: 40,
};

// ── Fetcher ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ── Selected node detail type ────────────────────────────────────────────────

interface SelectedDetail {
  id: string;
  label: string;
  type: ConnectionNodeType;
  severity?: Severity;
  summary?: string;
  date?: string;
  source?: string;
  confidence?: number;
  color: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ConnectionGraph({ signalId, depth = 2 }: ConnectionGraphProps) {
  const cyRef = useRef<Core | null>(null);
  const [selected, setSelected] = useState<SelectedDetail | null>(null);

  const { data, isLoading, error } = useSWR<ConnectionGraphResponse>(
    `/api/signals/${signalId}/connections?depth=${depth}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  // ── Build Cytoscape elements ──
  const elements = useMemo<ElementDefinition[]>(() => {
    if (!data) return [];
    const els: ElementDefinition[] = [];

    for (const node of data.nodes) {
      const color = getNodeColor(node);
      const isAnchor = node.id === signalId;
      els.push({
        data: {
          id: node.id,
          label: node.label,
          color: hexToRgba(color, isAnchor ? 0.4 : 0.2),
          borderColor: color,
          size: getNodeSize(node, signalId),
          nodeType: isAnchor ? 'anchor' : node.type,
          entityType: node.type,
          severity: node.severity ?? '',
          summary: node.summary ?? '',
          date: node.date ?? '',
          source: node.source ?? '',
          confidence: node.confidence ?? 0,
        },
      });
    }

    for (const edge of data.edges) {
      const style = EDGE_STYLES[edge.type];
      els.push({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          edgeColor: style.color,
          lineStyle: style.style,
          edgeType: edge.type,
          edgeLabel: edge.label ?? '',
          weight: Math.max((edge.weight ?? 0.5) * 2, 0.5),
        },
      });
    }

    return els;
  }, [data, signalId]);

  // ── Wire Cytoscape ──
  const handleCy = useCallback(
    (cy: Core) => {
      cyRef.current = cy;

      // Hover: highlight node + connected edges
      cy.on('mouseover', 'node', (evt) => {
        const node = evt.target as NodeSingular;
        const connectedEdges = node.connectedEdges();
        const connectedNodes = connectedEdges.connectedNodes();

        cy.elements().addClass('dimmed');
        node.removeClass('dimmed').addClass('hover');
        connectedEdges.removeClass('dimmed').addClass('highlight');
        connectedNodes.removeClass('dimmed');
      });

      cy.on('mouseout', 'node', () => {
        cy.elements().removeClass('dimmed hover highlight');
      });

      // Click: show details
      cy.on('tap', 'node', (evt) => {
        const n = evt.target as NodeSingular;
        const d = n.data() as Record<string, unknown>;
        const color = getNodeColor({
          id: d.id as string,
          label: d.label as string,
          type: d.entityType as ConnectionNodeType,
          severity: (d.severity as Severity) || undefined,
        });
        setSelected({
          id: d.id as string,
          label: d.label as string,
          type: d.entityType as ConnectionNodeType,
          severity: (d.severity as Severity) || undefined,
          summary: d.summary as string,
          date: d.date as string,
          source: d.source as string,
          confidence: d.confidence as number,
          color,
        });
      });

      // Click background: deselect
      cy.on('tap', (evt) => {
        if (evt.target === cy) setSelected(null);
      });
    },
    [],
  );

  // ── Loading shimmer ──
  if (isLoading) {
    return (
      <div
        className="relative overflow-hidden rounded-sm border border-white/[0.08]"
        style={{ height: 480, background: COLORS.bg }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          {/* Shimmer bars */}
          {[200, 160, 120].map((w, i) => (
            <div
              key={i}
              className="rounded-full animate-pulse"
              style={{
                width: w,
                height: 4,
                background: `linear-gradient(90deg, ${COLORS.border} 0%, ${COLORS.dim} 50%, ${COLORS.border} 100%)`,
                animationDelay: `${i * 150}ms`,
              }}
            />
          ))}
          <span className="font-mono text-[9px] tracking-[0.25em] text-white/20 uppercase mt-2">
            Mapping connections...
          </span>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div
        className="relative overflow-hidden rounded-sm border border-white/[0.08] flex items-center justify-center"
        style={{ height: 480, background: COLORS.bg }}
      >
        <span className="font-mono text-[10px] text-white/30">
          Failed to load connection graph
        </span>
      </div>
    );
  }

  // ── Empty state ──
  if (!data || data.nodes.length <= 1) {
    return (
      <div
        className="relative overflow-hidden rounded-sm border border-white/[0.08] flex flex-col items-center justify-center"
        style={{ height: 480, background: COLORS.bg }}
      >
        <div
          className="w-8 h-[2px] rounded-full mb-4"
          style={{ backgroundColor: COLORS.cyan, opacity: 0.3 }}
        />
        <span className="font-mono text-[10px] tracking-[0.2em] text-white/25 uppercase">
          No connections detected
        </span>
        <span className="font-mono text-[8px] text-white/15 mt-2">
          Connections will appear as intelligence links are discovered
        </span>
      </div>
    );
  }

  // ── Legend items ──
  const nodeTypeLegend: Array<{ type: ConnectionNodeType; color: string }> = [
    { type: 'signal', color: COLORS.red },
    { type: 'company', color: COLORS.cyan },
    { type: 'technology', color: COLORS.gold },
    { type: 'industry', color: '#a855f7' },
    { type: 'geography', color: COLORS.green },
  ];

  const edgeTypeLegend: Array<{ type: ConnectionEdgeType; color: string; style: string }> = [
    { type: 'causal', color: COLORS.red, style: 'solid' },
    { type: 'temporal', color: COLORS.muted, style: 'dashed' },
    { type: 'entity', color: COLORS.orange, style: 'solid' },
    { type: 'geographic', color: COLORS.green, style: 'dotted' },
    { type: 'thematic', color: COLORS.cyan, style: 'solid' },
    { type: 'cluster', color: '#a855f7', style: 'dashed' },
  ];

  return (
    <div
      className="relative overflow-hidden rounded-sm border border-white/[0.08]"
      style={{ height: 480, background: COLORS.bg }}
    >
      {/* ── Node Legend — top left ── */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 bg-black/50 backdrop-blur-sm rounded-sm px-2.5 py-2 border border-white/[0.06]">
        <span className="font-mono text-[6px] tracking-[0.2em] text-white/25 uppercase mb-0.5">
          Nodes
        </span>
        {nodeTypeLegend.map((item) => (
          <div key={item.type} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                backgroundColor: hexToRgba(item.color, 0.3),
                border: `1px solid ${item.color}`,
                boxShadow: `0 0 4px ${item.color}66`,
              }}
            />
            <span className="font-mono text-[7px] tracking-[0.12em] text-white/40">
              {NODE_TYPE_LABELS[item.type]}
            </span>
          </div>
        ))}
      </div>

      {/* ── Edge Legend — top left, below nodes ── */}
      <div className="absolute top-[130px] left-3 z-10 flex flex-col gap-1.5 bg-black/50 backdrop-blur-sm rounded-sm px-2.5 py-2 border border-white/[0.06]">
        <span className="font-mono text-[6px] tracking-[0.2em] text-white/25 uppercase mb-0.5">
          Edges
        </span>
        {edgeTypeLegend.map((item) => (
          <div key={item.type} className="flex items-center gap-1.5">
            <div className="w-4 flex-shrink-0 flex items-center">
              <div
                className="w-full h-0"
                style={{
                  borderTop: `1.5px ${item.style} ${item.color}`,
                }}
              />
            </div>
            <span className="font-mono text-[7px] tracking-[0.12em] text-white/40">
              {EDGE_STYLES[item.type].label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Controls — top right ── */}
      <div className="absolute top-3 right-3 z-10 flex gap-1.5">
        <button
          className="font-mono text-[7px] tracking-[0.2em] text-white/25 hover:text-[#00d4ff] px-2 py-1 border border-white/[0.08] hover:border-[#00d4ff]/30 rounded-sm transition-colors bg-black/60"
          onClick={() => cyRef.current?.fit(undefined, 40)}
        >
          FIT
        </button>
        <button
          className="font-mono text-[7px] tracking-[0.2em] text-white/25 hover:text-[#00d4ff] px-2 py-1 border border-white/[0.08] hover:border-[#00d4ff]/30 rounded-sm transition-colors bg-black/60"
          onClick={() => {
            if (cyRef.current) {
              cyRef.current.layout(LAYOUT).run();
            }
          }}
        >
          RESET
        </button>
      </div>

      {/* ── Meta info — top right below controls ── */}
      <div className="absolute top-10 right-3 z-10">
        <span className="font-mono text-[7px] text-white/15">
          {data.meta.totalNodes} nodes / {data.meta.totalEdges} edges / depth {data.meta.depth}
        </span>
      </div>

      {/* ── Cytoscape Graph ── */}
      <CytoscapeComponent
        elements={elements}
        layout={LAYOUT}
        stylesheet={STYLESHEET}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
        cy={handleCy}
        minZoom={0.2}
        maxZoom={4}
        userZoomingEnabled={true}
        userPanningEnabled={true}
        boxSelectionEnabled={false}
      />

      {/* ── Detail Side Panel — right side ── */}
      {selected && (
        <div
          className="absolute top-14 right-3 z-20 w-56 bg-black/90 border border-white/10 rounded-sm backdrop-blur-md overflow-hidden"
          style={{ boxShadow: `0 0 20px ${hexToRgba(selected.color, 0.1)}` }}
        >
          {/* Header bar */}
          <div
            className="h-[2px] w-full"
            style={{ background: selected.color }}
          />
          <div className="px-3 py-3">
            {/* Type + severity badge */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: hexToRgba(selected.color, 0.3),
                  border: `1px solid ${selected.color}`,
                  boxShadow: `0 0 6px ${selected.color}66`,
                }}
              />
              <span className="font-mono text-[7px] tracking-[0.15em] text-white/40 uppercase">
                {NODE_TYPE_LABELS[selected.type]}
              </span>
              {selected.severity && (
                <span
                  className="font-mono text-[7px] tracking-[0.1em] px-1.5 py-0.5 rounded-sm"
                  style={{
                    color: SEVERITY_COLORS[selected.severity],
                    backgroundColor: hexToRgba(SEVERITY_COLORS[selected.severity], 0.12),
                    border: `1px solid ${hexToRgba(SEVERITY_COLORS[selected.severity], 0.3)}`,
                  }}
                >
                  {selected.severity}
                </span>
              )}
            </div>

            {/* Label */}
            <h4 className="font-mono text-[10px] text-white/80 leading-snug mb-2">
              {selected.label}
            </h4>

            {/* Summary */}
            {selected.summary && (
              <p className="font-mono text-[8px] text-white/35 leading-relaxed mb-2">
                {selected.summary}
              </p>
            )}

            {/* Metadata */}
            <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-white/[0.06]">
              {selected.date && (
                <div className="flex justify-between">
                  <span className="font-mono text-[7px] text-white/20">DATE</span>
                  <span className="font-mono text-[7px] text-white/40">{selected.date}</span>
                </div>
              )}
              {selected.source && (
                <div className="flex justify-between">
                  <span className="font-mono text-[7px] text-white/20">SOURCE</span>
                  <span className="font-mono text-[7px] text-white/40">{selected.source}</span>
                </div>
              )}
              {selected.confidence != null && selected.confidence > 0 && (
                <div className="flex justify-between">
                  <span className="font-mono text-[7px] text-white/20">CONF</span>
                  <span className="font-mono text-[7px] text-white/40">
                    {Math.round(selected.confidence * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Close */}
            <button
              onClick={() => setSelected(null)}
              className="mt-3 w-full font-mono text-[7px] tracking-[0.15em] text-white/20 hover:text-white/50 transition-colors text-center py-1 border border-white/[0.06] hover:border-white/[0.12] rounded-sm"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
