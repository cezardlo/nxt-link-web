'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapGL, { Marker, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { IntelSignal, SignalType, Mode } from '../types/intel';
import { SIGNAL_COLORS } from '../hooks/useSignals';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';
const C = '#00D4FF';
const G = '#00FF88';

const VIEWS: Record<string, { longitude: number; latitude: number; zoom: number }> = {
  WORLD:     { longitude:   0,      latitude:  20,     zoom: 1.8 },
  USA:       { longitude: -98.5,    latitude:  39.5,   zoom: 3.5 },
  'EL PASO': { longitude: -106.485, latitude:  31.762, zoom: 11  },
};
type ViewKey = keyof typeof VIEWS;

const FILTERS: Array<{ key: SignalType | 'ALL'; label: string; color: string }> = [
  { key: 'ALL',                label: 'ALL',       color: C       },
  { key: 'contract_award',    label: 'CONTRACTS', color: '#FFD700' },
  { key: 'research_paper',    label: 'RESEARCH',  color: C       },
  { key: 'funding_round',     label: 'FUNDING',   color: '#A855F7' },
  { key: 'merger_acquisition', label: 'M&A',      color: G       },
  { key: 'patent_filing',     label: 'PATENTS',   color: '#FFD700' },
];

function rgbHex(c: [number, number, number]): string {
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

type Props = {
  signals: IntelSignal[];
  mode: Mode;
  modeFilter: string | null;
  selectedSignalId: string | null;
  highlightIndustry: string | null;
  onDotClick: (s: IntelSignal) => void;
};

export default function IntelMap({ signals, mode, modeFilter, selectedSignalId, highlightIndustry, onDotClick }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [view, setView] = useState<ViewKey>('EL PASO');
  const [filter, setFilter] = useState<SignalType | 'ALL'>('ALL');
  const [hovered, setHovered] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Pulse animation tick
  useEffect(() => {
    const id = setInterval(() => setTick(t => (t + 1) % 100), 50);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (mode === 'WORLD')     { flyTo('WORLD'); setFilter('ALL'); }
    if (mode === 'EL PASO')   { flyTo('EL PASO'); setFilter('ALL'); }
    if (mode === 'MORNING')   { flyTo('EL PASO'); setFilter('ALL'); }
    if (mode === 'RESEARCH')  { flyTo('USA'); setFilter('research_paper'); }
    if (mode === 'CONTRACTS') { flyTo('USA'); setFilter('contract_award'); }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const flyTo = useCallback((key: ViewKey) => {
    setView(key);
    mapRef.current?.flyTo({ center: [VIEWS[key].longitude, VIEWS[key].latitude], zoom: VIEWS[key].zoom, duration: 1400 });
  }, []);

  const dots = useMemo(() => {
    const f = modeFilter ?? (filter === 'ALL' ? null : filter);
    let filtered = f ? signals.filter(s => s.type === f) : signals;
    if (highlightIndustry) {
      const hi = highlightIndustry.toLowerCase();
      filtered = filtered.map(s => ({
        ...s,
        _dimmed: !s.industry.toLowerCase().includes(hi) && !(s.company ?? '').toLowerCase().includes(hi),
      }));
    }
    return (filtered as Array<IntelSignal & { _dimmed?: boolean }>).slice(0, 250);
  }, [signals, filter, modeFilter, highlightIndustry]);

  // Count by type for mini legend
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    dots.forEach(d => { counts[d.type] = (counts[d.type] ?? 0) + 1; });
    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 4);
  }, [dots]);

  return (
    <div style={{ position: 'relative', height: '100%', borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(0,212,255,0.06)' }}>

      <MapGL ref={mapRef} initialViewState={VIEWS['EL PASO']} mapStyle={MAP_STYLE}
        attributionControl={false} style={{ width: '100%', height: '100%' }}>
        {dots.map(sig => {
          const coords = sig.coordinates ?? [-106.485, 31.762];
          const color = rgbHex(SIGNAL_COLORS[sig.type] ?? [0, 212, 255]);
          const base = 4 + sig.importance * 16;
          const isHov = hovered === sig.id;
          const isSel = selectedSignalId === sig.id;
          const dimmed = (sig as IntelSignal & { _dimmed?: boolean })._dimmed;

          // Pulse: fast for critical, medium for high, none for low
          const pulseScale = sig.importance >= 0.9
            ? 1 + 0.35 * Math.sin(tick * 0.12)
            : sig.importance >= 0.7
            ? 1 + 0.2 * Math.sin(tick * 0.06)
            : 1;

          return (
            <Marker key={sig.id} longitude={coords[0]} latitude={coords[1]} anchor="center">
              <div
                onClick={() => onDotClick(sig)}
                onMouseEnter={() => setHovered(sig.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  width: base, height: base, borderRadius: '50%',
                  background: dimmed ? 'rgba(255,255,255,0.08)' : color,
                  opacity: dimmed ? 0.15 : isSel ? 1 : isHov ? 0.95 : 0.75,
                  boxShadow: isSel
                    ? `0 0 0 3px ${color}55, 0 0 20px ${color}cc`
                    : isHov
                    ? `0 0 16px ${color}bb`
                    : `0 0 ${Math.round(4 + sig.importance * 8)}px ${color}66`,
                  cursor: 'pointer',
                  transform: `scale(${isHov ? 1.6 : isSel ? 1.5 : pulseScale})`,
                  transition: isHov || isSel ? 'all 0.12s ease' : 'none',
                }}
              />
            </Marker>
          );
        })}
      </MapGL>

      {/* HUD: top-left status */}
      <div style={{ position: 'absolute', top: 8, left: 8, pointerEvents: 'none', zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: dots.length > 0 ? G : C,
            boxShadow: `0 0 8px ${dots.length > 0 ? G : C}`,
            animation: dots.length === 0 ? 'pulse 1.5s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontSize: 10, color: `${G}cc`, letterSpacing: '0.08em' }}>
            {dots.length > 0 ? `${dots.length} ACTIVE` : 'SCANNING...'}
          </span>
        </div>
        {/* Mini legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {typeCounts.map(([type, count]) => {
            const tc = rgbHex(SIGNAL_COLORS[type as SignalType] ?? [0, 212, 255]);
            return (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: tc, boxShadow: `0 0 4px ${tc}88` }} />
                <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {type.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: 7, color: tc, marginLeft: 2 }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover tooltip */}
      {hovered && (() => {
        const sig = dots.find(d => d.id === hovered);
        if (!sig) return null;
        const color = rgbHex(SIGNAL_COLORS[sig.type] ?? [0, 212, 255]);
        return (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(5,5,12,0.97)', border: `1px solid ${color}40`,
            borderLeft: `3px solid ${color}`,
            borderRadius: 2, padding: '8px 12px', pointerEvents: 'none',
            zIndex: 20, maxWidth: 280, backdropFilter: 'blur(12px)',
          }}>
            <div style={{ fontSize: 7, color, letterSpacing: '0.12em', marginBottom: 3, textTransform: 'uppercase' }}>
              {sig.type.replace(/_/g, ' ')}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.92)', lineHeight: 1.5 }}>
              {sig.title.slice(0, 100)}{sig.title.length > 100 ? '…' : ''}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {sig.company && <span style={{ fontSize: 8, color: '#FFD700' }}>{sig.company}</span>}
              <span style={{ fontSize: 7, color: 'rgba(0,212,255,0.5)' }}>IMP {(sig.importance * 100).toFixed(0)}</span>
              {sig.elPasoRelevance > 0 && <span style={{ fontSize: 7, color: G }}>EP {sig.elPasoRelevance}</span>}
            </div>
          </div>
        );
      })()}

      {/* Bottom controls */}
      <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', flexDirection: 'column', gap: 3, zIndex: 5 }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {(Object.keys(VIEWS) as ViewKey[]).map(k => (
            <button key={k} onClick={() => flyTo(k)} style={{
              padding: '4px 8px', fontSize: 8, letterSpacing: '0.08em',
              background: view === k ? 'rgba(0,212,255,0.12)' : 'rgba(5,5,12,0.92)',
              border: `1px solid ${view === k ? 'rgba(0,212,255,0.35)' : 'rgba(0,212,255,0.06)'}`,
              borderRadius: 2, cursor: 'pointer',
              color: view === k ? C : 'rgba(0,212,255,0.35)',
              fontFamily: 'IBM Plex Mono, monospace', transition: 'all 0.15s',
            }}>
              {k}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '3px 6px', fontSize: 7, letterSpacing: '0.06em',
              background: filter === f.key ? `${f.color}14` : 'rgba(5,5,12,0.92)',
              border: `1px solid ${filter === f.key ? `${f.color}44` : 'rgba(0,212,255,0.06)'}`,
              borderRadius: 2, cursor: 'pointer',
              color: filter === f.key ? f.color : 'rgba(0,212,255,0.3)',
              fontFamily: 'IBM Plex Mono, monospace', transition: 'all 0.15s',
            }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none', zIndex: 1,
        backgroundImage: `
          linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; } 50% { opacity:0.3; }
        }
      `}</style>
    </div>
  );
}
