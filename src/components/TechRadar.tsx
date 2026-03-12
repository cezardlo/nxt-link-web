'use client';

import { useMemo, useState } from 'react';

export type RadarTech = {
  id: string;
  name: string;
  maturityLevel: 'emerging' | 'growing' | 'mature';
  relatedVendorCount: number;
};

type Props = {
  technologies: RadarTech[];
  accentColor: string;
};

const RING_CONFIG = {
  mature:   { radius: 60,  color: '#00ff88', label: 'MATURE'   },
  growing:  { radius: 120, color: '#ffb800', label: 'GROWING'  },
  emerging: { radius: 175, color: '#00d4ff', label: 'EMERGING' },
} as const;

const CX = 200;
const CY = 200;
const DOT_MIN = 4;
const DOT_MAX = 12;

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function dotRadius(relatedVendorCount: number, allCounts: number[]): number {
  const max = Math.max(...allCounts, 1);
  const min = Math.min(...allCounts, 0);
  const range = max - min || 1;
  const norm = (relatedVendorCount - min) / range;
  return clamp(DOT_MIN + norm * (DOT_MAX - DOT_MIN), DOT_MIN, DOT_MAX);
}

type DotData = {
  tech: RadarTech;
  cx: number;
  cy: number;
  r: number;
  color: string;
  angle: number;
};

