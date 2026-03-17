'use client';
// src/app/command-center/components/IntelMap.tsx
// Center map — MapLibre + Marker dots, mode-aware filtering, zoom presets, scanline.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapGL, { Marker, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { IntelSignal, SignalType, Mode } from '../types/intel';
import { SIGNAL_COLORS } from '../hooks/useSignals';

// ─── Constants ──────────────────────────────────────────────────────────────

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';
const CYAN      = '#00D4FF';
const GREEN     = '#00FF88';
const DIM       = 'rgba(0,212,255,0.08)';

const VIEWS: Record<string, { longitude: number; latitude: number; zoom: number }> = {
  WORLD:      { longitude:   0,        latitude:  20,      zoom: 1.8 },
  USA:        { longitude: -98.5,      latitude:  39.5,    zoom: 3.5 },
  'EL PASO':  { longitude: -106.485,   latitude:  31.762,  zoom: 11  },
};

type ViewKey = keyof typeof VIEWS;

const FILTER_TYPES: Array<{ key: SignalType | 'ALL'; label: string; color: string }> = [
  { key: 'ALL',                label: 'ALL',       color: CYAN    },
  { key: 'contract_award',    label: 'CONTRACTS', color: '#FFD700' },
  { key: 'research_paper',    label: 'RESEARCH',  color: CYAN    },
  { key: 'funding_round',     label: 'FUNDING',   color: '#A855F7' },
  { key: 'merger_acquisition', label: 'M&A',      color: GREEN   },
  { key: 'patent_filing',     label: 'PATENTS',   color: '#FFD700' },
];

