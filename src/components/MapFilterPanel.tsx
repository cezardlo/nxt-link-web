'use client';

import { useEffect } from 'react';

export type FilterMode = 'STANDARD' | 'CRT' | 'NVG' | 'FLIR';

type ModeDef = {
  id: FilterMode;
  label: string;
  key: string;
  color: string;
  description: string;
};

const MODES: ModeDef[] = [
  { id: 'STANDARD', label: 'STD',  key: '1', color: '#ffffff', description: 'Standard'       },
  { id: 'CRT',      label: 'CRT',  key: '2', color: '#00ff88', description: 'CRT Phosphor'   },
  { id: 'NVG',      label: 'NVG',  key: '3', color: '#00d4ff', description: 'Night Vision'   },
  { id: 'FLIR',     label: 'FLIR', key: '4', color: '#f97316', description: 'Thermal / FLIR' },
];

type Props = {
  mode: FilterMode;
  onChange: (mode: FilterMode) => void;
};

export function MapFilterPanel({ mode, onChange }: Props) {
  // Keyboard shortcuts 1–4 (skip when typing in input)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const m = MODES.find((x) => x.key === e.key);
      if (m) onChange(m.id);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onChange]);

  return (
    <div
      className="absolute bottom-9 left-2 md:left-44 z-20 flex items-center gap-1 select-none px-2 py-1.5 rounded-sm"
      style={{ background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Section label */}
      <span className="font-mono text-[8px] text-white/25 tracking-[0.25em] mr-1">VIEW</span>

      {/* Mode chips */}
      {MODES.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            title={`${m.description}  [${m.key}]`}
            className="flex items-center gap-0.5 px-2.5 py-1 md:px-2 md:py-0.5 font-mono text-[9px] tracking-wider rounded-sm transition-all duration-150"
            style={{
              color:      active ? '#000'   : 'rgba(255,255,255,0.55)',
              background: active ? m.color  : 'transparent',
              border:     `1px solid ${active ? m.color : 'rgba(255,255,255,0.12)'}`,
              fontWeight: active ? 700 : 400,
            }}
          >
            {m.label}
          </button>
        );
      })}

      {/* Active mode label */}
      {mode !== 'STANDARD' && (
        <span className="ml-1 font-mono text-[8px] tracking-[0.2em]" style={{ color: MODES.find(m => m.id === mode)?.color }}>
          {mode === 'CRT'  && 'PHOSPHOR'}
          {mode === 'NVG'  && 'NV GOGGLES'}
          {mode === 'FLIR' && 'THERMAL'}
        </span>
      )}
    </div>
  );
}
