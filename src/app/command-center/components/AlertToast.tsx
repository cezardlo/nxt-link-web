'use client';
// src/app/command-center/components/AlertToast.tsx
// Urgent alert popup — slides in from top-right when new critical signals arrive.
// Shows newest unread alert. Click to dismiss or view full detail.

import { useEffect, useState } from 'react';
import type { Alert, SignalType } from '../types/intel';

// ─── Constants ────────────────────────────────────────────────────────────────

const RED    = '#f43f5e';
const GOLD   = '#f59e0b';
const CYAN   = '#00D4FF';
const GREEN  = '#10b981';
const PURPLE = '#A855F7';

const TYPE_COLOR: Record<SignalType, string> = {
  research_paper:      CYAN,
  patent_filing:       GOLD,
  funding_round:       PURPLE,
  contract_award:      GOLD,
  merger_acquisition:  GREEN,
  product_launch:      GREEN,
  facility_expansion:  GREEN,
  regulatory_action:   RED,
  hiring_signal:       CYAN,
  case_study:          CYAN,
};

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  alerts:   Alert[];
  onDismiss: (id: string) => void;
  onView:    (alert: Alert) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AlertToast({ alerts, onDismiss, onView }: Props) {
  const unread   = alerts.filter(a => !a.read);
  const latest   = unread[0] ?? null;
  const [visible, setVisible] = useState(false);
  const [prevId,  setPrevId]  = useState<string | null>(null);

  // Slide in when a new alert arrives
  useEffect(() => {
    if (latest && latest.id !== prevId) {
      setVisible(true);
      setPrevId(latest.id);
      // Auto-dismiss after 8 seconds
      const id = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(id);
    }
  }, [latest, prevId]);

  if (!visible || !latest) return null;

  const accentColor = TYPE_COLOR[latest.type] ?? RED;

  return (
    <div style={{
      position: 'fixed',
      top: 56,
      right: 12,
      width: 300,
      background: `linear-gradient(135deg, #090e18 0%, #060a14 100%)`,
      border: `1px solid ${accentColor}40`,
      borderLeft: `2px solid ${accentColor}`,
      borderRadius: 2,
      padding: '10px 12px',
      zIndex: 100,
      boxShadow: `0 4px 28px rgba(0,0,0,0.5), 0 0 0 1px ${accentColor}14, inset 0 1px 0 rgba(255,255,255,0.04)`,
      animation: 'toast-in 0.25s ease-out',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 12 }}>⚡</span>
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 8,
          letterSpacing: '0.12em',
          color: accentColor,
          textTransform: 'uppercase',
        }}>
          {latest.type.replace(/_/g, ' ')}
        </span>
        {unread.length > 1 && (
          <span style={{
            marginLeft: 4,
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 7,
            color: 'rgba(255,255,255,0.35)',
          }}>
            +{unread.length - 1} more
          </span>
        )}
        <button
          onClick={() => { setVisible(false); onDismiss(latest.id); }}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 13, lineHeight: 1, padding: 0 }}
        >
          ✕
        </button>
      </div>

      {/* Headline */}
      <p style={{ margin: '0 0 4px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.85)', lineHeight: 1.45 }}>
        {latest.headline}
      </p>

      {/* Detail */}
      <p style={{ margin: '0 0 8px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
        {latest.detail}
      </p>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => { setVisible(false); onView(latest); }}
          style={{
            flex: 1,
            padding: '5px 0',
            background: `${accentColor}14`,
            border: `1px solid ${accentColor}40`,
            borderRadius: 2,
            cursor: 'pointer',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 8,
            color: accentColor,
            letterSpacing: '0.08em',
          }}
        >
          VIEW DETAIL
        </button>
        <button
          onClick={() => { setVisible(false); onDismiss(latest.id); }}
          style={{
            padding: '5px 10px',
            background: 'transparent',
            border: '1px solid rgba(0,212,255,0.15)',
            borderRadius: 2,
            cursor: 'pointer',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 8,
            color: 'rgba(0,212,255,0.4)',
          }}
        >
          DISMISS
        </button>
      </div>

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
