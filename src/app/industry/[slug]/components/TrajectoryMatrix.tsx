'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Technology, TechCategory, IndustryMeta } from '@/lib/data/technology-catalog';

// ── Types ────────────────────────────────────────────────────────────────────

type TimeMode = 'now' | '+6mo' | '+12mo';

type TrajectoryMatrixProps = {
  industry: IndustryMeta;
  technologies: Technology[];
  accentColor: string;
  selectedTechId: string | null;
  onTechSelect: (techId: string | null) => void;
  highlightedCountries?: string[];
};

// ── Constants ────────────────────────────────────────────────────────────────

const CX = 400;
const CY = 400;
const RING_RADII = { mature: 120, growing: 220, emerging: 310 } as const;
const ARM_LENGTH = 340;
const LABEL_RADIUS = 360;

const INDUSTRY_ARM_CONFIG: {
  slug: string;
  label: string;
  category: TechCategory;
  color: string;
  angleDeg: number;
}[] = [
  { slug: 'ai-ml',         label: 'AI / ML',        category: 'AI/ML',         color: '#60a5fa', angleDeg: 0   },
  { slug: 'cybersecurity',  label: 'CYBERSECURITY',  category: 'Cybersecurity',  color: '#00d4ff', angleDeg: 45  },
  { slug: 'defense',        label: 'DEFENSE',        category: 'Defense',        color: '#ff6400', angleDeg: 90  },
  { slug: 'border-tech',    label: 'BORDER TECH',    category: 'Border Tech',    color: '#f97316', angleDeg: 135 },
  { slug: 'manufacturing',  label: 'MANUFACTURING',  category: 'Manufacturing',  color: '#00d4ff', angleDeg: 180 },
  { slug: 'energy',         label: 'ENERGY',         category: 'Energy',         color: '#ffd700', angleDeg: 225 },
  { slug: 'healthcare',     label: 'HEALTHCARE',     category: 'Healthcare',     color: '#00ff88', angleDeg: 270 },
  { slug: 'logistics',      label: 'LOGISTICS',      category: 'Logistics',      color: '#ffb800', angleDeg: 315 },
];

const CATEGORY_TO_SLUG: Record<TechCategory, string> = {
  'AI/ML': 'ai-ml',
  'Cybersecurity': 'cybersecurity',
  'Defense': 'defense',
  'Border Tech': 'border-tech',
  'Manufacturing': 'manufacturing',
  'Energy': 'energy',
  'Healthcare': 'healthcare',
  'Logistics': 'logistics',
};

function degToRad(deg: number): number {
  return ((deg - 90) * Math.PI) / 180; // -90 so 0° = top
}

function polarToXY(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = degToRad(angleDeg);
  return { x: CX + Math.cos(rad) * radius, y: CY + Math.sin(rad) * radius };
}

