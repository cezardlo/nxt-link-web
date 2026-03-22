'use client';

import { useState, useMemo } from 'react';
import { COLORS } from '@/lib/tokens';

// ─── Types ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SignalData = Record<string, any>;

interface LiveSignalsProps {
  signals: SignalData[];
  accentColor: string;
}

type SignalType = 'ALL' | 'CONTRACTS' | 'PATENTS' | 'FUNDING' | 'POLICY' | 'RESEARCH';

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
  const [visibleCount, setVisibleCount] = useState(10);

  // Use real signals or fall back to mock
  const allSignals = useMemo(() => {
    if (signals && signals.length > 0) return signals;
    return generateMockSignals();
  }, [signals]);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return allSignals;
    return allSignals.filter((s: SignalData) => {
      const sType = (s.type ?? s.category ?? '').toUpperCase();
      return sType.includes(filter) || filter.startsWith(sType);
    });
  }, [allSignals, filter]);

  const visible = filtered.slice(0, visibleCount);

  const filterOptions: SignalType[] = [
    'ALL', 'CONTRACTS', 'PATENTS', 'FUNDING', 'POLICY', 'RESEARCH',
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

      {/* ── Filter pills ─────────────────────────────────────────────── */}
      <div className="flex gap-1.5 mt-3 mb-5 overflow-x-auto pb-1">
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
      </div>

      {/* ── Signal rows ──────────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <div
          className="font-mono text-[9px] text-center py-8"
          style={{ color: `${COLORS.text}33` }}
        >
          No signals matching filter
        </div>
      ) : (
        <div className="space-y-0.5">
          {visible.map((signal: SignalData, idx: number) => {
            const type = (signal.type ?? signal.category ?? 'unknown').toUpperCase();
            const typeColor = getTypeColor(type.toLowerCase());
            const importance = signal.importance ?? signal.severity === 'critical'
              ? 5
              : signal.severity === 'high'
                ? 4
                : signal.severity === 'medium'
                  ? 3
                  : signal.severity === 'low'
                    ? 2
                    : typeof signal.importance === 'number'
                      ? signal.importance
                      : 3;
            const timestamp = signal.timestamp ?? '';
            const source = signal.source ?? '';
            const title = signal.title ?? signal.summary ?? '';

            return (
              <div
                key={signal.id ?? idx}
                className="flex items-center gap-3 px-3 py-2 rounded-lg font-mono transition-colors"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = `${COLORS.text}06`)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                {/* Timestamp */}
                <span
                  className="text-[8px] tabular-nums shrink-0"
                  style={{ color: `${COLORS.text}26`, minWidth: 40 }}
                >
                  {timestamp}
                </span>

                {/* Title */}
                <span
                  className="text-[10px] truncate flex-1 min-w-0"
                  style={{ color: `${COLORS.text}99` }}
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
      {filtered.length > visibleCount && (
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
