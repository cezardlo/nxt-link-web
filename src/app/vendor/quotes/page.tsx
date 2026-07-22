'use client';

// /vendor/quotes — the vendor proposal builder, DB-backed.
// North star: a vendor answers a lead in ~2 minutes, never a blank 20-field
// form. Pick a lead → line items with live totals (prefilled starter row) →
// terms → live commission preview → Save draft or Send. Submitted revisions
// are immutable; "Revise" starts revision+1. Replaces the old localStorage-only
// builder — proposals now persist and survive logout.

import { useCallback, useEffect, useMemo, useState } from 'react';
import VendorNav from '@/components/VendorNav';

interface Lead {
  id: string; public_ref: string; kind: string; listing_name: string | null;
  company: string | null; contact_name: string | null; message: string | null;
  status: string; created_at: string; quote_amount: number | null; buyer_decision: string | null;
}
interface Item { description: string; qty: number; unit_price: number; kind: string }
interface Proposal {
  id: string; quote_request_id: string; revision: number; status: string;
  line_items: Item[]; subtotal: number | null; tax: number | null; discount: number | null;
  total: number; currency: string; lead_time: string | null; warranty: string | null;
  payment_terms: string | null; valid_until: string | null; assumptions: string | null;
  exclusions: string | null; notes: string | null; submitted_at: string | null;
}

const ITEM_KINDS = [
  { v: 'product', en: 'Product / equipment' }, { v: 'labor', en: 'Labor' },
  { v: 'install', en: 'Installation' }, { v: 'shipping', en: 'Shipping' },
  { v: 'travel', en: 'Travel / mobile fee' }, { v: 'other', en: 'Other' },
];
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString(); } catch { return ''; } };
const EMPTY_ITEM: Item = { description: '', qty: 1, unit_price: 0, kind: 'product' };

