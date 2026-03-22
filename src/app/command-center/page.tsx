'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import type { IntelSignal, Mode, Alert, FeedItem } from './types/intel';
import TopBar       from './components/TopBar';
import MorningBrief from './components/MorningBrief';
import WatchList    from './components/WatchList';
import IntelMap     from './components/IntelMap';
import IntelCard    from './components/IntelCard';
import TrendPanel   from './components/TrendPanel';
import LiveFeed     from './components/LiveFeed';
import AlertToast   from './components/AlertToast';
import DepartmentStrip from './components/DepartmentStrip';
import { useSignals }   from './hooks/useSignals';
import { useBriefing }  from './hooks/useBriefing';
import { useWatchList } from './hooks/useWatchList';
import { useAlerts }    from './hooks/useAlerts';

function useRawFeed() {
  const [items, setItems] = useState<Array<{
    id: string; title: string; source: string;
    category: string; link?: string; pubDate?: string; score?: number;
  }>>([]);
  const fetched = useRef(false);
  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetch('/api/feeds').then(r => r.json()).then(json => {
      if (json?.all?.length > 0) setItems(json.all.slice(0, 60));
      else {
        fetch('/api/feeds', { method: 'POST' }).catch(() => {});
        setTimeout(() => {
          fetch('/api/feeds').then(r => r.json())
            .then(j => { if (j?.all?.length > 0) setItems(j.all.slice(0, 60)); }).catch(() => {});
        }, 8000);
      }
    }).catch(() => {});
    const id = setInterval(() => {
      fetch('/api/feeds').then(r => r.json())
        .then(json => { if (json?.all) setItems(json.all.slice(0, 60)); }).catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return items;
}

export default function CommandCenterPage() {
  const [mode, setMode]                         = useState<Mode>('MORNING');
  const [selectedSignal, setSelectedSignal]     = useState<IntelSignal | null>(null);
  const [searchQuery, setSearchQuery]           = useState<string | null>(null);
  const [highlightIndustry, setHighlightIndustry] = useState<string | null>(null);

  const signalsState = useSignals();
  const briefState   = useBriefing();
  const watchState   = useWatchList(signalsState.signals);
  const alertsState  = useAlerts(signalsState.signals);
  const rawFeedItems = useRawFeed();

  const modeFilter = mode === 'RESEARCH'  ? 'research_paper'
                   : mode === 'CONTRACTS' ? 'contract_award'
                   : null;

  const handleDotClick = useCallback((signal: IntelSignal) => {
    setSelectedSignal(signal); setSearchQuery(null);
  }, []);
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query); setSelectedSignal(null);
  }, []);
  const handleWatchSelect = useCallback((query: string) => {
    setSearchQuery(query); setSelectedSignal(null);
  }, []);
  const handleCardClose = useCallback(() => {
    setSelectedSignal(null); setSearchQuery(null); setHighlightIndustry(null);
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
    setSearchQuery(industry); setSelectedSignal(null); setHighlightIndustry(industry);
  }, []);

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
    <div className="cc-root">
      <TopBar
        mode={mode} onModeChange={setMode}
        alerts={alertsState.alerts} signals={signalsState.signals}
        onSearch={handleSearch} onAlertClick={() => alertsState.markAllRead()}
      />

      <div className={`cc-grid${mode === 'TRENDS' ? ' cc-grid-trends' : ''}`}>
        {/* Left Panel */}
        <div className="cc-panel cc-left">
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
          <div style={{ flexShrink: 0, maxHeight: '30%', minHeight: 90, overflow: 'hidden' }}>
            <WatchList
              items={watchState.items}
              onSelect={handleWatchSelect}
              onAdd={watchState.add}
              onRemove={watchState.remove}
            />
          </div>
        </div>

        {/* Center Map */}
        <IntelMap
          signals={signalsState.signals}
          mode={mode} modeFilter={modeFilter}
          selectedSignalId={selectedSignal?.id ?? null}
          highlightIndustry={highlightIndustry}
          onDotClick={handleDotClick}
        />

        {/* Right Panel — TrendPanel in TRENDS mode, IntelCard otherwise */}
        {mode === 'TRENDS' ? (
          <TrendPanel />
        ) : (
          <IntelCard
            selectedSignal={selectedSignal}
            searchQuery={searchQuery}
            sectors={signalsState.sectors}
            signalsToday={signalsState.signalsToday}
            signalsWeek={signalsState.signalsWeek}
            signals={signalsState.signals}
            loading={signalsState.loading}
            onClose={handleCardClose}
          />
        )}
      </div>

      <DepartmentStrip />
      <LiveFeed rawItems={feedForLiveFeed} onItemClick={handleFeedItemClick} />

      <AlertToast
        alerts={alertsState.alerts}
        onDismiss={alertsState.dismiss}
        onView={handleAlertView}
      />

      {/* Scanline + vignette overlays */}
      <div className="cc-scanline" />
      <div className="cc-vignette" />

      <style>{`
        .cc-root {
          display: flex; flex-direction: column;
          width: 100vw; height: 100vh;
          background: #03050a; overflow: hidden;
          font-family: 'IBM Plex Mono', monospace;
          color: rgba(255,255,255,0.82);
        }
        .cc-grid {
          flex: 1; display: grid;
          grid-template-columns: 280px 1fr 280px;
          gap: 2px; padding: 2px 2px 0;
          min-height: 0;
        }
        .cc-grid-trends {
          grid-template-columns: 280px 1fr 360px;
        }
        .cc-panel {
          display: flex; flex-direction: column;
          background: #080c14;
          border: 1px solid rgba(0,212,255,0.08);
          border-radius: 2px;
          overflow: hidden;
          position: relative;
        }
        .cc-panel::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,212,255,0.18), transparent);
          z-index: 1;
          pointer-events: none;
        }
        .cc-panel:hover {
          border-color: rgba(0,212,255,0.13);
        }
        .cc-left { min-height: 0; }
        .cc-scanline {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none; z-index: 80;
          background: repeating-linear-gradient(
            0deg, transparent, transparent 3px,
            rgba(0,212,255,0.008) 3px, rgba(0,212,255,0.008) 4px
          );
        }
        .cc-vignette {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none; z-index: 79;
          background: radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%);
        }
        @media (max-width: 1200px) {
          .cc-grid { grid-template-columns: 220px 1fr 220px; }
        }
        @media (max-width: 900px) {
          .cc-grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr auto;
            gap: 2px; padding: 2px;
          }
          .cc-left { max-height: 35vh; }
        }
        @media (max-width: 600px) {
          .cc-grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
          }
          .cc-left { max-height: 30vh; }
        }
      `}</style>
    </div>
  );
}
