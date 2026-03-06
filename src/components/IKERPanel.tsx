'use client';

import { useEffect, useState } from 'react';

type VendorDetail = {
  id?: string;
  name?: string;
  final_score?: number;
  momentum_score?: number;
  state?: string;
  signals?: { funding?: number; patents?: number; hiring?: number };
  briefing?: string;
};

function getMomentumState(score: number): string {
  if (score >= 0.75) return 'ACCELERATING';
  if (score >= 0.5) return 'EMERGING';
  if (score >= 0.25) return 'STABLE';
  return 'DECLINING';
}

function getMomentumColor(state: string): string {
  if (state === 'ACCELERATING') return '#00ff88';
  if (state === 'EMERGING') return '#00d4ff';
  if (state === 'STABLE') return '#ffb800';
  return '#ff3b30';
}

function ArcGauge({ score }: { score: number }) {
  const color = score >= 70 ? '#00ff88' : score >= 40 ? '#ffb800' : '#ff3b30';
  const pct = score / 100;
  // Semi-circle arc from 180° to 0° (left to right)
  const r = 40;
  const cx = 60;
  const cy = 55;
  const start = { x: cx - r, y: cy };
  const end = { x: cx + r, y: cy };
  const largeArc = pct > 0.5 ? 1 : 0;
  const angle = Math.PI * pct;
  const filled = {
    x: cx + r * Math.cos(Math.PI - angle),
    y: cy - r * Math.sin(Math.PI - angle),
  };

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="70" viewBox="0 0 120 70">
        {/* Track */}
        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Fill */}
        {score > 0 && (
          <path
            d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${filled.x} ${filled.y}`}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        )}
        {/* Score text */}
        <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize="20" fontFamily="monospace" fontWeight="bold">
          {score}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="monospace">
          /100
        </text>
      </svg>
      <p className="font-mono text-[9px] tracking-[0.2em] text-white/25 -mt-1">HEALTH</p>
    </div>
  );
}

const STUB: VendorDetail = {
  final_score: 0.71,
  momentum_score: 0.62,
  state: 'EMERGING',
  signals: { funding: 3, patents: 7, hiring: 12 },
  briefing: 'Platform-wide average. Select a vendor on the map to view its IKER profile.',
};

type Props = { vendorId?: string };

export function IKERPanel({ vendorId }: Props) {
  const [data, setData] = useState<VendorDetail>(STUB);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vendorId) { setData(STUB); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/intel/api/vendors/${vendorId}`)
      .then((r) => r.json())
      .then((d: VendorDetail) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(STUB); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [vendorId]);

  const health = Math.round((data.final_score ?? 0.5) * 100);
  const momentumScore = data.momentum_score ?? 0.5;
  const momentumState = (data.state?.toUpperCase()) ?? getMomentumState(momentumScore);
  const momentumColor = getMomentumColor(momentumState);
  const signals = data.signals ?? {};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="font-mono text-[10px] tracking-widest text-white/20">LOADING...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <ArcGauge score={health} />

      {/* Momentum */}
      <div className="flex items-center justify-between border border-white/5 rounded-sm px-3 py-2">
        <span className="font-mono text-[9px] tracking-[0.2em] text-white/25">MOMENTUM</span>
        <span
          className="font-mono text-[10px] font-bold tracking-wider"
          style={{ color: momentumColor, textShadow: `0 0 8px ${momentumColor}60` }}
        >
          {momentumState}
        </span>
      </div>

      {/* Signal counters */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: 'FUNDING', value: signals.funding ?? 0, color: '#ffb800' },
          { label: 'PATENTS', value: signals.patents ?? 0, color: '#ffb800' },
          { label: 'HIRING', value: signals.hiring ?? 0, color: '#f97316' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center gap-0.5 border border-white/5 rounded-sm p-2">
            <span className="font-mono text-xl font-bold" style={{ color, textShadow: `0 0 10px ${color}60` }}>
              {value}
            </span>
            <span className="font-mono text-[8px] tracking-[0.15em] text-white/20">{label}</span>
          </div>
        ))}
      </div>

      {/* IKER says */}
      {data.briefing && (
        <div className="rounded-sm p-3" style={{ border: '1px solid rgba(0,255,136,0.1)', background: 'rgba(0,255,136,0.03)' }}>
          <p className="font-mono text-[9px] tracking-[0.2em] mb-1.5" style={{ color: 'rgba(0,255,136,0.6)' }}>IKER SAYS</p>
          <p className="font-mono text-[10px] text-white/40 leading-relaxed">{data.briefing}</p>
        </div>
      )}
    </div>
  );
}
