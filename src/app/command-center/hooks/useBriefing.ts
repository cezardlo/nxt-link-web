'use client';
// src/app/command-center/hooks/useBriefing.ts
// Fetches and normalizes the morning intelligence brief.
// Source: /api/intelligence/daily-brief
// Outputs: BriefItem[] (max 5), crossCuttingThemes[], lastUpdated

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BriefItem, BriefPriority, DailyBriefResponse } from '../types/intel';

// ─── Constants ────────────────────────────────────────────────────────────────

const REFRESH_MS = 15 * 60 * 1000; // 15 minutes — matches server cache TTL
const MAX_ITEMS  = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map API priority tier → BriefPriority badge. */
function toBriefPriority(p: 'critical' | 'high' | 'standard'): BriefPriority {
  if (p === 'critical') return 'URGENT';
  if (p === 'high')     return 'WATCH';
  return 'OPPORTUNITY';
}

/** Score 0–100 El Paso relevance from section title + summary text. */
const EP_TERMS = ['el paso', 'border', 'juarez', 'west texas', 'logistics',
                  'manufacturing', 'supply chain', 'fort bliss', 'utep', 'cbp'];

function epRelevance(text: string): number {
  const lower = text.toLowerCase();
  const hits  = EP_TERMS.filter(t => lower.includes(t)).length;
  return Math.min(100, hits * 30);
}

/** Convert a DailyBriefResponse section into a BriefItem. */
function toItem(
  section: DailyBriefResponse['sections'][number],
  index:   number,
): BriefItem {
  const headline = section.keyDevelopments[0] ?? section.title;
  const context  = section.summary.slice(0, 180);

  return {
    id:              `brief-${index}`,
    priority:        toBriefPriority(section.priority),
    headline,
    context,
    sourceUrl:       '',        // API does not provide source URLs per section
    sourceName:      section.title,
    elPasoRelevance: epRelevance(section.title + ' ' + section.summary),
    industry:        section.title,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type BriefingState = {
  items:               BriefItem[];
  executiveSummary:    string;
  crossCuttingThemes:  string[];
  watchKeywords:       string[];
  totalSignals:        number;
  loading:             boolean;
  error:               string | null;
  generatedAt:         string | null;
  refresh:             () => void;
};

export function useBriefing(): BriefingState {
  const [items,              setItems]              = useState<BriefItem[]>([]);
  const [executiveSummary,   setExecutiveSummary]   = useState('');
  const [crossCuttingThemes, setCrossCuttingThemes] = useState<string[]>([]);
  const [watchKeywords,      setWatchKeywords]      = useState<string[]>([]);
  const [totalSignals,       setTotalSignals]       = useState(0);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState<string | null>(null);
  const [generatedAt,        setGeneratedAt]        = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch_ = useCallback(async () => {
    setError(null);
    try {
      const res  = await fetch('/api/intelligence/daily-brief');
      const json = await res.json() as { ok?: boolean; data?: DailyBriefResponse } & DailyBriefResponse;

      // Unwrap nested data if present
      const brief: DailyBriefResponse = json.data ?? json;

      if (brief.sections?.length) {
        // Sort: critical first, then high, then standard
        const sorted = [...brief.sections].sort((a, b) => {
          const order = { critical: 0, high: 1, standard: 2 };
          return order[a.priority] - order[b.priority];
        });

        setItems(sorted.slice(0, MAX_ITEMS).map(toItem));
      }

      setExecutiveSummary(brief.executiveSummary ?? '');
      setCrossCuttingThemes(brief.crossCuttingThemes ?? []);
      setWatchKeywords(brief.watchList ?? []);
      setTotalSignals(brief.totalSignalsProcessed ?? 0);
      setGeneratedAt(brief.generatedAt ?? new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load briefing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    timerRef.current = setInterval(fetch_, REFRESH_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetch_]);

  return {
    items,
    executiveSummary,
    crossCuttingThemes,
    watchKeywords,
    totalSignals,
    loading,
    error,
    generatedAt,
    refresh: fetch_,
  };
}
