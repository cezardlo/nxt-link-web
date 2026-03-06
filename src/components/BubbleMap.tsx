'use client';

import { useMemo, useCallback, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import type { Core, NodeSingular, ElementDefinition } from 'cytoscape';
import cytoscape from 'cytoscape';

export type BubbleTech = {
  id: string;
  name: string;
  maturityLevel: 'emerging' | 'growing' | 'mature';
  relatedVendorCount: number;
  elPasoRelevance: 'high' | 'medium' | 'low';
  governmentBudgetFY25M?: number;
};

type Props = {
  technologies: BubbleTech[];
  accentColor?: string;
  onTechClick?: (techId: string) => void;
};

const MATURITY_COLOR: Record<string, string> = {
  mature: '#00ff88',
  growing: '#ffb800',
  emerging: '#00d4ff',
};

function buildBubbleElements(technologies: BubbleTech[]): ElementDefinition[] {
  const maxVendors = Math.max(...technologies.map((t) => t.relatedVendorCount), 1);
  return technologies.map((tech) => {
    const color = MATURITY_COLOR[tech.maturityLevel] ?? '#00d4ff';
    const size = 24 + (tech.relatedVendorCount / maxVendors) * 32;
    return {
      data: {
        id: tech.id,
        label: tech.name,
        color: `${color}40`,
        borderColor: color,
        size,
        maturity: tech.maturityLevel,
        relevance: tech.elPasoRelevance,
      },
    };
  });
}

const bubbleStylesheet: cytoscape.StylesheetJsonBlock[] = [
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      'border-width': 1.5,
      'border-color': 'data(borderColor)',
      'border-opacity': 0.7,
      'width': 'data(size)',
      'height': 'data(size)',
      'label': 'data(label)',
      'font-family': '"IBM Plex Mono", monospace',
      'font-size': 7,
      'color': '#ffffff',
      'text-opacity': 0.55,
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': '60px',
    },
  },
  {
    selector: 'node:hover',
    style: {
      'border-opacity': 1,
      'text-opacity': 1,
      'background-opacity': 0.5,
    },
  },
];

const bubbleLayout = {
  name: 'cose' as const,
  animate: true,
  animationDuration: 500,
  randomize: true,
  nodeRepulsion: () => 4000,
  idealEdgeLength: () => 100,
  gravity: 0.6,
  numIter: 800,
  fit: true,
  padding: 24,
};

export function BubbleMap({ technologies, onTechClick }: Props) {
  const cyRef = useRef<Core | null>(null);
  const elements = useMemo(() => buildBubbleElements(technologies), [technologies]);

  const handleCy = useCallback(
    (cy: Core) => {
      cyRef.current = cy;
      cy.on('tap', 'node', (evt) => {
        const n = evt.target as NodeSingular;
        const techId = n.data('id') as string;
        onTechClick?.(techId);
      });
    },
    [onTechClick],
  );

  return (
    <div
      className="relative bg-black border border-white/[0.08] rounded-sm overflow-hidden"
      style={{ height: 280 }}
    >
      {/* Maturity legend — top left */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {(['mature', 'growing', 'emerging'] as const).map((m) => (
          <div key={m} className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: MATURITY_COLOR[m],
                boxShadow: `0 0 4px ${MATURITY_COLOR[m]}cc`,
              }}
            />
            <span className="font-mono text-[6px] tracking-[0.15em] text-white/30 uppercase">
              {m}
            </span>
          </div>
        ))}
      </div>

      {/* Click hint — top right */}
      <div className="absolute top-2 right-2 z-10">
        <span className="font-mono text-[6px] tracking-[0.15em] text-white/15">
          CLICK TO EXPLORE
        </span>
      </div>

      <CytoscapeComponent
        elements={elements}
        layout={bubbleLayout}
        stylesheet={bubbleStylesheet}
        style={{ width: '100%', height: '100%', background: '#000' }}
        cy={handleCy}
        minZoom={0.5}
        maxZoom={2}
        userZoomingEnabled={true}
        userPanningEnabled={true}
        boxSelectionEnabled={false}
      />
    </div>
  );
}
