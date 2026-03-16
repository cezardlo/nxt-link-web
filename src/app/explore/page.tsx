'use client';

import { useState, useMemo } from 'react';
import { ExploreGraph } from '@/components/ExploreGraph';
import type { ExploreNodeData } from '@/components/ExploreGraph';

// ── Category config (mirrors ExploreGraph) ────────────────────────────────────

const CATEGORY_FILTERS = [
  { key: 'all', label: 'ALL', color: '#ffffff' },
  { key: 'industries', label: 'INDUSTRIES', color: '#3b82f6' },
  { key: 'problems', label: 'PROBLEMS', color: '#f97316' },
  { key: 'technologies', label: 'TECHNOLOGIES', color: '#a855f7' },
  { key: 'companies', label: 'COMPANIES', color: '#00ff88' },
  { key: 'signals', label: 'SIGNALS', color: '#ff3b30' },
] as const;

const LEGEND_ITEMS = CATEGORY_FILTERS.slice(1); // exclude 'all'

// ── Connection lookup for detail panel ────────────────────────────────────────

const CONNECTION_MAP: Record<string, string[]> = {
  // Industries → connected problems
  cybersecurity: ['Data Breaches', 'Supply Chain Attacks'],
  'ai-ml': ['Drug Discovery Speed', 'Autonomous Operations'],
  defense: ['Predictive Maintenance', 'Autonomous Operations'],
  energy: ['Grid Reliability'],
  healthcare: ['Data Breaches', 'Drug Discovery Speed'],
  manufacturing: ['Supply Chain Attacks', 'Predictive Maintenance'],
  // Problems → connected technologies
  'data-breaches': ['Zero Trust Architecture', 'Quantum Cryptography'],
  'supply-chain-attacks': ['Zero Trust Architecture'],
  'grid-reliability': ['Digital Twins', 'Edge Computing'],
  'predictive-maintenance': ['Digital Twins', 'Computer Vision'],
  'drug-discovery': ['Large Language Models'],
  'autonomous-ops': ['Large Language Models', 'Edge Computing', 'Computer Vision'],
  // Technologies → connected companies
  'zero-trust': ['CrowdStrike', 'Palo Alto Networks'],
  llm: ['OpenAI', 'NVIDIA', 'Palantir'],
  'digital-twin': ['Siemens'],
  'edge-compute': ['NVIDIA'],
  'quantum-crypto': [],
  'computer-vision': ['NVIDIA', 'Palantir'],
  // Companies → connected signals
  crowdstrike: ['CrowdStrike Q4 Revenue +33%', 'DOD Zero Trust Mandate'],
  openai: ['OpenAI GPT-5 Launch'],
  siemens: ['Siemens $2B Digital Twin Contract'],
  nvidia: ['NVIDIA Blackwell Chip Release'],
  palantir: ['Palantir AIP Army Contract'],
  'palo-alto': ['DOD Zero Trust Mandate'],
  // Signals
  'sig-1': ['CrowdStrike'],
  'sig-2': ['OpenAI'],
  'sig-3': ['Siemens'],
  'sig-4': ['NVIDIA'],
  'sig-5': ['CrowdStrike', 'Palo Alto Networks'],
  'sig-6': ['Palantir'],
};

// ── Page link resolver ────────────────────────────────────────────────────────

