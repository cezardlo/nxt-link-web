"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RegionData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  continent: string;
  signal_count: number;
  risk_level: string;
  opportunity_score: number;
  industries: string[];
  top_themes: string[];
  total_investment_usd: number;
}

export interface GlobeProps {
  className?: string;
  size?: number;
  regions?: RegionData[];
  onRegionSelect?: (region: RegionData | null) => void;
  selectedRegion?: string | null;
}

interface Dot { x: number; y: number; z: number; }

// ─── Region geography: lat/lng center + continent outlines ──────────────────

const DEFAULT_REGIONS: RegionData[] = [
  { id: 'us', name: 'United States', lat: 39.8, lng: -98.5, continent: 'North America', signal_count: 194, risk_level: 'high', opportunity_score: 65, industries: ['manufacturing', 'logistics'], top_themes: ['technology', 'market_shift', 'funding'], total_investment_usd: 118053500000 },
  { id: 'china', name: 'China', lat: 35.9, lng: 104.2, continent: 'Asia', signal_count: 68, risk_level: 'high', opportunity_score: 65, industries: ['manufacturing', 'logistics'], top_themes: ['technology', 'market_shift', 'funding'], total_investment_usd: 0 },
  { id: 'japan_korea', name: 'Japan & Korea', lat: 36.2, lng: 133.0, continent: 'Asia', signal_count: 39, risk_level: 'moderate', opportunity_score: 65, industries: ['manufacturing', 'logistics'], top_themes: ['technology', 'market_shift'], total_investment_usd: 52000000000 },
  { id: 'europe', name: 'Europe', lat: 50.0, lng: 10.0, continent: 'Europe', signal_count: 25, risk_level: 'moderate', opportunity_score: 65, industries: ['manufacturing', 'logistics'], top_themes: ['market_shift', 'funding', 'acquisition'], total_investment_usd: 0 },
  { id: 'mexico', name: 'Mexico', lat: 23.6, lng: -102.6, continent: 'North America', signal_count: 20, risk_level: 'low', opportunity_score: 65, industries: ['manufacturing', 'logistics'], top_themes: ['market_shift', 'facility_expansion'], total_investment_usd: 2095000000 },
  { id: 'southeast_asia', name: 'Southeast Asia', lat: 5.0, lng: 110.0, continent: 'Asia', signal_count: 6, risk_level: 'low', opportunity_score: 65, industries: ['manufacturing'], top_themes: ['technology', 'market_shift'], total_investment_usd: 0 },
  { id: 'india', name: 'India', lat: 20.6, lng: 78.9, continent: 'Asia', signal_count: 4, risk_level: 'low', opportunity_score: 65, industries: ['manufacturing'], top_themes: ['funding', 'market_shift'], total_investment_usd: 0 },
];

