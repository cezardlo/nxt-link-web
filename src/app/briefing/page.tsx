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

    const pad = { top: 24, right: 20, bottom: 36, left: 48 };
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

    // Grid
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 0.5;
    const fontName = FONT.split(',')[0].replace(/'/g, '');
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (i / 5) * gh;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + gw, y);
      ctx.stroke();
      const val = maxScore - (i / 5) * range;
      ctx.fillStyle = COLORS.dim;
      ctx.font = `10px ${fontName}`;
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
    ctx.font = `9px ${fontName}`;
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(allDates.length / 7));
    for (let i = 0; i < allDates.length; i += step) {
      ctx.fillText(allDates[i].slice(5), xScale(allDates[i]), h - pad.bottom + 20);
    }

    // Series
    series.forEach((s, idx) => {
      const color = TREND_COLORS[idx % TREND_COLORS.length];
      const pts = s.points;
      if (pts.length < 2) return;

      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + gh);
      grad.addColorStop(0, color + '30');
      grad.addColorStop(1, color + '05');
      ctx.beginPath();
      ctx.moveTo(xScale(pts[0].date), yScale(pts[0].score));
      for (let i = 1; i < pts.length; i++) ctx.lineTo(xScale(pts[i].date), yScale(pts[i].score));
      ctx.lineTo(xScale(pts[pts.length - 1].date), pad.top + gh);
      ctx.lineTo(xScale(pts[0].date), pad.top + gh);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(xScale(pts[0].date), yScale(pts[0].score));
      for (let i = 1; i < pts.length; i++) ctx.lineTo(xScale(pts[i].date), yScale(pts[i].score));
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

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
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.text }}>Tendency Detection</div>
        <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.muted, letterSpacing: '0.05em' }}>TREND SCORE · 14 DAY WINDOW</div>
      </div>
      <div ref={containerRef} style={{ width: '100%' }}>
        <canvas ref={canvasRef} />
      </div>
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