export default function VendorProposalsPage() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sel, setSel] = useState<Lead | null>(null);
  const [history, setHistory] = useState<Proposal[]>([]);

  const [items, setItems] = useState<Item[]>([{ ...EMPTY_ITEM }]);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [terms, setTerms] = useState({ lead_time: '', warranty: '', payment_terms: '50% deposit, 50% on completion', valid_until: '', assumptions: '', exclusions: '', notes: '' });
  const [commission, setCommission] = useState<{ amount: number; rate: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const subtotal = useMemo(() => items.reduce((s, i) => s + (i.qty || 0) * (i.unit_price || 0), 0), [items]);
  const total = Math.max(0, subtotal + (tax || 0) - (discount || 0));

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/vendor/leads');
        if (r.status === 401) { setSignedIn(false); setLoading(false); return; }
        const j = await r.json();
        setLeads((j.leads || []).filter((l: Lead) => !['won', 'lost', 'spam'].includes(l.status)));
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  // Live commission preview (debounced) so the fee is never a surprise.
  useEffect(() => {
    if (total <= 0) { setCommission(null); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/vendor/quote?amount=${total}`);
        const j = await r.json();
        if (j.ok) setCommission({ amount: j.commission_amount, rate: j.effective_rate });
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(t);
  }, [total]);

  const pickLead = useCallback(async (lead: Lead) => {
    setSel(lead); setMsg('');
    // Smart default: start the first line from what they asked about.
    setItems([{ ...EMPTY_ITEM, description: lead.listing_name || '' }]);
    setTax(0); setDiscount(0);
    setTerms({ lead_time: '', warranty: '', payment_terms: '50% deposit, 50% on completion', valid_until: '', assumptions: '', exclusions: '', notes: '' });
    try {
      const r = await fetch(`/api/vendor/proposals?quote_request_id=${lead.id}`);
      const j = await r.json();
      const props: Proposal[] = j.proposals || [];
      setHistory(props);
      const editable = props.find((p) => p.status === 'draft') || props[0];
      if (editable) {
        setItems(editable.line_items?.length ? editable.line_items : [{ ...EMPTY_ITEM }]);
        setTax(editable.tax || 0); setDiscount(editable.discount || 0);
        setTerms({
          lead_time: editable.lead_time || '', warranty: editable.warranty || '',
          payment_terms: editable.payment_terms || '50% deposit, 50% on completion',
          valid_until: editable.valid_until || '', assumptions: editable.assumptions || '',
          exclusions: editable.exclusions || '', notes: editable.notes || '',
        });
      }
    } catch { setHistory([]); }
  }, []);

  async function send(action: 'save' | 'submit') {
    if (!sel) return;
    setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/vendor/proposals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_request_id: sel.id, action, line_items: items, tax, discount, ...terms }),
      });
      const j = await r.json();
      if (j.ok) {
        setMsg(action === 'submit'
          ? `✓ Proposal sent to the buyer (revision ${j.revision}). NXT//LINK fee if won: ${money(j.commission.amount)}.`
          : '✓ Draft saved — finish it anytime.');
        pickLead(sel);
      } else setMsg(j.message || 'Something went wrong.');
    } catch { setMsg('Something went wrong. Please try again.'); }
    setBusy(false);
  }

  const latestSubmitted = history.find((p) => ['submitted', 'final'].includes(p.status));

  return (
    <div className="vp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <VendorNav active="quotes" />

      <div className="vp-wrap">
        <h1>Quotes &amp; proposals</h1>
        <p className="vp-sub">Answer a lead in about two minutes. Your proposal is saved, versioned, and delivered inside NXT//LINK.</p>

        {!signedIn ? (
          <div className="vp-empty">Sign in to see your leads — <a href="/vendor-login">vendor sign in</a></div>
        ) : loading ? (
          <div className="vp-empty">Loading your leads…</div>
        ) : leads.length === 0 ? (
          <div className="vp-empty">No open leads yet. When a buyer requests a quote on one of your listings, it appears here.</div>
        ) : (
          <div className="vp-layout">
            {/* Lead picker */}
            <aside className="vp-leads">
              <div className="vp-leadhead">Open leads ({leads.length})</div>
              {leads.map((l) => (
                <button key={l.id} className={`vp-lead ${sel?.id === l.id ? 'on' : ''}`} onClick={() => pickLead(l)}>
                  <div className="vp-leadname">{l.listing_name || (l.kind === 'service' ? 'Service request' : 'Product request')}</div>
                  <div className="vp-leadmeta">{l.company || l.contact_name || 'Buyer'} · {fmtDate(l.created_at)}</div>
                  <div className="vp-leadrow">
                    <span className="vp-ref">{l.public_ref}</span>
                    {l.quote_amount ? <span className="vp-quoted">quoted {money(l.quote_amount)}</span> : <span className="vp-await">awaiting quote</span>}
                  </div>
                </button>
              ))}
            </aside>

            {/* Builder */}
            <main className="vp-main">
              {!sel ? (
                <div className="vp-empty">← Pick a lead to build its proposal.</div>
              ) : (
                <>
                  <div className="vp-selhead">
                    <div>
                      <div className="vp-selname">{sel.listing_name || 'Request'} <span className="vp-ref">{sel.public_ref}</span></div>
                      {sel.message && <div className="vp-buyermsg">“{sel.message.slice(0, 240)}”</div>}
                    </div>
                    {latestSubmitted && <span className="vp-rev">Rev {latestSubmitted.revision} sent {latestSubmitted.submitted_at ? fmtDate(latestSubmitted.submitted_at) : ''}</span>}
                  </div>

                  {/* Line items */}
                  <div className="vp-sec">Line items</div>
                  <div className="vp-items">
                    {items.map((it, i) => (
                      <div key={i} className="vp-item">
                        <input className="vp-desc" placeholder="Description (e.g. 5,000 lb electric forklift)" value={it.description}
                          onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                        <select value={it.kind} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, kind: e.target.value } : x))}>
                          {ITEM_KINDS.map((k) => <option key={k.v} value={k.v}>{k.en}</option>)}
                        </select>
                        <input className="vp-num" type="number" min={1} value={it.qty || ''}
                          onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, qty: Number(e.target.value) } : x))} placeholder="Qty" />
                        <input className="vp-num wide" type="number" min={0} value={it.unit_price || ''}
                          onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, unit_price: Number(e.target.value) } : x))} placeholder="Unit $" />
                        <span className="vp-line">{money((it.qty || 0) * (it.unit_price || 0))}</span>
                        {items.length > 1 && <button className="vp-x" onClick={() => setItems(items.filter((_, j) => j !== i))}>×</button>}
                      </div>
                    ))}
                  </div>
                  <button className="vp-add" onClick={() => setItems([...items, { ...EMPTY_ITEM, kind: 'labor' }])}>+ Add line</button>

                  {/* Totals */}
                  <div className="vp-totals">
                    <div><span>Subtotal</span><b>{money(subtotal)}</b></div>
                    <div><span>Tax</span><input type="number" min={0} value={tax || ''} onChange={(e) => setTax(Number(e.target.value))} placeholder="0" /></div>
                    <div><span>Discount</span><input type="number" min={0} value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value))} placeholder="0" /></div>
                    <div className="vp-total"><span>Total</span><b>{money(total)}</b></div>
                    {commission && (
                      <div className="vp-fee">NXT//LINK success fee if won: <b>{money(commission.amount)}</b> ({(commission.rate * 100).toFixed(1)}%) — only due when you get paid.</div>
                    )}
                  </div>

                  {/* Terms — smart defaults, all editable */}
                  <div className="vp-sec">Terms</div>
                  <div className="vp-grid">
                    <label>Lead time<input value={terms.lead_time} onChange={(e) => setTerms({ ...terms, lead_time: e.target.value })} placeholder="e.g. 2–3 weeks" /></label>
                    <label>Warranty<input value={terms.warranty} onChange={(e) => setTerms({ ...terms, warranty: e.target.value })} placeholder="e.g. 2-year parts &amp; labor" /></label>
                    <label>Payment terms<input value={terms.payment_terms} onChange={(e) => setTerms({ ...terms, payment_terms: e.target.value })} /></label>
                    <label>Quote valid until<input type="date" value={terms.valid_until} onChange={(e) => setTerms({ ...terms, valid_until: e.target.value })} /></label>
                  </div>
                  <div className="vp-grid">
                    <label>Assumptions<textarea rows={2} value={terms.assumptions} onChange={(e) => setTerms({ ...terms, assumptions: e.target.value })} placeholder="What this quote assumes (site access, power, etc.)" /></label>
                    <label>Exclusions<textarea rows={2} value={terms.exclusions} onChange={(e) => setTerms({ ...terms, exclusions: e.target.value })} placeholder="What is NOT included" /></label>
                  </div>
                  <label className="vp-noteslab">Message to the buyer<textarea rows={2} value={terms.notes} onChange={(e) => setTerms({ ...terms, notes: e.target.value })} placeholder="Short note — contact details are shared automatically after acceptance." /></label>

                  <div className="vp-actions">
                    <button className="vp-save" disabled={busy} onClick={() => send('save')}>Save draft</button>
                    <button className="vp-send" disabled={busy || total <= 0} onClick={() => send('submit')}>
                      {latestSubmitted ? 'Send revised proposal →' : 'Send proposal →'}
                    </button>
                  </div>
                  {msg && <div className={`vp-msg ${msg.startsWith('✓') ? 'ok' : 'err'}`}>{msg}</div>}

                  {/* Revision history */}
                  {history.length > 0 && (
                    <>
                      <div className="vp-sec">History</div>
                      <div className="vp-hist">
                        {history.map((p) => (
                          <div key={p.id} className="vp-histrow">
                            <span className={`vp-hstat ${p.status}`}>{p.status}</span>
                            <span>Rev {p.revision}</span>
                            <span>{money(p.total || 0)}</span>
                            <span className="vp-hdate">{p.submitted_at ? fmtDate(p.submitted_at) : 'draft'}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
.vp{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.vp *{box-sizing:border-box;}
.vp-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(10,10,15,.9);backdrop-filter:blur(20px);z-index:30;}
.vp-brand{display:flex;align-items:baseline;gap:10px;color:#F0F0F5;text-decoration:none;}
.vp-brand b{font-size:17px;}.vp-brand i{color:#A78BFA;font-style:normal;}.vp-brand span{color:#8080A0;font-size:13px;}
.vp-navr{display:flex;gap:8px;}
.vp-pill{font-size:13px;font-weight:500;color:#C0C0D0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:99px;padding:8px 14px;text-decoration:none;}
.vp-wrap{max-width:1120px;margin:0 auto;padding:30px 20px 100px;}
.vp-wrap h1{font-size:clamp(22px,3.5vw,30px);font-weight:800;letter-spacing:-.02em;margin:0;}
.vp-sub{color:#8080A0;font-size:14px;margin:8px 0 0;max-width:560px;line-height:1.6;}
.vp-empty{color:#8080A0;font-size:14px;padding:44px 0;text-align:center;}
.vp-empty a{color:#A78BFA;}
.vp-layout{display:grid;grid-template-columns:300px 1fr;gap:20px;margin-top:24px;align-items:start;}
@media(max-width:860px){.vp-layout{grid-template-columns:1fr;}}
.vp-leads{background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:15px;padding:12px;display:flex;flex-direction:column;gap:8px;position:sticky;top:76px;max-height:80vh;overflow-y:auto;}
.vp-leadhead{font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#8080A0;padding:4px 6px 6px;}
.vp-lead{font-family:inherit;text-align:left;background:#14141F;border:1px solid rgba(255,255,255,.07);border-radius:11px;padding:11px 12px;cursor:pointer;color:#F0F0F5;}
.vp-lead:hover{border-color:rgba(124,92,252,.4);}
.vp-lead.on{border-color:#7C5CFC;background:rgba(124,92,252,.08);}
.vp-leadname{font-size:13px;font-weight:700;line-height:1.3;}
.vp-leadmeta{font-size:11px;color:#8080A0;margin-top:3px;}
.vp-leadrow{display:flex;justify-content:space-between;align-items:center;margin-top:7px;gap:6px;}
.vp-ref{font-size:10.5px;color:#5A5A70;font-variant-numeric:tabular-nums;}
.vp-quoted{font-size:10.5px;font-weight:700;color:#34D399;}
.vp-await{font-size:10.5px;font-weight:700;color:#FBBF24;}
.vp-main{background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:15px;padding:20px;}
.vp-selhead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid rgba(255,255,255,.07);padding-bottom:14px;}
.vp-selname{font-size:16px;font-weight:800;}
.vp-selname .vp-ref{margin-left:8px;font-size:11.5px;}
.vp-buyermsg{font-size:12.5px;color:#B8B6CC;margin-top:6px;line-height:1.5;font-style:italic;}
.vp-rev{font-size:11px;font-weight:700;color:#C4B5FD;background:rgba(124,92,252,.12);padding:5px 10px;border-radius:99px;white-space:nowrap;}
.vp-sec{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#8080A0;margin:20px 0 10px;}
.vp-items{display:flex;flex-direction:column;gap:8px;}
.vp-item{display:grid;grid-template-columns:1fr 130px 60px 90px 80px 24px;gap:7px;align-items:center;}
@media(max-width:720px){.vp-item{grid-template-columns:1fr 1fr;}.vp-item .vp-desc{grid-column:1/-1;}}
.vp-item input,.vp-item select,.vp-totals input,.vp-grid input,.vp-grid textarea,.vp-noteslab textarea{font-family:inherit;font-size:13px;padding:9px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;color:#F0F0F5;outline:none;width:100%;}
.vp-item input:focus,.vp-grid input:focus,.vp-grid textarea:focus,.vp-noteslab textarea:focus{border-color:#7C5CFC;}
.vp-item select{cursor:pointer;}
.vp-line{font-size:12.5px;font-weight:700;text-align:right;font-variant-numeric:tabular-nums;}
.vp-x{background:none;border:none;color:#5A5A70;font-size:18px;cursor:pointer;padding:0;}
.vp-x:hover{color:#F87171;}
.vp-add{font-family:inherit;font-size:12.5px;font-weight:700;color:#A78BFA;background:none;border:1px dashed rgba(124,92,252,.4);border-radius:9px;padding:9px;margin-top:9px;cursor:pointer;width:100%;}
.vp-add:hover{background:rgba(124,92,252,.06);}
.vp-totals{margin-top:16px;background:#0E0E16;border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:13px 15px;display:flex;flex-direction:column;gap:9px;}
.vp-totals>div{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#B8B6CC;gap:12px;}
.vp-totals input{max-width:110px;text-align:right;}
.vp-totals b{font-variant-numeric:tabular-nums;}
.vp-total{border-top:1px solid rgba(255,255,255,.08);padding-top:10px;font-size:15px !important;}
.vp-total b{font-size:18px;color:#F0F0F5;}
.vp-fee{font-size:12px;color:#C4B5FD;background:rgba(124,92,252,.08);border-radius:8px;padding:9px 11px;line-height:1.5;}
.vp-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:11px;}
@media(max-width:640px){.vp-grid{grid-template-columns:1fr;}}
.vp-grid label,.vp-noteslab{display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:#8080A0;}
.vp-noteslab{margin-top:2px;}
.vp-actions{display:flex;gap:10px;margin-top:18px;}
.vp-save{font-family:inherit;font-size:13.5px;font-weight:700;padding:12px 18px;border-radius:11px;border:1px solid rgba(255,255,255,.14);background:none;color:#C0C0D0;cursor:pointer;}
.vp-save:hover{border-color:rgba(124,92,252,.5);}
.vp-send{flex:1;font-family:inherit;font-size:14px;font-weight:700;padding:12px 18px;border-radius:11px;border:none;background:#7C5CFC;color:#fff;cursor:pointer;box-shadow:0 10px 26px -12px rgba(124,92,252,.6);}
.vp-send:hover{background:#6344DF;}
.vp-save:disabled,.vp-send:disabled{opacity:.45;cursor:default;}
.vp-msg{margin-top:12px;font-size:13px;padding:10px 13px;border-radius:10px;line-height:1.5;}
.vp-msg.ok{background:rgba(52,211,153,.1);color:#34D399;}
.vp-msg.err{background:rgba(248,113,113,.1);color:#FCA5A5;}
.vp-hist{display:flex;flex-direction:column;gap:6px;}
.vp-histrow{display:flex;align-items:center;gap:14px;font-size:12.5px;color:#B8B6CC;background:#0E0E16;border-radius:9px;padding:9px 12px;font-variant-numeric:tabular-nums;}
.vp-hstat{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:3px 8px;border-radius:99px;background:rgba(255,255,255,.06);color:#8080A0;}
.vp-hstat.submitted{background:rgba(52,211,153,.12);color:#34D399;}
.vp-hstat.draft{background:rgba(251,191,36,.12);color:#FBBF24;}
.vp-hstat.revised{background:rgba(124,92,252,.12);color:#C4B5FD;}
.vp-hdate{margin-left:auto;color:#5A5A70;}
`;
