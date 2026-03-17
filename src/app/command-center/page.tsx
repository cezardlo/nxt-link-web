'use client';
// src/app/command-center/page.tsx
// NXT//LINK Command Center — master layout shell.
// 5 zones: TopBar | Left (Brief+Watch) | Center (Map) | Right (Intel) | Bottom (Feed)

import { useState, useCallback, useEffect, useRef } from 'react';
import type { IntelSignal, Mode, Alert, FeedItem } from './types/intel';

import TopBar      from './components/TopBar';
import MorningBrief from './components/MorningBrief';
import WatchList   from './components/WatchList';
import IntelMap    from './components/IntelMap';
import IntelCard   from './components/IntelCard';
import LiveFeed    from './components/LiveFeed';
import AlertToast  from './components/AlertToast';

import { useSignals }   from './hooks/useSignals';
import { useBriefing }  from './hooks/useBriefing';
import { useWatchList } from './hooks/useWatchList';
import { useAlerts }    from './hooks/useAlerts';

// ─── Feed hook ────────────────────────────────────────────────────────────────

function useRawFeed() {
  const [items, setItems] = useState<Array<{
    id: string; title: string; source: string;
    category: string; link?: string; pubDate?: string; score?: number;
  }>>([]);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    fetch('/api/feeds')
      .then(r => r.json())
      .then(json => {
        if (json?.all?.length > 0) {
          setItems(json.all.slice(0, 60));
        } else {
          fetch('/api/feeds', { method: 'POST' }).catch(() => {});
          setTimeout(() => {
            fetch('/api/feeds')
              .then(r => r.json())
              .then(j => { if (j?.all?.length > 0) setItems(j.all.slice(0, 60)); })
              .catch(() => {});
          }, 8000);
        }
      })
      .catch(() => {});

    const id = setInterval(() => {
      fetch('/api/feeds')
        .then(r => r.json())
        .then(json => { if (json?.all) setItems(json.all.slice(0, 60)); })
        .catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return items;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommandCenterPage() {
  const [mode, setMode]               = useState<Mode>('MORNING');
  const [selectedSignal, setSelectedSignal] = useState<IntelSignal | null>(null);
  const [searchQuery, setSearchQuery]       = useState<string | null>(null);

  const signalsState = useSignals();
  const briefState   = useBriefing();
  const watchState   = useWatchList(signalsState.signals);
  const alertsState  = useAlerts(signalsState.signals);
  const rawFeedItems = useRawFeed();

  // ── Mode → map filter mapping ────────────────────────────────────────────
  const modeFilter = mode === 'RESEARCH'  ? 'research_paper'
                   : mode === 'CONTRACTS' ? 'contract_award'
                   : null;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleDotClick = useCallback((signal: IntelSignal) => {
    setSelectedSignal(signal);
    setSearchQuery(null);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedSignal(null);
  }, []);

  const handleWatchSelect = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedSignal(null);
  }, []);

  const handleCardClose = useCallback(() => {
    setSelectedSignal(null);
    setSearchQuery(null);
  }, []);

  const handleAlertView = useCallback((alert: Alert) => {
    const match = signalsState.signals.find(s => s.headline === alert.headline);
    if (match) { setSelectedSignal(match); setSearchQuery(null); }
    alertsState.markRead(alert.id);
  }, [signalsState.signals, alertsState]);

  const handleFeedItemClick = useCallback((item: FeedItem) => {
    if (item.url) window.open(item.url, '_blank');
  }, []);

  const handleBriefItemClick = useCallback((industry: string) => {
    setSearchQuery(industry);
    setSelectedSignal(null);
  }, []);

  // ── Layout by mode ──────────────────────────────────────────────────────
  const gridCols = mode === 'WORLD'     ? '180px 1fr 220px'
                 : mode === 'CONTRACTS' ? '220px 1fr 300px'
                 : '28% 1fr 28%';

  // ── Feed fallback to signals ─────────────────────────────────────────────
  const feedForLiveFeed = rawFeedItems.length > 0
    ? rawFeedItems.map(r => ({
        id: r.id, title: r.title, source: r.source, category: r.category,
        url: r.link, score: r.score, publishedAt: r.pubDate,
      }))
    : signalsState.signals.slice(0, 30).map(sig => ({
        id: sig.id, title: sig.title, source: sig.source, category: sig.industry,
        url: sig.url, score: Math.round(sig.importance * 100), publishedAt: sig.discoveredAt,
      }));

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: '100vw', height: '100vh',
      background: '#07070F', overflow: 'hidden',
      fontFamily: 'IBM Plex Mono, monospace',
    }}>

      {/* Zone 1: Top Bar */}
      <TopBar
        mode={mode}
        onModeChange={setMode}
        alerts={alertsState.alerts}
        signals={signalsState.signals}
        onSearch={handleSearch}
        onAlertClick={() => alertsState.markAllRead()}
      />

      {/* Zones 2–4: 3-column grid */}
      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: gridCols,
        gap: 4, padding: '4px 4px 0', minHeight: 0,
        transition: 'grid-template-columns 0.3s ease',
      }}>

        {/* Zone 2 — Left */}
        <div style={{
          display: 'flex', flexDirection: 'column', minHeight: 0,
          background: 'rgba(7,7,15,0.95)', border: '1px solid rgba(0,212,255,0.08)',
          borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <MorningBrief
              items={briefState.items}
              executiveSummary={briefState.executiveSummary}
              crossCuttingThemes={briefState.crossCuttingThemes}
              totalSignals={briefState.totalSignals}
              generatedAt={briefState.generatedAt}
              loading={briefState.loading}
              onItemClick={handleBriefItemClick}
            />
          </div>
          <div style={{ flexShrink: 0, maxHeight: '32%', minHeight: 100, overflow: 'hidden' }}>
            <WatchList
              items={watchState.items}
              onSelect={handleWatchSelect}
              onAdd={watchState.add}
              onRemove={watchState.remove}
            />
          </div>
        </div>

        {/* Zone 3 — Center Map */}
        <IntelMap
          signals={signalsState.signals}
          mode={mode}
          modeFilter={modeFilter}
          selectedSignalId={selectedSignal?.id ?? null}
          onDotClick={handleDotClick}
        />

        {/* Zone 4 — Right Intel */}
        <IntelCard
          selectedSignal={selectedSignal}
          searchQuery={searchQuery}
          sectors={signalsState.sectors}
          signalsToday={signalsState.signalsToday}
          signalsWeek={signalsState.signalsWeek}
          loading={signalsState.loading}
          onClose={handleCardClose}
        />
      </div>

      {/* Zone 5: Bottom Feed */}
      <LiveFeed rawItems={feedForLiveFeed} onItemClick={handleFeedItemClick} />

      {/* Alert Toast */}
      <AlertToast
        alerts={alertsState.alerts}
        onDismiss={alertsState.dismiss}
        onView={handleAlertView}
      />

      {/* Global scanline effect */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none', zIndex: 60,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.015) 2px, rgba(0,212,255,0.015) 4px)',
      }} />
    </div>
  );
}
