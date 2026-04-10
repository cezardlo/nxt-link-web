'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

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

// Simplified but recognizable coastline data for each continent
// Format: array of [latitude, longitude] coordinate pairs
const COASTLINES = {
  northAmerica: [
    [85, -170], [80, -140], [75, -95], [70, -68], [65, -55], [60, -65], [55, -75],
    [50, -85], [48, -95], [45, -80], [42, -70], [40, -75], [38, -77], [36, -80],
    [34, -82], [32, -85], [30, -87], [28, -82], [27, -81], [26, -80], [25, -80],
    [24, -81], [23, -82], [22, -83], [21, -84], [20, -85], [19, -105], [20, -110],
    [25, -115], [30, -118], [35, -120], [40, -125], [45, -130], [50, -135], [55, -140],
    [60, -145], [65, -160], [70, -165], [75, -170], [80, -170], [85, -170],
  ],
  southAmerica: [
    [13, -60], [10, -62], [8, -70], [5, -77], [2, -75], [0, -78], [-2, -75],
    [-5, -70], [-8, -65], [-10, -62], [-12, -60], [-15, -57], [-18, -55], [-20, -57],
    [-22, -60], [-24, -62], [-26, -65], [-28, -68], [-30, -70], [-32, -72], [-33, -70],
    [-34, -68], [-35, -66], [-36, -65], [-37, -65], [-38, -62], [-39, -60], [-40, -58],
    [-41, -55], [-42, -52], [-43, -50], [-42, -48], [-40, -45], [-35, -42], [-30, -40],
    [-25, -38], [-20, -35], [-15, -32], [-10, -30], [-5, -28], [0, -25], [5, -20],
    [10, -25], [13, -60],
  ],
  europe: [
    [71, 25], [68, 35], [66, 38], [65, 42], [64, 45], [62, 48], [60, 50],
    [58, 48], [56, 45], [55, 40], [54, 35], [53, 30], [52, 25], [51, 20],
    [50, 15], [48, 10], [46, 5], [44, 0], [42, -5], [40, -8], [38, -10],
    [36, -5], [35, 0], [34, 5], [33, 10], [32, 15], [31, 20], [30, 22],
    [32, 25], [34, 28], [36, 30], [38, 32], [40, 33], [42, 32], [44, 30],
    [46, 28], [48, 26], [50, 25], [52, 26], [54, 28], [56, 30], [58, 32],
    [60, 35], [62, 38], [64, 40], [66, 38], [68, 35], [71, 25],
  ],
  africa: [
    [37, 8], [35, 10], [33, 12], [31, 14], [30, 16], [28, 18], [26, 20],
    [24, 22], [22, 24], [20, 25], [18, 26], [16, 27], [14, 28], [12, 29],
    [10, 30], [8, 31], [6, 32], [4, 32], [2, 32], [0, 32], [-2, 32],
    [-4, 31], [-6, 30], [-8, 28], [-10, 26], [-12, 24], [-14, 22], [-16, 20],
    [-18, 18], [-20, 16], [-22, 15], [-24, 14], [-26, 14], [-28, 16], [-30, 18],
    [-32, 20], [-34, 22], [-35, 25], [-33, 27], [-30, 30], [-28, 32], [-26, 33],
    [-24, 33], [-22, 32], [-20, 31], [-18, 30], [-16, 29], [-14, 28], [-12, 27],
    [-10, 26], [-8, 25], [-6, 24], [-4, 23], [-2, 22], [0, 22], [2, 22],
    [4, 22], [6, 23], [8, 24], [10, 26], [12, 28], [14, 29], [16, 30],
    [18, 31], [20, 32], [22, 33], [24, 34], [26, 35], [28, 35], [30, 34],
    [32, 32], [34, 30], [36, 28], [37, 26], [38, 24], [39, 22], [40, 20],
    [40, 18], [39, 16], [38, 14], [37, 12], [36, 10], [37, 8],
  ],
  asia: [
    [72, 75], [70, 80], [68, 85], [65, 90], [62, 95], [60, 100], [58, 105],
    [56, 110], [54, 115], [52, 120], [50, 125], [48, 130], [46, 135], [44, 140],
    [42, 145], [40, 148], [38, 145], [36, 140], [34, 135], [32, 130], [30, 125],
    [28, 120], [26, 115], [24, 110], [22, 105], [20, 100], [18, 95], [16, 90],
    [14, 85], [12, 80], [10, 75], [8, 70], [6, 65], [5, 60], [4, 55],
    [3, 50], [2, 45], [1, 40], [0, 35], [2, 30], [4, 25], [6, 20],
    [8, 15], [10, 10], [12, 5], [14, 0], [16, -5], [18, -10], [20, -15],
    [22, -20], [24, -25], [26, -30], [28, -35], [30, -40], [32, -45],
    [34, 0], [36, 5], [38, 10], [40, 15], [42, 20], [44, 25], [46, 30],
    [48, 35], [50, 40], [52, 45], [54, 50], [56, 55], [58, 60], [60, 65],
    [62, 70], [64, 75], [66, 80], [68, 85], [70, 80], [72, 75],
  ],
  australia: [
    [-9, 112], [-10, 115], [-11, 118], [-12, 120], [-13, 122], [-14, 124],
    [-15, 126], [-16, 128], [-17, 130], [-18, 131], [-19, 130], [-20, 128],
    [-21, 126], [-22, 124], [-23, 122], [-24, 120], [-25, 118], [-26, 116],
    [-27, 115], [-28, 116], [-29, 118], [-30, 120], [-31, 122], [-32, 124],
    [-33, 125], [-34, 124], [-35, 122], [-36, 120], [-37, 118], [-36, 115],
    [-35, 112], [-34, 110], [-33, 108], [-32, 107], [-31, 106], [-30, 105],
    [-29, 104], [-28, 103], [-27, 104], [-26, 105], [-25, 107], [-24, 109],
    [-23, 110], [-22, 111], [-21, 112], [-20, 112], [-19, 111], [-18, 110],
    [-17, 109], [-16, 108], [-15, 107], [-14, 106], [-13, 105], [-12, 104],
    [-11, 110], [-10, 112], [-9, 112],
  ],
  oceania: [
    [-10, 150], [-12, 152], [-14, 154], [-16, 156], [-18, 155], [-20, 153],
    [-22, 151], [-24, 149], [-26, 148], [-28, 150], [-30, 152], [-32, 151],
    [-34, 149], [-36, 147], [-38, 145], [-40, 143], [-42, 141], [-40, 139],
    [-38, 140], [-36, 141], [-34, 142], [-32, 140], [-30, 138], [-28, 136],
    [-26, 135], [-24, 134], [-22, 133], [-20, 132], [-18, 131], [-16, 132],
    [-14, 133], [-12, 134], [-10, 135], [-8, 137], [-6, 140], [-4, 142],
    [-2, 144], [0, 146], [2, 148], [4, 150], [6, 148], [8, 146], [10, 144],
    [12, 142], [14, 140], [16, 138], [14, 135], [12, 132], [10, 130],
    [8, 128], [6, 126], [4, 124], [2, 122], [0, 120], [-2, 118], [-4, 116],
    [-6, 114], [-8, 112], [-10, 150],
  ],
};

