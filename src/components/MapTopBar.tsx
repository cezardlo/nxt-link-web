'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Mode, TimeRange } from '@/app/map/page';
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
  onMissionSubmit,
  loading,
  activeLayerCount,
  pointCount,
  mode,
  onModeChange,
  onFlyTo,
  onCmdK,
  onSignalsLoaded,
  onMobileLayerToggle,
  onMobileRightToggle,
}: Props) {
  const [mission, setMission] = useState('');
  const [copied, setCopied] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

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

  const handleSubmit = useCallback(() => {
    const text = mission.trim();
    if (!text) return;
    onMissionSubmit(text);
  }, [mission, onMissionSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSubmit(); },
    [handleSubmit],
  );

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

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
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" style={{ boxShadow: '0 0 4px #10b981cc' }} />
        </span>
        <a
          href="/"
          className="font-mono text-[11px] font-black tracking-[0.18em] text-white hover:text-[#00d4ff] transition-colors"
        >
          NXT<span className="text-[#00d4ff]">{'//'}</span>LINK
        </a>
      </div>

      <Separator />

      {/* Mission input — wider, better styled */}
      <div
        className="flex-1 flex items-center gap-2 min-w-0 transition-all duration-150"
        style={{
          background: inputFocused ? 'rgba(0,212,255,0.04)' : 'transparent',
          borderBottom: inputFocused ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent',
        }}
      >
        <span className="font-mono text-[8px] text-white/15 shrink-0 tracking-[0.3em] hidden sm:inline">MISSION</span>
        <span className="text-white/20 text-[9px] hidden sm:inline">›</span>
        <input
          type="text"
          value={mission}
          onChange={(e) => setMission(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder="find top AI vendors, route optimization, water tech..."
          className="flex-1 min-w-0 bg-transparent text-[10px] text-white/60 placeholder-white/10 outline-none font-mono py-1"
        />
        {loading && (
          <span className="loading-dots shrink-0 flex gap-0.5 text-[#00d4ff]">
            <span /><span /><span />
          </span>
        )}
        {!loading && mission.trim() && (
          <button
            onClick={handleSubmit}
            className="shrink-0 px-2 py-0.5 font-mono text-[8px] text-emerald-400 border border-emerald-400/25
                       hover:bg-emerald-400/10 hover:border-emerald-400/50 transition-all rounded-sm tracking-widest"
          >
            RUN ▸
          </button>
        )}
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

      {/* ⌘K */}
      <button
        onClick={onCmdK}
        title="Command palette (⌘K)"
        className="shrink-0 px-2 py-0.5 font-mono text-[8px] text-white/22
                   border border-white/[0.07] hover:border-[#00d4ff]/30 hover:text-[#00d4ff]/65
                   rounded-sm transition-all duration-150"
      >
        ⌘K
      </button>

      <Separator />

      {/* Mode toggle — desktop: segmented, mobile: cycle button */}
      <div className="hidden md:flex items-center rounded-sm overflow-hidden border border-white/[0.07] shrink-0">
        {(['operator', 'executive'] as Mode[]).map((m, idx) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-2 py-0.5 font-mono text-[8px] transition-all duration-150 ${
              mode === m
                ? 'bg-white/10 text-white/75 font-bold'
                : 'text-white/18 hover:text-white/40 hover:bg-white/[0.03]'
            } ${idx === 0 ? 'border-r border-white/[0.07]' : ''}`}
          >
            {m === 'operator' ? 'OPR' : 'EXC'}
          </button>
        ))}
      </div>
      <button
        onClick={() => onModeChange(mode === 'operator' ? 'executive' : 'operator')}
        className="md:hidden shrink-0 px-1.5 py-0.5 font-mono text-[8px] rounded-sm border border-white/[0.07]
                   text-white/40 transition-all duration-150"
      >
        {mode === 'operator' ? 'OPR' : 'EXC'}
      </button>

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
            className="text-emerald-400 font-bold tabular-nums"
            style={{
              display: 'inline-block',
              transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
              transform: pointFlash ? 'scale(1.4)' : 'scale(1)',
              textShadow: pointFlash ? '0 0 8px rgba(16,185,129,0.7)' : 'none',
            }}
          >
            {pointCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Intel Badge */}
      <IntelBadge onSignalsLoaded={onSignalsLoaded} />

      <Separator />

      {/* Share — desktop: text, mobile: icon */}
      <button
        onClick={handleShare}
        className="shrink-0 font-mono text-[8px] text-white/15 hover:text-white/40 transition-colors tracking-widest"
      >
        {copied ? '✓' : <span className="hidden md:inline">SHARE</span>}
        {!copied && <span className="md:hidden">↗</span>}
      </button>

      {/* Mobile: right panel toggle */}
      <button
        onClick={onMobileRightToggle}
        className="md:hidden shrink-0 flex items-center justify-center w-7 h-7 border border-white/[0.08] rounded-sm
                   font-mono text-[9px] text-emerald-400/50 hover:text-emerald-400 hover:border-emerald-400/25
                   transition-all duration-150"
        title="Toggle intel panel"
      >
        ◧
      </button>

    </div>
  );
}
