'use client';

// /admin/vendor-applications — review the FULL vendor applications submitted via
// /apply (they land in vendor_applications, separate from the homepage early-
// access waitlist). See each company's submitted details and Approve (creates a
// live vendor profile + sends the welcome email) or Reject. Admin-only, under
// the shared admin AccessGate.

import { useCallback, useEffect, useMemo, useState } from 'react';

interface App {
  id: string; public_ref: string | null; company_name: string | null; contact_name: string | null;
  email: string; phone: string | null; category: string | null;
  offering_types: string[] | null; supply_chain_stages: string[] | null;
  company_size: string | null; region: string | null; regions: string[] | null; problem_solved: string | null;
  target_customer: string | null; target_customers: string[] | null; price_range: string | null;
  status: string; approved: boolean; live_vendor_id: string | null; created_at: string;
}
const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString(); } catch { return ''; } };
const arr = (v: string[] | null) => (Array.isArray(v) ? v.filter(Boolean) : []);
// Multi-value fields with legacy fallback (2026-08-04): the array columns win,
// older rows only have the single-value text column.
const regionsOf = (a: App) => (arr(a.regions).length ? arr(a.regions) : a.region ? [a.region] : []);
const customersOf = (a: App) => (arr(a.target_customers).length ? arr(a.target_customers) : a.target_customer ? [a.target_customer] : []);

