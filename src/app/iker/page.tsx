'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageTopBar } from '@/components/PageTopBar';
import { EmptyState } from '@/components/ui';

type IkerEntry = {
  id: string;
  name: string;
  category: string;
  iker_score: number;
  delta: number;
  trend: 'rising' | 'stable' | 'falling';
  signal_count: number;
};

const CATEGORY_COLORS: Record<string, string> = {
  'Defense Tech':          '#00d4ff',
  'Global Defense':        '#00d4ff',
  'Global AI':             '#a855f7',
  'AI / R&D':              '#a855f7',
  'Global Cybersecurity':  '#ff3b30',
  'Global Robotics':       '#00ff88',
  'Robotics & Automation': '#00ff88',
  'Semiconductor':         '#ffd700',
  'Industrial Automation': '#f97316',
  'Drone & Autonomy':      '#ffb800',
  'Border Tech':           '#00d4ff',
  'Logistics':             '#a855f7',
  'Energy Tech':           '#ffd700',
};

function trendColor(t: string) {
  return t === 'rising' ? '#00ff88' : t === 'falling' ? '#ff3b30' : '#6b7280';
}
function trendIcon(t: string) {
  return t === 'rising' ? '▲' : t === 'falling' ? '▼' : '▶';
}

export default function IkerLeaderboardPage() {
  const [entries, setEntries] = useState<IkerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('ALL');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const url = category === 'ALL'
          ? '/api/iker/leaderboard?limit=100'
          : `/api/iker/leaderboard?limit=100&category=${encodeURIComponent(category)}`;
        const res = await fetch(url);
        const data = await res.json() as { ok: boolean; leaderboard?: IkerEntry[]; source?: string };
        if (data.ok && data.leaderboard) {
          setEntries(data.leaderboard);
          setSource(data.source ?? '');
        }
      } catch { /* keep empty */ }
      setLoading(false);
    }
    void load();
  }, [category]);

  const categories = ['ALL', 'Global Defense', 'Global AI', 'Global Cybersecurity', 'Global Robotics', 'Semiconductor', 'Industrial Automation', 'Drone & Autonomy'];

  const filtered = entries.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden animate-fade-up" style={{ fontFamily: 'var(--font-ibm-plex-mono)' }}>
      <PageTopBar
        backHref="/map"
        backLabel="MAP"
        breadcrumbs={[{ label: 'IKER LEADERBOARD' }]}
        showLiveDot
        rightSlot={
          <span className="font-mono text-[7px] tracking-[0.15em] text-white/30">
            {source === 'supabase+patterns' ? '● LIVE' : '◌ STATIC'}
          </span>
        }
      />

      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06] shrink-0">
        <h1 className="font-mono text-[10px] tracking-[0.3em] text-[#ffd700] mb-1">IKER INTELLIGENCE SCORE LEADERBOARD</h1>
        <p className="font-mono text-[8px] text-white/30 tracking-wide">
          Intelligence · Knowledge · Evidence · Reliability — updated every 6h by the learning agent
        </p>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search company…"
            className="bg-white/[0.04] border border-white/10 rounded-sm px-2 py-1 font-mono text-[8px] text-white/70 placeholder-white/20 outline-none focus:border-[#00d4ff]/30 w-40"
          />
          <div className="flex gap-1 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="font-mono text-[7px] tracking-[0.1em] px-2 py-0.5 rounded-sm border transition-colors"
                style={{
                  borderColor: category === cat ? '#ffd700' : 'rgba(255,255,255,0.08)',
                  color: category === cat ? '#ffd700' : 'rgba(255,255,255,0.3)',
                  backgroundColor: category === cat ? 'rgba(255,215,0,0.06)' : 'transparent',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <span className="font-mono text-[8px] text-white/25 tracking-widest animate-pulse">LOADING IKER SCORES…</span>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-black/95 border-b border-white/[0.06] z-10">
              <tr>
                <th className="font-mono text-[7px] tracking-[0.2em] text-white/25 px-4 py-2 w-12">#</th>
                <th className="font-mono text-[7px] tracking-[0.2em] text-white/25 px-2 py-2">COMPANY</th>
                <th className="font-mono text-[7px] tracking-[0.2em] text-white/25 px-2 py-2">CATEGORY</th>
                <th className="font-mono text-[7px] tracking-[0.2em] text-white/25 px-2 py-2 w-24">IKER SCORE</th>
                <th className="font-mono text-[7px] tracking-[0.2em] text-white/25 px-2 py-2 w-16">DELTA</th>
                <th className="font-mono text-[7px] tracking-[0.2em] text-white/25 px-2 py-2 w-16">TREND</th>
                <th className="font-mono text-[7px] tracking-[0.2em] text-white/25 px-2 py-2 w-16">SIGNALS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => {
                const color = CATEGORY_COLORS[entry.category] ?? '#00d4ff';
                return (
                  <tr
                    key={entry.id}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="font-mono text-[8px] text-white/20 tabular-nums px-4 py-2">
                      {i + 1}
                    </td>
                    <td className="px-2 py-2">
                      <Link
                        href={`/vendor/${entry.id}`}
                        className="font-mono text-[9px] text-white/70 group-hover:text-white transition-colors"
                      >
                        {entry.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className="font-mono text-[7px] tracking-[0.1em] px-1.5 py-0.5 rounded-sm"
                        style={{ color, backgroundColor: `${color}12`, border: `1px solid ${color}20` }}
                      >
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-[3px] bg-white/[0.05] rounded-full overflow-hidden" style={{ width: 60 }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${entry.iker_score}%`,
                              backgroundColor: color,
                              boxShadow: `0 0 4px ${color}60`,
                            }}
                          />
                        </div>
                        <span
                          className="font-mono text-[9px] tabular-nums font-bold"
                          style={{ color }}
                        >
                          {entry.iker_score}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className="font-mono text-[8px] tabular-nums"
                        style={{ color: entry.delta > 0 ? '#00ff88' : entry.delta < 0 ? '#ff3b30' : '#6b7280' }}
                      >
                        {entry.delta > 0 ? `+${entry.delta.toFixed(1)}` : entry.delta !== 0 ? entry.delta.toFixed(1) : '—'}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="font-mono text-[8px]" style={{ color: trendColor(entry.trend) }}>
                        {trendIcon(entry.trend)} {entry.trend.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="font-mono text-[8px] tabular-nums text-white/30">
                        {entry.signal_count > 0 ? entry.signal_count : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="No scoring data"
                      message="No entities match your current filters. Try adjusting the category or search term."
                      linkHref="/map"
                      linkLabel="Back to map"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
