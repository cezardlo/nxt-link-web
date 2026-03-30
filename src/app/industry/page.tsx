'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { COLORS } from '@/lib/tokens';

const SIGNAL_TYPE_COLORS: Record<string, { label: string; color: string }> = {
  market_shift:       { label: 'Market Shift',     color: COLORS.amber },
  technology:         { label: 'Technology',        color: COLORS.cyan },
  funding:            { label: 'Funding',           color: COLORS.green },
  funding_round:      { label: 'Funding Round',     color: COLORS.emerald },
  merger_acquisition: { label: 'M&A',              color: COLORS.purple },
  facility_expansion: { label: 'Expansion',         color: COLORS.gold },
  partnership:        { label: 'Partnership',        color: '#60a5fa' },
  regulation:         { label: 'Regulation',         color: COLORS.orange },
  contract_award:     { label: 'Contract',           color: COLORS.green },
  patent_filing:      { label: 'Patent',             color: COLORS.cyan },
  product_launch:     { label: 'Launch',             color: COLORS.orange },
  market_expansion:   { label: 'Expansion',          color: COLORS.emerald },
  discovery:          { label: 'Discovery',          color: '#ec4899' },
  connection:         { label: 'Connection',         color: '#8b5cf6' },
};

const INDUSTRIES = [
  { id: 'manufacturing', label: 'Manufacturing' },
  { id: 'logistics', label: 'Logistics' },
];

interface TypeBreakdown { type: string; count: number; total_usd: number; avg_importance: number; }
interface Cluster { id: string; label: string; signal_type: string; signal_count: number; composite_rank: number; total_usd: number; }
interface Company { name: string; signals: number; total_usd: number; types: string[]; }
interface Signal { id: string; title: string; signal_type: string; source: string; company: string; amount_usd: number; importance_score: number; discovered_at: string; }
interface DailyVolume { date: string; count: number; }
interface TendencyPoint { cluster_id: string; date: string; trend_score: number; trend_label: string; }

interface IndustryData {
  industry: string;
  total_signals: number;
  total_investment: number;
  type_breakdown: TypeBreakdown[];
  daily_volume: DailyVolume[];
  clusters: Cluster[];
  top_companies: Company[];
  recent_signals: Signal[];
  tendency: TendencyPoint[];
}

function formatUSD(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function VolumeChart({ data }: { data: DailyVolume[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const max = Math.max(...data.map(d => d.count), 1);
    const barW = (w - (data.length - 1) * 2) / data.length;

    ctx.clearRect(0, 0, w, h);

    data.forEach((d, i) => {
      const barH = (d.count / max) * (h - 20);
      const x = i * (barW + 2);
      const y = h - barH - 16;

      const grad = ctx.createLinearGradient(x, y, x, h - 16);
      grad.addColorStop(0, COLORS.accent + 'cc');
      grad.addColorStop(1, COLORS.accent + '33');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, 2);
      ctx.fill();

      if (i % 3 === 0) {
        ctx.fillStyle = COLORS.dim;
        ctx.font = "9px 'IBM Plex Mono', monospace";
        ctx.textAlign = 'center';
        ctx.fillText(d.date.slice(5), x + barW / 2, h - 2);
      }
    });
  }, [data]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: 120 }} />;
}

