'use client';
// src/app/command-center/hooks/useWatchList.ts
// Persists the user's personal watch list in localStorage.
// Matches watch items against live signals to show signal counts.

import { useCallback, useEffect, useState } from 'react';
import type { WatchItem, IntelSignal } from '../types/intel';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'nxtlink:watchlist';

const DEFAULT_ITEMS: WatchItem[] = [
  { id: 'w1', label: 'Warehouse Robotics',      query: 'warehouse robot',      signalCount: 0, lastUpdated: '' },
  { id: 'w2', label: 'El Paso DOD Contracts',   query: 'el paso defense dod',  signalCount: 0, lastUpdated: '' },
  { id: 'w3', label: 'UTEP Research',           query: 'utep research',         signalCount: 0, lastUpdated: '' },
  { id: 'w4', label: 'Border Automation',       query: 'border automation cbp', signalCount: 0, lastUpdated: '' },
  { id: 'w5', label: 'AI Manufacturing',        query: 'ai manufacturing',      signalCount: 0, lastUpdated: '' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function load(): WatchItem[] {
  if (typeof window === 'undefined') return DEFAULT_ITEMS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WatchItem[]) : DEFAULT_ITEMS;
  } catch {
    return DEFAULT_ITEMS;
  }
}

function save(items: WatchItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota exceeded or private mode — fail silently
  }
}

/** Count how many signals match a watch item's query keywords. */
function countMatches(query: string, signals: IntelSignal[]): number {
  const terms = query.toLowerCase().split(' ').filter(Boolean);
  return signals.filter(sig => {
    const hay = `${sig.title} ${sig.industry} ${sig.company ?? ''}`.toLowerCase();
    return terms.some(t => hay.includes(t));
  }).length;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type WatchListState = {
  items:    WatchItem[];
  add:      (label: string, query: string) => void;
  remove:   (id: string) => void;
  reorder:  (fromIndex: number, toIndex: number) => void;
};

export function useWatchList(signals: IntelSignal[]): WatchListState {
  const [items, setItems] = useState<WatchItem[]>(load);

  // Recount signal matches whenever signals refresh
  useEffect(() => {
    if (signals.length === 0) return;
    setItems(prev =>
      prev.map(item => ({
        ...item,
        signalCount: countMatches(item.query, signals),
        lastUpdated: signals.length > 0 ? new Date().toISOString() : item.lastUpdated,
      }))
    );
  }, [signals]);

  // Persist on every change
  useEffect(() => {
    save(items);
  }, [items]);

  const add = useCallback((label: string, query: string) => {
    const newItem: WatchItem = {
      id:          `w${Date.now()}`,
      label:       label.trim(),
      query:       query.trim().toLowerCase(),
      signalCount: countMatches(query, signals),
      lastUpdated: new Date().toISOString(),
    };
    setItems(prev => [...prev, newItem]);
  }, [signals]);

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    setItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  return { items, add, remove, reorder };
}
