'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import type { Core, NodeSingular, ElementDefinition } from 'cytoscape';
import cytoscape from 'cytoscape';
import type {
  TechKnowledgeNode,
  KnowledgeLayerKey,
} from '@/lib/data/technology-knowledge-graph';

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  techId: string;
  techName: string;
  techCategory: string;
  accentColor: string;
  node: TechKnowledgeNode;
  onNodeClick?: (entityName: string, entityType: KnowledgeLayerKey) => void;
};

type SelectedNode = {
  name: string;
  type: string;
  color: string;
};

// ── Layer definitions ─────────────────────────────────────────────────────────

const LAYERS = [
  { key: 'discoveredBy' as const, color: '#00d4ff', label: 'DISCOVERED' },
  { key: 'studiedBy'    as const, color: '#ffd700', label: 'RESEARCHED' },
  { key: 'builtBy'      as const, color: '#f97316', label: 'BUILT BY'   },
  { key: 'usedBy'       as const, color: '#00ff88', label: 'DEPLOYED'   },
] as const;

// Hex string → rgba helper (no external deps)
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Slugify entity names into safe Cytoscape IDs
function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ── Cytoscape stylesheet ──────────────────────────────────────────────────────

const STYLESHEET: cytoscape.StylesheetJsonBlock[] = [
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      'border-width': 1,
      'border-color': 'data(borderColor)',
      'border-opacity': 0.7,
      'label': 'data(label)',
      'font-family': '"IBM Plex Mono", monospace',
      'font-size': 7,
      'color': '#ffffff',
      'text-opacity': 0.6,
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 4,
      'text-wrap': 'wrap',
      'text-max-width': '80px',
      'width': 'data(size)',
      'height': 'data(size)',
    },
  },
  {
    selector: 'node[nodeType="center"]',
    style: {
      'border-width': 2,
      'font-size': 9,
      'text-opacity': 1,
      'color': '#ffffff',
      'z-index': 10,
    },
  },
  {
    selector: 'node:selected',
    style: {
      'border-width': 2,
      'border-opacity': 1,
    },
  },
  {
    selector: 'edge',
    style: {
      'width': 0.5,
      'line-color': 'rgba(255,255,255,0.12)',
      'curve-style': 'bezier',
      'opacity': 0.6,
    },
  },
];

// ── Cose layout ───────────────────────────────────────────────────────────────

const LAYOUT = {
  name: 'cose' as const,
  animate: true,
  animationDuration: 600,
  randomize: false,
  nodeRepulsion: () => 6000,
  idealEdgeLength: () => 80,
  edgeElasticity: () => 100,
  gravity: 0.25,
  numIter: 1000,
  fit: true,
  padding: 32,
};

// ── Component ─────────────────────────────────────────────────────────────────

export function KnowledgeGraph({
  techId,
  techName,
  accentColor,
  node,
  onNodeClick,
}: Props) {
  const cyRef = useRef<Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

  // Build Cytoscape elements from TechKnowledgeNode
  const elements = useMemo<ElementDefinition[]>(() => {
    const centerId = `center-${techId}`;
    const els: ElementDefinition[] = [];

    // Center node
    els.push({
      data: {
        id: centerId,
        label: techName.toUpperCase(),
        color: hexToRgba(accentColor, 0.3),
        borderColor: accentColor,
        size: 40,
        nodeType: 'center',
        layerColor: accentColor,
        entityType: 'center',
      },
    });

    // Layer nodes + edges
    for (const layer of LAYERS) {
      const entities = node[layer.key];
      for (const entity of entities) {
        const nodeId = `${layer.key}-${slugify(entity.name)}`;

        els.push({
          data: {
            id: nodeId,
            label: entity.name,
            color: hexToRgba(layer.color, 0.2),
            borderColor: layer.color,
            layerColor: layer.color,
            size: 22,
            nodeType: layer.key,
            entityType: layer.key as KnowledgeLayerKey,
          },
        });

        els.push({
          data: {
            id: `edge-${nodeId}`,
            source: nodeId,
            target: centerId,
          },
        });
      }
    }

    return els;
  }, [techId, techName, accentColor, node]);

  // Wire Cytoscape instance
  const handleCy = useCallback(
    (cy: Core) => {
      cyRef.current = cy;

      cy.on('tap', 'node', (evt) => {
        const n = evt.target as NodeSingular;
        const d = n.data() as Record<string, unknown>;
        if (d.nodeType === 'center') {
          setSelectedNode(null);
          return;
        }
        setSelectedNode({
          name: d.label as string,
          type: d.entityType as string,
          color: d.layerColor as string,
        });
        onNodeClick?.(d.label as string, d.entityType as KnowledgeLayerKey);
      });

      cy.on('tap', (evt) => {
        if (evt.target === cy) setSelectedNode(null);
      });
    },
    [onNodeClick],
  );

  // Human-readable layer label from entityType key
  const layerLabel = (key: string): string => {
    const found = LAYERS.find((l) => l.key === key);
    return found ? found.label : key.toUpperCase();
  };

  return (
    <div
      className="relative bg-black border border-white/[0.08] rounded-sm overflow-hidden"
      style={{ height: 420 }}
    >
      {/* Layer legend — top left */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        {LAYERS.map((l) => (
          <div key={l.key} className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: l.color,
                boxShadow: `0 0 4px ${l.color}cc`,
              }}
            />
            <span className="font-mono text-[7px] tracking-[0.15em] text-white/40">
              {l.label}
            </span>
          </div>
        ))}
      </div>

      {/* FIT button — top right */}
      <button
        className="absolute top-3 right-3 z-10 font-mono text-[7px] tracking-[0.2em] text-white/25 hover:text-[#00d4ff] px-2 py-1 border border-white/[0.08] hover:border-[#00d4ff]/30 rounded-sm transition-colors bg-black/60"
        onClick={() => cyRef.current?.fit(undefined, 32)}
      >
        FIT
      </button>

      {/* Cytoscape graph */}
      <CytoscapeComponent
        elements={elements}
        layout={LAYOUT}
        stylesheet={STYLESHEET}
        style={{ width: '100%', height: '100%', background: '#000' }}
        cy={handleCy}
        minZoom={0.3}
        maxZoom={3}
        userZoomingEnabled={true}
        userPanningEnabled={true}
        boxSelectionEnabled={false}
      />

      {/* Selected node info panel — bottom */}
      {selectedNode && (
        <div className="absolute bottom-3 left-3 right-3 z-10 bg-black/90 border border-white/10 rounded-sm px-3 py-2 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: selectedNode.color,
                boxShadow: `0 0 4px ${selectedNode.color}cc`,
              }}
            />
            <span className="font-mono text-[9px] text-white/70 truncate">
              {selectedNode.name}
            </span>
            <span className="font-mono text-[7px] tracking-[0.15em] text-white/25 uppercase flex-shrink-0">
              {layerLabel(selectedNode.type)}
            </span>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="font-mono text-[7px] text-white/20 hover:text-white/50 transition-colors ml-2 flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
