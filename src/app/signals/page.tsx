'use client';

import { useEffect, useState } from 'react';
import { COLORS } from '@/lib/tokens';

const API = 'https://yvykselwehxjwsqercjg.supabase.co/functions/v1/signal-insights';

interface SignalGroup { name: string; count: number; tech_count?: number; region_count?: number; }
interface Signal { id: string; title: string; industry?: string; technology?: string; region?: string; problem?: string; importance_score?: number; source?: string; company?: string; }
interface Stats { tagged: number; untagged: number; total: number; }

export default function SignalsPage() {
  const [groupBy, setGroupBy] = useState('industry');
  const [groups, setGroups] = useState<SignalGroup[]>([]);
  const [recent, setRecent] = useState<Signal[]>([]);
  const [stats, setStats] = useState<Stats>({ tagged: 0, untagged: 0, total: 0 });
  const [drilldown, setDrilldown] = useState<{ field: string; value: string; signals: Signal[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setDrilldown(null);
    try {
      const r = await fetch(API + '?group=' + groupBy);
      const d = await r.json();
      if (d.error) return;
      setGroups(d.groups || []);
      setRecent(d.recent || []);
      if (d.stats) setStats(d.stats);
    } finally { setLoading(false); }
  };

  const drill = async (field: string, value: string) => {
    setLoading(true);
    try {
      const r = await fetch(API + '?' + field + '=' + encodeURIComponent(value) + '&limit=100');
      const d = await r.json();
      if (d.error) return;
      setDrilldown({ field, value, signals: d.signals || [] });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [groupBy]);

  const impColor = (s: number) => s >= 70 ? COLORS.red : s >= 40 ? COLORS.amber : COLORS.green;
  const pct = stats.total > 0 ? Math.round((stats.tagged / stats.total) * 100) : 0;

  const tagBg = (type: string) => {
    const m: Record<string, string> = { industry: COLORS.accent, technology: COLORS.green, region: '#c77ab0', problem: COLORS.amber };
    const c = m[type] || COLORS.accent;
    return { background: c + '18', color: c, padding: '2px 8px', borderRadius: '4px', fontSize: '11px' };
  };

  const SignalRow = ({ s }: { s: Signal }) => (
    <div style={{ background: COLORS.surface, border: '1px solid ' + COLORS.borderSubtle, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0, background: impColor(s.importance_score || 0) }} />
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{s.title}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
          {s.industry && <span style={tagBg('industry')}>{s.industry}</span>}
          {s.technology && <span style={tagBg('technology')}>{s.technology}</span>}
          {s.region && <span style={tagBg('region')}>{s.region}</span>}
          {s.problem && <span style={tagBg('problem')}>{s.problem}</span>}
        </div>
        {s.source && <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>{s.source}{s.company ? ' \u00b7 ' + s.company : ''}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, color: COLORS.text, padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Signal Intelligence</h1>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: COLORS.secondary }}>
          <span><strong style={{ color: COLORS.accent }}>{stats.tagged}</strong> tagged</span>
          <span><strong style={{ color: COLORS.amber }}>{stats.untagged}</strong> pending</span>
          <span><strong style={{ color: COLORS.text }}>{stats.total}</strong> total</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
        {drilldown && <button onClick={() => setDrilldown(null)} style={{ background: COLORS.elevated, color: COLORS.accent, border: '1px solid ' + COLORS.border, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>&larr; Back</button>}
        <label style={{ fontSize: 13, color: COLORS.secondary }}>Group by:</label>
        <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={{ background: COLORS.surface, color: COLORS.text, border: '1px solid ' + COLORS.border, padding: '6px 12px', borderRadius: 6, fontSize: 13 }}>
          <option value="industry">Industry</option>
          <option value="technology">Technology</option>
          <option value="region">Region</option>
          <option value="problem">Problem</option>
        </select>
      </div>

      <div style={{ background: COLORS.surface, border: '1px solid ' + COLORS.border, borderRadius: 8, padding: '10px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 12, color: COLORS.secondary, whiteSpace: 'nowrap' }}>Enrichment: {stats.tagged}/{stats.total} ({pct}%)</span>
        <div style={{ flex: 1, height: 6, background: COLORS.border, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg, ' + COLORS.accent + ', ' + COLORS.green + ')', borderRadius: 3, transition: 'width 0.5s' }} />
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 60, color: COLORS.muted }}>Loading...</div>}

      {!loading && !drilldown && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: COLORS.secondary, marginBottom: 12 }}>Signal Groups by {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginBottom: 32 }}>
            {groups.map(g => (
              <div key={g.name} onClick={() => drill(groupBy, g.name)} style={{ background: COLORS.card, border: '1px solid ' + COLORS.border, borderRadius: 10, padding: 18, cursor: 'pointer', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = COLORS.accent)} onMouseLeave={e => (e.currentTarget.style.borderColor = COLORS.border)}>
                <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.accent }}>{g.count}</div>
                <div style={{ fontSize: 11, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 1 }}>signals</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 6, textTransform: 'capitalize' }}>{g.name}</div>
                <div style={{ display: 'flex', gap: 14, marginTop: 10, paddingTop: 10, borderTop: '1px solid ' + COLORS.borderSubtle, fontSize: 12, color: COLORS.muted }}>
                  <span><strong style={{ color: COLORS.green }}>{g.tech_count || 0}</strong> tech</span>
                  <span><strong style={{ color: '#c77ab0' }}>{g.region_count || 0}</strong> regions</span>
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 16, fontWeight: 600, color: COLORS.secondary, marginBottom: 12 }}>Recent Tagged Signals</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recent.map(s => <SignalRow key={s.id} s={s} />)}
          </div>
        </>
      )}

      {!loading && drilldown && (
        <>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}><span style={{ color: COLORS.accent, textTransform: 'capitalize' }}>{drilldown.value}</span> \u2014 {drilldown.signals.length} Signals</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {drilldown.signals.map(s => <SignalRow key={s.id} s={s} />)}
          </div>
        </>
      )}
    </div>
  );
}'use client';

