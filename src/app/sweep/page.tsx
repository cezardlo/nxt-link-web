'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { COLORS } from '@/lib/tokens';
import { BottomNav } from '@/components/ui';

// ─── Grid Data ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  'TMS',
  'WMS',
  'Last-Mile',
  'Fleet',
  'Freight Brokerage',
  'Cold Chain',
  'Customs/Trade',
  'Yard Mgmt',
  'Visibility',
  'Returns/Reverse',
] as const;

type Region = {
  name: string;
  countries: string[];
};

const REGIONS: Region[] = [
  { name: 'Americas', countries: ['USA', 'Canada', 'Mexico', 'Brazil', 'Colombia', 'Chile'] },
  { name: 'EMEA', countries: ['UK', 'Germany', 'Netherlands', 'France', 'Israel', 'UAE', 'South Africa'] },
  { name: 'APAC', countries: ['China', 'India', 'Japan', 'Singapore', 'Australia', 'Indonesia'] },
  { name: 'Emerging', countries: ['Vietnam', 'Kenya', 'Nigeria', 'Poland'] },
];

const TOTAL_CELLS = CATEGORIES.length * REGIONS.length;

// ─── Types ──────────────────────────────────────────────────────────────────

type SweepHit = {
  name: string;
  hq: string;
  product: string;
  stage: string;
  signal: string;
  signalDetail: string;
  url: string;
  confidence: number;
};

type CellKey = `${string}::${string}`;
type CellState = {
  status: 'empty' | 'scanning' | 'done' | 'error';
  hits: SweepHit[];
  scannedAt: string | null;
};

// ─── Signal Colors ──────────────────────────────────────────────────────────

const SIGNAL_COLORS: Record<string, string> = {
  funding: COLORS.gold,
  acquisition: COLORS.red,
  product_launch: COLORS.cyan,
  expansion: COLORS.green,
  contract: COLORS.orange,
  none: COLORS.dim,
};

const SIGNAL_ICONS: Record<string, string> = {
  funding: '●',
  acquisition: '●',
  product_launch: '●',
  expansion: '●',
  contract: '●',
  none: '·',
};

// ─── SessionStorage persistence ─────────────────────────────────────────────

const STORAGE_KEY = 'nxtlink-sweep-data';