// ─── Continent outlines (improved accuracy) ─────────────────────────────────
const CONTINENT_OUTLINES: { name: string; points: [number, number][] }[] = [
  { name: 'North America', points: [
    // Alaska
    [60, -147], [62, -150], [64, -153], [66, -164], [64, -166], [61, -166],
    [58, -157], [56, -154], [55, -160], [57, -170], [60, -172], [63, -168],
    [67, -164], [70, -162], [71, -156], [71, -140], [70, -130],
    // Canada north coast
    [69, -120], [67, -110], [63, -92], [60, -86], [58, -78],
    [55, -67], [52, -60], [49, -55], [47, -53],
    // East coast
    [46, -60], [44, -63], [43, -66], [42, -70], [41, -72],
    [39, -74], [37, -76], [35, -76], [33, -78], [31, -81],
    [30, -84], [29, -89], [28, -97],
    // Gulf + Mexico
    [26, -97], [22, -97], [20, -96], [19, -96], [17, -92],
    [16, -89], [15, -84], [12, -83], [10, -84], [9, -79],
    // Central America
    [8, -77], [8, -80], [9, -84], [11, -84], [12, -87],
    // West coast up
    [15, -93], [17, -100], [19, -105], [21, -105], [23, -106],
    [25, -108], [28, -112], [31, -117], [33, -117], [34, -119],
    [37, -122], [39, -123], [42, -124], [44, -124],
    [47, -124], [49, -125], [51, -128], [54, -130],
    [57, -136], [58, -138], [59, -140], [60, -147],
  ]},
  { name: 'South America', points: [
    // North coast
    [12, -72], [11, -75], [11, -72], [10, -67], [8, -63],
    [7, -60], [6, -57], [5, -53], [3, -51], [1, -50],
    // East coast (Brazil)
    [-1, -48], [-3, -41], [-5, -35], [-8, -35],
    [-10, -37], [-13, -39], [-16, -39], [-18, -40],
    [-20, -41], [-23, -42], [-25, -48],
    // Southeast
    [-28, -49], [-30, -51], [-33, -53], [-35, -57],
    // Southern cone
    [-38, -58], [-41, -63], [-43, -65], [-46, -67],
    [-49, -68], [-51, -69], [-53, -71], [-55, -68],
    // West coast (Chile)
    [-53, -73], [-50, -75], [-47, -74], [-44, -73],
    [-42, -73], [-39, -73], [-36, -73], [-33, -72],
    [-30, -71], [-27, -71], [-24, -70], [-20, -70],
    [-18, -71], [-16, -75], [-14, -76], [-12, -77],
    // Peru / Ecuador / Colombia
    [-6, -81], [-3, -80], [0, -80], [2, -78],
    [4, -77], [7, -77], [9, -76], [11, -74], [12, -72],
  ]},
  { name: 'Europe', points: [
    // Iberia
    [36, -6], [37, -9], [39, -9], [42, -9], [44, -2],
    // France
    [46, -2], [47, -4], [48, -5], [49, -1], [50, 1],
    // UK / North Sea
    [51, 2], [52, 4], [54, 8],
    // Scandinavia
    [56, 8], [58, 10], [60, 5], [62, 5], [64, 10],
    [66, 14], [68, 16], [70, 20], [71, 26], [70, 30],
    // Finland / Baltics
    [68, 28], [66, 26], [64, 24], [60, 28], [58, 24],
    [56, 22], [55, 21],
    // Poland / Central Europe
    [54, 18], [52, 16], [51, 14], [50, 15],
    // Balkans / Greece
    [48, 17], [47, 16], [45, 14], [44, 15], [43, 16],
    [42, 19], [41, 20], [40, 22], [39, 23], [38, 24],
    [37, 24], [36, 22],
    // Mediterranean
    [36, 15], [38, 12], [39, 9], [38, 3],
    [37, 0], [36, -6],
  ]},
  { name: 'Africa', points: [
    // North coast
    [36, -6], [36, -1], [37, 1], [37, 5], [36, 8], [35, 10],
    [33, 11], [32, 12], [31, 25], [31, 32],
    // East coast (Suez to Horn)
    [30, 33], [27, 34], [24, 36], [20, 37], [16, 40],
    [12, 44], [11, 47], [10, 51], [5, 46], [2, 42],
    // East Africa
    [0, 42], [-2, 41], [-4, 40], [-7, 40], [-10, 40],
    // Southeast
    [-12, 38], [-15, 36], [-20, 35], [-25, 35],
    [-28, 33], [-30, 31], [-33, 28], [-35, 20],
    // South tip
    [-34, 18], [-33, 18],
    // West coast
    [-30, 17], [-25, 14], [-20, 12], [-15, 12],
    [-10, 14], [-5, 12], [-4, 10], [0, 9],
    [4, 7], [5, 2], [5, -1], [6, -3],
    // Gulf of Guinea
    [4, -7], [5, -5], [6, -5], [6, -2],
    [4, 9], [3, 10], [2, 10], [1, 10],
    // West Africa / Senegal
    [6, -2], [8, -8], [10, -14], [12, -17],
    [15, -17], [17, -16], [20, -17], [22, -17],
    [25, -15], [28, -13], [30, -10],
    [33, -8], [35, -6], [36, -6],
  ]},
  { name: 'Asia', points: [
    // Turkey / Middle East
    [42, 28], [41, 32], [42, 36], [37, 36], [34, 36],
    [33, 44], [30, 48], [27, 50], [24, 52],
    // Arabian Peninsula
    [22, 55], [20, 57], [16, 53], [13, 44], [12, 44],
    // South Asia
    [15, 50], [18, 56], [22, 60], [24, 68], [22, 72],
    [21, 78], [17, 78], [10, 77], [8, 77],
    // Southeast Asia
    [7, 80], [6, 99], [2, 104], [1, 104],
    [-1, 105], [-2, 106], [-6, 106], [-8, 110],
    // Indonesia
    [-7, 112], [-8, 115], [-6, 116],
    // Back up east coast
    [1, 110], [5, 117], [10, 118], [15, 120],
    [20, 111], [22, 114], [25, 120], [28, 122],
    // East China / Korea / Japan area coast
    [30, 122], [32, 122], [35, 129], [38, 128],
    [40, 130], [42, 132], [43, 135],
    // Japan
    [44, 145], [46, 143], [45, 142],
    // Russian Far East
    [50, 140], [53, 143], [55, 137], [56, 135],
    [58, 135], [60, 140], [63, 143], [65, 160],
    [67, 170], [68, 180],
    // North Siberia
    [71, 180], [72, 140], [73, 120], [72, 100],
    [71, 80], [70, 60], [68, 55], [66, 50],
    // Central Asia / Urals
    [60, 60], [55, 60], [53, 55], [50, 50],
    [48, 42], [46, 38], [44, 34], [42, 28],
  ]},
  { name: 'Oceania', points: [
    // Australia
    [-12, 131], [-12, 136], [-14, 136], [-14, 127],
    [-18, 123], [-20, 118], [-23, 114], [-26, 114],
    [-30, 115], [-32, 115], [-34, 116],
    [-35, 117], [-35, 120], [-35, 128],
    [-35, 136], [-37, 140], [-38, 146], [-38, 148],
    // Southeast Australia
    [-37, 150], [-35, 151], [-33, 152],
    [-29, 153], [-27, 153], [-24, 150],
    // Northeast Australia
    [-20, 148], [-17, 146], [-15, 145],
    [-13, 143], [-11, 142], [-12, 137],
    [-11, 132], [-12, 131],
  ]},
];

