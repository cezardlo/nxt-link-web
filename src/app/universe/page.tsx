'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { PageTopBar } from '@/components/PageTopBar';
import {
  UNIVERSE_GRAPH,
  getConnectedNodes,
  searchNodes,
  type UniverseNode,
  type UniverseNodeType,
} from '@/lib/data/universe-graph';

const NODE_TYPE_COLORS: Record<UniverseNodeType, string> = {
  industry:   '#ff3b30',
  technology: '#00d4ff',
  company:    '#00ff88',
  research:   '#ffd700',
  conference: '#f97316',
  product:    '#a855f7',
};

// ── Dynamic Cytoscape import (needs window) ──────────────────────────────────

const CytoscapeComponent = dynamic(
  () => import('react-cytoscapejs').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-black border border-white/[0.04] rounded-sm">
        <span className="font-mono text-[8px] text-white/20 tracking-[0.2em]">
          LOADING GRAPH...
        </span>
      </div>
    ),
  },
);

// ── Lazy-import Cytoscape types (only used at type level) ────────────────────

import type { Core, NodeSingular, ElementDefinition } from 'cytoscape';
import cytoscape from 'cytoscape';

// ── Constants ────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  'Defense',
  'Cybersecurity',
  'Manufacturing',
  'Logistics',
  'Energy',
  'Healthcare',
  'AI/ML',
  'Border/Gov',
] as const;

const NODE_TYPES: { key: UniverseNodeType; label: string }[] = [
  { key: 'industry',   label: 'INDUSTRY' },
  { key: 'technology', label: 'TECHNOLOGY' },
  { key: 'company',    label: 'COMPANY' },
  { key: 'research',   label: 'RESEARCH' },
  { key: 'conference', label: 'CONFERENCE' },
];

const ALL_STAGES: string[] = [
  'Discovery',
  'Research',
  'Development',
  'Product',
  'Adoption',
  'Impact',
];

