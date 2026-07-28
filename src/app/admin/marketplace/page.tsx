'use client';

// Operator marketplace oversight: vendors (verified or not), every listing
// with its status and AI flag, recent leads — and the power to unpublish
// anything that looks wrong.

import { useCallback, useEffect, useState } from 'react';

interface AdminVendor { id: string; company_name: string; email: string | null; city: string | null; status: string; has_account: boolean; email_verified: boolean | null; created_at: string }
interface AdminListing { id: string; public_ref: string; vendor_id: string; name: string; category: string; status: string; ai_extracted: boolean; accuracy_confirmed_at: string | null; published_at: string | null }
interface AdminLead { id: string; public_ref: string; kind: string; vendor_id: string; company: string; status: string; created_at: string }
interface AdminReport { id: string; kind: 'product' | 'service'; product_id: string | null; service_id: string | null; vendor_id: string; reason: string; details: string | null; reporter_email: string | null; status: string; created_at: string }

export default function AdminMarketplacePage() {
  const [data, setData] = useState<{ vendors: AdminVendor[]; products: AdminListing[]; services: AdminListing[]; leads: AdminLead[]; reports: AdminReport[] } | null>(null);
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
  async function setReportStatus(report_id: string, report_status: string) {
    await fetch('/api/admin/marketplace', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ report_id, report_status }) });
    load();
  }

  const vmap = new Map((data?.vendors || []).map((v) => [v.id, v.company_name]));
  const lmap = new Map([...(data?.products || []), ...(data?.services || [])].map((l) => [l.id, l.name]));

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
              <div className="am-lbl">Reported issues ({data.reports.length})</div>
              {data.reports.length === 0 ? <p className="am-none">No reports.</p> : (
                <div className="am-scroll"><table>
                  <thead><tr><th>Listing</th><th>Vendor</th><th>Reason</th><th>Details</th><th>Reporter</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {data.reports.map((r) => (
                      <tr key={r.id}>
                        <td><a href={`/marketplace/${r.kind}/${r.product_id || r.service_id}`} target="_blank" rel="noreferrer">{lmap.get((r.product_id || r.service_id) as string) || r.kind}</a></td>
                        <td>{vmap.get(r.vendor_id) || '—'}</td>
                        <td>{r.reason.replace('_', ' ')}</td>
                        <td className="am-details">{r.details || '—'}</td>
                        <td>{r.reporter_email || '—'}</td>
                        <td><span className={'am-pill ' + r.status}>{r.status}</span></td>
                        <td>
                          {r.status === 'new' && (
                            <>
                              <button onClick={() => setStatus(r.kind, (r.product_id || r.service_id) as string, 'unpublished')}>Unpublish listing</button>{' '}
                              <button onClick={() => setReportStatus(r.id, 'reviewed')}>Mark reviewed</button>{' '}
                              <button onClick={() => setReportStatus(r.id, 'dismissed')}>Dismiss</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </section>

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
.am{min-height:100vh;background:#F8F7FB;color:#141320;font-family:'Outfit',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.am *{box-sizing:border-box;}
.am-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid rgba(20,19,32,.08);position:sticky;top:0;background:rgba(248,247,251,.85);backdrop-filter:blur(20px);z-index:20;}
.am-brand{display:flex;align-items:baseline;gap:10px;color:#141320;text-decoration:none;}
.am-brand b{font-size:17px;}.am-brand i{color:#4A3DB0;font-style:normal;}
.am-brand span{color:#615F72;font-size:13px;}
.am-link{color:#4A3DB0;font-size:13.5px;font-weight:600;text-decoration:none;}
.am-wrap{max-width:1000px;margin:0 auto;padding:32px 20px 100px;}
.am-empty{text-align:center;color:#615F72;padding:80px 0;}
.am-empty a{color:#4A3DB0;}
.am-msg{background:rgba(108,92,224,.12);border:1px solid rgba(108,92,224,.25);color:#4A3DB0;padding:10px 14px;border-radius:11px;font-size:13px;margin-bottom:14px;}
.am-card{background:rgba(20,19,32,.04);border:1px solid rgba(20,19,32,.08);border-radius:16px;padding:20px;margin-bottom:18px;}
.am-lbl{font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#4A3DB0;margin-bottom:12px;}
.am-scroll{overflow-x:auto;}
.am-card table{width:100%;border-collapse:collapse;font-size:13px;}
.am-card th{text-align:left;color:#615F72;font-weight:600;padding:7px 10px;border-bottom:1px solid rgba(20,19,32,.1);white-space:nowrap;}
.am-card td{padding:8px 10px;border-bottom:1px solid rgba(20,19,32,.05);}
.am-card td a{color:#4A3DB0;}
.am-pill{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:3px 8px;border-radius:99px;background:rgba(20,19,32,.07);color:#3B3A4A;white-space:nowrap;}
.am-pill.published,.am-pill.approved{background:rgba(47,158,106,.12);color:#2F9E6A;}
.am-pill.draft,.am-pill.pending,.am-pill.new{background:rgba(198,138,40,.1);color:#C68A28;}
.am-pill.needs_review{background:rgba(178,94,20,.12);color:#B25E14;}
.am-pill.unpublished,.am-pill.archived,.am-pill.rejected{background:rgba(20,19,32,.06);color:#615F72;}
.am-card button{font-family:inherit;background:none;border:1px solid rgba(20,19,32,.12);color:#3B3A4A;font-size:12px;border-radius:8px;padding:5px 10px;cursor:pointer;transition:background .15s ease,border-color .15s ease,color .15s ease;}
.am-card button:hover{border-color:#CE4B43;color:#CE4B43;}
.am button:focus-visible,.am a:focus-visible{outline:2px solid #6C5CE0;outline-offset:2px;border-radius:6px;}
.am-none{color:#615F72;font-size:13px;margin:0;}
.am-details{max-width:260px;white-space:normal;color:#3B3A4A;}
.am-pill.reviewed{background:rgba(62,111,208,.12);color:#3E6FD0;}
.am-pill.dismissed{background:rgba(20,19,32,.06);color:#615F72;}
`;
