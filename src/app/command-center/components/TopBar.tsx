'use client';
import { useEffect, useState } from 'react';
import type { Mode, IntelSignal, Alert } from '../types/intel';

const C = '#00D4FF';
const G = '#00FF88';
const GOLD = '#FFD700';
const R = '#FF3B30';
const P = '#A855F7';

const MODES: Mode[] = ['MORNING', 'WORLD', 'EL PASO', 'RESEARCH', 'CONTRACTS'];
const MODE_META: Record<Mode, { color: string; icon: string }> = {
  MORNING:   { color: GOLD, icon: '☀' },
  WORLD:     { color: C,    icon: '◎' },
  'EL PASO': { color: G,    icon: '◉' },
  RESEARCH:  { color: P,    icon: '◆' },
  CONTRACTS: { color: GOLD, icon: '⚡' },
};

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

type Props = {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  alerts: Alert[];
  signals: IntelSignal[];
  onSearch: (q: string) => void;
  onAlertClick: () => void;
};

export default function TopBar({ mode, onModeChange, alerts, signals, onSearch, onAlertClick }: Props) {
  const now = useClock();
  const [query, setQuery] = useState('');
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (document.activeElement?.tagName === 'INPUT') return;
      const i = parseInt(e.key) - 1;
      if (i >= 0 && i < MODES.length) onModeChange(MODES[i]);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onModeChange]);

  const unread = alerts.filter(a => !a.read).length;
  const critical = signals.filter(s => s.importance >= 0.9).length;
  const total = unread + critical;

  const time = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

  function doSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && query.trim()) { onSearch(query.trim()); setQuery(''); }
  }

  return (
    <div className="tb-root">
      {/* Logo */}
      <div className="tb-logo">
        <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 15, fontWeight: 700, color: C, letterSpacing: '0.08em' }}>
          NXT<span style={{ color: 'rgba(0,212,255,0.35)' }}>//</span>LINK
        </span>
      </div>

      <div className="tb-sep" />

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 1 }}>
        {MODES.map((m, i) => {
          const meta = MODE_META[m];
          const active = mode === m;
          return (
            <button
              key={m} onClick={() => onModeChange(m)}
              title={`${m} (${i + 1})`}
              className={`tb-mode ${active ? 'tb-mode-active' : ''}`}
              style={{
                '--mc': meta.color,
                borderBottom: active ? `2px solid ${meta.color}` : '2px solid transparent',
                color: active ? meta.color : 'rgba(255,255,255,0.25)',
              } as React.CSSProperties}
            >
              <span style={{ fontSize: 9, marginRight: 3 }}>{meta.icon}</span>
              {m}
            </button>
          );
        })}
      </div>

      <div className="tb-sep" />

      {/* Search */}
      <div style={{ flex: 1, maxWidth: 400, position: 'relative', margin: '0 12px' }}>
        <input
          value={query} onChange={e => setQuery(e.target.value)} onKeyDown={doSearch}
          placeholder="Search industry, company, technology…"
          className="tb-search"
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* Signal count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 16 }}>
        <span style={{ fontSize: 9, color: G }}>{signals.length}</span>
        <span style={{ fontSize: 7, color: 'rgba(0,255,136,0.4)', letterSpacing: '0.1em' }}>SIGNALS</span>
      </div>

      <div className="tb-sep" />

      {/* Clock */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: 12 }}>
        <span style={{ fontSize: 14, color: G, letterSpacing: '0.03em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
          {time}
        </span>
        <span style={{ fontSize: 7, color: 'rgba(0,212,255,0.35)', letterSpacing: '0.12em' }}>{date}</span>
      </div>

      <div className="tb-sep" />

      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '0 10px' }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: online ? G : R,
          boxShadow: `0 0 8px ${online ? G : R}88`,
          animation: 'pulse 2.5s ease-in-out infinite',
        }} />
        <span style={{ fontSize: 7, letterSpacing: '0.12em', color: online ? `${G}99` : `${R}99` }}>
          {online ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      <div className="tb-sep" />

      {/* Alerts */}
      <button onClick={onAlertClick} className="tb-alert" style={{
        background: total > 0 ? 'rgba(255,59,48,0.08)' : 'transparent',
        borderColor: total > 0 ? 'rgba(255,59,48,0.25)' : 'rgba(0,212,255,0.08)',
      }}>
        <span style={{ fontSize: 11 }}>{total > 0 ? '⚡' : '◌'}</span>
        {total > 0
          ? <span style={{ fontSize: 11, fontWeight: 700, color: R }}>{total}</span>
          : <span style={{ fontSize: 7, color: 'rgba(0,212,255,0.3)', letterSpacing: '0.1em' }}>CLEAR</span>
        }
      </button>

      <style>{`
        .tb-root {
          height: 44px; display: flex; align-items: center;
          padding: 0 10px; flex-shrink: 0;
          background: rgba(5,5,12,0.98);
          border-bottom: 1px solid rgba(0,212,255,0.06);
          position: relative; z-index: 50;
          font-family: 'IBM Plex Mono', monospace;
        }
        .tb-root::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,212,255,0.12), transparent);
        }
        .tb-sep { width: 1px; height: 18px; background: rgba(0,212,255,0.08); flex-shrink: 0; margin: 0 8px; }
        .tb-logo { margin-right: 8px; flex-shrink: 0; }
        .tb-mode {
          height: 44px; padding: 0 10px; background: none; border: none;
          cursor: pointer; font-family: 'IBM Plex Mono', monospace;
          font-size: 8px; letter-spacing: 0.1em;
          transition: all 0.15s;
        }
        .tb-mode:hover { color: rgba(255,255,255,0.6) !important; }
        .tb-mode-active { background: rgba(0,212,255,0.03); }
        .tb-search {
          width: 100%; height: 28px;
          background: rgba(0,212,255,0.03);
          border: 1px solid rgba(0,212,255,0.08);
          border-radius: 2px; padding: 0 10px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px; color: ${C}; outline: none;
          transition: border-color 0.15s;
        }
        .tb-search:focus { border-color: rgba(0,212,255,0.3); background: rgba(0,212,255,0.05); }
        .tb-search::placeholder { color: rgba(0,212,255,0.2); }
        .tb-alert {
          display: flex; align-items: center; gap: 5;
          padding: 4px 10px; border: 1px solid; border-radius: 2px;
          cursor: pointer; font-family: 'IBM Plex Mono', monospace;
          background: transparent; transition: all 0.15s;
        }
        @keyframes pulse {
          0%,100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
