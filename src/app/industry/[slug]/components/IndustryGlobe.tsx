'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { COLORS } from '@/lib/tokens';

// ─── Types ──────────────────────────────────────────────────────────────────

type CountryTechProfile = {
  code: string;
  name: string;
  primarySectors: string[];
  keyCompanies: string[];
  signalKeywords: string[];
  techScore: number;
  color: string;
  lat: number;
  lon: number;
};

interface IndustryGlobeProps {
  countries: CountryTechProfile[];
  accentColor: string;
  industryCategory: string;
  selectedCountryCode: string | null;
  onCountrySelect: (code: string | null) => void;
  highlightedCodes?: string[];
}

// ─── Math: Orthographic projection ──────────────────────────────────────────

const DEG = Math.PI / 180;

function project(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number,
  R: number,
): { x: number; y: number; visible: boolean } {
  const λ = lon * DEG;
  const φ = lat * DEG;
  const λ0 = centerLon * DEG;
  const φ0 = centerLat * DEG;

  const cosC =
    Math.sin(φ0) * Math.sin(φ) +
    Math.cos(φ0) * Math.cos(φ) * Math.cos(λ - λ0);

  if (cosC < 0) return { x: 0, y: 0, visible: false };

  const x = R * Math.cos(φ) * Math.sin(λ - λ0);
  const y = R * (Math.cos(φ0) * Math.sin(φ) - Math.sin(φ0) * Math.cos(φ) * Math.cos(λ - λ0));

  return { x, y, visible: true };
}

// ─── Arc path between two points on the globe ──────────────────────────────

function arcPath(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  centerLat: number,
  centerLon: number,
  R: number,
  steps = 24,
): string | null {
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = lat1 + (lat2 - lat1) * t;
    const lon = lon1 + (lon2 - lon1) * t;
    const p = project(lat, lon, centerLat, centerLon, R);
    if (!p.visible) return null; // arc goes behind globe
    points.push(p);
  }

  if (points.length < 2) return null;
  return `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`;
}

// ─── Graticule (grid lines) ─────────────────────────────────────────────────

function graticulePaths(
  centerLat: number,
  centerLon: number,
  R: number,
): string[] {
  const paths: string[] = [];
  const steps = 60;

  // Latitude lines
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const lon = -180 + (360 * i) / steps;
      const p = project(lat, lon, centerLat, centerLon, R);
      if (p.visible) pts.push(`${p.x},${p.y}`);
      else if (pts.length > 0) {
        paths.push(`M ${pts.join(' L ')}`);
        pts.length = 0;
      }
    }
    if (pts.length > 1) paths.push(`M ${pts.join(' L ')}`);
  }

  // Longitude lines
  for (let lon = -180; lon < 180; lon += 30) {
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const lat = -90 + (180 * i) / steps;
      const p = project(lat, lon, centerLat, centerLon, R);
      if (p.visible) pts.push(`${p.x},${p.y}`);
      else if (pts.length > 0) {
        paths.push(`M ${pts.join(' L ')}`);
        pts.length = 0;
      }
    }
    if (pts.length > 1) paths.push(`M ${pts.join(' L ')}`);
  }

  return paths;
}

// ─── Continent outlines (simplified) ────────────────────────────────────────

const CONTINENT_PATHS: { coords: [number, number][] }[] = [
  // North America
  { coords: [
    [50, -130], [55, -120], [60, -110], [55, -100], [50, -95], [48, -88],
    [45, -80], [40, -75], [35, -80], [30, -85], [25, -80], [20, -90],
    [15, -92], [18, -100], [22, -105], [25, -110], [30, -115], [35, -120],
    [40, -125], [45, -125], [50, -130],
  ]},
  // South America
  { coords: [
    [10, -75], [5, -78], [0, -80], [-5, -80], [-10, -77], [-15, -75],
    [-20, -70], [-25, -65], [-30, -60], [-35, -58], [-40, -65],
    [-45, -68], [-50, -72], [-55, -68], [-50, -60], [-45, -55],
    [-35, -50], [-25, -45], [-15, -40], [-10, -37], [-5, -35],
    [0, -50], [5, -60], [10, -68], [10, -75],
  ]},
  // Europe
  { coords: [
    [38, -10], [40, 0], [43, 5], [46, 8], [48, 15], [52, 14],
    [55, 20], [58, 25], [60, 30], [65, 25], [70, 30], [70, 20],
    [68, 15], [62, 10], [58, 5], [55, 0], [50, -5], [45, -8], [38, -10],
  ]},
  // Africa
  { coords: [
    [35, -5], [32, 0], [30, 10], [25, 35], [20, 40], [15, 42],
    [10, 45], [5, 42], [0, 40], [-5, 38], [-10, 35], [-15, 35],
    [-20, 30], [-25, 30], [-30, 28], [-35, 20], [-33, 18],
    [-28, 15], [-20, 12], [-15, 10], [-10, 8], [-5, 5],
    [0, 5], [5, 0], [10, -5], [15, -15], [20, -15],
    [25, -12], [30, -8], [35, -5],
  ]},
  // Asia
  { coords: [
    [30, 35], [35, 40], [40, 45], [45, 50], [50, 55], [55, 65],
    [60, 70], [65, 80], [68, 90], [70, 100], [65, 110], [60, 120],
    [55, 130], [50, 135], [45, 140], [40, 135], [35, 130],
    [30, 120], [25, 110], [20, 105], [15, 100], [10, 100],
    [15, 80], [20, 70], [25, 60], [28, 50], [30, 35],
  ]},
  // Australia
  { coords: [
    [-15, 130], [-12, 135], [-15, 140], [-20, 148], [-25, 150],
    [-30, 150], [-35, 148], [-38, 145], [-35, 140], [-32, 135],
    [-28, 130], [-25, 120], [-22, 115], [-18, 120], [-15, 125],
    [-15, 130],
  ]},
];

