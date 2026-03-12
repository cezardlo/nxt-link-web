'use client';

import { useState } from 'react';
import type { FlightPoint, FlightCategory } from '@/components/MapCanvas';
import { FLIGHT_CATEGORY_COLORS } from '@/lib/utils/design-tokens';

// ─── Constants ────────────────────────────────────────────────────────────────

const FLIGHT_CATEGORIES = ['ALL', 'VIP', 'MILITARY', 'CARGO', 'COMMERCIAL', 'PRIVATE'] as const;

const EMERGENCY_SQUAWKS = new Set(['7500', '7600', '7700']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function headingToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8] ?? 'N';
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  flights: FlightPoint[];
};

export function FlightsSection({ flights }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const categoryFiltered = activeCategory === 'ALL'
    ? flights
    : flights.filter((f) => f.category === activeCategory);
  const filtered = search
    ? categoryFiltered.filter(
        (f) =>
          f.callsign.toLowerCase().includes(search.toLowerCase()) ||
          f.operator.toLowerCase().includes(search.toLowerCase())
      )
    : categoryFiltered;

  // Sort: VIP first, then military, then by altitude descending
  const sorted = [...filtered].sort((a, b) => {
    const order: Record<string, number> = { VIP: 0, MILITARY: 1, CARGO: 2, COMMERCIAL: 3, PRIVATE: 4 };
    const diff = (order[a.category] ?? 5) - (order[b.category] ?? 5);
    if (diff !== 0) return diff;
    return b.altitudeFt - a.altitudeFt;
  });

  // Category counts
  const counts: Record<string, number> = { ALL: flights.length };
  for (const f of flights) counts[f.category] = (counts[f.category] ?? 0) + 1;

  return (
    <div className="flex flex-col h-full">
      {/* Header with category breakdown */}
      <div className="px-3 py-2 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] tracking-[0.15em] text-white/25">AIRCRAFT DIRECTORY</span>
          <span className="font-mono text-[9px] text-white/30">{flights.length > 0 ? `${flights.length} LIVE` : ''}</span>
        </div>
        {flights.length > 0 && (
          <div className="flex items-center gap-2 mt-1">
            {(['COMMERCIAL', 'MILITARY', 'VIP', 'CARGO', 'PRIVATE'] as const).map((cat) => {
              const count = flights.filter((f) => f.category === cat).length;
              if (count === 0) return null;
              const label = cat === 'COMMERCIAL' ? 'COMM' : cat === 'MILITARY' ? 'MIL' : cat;
              return (
                <span key={cat} className="font-mono text-[8px]" style={{ color: FLIGHT_CATEGORY_COLORS[cat] }}>
                  {count} {label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Category filter pills */}
      <div className="flex gap-1 px-2 py-1.5 border-b border-white/5 overflow-x-auto shrink-0 scrollbar-none">
        {FLIGHT_CATEGORIES.map((cat) => {
          const count = counts[cat] ?? 0;
          if (count === 0 && cat !== 'ALL') return null;
          const color = cat === 'ALL' ? '#ffb800' : FLIGHT_CATEGORY_COLORS[cat as FlightCategory];
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-1.5 py-0.5 font-mono text-[8px] rounded-sm transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'text-black font-bold'
                  : 'text-white/30 hover:text-white/60 bg-white/5'
              }`}
              style={activeCategory === cat ? { backgroundColor: color } : {}}
            >
              {cat} {count > 0 && <span className="opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Callsign search */}
      <div className="px-2 py-1.5 border-b border-white/5 shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search callsign or operator..."
          className="w-full bg-white/5 border border-white/8 rounded-sm px-2 py-1 font-mono text-[9px] text-white/60 placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
        />
      </div>

      {/* Aircraft list */}
      <div className="flex-1 overflow-y-auto">
        {flights.length === 0 ? (
          <div className="p-4 flex flex-col gap-2">
            <p className="font-mono text-[10px] text-white/25">No aircraft tracked.</p>
            <p className="font-mono text-[9px] text-white/15 leading-relaxed">
              Enable the FLIGHTS or MILITARY layer to track live aircraft over El Paso.
            </p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-4">
            <p className="font-mono text-[10px] text-white/25">No aircraft in this category.</p>
          </div>
        ) : (
          sorted.map((f) => {
            const catColor = FLIGHT_CATEGORY_COLORS[f.category];
            const isEmergency = EMERGENCY_SQUAWKS.has(f.squawk);
            const phaseIcon = f.phase === 'CLIMBING' ? '\u2197' : f.phase === 'DESCENDING' ? '\u2198' : '\u2192';
            const phaseColor = f.phase === 'CLIMBING' ? '#00ff88' : f.phase === 'DESCENDING' ? '#ff3b30' : '#ffffff33';

            return (
              <div key={f.id} className="px-3 py-2 border-b border-white/5 hover:bg-white/3 transition-colors">
                {/* Row 1: Category badge + Callsign + Squawk */}
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-mono text-[7px] tracking-wider px-1 py-px rounded-sm font-bold"
                    style={{ backgroundColor: catColor + '25', color: catColor }}
                  >
                    {f.category}
                  </span>
                  <span className="font-mono text-xs font-bold text-white/80">{f.callsign}</span>
                  {f.approachingELP && (
                    <span className="font-mono text-[7px] px-1 py-px rounded-sm bg-[#00ff88]/15 text-[#00ff88] font-bold">
                      APPROACH ELP
                    </span>
                  )}
                  {isEmergency && (
                    <span className="font-mono text-[7px] px-1 py-px rounded-sm bg-red-500/20 text-red-400 font-bold animate-pulse">
                      SQUAWK {f.squawk}
                    </span>
                  )}
                  {f.squawk && !isEmergency && (
                    <span className="ml-auto font-mono text-[8px] text-white/15">{f.squawk}</span>
                  )}
                </div>

                {/* Row 2: Operator + Country */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[9px] text-white/40">{f.operator}</span>
                  {f.country && (
                    <span className="ml-auto font-mono text-[8px] text-white/20 truncate max-w-[80px]">{f.country}</span>
                  )}
                </div>

                {/* Row 3: Alt + Speed + Heading + Phase */}
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono text-[9px] text-white/30">
                    {f.altitudeFt.toLocaleString()} <span className="text-white/15">ft</span>
                  </span>
                  <span className="font-mono text-[9px] text-white/30">
                    {f.velocityKts} <span className="text-white/15">kts</span>
                  </span>
                  <span className="font-mono text-[9px] text-white/30">
                    {headingToCompass(f.headingDeg)} {f.headingDeg}°
                  </span>
                  <span className="ml-auto font-mono text-[9px] flex items-center gap-0.5" style={{ color: phaseColor }}>
                    {phaseIcon} {f.phase}
                    {f.verticalFpm !== 0 && (
                      <span className="text-[8px] text-white/20 ml-0.5">
                        {f.verticalFpm > 0 ? '+' : ''}{f.verticalFpm}fpm
                      </span>
                    )}
                  </span>
                </div>

                {/* Row 4: ICAO24 hex */}
                <div className="mt-0.5">
                  <span className="font-mono text-[7px] text-white/10">ICAO {(f.id ?? '').toUpperCase()}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer summary */}
      {flights.length > 0 && (
        <div className="px-3 py-1.5 border-t border-white/5 shrink-0">
          <p className="font-mono text-[8px] text-white/15">
            Live via OpenSky Network · 30s refresh
          </p>
        </div>
      )}
    </div>
  );
}
