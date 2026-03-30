'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { COLORS } from '@/lib/tokens';

/* --- types --- */
interface RelatedSignal {
  id: string;
  title: string;
  source: string;
  discovered_at: string;
  signal_type: string;
  relevance_score: number;
}

interface TopInsight {
  rank: number;
  title: string;
  what_is_happening: string;
  why_it_matters: string;
  where_its_going: string;
  signal_count: number;
  avg_score: number;
  industry: string;
  signal_type: string;
  related_signals: RelatedSignal[];
}

interface Region {
  name: string;
  total_signals: number;
  risk_level: string;
  opportunity_score: number;
  industries: string[];
  total_investment_usd: number;
}

interface RecentSignal {
  id: string;
  title: string;
  signal_type: string;
  industry: string;
  relevance_score: number;
  discovered_at: string;
  source: string;
}

interface TrendSnapshot {
  cluster_id: string;
  label: string;
  date: string;
  signal_count: number;
  rolling_avg: string;
  velocity: string;
  acceleration: string;
  trend_score: string;
  trend_label: string;
}

interface TrendTimeSeries {
  cluster_id: string;
  label: string;
  points: { date: string; score: number }[];
}

interface BriefingData {
  briefing: {
    generated_at: string;
    total_signals: number;
    top_insights: TopInsight[];
    signal_stats: { by_type: Record<string, number>; by_industry: Record<string, number> };
    regions: Region[];
    recent_signals: RecentSignal[];
    trends?: {
      snapshot: TrendSnapshot[];
      time_series: TrendTimeSeries[];
    };
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* --- Signal type badge color --- */
function signalTypeColor(type: string): string {
  const map: Record<string, string> = {
    contract_award: COLORS.green,
    funding_round: COLORS.purple,
    patent_filing: COLORS.cyan,
    partnership: COLORS.amber,
    product_launch: COLORS.orange,
    regulation: COLORS.red,
    market_expansion: COLORS.emerald,
  };
  return map[type] || COLORS.muted;
}

/* --- Trend Chart --- */
const TREND_COLORS = ['#818cf8', '#22c55e', '#eab308', '#f59e0b', '#ef4444', '#a855f7'];

function TrendChart({ trends }: { trends: { snapshot: TrendSnapshot[]; time_series: TrendTimeSeries[] } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = 200;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const series = trends.time_series;
    if (series.length === 0) return;

    const pad = { top: 16, right: 16, bottom: 28, left: 40 };
    const gw = w - pad.left - pad.right;
    const gh = h - pad.top - pad.bottom;

    const allScores: number[] = [];
    const allDates: string[] = [];
    for (const s of series) {
      for (const p of s.points) {
        allScores.push(p.score);
        if (!allDates.includes(p.date)) allDates.push(p.date);
      }
    }
    allDates.sort();
    const minScore = Math.min(...allScores, -1);
    const maxScore = Math.max(...allScores, 1);
    const range = maxScore - minScore || 1;

    const xScale = (date: string) => pad.left + (allDates.indexOf(date) / Math.max(allDates.length - 1, 1)) * gw;
    const yScale = (score: number) => pad.top + gh - ((score - minScore) / range) * gh;

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * gh;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + gw, y);
      ctx.stroke();
      const val = maxScore - (i / 4) * range;
      ctx.fillStyle = COLORS.dim;
      ctx.font = '10px IBM Plex Mono';
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(1), pad.left - 8, y + 3);
    }

    // Zero line
    if (minScore < 0 && maxScore > 0) {
      const zeroY = yScale(0);
      ctx.strokeStyle = COLORS.muted;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pad.left, zeroY);
      ctx.lineTo(pad.left + gw, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Date labels
    ctx.fillStyle = COLORS.dim;
    ctx.font = '10px IBM Plex Mono';
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(allDates.length / 6));
    for (let i = 0; i < allDates.length; i += step) {
      ctx.fillText(allDates[i].slice(5), xScale(allDates[i]), h - 4);
    }

