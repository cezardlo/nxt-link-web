'use client';

import { useEffect, useRef, useState } from 'react';

import type { Mode, TimeRange } from '@/hooks/useMapLayers';
import type { FlyToTarget } from '@/components/MapCanvas';
import { IntelBadge } from '@/components/IntelBadge';
import type { SignalFinding, SectorScore } from '@/lib/intelligence/signal-engine';

type Props = {
  timeRange: TimeRange;
  onTimeRangeChange: (t: TimeRange) => void;
  onMissionSubmit: (mission: string) => void;
  loading?: boolean;
  activeLayerCount: number;
  pointCount: number;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  onFlyTo: (target: FlyToTarget) => void;
  onCmdK: () => void;
  onSignalsLoaded?: (signals: SignalFinding[], sectorScores: SectorScore[], activeVendorIds: string[]) => void;
  onMobileLayerToggle?: () => void;
  onMobileRightToggle?: () => void;
};

const EP_PRESETS: { label: string; target: FlyToTarget }[] = [
  { label: 'EP',    target: { longitude: -106.485, latitude: 31.762, zoom: 11 } },
  { label: 'BLISS', target: { longitude: -106.418, latitude: 31.812, zoom: 13 } },
  { label: 'BOTA',  target: { longitude: -106.480, latitude: 31.745, zoom: 14 } },
  { label: 'UTEP',  target: { longitude: -106.502, latitude: 31.772, zoom: 14 } },
];

const REGIONAL_PRESETS: { label: string; target: FlyToTarget }[] = [
  { label: 'GLOBAL', target: { longitude: 0,   latitude: 20,  zoom: 2 } },
  { label: 'USA',    target: { longitude: -95,  latitude: 38,  zoom: 4 } },
  { label: 'LATAM',  target: { longitude: -65,  latitude: -10, zoom: 3 } },
  { label: 'EUR',    target: { longitude: 15,   latitude: 52,  zoom: 4 } },
  { label: 'ASIA',   target: { longitude: 105,  latitude: 35,  zoom: 3 } },
];

const TIME_CHIPS: { value: TimeRange; label: string }[] = [
  { value: 1,    label: '1H'   },
  { value: 24,   label: '24H'  },
  { value: 168,  label: '7D'   },
  { value: 720,  label: '30D'  },
  { value: 2160, label: '90D'  },
  { value: 4320, label: '180D' },
];

function Separator() {
  return <div className="w-px h-3.5 bg-white/[0.06] shrink-0" />;
}

