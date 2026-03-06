'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import type { Core, NodeSingular, ElementDefinition } from 'cytoscape';
import cytoscape from 'cytoscape';

// ── Types ─────────────────────────────────────────────────────────────────────

type EntityNode = {
  name: string;
  type: 'university' | 'lab' | 'startup' | 'enterprise' | 'government' | 'military';
  stage: string;
};

type ProductNode = {
  name: string;
  company: string;
  stage: string;
};

type ConnectionEdge = {
  from: string;
  to: string;
  type: 'enables' | 'competes' | 'acquires' | 'uses';
};

type Props = {
  activeStage?: string;
  onStageClick: (stage: string) => void;
  onEntityClick?: (entityName: string) => void;
  techName?: string;
  entities?: EntityNode[];
  products?: ProductNode[];
  connections?: ConnectionEdge[];
  selectedEntity?: string;
};

type Tooltip = { text: string; x: number; y: number } | null;

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGES = [
  { id: 'discovery',      label: 'DISCOVERY',      color: '#00d4ff' },
  { id: 'research',       label: 'RESEARCH',       color: '#ffd700' },
  { id: 'development',    label: 'DEVELOPMENT',    color: '#f97316' },
  { id: 'productization', label: 'PRODUCTIZATION', color: '#00ff88' },
  { id: 'adoption',       label: 'ADOPTION',       color: '#a855f7' },
  { id: 'impact',         label: 'IMPACT',         color: '#ff3b30' },
] as const;

const ENTITY_COLORS: Record<string, string> = {
  university: '#a855f7',
  lab:        '#f97316',
  startup:    '#00ff88',
  enterprise: '#00d4ff',
  government: '#ffd700',
  military:   '#ff3b30',
};

const CONNECTION_COLORS: Record<string, string> = {
  enables:  '#00d4ff',
  competes: '#ff3b30',
  acquires: '#f97316',
  uses:     '#ffd700',
};

const ENTITY_LEGEND = [
  { type: 'university', label: 'University' },
  { type: 'lab',        label: 'Lab' },
  { type: 'startup',    label: 'Startup' },
  { type: 'enterprise', label: 'Enterprise' },
  { type: 'government', label: 'Government' },
  { type: 'military',   label: 'Military' },
];

