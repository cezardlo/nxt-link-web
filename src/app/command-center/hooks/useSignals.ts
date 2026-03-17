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
  research_paper:      [0,   212, 255],   // cyan — discoveries
  patent_filing:       [255, 215,   0],   // gold — IP
  funding_round:       [168,  85, 247],   // purple — investment
  contract_award:      [255, 215,   0],   // gold — government
  merger_acquisition:  [0,   255, 136],   // green — growth
  product_launch:      [0,   255, 136],   // green — companies
  facility_expansion:  [0,   255, 136],   // green — growth
  regulatory_action:   [255,  59,  48],   // red — risk
  hiring_signal:       [0,   212, 255],   // cyan
  case_study:          [0,   212, 255],   // cyan
};

// El Paso relevance keywords — signals mentioning these score higher
const EP_KEYWORDS = [
  'el paso', 'juarez', 'border', 'utep', 'fort bliss',
  'west texas', 'chihuahua', 'dona ana', 'santa teresa',
  'sunland park', 'cbp', 'customs', 'bwc',
];

// ─── Global city coordinates for company HQs + industry hubs ────────────────

const COMPANY_COORDS: Record<string, [number, number]> = {
  'google':      [-122.084, 37.422],   'alphabet':    [-122.084, 37.422],
  'apple':       [-122.009, 37.335],   'microsoft':   [-122.126, 47.640],
  'amazon':      [-122.339, 47.616],   'meta':        [-122.149, 37.485],
  'nvidia':      [-121.977, 37.370],   'tesla':       [-97.751, 30.228],
  'openai':      [-122.399, 37.776],   'spacex':      [-118.343, 33.921],
  'lockheed':    [-77.449, 38.888],    'raytheon':    [-71.268, 42.363],
  'boeing':      [-87.636, 41.879],    'northrop':    [-118.369, 34.201],
  'palantir':    [-104.993, 39.740],   'anduril':     [-117.824, 33.685],
  'cloudflare':  [-122.399, 37.776],   'crowdstrike': [-78.786, 35.841],
  'samsung':     [127.060, 37.514],    'tsmc':        [120.981, 24.787],
  'arm':         [-1.258, 52.254],     'asml':        [5.482, 51.441],
  'intel':       [-121.960, 37.388],   'amd':         [-121.987, 37.376],
  'wiz':         [-73.985, 40.748],    'databricks':  [-122.399, 37.776],
};

