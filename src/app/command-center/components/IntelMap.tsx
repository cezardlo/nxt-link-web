'use client';
// src/app/command-center/components/IntelMap.tsx
// Center map — MapLibre + deck.gl ScatterplotLayer signal dots.
// Dots colored by signal type, sized by importance, pulsing when active.
// Bottom-right controls: zoom presets + type filter buttons.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapGL, { type MapRef } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { IntelSignal, SignalType } from '../types/intel';
import { SIGNAL_COLORS } from '../hooks/useSignals';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAP_STYLE  = 'https://tiles.openfreemap.org/styles/dark';
const CYAN       = '#00D4FF';
const GREEN      = '#00FF88';
const DIM        = 'rgba(0,212,255,0.10)';
const BG         = '#07070F';

// Zoom presets
const VIEWS = {
  WORLD:    { longitude:   0,        latitude:  20,      zoom: 1.8 },
  USA:      { longitude: -98.5,      latitude:  39.5,    zoom: 3.5 },
  'EL PASO':{ longitude: -106.485,   latitude:  31.762,  zoom: 10  },
} as const;

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

// ─── Dot data shape ───────────────────────────────────────────────────────────

type DotDatum = {
  position: [number, number];
  signal:   IntelSignal;
  color:    [number, number, number];
  radius:   number;
};

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  signals:    IntelSignal[];
  onDotClick: (signal: IntelSignal) => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function IntelMap({ signals, onDotClick }: Props) {
  const mapRef                      = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded]   = useState(false);
  const [activeView, setActiveView] = useState<ViewKey>('EL PASO');
  const [filter,     setFilter]     = useState<SignalType | 'ALL'>('ALL');
  const [viewState,  setViewState]  = useState<{ longitude: number; latitude: number; zoom: number }>(VIEWS['EL PASO']);
  const [pulse,      setPulse]      = useState(0); // 0–1 animation phase

  // Pulse animation — drives dot glow size
  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    function tick(ts: number) {
      if (!start) start = ts;
      setPulse(((ts - start) % 2000) / 2000);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Fly to preset view
  const flyTo = useCallback((key: ViewKey) => {
    setActiveView(key);
    setViewState(VIEWS[key]);
  }, []);

  // Build dot data from signals
  const dots = useMemo<DotDatum[]>(() => {
    const filtered = filter === 'ALL'
      ? signals
      : signals.filter(s => s.type === filter);

    return filtered.map(sig => ({
      position: sig.coordinates ?? [-106.485, 31.762],
      signal:   sig,
      color:    SIGNAL_COLORS[sig.type] ?? [0, 212, 255],
      radius:   600 + sig.importance * 1400, // 600–2000m
    }));
  }, [signals, filter]);

  // deck.gl layer
  const layers = useMemo(() => [
    new ScatterplotLayer<DotDatum>({
      id:               'intel-signals',
      data:             dots,
      getPosition:      d => d.position,
      getRadius:        d => d.radius + Math.sin(pulse * Math.PI * 2) * d.radius * 0.18,
      getFillColor:     d => [...d.color, 180] as [number, number, number, number],
      getLineColor:     d => [...d.color, 255] as [number, number, number, number],
      lineWidthMinPixels: 1,
      stroked:          true,
      pickable:         true,
      radiusUnits:      'meters',
      onClick: (info: PickingInfo<DotDatum>) => {
        if (info.object) onDotClick(info.object.signal);
      },
      updateTriggers:   { getRadius: pulse },
    }),
  ], [dots, pulse, onDotClick]);

  // Force clear loading state after 4s (deck.gl can block onLoad)
  useEffect(() => {
    const t = setTimeout(() => setMapLoaded(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // Hover state for tooltip
  const [hovered, setHovered] = useState<IntelSignal | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  return (
    <div style={{ position: 'relative', height: '100%', borderRadius: 2, overflow: 'hidden', border: `1px solid ${DIM}` }}>

      {/* ── DeckGL + MapLibre ────────────────────────────────────────── */}
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => setViewState(vs as typeof viewState)}
        controller={true}
        layers={layers}
        style={{ position: 'absolute', inset: '0' }}
        onHover={(info: PickingInfo<DotDatum>) => {
          if (info.object) {
            setHovered(info.object.signal);
            setHoverPos({ x: info.x ?? 0, y: info.y ?? 0 });
          } else {
            setHovered(null);
          }
        }}
      >
        <MapGL
          ref={mapRef}
          mapStyle={MAP_STYLE}
          onLoad={() => setMapLoaded(true)}
          attributionControl={false}
          style={{ width: '100%', height: '100%' }}
        />
      </DeckGL>

      {/* ── Loading screen ───────────────────────────────────────────── */}
      {!mapLoaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, zIndex: 10 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: CYAN, boxShadow: `0 0 12px ${CYAN}`, margin: '0 auto 10px' }} />
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(0,212,255,0.5)', letterSpacing: '0.1em' }}>LOADING MAP</span>
          </div>
        </div>
      )}

      {/* ── Top-left label ───────────────────────────────────────────── */}
      {mapLoaded && (
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'none', zIndex: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, boxShadow: `0 0 8px ${GREEN}` }} />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: 'rgba(0,255,136,0.7)', letterSpacing: '0.1em' }}>
            {activeView} · {dots.length} SIGNALS
          </span>
        </div>
      )}

      {/* ── Hover tooltip ────────────────────────────────────────────── */}
      {hovered && (
        <div style={{
          position: 'absolute',
          left: hoverPos.x + 12,
          top:  hoverPos.y - 10,
          background: 'rgba(7,7,15,0.95)',
          border: `1px solid rgba(0,212,255,0.25)`,
          borderRadius: 2,
          padding: '6px 10px',
          pointerEvents: 'none',
          zIndex: 20,
          maxWidth: 220,
        }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: CYAN, letterSpacing: '0.1em', marginBottom: 3 }}>
            {hovered.type.replace(/_/g, ' ').toUpperCase()}
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.8)', lineHeight: 1.45 }}>
            {hovered.title}
          </div>
          {hovered.company && (
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: '#FFD700', marginTop: 2 }}>
              {hovered.company}
            </div>
          )}
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: 'rgba(0,212,255,0.4)', marginTop: 3 }}>
            Click for full intel →
          </div>
        </div>
      )}

      {/* ── Bottom-right controls ────────────────────────────────────── */}
      {mapLoaded && (
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
      )}
    </div>
  );
}