function continentPaths(
  centerLat: number,
  centerLon: number,
  R: number,
): string[] {
  return CONTINENT_PATHS.map(({ coords }) => {
    const pts: { x: number; y: number }[] = [];
    for (const [lat, lon] of coords) {
      const p = project(lat, lon, centerLat, centerLon, R);
      if (p.visible) pts.push(p);
    }
    if (pts.length < 3) return '';
    return `M ${pts.map((p) => `${p.x},${p.y}`).join(' L ')} Z`;
  }).filter(Boolean);
}

// ─── Component ──────────────────────────────────────────────────────────────

export function IndustryGlobe({
  countries,
  accentColor,
  industryCategory,
  selectedCountryCode,
  onCountrySelect,
  highlightedCodes = [],
}: IndustryGlobeProps) {
  const SIZE = 380;
  const R = SIZE * 0.42;
  const CX = SIZE / 2;
  const CY = SIZE / 2;

  // Auto-rotate
  const [rotation, setRotation] = useState({ lat: 20, lon: 0 });
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, lat: 0, lon: 0 });

  // Slow auto-rotation
  useEffect(() => {
    let frame: number;
    const animate = () => {
      if (!isDragging.current && !selectedCountryCode && !hoveredCode) {
        setRotation((prev) => ({ ...prev, lon: prev.lon + 0.15 }));
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [selectedCountryCode, hoveredCode]);

  // Snap to selected country
  useEffect(() => {
    if (selectedCountryCode) {
      const c = countries.find((c) => c.code === selectedCountryCode);
      if (c) setRotation({ lat: c.lat * 0.5, lon: -c.lon });
    }
  }, [selectedCountryCode, countries]);

  // Drag to rotate
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY, lat: rotation.lat, lon: rotation.lon };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [rotation],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setRotation({
      lon: dragStart.current.lon - dx * 0.3,
      lat: Math.max(-60, Math.min(60, dragStart.current.lat + dy * 0.3)),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Filter relevant countries (those with sectors matching this industry)
  const relevantCountries = useMemo(() => {
    const catLower = industryCategory.toLowerCase();
    return countries.filter((c) =>
      c.primarySectors.some((s) => s.toLowerCase().includes(catLower) || catLower.includes(s.toLowerCase())),
    );
  }, [countries, industryCategory]);

  // Build connection arcs between countries that share sectors
  const connections = useMemo(() => {
    const arcs: { from: CountryTechProfile; to: CountryTechProfile; strength: number }[] = [];
    const relevant = relevantCountries.length > 0 ? relevantCountries : countries.slice(0, 8);

    for (let i = 0; i < relevant.length; i++) {
      for (let j = i + 1; j < relevant.length; j++) {
        const a = relevant[i];
        const b = relevant[j];
        const shared = a.primarySectors.filter((s) =>
          b.primarySectors.some((bs) => bs.toLowerCase() === s.toLowerCase()),
        ).length;
        if (shared > 0) {
          arcs.push({ from: a, to: b, strength: shared });
        }
      }
    }

    // Keep top connections to avoid visual clutter
    return arcs.sort((a, b) => b.strength - a.strength).slice(0, 12);
  }, [relevantCountries, countries]);

  // Projected data
  const projectedCountries = useMemo(() => {
    return countries.map((c) => {
      const p = project(c.lat, c.lon, rotation.lat, rotation.lon, R);
      const isRelevant = relevantCountries.some((rc) => rc.code === c.code);
      const isHighlighted = highlightedCodes.length === 0 || highlightedCodes.includes(c.code);
      return { ...c, ...p, isRelevant, isHighlighted };
    });
  }, [countries, rotation, R, relevantCountries, highlightedCodes]);

  const projectedArcs = useMemo(() => {
    return connections
      .map((conn) => {
        const path = arcPath(
          conn.from.lat, conn.from.lon,
          conn.to.lat, conn.to.lon,
          rotation.lat, rotation.lon,
          R,
        );
        return path ? { ...conn, path } : null;
      })
      .filter(Boolean) as { from: CountryTechProfile; to: CountryTechProfile; strength: number; path: string }[];
  }, [connections, rotation, R]);

  const graticule = useMemo(
    () => graticulePaths(rotation.lat, rotation.lon, R),
    [rotation, R],
  );

  const continents = useMemo(
    () => continentPaths(rotation.lat, rotation.lon, R),
    [rotation, R],
  );

  return (
    <div className="relative flex flex-col items-center">
      {/* Globe SVG */}
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`${-CX} ${-CY} ${SIZE} ${SIZE}`}
        className="cursor-grab active:cursor-grabbing select-none"
        style={{ maxWidth: '100%' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Defs */}
        <defs>
          <radialGradient id="globe-bg" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#1a1e28" />
            <stop offset="100%" stopColor="#0d0f12" />
          </radialGradient>
          <radialGradient id="globe-glow" cx="50%" cy="50%">
            <stop offset="80%" stopColor="transparent" />
            <stop offset="100%" stopColor={`${accentColor}08`} />
          </radialGradient>
          <filter id="arc-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="dot-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Globe sphere */}
        <circle r={R} fill="url(#globe-bg)" stroke={`${COLORS.border}`} strokeWidth={0.5} />
        <circle r={R} fill="url(#globe-glow)" />

        {/* Graticule */}
        {graticule.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={`${COLORS.text}06`} strokeWidth={0.3} />
        ))}

        {/* Continent outlines */}
        {continents.map((d, i) => (
          <path key={`c-${i}`} d={d} fill={`${COLORS.text}05`} stroke={`${COLORS.text}12`} strokeWidth={0.5} />
        ))}

        {/* Connection arcs */}
        {projectedArcs.map((arc, i) => (
          <path
            key={`arc-${i}`}
            d={arc.path}
            fill="none"
            stroke={accentColor}
            strokeWidth={0.5 + arc.strength * 0.4}
            strokeOpacity={selectedCountryCode
              ? (arc.from.code === selectedCountryCode || arc.to.code === selectedCountryCode ? 0.5 : 0.08)
              : 0.2
            }
            filter="url(#arc-glow)"
            strokeDasharray="3,4"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="-14"
              dur={`${3 + i * 0.5}s`}
              repeatCount="indefinite"
            />
          </path>
        ))}

        {/* Country dots */}
        {projectedCountries
          .filter((c) => c.visible)
          .sort((a, b) => {
            // Selected/hovered on top
            if (a.code === selectedCountryCode || a.code === hoveredCode) return 1;
            if (b.code === selectedCountryCode || b.code === hoveredCode) return -1;
            return 0;
          })
          .map((c) => {
            const isSelected = c.code === selectedCountryCode;
            const isHovered = c.code === hoveredCode;
            const baseR = c.isRelevant ? 4 + (c.techScore / 100) * 4 : 2;
            const r = isSelected ? baseR * 1.6 : isHovered ? baseR * 1.3 : baseR;
            const opacity = c.isRelevant
              ? c.isHighlighted ? 1 : 0.3
              : 0.15;

            return (
              <g
                key={c.code}
                className="cursor-pointer"
                onClick={() => onCountrySelect(isSelected ? null : c.code)}
                onMouseEnter={() => setHoveredCode(c.code)}
                onMouseLeave={() => setHoveredCode(null)}
              >
                {/* Pulse ring for selected */}
                {isSelected && (
                  <circle cx={c.x} cy={c.y} r={r + 6} fill="none" stroke={accentColor} strokeWidth={0.8}>
                    <animate attributeName="r" from={r + 2} to={r + 10} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Glow */}
                {c.isRelevant && (
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={r * 2}
                    fill={c.color}
                    opacity={isSelected ? 0.15 : 0.06}
                    filter="url(#dot-glow)"
                  />
                )}

                {/* Dot */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={r}
                  fill={c.isRelevant ? c.color : `${COLORS.text}40`}
                  opacity={opacity}
                  stroke={isSelected ? accentColor : 'none'}
                  strokeWidth={isSelected ? 1.5 : 0}
                />

                {/* Label */}
                {(isSelected || isHovered) && (
                  <text
                    x={c.x}
                    y={c.y - r - 6}
                    textAnchor="middle"
                    fill={COLORS.text}
                    fontSize={8}
                    fontFamily="monospace"
                    opacity={0.9}
                  >
                    {c.name}
                  </text>
                )}
              </g>
            );
          })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 font-mono text-[7px] tracking-[0.1em]" style={{ color: `${COLORS.text}40` }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: accentColor, opacity: 0.8 }} />
          RELEVANT
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-0.5 rounded" style={{ background: accentColor, opacity: 0.4 }} />
          CONNECTION
        </span>
        <span style={{ color: `${COLORS.text}25` }}>DRAG TO ROTATE</span>
      </div>
    </div>
  );
}