    // Series lines
    series.forEach((s, idx) => {
      const color = TREND_COLORS[idx % TREND_COLORS.length];
      const pts = s.points;
      if (pts.length < 2) return;

      // Area fill
      ctx.beginPath();
      ctx.moveTo(xScale(pts[0].date), yScale(pts[0].score));
      for (let i = 1; i < pts.length; i++) ctx.lineTo(xScale(pts[i].date), yScale(pts[i].score));
      ctx.lineTo(xScale(pts[pts.length - 1].date), pad.top + gh);
      ctx.lineTo(xScale(pts[0].date), pad.top + gh);
      ctx.closePath();
      ctx.fillStyle = color + '08';
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.moveTo(xScale(pts[0].date), yScale(pts[0].score));
      for (let i = 1; i < pts.length; i++) ctx.lineTo(xScale(pts[i].date), yScale(pts[i].score));
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // End dot
      const last = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(xScale(last.date), yScale(last.score), 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }, [trends]);

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  return (
    <div className="bg-nxt-surface border border-nxt-border rounded-nxt-md p-5 mb-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-nxt-text">Trend Detection</h3>
        <span className="text-[10px] font-mono text-nxt-dim tracking-widest uppercase">14 day window</span>
      </div>
      <div ref={containerRef} className="w-full">
        <canvas ref={canvasRef} />
      </div>
      <div className="flex flex-wrap gap-4 mt-3">
        {trends.time_series.map((s, idx) => (
          <div key={s.cluster_id} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: TREND_COLORS[idx % TREND_COLORS.length] }} />
            <span className="text-xs text-nxt-muted">{s.label.replace(/in (Manufacturing|Logistics)/i, '').trim()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- Loading skeleton --- */
function BriefingSkeleton() {
  return (
    <div className="max-w-[900px] mx-auto px-6 py-10">
      <div className="h-4 w-32 rounded bg-nxt-card shimmer mb-8" />
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-nxt-surface border border-nxt-border rounded-nxt-md p-6 mb-4">
          <div className="h-3 w-48 rounded bg-nxt-card shimmer mb-4" />
          <div className="h-4 w-full rounded bg-nxt-card shimmer mb-3" />
          <div className="h-4 w-3/4 rounded bg-nxt-card shimmer" />
        </div>
      ))}
    </div>
  );
}

/* --- Main Briefing Page --- */
export default function BriefingPage() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        const response = await fetch('/api/briefing');
        if (!response.ok) throw new Error('Failed to fetch briefing');
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchBriefing();
  }, []);

  if (loading) return <BriefingSkeleton />;

  if (error || !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-nxt-red text-sm mb-2">Unable to load briefing</div>
          <div className="text-nxt-muted text-xs">{error}</div>
        </div>
      </div>
    );
  }

  const briefing = data.briefing;
  const insightAccents = [COLORS.accent, COLORS.green, COLORS.amber];

  // Merge regions
  const riskColorMap: Record<string, string> = { critical: '#ef4444', high: '#f97316', elevated: '#f59e0b', moderate: '#eab308', low: '#22c55e' };
  const regionMap: Record<string, { name: string; signal_count: number; risk_level: string; industries: string[] }> = {};
  for (const r of briefing.regions) {
    if (!regionMap[r.name]) {
      regionMap[r.name] = { name: r.name, signal_count: 0, risk_level: r.risk_level || 'low', industries: [] };
    }
    regionMap[r.name].signal_count += r.total_signals;
    for (const ind of (r.industries || [])) {
      if (!regionMap[r.name].industries.includes(ind)) regionMap[r.name].industries.push(ind);
    }
    if (r.risk_level === 'high' || r.risk_level === 'critical') regionMap[r.name].risk_level = r.risk_level;
  }
  const mergedRegions = Object.values(regionMap).sort((a, b) => b.signal_count - a.signal_count);

  return (
    <div className="min-h-screen">
      <div className="max-w-[900px] mx-auto px-6 py-10 pb-20">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 slide-up">
          <div>
            <h1 className="text-xl font-semibold text-nxt-text mb-1">Today&apos;s Briefing</h1>
            <p className="text-sm text-nxt-muted">
              {briefing.total_signals} signals tracked &middot; Updated {formatDate(briefing.generated_at)}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-nxt-surface border border-nxt-border">
            <div className="w-1.5 h-1.5 rounded-full bg-nxt-green live-pulse" />
            <span className="text-xs font-mono text-nxt-muted">MONITORING</span>
          </div>
        </div>

        {/* TOP 3 INSIGHTS */}
        <div className="mb-8">
          {briefing.top_insights.slice(0, 3).map((insight, i) => {
            const accent = insightAccents[i] || COLORS.accent;
            return (
              <div
                key={insight.rank}
                className="bg-nxt-surface border border-nxt-border rounded-nxt-md p-6 mb-4 card-hover slide-up"
                style={{ animationDelay: `${i * 0.08}s`, borderLeftWidth: 3, borderLeftColor: accent }}
              >
                {/* Meta row */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold font-mono"
                    style={{ background: accent + '14', color: accent }}
                  >
                    {insight.rank}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-nxt-muted">
                    <span className="px-2 py-0.5 rounded-full bg-nxt-card border border-nxt-border text-nxt-secondary">
                      {insight.industry}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-nxt-dim" style={{ background: signalTypeColor(insight.signal_type) + '14', color: signalTypeColor(insight.signal_type) }}>
                      {insight.signal_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-nxt-dim font-mono">{insight.signal_count} signals</span>
                  </div>
                </div>

                {/* Main narrative */}
                <p className="text-[15px] leading-relaxed text-nxt-text mb-5">
                  {insight.what_is_happening}
                </p>

                {/* Why / Where grid */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="p-4 rounded-lg bg-nxt-bg border border-nxt-border-subtle">
                    <div className="text-[10px] font-mono font-semibold tracking-wider text-nxt-amber mb-2 uppercase">Why it matters</div>
                    <div className="text-[13px] leading-relaxed text-nxt-secondary">{insight.why_it_matters}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-nxt-bg border border-nxt-border-subtle">
                    <div className="text-[10px] font-mono font-semibold tracking-wider text-nxt-green mb-2 uppercase">Where it&apos;s going</div>
                    <div className="text-[13px] leading-relaxed text-nxt-secondary">{insight.where_its_going}</div>
                  </div>
                </div>

                {/* Source signals */}
                {insight.related_signals.length > 0 && (
                  <div className="border-t border-nxt-border mt-5 pt-4">
                    <div className="text-[10px] font-mono text-nxt-dim tracking-wider mb-3 uppercase">Source signals</div>
                    <div className="space-y-1.5">
                      {insight.related_signals.slice(0, 3).map((sig) => (
                        <div key={sig.id} className="flex justify-between items-center">
                          <span className="text-xs text-nxt-muted truncate max-w-[80%]">{sig.title}</span>
                          <span className="text-[10px] font-mono text-nxt-dim ml-3 shrink-0">{formatDate(sig.discovered_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Two-column: Regions + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          {/* REGIONS */}
          <div className="bg-nxt-surface border border-nxt-border rounded-nxt-md p-5">
            <h3 className="text-sm font-semibold text-nxt-text mb-4">Regional Risk</h3>
            <div className="space-y-2">
              {mergedRegions.slice(0, 6).map((r) => {
                const riskColor = riskColorMap[r.risk_level] || COLORS.green;
                return (
                  <div key={r.name} className="flex items-center justify-between p-3 rounded-lg bg-nxt-card border border-nxt-border-subtle">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-8 rounded-full" style={{ background: riskColor }} />
                      <div>
                        <div className="text-sm font-medium text-nxt-text">{r.name}</div>
                        <div className="text-[11px] text-nxt-muted">{r.industries.slice(0, 2).join(', ')}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-semibold text-nxt-text">{r.signal_count}</div>
                      <div className="text-[10px] font-mono uppercase" style={{ color: riskColor }}>{r.risk_level}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SIGNAL STATS */}
          <div className="bg-nxt-surface border border-nxt-border rounded-nxt-md p-5">
            <h3 className="text-sm font-semibold text-nxt-text mb-4">Signal Breakdown</h3>
            <div className="mb-5">
              <div className="text-[10px] font-mono text-nxt-dim tracking-wider mb-3 uppercase">By Type</div>
              <div className="space-y-2">
                {Object.entries(briefing.signal_stats.by_type)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 6)
                  .map(([type, count]) => {
                    const max = Math.max(...Object.values(briefing.signal_stats.by_type));
                    return (
                      <div key={type}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-nxt-secondary">{type.replace(/_/g, ' ')}</span>
                          <span className="font-mono text-nxt-muted">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-nxt-card overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${(count / max) * 100}%`, background: COLORS.accent }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-nxt-dim tracking-wider mb-3 uppercase">By Industry</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(briefing.signal_stats.by_industry)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 8)
                  .map(([ind, count]) => (
                    <div key={ind} className="px-2.5 py-1 rounded-md bg-nxt-card border border-nxt-border-subtle text-xs">
                      <span className="text-nxt-secondary">{ind}</span>
                      <span className="text-nxt-dim font-mono ml-1.5">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* TREND CHART */}
        {briefing.trends && <TrendChart trends={briefing.trends} />}

        {/* RECENT SIGNALS */}
        <div className="bg-nxt-surface border border-nxt-border rounded-nxt-md p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-nxt-text">Recent Signals</h3>
            <span className="text-xs text-nxt-muted">{briefing.recent_signals.length} latest</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto scrollbar-thin space-y-1.5">
            {briefing.recent_signals.slice(0, 15).map((signal) => (
              <div
                key={signal.id}
                className="flex items-center justify-between p-3 rounded-lg bg-nxt-card border border-nxt-border-subtle card-hover"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <div className="text-[13px] font-medium text-nxt-text truncate">{signal.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: signalTypeColor(signal.signal_type) + '14', color: signalTypeColor(signal.signal_type) }}
                    >
                      {signal.signal_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-nxt-dim">{signal.industry}</span>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-nxt-dim shrink-0">{formatDate(signal.discovered_at)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
