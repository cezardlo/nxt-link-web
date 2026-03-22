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

type SignalItem = {
  title: string;
  industry: string;
  importance: number;
  company?: string | null;
};

interface IndustryGlobeProps {
  countries: CountryTechProfile[];
  accentColor: string;
  industryCategory: string;
  selectedCountryCode: string | null;
  onCountrySelect: (code: string | null) => void;
  highlightedCodes?: string[];
  signals?: SignalItem[];
}

// ─── Math ───────────────────────────────────────────────────────────────────

const DEG = Math.PI / 180;

function project(
  lat: number, lon: number,
  cLat: number, cLon: number,
  R: number,
): { x: number; y: number; visible: boolean; depth: number } {
  const λ = lon * DEG, φ = lat * DEG;
  const λ0 = cLon * DEG, φ0 = cLat * DEG;
  const cosC = Math.sin(φ0) * Math.sin(φ) + Math.cos(φ0) * Math.cos(φ) * Math.cos(λ - λ0);
  if (cosC < 0) return { x: 0, y: 0, visible: false, depth: 0 };
  const x = R * Math.cos(φ) * Math.sin(λ - λ0);
  const y = R * (Math.cos(φ0) * Math.sin(φ) - Math.sin(φ0) * Math.cos(φ) * Math.cos(λ - λ0));
  return { x, y, visible: true, depth: cosC };
}

