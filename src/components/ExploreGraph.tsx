'use client';

import { useCallback, useMemo, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import type { Core, NodeSingular, ElementDefinition } from 'cytoscape';
import cytoscape from 'cytoscape';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ExploreNodeData = {
  id: string;
  label: string;
  type: string;
  category: string;
};

type ExploreGraphProps = {
  onNodeSelect?: (node: ExploreNodeData) => void;
};

// ── Static Data ───────────────────────────────────────────────────────────────

const EXPLORE_DATA = {
  industries: [
    { id: 'cybersecurity', name: 'Cybersecurity' },
    { id: 'ai-ml', name: 'AI / Machine Learning' },
    { id: 'defense', name: 'Defense & Aerospace' },
    { id: 'energy', name: 'Energy & Grid' },
    { id: 'healthcare', name: 'Healthcare Tech' },
    { id: 'manufacturing', name: 'Advanced Manufacturing' },
  ],
  problems: [
    { id: 'data-breaches', name: 'Data Breaches', industries: ['cybersecurity', 'healthcare'] },
    { id: 'supply-chain-attacks', name: 'Supply Chain Attacks', industries: ['cybersecurity', 'manufacturing'] },
    { id: 'grid-reliability', name: 'Grid Reliability', industries: ['energy'] },
    { id: 'predictive-maintenance', name: 'Predictive Maintenance', industries: ['manufacturing', 'defense'] },
    { id: 'drug-discovery', name: 'Drug Discovery Speed', industries: ['healthcare', 'ai-ml'] },
    { id: 'autonomous-ops', name: 'Autonomous Operations', industries: ['defense', 'ai-ml'] },
  ],
  technologies: [
    { id: 'zero-trust', name: 'Zero Trust Architecture', solves: ['data-breaches', 'supply-chain-attacks'] },
    { id: 'llm', name: 'Large Language Models', solves: ['drug-discovery', 'autonomous-ops'] },
    { id: 'digital-twin', name: 'Digital Twins', solves: ['predictive-maintenance', 'grid-reliability'] },
    { id: 'edge-compute', name: 'Edge Computing', solves: ['autonomous-ops', 'grid-reliability'] },
    { id: 'quantum-crypto', name: 'Quantum Cryptography', solves: ['data-breaches'] },
    { id: 'computer-vision', name: 'Computer Vision', solves: ['predictive-maintenance', 'autonomous-ops'] },
  ],
  companies: [
    { id: 'crowdstrike', name: 'CrowdStrike', builds: ['zero-trust'] },
    { id: 'openai', name: 'OpenAI', builds: ['llm'] },
    { id: 'siemens', name: 'Siemens', builds: ['digital-twin'] },
    { id: 'nvidia', name: 'NVIDIA', builds: ['edge-compute', 'computer-vision', 'llm'] },
    { id: 'palantir', name: 'Palantir', builds: ['llm', 'computer-vision'] },
    { id: 'palo-alto', name: 'Palo Alto Networks', builds: ['zero-trust'] },
  ],
  signals: [
    { id: 'sig-1', name: 'CrowdStrike Q4 Revenue +33%', companies: ['crowdstrike'] },
    { id: 'sig-2', name: 'OpenAI GPT-5 Launch', companies: ['openai'] },
    { id: 'sig-3', name: 'Siemens $2B Digital Twin Contract', companies: ['siemens'] },
    { id: 'sig-4', name: 'NVIDIA Blackwell Chip Release', companies: ['nvidia'] },
    { id: 'sig-5', name: 'DOD Zero Trust Mandate', companies: ['crowdstrike', 'palo-alto'] },
    { id: 'sig-6', name: 'Palantir AIP Army Contract', companies: ['palantir'] },
  ],
};

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'industries', hubId: 'hub-industries', label: 'INDUSTRIES', color: '#3b82f6' },
  { key: 'problems', hubId: 'hub-problems', label: 'PROBLEMS', color: '#f97316' },
  { key: 'technologies', hubId: 'hub-technologies', label: 'TECHNOLOGIES', color: '#a855f7' },
  { key: 'companies', hubId: 'hub-companies', label: 'COMPANIES', color: '#00ff88' },
  { key: 'signals', hubId: 'hub-signals', label: 'SIGNALS', color: '#ff3b30' },
] as const;

// Hex → rgba helper
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
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
    selector: 'node[nodeType="hub"]',
    style: {
      'border-width': 2,
      'font-size': 10,
      'font-weight': 'bold' as cytoscape.Css.FontWeight,
      'text-opacity': 1,
      'color': '#ffffff',
      'z-index': 10,
    },
  },
  {
    selector: 'node:selected',
    style: {
      'border-width': 3,
      'border-color': '#ffffff',
      'border-opacity': 1,
    },
  },
  {
    selector: 'edge',
    style: {
      'width': 1,
      'line-color': 'rgba(255,255,255,0.1)',
      'curve-style': 'bezier',
      'opacity': 0.6,
    },
  },
];

// ── Cose layout ───────────────────────────────────────────────────────────────

const LAYOUT = {
  name: 'cose' as const,
  animate: true,
  animationDuration: 800,
  randomize: false,
  nodeRepulsion: () => 12000,
  idealEdgeLength: () => 120,
  edgeElasticity: () => 100,
  gravity: 0.15,
  numIter: 1500,
  fit: true,
  padding: 48,
};