export function TechRadar({ technologies, accentColor }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Group technologies by ring, then compute evenly-spaced angles per ring.
  const dots = useMemo<DotData[]>(() => {
    const allCounts = technologies.map((t) => t.relatedVendorCount);

    const groups: Record<RadarTech['maturityLevel'], RadarTech[]> = {
      mature: [],
      growing: [],
      emerging: [],
    };

    for (const tech of technologies) {
      groups[tech.maturityLevel].push(tech);
    }

    const result: DotData[] = [];

    for (const level of ['mature', 'growing', 'emerging'] as const) {
      const ring = RING_CONFIG[level];
      const techs = groups[level];
      const count = techs.length;

      techs.forEach((tech, i) => {
        // Start offset by -PI/2 so 0 index is at the top (12 o'clock).
        // Add a small static stagger per ring so dots don't stack at the same angle.
        const stagger = level === 'growing' ? Math.PI / Math.max(count, 1) / 2 : level === 'emerging' ? Math.PI / Math.max(count, 1) / 3 : 0;
        const angle = stagger + (i / Math.max(count, 1)) * 2 * Math.PI - Math.PI / 2;

        const x = CX + ring.radius * Math.cos(angle);
        const y = CY + ring.radius * Math.sin(angle);

        result.push({
          tech,
          cx: x,
          cy: y,
          r: dotRadius(tech.relatedVendorCount, allCounts),
          color: ring.color,
          angle,
        });
      });
    }

    return result;
  }, [technologies]);

  const hoveredDot = hoveredId ? dots.find((d) => d.tech.id === hoveredId) ?? null : null;

  return (
    <div className="w-full max-w-[400px] mx-auto select-none">
      <svg
        viewBox="0 0 400 400"
        width="100%"
        height="100%"
        style={{ background: '#000', display: 'block' }}
        aria-label="Technology Radar"
      >
        {/* ── Decorative radial grid lines ── */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * 2 * Math.PI;
          const x2 = CX + 185 * Math.cos(angle);
          const y2 = CY + 185 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={CX}
              y1={CY}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />
          );
        })}

        {/* ── Concentric dashed rings ── */}
        {(['mature', 'growing', 'emerging'] as const).map((level) => {
          const ring = RING_CONFIG[level];
          return (
            <circle
              key={level}
              cx={CX}
              cy={CY}
              r={ring.radius}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* ── Ring color accent arcs (subtle, 10% opacity) ── */}
        {(['mature', 'growing', 'emerging'] as const).map((level) => {
          const ring = RING_CONFIG[level];
          return (
            <circle
              key={`accent-${level}`}
              cx={CX}
              cy={CY}
              r={ring.radius}
              fill="none"
              stroke={ring.color}
              strokeWidth="0.5"
              strokeOpacity="0.18"
            />
          );
        })}

        {/* ── Center crosshair ── */}
        <line x1={CX - 8} y1={CY} x2={CX + 8} y2={CY} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <line x1={CX} y1={CY - 8} x2={CX} y2={CY + 8} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r="2" fill="rgba(255,255,255,0.15)" />

        {/* ── Ring labels at 3 o'clock ── */}
        {(['mature', 'growing', 'emerging'] as const).map((level) => {
          const ring = RING_CONFIG[level];
          const lx = CX + ring.radius + 5;
          const ly = CY + 3;
          return (
            <text
              key={`label-${level}`}
              x={lx}
              y={ly}
              fontSize="7"
              fill={ring.color}
              fontFamily="'JetBrains Mono', 'IBM Plex Mono', monospace"
              letterSpacing="0.12em"
              opacity="0.55"
            >
              {ring.label}
            </text>
          );
        })}

        {/* ── Tech dots (non-hovered) ── */}
        {dots.map((d) => {
          const isHovered = hoveredId === d.tech.id;
          if (isHovered) return null;
          return (
            <circle
              key={d.tech.id}
              cx={d.cx}
              cy={d.cy}
              r={d.r}
              fill={d.color}
              fillOpacity="0.75"
              stroke={d.color}
              strokeWidth="0.5"
              strokeOpacity="0.4"
              style={{ cursor: 'pointer', filter: `drop-shadow(0 0 3px ${d.color}88)` }}
              onMouseEnter={() => setHoveredId(d.tech.id)}
              onMouseLeave={() => setHoveredId(null)}
            />
          );
        })}

        {/* ── Hovered dot — rendered last so it appears on top ── */}
        {hoveredDot && (() => {
          const d = hoveredDot;
          const glowColor = d.color;

          // Compute label placement: push label away from center so it doesn't overlap.
          const labelDist = d.r + 10;
          const lx = d.cx + labelDist * Math.cos(d.angle);
          const ly = d.cy + labelDist * Math.sin(d.angle);

          // Clamp label inside viewBox with some padding.
          const PAD = 14;
          const clampedLx = clamp(lx, PAD, 400 - PAD);
          const clampedLy = clamp(ly, PAD, 400 - PAD);

          // When dot is in the right hemisphere, label goes right; left hemisphere goes left.
          const goRight = Math.cos(d.angle) >= 0;
          // Tooltip text anchor and x offset
          const textAnchor = goRight ? 'start' : 'end';
          // Estimated char width at fontSize 8 in monospace
          const charW = 5.2;
          const nameWidth = d.tech.name.length * charW;
          const vendorLabel = `${d.tech.relatedVendorCount} VENDOR${d.tech.relatedVendorCount !== 1 ? 'S' : ''}`;
          const vendorWidth = vendorLabel.length * 4.4;
          const tooltipWidth = Math.max(nameWidth, vendorWidth) + 14;
          // Rect x: for start-anchor, place rect at clampedLx; for end-anchor, shift left by width.
          const rectX = goRight ? clampedLx : clampedLx - tooltipWidth;

          return (
            <g key="hovered">
              {/* Outer glow ring */}
              <circle
                cx={d.cx}
                cy={d.cy}
                r={d.r + 5}
                fill="none"
                stroke={glowColor}
                strokeWidth="1"
                strokeOpacity="0.35"
                style={{ filter: `drop-shadow(0 0 4px ${glowColor}aa)` }}
              />
              {/* Dot itself, fully opaque + brighter */}
              <circle
                cx={d.cx}
                cy={d.cy}
                r={d.r}
                fill={glowColor}
                fillOpacity="1"
                stroke={glowColor}
                strokeWidth="1"
                strokeOpacity="0.8"
                style={{
                  cursor: 'pointer',
                  filter: `drop-shadow(0 0 6px ${glowColor}cc)`,
                }}
                onMouseLeave={() => setHoveredId(null)}
              />
              {/* Tooltip background pill */}
              <rect
                x={rectX}
                y={clampedLy - 10}
                width={tooltipWidth}
                height={22}
                rx="2"
                fill="#000"
                fillOpacity="0.9"
                stroke={glowColor}
                strokeWidth="0.5"
                strokeOpacity="0.5"
              />
              {/* Tech name */}
              <text
                x={clampedLx + (goRight ? 5 : -5)}
                y={clampedLy - 2}
                fontSize="8"
                fill={glowColor}
                fontFamily="'JetBrains Mono', 'IBM Plex Mono', monospace"
                letterSpacing="0.08em"
                dominantBaseline="middle"
                textAnchor={textAnchor}
              >
                {d.tech.name}
              </text>
              {/* Vendor count line */}
              <text
                x={clampedLx + (goRight ? 5 : -5)}
                y={clampedLy + 8}
                fontSize="7"
                fill={glowColor}
                fontFamily="'JetBrains Mono', 'IBM Plex Mono', monospace"
                letterSpacing="0.1em"
                dominantBaseline="middle"
                textAnchor={textAnchor}
                opacity="0.6"
              >
                {vendorLabel}
              </text>
            </g>
          );
        })()}

        {/* ── Center label ── */}
        <text
          x={CX}
          y={CY - 2}
          fontSize="7"
          fill={accentColor}
          fontFamily="'JetBrains Mono', 'IBM Plex Mono', monospace"
          letterSpacing="0.18em"
          textAnchor="middle"
          dominantBaseline="middle"
          opacity="0.45"
        >
          TECH
        </text>
        <text
          x={CX}
          y={CY + 7}
          fontSize="7"
          fill={accentColor}
          fontFamily="'JetBrains Mono', 'IBM Plex Mono', monospace"
          letterSpacing="0.18em"
          textAnchor="middle"
          dominantBaseline="middle"
          opacity="0.45"
        >
          RADAR
        </text>
      </svg>

      {/* ── Legend row below SVG ── */}
      <div className="flex items-center justify-center gap-4 mt-2">
        {(['mature', 'growing', 'emerging'] as const).map((level) => {
          const ring = RING_CONFIG[level];
          const count = technologies.filter((t) => t.maturityLevel === level).length;
          return (
            <div key={level} className="flex items-center gap-1">
              <span
                className="inline-block rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: ring.color,
                  boxShadow: `0 0 6px ${ring.color}cc`,
                }}
              />
              <span
                className="font-mono tracking-widest"
                style={{ fontSize: 7, color: ring.color, opacity: 0.7 }}
              >
                {ring.label}
              </span>
              <span
                className="font-mono"
                style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)' }}
              >
                ({count})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
