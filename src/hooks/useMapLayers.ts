'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// TimeRange is in HOURS: 1=1H, 24=24H, 168=7D, 720=30D, 2160=90D, 4320=180D
export type TimeRange = 1 | 24 | 168 | 720 | 2160 | 4320;
export type Mode = 'operator' | 'executive';

export interface LayerState {
  // Global intelligence layers
  globalHubs: boolean;
  conferences: boolean;
  // Vendor layers
  vendors: boolean;
  samBusinesses: boolean;
  products: boolean;
  funding: boolean;
  patents: boolean;
  hiring: boolean;
  news: boolean;
  ikerScores: boolean;
  ikerRisk: boolean;
  momentum: boolean;
  adoption: boolean;
  // Global tech country layer
  globalTech: boolean;
  // Global intel signals layer
  intelSignals: boolean;
  // Live real-time data layers
  flights:     boolean;
  military:    boolean;
  seismic:     boolean;
  borderTrade: boolean;
  crimeNews:    boolean;
  disruptions:  boolean;
  samContracts: boolean;
  liveTV:       boolean;
}

export const DEFAULT_LAYERS: LayerState = {
  globalHubs:    true,
  conferences:   false,
  vendors:       true,
  samBusinesses: false,
  products:      true,
  funding:       false,
  patents:   false,
  hiring:    false,
  news:      false,
  ikerScores: true,
  ikerRisk:  false,
  momentum:  true,
  adoption:  false,
  globalTech:   true,
  intelSignals: false,
  flights:     false,
  military:    false,
  seismic:     false,
  borderTrade: false,
  crimeNews:    false,
  disruptions:  false,
  samContracts: false,
  liveTV:       false,
};

export interface UseMapLayersReturn {
  layers: LayerState;
  setLayers: React.Dispatch<React.SetStateAction<LayerState>>;
  toggleLayer: (key: keyof LayerState) => void;
  timeRange: TimeRange;
  setTimeRange: React.Dispatch<React.SetStateAction<TimeRange>>;
  activeLayers: Set<string>;
  initialViewState: { longitude: number; latitude: number; zoom: number } | undefined;
}

export function useMapLayers(): UseMapLayersReturn {
  const [timeRange, setTimeRange] = useState<TimeRange>(168);
  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS);
  const [initialViewState, setInitialViewState] = useState<
    { longitude: number; latitude: number; zoom: number } | undefined
  >(undefined);
  const urlInitialized = useRef(false);

  // — URL state: read on mount —
  useEffect(() => {
    if (urlInitialized.current) return;
    urlInitialized.current = true;
    const params = new URLSearchParams(window.location.search);
    const tr = Number(params.get('tr'));
    const validTr: TimeRange[] = [1, 24, 168, 720, 2160, 4320];
    if (validTr.includes(tr as TimeRange)) setTimeRange(tr as TimeRange);
    const lat = parseFloat(params.get('lat') ?? '');
    const lon = parseFloat(params.get('lon') ?? '');
    const zoom = parseFloat(params.get('z') ?? '');
    if (!isNaN(lat) && !isNaN(lon) && !isNaN(zoom)) {
      setInitialViewState({ latitude: lat, longitude: lon, zoom });
    }
    const rawLayers = params.get('layers');
    if (rawLayers) {
      const keys = rawLayers.split(',');
      setLayers(() => {
        const next = { ...DEFAULT_LAYERS };
        (Object.keys(next) as (keyof LayerState)[]).forEach((k) => { next[k] = false; });
        keys.forEach((k) => {
          if (k in next) next[k as keyof LayerState] = true;
        });
        return next;
      });
    }
  }, []);

  // — URL state: write on change —
  useEffect(() => {
    if (!urlInitialized.current) return;
    const active = Object.entries(layers).filter(([, v]) => v).map(([k]) => k);
    const params = new URLSearchParams(window.location.search);
    params.set('tr', String(timeRange));
    params.set('layers', active.join(','));
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [timeRange, layers]);

  const toggleLayer = useCallback((key: keyof LayerState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Convert LayerState booleans → Set<string> for MapCanvas
  const activeLayers = useMemo(() => new Set(
    Object.entries(layers)
      .filter(([, v]) => v)
      .map(([k]) => {
        const keyMap: Record<string, string> = {
          ikerScores: 'health',
          ikerRisk:   'risk',
          adoption:   'adoption',
        };
        return keyMap[k] ?? k;
      }),
  ), [layers]);

  return {
    layers,
    setLayers,
    toggleLayer,
    timeRange,
    setTimeRange,
    activeLayers,
    initialViewState,
  };
}
