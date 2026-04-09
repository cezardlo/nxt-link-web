'use client';

import { SignalCard, type SignalCardData } from './SignalCard';

// ── Types ─────────────────────────────────────────────────────────────────────

type ObserverIntelPanelProps = {
  sector: string;
  signals: SignalCardData[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECTOR_LABELS: Record<string, string> = {
  'ai-ml': 'AI / ML',
  'defense': 'Defense',
  'border-tech': 'Border Tech',
  'cybersecurity': 'Cybersecurity',
  'logistics': 'Logistics',
  'manufacturing': 'Manufacturing',
  'robotics': 'Robotics',
  'energy': 'Energy',
  'space': 'Space',
  'finance': 'Finance',
};

function getMomentum(signals: SignalCardData[]) {
  const counts = { rising: 0, falling: 0, emerging: 0, disrupting: 0, stable: 0 };
  for (const s of signals) {
    const d = (s.direction as keyof typeof counts) ?? 'stable';
    if (d in counts) counts[d]++;
    else counts.stable++;
  }
  const total = signals.length || 1;
  return {
    counts,
    pct: {
      rising:     Math.round((counts.rising     / total) * 100),
      falling:    Math.round((counts.falling    / total) * 100),
      emerging:   Math.round((counts.emerging   / total) * 100),
      disrupting: Math.round((counts.disrupting / total) * 100),
      stable:     Math.round((counts.stable     / total) * 100),
    },
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ObserverIntelPanel({ sector, signals }: ObserverIntelPanelProps) {
  const sectorLabel = SECTOR_LABELS[sector] ?? sector;
  const { counts, pct } = getMomentum(signals);

  // Top 3 by importance
  const top3 = [...signals]
    .sort((a, b) => ((b.importance_score ?? b.importance ?? 0) - (a.importance_score ?? a.importance ?? 0)))
    .slice(0, 3);

  // EP relevant signals
  const epSignals = [...signals]
    .filter(s => (s.el_paso_score ?? 0) >= 25)
    .sort((a, b) => ((b.el_paso_score ?? 0) - (a.el_paso_score ?? 0)))
    .slice(0, 3);

  // Watch list — top 3 by importance for bullet points
  const watchList = [...signals]
    .sort((a, b) => ((b.importance_score ?? b.importance ?? 0) - (a.importance_score ?? a.importance ?? 0)))
    .slice(0, 4);

  if (signals.length === 0) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-8">
        <div className="text-xs font-bold text-cyan-400 tracking-widest uppercase mb-3">
          OBSERVER — {sectorLabel}
        </div>
        <p className="text-gray-500 text-sm">No signals yet for this sector. Monitoring sources...</p>
      </div>
    );
  }

  const hasMomentum = counts.rising + counts.emerging + counts.disrupting + counts.falling > 0;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-cyan-400 tracking-widest uppercase">
            OBSERVER — {sectorLabel}
          </div>
          <div className="text-[11px] text-gray-600 mt-0.5">
            {signals.length} signals analyzed · {counts.rising} rising · {counts.emerging} emerging
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-3 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-bold text-cyan-400 tracking-widest">LIVE</span>
        </div>
      </div>

      {/* Section A — Momentum Bar */}
      {hasMomentum && (
        <div>
          <div className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-2">
            SECTOR MOMENTUM
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-gray-800 gap-px">
            {pct.rising > 0 && (
              <div className="bg-emerald-500 transition-all" style={{ width: `${pct.rising}%` }} title={`Rising: ${pct.rising}%`} />
            )}
            {pct.disrupting > 0 && (
              <div className="bg-orange-400 transition-all" style={{ width: `${pct.disrupting}%` }} title={`Disrupting: ${pct.disrupting}%`} />
            )}
            {pct.emerging > 0 && (
              <div className="bg-cyan-400 transition-all" style={{ width: `${pct.emerging}%` }} title={`Emerging: ${pct.emerging}%`} />
            )}
            {pct.falling > 0 && (
              <div className="bg-red-500 transition-all" style={{ width: `${pct.falling}%` }} title={`Falling: ${pct.falling}%`} />
            )}
            {pct.stable > 0 && (
              <div className="bg-gray-700 transition-all" style={{ width: `${pct.stable}%` }} title={`Stable: ${pct.stable}%`} />
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            {counts.rising > 0 && <span className="text-[10px] text-emerald-400">↑ {counts.rising} rising</span>}
            {counts.emerging > 0 && <span className="text-[10px] text-cyan-400">◆ {counts.emerging} emerging</span>}
            {counts.disrupting > 0 && <span className="text-[10px] text-orange-400">⚡ {counts.disrupting} disrupting</span>}
            {counts.falling > 0 && <span className="text-[10px] text-red-400">↓ {counts.falling} falling</span>}
            <span className="text-[10px] text-gray-600">→ {counts.stable} stable</span>
          </div>
        </div>
      )}

      {/* Section B — Top 3 Signals */}
      <div>
        <div className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-3">
          TOP SIGNALS
        </div>
        <div className="space-y-2">
          {top3.map((s, i) => (
            <SignalCard key={s.id ?? i} {...s} compact />
          ))}
        </div>
      </div>

      {/* Section C — El Paso Connection */}
      <div>
        <div className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-3">
          EL PASO CONNECTION
        </div>
        {epSignals.length === 0 ? (
          <p className="text-[12px] text-gray-600 italic">
            No direct El Paso signals in this sector yet. Monitoring for connections...
          </p>
        ) : (
          <div className="space-y-2.5">
            {epSignals.map((s, i) => (
              <div key={s.id ?? i} className="flex gap-2.5 items-start">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                  (s.el_paso_score ?? 0) >= 60
                    ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                    : 'bg-cyan-500/10 text-cyan-400'
                }`}>
                  {(s.el_paso_score ?? 0) >= 60 ? 'EP DIRECT' : 'EP RELEVANT'}
                </span>
                <div className="min-w-0">
                  <a href={s.url ?? '#'} target="_blank" rel="noopener noreferrer"
                    className="text-[12px] text-gray-300 hover:text-white transition-colors line-clamp-1 font-medium">
                    {s.title}
                  </a>
                  {s.el_paso_angle && (
                    <p className="text-[10px] text-gray-600 mt-0.5 line-clamp-1">{s.el_paso_angle}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section D — What to Watch */}
      {watchList.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-2">
            WHAT TO WATCH
          </div>
          <ul className="space-y-1.5">
            {watchList.map((s, i) => {
              const prefix = s.company ?? s.industry ?? 'Signal';
              const snippet = s.title.split(' ').slice(0, 9).join(' ');
              return (
                <li key={s.id ?? i} className="flex gap-2 text-[12px]">
                  <span className="text-cyan-600 shrink-0">•</span>
                  <span className="text-gray-400">
                    <span className="text-gray-300 font-medium">{prefix}</span>
                    {' — '}
                    {snippet}
                    {s.title.split(' ').length > 9 ? '...' : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
