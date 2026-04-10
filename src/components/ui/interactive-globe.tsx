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

// ─── Continent outlines ─────────────────────────────────────────────────────
const CONTINENT_OUTLINES: { name: string; points: [number, number][] }[] = [
  { name: 'North America', points: [
    [49, -125], [50, -120], [54, -130], [60, -140], [64, -165], [71, -157],
    [71, -135], [68, -110], [60, -95], [58, -80], [52, -60], [47, -53],
    [44, -65], [41, -70], [35, -75], [30, -82], [25, -80], [25, -97],
    [20, -105], [15, -92], [15, -83], [10, -84], [8, -77],
  ]},
  { name: 'South America', points: [
    [12, -72], [10, -67], [8, -60], [5, -52], [0, -50], [-5, -35],
    [-10, -37], [-15, -39], [-23, -42], [-28, -49], [-34, -54],
    [-38, -57], [-42, -63], [-46, -66], [-50, -70], [-53, -70],
    [-55, -68], [-52, -75], [-46, -75], [-42, -73], [-37, -73],
    [-30, -72], [-24, -70], [-18, -70], [-15, -75], [-5, -81],
    [0, -80], [5, -77], [8, -77], [10, -72], [12, -72],
  ]},
  { name: 'Europe', points: [
    [36, -10], [38, -8], [43, -9], [44, 0], [48, -5], [49, 0],
    [51, 2], [54, 8], [56, 8], [58, 12], [60, 5], [62, 5],
    [65, 14], [70, 20], [71, 28], [68, 35], [65, 30],
    [60, 30], [56, 28], [55, 20], [50, 18], [47, 15],
    [45, 14], [42, 18], [40, 26], [38, 24], [36, 28],
    [35, 24], [37, 22], [39, 20], [40, 15], [38, 14],
    [36, 0], [36, -10],
  ]},
  { name: 'Africa', points: [
    [37, -10], [36, 0], [33, 10], [32, 12], [30, 33],
    [22, 37], [12, 44], [10, 50], [2, 42], [-3, 40],
    [-11, 40], [-15, 36], [-25, 35], [-30, 31], [-35, 20],
    [-34, 18], [-30, 16], [-22, 14], [-17, 12], [-12, 14],
    [-5, 12], [0, 10], [5, 7], [5, 1], [4, -8],
    [5, -5], [10, -15], [15, -17], [20, -17], [25, -15],
    [30, -10], [36, -10], [37, -10],
  ]},
  { name: 'Asia', points: [
    [42, 30], [45, 40], [40, 50], [38, 55], [35, 52],
    [25, 57], [20, 60], [25, 65], [28, 68], [25, 75],
    [22, 88], [20, 92], [22, 97], [10, 99], [1, 104],
    [8, 115], [22, 114], [25, 120], [30, 122], [35, 129],
    [38, 130], [40, 132], [43, 145], [46, 143], [50, 140],
    [53, 143], [56, 138], [55, 130], [60, 135],
    [65, 140], [70, 170], [68, 180], [66, 170],
    [60, 165], [55, 155], [50, 140], [52, 130],
    [50, 88], [55, 70], [50, 60], [45, 50], [42, 30],
  ]},
  { name: 'Oceania', points: [
    [-12, 130], [-14, 127], [-20, 118], [-26, 114],
    [-32, 115], [-35, 117], [-35, 137], [-38, 146],
    [-37, 150], [-33, 152], [-28, 153], [-24, 150],
    [-20, 148], [-16, 146], [-14, 136], [-12, 130],
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
