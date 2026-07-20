'use client';

// /admin/applications — work the early-access waitlist (operator-only, under the
// admin AccessGate). See who applied, their contact + what they sell, and move
// each lead: new → contacted → onboarding → onboarded. This is the concierge
// front door: you personally reach out and set them up.

import { useCallback, useEffect, useMemo, useState } from 'react';

interface App {
  id: string; kind: string; company_name: string | null; contact_name: string | null;
  email: string; phone: string | null; role: string | null; city: string | null;
  note: string | null; status: string; created_at: string;
}
const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString(); } catch { return ''; } };
const FLOW = ['new', 'contacted', 'onboarding', 'onboarded'];
const LABEL: Record<string, string> = { new: 'New', contacted: 'Contacted', onboarding: 'Onboarding', onboarded: 'Onboarded', declined: 'Declined' };

export default function AdminApplicationsPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [flash, setFlash] = useState('');

  const load = useCallback(async () => {
    try { const r = await fetch('/api/admin/applications'); const j = await r.json(); if (j.ok) setApps(j.applications); } catch { /* */ }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: string) {
    const r = await fetch('/api/admin/applications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    const j = await r.json().catch(() => ({}));
    if (j.welcomed) { setFlash('✓ Welcome email sent'); setTimeout(() => setFlash(''), 4000); }
    else if (status === 'onboarded') { setFlash('Marked onboarded (welcome email already sent, or no email on file)'); setTimeout(() => setFlash(''), 4000); }
    load();
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of apps) c[a.status] = (c[a.status] || 0) + 1;
    return c;
  }, [apps]);
  const shown = useMemo(() => apps.filter((a) => filter === 'all' ? true : filter === 'open' ? !['onboarded', 'declined'].includes(a.status) : a.status === filter), [apps, filter]);

  return (
    <div className="ap">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ap-wrap">
        <h1>Early-access applications</h1>
        <p style={{ margin: '6px 0 0' }}><a href="/admin/vendor-applications" style={{ color: '#A78BFA', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Full vendor applications (/apply) →</a></p>
        <p className="ap-sub">Your concierge waitlist. Reach out personally, then move each vendor through onboarding. Moving a vendor to “Onboarded” auto-sends their bilingual welcome email with a sign-in link.</p>
        {flash && <div className="ap-flash">{flash}</div>}

        <div className="ap-filters">
          {[['open', `Open (${apps.filter((a) => !['onboarded', 'declined'].includes(a.status)).length})`], ['new', `New (${counts.new || 0})`], ['contacted', `Contacted (${counts.contacted || 0})`], ['onboarding', `Onboarding (${counts.onboarding || 0})`], ['onboarded', `Onboarded (${counts.onboarded || 0})`], ['all', `All (${apps.length})`]].map(([k, l]) => (
            <button key={k} className={`ap-f ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>

        {loading ? <div className="ap-empty">Loading…</div> : shown.length === 0 ? <div className="ap-empty">No applications here yet. They’ll appear when vendors apply on the homepage.</div> : (
          <div className="ap-list">
            {shown.map((a) => {
              const idx = FLOW.indexOf(a.status);
              const next = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;
              return (
                <div key={a.id} className="ap-card">
                  <div className="ap-main">
                    <div className="ap-top">
                      <b>{a.company_name || a.contact_name || a.email}</b>
                      <span className={`ap-badge s-${a.status}`}>{LABEL[a.status] || a.status}</span>
                    </div>
                    <div className="ap-contact">
                      {a.contact_name && <span>{a.contact_name}</span>}
                      <a href={`mailto:${a.email}`}>{a.email}</a>
                      {a.phone && <a href={`tel:${a.phone}`}>{a.phone}</a>}
                      {a.city && <span>📍 {a.city}</span>}
                      <span className="ap-date">{fmtDate(a.created_at)}</span>
                    </div>
                    {a.note && <div className="ap-note">“{a.note}”</div>}
                  </div>
                  <div className="ap-actions">
                    {next && <button className="ap-adv" onClick={() => setStatus(a.id, next)}>→ {LABEL[next]}</button>}
                    {a.status !== 'declined' && a.status !== 'onboarded' && <button className="ap-decline" onClick={() => setStatus(a.id, 'declined')}>Decline</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
.ap{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.ap *{box-sizing:border-box;}
.ap-wrap{max-width:900px;margin:0 auto;padding:34px 20px 90px;}
.ap-wrap h1{font-size:26px;font-weight:800;letter-spacing:-.02em;margin:0;}
.ap-sub{color:#8080A0;font-size:14px;margin:8px 0 20px;}
.ap-flash{background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.3);color:#34D399;font-size:13px;padding:10px 14px;border-radius:10px;margin-bottom:16px;}
.ap-filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;}
.ap-f{font-family:inherit;font-size:12.5px;font-weight:600;color:#C0C0D0;background:#14141F;border:1px solid rgba(255,255,255,.1);border-radius:99px;padding:8px 14px;cursor:pointer;}
.ap-f.on{background:rgba(124,92,252,.16);border-color:#7C5CFC;color:#C4B5FD;}
.ap-empty{color:#8080A0;font-size:14px;padding:34px 0;text-align:center;}
.ap-list{display:flex;flex-direction:column;gap:11px;}
.ap-card{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px 18px;}
.ap-main{min-width:0;flex:1;}
.ap-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.ap-top b{font-size:15.5px;font-weight:700;}
.ap-badge{font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;background:rgba(255,255,255,.06);color:#C0C0D0;}
.ap-badge.s-new{background:rgba(251,191,36,.14);color:#FBBF24;}
.ap-badge.s-contacted{background:rgba(96,165,250,.14);color:#60A5FA;}
.ap-badge.s-onboarding{background:rgba(124,92,252,.14);color:#C4B5FD;}
.ap-badge.s-onboarded{background:rgba(52,211,153,.14);color:#34D399;}
.ap-badge.s-declined{background:rgba(248,113,113,.12);color:#FCA5A5;}
.ap-contact{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:8px;font-size:13px;color:#8080A0;}
.ap-contact a{color:#A78BFA;text-decoration:none;}
.ap-contact a:hover{text-decoration:underline;}
.ap-date{margin-left:auto;color:#5A5A70;}
.ap-note{font-size:13px;color:#B8B6CC;margin-top:9px;line-height:1.5;font-style:italic;}
.ap-actions{display:flex;flex-direction:column;gap:8px;flex-shrink:0;}
.ap-adv{font-family:inherit;font-size:12.5px;font-weight:700;padding:9px 14px;border-radius:9px;border:none;background:#7C5CFC;color:#fff;cursor:pointer;white-space:nowrap;}
.ap-adv:hover{background:#6344DF;}
.ap-decline{font-family:inherit;font-size:12px;font-weight:600;padding:7px 14px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:none;color:#8080A0;cursor:pointer;}
.ap-decline:hover{color:#FCA5A5;border-color:rgba(248,113,113,.3);}
`;