// ── Component ─────────────────────────────────────────────────────────────────

export function ExploreGraph({ onNodeSelect }: ExploreGraphProps) {
  const cyRef = useRef<Core | null>(null);

  // Build Cytoscape elements from static data
  const elements = useMemo<ElementDefinition[]>(() => {
    const els: ElementDefinition[] = [];

    // ── Hub nodes ──
    for (const cat of CATEGORIES) {
      els.push({
        data: {
          id: cat.hubId,
          label: cat.label,
          color: hexToRgba(cat.color, 0.35),
          borderColor: cat.color,
          size: 60,
          nodeType: 'hub',
          category: cat.key,
          entityType: 'hub',
        },
      });
    }

    // ── Industry entity nodes ──
    for (const ind of EXPLORE_DATA.industries) {
      const nodeId = `ind-${ind.id}`;
      els.push({
        data: {
          id: nodeId,
          label: ind.name,
          color: hexToRgba('#3b82f6', 0.2),
          borderColor: '#3b82f6',
          size: 30,
          nodeType: 'entity',
          category: 'industries',
          entityType: 'industry',
          entityId: ind.id,
        },
      });
      els.push({ data: { id: `e-hub-ind-${ind.id}`, source: nodeId, target: 'hub-industries' } });
    }

    // ── Problem entity nodes + edges to industries ──
    for (const prob of EXPLORE_DATA.problems) {
      const nodeId = `prob-${prob.id}`;
      els.push({
        data: {
          id: nodeId,
          label: prob.name,
          color: hexToRgba('#f97316', 0.2),
          borderColor: '#f97316',
          size: 30,
          nodeType: 'entity',
          category: 'problems',
          entityType: 'problem',
          entityId: prob.id,
        },
      });
      els.push({ data: { id: `e-hub-prob-${prob.id}`, source: nodeId, target: 'hub-problems' } });
      // Cross-category edges: problem → industry
      for (const indId of prob.industries) {
        els.push({ data: { id: `e-prob-ind-${prob.id}-${indId}`, source: nodeId, target: `ind-${indId}` } });
      }
    }

    // ── Technology entity nodes + edges to problems ──
    for (const tech of EXPLORE_DATA.technologies) {
      const nodeId = `tech-${tech.id}`;
      els.push({
        data: {
          id: nodeId,
          label: tech.name,
          color: hexToRgba('#a855f7', 0.2),
          borderColor: '#a855f7',
          size: 30,
          nodeType: 'entity',
          category: 'technologies',
          entityType: 'technology',
          entityId: tech.id,
        },
      });
      els.push({ data: { id: `e-hub-tech-${tech.id}`, source: nodeId, target: 'hub-technologies' } });
      // Cross-category edges: technology → problem
      for (const probId of tech.solves) {
        els.push({ data: { id: `e-tech-prob-${tech.id}-${probId}`, source: nodeId, target: `prob-${probId}` } });
      }
    }

    // ── Company entity nodes + edges to technologies ──
    for (const comp of EXPLORE_DATA.companies) {
      const nodeId = `comp-${comp.id}`;
      els.push({
        data: {
          id: nodeId,
          label: comp.name,
          color: hexToRgba('#00ff88', 0.2),
          borderColor: '#00ff88',
          size: 30,
          nodeType: 'entity',
          category: 'companies',
          entityType: 'company',
          entityId: comp.id,
        },
      });
      els.push({ data: { id: `e-hub-comp-${comp.id}`, source: nodeId, target: 'hub-companies' } });
      // Cross-category edges: company → technology
      for (const techId of comp.builds) {
        els.push({ data: { id: `e-comp-tech-${comp.id}-${techId}`, source: nodeId, target: `tech-${techId}` } });
      }
    }

    // ── Signal entity nodes + edges to companies ──
    for (const sig of EXPLORE_DATA.signals) {
      const nodeId = `sig-${sig.id}`;
      els.push({
        data: {
          id: nodeId,
          label: sig.name,
          color: hexToRgba('#ff3b30', 0.2),
          borderColor: '#ff3b30',
          size: 30,
          nodeType: 'entity',
          category: 'signals',
          entityType: 'signal',
          entityId: sig.id,
        },
      });
      els.push({ data: { id: `e-hub-sig-${sig.id}`, source: nodeId, target: 'hub-signals' } });
      // Cross-category edges: signal → company
      for (const compId of sig.companies) {
        els.push({ data: { id: `e-sig-comp-${sig.id}-${compId}`, source: nodeId, target: `comp-${compId}` } });
      }
    }

    return els;
  }, []);

  // Wire Cytoscape instance
  const handleCy = useCallback(
    (cy: Core) => {
      cyRef.current = cy;

      cy.on('tap', 'node', (evt) => {
        const n = evt.target as NodeSingular;
        const d = n.data() as Record<string, unknown>;
        if (d.nodeType === 'hub') return;
        if (onNodeSelect) {
          onNodeSelect({
            id: d.entityId as string,
            label: d.label as string,
            type: d.entityType as string,
            category: d.category as string,
          });
        }
      });

      cy.on('tap', (evt) => {
        if (evt.target === cy && onNodeSelect) {
          // Deselect by passing empty — handled by parent
        }
      });
    },
    [onNodeSelect],
  );

  return (
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
  );
}
