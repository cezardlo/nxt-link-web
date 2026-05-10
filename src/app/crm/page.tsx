'use client';

import { useState, useEffect, useCallback } from 'react';

const SB_URL = 'https://yvykselwehxjwsqercjg.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2eWtzZWx3ZWh4anducWVyY2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwOTMwMTYsImV4cCI6MjA2MjY2OTAxNn0.8hRMIghMesGKGMFMmN8Wg8XMSBd4VfrFaXCRYuXxfHs';
const AUTH_URL = SB_URL + '/functions/v1/admin-auth';

const STATUSES_LEAD = ['new', 'contacted', 'meeting_booked', 'qualified', 'closed_won', 'closed_lost'];
const STATUSES_VENDOR = ['pending', 'approved', 'rejected', 'listed'];
const S_COLORS: Record<string, string> = { new: '#7C5CFC', contacted: '#F59E0B', meeting_booked: '#3B82F6', qualified: '#8B5CF6', closed_won: '#10B981', closed_lost: '#EF4444', pending: '#F59E0B', approved: '#10B981', rejected: '#EF4444', listed: '#3B82F6', chatbot: '#7C5CFC', contact_form: '#3B82F6', manual: '#6B7280', vendor_signup: '#10B981' };

async function sb(table: string, method = 'GET', body: unknown = null, filters = '') {
  const headers: Record<string, string> = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
  if (method === 'PATCH' || method === 'POST') headers['Prefer'] = 'return=representation';
  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${SB_URL}/rest/v1/${table}${filters}`, opts);
  return r.json();
}

function Badge({ s }: { s: string }) {
  const c = S_COLORS[s] || '#6B7280';
  return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', background: c + '22', color: c }}>{(s || '').replace(/_/g, ' ')}</span>;
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: '#111118', border: '1px solid #2A2A35', borderRadius: 14, padding: '20px 24px', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!pw) return;
    setLoading(true); setErr(false);
    try {
      const r = await fetch(AUTH_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
      const d = await r.json();
      if (d.ok) { sessionStorage.setItem('nxt_admin', d.token); onLogin(); }
      else { setErr(true); setPw(''); }
    } catch { setErr(true); }
    setLoading(false);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <div style={{ background: '#111118', border: '1px solid #2A2A35', borderRadius: 20, padding: '48px 40px', width: 400, maxWidth: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, letterSpacing: -1 }}>NXT<span style={{ color: '#7C5CFC' }}>//</span>LINK</div>
        <div style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 32 }}>Admin Dashboard</div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Enter admin password" style={{ width: '100%', padding: '14px 18px', background: '#0A0A0F', border: '1px solid #2A2A35', borderRadius: 12, color: '#F3F4F6', fontFamily: 'inherit', fontSize: 15, outline: 'none', marginBottom: 16, textAlign: 'center', letterSpacing: 2, boxSizing: 'border-box' }} />
        <button onClick={submit} disabled={loading} style={{ width: '100%', padding: 14, background: loading ? '#4A3D8F' : '#7C5CFC', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Signing in...' : 'Sign In'}</button>
        {err && <div style={{ color: '#EF4444', fontSize: 13, marginTop: 12 }}>Wrong password. Try again.</div>}
      </div>
    </div>
  );
}

function LeadsTab() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const load = useCallback(async () => { setLoading(true); const d = await sb('leads', 'GET', null, '?order=created_at.desc&limit=200'); setLeads(Array.isArray(d) ? d : []); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);
  const update = async (id: string, status: string) => { await sb('leads', 'PATCH', { status, updated_at: new Date().toISOString() }, `?id=eq.${id}`); load(); };
  const filtered = filter === 'all' ? leads : leads.filter(l => l.status === filter);
  const c = { all: leads.length, new: leads.filter(l => l.status === 'new').length, mb: leads.filter(l => l.status === 'meeting_booked').length, cw: leads.filter(l => l.status === 'closed_won').length };
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <Stat label="Total Leads" value={c.all} color="#7C5CFC" /><Stat label="New" value={c.new} color="#F59E0B" /><Stat label="Meetings Booked" value={c.mb} color="#3B82F6" /><Stat label="Closed Won" value={c.cw} color="#10B981" />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', ...STATUSES_LEAD].map(s => (<button key={s} onClick={() => setFilter(s)} style={{ padding: '6px 14px', borderRadius: 99, border: filter === s ? '1px solid #7C5CFC' : '1px solid #2A2A35', background: filter === s ? 'rgba(124,92,252,.08)' : 'transparent', color: filter === s ? '#A78BFA' : '#9CA3AF', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{s.replace(/_/g, ' ')}</button>))}
      </div>
      {loading ? <p style={{ color: '#9CA3AF' }}>Loading...</p> : (
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}><thead><tr style={{ borderBottom: '1px solid #2A2A35' }}>{['Name','Email','Company','Source','Category','Status','Date','Actions'].map(h=><th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: '#9CA3AF', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>)}</tr></thead><tbody>
          {filtered.length === 0 ? <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>No leads yet</td></tr> :
          filtered.map(l => (<tr key={l.id} style={{ borderBottom: '1px solid #1A1A24' }}><td style={{ padding: '10px 12px', color: '#F3F4F6', fontWeight: 600 }}>{l.name || '—'}</td><td style={{ padding: '10px 12px', color: '#9CA3AF' }}>{l.email || '—'}</td><td style={{ padding: '10px 12px' }}>{l.company || '—'}</td><td style={{ padding: '10px 12px' }}><Badge s={l.source} /></td><td style={{ padding: '10px 12px', color: '#A78BFA', fontSize: 12 }}>{l.category_interest || '—'}</td><td style={{ padding: '10px 12px' }}><Badge s={l.status} /></td><td style={{ padding: '10px 12px', color: '#6B7280', fontSize: 12 }}>{new Date(l.created_at).toLocaleDateString()}</td><td style={{ padding: '10px 12px' }}><select value={l.status} onChange={e => update(l.id, e.target.value)} style={{ padding: '4px 8px', background: '#111118', border: '1px solid #2A2A35', borderRadius: 6, color: '#D1D5DB', fontSize: 11, cursor: 'pointer' }}>{STATUSES_LEAD.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</select></td></tr>))}
        </tbody></table></div>
      )}
    </div>
  );
}

function VendorsTab() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); const d = await sb('vendor_applications', 'GET', null, '?order=created_at.desc&limit=200'); setVendors(Array.isArray(d) ? d : []); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);
  const update = async (id: string, status: string) => { await sb('vendor_applications', 'PATCH', { status, updated_at: new Date().toISOString() }, `?id=eq.${id}`); load(); };
  const c = { total: vendors.length, pending: vendors.filter(v => v.status === 'pending').length, approved: vendors.filter(v => v.status === 'approved').length, listed: vendors.filter(v => v.status === 'listed').length };
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <Stat label="Total" value={c.total} color="#7C5CFC" /><Stat label="Pending" value={c.pending} color="#F59E0B" /><Stat label="Approved" value={c.approved} color="#10B981" /><Stat label="Listed" value={c.listed} color="#3B82F6" />
      </div>
      {loading ? <p style={{ color: '#9CA3AF' }}>Loading...</p> : (
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}><thead><tr style={{ borderBottom: '1px solid #2A2A35' }}>{['Company','Contact','Email','Category','Cross-Border','Description','Status','Date','Actions'].map(h=><th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: '#9CA3AF', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>)}</tr></thead><tbody>
          {vendors.length === 0 ? <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>No applications yet</td></tr> :
          vendors.map(v => (<tr key={v.id} style={{ borderBottom: '1px solid #1A1A24' }}><td style={{ padding: '10px 12px', color: '#F3F4F6', fontWeight: 600 }}>{v.company_name}</td><td style={{ padding: '10px 12px' }}>{v.contact_name}</td><td style={{ padding: '10px 12px', color: '#9CA3AF' }}>{v.email}</td><td style={{ padding: '10px 12px', color: '#A78BFA', fontSize: 12 }}>{v.category}</td><td style={{ padding: '10px 12px' }}>{v.cross_border_ready ? <span style={{ color: '#10B981' }}>✓</span> : '—'}</td><td style={{ padding: '10px 12px', color: '#9CA3AF', fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.description || '—'}</td><td style={{ padding: '10px 12px' }}><Badge s={v.status} /></td><td style={{ padding: '10px 12px', color: '#6B7280', fontSize: 12 }}>{new Date(v.created_at).toLocaleDateString()}</td><td style={{ padding: '10px 12px' }}><select value={v.status} onChange={e => update(v.id, e.target.value)} style={{ padding: '4px 8px', background: '#111118', border: '1px solid #2A2A35', borderRadius: 6, color: '#D1D5DB', fontSize: 11, cursor: 'pointer' }}>{STATUSES_VENDOR.map(s => <option key={s} value={s}>{s}</option>)}</select></td></tr>))}
        </tbody></table></div>
      )}
    </div>
  );
}

export default function CRMPage() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState('leads');
  useEffect(() => { if (typeof window !== 'undefined' && sessionStorage.getItem('nxt_admin')) setAuthed(true); }, []);
  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>NXT<span style={{ color: '#7C5CFC' }}>//</span>LINK</h1>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', background: '#1A1A24', padding: '4px 10px', borderRadius: 6 }}>CRM</span>
        </div>
        <button onClick={() => { sessionStorage.removeItem('nxt_admin'); setAuthed(false); }} style={{ padding: '8px 16px', background: '#1A1A24', border: '1px solid #2A2A35', borderRadius: 8, color: '#9CA3AF', fontSize: 13, cursor: 'pointer' }}>Sign Out</button>
      </div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1A1A24', marginBottom: 24 }}>
        {[{ id: 'leads', label: '📋 Leads' }, { id: 'vendors', label: '🏢 Vendors' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '14px 24px', background: 'transparent', border: 'none', borderBottom: tab === t.id ? '2px solid #7C5CFC' : '2px solid transparent', color: tab === t.id ? '#F3F4F6' : '#6B7280', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{t.label}</button>
        ))}
      </div>
      {tab === 'leads' && <LeadsTab />}
      {tab === 'vendors' && <VendorsTab />}
    </div>
  );
}
