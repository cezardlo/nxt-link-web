'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { PageTransition } from '@/components/PageTransition';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Lazy-load Cytoscape (heavy library)
const CytoscapeComponent = dynamic(() => import('react-cytoscapejs'), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────

type Entity = {
  id: string;
  name: string;
  slug: string;
  entity_type: string;
  description: string | null;
};

type Relationship = {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: string;
  confidence: number;
  evidence_count: number;
};

type GraphData = {
  entities: Entity[];
  relationships: Relationship[];
  stats: {
    total_entities: number;
    type_counts: Record<string, number>;
    total_relationships: number;
  };
};

type SelectedNode = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  slug: string;
  connections: Array<{ name: string; type: string; relationship: string; slug: string }>;
};

// ── Entity type config ────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  industry:   { color: '#6366f1', label: 'Industry',   icon: '🏭' },
  company:    { color: '#22c55e', label: 'Company',    icon: '🏢' },
  technology: { color: '#06b6d4', label: 'Technology', icon: '⚡' },
  product:    { color: '#f59e0b', label: 'Product',    icon: '📦' },
  problem:    { color: '#ef4444', label: 'Problem',    icon: '⚠️' },
  signal:     { color: '#8b5cf6', label: 'Signal',     icon: '📡' },
  event:      { color: '#ec4899', label: 'Event',      icon: '📅' },
  location:   { color: '#14b8a6', label: 'Location',   icon: '📍' },
  opportunity:{ color: '#eab308', label: 'Opportunity', icon: '💡' },
  discovery:  { color: '#f97316', label: 'Discovery',  icon: '🔬' },
  force:      { color: '#a855f7', label: 'Force',      icon: '🌊' },
  policy:     { color: '#64748b', label: 'Policy',     icon: '📜' },
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  creates: 'creates',
  uses: 'uses',
  solves: 'solves',
  belongs_to: 'belongs to',
  related_to: 'related to',
  occurs_in: 'occurs in',
  influences: 'influences',
  builds: 'builds',
  funds: 'funds',
  regulates: 'regulates',
  competes_with: 'competes with',
  supplies: 'supplies',
  enables: 'enables',
  depends_on: 'depends on',
  located_in: 'located in',
  accelerates: 'accelerates',
  affects: 'affects',
};

// ── Cytoscape stylesheet ──────────────────────────────────────────────────────