// ─── Colors ─────────────────────────────────────────────────────────────────
const RISK_COLORS: Record<string, string> = {
  critical: '#ff4444',
  high: '#ff8800',
  elevated: '#ffb800',
  moderate: '#ffd700',
  low: '#00ff88',
};

const CONTINENT_COLORS: Record<string, string> = {
  'North America': '#00d4ff',
  'South America': '#00ff88',
  'Europe': '#ffd700',
  'Africa': '#ff8800',
  'Asia': '#a78bfa',
  'Oceania': '#00d4ff',
};

// ─── Math helpers ───────────────────────────────────────────────────────────
function latLngToXYZ(lat: number, lng: number): Dot {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  return { x: Math.cos(latRad) * Math.cos(lngRad), y: Math.sin(latRad), z: Math.cos(latRad) * Math.sin(lngRad) };
}

function rotateY(dot: Dot, angle: number): Dot {
  const cos = Math.cos(angle); const sin = Math.sin(angle);
  return { x: dot.x * cos + dot.z * sin, y: dot.y, z: -dot.x * sin + dot.z * cos };
}

function rotateX(dot: Dot, angle: number): Dot {
  const cos = Math.cos(angle); const sin = Math.sin(angle);
  return { x: dot.x, y: dot.y * cos - dot.z * sin, z: dot.y * sin + dot.z * cos };
}

