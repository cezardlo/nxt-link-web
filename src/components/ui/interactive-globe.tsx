"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface GlobeProps {
  className?: string;
  size?: number;
  dotCount?: number;
  dotSize?: number;
  dotColor?: string;
  arcColor?: string;
  markerColor?: string;
  rotationSpeed?: number;
  markers?: { lat: number; lng: number; label?: string; type?: "hub" | "signal" | "default" }[];
  connections?: [number, number][];
}

interface Dot {
  x: number;
  y: number;
  z: number;
}

// ─── Simplified continent boundaries (lat/lng polylines) ───────────────────
// Each continent is an array of [lat, lng] pairs forming an outline
const CONTINENT_OUTLINES: [number, number][][] = [
  // North America
  [
    [49, -125], [50, -120], [54, -130], [60, -140], [64, -165], [71, -157],
    [71, -135], [68, -110], [60, -95], [58, -80], [52, -60], [47, -53],
    [44, -65], [41, -70], [35, -75], [30, -82], [25, -80], [25, -97],
    [20, -105], [15, -92], [15, -83], [10, -84], [8, -77], [10, -75],
    [19, -87], [21, -90], [26, -97], [29, -95], [30, -90], [29, -85],
    [25, -80], [30, -82], [35, -75], [40, -74], [42, -70], [45, -67],
    [47, -68], [49, -65], [50, -57], [47, -53],
  ],
  // South America
  [
    [12, -72], [10, -67], [8, -60], [5, -52], [0, -50], [-5, -35],
    [-10, -37], [-15, -39], [-23, -42], [-28, -49], [-34, -54],
    [-38, -57], [-42, -63], [-46, -66], [-50, -70], [-53, -70],
    [-55, -68], [-56, -70], [-52, -75], [-46, -75], [-42, -73],
    [-37, -73], [-30, -72], [-24, -70], [-18, -70], [-15, -75],
    [-5, -81], [0, -80], [5, -77], [8, -77], [10, -72], [12, -72],
  ],
  // Europe
  [
    [36, -10], [38, -8], [43, -9], [44, 0], [48, -5], [49, 0],
    [51, 2], [54, 8], [56, 8], [58, 12], [60, 5], [62, 5],
    [65, 14], [70, 20], [71, 28], [68, 35], [65, 30],
    [60, 30], [56, 28], [55, 20], [50, 18], [47, 15],
    [45, 14], [42, 18], [40, 26], [38, 24], [36, 28],
    [35, 24], [37, 22], [39, 20], [40, 15], [38, 14],
    [36, 0], [36, -10],
  ],
  // Africa
  [
    [37, -10], [36, 0], [33, 10], [32, 12], [30, 33],
    [22, 37], [12, 44], [10, 50], [2, 42], [-3, 40],
    [-11, 40], [-15, 36], [-25, 35], [-30, 31], [-35, 20],
    [-34, 18], [-30, 16], [-22, 14], [-17, 12], [-12, 14],
    [-5, 12], [0, 10], [5, 7], [5, 1], [0, 1],
    [-5, 9], [-5, 12], [4, -8], [5, -5], [10, -15],
    [15, -17], [20, -17], [25, -15], [30, -10], [36, -10], [37, -10],
  ],
  // Asia (simplified)
  [
    [42, 30], [45, 40], [40, 50], [38, 55], [35, 52],
    [25, 57], [20, 60], [25, 65], [28, 68], [25, 75],
    [22, 88], [20, 92], [22, 97], [10, 99], [1, 104],
    [8, 115], [22, 114], [25, 120], [30, 122], [35, 129],
    [38, 130], [40, 132], [43, 145], [46, 143], [50, 140],
    [53, 143], [56, 138], [55, 130], [60, 135],
    [65, 140], [70, 170], [68, 180], [66, 170],
    [60, 165], [55, 155], [50, 140], [52, 130],
    [50, 88], [55, 70], [50, 60], [45, 50], [42, 30],
  ],
  // Australia
  [
    [-12, 130], [-14, 127], [-20, 118], [-26, 114],
    [-32, 115], [-35, 117], [-35, 137], [-38, 146],
    [-37, 150], [-33, 152], [-28, 153], [-24, 150],
    [-20, 148], [-16, 146], [-14, 136], [-12, 130],
  ],
];