const CYTO_STYLE = [
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      'border-width': 1.5,
      'border-color': 'data(borderColor)',
      label: 'data(label)',
      'font-size': '8px',
      'font-family': "'JetBrains Mono', monospace",
      color: '#ededef',
      'text-outline-color': '#0a0a0f',
      'text-outline-width': 2,
      'text-valign': 'bottom',
      'text-margin-y': 6,
      width: 'data(size)',
      height: 'data(size)',
      'overlay-opacity': 0,
    },
  },
  {
    selector: 'node:selected',
    style: {
      'border-width': 3,
      'border-color': '#ffffff',
      'background-color': '#ffffff',
    },
  },
  {
    selector: 'edge',
    style: {
      width: 0.8,
      'line-color': 'rgba(99,102,241,0.15)',
      'curve-style': 'bezier',
      'target-arrow-shape': 'triangle',
      'target-arrow-color': 'rgba(99,102,241,0.15)',
      'arrow-scale': 0.5,
      'overlay-opacity': 0,
    },
  },
  {
    selector: 'edge:selected',
    style: {
      width: 1.5,
      'line-color': 'rgba(99,102,241,0.6)',
    },
  },
] as cytoscape.StylesheetJsonBlock[];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFilter) params.set('type', activeFilter);
      params.set('limit', '300');
      const res = await fetch(`/api/explore?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      // silent
    }
    setLoading(false);
  }, [activeFilter]);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  // Build Cytoscape elements
  const elements = buildCytoscapeElements(data);

  // Handle node click
  const handleCyInit = useCallback((cy: cytoscape.Core) => {
    cyRef.current = cy;
    // Fit graph after layout completes
    setTimeout(() => { try { cy.fit(undefined, 40); } catch {} }, 100);
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const nodeData = node.data();

      // Find connected nodes
      const connections: SelectedNode['connections'] = [];
      const neighborhood = node.neighborhood('node');
      neighborhood.forEach((neighbor: cytoscape.NodeSingular) => {
        const nd = neighbor.data();
        connections.push({
          name: nd.label,
          type: nd.entityType,
          relationship: 'connected',
          slug: nd.slug,
        });
      });

      setSelectedNode({
        id: nodeData.id,
        name: nodeData.label,
        type: nodeData.entityType,
        description: nodeData.description,
        slug: nodeData.slug,
        connections,
      });
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) setSelectedNode(null);
    });
  }, []);

  const typeFilters = data?.stats?.type_counts
    ? Object.entries(data.stats.type_counts).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <PageTransition>
      <div className="min-h-screen bg-nxt-bg text-nxt-text">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 pb-20">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-nxt-text font-grotesk">Explore Connections</h1>
            <p className="text-sm text-nxt-muted mt-1">
              Interactive knowledge graph — {data?.stats?.total_entities?.toLocaleString() || '...'} entities, {data?.stats?.total_relationships?.toLocaleString() || '...'} relationships
            </p>
          </div>

          {/* Stats + Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
              onClick={() => setActiveFilter(null)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 ${
                !activeFilter
                  ? 'bg-nxt-accent/10 text-nxt-accent-light border border-nxt-accent/20'
                  : 'text-nxt-muted border border-nxt-border hover:text-nxt-secondary'
              }`}
            >
              All
            </button>
            {typeFilters.map(([type, count]) => {
              const cfg = TYPE_CONFIG[type] || { color: '#666', label: type, icon: '•' };
              return (
                <button
                  key={type}
                  onClick={() => setActiveFilter(activeFilter === type ? null : type)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    activeFilter === type
                      ? 'bg-white/[0.06] text-white border border-white/[0.15]'
                      : 'text-nxt-muted border border-nxt-border hover:text-nxt-secondary'
                  }`}
                >
                  <span>{cfg.icon}</span>
                  <span>{cfg.label}</span>
                  <span className="text-nxt-dim">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Main layout: Graph + Panel */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">

            {/* Graph */}
            <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden" style={{ minHeight: 560 }}>
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-nxt-accent/20 border-t-nxt-accent rounded-full animate-spin" />
                </div>
              ) : elements.length > 0 ? (
                <CytoscapeComponent
                  elements={elements}
                  stylesheet={CYTO_STYLE}
                  layout={{ name: 'random', animate: false } as cytoscape.LayoutOptions}
                  cy={handleCyInit}
                  style={{ width: '100%', height: '560px' }}
                  minZoom={0.3}
                  maxZoom={3}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-nxt-dim text-sm">
                  No entities found. Run the seed-graph agent to populate the knowledge graph.
                </div>
              )}

              {/* Legend */}
              <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                {Object.entries(TYPE_CONFIG).slice(0, 6).map(([type, cfg]) => (
                  <div key={type} className="flex items-center gap-1 text-[9px] text-nxt-dim">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                    {cfg.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Side Panel */}
            <div className="space-y-4">
              {selectedNode ? (
                <motion.div
                  key={selectedNode.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{TYPE_CONFIG[selectedNode.type]?.icon || '•'}</span>
                    <div>
                      <h3 className="text-[15px] font-semibold text-white">{selectedNode.name}</h3>
                      <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: TYPE_CONFIG[selectedNode.type]?.color }}>
                        {TYPE_CONFIG[selectedNode.type]?.label || selectedNode.type}
                      </span>
                    </div>
                  </div>

                  {selectedNode.description && (
                    <p className="text-[12px] text-nxt-secondary leading-relaxed mb-4">{selectedNode.description}</p>
                  )}

                  <Link
                    href={`/entity/${selectedNode.slug || selectedNode.id}`}
                    className="inline-block text-[10px] font-mono uppercase tracking-wider text-nxt-accent hover:text-nxt-accent-light transition-colors mb-4"
                  >
                    View full profile →
                  </Link>

                  {selectedNode.connections.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-mono uppercase tracking-widest text-nxt-dim mb-2">
                        Connections ({selectedNode.connections.length})
                      </h4>
                      <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                        {selectedNode.connections.map((conn, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TYPE_CONFIG[conn.type]?.color || '#666' }} />
                            <div className="min-w-0">
                              <div className="text-[12px] text-nxt-text truncate">{conn.name}</div>
                              <div className="text-[9px] text-nxt-dim">{TYPE_CONFIG[conn.type]?.label || conn.type}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5">
                  <h3 className="text-[13px] font-semibold text-nxt-secondary mb-2">Click a node</h3>
                  <p className="text-[12px] text-nxt-dim leading-relaxed">
                    Select any entity in the graph to see its connections, details, and linked intelligence.
                  </p>
                </div>
              )}

              {/* Quick Stats */}
              {data?.stats && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5">
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-nxt-dim mb-3">Knowledge Graph</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {typeFilters.slice(0, 6).map(([type, count]) => {
                      const cfg = TYPE_CONFIG[type] || { color: '#666', label: type, icon: '•' };
                      return (
                        <div key={type} className="flex items-center gap-2">
                          <span className="text-sm">{cfg.icon}</span>
                          <div>
                            <div className="text-[14px] font-mono font-bold" style={{ color: cfg.color }}>{count}</div>
                            <div className="text-[9px] text-nxt-dim">{cfg.label}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

// ── Build Cytoscape elements from API data ────────────────────────────────────

function buildCytoscapeElements(data: GraphData | null): cytoscape.ElementDefinition[] {
  if (!data) return [];

  const elements: cytoscape.ElementDefinition[] = [];

  // Nodes
  for (const entity of data.entities) {
    const cfg = TYPE_CONFIG[entity.entity_type] || { color: '#666' };
    const isIndustry = entity.entity_type === 'industry';

    elements.push({
      data: {
        id: entity.id,
        label: entity.name.length > 24 ? entity.name.slice(0, 22) + '…' : entity.name,
        color: cfg.color,
        borderColor: cfg.color + '60',
        size: isIndustry ? 28 : entity.entity_type === 'company' ? 18 : 14,
        entityType: entity.entity_type,
        description: entity.description,
        slug: entity.slug,
      },
    });
  }

  // Edges
  for (const rel of data.relationships) {
    elements.push({
      data: {
        id: `edge-${rel.id}`,
        source: rel.source_entity_id,
        target: rel.target_entity_id,
        label: RELATIONSHIP_LABELS[rel.relationship_type] || rel.relationship_type,
      },
    });
  }

  return elements;
}
