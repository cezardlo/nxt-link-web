'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { COLORS } from '@/lib/tokens';

// ─── Types ──────────────────────────────────────────────────────────────────

type CountryTechProfile = {
  code: string;
  name: string;
  primarySectors: string[];
  keyCompanies: string[];
  techScore: number;
  color: string;
  lat: number;
  lon: number;
};

type SignalItem = {
  title: string;
  industry: string;
  importance: number;
  company?: string | null;
};

interface IndustryMapProps {
  countries: CountryTechProfile[];
  accentColor: string;
  industryCategory: string;
  selectedCountryCode: string | null;
  onCountrySelect: (code: string | null) => void;
  highlightedCodes?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signals?: Record<string, any>[];
}

// ─── Mercator projection (same as World page) ──────────────────────────────

function mercatorX(lon: number, width: number): number {
  return ((lon + 180) / 360) * width;
}

function mercatorY(lat: number, height: number): number {
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  return (height / 2) - (height * mercN) / (2 * Math.PI);
}

// ─── Signal color ───────────────────────────────────────────────────────────

function signalColor(importance: number): string {
  if (importance >= 0.85) return COLORS.red;
  if (importance >= 0.7) return COLORS.orange;
  if (importance >= 0.5) return COLORS.gold;
  return COLORS.cyan;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function IndustryMap({
  countries,
  accentColor,
  industryCategory,
  selectedCountryCode,
  onCountrySelect,
  highlightedCodes = [],
  signals = [],
}: IndustryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 50, w: 1000, h: 500 });
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoveredSignal, setHoveredSignal] = useState<number | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });

  const W = 1000;
  const H = 560;

  // Relevant countries for this industry
  const relevantCountries = useMemo(() => {
    const catLower = industryCategory.toLowerCase();
    return countries.filter(c =>
      c.primarySectors.some(s => s.toLowerCase().includes(catLower) || catLower.includes(s.toLowerCase())),
    );
  }, [countries, industryCategory]);

  const relevantCodes = useMemo(() => new Set(relevantCountries.map(c => c.code)), [relevantCountries]);

  // Top 5 for labels
  const top5 = useMemo(() => {
    const sorted = [...relevantCountries].sort((a, b) => b.techScore - a.techScore);
    return new Set(sorted.slice(0, 6).map(c => c.code));
  }, [relevantCountries]);

  // Country positions
  const countryDots = useMemo(() => {
    return countries.map(c => ({
      ...c,
      x: mercatorX(c.lon, W),
      y: mercatorY(c.lat, H),
      isRelevant: relevantCodes.has(c.code),
      isHighlighted: highlightedCodes.length === 0 || highlightedCodes.includes(c.code),
    }));
  }, [countries, relevantCodes, highlightedCodes]);

  // Connection arcs between relevant countries
  const arcs = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; strength: number }[] = [];
    const relevant = relevantCountries.length > 0 ? relevantCountries : countries.slice(0, 6);
    for (let i = 0; i < relevant.length; i++) {
      for (let j = i + 1; j < relevant.length; j++) {
        const shared = relevant[i].primarySectors.filter(s =>
          relevant[j].primarySectors.some(bs => bs.toLowerCase() === s.toLowerCase()),
        ).length;
        if (shared > 0) {
          lines.push({
            x1: mercatorX(relevant[i].lon, W),
            y1: mercatorY(relevant[i].lat, H),
            x2: mercatorX(relevant[j].lon, W),
            y2: mercatorY(relevant[j].lat, H),
            strength: shared,
          });
        }
      }
    }
    return lines.sort((a, b) => b.strength - a.strength).slice(0, 12);
  }, [relevantCountries, countries]);

  // Signal dots
  const signalDots = useMemo(() => {
    if (!signals || signals.length === 0) return [];
    let seed = 99;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647 - 0.5) * 8; };

    return signals.slice(0, 20).map((s, i) => {
      const importance = Number(s.importance ?? 0.5);
      const sigIndustry = String(s.industry ?? s.type ?? '').toLowerCase();
      const catLower = industryCategory.toLowerCase();

      // Find a matching country to place near
      const match = countries.find(c =>
        c.primarySectors.some(sec =>
          sec.toLowerCase().includes(sigIndustry) || sigIndustry.includes(sec.toLowerCase()) ||
          sec.toLowerCase().includes(catLower) || catLower.includes(sec.toLowerCase()),
        ),
      );

      const lat = match ? match.lat + rand() : rand() * 5 + 30;
      const lon = match ? match.lon + rand() : rand() * 10;

      return {
        x: mercatorX(lon, W),
        y: mercatorY(lat, H),
        title: String(s.title ?? ''),
        company: s.company ? String(s.company) : null,
        importance,
        color: signalColor(importance),
        r: 3 + importance * 4,
        idx: i,
      };
    });
  }, [signals, countries, industryCategory]);

  // ── Pan & zoom ────────────────────────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox(prev => {
      const newW = Math.max(200, Math.min(W, prev.w * factor));
      const newH = Math.max(100, Math.min(H, prev.h * factor));
      // Zoom toward center of current view
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      return {
        x: Math.max(0, Math.min(W - newW, cx - newW / 2)),
        y: Math.max(0, Math.min(H - newH, cy - newH / 2)),
        w: newW,
        h: newH,
      };
    });
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  }, [viewBox]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;
    const dx = (e.clientX - panStart.current.x) * scaleX;
    const dy = (e.clientY - panStart.current.y) * scaleY;
    setViewBox(prev => ({
      ...prev,
      x: Math.max(0, Math.min(W - prev.w, panStart.current.vx - dx)),
      y: Math.max(0, Math.min(H - prev.h, panStart.current.vy - dy)),
    }));
  }, [isPanning, viewBox.w, viewBox.h]);

  const handlePointerUp = useCallback(() => { setIsPanning(false); }, []);

  // Fly-to a country
  const flyTo = useCallback((code: string) => {
    const c = countries.find(c => c.code === code);
    if (!c) return;
    const cx = mercatorX(c.lon, W);
    const cy = mercatorY(c.lat, H);
    const zoomW = 300;
    const zoomH = 150;
    setViewBox({
      x: Math.max(0, Math.min(W - zoomW, cx - zoomW / 2)),
      y: Math.max(0, Math.min(H - zoomH, cy - zoomH / 2)),
      w: zoomW,
      h: zoomH,
    });
  }, [countries]);

  // Reset zoom
  const resetZoom = useCallback(() => {
    setViewBox({ x: 0, y: 50, w: W, h: 500 });
  }, []);

  // Fly to selected country
  useEffect(() => {
    if (selectedCountryCode) flyTo(selectedCountryCode);
  }, [selectedCountryCode, flyTo]);

  const zoomLevel = W / viewBox.w;

  return (
    <div className="relative" ref={containerRef}>
      {/* Map */}
      <svg
        width="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        style={{
          background: COLORS.bg,
          borderRadius: 16,
          border: `1px solid ${COLORS.border}`,
          cursor: isPanning ? 'grabbing' : 'grab',
          aspectRatio: '2 / 1',
          maxHeight: 400,
        }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <defs>
          <filter id="map-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="arc-glow-map">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── Grid lines ──────────────────────────────────────────────── */}
        {[-60, -30, 0, 30, 60].map(lat => (
          <line
            key={`lat${lat}`}
            x1={0} y1={mercatorY(lat, H)}
            x2={W} y2={mercatorY(lat, H)}
            stroke={`${COLORS.text}06`} strokeWidth={0.5}
          />
        ))}
        {[-120, -60, 0, 60, 120].map(lon => (
          <line
            key={`lon${lon}`}
            x1={mercatorX(lon, W)} y1={0}
            x2={mercatorX(lon, W)} y2={H}
            stroke={`${COLORS.text}06`} strokeWidth={0.5}
          />
        ))}

        {/* ── Connection arcs ─────────────────────────────────────────── */}
        {arcs.map((arc, i) => {
          const isActive = !selectedCountryCode || true;
          const mx = (arc.x1 + arc.x2) / 2;
          const my = (arc.y1 + arc.y2) / 2 - 20 - arc.strength * 5;
          return (
            <g key={`arc-${i}`}>
              <path
                d={`M ${arc.x1},${arc.y1} Q ${mx},${my} ${arc.x2},${arc.y2}`}
                fill="none"
                stroke={accentColor}
                strokeWidth={0.4 + arc.strength * 0.3}
                strokeOpacity={isActive ? 0.15 : 0.04}
                strokeDasharray="4,6"
                filter="url(#arc-glow-map)"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-20" dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
              </path>
            </g>
          );
        })}

        {/* ── Country dots ────────────────────────────────────────────── */}
        {countryDots.map(c => {
          const isSelected = c.code === selectedCountryCode;
          const isHovered = c.code === hoveredCountry;
          const isTop = top5.has(c.code);
          const baseR = c.isRelevant ? 4 + (c.techScore / 100) * 5 : 2;
          const r = isSelected ? baseR * 2 : isHovered ? baseR * 1.5 : baseR;
          const opacity = c.isRelevant
            ? c.isHighlighted ? 0.9 : 0.2
            : 0.08;

          return (
            <g
              key={c.code}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onCountrySelect(isSelected ? null : c.code);
                if (!isSelected) flyTo(c.code);
              }}
              onMouseEnter={() => setHoveredCountry(c.code)}
              onMouseLeave={() => setHoveredCountry(null)}
            >
              {/* Glow */}
              {c.isRelevant && (
                <circle cx={c.x} cy={c.y} r={r * 2.5} fill={c.color} opacity={0.06} filter="url(#map-glow)" />
              )}

              {/* Pulse for selected */}
              {isSelected && (
                <circle cx={c.x} cy={c.y} r={r + 4} fill="none" stroke={accentColor} strokeWidth={1}>
                  <animate attributeName="r" from={r} to={r + 12} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Dot */}
              <circle
                cx={c.x} cy={c.y} r={r}
                fill={c.isRelevant ? c.color : `${COLORS.text}25`}
                opacity={opacity}
                stroke={isSelected ? accentColor : isHovered ? `${c.color}88` : 'none'}
                strokeWidth={isSelected ? 1.5 : isHovered ? 1 : 0}
              />

              {/* Label — top 5 always visible, others on hover/select */}
              {(isSelected || isHovered || (isTop && c.isRelevant && zoomLevel < 2)) && (
                <>
                  <rect
                    x={c.x - 24} y={c.y - r - 14}
                    width={48} height={12} rx={3}
                    fill={`${COLORS.bg}dd`}
                    stroke={`${c.color}33`} strokeWidth={0.5}
                  />
                  <text
                    x={c.x} y={c.y - r - 5.5}
                    textAnchor="middle"
                    fill={isSelected ? accentColor : `${COLORS.text}cc`}
                    fontSize={zoomLevel > 1.5 ? 6 : 5}
                    fontFamily="monospace"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                  >
                    {isSelected || isHovered ? c.name : c.code}
                  </text>
                </>
              )}

              {/* Score on hover */}
              {(isSelected || isHovered) && (
                <text
                  x={c.x} y={c.y + r + 9}
                  textAnchor="middle"
                  fill={c.color}
                  fontSize={5} fontFamily="monospace"
                >
                  {c.techScore}
                </text>
              )}
            </g>
          );
        })}

        {/* ── Signal dots ─────────────────────────────────────────────── */}
        {signalDots.map(s => {
          const isHovered = hoveredSignal === s.idx;
          return (
            <g
              key={`sig-${s.idx}`}
              onMouseEnter={() => setHoveredSignal(s.idx)}
              onMouseLeave={() => setHoveredSignal(null)}
              className="cursor-pointer"
            >
              {/* Pulse */}
              <circle cx={s.x} cy={s.y} r={s.r} fill="none" stroke={s.color} strokeWidth={0.6}>
                <animate attributeName="r" from={s.r} to={s.r + 8} dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
              </circle>
              {/* Core */}
              <circle
                cx={s.x} cy={s.y}
                r={isHovered ? s.r * 1.5 : s.r}
                fill={s.color} opacity={isHovered ? 0.95 : 0.75}
              />
              {/* Tooltip */}
              {isHovered && (
                <>
                  <rect
                    x={s.x - 60} y={s.y - s.r - 18}
                    width={120} height={14} rx={4}
                    fill={`${COLORS.bg}ee`} stroke={`${s.color}44`} strokeWidth={0.5}
                  />
                  <text
                    x={s.x} y={s.y - s.r - 8}
                    textAnchor="middle" fill={s.color}
                    fontSize={5} fontFamily="monospace"
                  >
                    {s.title.length > 30 ? s.title.slice(0, 28) + '...' : s.title}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* ── Controls ──────────────────────────────────────────────────── */}
      <div className="absolute top-3 right-3 flex flex-col gap-1">
        <button
          onClick={() => setViewBox(prev => {
            const f = 0.8;
            const newW = Math.max(200, prev.w * f);
            const newH = Math.max(100, prev.h * f);
            return { x: prev.x + (prev.w - newW) / 2, y: prev.y + (prev.h - newH) / 2, w: newW, h: newH };
          })}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[14px] font-bold cursor-pointer"
          style={{ background: `${COLORS.card}ee`, border: `1px solid ${COLORS.border}`, color: `${COLORS.text}66` }}
        >+</button>
        <button
          onClick={() => setViewBox(prev => {
            const f = 1.25;
            const newW = Math.min(W, prev.w * f);
            const newH = Math.min(H, prev.h * f);
            return { x: Math.max(0, prev.x - (newW - prev.w) / 2), y: Math.max(0, prev.y - (newH - prev.h) / 2), w: newW, h: newH };
          })}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[14px] font-bold cursor-pointer"
          style={{ background: `${COLORS.card}ee`, border: `1px solid ${COLORS.border}`, color: `${COLORS.text}66` }}
        >−</button>
        {zoomLevel > 1.1 && (
          <button
            onClick={resetZoom}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[7px] cursor-pointer"
            style={{ background: `${COLORS.card}ee`, border: `1px solid ${COLORS.border}`, color: `${COLORS.text}40` }}
          >1x</button>
        )}
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mt-2 font-mono text-[7px] tracking-[0.1em]" style={{ color: `${COLORS.text}45` }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: accentColor, opacity: 0.8 }} />
          ACTIVE
        </span>
        {signalDots.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: COLORS.orange, opacity: 0.8 }} />
            SIGNALS
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-px" style={{ background: accentColor, opacity: 0.4 }} />
          CONNECTION
        </span>
        <span style={{ color: `${COLORS.text}25` }}>DRAG · SCROLL · CLICK</span>
      </div>
    </div>
  );
}
