'use client';

// Operator marketplace oversight: vendors (verified or not), every listing
// with its status and AI flag, recent leads — and the power to unpublish
// anything that looks wrong.

import { useCallback, useEffect, useState } from 'react';

interface AdminVendor { id: string; company_name: string; email: string | null; city: string | null; status: string; has_account: boolean; email_verified: boolean | null; created_at: string }
interface AdminListing { id: string; public_ref: string; vendor_id: string; name: string; category: string; status: string; ai_extracted: boolean; accuracy_confirmed_at: string | null; published_at: string | null }
interface AdminLead { id: string; public_ref: string; kind: string; vendor_id: string; company: string; status: string; created_at: string }

export default function AdminMarketplacePage() {
  const [data, setData] = useState<{ vendors: AdminVendor[]; products: AdminListing[]; services: AdminListing[]; leads: AdminLead[] } | null>(null);
  const [denied, setDenied] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/marketplace');
    if (res.status === 401) { setDenied(true); return; }
    const d = await res.json();
    if (d.ok) setData(d);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setStatus(kind: 'product' | 'service', id: string, status: string) {
    const res = await fetch('/api/admin/marketplace', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, id, status }) });
    const d = await res.json();
    setMsg(d.ok ? 'Updated.' : (d.message || 'Failed'));
    load();
  }

  const vmap = new Map((data?.vendors || []).map((v) => [v.id, v.company_name]));

  return (
    <div className="am">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="am-nav">
        <a className="am-brand" href="/admin"><b>NXT<i>//</i>LINK</b><span>Marketplace oversight</span></a>
        <a className="am-link" href="/marketplace">View public marketplace</a>
      </nav>
      <main className="am-wrap">
        {denied ? (
          <div className="am-empty">Admin sign-in required. <a href="/login">Sign in</a></div>
        ) : !data ? (
          <div className="am-empty">Loading…</div>
        ) : (
          <>
            {msg && <div className="am-msg">{msg}</div>}
            <section className="am-card">
              <div className="am-lbl">Vendors ({data.vendors.length})</div>
              <div className="am-scroll"><table>
                <thead><tr><th>Company</th><th>Email</th><th>Account</th><th>Email verified</th><th>Status</th></tr></thead>
                <tbody>
                  {data.vendors.map((v) => (
                    <tr key={v.id}>
                      <td>{v.company_name}</td>
                      <td>{v.email || '—'}</td>
                      <td>{v.has_account ? 'Yes' : 'No'}</td>
                      <td>{v.email_verified === null ? '—' : v.email_verified ? 'Verified' : 'Not verified'}</td>
                      <td><span className={'am-pill ' + v.status}>{v.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </section>

            {([['product', 'Products', data.products], ['service', 'Services', data.services]] as Array<['product' | 'service', string, AdminListing[]]>).map(([kind, label, rows]) => (
              <section className="am-card" key={kind}>
                <div className="am-lbl">{label} ({rows.length})</div>
                <div className="am-scroll"><table>
                  <thead><tr><th>Name</th><th>Vendor</th><th>Status</th><th>AI draft</th><th>Accuracy confirmed</th><th></th></tr></thead>
                  <tbody>
                    {rows.map((l) => (
                      <tr key={l.id}>
                        <td>{l.status === 'published' ? <a href={`/marketplace/${kind}/${l.id}`} target="_blank" rel="noreferrer">{l.name}</a> : l.name}</td>
                        <td>{vmap.get(l.vendor_id) || '—'}</td>
                        <td><span className={'am-pill ' + l.status}>{l.status.replace('_', ' ')}</span></td>
                        <td>{l.ai_extracted ? 'AI-assisted' : '—'}</td>
                        <td>{l.accuracy_confirmed_at ? new Date(l.accuracy_confirmed_at).toLocaleDateString() : '—'}</td>
                        <td>
                          {l.status === 'published'
                            ? <button onClick={() => setStatus(kind, l.id, 'unpublished')}>Unpublish</button>
                            : l.status !== 'archived' && <button onClick={() => setStatus(kind, l.id, 'archived')}>Archive</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </section>
            ))}

            <section className="am-card">
              <div className="am-lbl">Recent leads ({data.leads.length})</div>
              <div className="am-scroll"><table>
                <thead><tr><th>Ref</th><th>Buyer</th><th>Vendor</th><th>Type</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {data.leads.map((l) => (
                    <tr key={l.id}>
                      <td>{l.public_ref}</td><td>{l.company}</td><td>{vmap.get(l.vendor_id) || '—'}</td>
                      <td>{l.kind}</td><td><span className={'am-pill ' + l.status}>{l.status}</span></td>
                      <td>{new Date(l.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
.am{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.am *{box-sizing:border-box;}
.am-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(10,10,15,.85);backdrop-filter:blur(20px);z-index:20;}
.am-brand{display:flex;align-items:baseline;gap:10px;color:#F0F0F5;text-decoration:none;}
.am-brand b{font-size:17px;}.am-brand i{color:#A78BFA;font-style:normal;}
.am-brand span{color:#8080A0;font-size:13px;}
.am-link{color:#A78BFA;font-size:13.5px;font-weight:600;text-decoration:none;}
.am-wrap{max-width:1000px;margin:0 auto;padding:32px 20px 100px;}
.am-empty{text-align:center;color:#8080A0;padding:80px 0;}
.am-empty a{color:#A78BFA;}
.am-msg{background:rgba(124,92,252,.12);border:1px solid rgba(124,92,252,.25);color:#C4B5FD;padding:10px 14px;border-radius:11px;font-size:13px;margin-bottom:14px;}
.am-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px;margin-bottom:18px;}
.am-lbl{font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#A78BFA;margin-bottom:12px;}
.am-scroll{overflow-x:auto;}
.am-card table{width:100%;border-collapse:collapse;font-size:13px;}
.am-card th{text-align:left;color:#8080A0;font-weight:600;padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.1);white-space:nowrap;}
.am-card td{padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.05);}
.am-card td a{color:#A78BFA;}
.am-pill{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:3px 8px;border-radius:99px;background:rgba(255,255,255,.07);color:#C0C0D0;white-space:nowrap;}
.am-pill.published,.am-pill.approved{background:rgba(52,211,153,.12);color:#34D399;}
.am-pill.draft,.am-pill.pending,.am-pill.new{background:rgba(251,191,36,.1);color:#FBBF24;}
.am-pill.needs_review{background:rgba(251,146,60,.12);color:#FB923C;}
.am-pill.unpublished,.am-pill.archived,.am-pill.rejected{background:rgba(255,255,255,.06);color:#8080A0;}
.am-card button{font-family:inherit;background:none;border:1px solid rgba(255,255,255,.12);color:#C0C0D0;font-size:12px;border-radius:8px;padding:5px 10px;cursor:pointer;}
.am-card button:hover{border-color:#FCA5A5;color:#FCA5A5;}
`;
