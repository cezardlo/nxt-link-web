'use client';

import { useEffect, useState, useCallback } from 'react';

interface Vendor {
  id: string; public_ref: string; company_name: string; contact_name: string;
  email: string; phone: string; website: string; city: string;
  categories: string[]; service_areas: string[]; description: string;
  status: string; brochure_count: number; created_at: string;
}
interface Brochure { id: string; file_name: string; public_url: string | null; title: string; size_bytes: number }

const STATUSES = ['all', 'pending', 'approved', 'rejected', 'paused'];

export default function AdminVendorsPage() {
  const [code, setCode] = useState('');
  const [authed, setAuthed] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [zoho, setZoho] = useState<{ mail_ready: boolean; meeting_ready: boolean } | null>(null);
  const [open, setOpen] = useState<Vendor | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vendors/manage?status=${status}&q=${encodeURIComponent(q)}`, {
        headers: { 'x-access-code': code },
      });
      if (res.status === 401) { setAuthed(false); return; }
      const data = await res.json();
      setVendors(data.vendors || []);
      setAuthed(true);
    } finally { setLoading(false); }
  }, [status, q, code]);

  useEffect(() => { if (authed) load(); }, [authed, load]);
  useEffect(() => { fetch('/api/zoho/status').then((r) => r.json()).then(setZoho).catch(() => {}); }, []);

  async function setVendorStatus(id: string, st: string) {
    await fetch('/api/vendors/manage', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-access-code': code },
      body: JSON.stringify({ id, status: st }),
    });
    setVendors((vs) => vs.map((v) => (v.id === id ? { ...v, status: st } : v)));
    if (open?.id === id) setOpen({ ...open, status: st });
  }

  const counts = STATUSES.reduce((a, s) => { a[s] = s === 'all' ? vendors.length : vendors.filter((v) => v.status === s).length; return a; }, {} as Record<string, number>);

  if (!authed) {
    return (
      <div className="av-root"><style>{CSS}</style>
        <div className="av-gate">
          <div className="av-mk"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h12" /><path d="m13 8 4 4-4 4" /></svg></div>
          <h1>Admin · Vendor directory</h1>
          <p>Enter the access code to manage registered companies.</p>
          <input type="password" placeholder="Access code" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
          <button className="av-btn" onClick={load}>Enter</button>
        </div>
      </div>
    );
  }

  return (
    <div className="av-root"><style>{CSS}</style>
      <header className="av-nav">
        <div className="av-brand"><span className="av-mk sm"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h12" /><path d="m13 8 4 4-4 4" /></svg></span><b>NXT<i>//</i>LINK</b> <span className="av-tag">Vendor directory</span></div>
        <div className="av-zoho">
          <a href="/admin/match" className="av-link" style={{ marginRight: 16 }}>Match vendors →</a>
          <span className={'av-dot' + (zoho?.mail_ready ? ' on' : '')} /> Zoho Mail {zoho?.mail_ready ? 'connected' : 'not connected'}
        </div>
      </header>

      <main className="av-wrap">
        <div className="av-toolbar">
          <div className="av-tabs">
            {STATUSES.map((s) => (
              <button key={s} className={'av-tab' + (status === s ? ' on' : '')} onClick={() => setStatus(s)}>
                {s[0].toUpperCase() + s.slice(1)} <span>{counts[s] ?? 0}</span>
              </button>
            ))}
          </div>
          <input className="av-search" placeholder="Search company…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        </div>

        {loading ? <div className="av-empty">Loading…</div> : vendors.length === 0 ? (
          <div className="av-empty">No companies yet. Share the <a href="/vendor-signup">vendor registration link</a> to start collecting sign-ups.</div>
        ) : (
          <div className="av-table">
            <div className="av-th"><span>Company</span><span>Categories</span><span>Areas</span><span>Files</span><span>Status</span><span></span></div>
            {vendors.map((v) => (
              <div className="av-tr" key={v.id}>
                <span>
                  <b>{v.company_name}</b>
                  <small>{v.email || '—'}{v.city ? ' · ' + v.city : ''}</small>
                </span>
                <span className="av-mini">{(v.categories || []).slice(0, 3).join(', ') || '—'}{(v.categories || []).length > 3 ? ` +${v.categories.length - 3}` : ''}</span>
                <span className="av-mini">{(v.service_areas || []).join(', ') || '—'}</span>
                <span className="av-mini">{v.brochure_count || 0}</span>
                <span><em className={'av-badge ' + v.status}>{v.status}</em></span>
                <span><button className="av-link" onClick={() => setOpen(v)}>Open →</button></span>
              </div>
            ))}
          </div>
        )}
      </main>

      {open && (
        <VendorDrawer vendor={open} code={code} zoho={zoho} onClose={() => setOpen(null)} onStatus={setVendorStatus} />
      )}
    </div>
  );
}

function VendorDrawer({ vendor, code, zoho, onClose, onStatus }: {
  vendor: Vendor; code: string; zoho: { mail_ready: boolean; meeting_ready: boolean } | null;
  onClose: () => void; onStatus: (id: string, st: string) => void;
}) {
  const [brochures, setBrochures] = useState<Brochure[]>([]);
  const [msg, setMsg] = useState('');
  const [emailBody, setEmailBody] = useState(`Hi ${vendor.contact_name || vendor.company_name},\n\nWe have a protected opportunity that may fit your service area. Are you available to quote?\n\n— NXT//LINK`);

  useEffect(() => {
    fetch(`/api/vendors/brochures?vendor_id=${vendor.id}`).then((r) => r.json()).then((d) => setBrochures(d.brochures || [])).catch(() => {});
  }, [vendor.id]);

  async function sendEmail() {
    setMsg('Sending…');
    const res = await fetch('/api/zoho/email', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-access-code': code },
      body: JSON.stringify({ to: vendor.email, subject: 'NXT//LINK — opportunity', body: emailBody.replace(/\n/g, '<br>'), vendor_id: vendor.id }),
    });
    const d = await res.json();
    setMsg(d.message || (d.sent ? 'Sent' : 'Saved as draft'));
  }
  async function scheduleMeeting() {
    setMsg('Scheduling…');
    const start = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const res = await fetch('/api/zoho/meeting', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-access-code': code },
      body: JSON.stringify({ topic: `NXT//LINK intro — ${vendor.company_name}`, startTime: start, durationMinutes: 30, to: vendor.email, vendor_id: vendor.id }),
    });
    const d = await res.json();
    setMsg(d.message || 'Done');
  }

  return (
    <div className="av-overlay" onClick={onClose}>
      <div className="av-drawer" onClick={(e) => e.stopPropagation()}>
        <button className="av-x" onClick={onClose}>✕</button>
        <span className={'av-badge ' + vendor.status}>{vendor.status}</span>
        <h2>{vendor.company_name}</h2>
        <p className="av-ref">{vendor.public_ref}</p>

        <div className="av-kv">
          <div><label>Contact</label><span>{vendor.contact_name || '—'}</span></div>
          <div><label>Email</label><span>{vendor.email || '—'}</span></div>
          <div><label>Phone</label><span>{vendor.phone || '—'}</span></div>
          <div><label>Website</label><span>{vendor.website || '—'}</span></div>
          <div><label>City</label><span>{vendor.city || '—'}</span></div>
        </div>

        {vendor.categories?.length > 0 && <><div className="av-lbl">Provides</div><div className="av-chips">{vendor.categories.map((c) => <span key={c} className="av-chip">{c}</span>)}</div></>}
        {vendor.service_areas?.length > 0 && <><div className="av-lbl">Service areas</div><div className="av-chips">{vendor.service_areas.map((c) => <span key={c} className="av-chip">{c}</span>)}</div></>}
        {vendor.description && <><div className="av-lbl">About</div><p className="av-desc">{vendor.description}</p></>}

        <div className="av-lbl">Brochures</div>
        {brochures.length === 0 ? <p className="av-desc">No files uploaded.</p> : (
          <ul className="av-broch">{brochures.map((b) => (
            <li key={b.id}>{b.public_url ? <a href={b.public_url} target="_blank" rel="noreferrer">{b.title || b.file_name}</a> : <span>{b.title || b.file_name}</span>}<small>{(b.size_bytes / 1024 / 1024).toFixed(1)} MB</small></li>
          ))}</ul>
        )}

        <div className="av-lbl">Decision</div>
        <div className="av-row">
          <button className="av-btn green" onClick={() => onStatus(vendor.id, 'approved')}>Approve</button>
          <button className="av-btn ghost" onClick={() => onStatus(vendor.id, 'paused')}>Pause</button>
          <button className="av-btn ghost" onClick={() => onStatus(vendor.id, 'rejected')}>Reject</button>
        </div>

        <div className="av-lbl">Outreach {zoho?.mail_ready ? '' : '(draft mode — connect Zoho to auto-send)'}</div>
        <textarea className="av-ta" rows={4} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
        <div className="av-row">
          <button className="av-btn" onClick={sendEmail} disabled={!vendor.email}>Email via Zoho</button>
          <button className="av-btn ghost" onClick={scheduleMeeting} disabled={!vendor.email}>Schedule Zoho Meeting</button>
        </div>
        {msg && <div className="av-msg">{msg}</div>}
      </div>
    </div>
  );
}