function project(dot: Dot, size: number, scale: number = 0.42): { x: number; y: number; z: number } {
  const s = size * scale;
  return { x: dot.x * s + size / 2, y: -dot.y * s + size / 2, z: dot.z };
}

function fibonacciSphere(samples: number): Dot[] {
  const dots: Dot[] = [];
  const phi = Math.PI * (Math.sqrt(5) - 1);
  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / (samples - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = phi * i;
    dots.push({ x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius });
  }
  return dots;
}

function formatUSD(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

// ─── Globe Component ────────────────────────────────────────────────────────

export function Component({
  className,
  size = 500,
  regions = DEFAULT_REGIONS,
  onRegionSelect,
  selectedRegion = null,
}: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationYRef = useRef(0.3);
  const rotationXRef = useRef(-0.3);
  const animationRef = useRef<number>(0);
  const dotsRef = useRef<Dot[]>([]);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const autoRotate = useRef(true);
  const autoRotateTimer = useRef<NodeJS.Timeout | null>(null);
  const hoveredRegion = useRef<string | null>(null);
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; region: RegionData } | null>(null);

  const activeSelected = selectedRegion ?? internalSelected;

  // ─── Drag handling ──────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    autoRotate.current = false;
    if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDragging.current) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      rotationYRef.current += dx * 0.005;
      rotationXRef.current = Math.max(-1.2, Math.min(1.2, rotationXRef.current + dy * 0.005));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }

    // Hit test for hover
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let found: RegionData | null = null;

    for (const region of regions) {
      const xyz = latLngToXYZ(region.lat, region.lng);
      const rotated = rotateX(rotateY(xyz, rotationYRef.current), rotationXRef.current);
      const p = project(rotated, size);
      if (rotated.z < 0) continue;
      const dist = Math.sqrt((p.x - mx) ** 2 + (p.y - my) ** 2);
      const hitRadius = 8 + Math.sqrt(region.signal_count) * 1.2;
      if (dist < hitRadius) { found = region; break; }
    }

    hoveredRegion.current = found?.id || null;
    canvas.style.cursor = found ? 'pointer' : (isDragging.current ? 'grabbing' : 'grab');

    if (found && !isDragging.current) {
      setTooltip({ x: mx, y: my, region: found });
    } else {
      setTooltip(null);
    }
  }, [regions, size]);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    autoRotateTimer.current = setTimeout(() => { autoRotate.current = true; }, 3000);
  }, []);

  const onClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (const region of regions) {
      const xyz = latLngToXYZ(region.lat, region.lng);
      const rotated = rotateX(rotateY(xyz, rotationYRef.current), rotationXRef.current);
      const p = project(rotated, size);
      if (rotated.z < 0) continue;
      const dist = Math.sqrt((p.x - mx) ** 2 + (p.y - my) ** 2);
      const hitRadius = 8 + Math.sqrt(region.signal_count) * 1.2;
      if (dist < hitRadius) {
        const newSel = activeSelected === region.id ? null : region.id;
        setInternalSelected(newSel);
        onRegionSelect?.(newSel ? region : null);
        return;
      }
    }
    // Clicked empty space — deselect
    setInternalSelected(null);
    onRegionSelect?.(null);
  }, [regions, size, activeSelected, onRegionSelect]);

  // ─── Draw ───────────────────────────────────────────────────────────────
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, size * dpr, size * dpr);
    ctx.save();
    ctx.scale(dpr, dpr);

    const ry = rotationYRef.current;
    const rx = rotationXRef.current;
    const now = Date.now();
    const cx = size / 2;
    const cy = size / 2;
    const globeR = size * 0.42;

    // ─── Atmosphere glow ──────────────────────────────────────────────
    const atmosGrad = ctx.createRadialGradient(cx, cy, globeR * 0.9, cx, cy, globeR * 1.2);
    atmosGrad.addColorStop(0, "rgba(0, 212, 255, 0.05)");
    atmosGrad.addColorStop(0.5, "rgba(0, 212, 255, 0.02)");
    atmosGrad.addColorStop(1, "rgba(0, 212, 255, 0)");
    ctx.beginPath(); ctx.arc(cx, cy, globeR * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = atmosGrad; ctx.fill();

    // Globe outline + fill
    ctx.beginPath(); ctx.arc(cx, cy, globeR, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 212, 255, 0.1)"; ctx.lineWidth = 1; ctx.stroke();
    const globeFill = ctx.createRadialGradient(cx - globeR * 0.3, cy - globeR * 0.3, 0, cx, cy, globeR);
    globeFill.addColorStop(0, "rgba(0, 212, 255, 0.03)");
    globeFill.addColorStop(1, "rgba(0, 0, 0, 0.08)");
    ctx.fillStyle = globeFill; ctx.fill();

    // ─── Grid lines ───────────────────────────────────────────────────
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      let started = false;
      for (let lng = -180; lng <= 180; lng += 5) {
        const xyz = latLngToXYZ(lat, lng);
        const rotated = rotateX(rotateY(xyz, ry), rx);
        const p = project(rotated, size);
        if (p.z < 0) { started = false; continue; }
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = "rgba(255, 255, 255, 0.025)"; ctx.lineWidth = 0.5; ctx.stroke();
    }

    // ─── Continent outlines ───────────────────────────────────────────
    for (const continent of CONTINENT_OUTLINES) {
      const color = CONTINENT_COLORS[continent.name] || '#00d4ff';
      const projected = continent.points.map(([lat, lng]) => {
        const xyz = latLngToXYZ(lat, lng);
        const rotated = rotateX(rotateY(xyz, ry), rx);
        return project(rotated, size);
      });

      ctx.beginPath();
      let drawing = false;
      for (const p of projected) {
        if (p.z < -0.05) { drawing = false; continue; }
        if (!drawing) { ctx.moveTo(p.x, p.y); drawing = true; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = color + '40';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // ─── Dots ─────────────────────────────────────────────────────────
    if (dotsRef.current.length === 0) dotsRef.current = fibonacciSphere(600);
    for (const dot of dotsRef.current) {
      const rotated = rotateX(rotateY(dot, ry), rx);
      const p = project(rotated, size);
      if (p.z < 0) continue;
      const alpha = 0.06 + p.z * 0.25;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 0.8 + p.z * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }

    // ─── Region markers ───────────────────────────────────────────────
    const regionPositions: { region: RegionData; x: number; y: number; z: number }[] = [];

    for (const region of regions) {
      const xyz = latLngToXYZ(region.lat, region.lng);
      const rotated = rotateX(rotateY(xyz, ry), rx);
      const p = project(rotated, size);
      regionPositions.push({ region, ...p });
      if (p.z < -0.05) continue;

      const alpha = 0.4 + p.z * 0.6;
      const riskColor = RISK_COLORS[region.risk_level] || RISK_COLORS.low;
      const isHovered = hoveredRegion.current === region.id;
      const isSelected = activeSelected === region.id;
      const markerSize = 4 + Math.sqrt(region.signal_count) * 0.7;
      const pulseScale = 1 + Math.sin(now * 0.003) * 0.3;

      // Outer pulse ring
      if (region.risk_level === 'high' || region.risk_level === 'critical') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, (markerSize + 10) * pulseScale, 0, Math.PI * 2);
        ctx.strokeStyle = riskColor + Math.floor(alpha * 50).toString(16).padStart(2, '0');
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Glow
      const glowR = isSelected ? markerSize + 20 : isHovered ? markerSize + 14 : markerSize + 8;
      const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
      glowGrad.addColorStop(0, riskColor + Math.floor(alpha * 60).toString(16).padStart(2, '0'));
      glowGrad.addColorStop(1, riskColor + '00');
      ctx.beginPath(); ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad; ctx.fill();

      // Ring
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, markerSize + 4, 0, Math.PI * 2);
        ctx.strokeStyle = riskColor + Math.floor(alpha * 180).toString(16).padStart(2, '0');
        ctx.lineWidth = isSelected ? 2 : 1.5;
        ctx.stroke();
      }

      // Core marker
      ctx.beginPath();
      ctx.arc(p.x, p.y, markerSize, 0, Math.PI * 2);
      const coreGrad = ctx.createRadialGradient(p.x - 1, p.y - 1, 0, p.x, p.y, markerSize);
      coreGrad.addColorStop(0, riskColor);
      coreGrad.addColorStop(1, riskColor + 'aa');
      ctx.fillStyle = coreGrad;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Signal count inside marker
      if (markerSize > 7 && p.z > 0.2) {
        ctx.font = `bold 9px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillText(String(region.signal_count), p.x, p.y + 3);
      }

      // Label
      if (p.z > 0.15) {
        ctx.font = `11px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'left';
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
        const labelX = p.x + markerSize + 6;
        ctx.fillText(region.name, labelX, p.y - 2);

        // Risk badge
        ctx.font = `bold 8px 'JetBrains Mono', monospace`;
        ctx.fillStyle = riskColor + Math.floor(alpha * 200).toString(16).padStart(2, '0');
        ctx.fillText(region.risk_level.toUpperCase(), labelX, p.y + 10);
      }
    }

    // ─── Connection arcs between high-signal regions ──────────────────
    const sorted = [...regionPositions].sort((a, b) => b.region.signal_count - a.region.signal_count);
    const topRegions = sorted.slice(0, 5);
    for (let i = 0; i < topRegions.length; i++) {
      for (let j = i + 1; j < topRegions.length; j++) {
        const a = topRegions[i]; const b = topRegions[j];
        if (a.z < 0 && b.z < 0) continue;
        const alpha = Math.min(a.z < 0 ? 0 : 0.2 + a.z * 0.3, b.z < 0 ? 0 : 0.2 + b.z * 0.3);
        if (alpha < 0.05) continue;

        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const dist = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
        const bulge = dist * 0.2;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(midX, midY - bulge, b.x, b.y);
        ctx.strokeStyle = `rgba(0, 212, 255, ${alpha * 0.3})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Traveling pulse
        const t = ((now * 0.0003 + i * 0.3 + j * 0.17) % 1);
        const tx = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * midX + t * t * b.x;
        const ty = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * (midY - bulge) + t * t * b.y;
        ctx.beginPath(); ctx.arc(tx, ty, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${alpha * 0.7})`;
        ctx.fill();
      }
    }

    ctx.restore();
  }, [size, regions, activeSelected]);

  // ─── Animation loop ─────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const animate = () => {
      if (autoRotate.current) rotationYRef.current += 0.0015;
      draw(ctx);
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, [size, draw]);

  return (
    <div className={cn("relative inline-block", className)} style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, cursor: 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => { isDragging.current = false; setTooltip(null); }}
        onClick={onClick}
      />
      {/* Hover tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + 16,
            top: tooltip.y - 10,
            background: '#1a1e25',
            border: '1px solid #2e3440',
            borderRadius: '8px',
            padding: '10px 14px',
            pointerEvents: 'none',
            zIndex: 50,
            minWidth: '160px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
            {tooltip.region.name}
          </div>
          <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: RISK_COLORS[tooltip.region.risk_level] || '#00ff88', marginBottom: '4px' }}>
            {tooltip.region.risk_level.toUpperCase()} RISK · {tooltip.region.signal_count} signals
          </div>
          {tooltip.region.total_investment_usd > 0 && (
            <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: '#ffd700' }}>
              {formatUSD(tooltip.region.total_investment_usd)} investment tracked
            </div>
          )}
          <div style={{ fontSize: '9px', color: '#8a8f98', marginTop: '4px' }}>
            {tooltip.region.industries.join(' · ')}
          </div>
        </div>
      )}
    </div>
  );
}
