'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Component as Globe } from '@/components/ui/interactive-globe';
import { COLORS, FONT } from '@/lib/tokens';

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

function getRiskColor(riskLevel: string): string {
  switch (riskLevel?.toLowerCase()) {
    case 'critical':
      return COLORS.red;
    case 'high':
      return COLORS.amber;
    case 'medium':
      return COLORS.gold;
    default:
      return COLORS.green;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (hours < 1) return 'now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Tendency Detection Canvas Graph ──────────────────────────────────────────
const TREND_COLORS = [COLORS.cyan, COLORS.green, COLORS.gold, COLORS.amber, COLORS.red, '#a78bfa'];

function TendencyDetection({ trends }: { trends: { snapshot: TrendSnapshot[]; time_series: TrendTimeSeries[] } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = 280;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const series = trends.time_series;
    if (series.length === 0) return;

    // Layout
    const pad = { top: 24, right: 20, bottom: 36, left: 48 };
    const gw = w - pad.left - pad.right;
    const gh = h - pad.top - pad.bottom;

    // Find data bounds
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

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 0.5;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.top + (i / gridLines) * gh;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + gw, y);
      ctx.stroke();
      // Label
      const val = maxScore - (i / gridLines) * range;
      ctx.fillStyle = COLORS.dim;
      ctx.font = `10px ${FONT.split(',')[0].replace(/'/g, '')}`;
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(1), pad.left - 8, y + 3);
    }

    // Zero line (highlighted)
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
    ctx.font = `9px ${FONT.split(',')[0].replace(/'/g, '')}`;
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(allDates.length / 7));
    for (let i = 0; i < allDates.length; i += step) {
      const d = allDates[i];
      const x = xScale(d);
      ctx.fillText(d.slice(5), x, h - pad.bottom + 20);
    }

    // Draw each series
    series.forEach((s, idx) => {
      const color = TREND_COLORS[idx % TREND_COLORS.length];
      const pts = s.points;
      if (pts.length < 2) return;

      // Gradient fill
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + gh);
      grad.addColorStop(0, color + '30');
      grad.addColorStop(1, color + '05');
      ctx.beginPath();
      ctx.moveTo(xScale(pts[0].date), yScale(pts[0].score));
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(xScale(pts[i].date), yScale(pts[i].score));
      }
      ctx.lineTo(xScale(pts[pts.length - 1].date), pad.top + gh);
      ctx.lineTo(xScale(pts[0].date), pad.top + gh);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.moveTo(xScale(pts[0].date), yScale(pts[0].score));
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(xScale(pts[i].date), yScale(pts[i].score));
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Endpoint dot
      const last = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(xScale(last.date), yScale(last.score), 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = COLORS.bg;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }, [trends]);

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.text }}>
          Tendency Detection
        </div>
        <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.muted, letterSpacing: '0.05em' }}>
          TREND SCORE · 14 DAY WINDOW
        </div>
      </div>
      <div ref={containerRef} style={{ width: '100%' }}>
        <canvas ref={canvasRef} />
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '12px' }}>
        {trends.time_series.map((s, idx) => (
          <div key={s.cluster_id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: TREND_COLORS[idx % TREND_COLORS.length] }} />
            <span style={{ fontSize: '11px', color: COLORS.muted }}>{s.label.replace(/in (Manufacturing|Logistics)/i, '').trim()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  if (loading) {
    return (
      <div
        style={{
          background: COLORS.bg,
          color: COLORS.text,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ fontFamily: FONT, fontSize: '14px', color: COLORS.muted }}>
          loading briefing
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          background: COLORS.bg,
          color: COLORS.text,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ fontFamily: FONT, fontSize: '14px', color: COLORS.red }}>
          {error || 'unable to load briefing'}
        </div>
      </div>
    );
  }

  const briefing = data.briefing;

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh' }}>
      {/* Header bar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '56px',
          background: COLORS.surface,
          borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: '24px',
          paddingRight: '24px',
          zIndex: 100,
          fontFamily: FONT,
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '0.05em' }}>
          NXT//LINK
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '11px',
            letterSpacing: '0.1em',
            color: COLORS.cyan,
          }}
        >
          SUPPLY CHAIN INTELLIGENCE
        </div>
        <div
          style={{
            fontSize: '13px',
            color: COLORS.muted,
            letterSpacing: '0.05em',
          }}
        >
          {briefing.total_signals} signals
        </div>
      </div>

      {/* Main content */}
      <div style={{ paddingTop: '56px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '64px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {/* Hero Section */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '32px',
            marginBottom: '48px',
            alignItems: 'start',
          }}
        >
          {/* Globe */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '12px' }}>
            <Globe size={350} />
          </div>

          {/* Top 3 insight summary cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {briefing.top_insights.slice(0, 3).map((insight) => (
              <div
                key={insight.rank}
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: COLORS.cyan,
                      minWidth: '24px',
                    }}
                  >
                    {insight.rank}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        marginBottom: '4px',
                        color: COLORS.text,
                      }}
                    >
                      {insight.title}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                        fontSize: '11px',
                      }}
                    >
                      <span style={{ fontFamily: FONT, color: COLORS.muted }}>
                        {insight.signal_count} signals
                      </span>
                      <span style={{ fontFamily: FONT, color: COLORS.gold }}>
                        score {(insight.avg_score * 100).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Full-width insight cards with details */}
        {briefing.top_insights.map((insight) => (
          <div
            key={insight.rank}
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: COLORS.cyan,
                  minWidth: '32px',
                }}
              >
                {insight.rank}
              </div>
              <div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: COLORS.text,
                  }}
                >
                  {insight.title}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: COLORS.muted,
                    fontFamily: FONT,
                    marginTop: '2px',
                  }}
                >
                  {insight.industry} • {insight.signal_type}
                </div>
              </div>
            </div>

            {/* Three sections */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '10px',
                    fontFamily: FONT,
                    color: COLORS.cyan,
                    letterSpacing: '0.1em',
                    marginBottom: '8px',
                    fontWeight: 500,
                  }}
                >
                  WHAT IS HAPPENING
                </div>
                <div style={{ fontSize: '13px', lineHeight: '1.5', color: COLORS.text }}>
                  {insight.what_is_happening}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '10px',
                    fontFamily: FONT,
                    color: COLORS.amber,
                    letterSpacing: '0.1em',
                    marginBottom: '8px',
                    fontWeight: 500,
                  }}
                >
                  WHY IT MATTERS
                </div>
                <div style={{ fontSize: '13px', lineHeight: '1.5', color: COLORS.text }}>
                  {insight.why_it_matters}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '10px',
                    fontFamily: FONT,
                    color: COLORS.green,
                    letterSpacing: '0.1em',
                    marginBottom: '8px',
                    fontWeight: 500,
                  }}
                >
                  WHERE IT&apos;S GOING
                </div>
                <div style={{ fontSize: '13px', lineHeight: '1.5', color: COLORS.text }}>
                  {insight.where_its_going}
                </div>
              </div>
            </div>

            {/* Related signals */}
            {insight.related_signals.length > 0 && (
              <div
                style={{
                  borderTop: `1px solid ${COLORS.border}`,
                  paddingTop: '16px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontFamily: FONT,
                    color: COLORS.muted,
                    letterSpacing: '0.05em',
                    marginBottom: '12px',
                    fontWeight: 500,
                  }}
                >
                  RELATED EVENTS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {insight.related_signals.slice(0, 5).map((signal) => (
                    <div
                      key={signal.id}
                      style={{
                        fontSize: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingLeft: '8px',
                        paddingRight: '8px',
                        paddingTop: '6px',
                        paddingBottom: '6px',
                        borderRadius: '6px',
                        background: COLORS.card,
                      }}
                    >
                      <span style={{ color: COLORS.text }}>{signal.title}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: FONT,
                          color: COLORS.muted,
                        }}
                      >
                        {signal.source} • {formatDate(signal.discovered_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Tendency Detection — Canvas Graph */}
        {briefing.trends && <TendencyDetection trends={briefing.trends} />}

        {/* Trend Snapshot — Current Status */}
        {briefing.trends && briefing.trends.snapshot.length > 0 && (
          <div
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '20px', color: COLORS.text }}>
              Cluster Tendency Status
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {briefing.trends.snapshot.slice(0, 10).map((t) => {
                const score = Number(t.trend_score);
                const labelColor = t.trend_label === 'spiking' ? COLORS.red
                  : t.trend_label === 'growing' ? COLORS.green
                  : t.trend_label === 'declining' ? COLORS.amber
                  : COLORS.muted;
                const barWidth = Math.min(Math.abs(score) * 15, 100);
                const isPositive = score >= 0;
                return (
                  <div key={t.cluster_id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: COLORS.text }}>{t.label}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontFamily: FONT, color: labelColor, fontWeight: 600, textTransform: 'uppercase' }}>
                          {t.trend_label}
                        </span>
                        <span style={{ fontSize: '11px', fontFamily: FONT, color: isPositive ? COLORS.green : COLORS.amber }}>
                          {isPositive ? '+' : ''}{score.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: COLORS.card, borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${barWidth}%`,
                          height: '100%',
                          background: isPositive
                            ? `linear-gradient(90deg, ${COLORS.green}40, ${COLORS.green})`
                            : `linear-gradient(90deg, ${COLORS.amber}40, ${COLORS.amber})`,
                          borderRadius: '3px',
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Region Intelligence */}
        <div
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '20px',
              color: COLORS.text,
            }}
          >
            Region Intelligence
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            {briefing.regions.map((region) => (
              <div
                key={region.name}
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: COLORS.text,
                  }}
                >
                  {region.name}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontFamily: FONT,
                      color: COLORS.muted,
                    }}
                  >
                    {region.total_signals} signals
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontFamily: FONT,
                      fontWeight: 600,
                      color: getRiskColor(region.risk_level),
                    }}
                  >
                    {region.risk_level}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: COLORS.gold,
                    fontFamily: FONT,
                  }}
                >
                  opportunity {(region.opportunity_score * 100).toFixed(0)}
                </div>
                {region.industries.length > 0 && (
                  <div
                    style={{
                      fontSize: '10px',
                      color: COLORS.muted,
                      marginTop: '8px',
                      borderTop: `1px solid ${COLORS.border}`,
                      paddingTop: '8px',
                    }}
                  >
                    {region.industries.slice(0, 2).join(', ')}
                    {region.industries.length > 2 ? '...' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Signal Feed */}
        <div
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '16px',
            padding: '24px',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '20px',
              color: COLORS.text,
            }}
          >
            Recent Signal Feed
          </div>
          <div
            style={{
              maxHeight: '500px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {briefing.recent_signals.slice(0, 20).map((signal) => (
              <div
                key={signal.id}
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: COLORS.text,
                      marginBottom: '4px',
                    }}
                  >
                    {signal.title}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontFamily: FONT,
                      color: COLORS.muted,
                    }}
                  >
                    {signal.signal_type} • {signal.industry}
                  </div>
                </div>
                <div
                  style={{
                    textAlign: 'right',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontFamily: FONT,
                      color: COLORS.gold,
                      fontWeight: 600,
                    }}
                  >
                    {(signal.relevance_score * 100).toFixed(0)}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      fontFamily: FONT,
                      color: COLORS.muted,
                    }}
                  >
                    {formatDate(signal.discovered_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