const TREND_CFG: Record<string, { label: string; color: string }> = {
  rising:    { label: 'RISING',    color: '#00ff88' },
  stable:    { label: 'STABLE',    color: '#ffd700' },
  declining: { label: 'DECLINING', color: '#ff3b30' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Cytoscape stylesheet ────────────────────────────────────────────────────

const STYLESHEET: cytoscape.StylesheetJsonBlock[] = [
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      'border-width': 1.5,
      'border-color': 'data(borderColor)',
      'border-opacity': 0.7,
      'label': 'data(label)',
      'font-family': '"IBM Plex Mono", monospace',
      'font-size': 7,
      'color': '#ffffff',
      'text-opacity': 0.55,
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
    selector: 'node:selected',
    style: {
      'border-width': 2.5,
      'border-opacity': 1,
      'text-opacity': 1,
      'z-index': 20,
    },
  },
  {
    selector: 'node.highlighted',
    style: {
      'border-width': 2,
      'border-opacity': 0.9,
      'text-opacity': 0.9,
      'z-index': 15,
    },
  },
  {
    selector: 'node.search-match',
    style: {
      'border-width': 2.5,
      'border-opacity': 1,
      'z-index': 25,
    },
  },
  {
    selector: 'node.dimmed',
    style: {
      'opacity': 0.15,
    },
  },
  {
    selector: 'edge',
    style: {
      'width': 'data(width)',
      'line-color': 'rgba(255,255,255,0.08)',
      'curve-style': 'bezier',
      'opacity': 0.5,
      'target-arrow-shape': 'triangle',
      'target-arrow-color': 'rgba(255,255,255,0.08)',
      'arrow-scale': 0.5,
    },
  },
  {
    selector: 'edge.highlighted',
    style: {
      'line-color': 'rgba(255,255,255,0.25)',
      'target-arrow-color': 'rgba(255,255,255,0.25)',
      'opacity': 0.8,
      'z-index': 10,
    },
  },
  {
    selector: 'edge.dimmed',
    style: {
      'opacity': 0.05,
    },
  },
];

const LAYOUT_OPTIONS = {
  name: 'cose' as const,
  animate: true,
  animationDuration: 800,
  randomize: false,
  nodeRepulsion: 8000,
  idealEdgeLength: 100,
  edgeElasticity: 100,
  gravity: 0.2,
  numIter: 1500,
  fit: true,
  padding: 40,
};

// ── Filter state type ────────────────────────────────────────────────────────

interface Filters {
  industries: Set<string>;
  nodeTypes: Set<string>;
  stages: Set<string>;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function UniversePage() {
  const cyRef = useRef<Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<UniverseNode | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>({
    industries: new Set<string>(),
    nodeTypes: new Set<string>(['industry', 'technology', 'company', 'research', 'conference']),
    stages: new Set<string>(),
  });
  const [breadcrumb, setBreadcrumb] = useState<string[]>(['GLOBAL']);

  // ── Derived data ─────────────────────────────────────────────────────────

  const filteredNodes = useMemo(() => {
    return UNIVERSE_GRAPH.nodes.filter((n) => {
      // Node type filter (must be active)
      if (!filters.nodeTypes.has(n.type)) return false;
      // Industry filter (empty = show all)
      if (filters.industries.size > 0 && n.category && !filters.industries.has(n.category)) return false;
      // Stage filter (empty = show all)
      if (filters.stages.size > 0) {
        const stage = n.metadata?.stage;
        if (typeof stage !== 'string' || !filters.stages.has(stage)) return false;
      }
      return true;
    });
  }, [filters]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return UNIVERSE_GRAPH.edges.filter(
      (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target),
    );
  }, [filteredNodeIds]);

  const searchResults = useMemo(() => searchNodes(search), [search]);

  const connectedNodes = useMemo(() => {
    if (!selectedNode) return [];
    return getConnectedNodes(selectedNode.id);
  }, [selectedNode]);

  // ── Cytoscape elements ──────────────────────────────────────────────────

  const elements = useMemo<ElementDefinition[]>(() => {
    const els: ElementDefinition[] = [];

    for (const node of filteredNodes) {
      const typeColor = NODE_TYPE_COLORS[node.type];
      const size = 20 + (node.importance / 100) * 40; // 20-60px

      els.push({
        data: {
          id: node.id,
          label: node.label,
          color: hexToRgba(typeColor, 0.25),
          borderColor: typeColor,
          size,
          nodeType: node.type,
          industry: node.category ?? '',
          importance: node.importance,
        },
      });
    }

    for (const edge of filteredEdges) {
      const w = 0.5 + edge.strength * 1.5; // 0.5-2px
      els.push({
        data: {
          id: `${edge.source}--${edge.target}`,
          source: edge.source,
          target: edge.target,
          width: w,
        },
      });
    }

    return els;
  }, [filteredNodes, filteredEdges]);

  // ── Cytoscape event wiring ──────────────────────────────────────────────

  const handleCy = useCallback((cy: Core) => {
    cyRef.current = cy;

    // Single click: select node, highlight connected
    cy.on('tap', 'node', (evt) => {
      const n = evt.target as NodeSingular;
      const nodeId = n.data('id') as string;
      const found = UNIVERSE_GRAPH.nodes.find((nd) => nd.id === nodeId);
      if (!found) return;

      setSelectedNode(found);
      setBreadcrumb((prev) => {
        if (prev[prev.length - 1] === found.label) return prev;
        return [...prev, found.label];
      });

      // Highlight connected nodes & edges
      cy.elements().removeClass('highlighted dimmed');
      const neighborhood = n.neighborhood().add(n);
      neighborhood.addClass('highlighted');
      cy.elements().not(neighborhood).addClass('dimmed');
    });

    // Double click: zoom to node
    cy.on('dbltap', 'node', (evt) => {
      const n = evt.target as NodeSingular;
      cy.animate({
        center: { eles: n },
        zoom: 2,
      });
    });

    // Click background: deselect
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
        cy.elements().removeClass('highlighted dimmed');
      }
    });
  }, []);

  // ── Search highlight effect ─────────────────────────────────────────────

  const applySearchHighlight = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().removeClass('search-match');
    if (search.trim()) {
      const matchIds = new Set(searchResults.map((n) => n.id));
      cy.nodes().forEach((n) => {
        if (matchIds.has(n.data('id') as string)) {
          n.addClass('search-match');
        }
      });
    }
  }, [search, searchResults]);

  // Apply search after elements render
  useMemo(() => {
    // Defer to next tick so Cytoscape has processed elements
    setTimeout(applySearchHighlight, 100);
  }, [applySearchHighlight]);

  // ── Filter handlers ─────────────────────────────────────────────────────

  const toggleIndustry = (industry: string) => {
    setFilters((prev) => {
      const next = new Set(prev.industries);
      if (next.has(industry)) next.delete(industry);
      else next.add(industry);
      return { ...prev, industries: next };
    });
  };

  const toggleNodeType = (type: string) => {
    setFilters((prev) => {
      const next = new Set(prev.nodeTypes);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return { ...prev, nodeTypes: next };
    });
  };

  const toggleStage = (stage: string) => {
    setFilters((prev) => {
      const next = new Set(prev.stages);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return { ...prev, stages: next };
    });
  };

  const resetFilters = () => {
    setFilters({
      industries: new Set<string>(),
      nodeTypes: new Set<string>(['industry', 'technology', 'company', 'research', 'conference']),
      stages: new Set<string>(),
    });
    setSelectedNode(null);
    setBreadcrumb(['GLOBAL']);
    const cy = cyRef.current;
    if (cy) {
      cy.elements().removeClass('highlighted dimmed search-match');
      cy.fit(undefined, 40);
    }
  };

  // ── Zoom controls ──────────────────────────────────────────────────────

  const zoomIn = () => {
    const cy = cyRef.current;
    if (cy) cy.zoom({ level: cy.zoom() * 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  };

  const zoomOut = () => {
    const cy = cyRef.current;
    if (cy) cy.zoom({ level: cy.zoom() / 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  };

  const fitGraph = () => {
    const cy = cyRef.current;
    if (cy) cy.fit(undefined, 40);
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="bg-black min-h-screen font-mono">
      {/* TOP BAR */}
      <PageTopBar
        backHref="/"
        backLabel="HOME"
        breadcrumbs={[{ label: 'UNIVERSE' }]}
        rightSlot={
          <span className="font-mono text-[8px] tracking-[0.2em] text-white/30">
            {filteredNodes.length} NODES &middot; {filteredEdges.length} EDGES
          </span>
        }
      />

      {/* HEADER STRIP */}
      <div className="border-b border-white/[0.05] px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-[13px] tracking-[0.3em] text-white/60 uppercase leading-none">
              Industry Universe
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-[8px] tracking-[0.15em] text-white/20">
                {filteredNodes.length} NODES
              </span>
              <span className="text-[8px] tracking-[0.15em] text-white/20">
                {filteredEdges.length} EDGES
              </span>
            </div>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="w-56 bg-transparent border-b border-white/[0.06] font-mono text-[11px] text-white/60 placeholder:text-white/15 py-1 outline-none focus:border-white/20 transition-colors"
          />
        </div>
      </div>

      {/* 3-COLUMN LAYOUT */}
      <div className="flex h-[calc(100vh-96px)]">
        {/* ── LEFT PANEL ────────────────────────────────────────────────── */}
        <div className="w-56 shrink-0 border-r border-white/[0.06] bg-black/80 overflow-y-auto p-3 space-y-5">
          {/* FILTERS heading */}
          <div className="text-[8px] tracking-[0.2em] text-white/25 uppercase">Filters</div>

          {/* INDUSTRY CHECKBOXES */}
          <div className="space-y-2">
            <div className="text-[7px] tracking-[0.2em] text-white/20 uppercase">Industry</div>
            {INDUSTRIES.map((ind) => {
              const active = filters.industries.size === 0 || filters.industries.has(ind);
              const indColor = NODE_TYPE_COLORS.industry;
              return (
                <button
                  key={ind}
                  onClick={() => toggleIndustry(ind)}
                  className="flex items-center gap-2 w-full group"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-[2px] border flex items-center justify-center transition-colors"
                    style={{
                      borderColor: active ? indColor : 'rgba(255,255,255,0.1)',
                      backgroundColor: active ? `${indColor}20` : 'transparent',
                    }}
                  >
                    {active && (
                      <div
                        className="w-1 h-1 rounded-[1px]"
                        style={{ backgroundColor: indColor }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[9px] tracking-wide transition-colors"
                    style={{ color: active ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)' }}
                  >
                    {ind}
                  </span>
                </button>
              );
            })}
          </div>

          {/* NODE TYPE TOGGLES */}
          <div className="space-y-2">
            <div className="text-[7px] tracking-[0.2em] text-white/20 uppercase">Node Type</div>
            {NODE_TYPES.map(({ key, label }) => {
              const active = filters.nodeTypes.has(key);
              const color = NODE_TYPE_COLORS[key];
              return (
                <button
                  key={key}
                  onClick={() => toggleNodeType(key)}
                  className="flex items-center gap-2 w-full group"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-[2px] border flex items-center justify-center transition-colors"
                    style={{
                      borderColor: active ? color : 'rgba(255,255,255,0.1)',
                      backgroundColor: active ? `${color}20` : 'transparent',
                    }}
                  >
                    {active && (
                      <div
                        className="w-1 h-1 rounded-[1px]"
                        style={{ backgroundColor: color }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[9px] tracking-wide transition-colors"
                    style={{ color: active ? color : 'rgba(255,255,255,0.2)' }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* STAGE FILTER */}
          <div className="space-y-2">
            <div className="text-[7px] tracking-[0.2em] text-white/20 uppercase">Stage</div>
            {ALL_STAGES.map((stage) => {
              const active = filters.stages.size === 0 || filters.stages.has(stage);
              return (
                <button
                  key={stage}
                  onClick={() => toggleStage(stage)}
                  className="flex items-center gap-2 w-full group"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-[2px] border flex items-center justify-center transition-colors"
                    style={{
                      borderColor: active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                      backgroundColor: active ? 'rgba(255,255,255,0.05)' : 'transparent',
                    }}
                  >
                    {active && (
                      <div
                        className="w-1 h-1 rounded-[1px]"
                        style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[9px] tracking-wide transition-colors"
                    style={{ color: active ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)' }}
                  >
                    {stage}
                  </span>
                </button>
              );
            })}
          </div>

          {/* RESET FILTERS */}
          <button
            onClick={resetFilters}
            className="w-full text-[8px] tracking-[0.2em] text-white/20 hover:text-[#00d4ff] py-2 border border-white/[0.06] hover:border-[#00d4ff]/30 rounded-sm transition-colors uppercase"
          >
            Reset Filters
          </button>
        </div>

        {/* ── CENTER — GRAPH ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Breadcrumb trail */}
          <div className="h-7 flex items-center gap-1.5 px-3 border-b border-white/[0.04]">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setBreadcrumb(breadcrumb.slice(0, i + 1));
                    if (i === 0) {
                      setSelectedNode(null);
                      cyRef.current?.elements().removeClass('highlighted dimmed');
                      cyRef.current?.fit(undefined, 40);
                    }
                  }}
                  className="text-[8px] tracking-[0.15em] text-white/30 hover:text-[#00d4ff] transition-colors uppercase"
                >
                  {crumb}
                </button>
                {i < breadcrumb.length - 1 && (
                  <span className="text-[8px] text-white/15">&rsaquo;</span>
                )}
              </span>
            ))}
          </div>

          {/* Cytoscape graph */}
          <div className="flex-1 relative border border-white/[0.04]">
            <CytoscapeComponent
              elements={elements}
              layout={LAYOUT_OPTIONS}
              stylesheet={STYLESHEET}
              style={{ width: '100%', height: '100%', background: '#000' }}
              cy={handleCy}
              minZoom={0.2}
              maxZoom={4}
              userZoomingEnabled={true}
              userPanningEnabled={true}
              boxSelectionEnabled={false}
            />

            {/* Zoom controls — bottom left */}
            <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1">
              <button
                onClick={zoomIn}
                className="w-7 h-7 flex items-center justify-center font-mono text-[11px] text-white/30 hover:text-[#00d4ff] border border-white/[0.08] hover:border-[#00d4ff]/30 rounded-sm transition-colors bg-black/70"
              >
                +
              </button>
              <button
                onClick={zoomOut}
                className="w-7 h-7 flex items-center justify-center font-mono text-[11px] text-white/30 hover:text-[#00d4ff] border border-white/[0.08] hover:border-[#00d4ff]/30 rounded-sm transition-colors bg-black/70"
              >
                -
              </button>
              <button
                onClick={fitGraph}
                className="w-7 h-7 flex items-center justify-center font-mono text-[7px] tracking-[0.1em] text-white/25 hover:text-[#00d4ff] border border-white/[0.08] hover:border-[#00d4ff]/30 rounded-sm transition-colors bg-black/70"
              >
                FIT
              </button>
            </div>

            {/* Node type legend — top left */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
              {NODE_TYPES.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: NODE_TYPE_COLORS[key],
                      boxShadow: `0 0 4px ${NODE_TYPE_COLORS[key]}cc`,
                    }}
                  />
                  <span className="text-[6px] tracking-[0.15em] text-white/30 uppercase">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ───────────────────────────────────────────────── */}
        <div className="w-72 shrink-0 border-l border-white/[0.06] bg-black/80 overflow-y-auto p-3 space-y-4">
          <div className="text-[8px] tracking-[0.2em] text-white/25 uppercase">Detail Panel</div>

          {selectedNode ? (
            <div className="space-y-4">
              {/* Node type badge */}
              <div className="flex items-center gap-2">
                <span
                  className="text-[7px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-sm border"
                  style={{
                    color: NODE_TYPE_COLORS[selectedNode.type],
                    borderColor: `${NODE_TYPE_COLORS[selectedNode.type]}40`,
                    backgroundColor: `${NODE_TYPE_COLORS[selectedNode.type]}10`,
                  }}
                >
                  {selectedNode.type}
                </span>
                <span
                  className="text-[7px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm border border-white/[0.06] text-white/30"
                >
                  {selectedNode.category ?? '—'}
                </span>
              </div>

              {/* Name */}
              <div
                className="text-[14px] tracking-[0.15em] uppercase leading-tight"
                style={{ color: NODE_TYPE_COLORS[selectedNode.type] }}
              >
                {selectedNode.label}
              </div>

              {/* Description */}
              <p className="text-[10px] text-white/40 leading-relaxed">
                {selectedNode.description}
              </p>

              {/* Importance score bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[7px] tracking-[0.2em] text-white/20 uppercase">
                    Importance
                  </span>
                  <span
                    className="text-[10px] tabular-nums"
                    style={{ color: NODE_TYPE_COLORS[selectedNode.type] }}
                  >
                    {selectedNode.importance}
                  </span>
                </div>
                <div className="h-[3px] w-full bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${selectedNode.importance}%`,
                      backgroundColor: NODE_TYPE_COLORS[selectedNode.type],
                      boxShadow: `0 0 6px ${NODE_TYPE_COLORS[selectedNode.type]}60`,
                    }}
                  />
                </div>
              </div>

              {/* Stage */}
              {selectedNode.metadata?.stage && (
                <div className="flex items-center gap-2">
                  <span className="text-[7px] tracking-[0.2em] text-white/20 uppercase">Stage</span>
                  <span className="text-[9px] text-white/50 tracking-wide">
                    {String(selectedNode.metadata.stage)}
                  </span>
                </div>
              )}

              {/* Trend badge */}
              <div className="flex items-center gap-2">
                <span className="text-[7px] tracking-[0.2em] text-white/20 uppercase">Trend</span>
                <span
                  className="text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm border"
                  style={{
                    color: TREND_CFG[selectedNode.trend]?.color ?? '#6b7280',
                    borderColor: `${TREND_CFG[selectedNode.trend]?.color ?? '#6b7280'}40`,
                    backgroundColor: `${TREND_CFG[selectedNode.trend]?.color ?? '#6b7280'}10`,
                  }}
                >
                  {TREND_CFG[selectedNode.trend]?.label ?? selectedNode.trend.toUpperCase()}
                </span>
              </div>

              {/* Connected entities */}
              {connectedNodes.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-white/[0.05]">
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] tracking-[0.2em] text-white/20 uppercase">
                      Connected Entities
                    </span>
                    <span className="text-[8px] text-white/15 tabular-nums">
                      {connectedNodes.length}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {connectedNodes.map((cn) => (
                      <button
                        key={cn.node.id}
                        onClick={() => {
                          setSelectedNode(cn.node);
                          setBreadcrumb((prev) => [...prev, cn.node.label]);
                          // Highlight in graph
                          const cy = cyRef.current;
                          if (cy) {
                            cy.elements().removeClass('highlighted dimmed');
                            const node = cy.getElementById(cn.node.id);
                            if (node.length) {
                              const neighborhood = node.neighborhood().add(node);
                              neighborhood.addClass('highlighted');
                              cy.elements().not(neighborhood).addClass('dimmed');
                              cy.animate({
                                center: { eles: node },
                              });
                            }
                          }
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm border border-white/[0.04] hover:border-white/[0.12] hover:bg-white/[0.02] transition-all text-left"
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: NODE_TYPE_COLORS[cn.node.type],
                            boxShadow: `0 0 3px ${NODE_TYPE_COLORS[cn.node.type]}88`,
                          }}
                        />
                        <span className="text-[9px] text-white/50 truncate">{cn.node.label}</span>
                        <span className="text-[6px] tracking-[0.1em] text-white/15 uppercase shrink-0 ml-auto">
                          {cn.node.type}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-1.5 pt-3 border-t border-white/[0.05]">
                {(['technology', 'company', 'industry', 'conference'] as const).includes(
                  selectedNode.type as 'technology' | 'company' | 'industry' | 'conference',
                ) && (
                  <Link
                    href={`/${selectedNode.type}/${selectedNode.id}`}
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-sm border border-[#00d4ff]/20 hover:border-[#00d4ff]/40 bg-[#00d4ff]/5 hover:bg-[#00d4ff]/10 transition-all"
                  >
                    <span className="text-[8px] tracking-[0.2em] text-[#00d4ff] uppercase">
                      View Page
                    </span>
                  </Link>
                )}
                <button
                  onClick={() => {
                    const cy = cyRef.current;
                    if (cy) {
                      const node = cy.getElementById(selectedNode.id);
                      if (node.length) {
                        cy.animate({
                          center: { eles: node },
                          zoom: 2.5,
                        });
                      }
                    }
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-sm border border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.02] transition-all"
                >
                  <span className="text-[8px] tracking-[0.2em] text-white/40 uppercase">
                    Explore Network
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* No node selected — summary stats */
            <div className="space-y-4">
              <div className="text-[9px] text-white/25 leading-relaxed">
                Select a node in the graph to view its details and connections.
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="border border-white/[0.06] rounded-sm p-3 space-y-1">
                  <div className="text-[7px] tracking-[0.2em] text-white/20 uppercase">Total Nodes</div>
                  <div className="text-[14px] text-[#00d4ff] tabular-nums">{filteredNodes.length}</div>
                </div>
                <div className="border border-white/[0.06] rounded-sm p-3 space-y-1">
                  <div className="text-[7px] tracking-[0.2em] text-white/20 uppercase">Total Edges</div>
                  <div className="text-[14px] text-[#00d4ff] tabular-nums">{filteredEdges.length}</div>
                </div>
                <div className="border border-white/[0.06] rounded-sm p-3 space-y-1">
                  <div className="text-[7px] tracking-[0.2em] text-white/20 uppercase">Industries</div>
                  <div className="text-[14px] text-[#ffd700] tabular-nums">
                    {filteredNodes.filter((n) => n.type === 'industry').length}
                  </div>
                </div>
                <div className="border border-white/[0.06] rounded-sm p-3 space-y-1">
                  <div className="text-[7px] tracking-[0.2em] text-white/20 uppercase">Technologies</div>
                  <div className="text-[14px] text-[#ffd700] tabular-nums">
                    {filteredNodes.filter((n) => n.type === 'technology').length}
                  </div>
                </div>
              </div>

              {/* Node type breakdown */}
              <div className="space-y-2 pt-2 border-t border-white/[0.05]">
                <div className="text-[7px] tracking-[0.2em] text-white/20 uppercase">By Type</div>
                {NODE_TYPES.map(({ key, label }) => {
                  const count = filteredNodes.filter((n) => n.type === key).length;
                  const pct = filteredNodes.length > 0 ? (count / filteredNodes.length) * 100 : 0;
                  const color = NODE_TYPE_COLORS[key];
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: color, boxShadow: `0 0 3px ${color}88` }}
                          />
                          <span className="text-[8px] tracking-[0.15em] uppercase" style={{ color }}>
                            {label}
                          </span>
                        </div>
                        <span className="text-[9px] tabular-nums text-white/30">{count}</span>
                      </div>
                      <div className="h-[2px] w-full bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: color,
                            boxShadow: `0 0 4px ${color}40`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Trend summary */}
              <div className="space-y-2 pt-2 border-t border-white/[0.05]">
                <div className="text-[7px] tracking-[0.2em] text-white/20 uppercase">Trends</div>
                {(['rising', 'stable', 'declining'] as const).map((trend) => {
                  const count = filteredNodes.filter((n) => n.trend === trend).length;
                  const cfg = TREND_CFG[trend];
                  return (
                    <div key={trend} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: cfg.color, boxShadow: `0 0 3px ${cfg.color}88` }}
                        />
                        <span className="text-[8px] tracking-[0.15em]" style={{ color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </div>
                      <span className="text-[9px] tabular-nums text-white/30">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
