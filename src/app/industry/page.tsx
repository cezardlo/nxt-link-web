'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';

const FONT = "'IBM Plex Mono', 'JetBrains Mono', 'Courier New', monospace";
const COLORS = {
  bg: '#12151a', surface: '#1a1e25', card: '#21262e', border: '#2e3440',
  accent: '#00d4ff', gold: '#ffd700', green: '#00ff88', amber: '#ffb800',
  red: '#ff3b30', orange: '#ff6600', emerald: '#10b981', purple: '#a855f7',
  dim: '#6b7280', muted: '#9ca3af', text: '#e5e7eb', white: '#f9fafb',
};

const SIGNAL_TYPE_COLORS: Record<string, string> = {
  market_shift: COLORS.amber, technology: COLORS.accent, funding: COLORS.green,
  funding_round: COLORS.emerald, merger_acquisition: COLORS.purple,
  facility_expansion: COLORS.gold, partnership: '#60a5fa', regulation: COLORS.orange,
  connection: '#8b5cf6', discovery: '#ec4899',
};

const SIGNAL_TYPE_ICONS: Record<string, string> = {
  market_shift: '◈', technology: '⬡', funding: '◆', funding_round: '◇',
  merger_acquisition: '◫', facility_expansion: '▣', partnership: '⬢',
  regulation: '◉', connection: '◎', discovery: '✦',
};

const INDUSTRIES = [
  { id: 'manufacturing', label: 'Manufacturing', icon: '▣', color: COLORS.green },
  { id: 'logistics', label: 'Logistics', icon: '⬡', color: COLORS.gold },
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
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Volume Sparkline ────────────────────────────────────────
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

      // Gradient bar
      const grad = ctx.createLinearGradient(x, y, x, h - 16);
      grad.addColorStop(0, COLORS.accent + 'cc');
      grad.addColorStop(1, COLORS.accent + '33');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, 2);
      ctx.fill();

      // Date label (every 3rd)
      if (i % 3 === 0) {
        ctx.fillStyle = COLORS.dim;
        ctx.font = `9px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(d.date.slice(5), x + barW / 2, h - 2);
      }
    });
  }, [data]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: 120 }} />;
}

// ── Type Distribution Ring ────────────────────────────────────────
function TypeRing({ breakdown }: { breakdown: TypeBreakdown[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || breakdown.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = canvas.clientWidth;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2, cy = size / 2;
    const outer = size / 2 - 8, inner = outer - 20;
    const total = breakdown.reduce((s, b) => s + b.count, 0);

    ctx.clearRect(0, 0, size, size);

    let angle = -Math.PI / 2;
    breakdown.forEach(b => {
      const sweep = (b.count / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, outer, angle, angle + sweep);
      ctx.arc(cx, cy, inner, angle + sweep, angle, true);
      ctx.closePath();
      ctx.fillStyle = SIGNAL_TYPE_COLORS[b.type] || COLORS.dim;
      ctx.fill();
      angle += sweep;
    });

    // Center text
    ctx.fillStyle = COLORS.white;
    ctx.font = `bold 18px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(total), cx, cy - 6);
    ctx.fillStyle = COLORS.dim;
    ctx.font = `10px ${FONT}`;
    ctx.fillText('SIGNALS', cx, cy + 10);
  }, [breakdown]);

  return <canvas ref={canvasRef} style={{ width: 120, height: 120 }} />;
}

