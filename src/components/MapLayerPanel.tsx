'use client';

import { useEffect, useState } from 'react';

import type { LayerState } from '@/app/map/page';

type LayerDef = {
  key: keyof LayerState;
  label: string;
  color: string;
};

type Group = {
  label: string;
  accent: string;
  layers: LayerDef[];
};

const GROUPS: Group[] = [
  {
    label: 'GLOBAL',
    accent: '#00d4ff',
    layers: [
      { key: 'globalHubs',  label: 'TECH HUBS',   color: '#00d4ff' },
      { key: 'conferences', label: 'CONFERENCES', color: '#ffb800' },
    ],
  },
  {
    label: 'LIVE',
    accent: '#00ff88',
    layers: [
      { key: 'flights',      label: 'FLIGHTS',     color: '#ffb800' },
      { key: 'military',     label: 'MILITARY',    color: '#f97316' },
      { key: 'seismic',      label: 'SEISMIC',     color: '#ff3b30' },
      { key: 'borderTrade',  label: 'BORDER',      color: '#00d4ff' },
      { key: 'crimeNews',    label: 'CRIME NEWS',  color: '#f97316' },
      { key: 'samContracts', label: 'CONTRACTS',   color: '#00ff88' },
      { key: 'liveTV',       label: 'LIVE TV',     color: '#ff3b30' },
    ],
  },
  {
    label: 'VENDORS',
    accent: '#00d4ff',
    layers: [
      { key: 'vendors',       label: 'VENDORS',      color: '#00d4ff' },
      { key: 'products',      label: 'PRODUCTS',     color: '#00a8cc' },
      { key: 'samBusinesses', label: 'SAM ENTITIES', color: '#00d4ff' },
    ],
  },
  {
    label: 'MOMENTUM',
    accent: '#00ff88',
    layers: [
      { key: 'momentum', label: 'MOMENTUM', color: '#00ff88' },
      { key: 'adoption', label: 'ADOPTION', color: '#00cc6a' },
    ],
  },
  {
    label: 'INTEL',
    accent: '#ffb800',
    layers: [
      { key: 'funding', label: 'FUNDING',     color: '#ffb800' },
      { key: 'patents', label: 'PATENTS',     color: '#ffb800' },
      { key: 'hiring',      label: 'HIRING',      color: '#f97316' },
      { key: 'news',        label: 'NEWS',        color: '#00d4ff' },
      { key: 'disruptions', label: 'DISRUPTIONS', color: '#a855f7' },
    ],
  },
  {
    label: 'IKER',
    accent: '#ffd700',
    layers: [
      { key: 'ikerScores', label: 'HEALTH SCORE', color: '#ffd700' },
      { key: 'ikerRisk',   label: 'RISK',         color: '#ff3b30' },
    ],
  },
];

function formatFreshness(ts: number | undefined): { label: string; color: string } | null {
  if (!ts) return null;
  const ageMs = Date.now() - ts;
  const ageSec = Math.floor(ageMs / 1000);
  if (ageSec < 30) return { label: `${ageSec}s`, color: '#00ff88' };
  const ageMin = Math.floor(ageSec / 60);
  if (ageMin < 5) return { label: `${ageMin}m`, color: '#ffb800' };
  return { label: `${ageMin}m`, color: '#ff3b30' };
}

type Props = {
  layers: LayerState;
  onToggleLayer: (key: keyof LayerState) => void;
  dataFreshness?: Record<string, number>;
};

