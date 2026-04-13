'use client';
import { useState, useEffect, useCallback } from 'react';

interface BriefingData { ok: boolean; briefing: string; meta: { signals_analyzed: number; vendor_count: number; agent_memories: number; generated_at: string }; error?: string }
interface VendorData { ok: boolean; vendors: Array<{ company_name: string; description: string; hq_country: string; nxt_link_fit: string; iker_score: number }>; error?: string }
interface ObserverData { ok: boolean; analysis: string; signal_count: number; error?: string }
interface ConnectionData { ok: boolean; connections: Array<{ signal_title: string; vendor_name: string; explanation: string; strength: number }>; signal_count: number; vendor_count: number; error?: string }

export default function Dashboard() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [vendors, setVendors] = useState<VendorData | null>(null);
  const [observer, setObserver] = useState<ObserverData | null>(null);
  const [connections, setConnections] = useState<ConnectionData | null>(null);
  const [loading, setLoading] = useState({ briefing: true, vendors: true, observer: true, connections: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastRefresh, setLastRefresh] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading({ briefing: true, vendors: true, observer: true, connections: true });
    setErrors({});
    setLastRefresh(new Date().toLocaleTimeString('en-US', { timeZone: 'America/Denver' }));
    fetch('/api/jarvis-briefing').then(r => r.json()).then(d => { setBriefing(d); setLoading(p => ({ ...p, briefing: false })); }).catch(e => { setErrors(p => ({ ...p, briefing: e.message })); setLoading(p => ({ ...p, briefing: false })); });
    fetch('/api/vendor-discovery').then(r => r.json()).then(d => { setVendors(d); setLoading(p => ({ ...p, vendors: false })); }).catch(e => { setErrors(p => ({ ...p, vendors: e.message })); setLoading(p => ({ ...p, vendors: false })); });
    fetch('/api/observer-v2', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ industry: 'logistics', limit: 15 }) }).then(r => r.json()).then(d => { setObserver(d); setLoading(p => ({ ...p, observer: false })); }).catch(e => { setErrors(p => ({ ...p, observer: e.message })); setLoading(p => ({ ...p, observer: false })); });
    fetch('/api/connections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: 'logistics' }) }).then(r => r.json()).then(d => { setConnections(d); setLoading(p => ({ ...p, connections: false })); }).catch(e => { setErrors(p => ({ ...p, connections: e.message })); setLoading(p => ({ ...p, connections: false })); });
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const S = { card: { background: '#141414', borderRadius: 12, border: '1px solid #262626', padding: 24, marginBottom: 24 } as const, h2: { fontSize: 18, fontWeight: 600, color: '#10b981', margin: '0 0 12px' } as const };
  const Loader = () => <div style={{ color: '#10b981', fontSize: 14 }}>Loading...</div>;
  const Err = ({ msg }: { msg: string }) => <div style={{ color: '#ef4444', fontSize: 13 }}>Error: {msg}</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#10b981', margin: 0 }}>NXT LINK</h1>
          <p style={{ fontSize: 13, color: '#737373', margin: '4px 0 0' }}>Intelligence Dashboard &mdash; El Paso, TX</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button onClick={fetchAll} style={{ background: '#10b981', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Refresh All</button>
          {lastRefresh && <p style={{ fontSize: 11, color: '#737373', margin: '6px 0 0' }}>Last: {lastRefresh} MST</p>}
        </div>
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Jarvis Briefing</h2>
        {loading.briefing ? <Loader /> : errors.briefing ? <Err msg={errors.briefing} /> : briefing?.ok ? (
          <div>
            <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{briefing.briefing}</div>
            <div style={{ display: 'flex', gap: 24, marginTop: 16, fontSize: 12, color: '#737373' }}>
              <span>Signals: {briefing.meta?.signals_analyzed}</span>
              <span>Vendors: {briefing.meta?.vendor_count}</span>
              <span>Memories: {briefing.meta?.agent_memories}</span>
            </div>
          </div>
        ) : <Err msg={briefing?.error || 'Unknown error'} />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div style={S.card}>
          <h2 style={S.h2}>Observer Analysis</h2>
          {loading.observer ? <Loader /> : errors.observer ? <Err msg={errors.observer} /> : observer?.ok ? (
            <div>
              <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>{observer.analysis}</div>
              <p style={{ fontSize: 12, color: '#737373', marginTop: 12 }}>Signals analyzed: {observer.signal_count}</p>
            </div>
          ) : <Err msg={observer?.error || 'Unknown'} />}
        </div>
        <div style={S.card}>
          <h2 style={S.h2}>Connections</h2>
          {loading.connections ? <Loader /> : errors.connections ? <Err msg={errors.connections} /> : connections?.ok ? (
            <div>
              {connections.connections?.length > 0 ? connections.connections.map((c, i) => (
                <div key={i} style={{ borderBottom: '1px solid #262626', padding: '10px 0', fontSize: 13 }}>
                  <div style={{ fontWeight: 600, color: '#fbbf24' }}>{c.signal_title} &rarr; {c.vendor_name}</div>
                  <div style={{ color: '#a3a3a3', marginTop: 4 }}>{c.explanation}</div>
                </div>
              )) : <p style={{ fontSize: 13, color: '#737373' }}>No connections yet. Signals: {connections.signal_count}, Vendors: {connections.vendor_count}</p>}
            </div>
          ) : <Err msg={connections?.error || 'Unknown'} />}
        </div>
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Vendor Pipeline</h2>
        {loading.vendors ? <Loader /> : errors.vendors ? <Err msg={errors.vendors} /> : vendors?.ok ? (
          <div>
            <p style={{ fontSize: 13, color: '#737373', margin: '0 0 12px' }}>{vendors.vendors?.length || 0} vendors in pipeline</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {(vendors.vendors || []).slice(0, 20).map((v, i) => (
                <div key={i} style={{ background: '#1a1a1a', borderRadius: 8, padding: 12, border: '1px solid #262626' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{v.company_name}</div>
                  <div style={{ fontSize: 12, color: '#737373', marginTop: 4 }}>{v.hq_country} &middot; Fit: {v.nxt_link_fit} &middot; Score: {v.iker_score}</div>
                  <div style={{ fontSize: 12, color: '#a3a3a3', marginTop: 6, maxHeight: 48, overflow: 'hidden' }}>{v.description?.substring(0, 120)}</div>
                </div>
              ))}
            </div>
          </div>
        ) : <Err msg={vendors?.error || 'Unknown'} />}
      </div>

      <div style={{ textAlign: 'center', marginTop: 32, fontSize: 11, color: '#525252' }}>NXT LINK Intelligence Platform &middot; Powered by Gemini 2.5 Flash &middot; $0/month</div>
    </div>
  );
}
