'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SignalFinding, SectorScore } from '@/lib/intelligence/signal-engine';
import type { ConferenceRecord } from '@/lib/data/conference-intel';
import type { ConferenceCluster } from '@/lib/utils/conference-clusters';

import { FeedBar } from '@/components/FeedBar';
import { MapCanvas } from '@/components/MapCanvas';
import type { FlyToTarget, MapPoint } from '@/components/MapCanvas';
import type { FilterMode } from '@/components/MapFilterPanel';
import { MapFilterPanel } from '@/components/MapFilterPanel';
import { MapLayerPanel } from '@/components/MapLayerPanel';
import { RightPanel } from '@/components/right-panel/RightPanel';
import type { SelectedPoint } from '@/components/right-panel/RightPanel';
import { MapTopBar } from '@/components/MapTopBar';
import { CmdK } from '@/components/CmdK';
import { BorderCameraOverlay } from '@/components/BorderCameraOverlay';
import { CrimeNewsOverlay } from '@/components/CrimeNewsOverlay';
import { LiveTVOverlay } from '@/components/LiveTVOverlay';
import { ALL_DISRUPTIONS } from '@/lib/data/innovation-dashboard-data';

import { useMapLayers } from '@/hooks/useMapLayers';
import type { LayerState } from '@/hooks/useMapLayers';
import { useMapData } from '@/hooks/useMapData';
import { useMissionBriefing } from '@/hooks/useMissionBriefing';

// Re-export types consumed by other components
export type { TimeRange, Mode, LayerState } from '@/hooks/useMapLayers';

// CSS filter class + overlay per visual mode
const FILTER_CONFIG: Record<FilterMode, { mapClass: string; overlayClass: string }> = {
  STANDARD: { mapClass: '',           overlayClass: '' },
  CRT:      { mapClass: 'filter-crt', overlayClass: 'scanlines' },
  NVG:      { mapClass: 'filter-nvg', overlayClass: 'nvg-vignette' },
  FLIR:     { mapClass: 'filter-flir', overlayClass: 'flir-vignette' },
};

