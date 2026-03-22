'use client';
// src/app/command-center/components/WatchList.tsx
// Left panel bottom half — user's personal watch list.
// Click any item → fires onSelect(query) to zoom map + update right panel.

import { useState } from 'react';
import type { WatchItem } from '../types/intel';
import { COLORS } from '@/lib/tokens';

// ─── Constants ────────────────────────────────────────────────────────────────

const CYAN  = COLORS.cyan;
const GREEN = COLORS.emerald;
const GOLD  = '#f59e0b';
const RED   = '#f43f5e';
const DIM   = 'rgba(0,212,255,0.10)';

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  items:    WatchItem[];
  onSelect: (query: string, label: string) => void;
  onAdd:    (label: string, query: string) => void;
  onRemove: (id: string) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function WatchList({ items, onSelect, onAdd, onRemove }: Props) {
  const [adding,    setAdding]    = useState(false);
  const [newLabel,  setNewLabel]  = useState('');
  const [newQuery,  setNewQuery]  = useState('');

  function submitAdd() {
    if (newLabel.trim() && newQuery.trim()) {
      onAdd(newLabel.trim(), newQuery.trim());
      setNewLabel('');
      setNewQuery('');
      setAdding(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        borderBottom: `1px solid ${DIM}`,
        borderTop: `1px solid ${DIM}`,
        background: 'rgba(4,8,18,0.8)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10 }}>◎</span>
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 8,
          letterSpacing: '0.12em',
          color: CYAN,
          textTransform: 'uppercase',
        }}>
          Watch List
        </span>
        <button
          onClick={() => setAdding(a => !a)}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: `1px solid ${DIM}`,
            borderRadius: 2,
            padding: '2px 6px',
            cursor: 'pointer',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 8,
            color: 'rgba(0,212,255,0.5)',
          }}
        >
          {adding ? '✕ cancel' : '+ add'}
        </button>
      </div>

      {/* ── Add form ───────────────────────────────────────────────────── */}
      {adding && (
        <div style={{
          padding: '8px 10px',
          borderBottom: `1px solid ${DIM}`,
          background: 'rgba(0,212,255,0.03)',
          flexShrink: 0,
        }}>
          <input
            autoFocus
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Label (e.g. Warehouse Robotics)"
            style={inputStyle}
          />
          <input
            value={newQuery}
            onChange={e => setNewQuery(e.target.value)}
            placeholder="Keywords (e.g. warehouse robot automation)"
            style={{ ...inputStyle, marginTop: 5 }}
            onKeyDown={e => e.key === 'Enter' && submitAdd()}
          />
          <button
            onClick={submitAdd}
            style={{
              marginTop: 6,
              width: '100%',
              padding: '5px 0',
              background: 'rgba(0,212,255,0.08)',
              border: `1px solid rgba(0,212,255,0.25)`,
              borderRadius: 2,
              cursor: 'pointer',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 9,
              color: CYAN,
              letterSpacing: '0.08em',
            }}
          >
            ADD TO WATCH LIST
          </button>
        </div>
      )}

      {/* ── Items ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
        {items.length === 0 && (
          <div style={{ padding: '16px 0', textAlign: 'center' }}>
            <span style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 9,
              color: 'rgba(0,212,255,0.3)',
            }}>
              No items — add something to track
            </span>
          </div>
        )}

        {items.map(item => {
          const hasSignals = item.signalCount > 0;
          const countColor = item.signalCount >= 5 ? RED
                           : item.signalCount >= 2 ? GOLD
                           : item.signalCount >= 1 ? GREEN
                           : 'rgba(0,212,255,0.25)';

          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                marginBottom: 3,
                background: hasSignals ? 'rgba(0,212,255,0.04)' : 'rgba(0,212,255,0.01)',
                border: `1px solid ${hasSignals ? 'rgba(0,212,255,0.14)' : 'rgba(0,212,255,0.06)'}`,
                borderLeft: hasSignals ? `2px solid ${countColor}` : '1px solid rgba(0,212,255,0.06)',
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
              }}
              onClick={() => onSelect(item.query, item.label)}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = 'rgba(0,212,255,0.08)';
                el.style.boxShadow = '0 0 0 1px rgba(0,212,255,0.15)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = hasSignals ? 'rgba(0,212,255,0.04)' : 'rgba(0,212,255,0.01)';
                el.style.boxShadow = 'none';
              }}
            >
              {/* Arrow indicator */}
              <span style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 10,
                color: 'rgba(0,212,255,0.3)',
                flexShrink: 0,
              }}>→</span>

              {/* Label */}
              <span style={{
                flex: 1,
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 10,
                color: 'rgba(255,255,255,0.75)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {item.label}
              </span>

              {/* Signal count badge */}
              <span style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 9,
                color: countColor,
                background: `${countColor}14`,
                border: `1px solid ${countColor}30`,
                borderRadius: 2,
                padding: '1px 5px',
                flexShrink: 0,
                minWidth: 20,
                textAlign: 'center',
              }}>
                {item.signalCount > 0 ? item.signalCount : '—'}
              </span>

              {/* Remove button */}
              <button
                onClick={e => { e.stopPropagation(); onRemove(item.id); }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0 2px',
                  color: 'rgba(255,59,48,0.3)',
                  fontSize: 11,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                title="Remove from watch list"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Shared input style ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 26,
  background: 'rgba(0,212,255,0.05)',
  border: '1px solid rgba(0,212,255,0.18)',
  borderRadius: 2,
  padding: '0 8px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: 9,
  color: '#00D4FF',
  outline: 'none',
  boxSizing: 'border-box',
};
