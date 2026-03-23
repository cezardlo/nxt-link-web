'use client';

import { useState, useMemo } from 'react';
import { COLORS } from '@/lib/tokens';
import { getSignalSeverity, getSeverityColor } from '@/lib/signal-severity';

// ─── Types ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SignalData = Record<string, any>;

interface LiveSignalsProps {
  signals: SignalData[];
  accentColor: string;
}

type SignalType = 'ALL' | 'P0' | 'P1' | 'CONTRACTS' | 'PATENTS' | 'FUNDING' | 'POLICY' | 'RESEARCH';
type TimeFilter = '1H' | '6H' | '24H' | '7D' | 'ALL';
type ViewMode = 'LIST' | 'THREADS';

interface SignalThread {
  company: string;
  signals: SignalData[];
  latestTimestamp: string;
}

const TIME_FILTER_MS: Record<TimeFilter, number> = {
  '1H': 60 * 60 * 1000,
  '6H': 6 * 60 * 60 * 1000,
  '24H': 24 * 60 * 60 * 1000,
  '7D': 7 * 24 * 60 * 60 * 1000,
  'ALL': Infinity,
};

/** Parse relative time strings like "2h ago", "5m", "1d ago" to ms-ago value */
function parseRelativeToMs(ts: string): number | null {
  const match = ts.match(/^(\d+)([mhd])\s*(ago)?$/i);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit === 'm') return val * 60 * 1000;
  if (unit === 'h') return val * 60 * 60 * 1000;
  if (unit === 'd') return val * 24 * 60 * 60 * 1000;
  return null;
}

/** Get milliseconds-ago for a signal timestamp */
function getSignalAgeMs(ts: string): number {
  if (!ts) return Infinity;
  // Relative format
  const rel = parseRelativeToMs(ts);
  if (rel !== null) return rel;
  // ISO date
  const diff = Date.now() - new Date(ts).getTime();
  return isNaN(diff) ? Infinity : diff;
}

const SIGNAL_TYPE_COLORS: Record<string, string> = {
  contracts: COLORS.green,
  contract: COLORS.green,
  patents: COLORS.cyan,
  patent: COLORS.cyan,
  funding: COLORS.gold,
  policy: COLORS.orange,
  research: `${COLORS.text}4d`,
  default: `${COLORS.text}33`,
};

function getTypeColor(type: string): string {
  const key = type.toLowerCase();
  return SIGNAL_TYPE_COLORS[key] ?? SIGNAL_TYPE_COLORS.default;
}

