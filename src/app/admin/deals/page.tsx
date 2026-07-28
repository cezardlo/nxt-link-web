'use client';

// /admin/deals — concierge deal tracker + commission calculator (operator-only,
// under the admin AccessGate). Record a deal → see the commission the fee engine
// computes (4% first $50k, 2% above, $20k cap; optional first-deal 50%
// discount, operator-applied) → move it through payment → invoice. This is
// the manual money loop for the MVP.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { calculateFee, firstDealDiscountAmount } from '@/lib/fees/engine';
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

// Instant preview that calls the SAME sacred engine the server uses, so the
// operator's live number can never drift from the billed commission (no more
// hardcoded bracket mirror). Server remains authoritative.
function previewFee(net: number) {
  if (!(net > 0)) return { fee: 0, rate: 0, cap: false, lines: [] as Array<{ amt: number; rate: number; fee: number }> };
  const r = calculateFee(net);
  const lines = r.lines.map((l) => ({ amt: l.amountInBracket, rate: l.rate, fee: l.fee }));
  return { fee: r.fee, rate: r.effectiveRate, cap: r.appliedMaximum, lines };
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
  const credit = f.is_free_credit ? firstDealDiscountAmount(pv.fee) : 0;
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
    <div className="ops">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ops-wrap">
        <h1>Deals &amp; commissions</h1>
        <p className="ops-sub">Concierge tracker — record a deal, the engine computes the commission (4% first $50k · 2% above · $20k cap), then move it to paid and invoice.</p>

        {loading ? (
          <div className="ops-empty">Loading…</div>
        ) : authError ? (
          <div className="ops-card">
            <div className="ops-empty">
              Operator session expired — this isn&apos;t an empty pipeline, you were signed out.<br />
              <button className="ops-mini" onClick={unlockAgain} style={{ marginTop: 12 }}>Unlock the workspace again</button>
            </div>
          </div>
        ) : (
          <>
            {ledgerSource === 'fallback' && (
              <div className="ops-notice">Unified ledger view not active yet — showing direct table reads.</div>
            )}

            <div className="ops-stats">
              <div className="ops-stat"><b>{totals.count}</b><span>Deals</span></div>
              <div className="ops-stat"><b>{money(totals.expected)}</b><span>Commission expected</span></div>
              <div className="ops-stat"><b>{money(totals.collected)}</b><span>Collected (paid)</span></div>
            </div>

            {/* NXT AI · Commission co-pilot */}
            <div className="ops-card ops-ai">
              <div className="ops-cardhd">✦ NXT AI · Commission co-pilot</div>
              <div className="ops-chat">
                {chat.length === 0 ? (
                  <div className="ops-chathint">Type it like you’d say it — “Log Acme Forklifts deal $100k for buyer El Paso Distribution”, or “summary today”. I’ll fill the form below; you confirm.</div>
                ) : chat.map((m, i) => <div key={i} className={'ops-bub ' + m.role}>{m.text}</div>)}
                {aiBusy && <div className="ops-bub ai">Thinking…</div>}
              </div>
              <div className="ops-airow">
                <input value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && askAI()} placeholder="Tell NXT AI what happened…" />
                <button className="ops-btn" disabled={aiBusy} onClick={askAI}>Send</button>
              </div>
            </div>

            {/* Calculator + create */}
            <div className="ops-card">
              <div className="ops-cardhd">Record a deal</div>
              <div className="ops-grid">
                <label>Vendor<input value={f.vendor_name} onChange={(e) => setF({ ...f, vendor_name: e.target.value })} placeholder="Borderplex Robotics Co." /></label>
                <label>Buyer company<input value={f.buyer_company} onChange={(e) => setF({ ...f, buyer_company: e.target.value })} placeholder="El Paso Distribution LLC" /></label>
                <label>Opportunity ref<input value={f.opportunity_ref} onChange={(e) => setF({ ...f, opportunity_ref: e.target.value })} placeholder="NXT-2026-0042" /></label>
                <label>Net eligible amount ($)<input type="number" value={f.net_amount} onChange={(e) => setF({ ...f, net_amount: e.target.value })} placeholder="100000" /></label>
              </div>
              <label className="ops-desc">Description<input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="2 AMR pallet robots + install" /></label>

              {/* Live commission breakdown */}
              {net > 0 && (
                <div className="ops-calc">
                  {pv.lines.map((l, i) => (
                    <div key={i} className="ops-cline"><span>{money(l.amt)} at {(l.rate * 100).toFixed(0)}%</span><b>{money(l.fee)}</b></div>
                  ))}
                  {pv.cap && <div className="ops-cline cap"><span>$20,000 cap applied</span><b>—</b></div>}
                  <label className="ops-credit"><input type="checkbox" checked={f.is_free_credit} onChange={(e) => setF({ ...f, is_free_credit: e.target.checked })} /> First deal — 50% off (−{money(credit)})</label>
                  <div className="ops-cline total"><span>NXT//LINK commission</span><b>{money(commission)}</b></div>
                  <div className="ops-eff">Effective rate {(net > 0 ? (commission / net) * 100 : 0).toFixed(2)}% · protected 12 months</div>
                </div>
              )}
              <button className="ops-btn" disabled={busy} onClick={create}>Record deal</button>
              {msg && <div className={`ops-msg ${msg.startsWith('✓') ? 'ok' : 'err'}`}>{msg}</div>}
            </div>

            {/* Deals list */}
            <div className="ops-card">
              <div className="ops-cardhd">All deals</div>
              {deals.length === 0 ? <div className="ops-empty">No deals yet.</div> : (
                <div className="ops-table-wrap">
                  <table className="ops-table">
                    <thead><tr><th>Vendor / Buyer</th><th>Net</th><th>Commission</th><th>Status</th><th>Invoice</th><th></th></tr></thead>
                    <tbody>
                      {deals.map((d) => {
                        const idx = STATUS_FLOW.indexOf(d.status);
                        const next = idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
                        return (
                          <tr key={d.id}>
                            <td><b>{d.vendor_name}</b>{d.buyer_company && <div className="ops-sm">→ {d.buyer_company}</div>}{d.opportunity_ref && <div className="ops-sm mono">{d.opportunity_ref}</div>}</td>
                            <td className="mono">{money(d.net_amount)}</td>
                            <td className="mono"><b>{money(Number(d.commission_amount) || 0)}</b>{d.applied_cap && <div className="ops-sm">cap</div>}{d.is_free_credit && <div className="ops-sm">credit</div>}</td>
                            <td>
                              <span className={`ops-badge s-${d.status}`}>{STATUS_LABEL[d.status] || d.status}</span>
                              {d.discrepancy && <span className="ops-warn" title="Deal and commission records disagree — check /api/admin/reconcile">⚠</span>}
                            </td>
                            <td>{d.status === 'invoiced' || d.status === 'paid' ? (
                              <input className="ops-inv" defaultValue={d.invoice_ref || ''} placeholder="INV-###" disabled={statusBusy === d.id} onBlur={(e) => { if (e.target.value !== (d.invoice_ref || '')) setStatus(d.id, d.status, e.target.value); }} />
                            ) : <span className="ops-sm">—</span>}</td>
                            <td>
                              {next && <button className="ops-mini" disabled={statusBusy === d.id} onClick={() => setStatus(d.id, next)}>{statusBusy === d.id ? 'Saving…' : `→ ${STATUS_LABEL[next]}`}</button>}
                              {statusErr?.id === d.id && <div className="ops-sm err">{statusErr.message}</div>}
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
.ops{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.ops *{box-sizing:border-box;}
.ops-wrap{max-width:1000px;margin:0 auto;padding:34px 20px 90px;}
.ops-wrap h1{font-size:26px;font-weight:800;letter-spacing:-.02em;margin:0;}
.ops-sub{color:#8080A0;font-size:14px;margin:8px 0 0;max-width:70ch;line-height:1.6;}
.ops-notice{font-size:12.5px;color:#8080A0;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:8px 12px;margin-top:12px;}
.ops-warn{display:inline-block;margin-left:6px;font-size:12px;color:#FBBF24;cursor:help;}
.ops-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0;}
.ops-stat{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:16px;}
.ops-stat b{font-size:22px;font-weight:800;display:block;font-variant-numeric:tabular-nums;}
.ops-stat span{font-size:12px;color:#8080A0;}
.ops-card{background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:15px;padding:20px;margin-bottom:18px;}
.ops-cardhd{font-size:13px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#8080A0;margin-bottom:16px;}
.ops-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px;}
@media(max-width:600px){.ops-grid{grid-template-columns:1fr;}}
.ops-card label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:600;color:#8080A0;}
.ops-desc{margin-top:13px;}
.ops-card input{font-family:inherit;font-size:14px;padding:11px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#0A0A0F;color:#F0F0F5;outline:none;}
.ops-card input:focus{border-color:#7C5CFC;}
.ops-calc{background:#0E0E16;border:1px solid rgba(124,92,252,.25);border-radius:12px;padding:14px;margin-top:16px;}
.ops-cline{display:flex;justify-content:space-between;font-size:13.5px;color:#B8B6CC;padding:5px 0;font-variant-numeric:tabular-nums;}
.ops-cline.cap{color:#FBBF24;}
.ops-cline.total{border-top:1px solid rgba(255,255,255,.1);margin-top:6px;padding-top:10px;font-size:15px;color:#F0F0F5;}
.ops-cline.total b{color:#C4B5FD;font-size:18px;}
.ops-credit{flex-direction:row !important;align-items:center;gap:8px;font-size:12.5px !important;color:#C0C0D0 !important;margin-top:8px;font-weight:500 !important;}
.ops-eff{font-size:11.5px;color:#8080A0;margin-top:8px;}
.ops-btn{margin-top:16px;font-family:inherit;font-size:14px;font-weight:700;padding:12px 22px;border-radius:11px;border:none;background:#7C5CFC;color:#fff;cursor:pointer;}
.ops-btn:hover{background:#6344DF;}.ops-btn:disabled{opacity:.5;}
.ops-msg{margin-top:12px;font-size:13px;padding:10px 13px;border-radius:9px;}
.ops-msg.ok{background:rgba(52,211,153,.1);color:#34D399;}.ops-msg.err{background:rgba(248,113,113,.1);color:#FCA5A5;}
.ops-empty{color:#8080A0;font-size:14px;padding:24px 0;}
.ops-table-wrap{overflow-x:auto;}
.ops-table{width:100%;border-collapse:collapse;font-size:13.5px;}
.ops-table th{text-align:left;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#5A5A70;padding:0 12px 10px;}
.ops-table td{padding:12px;border-top:1px solid rgba(255,255,255,.07);vertical-align:top;}
.ops-table .mono{font-variant-numeric:tabular-nums;}
.ops-sm{font-size:11px;color:#8080A0;margin-top:2px;}
.ops-sm.mono{font-variant-numeric:tabular-nums;color:#A78BFA;}
.ops-sm.err{color:#FCA5A5;margin-top:6px;line-height:1.4;}
.ops-badge{font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;background:rgba(255,255,255,.06);color:#C0C0D0;white-space:nowrap;}
.ops-badge.s-paid{background:rgba(52,211,153,.14);color:#34D399;}
.ops-badge.s-invoiced,.ops-badge.s-payment_confirmed{background:rgba(124,92,252,.14);color:#C4B5FD;}
.ops-badge.s-overdue,.ops-badge.s-disputed{background:rgba(248,113,113,.14);color:#FCA5A5;}
.ops-inv{font-family:inherit;font-size:12.5px;padding:7px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:#0A0A0F;color:#F0F0F5;width:110px;outline:none;}
.ops-mini{font-family:inherit;font-size:12px;font-weight:700;padding:7px 12px;border-radius:8px;border:none;background:rgba(124,92,252,.15);color:#C4B5FD;cursor:pointer;white-space:nowrap;}
.ops-mini:hover{background:rgba(124,92,252,.28);}
.ops-mini:disabled{opacity:.5;cursor:not-allowed;}
.ops-inv:disabled{opacity:.6;cursor:not-allowed;}
.ops-ai{background:linear-gradient(160deg,rgba(124,92,252,.1),rgba(52,211,153,.04)),#12121B;border-color:rgba(124,92,252,.28);}
.ops-chat{display:flex;flex-direction:column;gap:9px;margin-bottom:12px;max-height:280px;overflow-y:auto;}
.ops-chathint{font-size:13px;color:#8080A0;line-height:1.55;}
.ops-bub{font-size:13.5px;line-height:1.5;padding:10px 13px;border-radius:12px;max-width:88%;}
.ops-bub.user{align-self:flex-end;background:#7C5CFC;color:#fff;border-bottom-right-radius:3px;}
.ops-bub.ai{align-self:flex-start;background:#0E0E16;border:1px solid rgba(255,255,255,.09);color:#D5D4E0;border-bottom-left-radius:3px;}
.ops-airow{display:flex;gap:9px;}
.ops-airow input{flex:1;font-family:inherit;font-size:14px;padding:11px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#0A0A0F;color:#F0F0F5;outline:none;}
.ops-airow input:focus{border-color:#7C5CFC;}
.ops-airow .ops-btn{margin-top:0;}
`;
