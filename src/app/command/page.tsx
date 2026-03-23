'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { AppShell } from '@/components/AppShell';
import { COLORS } from '@/lib/tokens';

// ─── Import existing command-center components & hooks ───────────────────────
import type { IntelSignal, Mode, Alert, FeedItem } from '@/app/command-center/types/intel';
import TopBar          from '@/app/command-center/components/TopBar';
import MorningBrief    from '@/app/command-center/components/MorningBrief';
import WatchList       from '@/app/command-center/components/WatchList';
import IntelMap        from '@/app/command-center/components/IntelMap';
import IntelCard       from '@/app/command-center/components/IntelCard';
import TrendPanel      from '@/app/command-center/components/TrendPanel';
import LiveFeed        from '@/app/command-center/components/LiveFeed';
import AlertToast      from '@/app/command-center/components/AlertToast';
import DepartmentStrip from '@/app/command-center/components/DepartmentStrip';
import { useSignals }   from '@/app/command-center/hooks/useSignals';
import { useBriefing }  from '@/app/command-center/hooks/useBriefing';
import { useWatchList } from '@/app/command-center/hooks/useWatchList';
import { useAlerts }    from '@/app/command-center/hooks/useAlerts';

// ─── Raw feed hook (same as command-center) ──────────────────────────────────

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
        fetch('/api/feeds', { method: 'POST' }).catch((err) => console.warn('[Command] feeds POST failed:', err));
        setTimeout(() => {
          fetch('/api/feeds').then(r => r.json())
            .then(j => { if (j?.all?.length > 0) setItems(j.all.slice(0, 60)); })
            .catch((err) => console.warn('[Command] feeds retry failed:', err));
        }, 8000);
      }
    }).catch((err) => console.warn('[Command] feeds fetch failed:', err));
    const id = setInterval(() => {
      fetch('/api/feeds').then(r => r.json())
        .then(json => { if (json?.all) setItems(json.all.slice(0, 60)); })
        .catch((err) => console.warn('[Command] feeds poll failed:', err));
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return items;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CommandPage() {
  const [mode, setMode]                           = useState<Mode>('MORNING');
  const [selectedSignal, setSelectedSignal]       = useState<IntelSignal | null>(null);
  const [searchQuery, setSearchQuery]             = useState<string | null>(null);
  const [highlightIndustry, setHighlightIndustry] = useState<string | null>(null);

  const signalsState = useSignals();
  const briefState   = useBriefing();
  const watchState   = useWatchList(signalsState.signals);
  const alertsState  = useAlerts(signalsState.signals);
  const rawFeedItems = useRawFeed();

  const modeFilter = mode === 'RESEARCH'  ? 'research_paper'
                   : mode === 'CONTRACTS' ? 'contract_award'
                   : null;

  // ─── Callbacks ───────────────────────────────────────────────────────────────

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

  // ─── Feed mapping ────────────────────────────────────────────────────────────

  const feedForLiveFeed = rawFeedItems.length > 0
    ? rawFeedItems.map(r => ({
        id: r.id, title: r.title, source: r.source, category: r.category,
        url: r.link, score: r.score, publishedAt: r.pubDate,
      }))
    : signalsState.signals.slice(0, 30).map(sig => ({
        id: sig.id, title: sig.title, source: sig.source, category: sig.industry,
        url: sig.url, score: Math.round(sig.importance * 100), publishedAt: sig.discoveredAt,
      }));

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className="cmd-root" style={{ paddingBottom: 96 }}>

        {/* ── Branding header ─────────────────────────────────────────────── */}
        <div className="cmd-brand">
          <span className="cmd-brand-text">
            NXT<span style={{ color: 'rgba(0,212,255,0.35)' }}>{'/'}{'/'}</span>LINK
          </span>
          <span className="cmd-brand-sub">COMMAND</span>
          <span className="cmd-brand-line" />
        </div>

        {/* ── TopBar with mode switcher ───────────────────────────────────── */}
        <TopBar
          mode={mode} onModeChange={setMode}
          alerts={alertsState.alerts} signals={signalsState.signals}
          onSearch={handleSearch} onAlertClick={() => alertsState.markAllRead()}
        />

        {/* ── Main grid ───────────────────────────────────────────────────── */}
        <div className={`cmd-grid${mode === 'TRENDS' ? ' cmd-grid-trends' : ''}`}>

          {/* Left Panel */}
          <div className="cmd-panel cmd-left">
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

          {/* Right Panel */}
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

        {/* ── Bottom sections ─────────────────────────────────────────────── */}
        <DepartmentStrip />
        <LiveFeed rawItems={feedForLiveFeed} onItemClick={handleFeedItemClick} />

        {/* ── Alert toasts ────────────────────────────────────────────────── */}
        <AlertToast
          alerts={alertsState.alerts}
          onDismiss={alertsState.dismiss}
          onView={handleAlertView}
        />

        {/* ── Scanline + vignette overlays ────────────────────────────────── */}
        <div className="cmd-scanline" />
        <div className="cmd-vignette" />

        {/* ── Styles ──────────────────────────────────────────────────────── */}
        <style>{`
          .cmd-root {
            display: flex; flex-direction: column;
            width: 100%; min-height: 100vh;
            background: ${COLORS.bg};
            overflow-x: hidden;
            font-family: 'IBM Plex Mono', monospace;
            color: rgba(255,255,255,0.82);
          }

          /* ── Branding header ── */
          .cmd-brand {
            display: flex; align-items: center; gap: 10px;
            padding: 10px 16px 0;
            flex-shrink: 0;
          }
          .cmd-brand-text {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 18px; font-weight: 700;
            color: ${COLORS.cyan};
            letter-spacing: 0.08em;
          }
          .cmd-brand-sub {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 10px; font-weight: 600;
            letter-spacing: 0.25em;
            color: ${COLORS.gold};
            padding: 2px 8px;
            background: rgba(255,215,0,0.06);
            border: 1px solid rgba(255,215,0,0.15);
            border-radius: 2px;
          }
          .cmd-brand-line {
            flex: 1; height: 1px;
            background: linear-gradient(90deg, rgba(0,212,255,0.18), transparent);
          }

          /* ── Main grid (mirrors command-center) ── */
          .cmd-grid {
            flex: 1; display: grid;
            grid-template-columns: 280px 1fr 280px;
            gap: 2px; padding: 2px 2px 0;
            min-height: 0;
          }
          .cmd-grid-trends {
            grid-template-columns: 280px 1fr 360px;
          }

          /* ── Panel styling ── */
          .cmd-panel {
            display: flex; flex-direction: column;
            background: ${COLORS.surface};
            border: 1px solid ${COLORS.border};
            border-radius: 2px;
            overflow: hidden;
            position: relative;
          }
          .cmd-panel::before {
            content: '';
            position: absolute; top: 0; left: 0; right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(0,212,255,0.18), transparent);
            z-index: 1;
            pointer-events: none;
          }
          .cmd-panel:hover {
            border-color: rgba(0,212,255,0.13);
          }
          .cmd-left { min-height: 0; }

          /* ── Overlay effects ── */
          .cmd-scanline {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            pointer-events: none; z-index: 80;
            background: repeating-linear-gradient(
              0deg, transparent, transparent 3px,
              rgba(0,212,255,0.008) 3px, rgba(0,212,255,0.008) 4px
            );
          }
          .cmd-vignette {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            pointer-events: none; z-index: 79;
            background: radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%);
          }

          /* ── Responsive ── */
          @media (max-width: 1200px) {
            .cmd-grid { grid-template-columns: 220px 1fr 220px; }
            .cmd-grid-trends { grid-template-columns: 220px 1fr 300px; }
          }
          @media (max-width: 900px) {
            .cmd-grid, .cmd-grid-trends {
              grid-template-columns: 1fr;
              grid-template-rows: auto 1fr auto;
              gap: 2px; padding: 2px;
            }
            .cmd-left { max-height: 35vh; overflow-y: auto; }
          }
          @media (max-width: 600px) {
            .cmd-grid, .cmd-grid-trends {
              grid-template-columns: 1fr;
              grid-template-rows: auto 1fr;
            }
            .cmd-left { max-height: 30vh; }
            .cmd-grid > :nth-child(3),
            .cmd-grid-trends > :nth-child(3) { display: none; }
            .cmd-grid > :nth-child(2),
            .cmd-grid-trends > :nth-child(2) { min-height: 250px; }
          }
        `}</style>
      </div>
    </AppShell>
  );
}