// Industry hub fallback — if no company match, place near an industry center
const INDUSTRY_HUBS: Record<string, [number, number]> = {
  'cybersecurity':      [-77.037, 38.907],    // DC
  'defense':            [-77.037, 38.907],    // DC
  'ai':                 [-122.399, 37.776],   // SF
  'semiconductor':      [-121.960, 37.388],   // Santa Clara
  'energy':             [-95.370, 29.760],    // Houston
  'biotech':            [-71.059, 42.360],    // Boston
  'fintech':            [-73.985, 40.748],    // NYC
  'logistics':          [-90.049, 35.149],    // Memphis
  'manufacturing':      [-83.046, 42.332],    // Detroit
  'aerospace':          [-118.243, 34.052],   // LA
  'agriculture':        [-93.621, 41.588],    // Des Moines
  'healthcare':         [-86.158, 39.769],    // Indianapolis
  'general':            [-98.500, 39.500],    // US center
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Score 0–100 for how relevant a signal is to El Paso. */
function elPasoRelevance(text: string): number {
  const lower = text.toLowerCase();
  const hits  = EP_KEYWORDS.filter(kw => lower.includes(kw)).length;
  return Math.min(100, hits * 35);
}

/**
 * Determine signal coordinates:
 * 1. If El Paso relevant → scatter around El Paso
 * 2. If known company → place at company HQ
 * 3. If known industry → place at industry hub
 * 4. Fallback → scatter globally across US
 */
export function signalToCoord(
  index: number,
  company?: string,
  industry?: string,
  epRelevance?: number,
): [number, number] {
  // Golden-angle scatter function
  const scatter = (baseLng: number, baseLat: number, spread: number): [number, number] => {
    const angle  = (index * 137.508) % 360;
    const radius = spread * 0.3 + (index % 7) * spread * 0.1;
    const lng    = baseLng + radius * Math.cos((angle * Math.PI) / 180);
    const lat    = baseLat + radius * Math.sin((angle * Math.PI) / 180);
    return [parseFloat(lng.toFixed(4)), parseFloat(lat.toFixed(4))];
  };

  // 1. El Paso relevant → cluster in El Paso
  if (epRelevance && epRelevance > 0) {
    return scatter(EP_LNG, EP_LAT, 0.08);
  }

  // 2. Known company → near HQ
  if (company) {
    const key = company.toLowerCase();
    for (const [name, coords] of Object.entries(COMPANY_COORDS)) {
      if (key.includes(name) || name.includes(key)) {
        return scatter(coords[0], coords[1], 0.15);
      }
    }
  }

  // 3. Known industry → near hub
  if (industry) {
    const key = industry.toLowerCase();
    for (const [name, coords] of Object.entries(INDUSTRY_HUBS)) {
      if (key.includes(name) || name.includes(key)) {
        return scatter(coords[0], coords[1], 0.4);
      }
    }
  }

  // 4. Fallback — scatter across the US
  return scatter(-98.5, 39.5, 8);
}

/** Map raw signal_type string → typed SignalType (with safe fallback). */
function toSignalType(raw: string): SignalType {
  const valid: SignalType[] = [
    'merger_acquisition', 'funding_round', 'contract_award',
    'research_paper', 'patent_filing', 'facility_expansion',
    'regulatory_action', 'product_launch', 'hiring_signal', 'case_study',
  ];
  return valid.includes(raw as SignalType) ? (raw as SignalType) : 'research_paper';
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

  const epScore = elPasoRelevance(title + ' ' + (raw.industry ?? '') + ' ' + (raw.company ?? ''));

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
    coordinates:     signalToCoord(index, raw.company ?? undefined, raw.industry ?? undefined, epScore),
    elPasoRelevance: epScore,
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
      let gotSignals = false;
      if (signalRes.status === 'fulfilled') {
        const data = signalRes.value as { ok?: boolean; data?: IntelSignalsResponse } & IntelSignalsResponse;

        // Unwrap nested data if present (some routes wrap in { ok, data })
        const payload: IntelSignalsResponse = data.data ?? data;

        // Raw signals array
        const rawSignals = payload.signals ?? [];
        if (rawSignals.length > 0) {
          // Deduplicate by title similarity (first 60 chars)
          const seen = new Set<string>();
          const unique = rawSignals.filter(s => {
            const key = (s.title ?? '').slice(0, 60).toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setSignals(unique.map((s, i) => normalizeSignal(s, i)));
          gotSignals = true;
        }

        // Sector scores — handle both response shapes
        const scoreMap = payload.sectorScores ?? payload.by_industry;
        if (scoreMap && Object.keys(scoreMap).length > 0) {
          setSectors(toSectorScores(scoreMap));
        }
      }

      // ── What changed ─────────────────────────────────────────────────────
      if (changedRes.status === 'fulfilled') {
        // signals_today/week/top_signals are at TOP level, not inside data
        const body = changedRes.value as Record<string, unknown>;

        setSignalsToday(typeof body.signals_today === 'number' ? body.signals_today : 0);
        setSignalsWeek(typeof body.signals_week === 'number' ? body.signals_week : 0);

        // Only use what-changed as fallback if intel-signals returned nothing
        if (!gotSignals) {
          const topSigs = body.top_signals as Array<Record<string, unknown>> | undefined;
          if (topSigs?.length) {
            setSignals(topSigs.map((s, i) => normalizeSignal(s as Parameters<typeof normalizeSignal>[0], i)));
          }
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