export default function MapPage() {
  // ── Core layer + time state ────────────────────────────────────────────
  const {
    layers, setLayers, toggleLayer,
    timeRange, setTimeRange,
    activeLayers, initialViewState,
  } = useMapLayers();

  // ── Data fetching ──────────────────────────────────────────────────────
  const {
    flights, seismicEvents, borderCrossings, borderWaitTimes,
    crimeArticles, crimeHotspots,
    contracts, samBusinesses,
    disruptionPoints,
    countrySignalCounts,
    intelSignalPoints,
    dataFreshness, fetchErrors,
  } = useMapData(layers);

  // ── Mission briefing ───────────────────────────────────────────────────
  const { missionBriefing, briefingLoading, handleMissionSubmit } =
    useMissionBriefing(timeRange, activeLayers);

  // ── UI-only state ──────────────────────────────────────────────────────
  const [mode, setMode] = useState<'operator' | 'executive'>('operator');
  const [filterMode, setFilterMode] = useState<FilterMode>('STANDARD');
  const [mobileLayerOpen, setMobileLayerOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
  const [selectedConference, setSelectedConference] = useState<ConferenceRecord | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ConferenceCluster | null>(null);
  const [pointCount, setPointCount] = useState(0);
  const [flyTo, setFlyTo] = useState<FlyToTarget | undefined>(undefined);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [, setIntelSignals] = useState<SignalFinding[]>([]);
  const [sectorScores, setSectorScores] = useState<SectorScore[]>([]);
  const [activeVendorIds, setActiveVendorIds] = useState<string[]>([]);

  // — Global ⌘K / Ctrl+K shortcut —
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdkOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setCmdkOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleViewStateChange = useCallback((vs: { longitude: number; latitude: number; zoom: number }) => {
    const params = new URLSearchParams(window.location.search);
    params.set('lat', String(vs.latitude));
    params.set('lon', String(vs.longitude));
    params.set('z', String(vs.zoom));
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, []);

  const handleLayerPreset = useCallback((presetLayers: string[]) => {
    setLayers((prev) => {
      const next = { ...prev };
      (Object.keys(next) as (keyof LayerState)[]).forEach((k) => { next[k] = false; });
      presetLayers.forEach((l) => {
        if (l in next) next[l as keyof LayerState] = true;
      });
      return next;
    });
  }, [setLayers]);

  const handleSignalsLoaded = useCallback(
    (signals: SignalFinding[], scores: SectorScore[], vendorIds: string[]) => {
      setIntelSignals(signals);
      setSectorScores(scores);
      setActiveVendorIds(vendorIds);
    },
    [],
  );

  const handleVendorSelect = useCallback((point: MapPoint | null) => {
    if (!point) { setSelectedPoint(null); return; }
    setSelectedPoint({
      id: point.id,
      label: point.label,
      category: point.category,
      entity_id: point.entity_id,
      layer: point.layer,
    });
  }, []);

  const { mapClass, overlayClass } = FILTER_CONFIG[filterMode];

  // Derive data status for the freshness indicator
  const criticalKeys = ['flights', 'borderTrade', 'borderWait'];
  const criticalFailed = criticalKeys.some((k) => fetchErrors[k]);
  const anyFailed = Object.values(fetchErrors).some(Boolean);
  const dataStatusColor = criticalFailed ? '#ff3b30' : anyFailed ? '#ffb800' : '#00ff88';
  const dataStatusLabel = criticalFailed ? 'DATA: ERR' : anyFailed ? 'DATA: PARTIAL' : 'DATA: OK';
  const hasAnyFreshness = Object.keys(dataFreshness).length > 0;

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      {/* TOP BAR */}
      <MapTopBar
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onMissionSubmit={handleMissionSubmit}
        loading={briefingLoading}
        activeLayerCount={activeLayers.size}
        pointCount={pointCount}
        mode={mode}
        onModeChange={setMode}
        onFlyTo={setFlyTo}
        onCmdK={() => setCmdkOpen(true)}
        onSignalsLoaded={handleSignalsLoaded}
        onMobileLayerToggle={() => setMobileLayerOpen((v) => !v)}
        onMobileRightToggle={() => setMobileRightOpen((v) => !v)}
      />

      {/* MAIN AREA — 3-column on desktop, full-screen map on mobile */}
      <div className="flex flex-1 min-h-0 relative">

        {/* LEFT — LAYER PANEL: normal column on md+, slide-out drawer on mobile */}
        <div className={`
          md:relative md:flex md:w-40 md:shrink-0
          fixed inset-y-0 left-0 z-30 w-40
          transition-transform duration-200
          ${mobileLayerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <MapLayerPanel
            layers={layers}
            onToggleLayer={(key) => { toggleLayer(key); }}
            dataFreshness={dataFreshness}
          />
        </div>

        {/* Mobile backdrop — tap outside layer panel to close */}
        {mobileLayerOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 md:hidden"
            onClick={() => setMobileLayerOpen(false)}
          />
        )}

        {/* CENTER — MAP with visual filter mode */}
        <div className={`flex-1 relative min-w-0 ${mapClass}`}>
          <MapCanvas
            activeLayers={activeLayers}
            timeRange={timeRange}
            onVendorSelect={(point) => { handleVendorSelect(point); setMobileRightOpen(true); }}
            onConferenceSelect={(conf) => { setSelectedConference(conf); setMobileRightOpen(true); }}
            onClusterSelect={(cluster) => { setSelectedCluster(cluster); setMobileRightOpen(true); }}
            onPointCountChange={setPointCount}
            flyTo={flyTo}
            initialViewState={initialViewState}
            onViewStateChange={handleViewStateChange}
            flights={flights}
            seismicEvents={seismicEvents}
            activeVendorIds={activeVendorIds}
            borderCrossings={borderCrossings}
            borderWaitTimes={borderWaitTimes}
            crimeHotspots={crimeHotspots}
            disruptionPoints={disruptionPoints}
            contracts={contracts}
            samBusinesses={samBusinesses}
            countrySignalCounts={countrySignalCounts}
            intelSignalPoints={intelSignalPoints}
          />

          {/* Mode overlay (scanlines / vignette) */}
          {overlayClass && (
            <div className={`absolute inset-0 pointer-events-none z-10 ${overlayClass}`} />
          )}

          {/* Filter mode switcher */}
          <MapFilterPanel mode={filterMode} onChange={setFilterMode} />

          {/* Border wait times + camera overlay */}
          {layers.borderTrade && <BorderCameraOverlay />}

          {/* Crime news overlay */}
          {layers.crimeNews && <CrimeNewsOverlay articles={crimeArticles} />}

          {/* Disruptions overlay */}
          {layers.disruptions && disruptionPoints.length > 0 && (
            <div className="absolute top-12 left-1 z-20 w-[280px] max-h-[400px] bg-black/92 border border-white/[0.08] backdrop-blur-md rounded-sm overflow-hidden flex flex-col">
              <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" style={{ boxShadow: '0 0 6px #a855f7cc' }} />
                  <span className="font-mono text-[8px] tracking-[0.2em] text-[#a855f7]">DISRUPTIONS</span>
                </div>
                <span className="font-mono text-[7px] tabular-nums text-white/20">{disruptionPoints.length}</span>
              </div>
              <div className="overflow-y-auto scrollbar-thin flex-1">
                {ALL_DISRUPTIONS.map((d) => {
                  const catColors: Record<string, string> = { breakthrough: '#a855f7', funding: '#f97316', policy: '#ffb800', acquisition: '#00d4ff', deployment: '#00ff88' };
                  const impColors: Record<string, string> = { high: '#ff3b30', medium: '#f97316', low: '#6b7280' };
                  const cc = catColors[d.category] ?? '#a855f7';
                  const ic = impColors[d.impact] ?? '#6b7280';
                  return (
                    <div key={d.id} className="px-3 py-1.5 border-b border-white/[0.03] last:border-0">
                      <div className="flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full mt-1 shrink-0" style={{ backgroundColor: ic, boxShadow: `0 0 4px ${ic}88` }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[7px] text-white/45 leading-snug line-clamp-1">{d.title}</div>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <span className="text-[5px] tracking-[0.12em] uppercase px-1 py-0.5 rounded-sm border" style={{ color: cc, borderColor: `${cc}30`, backgroundColor: `${cc}08` }}>{d.category}</span>
                            <span className="text-[5px] tracking-[0.12em] uppercase px-1 py-0.5 rounded-sm border" style={{ color: ic, borderColor: `${ic}30`, backgroundColor: `${ic}08` }}>{d.impact}</span>
                            <span className="text-[5px] text-white/15 tabular-nums">{d.date.slice(0, 10)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Live TV overlay */}
          {layers.liveTV && <LiveTVOverlay />}

          {/* Data freshness indicator — bottom-right corner, non-intrusive */}
          {hasAnyFreshness && (
            <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 px-2 py-1 bg-black/80 border border-white/8 rounded-sm backdrop-blur-sm pointer-events-none">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: dataStatusColor, boxShadow: `0 0 4px ${dataStatusColor}` }}
              />
              <span
                className="font-mono tracking-widest"
                style={{ fontSize: '7px', color: dataStatusColor }}
              >
                {dataStatusLabel}
              </span>
            </div>
          )}
        </div>

        {/* RIGHT — INTELLIGENCE PANEL: normal column on md+, slide-out drawer on mobile */}
        <div className={`
          md:relative md:flex md:w-72 md:shrink-0
          fixed inset-y-0 right-0 z-30 w-full max-w-sm
          transition-transform duration-200
          ${mobileRightOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}>
          <RightPanel
            selectedPoint={selectedPoint}
            missionBriefing={missionBriefing as Parameters<typeof RightPanel>[0]['missionBriefing']}
            briefingLoading={briefingLoading}
            sectorScores={sectorScores}
            flights={flights}
            selectedConference={selectedConference}
            onConferenceSelect={setSelectedConference}
            selectedCluster={selectedCluster}
            onClusterSelect={setSelectedCluster}
            onMobileClose={() => setMobileRightOpen(false)}
          />
        </div>

        {/* Mobile backdrop — tap outside right panel to close */}
        {mobileRightOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 md:hidden"
            onClick={() => setMobileRightOpen(false)}
          />
        )}

      </div>

      {/* BOTTOM — LIVE FEED BAR */}
      <FeedBar timeRange={timeRange} />

      {/* ⌘K VENDOR SEARCH MODAL */}
      <CmdK
        context="map"
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        timeRange={timeRange}
        onVendorSelect={(point) => { handleVendorSelect(point); setCmdkOpen(false); setMobileRightOpen(true); }}
        onLayerPreset={handleLayerPreset}
        onFlyTo={setFlyTo}
        contracts={contracts}
        samBusinesses={samBusinesses}
        crimeArticles={crimeArticles}
      />
    </div>
  );
}