function rgbToHex(c: [number, number, number]): string {
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

// ─── Props ──────────────────────────────────────────────────────────────────

type Props = {
  signals:          IntelSignal[];
  mode:             Mode;
  modeFilter:       string | null;
  selectedSignalId: string | null;
  onDotClick:       (signal: IntelSignal) => void;
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function IntelMap({ signals, mode, modeFilter, selectedSignalId, onDotClick }: Props) {
  const mapRef                      = useRef<MapRef>(null);
  const [activeView, setActiveView] = useState<ViewKey>('EL PASO');
  const [filter, setFilter]         = useState<SignalType | 'ALL'>('ALL');
  const [hovered, setHovered]       = useState<string | null>(null);

  // Mode changes auto-fly
  useEffect(() => {
    if (mode === 'WORLD')     { flyTo('WORLD'); setFilter('ALL'); }
    if (mode === 'EL PASO')   { flyTo('EL PASO'); setFilter('ALL'); }
    if (mode === 'MORNING')   { flyTo('EL PASO'); setFilter('ALL'); }
    if (mode === 'RESEARCH')  { flyTo('USA'); setFilter('research_paper'); }
    if (mode === 'CONTRACTS') { flyTo('USA'); setFilter('contract_award'); }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const flyTo = useCallback((key: ViewKey) => {
    setActiveView(key);
    const view = VIEWS[key];
    mapRef.current?.flyTo({
      center: [view.longitude, view.latitude],
      zoom: view.zoom,
      duration: 1200,
    });
  }, []);

  // Filter signals by button + mode override
  const dots = useMemo(() => {
    const activeFilter = modeFilter ?? (filter === 'ALL' ? null : filter);
    const filtered = activeFilter
      ? signals.filter(s => s.type === activeFilter)
      : signals;
    return filtered.slice(0, 200);
  }, [signals, filter, modeFilter]);

  return (
    <div style={{ position: 'relative', height: '100%', borderRadius: 2, overflow: 'hidden', border: `1px solid ${DIM}` }}>

      <MapGL
        ref={mapRef}
        initialViewState={VIEWS['EL PASO']}
        mapStyle={MAP_STYLE}
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        {dots.map(sig => {
          const coords = sig.coordinates ?? [-106.485, 31.762];
          const color = rgbToHex(SIGNAL_COLORS[sig.type] ?? [0, 212, 255]);
          const size = 5 + sig.importance * 14; // 5–19px
          const isHovered  = hovered === sig.id;
          const isSelected = selectedSignalId === sig.id;
          const isPulsing  = sig.importance >= 0.7;

          return (
            <Marker key={sig.id} longitude={coords[0]} latitude={coords[1]} anchor="center">
              <div
                onClick={() => onDotClick(sig)}
                onMouseEnter={() => setHovered(sig.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  background: color,
                  opacity: isSelected ? 1 : isHovered ? 0.95 : 0.7,
                  boxShadow: isSelected
                    ? `0 0 0 3px ${color}44, 0 0 16px ${color}`
                    : `0 0 ${isHovered ? 14 : 6}px ${color}${isHovered ? 'cc' : '88'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  transform: isHovered ? 'scale(1.5)' : isSelected ? 'scale(1.4)' : 'scale(1)',
                  animation: isPulsing
                    ? `dot-pulse ${sig.importance >= 0.9 ? '1.2' : '2.2'}s ease-in-out infinite`
                    : 'none',
                }}
                title={sig.title}
              />
            </Marker>
          );
        })}
      </MapGL>

      {/* Hover tooltip */}
      {hovered && (() => {
        const sig = dots.find(d => d.id === hovered);
        if (!sig) return null;
        const color = rgbToHex(SIGNAL_COLORS[sig.type] ?? [0, 212, 255]);
        return (
          <div style={{
            position: 'absolute', top: 42, left: 12,
            background: 'rgba(7,7,15,0.96)', border: `1px solid ${color}50`,
            borderLeft: `3px solid ${color}`,
            borderRadius: 2, padding: '8px 12px', pointerEvents: 'none',
            zIndex: 20, maxWidth: 300, backdropFilter: 'blur(8px)',
          }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color, letterSpacing: '0.12em', marginBottom: 3, textTransform: 'uppercase' }}>
              {sig.type.replace(/_/g, ' ')}
            </div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
              {sig.title.slice(0, 120)}
            </div>
            {sig.company && (
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: '#FFD700', marginTop: 3 }}>
                {sig.company}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: 'rgba(0,212,255,0.5)' }}>
                IMP {(sig.importance * 100).toFixed(0)}
              </span>
              {sig.elPasoRelevance > 0 && (
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: GREEN }}>
                  EP {sig.elPasoRelevance}
                </span>
              )}
            </div>
          </div>
        );
      })()}

      {/* Top-left: signal count + loading */}
      <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'none', zIndex: 5 }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: dots.length > 0 ? GREEN : CYAN,
          boxShadow: `0 0 8px ${dots.length > 0 ? GREEN : CYAN}`,
          animation: dots.length === 0 ? 'dot-pulse 1.5s ease-in-out infinite' : 'none',
        }} />
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(0,255,136,0.8)', letterSpacing: '0.08em' }}>
          {dots.length > 0 ? `${dots.length} SIGNALS` : 'LOADING...'}
        </span>
      </div>

      {/* Bottom-right: controls */}
      <div style={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 5 }}>
        {/* Zoom presets */}
        <div style={{ display: 'flex', gap: 2 }}>
          {(Object.keys(VIEWS) as ViewKey[]).map(key => (
            <button
              key={key}
              onClick={() => flyTo(key)}
              style={{
                padding: '4px 8px',
                background: activeView === key ? 'rgba(0,212,255,0.15)' : 'rgba(7,7,15,0.9)',
                border: `1px solid ${activeView === key ? 'rgba(0,212,255,0.45)' : DIM}`,
                borderRadius: 2, cursor: 'pointer',
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 8,
                letterSpacing: '0.08em',
                color: activeView === key ? CYAN : 'rgba(0,212,255,0.4)',
                transition: 'all 0.15s',
              }}
            >
              {key}
            </button>
          ))}
        </div>
        {/* Type filters */}
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {FILTER_TYPES.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '3px 7px',
                background: filter === f.key ? `${f.color}18` : 'rgba(7,7,15,0.9)',
                border: `1px solid ${filter === f.key ? `${f.color}50` : DIM}`,
                borderRadius: 2, cursor: 'pointer',
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 7,
                letterSpacing: '0.06em',
                color: filter === f.key ? f.color : 'rgba(0,212,255,0.35)',
                transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes dot-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%       { opacity: 1; transform: scale(1.35); }
        }
      `}</style>
    </div>
  );
}