export default function AdminVendorApplicationsPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [busy, setBusy] = useState('');
  const [flash, setFlash] = useState('');

  const load = useCallback(async () => {
    try { const r = await fetch('/api/admin/vendor-applications'); const j = await r.json(); if (j.ok) setApps(j.applications); } catch { /* */ }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: 'approve' | 'reject') {
    if (action === 'reject' && !confirm('Reject this application?')) return;
    setBusy(id);
    try {
      const r = await fetch('/api/admin/vendor-applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) { setFlash(j.message || 'Something went wrong'); }
      else if (action === 'approve') {
        setFlash(j.already_approved ? '✓ Already a live vendor' : j.welcomed ? '✓ Approved — live vendor created, welcome email sent' : '✓ Approved — live vendor created');
        if (!j.status_advanced) setFlash((f) => f + ' (application row status held by DB guard; vendor is live)');
      } else {
        setFlash(j.status_advanced ? '✓ Rejected' : 'Reject recorded — application status held by DB guard');
      }
      setTimeout(() => setFlash(''), 6000);
      await load();
    } finally { setBusy(''); }
  }

  const counts = useMemo(() => {
    let pending = 0, approved = 0;
    for (const a of apps) { if (a.approved) approved++; else pending++; }
    return { pending, approved };
  }, [apps]);
  const shown = useMemo(() => apps.filter((a) => filter === 'all' ? true : filter === 'pending' ? !a.approved : a.approved), [apps, filter]);

  return (
    <div className="ap">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ap-wrap">
        <div className="ap-head">
          <h1>Vendor applications</h1>
          <a className="ap-alt" href="/admin/applications">Early-access waitlist →</a>
        </div>
        <p className="ap-sub">Full applications submitted on <b>/apply</b>. Approving creates a live vendor profile from their details and emails them a bilingual welcome with a sign-in link.</p>
        {flash && <div className="ap-flash">{flash}</div>}

        <div className="ap-filters">
          {[['pending', `Pending (${counts.pending})`], ['approved', `Approved (${counts.approved})`], ['all', `All (${apps.length})`]].map(([k, l]) => (
            <button key={k} className={`ap-f ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>

        {loading ? <div className="ap-empty">Loading…</div> : shown.length === 0 ? <div className="ap-empty">No applications here yet. They’ll appear when vendors submit the full form on /apply.</div> : (
          <div className="ap-list">
            {shown.map((a) => (
              <div key={a.id} className="ap-card">
                <div className="ap-main">
                  <div className="ap-top">
                    <b>{a.company_name || a.contact_name || a.email}</b>
                    {a.category && <span className="ap-cat">{a.category}</span>}
                    <span className={`ap-badge ${a.approved ? 's-approved' : 's-pending'}`}>{a.approved ? 'Live vendor' : 'Pending'}</span>
                    {a.public_ref && <span className="ap-ref">{a.public_ref}</span>}
                  </div>
                  <div className="ap-contact">
                    {a.contact_name && <span>{a.contact_name}</span>}
                    <a href={`mailto:${a.email}`}>{a.email}</a>
                    {a.phone && <a href={`tel:${a.phone}`}>{a.phone}</a>}
                    {regionsOf(a).length > 0 && <span>📍 {regionsOf(a).join(', ')}</span>}
                    {a.company_size && <span>{a.company_size}</span>}
                    <span className="ap-date">{fmtDate(a.created_at)}</span>
                  </div>
                  {a.problem_solved && <div className="ap-note"><b>Solves:</b> {a.problem_solved}</div>}
                  {customersOf(a).length > 0 && <div className="ap-line"><b>Target customers:</b> {customersOf(a).join(', ')}</div>}
                  {a.price_range && <div className="ap-line"><b>Price range:</b> {a.price_range}</div>}
                  {(arr(a.offering_types).length > 0 || arr(a.supply_chain_stages).length > 0) && (
                    <div className="ap-tags">
                      {arr(a.offering_types).map((t) => <span key={'o' + t} className="ap-tag">{t}</span>)}
                      {arr(a.supply_chain_stages).map((t) => <span key={'s' + t} className="ap-tag alt">{t}</span>)}
                    </div>
                  )}
                </div>
                <div className="ap-actions">
                  {!a.approved
                    ? <>
                        <button className="ap-adv" disabled={busy === a.id} onClick={() => act(a.id, 'approve')}>{busy === a.id ? '…' : '✓ Approve'}</button>
                        <button className="ap-decline" disabled={busy === a.id} onClick={() => act(a.id, 'reject')}>Reject</button>
                      </>
                    : <a className="ap-view" href={`/marketplace/vendor/${a.live_vendor_id}`}>View storefront →</a>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
.ap{min-height:100vh;background:#F8F7FB;color:#141320;font-family:'Outfit',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.ap *{box-sizing:border-box;}
.ap-wrap{max-width:900px;margin:0 auto;padding:34px 20px 90px;}
.ap-head{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.ap-wrap h1{font-size:26px;font-weight:800;letter-spacing:-.02em;margin:0;}
.ap-alt{color:#4A3DB0;font-size:13px;font-weight:600;text-decoration:none;}
.ap-alt:hover{text-decoration:underline;}
.ap-sub{color:#615F72;font-size:14px;margin:8px 0 20px;}
.ap-sub b{color:#3B3A4A;}
.ap-flash{background:rgba(47,158,106,.12);border:1px solid rgba(47,158,106,.3);color:#2F9E6A;font-size:13px;padding:10px 14px;border-radius:10px;margin-bottom:16px;}
.ap-filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;}
.ap-f{font-family:inherit;font-size:12.5px;font-weight:600;color:#3B3A4A;background:#FFFFFF;border:1px solid rgba(20,19,32,.1);border-radius:99px;padding:8px 14px;cursor:pointer;}
.ap-f.on{background:rgba(108,92,224,.16);border-color:#6C5CE0;color:#4A3DB0;}
.ap-empty{color:#615F72;font-size:14px;padding:34px 0;text-align:center;}
.ap-list{display:flex;flex-direction:column;gap:11px;}
.ap-card{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;background:#FFFFFF;border:1px solid rgba(20,19,32,.08);border-radius:14px;padding:16px 18px;}
.ap-main{min-width:0;flex:1;}
.ap-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.ap-top b{font-size:15.5px;font-weight:700;}
.ap-cat{font-size:11px;font-weight:600;color:#4A3DB0;background:rgba(108,92,224,.14);border:1px solid rgba(108,92,224,.25);border-radius:99px;padding:3px 10px;}
.ap-badge{font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;background:rgba(20,19,32,.06);color:#3B3A4A;}
.ap-badge.s-pending{background:rgba(198,138,40,.14);color:#C68A28;}
.ap-badge.s-approved{background:rgba(47,158,106,.14);color:#2F9E6A;}
.ap-ref{font-size:11px;color:#615F72;margin-left:auto;}
.ap-contact{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:8px;font-size:13px;color:#615F72;}
.ap-contact a{color:#4A3DB0;text-decoration:none;}
.ap-contact a:hover{text-decoration:underline;}
.ap-date{margin-left:auto;color:#615F72;}
.ap-note{font-size:13px;color:#3B3A4A;margin-top:9px;line-height:1.5;}
.ap-note b,.ap-line b{color:#615F72;font-weight:600;}
.ap-line{font-size:12.5px;color:#3B3A4A;margin-top:5px;}
.ap-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}
.ap-tag{font-size:11px;font-weight:600;color:#3B3A4A;background:rgba(20,19,32,.06);border:1px solid rgba(20,19,32,.1);border-radius:99px;padding:3px 9px;}
.ap-tag.alt{color:#3E6FD0;background:rgba(62,111,208,.1);border-color:rgba(62,111,208,.2);}
.ap-actions{display:flex;flex-direction:column;gap:8px;flex-shrink:0;align-items:stretch;}
.ap-adv{font-family:inherit;font-size:12.5px;font-weight:700;padding:9px 14px;border-radius:9px;border:none;background:#6C5CE0;color:#fff;cursor:pointer;white-space:nowrap;}
.ap-adv:hover{background:#4A3DB0;}
.ap-adv:disabled{opacity:.5;cursor:default;}
.ap-decline{font-family:inherit;font-size:12px;font-weight:600;padding:7px 14px;border-radius:9px;border:1px solid rgba(20,19,32,.12);background:none;color:#615F72;cursor:pointer;}
.ap-decline:hover{color:#CE4B43;border-color:rgba(206,75,67,.3);}
.ap-decline:disabled{opacity:.5;cursor:default;}
.ap-view{font-family:inherit;font-size:12.5px;font-weight:600;color:#2F9E6A;text-decoration:none;white-space:nowrap;padding:9px 4px;}
.ap-view:hover{text-decoration:underline;}
.ap button,.ap a{transition:background .15s ease,border-color .15s ease,color .15s ease;}
.ap button:focus-visible,.ap a:focus-visible{outline:2px solid #6C5CE0;outline-offset:2px;border-radius:6px;}
`;