function relativeTime(ts: string): string {
  if (!ts) return '';
  // Already relative (e.g. "2h ago")
  if (/\d+[mhd]\s*ago/i.test(ts) || /^\d+[mhd]$/.test(ts)) return ts;
  const diff = Date.now() - new Date(ts).getTime();
  if (isNaN(diff)) return ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

/** Generate mock signals when API returns nothing */
function generateMockSignals(): SignalData[] {
  return [
    {
      id: 'mock-1',
      title: 'New defense procurement framework announced for autonomous systems',
      type: 'POLICY',
      source: 'Federal Register',
      timestamp: '2h ago',
      importance: 4,
    },
    {
      id: 'mock-2',
      title: 'Series C funding round closed for AI-powered logistics startup',
      type: 'FUNDING',
      source: 'Crunchbase',
      timestamp: '5h ago',
      importance: 3,
    },
    {
      id: 'mock-3',
      title: 'Patent filed for next-gen sensor fusion in autonomous vehicles',
      type: 'PATENTS',
      source: 'USPTO',
      timestamp: '1d ago',
      importance: 4,
    },
    {
      id: 'mock-4',
      title: 'Major defense contractor awarded $450M systems integration contract',
      type: 'CONTRACTS',
      source: 'DoD Contracts',
      timestamp: '1d ago',
      importance: 5,
    },
    {
      id: 'mock-5',
      title: 'University research consortium publishes breakthrough findings',
      type: 'RESEARCH',
      source: 'arXiv',
      timestamp: '2d ago',
      importance: 3,
    },
    {
      id: 'mock-6',
      title: 'Cross-border technology transfer agreement signed between allies',
      type: 'POLICY',
      source: 'Reuters',
      timestamp: '3d ago',
      importance: 4,
    },
    {
      id: 'mock-7',
      title: 'Startup accelerator announces new cohort focused on dual-use tech',
      type: 'FUNDING',
      source: 'TechCrunch',
      timestamp: '4d ago',
      importance: 2,
    },
    {
      id: 'mock-8',
      title: 'New testing facility for advanced materials opens in Texas',
      type: 'CONTRACTS',
      source: 'Industry Wire',
      timestamp: '5d ago',
      importance: 3,
    },
  ];
}

// ─── Component ──────────────────────────────────────────────────────────────

export function LiveSignals({ signals, accentColor }: LiveSignalsProps) {
  const [filter, setFilter] = useState<SignalType>('ALL');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [visibleCount, setVisibleCount] = useState(10);

  // Use real signals or fall back to mock
  const allSignals = useMemo(() => {
    if (signals && signals.length > 0) return signals;
    return generateMockSignals();
  }, [signals]);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return allSignals;
    // Tier filters
    if (filter === 'P0') return allSignals.filter((s: SignalData) => {
      const imp = typeof s.importance === 'number' ? (s.importance <= 1 ? s.importance * 5 : s.importance) : 3;
      return imp >= 5;
    });
    if (filter === 'P1') return allSignals.filter((s: SignalData) => {
      const imp = typeof s.importance === 'number' ? (s.importance <= 1 ? s.importance * 5 : s.importance) : 3;
      return imp >= 4;
    });
    return allSignals.filter((s: SignalData) => {
      const sType = (s.type ?? s.category ?? '').toUpperCase();
      return sType.includes(filter) || filter.startsWith(sType);
    });
  }, [allSignals, filter]);

  // Apply time filter on top of type filter
  const timeFiltered = useMemo(() => {
    if (timeFilter === 'ALL') return filtered;
    const maxAge = TIME_FILTER_MS[timeFilter];
    return filtered.filter((s: SignalData) => {
      const ts = s.timestamp ?? s.discovered_at ?? '';
      return getSignalAgeMs(ts) <= maxAge;
    });
  }, [filtered, timeFilter]);

  // Group signals into threads by company name
  const threads = useMemo((): SignalThread[] => {
    const map = new Map<string, SignalData[]>();
    const uncategorized: SignalData[] = [];

    for (const s of timeFiltered) {
      const company = (s.company ?? '').trim();
      if (!company) {
        uncategorized.push(s);
        continue;
      }
      const key = company.toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }

    const result: SignalThread[] = [];
    for (const [, signals] of map) {
      const companyName = signals[0].company;
      const latest = signals.reduce((best: string, s: SignalData) => {
        const ts = s.timestamp ?? s.discovered_at ?? '';
        if (!best) return ts;
        return getSignalAgeMs(ts) < getSignalAgeMs(best) ? ts : best;
      }, '');
      result.push({ company: companyName, signals, latestTimestamp: latest });
    }

    // Sort threads by most recent signal
    result.sort((a, b) => getSignalAgeMs(a.latestTimestamp) - getSignalAgeMs(b.latestTimestamp));

    if (uncategorized.length > 0) {
      result.push({ company: 'Uncategorized', signals: uncategorized, latestTimestamp: '' });
    }

    return result;
  }, [timeFiltered]);

  const visible = timeFiltered.slice(0, visibleCount);

  const filterOptions: SignalType[] = [
    'ALL', 'P0', 'P1', 'CONTRACTS', 'FUNDING', 'PATENTS', 'POLICY', 'RESEARCH',
  ];

  return (
    <section>
      {/* ── Section header with live dot ──────────────────────────────── */}
      <div className="flex items-center gap-2 mb-1">
        {/* Pulsing green dot */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: COLORS.green }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ background: COLORS.green }}
          />
        </span>
        <span
          className="font-mono text-[10px] tracking-[0.2em] uppercase"
          style={{ color: `${COLORS.text}cc` }}
        >
          LIVE SIGNALS
        </span>
      </div>

      {/* ── Filter pills + view toggle ────────────────────────────────── */}
      <div className="flex gap-1.5 mt-3 mb-2 overflow-x-auto pb-1 items-center">
        {filterOptions.map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setVisibleCount(10);
            }}
            className="font-mono text-[7px] tracking-[0.12em] px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0"
            style={{
              background:
                filter === f
                  ? f === 'ALL'
                    ? `${accentColor}1a`
                    : `${getTypeColor(f.toLowerCase())}1a`
                  : `${COLORS.text}08`,
              color:
                filter === f
                  ? f === 'ALL'
                    ? accentColor
                    : getTypeColor(f.toLowerCase())
                  : `${COLORS.text}40`,
              border: `1px solid ${
                filter === f
                  ? f === 'ALL'
                    ? `${accentColor}33`
                    : `${getTypeColor(f.toLowerCase())}33`
                  : COLORS.border
              }`,
            }}
          >
            {f}
          </button>
        ))}

        {/* Separator */}
        <span className="shrink-0 w-px h-4 mx-1" style={{ background: COLORS.border }} />

        {/* View mode toggle */}
        {(['LIST', 'THREADS'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className="font-mono text-[7px] tracking-[0.12em] px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0"
            style={{
              background: viewMode === mode ? `${accentColor}1a` : `${COLORS.text}08`,
              color: viewMode === mode ? accentColor : `${COLORS.text}40`,
              border: `1px solid ${viewMode === mode ? `${accentColor}33` : COLORS.border}`,
            }}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* ── Time filter row ──────────────────────────────────────────── */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {(['1H', '6H', '24H', '7D', 'ALL'] as TimeFilter[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTimeFilter(t);
              setVisibleCount(10);
            }}
            className="font-mono text-[7px] tracking-[0.12em] px-2 py-0.5 rounded transition-all cursor-pointer shrink-0"
            style={{
              background: timeFilter === t ? `${COLORS.text}14` : 'transparent',
              color: timeFilter === t ? `${COLORS.text}cc` : `${COLORS.text}33`,
              border: `1px solid ${timeFilter === t ? `${COLORS.text}22` : 'transparent'}`,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Signal rows ──────────────────────────────────────────────── */}
      {timeFiltered.length === 0 ? (
        <div
          className="font-mono text-[9px] text-center py-8"
          style={{ color: `${COLORS.text}33` }}
        >
          No signals matching filter
        </div>
      ) : viewMode === 'THREADS' ? (
        /* ── Threads view ─────────────────────────────────────────── */
        <div className="space-y-3">
          {threads.map((thread) => (
            <div key={thread.company} className="space-y-0">
              {/* Thread header */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-t-lg font-mono"
                style={{ background: `${COLORS.text}08` }}
              >
                <span
                  className="text-[9px] font-bold tracking-[0.08em]"
                  style={{ color: thread.company === 'Uncategorized' ? `${COLORS.text}44` : `${COLORS.text}cc` }}
                >
                  {thread.company}
                </span>
                <span
                  className="text-[7px] px-1.5 py-0.5 rounded-full"
                  style={{ background: `${accentColor}1a`, color: accentColor }}
                >
                  {thread.signals.length}
                </span>
                {thread.latestTimestamp && (
                  <span
                    className="text-[7px] tabular-nums ml-auto"
                    style={{ color: `${COLORS.text}33` }}
                  >
                    {relativeTime(thread.latestTimestamp)}
                  </span>
                )}
              </div>
              {/* Thread signals with connecting line */}
              <div className="relative pl-4">
                {/* Vertical connecting line */}
                <div
                  className="absolute left-[11px] top-0 bottom-0 w-px"
                  style={{ background: `${COLORS.text}15` }}
                />
                <div className="space-y-0.5">
                  {thread.signals.map((signal: SignalData, idx: number) => {
                    const type = (signal.type ?? signal.category ?? 'unknown').toUpperCase();
                    const typeColor = getTypeColor(type.toLowerCase());
                    const rawImp = typeof signal.importance === 'number' ? signal.importance : 3;
                    const timestamp = relativeTime(signal.timestamp ?? signal.discovered_at ?? '');
                    const title = signal.title ?? signal.summary ?? '';
                    const tier = getSignalSeverity(String(signal.type ?? signal.signal_type ?? ''), rawImp <= 1 ? rawImp : rawImp / 5);
                    const tierColor = getSeverityColor(tier);
                    const tierBg = tier === 'P0' ? `${COLORS.red}08` : tier === 'P1' ? `${COLORS.orange}05` : 'transparent';

                    return (
                      <div
                        key={signal.id ?? idx}
                        className={`flex items-center gap-3 px-3 py-1.5 rounded-lg font-mono transition-colors${tier === 'P0' ? ' animate-pulse' : ''}`}
                        style={{ background: tierBg, borderLeft: `2px solid ${tierColor}` }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = `${tierColor}12`)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = tierBg)}
                      >
                        <span className="text-[7px] font-bold shrink-0 w-5 text-center" style={{ color: tierColor }}>{tier}</span>
                        <span className="text-[8px] tabular-nums shrink-0" style={{ color: `${COLORS.text}26`, minWidth: 28 }}>{timestamp}</span>
                        <span className="text-[10px] truncate flex-1 min-w-0" style={{ color: tier === 'P0' ? `${COLORS.text}dd` : tier === 'P1' ? `${COLORS.text}bb` : `${COLORS.text}88` }}>{title}</span>
                        <span className="text-[7px] px-2 py-0.5 rounded-full shrink-0 tracking-[0.1em]" style={{ background: `${typeColor}1a`, color: typeColor, border: `1px solid ${typeColor}33` }}>{type}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Flat list view (original) ────────────────────────────── */
        <div className="space-y-0.5">
          {visible.map((signal: SignalData, idx: number) => {
            const type = (signal.type ?? signal.category ?? 'unknown').toUpperCase();
            const typeColor = getTypeColor(type.toLowerCase());
            const rawImp = typeof signal.importance === 'number' ? signal.importance : 3;
            // Normalize: API returns 0-1, but dots expect 1-5
            const importance = rawImp <= 1
              ? Math.round(rawImp * 5)
              : signal.severity === 'critical' ? 5
              : signal.severity === 'high' ? 4
              : signal.severity === 'medium' ? 3
              : signal.severity === 'low' ? 2
              : Math.min(5, Math.round(rawImp));
            const timestamp = relativeTime(signal.timestamp ?? signal.discovered_at ?? '');
            const source = signal.source ?? '';
            const title = signal.title ?? signal.summary ?? '';

            // Severity tier
            const tier = importance >= 5 ? 'P0' : importance >= 4 ? 'P1' : importance >= 3 ? 'P2' : 'P3';
            const tierColor = tier === 'P0' ? COLORS.red : tier === 'P1' ? COLORS.orange : tier === 'P2' ? COLORS.cyan : COLORS.dim;
            const tierBg = tier === 'P0' ? `${COLORS.red}08` : tier === 'P1' ? `${COLORS.orange}05` : 'transparent';

            return (
              <div
                key={signal.id ?? idx}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg font-mono transition-colors${tier === 'P0' ? ' animate-pulse' : ''}`}
                style={{
                  background: tierBg,
                  borderLeft: `2px solid ${tierColor}`,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = `${tierColor}12`)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = tierBg)
                }
              >
                {/* Tier badge */}
                <span
                  className="text-[7px] font-bold shrink-0 w-5 text-center"
                  style={{ color: tierColor }}
                >
                  {tier}
                </span>

                {/* Timestamp */}
                <span
                  className="text-[8px] tabular-nums shrink-0"
                  style={{ color: `${COLORS.text}26`, minWidth: 28 }}
                >
                  {timestamp}
                </span>

                {/* Title */}
                <span
                  className="text-[10px] truncate flex-1 min-w-0"
                  style={{ color: tier === 'P0' ? `${COLORS.text}dd` : tier === 'P1' ? `${COLORS.text}bb` : `${COLORS.text}88` }}
                >
                  {title}
                </span>

                {/* Type badge */}
                <span
                  className="text-[7px] px-2 py-0.5 rounded-full shrink-0 tracking-[0.1em]"
                  style={{
                    background: `${typeColor}1a`,
                    color: typeColor,
                    border: `1px solid ${typeColor}33`,
                  }}
                >
                  {type}
                </span>

                {/* Importance dots */}
                <div className="flex gap-0.5 shrink-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className="block w-1 h-1 rounded-full"
                      style={{
                        background:
                          i < importance ? accentColor : `${COLORS.text}1a`,
                      }}
                    />
                  ))}
                </div>

                {/* Source */}
                <span
                  className="text-[7px] shrink-0 hidden sm:block"
                  style={{ color: `${COLORS.text}1a`, minWidth: 50, textAlign: 'right' }}
                >
                  {source}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Load more ────────────────────────────────────────────────── */}
      {viewMode === 'LIST' && timeFiltered.length > visibleCount && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setVisibleCount((v) => v + 10)}
            className="font-mono text-[9px] tracking-[0.15em] px-4 py-2 rounded-full transition-colors cursor-pointer"
            style={{
              color: `${COLORS.text}66`,
              background: `${COLORS.text}08`,
              border: `1px solid ${COLORS.border}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${COLORS.text}14`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${COLORS.text}08`;
            }}
          >
            Load more
          </button>
        </div>
      )}
    </section>
  );
}
