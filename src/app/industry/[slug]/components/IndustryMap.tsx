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

// ─── Mercator projection ────────────────────────────────────────────────────

function mercatorX(lon: number, width: number): number {
  return ((lon + 180) / 360) * width;
}

function mercatorY(lat: number, height: number): number {
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  return (height / 2) - (height * mercN) / (2 * Math.PI);
}

// ─── Simplified continent outlines (lon/lat pairs) ─────────────────────────

const CONTINENTS: [number, number][][] = [
  // North America
  [[-130,50],[-120,55],[-110,60],[-100,55],[-95,50],[-88,48],[-80,45],[-75,40],[-80,35],[-85,30],[-80,25],[-90,20],[-92,15],[-100,18],[-105,22],[-110,25],[-115,30],[-120,35],[-125,40],[-125,45],[-130,50]],
  // South America
  [[-75,10],[-78,5],[-80,0],[-80,-5],[-77,-10],[-75,-15],[-70,-20],[-65,-25],[-60,-30],[-58,-35],[-65,-40],[-68,-45],[-72,-50],[-68,-55],[-60,-50],[-55,-45],[-50,-35],[-45,-25],[-40,-15],[-37,-10],[-35,-5],[-50,0],[-60,5],[-68,10],[-75,10]],
  // Europe
  [[-10,38],[0,40],[5,43],[8,46],[15,48],[14,52],[10,53],[12,55],[15,55],[20,58],[22,60],[24,61],[28,64],[28,66],[30,68],[28,70],[20,70],[15,68],[14,67],[8,64],[5,62],[5,60],[5,58],[9,56],[8,55],[5,54],[4,52],[3,51],[0,49],[-3,48],[-2,46],[0,45],[-1,44],[-2,43],[-4,42],[-5,40],[-8,37],[-10,38]],
  // Africa
  [[-5,35],[0,32],[10,30],[35,25],[40,20],[42,15],[45,10],[42,5],[40,0],[38,-5],[35,-10],[35,-15],[30,-20],[30,-25],[28,-30],[20,-35],[18,-33],[15,-28],[12,-20],[10,-15],[8,-10],[5,-5],[5,0],[0,5],[-5,10],[-15,15],[-15,20],[-17,22],[-17,24],[-13,26],[-10,28],[-8,30],[-5,35]],
  // Asia
  [[35,30],[40,35],[45,40],[50,45],[55,50],[65,55],[70,60],[80,65],[90,68],[100,70],[110,65],[120,60],[130,55],[135,50],[140,45],[135,40],[130,35],[120,30],[110,25],[105,20],[100,15],[100,10],[80,15],[70,20],[60,25],[50,28],[35,30]],
  // Australia
  [[130,-15],[135,-12],[140,-15],[148,-20],[150,-25],[150,-30],[148,-35],[145,-38],[140,-35],[135,-32],[130,-28],[120,-25],[115,-22],[120,-18],[125,-15],[130,-15]],
];

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

  // Pan state — flag-based, no pointer capture
  const panRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    vx: number;
    vy: number;
    moved: boolean;
  }>({ active: false, startX: 0, startY: 0, vx: 0, vy: 0, moved: false });
  const [dragging, setDragging] = useState(false);

  const W = 1000;
  const H = 560;

  const PAN_THRESHOLD = 3; // px before we consider it a drag (not a click)

  // ── Build continent SVG path strings using mercator projection ──────────
  const continentPaths = useMemo(() => {
    return CONTINENTS.map(coords => {
      const points = coords.map(([lon, lat]) => {
        const x = mercatorX(lon, W);
        const y = mercatorY(lat, H);
        return [x, y] as [number, number];
      });
      const d = points
        .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`)
        .join(' ') + ' Z';
      return d;
    });
  }, []);

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

  // Pointer down on SVG background — start potential pan
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    panRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      vx: viewBox.x,
      vy: viewBox.y,
      moved: false,
    };
  }, [viewBox.x, viewBox.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const pan = panRef.current;
    if (!pan.active) return;

    const dx = e.clientX - pan.startX;
    const dy = e.clientY - pan.startY;

    // Only start dragging if moved past threshold
    if (!pan.moved && Math.abs(dx) < PAN_THRESHOLD && Math.abs(dy) < PAN_THRESHOLD) return;

    if (!pan.moved) {
      pan.moved = true;
      setDragging(true);
    }

    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;

    setViewBox(prev => ({
      ...prev,
      x: Math.max(0, Math.min(W - prev.w, pan.vx - dx * scaleX)),
      y: Math.max(0, Math.min(H - prev.h, pan.vy - dy * scaleY)),
    }));
  }, [viewBox.w, viewBox.h]);

  const handlePointerUp = useCallback(() => {
    panRef.current.active = false;
    panRef.current.moved = false;
    setDragging(false);
  }, []);

  // Also cancel pan if pointer leaves window
  useEffect(() => {
    const cancel = () => {
      panRef.current.active = false;
      panRef.current.moved = false;
      setDragging(false);
    };
    window.addEventListener('pointerup', cancel);
    return () => window.removeEventListener('pointerup', cancel);
  }, []);

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
          background: `linear-gradient(180deg, #080a10 0%, ${COLORS.bg} 40%, #080a10 100%)`,
          borderRadius: 16,
          border: `1px solid ${accentColor}12`,
          boxShadow: `inset 0 0 60px ${accentColor}04, 0 0 30px ${COLORS.bg}`,
          cursor: dragging ? 'grabbing' : 'grab',
          aspectRatio: '2 / 1',
          maxHeight: 420,
          userSelect: 'none',
        }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <defs>
          <filter id="map-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="arc-glow-map">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="land-shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor={accentColor} floodOpacity="0.06" />
          </filter>
          {/* Vignette gradient */}
          <radialGradient id="map-vignette" cx="50%" cy="50%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="70%" stopColor="transparent" />
            <stop offset="100%" stopColor="#0d0f12" stopOpacity="0.7" />
          </radialGradient>
          {/* Ambient light gradient on land */}
          <linearGradient id="land-ambient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.04" />
            <stop offset="50%" stopColor={`${COLORS.text}`} stopOpacity="0.06" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* ── Ocean texture — subtle grid ───────────────────────────────── */}
        {Array.from({ length: 13 }, (_, i) => -90 + i * 15).map(lat => (
          <line
            key={`lat${lat}`}
            x1={0} y1={mercatorY(lat, H)}
            x2={W} y2={mercatorY(lat, H)}
            stroke={`${COLORS.text}04`} strokeWidth={0.4}
            pointerEvents="none"
          />
        ))}
        {Array.from({ length: 25 }, (_, i) => -180 + i * 15).map(lon => (
          <line
            key={`lon${lon}`}
            x1={mercatorX(lon, W)} y1={0}
            x2={mercatorX(lon, W)} y2={H}
            stroke={`${COLORS.text}04`} strokeWidth={0.4}
            pointerEvents="none"
          />
        ))}
        {/* Equator + prime meridian — slightly brighter */}
        <line x1={0} y1={mercatorY(0, H)} x2={W} y2={mercatorY(0, H)} stroke={`${COLORS.text}08`} strokeWidth={0.6} pointerEvents="none" />
        <line x1={mercatorX(0, W)} y1={0} x2={mercatorX(0, W)} y2={H} stroke={`${COLORS.text}08`} strokeWidth={0.6} pointerEvents="none" />

        {/* ── Continent fills ──────────────────────────────────────────── */}
        {continentPaths.map((d, i) => (
          <path
            key={`continent-fill-${i}`}
            d={d}
            fill="url(#land-ambient)"
            stroke="none"
            pointerEvents="none"
            filter="url(#land-shadow)"
          />
        ))}
        {/* Continent borders — accent-tinted */}
        {continentPaths.map((d, i) => (
          <path
            key={`continent-border-${i}`}
            d={d}
            fill="none"
            stroke={`${accentColor}18`}
            strokeWidth={0.8}
            strokeLinejoin="round"
            pointerEvents="none"
          />
        ))}
        {/* Continent inner glow */}
        {continentPaths.map((d, i) => (
          <path
            key={`continent-glow-${i}`}
            d={d}
            fill="none"
            stroke={`${COLORS.text}06`}
            strokeWidth={2}
            strokeLinejoin="round"
            pointerEvents="none"
          />
        ))}

        {/* ── Vignette overlay ──────────────────────────────────────────── */}
        <rect x={0} y={0} width={W} height={H} fill="url(#map-vignette)" pointerEvents="none" />

        {/* ── Connection arcs ─────────────────────────────────────────── */}
        {arcs.map((arc, i) => {
          const mx = (arc.x1 + arc.x2) / 2;
          const my = (arc.y1 + arc.y2) / 2 - 25 - arc.strength * 8;
          return (
            <g key={`arc-${i}`} pointerEvents="none">
              {/* Wide glow underneath */}
              <path
                d={`M ${arc.x1},${arc.y1} Q ${mx},${my} ${arc.x2},${arc.y2}`}
                fill="none"
                stroke={accentColor}
                strokeWidth={2 + arc.strength * 0.8}
                strokeOpacity={0.06}
                filter="url(#arc-glow-map)"
              />
              {/* Main arc */}
              <path
                d={`M ${arc.x1},${arc.y1} Q ${mx},${my} ${arc.x2},${arc.y2}`}
                fill="none"
                stroke={accentColor}
                strokeWidth={0.6 + arc.strength * 0.3}
                strokeOpacity={0.25}
                strokeDasharray="5,7"
                strokeLinecap="round"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-24" dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" />
              </path>
              {/* Bright endpoints */}
              <circle cx={arc.x1} cy={arc.y1} r={1.5} fill={accentColor} opacity={0.2} />
              <circle cx={arc.x2} cy={arc.y2} r={1.5} fill={accentColor} opacity={0.2} />
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
              style={{ pointerEvents: 'all' }}
              onClick={(e) => {
                e.stopPropagation();
                // Ignore clicks that were actually drags
                if (panRef.current.moved) return;
                onCountrySelect(isSelected ? null : c.code);
                if (!isSelected) flyTo(c.code);
              }}
              onMouseEnter={() => setHoveredCountry(c.code)}
              onMouseLeave={() => setHoveredCountry(null)}
            >
              {/* Invisible larger hit area */}
              <circle cx={c.x} cy={c.y} r={Math.max(r * 2, 8)} fill="transparent" />

              {/* Large ambient glow */}
              {c.isRelevant && (
                <circle cx={c.x} cy={c.y} r={r * 3.5} fill={c.color} opacity={isSelected ? 0.1 : isHovered ? 0.08 : 0.04} filter="url(#map-glow)" pointerEvents="none" />
              )}

              {/* Pulse rings for selected */}
              {isSelected && (
                <>
                  <circle cx={c.x} cy={c.y} r={r + 4} fill="none" stroke={accentColor} strokeWidth={1} pointerEvents="none">
                    <animate attributeName="r" from={r} to={r + 16} dur="2.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.5" to="0" dur="2.5s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={c.x} cy={c.y} r={r + 2} fill="none" stroke={accentColor} strokeWidth={0.6} pointerEvents="none">
                    <animate attributeName="r" from={r} to={r + 12} dur="2.5s" begin="0.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.3" to="0" dur="2.5s" begin="0.5s" repeatCount="indefinite" />
                  </circle>
                </>
              )}

              {/* Outer ring for relevant countries */}
              {c.isRelevant && !isSelected && (
                <circle cx={c.x} cy={c.y} r={r + 2} fill="none" stroke={c.color} strokeWidth={0.5} opacity={isHovered ? 0.5 : 0.2} pointerEvents="none" />
              )}

              {/* Core dot */}
              <circle
                cx={c.x} cy={c.y} r={r}
                fill={c.isRelevant ? c.color : `${COLORS.text}20`}
                opacity={opacity}
                stroke={isSelected ? accentColor : isHovered ? `${c.color}99` : 'none'}
                strokeWidth={isSelected ? 2 : isHovered ? 1 : 0}
                pointerEvents="none"
              />
              {/* Inner bright center */}
              {c.isRelevant && (
                <circle cx={c.x} cy={c.y} r={r * 0.4} fill="#fff" opacity={isSelected ? 0.5 : isHovered ? 0.35 : 0.15} pointerEvents="none" />
              )}

              {/* Label — top 5 always visible, others on hover/select */}
              {(isSelected || isHovered || (isTop && c.isRelevant && zoomLevel < 2)) && (
                <>
                  <rect
                    x={c.x - 24} y={c.y - r - 14}
                    width={48} height={12} rx={3}
                    fill={`${COLORS.bg}dd`}
                    stroke={`${c.color}33`} strokeWidth={0.5}
                    pointerEvents="none"
                  />
                  <text
                    x={c.x} y={c.y - r - 5.5}
                    textAnchor="middle"
                    fill={isSelected ? accentColor : `${COLORS.text}cc`}
                    fontSize={zoomLevel > 1.5 ? 6 : 5}
                    fontFamily="monospace"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    pointerEvents="none"
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
                  pointerEvents="none"
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
              style={{ pointerEvents: 'all' }}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={() => setHoveredSignal(s.idx)}
              onMouseLeave={() => setHoveredSignal(null)}
              className="cursor-pointer"
            >
              {/* Invisible larger hit area */}
              <circle cx={s.x} cy={s.y} r={Math.max(s.r * 2, 8)} fill="transparent" />

              {/* Pulse */}
              <circle cx={s.x} cy={s.y} r={s.r} fill="none" stroke={s.color} strokeWidth={0.6} pointerEvents="none">
                <animate attributeName="r" from={s.r} to={s.r + 8} dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
              </circle>
              {/* Core */}
              <circle
                cx={s.x} cy={s.y}
                r={isHovered ? s.r * 1.5 : s.r}
                fill={s.color} opacity={isHovered ? 0.95 : 0.75}
                pointerEvents="none"
              />
              {/* Tooltip */}
              {isHovered && (
                <>
                  <rect
                    x={s.x - 60} y={s.y - s.r - 18}
                    width={120} height={14} rx={4}
                    fill={`${COLORS.bg}ee`} stroke={`${s.color}44`} strokeWidth={0.5}
                    pointerEvents="none"
                  />
                  <text
                    x={s.x} y={s.y - s.r - 8}
                    textAnchor="middle" fill={s.color}
                    fontSize={5} fontFamily="monospace"
                    pointerEvents="none"
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
      <div className="absolute top-3 right-3 flex flex-col gap-1" style={{ zIndex: 10 }}>
        <button
          onClick={() => setViewBox(prev => {
            const f = 0.75;
            const newW = Math.max(200, prev.w * f);
            const newH = Math.max(100, prev.h * f);
            return { x: prev.x + (prev.w - newW) / 2, y: prev.y + (prev.h - newH) / 2, w: newW, h: newH };
          })}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[14px] font-bold cursor-pointer transition-all"
          style={{ background: `${COLORS.card}dd`, border: `1px solid ${accentColor}20`, color: `${COLORS.text}88`, backdropFilter: 'blur(8px)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = `${accentColor}50`; e.currentTarget.style.color = accentColor; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = `${accentColor}20`; e.currentTarget.style.color = `${COLORS.text}88`; }}
        >+</button>
        <button
          onClick={() => setViewBox(prev => {
            const f = 1.35;
            const newW = Math.min(W, prev.w * f);
            const newH = Math.min(H, prev.h * f);
            return { x: Math.max(0, prev.x - (newW - prev.w) / 2), y: Math.max(0, prev.y - (newH - prev.h) / 2), w: newW, h: newH };
          })}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[14px] font-bold cursor-pointer transition-all"
          style={{ background: `${COLORS.card}dd`, border: `1px solid ${accentColor}20`, color: `${COLORS.text}88`, backdropFilter: 'blur(8px)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = `${accentColor}50`; e.currentTarget.style.color = accentColor; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = `${accentColor}20`; e.currentTarget.style.color = `${COLORS.text}88`; }}
        >-</button>
        {zoomLevel > 1.1 && (
          <button
            onClick={resetZoom}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[8px] tracking-wider cursor-pointer transition-all"
            style={{ background: `${COLORS.card}dd`, border: `1px solid ${accentColor}20`, color: `${COLORS.text}55`, backdropFilter: 'blur(8px)' }}
          >1:1</button>
        )}
      </div>

      {/* ── Zoom indicator ──────────────────────────────────────────── */}
      {zoomLevel > 1.1 && (
        <div className="absolute top-3 left-3 font-mono text-[8px] px-2 py-1 rounded-md" style={{ background: `${COLORS.card}cc`, border: `1px solid ${accentColor}15`, color: `${accentColor}88`, backdropFilter: 'blur(8px)' }}>
          {zoomLevel.toFixed(1)}x
        </div>
      )}

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