export function MapTopBar({
  timeRange,
  onTimeRangeChange,
  activeLayerCount,
  pointCount,
  onFlyTo,
  onSignalsLoaded,
  onMobileLayerToggle,
  onMobileRightToggle,
}: Props) {
  const prevPointCount = useRef(pointCount);
  const prevLayerCount = useRef(activeLayerCount);
  const [pointFlash, setPointFlash] = useState(false);
  const [layerFlash, setLayerFlash] = useState(false);

  useEffect(() => {
    if (pointCount !== prevPointCount.current) {
      prevPointCount.current = pointCount;
      setPointFlash(true);
      const id = setTimeout(() => setPointFlash(false), 600);
      return () => clearTimeout(id);
    }
  }, [pointCount]);

  useEffect(() => {
    if (activeLayerCount !== prevLayerCount.current) {
      prevLayerCount.current = activeLayerCount;
      setLayerFlash(true);
      const id = setTimeout(() => setLayerFlash(false), 600);
      return () => clearTimeout(id);
    }
  }, [activeLayerCount]);

  return (
    <div className="shrink-0 h-11 flex items-center gap-2 md:gap-2.5 px-2 md:px-3 bg-black border-b border-white/[0.05]">

      {/* Mobile: layers toggle */}
      <button
        onClick={onMobileLayerToggle}
        className="md:hidden shrink-0 flex items-center justify-center w-7 h-7 border border-white/[0.08] rounded-sm
                   font-mono text-[10px] text-[#00d4ff]/50 hover:text-[#00d4ff] hover:border-[#00d4ff]/25
                   transition-all duration-150"
        title="Toggle layers"
      >
        ☰
      </button>

      {/* Logo — Bloomberg-style wordmark */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="relative h-1.5 w-1.5 hidden md:inline-flex shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: '#00ff88' }} />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: '#00ff88', boxShadow: '0 0 6px #00ff88cc' }} />
        </span>
        <a
          href="/"
          className="font-mono text-[11px] font-black tracking-[0.18em] text-white hover:text-[#00d4ff] transition-colors"
        >
          NXT<span className="text-[#00d4ff]">{'//'}</span>LINK
        </a>
      </div>

      <Separator />

      {/* Time range chips */}
      <div className="hidden sm:flex items-center gap-0 shrink-0">
        {TIME_CHIPS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onTimeRangeChange(value)}
            className={`px-1.5 py-0.5 font-mono text-[8px] rounded-sm transition-all duration-150 ${
              timeRange === value
                ? 'bg-[#00d4ff]/12 text-[#00d4ff] font-bold border border-[#00d4ff]/25'
                : 'text-white/20 hover:text-white/45 border border-transparent hover:border-white/8'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Mobile: single cycling time chip */}
      <div className="sm:hidden flex items-center shrink-0">
        <button
          onClick={() => {
            const idx = TIME_CHIPS.findIndex((c) => c.value === timeRange);
            const next = TIME_CHIPS[(idx + 1) % TIME_CHIPS.length]!;
            onTimeRangeChange(next.value);
          }}
          className="px-1.5 py-0.5 font-mono text-[8px] rounded-sm bg-[#00d4ff]/12 text-[#00d4ff] font-bold border border-[#00d4ff]/25"
        >
          {TIME_CHIPS.find((c) => c.value === timeRange)?.label ?? '7D'}
        </button>
      </div>

      <Separator />

      {/* EP local presets */}
      <div className="hidden md:flex items-center gap-0 shrink-0">
        {EP_PRESETS.map(({ label, target }) => (
          <button
            key={label}
            onClick={() => onFlyTo(target)}
            className="px-1.5 py-0.5 font-mono text-[8px] text-[#00d4ff]/35 hover:text-[#00d4ff]/80
                       hover:bg-[#00d4ff]/05 transition-all rounded-sm"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="hidden md:block"><Separator /></div>

      {/* Global presets */}
      <div className="hidden md:flex items-center gap-0 shrink-0">
        {REGIONAL_PRESETS.map(({ label, target }) => (
          <button
            key={label}
            onClick={() => onFlyTo(target)}
            className="px-1.5 py-0.5 font-mono text-[8px] text-white/18 hover:text-white/45
                       hover:bg-white/[0.03] transition-all rounded-sm"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="hidden md:block"><Separator /></div>

      {/* Live stats — visible on all screens */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <div className="flex items-center gap-1 md:gap-1.5 font-mono text-[7px] md:text-[8px]">
          <span className="text-white/15 tracking-widest">LYR</span>
          <span
            className={activeLayerCount > 0 ? 'text-[#00d4ff] font-bold tabular-nums' : 'text-white/25 tabular-nums'}
            style={{
              display: 'inline-block',
              transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1), color 0.2s',
              transform: layerFlash ? 'scale(1.4)' : 'scale(1)',
            }}
          >
            {activeLayerCount}
          </span>
        </div>
        <div className="flex items-center gap-1 md:gap-1.5 font-mono text-[7px] md:text-[8px]">
          <span className="text-white/15 tracking-widest">SIG</span>
          <span
            className="font-bold tabular-nums"
            style={{
              color: '#00ff88',
              display: 'inline-block',
              transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
              transform: pointFlash ? 'scale(1.4)' : 'scale(1)',
              textShadow: pointFlash ? '0 0 8px #00ff88b3' : 'none',
            }}
          >
            {pointCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Intel Badge */}
      <IntelBadge onSignalsLoaded={onSignalsLoaded} />

      <Separator />

      {/* Mobile: right panel toggle */}
      <button
        onClick={onMobileRightToggle}
        className="md:hidden shrink-0 flex items-center justify-center w-7 h-7 border border-white/[0.08] rounded-sm
                   font-mono text-[9px] text-[#00ff88]/50 hover:text-[#00ff88] hover:border-[#00ff88]/25
                   transition-all duration-150"
        title="Toggle intel panel"
      >
        ◧
      </button>

    </div>
  );
}
