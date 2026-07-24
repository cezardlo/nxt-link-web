'use client';

// /admin/deals — concierge deal tracker + commission calculator (operator-only,
// under the admin AccessGate). Record a deal → see the commission the fee engine
// computes (5% first $50k, 3% above, $20k cap; optional founding-vendor credit
// up to $1,250, operator-applied) → move it through payment → invoice. This is
// the manual money loop for the MVP.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FIRST_DEAL_CREDIT_FOUNDING } from '@/lib/fees/engine';
import { clearPrivateAccess } from '@/lib/privateAccess';

interface Deal {
  id: string; vendor_name: string; buyer_company: string | null; buyer_name: string | null;
  description: string | null; net_amount: number; commission_amount: number | null;
  effective_rate: number | null; applied_cap: boolean; is_free_credit: boolean;
  credit_applied: number | null; status: string; invoice_ref: string | null;
  protected_until: string | null; opportunity_ref: string | null; created_at: string;
  discrepancy?: boolean;
}
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString(); } catch { return ''; } };

// Client mirror of the fee engine for an instant preview (server is authoritative).
function previewFee(net: number) {
  if (!(net > 0)) return { fee: 0, rate: 0, cap: false, lines: [] as Array<{ amt: number; rate: number; fee: number }> };
  const lines: Array<{ amt: number; rate: number; fee: number }> = [];
  let fee = 0;
  const first = Math.min(net, 50000);
  lines.push({ amt: first, rate: 0.05, fee: first * 0.05 }); fee += first * 0.05;
  if (net > 50000) { const rest = net - 50000; lines.push({ amt: rest, rate: 0.03, fee: rest * 0.03 }); fee += rest * 0.03; }
  const cap = fee > 20000; if (cap) fee = 20000;
  return { fee: Math.round(fee), rate: net > 0 ? fee / net : 0, cap, lines };
}

const STATUS_FLOW = ['reserved', 'won', 'payment_reported', 'payment_confirmed', 'invoiced', 'paid'];
const STATUS_LABEL: Record<string, string> = {
  reserved: 'Reserved', won: 'Won', payment_reported: 'Payment reported', payment_confirmed: 'Payment confirmed',
  invoiced: 'Invoiced', paid: 'Paid', overdue: 'Overdue', disputed: 'Disputed', credited: 'Credited', cancelled: 'Cancelled',
};