function fibonacciSphere(samples: number): Dot[] {
  const dots: Dot[] = [];
  const phi = Math.PI * (Math.sqrt(5) - 1);
  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / (samples - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = phi * i;
    dots.push({
      x: Math.cos(theta) * radius,
      y,
      z: Math.sin(theta) * radius,
    });
  }
  return dots;
}

function latLngToXYZ(lat: number, lng: number): Dot {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  return {
    x: Math.cos(latRad) * Math.cos(lngRad),
    y: Math.sin(latRad),
    z: Math.cos(latRad) * Math.sin(lngRad),
  };
}

function rotateY(dot: Dot, angle: number): Dot {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: dot.x * cos + dot.z * sin,
    y: dot.y,
    z: -dot.x * sin + dot.z * cos,
  };
}

function rotateX(dot: Dot, angle: number): Dot {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: dot.x,
    y: dot.y * cos - dot.z * sin,
    z: dot.y * sin + dot.z * cos,
  };
}

function project(
  dot: Dot,
  size: number,
  scale: number = 0.45
): { x: number; y: number; z: number } {
  const s = size * scale;
  return {
    x: dot.x * s + size / 2,
    y: -dot.y * s + size / 2,
    z: dot.z,
  };
}

export function Component({
  className,
  size = 400,
  dotCount = 800,
  dotSize = 1.2,
  dotColor = "rgba(255, 255, 255, 0.4)",
  arcColor = "rgba(0, 212, 255, 0.6)",
  markerColor = "rgba(0, 212, 255, 1)",
  rotationSpeed = 0.002,
  markers = [
    { lat: 31.77, lng: -106.44, label: "El Paso", type: "hub" as const },
    { lat: 40.71, lng: -74.01, label: "New York", type: "default" as const },
    { lat: 51.51, lng: -0.13, label: "London", type: "default" as const },
    { lat: 35.68, lng: 139.69, label: "Tokyo", type: "default" as const },
    { lat: -33.87, lng: 151.21, label: "Sydney", type: "default" as const },
    { lat: 38.91, lng: -77.04, label: "DC", type: "signal" as const },
    { lat: 22.54, lng: 114.06, label: "Shenzhen", type: "signal" as const },
    { lat: 32.08, lng: 34.78, label: "Tel Aviv", type: "signal" as const },
    { lat: 48.86, lng: 2.35, label: "Paris", type: "default" as const },
    { lat: 55.75, lng: 37.62, label: "Moscow", type: "default" as const },
    { lat: 19.43, lng: -99.13, label: "CDMX", type: "signal" as const },
    { lat: -23.55, lng: -46.63, label: "São Paulo", type: "default" as const },
    { lat: 1.35, lng: 103.82, label: "Singapore", type: "default" as const },
    { lat: 25.20, lng: 55.27, label: "Dubai", type: "default" as const },
    { lat: 37.39, lng: -122.08, label: "Silicon Valley", type: "hub" as const },
  ],
  connections = [
    [0, 1], [0, 5], [0, 10], [0, 14], // El Paso hub
    [1, 2], [1, 8], // NYC to London, Paris
    [2, 9], [2, 3], // London to Moscow, Tokyo
    [3, 6], [3, 12], // Tokyo to Shenzhen, Singapore
    [5, 7], [5, 2], // DC to Tel Aviv, London
    [14, 3], [14, 6], // SV to Tokyo, Shenzhen
    [6, 12], [12, 13], // Shenzhen-Singapore-Dubai
    [11, 10], // São Paulo to CDMX
  ],
}: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const animationRef = useRef<number>(0);
  const dotsRef = useRef<Dot[]>([]);
  const travelRef = useRef<number>(0);
  const frameCountRef = useRef(0);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, size * dpr, size * dpr);
      ctx.save();
      ctx.scale(dpr, dpr);

      const rotation = rotationRef.current;
      const tiltAngle = -0.3;
      const now = Date.now();
      frameCountRef.current++;

      // ─── Globe glow ────────────────────────────────────────────
      const cx = size / 2;
      const cy = size / 2;
      const globeR = size * 0.45;

      // Outer atmosphere glow
      const atmosGrad = ctx.createRadialGradient(cx, cy, globeR * 0.9, cx, cy, globeR * 1.15);
      atmosGrad.addColorStop(0, "rgba(0, 212, 255, 0.06)");
      atmosGrad.addColorStop(0.5, "rgba(0, 212, 255, 0.02)");
      atmosGrad.addColorStop(1, "rgba(0, 212, 255, 0)");
      ctx.beginPath();
      ctx.arc(cx, cy, globeR * 1.15, 0, Math.PI * 2);
      ctx.fillStyle = atmosGrad;
      ctx.fill();

      // Globe outline
      ctx.beginPath();
      ctx.arc(cx, cy, globeR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 212, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Subtle fill
      const globeFill = ctx.createRadialGradient(cx - globeR * 0.3, cy - globeR * 0.3, 0, cx, cy, globeR);
      globeFill.addColorStop(0, "rgba(0, 212, 255, 0.03)");
      globeFill.addColorStop(1, "rgba(0, 0, 0, 0.1)");
      ctx.fillStyle = globeFill;
      ctx.fill();

      // ─── Continent outlines ────────────────────────────────────
      for (const outline of CONTINENT_OUTLINES) {
        const projected = outline.map(([lat, lng]) => {
          const xyz = latLngToXYZ(lat, lng);
          const rotated = rotateX(rotateY(xyz, rotation), tiltAngle);
          return project(rotated, size);
        });

        // Draw visible segments
        ctx.beginPath();
        let drawing = false;
        for (let i = 0; i < projected.length; i++) {
          const p = projected[i];
          if (p.z < -0.05) {
            drawing = false;
            continue;
          }
          const alpha = 0.08 + p.z * 0.18;
          if (!drawing) {
            ctx.moveTo(p.x, p.y);
            drawing = true;
          } else {
            ctx.lineTo(p.x, p.y);
          }
          ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
        }
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // ─── Dots (land mass suggestion) ───────────────────────────
      if (dotsRef.current.length === 0) {
        dotsRef.current = fibonacciSphere(dotCount);
      }

      const sortedDots = dotsRef.current
        .map((dot) => {
          const rotated = rotateX(rotateY(dot, rotation), tiltAngle);
          return project(rotated, size);
        })
        .sort((a, b) => a.z - b.z);

      for (const projected of sortedDots) {
        if (projected.z < 0) continue;
        const alpha = 0.08 + projected.z * 0.4;
        ctx.beginPath();
        ctx.arc(projected.x, projected.y, dotSize * (0.5 + projected.z * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = dotColor.replace(/[\d.]+\)$/, `${alpha})`);
        ctx.fill();
      }

      // ─── Markers ───────────────────────────────────────────────
      const markerPositions = markers.map((m) => {
        const xyz = latLngToXYZ(m.lat, m.lng);
        const rotated = rotateX(rotateY(xyz, rotation), tiltAngle);
        return { ...project(rotated, size), label: m.label, type: m.type ?? "default" };
      });

      for (const mp of markerPositions) {
        if (mp.z < -0.1) continue;
        const alpha = 0.3 + mp.z * 0.7;

        if (mp.type === "hub") {
          // Hub markers — larger, double ring, brighter
          const pulseScale = 1 + Math.sin(now * 0.003) * 0.4;

          // Outer glow
          const glowGrad = ctx.createRadialGradient(mp.x, mp.y, 0, mp.x, mp.y, 14 * pulseScale);
          glowGrad.addColorStop(0, `rgba(0, 212, 255, ${alpha * 0.3})`);
          glowGrad.addColorStop(1, "rgba(0, 212, 255, 0)");
          ctx.beginPath();
          ctx.arc(mp.x, mp.y, 14 * pulseScale, 0, Math.PI * 2);
          ctx.fillStyle = glowGrad;
          ctx.fill();

          // Ring
          ctx.beginPath();
          ctx.arc(mp.x, mp.y, 8 * pulseScale, 0, Math.PI * 2);
          ctx.strokeStyle = markerColor.replace(/[\d.]+\)$/, `${alpha * 0.4})`);
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Core
          ctx.beginPath();
          ctx.arc(mp.x, mp.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = markerColor.replace(/[\d.]+\)$/, `${alpha})`);
          ctx.fill();

        } else if (mp.type === "signal") {
          // Signal markers — orange pulsing
          const pulseScale = 1 + Math.sin(now * 0.004 + 1) * 0.3;

          ctx.beginPath();
          ctx.arc(mp.x, mp.y, 6 * pulseScale, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 102, 0, ${alpha * 0.35})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(mp.x, mp.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 102, 0, ${alpha})`;
          ctx.fill();

        } else {
          // Default markers
          const pulseScale = 1 + Math.sin(now * 0.003) * 0.3;

          ctx.beginPath();
          ctx.arc(mp.x, mp.y, 6 * pulseScale, 0, Math.PI * 2);
          ctx.strokeStyle = markerColor.replace(/[\d.]+\)$/, `${alpha * 0.3})`);
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(mp.x, mp.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = markerColor.replace(/[\d.]+\)$/, `${alpha * 0.9})`);
          ctx.fill();
        }

        // Label
        if (mp.label && mp.z > 0.25) {
          ctx.font = "10px 'JetBrains Mono', monospace";
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.75})`;
          ctx.fillText(mp.label, mp.x + 10, mp.y + 3);
        }
      }

      // ─── Connection arcs with traveling signal pulses ──────────
      travelRef.current = (travelRef.current + 0.004) % 1;

      for (let ci = 0; ci < connections.length; ci++) {
        const [fromIdx, toIdx] = connections[ci];
        if (fromIdx >= markers.length || toIdx >= markers.length) continue;
        const from = markerPositions[fromIdx];
        const to = markerPositions[toIdx];
        if (from.z < -0.1 && to.z < -0.1) continue;

        const alpha = Math.min(
          from.z < 0 ? 0 : 0.3 + from.z * 0.5,
          to.z < 0 ? 0 : 0.3 + to.z * 0.5
        );
        if (alpha < 0.05) continue;

        // Arc path
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const dist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
        const bulge = dist * 0.25;

        // Gradient arc
        const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
        gradient.addColorStop(0, arcColor.replace(/[\d.]+\)$/, `${alpha * 0.2})`));
        gradient.addColorStop(0.5, arcColor.replace(/[\d.]+\)$/, `${alpha * 0.5})`));
        gradient.addColorStop(1, arcColor.replace(/[\d.]+\)$/, `${alpha * 0.2})`));

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(midX, midY - bulge, to.x, to.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Multiple traveling dots per arc (offset by connection index)
        const numPulses = 2;
        for (let p = 0; p < numPulses; p++) {
          const t = (travelRef.current + (ci * 0.13) + (p / numPulses)) % 1;
          const tx = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * midX + t * t * to.x;
          const ty =
            (1 - t) * (1 - t) * from.y +
            2 * (1 - t) * t * (midY - bulge) +
            t * t * to.y;

          // Glow around traveling dot
          const pulseGrad = ctx.createRadialGradient(tx, ty, 0, tx, ty, 6);
          pulseGrad.addColorStop(0, arcColor.replace(/[\d.]+\)$/, `${alpha * 0.6})`));
          pulseGrad.addColorStop(1, "rgba(0, 212, 255, 0)");
          ctx.beginPath();
          ctx.arc(tx, ty, 6, 0, Math.PI * 2);
          ctx.fillStyle = pulseGrad;
          ctx.fill();

          // Core dot
          ctx.beginPath();
          ctx.arc(tx, ty, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = arcColor.replace(/[\d.]+\)$/, `${alpha})`);
          ctx.fill();
        }
      }

      // ─── Subtle grid lines (latitude) ─────────────────────────
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let started = false;
        for (let lng = -180; lng <= 180; lng += 5) {
          const xyz = latLngToXYZ(lat, lng);
          const rotated = rotateX(rotateY(xyz, rotation), tiltAngle);
          const p = project(rotated, size);
          if (p.z < 0) { started = false; continue; }
          if (!started) { ctx.moveTo(p.x, p.y); started = true; }
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      ctx.restore();
    },
    [size, dotCount, dotSize, dotColor, arcColor, markerColor, markers, connections]
  );

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
      rotationRef.current += rotationSpeed;
      draw(ctx);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [size, rotationSpeed, draw]);

  return (
    <div className={cn("relative inline-block", className)}>
      <canvas
        ref={canvasRef}
        className="rounded-full"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