// Great-circle arc (bulges outward properly)
function greatCircleArc(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
  cLat: number, cLon: number,
  R: number, steps = 32,
): string | null {
  const φ1 = lat1 * DEG, λ1 = lon1 * DEG;
  const φ2 = lat2 * DEG, λ2 = lon2 * DEG;

  // Convert to cartesian on unit sphere
  const x1 = Math.cos(φ1) * Math.cos(λ1), y1 = Math.cos(φ1) * Math.sin(λ1), z1 = Math.sin(φ1);
  const x2 = Math.cos(φ2) * Math.cos(λ2), y2 = Math.cos(φ2) * Math.sin(λ2), z2 = Math.sin(φ2);

  const d = Math.acos(Math.min(1, x1 * x2 + y1 * y2 + z1 * z2));
  if (d < 0.001) return null;

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const sinD = Math.sin(d);
    const a = Math.sin((1 - t) * d) / sinD;
    const b = Math.sin(t * d) / sinD;
    const xi = a * x1 + b * x2;
    const yi = a * y1 + b * y2;
    const zi = a * z1 + b * z2;
    const lat = Math.atan2(zi, Math.sqrt(xi * xi + yi * yi)) / DEG;
    const lon = Math.atan2(yi, xi) / DEG;
    const p = project(lat, lon, cLat, cLon, R);
    if (!p.visible) return null;
    points.push(p);
  }
  if (points.length < 2) return null;
  return `M ${points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;
}

// ─── Graticule ──────────────────────────────────────────────────────────────

function graticulePaths(cLat: number, cLon: number, R: number): string[] {
  const paths: string[] = [];
  const steps = 80;

  for (let lat = -75; lat <= 75; lat += 15) {
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const lon = -180 + (360 * i) / steps;
      const p = project(lat, lon, cLat, cLon, R);
      if (p.visible) pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      else if (pts.length > 1) { paths.push(`M ${pts.join(' L ')}`); pts.length = 0; }
    }
    if (pts.length > 1) paths.push(`M ${pts.join(' L ')}`);
  }

  for (let lon = -180; lon < 180; lon += 20) {
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const lat = -90 + (180 * i) / steps;
      const p = project(lat, lon, cLat, cLon, R);
      if (p.visible) pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      else if (pts.length > 1) { paths.push(`M ${pts.join(' L ')}`); pts.length = 0; }
    }
    if (pts.length > 1) paths.push(`M ${pts.join(' L ')}`);
  }

  return paths;
}

// ─── Detailed continent outlines ────────────────────────────────────────────

const CONTINENT_PATHS: [number, number][][] = [
  // North America (detailed)
  [[72,-168],[71,-156],[70,-141],[68,-138],[61,-139],[60,-141],[59,-150],[57,-157],[56,-160],[55,-163],
   [53,-167],[52,-170],[51,-178],[53,172],[56,163],[59,163],[62,167],[64,170],[67,169],[70,180],[71,180],
   [72,180],[72,-168]],
  [[60,-142],[60,-139],[58,-136],[56,-132],[54,-130],[52,-128],[50,-127],[48,-124],[42,-124],[38,-122],
   [35,-120],[33,-117],[31,-114],[29,-112],[26,-110],[24,-110],[22,-106],[19,-105],[17,-101],[16,-96],
   [18,-92],[20,-88],[22,-85],[25,-80],[27,-80],[30,-82],[31,-85],[30,-88],[30,-90],[29,-94],[27,-97],
   [26,-98],[25,-97],[22,-97],[18,-91],[18,-88],[21,-87],[22,-85],[25,-80],[28,-77],[30,-75],[33,-76],
   [35,-76],[38,-75],[40,-74],[41,-72],[42,-70],[43,-66],[45,-61],[47,-60],[47,-56],[49,-54],[52,-56],
   [53,-57],[55,-59],[58,-63],[60,-64],[62,-66],[64,-68],[67,-68],[69,-71],[70,-73],[72,-78],[74,-80],
   [76,-85],[78,-90],[80,-95],[81,-100],[83,-90],[83,-72],[82,-63],[81,-61],[80,-67],[78,-72],[76,-74],
   [74,-80],[71,-84],[69,-82],[68,-76],[66,-68],[64,-66],[62,-65],[60,-64],[58,-60],[55,-57],[51,-57],
   [49,-55],[47,-53],[47,-60],[44,-63],[43,-65],[42,-66],[40,-67],[38,-70],[36,-75],[35,-76],[33,-77],
   [30,-81],[29,-83],[29,-88],[30,-90],[32,-88],[33,-85],[30,-82],[29,-80],[32,-81],[35,-80],[38,-76],
   [40,-73],[41,-70],[44,-66],[46,-61],[49,-53],[52,-56],[55,-58],[57,-61],[60,-65],[63,-68],[65,-68],
   [67,-65],[68,-62],[67,-55],[65,-55],[63,-60],[60,-65],[57,-62],[56,-60],[54,-58]],
  // North America simplified coast
  [[60,-140],[58,-136],[55,-131],[50,-127],[45,-124],[40,-123],[35,-120],[32,-117],[28,-112],[25,-110],
   [20,-105],[18,-97],[18,-92],[21,-87],[25,-80],[29,-77],[33,-76],[38,-75],[41,-71],[44,-66],[47,-60],
   [49,-54],[52,-56],[55,-59],[59,-64],[63,-68],[68,-76],[71,-84],[75,-82],[78,-88],[80,-95],[83,-90],
   [83,-72],[80,-64],[77,-70],[73,-78],[68,-75],[65,-65],[61,-62],[57,-57],[53,-55],[49,-52],[46,-60],
   [43,-65],[40,-70],[37,-75],[33,-79],[30,-83],[30,-89],[28,-96],[24,-104],[20,-105]],
  // South America
  [[12,-70],[11,-75],[8,-77],[4,-78],[2,-80],[-1,-80],[-3,-79],[-5,-80],[-8,-79],[-10,-77],
   [-13,-76],[-15,-75],[-18,-70],[-20,-64],[-22,-60],[-25,-58],[-28,-56],[-30,-52],[-32,-52],
   [-35,-57],[-38,-60],[-41,-63],[-44,-65],[-47,-66],[-50,-68],[-52,-70],[-54,-69],[-55,-67],
   [-54,-65],[-52,-62],[-48,-58],[-45,-55],[-42,-52],[-38,-48],[-35,-45],[-32,-43],[-28,-42],
   [-25,-42],[-22,-41],[-18,-39],[-15,-39],[-12,-38],[-8,-35],[-5,-35],[-2,-40],[0,-48],
   [2,-52],[4,-55],[5,-58],[7,-60],[8,-62],[10,-65],[11,-68],[12,-70]],
  // Europe
  [[36,-10],[37,-5],[38,-1],[40,0],[42,3],[43,5],[44,8],[46,10],[47,13],[48,15],[49,17],
   [50,14],[51,12],[52,10],[53,7],[54,9],[55,12],[55,15],[57,17],[58,20],[60,22],[61,24],
   [62,26],[64,28],[66,28],[68,30],[70,28],[71,26],[70,22],[69,18],[68,15],[67,14],[66,12],
   [65,10],[64,8],[62,5],[60,5],[58,5],[56,8],[55,9],[54,8],[53,5],[52,4],[51,3],[50,2],
   [49,0],[48,-2],[47,-3],[46,-2],[45,0],[44,-1],[43,-2],[42,-4],[40,-5],[38,-6],[37,-8],[36,-10]],
  // Africa
  [[37,-1],[35,0],[33,0],[31,-2],[30,-5],[29,-8],[28,-10],[26,-13],[24,-16],[22,-17],[20,-17],
   [18,-16],[16,-16],[14,-17],[12,-17],[10,-15],[8,-13],[6,-10],[5,-7],[5,-3],[5,0],[5,2],
   [4,7],[3,10],[2,10],[0,10],[-2,10],[-4,12],[-6,12],[-8,14],[-10,15],[-12,18],[-14,22],
   [-16,25],[-18,28],[-20,30],[-22,32],[-24,33],[-26,33],[-28,32],[-30,31],[-32,29],[-34,26],
   [-35,20],[-34,18],[-33,17],[-30,17],[-27,15],[-22,14],[-18,12],[-14,10],[-10,8],[-6,5],
   [-3,5],[0,2],[2,1],[4,2],[6,1],[8,0],[10,-5],[12,-8],[14,-12],[16,-16],[18,-16],[20,-17],
   [22,-17],[24,-16],[26,-15],[28,-13],[30,-10],[32,-5],[33,-1],[35,0],[35,0],[35,2],[35,10],
   [33,12],[30,32],[28,34],[25,37],[22,38],[20,40],[18,42],[15,44],[12,45],[10,46],[8,48],
   [5,44],[3,42],[1,42],[-1,42],[-3,40],[-5,38],[-8,36],[-10,35],[-12,35],[-14,34],
   [-16,32],[-18,30],[-20,28],[-22,32],[-24,33]],
  // Asia
  [[42,28],[40,30],[38,35],[37,40],[35,42],[33,44],[30,48],[28,50],[26,52],[25,56],[24,58],
   [22,60],[20,63],[18,68],[16,73],[14,78],[12,80],[10,80],[8,78],[6,80],[4,98],[2,104],
   [1,104],[0,105],[-2,106],[-6,106],[-8,110],[-7,115],[-6,120],[-5,120],[-3,115],[-1,110],
   [2,108],[5,108],[8,106],[10,108],[12,110],[14,108],[16,108],[18,107],[20,106],[22,108],
   [24,110],[26,115],[28,118],[30,120],[32,122],[34,126],[36,128],[38,130],[40,132],[42,133],
   [44,135],[46,138],[48,140],[50,142],[52,143],[54,142],[56,138],[58,137],[60,136],[62,134],
   [64,136],[66,140],[68,160],[70,170],[72,180],[72,120],[70,100],[68,90],[66,80],[64,72],
   [62,68],[60,60],[58,55],[56,52],[54,48],[52,44],[50,40],[48,38],[46,36],[44,32],[42,28]],
  // Australia
  [[-12,130],[-11,132],[-12,136],[-14,136],[-15,140],[-17,146],[-20,149],[-23,150],
   [-26,153],[-28,153],[-30,153],[-33,152],[-35,150],[-37,150],[-38,148],[-39,146],
   [-38,144],[-37,140],[-36,137],[-35,135],[-34,132],[-32,128],[-30,125],[-28,122],
   [-26,119],[-24,115],[-22,114],[-20,113],[-18,118],[-16,122],[-14,126],[-12,130]],
  // Japan / Korean peninsula
  [[32,130],[33,131],[35,133],[36,136],[37,137],[38,138],[40,139],[42,140],[44,142],[45,143],
   [44,145],[42,144],[40,140],[38,139],[36,137],[34,134],[32,131],[32,130]],
  // UK/Ireland
  [[50,-6],[51,-5],[52,-4],[53,-3],[54,-3],[55,-2],[56,-3],[57,-5],[58,-5],[59,-3],
   [58,-2],[57,0],[55,0],[54,-1],[53,-1],[52,-2],[51,-3],[50,-5],[50,-6]],
  // Indonesia
  [[-6,106],[-7,108],[-8,112],[-8,115],[-7,118],[-6,120],[-5,122],[-4,125],[-3,128],
   [-2,130],[-1,132],[0,131],[-1,128],[-2,125],[-3,122],[-4,118],[-5,115],[-6,112],[-6,106]],
];

function projectContinent(coords: [number, number][], cLat: number, cLon: number, R: number): string {
  const pts: string[] = [];
  for (const [lat, lon] of coords) {
    const p = project(lat, lon, cLat, cLon, R);
    if (p.visible) pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  if (pts.length < 3) return '';
  return `M ${pts.join(' L ')} Z`;
}

// ─── Star field ─────────────────────────────────────────────────────────────

function generateStars(count: number, size: number): Array<{ x: number; y: number; r: number; o: number }> {
  const stars: Array<{ x: number; y: number; r: number; o: number }> = [];
  // Seeded pseudo-random
  let seed = 42;
  const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = size * 0.44 + rand() * size * 0.06;
    stars.push({
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      r: 0.3 + rand() * 0.8,
      o: 0.1 + rand() * 0.4,
    });
  }
  return stars;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function IndustryGlobe({
  countries,
  accentColor,
  industryCategory,
  selectedCountryCode,
  onCountrySelect,
  highlightedCodes = [],
  signals = [],
}: IndustryGlobeProps) {
  const SIZE = 420;
  const R = SIZE * 0.40;
  const CX = SIZE / 2;
  const CY = SIZE / 2;

  // Static rotation — NO auto-rotate, NO requestAnimationFrame
  const [rotation, setRotation] = useState({ lat: 20, lon: 10 });
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [hoveredSignalIdx, setHoveredSignalIdx] = useState<number | null>(null);

  const effectiveR = R * zoom;
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, lat: 0, lon: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Snap to selected country
  useEffect(() => {
    if (selectedCountryCode) {
      const c = countries.find(c => c.code === selectedCountryCode);
      if (c) setRotation({ lat: c.lat * 0.5, lon: -c.lon });
    }
  }, [selectedCountryCode, countries]);

  // Scroll-to-zoom (non-passive to preventDefault)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(prev => Math.max(0.6, Math.min(2.5, prev - e.deltaY * 0.002)));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Drag
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, lat: rotation.lat, lon: rotation.lon };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [rotation]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setRotation({
      lon: dragStart.current.lon - dx * 0.3,
      lat: Math.max(-60, Math.min(60, dragStart.current.lat + dy * 0.3)),
    });
  }, []);

  const onPointerUp = useCallback(() => { isDragging.current = false; }, []);

  // Relevant countries
  const relevantCountries = useMemo(() => {
    const catLower = industryCategory.toLowerCase();
    return countries.filter(c =>
      c.primarySectors.some(s => s.toLowerCase().includes(catLower) || catLower.includes(s.toLowerCase())),
    );
  }, [countries, industryCategory]);

  // Top 5 by techScore for always-visible labels
  const top5Codes = useMemo(() => {
    const relevant = relevantCountries.length > 0 ? relevantCountries : countries;
    return new Set(relevant.sort((a, b) => b.techScore - a.techScore).slice(0, 5).map(c => c.code));
  }, [relevantCountries, countries]);

  // Connection arcs
  const connections = useMemo(() => {
    const arcs: { from: CountryTechProfile; to: CountryTechProfile; strength: number }[] = [];
    const relevant = relevantCountries.length > 0 ? relevantCountries : countries.slice(0, 8);
    for (let i = 0; i < relevant.length; i++) {
      for (let j = i + 1; j < relevant.length; j++) {
        const shared = relevant[i].primarySectors.filter(s =>
          relevant[j].primarySectors.some(bs => bs.toLowerCase() === s.toLowerCase()),
        ).length;
        if (shared > 0) arcs.push({ from: relevant[i], to: relevant[j], strength: shared });
      }
    }
    return arcs.sort((a, b) => b.strength - a.strength).slice(0, 15);
  }, [relevantCountries, countries]);

  // Projected countries
  const projectedCountries = useMemo(() => {
    return countries.map(c => {
      const p = project(c.lat, c.lon, rotation.lat, rotation.lon, effectiveR);
      const isRelevant = relevantCountries.some(rc => rc.code === c.code);
      const isHighlighted = highlightedCodes.length === 0 || highlightedCodes.includes(c.code);
      return { ...c, ...p, isRelevant, isHighlighted };
    });
  }, [countries, rotation, effectiveR, relevantCountries, highlightedCodes]);

  // Projected arcs (great-circle)
  const projectedArcs = useMemo(() => {
    return connections.map(conn => {
      const path = greatCircleArc(
        conn.from.lat, conn.from.lon, conn.to.lat, conn.to.lon,
        rotation.lat, rotation.lon, effectiveR,
      );
      return path ? { ...conn, path } : null;
    }).filter(Boolean) as { from: CountryTechProfile; to: CountryTechProfile; strength: number; path: string }[];
  }, [connections, rotation, effectiveR]);

  const graticule = useMemo(() => graticulePaths(rotation.lat, rotation.lon, effectiveR), [rotation, effectiveR]);

  const continents = useMemo(() =>
    CONTINENT_PATHS.map(coords => projectContinent(coords, rotation.lat, rotation.lon, effectiveR)).filter(Boolean),
    [rotation, effectiveR],
  );

  // Signal disruption dots
  const projectedSignals = useMemo(() => {
    if (!signals || signals.length === 0) return [];
    const limited = signals.slice(0, 15);
    const catLower = industryCategory.toLowerCase();

    // Seeded random for deterministic offsets
    let seed = 137;
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed / 2147483647) - 0.5; };

    return limited.map((sig, idx) => {
      // Find matching countries for this signal's industry
      const sigIndustry = sig.industry.toLowerCase();
      const matchingCountries = countries.filter(c =>
        c.primarySectors.some(s =>
          s.toLowerCase().includes(sigIndustry) || sigIndustry.includes(s.toLowerCase()) ||
          s.toLowerCase().includes(catLower) || catLower.includes(s.toLowerCase()),
        ),
      );

      let lat: number, lon: number;
      if (matchingCountries.length > 0) {
        const target = matchingCountries[idx % matchingCountries.length];
        lat = target.lat + rand() * 6;
        lon = target.lon + rand() * 6;
      } else {
        // Default: spread across equator area
        lat = rand() * 40;
        lon = rand() * 100;
      }

      const p = project(lat, lon, rotation.lat, rotation.lon, effectiveR);
      const color = sig.importance >= 0.8 ? COLORS.orange : sig.importance >= 0.6 ? COLORS.gold : COLORS.dim;
      const dotR = 2 + sig.importance * 3;
      return { ...sig, ...p, color, dotR, idx };
    });
  }, [signals, countries, industryCategory, rotation, effectiveR]);

  const stars = useMemo(() => generateStars(40, SIZE), [SIZE]);

  return (
    <div className="relative flex flex-col items-center">
      <svg
        ref={svgRef}
        width={SIZE}
        height={SIZE}
        viewBox={`${-CX} ${-CY} ${SIZE} ${SIZE}`}
        className="cursor-grab active:cursor-grabbing select-none"
        style={{ maxWidth: '100%' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <defs>
          {/* Globe fill */}
          <radialGradient id="globe-fill" cx="38%" cy="32%">
            <stop offset="0%" stopColor="#1c2030" />
            <stop offset="60%" stopColor="#12151c" />
            <stop offset="100%" stopColor="#0a0c10" />
          </radialGradient>
          {/* Atmospheric rim glow */}
          <radialGradient id="atmo-glow" cx="50%" cy="50%">
            <stop offset="88%" stopColor="transparent" />
            <stop offset="94%" stopColor={`${accentColor}12`} />
            <stop offset="100%" stopColor={`${accentColor}06`} />
          </radialGradient>
          {/* Outer halo */}
          <radialGradient id="outer-halo" cx="50%" cy="50%">
            <stop offset="85%" stopColor="transparent" />
            <stop offset="95%" stopColor={`${accentColor}08`} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="arc-glow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="dot-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="rim-blur">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* ── Stars ──────────────────────────────────────────────────── */}
        {stars.map((s, i) => (
          <circle
            key={`s${i}`}
            cx={s.x} cy={s.y} r={s.r}
            fill={COLORS.text}
            opacity={s.o}
          />
        ))}

        {/* ── Atmosphere outer ring ──────────────────────────────────── */}
        <circle r={effectiveR + 12} fill="none" stroke={accentColor} strokeWidth={1} opacity={0.04} filter="url(#rim-blur)" />
        <circle r={effectiveR + 6} fill="none" stroke={accentColor} strokeWidth={0.5} opacity={0.08} />
        <circle r={effectiveR + 2} fill="url(#outer-halo)" />

        {/* ── Globe sphere ───────────────────────────────────────────── */}
        <circle r={effectiveR} fill="url(#globe-fill)" stroke={`${accentColor}18`} strokeWidth={0.8} />
        <circle r={effectiveR} fill="url(#atmo-glow)" />

        {/* ── Graticule ──────────────────────────────────────────────── */}
        {graticule.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={`${COLORS.text}08`} strokeWidth={0.4} />
        ))}

        {/* ── Continents ─────────────────────────────────────────────── */}
        {continents.map((d, i) => (
          <path key={`ct-${i}`} d={d} fill={`${accentColor}06`} stroke={`${COLORS.text}18`} strokeWidth={0.6} />
        ))}

        {/* ── Connection arcs ────────────────────────────────────────── */}
        {projectedArcs.map((arc, i) => {
          const isActive = selectedCountryCode
            ? (arc.from.code === selectedCountryCode || arc.to.code === selectedCountryCode)
            : true;
          return (
            <g key={`arc-${i}`}>
              {/* Glow layer */}
              <path
                d={arc.path}
                fill="none"
                stroke={accentColor}
                strokeWidth={1 + arc.strength * 0.6}
                strokeOpacity={isActive ? 0.12 : 0.03}
                filter="url(#arc-glow)"
              />
              {/* Main arc */}
              <path
                d={arc.path}
                fill="none"
                stroke={accentColor}
                strokeWidth={0.6 + arc.strength * 0.3}
                strokeOpacity={isActive ? (selectedCountryCode ? 0.6 : 0.25) : 0.05}
                strokeDasharray="4,6"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0" to="-20"
                  dur={`${2 + i * 0.3}s`}
                  repeatCount="indefinite"
                />
              </path>
            </g>
          );
        })}

        {/* ── Country dots ───────────────────────────────────────────── */}
        {projectedCountries
          .filter(c => c.visible)
          .sort((a, b) => {
            if (a.code === selectedCountryCode || a.code === hoveredCode) return 1;
            if (b.code === selectedCountryCode || b.code === hoveredCode) return -1;
            return a.depth - b.depth;
          })
          .map(c => {
            const isSelected = c.code === selectedCountryCode;
            const isHovered = c.code === hoveredCode;
            const isTop5 = top5Codes.has(c.code);
            const baseR = c.isRelevant ? 5 + (c.techScore / 100) * 5 : 2.5;
            const r = isSelected ? baseR * 1.8 : isHovered ? baseR * 1.4 : baseR;
            const opacity = c.isRelevant
              ? c.isHighlighted ? 0.95 : 0.25
              : 0.12;

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
                  <>
                    <circle cx={c.x} cy={c.y} r={r + 8} fill="none" stroke={accentColor} strokeWidth={1}>
                      <animate attributeName="r" from={r + 3} to={r + 14} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={c.x} cy={c.y} r={r + 5} fill="none" stroke={accentColor} strokeWidth={0.5}>
                      <animate attributeName="r" from={r + 1} to={r + 10} dur="2s" begin="0.4s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.3" to="0" dur="2s" begin="0.4s" repeatCount="indefinite" />
                    </circle>
                  </>
                )}

                {/* Outer glow */}
                {c.isRelevant && (
                  <circle
                    cx={c.x} cy={c.y}
                    r={r * 2.5}
                    fill={c.color}
                    opacity={isSelected ? 0.18 : isHovered ? 0.12 : 0.05}
                    filter="url(#dot-glow)"
                  />
                )}

                {/* Inner glow ring */}
                {c.isRelevant && (isSelected || isHovered || isTop5) && (
                  <circle
                    cx={c.x} cy={c.y}
                    r={r + 2}
                    fill="none"
                    stroke={c.color}
                    strokeWidth={0.6}
                    opacity={0.3}
                  />
                )}

                {/* Dot */}
                <circle
                  cx={c.x} cy={c.y} r={r}
                  className={c.isRelevant && !isSelected && !isHovered ? 'globe-dot-relevant' : undefined}
                  fill={c.isRelevant ? c.color : `${COLORS.text}30`}
                  opacity={opacity}
                  stroke={isSelected ? accentColor : isHovered ? `${c.color}88` : 'none'}
                  strokeWidth={isSelected ? 2 : isHovered ? 1 : 0}
                />

                {/* Always-visible label for top 5 */}
                {c.isRelevant && isTop5 && !isSelected && !isHovered && (
                  <text
                    x={c.x} y={c.y - r - 5}
                    textAnchor="middle"
                    fill={`${COLORS.text}55`}
                    fontSize={7}
                    fontFamily="monospace"
                  >
                    {c.code}
                  </text>
                )}

                {/* Hover/selected label */}
                {(isSelected || isHovered) && (
                  <>
                    {/* Background pill */}
                    <rect
                      x={c.x - 30} y={c.y - r - 18}
                      width={60} height={14}
                      rx={4}
                      fill={`${COLORS.bg}dd`}
                      stroke={`${c.color}33`}
                      strokeWidth={0.5}
                    />
                    <text
                      x={c.x} y={c.y - r - 9}
                      textAnchor="middle"
                      fill={isSelected ? accentColor : COLORS.text}
                      fontSize={8}
                      fontFamily="monospace"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                    >
                      {c.name}
                    </text>
                    {/* Score badge */}
                    <text
                      x={c.x} y={c.y + r + 12}
                      textAnchor="middle"
                      fill={c.color}
                      fontSize={7}
                      fontFamily="monospace"
                    >
                      {c.techScore}
                    </text>
                  </>
                )}
              </g>
            );
          })}

        {/* ── Signal disruption dots ──────────────────────────────────── */}
        {projectedSignals
          .filter(s => s.visible)
          .map(s => {
            const isHovered = hoveredSignalIdx === s.idx;
            return (
              <g
                key={`sig-${s.idx}`}
                onMouseEnter={() => setHoveredSignalIdx(s.idx)}
                onMouseLeave={() => setHoveredSignalIdx(null)}
                className="cursor-pointer"
              >
                {/* Pulse ring */}
                <circle cx={s.x} cy={s.y} r={s.dotR} fill="none" stroke={s.color} strokeWidth={0.8}>
                  <animate attributeName="r" from={s.dotR} to={s.dotR + 6} dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="1.8s" repeatCount="indefinite" />
                </circle>
                {/* Core dot */}
                <circle
                  cx={s.x} cy={s.y}
                  r={isHovered ? s.dotR * 1.5 : s.dotR}
                  fill={s.color}
                  opacity={isHovered ? 0.95 : 0.8}
                  stroke={isHovered ? '#fff' : 'none'}
                  strokeWidth={isHovered ? 1 : 0}
                />
                {/* Tooltip on hover */}
                {isHovered && (
                  <>
                    <rect
                      x={s.x - 50} y={s.y - s.dotR - 20}
                      width={100} height={16}
                      rx={4}
                      fill={`${COLORS.bg}ee`}
                      stroke={`${s.color}55`}
                      strokeWidth={0.5}
                    />
                    <text
                      x={s.x} y={s.y - s.dotR - 9}
                      textAnchor="middle"
                      fill={s.color}
                      fontSize={7}
                      fontFamily="monospace"
                    >
                      {s.title.length > 22 ? s.title.slice(0, 20) + '...' : s.title}
                    </text>
                  </>
                )}
              </g>
            );
          })}
      </svg>

      {/* ── Zoom controls ──────────────────────────────────────────────── */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        <button
          onClick={() => setZoom(prev => Math.min(2.5, prev + 0.2))}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[14px] font-bold cursor-pointer transition-colors"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, color: `${COLORS.text}66` }}
          onMouseEnter={e => e.currentTarget.style.borderColor = `${accentColor}44`}
          onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
        >
          +
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(0.6, prev - 0.2))}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[14px] font-bold cursor-pointer transition-colors"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, color: `${COLORS.text}66` }}
          onMouseEnter={e => e.currentTarget.style.borderColor = `${accentColor}44`}
          onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
        >
          −
        </button>
        {zoom !== 1.0 && (
          <button
            onClick={() => setZoom(1.0)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[8px] cursor-pointer transition-colors"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, color: `${COLORS.text}40` }}
          >
            1x
          </button>
        )}
      </div>

      {/* ── CSS breathing + pulse (no JS re-renders) ──────────────────── */}
      <style>{`
        @keyframes globe-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        .globe-dot-relevant { animation: globe-breathe 3s ease-in-out infinite; transform-origin: center; }
      `}</style>

      {/* ── Legend ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 mt-2 font-mono text-[7px] tracking-[0.12em]" style={{ color: `${COLORS.text}50` }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: accentColor, opacity: 0.9, boxShadow: `0 0 6px ${accentColor}60` }} />
          ACTIVE
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: `${COLORS.text}40` }} />
          OTHER
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-px rounded" style={{ background: accentColor, opacity: 0.5 }} />
          ARC
        </span>
        {signals.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: COLORS.orange, opacity: 0.9, boxShadow: `0 0 6px ${COLORS.orange}60` }} />
            SIGNALS
          </span>
        )}
        <span style={{ color: `${COLORS.text}30` }}>DRAG TO ROTATE · SCROLL TO ZOOM</span>
      </div>
    </div>
  );
}