import { useEffect, useState } from 'react';
import { COLORS } from '@/lib/tokens';

const API = 'https://yvykselwehxjwsqercjg.supabase.co/functions/v1/signal-insights';

interface SignalGroup { name: string; count: number; tech_count?: number; region_count?: number; }
interface Signal { id: string; title: string; industry?: string; technology?: string; region?: string; problem?: string; importance_score?: number; source?: string; company?: string; }
interface Stats { tagged: number; untagged: number; total: number; }
interface APIResponse { groups?: SignalGroup[]; recent?: Signal[]; stats?: Stats; signals?: Signal[]; count?: number; error?: string; }

export default function SignalsPage() {
  const [groupBy, setGroupBy] = useState('industry');
  const [groups, setGroups] = useState<SignalGroup[]>([]);
  const [recent, setRecent] = useState<Signal[]>([]);
  const [stats, setStats] = useState<Stats>({ tagged: 0, untagged: 0, total: 0 });
  const [drilldown, setDrilldown] = useState<{ field: string; value: string; signals: Signal[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setDrilldown(null);
    try {
      const r = await fetch(API + '?group=' + groupBy);
      const d: APIResponse = await r.json();
      if (d.error) return;
      setGroups(d.groups || []);
      setRecent(d.recent || []);
      if (d.stats) setStats(d.stats);
    } finally { setLoading(false); }
  };

  const drill = async (field: string, value: string) => {
    setLoading(true);
    try {
      const r = await fetch(API + '?' + field + '=' + encodeURIComponent(value) + '&limit=100');
      const d: APIResponse = await r.json();
      if (d.error) return;
      setDrilldown({ field, value, signals: d.signals || [] });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [groupBy]);

  const impColor = (s: number) => s >= 70 ? COLORS.red : s >= 40 ? COLORS.amber : COLORS.green;
  const tagStyle = (type: string) => {
    const m: Record<string, string> = { industry: COLORS.accent, technology: COLORS.green, region: '#c77ab0', problem: COLORS.amber };
    return { background: (m[type] || COLORS.accent) + '18', color: m[type] || COLORS.accent, padding: '2px 8px', borderRadius: '4px', fontSize: '11px' };
  };
  const pct = stats.total > 0 ? Math.round((stats.tagged / stats.total) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, color: COLORS.text, padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Signal Intelligence</h1>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: COLORS.secondary }}>
          <span><strong style={{ color: COLORS.accent }}>{stats.tagged}</strong> tagged</span>
          <span><strong style={{ color: COLORS.amber }}>{stats.untagged}</strong> pending</span>
          <span><strong style={{ color: COLORS.text }}>{stats.total}</strong> total</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
        {drilldown && <button onClick={() => { setDrilldown(null); }} style={{ background: COLORS.elevated, color: COLORS.accent, border: '1px solid ' + COLORS.border, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>&larr; Back</button>}
        <label style={{ fontSize: 13, color: COLORS.secondary }}>Group by:</label>
        <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={{ background: COLORS.surface, color: COLORS.text, border: '1px solid ' + COLORS.border, padding: '6px 12px', borderRadius: 6, fontSize: 13 }}>
          <option value="industry">Industry</option>
          <option value="technology">Technology</option>
          <option value="region">Region</option>
          <option value="problem">Problem</option>
        </select>
      </div>

      <div style={{ background: COLORS.surface, border: '1px solid ' + COLORS.border, borderRadius: 8, padding: '10px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 12, color: COLORS.secondary, whiteSpace: 'nowrap' }}>Enrichment: {stats.tagged}/{stats.total} ({pct}%)</span>
        <div style={{ flex: 1, height: 6, background: COLORS.border, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg, ' + COLORS.accent + ', ' + COLORS.green + ')', borderRadius: 3, transition: 'width 0.5s' }} />
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 60, color: COLORS.muted }}>Loading...</div>}

      {!loading && !drilldown && (
        <>
