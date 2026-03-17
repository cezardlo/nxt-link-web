'use client';
// src/app/command-center/components/IntelMap.tsx
// Center map — MapLibre + CSS dot markers for signal visualization.
// No deck.gl dependency — pure react-map-gl Markers for maximum reliability.

import { useCallback, useMemo, useRef, useState } from 'react';
import MapGL, { Marker, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { IntelSignal, SignalType } from '../types/intel';
import { SIGNAL_COLORS } from '../hooks/useSignals';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAP_STYLE  = 'https://tiles.openfreemap.org/styles/dark';
const CYAN       = '#00D4FF';
const GREEN      = '#00FF88';
const DIM        = 'rgba(0,212,255,0.10)';

// Zoom presets
const VIEWS: Record<string, { longitude: number; latitude: number; zoom: number }> = {
  WORLD:      { longitude:   0,        latitude:  20,      zoom: 1.8 },
  USA:        { longitude: -98.5,      latitude:  39.5,    zoom: 3.5 },
  'EL PASO':  { longitude: -106.485,   latitude:  31.762,  zoom: 10  },
};

type ViewKey = keyof typeof VIEWS;

// Filter button config
const FILTER_TYPES: Array<{ key: SignalType | 'ALL'; label: string; color: string }> = [
  { key: 'ALL',                label: 'ALL',       color: CYAN    },
  { key: 'contract_award',    label: 'CONTRACTS', color: '#FFD700' },
  { key: 'research_paper',    label: 'RESEARCH',  color: CYAN    },
  { key: 'funding_round',     label: 'FUNDING',   color: '#A855F7' },
  { key: 'merger_acquisition', label: 'M&A',      color: GREEN   },
  { key: 'patent_filing',     label: 'PATENTS',   color: '#FFD700' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function rgbToHex(c: [number, number, number]): string {
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  signals:    IntelSignal[];
  onDotClick: (signal: IntelSignal) => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function IntelMap({ signals, onDotClick }: Props) {
  const mapRef                      = useRef<MapRef>(null);
  const [activeView, setActiveView] = useState<ViewKey>('EL PASO');
  const [filter,     setFilter]     = useState<SignalType | 'ALL'>('ALL');
  const [hovered,    setHovered]    = useState<string | null>(null);

  // Fly to preset view
  const flyTo = useCallback((key: ViewKey) => {
    setActiveView(key);
    const view = VIEWS[key];
    mapRef.current?.flyTo({
      center: [view.longitude, view.latitude],
      zoom: view.zoom,
      duration: 1200,
    });
  }, []);

  // Filter signals
  const dots = useMemo(() => {
    const filtered = filter === 'ALL'
      ? signals
      : signals.filter(s => s.type === filter);
    // Limit to 200 markers for performance
    return filtered.slice(0, 200);
  }, [signals, filter]);

  return (
    <div style={{ position: 'relative', height: '100%', borderRadius: 2, overflow: 'hidden', border: `1px solid ${DIM}` }}>

      {/* ── MapLibre + Markers ───────────────────────────────────────── */}
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
          const size = 6 + sig.importance * 10; // 6–16px
          const isHovered = hovered === sig.id;

          return (
            <Marker
              key={sig.id}
              longitude={coords[0]}
              latitude={coords[1]}
              anchor="center"
            >
              <div
                onClick={() => onDotClick(sig)}
                onMouseEnter={() => setHovered(sig.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  background: color,
                  opacity: isHovered ? 1 : 0.75,
                  boxShadow: `0 0 ${isHovered ? 14 : 8}px ${color}${isHovered ? 'ee' : '99'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  transform: isHovered ? 'scale(1.6)' : 'scale(1)',
                  animation: sig.importance >= 0.8 ? 'dot-pulse 2s ease-in-out infinite' : 'none',
                }}
                title={sig.title}
              />
            </Marker>
          );
        })}
      </MapGL>

      {/* ── Hover tooltip ────────────────────────────────────────────── */}
      {hovered && (() => {
        const sig = dots.find(d => d.id === hovered);
        if (!sig) return null;
        const color = rgbToHex(SIGNAL_COLORS[sig.type] ?? [0, 212, 255]);
        return (
          <div style={{
            position: 'absolute',
            top: 42,
            left: 12,
            background: 'rgba(7,7,15,0.95)',
            border: `1px solid ${color}40`,
            borderRadius: 2,
            padding: '8px 12px',
            pointerEvents: 'none',
            zIndex: 20,
            maxWidth: 280,
          }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color, letterSpacing: '0.1em', marginBottom: 3 }}>
              {sig.type.replace(/_/g, ' ').toUpperCase()}
            </div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.85)', lineHeight: 1.45 }}>
              {sig.title}
            </div>
            {sig.company && (
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: '#FFD700', marginTop: 2 }}>
                {sig.company}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Top-left signal count ────────────────────────────────────── */}
      <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'none', zIndex: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: dots.length > 0 ? GREEN : CYAN, boxShadow: `0 0 8px ${dots.length > 0 ? GREEN : CYAN}` }} />
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: 'rgba(0,255,136,0.7)', letterSpacing: '0.1em' }}>
          {activeView} · {dots.length} SIGNALS
        </span>
      </div>

      {/* ── Bottom-right controls ────────────────────────────────────── */}
      <div style={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 5 }}>
        {/* Zoom presets */}
        <div style={{ display: 'flex', gap: 3 }}>
          {(Object.keys(VIEWS) as ViewKey[]).map(key => (
            <button
              key={key}
              onClick={() => flyTo(key)}
              style={{
                padding: '3px 7px',
                background: activeView === key ? 'rgba(0,212,255,0.15)' : 'rgba(7,7,15,0.85)',
                border: `1px solid ${activeView === key ? 'rgba(0,212,255,0.4)' : 'rgba(0,212,255,0.15)'}`,
                borderRadius: 2,
                cursor: 'pointer',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 7,
                letterSpacing: '0.08em',
                color: activeView === key ? CYAN : 'rgba(0,212,255,0.45)',
              }}
            >
              {key}
            </button>
          ))}
        </div>

        {/* Type filters */}
        <div style={{ display: 'flex', gap: 3 }}>
          {FILTER_TYPES.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '3px 7px',
                background: filter === f.key ? `${f.color}18` : 'rgba(7,7,15,0.85)',
                border: `1px solid ${filter === f.key ? `${f.color}50` : 'rgba(0,212,255,0.12)'}`,
                borderRadius: 2,
                cursor: 'pointer',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 7,
                letterSpacing: '0.06em',
                color: filter === f.key ? f.color : 'rgba(0,212,255,0.35)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CSS animations ───────────────────────────────────────────── */}
      <style>{`
        @keyframes dot-pulse {
          0%, 100% { opacity: 0.75; transform: scale(1); }
          50%       { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