function TypeBar({ breakdown }: { breakdown: TypeBreakdown[] }) {
  const total = breakdown.reduce((s, b) => s + b.count, 0);
  if (total === 0) return null;

  return (
    <div>
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-4">
        {breakdown.map((b) => {
          const info = SIGNAL_TYPE_COLORS[b.type] || { label: b.type, color: COLORS.dim };
          const pct = (b.count / total) * 100;
          if (pct < 1) return null;
          return (
            <div
              key={b.type}
              style={{ width: `${pct}%`, background: info.color }}
              title={`${info.label}: ${b.count}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {breakdown.slice(0, 8).map((b) => {
          const info = SIGNAL_TYPE_COLORS[b.type] || { label: b.type, color: COLORS.dim };
          const pct = ((b.count / total) * 100).toFixed(0);
          return (
            <div key={b.type} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: info.color }} />
                <span className="text-xs text-nxt-secondary truncate">{info.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono font-semibold text-nxt-text">{b.count}</span>
                <span className="text-[10px] font-mono text-nxt-dim">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function IndustryPage() {
  const [activeIndustry, setActiveIndustry] = useState('manufacturing');
  const [data, setData] = useState<IndustryData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (industry: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/industry?industry=${industry}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch industry data:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(activeIndustry); }, [activeIndustry, fetchData]);

  return (
    <div className="min-h-screen">
      <div className="max-w-[1000px] mx-auto px-6 py-10 pb-20">

        {/* Header */}
        <div className="mb-6 slide-up">
          <h1 className="text-xl font-semibold text-nxt-text mb-1">Industry Intelligence</h1>
          <p className="text-sm text-nxt-muted">
            Signal activity, investment tracking, and market trends by industry.
          </p>
        </div>

        {/* Industry tabs */}
        <div className="flex items-center gap-2 mb-8">
          {INDUSTRIES.map((ind) => (
            <button
              key={ind.id}
              onClick={() => setActiveIndustry(ind.id)}
              className={`text-sm font-medium px-5 py-2 rounded-lg border transition-all duration-150 ${
                activeIndustry === ind.id
                  ? 'bg-nxt-accent/10 text-nxt-accent-light border-nxt-accent/20'
                  : 'text-nxt-muted border-nxt-border hover:text-nxt-secondary hover:border-nxt-muted'
              }`}
            >
              {ind.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-nxt-surface border border-nxt-border rounded-nxt-md p-6">
                <div className="h-3 w-32 rounded bg-nxt-card shimmer mb-4" />
                <div className="h-8 w-48 rounded bg-nxt-card shimmer" />
              </div>
            ))}
          </div>
        ) : data ? (
          <div className="space-y-5">

            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 slide-up">
              {[
                { label: 'Total Signals', sublabel: 'Last 90 days', value: data.total_signals.toLocaleString(), color: COLORS.accent },
                { label: 'Investment Tracked', sublabel: 'Across all signals', value: data.total_investment > 0 ? formatUSD(data.total_investment) : '—', color: COLORS.green },
                { label: 'Market Themes', sublabel: 'Active clusters', value: String(data.clusters.length), color: COLORS.amber },
                { label: 'Companies', sublabel: 'Most mentioned', value: String(data.top_companies.length), color: COLORS.purple },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="bg-nxt-surface border border-nxt-border rounded-nxt-md p-4"
                >
                  <div className="text-[11px] text-nxt-muted mb-1">{stat.label}</div>
                  <div className="text-2xl font-bold font-mono" style={{ color: stat.color }}>
                    {stat.value}
                  </div>
                  <div className="text-[10px] text-nxt-dim mt-1">{stat.sublabel}</div>
                </div>
              ))}
            </div>

            {/* Volume + Signal types */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Volume chart */}
              <div className="bg-nxt-surface border border-nxt-border rounded-nxt-md p-5">
                <h3 className="text-sm font-semibold text-nxt-text mb-1">Signal Volume</h3>
                <p className="text-[11px] text-nxt-dim mb-4">Daily signal count over the last 14 days</p>
                <VolumeChart data={data.daily_volume} />
              </div>

              {/* Signal type breakdown */}
              <div className="bg-nxt-surface border border-nxt-border rounded-nxt-md p-5">
                <h3 className="text-sm font-semibold text-nxt-text mb-1">Signal Types</h3>
                <p className="text-[11px] text-nxt-dim mb-4">What kinds of signals are being detected</p>
                <TypeBar breakdown={data.type_breakdown} />
              </div>
            </div>

            {/* Market themes (clusters) */}
            <div className="bg-nxt-surface border border-nxt-border rounded-nxt-md p-5">
              <h3 className="text-sm font-semibold text-nxt-text mb-1">Market Themes</h3>
              <p className="text-[11px] text-nxt-dim mb-4">
                Groups of related signals forming trends — shows what topics are gaining or losing momentum
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.clusters.map((c) => {
                  const trendPoints = data.tendency.filter(t => t.cluster_id === c.id);
                  const latest = trendPoints.length > 0 ? trendPoints[trendPoints.length - 1] : null;
                  const trendLabel = latest?.trend_label || 'stable';
                  const trendColor = trendLabel === 'spiking' ? COLORS.red
                    : trendLabel === 'growing' ? COLORS.green
                    : trendLabel === 'declining' ? COLORS.amber
                    : COLORS.dim;
                  const typeInfo = SIGNAL_TYPE_COLORS[c.signal_type] || { label: c.signal_type, color: COLORS.dim };

                  return (
                    <div
                      key={c.id}
                      className="bg-nxt-card border border-nxt-border-subtle rounded-lg p-4"
                      style={{ borderLeftWidth: 3, borderLeftColor: typeInfo.color }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="text-[13px] font-medium text-nxt-text leading-snug">{c.label}</div>
                        <span
                          className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded uppercase shrink-0"
                          style={{ background: trendColor + '18', color: trendColor }}
                        >
                          {trendLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-nxt-dim">Signals </span>
                          <span className="font-mono font-semibold text-nxt-accent">{c.signal_count}</span>
                        </div>
                        {c.total_usd > 0 && (
                          <div>
                            <span className="text-nxt-dim">Value </span>
                            <span className="font-mono font-semibold text-nxt-green">{formatUSD(c.total_usd)}</span>
                          </div>
                        )}
                      </div>

                      {/* Mini trend sparkline */}
                      {trendPoints.length > 3 && (
                        <div className="flex items-end gap-[2px] mt-3 h-5">
                          {trendPoints.slice(-10).map((tp, j) => {
                            const absMax = Math.max(...trendPoints.slice(-10).map(t => Math.abs(t.trend_score)), 0.1);
                            const h = Math.max(2, (Math.abs(tp.trend_score) / absMax) * 18);
                            return (
                              <div
                                key={j}
                                className="rounded-sm"
                                style={{
                                  width: 4, height: h,
                                  background: tp.trend_score >= 0 ? COLORS.green + '70' : COLORS.red + '70',
                                }}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Companies + Recent signals */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Top companies */}
              <div className="bg-nxt-surface border border-nxt-border rounded-nxt-md p-5">
                <h3 className="text-sm font-semibold text-nxt-text mb-1">Top Companies</h3>
                <p className="text-[11px] text-nxt-dim mb-4">Most frequently mentioned in signals</p>
                {data.top_companies.length === 0 ? (
                  <div className="text-xs text-nxt-dim text-center py-8">No company data yet</div>
                ) : (
                  <div className="space-y-1">
                    {data.top_companies.map((co, i) => (
                      <div key={co.name} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-nxt-card transition-colors">
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-mono font-bold"
                          style={{ background: COLORS.accent + '14', color: COLORS.accent }}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-nxt-text truncate">{co.name}</div>
                          <div className="text-[10px] text-nxt-dim">
                            {co.types.map(t => {
                              const info = SIGNAL_TYPE_COLORS[t];
                              return info ? info.label : t.replace(/_/g, ' ');
                            }).join(', ')}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono font-semibold text-nxt-accent">{co.signals}</div>
                          {co.total_usd > 0 && (
                            <div className="text-[10px] font-mono text-nxt-green">{formatUSD(co.total_usd)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent signals */}
              <div className="lg:col-span-2 bg-nxt-surface border border-nxt-border rounded-nxt-md p-5">
                <h3 className="text-sm font-semibold text-nxt-text mb-1">Recent Signals</h3>
                <p className="text-[11px] text-nxt-dim mb-4">Latest intelligence signals in {activeIndustry}</p>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {data.recent_signals.map((sig) => {
                    const info = SIGNAL_TYPE_COLORS[sig.signal_type] || { label: sig.signal_type, color: COLORS.dim };
                    return (
                      <div
                        key={sig.id}
                        className="p-3 rounded-lg bg-nxt-card border border-nxt-border-subtle card-hover"
                        style={{ borderLeftWidth: 3, borderLeftColor: info.color }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded uppercase"
                            style={{ background: info.color + '18', color: info.color }}
                          >
                            {info.label}
                          </span>
                          {sig.amount_usd > 0 && (
                            <span className="text-[10px] font-mono font-semibold text-nxt-green">
                              {formatUSD(sig.amount_usd)}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-nxt-dim ml-auto">{timeAgo(sig.discovered_at)}</span>
                        </div>
                        <div className="text-[13px] text-nxt-text leading-snug mb-1">{sig.title}</div>
                        <div className="flex items-center gap-3 text-[10px] text-nxt-dim">
                          <span>{sig.source}</span>
                          {sig.company && <span className="text-nxt-muted">{sig.company}</span>}
                          {sig.importance_score > 0 && (
                            <span
                              className="font-mono font-semibold ml-auto"
                              style={{ color: sig.importance_score > 70 ? COLORS.green : COLORS.dim }}
                            >
                              {sig.importance_score.toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
