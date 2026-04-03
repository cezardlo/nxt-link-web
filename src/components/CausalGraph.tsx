'use client';

/**
 * CausalGraph — Force-directed graph visualization
 * Ported from MiroFish's GraphPanel.vue, adapted for NxtLink dark theme
 *
 * Shows: signal → event → effects → technologies → vendors
 * Features: zoom/pan, drag nodes, click for details, edge labels, color by type
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { COLORS } from '@/lib/tokens';

// ── Types ────────────────────────────────────────────────────────────────────

type GraphNode = {
  id: string;
  type: 'signal' | 'event' | 'effect' | 'technology' | 'vendor' | 'solution';
  label: string;
  data?: Record<string, unknown>;
};

type GraphEdge = {
  source: string;
  target: string;
  type: 'causes' | 'leads_to' | 'solved_by' | 'provided_by';
  weight: number;
};

type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

type Props = {
  data: GraphData;
  width?: number;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
};

// ── Color by node type (NxtLink palette) ─────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  signal:     COLORS.accent,    // indigo
  event:      COLORS.orange,    // orange
  effect:     COLORS.red,       // red
  technology: COLORS.cyan,      // cyan
  vendor:     COLORS.green,     // green
  solution:   COLORS.emerald,   // emerald
};

const EDGE_COLORS: Record<string, string> = {
  causes:      `${COLORS.orange}80`,
  leads_to:    `${COLORS.red}80`,
  solved_by:   `${COLORS.cyan}80`,
  provided_by: `${COLORS.green}80`,
};

const NODE_RADIUS: Record<string, number> = {
  signal: 14,
  event: 12,
  effect: 10,
  technology: 9,
  vendor: 11,
  solution: 9,
};

// ── Component ────────────────────────────────────────────────────────────────

export function CausalGraph({ data, width: propWidth, height: propHeight, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const simulationRef = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null);

  const renderGraph = useCallback(() => {
    if (!svgRef.current || !containerRef.current || !data?.nodes?.length) return;

    // Stop previous simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const container = containerRef.current;
    const width = propWidth || container.clientWidth;
    const height = propHeight || container.clientHeight || 500;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // Prep data — D3 mutates these objects
    const nodes = data.nodes.map(n => ({ ...n }));
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = data.edges
      .filter(e => nodeIds.has(e.source as string) && nodeIds.has(e.target as string))
      .map(e => ({ ...e }));

    // Count edges per pair for curve offsets
    const pairCount: Record<string, number> = {};
    const pairIndex: Record<string, number> = {};
    edges.forEach(e => {
      const key = [e.source, e.target].sort().join('::');
      pairCount[key] = (pairCount[key] || 0) + 1;
    });

    // Assign curvature
    const edgesWithCurve = edges.map(e => {
      const key = [e.source, e.target].sort().join('::');
      const total = pairCount[key];
      const idx = pairIndex[key] || 0;
      pairIndex[key] = idx + 1;

      let curvature = 0;
      if (total > 1) {
        const range = Math.min(1.2, 0.6 + total * 0.15);
        curvature = ((idx / (total - 1)) - 0.5) * range * 2;
      }
      return { ...e, curvature, pairTotal: total };
    });

    // ── Force simulation (from MiroFish) ─────────────────────────────────
    const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(edgesWithCurve)
        .id((d: unknown) => (d as GraphNode).id)
        .distance((d: unknown) => {
          const e = d as { pairTotal?: number };
          return 140 + ((e.pairTotal || 1) - 1) * 40;
        })
      )
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(45))
      .force('x', d3.forceX(width / 2).strength(0.04))
      .force('y', d3.forceY(height / 2).strength(0.04));

    simulationRef.current = simulation;

    const g = svg.append('g');

    // Zoom
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .extent([[0, 0], [width, height]])
        .scaleExtent([0.2, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        }) as unknown as (selection: d3.Selection<SVGSVGElement, unknown, null, undefined>) => void
    );

    // ── Edge path helpers (quadratic bezier from MiroFish) ───────────────
    type SimEdge = typeof edgesWithCurve[0] & {
      source: { x: number; y: number };
      target: { x: number; y: number };
    };

    const getLinkPath = (d: SimEdge) => {
      const sx = d.source.x, sy = d.source.y;
      const tx = d.target.x, ty = d.target.y;

      if (d.curvature === 0) {
        return `M${sx},${sy} L${tx},${ty}`;
      }

      const dx = tx - sx, dy = ty - sy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const ratio = 0.25 + (d.pairTotal || 1) * 0.05;
      const baseOffset = Math.max(30, dist * ratio);
      const offsetX = -dy / dist * d.curvature * baseOffset;
      const offsetY = dx / dist * d.curvature * baseOffset;
      const cx = (sx + tx) / 2 + offsetX;
      const cy = (sy + ty) / 2 + offsetY;

      return `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`;
    };

    const getLinkMid = (d: SimEdge) => {
      const sx = d.source.x, sy = d.source.y;
      const tx = d.target.x, ty = d.target.y;

      if (d.curvature === 0) {
        return { x: (sx + tx) / 2, y: (sy + ty) / 2 };
      }

      const dx = tx - sx, dy = ty - sy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const ratio = 0.25 + (d.pairTotal || 1) * 0.05;
      const baseOffset = Math.max(30, dist * ratio);
      const offsetX = -dy / dist * d.curvature * baseOffset;
      const offsetY = dx / dist * d.curvature * baseOffset;
      const cx = (sx + tx) / 2 + offsetX;
      const cy = (sy + ty) / 2 + offsetY;

      return {
        x: 0.25 * sx + 0.5 * cx + 0.25 * tx,
        y: 0.25 * sy + 0.5 * cy + 0.25 * ty,
      };
    };

    // ── Edges ────────────────────────────────────────────────────────────
    const linkGroup = g.append('g');

    const link = linkGroup.selectAll('path')
      .data(edgesWithCurve)
      .enter().append('path')
      .attr('stroke', (d) => EDGE_COLORS[d.type] || `${COLORS.border}`)
      .attr('stroke-width', 1.5)
      .attr('fill', 'none')
      .style('cursor', 'pointer');

    // Edge labels
    const linkLabels = linkGroup.selectAll('text')
      .data(edgesWithCurve)
      .enter().append('text')
      .text(d => d.type.replace(/_/g, ' '))
      .attr('font-size', '8px')
      .attr('fill', `${COLORS.text}50`)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-family', "'Space Grotesk', sans-serif")
      .style('display', showLabels ? 'block' : 'none')
      .style('pointer-events', 'none');

    // ── Nodes ────────────────────────────────────────────────────────────
    const nodeGroup = g.append('g');

    const node = nodeGroup.selectAll('circle')
      .data(nodes)
      .enter().append('circle')
      .attr('r', (d) => NODE_RADIUS[(d as GraphNode).type] || 10)
      .attr('fill', (d) => NODE_COLORS[(d as GraphNode).type] || COLORS.muted)
      .attr('stroke', COLORS.bg)
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .call(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        d3.drag<SVGCircleElement, any>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on('click', (_event, d) => {
        const gn = d as unknown as GraphNode;
        setSelectedNode(gn);
        onNodeClick?.(gn);
      })
      .on('mouseenter', function () {
        d3.select(this).attr('stroke', COLORS.accent).attr('stroke-width', 3);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('stroke', COLORS.bg).attr('stroke-width', 2);
      });

    // Node labels
    const nodeLabels = nodeGroup.selectAll('text')
      .data(nodes)
      .enter().append('text')
      .text((d) => {
        const gn = d as unknown as GraphNode;
        return gn.label.length > 20 ? gn.label.slice(0, 20) + '…' : gn.label;
      })
      .attr('font-size', '10px')
      .attr('fill', `${COLORS.text}90`)
      .attr('dx', (d) => (NODE_RADIUS[(d as unknown as GraphNode).type] || 10) + 4)
      .attr('dy', 3)
      .style('pointer-events', 'none')
      .style('font-family', "'Space Grotesk', sans-serif");

    // ── Tick ──────────────────────────────────────────────────────────────
    simulation.on('tick', () => {
      link.attr('d', d => getLinkPath(d as unknown as SimEdge));

      linkLabels.each(function (d) {
        const mid = getLinkMid(d as unknown as SimEdge);
        d3.select(this).attr('x', mid.x).attr('y', mid.y);
      });

      node
        .attr('cx', (d) => (d as d3.SimulationNodeDatum).x!)
        .attr('cy', (d) => (d as d3.SimulationNodeDatum).y!);

      nodeLabels
        .attr('x', (d) => (d as d3.SimulationNodeDatum).x!)
        .attr('y', (d) => (d as d3.SimulationNodeDatum).y!);
    });

    // Click blank to deselect
    svg.on('click', () => setSelectedNode(null));

  }, [data, propWidth, propHeight, showLabels, onNodeClick]);

  useEffect(() => {
    renderGraph();
    return () => {
      if (simulationRef.current) simulationRef.current.stop();
    };
  }, [renderGraph]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => renderGraph();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderGraph]);

  if (!data?.nodes?.length) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: COLORS.dim }}>
        <span className="text-[11px]">No graph data available</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ minHeight: propHeight || 500 }}>
      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full"
        style={{
          background: COLORS.bg,
          borderRadius: '12px',
          border: `1px solid ${COLORS.border}`,
        }}
      />

      {/* Legend */}
      <div
        className="absolute bottom-3 left-3 flex flex-wrap gap-3 px-3 py-2"
        style={{
          background: `${COLORS.card}ee`,
          borderRadius: '8px',
          border: `1px solid ${COLORS.border}`,
        }}
      >
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span className="text-[9px]" style={{ color: COLORS.muted }}>{type}</span>
          </div>
        ))}
      </div>

      {/* Edge labels toggle */}
      <button
        onClick={() => setShowLabels(prev => !prev)}
        className="absolute top-3 right-3 text-[9px] px-2.5 py-1"
        style={{
          background: showLabels ? `${COLORS.accent}20` : COLORS.card,
          border: `1px solid ${showLabels ? `${COLORS.accent}40` : COLORS.border}`,
          borderRadius: '12px',
          color: showLabels ? COLORS.accent : COLORS.dim,
          cursor: 'pointer',
        }}
      >
        {showLabels ? 'Labels ON' : 'Labels OFF'}
      </button>

      {/* Detail panel */}
      {selectedNode && (
        <div
          className="absolute top-3 right-3 w-64 p-4"
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '12px',
            marginTop: 32,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-[8px] tracking-[0.12em] px-2 py-0.5"
              style={{
                background: `${NODE_COLORS[selectedNode.type]}20`,
                border: `1px solid ${NODE_COLORS[selectedNode.type]}40`,
                borderRadius: '6px',
                color: NODE_COLORS[selectedNode.type],
              }}
            >
              {selectedNode.type.toUpperCase()}
            </span>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-[14px]"
              style={{ color: COLORS.dim, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ×
            </button>
          </div>
          <div className="text-[13px] font-medium mb-2" style={{ color: COLORS.text }}>
            {selectedNode.label}
          </div>
          {selectedNode.data && Object.entries(selectedNode.data).map(([key, val]) => (
            <div key={key} className="flex gap-2 mb-1">
              <span className="text-[9px] shrink-0" style={{ color: COLORS.dim }}>{key}:</span>
              <span className="text-[9px]" style={{ color: COLORS.muted }}>
                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
