// @ts-nocheck
'use client';

// src/app/trajectory/page.tsx
// Human Trajectory — What is humanity building right now?
// OBSERVER_05-style page tracking the discoveries, breakthroughs, and
// technologies that will change what it means to be human.

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { PageTransition } from '@/components/PageTransition';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Signal {
  id: string;
  title: string;
  evidence: string | null;
  source: string | null;
  industry: string | null;
  importance_score: number | null;
  discovered_at: string;
  url: string | null;
  signal_type: string | null;
  company: string | null;
  region: string | null;
  global_significance: number | null;
  why_now: string | null;
}

interface Discovery {
  id: string;
  title: string;
  summary: string | null;
  discovery_type: string;
  source_url: string | null;
  source_name: string | null;
  research_institution: string | null;
  country_id: string | null;
  published_at: string | null;
  iker_impact_score: number | null;
}

// ─── Sector Node Data ──────────────────────────────────────────────────────────

const TRAJECTORY_SECTORS = [
  {
    id: 'renewable-energy',
    label: 'Renewable',
    emoji: '☀️',
    color: '#F97316',
    stat: 'Fusion ignition achieved',
    industry: 'renewable-energy',
  },
  {
    id: 'agriculture',
    label: 'Agriculture',
    emoji: '🌾',
    color: '#84CC16',
    stat: 'Lab meat 80% cheaper',
    industry: 'agriculture',
  },
  {
    id: 'life-sciences',
    label: 'Life Sciences',
    emoji: '🧬',
    color: '#EC4899',
    stat: 'CRISPR treats 12 diseases',
    industry: 'life-sciences',
  },
  {
    id: 'climate-tech',
    label: 'Climate',
    emoji: '🌍',
    color: '#14B8A6',
    stat: 'DAC captures 1M tons',
    industry: 'climate-tech',
  },
  {
    id: 'quantum',
    label: 'Quantum',
    emoji: '⚛️',
    color: '#A78BFA',
    stat: '1000-qubit processor',
    industry: 'quantum',
  },
  {
    id: 'neural-tech',
    label: 'Neural',
    emoji: '🧠',
    color: '#F472B6',
    stat: 'BCI restores movement',
    industry: 'neural-tech',
  },
  {
    id: 'synthetic-bio',
    label: 'Synth Bio',
    emoji: '🔬',
    color: '#34D399',
    stat: 'Carbon-eating bacteria',
    industry: 'synthetic-bio',
  },
  {
    id: 'space',
    label: 'Space',
    emoji: '🚀',
    color: '#60A5FA',
    stat: 'Moon base construction',
    industry: 'space',
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function relTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function displayScore(score: number | null): number {
  if (!score) return 0;
  return Math.round(score <= 1 ? score * 100 : score);
}

function regionFlag(region: string | null | undefined): string {
  if (!region) return '🌍';
  const r = region.toLowerCase();
  if (r.includes('united states') || r === 'us') return '🇺🇸';
  if (r.includes('china')) return '🇨🇳';
  if (r.includes('europe') || r.includes('germany') || r.includes('uk')) return '🇪🇺';
  if (r.includes('israel')) return '🇮🇱';
  if (r.includes('india')) return '🇮🇳';
  if (r.includes('south korea') || r.includes('korea')) return '🇰🇷';
  if (r.includes('japan')) return '🇯🇵';
  return '🌍';
}

function sourceName(source: string | null): string {
  if (!source) return 'Unknown';
  try {
    const hostname = new URL(source).hostname.replace('www.', '');
    const known: Record<string, string> = {
      'news.google.com': 'Google News',
      'nature.com': 'Nature',
      'science.org': 'Science',
      'arxiv.org': 'arXiv',
      'cell.com': 'Cell',
    };
    return known[hostname] ?? hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
  } catch {
    return source.slice(0, 24);
  }
}

// ─── SVG Node Map ──────────────────────────────────────────────────────────────

function TrajectoryNodeMap({
  activeSector,
  onSelectSector,
}: {
  activeSector: string | null;
  onSelectSector: (id: string | null) => void;
}) {
  const width = 500;
  const height = 420;
  const cx = width / 2;
  const cy = height / 2;
  const radius = 160;

  const nodePositions = TRAJECTORY_SECTORS.map((s, i) => {
    const angle = (i / TRAJECTORY_SECTORS.length) * 2 * Math.PI - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      sector: s,
    };
  });

  return (
    <div className="flex items-center justify-center w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-[500px]"
        style={{ maxHeight: 420 }}
        aria-label="Human Trajectory Node Map"
      >
        {/* Outer ring */}
        <circle
          cx={cx}
          cy={cy}
          r={radius + 16}
          fill="none"
          stroke="rgba(14,165,233,0.06)"
          strokeWidth={1}
          strokeDasharray="3 6"
        />

        {/* Connection lines from center to each node */}
        {nodePositions.map(({ x, y, sector }) => {
          const isActive = activeSector === sector.id;
          return (
            <line
              key={`line-${sector.id}`}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke={isActive ? sector.color : '#0EA5E9'}
              strokeOpacity={isActive ? 0.6 : 0.18}
              strokeWidth={isActive ? 1.5 : 1}
              strokeDasharray="4 4"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="-8"
                dur={`${1.2 + Math.random() * 0.8}s`}
                repeatCount="indefinite"
              />
            </line>
          );
        })}

        {/* Center Earth node */}
        <circle
          cx={cx}
          cy={cy}
          r={44}
          fill="rgba(14,165,233,0.06)"
          stroke="#0EA5E9"
          strokeWidth={1.5}
        />
        <circle
          cx={cx}
          cy={cy}
          r={36}
          fill="rgba(14,165,233,0.04)"
          stroke="rgba(14,165,233,0.3)"
          strokeWidth={0.5}
        />
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fill="white"
          fontSize={11}
          fontWeight="bold"
          fontFamily="monospace"
        >
          EARTH
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          fill="#0EA5E9"
          fontSize={9}
          fontFamily="monospace"
        >
          2026
        </text>

        {/* Outer sector nodes */}
        {nodePositions.map(({ x, y, sector }) => {
          const isActive = activeSector === sector.id;
          return (
            <g
              key={sector.id}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectSector(isActive ? null : sector.id)}
            >
              {/* Glow ring when active */}
              {isActive && (
                <circle
                  cx={x}
                  cy={y}
                  r={36}
                  fill="none"
                  stroke={sector.color}
                  strokeOpacity={0.25}
                  strokeWidth={8}
                />
              )}

              {/* Node circle */}
              <circle
                cx={x}
                cy={y}
                r={28}
                fill={`${sector.color}${isActive ? '20' : '0D'}`}
                stroke={sector.color}
                strokeWidth={isActive ? 2 : 1.2}
              />

              {/* Emoji */}
              <text
                x={x}
                y={y - 4}
                textAnchor="middle"
                fontSize={16}
                dominantBaseline="middle"
              >
                {sector.emoji}
              </text>

              {/* Label */}
              <text
                x={x}
                y={y + 16}
                textAnchor="middle"
                fill={isActive ? 'white' : 'rgba(255,255,255,0.7)'}
                fontSize={7.5}
                fontFamily="monospace"
                letterSpacing="0.06em"
              >
                {sector.label.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Breakthrough Card ─────────────────────────────────────────────────────────

function BreakthroughCard({ signal }: { signal: Signal }) {
  const score = displayScore(signal.importance_score);
  const globalSig = displayScore(signal.global_significance);

  const sector = TRAJECTORY_SECTORS.find(
    (s) => s.industry === signal.industry || s.id === signal.industry
  );
  const color = sector?.color ?? '#0EA5E9';
  const emoji = sector?.emoji ?? '🌐';

  return (
    <a
      href={signal.url ?? '#'}
      target={signal.url ? '_blank' : undefined}
      rel="noopener noreferrer"
      className="block rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-lg"
      style={{ borderLeftWidth: 3, borderLeftColor: color }}
    >
      <div className="flex items-start gap-4">
        {/* Score box */}
        <div
          className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border text-center"
          style={{ color, background: `${color}14`, borderColor: `${color}24` }}
        >
          <span className="text-lg font-bold font-mono leading-none">{score}</span>
          <span className="text-[9px] uppercase tracking-[0.16em]">Impact</span>
        </div>

        <div className="min-w-0 flex-1">
          {/* Badges */}
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{ background: `${color}18`, color }}
            >
              {emoji} {sector?.label ?? signal.industry?.replace(/-/g, ' ') ?? 'Research'}
            </span>
            {signal.global_significance && globalSig >= 50 && (
              <span className="rounded-full bg-[rgba(14,165,233,0.12)] px-2.5 py-0.5 text-[11px] text-[#38bdf8]">
                Global {globalSig}
              </span>
            )}
            {signal.region && (
              <span className="text-sm" title={signal.region}>
                {regionFlag(signal.region)}
              </span>
            )}
            <span className="ml-auto font-mono text-[11px] text-nxt-dim">
              {relTime(signal.discovered_at)}
            </span>
          </div>

          <div className="text-[15px] font-semibold leading-snug text-nxt-text">
            {signal.title}
          </div>

          {signal.evidence && (
            <p className="mt-2 text-[12px] leading-5 text-nxt-muted line-clamp-2">
              {signal.evidence}
            </p>
          )}

          {signal.why_now && (
            <div className="mt-3 rounded-xl bg-[rgba(14,165,233,0.06)] px-3 py-2">
              <span className="text-[10px] uppercase tracking-[0.14em] text-[#0EA5E9]">
                What this changes:{' '}
              </span>
              <span className="text-[11px] text-nxt-secondary">{signal.why_now}</span>
            </div>
          )}

          {(signal.company || signal.source) && (
            <div className="mt-2 flex gap-2 text-[11px] text-nxt-dim">
              {signal.company && <span>{signal.company}</span>}
              {signal.source && <span>· {sourceName(signal.source)}</span>}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

// ─── Discovery Card ────────────────────────────────────────────────────────────

function DiscoveryCard({ discovery }: { discovery: Discovery }) {
  const score = displayScore(discovery.iker_impact_score);
  return (
    <a
      href={discovery.source_url ?? '#'}
      target={discovery.source_url ? '_blank' : undefined}
      rel="noopener noreferrer"
      className="block rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="rounded-full bg-[rgba(14,165,233,0.12)] px-2.5 py-0.5 text-[11px] text-[#38bdf8]">
          {discovery.discovery_type}
        </span>
        {score > 0 && (
          <span className="rounded-full bg-nxt-card px-2 py-0.5 font-mono text-[11px] text-nxt-secondary">
            {score} impact
          </span>
        )}
        {discovery.country_id && (
          <span className="text-sm">{regionFlag(discovery.country_id)}</span>
        )}
        {discovery.published_at && (
          <span className="ml-auto font-mono text-[11px] text-nxt-dim">
            {relTime(discovery.published_at)}
          </span>
        )}
      </div>
      <div className="text-[13px] font-medium leading-snug text-nxt-text">{discovery.title}</div>
      {discovery.summary && (
        <p className="mt-1.5 text-[11px] leading-5 text-nxt-muted line-clamp-2">
          {discovery.summary}
        </p>
      )}
      {discovery.research_institution && (
        <div className="mt-2 text-[11px] text-nxt-dim">{discovery.research_institution}</div>
      )}
    </a>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TrajectoryPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  // Counter for header
  const breakthroughCount = signals.filter(
    (s) => displayScore(s.importance_score) >= 70
  ).length;

  // Fetch signals
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const industryList = TRAJECTORY_SECTORS.map((s) => s.industry).join(',');
      const params = new URLSearchParams({
        industry: activeSector ?? 'ALL',
        tab: 'high',
        page: '0',
        page_size: '40',
        min_score: '60',
      });

      const [signalRes, discoveryRes] = await Promise.allSettled([
        fetch(`/api/intel/feed?${params.toString()}`),
        fetch(`/api/discoveries?page=0&page_size=20&discovery_type=breakthrough`),
      ]);

      if (signalRes.status === 'fulfilled' && signalRes.value.ok) {
        const json = await signalRes.value.json();
        const all: Signal[] = json.signals ?? [];
        // Filter to trajectory sectors
        const earth = all.filter((s) => {
          if (!s.industry) return false;
          return TRAJECTORY_SECTORS.some(
            (ts) => ts.industry === s.industry || ts.id === s.industry
          );
        });
        setSignals(earth);
      }

      if (discoveryRes.status === 'fulfilled' && discoveryRes.value.ok) {
        const json = await discoveryRes.value.json();
        setDiscoveries(json.discoveries ?? []);
      }
    } catch (err) {
      console.error('[trajectory] fetch error:', err);
      setError('Failed to load trajectory data');
    } finally {
      setLoading(false);
    }
  }, [activeSector]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter signals by active sector
  const filteredSignals = signals.filter((s) => {
    if (activeSector) {
      const ts = TRAJECTORY_SECTORS.find((t) => t.id === activeSector);
      return s.industry === ts?.industry || s.industry === activeSector;
    }
    return true;
  });

  // Tab filter
  const tabSectors =
    activeTab === 'all'
      ? TRAJECTORY_SECTORS
      : TRAJECTORY_SECTORS.filter((s) => s.id === activeTab);

  return (
    <PageTransition>
      <div className="min-h-screen bg-nxt-bg">
        <div className="mx-auto max-w-[1160px] px-6 py-10 pb-24">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <section className="mb-10 border-b border-[rgba(138,160,255,0.10)] pb-10">
            <p className="section-kicker mb-3">Earth Tracker</p>
            <h1 className="max-w-[820px] text-[clamp(2.4rem,5vw,4.4rem)] font-bold leading-[0.95] tracking-[-0.04em] text-nxt-text">
              Human Trajectory
            </h1>
            <p className="mt-4 max-w-[680px] text-base leading-7 text-nxt-secondary">
              The discoveries, breakthroughs, and technologies that will change
              what it means to be human.
            </p>

            {/* Stats row */}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 rounded-full border border-[rgba(14,165,233,0.20)] bg-[rgba(14,165,233,0.06)] px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-[#0EA5E9] live-pulse" />
                <span className="font-mono text-[12px] text-[#38bdf8]">
                  {loading ? '...' : breakthroughCount} breakthroughs tracked this week
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-[rgba(132,204,22,0.16)] bg-[rgba(132,204,22,0.06)] px-4 py-2">
                <span className="font-mono text-[12px] text-[#a3e635]">
                  8 sectors monitored globally
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-nxt-border bg-nxt-surface px-4 py-2">
                <span className="font-mono text-[12px] text-nxt-secondary">
                  {discoveries.length} discoveries indexed
                </span>
              </div>
            </div>
          </section>

          {/* ── Node Map ────────────────────────────────────────────────────── */}
          <section className="mb-10">
            <div className="rounded-[28px] border border-[rgba(14,165,233,0.12)] bg-[rgba(7,12,22,0.86)] p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-nxt-dim">
                    Interactive Node Map
                  </div>
                  <div className="mt-1 text-sm text-nxt-secondary">
                    Click a node to filter signals by sector
                  </div>
                </div>
                {activeSector && (
                  <button
                    onClick={() => setActiveSector(null)}
                    className="rounded-full border border-nxt-border px-3 py-1.5 text-xs text-nxt-muted transition-colors hover:text-nxt-text"
                  >
                    Clear filter
                  </button>
                )}
              </div>

              <TrajectoryNodeMap
                activeSector={activeSector}
                onSelectSector={setActiveSector}
              />

              {/* Sector stat pills */}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {TRAJECTORY_SECTORS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSector(activeSector === s.id ? null : s.id)}
                    className="rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all"
                    style={{
                      borderColor:
                        activeSector === s.id ? `${s.color}40` : 'rgba(138,160,255,0.12)',
                      background:
                        activeSector === s.id ? `${s.color}14` : 'transparent',
                      color: activeSector === s.id ? s.color : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {s.emoji} {s.stat}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── Sector Tabs ──────────────────────────────────────────────────── */}
          <section className="mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setActiveTab('all'); setActiveSector(null); }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  activeTab === 'all'
                    ? 'border-[#0EA5E9]/30 bg-[#0EA5E9]/10 text-[#38bdf8]'
                    : 'border-nxt-border text-nxt-muted'
                }`}
              >
                🌐 All Sectors
              </button>
              {TRAJECTORY_SECTORS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setActiveTab(s.id); setActiveSector(s.id); }}
                  className="rounded-full border px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    borderColor:
                      activeTab === s.id ? `${s.color}40` : 'rgba(138,160,255,0.12)',
                    background: activeTab === s.id ? `${s.color}14` : 'transparent',
                    color: activeTab === s.id ? s.color : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </section>

          {/* ── Main Content Grid ─────────────────────────────────────────────── */}
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">

            {/* Left: Breakthrough Feed */}
            <section>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-lg font-bold text-nxt-text">
                  Breakthrough Signals
                </h2>
                <span className="rounded-full bg-nxt-card px-2.5 py-0.5 font-mono text-[11px] text-nxt-dim">
                  {filteredSignals.length} signals
                </span>
                <span className="text-[11px] text-nxt-dim">
                  impact ≥ 60
                </span>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="h-28 rounded-2xl border border-nxt-border bg-nxt-surface shimmer"
                    />
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center gap-4 py-16 text-center">
                  <div className="text-sm text-nxt-muted">{error}</div>
                  <button
                    onClick={fetchData}
                    className="rounded-lg border border-[#0EA5E9]/20 px-5 py-2 text-sm text-[#38bdf8]"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredSignals.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-20 text-center">
                  <div className="text-4xl">🔭</div>
                  <div className="text-sm text-nxt-dim">
                    No breakthrough signals found for this sector yet.
                    <br />
                    Intelligence is being collected in real time.
                  </div>
                  <Link
                    href="/intel"
                    className="rounded-full border border-nxt-border px-4 py-2 text-sm text-nxt-secondary hover:text-nxt-text"
                  >
                    Browse all signals →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSignals.map((signal) => (
                    <BreakthroughCard key={signal.id} signal={signal} />
                  ))}
                </div>
              )}
            </section>

            {/* Right: Discoveries + Sector Details */}
            <aside className="space-y-6">
              {/* Discoveries Panel */}
              <div className="rounded-[22px] border border-[rgba(14,165,233,0.12)] bg-[rgba(7,12,22,0.86)] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-nxt-dim">
                    Recent Discoveries
                  </div>
                  <Link
                    href="/discoveries"
                    className="text-[11px] text-[#0EA5E9] hover:underline"
                  >
                    View all →
                  </Link>
                </div>
                {discoveries.length === 0 && !loading ? (
                  <div className="text-center py-6 text-[12px] text-nxt-dim">
                    No discoveries loaded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {discoveries.slice(0, 8).map((d) => (
                      <DiscoveryCard key={d.id} discovery={d} />
                    ))}
                  </div>
                )}
              </div>

              {/* Active Sector Detail */}
              {activeSector && (() => {
                const s = TRAJECTORY_SECTORS.find((t) => t.id === activeSector);
                if (!s) return null;
                const sectorSignals = signals.filter(
                  (sig) => sig.industry === s.industry || sig.industry === s.id
                );
                return (
                  <div
                    className="rounded-[22px] border p-5"
                    style={{
                      borderColor: `${s.color}25`,
                      background: `${s.color}08`,
                    }}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-2xl">{s.emoji}</span>
                      <div>
                        <div className="font-bold text-nxt-text">{s.label}</div>
                        <div className="text-[11px] text-nxt-dim">
                          {sectorSignals.length} signals tracked
                        </div>
                      </div>
                    </div>
                    <div className="text-[12px] leading-5 text-nxt-secondary">
                      {s.stat}
                    </div>
                    <Link
                      href={`/intel?industry=${s.industry}`}
                      className="mt-3 block text-center rounded-xl border border-nxt-border py-2 text-[12px] text-nxt-secondary hover:text-nxt-text transition-colors"
                    >
                      All {s.label} signals →
                    </Link>
                  </div>
                );
              })()}

              {/* Sector Index */}
              <div className="rounded-[22px] border border-nxt-border bg-nxt-surface p-5">
                <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-nxt-dim">
                  Sector Index
                </div>
                <div className="space-y-2">
                  {TRAJECTORY_SECTORS.map((s) => {
                    const count = signals.filter(
                      (sig) => sig.industry === s.industry || sig.industry === s.id
                    ).length;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActiveSector(activeSector === s.id ? null : s.id)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-nxt-elevated"
                      >
                        <div className="flex items-center gap-2">
                          <span>{s.emoji}</span>
                          <span className="text-[13px] text-nxt-secondary">{s.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-1.5 w-16 overflow-hidden rounded-full bg-nxt-card"
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, count * 5)}%`,
                                background: s.color,
                              }}
                            />
                          </div>
                          <span className="w-6 text-right font-mono text-[11px] text-nxt-dim">
                            {count}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick links */}
              <div className="rounded-[22px] border border-nxt-border bg-nxt-surface p-5">
                <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-nxt-dim">
                  Explore More
                </div>
                <div className="space-y-2">
                  {[
                    { href: '/intel', label: '🔍 All Intelligence Signals' },
                    { href: '/discoveries', label: '⚡ Research Discoveries' },
                    { href: '/industry', label: '🏭 Industry Deep Dives' },
                    { href: '/map', label: '🗺️ Global Activity Map' },
                  ].map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center justify-between rounded-xl px-3 py-2 text-[13px] text-nxt-secondary transition-colors hover:bg-nxt-elevated hover:text-nxt-text"
                    >
                      {label}
                      <span className="text-nxt-dim">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