// Seeded pseudo-random for stable jitter
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return ((hash & 0x7fffffff) % 1000) / 1000;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TrajectoryMatrix({
  industry,
  technologies,
  accentColor,
  selectedTechId,
  onTechSelect,
  highlightedCountries,
}: TrajectoryMatrixProps) {
  const [timeMode, setTimeMode] = useState<TimeMode>('now');
  const [focusedIndustry, setFocusedIndustry] = useState<string | null>(null);
  const [hoveredTech, setHoveredTech] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [firstLoad, setFirstLoad] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setFirstLoad(false), 2800);
    return () => clearTimeout(timer);
  }, []);

  // ── Dot positions ────────────────────────────────────────────────────────

  const dotPositions = useMemo(() => {
    // Group technologies by arm
    const armGroups: Record<string, Technology[]> = {};
    for (const arm of INDUSTRY_ARM_CONFIG) {
      armGroups[arm.slug] = [];
    }
    for (const tech of technologies) {
      const slug = CATEGORY_TO_SLUG[tech.category];
      if (slug && armGroups[slug]) {
        armGroups[slug].push(tech);
      }
    }

    // Calculate positions
    const positions: {
      tech: Technology;
      x: number;
      y: number;
      predictedX: number;
      predictedY: number;
      baseRadius: number;
      angleDeg: number;
      armSlug: string;
      armColor: string;
      dotSize: number;
      opacity: number;
      pulseSpeed: number;
      animDelay: number;
    }[] = [];

    for (const arm of INDUSTRY_ARM_CONFIG) {
      const techs = armGroups[arm.slug] || [];
      // Group by maturity within each arm for spread
      const maturityGroups: Record<string, Technology[]> = { emerging: [], growing: [], mature: [] };
      for (const t of techs) maturityGroups[t.maturityLevel].push(t);

      for (const [maturity, group] of Object.entries(maturityGroups)) {
        const baseR = RING_RADII[maturity as keyof typeof RING_RADII];
        const count = group.length;

        group.forEach((tech, idx) => {
          const rng = seededRandom(tech.id);
          const rJitter = (rng - 0.5) * 40; // ±20
          const r = baseR + rJitter;

          // Spread techs at same maturity along the arm
          const spreadDeg = count > 1
            ? -8 + (16 / (count - 1)) * idx
            : 0;
          const angleDeg = arm.angleDeg + spreadDeg;

          const { x, y } = polarToXY(angleDeg, r);

          // Predicted position (moves inward by one maturity ring)
          let predictedR = r;
          if (maturity === 'emerging') predictedR = r - 45;
          else if (maturity === 'growing') predictedR = r - 50;
          // mature stays

          const predicted12 = polarToXY(angleDeg, predictedR);
          // predicted6 position is halfway between current and predicted12
          void 0; // prediction midpoint reserved for +6mo mode

          const dotSize = maturity === 'mature' ? 5 : maturity === 'growing' ? 4 : 3;
          const opacity = maturity === 'mature' ? 0.8 : maturity === 'growing' ? 0.6 : 0.4;
          const pulseSpeed = maturity === 'emerging' ? 2 : maturity === 'growing' ? 4 : 0;

          positions.push({
            tech,
            x, y,
            predictedX: predicted12.x,
            predictedY: predicted12.y,
            baseRadius: r,
            angleDeg,
            armSlug: arm.slug,
            armColor: arm.color,
            dotSize,
            opacity,
            pulseSpeed,
            animDelay: (r / ARM_LENGTH) * 1.2 + rng * 0.3, // stagger by distance
          });
        });
      }
    }

    return positions;
  }, [technologies]);

  // ── Interaction helpers ──────────────────────────────────────────────────

  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if ((e.target as SVGElement).closest('[data-tech-dot]')) return;
      if ((e.target as SVGElement).closest('[data-arm-label]')) return;
      onTechSelect(null);
      setFocusedIndustry(null);
    },
    [onTechSelect]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 800,
      y: ((e.clientY - rect.top) / rect.height) * 800,
    });
  }, []);

  const hoveredDot = useMemo(() => {
    if (!hoveredTech) return null;
    return dotPositions.find((d) => d.tech.id === hoveredTech) || null;
  }, [hoveredTech, dotPositions]);

  // Determine which dots are "highlighted" based on country selection
  const highlightedTechIds = useMemo(() => {
    if (!highlightedCountries || highlightedCountries.length === 0) return null;
    // Highlight all techs — in a real implementation, we'd map countries to sectors
    // For now, highlighting all techs when countries are selected
    return new Set(technologies.map((t) => t.id));
  }, [highlightedCountries, technologies]);

  // ── Signal counts per arm ─────────────────────────────────────────────
  const armCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const arm of INDUSTRY_ARM_CONFIG) counts[arm.slug] = 0;
    for (const tech of technologies) {
      const slug = CATEGORY_TO_SLUG[tech.category];
      if (slug && counts[slug] !== undefined) counts[slug]++;
    }
    return counts;
  }, [technologies]);

  // ── Render ───────────────────────────────────────────────────────────────

  const isFocused = focusedIndustry !== null;

  return (
    <div className="w-full flex flex-col items-center" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Inline keyframes */}
      <style>{`
        @keyframes tm-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes tm-center-pulse {
          0%, 100% { opacity: 0.12; transform: scale(1); }
          50% { opacity: 0.22; transform: scale(1.08); }
        }
        @keyframes tm-dot-pulse-2s {
          0%, 100% { opacity: var(--dot-opacity); transform: scale(1); }
          50% { opacity: calc(var(--dot-opacity) + 0.15); transform: scale(1.25); }
        }
        @keyframes tm-dot-pulse-4s {
          0%, 100% { opacity: var(--dot-opacity); transform: scale(1); }
          50% { opacity: calc(var(--dot-opacity) + 0.1); transform: scale(1.15); }
        }
        @keyframes tm-ring-draw {
          from { stroke-dashoffset: var(--ring-circumference); }
          to { stroke-dashoffset: 0; }
        }
        @keyframes tm-arm-extend {
          from { stroke-dashoffset: ${ARM_LENGTH}; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes tm-dot-pop {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.3); }
          100% { transform: scale(1); opacity: var(--dot-opacity); }
        }
        @keyframes tm-flare {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(2.2); }
        }
        @keyframes tm-scanline {
          0% { transform: translateY(-400px); }
          100% { transform: translateY(400px); }
        }
        @keyframes tm-center-ring-pulse {
          0%, 100% { r: 36; opacity: 0.15; }
          50% { r: 42; opacity: 0.06; }
        }
      `}</style>

      {/* Section header */}
      <div className="mb-4 text-center">
        <div
          style={{
            fontSize: '8px',
            letterSpacing: '0.3em',
            color: 'rgba(240,240,240,0.15)',
            textTransform: 'uppercase',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          TRAJECTORY MATRIX
        </div>
        <div
          style={{
            fontSize: '8px',
            color: 'rgba(240,240,240,0.10)',
            fontFamily: "'IBM Plex Mono', monospace",
            marginTop: '2px',
          }}
        >
          Technology Convergence Radar
        </div>
      </div>

      {/* Legend guide */}
      <div
        className="font-mono text-center mb-2"
        style={{
          fontSize: '7px',
          letterSpacing: '0.1em',
          color: 'rgba(255,255,255,0.15)',
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        INNER RING = MAINSTREAM · MIDDLE = GROWING · OUTER = EXPERIMENTAL · CLICK ANY DOT TO EXPLORE
      </div>

      {/* SVG */}
      <div className="w-full" style={{ maxWidth: '720px' }}>
        <svg
          ref={svgRef}
          viewBox="0 0 800 800"
          className="w-full h-auto"
          style={{ background: 'transparent' }}
          onClick={handleSvgClick}
          onMouseMove={handleMouseMove}
        >
          <defs>
            {/* Center glow */}
            <radialGradient id="tm-center-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
            </radialGradient>

            {/* Radial depth gradient for SVG background */}
            <radialGradient id="tm-bg-depth" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(0,20,30,0.4)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            {/* Ring glow filter */}
            <filter id="tm-ring-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Sweep afterglow gradient */}
            <linearGradient id="tm-sweep-trail" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00d4ff" stopOpacity="0" />
              <stop offset="100%" stopColor="#00d4ff" stopOpacity="0.12" />
            </linearGradient>

            {/* Dot glow gradients per industry */}
            {INDUSTRY_ARM_CONFIG.map((arm) => (
              <radialGradient key={`glow-${arm.slug}`} id={`tm-dot-glow-${arm.slug}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={arm.color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={arm.color} stopOpacity="0" />
              </radialGradient>
            ))}

            {/* Selected dot enhanced glow */}
            <filter id="tm-selected-glow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── Background depth gradient ──────────────────────────────────── */}
          <circle cx={CX} cy={CY} r={380} fill="url(#tm-bg-depth)" />

          {/* ── Scanline effect ──────────────────────────────────────────────── */}
          <g style={{ clipPath: `circle(380px at ${CX}px ${CY}px)` }}>
            <rect
              x={0}
              y={0}
              width={800}
              height={40}
              fill="url(#tm-sweep-trail)"
              opacity={0.15}
              style={{
                animation: 'tm-scanline 8s linear infinite',
              }}
            />
          </g>

          {/* ── Concentric rings ───────────────────────────────────────────── */}
          {([
            { key: 'mature',   r: RING_RADII.mature,   label: 'MAINSTREAM',    strokeOpacity: 0.06, dash: 'none', delay: 0 },
            { key: 'growing',  r: RING_RADII.growing,  label: 'GROWING',       strokeOpacity: 0.04, dash: 'none', delay: 0.2 },
            { key: 'emerging', r: RING_RADII.emerging,  label: 'EXPERIMENTAL',  strokeOpacity: 0.03, dash: '6 4', delay: 0.4 },
          ] as const).map((ring) => {
            const circumference = 2 * Math.PI * ring.r;
            // Tick marks every 45 degrees
            const ticks = Array.from({ length: 8 }, (_, i) => {
              const angleDeg = i * 45;
              const inner = polarToXY(angleDeg, ring.r - 4);
              const outer = polarToXY(angleDeg, ring.r + 4);
              return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y };
            });
            return (
              <g key={ring.key}>
                {/* Glow ring (behind) */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={ring.r}
                  fill="none"
                  stroke={accentColor}
                  strokeOpacity={ring.strokeOpacity * 1.5}
                  strokeWidth={3}
                  filter="url(#tm-ring-glow)"
                  style={
                    firstLoad
                      ? {
                          ['--ring-circumference' as string]: circumference,
                          strokeDasharray: `${circumference}`,
                          strokeDashoffset: circumference,
                          animation: `tm-ring-draw 800ms ease-out ${ring.delay}s forwards`,
                        }
                      : undefined
                  }
                />
                {/* Main ring */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={ring.r}
                  fill="none"
                  stroke={accentColor}
                  strokeOpacity={ring.strokeOpacity * 2}
                  strokeWidth={1}
                  strokeDasharray={ring.dash === 'none' ? `${circumference}` : ring.dash}
                  style={
                    firstLoad
                      ? {
                          ['--ring-circumference' as string]: circumference,
                          strokeDasharray: `${circumference}`,
                          strokeDashoffset: circumference,
                          animation: `tm-ring-draw 800ms ease-out ${ring.delay}s forwards`,
                        }
                      : ring.dash !== 'none'
                        ? { strokeDasharray: ring.dash }
                        : undefined
                  }
                />
                {/* Tick marks */}
                {ticks.map((tick, i) => (
                  <line
                    key={i}
                    x1={tick.x1}
                    y1={tick.y1}
                    x2={tick.x2}
                    y2={tick.y2}
                    stroke={accentColor}
                    strokeOpacity={0.08}
                    strokeWidth={0.5}
                  />
                ))}
                {/* Ring label */}
                <text
                  x={CX}
                  y={CY - ring.r - 6}
                  textAnchor="middle"
                  fill="white"
                  fillOpacity={0.15}
                  fontSize={7}
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {ring.label}
                </text>
              </g>
            );
          })}

          {/* ── Radial arms ────────────────────────────────────────────────── */}
          {INDUSTRY_ARM_CONFIG.map((arm) => {
            const end = polarToXY(arm.angleDeg, ARM_LENGTH);
            const labelPos = polarToXY(arm.angleDeg, LABEL_RADIUS);
            const isCurrentIndustry = arm.slug === industry.slug;
            const isArmFocused = focusedIndustry === arm.slug;
            const dimmed = isFocused && !isArmFocused;

            return (
              <g key={arm.slug}>
                {/* Arm line */}
                <line
                  x1={CX}
                  y1={CY}
                  x2={end.x}
                  y2={end.y}
                  stroke="white"
                  strokeOpacity={dimmed ? 0.01 : isCurrentIndustry ? 0.08 : 0.03}
                  strokeWidth={isCurrentIndustry ? 1.5 : 1}
                  strokeDasharray={ARM_LENGTH}
                  style={
                    firstLoad
                      ? {
                          strokeDashoffset: ARM_LENGTH,
                          animation: `tm-arm-extend 400ms ease-out 0.3s forwards`,
                        }
                      : { strokeDashoffset: 0 }
                  }
                />
                {/* Arm label */}
                <text
                  data-arm-label
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={arm.color}
                  fillOpacity={dimmed ? 0.05 : isCurrentIndustry ? 0.8 : 0.5}
                  fontSize={7}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'fill-opacity 300ms ease',
                  }}
                  className="hidden md:block"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFocusedIndustry(focusedIndustry === arm.slug ? null : arm.slug);
                  }}
                >
                  {arm.label}{armCounts[arm.slug] > 0 ? ` (${armCounts[arm.slug]})` : ''}
                </text>
              </g>
            );
          })}

          {/* ── Sweep line ─────────────────────────────────────────────────── */}
          <g
            style={{
              transformOrigin: `${CX}px ${CY}px`,
              animation: firstLoad
                ? `tm-sweep 30s linear 0.6s infinite`
                : `tm-sweep 30s linear infinite`,
            }}
          >
            {/* Afterglow wedge */}
            <path
              d={(() => {
                const r = ARM_LENGTH;
                const sweepAngle = 20;
                const startRad = degToRad(-sweepAngle);
                const endRad = degToRad(0);
                const x1 = CX + Math.cos(startRad) * r;
                const y1 = CY + Math.sin(startRad) * r;
                const x2 = CX + Math.cos(endRad) * r;
                const y2 = CY + Math.sin(endRad) * r;
                return `M ${CX} ${CY} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
              })()}
              fill="url(#tm-sweep-trail)"
            />
            {/* Sweep line */}
            <line
              x1={CX}
              y1={CY}
              x2={CX}
              y2={CY - ARM_LENGTH}
              stroke="#00d4ff"
              strokeOpacity={0.12}
              strokeWidth={1}
            />
          </g>

          {/* ── Center node ────────────────────────────────────────────────── */}
          <circle
            cx={CX}
            cy={CY}
            r={50}
            fill="url(#tm-center-glow)"
            style={{ animation: 'tm-center-pulse 4s ease-in-out infinite' }}
          />
          {/* Pulsing outer ring */}
          <circle
            cx={CX}
            cy={CY}
            r={36}
            fill="none"
            stroke={accentColor}
            strokeOpacity={0.15}
            strokeWidth={1.5}
            style={{
              animation: 'tm-center-ring-pulse 3s ease-in-out infinite',
            }}
          />
          {/* Second pulsing ring, offset timing */}
          <circle
            cx={CX}
            cy={CY}
            r={44}
            fill="none"
            stroke={accentColor}
            strokeOpacity={0.06}
            strokeWidth={0.8}
            style={{
              animation: 'tm-center-ring-pulse 3s ease-in-out 1.5s infinite',
            }}
          />
          <circle
            cx={CX}
            cy={CY}
            r={30}
            fill="#00d4ff"
            fillOpacity={0.08}
            stroke="#00d4ff"
            strokeOpacity={0.15}
            strokeWidth={1}
          />
          <text
            x={CX}
            y={CY - 5}
            textAnchor="middle"
            fill="white"
            fillOpacity={0.3}
            fontSize={8}
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            HUMAN
          </text>
          <text
            x={CX}
            y={CY + 8}
            textAnchor="middle"
            fill="white"
            fillOpacity={0.3}
            fontSize={8}
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            TRAJECTORY
          </text>

          {/* ── Technology dots ─────────────────────────────────────────────── */}
          {dotPositions.map((dot) => {
            const dimmedByFocus = isFocused && dot.armSlug !== focusedIndustry;
            const isSelected = selectedTechId === dot.tech.id;
            const isHovered = hoveredTech === dot.tech.id;
            const dimmedBySelection = selectedTechId !== null && !isSelected;
            const dimmedByCountry =
              highlightedTechIds !== null && !highlightedTechIds.has(dot.tech.id);

            const effectiveOpacity = dimmedByFocus
              ? 0.05
              : dimmedBySelection
                ? 0.15
                : dimmedByCountry
                  ? 0.15
                  : dot.opacity;

            // Determine position based on time mode
            let posX = dot.x;
            let posY = dot.y;
            if (timeMode === '+12mo' && dot.tech.maturityLevel !== 'mature') {
              posX = dot.predictedX;
              posY = dot.predictedY;
            } else if (timeMode === '+6mo' && dot.tech.maturityLevel !== 'mature') {
              posX = dot.x + (dot.predictedX - dot.x) * 0.5;
              posY = dot.y + (dot.predictedY - dot.y) * 0.5;
            }

            const showGhost = timeMode !== 'now' && dot.tech.maturityLevel !== 'mature';

            // Pulse animation
            const pulseAnim =
              dot.pulseSpeed === 2
                ? 'tm-dot-pulse-2s'
                : dot.pulseSpeed === 4
                  ? 'tm-dot-pulse-4s'
                  : 'none';

            return (
              <g key={dot.tech.id} data-tech-dot>
                {/* Ghost dot (original position) when in future mode */}
                {showGhost && (
                  <>
                    <line
                      x1={dot.x}
                      y1={dot.y}
                      x2={posX}
                      y2={posY}
                      stroke={dot.armColor}
                      strokeOpacity={0.12}
                      strokeWidth={0.5}
                      strokeDasharray="3 2"
                      style={{ transition: 'all 800ms ease-out' }}
                    />
                    <circle
                      cx={dot.x}
                      cy={dot.y}
                      r={dot.dotSize}
                      fill="none"
                      stroke={dot.armColor}
                      strokeOpacity={0.2}
                      strokeWidth={0.8}
                      strokeDasharray="2 2"
                    />
                  </>
                )}

                {/* Glow behind dot */}
                <circle
                  cx={posX}
                  cy={posY}
                  r={dot.dotSize * (isSelected ? 5 : 3)}
                  fill={`url(#tm-dot-glow-${dot.armSlug})`}
                  opacity={isSelected ? 0.8 : effectiveOpacity}
                  style={{ transition: 'all 800ms ease-out' }}
                />

                {/* Main dot */}
                <circle
                  cx={posX}
                  cy={posY}
                  r={isSelected || isHovered ? dot.dotSize * 1.3 : dot.dotSize}
                  fill={dot.armColor}
                  opacity={effectiveOpacity}
                  style={{
                    ['--dot-opacity' as string]: effectiveOpacity,
                    transition: 'cx 800ms ease-out, cy 800ms ease-out, r 200ms ease, opacity 300ms ease',
                    transformOrigin: `${posX}px ${posY}px`,
                    animation: firstLoad
                      ? `tm-dot-pop 200ms ease-out ${dot.animDelay}s both`
                      : dimmedByFocus || dimmedBySelection
                        ? 'none'
                        : pulseAnim !== 'none'
                          ? `${pulseAnim} ${dot.pulseSpeed}s ease-in-out infinite`
                          : 'none',
                    cursor: 'pointer',
                    filter: isSelected ? 'url(#tm-selected-glow)' : undefined,
                  }}
                  onMouseEnter={() => setHoveredTech(dot.tech.id)}
                  onMouseLeave={() => setHoveredTech(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTechSelect(isSelected ? null : dot.tech.id);
                  }}
                />
              </g>
            );
          })}

          {/* ── Tooltip ────────────────────────────────────────────────────── */}
          {hoveredDot && (
            <g
              style={{ pointerEvents: 'none' }}
              transform={`translate(${
                mousePos.x + 160 > 800 ? mousePos.x - 160 : mousePos.x + 12
              }, ${
                mousePos.y + 90 > 800 ? mousePos.y - 90 : mousePos.y + 12
              })`}
            >
              <rect
                x={0}
                y={0}
                width={155}
                height={82}
                rx={12}
                fill="#161922"
                stroke={hoveredDot.armColor}
                strokeOpacity={0.2}
                strokeWidth={1}
              />
              {/* Tech name */}
              <text
                x={10}
                y={18}
                fill="white"
                fillOpacity={0.8}
                fontSize={10}
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {hoveredDot.tech.name.length > 22
                  ? hoveredDot.tech.name.slice(0, 20) + '...'
                  : hoveredDot.tech.name}
              </text>
              {/* Category */}
              <text
                x={10}
                y={32}
                fill={hoveredDot.armColor}
                fillOpacity={0.6}
                fontSize={8}
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {hoveredDot.tech.category}
              </text>
              {/* Maturity badge */}
              <rect
                x={10}
                y={38}
                width={
                  hoveredDot.tech.maturityLevel === 'emerging'
                    ? 48
                    : hoveredDot.tech.maturityLevel === 'growing'
                      ? 42
                      : 38
                }
                height={14}
                rx={3}
                fill={hoveredDot.armColor}
                fillOpacity={0.12}
              />
              <text
                x={14}
                y={49}
                fill={hoveredDot.armColor}
                fillOpacity={0.8}
                fontSize={7}
                style={{ fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase' }}
              >
                {hoveredDot.tech.maturityLevel}
              </text>
              {/* Description */}
              <text
                x={10}
                y={68}
                fill="white"
                fillOpacity={0.3}
                fontSize={7}
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {hoveredDot.tech.description.length > 80
                  ? hoveredDot.tech.description.slice(0, 77) + '...'
                  : hoveredDot.tech.description}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* ── Controls below SVG ──────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3 mt-4">
        {/* Time toggle */}
        <div
          className="flex items-center gap-0 rounded-full overflow-hidden"
          style={{
            border: '1px solid #232730',
            background: '#131519',
          }}
        >
          {(
            [
              { key: 'now', label: 'NOW' },
              { key: '+6mo', label: '+6MO' },
              { key: '+12mo', label: '+12MO' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setTimeMode(opt.key)}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '9px',
                letterSpacing: '0.1em',
                padding: '5px 14px',
                background: timeMode === opt.key ? 'rgba(0,212,255,0.1)' : 'transparent',
                color:
                  timeMode === opt.key
                    ? '#00d4ff'
                    : 'rgba(240,240,240,0.3)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 200ms ease',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Mode indicator */}
        <div
          className="flex items-center gap-2"
          style={{
            fontSize: '8px',
            letterSpacing: '0.15em',
            color: 'rgba(240,240,240,0.2)',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          <span style={{ color: isFocused ? accentColor : 'rgba(240,240,240,0.3)' }}>
            {isFocused ? 'FOCUS' : 'MACRO'}
          </span>
          {isFocused && (
            <>
              <span style={{ color: 'rgba(240,240,240,0.1)' }}>/</span>
              <span
                style={{
                  color:
                    INDUSTRY_ARM_CONFIG.find((a) => a.slug === focusedIndustry)?.color ||
                    'white',
                  opacity: 0.6,
                }}
              >
                {INDUSTRY_ARM_CONFIG.find((a) => a.slug === focusedIndustry)?.label || ''}
              </span>
              <button
                onClick={() => setFocusedIndustry(null)}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '7px',
                  letterSpacing: '0.1em',
                  padding: '2px 8px',
                  background: 'rgba(255,59,48,0.08)',
                  color: '#ff3b30',
                  border: '1px solid rgba(255,59,48,0.15)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginLeft: '4px',
                }}
              >
                CLEAR FOCUS
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
