'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import type { Core, NodeSingular, ElementDefinition } from 'cytoscape';
import cytoscape from 'cytoscape';
import { useRouter } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  slug: string;
  industryLabel: string;
  accentColor: string;
  vendors: Array<{ id: string; name: string; website: string; tags: string[] }>;
  technologies: Array<{ id: string; name: string }>;
};

type SelectedNode = {
  name: string;
  type: 'industry' | 'company' | 'technology';
  color: string;
  id: string;
};

// ── Legend layers ─────────────────────────────────────────────────────────────

const LEGEND_ITEMS: Array<{ key: string; label: string; color: string }> = [
  { key: 'industry',   color: '#a855f7', label: 'INDUSTRY' },
  { key: 'company',    color: '#00d4ff', label: 'COMPANY' },
  { key: 'technology', color: '#ffd700', label: 'TECHNOLOGY' },
];

// Hex → rgba helper
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Slugify for safe Cytoscape IDs
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

export function IndustryEcosystemGraph({
  slug,
  industryLabel,
  accentColor,
  vendors,
  technologies,
}: Props) {
  const cyRef = useRef<Core | null>(null);
  const router = useRouter();
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

  // Build Cytoscape elements from props
  const elements = useMemo<ElementDefinition[]>(() => {
    const centerId = `center-${slug}`;
    const els: ElementDefinition[] = [];

    // Center node — the industry itself
    els.push({
      data: {
        id: centerId,
        label: industryLabel.toUpperCase(),
        color: hexToRgba(accentColor, 0.3),
        borderColor: accentColor,
        size: 44,
        nodeType: 'center',
        entityType: 'industry',
        entityId: slug,
      },
    });

    // Company nodes from vendors
    for (const vendor of vendors) {
      const nodeId = `company-${slugify(vendor.name)}`;
      els.push({
        data: {
          id: nodeId,
          label: vendor.name,
          color: hexToRgba('#00d4ff', 0.2),
          borderColor: '#00d4ff',
          size: 22,
          nodeType: 'company',
          entityType: 'company',
          entityId: vendor.id,
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

    // Technology nodes
    for (const tech of technologies) {
      const nodeId = `tech-${slugify(tech.name)}`;
      els.push({
        data: {
          id: nodeId,
          label: tech.name,
          color: hexToRgba('#ffd700', 0.2),
          borderColor: '#ffd700',
          size: 22,
          nodeType: 'technology',
          entityType: 'technology',
          entityId: tech.id,
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

    return els;
  }, [slug, industryLabel, accentColor, vendors, technologies]);

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
        const entityType = d.entityType as 'company' | 'technology';
        const borderColor = entityType === 'company' ? '#00d4ff' : '#ffd700';
        setSelectedNode({
          name: d.label as string,
          type: entityType,
          color: borderColor,
          id: d.entityId as string,
        });
        // Navigate to vendor page on company tap
        if (entityType === 'company') {
          router.push(`/vendor/${d.entityId as string}`);
        }
      });

      cy.on('tap', (evt) => {
        if (evt.target === cy) setSelectedNode(null);
      });
    },
    [router],
  );

  // Legend label from type
  const typeLabel = (type: string): string => {
    const found = LEGEND_ITEMS.find((l) => l.key === type);
    return found ? found.label : type.toUpperCase();
  };

  // Empty state when no ecosystem data
  if (vendors.length === 0 && technologies.length === 0) {
    return (
      <div
        className="relative bg-black border border-white/[0.08] rounded-sm overflow-hidden flex flex-col items-center justify-center"
        style={{ height: 380 }}
      >
        <div
          className="w-8 h-[2px] rounded-full mb-4"
          style={{ backgroundColor: accentColor, opacity: 0.4 }}
        />
        <span className="font-mono text-[10px] tracking-[0.2em] text-white/25 uppercase">
          No ecosystem data yet
        </span>
        <span className="font-mono text-[8px] text-white/15 mt-2">
          Vendors and technologies will appear as intelligence is gathered
        </span>
      </div>
    );
  }

  return (
    <div
      className="relative bg-black border border-white/[0.08] rounded-sm overflow-hidden"
      style={{ height: 380 }}
    >
      {/* Legend — top left */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        {LEGEND_ITEMS.map((l) => (
          <div key={l.key} className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: l.key === 'industry' ? accentColor : l.color,
                boxShadow: `0 0 4px ${l.key === 'industry' ? accentColor : l.color}cc`,
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

      {/* Selected node info — bottom */}
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
              {typeLabel(selectedNode.type)}
            </span>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="font-mono text-[7px] text-white/20 hover:text-white/50 transition-colors ml-2 flex-shrink-0"
          >
            x
          </button>
        </div>
      )}
    </div>
  );
}
