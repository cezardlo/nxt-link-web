'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { COLORS } from '@/lib/tokens';
import { BottomNav, TopBar } from '@/components/ui';
import { Brain } from '@/lib/brain';
import type { MorningData, BrainSignal } from '@/lib/brain';

// ─── Types ──────────────────────────────────────────────────────────────────

type NodeType = 'industry' | 'technology' | 'vendor' | 'event' | 'region';

interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
  radius: number;
  importance: number;
  description: string;
  related: string[];
  pulsing: boolean;
  emerging: boolean;
}

interface GraphEdge {
  from: string;
  to: string;
  strength: 'strong' | 'weak';
}

// ─── Color map ──────────────────────────────────────────────────────────────

const NODE_COLORS: Record<NodeType, string> = {
  industry:   COLORS.accent,
  technology: COLORS.green,
  vendor:     COLORS.gold,
  event:      COLORS.orange,
  region:     COLORS.dim,
};

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  industry:   'Industry',
  technology: 'Technology',
  vendor:     'Vendor',
  event:      'Event',
  region:     'Region',
};

// ─── Graph builder ──────────────────────────────────────────────────────────

function buildGraph(data: MorningData): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  const { top_signals, industry_movement } = data;

  const industries = new Map<string, { momentum: string; signalCount: number }>();
  for (const mv of industry_movement) industries.set(mv.sector, { momentum: mv.momentum, signalCount: mv.signal_count });
  for (const sig of top_signals) {
    if (!industries.has(sig.industry)) industries.set(sig.industry, { momentum: 'steady', signalCount: 1 });
  }

  const industryList = Array.from(industries.entries()).slice(0, 12);
  const centerX = 500, centerY = 400, industryRadius = 260;

  industryList.forEach(([name, meta], i) => {
    const angle = (i / industryList.length) * Math.PI * 2 - Math.PI / 2;
    const id = `ind-${slug(name)}`;
    if (seen.has(id)) return;
    seen.add(id);
    const isSurging = meta.momentum === 'surging' || meta.momentum === 'accelerating';
    nodes.push({
      id, label: name, type: 'industry',
      x: centerX + Math.cos(angle) * industryRadius,
      y: centerY + Math.sin(angle) * industryRadius,
      radius: isSurging ? 28 : 22,
      importance: Math.min(1, meta.signalCount / 10),
      description: `${meta.momentum} momentum, ${meta.signalCount} signal${meta.signalCount !== 1 ? 's' : ''}`,
      related: [], pulsing: isSurging, emerging: false,
    });
  });

  const industrySignals = new Map<string, BrainSignal[]>();
  for (const sig of top_signals.slice(0, 30)) {
    const arr = industrySignals.get(sig.industry) || [];
    arr.push(sig);
    industrySignals.set(sig.industry, arr);
  }

  industrySignals.forEach((signals, indName) => {
    const parentId = `ind-${slug(indName)}`;
    const parentNode = nodes.find((n) => n.id === parentId);
    if (!parentNode) return;
    signals.forEach((sig, j) => {
      const id = `evt-${slug(sig.title).slice(0, 40)}-${j}`;
      if (seen.has(id)) return;
      seen.add(id);
      const orbitR = 80 + j * 30;
      const orbitAngle = (j / Math.max(signals.length, 1)) * Math.PI * 2 + Math.random() * 0.3;
      const isImportant = sig.importance >= 0.85;
      const nodeType: NodeType =
        sig.signal_type === 'technology_trend' ? 'technology'
        : sig.signal_type === 'vendor_activity' ? 'vendor'
        : sig.signal_type === 'regulatory_action' ? 'region'
        : 'event';
      nodes.push({
        id, label: sig.title.length > 50 ? sig.title.slice(0, 48) + '...' : sig.title,
        type: nodeType,
        x: parentNode.x + Math.cos(orbitAngle) * orbitR,
        y: parentNode.y + Math.sin(orbitAngle) * orbitR,
        radius: isImportant ? 14 : 9, importance: sig.importance,
        description: `${sig.signal_type.replace(/_/g, ' ')} | importance: ${Math.round(sig.importance * 100)}%`,
        related: [parentId], pulsing: isImportant,
        emerging: sig.signal_type === 'emerging_tech' || sig.importance < 0.4,
      });
      edges.push({ from: parentId, to: id, strength: isImportant ? 'strong' : 'weak' });
      parentNode.related.push(id);
    });
  });

  const industryNodes = nodes.filter((n) => n.type === 'industry');
  for (let a = 0; a < industryNodes.length; a++) {
    for (let b = a + 1; b < industryNodes.length; b++) {
      const aSignals = industrySignals.get(industryNodes[a].label) || [];
      const bSignals = industrySignals.get(industryNodes[b].label) || [];
      const aTypes = new Set(aSignals.map((s) => s.signal_type));
      const bTypes = new Set(bSignals.map((s) => s.signal_type));
      const overlap = [...aTypes].filter((t) => bTypes.has(t));
      if (overlap.length > 0) {
        edges.push({ from: industryNodes[a].id, to: industryNodes[b].id, strength: overlap.length >= 2 ? 'strong' : 'weak' });
        industryNodes[a].related.push(industryNodes[b].id);
        industryNodes[b].related.push(industryNodes[a].id);
      }
    }
  }

  for (const n of nodes) {
    n.x = Math.max(50, Math.min(950, n.x));
    n.y = Math.max(50, Math.min(750, n.y));
  }
  return { nodes: nodes.slice(0, 40), edges };
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Loading ────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-24">
      <div className="relative flex items-center justify-center w-24 h-24">
        <div className="absolute inset-0 rounded-full border animate-ping" style={{ borderColor: `${COLORS.accent}20`, animationDuration: '2s' }} />
        <div className="absolute inset-3 rounded-full border animate-ping" style={{ borderColor: `${COLORS.accent}40`, animationDuration: '2s', animationDelay: '0.5s' }} />
        <div className="absolute inset-6 rounded-full border animate-ping" style={{ borderColor: `${COLORS.accent}60`, animationDuration: '2s', animationDelay: '1s' }} />
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.accent, boxShadow: `0 0 16px ${COLORS.accent}cc` }} />
      </div>
      <p className="font-mono text-[11px] tracking-[0.25em] uppercase" style={{ color: COLORS.accent }}>
        Building knowledge graph...
      </p>
    </div>
  );
}

