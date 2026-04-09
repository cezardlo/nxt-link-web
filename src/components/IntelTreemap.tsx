'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useRouter } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────────────────────────

type TreemapNode = {
  id: string;
  label: string;
  emoji: string;
  slug: string;
  value: number;
  rising: number;
  falling: number;
  emerging: number;
  disrupting: number;
  stable: number;
  ep_direct: number;
  ep_relevant: number;
  dominant_direction: string;
  momentum_pct: number;
};

type HoveredNode = TreemapNode & { x: number; y: number };

// ── Color system ──────────────────────────────────────────────────────────────

function directionColor(dir: string, momentum_pct: number): string {
  switch (dir) {
    case 'disrupting': return '#F97316'; // orange
    case 'rising':     return momentum_pct > 20 ? '#10B981' : '#059669'; // bright vs deep green
    case 'emerging':   return '#0EA5E9'; // teal
    case 'falling':    return '#EF4444'; // red
    default:           return '#1F2937'; // dark gray
  }
}

function directionLabel(dir: string): string {
  switch (dir) {
    case 'disrupting': return '⚡ DISRUPTING';
    case 'rising':     return '↑ RISING';
    case 'emerging':   return '◆ EMERGING';
    case 'falling':    return '↓ FALLING';
    default:           return '→ STABLE';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function IntelTreemap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [nodes, setNodes] = useState<TreemapNode[]>([]);
  const [hovered, setHovered] = useState<HoveredNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalSignals, setTotalSignals] = useState(0);

  // Fetch treemap data
  useEffect(() => {
    fetch('/api/intel/treemap')
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setNodes(d.nodes ?? []);
          setTotalSignals(d.total_signals ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Build treemap with D3
  useEffect(() => {
    if (!nodes.length || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const W = container.offsetWidth;
    const H = Math.max(360, Math.min(520, W * 0.55));

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', W).attr('height', H);

    // Build hierarchy
    const root = d3.hierarchy({ id: 'root', children: nodes } as any)
      .sum((d: any) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    d3.treemap<any>()
      .size([W, H])
      .paddingOuter(4)
      .paddingInner(3)
      .round(true)(root);

    const leaves = root.leaves();
    const g = svg.append('g');

    leaves.forEach((leaf: any) => {
      const d = leaf.data as TreemapNode;
      const x0 = leaf.x0, y0 = leaf.y0, x1 = leaf.x1, y1 = leaf.y1;
      const w = x1 - x0, h = y1 - y0;
      if (w < 4 || h < 4) return;

      const baseColor = directionColor(d.dominant_direction, d.momentum_pct);
      const cell = g.append('g')
        .attr('transform', `translate(${x0},${y0})`)
        .style('cursor', 'pointer');

      // Background rect
      cell.append('rect')
        .attr('width', w)
        .attr('height', h)
        .attr('rx', 6)
        .attr('fill', baseColor)
        .attr('fill-opacity', 0.15)
        .attr('stroke', baseColor)
        .attr('stroke-opacity', 0.5)
        .attr('stroke-width', 1.5);

      // Momentum fill bar (bottom strip)
      if (d.momentum_pct > 0 && h > 24) {
        const barH = Math.max(3, Math.min(6, h * 0.08));
        cell.append('rect')
          .attr('y', h - barH)
          .attr('width', (d.momentum_pct / 100) * w)
          .attr('height', barH)
          .attr('rx', 3)
          .attr('fill', baseColor)
          .attr('fill-opacity', 0.7);
      }

      // Label content (only if cell is large enough)
      if (w > 50 && h > 40) {
        const fontSize = Math.max(9, Math.min(14, w / 7));
        const padding = 8;

        // Emoji + label
        cell.append('text')
          .attr('x', padding)
          .attr('y', padding + fontSize)
          .attr('font-size', fontSize)
          .attr('font-weight', '700')
          .attr('fill', 'rgba(255,255,255,0.95)')
          .attr('font-family', 'system-ui, sans-serif')
          .text(`${d.emoji} ${d.label}`);

        // Signal count
        if (h > 60) {
          cell.append('text')
            .attr('x', padding)
            .attr('y', padding + fontSize * 2.4)
            .attr('font-size', Math.max(8, fontSize - 3))
            .attr('fill', 'rgba(255,255,255,0.6)')
            .attr('font-family', 'monospace')
            .text(`${d.value.toLocaleString()} signals`);
        }

        // Direction badge (large cells only)
        if (w > 100 && h > 80) {
          cell.append('text')
            .attr('x', padding)
            .attr('y', h - (h > 24 ? 14 : 8))
            .attr('font-size', Math.max(7, fontSize - 4))
            .attr('font-weight', '800')
            .attr('fill', baseColor)
            .attr('fill-opacity', 0.9)
            .attr('font-family', 'monospace')
            .text(directionLabel(d.dominant_direction));
        }

        // EP badge (top right corner, large cells only)
        if (d.ep_direct > 0 && w > 100 && h > 50) {
          const badgeText = `${d.ep_direct} EP`;
          const bw = badgeText.length * 6 + 8;
          const bx = w - bw - 6, by = 6;

          cell.append('rect')
            .attr('x', bx).attr('y', by)
            .attr('width', bw).attr('height', 16)
            .attr('rx', 4)
            .attr('fill', '#0EA5E9')
            .attr('fill-opacity', 0.25)
            .attr('stroke', '#0EA5E9')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', 1);

          cell.append('text')
            .attr('x', bx + 4).attr('y', by + 11)
            .attr('font-size', 8)
            .attr('font-weight', '800')
            .attr('fill', '#38BDF8')
            .attr('font-family', 'monospace')
            .text(badgeText);
        }
      }

      // Click → sector page
      cell.on('click', () => {
        router.push(`/sector/${d.slug}`);
      });

      // Hover tooltip
      cell.on('mouseenter', (event: MouseEvent) => {
        d3.select(event.currentTarget as SVGGElement)
          .select('rect')
          .attr('stroke-opacity', 1)
          .attr('fill-opacity', 0.28);

        const rect = (event.currentTarget as SVGGElement).getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        setHovered({
          ...d,
          x: rect.left - containerRect.left + w / 2,
          y: rect.top - containerRect.top,
        });
      });

      cell.on('mouseleave', (event: MouseEvent) => {
        d3.select(event.currentTarget as SVGGElement)
          .select('rect')
          .attr('stroke-opacity', 0.5)
          .attr('fill-opacity', 0.15);
        setHovered(null);
      });
    });
  }, [nodes, router]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-bold text-gray-500 tracking-widest uppercase">SIGNAL INTELLIGENCE MAP</div>
          <div className="text-[11px] text-gray-600 mt-0.5">
            {loading ? 'Loading...' : `${totalSignals.toLocaleString()} signals · sized by volume · colored by momentum`}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold tracking-wide">
          <span className="text-emerald-400">↑ RISING</span>
          <span className="text-cyan-400">◆ EMERGING</span>
          <span className="text-orange-400">⚡ DISRUPTING</span>
          <span className="text-red-400">↓ FALLING</span>
          <span className="text-gray-600">→ STABLE</span>
        </div>
      </div>

      {/* Treemap container */}
      <div ref={containerRef} className="relative w-full bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] text-gray-600 tracking-widest uppercase">Mapping signals...</span>
            </div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-600 text-sm">No signal data available</div>
        ) : (
          <svg ref={svgRef} className="w-full block" />
        )}

        {/* Hover tooltip */}
        {hovered && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{ left: Math.min(hovered.x, (containerRef.current?.offsetWidth ?? 500) - 200), top: Math.max(8, hovered.y - 160) }}
          >
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 shadow-2xl min-w-[180px] text-left">
              <div className="text-sm font-bold text-white mb-1">{hovered.emoji} {hovered.label}</div>
              <div className="text-[11px] text-gray-400 mb-2">{hovered.value.toLocaleString()} signals</div>
              <div className="space-y-0.5 text-[10px] font-mono">
                {hovered.rising > 0 && <div className="text-emerald-400">↑ {hovered.rising} rising</div>}
                {hovered.emerging > 0 && <div className="text-cyan-400">◆ {hovered.emerging} emerging</div>}
                {hovered.disrupting > 0 && <div className="text-orange-400">⚡ {hovered.disrupting} disrupting</div>}
                {hovered.falling > 0 && <div className="text-red-400">↓ {hovered.falling} falling</div>}
                {hovered.stable > 0 && <div className="text-gray-500">→ {hovered.stable} stable</div>}
              </div>
              {(hovered.ep_direct > 0 || hovered.ep_relevant > 0) && (
                <div className="mt-2 pt-2 border-t border-gray-700 text-[10px]">
                  {hovered.ep_direct > 0 && <div className="text-cyan-300 font-bold">⚑ {hovered.ep_direct} EP DIRECT</div>}
                  {hovered.ep_relevant > 0 && <div className="text-cyan-500">{hovered.ep_relevant} EP RELEVANT</div>}
                </div>
              )}
              <div className="mt-2 text-[10px] text-gray-600">Click to open sector →</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