function getPageLink(node: ExploreNodeData): string | null {
  if (node.type === 'industry') return `/industry/${node.id}`;
  if (node.type === 'company') return `/vendor/${node.id}`;
  return null;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const [selectedNode, setSelectedNode] = useState<ExploreNodeData | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const handleNodeSelect = (node: ExploreNodeData) => {
    setSelectedNode(node);
  };

  const connections = useMemo(() => {
    if (!selectedNode) return [];
    return CONNECTION_MAP[selectedNode.id] ?? [];
  }, [selectedNode]);

  const pageLink = useMemo(() => {
    if (!selectedNode) return null;
    return getPageLink(selectedNode);
  }, [selectedNode]);

  const categoryColor = useMemo(() => {
    if (!selectedNode) return '#ffffff';
    const cat = LEGEND_ITEMS.find((c) => c.key === selectedNode.category);
    return cat ? cat.color : '#ffffff';
  }, [selectedNode]);

  return (
    <div className="bg-black min-h-screen pl-16 md:pl-16 flex flex-col">
      {/* ── Top bar ── */}
      <div className="flex-shrink-0 border-b border-white/[0.06] px-6 py-4 flex items-center gap-4 flex-wrap">
        {/* Title */}
        <div className="flex items-center gap-3 mr-4">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]" style={{ boxShadow: '0 0 6px #00d4ffcc' }} />
          <h1 className="font-mono text-[11px] tracking-[0.25em] text-white/70 uppercase">
            Explore Connections
          </h1>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entities..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-sm px-3 py-1.5 font-mono text-[9px] text-white/60 placeholder-white/20 outline-none focus:border-[#00d4ff]/30 transition-colors"
          />
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-1">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveFilter(cat.key)}
              className="font-mono text-[8px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-sm border transition-colors"
              style={{
                color: activeFilter === cat.key ? cat.color : 'rgba(255,255,255,0.25)',
                borderColor: activeFilter === cat.key ? `${cat.color}40` : 'rgba(255,255,255,0.06)',
                backgroundColor: activeFilter === cat.key ? `${cat.color}10` : 'transparent',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Graph */}
        <div className="flex-1 relative">
          <ExploreGraph onNodeSelect={handleNodeSelect} />

          {/* Legend — bottom left */}
          <div className="absolute bottom-4 left-4 z-10 bg-black/80 border border-white/[0.08] rounded-sm px-3 py-2.5 backdrop-blur-md">
            <span className="font-mono text-[7px] tracking-[0.2em] text-white/30 uppercase block mb-2">
              Legend
            </span>
            <div className="flex flex-col gap-1.5">
              {LEGEND_ITEMS.map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: item.color,
                      boxShadow: `0 0 4px ${item.color}cc`,
                    }}
                  />
                  <span className="font-mono text-[7px] tracking-[0.15em] text-white/40">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* FIT button — bottom right */}
          <button
            className="absolute bottom-4 right-4 z-10 font-mono text-[7px] tracking-[0.2em] text-white/25 hover:text-[#00d4ff] px-3 py-1.5 border border-white/[0.08] hover:border-[#00d4ff]/30 rounded-sm transition-colors bg-black/60 backdrop-blur-md"
            onClick={() => {
              // Access cytoscape instance through the component
              const cyEl = document.querySelector('[data-cy]') as HTMLElement | null;
              if (cyEl) {
                // fallback — graph handles its own fit
              }
            }}
          >
            FIT VIEW
          </button>
        </div>

        {/* ── Right detail panel (slides in on node select) ── */}
        <div
          className="flex-shrink-0 border-l border-white/[0.06] bg-black/92 backdrop-blur-md overflow-y-auto transition-all duration-300 ease-out"
          style={{
            width: selectedNode ? 300 : 0,
            opacity: selectedNode ? 1 : 0,
            padding: selectedNode ? undefined : 0,
          }}
        >
          {selectedNode && (
            <div className="p-4 w-[300px]">
              {/* Close */}
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[7px] tracking-[0.2em] text-white/30 uppercase">
                  Node Detail
                </span>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="font-mono text-[9px] text-white/20 hover:text-white/50 transition-colors"
                >
                  [x]
                </button>
              </div>

              {/* Node name */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: categoryColor,
                    boxShadow: `0 0 6px ${categoryColor}cc`,
                  }}
                />
                <span className="font-mono text-[11px] text-white/80 font-medium">
                  {selectedNode.label}
                </span>
              </div>

              {/* Type / Category */}
              <div className="flex items-center gap-2 mb-5">
                <span
                  className="font-mono text-[7px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm border"
                  style={{
                    color: categoryColor,
                    borderColor: `${categoryColor}30`,
                    backgroundColor: `${categoryColor}10`,
                  }}
                >
                  {selectedNode.type}
                </span>
                <span className="font-mono text-[7px] tracking-[0.1em] text-white/20 uppercase">
                  {selectedNode.category}
                </span>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-white/[0.06] mb-4" />

              {/* Connected entities */}
              <div className="mb-5">
                <span className="font-mono text-[7px] tracking-[0.2em] text-white/30 uppercase block mb-2">
                  Connected Entities
                </span>
                {connections.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {connections.map((conn) => (
                      <div
                        key={conn}
                        className="flex items-center gap-2 px-2 py-1.5 bg-white/[0.02] border border-white/[0.04] rounded-sm"
                      >
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="font-mono text-[8px] text-white/50">
                          {conn}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="font-mono text-[8px] text-white/20">
                    No direct connections mapped
                  </span>
                )}
              </div>

              {/* Open Page link */}
              {pageLink && (
                <a
                  href={pageLink}
                  className="block w-full text-center font-mono text-[8px] tracking-[0.2em] uppercase py-2 border rounded-sm transition-colors"
                  style={{
                    color: categoryColor,
                    borderColor: `${categoryColor}30`,
                    backgroundColor: `${categoryColor}08`,
                  }}
                >
                  Open Page &rarr;
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