// ─── SVG Graph Canvas ───────────────────────────────────────────────────────

function GraphCanvas({
  nodes, edges, selectedId, hoveredId, onSelect, onHover,
}: {
  nodes: GraphNode[]; edges: GraphEdge[];
  selectedId: string | null; hoveredId: string | null;
  onSelect: (id: string | null) => void; onHover: (id: string | null) => void;
}) {
  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const highlightSet = useMemo(() => {
    const active = hoveredId ?? selectedId;
    if (!active) return new Set<string>();
    const node = nodeMap.get(active);
    if (!node) return new Set<string>([active]);
    return new Set([active, ...node.related]);
  }, [hoveredId, selectedId, nodeMap]);

  const hasHighlight = highlightSet.size > 0;

  return (
    <svg viewBox="0 0 1000 800" className="w-full h-full" style={{ minHeight: 400 }} aria-label="Knowledge graph visualization">
      <defs>
        {(Object.entries(NODE_COLORS) as [NodeType, string][]).map(([type, color]) => (
          <filter key={type} id={`glow-${type}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor={color} floodOpacity="0.6" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        ))}
        <filter id="glow-active" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feFlood floodColor={COLORS.accent} floodOpacity="0.8" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="shadow" />
          <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <pattern id="dot-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="0.5" fill="white" opacity="0.04" />
        </pattern>
      </defs>

      <rect width="1000" height="800" fill={COLORS.bg} />
      <rect width="1000" height="800" fill="url(#dot-grid)" />

      {edges.map((edge, i) => {
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        if (!fromNode || !toNode) return null;
        const edgeActive = hasHighlight && (highlightSet.has(edge.from) && highlightSet.has(edge.to));
        const edgeDim = hasHighlight && !edgeActive;
        return (
          <line key={`e-${i}`} x1={fromNode.x} y1={fromNode.y} x2={toNode.x} y2={toNode.y}
            stroke={edgeActive ? COLORS.accent : 'white'}
            strokeOpacity={edgeDim ? 0.03 : edgeActive ? 0.35 : 0.06}
            strokeWidth={edge.strength === 'strong' ? 1.5 : 0.8}
            strokeDasharray={edge.strength === 'weak' ? '4 4' : undefined}
          />
        );
      })}

      {nodes.map((node) => {
        const color = NODE_COLORS[node.type];
        const isSelected = selectedId === node.id;
        const isHovered = hoveredId === node.id;
        const isActive = isSelected || isHovered;
        const isRelated = highlightSet.has(node.id);
        const isDim = hasHighlight && !isRelated;
        const showLabel = isActive || isSelected || isHovered;

        return (
          <g key={node.id} onClick={() => onSelect(isSelected ? null : node.id)}
            onMouseEnter={() => onHover(node.id)} onMouseLeave={() => onHover(null)}
            style={{ cursor: 'pointer' }}
          >
            {node.pulsing && !isDim && (
              <circle cx={node.x} cy={node.y} r={node.radius + 8}
                fill="none" stroke={color} strokeOpacity={0.25} strokeWidth={1} className="live-pulse" />
            )}
            <circle cx={node.x} cy={node.y}
              r={isActive ? node.radius * 1.2 : node.radius}
              fill={isDim ? `${color}15` : isActive ? color : `${color}55`}
              stroke={color}
              strokeWidth={isActive ? 2 : node.emerging ? 1.2 : 0.8}
              strokeOpacity={isDim ? 0.15 : isActive ? 1 : 0.5}
              strokeDasharray={node.emerging ? '3 3' : undefined}
              filter={isActive ? 'url(#glow-active)' : isDim ? undefined : `url(#glow-${node.type})`}
              style={{ transition: 'r 0.2s ease, fill 0.2s ease, stroke-opacity 0.2s ease' }}
            />
            {node.importance >= 0.7 && !isDim && (
              <circle cx={node.x} cy={node.y} r={3} fill="white" opacity={isActive ? 0.9 : 0.5} />
            )}
            {(showLabel || (node.type === 'industry' && !isDim)) && (
              <g>
                <rect x={node.x - Math.min(node.label.length * 3.2, 80)} y={node.y + node.radius + 6}
                  width={Math.min(node.label.length * 6.4, 160)} height={16} rx={8}
                  fill={COLORS.bg} fillOpacity={0.85} stroke={color} strokeOpacity={0.2} strokeWidth={0.5} />
                <text x={node.x} y={node.y + node.radius + 17} textAnchor="middle"
                  fill={isActive ? color : 'white'}
                  fillOpacity={isDim ? 0.2 : isActive ? 1 : 0.6}
                  fontSize={node.type === 'industry' ? 9 : 7.5}
                  fontFamily="'IBM Plex Mono', monospace"
                  fontWeight={node.type === 'industry' ? 600 : 400}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  {node.label.length > 24 ? node.label.slice(0, 22) + '...' : node.label}
                </text>
              </g>
            )}
            {isActive && (
              <text x={node.x} y={node.y - node.radius - 8} textAnchor="middle"
                fill={color} fillOpacity={0.6} fontSize={6}
                fontFamily="'IBM Plex Mono', monospace"
                style={{ textTransform: 'uppercase', letterSpacing: '0.15em' }}
              >
                {NODE_TYPE_LABELS[node.type]}
              </text>
            )}
          </g>
        );
      })}

      {/* Legend */}
      <g transform="translate(20, 20)">
        <rect x={0} y={0} width={120} height={108} rx={12} fill={COLORS.surface} fillOpacity={0.9} stroke={COLORS.border} strokeWidth={0.5} />
        <text x={10} y={16} fill={COLORS.muted} fontSize={7} fontFamily="'IBM Plex Mono', monospace" style={{ letterSpacing: '0.15em' }}>
          NODE TYPES
        </text>
        {(Object.entries(NODE_COLORS) as [NodeType, string][]).map(([type, color], i) => (
          <g key={type} transform={`translate(10, ${28 + i * 16})`}>
            <circle cx={5} cy={0} r={4} fill={color} fillOpacity={0.6} stroke={color} strokeWidth={0.5} />
            <text x={16} y={3} fill={COLORS.muted} fontSize={7} fontFamily="'IBM Plex Mono', monospace" style={{ textTransform: 'uppercase' }}>
              {type}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ─── Side Panel ─────────────────────────────────────────────────────────────

function SidePanel({ node, allNodes, onSelectNode, onClose }: {
  node: GraphNode; allNodes: GraphNode[]; onSelectNode: (id: string) => void; onClose: () => void;
}) {
  const color = NODE_COLORS[node.type];
  const relatedNodes = allNodes.filter((n) => node.related.includes(n.id));

  return (
    <div className="flex flex-col gap-5 p-5 h-full overflow-y-auto" style={{ background: COLORS.surface }}>
      <button onClick={onClose} className="self-end font-mono text-[9px] tracking-[0.2em] uppercase transition-colors cursor-pointer bg-transparent border-none"
        style={{ color: `${COLORS.text}25` }}>CLOSE</button>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}88` }} />
          <span className="font-mono text-[8px] tracking-[0.2em] uppercase" style={{ color }}>{NODE_TYPE_LABELS[node.type]}</span>
        </div>
        <h2 className="font-grotesk text-[14px] font-semibold leading-snug" style={{ color: `${COLORS.text}dd` }}>{node.label}</h2>
      </div>

      <p className="font-grotesk text-[11px] font-light leading-relaxed" style={{ color: `${COLORS.text}40` }}>{node.description}</p>

      {/* Importance bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[8px] tracking-[0.15em] uppercase" style={{ color: `${COLORS.text}22` }}>Importance</span>
          <span className="font-mono text-[10px] font-bold" style={{ color }}>{Math.round(node.importance * 100)}%</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: `${color}12` }}>
          <div className="h-full rounded-full" style={{ width: `${Math.round(node.importance * 100)}%`, backgroundColor: color }} />
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        {node.pulsing && (
          <span className="font-mono text-[7px] tracking-[0.2em] px-2.5 py-0.5 rounded-full uppercase"
            style={{ color: COLORS.green, backgroundColor: `${COLORS.green}0a`, border: `1px solid ${COLORS.green}20` }}>LIVE</span>
        )}
        {node.emerging && (
          <span className="font-mono text-[7px] tracking-[0.2em] px-2.5 py-0.5 rounded-full uppercase"
            style={{ color: COLORS.amber, backgroundColor: `${COLORS.amber}0a`, border: `1px solid ${COLORS.amber}20` }}>EMERGING</span>
        )}
        <span className="font-mono text-[7px] tracking-[0.2em] px-2.5 py-0.5 rounded-full uppercase"
          style={{ color: COLORS.muted, backgroundColor: `${COLORS.muted}0a`, border: `1px solid ${COLORS.muted}20` }}>
          {relatedNodes.length} CONNECTION{relatedNodes.length !== 1 ? 'S' : ''}
        </span>
      </div>

      <div className="h-px" style={{ backgroundColor: COLORS.border }} />

      {relatedNodes.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[8px] tracking-[0.2em] uppercase" style={{ color: `${COLORS.text}22` }}>Connected Nodes</span>
          <div className="flex flex-col gap-1">
            {relatedNodes.slice(0, 12).map((rn) => (
              <button key={rn.id} onClick={() => onSelectNode(rn.id)}
                className="flex items-center gap-2 px-3 py-2 text-left transition-colors cursor-pointer bg-transparent border-none hover:bg-white/[0.03]"
                style={{ borderRadius: '12px' }}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: NODE_COLORS[rn.type] }} />
                <span className="font-mono text-[9px] leading-tight truncate" style={{ color: `${COLORS.text}50` }}>{rn.label}</span>
                <span className="font-mono text-[7px] ml-auto shrink-0 uppercase" style={{ color: `${COLORS.text}18` }}>{rn.type}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="h-px" style={{ backgroundColor: COLORS.border }} />

      <Link href={`/search?q=${encodeURIComponent(node.label)}`}
        className="flex items-center justify-center gap-2 px-4 py-3 font-mono text-[9px] tracking-[0.2em] uppercase transition-all no-underline"
        style={{ color: COLORS.accent, backgroundColor: `${COLORS.accent}08`, border: `1px solid ${COLORS.accent}20`, borderRadius: '20px' }}
      >
        Search this topic
      </Link>
    </div>
  );
}

// ─── CSS animation ──────────────────────────────────────────────────────────

const GRAPH_CSS = `
@keyframes live-pulse-ring {
  0% { r: inherit; stroke-opacity: 0.3; }
  50% { stroke-opacity: 0.08; }
  100% { r: inherit; stroke-opacity: 0.3; }
}
.live-pulse { animation: live-pulse-ring 2.5s ease-in-out infinite; }
`;

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TrajectoryGraphPage() {
  const [loading, setLoading] = useState(true);
  const [morningData, setMorningData] = useState<MorningData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try { const data = await Brain.morning(); if (!cancelled) setMorningData(data); }
      catch { /* fallback: empty state */ }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const { nodes, edges } = useMemo(() => {
    if (!morningData) return { nodes: [], edges: [] };
    return buildGraph(morningData);
  }, [morningData]);

  const selectedNode = useMemo(() => {
    if (!selectedId) return null;
    return nodes.find((n) => n.id === selectedId) ?? null;
  }, [selectedId, nodes]);

  useEffect(() => { setPanelOpen(!!selectedNode); }, [selectedNode]);

  const handleSelect = useCallback((id: string | null) => { setSelectedId(id); }, []);
  const handleHover = useCallback((id: string | null) => { setHoveredId(id); }, []);
  const handleClosePanel = useCallback(() => { setSelectedId(null); setPanelOpen(false); }, []);

  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const liveCount = nodes.filter((n) => n.pulsing).length;

  return (
    <div className="min-h-screen animate-fade-up pb-24" style={{ background: COLORS.bg, color: COLORS.text }}>
      <style dangerouslySetInnerHTML={{ __html: GRAPH_CSS }} />
      <TopBar />

      {/* Page header */}
      <div className="px-6 sm:px-8 py-5" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <div className="w-px h-5" style={{ backgroundColor: COLORS.accent, boxShadow: `0 0 8px ${COLORS.accent}cc` }} />
              <h1 className="font-grotesk text-[16px] sm:text-[20px] font-semibold tracking-tight" style={{ color: `${COLORS.text}dd` }}>
                Knowledge Graph
              </h1>
              {liveCount > 0 && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: `${COLORS.green}08`, border: `1px solid ${COLORS.green}18` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse-soft" style={{ backgroundColor: COLORS.green, boxShadow: `0 0 6px ${COLORS.green}cc` }} />
                  <span className="font-mono text-[7px] tracking-[0.25em]" style={{ color: COLORS.green }}>{liveCount} LIVE</span>
                </span>
              )}
            </div>
            <p className="font-grotesk text-[12px] font-light pl-5" style={{ color: `${COLORS.text}25` }}>
              Signal topology across industries and events
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4">
            {[
              { label: 'Nodes', value: nodeCount, color: COLORS.accent },
              { label: 'Edges', value: edgeCount, color: `${COLORS.text}45` },
              { label: 'Industries', value: nodes.filter((n) => n.type === 'industry').length, color: COLORS.gold },
            ].map((stat, i) => (
              <div key={stat.label} className="flex items-center gap-1.5">
                {i > 0 && <div className="h-3 w-px" style={{ background: `${COLORS.text}10` }} />}
                <span className="font-mono text-[7px] tracking-[0.2em] uppercase ml-2" style={{ color: `${COLORS.text}20` }}>{stat.label}</span>
                <span className="font-mono text-[10px] font-bold" style={{ color: stat.color }}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      {loading ? (
        <LoadingState />
      ) : nodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
          <p className="font-grotesk text-[13px] font-light" style={{ color: `${COLORS.text}20` }}>
            No signals available to build the knowledge graph.
          </p>
          <p className="font-mono text-[10px]" style={{ color: `${COLORS.text}12` }}>
            Intelligence pipeline is warming up. Check back shortly.
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="flex flex-col lg:flex-row pb-16" style={{ minHeight: 'calc(100vh - 120px)' }}>
          <div className="flex-1 relative overflow-hidden" style={{ minHeight: 500 }}>
            <GraphCanvas nodes={nodes} edges={edges} selectedId={selectedId} hoveredId={hoveredId} onSelect={handleSelect} onHover={handleHover} />
            {!selectedId && !hoveredId && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2.5"
                style={{ backgroundColor: `${COLORS.surface}dd`, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}
              >
                <span className="font-mono text-[9px] tracking-[0.15em]" style={{ color: `${COLORS.text}25` }}>
                  HOVER OR TAP A NODE TO EXPLORE
                </span>
              </div>
            )}
          </div>

          {panelOpen && selectedNode && (
            <>
              <div className="hidden lg:block w-[280px] shrink-0" style={{ borderLeft: `1px solid ${COLORS.border}` }}>
                <SidePanel node={selectedNode} allNodes={nodes} onSelectNode={handleSelect} onClose={handleClosePanel} />
              </div>
              <div className="lg:hidden fixed bottom-[52px] left-0 right-0 z-[80] max-h-[60vh] overflow-y-auto"
                style={{ borderTop: `1px solid ${COLORS.border}`, background: COLORS.surface, borderRadius: '24px 24px 0 0' }}
              >
                <div className="flex justify-center py-2">
                  <div className="w-8 h-1 rounded-full" style={{ background: `${COLORS.text}12` }} />
                </div>
                <SidePanel node={selectedNode} allNodes={nodes} onSelectNode={handleSelect} onClose={handleClosePanel} />
              </div>
            </>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