const RISK_COLORS: Record<string, string> = {
  critical: '#ff4444',
  high: '#ff8800',
  elevated: '#ffb800',
  moderate: '#ffd700',
  low: '#00ff88',
};

const projectPoint = (lat: number, lng: number, rotation: number): [number, number] | null => {
  const adjustedLng = lng + rotation;
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = adjustedLng * (Math.PI / 180);

  const x = Math.sin(phi) * Math.cos(theta);
  const y = Math.cos(phi);
  const z = Math.sin(phi) * Math.sin(theta);

  // Only show points on the front hemisphere
  if (z < -0.1) return null;

  return [x, y];
};

const drawGlobe = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rotation: number,
  regions: RegionData[],
  selectedRegion: string | null,
  scale: number,
) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;

  // Clear canvas
  ctx.fillStyle = '#12151a';
  ctx.fillRect(0, 0, width, height);

  // Draw globe shadow/edge
  ctx.strokeStyle = '#00d4ff15';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Draw continents
  Object.values(COASTLINES).forEach((coastline) => {
    const projectedPoints: [number, number][] = [];

    for (const [lat, lng] of coastline) {
      const projected = projectPoint(lat, lng, rotation);
      if (projected) {
        const [x, y] = projected;
        projectedPoints.push([
          centerX + x * radius,
          centerY - y * radius,
        ]);
      }
    }

    if (projectedPoints.length > 2) {
      // Fill continent
      ctx.fillStyle = '#1a2a3a';
      ctx.beginPath();
      ctx.moveTo(projectedPoints[0][0], projectedPoints[0][1]);
      for (let i = 1; i < projectedPoints.length; i++) {
        ctx.lineTo(projectedPoints[i][0], projectedPoints[i][1]);
      }
      ctx.closePath();
      ctx.fill();

      // Draw coastline
      ctx.strokeStyle = '#00d4ff22';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  });

  // Draw region markers
  if (regions && regions.length > 0) {
    regions.forEach((region) => {
      const projected = projectPoint(region.lat, region.lng, rotation);
      if (projected) {
        const [x, y] = projected;
        const screenX = centerX + x * radius;
        const screenY = centerY - y * radius;

        const color = RISK_COLORS[region.risk_level] || '#ffd700';
        const isSelected = region.id === selectedRegion;
        const markerSize = isSelected ? 10 : 6;
        const glowSize = isSelected ? 16 : 10;

        // Glow
        ctx.fillStyle = color + '40';
        ctx.beginPath();
        ctx.arc(screenX, screenY, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Marker
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, markerSize, 0, Math.PI * 2);
        ctx.fill();

        // Selection ring
        if (isSelected) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(screenX, screenY, markerSize + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    });
  }
};

export function Component({
  className,
  size = 400,
  regions = [],
  onRegionSelect,
  selectedRegion = null,
}: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const rotationRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragRotation, setDragRotation] = useState(0);
  const scale = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

  const getRegionAtPoint = useCallback(
    (x: number, y: number): RegionData | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const centerX = canvas.width / 2 / scale;
      const centerY = canvas.height / 2 / scale;
      const radius = Math.min(canvas.width, canvas.height) * 0.35 / scale;

      for (const region of regions) {
        const projected = projectPoint(region.lat, region.lng, rotationRef.current);
        if (projected) {
          const [px, py] = projected;
          const screenX = centerX + px * radius;
          const screenY = centerY - py * radius;

          const distance = Math.sqrt(
            Math.pow(x - screenX, 2) + Math.pow(y - screenY, 2),
          );

          if (distance < 12) {
            return region;
          }
        }
      }

      return null;
    },
    [regions, scale],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = size * scale;
    canvas.height = size * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      if (!isDragging) {
        rotationRef.current = (rotationRef.current + 0.15) % 360;
      } else {
        rotationRef.current = dragRotation;
      }

      drawGlobe(ctx, size * scale, size * scale, rotationRef.current, regions, selectedRegion, scale);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [size, regions, selectedRegion, isDragging, dragRotation, scale]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const region = getRegionAtPoint(x, y);
    if (region) {
      onRegionSelect?.(region);
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragRotation(rotationRef.current);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    setDragRotation((dragRotation + deltaX * 0.5) % 360);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-[#12151a]', className)}>
      <canvas
        ref={canvasRef}
        width={size * scale}
        height={size * scale}
        className="w-full cursor-grab active:cursor-grabbing"
        style={{ width: size, height: size, display: 'block' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      {selectedRegion && regions.length > 0 && (
        <div className="absolute bottom-4 left-4 rounded-lg bg-[#1a1e25] border border-[#2e3440] p-3 text-xs font-mono">
          <div className="text-[#00d4ff] font-semibold">
            {regions.find((r) => r.id === selectedRegion)?.name}
          </div>
          <div className="text-[#00ff88] text-xs mt-1">
            {regions.find((r) => r.id === selectedRegion)?.signal_count} signals
          </div>
        </div>
      )}
    </div>
  );
}
