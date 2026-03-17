'use client';
// src/app/command-center/hooks/useAlerts.ts
// Derives Alert[] from live signals. Critical signals (importance >= 0.85)
// become alerts. Tracks read/unread state in localStorage.

import { useCallback, useEffect, useState } from 'react';
import type { Alert, IntelSignal } from '../types/intel';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY   = 'nxtlink:alerts:read';
const ALERT_THRESHOLD = 0.85;   // importance >= this → becomes an alert

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch { /* quota / private mode */ }
}

function signalToAlert(sig: IntelSignal): Alert {
  return {
    id:        `alert-${sig.id}`,
    type:      sig.type,
    headline:  sig.headline,
    detail:    `${sig.industry}${sig.company ? ` · ${sig.company}` : ''} — importance ${(sig.importance * 100).toFixed(0)}/100`,
    url:       sig.url,
    createdAt: sig.discoveredAt,
    read:      false,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type AlertsState = {
  alerts:      Alert[];
  unreadCount: number;
  markRead:    (id: string) => void;
  markAllRead: () => void;
  dismiss:     (id: string) => void;
};

export function useAlerts(signals: IntelSignal[]): AlertsState {
  const [readIds,  setReadIds]  = useState<Set<string>>(loadReadIds);
  const [alerts,   setAlerts]   = useState<Alert[]>([]);

  // Derive alerts whenever signals change
  useEffect(() => {
    const critical = signals.filter(s => s.importance >= ALERT_THRESHOLD);
    setAlerts(
      critical.map(sig => ({
        ...signalToAlert(sig),
        read: readIds.has(`alert-${sig.id}`),
      }))
    );
  }, [signals, readIds]);

  const markRead = useCallback((id: string) => {
    setReadIds(prev => {
      const next = new Set(prev).add(id);
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev);
      alerts.forEach(a => next.add(a.id));
      saveReadIds(next);
      return next;
    });
  }, [alerts]);

  const dismiss = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    markRead(id);
  }, [markRead]);

  const unreadCount = alerts.filter(a => !a.read).length;

  return { alerts, unreadCount, markRead, markAllRead, dismiss };
}
