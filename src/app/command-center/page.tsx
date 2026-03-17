'use client';
// src/app/command-center/page.tsx
// NXT//LINK Command Center — master layout shell.
// Composes all 5 zones from separate components + hooks.
// All state lives here and flows down as props.

import { useState, useCallback } from 'react';
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

// ─── Feeds raw data (fetched inline — feed hook is lightweight) ───────────────

import { useEffect, useRef } from 'react';

function useRawFeed() {
  const [items, setItems] = useState<Array<{
    id: string; title: string; source: string;
    category: string; link?: string; pubDate?: string; score?: number;
  }>>([]);

  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    // First try GET — if empty, POST to trigger warmup, then retry
    fetch('/api/feeds')
      .then(r => r.json())
      .then(json => {
        if (json?.all?.length > 0) {
          setItems(json.all.slice(0, 60));
        } else {
          // Feed is cold — trigger warmup then retry after 8s
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
  // ── Global mode state ──────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('MORNING');

  // ── Right panel state ──────────────────────────────────────────────────────
  const [selectedSignal, setSelectedSignal] = useState<IntelSignal | null>(null);
  const [searchQuery,    setSearchQuery]    = useState<string | null>(null);

  // ── Data hooks ─────────────────────────────────────────────────────────────
  const signalsState  = useSignals();
  const briefState    = useBriefing();
  const watchState    = useWatchList(signalsState.signals);
  const alertsState   = useAlerts(signalsState.signals);
  const rawFeedItems  = useRawFeed();

  // ── Handlers ───────────────────────────────────────────────────────────────

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
    // Find the matching signal and show it in the right panel
    const match = signalsState.signals.find(s => s.headline === alert.headline);
    if (match) {
      setSelectedSignal(match);
      setSearchQuery(null);
    }
    alertsState.markRead(alert.id);
  }, [signalsState.signals, alertsState]);

  const handleFeedItemClick = useCallback((item: FeedItem) => {
    if (item.url) window.open(item.url, '_blank');
  }, []);

  // ── Layout dimensions by mode ──────────────────────────────────────────────
  // WORLD mode: map takes more space
  // CONTRACTS mode: right panel wider
  // Default: 30/40/30

  const gridCols = mode === 'WORLD'
    ? '200px 1fr 240px'
    : mode === 'CONTRACTS'
    ? '240px 1fr 320px'
    : '30% 1fr 30%';

  // ── Feed items normalized for LiveFeed ─────────────────────────────────────
  const feedForLiveFeed = rawFeedItems.map(r => ({
    id:          r.id,
    title:       r.title,
    source:      r.source,
    category:    r.category,
    url:         r.link,
    score:       r.score,
    publishedAt: r.pubDate,
  }));

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100vw',
      height: '100vh',
      background: '#07070F',
      overflow: 'hidden',
    }}>

      {/* ── Zone 1: Top Bar ──────────────────────────────────────────────── */}
      <TopBar
        mode={mode}
        onModeChange={setMode}
        alerts={alertsState.alerts}
        signals={signalsState.signals}
        onSearch={handleSearch}
        onAlertClick={() => alertsState.markAllRead()}
      />

      {/* ── Zones 2–4: Main 3-column grid ───────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: gridCols,
        gap: 6,
        padding: 6,
        minHeight: 0,
        transition: 'grid-template-columns 0.3s ease',
      }}>

        {/* Zone 2 — Left: Brief + Watch List */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: 'rgba(7,7,15,0.92)', border: '1px solid rgba(0,212,255,0.10)', borderRadius: 2, overflow: 'hidden' }}>
          {/* Top half: Morning Brief */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <MorningBrief
              items={briefState.items}
              executiveSummary={briefState.executiveSummary}
              totalSignals={briefState.totalSignals}
              generatedAt={briefState.generatedAt}
              loading={briefState.loading}
            />
          </div>

          {/* Bottom half: Watch List */}
          <div style={{ flexShrink: 0, maxHeight: '38%', minHeight: 120, borderTop: '1px solid rgba(0,212,255,0.08)', overflow: 'hidden' }}>
            <WatchList
              items={watchState.items}
              onSelect={handleWatchSelect}
              onAdd={watchState.add}
              onRemove={watchState.remove}
            />
          </div>
        </div>

        {/* Zone 3 — Center: Map */}
        <IntelMap
          signals={signalsState.signals}
          onDotClick={handleDotClick}
        />

        {/* Zone 4 — Right: Intelligence Card */}
        <IntelCard
          selectedSignal={selectedSignal}
          searchQuery={searchQuery}
          sectors={signalsState.sectors}
          signalsToday={signalsState.signalsToday}
          signalsWeek={signalsState.signalsWeek}
          onClose={handleCardClose}
        />
      </div>

      {/* ── Zone 5: Bottom Feed ──────────────────────────────────────────── */}
      <LiveFeed
        rawItems={feedForLiveFeed}
        onItemClick={handleFeedItemClick}
      />

      {/* ── Alert Toast ──────────────────────────────────────────────────── */}
      <AlertToast
        alerts={alertsState.alerts}
        onDismiss={alertsState.dismiss}
        onView={handleAlertView}
      />
    </div>
  );
}
