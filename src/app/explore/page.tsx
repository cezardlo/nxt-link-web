'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/PageTransition';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

type Entity = {
  id: string;
  name: string;
  slug?: string;
  entity_type: string;
  description: string | null;
};

type Relationship = {
  id?: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: string;
  confidence: number;
};

type GraphData = {
  entities: Entity[];
  relationships: Relationship[];
  stats?: {
    total_entities: number;
    type_counts: Record<string, number>;
    total_relationships: number;
  };
};

type D3Node = Entity & d3.SimulationNodeDatum & {
  degree: number;
  radius: number;
};

type D3Link = {
  source: D3Node | string;
  target: D3Node | string;
  relationship_type: string;
  confidence: number;
};

type SelectedNode = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  slug?: string;
  connections: Array<{ name: string; type: string; relationship: string; id: string }>;
};

// ── Entity type config ────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  company:     { color: '#0EA5E9', label: 'Company',     icon: '🏢' },
  technology:  { color: '#10B981', label: 'Technology',  icon: '⚡' },
  industry:    { color: '#F59E0B', label: 'Industry',    icon: '🏭' },
  product:     { color: '#8B5CF6', label: 'Product',     icon: '📦' },
  problem:     { color: '#EF4444', label: 'Problem',     icon: '⚠️' },
  signal:      { color: '#6B7280', label: 'Signal',      icon: '📡' },
  event:       { color: '#EC4899', label: 'Event',       icon: '📅' },
  location:    { color: '#14B8A6', label: 'Location',    icon: '📍' },
  opportunity: { color: '#EAB308', label: 'Opportunity', icon: '💡' },
  discovery:   { color: '#F97316', label: 'Discovery',   icon: '🔬' },
  force:       { color: '#A855F7', label: 'Force',       icon: '🌊' },
  policy:      { color: '#64748B', label: 'Policy',      icon: '📜' },
};

const FILTER_TYPES = ['company', 'technology', 'industry', 'product'];

