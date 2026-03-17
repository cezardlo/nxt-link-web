'use client';
// src/app/command-center/components/TopBar.tsx
// Always-visible top bar: logo · mode switcher · search · clock · alerts · status

import { useEffect, useState } from 'react';
import type { Mode, IntelSignal, Alert } from '../types/intel';

// ─── Constants ────────────────────────────────────────────────────────────────

const CYAN    = '#00D4FF';
const GREEN   = '#00FF88';
const GOLD    = '#FFD700';
const RED     = '#FF3B30';
const PURPLE  = '#A855F7';

const MODES: Mode[] = ['MORNING', 'WORLD', 'EL PASO', 'RESEARCH', 'CONTRACTS'];

const MODE_META: Record<Mode, { label: string; color: string; shortcut: string }> = {
  MORNING:   { label: 'MORNING',   color: GOLD,   shortcut: '1' },
  WORLD:     { label: 'WORLD',     color: CYAN,   shortcut: '2' },
  'EL PASO': { label: 'EL PASO',  color: GREEN,  shortcut: '3' },
  RESEARCH:  { label: 'RESEARCH',  color: PURPLE, shortcut: '4' },
  CONTRACTS: { label: 'CONTRACTS', color: GOLD,   shortcut: '5' },
};

// ─── Live clock ───────────────────────────────────────────────────────────────

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ─── Connection status ────────────────────────────────────────────────────────

function useConnectionStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const up   = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online',  up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  alerts: Alert[];
  signals: IntelSignal[];
  onSearch: (query: string) => void;
  onAlertClick: () => void;
};

// ─── TopBar ───────────────────────────────────────────────────────────────────

export default function TopBar({
  mode,
  onModeChange,
  alerts,
  signals,
  onSearch,
  onAlertClick,
}: Props) {
  const now        = useClock();
  const online     = useConnectionStatus();
  const [query, setQuery] = useState('');
  const [alertOpen, setAlertOpen] = useState(false);

  const unreadCount  = alerts.filter(a => !a.read).length;
  const criticalCount = signals.filter(s => s.importance >= 0.9).length;
  const totalAlerts  = unreadCount + criticalCount;

  const timeStr = now.toLocaleTimeString('en-US', {
    hour12: true,
    hour:   '2-digit',
    minute: '2-digit',
  });
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
  }).toUpperCase();

  function handleSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && query.trim()) {
      onSearch(query.trim());
      setQuery('');
    }
  }

  // Keyboard shortcuts: 1–5 switch mode
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Only fire if no input is focused
      if (document.activeElement?.tagName === 'INPUT') return;
      const index = parseInt(e.key) - 1;
      if (index >= 0 && index < MODES.length) {
        onModeChange(MODES[index]);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onModeChange]);

  return (
    <div style={{
      height: 48,
      background: 'rgba(0,0,0,0.90)',
      borderBottom: '1px solid rgba(0,212,255,0.14)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      gap: 0,
      flexShrink: 0,
      position: 'relative',
      zIndex: 50,
    }}>

      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginRight: 16, flexShrink: 0 }}>
        <span style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: 14,
          fontWeight: 700,
          color: CYAN,
          letterSpacing: '0.06em',
        }}>
          NXT//LINK
        </span>
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 7,
          color: 'rgba(0,212,255,0.35)',
          letterSpacing: '0.14em',
        }}>
          CMD
        </span>
      </div>

      <Divider />

      {/* ── Mode switcher ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 2, marginRight: 16, flexShrink: 0 }}>
        {MODES.map(m => {
          const meta    = MODE_META[m];
          const active  = mode === m;
          return (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              title={`Switch to ${m} mode (press ${meta.shortcut})`}
              style={{
                height: 26,
                padding: '0 10px',
                background: active ? `${meta.color}18` : 'transparent',
                border: active
                  ? `1px solid ${meta.color}55`
                  : '1px solid transparent',
                borderRadius: 2,
                cursor: 'pointer',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 8,
                letterSpacing: '0.1em',
                color: active ? meta.color : 'rgba(255,255,255,0.28)',
                transition: 'all 0.15s ease',
                boxShadow: active ? `0 0 8px ${meta.color}22` : 'none',
              }}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      <Divider />

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, maxWidth: 360, position: 'relative', margin: '0 16px' }}>
        <span style={{
          position: 'absolute',
          left: 9,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'rgba(0,212,255,0.35)',
          fontSize: 13,
          pointerEvents: 'none',
          lineHeight: 1,
        }}>
          ⌕
        </span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleSearch}
          placeholder="Search any industry, company, or technology…"
          style={{
            width: '100%',
            height: 28,
            background: 'rgba(0,212,255,0.05)',
            border: '1px solid rgba(0,212,255,0.16)',
            borderRadius: 2,
            paddingLeft: 28,
            paddingRight: 10,
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: CYAN,
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e  => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.45)'; }}
          onBlur={e   => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.16)'; }}
        />
      </div>

      {/* ── Spacer ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── Clock ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: 16, flexShrink: 0 }}>
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 13,
          color: GREEN,
          letterSpacing: '0.04em',
          lineHeight: 1.2,
        }}>
          {timeStr}
        </span>
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 7,
          color: 'rgba(0,212,255,0.4)',
          letterSpacing: '0.1em',
        }}>
          {dateStr}
        </span>
      </div>

      <Divider />

      {/* ── Connection status ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        marginLeft: 12,
        marginRight: 12,
        flexShrink: 0,
      }}>
        <span style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: online ? GREEN : RED,
          boxShadow: `0 0 6px ${online ? GREEN : RED}99`,
          display: 'inline-block',
          animation: online ? 'status-pulse 2.5s ease-in-out infinite' : 'none',
        }} />
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 7,
          letterSpacing: '0.1em',
          color: online ? 'rgba(0,255,136,0.6)' : 'rgba(255,59,48,0.7)',
        }}>
          {online ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      <Divider />

      {/* ── Alert bell ────────────────────────────────────────────────────── */}
      <button
        onClick={() => { setAlertOpen(o => !o); onAlertClick(); }}
        style={{
          position: 'relative',
          marginLeft: 12,
          background: totalAlerts > 0 ? 'rgba(255,59,48,0.08)' : 'transparent',
          border: totalAlerts > 0
            ? '1px solid rgba(255,59,48,0.3)'
            : '1px solid rgba(0,212,255,0.12)',
          borderRadius: 2,
          padding: '4px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.15s',
        }}
        title="View alerts"
      >
        <span style={{ fontSize: 12, lineHeight: 1 }}>
          {totalAlerts > 0 ? '⚡' : '🔔'}
        </span>
        {totalAlerts > 0 && (
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            fontWeight: 700,
            color: RED,
            letterSpacing: '0.04em',
          }}>
            {totalAlerts}
          </span>
        )}
        {totalAlerts === 0 && (
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 8,
            color: 'rgba(0,212,255,0.35)',
            letterSpacing: '0.08em',
          }}>
            ALL CLEAR
          </span>
        )}
      </button>

      {/* ── CSS animations ────────────────────────────────────────────────── */}
      <style>{`
        @keyframes status-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div style={{
      width: 1,
      height: 20,
      background: 'rgba(0,212,255,0.1)',
      flexShrink: 0,
    }} />
  );
}
