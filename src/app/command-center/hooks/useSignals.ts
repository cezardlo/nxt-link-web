'use client';
// src/app/command-center/hooks/useSignals.ts
// Fetches and normalizes live intelligence signals.
// Sources: /api/intel-signals + /api/what-changed
// Outputs: IntelSignal[], SectorScore[], loading state

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  IntelSignal,
  IntelSignalsResponse,
  SectorScore,
  SignalType,
  SignalPriority,
  WhatChangedResponse,
} from '../types/intel';

// ─── Constants ────────────────────────────────────────────────────────────────

const REFRESH_MS = 5 * 60 * 1000; // 5 minutes

// El Paso bounding box for coordinate scatter
const EP_LNG  = -106.485;
const EP_LAT  =  31.762;

// Signal type color mapping (used by map layer — exported for reuse)
export const SIGNAL_COLORS: Record<SignalType, [number, number, number]> = {
  vendor_mention:  [0,   212, 255],   // cyan
  contract_alert:  [255, 215,   0],   // gold
  velocity_spike:  [0,   255, 136],   // green
  convergence:     [168,  85, 247],   // purple
  sector_spike:    [255,  59,  48],   // red
  security_impact: [255,  59,  48],   // red
};

// El Paso relevance keywords — signals mentioning these score higher
const EP_KEYWORDS = [
  'el paso', 'juarez', 'border', 'utep', 'fort bliss',
  'west texas', 'chihuahua', 'dona ana', 'santa teresa',
  'sunland park', 'cbp', 'customs', 'bwc',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Deterministic lat/lng scatter around El Paso.
 * Same index always produces the same coordinates — no jitter on re-render.
 * Uses golden-angle spiral so dots spread evenly rather than clumping.
 */
export function signalToCoord(index: number): [number, number] {
  const angle  = (index * 137.508) % 360;                      // golden angle
  const radius = 0.025 + (index % 9) * 0.022;                  // 0.025–0.22 degrees (~2–20 km)
  const lng    = EP_LNG + radius * Math.cos((angle * Math.PI) / 180);
  const lat    = EP_LAT + radius * Math.sin((angle * Math.PI) / 180);
  return [parseFloat(lng.toFixed(5)), parseFloat(lat.toFixed(5))];
}

/** Score 0–100 for how relevant a signal is to El Paso. */
function elPasoRelevance(text: string): number {
  const lower = text.toLowerCase();
  const hits  = EP_KEYWORDS.filter(kw => lower.includes(kw)).length;
  return Math.min(100, hits * 35);
}

/** Map raw signal_type string → typed SignalType (with safe fallback). */
function toSignalType(raw: string): SignalType {
  const valid: SignalType[] = [
    'vendor_mention', 'contract_alert', 'velocity_spike',
    'convergence', 'sector_spike', 'security_impact',
  ];
  return valid.includes(raw as SignalType) ? (raw as SignalType) : 'velocity_spike';
}

/** Map importance number → SignalPriority tier. */
function toPriority(importance: number): SignalPriority {
  if (importance >= 0.85) return 'critical';
  if (importance >= 0.65) return 'high';
  if (importance >= 0.40) return 'medium';
  return 'low';
}

/** Normalize a raw signal from either API into a clean IntelSignal. */
function normalizeSignal(
  raw: {
    title?: string;
    signal_type?: string;
    industry?: string;
    company?: string | null;
    importance?: number;
    importance_score?: number;
    discovered_at?: string;
    url?: string;
  },
  index: number,
): IntelSignal {
  const importance = raw.importance ?? raw.importance_score ?? 0.5;
  const title      = raw.title ?? 'Untitled Signal';
  const type       = toSignalType(raw.signal_type ?? '');

  return {
    id:              `sig-${index}-${Date.now()}`,
    type,
    priority:        toPriority(importance),
    title,
    headline:        title,
    industry:        raw.industry ?? 'General',
    company:         raw.company ?? undefined,
    importance,
    discoveredAt:    raw.discovered_at ?? new Date().toISOString(),
    source:          'intel-signals',
    url:             raw.url ?? '',
    coordinates:     signalToCoord(index),
    elPasoRelevance: elPasoRelevance(title + ' ' + (raw.industry ?? '')),
  };
}

/** Derive SectorScore[] from by_industry or sectorScores map. */
function toSectorScores(raw: Record<string, number>): SectorScore[] {
  return Object.entries(raw)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12)
    .map(([industry, score]) => ({
      industry,
      score:       Math.round(score),
      trend:       score > 60 ? 'rising' : score < 30 ? 'falling' : 'stable',
      signalCount: Math.round(score / 5), // rough estimate
    } satisfies SectorScore));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type SignalsState = {
  signals:      IntelSignal[];
  sectors:      SectorScore[];
  signalsToday: number;
  signalsWeek:  number;
  loading:      boolean;
  error:        string | null;
  lastUpdated:  Date | null;
  refresh:      () => void;
};

export function useSignals(): SignalsState {
  const [signals,      setSignals]      = useState<IntelSignal[]>([]);
  const [sectors,      setSectors]      = useState<SectorScore[]>([]);
  const [signalsToday, setSignalsToday] = useState(0);
  const [signalsWeek,  setSignalsWeek]  = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [lastUpdated,  setLastUpdated]  = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch_ = useCallback(async () => {
    setError(null);
    try {
      const [signalRes, changedRes] = await Promise.allSettled([
        fetch('/api/intel-signals').then(r => r.json()),
        fetch('/api/what-changed').then(r => r.json()),
      ]);

      // ── Intel signals ────────────────────────────────────────────────────
      if (signalRes.status === 'fulfilled') {
        const data = signalRes.value as { ok?: boolean; data?: IntelSignalsResponse } & IntelSignalsResponse;

        // Unwrap nested data if present (some routes wrap in { ok, data })
        const payload: IntelSignalsResponse = data.data ?? data;

        // Raw signals array (supabase path uses 'signals', memory path also 'signals')
        const rawSignals = payload.signals ?? [];
        setSignals(rawSignals.map((s, i) => normalizeSignal(s, i)));

        // Sector scores — handle both response shapes
        const scoreMap = payload.sectorScores ?? payload.by_industry;
        if (scoreMap && Object.keys(scoreMap).length > 0) {
          setSectors(toSectorScores(scoreMap));
        }
      }

      // ── What changed ─────────────────────────────────────────────────────
      if (changedRes.status === 'fulfilled') {
        const body = changedRes.value as { ok?: boolean; data?: WhatChangedResponse } & WhatChangedResponse;
        const payload: WhatChangedResponse = body.data ?? body;

        setSignalsToday(payload.signals_today ?? 0);
        setSignalsWeek(payload.signals_week   ?? 0);

        // If intel-signals returned nothing, fall back to what-changed top_signals
        if (signals.length === 0 && payload.top_signals?.length) {
          setSignals(payload.top_signals.map((s, i) => normalizeSignal(s, i)));
        }
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch signals');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch_();
    timerRef.current = setInterval(fetch_, REFRESH_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetch_]);

  return {
    signals,
    sectors,
    signalsToday,
    signalsWeek,
    loading,
    error,
    lastUpdated,
    refresh: fetch_,
  };
}