export function MapLayerPanel({ layers, onToggleLayer, dataFreshness }: Props) {
  const [, setTick] = useState(0);
  const [lastToggled, setLastToggled] = useState<keyof LayerState | null>(null);

  useEffect(() => {
    if (!dataFreshness || Object.keys(dataFreshness).length === 0) return;
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, [dataFreshness]);

  const handleToggle = (key: keyof LayerState) => {
    onToggleLayer(key);
    setLastToggled(key);
    setTimeout(() => setLastToggled(null), 400);
  };

  const totalActive = GROUPS.reduce((sum, g) => sum + g.layers.filter((l) => layers[l.key]).length, 0);

  return (
    <div className="flex flex-col w-40 shrink-0 bg-black/92 border-r border-white/[0.05] overflow-y-auto scrollbar-thin h-full pt-11 md:pt-0 backdrop-blur-md md:backdrop-blur-none">

      {/* Mobile drag handle */}
      <div className="md:hidden shrink-0 flex justify-center pt-2 pb-1">
        <div className="w-8 h-0.5 rounded-full bg-white/15" />
      </div>

      {/* Panel header */}
      <div className="shrink-0 px-3 py-2 border-b border-white/[0.05] flex items-center gap-2">
        <span className="font-mono text-[8px] tracking-[0.3em] text-white/20 uppercase flex-1">LAYERS</span>
        {totalActive > 0 && (
          <span
            className="font-mono text-[7px] font-bold px-1.5 py-px rounded-sm"
            style={{ color: '#00d4ff', background: '#00d4ff18', border: '1px solid #00d4ff25' }}
          >
            {totalActive} ON
          </span>
        )}
      </div>

      {GROUPS.map((group, gi) => {
        const activeCount = group.layers.filter((l) => layers[l.key]).length;
        const isGroupActive = activeCount > 0;

        return (
          <div key={group.label}>
            {/* Group header */}
            <div
              className="flex items-center gap-2 px-3 pt-2.5 pb-1"
              style={{ borderLeft: `2px solid ${isGroupActive ? group.accent + '55' : group.accent + '18'}` }}
            >
              {/* Live dot for LIVE group */}
              {group.label === 'LIVE' && (
                <span
                  className="w-1 h-1 rounded-full shrink-0"
                  style={{
                    backgroundColor: isGroupActive ? '#00ff88' : 'transparent',
                    border: isGroupActive ? 'none' : '1px solid rgba(255,255,255,0.15)',
                    boxShadow: isGroupActive ? '0 0 6px #00ff88cc' : 'none',
                  }}
                />
              )}
              <span
                className="font-mono text-[8px] tracking-[0.3em] font-bold flex-1"
                style={{ color: isGroupActive ? group.accent : 'rgba(255,255,255,0.18)' }}
              >
                {group.label}
              </span>
              {activeCount > 0 && (
                <span
                  className="font-mono text-[7px] rounded-sm px-1 leading-none py-px font-bold"
                  style={{ color: group.accent, background: `${group.accent}1a` }}
                >
                  {activeCount}
                </span>
              )}
            </div>

            {/* Layer rows */}
            {group.layers.map((layer) => {
              const active = layers[layer.key];
              const justToggled = lastToggled === layer.key;
              const fresh = formatFreshness(dataFreshness?.[layer.key]);

              return (
                <button
                  key={layer.key}
                  onClick={() => handleToggle(layer.key)}
                  className="w-full flex items-center gap-2 px-3 py-[5px] text-left transition-all duration-150 group relative"
                  style={{
                    background: justToggled
                      ? `${layer.color}18`
                      : active
                      ? `${layer.color}07`
                      : 'transparent',
                    borderLeft: active ? `2px solid ${layer.color}60` : '2px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.025)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = active ? `${layer.color}07` : 'transparent';
                  }}
                >
                  {/* Toggle pill */}
                  <span className="shrink-0 relative flex items-center justify-center">
                    <span
                      className="w-7 h-[13px] rounded-full transition-all duration-200 flex items-center"
                      style={{
                        background: active ? `${layer.color}40` : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${active ? layer.color + '70' : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      <span
                        className="w-[9px] h-[9px] rounded-full transition-all duration-200 ml-0.5"
                        style={{
                          backgroundColor: active ? layer.color : 'rgba(255,255,255,0.2)',
                          transform: active ? 'translateX(13px)' : 'translateX(0px)',
                          boxShadow: active ? `0 0 6px ${layer.color}cc` : 'none',
                        }}
                      />
                    </span>
                  </span>

                  {/* Label */}
                  <span
                    className="font-mono text-[9px] tracking-wide leading-tight transition-colors flex-1 truncate"
                    style={{ color: active ? layer.color : 'rgba(255,255,255,0.2)' }}
                  >
                    {layer.label}
                  </span>

                  {/* Freshness badge — only when active and data exists */}
                  {active && fresh && (
                    <span
                      className="font-mono text-[7px] shrink-0 tabular-nums"
                      style={{ color: fresh.color }}
                    >
                      {fresh.label}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Group divider */}
            {gi < GROUPS.length - 1 && (
              <div className="mx-3 mt-1.5 mb-0 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
            )}
          </div>
        );
      })}

      {/* Bottom padding */}
      <div className="h-6" />
    </div>
  );
}