function loadSweepData(): Record<CellKey, CellState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveSweepData(data: Record<CellKey, CellState>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded */ }
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function SweepRadar() {
  const [cells, setCells] = useState<Record<CellKey, CellState>>({});
  const [selectedCell, setSelectedCell] = useState<CellKey | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterRegion, setFilterRegion] = useState<string>('ALL');
  const [sweepingAll, setSweepingAll] = useState(false);

  // Load from sessionStorage on mount
  useEffect(() => {
    setCells(loadSweepData());
  }, []);

  // Save on change
  useEffect(() => {
    if (Object.keys(cells).length > 0) saveSweepData(cells);
  }, [cells]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const allHits = Object.values(cells).flatMap(c => c.hits);
    const scannedCount = Object.values(cells).filter(c => c.status === 'done').length;
    const newCompanies = allHits.filter(h => h.confidence >= 0.5).length;
    const signals = allHits.filter(h => h.signal !== 'none');
    const fundingCount = signals.filter(h => h.signal === 'funding').length;
    const acquisitionCount = signals.filter(h => h.signal === 'acquisition').length;
    return { total: allHits.length, scannedCount, newCompanies, signals: signals.length, fundingCount, acquisitionCount };
  }, [cells]);

  // ── Sweep a single cell ───────────────────────────────────────────────────

  const sweepCell = useCallback(async (category: string, region: Region) => {
    const key: CellKey = `${category}::${region.name}`;

    setCells(prev => ({
      ...prev,
      [key]: { status: 'scanning', hits: prev[key]?.hits ?? [], scannedAt: prev[key]?.scannedAt ?? null },
    }));

    try {
      const res = await fetch('/api/sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, region: region.name, countries: region.countries }),
      });

      if (!res.ok) throw new Error('Sweep failed');
      const data = await res.json();

      const allHits: SweepHit[] = [];
      if (data.results) {
        for (const r of data.results) {
          allHits.push(...(r.hits ?? []));
        }
      }

      // Merge with existing (deduplicate by name)
      setCells(prev => {
        const existing = prev[key]?.hits ?? [];
        const existingNames = new Set(existing.map(h => h.name.toLowerCase()));
        const newHits = allHits.filter(h => !existingNames.has(h.name.toLowerCase()));
        return {
          ...prev,
          [key]: {
            status: 'done',
            hits: [...existing, ...newHits],
            scannedAt: new Date().toISOString(),
          },
        };
      });
    } catch {
      setCells(prev => ({
        ...prev,
        [key]: { ...prev[key], status: 'error' },
      }));
    }
  }, []);

  // ── Sweep all cells sequentially ──────────────────────────────────────────

  const sweepAll = useCallback(async () => {
    setSweepingAll(true);
    for (const cat of CATEGORIES) {
      for (const region of REGIONS) {
        const key: CellKey = `${cat}::${region.name}`;
        if (cells[key]?.status === 'done') continue; // skip already scanned
        await sweepCell(cat, region);
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 500));
      }
    }
    setSweepingAll(false);
  }, [cells, sweepCell]);

  // ── Cell renderer ─────────────────────────────────────────────────────────

  function getCell(category: string, region: Region): CellState {
    const key: CellKey = `${category}::${region.name}`;
    return cells[key] ?? { status: 'empty', hits: [], scannedAt: null };
  }

  function cellColor(cell: CellState): string {
    if (cell.status === 'scanning') return COLORS.cyan;
    if (cell.status === 'error') return COLORS.red;
    if (cell.status === 'done' && cell.hits.length > 0) return COLORS.green;
    if (cell.status === 'done') return COLORS.dim;
    return `${COLORS.text}15`;
  }

  // ── Recent signals across all cells ───────────────────────────────────────

  const recentSignals = useMemo(() => {
    return Object.values(cells)
      .flatMap(c => c.hits)
      .filter(h => h.signal !== 'none')
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);
  }, [cells]);

  // ── Selected cell detail ──────────────────────────────────────────────────

  const selectedData = selectedCell ? cells[selectedCell] : null;
  const [selCat, selRegion] = selectedCell?.split('::') ?? ['', ''];

  return (
    <div className="min-h-screen pb-24" style={{ background: COLORS.bg, color: COLORS.text, fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace" }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-[11px] tracking-[0.25em] font-bold" style={{ color: COLORS.orange, textDecoration: 'none' }}>
            NXT<span style={{ color: COLORS.dim }}>{'//'}</span>LINK
          </Link>
          <span className="text-[9px] tracking-[0.2em]" style={{ color: `${COLORS.text}30` }}>/ SWEEP RADAR</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[9px] tabular-nums" style={{ color: `${COLORS.text}40` }}>
            {stats.total} vendors | {stats.scannedCount}/{TOTAL_CELLS} cells
          </span>
          {stats.signals > 0 && (
            <span className="text-[9px] tabular-nums" style={{ color: COLORS.gold }}>
              {stats.signals} signals
            </span>
          )}
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 animate-fade-up">
        {/* ── Matrix Grid ──────────────────────────────────────────────── */}
        <div className="overflow-x-auto pb-4">
          <table className="w-full border-collapse" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th className="text-left py-2 px-2" style={{ width: 120 }}>
                  <span className="text-[7px] tracking-[0.2em] uppercase" style={{ color: `${COLORS.text}30` }}>
                    CATEGORY
                  </span>
                </th>
                {REGIONS.map(r => (
                  <th key={r.name} className="text-center py-2 px-1">
                    <span className="text-[7px] tracking-[0.15em] uppercase" style={{ color: `${COLORS.text}40` }}>
                      {r.name}
                    </span>
                    <div className="text-[6px] mt-0.5" style={{ color: `${COLORS.text}20` }}>
                      {r.countries.length} countries
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map(cat => (
                <tr key={cat}>
                  <td className="py-1 px-2">
                    <span className="text-[8px] tracking-[0.1em]" style={{ color: `${COLORS.text}66` }}>
                      {cat}
                    </span>
                  </td>
                  {REGIONS.map(region => {
                    const cell = getCell(cat, region);
                    const key: CellKey = `${cat}::${region.name}`;
                    const isSelected = selectedCell === key;
                    const hitCount = cell.hits.length;
                    const signalCount = cell.hits.filter(h => h.signal !== 'none').length;
                    const color = cellColor(cell);

                    return (
                      <td key={region.name} className="py-1 px-1">
                        <button
                          onClick={() => {
                            if (cell.status === 'empty' || cell.status === 'error') {
                              sweepCell(cat, region);
                            }
                            setSelectedCell(isSelected ? null : key);
                          }}
                          className="w-full transition-all cursor-pointer"
                          style={{
                            height: 44,
                            background: isSelected ? `${color}18` : `${COLORS.text}04`,
                            border: `1px solid ${isSelected ? `${color}44` : `${COLORS.text}0a`}`,
                            borderRadius: 8,
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = `${color}33`;
                            e.currentTarget.style.background = `${color}0d`;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = isSelected ? `${color}44` : `${COLORS.text}0a`;
                            e.currentTarget.style.background = isSelected ? `${color}18` : `${COLORS.text}04`;
                          }}
                        >
                          {/* Scanning animation */}
                          {cell.status === 'scanning' && (
                            <div
                              className="absolute inset-0"
                              style={{
                                background: `linear-gradient(90deg, transparent 0%, ${COLORS.cyan}15 50%, transparent 100%)`,
                                animation: 'sweep-scan 1.5s ease-in-out infinite',
                              }}
                            />
                          )}

                          {/* Content */}
                          <div className="relative flex items-center justify-center gap-1.5">
                            {cell.status === 'empty' && (
                              <span className="text-[7px]" style={{ color: `${COLORS.text}20` }}>—</span>
                            )}
                            {cell.status === 'scanning' && (
                              <span className="text-[7px] tracking-[0.1em]" style={{ color: COLORS.cyan }}>
                                SCANNING
                              </span>
                            )}
                            {cell.status === 'error' && (
                              <span className="text-[7px]" style={{ color: COLORS.red }}>ERR</span>
                            )}
                            {cell.status === 'done' && (
                              <>
                                <span className="text-[10px] font-bold tabular-nums" style={{ color }}>
                                  {hitCount}
                                </span>
                                {signalCount > 0 && (
                                  <span className="text-[7px]" style={{ color: COLORS.gold }}>
                                    +{signalCount}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Sweep Controls ───────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between gap-4 py-3 px-4 mb-6"
          style={{ background: COLORS.card, borderRadius: 12, border: `1px solid ${COLORS.border}` }}
        >
          <div className="flex items-center gap-2">
            {/* Category filter */}
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="text-[9px] px-2 py-1.5 rounded-md outline-none"
              style={{
                background: COLORS.bg,
                color: `${COLORS.text}99`,
                border: `1px solid ${COLORS.border}`,
                fontFamily: 'inherit',
              }}
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Region filter */}
            <select
              value={filterRegion}
              onChange={e => setFilterRegion(e.target.value)}
              className="text-[9px] px-2 py-1.5 rounded-md outline-none"
              style={{
                background: COLORS.bg,
                color: `${COLORS.text}99`,
                border: `1px solid ${COLORS.border}`,
                fontFamily: 'inherit',
              }}
            >
              <option value="ALL">All Regions</option>
              {REGIONS.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
            </select>

            {/* Sweep button */}
            <button
              onClick={() => {
                if (filterCategory !== 'ALL' && filterRegion !== 'ALL') {
                  const region = REGIONS.find(r => r.name === filterRegion);
                  if (region) sweepCell(filterCategory, region);
                } else {
                  sweepAll();
                }
              }}
              disabled={sweepingAll}
              className="text-[9px] font-bold tracking-[0.15em] px-4 py-1.5 rounded-md transition-all cursor-pointer disabled:opacity-40"
              style={{
                background: COLORS.orange,
                color: '#000',
                border: 'none',
              }}
            >
              {sweepingAll ? 'SWEEPING...' : 'SWEEP'}
            </button>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-4 text-[8px] tabular-nums" style={{ color: `${COLORS.text}40` }}>
            <span>{stats.total} vendors</span>
            <span>{stats.scannedCount}/{TOTAL_CELLS} cells</span>
            {stats.fundingCount > 0 && <span style={{ color: COLORS.gold }}>{stats.fundingCount} funding</span>}
            {stats.acquisitionCount > 0 && <span style={{ color: COLORS.red }}>{stats.acquisitionCount} acq</span>}
          </div>
        </div>

        {/* ── Two-column: Signal Feed + Cell Detail ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-20">
          {/* Signal Feed */}
          <div
            className="p-4"
            style={{ background: COLORS.card, borderRadius: 16, border: `1px solid ${COLORS.border}` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: COLORS.green }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: COLORS.green }} />
              </span>
              <span className="text-[9px] tracking-[0.2em]" style={{ color: `${COLORS.text}66` }}>SIGNAL FEED</span>
            </div>

            {recentSignals.length === 0 ? (
              <div className="text-[9px] py-6 text-center" style={{ color: `${COLORS.text}25` }}>
                Click a cell or hit SWEEP to start scanning
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentSignals.map((hit, i) => (
                  <a
                    key={i}
                    href={hit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 py-1.5 px-2 rounded-md transition-colors"
                    style={{ textDecoration: 'none', color: COLORS.text }}
                    onMouseEnter={e => e.currentTarget.style.background = `${COLORS.text}06`}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span className="text-[10px] mt-0.5" style={{ color: SIGNAL_COLORS[hit.signal] ?? COLORS.dim }}>
                      {SIGNAL_ICONS[hit.signal] ?? '·'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] truncate" style={{ color: `${COLORS.text}88` }}>
                        {hit.name}
                      </div>
                      <div className="text-[7px] mt-0.5" style={{ color: `${COLORS.text}33` }}>
                        {hit.signal.toUpperCase().replace('_', ' ')} · {hit.hq} · {hit.stage}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Cell Detail */}
          <div
            className="p-4"
            style={{ background: COLORS.card, borderRadius: 16, border: `1px solid ${COLORS.border}` }}
          >
            {!selectedCell || !selectedData ? (
              <div className="text-[9px] py-6 text-center" style={{ color: `${COLORS.text}25` }}>
                Click a cell in the grid to see details
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-[10px] font-bold" style={{ color: `${COLORS.text}cc` }}>
                      {selCat}
                    </span>
                    <span className="text-[8px] mx-2" style={{ color: `${COLORS.text}25` }}>×</span>
                    <span className="text-[10px]" style={{ color: `${COLORS.text}88` }}>
                      {selRegion}
                    </span>
                  </div>
                  {selectedData.scannedAt && (
                    <span className="text-[7px]" style={{ color: `${COLORS.text}25` }}>
                      {new Date(selectedData.scannedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                {selectedData.hits.length === 0 ? (
                  <div className="text-[9px] py-4 text-center" style={{ color: `${COLORS.text}25` }}>
                    {selectedData.status === 'scanning' ? 'Scanning...' : 'No companies found'}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {selectedData.hits.map((hit, i) => (
                      <a
                        key={i}
                        href={hit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 py-2 px-2 rounded-md transition-colors"
                        style={{
                          textDecoration: 'none',
                          color: COLORS.text,
                          borderBottom: `1px solid ${COLORS.border}`,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = `${COLORS.text}06`}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span className="text-[8px] mt-0.5" style={{ color: SIGNAL_COLORS[hit.signal] ?? COLORS.dim }}>
                          {SIGNAL_ICONS[hit.signal] ?? '·'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold truncate">{hit.name}</div>
                          <div className="text-[8px] truncate mt-0.5" style={{ color: `${COLORS.text}40` }}>
                            {hit.product}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[7px] tracking-[0.1em]" style={{ color: `${COLORS.text}40` }}>
                            {hit.hq}
                          </div>
                          {hit.stage !== 'unknown' && (
                            <div className="text-[7px] mt-0.5" style={{ color: COLORS.gold }}>
                              {hit.stage.toUpperCase()}
                            </div>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Scanning keyframe ──────────────────────────────────────────── */}
      <style>{`
        @keyframes sweep-scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      <BottomNav />
    </div>
  );
}