// ── Main Page ────────────────────────────────────────
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
    <div style={{ background: COLORS.bg, minHeight: '100vh', fontFamily: FONT, color: COLORS.text }}>
      {/* ── Top Bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: `linear-gradient(180deg, ${COLORS.bg} 0%, ${COLORS.bg}ee 100%)`,
        borderBottom: `1px solid ${COLORS.border}`,
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/briefing" style={{ color: COLORS.dim, fontSize: 11, textDecoration: 'none', letterSpacing: 1 }}>
            ◎ BRIEFING
          </Link>
          <Link href="/map" style={{ color: COLORS.dim, fontSize: 11, textDecoration: 'none', letterSpacing: 1 }}>
            ◇ MAP
          </Link>
          <Link href="/conferences" style={{ color: COLORS.dim, fontSize: 11, textDecoration: 'none', letterSpacing: 1 }}>
            ◆ EVENTS
          </Link>
          <span style={{ color: COLORS.purple, fontSize: 11, letterSpacing: 1, borderBottom: `1px solid ${COLORS.purple}` }}>
            ◫ INDUSTRY
          </span>
        </div>
        <span style={{ color: COLORS.dim, fontSize: 10, letterSpacing: 2 }}>NXT // LINK</span>
      </div>

      {/* ── Industry Tabs ── */}
      <div style={{ padding: '20px 24px 0', display: 'flex', gap: 12 }}>
        {INDUSTRIES.map(ind => (
          <button
            key={ind.id}
            onClick={() => setActiveIndustry(ind.id)}
            style={{
              background: activeIndustry === ind.id ? ind.color + '18' : 'transparent',
              border: `1px solid ${activeIndustry === ind.id ? ind.color + '60' : COLORS.border}`,
              color: activeIndustry === ind.id ? ind.color : COLORS.dim,
              padding: '10px 20px',
              borderRadius: 6,
              fontFamily: FONT,
              fontSize: 12,
              letterSpacing: 1,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {ind.icon} {ind.label.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: COLORS.dim }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>◎</div>
          Loading {activeIndustry} intelligence...
        </div>
      ) : data ? (
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Hero Stats ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'SIGNALS (90d)', value: String(data.total_signals), color: COLORS.accent },
              { label: 'INVESTMENT TRACKED', value: data.total_investment > 0 ? formatUSD(data.total_investment) : '—', color: COLORS.green },
              { label: 'ACTIVE CLUSTERS', value: String(data.clusters.length), color: COLORS.gold },
              { label: 'COMPANIES', value: String(data.top_companies.length), color: COLORS.purple },
            ].map((stat, i) => (
              <div key={i} style={{
                background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                borderRadius: 8, padding: 16,
              }}>
                <div style={{ fontSize: 10, color: COLORS.dim, letterSpacing: 1, marginBottom: 8 }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* ── Middle Grid: Volume + Type Breakdown ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
            {/* Volume Chart */}
            <div style={{
              background: COLORS.surface, border: `1px solid ${COLORS.border}`,
              borderRadius: 8, padding: 16,
            }}>
              <div style={{ fontSize: 10, color: COLORS.dim, letterSpacing: 1, marginBottom: 12 }}>
                SIGNAL VOLUME — LAST 14 DAYS
              </div>
              <VolumeChart data={data.daily_volume} />
            </div>

            {/* Type Breakdown */}
            <div style={{
              background: COLORS.surface, border: `1px solid ${COLORS.border}`,
              borderRadius: 8, padding: 16, display: 'flex', gap: 16, alignItems: 'center',
            }}>
              <TypeRing breakdown={data.type_breakdown} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: COLORS.dim, letterSpacing: 1, marginBottom: 10 }}>
                  SIGNAL TYPES
                </div>
                {data.type_breakdown.slice(0, 6).map(tb => (
                  <div key={tb.type} style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 11,
                  }}>
                    <span style={{ color: SIGNAL_TYPE_COLORS[tb.type] || COLORS.dim }}>
                      {SIGNAL_TYPE_ICONS[tb.type] || '●'}
                    </span>
                    <span style={{ color: COLORS.muted, flex: 1 }}>
                      {tb.type.replace(/_/g, ' ')}
                    </span>
                    <span style={{ color: COLORS.white, fontWeight: 600 }}>{tb.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Clusters Grid ── */}
          <div>
            <div style={{ fontSize: 10, color: COLORS.dim, letterSpacing: 1, marginBottom: 12 }}>
              ACTIVE CLUSTERS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {data.clusters.map((c, i) => {
                const trendPoints = data.tendency.filter(t => t.cluster_id === c.id);
                const latestTrend = trendPoints.length > 0 ? trendPoints[trendPoints.length - 1] : null;
                const trendColor = latestTrend?.trend_label === 'spiking' ? COLORS.red
                  : latestTrend?.trend_label === 'growing' ? COLORS.green
                  : latestTrend?.trend_label === 'declining' ? COLORS.amber
                  : COLORS.dim;

                return (
                  <div key={c.id} style={{
                    background: COLORS.card, border: `1px solid ${COLORS.border}`,
                    borderRadius: 8, padding: 14,
                    borderLeft: `3px solid ${SIGNAL_TYPE_COLORS[c.signal_type] || COLORS.dim}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.white }}>{c.label}</div>
                      <div style={{
                        fontSize: 9, padding: '2px 6px', borderRadius: 3,
                        background: trendColor + '20', color: trendColor,
                        textTransform: 'uppercase', letterSpacing: 1,
                      }}>
                        {latestTrend?.trend_label || 'stable'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
                      <div>
                        <span style={{ color: COLORS.dim }}>Signals: </span>
                        <span style={{ color: COLORS.accent }}>{c.signal_count}</span>
                      </div>
                      {c.total_usd > 0 && (
                        <div>
                          <span style={{ color: COLORS.dim }}>Capital: </span>
                          <span style={{ color: COLORS.green }}>{formatUSD(c.total_usd)}</span>
                        </div>
                      )}
                      <div>
                        <span style={{ color: COLORS.dim }}>Rank: </span>
                        <span style={{ color: COLORS.gold }}>{c.composite_rank?.toFixed(0) || '—'}</span>
                      </div>
                    </div>
                    {/* Mini sparkline for trend */}
                    {trendPoints.length > 3 && (
                      <div style={{ marginTop: 8, height: 24, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                        {trendPoints.slice(-10).map((tp, j) => {
                          const absMax = Math.max(...trendPoints.slice(-10).map(t => Math.abs(t.trend_score)), 0.1);
                          const h = Math.max(2, (Math.abs(tp.trend_score) / absMax) * 20);
                          return (
                            <div key={j} style={{
                              width: 4, height: h, borderRadius: 1,
                              background: tp.trend_score >= 0 ? COLORS.green + '80' : COLORS.red + '80',
                            }} />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Bottom: Companies + Recent Signals ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
            {/* Top Companies */}
            <div style={{
              background: COLORS.surface, border: `1px solid ${COLORS.border}`,
              borderRadius: 8, padding: 16,
            }}>
              <div style={{ fontSize: 10, color: COLORS.dim, letterSpacing: 1, marginBottom: 12 }}>
                TOP COMPANIES
              </div>
              {data.top_companies.length === 0 ? (
                <div style={{ fontSize: 11, color: COLORS.dim, padding: '20px 0', textAlign: 'center' }}>
                  No company data yet
                </div>
              ) : (
                data.top_companies.map((co, i) => (
                  <div key={co.name} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                    borderBottom: i < data.top_companies.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 4, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      background: COLORS.accent + '15', color: COLORS.accent,
                      fontSize: 10, fontWeight: 700,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: COLORS.white, fontWeight: 500 }}>{co.name}</div>
                      <div style={{ fontSize: 9, color: COLORS.dim }}>
                        {co.types.map(t => t.replace(/_/g, ' ')).join(' · ')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: COLORS.accent }}>{co.signals} signals</div>
                      {co.total_usd > 0 && (
                        <div style={{ fontSize: 9, color: COLORS.green }}>{formatUSD(co.total_usd)}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Recent Signals Feed */}
            <div style={{
              background: COLORS.surface, border: `1px solid ${COLORS.border}`,
              borderRadius: 8, padding: 16,
            }}>
              <div style={{ fontSize: 10, color: COLORS.dim, letterSpacing: 1, marginBottom: 12 }}>
                RECENT SIGNALS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.recent_signals.map(sig => (
                  <div key={sig.id} style={{
                    padding: '10px 12px', borderRadius: 6,
                    background: COLORS.card, border: `1px solid ${COLORS.border}`,
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}>
                    <span style={{
                      color: SIGNAL_TYPE_COLORS[sig.signal_type] || COLORS.dim,
                      fontSize: 14, lineHeight: 1,
                    }}>
                      {SIGNAL_TYPE_ICONS[sig.signal_type] || '●'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 11, color: COLORS.white, lineHeight: 1.4,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {sig.title}
                      </div>
                      <div style={{ fontSize: 9, color: COLORS.dim, marginTop: 3, display: 'flex', gap: 8 }}>
                        <span>{sig.source}</span>
                        {sig.company && <span style={{ color: COLORS.muted }}>· {sig.company}</span>}
                        {sig.amount_usd > 0 && <span style={{ color: COLORS.green }}>{formatUSD(sig.amount_usd)}</span>}
                        <span>{timeAgo(sig.discovered_at)}</span>
                      </div>
                    </div>
                    {sig.importance_score > 0 && (
                      <div style={{
                        fontSize: 10, color: sig.importance_score > 70 ? COLORS.green : COLORS.dim,
                        fontWeight: 600, whiteSpace: 'nowrap',
                      }}>
                        {sig.importance_score.toFixed(0)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
