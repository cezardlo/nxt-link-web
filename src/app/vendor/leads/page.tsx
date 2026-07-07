'use client';

// Vendor leads inbox: quote/service requests from marketplace buyers,
// scoped to the signed-in vendor's own listings.

import { useCallback, useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';

interface Lead {
  id: string; public_ref: string; kind: string; listing_name: string | null;
  company: string; contact_name: string | null; email: string; phone: string | null;
  message: string | null; status: string; created_at: string;
}
const STATUSES = ['new', 'viewed', 'responded', 'won', 'lost'];

export default function VendorLeadsPage() {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);

  const load = useCallback(async () => {
    const res = await fetch('/api/vendor/leads');
    if (res.status === 401) { setSignedIn(false); setChecking(false); return; }
    const data = await res.json();
    setLeads(data.leads || []); setSignedIn(true); setChecking(false);
  }, []);

  useEffect(() => {
    const sb = createBrowserSupabaseClient();
    sb.auth.getSession().then(({ data }) => { if (data.session) load(); else setChecking(false); });
  }, [load]);

  async function setStatus(id: string, status: string) {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
    await fetch('/api/vendor/leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
  }

  return (
    <div className="ld">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="ld-nav">
        <a className="ld-brand" href="/"><b>NXT<i>//</i>LINK</b><span>Leads</span></a>
        <a className="ld-link" href="/vendor/listings">Your listings</a>
      </nav>
      <main className="ld-wrap">
        <h1>Leads inbox</h1>
        <p className="ld-sub">Buyers who requested a quote or service from your listings.</p>
        {checking ? <div className="ld-empty">Loading…</div>
          : !signedIn ? <div className="ld-empty">Sign in first — <a href="/vendor-login">go to sign in</a></div>
          : leads.length === 0 ? <div className="ld-empty">No leads yet. Publish listings so buyers can find you.</div>
          : (
            <div className="ld-list">
              {leads.map((l) => (
                <div className="ld-card" key={l.id}>
                  <div className="ld-top">
                    <span className={'ld-status ' + l.status}>{l.status}</span>
                    <b>{l.company}</b>
                    <small>{l.listing_name ? `→ ${l.listing_name}` : ''} · {new Date(l.created_at).toLocaleDateString()}</small>
                    <span className="ld-ref">{l.public_ref}</span>
                  </div>
                  <div className="ld-contact">
                    {l.contact_name && <span>{l.contact_name}</span>}
                    <a href={`mailto:${l.email}`}>{l.email}</a>
                    {l.phone && <span>{l.phone}</span>}
                  </div>
                  {l.message && <p className="ld-msg">{l.message}</p>}
                  <div className="ld-actions">
                    {STATUSES.filter((st) => st !== l.status).map((st) => (
                      <button key={st} onClick={() => setStatus(l.id, st)}>Mark {st}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
      </main>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
.ld{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.ld *{box-sizing:border-box;}
.ld-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(10,10,15,.85);backdrop-filter:blur(20px);z-index:20;}
.ld-brand{display:flex;align-items:baseline;gap:10px;color:#F0F0F5;text-decoration:none;}
.ld-brand b{font-size:17px;}.ld-brand i{color:#A78BFA;font-style:normal;}
.ld-brand span{color:#8080A0;font-size:13px;}
.ld-link{color:#A78BFA;font-size:13.5px;font-weight:600;text-decoration:none;}
.ld-wrap{max-width:760px;margin:0 auto;padding:36px 20px 100px;}
.ld-wrap h1{font-size:28px;font-weight:800;letter-spacing:-.02em;}
.ld-sub{color:#8080A0;font-size:14px;margin:6px 0 24px;}
.ld-empty{text-align:center;color:#8080A0;padding:70px 0;}
.ld-empty a{color:#A78BFA;}
.ld-list{display:flex;flex-direction:column;gap:14px;}
.ld-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px 20px;}
.ld-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.ld-top b{font-size:15.5px;}
.ld-top small{color:#8080A0;}
.ld-ref{margin-left:auto;color:#505068;font-size:12px;}
.ld-status{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 9px;border-radius:99px;background:rgba(255,255,255,.06);color:#C0C0D0;}
.ld-status.new{background:rgba(124,92,252,.15);color:#C4B5FD;}
.ld-status.won{background:rgba(52,211,153,.12);color:#34D399;}
.ld-status.lost{background:rgba(252,165,165,.1);color:#FCA5A5;}
.ld-contact{display:flex;gap:14px;flex-wrap:wrap;font-size:13.5px;color:#C0C0D0;margin-top:10px;}
.ld-contact a{color:#A78BFA;}
.ld-msg{margin:12px 0 0;font-size:14px;color:#D5D4E0;line-height:1.6;background:#111118;border-radius:10px;padding:12px 14px;white-space:pre-wrap;}
.ld-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;}
.ld-actions button{font-family:inherit;background:none;border:1px solid rgba(255,255,255,.12);color:#C0C0D0;font-size:12px;border-radius:8px;padding:6px 11px;cursor:pointer;}
.ld-actions button:hover{border-color:#A78BFA;color:#C4B5FD;}
`;
