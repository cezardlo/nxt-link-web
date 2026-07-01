'use client';

import { useState } from 'react';

const CATEGORIES = [
  'Forklift maintenance', 'Copy machine service', 'Waste collection', 'Transportation / FTL / LTL',
  'Labels / Zebra', 'Fire extinguisher inspection', 'Electrical service', 'Wooden pallets',
  'Fire door maintenance', 'IT support', 'General maintenance', 'Propane gas', 'Pest control',
  'Staffing agency', 'Warehouse technology', 'Warehouse products / parts',
];

interface Match {
  id: string; company_name: string; email: string | null; phone?: string | null;
  categories: string[]; service_areas: string[]; status: string; score: number; reasons: string[];
}

export default function AdminMatchPage() {
  const [code, setCode] = useState('');
  const [authed, setAuthed] = useState(false);
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('El Paso, TX');
  const [requestRef, setRequestRef] = useState('');
  const [includeAll, setIncludeAll] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');

  async function run() {
    setLoading(true); setNote('');
    try {
      const res = await fetch('/api/match', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-access-code': code },
        body: JSON.stringify({ category, location, request_id: requestRef || undefined, include_all: includeAll }),
      });
      if (res.status === 401) { setAuthed(false); return; }
      setAuthed(true);
      const data = await res.json();
      setMatches(data.matches || []);
      if (data.degraded) setNote('Database not connected — connect Supabase to match real vendors.');
    } finally { setLoading(false); }
  }

  async function email(m: Match) {
    if (!m.email) return;
    setNote(`Drafting email to ${m.company_name}…`);
    const res = await fetch('/api/zoho/email', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-access-code': code },
      body: JSON.stringify({
        to: m.email, subject: `NXT//LINK — ${category || 'opportunity'}`,
        body: `Hi ${m.company_name},<br><br>We have a protected opportunity${category ? ` for <b>${category}</b>` : ''}${location ? ` in ${location}` : ''} that may fit your service area. Are you available to quote?<br><br>— NXT//LINK`,
        vendor_id: m.id,
      }),
    });
    const d = await res.json();
    setNote(d.message || 'Done');
  }

  if (!authed) {
    return (
      <div className="m-root"><style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="m-gate">
          <div className="m-mk"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h12" /><path d="m13 8 4 4-4 4" /></svg></div>
          <h1>Admin · Vendor matching</h1>
          <p>Enter the access code to match registered companies to a request.</p>
          <input type="password" placeholder="Access code" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} />
          <button className="m-btn" onClick={run}>Enter</button>
        </div>
      </div>
    );
  }

  return (
    <div className="m-root"><style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header className="m-nav">
        <div className="m-brand"><span className="m-mk sm"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h12" /><path d="m13 8 4 4-4 4" /></svg></span><b>NXT<i>//</i>LINK</b> <span className="m-tag">Vendor matching</span></div>
        <a className="m-link" href="/admin/directory" style={{ marginRight: 16 }}>Browse →</a>
        <a className="m-link" href="/admin/vendors">Table →</a>
      </header>

      <main className="m-wrap">
        <div className="m-card m-controls">
          <div className="m-row">
            <label className="m-field"><span>Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Any category</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="m-field"><span>Location</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="El Paso, TX" />
            </label>
            <label className="m-field"><span>Or request ref</span>
              <input value={requestRef} onChange={(e) => setRequestRef(e.target.value)} placeholder="REQ-XXXX" />
            </label>
          </div>
          <div className="m-actions">
            <label className="m-check"><input type="checkbox" checked={includeAll} onChange={(e) => setIncludeAll(e.target.checked)} /> Include pending (not just approved)</label>
            <button className="m-btn" onClick={run} disabled={loading}>{loading ? 'Matching…' : 'Find matches'}</button>
          </div>
        </div>

        {note && <div className="m-note">{note}</div>}

        {matches !== null && (
          matches.length === 0 ? (
            <div className="m-empty">No matching companies yet. Approve vendors in the <a href="/admin/vendors">directory</a>, or check «Include pending».</div>
          ) : (
            <div className="m-list">
              {matches.map((m) => (
                <div className="m-result" key={m.id}>
                  <div className="m-score" style={{ ['--p' as string]: `${m.score}%` }}><b>{m.score}</b><small>match</small></div>
                  <div className="m-info">
                    <div className="m-head"><b>{m.company_name}</b><em className={'m-badge ' + m.status}>{m.status}</em></div>
                    <div className="m-reasons">{m.reasons.map((r, i) => <span key={i}>{r}</span>)}</div>
                    <div className="m-meta">{m.email || 'no email'}{m.service_areas?.length ? ' · ' + m.service_areas.join(', ') : ''}</div>
                  </div>
                  <button className="m-btn ghost" onClick={() => email(m)} disabled={!m.email}>Email via Zoho</button>
                </div>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
.m-root{--bg:#0A0A0F;--bg2:#111118;--surf:rgba(255,255,255,.04);--surf2:rgba(255,255,255,.07);--ink:#F0F0F5;--ink-2:#C0C0D0;--ink-3:#8080A0;--line:rgba(255,255,255,.08);--line-2:rgba(255,255,255,.14);--brand:#7C5CFC;--brand-2:#6344DF;--brand-soft:rgba(124,92,252,.12);--brand-line:rgba(124,92,252,.25);--p2:#A78BFA;--p3:#C4B5FD;--green:#34D399;--green-soft:rgba(52,211,153,.12);--amber:#FBBF24;--amber-soft:rgba(251,191,36,.12);--red:#F87171;--red-soft:rgba(248,113,113,.12);
  min-height:100vh;background:var(--bg);color:var(--ink);font-family:'Outfit',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.m-root *{box-sizing:border-box;}
.m-gate{max-width:380px;margin:12vh auto;background:var(--surf);border:1px solid var(--line);border-radius:20px;padding:32px;text-align:center;backdrop-filter:blur(12px);box-shadow:0 24px 80px rgba(0,0,0,.4);}
.m-gate h1{font:800 22px/1.1 'Outfit';margin:14px 0 6px;color:var(--ink);}.m-gate p{color:var(--ink-2);font-size:14px;margin:0 0 18px;}
.m-gate input{width:100%;padding:11px 13px;background:var(--bg);border:1px solid var(--line);border-radius:12px;font:400 15px 'Outfit';color:var(--ink);margin-bottom:12px;outline:none;}
.m-gate input:focus{border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-soft);}
.m-mk{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--brand),var(--brand-2));display:grid;place-items:center;margin:0 auto;box-shadow:0 8px 24px rgba(124,92,252,.35);}
.m-mk.sm{width:28px;height:28px;border-radius:8px;box-shadow:0 4px 14px rgba(124,92,252,.3);}
.m-nav{display:flex;align-items:center;justify-content:space-between;padding:13px 28px;background:rgba(10,10,15,.7);backdrop-filter:blur(24px);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:5;}
.m-brand{display:flex;align-items:center;gap:10px;font:800 17px/1 'Outfit';color:var(--ink);}.m-brand i{color:var(--p2);font-style:normal;}
.m-tag{font:600 11px/1 'Outfit';letter-spacing:.06em;text-transform:uppercase;color:var(--p3);padding:5px 9px;background:var(--surf);border:1px solid var(--line);border-radius:100px;}
.m-link{color:var(--p2);font:600 13px/1 'Outfit';text-decoration:none;}
.m-link:hover{color:var(--p3);}
.m-wrap{max-width:880px;margin:0 auto;padding:28px 24px 80px;}
.m-card{background:var(--surf);border:1px solid var(--line);border-radius:20px;padding:30px;backdrop-filter:blur(12px);box-shadow:0 24px 80px rgba(0,0,0,.4);}
.m-row{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:14px;}
@media(max-width:640px){.m-row{grid-template-columns:1fr;}}
.m-field{display:flex;flex-direction:column;gap:6px;font:600 12px/1.2 'Outfit';color:var(--ink-2);}
.m-field input,.m-field select{padding:10px 12px;background:var(--bg);border:1px solid var(--line);border-radius:12px;font:400 15px 'Outfit';outline:none;color:var(--ink);}
.m-field input:focus,.m-field select:focus{border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-soft);}
.m-field select option{background:var(--bg2);color:var(--ink);}
.m-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:24px;flex-wrap:wrap;}
.m-check{display:flex;align-items:center;gap:8px;font:500 13px/1 'Outfit';color:var(--ink-2);}
.m-check input{accent-color:var(--brand);}
.m-btn{border:none;cursor:pointer;font:600 14px/1 'Outfit';border-radius:12px;padding:11px 18px;background:var(--brand);color:#fff;box-shadow:0 4px 20px rgba(124,92,252,.35);}
.m-btn:hover{background:var(--brand-2);}.m-btn:disabled{opacity:.5;cursor:default;box-shadow:none;}
.m-btn.ghost{background:var(--surf);border:1px solid var(--line);color:var(--ink);box-shadow:none;}
.m-btn.ghost:hover{border-color:var(--brand);color:var(--p3);background:var(--surf2);}
.m-note{margin:24px 0 0;padding:11px 14px;background:var(--brand-soft);border:1px solid var(--brand-line);border-radius:12px;color:var(--p3);font:500 13px/1.5 'Outfit';}
.m-empty{margin-top:24px;background:var(--surf);border:1px dashed var(--line-2);border-radius:20px;padding:36px;text-align:center;color:var(--ink-2);font-size:14px;backdrop-filter:blur(12px);}
.m-empty a{color:var(--p2);}
.m-list{margin-top:24px;display:flex;flex-direction:column;gap:14px;}
.m-result{display:flex;align-items:center;gap:16px;background:var(--surf);border:1px solid var(--line);border-radius:18px;padding:18px 20px;backdrop-filter:blur(12px);box-shadow:0 16px 50px rgba(0,0,0,.3);}
.m-result:hover{border-color:var(--brand-line);}
.m-score{flex:none;width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#7C5CFC var(--p),var(--surf2) 0);position:relative;}
.m-score::after{content:'';position:absolute;inset:6px;background:var(--bg2);border-radius:50%;}
.m-score b{position:relative;z-index:1;font:800 18px/1 'Outfit';color:var(--p3);}
.m-score small{position:relative;z-index:1;font:600 8px/1 'Outfit';text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);margin-top:2px;}
.m-info{flex:1;min-width:0;}
.m-head{display:flex;align-items:center;gap:10px;}
.m-head b{font:700 16px/1.2 'Outfit';color:var(--ink);}
.m-badge{font:600 10px/1 'Outfit';padding:3px 8px;border-radius:100px;text-transform:capitalize;}
.m-badge.approved{background:var(--green-soft);color:var(--green);}
.m-badge.pending{background:var(--amber-soft);color:var(--amber);}
.m-badge.paused,.m-badge.rejected{background:var(--surf);color:var(--ink-2);border:1px solid var(--line);}
.m-reasons{display:flex;flex-wrap:wrap;gap:6px;margin:7px 0 5px;}
.m-reasons span{font:600 11px/1 'Outfit';color:var(--p3);background:var(--brand-soft);border:1px solid var(--brand-line);border-radius:100px;padding:4px 9px;}
.m-meta{color:var(--ink-3);font-size:12.5px;}
@media(max-width:560px){.m-result{flex-wrap:wrap;}}
`;