const CSS = `
.av-root{--bg:#F8FAFC;--surface:#fff;--line:#E2E8F0;--line-2:#CBD5E1;--ink:#0F172A;--ink-2:#475569;--ink-3:#94A3B8;--brand:#2563EB;--brand-2:#1D4ED8;--brand-soft:#EFF4FF;--brand-line:#BFD4FF;--green:#16A34A;--green-soft:#DCFCE7;--amber:#D97706;--amber-soft:#FEF3C7;--red:#DC2626;--red-soft:#FEE2E2;
  min-height:100vh;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.av-root *{box-sizing:border-box;}
.av-gate{max-width:380px;margin:12vh auto;background:#fff;border:1px solid var(--line);border-radius:16px;padding:32px;text-align:center;box-shadow:0 12px 24px -8px rgba(15,23,42,.1);}
.av-gate h1{font:800 22px/1.1 Inter;margin:14px 0 6px;}
.av-gate p{color:var(--ink-2);font-size:14px;margin:0 0 18px;}
.av-gate input{width:100%;padding:11px 13px;border:1px solid var(--line-2);border-radius:10px;font:400 15px Inter;margin-bottom:12px;outline:none;}
.av-gate input:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(37,99,235,.15);}
.av-mk{width:44px;height:44px;border-radius:11px;background:var(--brand);display:grid;place-items:center;margin:0 auto;}
.av-mk.sm{width:28px;height:28px;border-radius:7px;}
.av-nav{display:flex;align-items:center;justify-content:space-between;padding:13px 28px;background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:5;}
.av-brand{display:flex;align-items:center;gap:10px;font:800 17px/1 Inter;}.av-brand i{color:var(--brand);font-style:normal;}
.av-tag{font:600 11px/1 Inter;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);padding:5px 9px;border:1px solid var(--line);border-radius:100px;}
.av-zoho{display:flex;align-items:center;gap:8px;font:500 12px/1 Inter;color:var(--ink-2);}
.av-dot{width:8px;height:8px;border-radius:50%;background:var(--ink-3);}.av-dot.on{background:var(--green);}
.av-wrap{max-width:1100px;margin:0 auto;padding:26px 24px 80px;}
.av-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px;flex-wrap:wrap;}
.av-tabs{display:flex;gap:6px;flex-wrap:wrap;}
.av-tab{border:1px solid var(--line);background:#fff;color:var(--ink-2);font:600 13px/1 Inter;padding:8px 13px;border-radius:9px;cursor:pointer;display:flex;gap:7px;align-items:center;}
.av-tab span{background:var(--surface);color:var(--ink-3);font-size:11px;padding:1px 7px;border-radius:100px;border:1px solid var(--line);}
.av-tab.on{background:var(--brand-soft);border-color:var(--brand);color:var(--brand-2);}
.av-tab.on span{background:#fff;color:var(--brand-2);border-color:var(--brand-line);}
.av-search{padding:9px 13px;border:1px solid var(--line-2);border-radius:9px;font:400 14px Inter;outline:none;min-width:220px;}
.av-search:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(37,99,235,.15);}
.av-empty{background:#fff;border:1px dashed var(--line-2);border-radius:14px;padding:40px;text-align:center;color:var(--ink-2);font-size:14px;}
.av-empty a{color:var(--brand);}
.av-table{background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;}
.av-th,.av-tr{display:grid;grid-template-columns:2.2fr 1.6fr 1.2fr .6fr .9fr .8fr;gap:12px;align-items:center;padding:13px 16px;}
.av-th{background:var(--surface);color:var(--ink-3);font:700 10px/1 Inter;letter-spacing:.06em;text-transform:uppercase;border-bottom:1px solid var(--line);}
.av-tr{border-bottom:1px solid var(--line);font-size:14px;}
.av-tr:last-child{border-bottom:none;}
.av-tr b{display:block;font-weight:600;}
.av-tr small{color:var(--ink-3);font-size:12px;}
.av-mini{color:var(--ink-2);font-size:13px;}
.av-badge{font:600 11px/1 Inter;padding:4px 9px;border-radius:100px;text-transform:capitalize;}
.av-badge.pending{background:var(--amber-soft);color:var(--amber);}
.av-badge.approved{background:var(--green-soft);color:var(--green);}
.av-badge.rejected{background:var(--red-soft);color:var(--red);}
.av-badge.paused{background:var(--surface);color:var(--ink-2);border:1px solid var(--line-2);}
.av-link{border:none;background:none;color:var(--brand);font:600 13px/1 Inter;cursor:pointer;}
.av-overlay{position:fixed;inset:0;background:rgba(15,23,42,.4);display:flex;justify-content:flex-end;z-index:50;}
.av-drawer{width:min(520px,100%);height:100%;background:#fff;overflow-y:auto;padding:28px;position:relative;box-shadow:-20px 0 50px -20px rgba(15,23,42,.3);}
.av-x{position:absolute;top:18px;right:18px;border:none;background:none;font-size:16px;color:var(--ink-3);cursor:pointer;}
.av-drawer h2{font:800 24px/1.1 Inter;margin:12px 0 2px;}
.av-ref{color:var(--ink-3);font:600 12px/1 Inter;margin:0 0 18px;}
.av-kv{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;}
.av-kv label{display:block;font:700 10px/1 Inter;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);margin-bottom:4px;}
.av-kv span{font-size:14px;color:var(--ink);word-break:break-word;}
.av-lbl{font:700 11px/1 Inter;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin:18px 0 10px;}
.av-chips{display:flex;flex-wrap:wrap;gap:7px;}
.av-chip{padding:5px 11px;border-radius:100px;background:var(--brand-soft);border:1px solid var(--brand-line);color:var(--brand-2);font:600 12px/1 Inter;}
.av-desc{color:var(--ink-2);font-size:14px;line-height:1.6;margin:0;}
.av-broch{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
.av-broch li{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font-size:13px;}
.av-broch a{color:var(--brand);}
.av-broch small{color:var(--ink-3);}
.av-row{display:flex;gap:8px;flex-wrap:wrap;}
.av-btn{border:none;cursor:pointer;font:600 13px/1 Inter;border-radius:9px;padding:10px 15px;background:var(--brand);color:#fff;}
.av-btn:hover{background:var(--brand-2);}.av-btn:disabled{opacity:.5;cursor:default;}
.av-btn.ghost{background:#fff;border:1px solid var(--line-2);color:var(--ink);}
.av-btn.ghost:hover{border-color:var(--brand);color:var(--brand);}
.av-btn.green{background:var(--green);}.av-btn.green:hover{background:#15803D;}
.av-ta{width:100%;padding:11px 13px;border:1px solid var(--line-2);border-radius:10px;font:400 14px/1.5 Inter;outline:none;resize:vertical;margin-bottom:10px;}
.av-ta:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(37,99,235,.15);}
.av-msg{margin-top:10px;padding:9px 12px;background:var(--brand-soft);border:1px solid var(--brand-line);border-radius:9px;color:var(--brand-2);font:500 13px/1.4 Inter;}
@media(max-width:680px){.av-th{display:none;}.av-tr{grid-template-columns:1fr;gap:4px;}.av-kv{grid-template-columns:1fr;}}
`;
