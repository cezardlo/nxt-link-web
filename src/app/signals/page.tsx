'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { PageTopBar } from '@/components/PageTopBar';
import {
  PRIORITIZED_SIGNALS,
  getPriorityColor,
  calculatePriority,
  type PriorityTier,
  type PrioritizedSignal,
} from '@/lib/intelligence/signal-priority';
import type { SignalFinding } from '@/lib/intelligence/signal-engine';

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const ALL_TIERS: PriorityTier[] = ['P0-CRITICAL', 'P1-HIGH', 'P2-MEDIUM', 'P3-LOW'];

const TIER_LABELS: Record<PriorityTier, string> = {
  'P0-CRITICAL': 'P0',
  'P1-HIGH':     'P1',
  'P2-MEDIUM':   'P2',
  'P3-LOW':      'P3',
};

/* ------------------------------------------------------------------ */
/*  Live signal → PrioritizedSignal converter                         */
/* ------------------------------------------------------------------ */

/** Map signal-engine priority string to factor estimates */
function signalFindingToPrioritized(sf: SignalFinding): PrioritizedSignal {
  const confPct = Math.round(sf.confidence * 100);

  // Derive factor estimates from the SignalFinding metadata
  const impact =
    sf.type === 'contract_alert' ? Math.min(100, 70 + (sf.contractAmountM ?? 0) / 10) :
    sf.type === 'security_impact' ? 75 :
    sf.type === 'convergence' ? 80 :
    sf.type === 'velocity_spike' ? 70 :
    sf.type === 'sector_spike' ? 65 :
    60;

  const urgency =
    sf.priority === 'critical' ? 90 :
    sf.priority === 'high' ? 70 :
    sf.priority === 'elevated' ? 50 : 30;

  const novelty =
    sf.type === 'velocity_spike' ? 80 :
    sf.type === 'convergence' ? 70 :
    sf.type === 'contract_alert' ? 75 : 55;

  const exposure = Math.min(100, sf.articleCount * 12 + sf.sources.length * 8);

  const domain =
    sf.sectorLabel ??
    (sf.type === 'security_impact' ? 'Security' :
     sf.type === 'contract_alert' ? 'Defense' : 'General');

  return {
    id: sf.id,
    title: sf.title,
    domain,
    summary: sf.description + (sf.whyItMatters ? ` — ${sf.whyItMatters}` : ''),
    priority: calculatePriority({
      impact: Math.round(impact),
      confidence: confPct,
      novelty: Math.round(novelty),
      urgency: Math.round(urgency),
      exposure: Math.round(exposure),
    }),
    timestamp: sf.detectedAt,
    industriesImpacted: sf.sources.slice(0, 4),
  };
}

/* ------------------------------------------------------------------ */
/*  API response type                                                 */
/* ------------------------------------------------------------------ */

type IntelSignalsResponse = {
  ok: boolean;
  signals: SignalFinding[];
  sectorScores: unknown[];
  activeVendorIds: string[];
  clusterCount: number;
  detectedAt: string;
  feedAsOf: string;
  message?: string;
};

/* ------------------------------------------------------------------ */
/*  Factor mini-bar                                                   */
/* ------------------------------------------------------------------ */

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[7px] tracking-[0.2em] text-white/30 uppercase w-16 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[8px] font-mono text-white/40 w-6 text-right">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Signal card                                                       */
/* ------------------------------------------------------------------ */