export default function AdminDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  // An expired admin session (Supabase session OR the access-code gate cookie)
  // must never render as "No deals yet." — that's a healthy-looking empty
  // pipeline hiding the real problem (audit: this is the money ledger).
  const [authError, setAuthError] = useState(false);
  const [ledgerSource, setLedgerSource] = useState<'view' | 'fallback' | null>(null);
  const [f, setF] = useState({ vendor_name: '', buyer_company: '', buyer_name: '', description: '', net_amount: '', is_free_credit: false, opportunity_ref: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [statusErr, setStatusErr] = useState<{ id: string; message: string } | null>(null);
  const [chat, setChat] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/deals');
      if (r.status === 401) { setAuthError(true); setLoading(false); return; }
      const j = await r.json();
      if (j.ok) { setDeals(j.deals); setLedgerSource(j.ledger_source || null); setAuthError(false); }
    } catch { /* */ }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Points back to the access-code gate: the localStorage flag is only a
  // non-secret UI hint (see src/lib/privateAccess.ts) that tells AccessGate
  // not to re-prompt — clearing it + reloading forces AccessGate to check
  // again and show the "unlock workspace" screen, the same gate every other
  // /admin/* page sits behind.
  function unlockAgain() {
    clearPrivateAccess();
    window.location.reload();
  }

  const net = Number(f.net_amount) || 0;
  const pv = useMemo(() => previewFee(net), [net]);
  const credit = f.is_free_credit ? Math.min(FIRST_DEAL_CREDIT_FOUNDING, pv.fee) : 0;
  const commission = Math.max(0, pv.fee - credit);

  async function create() {
    if (!f.vendor_name.trim() || !(net > 0)) { setMsg('Vendor name and a net amount are required.'); return; }
    setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/admin/deals', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, net_amount: net }) });
      const j = await r.json();
      if (j.ok) { setMsg(`✓ Deal recorded — commission ${money(j.deal.commission_amount)}`); setF({ vendor_name: '', buyer_company: '', buyer_name: '', description: '', net_amount: '', is_free_credit: false, opportunity_ref: '' }); load(); }
      else setMsg(j.message || 'Could not save.');
    } catch { setMsg('Could not save.'); }
    setBusy(false);
  }
  async function setStatus(id: string, status: string, invoice_ref?: string) {
    if (statusBusy) return;
    setStatusBusy(id); setStatusErr(null);
    try {
      const r = await fetch('/api/admin/deals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, invoice_ref }) });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) {
        setStatusErr({ id, message: (j && j.message) || 'Could not update status — try again.' });
        return;
      }
      load();
    } catch {
      setStatusErr({ id, message: 'Could not update status — try again.' });
    } finally {
      setStatusBusy(null);
    }
  }

  // NXT AI co-pilot: parse plain English, then prefill the deal form (admin
  // still presses “Record deal” to confirm) or answer a summary request.
  async function askAI() {
    const q = aiInput.trim(); if (!q || aiBusy) return;
    setChat((c) => [...c, { role: 'user', text: q }]); setAiInput(''); setAiBusy(true);
    try {
      const r = await fetch('/api/admin/deals/assist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: q }) });
      const j = await r.json();
      setChat((c) => [...c, { role: 'ai', text: j.reply || j.message || 'Sorry, I could not process that.' }]);
      if (j.action === 'prefill_deal' && j.draft) {
        setF((prev) => ({
          ...prev,
          vendor_name: j.draft.vendor_name || prev.vendor_name,
          buyer_company: j.draft.buyer_company || prev.buyer_company,
          net_amount: j.draft.net_amount != null ? String(j.draft.net_amount) : prev.net_amount,
        }));
      }
    } catch { setChat((c) => [...c, { role: 'ai', text: 'Something went wrong — try again.' }]); }
    setAiBusy(false);
  }

  const totals = useMemo(() => {
    let expected = 0, collected = 0;
    for (const d of deals) { const c = Number(d.commission_amount) || 0; expected += c; if (d.status === 'paid') collected += c; }
    return { expected, collected, count: deals.length };
  }, [deals]);

  return (
    <div className="ad">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ad-wrap">
        <h1>Deals &amp; commissions</h1>
        <p className="ad-sub">Concierge tracker — record a deal, the engine computes the commission (5% first $50k · 3% above · $20k cap), then move it to paid and invoice.</p>

        {loading ? (
          <div className="ad-empty">Loading…</div>
        ) : authError ? (
          <div className="ad-card">
            <div className="ad-empty">
              Operator session expired — this isn&apos;t an empty pipeline, you were signed out.<br />
              <button className="ad-mini" onClick={unlockAgain} style={{ marginTop: 12 }}>Unlock the workspace again</button>
            </div>
          </div>
        ) : (
          <>
            {ledgerSource === 'fallback' && (
              <div className="ad-notice">Unified ledger view not active yet — showing direct table reads.</div>
            )}

            <div className="ad-stats">
              <div className="ad-stat"><b>{totals.count}</b><span>Deals</span></div>
              <div className="ad-stat"><b>{money(totals.expected)}</b><span>Commission expected</span></div>
              <div className="ad-stat"><b>{money(totals.collected)}</b><span>Collected (paid)</span></div>
            </div>

            {/* NXT AI · Commission co-pilot */}
            <div className="ad-card ad-ai">
              <div className="ad-cardhd">✦ NXT AI · Commission co-pilot</div>
              <div className="ad-chat">
                {chat.length === 0 ? (
                  <div className="ad-chathint">Type it like you’d say it — “Log Acme Forklifts deal $100k for buyer El Paso Distribution”, or “summary today”. I’ll fill the form below; you confirm.</div>
                ) : chat.map((m, i) => <div key={i} className={'ad-bub ' + m.role}>{m.text}</div>)}
                {aiBusy && <div className="ad-bub ai">Thinking…</div>}
              </div>
              <div className="ad-airow">
                <input value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && askAI()} placeholder="Tell NXT AI what happened…" />
                <button className="ad-btn" disabled={aiBusy} onClick={askAI}>Send</button>
              </div>
            </div>

            {/* Calculator + create */}
            <div className="ad-card">
              <div className="ad-cardhd">Record a deal</div>
              <div className="ad-grid">
                <label>Vendor<input value={f.vendor_name} onChange={(e) => setF({ ...f, vendor_name: e.target.value })} placeholder="Borderplex Robotics Co." /></label>
                <label>Buyer company<input value={f.buyer_company} onChange={(e) => setF({ ...f, buyer_company: e.target.value })} placeholder="El Paso Distribution LLC" /></label>
                <label>Opportunity ref<input value={f.opportunity_ref} onChange={(e) => setF({ ...f, opportunity_ref: e.target.value })} placeholder="NXT-2026-0042" /></label>
                <label>Net eligible amount ($)<input type="number" value={f.net_amount} onChange={(e) => setF({ ...f, net_amount: e.target.value })} placeholder="100000" /></label>
              </div>
              <label className="ad-desc">Description<input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="2 AMR pallet robots + install" /></label>

              {/* Live commission breakdown */}
              {net > 0 && (
                <div className="ad-calc">
                  {pv.lines.map((l, i) => (
                    <div key={i} className="ad-cline"><span>{money(l.amt)} at {(l.rate * 100).toFixed(0)}%</span><b>{money(l.fee)}</b></div>
                  ))}
                  {pv.cap && <div className="ad-cline cap"><span>$20,000 cap applied</span><b>—</b></div>}
                  <label className="ad-credit"><input type="checkbox" checked={f.is_free_credit} onChange={(e) => setF({ ...f, is_free_credit: e.target.checked })} /> Apply founding-vendor credit (−{money(credit)})</label>
                  <div className="ad-cline total"><span>NXT//LINK commission</span><b>{money(commission)}</b></div>
                  <div className="ad-eff">Effective rate {(net > 0 ? (commission / net) * 100 : 0).toFixed(2)}% · protected 12 months</div>
                </div>
              )}
              <button className="ad-btn" disabled={busy} onClick={create}>Record deal</button>
              {msg && <div className={`ad-msg ${msg.startsWith('✓') ? 'ok' : 'err'}`}>{msg}</div>}
            </div>

            {/* Deals list */}
            <div className="ad-card">
              <div className="ad-cardhd">All deals</div>
              {deals.length === 0 ? <div className="ad-empty">No deals yet.</div> : (
                <div className="ad-table-wrap">
                  <table className="ad-table">
                    <thead><tr><th>Vendor / Buyer</th><th>Net</th><th>Commission</th><th>Status</th><th>Invoice</th><th></th></tr></thead>
                    <tbody>
                      {deals.map((d) => {
                        const idx = STATUS_FLOW.indexOf(d.status);
                        const next = idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
                        return (
                          <tr key={d.id}>
                            <td><b>{d.vendor_name}</b>{d.buyer_company && <div className="ad-sm">→ {d.buyer_company}</div>}{d.opportunity_ref && <div className="ad-sm mono">{d.opportunity_ref}</div>}</td>
                            <td className="mono">{money(d.net_amount)}</td>
                            <td className="mono"><b>{money(Number(d.commission_amount) || 0)}</b>{d.applied_cap && <div className="ad-sm">cap</div>}{d.is_free_credit && <div className="ad-sm">credit</div>}</td>
                            <td>
                              <span className={`ad-badge s-${d.status}`}>{STATUS_LABEL[d.status] || d.status}</span>
                              {d.discrepancy && <span className="ad-warn" title="Deal and commission records disagree — check /api/admin/reconcile">⚠</span>}
                            </td>
                            <td>{d.status === 'invoiced' || d.status === 'paid' ? (
                              <input className="ad-inv" defaultValue={d.invoice_ref || ''} placeholder="INV-###" disabled={statusBusy === d.id} onBlur={(e) => { if (e.target.value !== (d.invoice_ref || '')) setStatus(d.id, d.status, e.target.value); }} />
                            ) : <span className="ad-sm">—</span>}</td>
                            <td>
                              {next && <button className="ad-mini" disabled={statusBusy === d.id} onClick={() => setStatus(d.id, next)}>{statusBusy === d.id ? 'Saving…' : `→ ${STATUS_LABEL[next]}`}</button>}
                              {statusErr?.id === d.id && <div className="ad-sm err">{statusErr.message}</div>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const CSS = `
.ad{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.ad *{box-sizing:border-box;}
.ad-wrap{max-width:1000px;margin:0 auto;padding:34px 20px 90px;}
.ad-wrap h1{font-size:26px;font-weight:800;letter-spacing:-.02em;margin:0;}
.ad-sub{color:#8080A0;font-size:14px;margin:8px 0 0;max-width:70ch;line-height:1.6;}
.ad-notice{font-size:12.5px;color:#8080A0;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:8px 12px;margin-top:12px;}
.ad-warn{display:inline-block;margin-left:6px;font-size:12px;color:#FBBF24;cursor:help;}
.ad-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0;}
.ad-stat{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:16px;}
.ad-stat b{font-size:22px;font-weight:800;display:block;font-variant-numeric:tabular-nums;}
.ad-stat span{font-size:12px;color:#8080A0;}
.ad-card{background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:15px;padding:20px;margin-bottom:18px;}
.ad-cardhd{font-size:13px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#8080A0;margin-bottom:16px;}
.ad-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px;}
@media(max-width:600px){.ad-grid{grid-template-columns:1fr;}}
.ad-card label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:600;color:#8080A0;}
.ad-desc{margin-top:13px;}
.ad-card input{font-family:inherit;font-size:14px;padding:11px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#0A0A0F;color:#F0F0F5;outline:none;}
.ad-card input:focus{border-color:#7C5CFC;}
.ad-calc{background:#0E0E16;border:1px solid rgba(124,92,252,.25);border-radius:12px;padding:14px;margin-top:16px;}
.ad-cline{display:flex;justify-content:space-between;font-size:13.5px;color:#B8B6CC;padding:5px 0;font-variant-numeric:tabular-nums;}
.ad-cline.cap{color:#FBBF24;}
.ad-cline.total{border-top:1px solid rgba(255,255,255,.1);margin-top:6px;padding-top:10px;font-size:15px;color:#F0F0F5;}
.ad-cline.total b{color:#C4B5FD;font-size:18px;}
.ad-credit{flex-direction:row !important;align-items:center;gap:8px;font-size:12.5px !important;color:#C0C0D0 !important;margin-top:8px;font-weight:500 !important;}
.ad-eff{font-size:11.5px;color:#8080A0;margin-top:8px;}
.ad-btn{margin-top:16px;font-family:inherit;font-size:14px;font-weight:700;padding:12px 22px;border-radius:11px;border:none;background:#7C5CFC;color:#fff;cursor:pointer;}
.ad-btn:hover{background:#6344DF;}.ad-btn:disabled{opacity:.5;}
.ad-msg{margin-top:12px;font-size:13px;padding:10px 13px;border-radius:9px;}
.ad-msg.ok{background:rgba(52,211,153,.1);color:#34D399;}.ad-msg.err{background:rgba(248,113,113,.1);color:#FCA5A5;}
.ad-empty{color:#8080A0;font-size:14px;padding:24px 0;}
.ad-table-wrap{overflow-x:auto;}
.ad-table{width:100%;border-collapse:collapse;font-size:13.5px;}
.ad-table th{text-align:left;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#5A5A70;padding:0 12px 10px;}
.ad-table td{padding:12px;border-top:1px solid rgba(255,255,255,.07);vertical-align:top;}
.ad-table .mono{font-variant-numeric:tabular-nums;}
.ad-sm{font-size:11px;color:#8080A0;margin-top:2px;}
.ad-sm.mono{font-variant-numeric:tabular-nums;color:#A78BFA;}
.ad-sm.err{color:#FCA5A5;margin-top:6px;line-height:1.4;}
.ad-badge{font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;background:rgba(255,255,255,.06);color:#C0C0D0;white-space:nowrap;}
.ad-badge.s-paid{background:rgba(52,211,153,.14);color:#34D399;}
.ad-badge.s-invoiced,.ad-badge.s-payment_confirmed{background:rgba(124,92,252,.14);color:#C4B5FD;}
.ad-badge.s-overdue,.ad-badge.s-disputed{background:rgba(248,113,113,.14);color:#FCA5A5;}
.ad-inv{font-family:inherit;font-size:12.5px;padding:7px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:#0A0A0F;color:#F0F0F5;width:110px;outline:none;}
.ad-mini{font-family:inherit;font-size:12px;font-weight:700;padding:7px 12px;border-radius:8px;border:none;background:rgba(124,92,252,.15);color:#C4B5FD;cursor:pointer;white-space:nowrap;}
.ad-mini:hover{background:rgba(124,92,252,.28);}
.ad-mini:disabled{opacity:.5;cursor:not-allowed;}
.ad-inv:disabled{opacity:.6;cursor:not-allowed;}
.ad-ai{background:linear-gradient(160deg,rgba(124,92,252,.1),rgba(52,211,153,.04)),#12121B;border-color:rgba(124,92,252,.28);}
.ad-chat{display:flex;flex-direction:column;gap:9px;margin-bottom:12px;max-height:280px;overflow-y:auto;}
.ad-chathint{font-size:13px;color:#8080A0;line-height:1.55;}
.ad-bub{font-size:13.5px;line-height:1.5;padding:10px 13px;border-radius:12px;max-width:88%;}
.ad-bub.user{align-self:flex-end;background:#7C5CFC;color:#fff;border-bottom-right-radius:3px;}
.ad-bub.ai{align-self:flex-start;background:#0E0E16;border:1px solid rgba(255,255,255,.09);color:#D5D4E0;border-bottom-left-radius:3px;}
.ad-airow{display:flex;gap:9px;}
.ad-airow input{flex:1;font-family:inherit;font-size:14px;padding:11px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#0A0A0F;color:#F0F0F5;outline:none;}
.ad-airow input:focus{border-color:#7C5CFC;}
.ad-airow .ad-btn{margin-top:0;}
`;
