'use client';

// Operator money ledger — every opportunity's commission in one place:
// pipeline (quoted/accepted), billed & due (deal closed, invoice out), paid.

import { useCallback, useEffect, useState } from 'react';

interface Row {
  id: string; ref: string; vendor_name: string; buyer_company: string;
  quote_amount: number | null; final_amount: number | null; commission_amount: number;
  effective_rate: number | null; status: string; invoice_number: string | null;
  due_date: string | null; paid_at: string | null; protected_until: string | null; created_at: string;
  discrepancy?: boolean;
}
interface Totals { pipeline: number; billed_due: number; paid: number }

const money = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }));
const day = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString() : '—');

export default function AdminCommissionsPage() {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals>({ pipeline: 0, billed_due: 0, paid: 0 });
  const [filter, setFilter] = useState<'all' | 'due' | 'paid' | 'pipeline'>('all');
  const [ledgerSource, setLedgerSource] = useState<'view' | 'fallback' | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/commissions');
    if (res.status === 401) { setAuthorized(false); setChecking(false); return; }
    const data = await res.json();
    if (data.ok) { setRows(data.rows || []); setTotals(data.totals || { pipeline: 0, billed_due: 0, paid: 0 }); setLedgerSource(data.ledger_source || null); setAuthorized(true); }
    setChecking(false);
  }, []);
  useEffect(() => { document.title = 'Commissions — NXT//LINK'; load(); }, [load]);

  async function setPaid(id: string, paid: boolean) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, paid_at: paid ? new Date().toISOString() : null, status: paid ? 'paid' : 'won' } : r)));
    await fetch('/api/admin/commissions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: paid ? 'mark_paid' : 'mark_unpaid' }) });
    load();
  }

  const visible = rows.filter((r) => {
    if (filter === 'due') return r.status === 'won' && !r.paid_at;
    if (filter === 'paid') return !!r.paid_at;
    if (filter === 'pipeline') return r.status === 'quoted' || r.status === 'accepted';
    return true;
  });

  return (
    <div className="cm">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="cm-nav">
        <a className="cm-brand" href="/admin"><b>NXT<i>{'//'}</i>LINK</b><span>Commissions</span></a>
        <a className="cm-link" href="/admin/marketplace">Marketplace admin</a>
      </nav>
      <main className="cm-wrap">
        {checking ? <div className="cm-empty">Loading…</div>
          : !authorized ? <div className="cm-empty">Operator access required — <a href="/login">sign in</a> with an operator account.</div>
          : (
            <>
              <h1>Money ledger</h1>
              <p className="cm-sub">Every deal&apos;s commission: what&apos;s in the pipeline, what&apos;s billed and due to NXT{'//'}LINK, and what&apos;s been paid.</p>
              {ledgerSource === 'fallback' && (
                <div className="cm-notice">Unified ledger view not active yet — showing direct table reads.</div>
              )}

              <div className="cm-tiles">
                <button className={'cm-tile' + (filter === 'pipeline' ? ' on' : '')} onClick={() => setFilter(filter === 'pipeline' ? 'all' : 'pipeline')}>
                  <small>In pipeline (quoted / accepted)</small><b>{money(totals.pipeline)}</b>
                </button>
                <button className={'cm-tile due' + (filter === 'due' ? ' on' : '')} onClick={() => setFilter(filter === 'due' ? 'all' : 'due')}>
                  <small>Billed &amp; due to NXT{'//'}LINK</small><b>{money(totals.billed_due)}</b>
                </button>
                <button className={'cm-tile paid' + (filter === 'paid' ? ' on' : '')} onClick={() => setFilter(filter === 'paid' ? 'all' : 'paid')}>
                  <small>Collected</small><b>{money(totals.paid)}</b>
                </button>
              </div>

              {visible.length === 0 ? <div className="cm-empty">No commissions {filter !== 'all' ? 'in this view' : 'yet — they appear when vendors send quotes'}.</div> : (
                <div className="cm-tablewrap">
                  <table className="cm-table">
                    <thead><tr><th>Ref</th><th>Vendor</th><th>Buyer</th><th>Deal</th><th>Commission</th><th>Status</th><th>Invoice</th><th>Due</th><th></th></tr></thead>
                    <tbody>
                      {visible.map((r) => (
                        <tr key={r.id}>
                          <td>{r.ref}</td>
                          <td>{r.vendor_name}</td>
                          <td>{r.buyer_company}</td>
                          <td>{money(r.final_amount ?? r.quote_amount)}</td>
                          <td className="cm-fee">{money(r.commission_amount)}{r.effective_rate ? <small> ({(r.effective_rate * 100).toFixed(1)}%)</small> : null}</td>
                          <td>
                            <span className={'cm-status ' + (r.paid_at ? 'paid' : r.status)}>{r.paid_at ? 'paid' : r.status}</span>
                            {r.discrepancy && <span className="cm-warn" title="Deal and commission records disagree — check /api/admin/reconcile">⚠</span>}
                          </td>
                          <td>{r.invoice_number || '—'}</td>
                          <td>{day(r.due_date)}</td>
                          <td>
                            {r.status === 'won' && !r.paid_at && <button className="cm-btn" onClick={() => setPaid(r.id, true)}>Mark paid</button>}
                            {r.paid_at && <button className="cm-btn ghost" onClick={() => setPaid(r.id, false)}>Undo</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
      </main>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
.cm{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.cm *{box-sizing:border-box;}
.cm-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(10,10,15,.9);backdrop-filter:blur(20px);z-index:20;}
.cm-brand{display:flex;align-items:baseline;gap:10px;color:#F0F0F5;text-decoration:none;}
.cm-brand b{font-size:17px;}.cm-brand i{color:#A78BFA;font-style:normal;}
.cm-brand span{color:#8080A0;font-size:13px;}
.cm-link{color:#A78BFA;font-size:13.5px;font-weight:600;text-decoration:none;}
.cm-wrap{max-width:1080px;margin:0 auto;padding:36px 20px 100px;}
.cm-wrap h1{font-size:28px;font-weight:800;letter-spacing:-.02em;}
.cm-sub{color:#8080A0;font-size:14px;margin:6px 0 22px;line-height:1.5;}
.cm-notice{font-size:12.5px;color:#8080A0;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:8px 12px;margin:0 0 22px;}
.cm-warn{display:inline-block;margin-left:6px;font-size:12px;color:#FBBF24;cursor:help;}
.cm-empty{text-align:center;color:#8080A0;padding:60px 0;}
.cm-empty a{color:#A78BFA;}
.cm-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:26px;}
.cm-tile{font-family:inherit;text-align:left;background:#12121B;border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:18px 20px;cursor:pointer;display:flex;flex-direction:column;gap:8px;color:#F0F0F5;}
.cm-tile small{color:#8080A0;font-size:12px;}
.cm-tile b{font-size:24px;font-weight:800;letter-spacing:-.02em;}
.cm-tile.due b{color:#FBBF24;}
.cm-tile.paid b{color:#34D399;}
.cm-tile.on{border-color:#7C5CFC;background:rgba(124,92,252,.08);}
.cm-tablewrap{overflow-x:auto;background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:16px;}
.cm-table{width:100%;border-collapse:collapse;font-size:13.5px;min-width:820px;}
.cm-table th{text-align:left;padding:12px 14px;color:#8080A0;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.08);}
.cm-table td{padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.05);vertical-align:middle;}
.cm-fee{color:#C4B5FD;font-weight:700;}
.cm-fee small{color:#8080A0;font-weight:400;}
.cm-status{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:4px 9px;border-radius:99px;background:rgba(255,255,255,.07);color:#C0C0D0;}
.cm-status.quoted{background:rgba(124,92,252,.15);color:#C4B5FD;}
.cm-status.accepted{background:rgba(52,211,153,.1);color:#6EE7B7;}
.cm-status.won{background:rgba(251,191,36,.13);color:#FBBF24;}
.cm-status.paid{background:rgba(52,211,153,.16);color:#34D399;}
.cm-status.lost,.cm-status.void{background:rgba(252,165,165,.1);color:#FCA5A5;}
.cm-btn{font-family:inherit;font-size:12px;font-weight:700;background:#7C5CFC;border:none;color:#fff;border-radius:8px;padding:7px 12px;cursor:pointer;}
.cm-btn.ghost{background:none;border:1px solid rgba(255,255,255,.14);color:#8080A0;}
`;
