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
  markers?: { lat: number; lng: number; label?: string }[];
  connections?: [number, number][];
}

interface Dot {
  x: number;
  y: number;
  z: number;
}

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
  arcColor = "rgba(255, 102, 0, 0.6)",
  markerColor = "rgba(255, 102, 0, 1)",
  rotationSpeed = 0.002,
  markers = [
    { lat: 40.7128, lng: -74.006, label: "New York" },
    { lat: 51.5074, lng: -0.1278, label: "London" },
    { lat: 35.6762, lng: 139.6503, label: "Tokyo" },
    { lat: -33.8688, lng: 151.2093, label: "Sydney" },
    { lat: 31.7619, lng: -106.485, label: "El Paso" },
  ],
  connections = [
    [0, 1],
    [1, 2],
    [2, 3],
    [0, 4],
    [4, 2],
  ],
}: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const animationRef = useRef<number>(0);
  const dotsRef = useRef<Dot[]>([]);
  const travelRef = useRef<number>(0);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, size * dpr, size * dpr);
      ctx.save();
      ctx.scale(dpr, dpr);

      const rotation = rotationRef.current;
      const tiltAngle = -0.3;

      // Draw globe outline
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.45, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw dots
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
        const alpha = 0.1 + projected.z * 0.5;
        ctx.beginPath();
        ctx.arc(projected.x, projected.y, dotSize * (0.5 + projected.z * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = dotColor.replace(/[\d.]+\)$/, `${alpha})`);
        ctx.fill();
      }

      // Draw markers
      const markerPositions = markers.map((m) => {
        const xyz = latLngToXYZ(m.lat, m.lng);
        const rotated = rotateX(rotateY(xyz, rotation), tiltAngle);
        return { ...project(rotated, size), label: m.label };
      });

      for (const mp of markerPositions) {
        if (mp.z < -0.1) continue;
        const alpha = 0.3 + mp.z * 0.7;

        // Pulse ring
        const pulseScale = 1 + Math.sin(Date.now() * 0.003) * 0.3;
        ctx.beginPath();
        ctx.arc(mp.x, mp.y, 6 * pulseScale, 0, Math.PI * 2);
        ctx.strokeStyle = markerColor.replace(/[\d.]+\)$/, `${alpha * 0.3})`);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(mp.x, mp.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = markerColor.replace(/[\d.]+\)$/, `${alpha})`);
        ctx.fill();

        // Label
        if (mp.label && mp.z > 0.3) {
          ctx.font = "10px 'JetBrains Mono', monospace";
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
          ctx.fillText(mp.label, mp.x + 10, mp.y + 3);
        }
      }

      // Draw connection arcs with traveling dots
      travelRef.current = (travelRef.current + 0.005) % 1;

      for (const [fromIdx, toIdx] of connections) {
        if (fromIdx >= markers.length || toIdx >= markers.length) continue;
        const from = markerPositions[fromIdx];
        const to = markerPositions[toIdx];
        if (from.z < -0.1 && to.z < -0.1) continue;

        const alpha = Math.min(
          from.z < 0 ? 0 : 0.3 + from.z * 0.5,
          to.z < 0 ? 0 : 0.3 + to.z * 0.5
        );

        // Arc
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const dist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
        const bulge = dist * 0.2;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(midX, midY - bulge, to.x, to.y);
        ctx.strokeStyle = arcColor.replace(/[\d.]+\)$/, `${alpha * 0.5})`);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Traveling dot
        const t = travelRef.current;
        const tx = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * midX + t * t * to.x;
        const ty =
          (1 - t) * (1 - t) * from.y +
          2 * (1 - t) * t * (midY - bulge) +
          t * t * to.y;

        ctx.beginPath();
        ctx.arc(tx, ty, 2, 0, Math.PI * 2);
        ctx.fillStyle = arcColor.replace(/[\d.]+\)$/, `${alpha})`);
        ctx.fill();
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