function SignalCard({ signal, isLive = false }: { signal: PrioritizedSignal; isLive?: boolean }) {
  const { priority } = signal;

  const borderColor =
    priority.tier === 'P0-CRITICAL'
      ? '#ff3b30'
      : priority.tier === 'P1-HIGH'
        ? '#f97316'
        : priority.tier === 'P2-MEDIUM'
          ? '#ffd700'
          : 'rgba(255,255,255,0.2)';

  const barColor = getPriorityColor(priority.tier);

  return (
    <div
      className="bg-black/60 border border-white/[0.06] rounded-sm p-4 border-l-2"
      style={{ borderLeftColor: borderColor }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tier badge */}
          <span
            className="font-mono text-[8px] tracking-[0.25em] px-1.5 py-0.5 rounded-sm"
            style={{
              color: barColor,
              backgroundColor:
                priority.tier === 'P3-LOW'
                  ? 'rgba(255,255,255,0.04)'
                  : `${barColor}14`,
              border: `1px solid ${
                priority.tier === 'P3-LOW'
                  ? 'rgba(255,255,255,0.08)'
                  : `${barColor}40`
              }`,
            }}
          >
            {TIER_LABELS[priority.tier]}
          </span>

          {/* Domain pill */}
          <span className="font-mono text-[7px] tracking-[0.2em] text-white/50 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-sm uppercase">
            {signal.domain}
          </span>

          {/* Score */}
          <span className="font-mono text-[8px] text-white/30 tracking-wider">
            SCORE {priority.score}
          </span>

          {/* Live badge */}
          {isLive && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-[#00ff88]/8 border border-[#00ff88]/20">
              <span className="w-1 h-1 rounded-full bg-[#00ff88]" style={{ boxShadow: '0 0 4px #00ff88cc' }} />
              <span className="text-[6px] tracking-[0.25em] text-[#00ff88]/70">LIVE</span>
            </span>
          )}
        </div>

        {/* Timestamp */}
        <span className="font-mono text-[7px] text-white/20 tracking-wider shrink-0">
          {formatTimestamp(signal.timestamp)}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-mono text-[11px] text-white/90 leading-snug mb-2">
        {signal.title}
      </h3>

      {/* Summary */}
      <p className="font-mono text-[9px] text-white/40 leading-relaxed mb-3">
        {signal.summary}
      </p>

      {/* Factor bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mb-3">
        <MiniBar label="IMPACT" value={priority.factors.impact} color={barColor} />
        <MiniBar label="CONFID" value={priority.factors.confidence} color={barColor} />
        <MiniBar label="NOVEL" value={priority.factors.novelty} color={barColor} />
        <MiniBar label="URGENT" value={priority.factors.urgency} color={barColor} />
        <MiniBar label="EXPOSE" value={priority.factors.exposure} color={barColor} />
      </div>

      {/* Industries impacted */}
      <div className="flex flex-wrap gap-1">
        {signal.industriesImpacted.map((ind) => (
          <span
            key={ind}
            className="font-mono text-[7px] tracking-[0.15em] text-white/30 bg-white/[0.03] border border-white/[0.05] px-1.5 py-0.5 rounded-sm uppercase"
          >
            {ind}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const now = Date.now();
  const diffH = Math.floor((now - d.getTime()) / 3_600_000);
  if (diffH < 1) return 'JUST NOW';
  if (diffH < 24) return `${diffH}H AGO`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}D AGO`;
  return d.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function SignalsPage() {
  const [activeTiers, setActiveTiers] = useState<Set<PriorityTier>>(
    new Set(ALL_TIERS),
  );
  const [domainFilter, setDomainFilter] = useState<string>('ALL');

  /* ---- live data state ---- */
  const [liveSignals, setLiveSignals] = useState<PrioritizedSignal[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /* ---- fetch live signals ---- */
  const fetchLive = useCallback(async () => {
    setLiveLoading(true);
    setLiveError(null);
    try {
      const res = await fetch('/api/intel-signals');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: IntelSignalsResponse = await res.json();
      if (!data.ok) throw new Error(data.message ?? 'Signal engine returned error');
      if (data.signals && data.signals.length > 0) {
        const converted = data.signals.map(signalFindingToPrioritized);
        setLiveSignals(converted);
      }
      setLastUpdated(new Date());
    } catch (err) {
      setLiveError(err instanceof Error ? err.message : 'Failed to fetch live signals');
    } finally {
      setLiveLoading(false);
    }
  }, []);

  useEffect(() => { fetchLive(); }, [fetchLive]);

  /* ---- merge: live signals above static fallback ---- */
  const allSignals = useMemo(() => {
    // Deduplicate by id (live takes precedence)
    const liveIds = new Set(liveSignals.map((s) => s.id));
    const dedupedStatic = PRIORITIZED_SIGNALS.filter((s) => !liveIds.has(s.id));
    return [...liveSignals, ...dedupedStatic];
  }, [liveSignals]);

  /* ---- domain list derived from merged signals ---- */
  const allDomains = useMemo(() => {
    return Array.from(new Set(allSignals.map((s) => s.domain))).sort();
  }, [allSignals]);

  /* ---- toggle tier ---- */
  function toggleTier(tier: PriorityTier) {
    setActiveTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) {
        if (next.size > 1) next.delete(tier); // keep at least one
      } else {
        next.add(tier);
      }
      return next;
    });
  }

  /* ---- filtered + sorted signals ---- */
  const filtered = useMemo(() => {
    return allSignals
      .filter((s) => activeTiers.has(s.priority.tier))
      .filter((s) => domainFilter === 'ALL' || s.domain === domainFilter)
      .sort((a, b) => b.priority.score - a.priority.score);
  }, [activeTiers, domainFilter, allSignals]);

  /* ---- distribution counts ---- */
  const distribution = useMemo(() => {
    const counts: Record<PriorityTier, number> = {
      'P0-CRITICAL': 0,
      'P1-HIGH': 0,
      'P2-MEDIUM': 0,
      'P3-LOW': 0,
    };
    for (const s of allSignals) {
      counts[s.priority.tier]++;
    }
    return counts;
  }, [allSignals]);

  const maxCount = Math.max(...Object.values(distribution), 1);

  /* ---- live signal id set for badge rendering ---- */
  const liveIdSet = useMemo(() => new Set(liveSignals.map((s) => s.id)), [liveSignals]);

  return (
    <div className="bg-black min-h-screen font-mono text-white">
      <PageTopBar
        backHref="/map"
        backLabel="MAP"
        breadcrumbs={[{ label: 'SIGNAL FEED' }]}
        showLiveDot
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Title block */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-[14px] sm:text-[16px] tracking-[0.3em] text-white/90 font-semibold">
              SIGNAL FEED
            </h1>
            {/* LIVE indicator */}
            {liveSignals.length > 0 && !liveLoading && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-[#00ff88]/10 border border-[#00ff88]/30">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#00ff88]"
                  style={{ boxShadow: '0 0 6px #00ff88cc', animation: 'pulse 2s infinite' }}
                />
                <span className="text-[7px] tracking-[0.25em] text-[#00ff88]">LIVE</span>
              </span>
            )}
            {/* Loading indicator */}
            {liveLoading && (
              <span className="text-[7px] tracking-[0.2em] text-white/30 animate-pulse">
                FETCHING LIVE DATA...
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-[9px] tracking-[0.2em] text-white/30">
              PRIORITIZED INTELLIGENCE SIGNALS RANKED BY IMPACT
            </p>
            {/* Last updated */}
            {lastUpdated && (
              <span className="text-[7px] tracking-[0.15em] text-white/20">
                UPDATED {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
          {/* Subtle error notice */}
          {liveError && (
            <div className="mt-2 flex items-center gap-2 px-2 py-1 bg-[#f97316]/8 border border-[#f97316]/20 rounded-sm">
              <span className="text-[7px] tracking-[0.15em] text-[#f97316]/70">
                LIVE FEED UNAVAILABLE — {liveError.toUpperCase()} — SHOWING CACHED SIGNALS
              </span>
              <button
                onClick={fetchLive}
                className="text-[7px] tracking-[0.2em] text-[#00d4ff]/60 hover:text-[#00d4ff] transition-colors"
              >
                RETRY
              </button>
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {ALL_TIERS.map((tier) => {
            const active = activeTiers.has(tier);
            const color = getPriorityColor(tier);
            return (
              <button
                key={tier}
                onClick={() => toggleTier(tier)}
                className="font-mono text-[8px] tracking-[0.2em] px-2 py-1 rounded-sm border transition-all"
                style={{
                  color: active ? color : 'rgba(255,255,255,0.2)',
                  borderColor: active ? `${color}60` : 'rgba(255,255,255,0.06)',
                  backgroundColor: active
                    ? tier === 'P3-LOW'
                      ? 'rgba(255,255,255,0.04)'
                      : `${color}10`
                    : 'transparent',
                }}
              >
                {TIER_LABELS[tier]}
              </button>
            );
          })}

          <div className="h-4 w-px bg-white/10 mx-1" />

          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="font-mono text-[8px] tracking-[0.15em] bg-black border border-white/[0.08] text-white/50 rounded-sm px-2 py-1 outline-none focus:border-[#00d4ff]/40"
          >
            <option value="ALL">ALL DOMAINS</option>
            {allDomains.map((d) => (
              <option key={d} value={d}>
                {d.toUpperCase()}
              </option>
            ))}
          </select>

          <span className="font-mono text-[7px] tracking-[0.2em] text-white/20 ml-auto">
            {filtered.length} / {allSignals.length} SIGNALS
            {liveSignals.length > 0 && (
              <span className="text-[#00ff88]/50 ml-2">
                ({liveSignals.length} LIVE)
              </span>
            )}
          </span>
        </div>

        {/* Main content: cards + sidebar */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Signal list */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {filtered.length === 0 && (
              <div className="text-center py-12 text-[9px] tracking-[0.2em] text-white/20">
                NO SIGNALS MATCH CURRENT FILTERS
              </div>
            )}
            {filtered.map((signal) => (
              <SignalCard key={signal.id} signal={signal} isLive={liveIdSet.has(signal.id)} />
            ))}
          </div>

          {/* Sidebar: Priority Distribution */}
          <div className="lg:w-56 shrink-0">
            <div className="lg:sticky lg:top-16 bg-black/60 border border-white/[0.06] rounded-sm p-4">
              <h2 className="text-[8px] tracking-[0.25em] text-white/40 mb-4 uppercase">
                Priority Distribution
              </h2>

              <div className="flex flex-col gap-3">
                {ALL_TIERS.map((tier) => {
                  const count = distribution[tier];
                  const color = getPriorityColor(tier);
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={tier}>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-[8px] tracking-[0.2em] font-mono"
                          style={{ color }}
                        >
                          {TIER_LABELS[tier]}
                        </span>
                        <span className="text-[9px] font-mono text-white/50">{count}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-white/[0.06]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[7px] tracking-[0.2em] text-white/30">TOTAL</span>
                  <span className="text-[10px] font-mono text-white/60">
                    {allSignals.length}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[7px] tracking-[0.2em] text-white/30">LIVE</span>
                  <span className="text-[10px] font-mono text-[#00ff88]/60">
                    {liveSignals.length}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[7px] tracking-[0.2em] text-white/30">STATIC</span>
                  <span className="text-[10px] font-mono text-white/40">
                    {PRIORITIZED_SIGNALS.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[7px] tracking-[0.2em] text-white/30">AVG SCORE</span>
                  <span className="text-[10px] font-mono text-white/60">
                    {allSignals.length > 0
                      ? Math.round(
                          allSignals.reduce((s, x) => s + x.priority.score, 0) /
                            allSignals.length,
                        )
                      : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
