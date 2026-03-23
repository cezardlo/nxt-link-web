'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { COLORS, Z } from '@/lib/tokens';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface P0Alert {
  id: string;
  title: string;
  severity: string;
  detected_at: string;
}

export interface P0AlertBannerProps {
  signals: P0Alert[];
  onView: (signalId: string) => void;
  onDismiss: (signalId: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ─── Single Alert Card ───────────────────────────────────────────────────────

function AlertCard({
  signal,
  onView,
  onDismiss,
}: {
  signal: P0Alert;
  onView: () => void;
  onDismiss: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 10_000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isP0 = signal.severity === 'P0';

  return (
    <motion.div
      layout
      initial={{ y: -80, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -60, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        background: COLORS.card,
        border: `1px solid ${isP0 ? COLORS.red : COLORS.amber}`,
        borderRadius: 12,
        boxShadow: isP0
          ? `0 0 20px ${COLORS.red}40, 0 0 60px ${COLORS.red}18`
          : `0 0 16px ${COLORS.amber}30`,
        animation: isP0 ? 'p0-pulse 2s ease-in-out infinite' : undefined,
        maxWidth: 600,
        width: '100%',
      }}
    >
      {/* Severity badge */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: '0.05em',
          padding: '2px 8px',
          borderRadius: 6,
          background: isP0 ? COLORS.red : COLORS.amber,
          color: COLORS.bg,
          flexShrink: 0,
        }}
      >
        {signal.severity}
      </span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: COLORS.text,
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {signal.title}
        </div>
        <div style={{ color: COLORS.muted, fontSize: 11, marginTop: 2 }}>
          {timeAgo(signal.detected_at)}
        </div>
      </div>

      {/* Actions */}
      <button
        onClick={onView}
        style={{
          background: COLORS.accent,
          color: COLORS.bg,
          border: 'none',
          borderRadius: 6,
          padding: '4px 12px',
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.04em',
          flexShrink: 0,
        }}
      >
        VIEW
      </button>
      <button
        onClick={onDismiss}
        style={{
          background: 'transparent',
          color: COLORS.muted,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        DISMISS
      </button>
    </motion.div>
  );
}

// ─── P0 Alert Banner (stacked container) ─────────────────────────────────────

export default function P0AlertBanner({ signals, onView, onDismiss }: P0AlertBannerProps) {
  // Memoize callbacks to avoid re-renders
  const handleView = useCallback(
    (id: string) => () => onView(id),
    [onView],
  );
  const handleDismiss = useCallback(
    (id: string) => () => onDismiss(id),
    [onDismiss],
  );

  if (signals.length === 0) return null;

  return (
    <>
      {/* Keyframe for pulsing glow */}
      <style>{`
        @keyframes p0-pulse {
          0%, 100% { box-shadow: 0 0 20px ${COLORS.red}40, 0 0 60px ${COLORS.red}18; }
          50%       { box-shadow: 0 0 32px ${COLORS.red}70, 0 0 80px ${COLORS.red}30; }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: Z.toast + 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'center',
          pointerEvents: 'none',
          width: '100%',
          maxWidth: 640,
          padding: '0 16px',
        }}
      >
        <AnimatePresence mode="popLayout">
          {signals.map((signal) => (
            <div key={signal.id} style={{ pointerEvents: 'auto', width: '100%' }}>
              <AlertCard
                signal={signal}
                onView={handleView(signal.id)}
                onDismiss={handleDismiss(signal.id)}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
