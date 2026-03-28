'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { COLORS, FONT } from '@/lib/tokens';

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
  if (hours < 1) return 'now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* --- Tendency Detection Canvas Graph --- */
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
    const h = 220;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const series = trends.time_series;
    if (series.length === 0) return;

    const pad = { top: 20, right: 16, bottom: 32, left: 44 };
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

    const fontName = FONT.split(',')[0].replace(/'/g, '');

    // Grid
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
      ctx.font = `9px ${fontName}`;
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(1), pad.left - 6, y + 3);
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
    const step = Math.max(1, Math.floor(allDates.length / 6));
    for (let i = 0; i < allDates.length; i += step) {
      ctx.fillText(allDates[i].slice(5), xScale(allDates[i]), h - pad.bottom + 16);
    }

    // Series lines
    series.forEach((s, idx) => {
      const color = TREND_COLORS[idx % TREND_COLORS.length];
      const pts = s.points;
      if (pts.length < 2) return;

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
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>Trend Detection</div>
        <div style={{ fontSize: 9, fontFamily: FONT, color: COLORS.dim, letterSpacing: 1 }}>14 DAY WINDOW</div>
      </div>
      <div ref={containerRef} style={{ width: '100%' }}>
        <canvas ref={canvasRef} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10 }}>
        {trends.time_series.map((s, idx) => (
          <div key={s.cluster_id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: TREND_COLORS[idx % TREND_COLORS.length] }} />
            <span style={{ fontSize: 10, color: COLORS.muted }}>{s.label.replace(/in (Manufacturing|Logistics)/i, '').trim()}</span>
          </div>
        ))}
      </div>
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

  if (loading) {
    return (
      <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.muted }}>loading briefing...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.red }}>{error || 'unable to load briefing'}</div>
      </div>
    );
  }

  const briefing = data.briefing;
  const sectionColors = [COLORS.cyan, COLORS.gold, COLORS.green];

  // Merge regions
  const riskColorMap: Record<string, string> = { critical: '#ff4444', high: '#ff8800', elevated: '#ffb800', moderate: '#ffd700', low: '#00ff88' };
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
    <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh' }}>
      {/* -- Nav bar -- */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 24px', borderBottom: `1px solid ${COLORS.border}`,
        background: 'rgba(10,14,20,0.9)', backdropFilter: 'blur(12px)',
        fontFamily: FONT,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: COLORS.cyan, fontSize: 11, letterSpacing: 1, borderBottom: `1px solid ${COLORS.cyan}` }}>
            BRIEFING
          </span>
          <Link href="/map" style={{ color: COLORS.dim, fontSize: 11, textDecoration: 'none', letterSpacing: 1 }}>MAP</Link>
          <Link href="/conferences" style={{ color: COLORS.dim, fontSize: 11, textDecoration: 'none', letterSpacing: 1 }}>EVENTS</Link>
          <Link href="/industry" style={{ color: COLORS.dim, fontSize: 11, textDecoration: 'none', letterSpacing: 1 }}>INDUSTRY</Link>
          <Link href="/vendors" style={{ color: COLORS.dim, fontSize: 11, textDecoration: 'none', letterSpacing: 1 }}>VENDORS</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 10, color: COLORS.dim }}>{briefing.total_signals} signals</span>
          <span style={{ fontSize: 10, color: COLORS.dim, letterSpacing: 2 }}>{'NXT'} {'//'} {'LINK'}</span>
        </div>
      </div>

      {/* -- Content -- */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 80px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

        {/* -- TOP 3 INSIGHTS -- */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, fontFamily: FONT, color: COLORS.cyan, letterSpacing: 2, marginBottom: 20, fontWeight: 600 }}>
            TODAY&apos;S BRIEFING
          </div>

          {briefing.top_insights.slice(0, 3).map((insight, i) => {
            const accent = sectionColors[i] || COLORS.cyan;
            return (
              <div
                key={insight.rank}
                style={{
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderLeft: `3px solid ${accent}`,
                  borderRadius: 10,
                  padding: '24px 24px 20px',
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: accent + '18', color: accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, fontFamily: FONT,
                  }}>
                    {insight.rank}
                  </div>
                  <div style={{ fontSize: 10, fontFamily: FONT, color: COLORS.muted, letterSpacing: 1, textTransform: 'uppercase' }}>
                    {insight.industry} &middot; {insight.signal_type.replace(/_/g, ' ')} &middot; {insight.signal_count} signals
                  </div>
                </div>

                <div style={{ fontSize: 14, lineHeight: 1.6, color: COLORS.text, marginBottom: 16 }}>
                  {insight.what_is_happening}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 9, fontFamily: FONT, color: COLORS.amber, letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>WHY IT MATTERS</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: COLORS.text, opacity: 0.85 }}>{insight.why_it_matters}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontFamily: FONT, color: COLORS.green, letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>WHERE IT&apos;S GOING</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: COLORS.text, opacity: 0.85 }}>{insight.where_its_going}</div>
                  </div>
                </div>

                {insight.related_signals.length > 0 && (
                  <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 12, marginTop: 16 }}>
                    <div style={{ fontSize: 9, fontFamily: FONT, color: COLORS.dim, letterSpacing: 1, marginBottom: 8 }}>SOURCE SIGNALS</div>
                    {insight.related_signals.slice(0, 3).map((sig) => (
                      <div key={sig.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: COLORS.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{sig.title}</span>
                        <span style={{ fontSize: 10, fontFamily: FONT, color: COLORS.dim, whiteSpace: 'nowrap', marginLeft: 8 }}>{formatDate(sig.discovered_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* -- REGIONS -- clear labels -- */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontFamily: FONT, color: COLORS.dim, letterSpacing: 2, marginBottom: 14, fontWeight: 600 }}>
            REGIONAL SUPPLY CHAIN RISK
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {mergedRegions.map((r) => {
              const riskColor = riskColorMap[r.risk_level] || COLORS.green;
              return (
                <div key={r.name} style={{
                  background: COLORS.card, borderRadius: 8, padding: '14px 16px',
                  borderLeft: `3px solid ${riskColor}`,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>{r.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontFamily: FONT, color: COLORS.dim }}>SIGNALS</span>
                    <span style={{ fontSize: 13, fontFamily: FONT, color: COLORS.cyan, fontWeight: 600 }}>{r.signal_count}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontFamily: FONT, color: COLORS.dim }}>RISK LEVEL</span>
                    <span style={{ fontSize: 10, fontFamily: FONT, color: riskColor, fontWeight: 700, textTransform: 'uppercase' }}>{r.risk_level}</span>
                  </div>
                  {r.industries.length > 0 && (
                    <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 8, borderTop: `1px solid ${COLORS.border}`, paddingTop: 6 }}>
                      {r.industries.slice(0, 3).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* -- TREND CHART -- */}
        {briefing.trends && <TendencyDetection trends={briefing.trends} />}

        {/* -- RECENT SIGNALS -- */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: COLORS.text }}>Recent Signals</div>
          <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {briefing.recent_signals.slice(0, 15).map((signal) => (
              <div
                key={signal.id}
                style={{
                  background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 6,
                  padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {signal.title}
                  </div>
                  <div style={{ fontSize: 10, fontFamily: FONT, color: COLORS.dim }}>
                    {signal.signal_type.replace(/_/g, ' ')} &middot; {signal.industry}
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginLeft: 12, whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: 10, fontFamily: FONT, color: COLORS.dim }}>{formatDate(signal.discovered_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