// ─── Main Briefing Page ───────────────────────────────────────────────────────

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
      <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: FONT, fontSize: '14px', color: COLORS.muted }}>loading briefing</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: FONT, fontSize: '14px', color: COLORS.red }}>{error || 'unable to load briefing'}</div>
      </div>
    );
  }

  const briefing = data.briefing;
  const sectionColors = [COLORS.cyan, COLORS.gold, COLORS.green];

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh' }}>
      {/* Header bar */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '56px',
          background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingLeft: '24px', paddingRight: '24px', zIndex: 100, fontFamily: FONT,
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '0.05em' }}>NXT//LINK</div>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', letterSpacing: '0.1em', color: COLORS.cyan }}>
          SUPPLY CHAIN INTELLIGENCE
        </div>
        <div style={{ fontSize: '13px', color: COLORS.muted, letterSpacing: '0.05em' }}>{briefing.total_signals} signals</div>
      </div>

      {/* Main content */}
      <div style={{ paddingTop: '72px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '64px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

        {/* Hero: Globe + Quick intel summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '32px', marginBottom: '40px', alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Globe size={320} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.cyan, letterSpacing: '0.12em', marginBottom: '12px' }}>
              TODAY&apos;S BRIEFING — {briefing.top_insights.length} INTELLIGENCE ITEMS
            </div>
            {briefing.top_insights.slice(0, 3).map((insight, i) => (
              <div key={insight.rank} style={{ display: 'flex', gap: '12px', alignItems: 'baseline', marginBottom: '10px' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: sectionColors[i], minWidth: '24px', fontFamily: FONT }}>{insight.rank}</div>
                <div style={{ fontSize: '14px', color: COLORS.text, lineHeight: '1.5' }}>
                  {insight.what_is_happening.split('.')[0]}.
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Intelligence Cards ─── */}
        {briefing.top_insights.map((insight, i) => {
          const accentColor = sectionColors[i] || COLORS.cyan;
          return (
            <div
              key={insight.rank}
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderLeft: `3px solid ${accentColor}`,
                borderRadius: '12px',
                padding: '28px 28px 24px',
                marginBottom: '20px',
              }}
            >
              {/* Top row: rank badge + category label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div
                  style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: accentColor + '18', color: accentColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '15px', fontWeight: 700, fontFamily: FONT,
                  }}
                >
                  {insight.rank}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {insight.industry} · {insight.signal_type.replace(/_/g, ' ')} · {insight.signal_count} signals
                  </div>
                </div>
              </div>

              {/* WHAT — the lead */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.cyan, letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 600 }}>
                  WHAT IS HAPPENING
                </div>
                <div style={{ fontSize: '15px', lineHeight: '1.6', color: COLORS.text }}>
                  {insight.what_is_happening}
                </div>
              </div>

              {/* WHY + WHERE side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.amber, letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 600 }}>
                    WHY IT MATTERS
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: '1.6', color: COLORS.text, opacity: 0.9 }}>
                    {insight.why_it_matters}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.green, letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 600 }}>
                    WHERE IT&apos;S GOING
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: '1.6', color: COLORS.text, opacity: 0.9 }}>
                    {insight.where_its_going}
                  </div>
                </div>
              </div>

              {/* Source headlines — small, secondary */}
              {insight.related_signals.length > 0 && (
                <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: '14px' }}>
                  <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.dim, letterSpacing: '0.05em', marginBottom: '10px' }}>
                    SOURCE SIGNALS
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {insight.related_signals.slice(0, 4).map((signal) => (
                      <div key={signal.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: COLORS.muted, lineHeight: '1.4', maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {signal.title}
                        </span>
                        <span style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.dim, whiteSpace: 'nowrap', marginLeft: '12px' }}>
                          {formatDate(signal.discovered_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ─── Tendency Detection — Canvas Graph ─── */}
        {briefing.trends && <TendencyDetection trends={briefing.trends} />}

        {/* ─── Cluster Tendency Status ─── */}
        {briefing.trends && briefing.trends.snapshot.length > 0 && (
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '20px', color: COLORS.text }}>Cluster Tendency Status</div>
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
                        <span style={{ fontSize: '11px', fontFamily: FONT, color: labelColor, fontWeight: 600, textTransform: 'uppercase' }}>{t.trend_label}</span>
                        <span style={{ fontSize: '11px', fontFamily: FONT, color: isPositive ? COLORS.green : COLORS.amber }}>{isPositive ? '+' : ''}{score.toFixed(2)}</span>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: COLORS.card, borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${barWidth}%`, height: '100%',
                          background: isPositive ? `linear-gradient(90deg, ${COLORS.green}40, ${COLORS.green})` : `linear-gradient(90deg, ${COLORS.amber}40, ${COLORS.amber})`,
                          borderRadius: '3px', transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Region Intelligence ─── */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '20px', color: COLORS.text }}>Region Intelligence</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {briefing.regions.map((region) => (
              <div key={region.name} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: COLORS.text }}>{region.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', fontFamily: FONT, color: COLORS.muted }}>{region.total_signals} signals</div>
                  <div style={{ fontSize: '11px', fontFamily: FONT, fontWeight: 600, color: getRiskColor(region.risk_level) }}>{region.risk_level}</div>
                </div>
                <div style={{ fontSize: '11px', color: COLORS.gold, fontFamily: FONT }}>opportunity {(region.opportunity_score * 100).toFixed(0)}</div>
                {region.industries.length > 0 && (
                  <div style={{ fontSize: '10px', color: COLORS.muted, marginTop: '8px', borderTop: `1px solid ${COLORS.border}`, paddingTop: '8px' }}>
                    {region.industries.slice(0, 2).join(', ')}{region.industries.length > 2 ? '...' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ─── Recent Signal Feed ─── */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '20px', color: COLORS.text }}>Recent Signal Feed</div>
          <div style={{ maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {briefing.recent_signals.slice(0, 20).map((signal) => (
              <div
                key={signal.id}
                style={{
                  background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '8px',
                  padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: COLORS.text, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {signal.title}
                  </div>
                  <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.dim }}>
                    {signal.signal_type.replace(/_/g, ' ')} · {signal.industry}
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginLeft: '16px', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: '11px', fontFamily: FONT, color: COLORS.gold, fontWeight: 600 }}>{(signal.relevance_score * 100).toFixed(0)}</div>
                  <div style={{ fontSize: '10px', fontFamily: FONT, color: COLORS.dim }}>{formatDate(signal.discovered_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
