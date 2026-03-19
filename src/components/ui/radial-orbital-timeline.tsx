'use client';

import React, { useState, useEffect, useCallback } from 'react';

export type OrbitalItem = {
  id: number;
  title: string;
  date: string;
  description: string;
  icon: string;
  color: string;
  energy: number; // 0–100
};

type Props = {
  timelineData: OrbitalItem[];
};

export default function RadialOrbitalTimeline({ timelineData }: Props) {
  const [rotation, setRotation] = useState(0);
  const [selectedItem, setSelectedItem] = useState<OrbitalItem | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // Auto-rotate the orbital ring
  useEffect(() => {
    if (!autoRotate) return;
    const id = setInterval(() => {
      setRotation((r) => (r + 0.15) % 360);
    }, 16);
    return () => clearInterval(id);
  }, [autoRotate]);

  const handleItemClick = useCallback((item: OrbitalItem) => {
    setSelectedItem((prev) => (prev?.id === item.id ? null : item));
    setAutoRotate(false);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedItem(null);
    setAutoRotate(true);
  }, []);

  const count = timelineData.length;
  const radius = 120; // orbital radius in px
  const cx = 200; // SVG center x
  const cy = 200; // SVG center y

  return (
    <div
      className="relative w-full flex flex-col items-center"
      style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace", backgroundColor: '#000', minHeight: '460px' }}
    >
      {/* SVG orbital ring */}
      <div className="relative" style={{ width: 400, height: 400 }}>
        <svg width={400} height={400} style={{ position: 'absolute', inset: 0 }}>
          {/* Orbital track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="rgba(0,212,255,0.10)"
            strokeWidth={1}
            strokeDasharray="4 6"
          />

          {/* Inner glow ring */}
          <circle
            cx={cx}
            cy={cy}
            r={radius - 4}
            fill="none"
            stroke="rgba(255,102,0,0.05)"
            strokeWidth={8}
          />

          {/* Center core */}
          <circle cx={cx} cy={cy} r={28} fill="rgba(0,212,255,0.06)" stroke="rgba(0,212,255,0.20)" strokeWidth={1} />
          <circle cx={cx} cy={cy} r={18} fill="rgba(255,102,0,0.08)" stroke="rgba(255,102,0,0.30)" strokeWidth={1} />
          <circle cx={cx} cy={cy} r={8} fill="#ff6600" opacity={0.7} />

          {/* Orbit items */}
          {timelineData.map((item, i) => {
            const angleBase = (i / count) * 360;
            const angle = ((angleBase + rotation) % 360) * (Math.PI / 180);
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            const isSelected = selectedItem?.id === item.id;
            const isHovered = hoveredId === item.id;
            const dotR = isSelected ? 18 : isHovered ? 14 : 10;

            return (
              <g key={item.id}>
                {/* Line from center to dot */}
                <line
                  x1={cx}
                  y1={cy}
                  x2={x}
                  y2={y}
                  stroke={item.color}
                  strokeWidth={isSelected ? 1 : 0.5}
                  opacity={isSelected ? 0.35 : 0.12}
                />

                {/* Energy bar arc stub (simplified as small arc) */}
                <circle
                  cx={x}
                  cy={y}
                  r={dotR + 4}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={1.5}
                  opacity={isSelected ? 0.4 : 0.15}
                  strokeDasharray={`${((item.energy / 100) * 2 * Math.PI * (dotR + 4)).toFixed(1)} 9999`}
                />

                {/* Dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={dotR}
                  fill={isSelected ? item.color : 'rgba(10,10,10,0.9)'}
                  stroke={item.color}
                  strokeWidth={isSelected ? 2 : 1}
                  style={{ cursor: 'pointer', transition: 'r 0.2s' }}
                  onMouseEnter={() => { setHoveredId(item.id); setAutoRotate(false); }}
                  onMouseLeave={() => { setHoveredId(null); if (!selectedItem) setAutoRotate(true); }}
                  onClick={() => handleItemClick(item)}
                />

                {/* Icon text */}
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ fontSize: isSelected ? 12 : 9, pointerEvents: 'none', userSelect: 'none' }}
                >
                  {item.icon}
                </text>

                {/* Label when hovered or selected */}
                {(isHovered || isSelected) && (
                  <text
                    x={x}
                    y={y + dotR + 10}
                    textAnchor="middle"
                    fill={item.color}
                    style={{ fontSize: 7, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', pointerEvents: 'none' }}
                  >
                    {item.date}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Center label */}
        <div
          className="absolute flex flex-col items-center justify-center"
          style={{ inset: 0, pointerEvents: 'none' }}
        >
          <span style={{ fontSize: 7, letterSpacing: '0.3em', color: 'rgba(0,212,255,0.6)' }}>NXT LINK</span>
          <span style={{ fontSize: 6, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)' }}>TIMELINE</span>
        </div>
      </div>

      {/* Detail card for selected item */}
      {selectedItem && (
        <div
          className="w-full max-w-md mt-4 rounded-sm"
          style={{
            border: `1px solid ${selectedItem.color}40`,
            backgroundColor: `${selectedItem.color}08`,
            padding: '16px',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <span style={{ fontSize: 20 }}>{selectedItem.icon}</span>
            <div className="flex-1">
              <div style={{ fontSize: 11, letterSpacing: '0.15em', color: selectedItem.color, fontWeight: 700 }}>
                {selectedItem.title}
              </div>
              <div style={{ fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>
                {selectedItem.date}
              </div>
            </div>

            {/* Energy badge */}
            <span
              style={{
                fontSize: 8,
                letterSpacing: '0.15em',
                padding: '3px 8px',
                border: `1px solid ${selectedItem.color}40`,
                backgroundColor: `${selectedItem.color}15`,
                color: selectedItem.color,
                borderRadius: 2,
              }}
            >
              {selectedItem.energy}% IMPACT
            </span>

            <button
              onClick={handleClose}
              style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', cursor: 'pointer', background: 'none', border: 'none', padding: '0 0 0 8px' }}
            >
              ✕
            </button>
          </div>

          {/* Description */}
          <p style={{ fontSize: 10, lineHeight: 1.7, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.03em' }}>
            {selectedItem.description}
          </p>

          {/* Energy bar */}
          <div style={{ marginTop: 12 }}>
            <div className="flex items-center justify-between mb-1">
              <span style={{ fontSize: 7, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.25)' }}>IMPACT SCORE</span>
              <span style={{ fontSize: 9, color: selectedItem.color, fontWeight: 700 }}>{selectedItem.energy}/100</span>
            </div>
            <div style={{ width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
              <div
                style={{
                  height: '100%',
                  width: `${selectedItem.energy}%`,
                  backgroundColor: selectedItem.color,
                  borderRadius: 2,
                  boxShadow: `0 0 8px ${selectedItem.color}66`,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={() => setAutoRotate((v) => !v)}
          style={{
            fontSize: 8,
            letterSpacing: '0.2em',
            padding: '4px 12px',
            border: `1px solid ${autoRotate ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.12)'}`,
            backgroundColor: autoRotate ? 'rgba(0,212,255,0.10)' : 'transparent',
            color: autoRotate ? '#00d4ff' : 'rgba(255,255,255,0.35)',
            borderRadius: 2,
            cursor: 'pointer',
          }}
        >
          {autoRotate ? '⏸ PAUSE' : '▶ ROTATE'}
        </button>
        <span style={{ fontSize: 7, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.20)' }}>
          {timelineData.length} EVENTS
        </span>
      </div>
    </div>
  );
}