const CONN_LEGEND = [
  { type: 'enables',  label: 'Enables' },
  { type: 'competes', label: 'Competes' },
  { type: 'acquires', label: 'Acquires' },
  { type: 'uses',     label: 'Uses' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function entityId(name: string): string {
  return 'ent_' + name.replace(/[^a-zA-Z0-9]/g, '_');
}

function productId(name: string): string {
  return 'prod_' + name.replace(/[^a-zA-Z0-9]/g, '_');
}

// ── Stylesheet builder ────────────────────────────────────────────────────────

function buildStylesheet(
  activeStage?: string,
  selectedEntity?: string,
): cytoscape.StylesheetJsonBlock[] {
  const ss: cytoscape.StylesheetJsonBlock[] = [
    // — Default node —
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'border-width': 2,
        'border-color': 'data(borderColor)',
        'border-opacity': 0.8,
        'label': 'data(label)',
        'font-family': '"IBM Plex Mono", monospace',
        'font-size': 7,
        'color': '#ffffff',
        'text-opacity': 0.6,
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 6,
        'text-wrap': 'wrap',
        'text-max-width': '90px',
        'width': 'data(size)',
        'height': 'data(size)',
      },
    },
    // — Center node —
    {
      selector: 'node[nodeType="center"]',
      style: {
        'border-width': 0,
        'font-size': 8,
        'text-opacity': 0.3,
        'color': '#ffffff',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-margin-y': 0,
        'z-index': 5,
        'text-max-width': '100px',
      },
    },
    // — Stage nodes —
    {
      selector: 'node[nodeType="stage"]',
      style: {
        'width': 44,
        'height': 44,
        'font-size': 7,
        'text-opacity': 0.6,
      },
    },
    // — Entity nodes —
    {
      selector: 'node[nodeType="entity"]',
      style: {
        'width': 20,
        'height': 20,
        'font-size': 6,
        'text-opacity': 0.5,
        'text-max-width': '60px',
      },
    },
    // — Product nodes —
    {
      selector: 'node[nodeType="product"]',
      style: {
        'width': 14,
        'height': 14,
        'shape': 'rectangle',
        'font-size': 5,
        'text-opacity': 0.4,
        'text-max-width': '50px',
      },
    },
    // — Stage ring edges —
    {
      selector: 'edge[edgeType="ring"]',
      style: {
        'width': 1,
        'line-color': 'rgba(255,255,255,0.12)',
        'curve-style': 'bezier',
        'opacity': 0.6,
        'target-arrow-shape': 'triangle',
        'target-arrow-color': 'rgba(255,255,255,0.12)',
        'arrow-scale': 0.6,
      },
    },
    // — Stage-to-entity edges —
    {
      selector: 'edge[edgeType="parent"]',
      style: {
        'width': 0.5,
        'line-color': 'rgba(255,255,255,0.06)',
        'curve-style': 'bezier',
        'opacity': 0.4,
        'target-arrow-shape': 'none',
      },
    },
    // — Connection edges —
    {
      selector: 'edge[edgeType="connection"]',
      style: {
        'width': 1,
        'line-color': 'data(color)',
        'curve-style': 'bezier',
        'opacity': 0.5,
        'target-arrow-shape': 'triangle',
        'target-arrow-color': 'data(color)',
        'arrow-scale': 0.5,
      },
    },
    {
      selector: 'edge[connType="competes"]',
      style: {
        'line-style': 'dashed',
      },
    },
  ];

  // Active stage glow
  if (activeStage) {
    const stg = STAGES.find((s) => s.id === activeStage);
    if (stg) {
      ss.push({
        selector: `node[id="${activeStage}"]`,
        style: {
          'border-width': 3,
          'border-opacity': 1,
          'width': 54,
          'height': 54,
          'font-size': 9,
          'text-opacity': 1,
          'z-index': 10,
        } as cytoscape.Css.Node,
      });
    }
  }

  // Selected entity highlight
  if (selectedEntity) {
    const selId = entityId(selectedEntity);
    // Fade everything
    ss.push({
      selector: 'node',
      style: { 'opacity': 0.15 } as cytoscape.Css.Node,
    });
    ss.push({
      selector: 'edge',
      style: { 'opacity': 0.05 } as cytoscape.Css.Edge,
    });
    // Highlight selected node
    ss.push({
      selector: `node[id="${selId}"]`,
      style: {
        'opacity': 1,
        'border-width': 4,
        'border-opacity': 1,
        'z-index': 20,
      } as cytoscape.Css.Node,
    });
    // Keep stage nodes visible
    ss.push({
      selector: 'node[nodeType="stage"]',
      style: { 'opacity': 0.4 } as cytoscape.Css.Node,
    });
    ss.push({
      selector: 'node[nodeType="center"]',
      style: { 'opacity': 0.3 } as cytoscape.Css.Node,
    });
    // Highlight connected edges
    ss.push({
      selector: `edge[source="${selId}"], edge[target="${selId}"]`,
      style: { 'opacity': 1, 'width': 2 } as cytoscape.Css.Edge,
    });
  }

  return ss;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InnovationCycleGraph({
  activeStage,
  onStageClick,
  onEntityClick,
  techName,
  entities = [],
  products = [],
  connections = [],
  selectedEntity,
}: Props) {
  const cyRef = useRef<Core | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip>(null);

  // Build all elements
  const elements = useMemo<ElementDefinition[]>(() => {
    const els: ElementDefinition[] = [];
    const cx = 200;
    const cy = 200;
    const radius = 160;

    // Center label
    const centerLabel = techName ? techName.toUpperCase() : 'INNOVATION\nCYCLE';
    els.push({
      data: {
        id: 'center',
        label: centerLabel,
        color: 'rgba(255,255,255,0.03)',
        borderColor: 'transparent',
        size: 60,
        nodeType: 'center',
      },
      position: { x: cx, y: cy },
    });

    // Stage positions map for entity clustering
    const stagePositions: Record<string, { x: number; y: number }> = {};

    // Stage nodes in a circle
    for (let i = 0; i < STAGES.length; i++) {
      const stage = STAGES[i];
      const angle = (Math.PI * 2 * i) / STAGES.length - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      const isActive = activeStage === stage.id;
      stagePositions[stage.id] = { x, y };

      els.push({
        data: {
          id: stage.id,
          label: stage.label,
          color: hexToRgba(stage.color, isActive ? 0.4 : 0.2),
          borderColor: stage.color,
          size: isActive ? 54 : 44,
          nodeType: 'stage',
          stageColor: stage.color,
        },
        position: { x, y },
      });
    }

    // Ring edges
    for (let i = 0; i < STAGES.length; i++) {
      const source = STAGES[i].id;
      const target = STAGES[(i + 1) % STAGES.length].id;
      els.push({
        data: { id: `ring-${source}-${target}`, source, target, edgeType: 'ring' },
      });
    }

    // Entity nodes clustered around their stage
    const stageEntityCounts: Record<string, number> = {};
    for (const ent of entities) {
      const sKey = ent.stage;
      if (!stagePositions[sKey]) continue;
      const idx = stageEntityCounts[sKey] ?? 0;
      stageEntityCounts[sKey] = idx + 1;
    }

    const stageEntityIndex: Record<string, number> = {};
    for (const ent of entities) {
      const sKey = ent.stage;
      const sPos = stagePositions[sKey];
      if (!sPos) continue;
      const idx = stageEntityIndex[sKey] ?? 0;
      stageEntityIndex[sKey] = idx + 1;
      const total = stageEntityCounts[sKey] ?? 1;
      const subAngle = (Math.PI * 2 * idx) / Math.max(total, 1);
      const subRadius = 48 + (idx % 2) * 14;
      const ex = sPos.x + subRadius * Math.cos(subAngle);
      const ey = sPos.y + subRadius * Math.sin(subAngle);
      const eId = entityId(ent.name);
      const eColor = ENTITY_COLORS[ent.type] ?? '#ffffff';

      els.push({
        data: {
          id: eId,
          label: ent.name.length > 14 ? ent.name.slice(0, 12) + '..' : ent.name,
          color: hexToRgba(eColor, 0.35),
          borderColor: eColor,
          size: 20,
          nodeType: 'entity',
          entityType: ent.type,
          entityName: ent.name,
          stage: sKey,
        },
        position: { x: ex, y: ey },
      });

      // Parent edge
      els.push({
        data: { id: `par-${eId}`, source: sKey, target: eId, edgeType: 'parent' },
      });
    }

    // Product nodes
    const stageProductIndex: Record<string, number> = {};
    for (const prod of products) {
      const sKey = prod.stage;
      const sPos = stagePositions[sKey];
      if (!sPos) continue;
      const idx = stageProductIndex[sKey] ?? 0;
      stageProductIndex[sKey] = idx + 1;
      const pAngle = Math.PI + (Math.PI * 0.3 * idx);
      const pRadius = 38 + idx * 10;
      const px = sPos.x + pRadius * Math.cos(pAngle);
      const py = sPos.y + pRadius * Math.sin(pAngle);
      const pId = productId(prod.name);

      els.push({
        data: {
          id: pId,
          label: prod.name.length > 12 ? prod.name.slice(0, 10) + '..' : prod.name,
          color: 'rgba(56,189,248,0.3)',
          borderColor: '#38bdf8',
          size: 14,
          nodeType: 'product',
          productName: prod.name,
          company: prod.company,
          stage: sKey,
        },
        position: { x: px, y: py },
      });

      // Parent edge
      els.push({
        data: { id: `ppar-${pId}`, source: sKey, target: pId, edgeType: 'parent' },
      });
    }

    // Connection edges between entities (skip if source/target node missing)
    const nodeIds = new Set(els.map((e) => e.data.id as string));
    for (let i = 0; i < connections.length; i++) {
      const conn = connections[i];
      const srcId = entityId(conn.from);
      const tgtId = entityId(conn.to);
      if (!nodeIds.has(srcId) || !nodeIds.has(tgtId)) continue;
      const cColor = CONNECTION_COLORS[conn.type] ?? '#ffffff';
      els.push({
        data: {
          id: `conn-${i}`,
          source: srcId,
          target: tgtId,
          edgeType: 'connection',
          connType: conn.type,
          color: cColor,
        },
      });
    }

    return els;
  }, [activeStage, techName, entities, products, connections]);

  const stylesheet = useMemo(
    () => buildStylesheet(activeStage, selectedEntity),
    [activeStage, selectedEntity],
  );

  const layout = useMemo(() => ({ name: 'preset' as const, fit: true, padding: 44 }), []);

  // Wire Cytoscape instance + events
  const handleCy = useCallback(
    (cy: Core) => {
      cyRef.current = cy;

      cy.removeAllListeners();

      cy.on('tap', 'node', (evt) => {
        const n = evt.target as NodeSingular;
        const d = n.data() as Record<string, unknown>;
        if (d.nodeType === 'center') return;
        if (d.nodeType === 'stage') {
          onStageClick(d.id as string);
        } else if ((d.nodeType === 'entity' || d.nodeType === 'product') && onEntityClick) {
          onEntityClick((d.entityName ?? d.productName ?? d.id) as string);
        }
      });

      cy.on('mouseover', 'node[nodeType="entity"], node[nodeType="product"]', (evt) => {
        const n = evt.target as NodeSingular;
        const d = n.data() as Record<string, unknown>;
        const pos = n.renderedPosition();
        const container = containerRef.current;
        if (!container) return;
        const name = (d.entityName ?? d.productName ?? '') as string;
        const kind = (d.entityType ?? 'product') as string;
        setTooltip({ text: `${name}\n${kind.toUpperCase()}`, x: pos.x + 14, y: pos.y - 10 });
      });

      cy.on('mouseout', 'node', () => setTooltip(null));
    },
    [onStageClick, onEntityClick],
  );

  return (
    <div
      ref={containerRef}
      className="relative bg-black border border-white/[0.08] rounded-sm overflow-hidden"
      style={{ height: 460 }}
    >
      {/* Stage legend — top left */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        {STAGES.map((s) => (
          <button
            key={s.id}
            onClick={() => onStageClick(s.id)}
            className="flex items-center gap-1.5 group"
          >
            <div
              className="w-1.5 h-1.5 rounded-full transition-transform group-hover:scale-150"
              style={{
                backgroundColor: s.color,
                boxShadow:
                  activeStage === s.id ? `0 0 6px ${s.color}cc` : `0 0 3px ${s.color}66`,
              }}
            />
            <span
              className="font-mono text-[7px] tracking-[0.15em] transition-colors"
              style={{ color: activeStage === s.id ? s.color : 'rgba(255,255,255,0.4)' }}
            >
              {s.label}
            </span>
          </button>
        ))}
      </div>

      {/* FIT button — top right */}
      <button
        className="absolute top-3 right-3 z-10 font-mono text-[7px] tracking-[0.2em] text-white/25 hover:text-[#00d4ff] px-2 py-1 border border-white/[0.08] hover:border-[#00d4ff]/30 rounded-sm transition-colors bg-black/60"
        onClick={() => cyRef.current?.fit(undefined, 44)}
      >
        FIT
      </button>

      {/* Entity type legend — bottom left */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1">
        {ENTITY_LEGEND.map((e) => (
          <div key={e.type} className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: ENTITY_COLORS[e.type] }}
            />
            <span className="font-mono text-[6px] tracking-[0.12em] text-white/40">
              {e.label}
            </span>
          </div>
        ))}
      </div>

      {/* Connection type legend — bottom right */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1">
        {CONN_LEGEND.map((c) => (
          <div key={c.type} className="flex items-center gap-1.5">
            <div
              className="w-3 h-px"
              style={{
                backgroundColor: CONNECTION_COLORS[c.type],
                borderTop: c.type === 'competes' ? `1px dashed ${CONNECTION_COLORS[c.type]}` : undefined,
              }}
            />
            <span className="font-mono text-[6px] tracking-[0.12em] text-white/40">
              {c.label}
            </span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 bg-black/90 backdrop-blur border border-white/10 rounded-sm px-2 py-1 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text.split('\n').map((line, i) => (
            <div
              key={i}
              className="font-mono text-[8px] text-white/70 whitespace-nowrap"
            >
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Cytoscape graph */}
      <CytoscapeComponent
        elements={elements}
        layout={layout}
        stylesheet={stylesheet}
        style={{ width: '100%', height: '100%', background: '#000' }}
        cy={handleCy}
        minZoom={0.3}
        maxZoom={3}
        userZoomingEnabled={true}
        userPanningEnabled={true}
        boxSelectionEnabled={false}
      />
    </div>
  );
}