function getNodeColor(type: string): string {
  return TYPE_CONFIG[type]?.color ?? '#4B5563';
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const nodesRef = useRef<D3Node[]>([]);
  const linksRef = useRef<D3Link[]>([]);
  const animFrameRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const dragNodeRef = useRef<D3Node | null>(null);
  const highlightNodeIdRef = useRef<string | null>(null);

  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dimensions, setDimensions] = useState({ width: 800, height: 560 });

  // ── Data fetching ────────────────────────────────────────────────────────────

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

  // ── Resize observer ──────────────────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width: Math.floor(width), height: Math.max(480, Math.floor(height)) });
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ── Build D3 graph when data + dimensions ready ───────────────────────────────

  useEffect(() => {
    if (!data || !canvasRef.current) return;

    const { width, height } = dimensions;
    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Build degree map
    const degreeMap = new Map<string, number>();
    for (const rel of data.relationships) {
      degreeMap.set(rel.source_entity_id, (degreeMap.get(rel.source_entity_id) ?? 0) + 1);
      degreeMap.set(rel.target_entity_id, (degreeMap.get(rel.target_entity_id) ?? 0) + 1);
    }

    // Limit to 300 most-connected entities
    const sortedEntities = [...data.entities]
      .sort((a, b) => (degreeMap.get(b.id) ?? 0) - (degreeMap.get(a.id) ?? 0))
      .slice(0, 300);
    const entityIds = new Set(sortedEntities.map(e => e.id));

    // Build nodes
    const nodes: D3Node[] = sortedEntities.map(e => {
      const degree = degreeMap.get(e.id) ?? 0;
      return {
        ...e,
        degree,
        radius: Math.max(4, Math.min(14, 4 + Math.sqrt(degree) * 1.6)),
        x: Math.random() * width,
        y: Math.random() * height,
      };
    });

    // Build links (only between included entities)
    const links: D3Link[] = data.relationships
      .filter(r => entityIds.has(r.source_entity_id) && entityIds.has(r.target_entity_id))
      .map(r => ({
        source: r.source_entity_id,
        target: r.target_entity_id,
        relationship_type: r.relationship_type,
        confidence: r.confidence,
      }));

    nodesRef.current = nodes;
    linksRef.current = links;

    // Cancel previous simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
      cancelAnimationFrame(animFrameRef.current);
    }

    // D3 force simulation
    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(links)
        .id((d) => d.id)
        .distance(60)
        .strength(0.4)
      )
      .force('charge', d3.forceManyBody<D3Node>().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<D3Node>((d) => d.radius + 2))
      .alphaDecay(0.02)
      .velocityDecay(0.4);

    simulationRef.current = simulation;

    function draw() {
      if (!ctx) return;
      const transform = transformRef.current;

      ctx.save();
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#07090A';
      ctx.fillRect(0, 0, width, height);

      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);

      const highlightId = highlightNodeIdRef.current;

      // Draw links
      linksRef.current.forEach(link => {
        const s = link.source as D3Node;
        const t = link.target as D3Node;
        if (!s.x || !t.x) return;

        const isHighlighted = highlightId && (s.id === highlightId || t.id === highlightId);
        ctx.beginPath();
        ctx.moveTo(s.x ?? 0, s.y ?? 0);
        ctx.lineTo(t.x ?? 0, t.y ?? 0);
        ctx.strokeStyle = isHighlighted ? 'rgba(14,165,233,0.5)' : 'rgba(255,255,255,0.06)';
        ctx.lineWidth = isHighlighted ? 1.5 / transform.k : 0.8 / transform.k;
        ctx.stroke();
      });

      // Draw nodes
      nodesRef.current.forEach(node => {
        if (node.x === undefined || node.y === undefined) return;
        const color = getNodeColor(node.entity_type);
        const r = node.radius;
        const isHighlighted = highlightId && node.id === highlightId;
        const isSelected = selectedNode?.id === node.id;

        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);

        if (isSelected) {
          ctx.fillStyle = '#ffffff';
        } else if (isHighlighted) {
          ctx.fillStyle = '#0EA5E9';
        } else if (highlightId) {
          ctx.fillStyle = color + '40';
        } else {
          ctx.fillStyle = color;
        }
        ctx.fill();

        if (isSelected || isHighlighted) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 2.5 / transform.k, 0, 2 * Math.PI);
          ctx.strokeStyle = isSelected ? '#ffffff' : '#0EA5E9';
          ctx.lineWidth = 1.5 / transform.k;
          ctx.stroke();
        }

        // Label for larger nodes or highlighted
        if (r > 7 || isHighlighted || isSelected) {
          const label = node.name.length > 18 ? node.name.slice(0, 16) + '…' : node.name;
          ctx.font = `${Math.max(9, 10 / transform.k)}px "JetBrains Mono", monospace`;
          ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(237,237,239,0.8)';
          ctx.textAlign = 'center';
          ctx.fillText(label, node.x, node.y + r + 10 / transform.k);
        }
      });

      ctx.restore();
    }

    function tick() {
      draw();
      animFrameRef.current = requestAnimationFrame(tick);
    }

    simulation.on('tick', draw);
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      simulation.stop();
      cancelAnimationFrame(animFrameRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dimensions]);

  // ── Zoom to fit ──────────────────────────────────────────────────────────────

  const zoomToFit = useCallback(() => {
    if (!canvasRef.current || nodesRef.current.length === 0) return;
    const { width, height } = dimensions;
    const xs = nodesRef.current.map(n => n.x ?? 0);
    const ys = nodesRef.current.map(n => n.y ?? 0);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = 60;
    const scaleX = (width - pad * 2) / (maxX - minX || 1);
    const scaleY = (height - pad * 2) / (maxY - minY || 1);
    const k = Math.min(scaleX, scaleY, 2);
    const tx = width / 2 - k * (minX + maxX) / 2;
    const ty = height / 2 - k * (minY + maxY) / 2;
    transformRef.current = d3.zoomIdentity.translate(tx, ty).scale(k);
  }, [dimensions]);

  // ── Mouse / touch events ─────────────────────────────────────────────────────

  const getNodeAt = useCallback((px: number, py: number): D3Node | null => {
    const transform = transformRef.current;
    const wx = (px - transform.x) / transform.k;
    const wy = (py - transform.y) / transform.k;
    let closest: D3Node | null = null;
    let closestDist = Infinity;
    for (const node of nodesRef.current) {
      const dx = (node.x ?? 0) - wx;
      const dy = (node.y ?? 0) - wy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < node.radius + 4 && dist < closestDist) {
        closestDist = dist;
        closest = node;
      }
    }
    return closest;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let panStart: { x: number; y: number; tx: number; ty: number } | null = null;
    let lastDragPos: { x: number; y: number } | null = null;

    function onMouseDown(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const node = getNodeAt(px, py);
      if (node) {
        isDraggingRef.current = true;
        dragNodeRef.current = node;
        lastDragPos = { x: px, y: py };
        node.fx = node.x;
        node.fy = node.y;
        simulationRef.current?.alphaTarget(0.3).restart();
      } else {
        panStart = { x: px, y: py, tx: transformRef.current.x, ty: transformRef.current.y };
      }
    }

    function onMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      if (isDraggingRef.current && dragNodeRef.current) {
        const transform = transformRef.current;
        dragNodeRef.current.fx = (px - transform.x) / transform.k;
        dragNodeRef.current.fy = (py - transform.y) / transform.k;
        lastDragPos = { x: px, y: py };
      } else if (panStart) {
        const dx = px - panStart.x;
        const dy = py - panStart.y;
        transformRef.current = d3.zoomIdentity
          .translate(panStart.tx + dx, panStart.ty + dy)
          .scale(transformRef.current.k);
      }
    }

    function onMouseUp(e: MouseEvent) {
      if (isDraggingRef.current && dragNodeRef.current) {
        const moved = lastDragPos &&
          Math.abs(lastDragPos.x - (e.clientX - canvas!.getBoundingClientRect().left)) < 4 &&
          Math.abs(lastDragPos.y - (e.clientY - canvas!.getBoundingClientRect().top)) < 4;

        if (!moved) {
          // Treat as click: show node info
          const node = dragNodeRef.current;
          const links = linksRef.current;
          const allNodes = nodesRef.current;
          const nodeMap = new Map(allNodes.map(n => [n.id, n]));

          const connected: SelectedNode['connections'] = [];
          const seenIds = new Set<string>();

          for (const link of links) {
            const s = (link.source as D3Node);
            const t = (link.target as D3Node);
            const srcId = typeof link.source === 'string' ? link.source : s.id;
            const tgtId = typeof link.target === 'string' ? link.target : t.id;

            if (srcId === node.id && !seenIds.has(tgtId)) {
              const n = nodeMap.get(tgtId);
              if (n) { connected.push({ name: n.name, type: n.entity_type, relationship: link.relationship_type, id: n.id }); seenIds.add(tgtId); }
            } else if (tgtId === node.id && !seenIds.has(srcId)) {
              const n = nodeMap.get(srcId);
              if (n) { connected.push({ name: n.name, type: n.entity_type, relationship: link.relationship_type, id: n.id }); seenIds.add(srcId); }
            }
          }

          setSelectedNode({
            id: node.id,
            name: node.name,
            type: node.entity_type,
            description: node.description,
            slug: node.slug,
            connections: connected.slice(0, 30),
          });
        }

        dragNodeRef.current.fx = null;
        dragNodeRef.current.fy = null;
        simulationRef.current?.alphaTarget(0).restart();
        isDraggingRef.current = false;
        dragNodeRef.current = null;
      } else if (panStart) {
        // Click on background — deselect
        const rect = canvas!.getBoundingClientRect();
        const dx = Math.abs(e.clientX - rect.left - panStart.x);
        const dy = Math.abs(e.clientY - rect.top - panStart.y);
        if (dx < 3 && dy < 3) setSelectedNode(null);
        panStart = null;
      }
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = canvas!.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.85 : 1.18;
      const t = transformRef.current;
      const newK = Math.max(0.15, Math.min(6, t.k * factor));
      const dx = px - (px - t.x) * (newK / t.k);
      const dy = py - (py - t.y) * (newK / t.k);
      transformRef.current = d3.zoomIdentity.translate(dx, dy).scale(newK);
    }

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [getNodeAt]);

  // ── Search highlight ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!searchQuery.trim()) {
      highlightNodeIdRef.current = null;
      return;
    }
    const lower = searchQuery.toLowerCase();
    const found = nodesRef.current.find(n => n.name.toLowerCase().includes(lower));
    highlightNodeIdRef.current = found?.id ?? null;
  }, [searchQuery]);

  // ── Stats ────────────────────────────────────────────────────────────────────

  const entityCount = data?.entities?.length ?? 0;
  const relCount = data?.relationships?.length ?? 0;
  const typeCounts = data?.stats?.type_counts ?? {};

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#07090A] text-white">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 pb-20">

          {/* Header */}
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-white font-grotesk">Explore Connections</h1>
            <p className="text-sm text-white/40 mt-1">
              {entityCount > 0
                ? `${entityCount.toLocaleString()} entities · ${relCount.toLocaleString()} relationships`
                : 'Loading knowledge graph…'}
            </p>
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {/* Filter chips */}
            <button
              onClick={() => setActiveFilter(null)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                !activeFilter
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/25'
                  : 'text-white/40 border border-white/10 hover:text-white/70'
              }`}
            >
              All {entityCount > 0 && <span className="text-white/30 ml-1">{entityCount}</span>}
            </button>

            {FILTER_TYPES.map(type => {
              const cfg = TYPE_CONFIG[type];
              const count = typeCounts[type] ?? 0;
              return (
                <button
                  key={type}
                  onClick={() => setActiveFilter(activeFilter === type ? null : type)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all flex items-center gap-1.5 ${
                    activeFilter === type
                      ? 'bg-white/[0.06] text-white border border-white/[0.15]'
                      : 'text-white/40 border border-white/10 hover:text-white/70'
                  }`}
                >
                  <span>{cfg.icon}</span>
                  <span>{cfg.label}</span>
                  {count > 0 && <span className="text-white/30">({count})</span>}
                </button>
              );
            })}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search node…"
                className="bg-white/[0.04] border border-white/10 rounded-full px-4 py-1.5 text-[12px] text-white/80 placeholder:text-white/25 w-44 focus:outline-none focus:border-sky-500/40 focus:bg-white/[0.06] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs"
                >✕</button>
              )}
            </div>

            {/* Zoom to fit */}
            <button
              onClick={zoomToFit}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium text-white/50 border border-white/10 hover:text-white/80 hover:border-white/20 transition-all flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Zoom to fit
            </button>
          </div>

          {/* Main layout: Graph + Panel */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">

            {/* Graph container */}
            <div
              ref={containerRef}
              className="relative rounded-2xl border border-white/[0.06] bg-[#07090A] overflow-hidden"
              style={{ minHeight: 560 }}
            >
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
                </div>
              ) : (
                <canvas
                  ref={canvasRef}
                  width={dimensions.width}
                  height={dimensions.height}
                  className="block w-full"
                  style={{ cursor: 'default' }}
                />
              )}

              {/* Legend */}
              {!loading && (
                <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 max-w-xs">
                  {Object.entries(TYPE_CONFIG).slice(0, 6).map(([type, cfg]) => (
                    <div key={type} className="flex items-center gap-1 text-[9px] text-white/35">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                      {cfg.label}
                    </div>
                  ))}
                </div>
              )}

              {/* Instructions */}
              {!loading && !selectedNode && (
                <div className="absolute top-3 left-3 text-[10px] text-white/20 font-mono">
                  drag nodes · scroll to zoom · click to inspect
                </div>
              )}
            </div>

            {/* Side Panel */}
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {selectedNode ? (
                  <motion.div
                    key={selectedNode.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
                  >
                    <div className="flex items-start gap-2 mb-3">
                      <span className="text-xl mt-0.5">{TYPE_CONFIG[selectedNode.type]?.icon || '•'}</span>
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-semibold text-white leading-snug">{selectedNode.name}</h3>
                        <span
                          className="text-[10px] font-mono uppercase tracking-wider"
                          style={{ color: TYPE_CONFIG[selectedNode.type]?.color ?? '#6B7280' }}
                        >
                          {TYPE_CONFIG[selectedNode.type]?.label || selectedNode.type}
                        </span>
                      </div>
                    </div>

                    {selectedNode.description && (
                      <p className="text-[12px] text-white/60 leading-relaxed mb-4">
                        {selectedNode.description}
                      </p>
                    )}

                    {selectedNode.slug && (
                      <Link
                        href={`/entity/${selectedNode.slug}`}
                        className="inline-block text-[10px] font-mono uppercase tracking-wider text-sky-400 hover:text-sky-300 transition-colors mb-4"
                      >
                        View full profile →
                      </Link>
                    )}

                    {selectedNode.connections.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-2">
                          Connected ({selectedNode.connections.length})
                        </h4>
                        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                          {selectedNode.connections.map((conn, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: TYPE_CONFIG[conn.type]?.color ?? '#6B7280' }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-[12px] text-white/80 truncate">{conn.name}</div>
                                <div className="text-[9px] text-white/30 font-mono">{conn.relationship.replace(/_/g, ' ')}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5"
                  >
                    <h3 className="text-[13px] font-semibold text-white/60 mb-2">Click a node</h3>
                    <p className="text-[12px] text-white/30 leading-relaxed">
                      Select any entity in the graph to see its connections, details, and linked intelligence.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Type distribution */}
              {Object.keys(typeCounts).length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5">
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-3">
                    Knowledge Graph
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(typeCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 8)
                      .map(([type, count]) => {
                        const cfg = TYPE_CONFIG[type] || { color: '#6B7280', label: type, icon: '•' };
                        return (
                          <div key={type} className="flex items-center gap-2">
                            <span className="text-sm">{cfg.icon}</span>
                            <div>
                              <div className="text-[14px] font-mono font-bold" style={{ color: cfg.color }}>
                                {count}
                              </div>
                              <div className="text-[9px] text-white/30">{cfg.label}</div>
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
