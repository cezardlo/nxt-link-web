'use client';

// Vendor leads inbox: quote/service requests from marketplace buyers,
// scoped to the signed-in vendor's own listings.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';

interface Commission {
  commission_amount: number; effective_rate: number; status: string; protected_until: string | null;
  final_amount?: number | null; invoice_number?: string | null; due_date?: string | null; paid_at?: string | null;
}
interface Pilot {
  id: string; kind: string; status: string; scheduled_for: string | null;
  location: string | null; scope: string | null; success_criteria: string | null;
  results: string | null; outcome: string | null;
}
interface Lead {
  id: string; public_ref: string; kind: string; listing_name: string | null;
  company: string; contact_name: string | null; email: string | null; phone: string | null;
  contact_hidden?: boolean;
  buyer_profile?: { company_name: string | null; contact_name: string | null; position: string | null; industry: string | null; city: string | null; phone: string | null; logo_url: string | null } | null;
  message: string | null; status: string; created_at: string;
  answers?: { request_type?: string } | null;
  quote_amount?: number | null; quote_currency?: string | null; quote_message?: string | null;
  quote_timeline?: string | null; quote_valid_until?: string | null; quoted_at?: string | null;
  buyer_decision?: string | null; commission?: Commission | null; pilots?: Pilot[];
}
const STATUSES = ['new', 'viewed', 'responded', 'won', 'lost'];
const REQ_LABEL: Record<string, string> = {
  quote: 'Quote', contact_sales: 'Sales', demo: 'Demo', pilot: 'Pilot', question: 'Question',
};
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
// Live estimate mirroring the server fee engine (15% / 12.5% / 10% marginal).
function estimateCommission(amount: number): number {
  if (!(amount > 0)) return 0;
  const brackets: Array<[number, number]> = [[10000, 0.15], [50000, 0.125], [Infinity, 0.1]];
  let lower = 0, fee = 0;
  for (const [upTo, rate] of brackets) {
    if (amount <= lower) break;
    fee += (Math.min(amount, upTo) - lower) * rate;
    lower = upTo;
  }
  return Math.round(fee * 100) / 100;
}

export default function VendorLeadsPage() {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [openQuote, setOpenQuote] = useState<string | null>(null);
  const [qform, setQform] = useState({ amount: '', timeline: '', valid_until: '', message: '' });
  const [qBusy, setQBusy] = useState(false);
  const [openPilot, setOpenPilot] = useState<string | null>(null);
  const [pform, setPform] = useState({ kind: 'demo', scheduled_for: '', location: '', scope: '', success_criteria: '' });
  const [pBusy, setPBusy] = useState(false);
  const [resultsFor, setResultsFor] = useState<string | null>(null);
  const [rform, setRform] = useState({ results: '', outcome: 'passed' });
  const [purFor, setPurFor] = useState<string | null>(null);
  const [purForm, setPurForm] = useState({ amount: '', po_number: '', invoice_ref: '', purchased_at: '' });
  const [purBusy, setPurBusy] = useState(false);
  async function recordPurchase(leadId: string) {
    const amount = Number(purForm.amount);
    if (!(amount > 0)) return;
    setPurBusy(true);
    const res = await fetch('/api/vendor/purchase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quote_request_id: leadId, ...purForm, amount }) });
    const data = await res.json();
    if (data.ok) {
      setLeads((ls) => ls.map((l) => (l.id === leadId ? { ...l, commission: { ...(l.commission as Commission), ...data.commission, final_amount: amount } } : l)));
      setPurFor(null); setPurForm({ amount: '', po_number: '', invoice_ref: '', purchased_at: '' });
    }
    setPurBusy(false);
  }
  const [chatFor, setChatFor] = useState<string | null>(null);
  const [chatMsgs, setChatMsgs] = useState<Array<{ id: string; sender: string; body: string; created_at: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const chatListRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatListRef.current?.scrollTo({ top: chatListRef.current.scrollHeight }); }, [chatMsgs, chatFor]);
  const [notifs, setNotifs] = useState<Array<{ id: string; title: string; read_at: string | null; created_at: string }>>([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  async function toggleNotifs() {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next && notifUnread > 0) {
      await fetch('/api/vendor/notifications', { method: 'POST' });
      setNotifUnread(0);
    }
  }

  const load = useCallback(async () => {
    const res = await fetch('/api/vendor/leads');
    if (res.status === 401) { setSignedIn(false); setChecking(false); return; }
    const data = await res.json();
    setLeads(data.leads || []); setSignedIn(true); setChecking(false);
    const n = await fetch('/api/vendor/notifications').then((r) => r.json()).catch(() => null);
    if (n?.ok) { setNotifs(n.notifications || []); setNotifUnread(n.unread || 0); }
  }, []);

  useEffect(() => {
    const sb = createBrowserSupabaseClient();
    sb.auth.getSession().then(({ data }) => { if (data.session) load(); else setChecking(false); });
  }, [load]);

  async function setStatus(id: string, status: string) {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
    await fetch('/api/vendor/leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
  }

  async function sendQuote(leadId: string) {
    const amount = Number(qform.amount);
    if (!(amount > 0)) return;
    setQBusy(true);
    const res = await fetch('/api/vendor/quote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quote_request_id: leadId, amount, timeline: qform.timeline, valid_until: qform.valid_until || null, message: qform.message }),
    });
    const data = await res.json();
    if (data.ok) {
      setLeads((ls) => ls.map((l) => (l.id === leadId ? {
        ...l, status: 'responded', quote_amount: amount, quote_timeline: qform.timeline || null,
        quote_valid_until: qform.valid_until || null, quote_message: qform.message || null,
        commission: { commission_amount: data.commission.amount, effective_rate: data.commission.effective_rate, status: 'quoted', protected_until: data.commission.protected_until },
      } : l)));
      setOpenQuote(null); setQform({ amount: '', timeline: '', valid_until: '', message: '' });
    }
    setQBusy(false);
  }
  function openQuoteForm(l: Lead) {
    setQform({ amount: l.quote_amount != null ? String(l.quote_amount) : '', timeline: l.quote_timeline || '', valid_until: l.quote_valid_until || '', message: l.quote_message || '' });
    setOpenQuote(l.id);
  }

  async function createPilot(leadId: string) {
    setPBusy(true);
    const res = await fetch('/api/vendor/pilot', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quote_request_id: leadId, ...pform, scheduled_for: pform.scheduled_for || null }),
    });
    const data = await res.json();
    if (data.ok) {
      setLeads((ls) => ls.map((l) => (l.id === leadId ? { ...l, pilots: [...(l.pilots || []), data.pilot] } : l)));
      setOpenPilot(null); setPform({ kind: 'demo', scheduled_for: '', location: '', scope: '', success_criteria: '' });
    }
    setPBusy(false);
  }
  async function patchPilot(leadId: string, pilotId: string, patch: Record<string, unknown>) {
    const res = await fetch('/api/vendor/pilot', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pilotId, ...patch }) });
    const data = await res.json();
    if (data.ok) setLeads((ls) => ls.map((l) => (l.id === leadId ? { ...l, pilots: (l.pilots || []).map((p) => (p.id === pilotId ? data.pilot : p)) } : l)));
  }
  async function saveResults(leadId: string, pilotId: string) {
    setPBusy(true);
    await patchPilot(leadId, pilotId, { status: 'completed', results: rform.results, outcome: rform.outcome });
    setResultsFor(null); setRform({ results: '', outcome: 'passed' });
    setPBusy(false);
  }

  async function openChat(leadId: string) {
    setChatFor(leadId); setChatMsgs([]); setChatInput('');
    const res = await fetch(`/api/vendor/messages?quote_request_id=${leadId}`);
    const data = await res.json();
    if (data.ok) setChatMsgs(data.messages || []);
  }
  async function sendChat(leadId: string) {
    const text = chatInput.trim();
    if (!text || chatBusy) return;
    setChatBusy(true);
    const res = await fetch('/api/vendor/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quote_request_id: leadId, body: text }) });
    const data = await res.json();
    if (data.ok) { setChatMsgs((m) => [...m, data.message]); setChatInput(''); }
    setChatBusy(false);
  }

  return (
    <div className="ld">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="ld-nav">
        <a className="ld-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b><span>Leads</span></a>
        <div className="ld-navr">
          <button className="ld-bell" onClick={toggleNotifs} aria-label="Notifications">Alerts{notifUnread > 0 && <span className="ld-belldot">{notifUnread}</span>}</button>
          <a className="ld-link" href="/vendor/portal">Profile</a>
          <a className="ld-link" href="/vendor/listings">Your listings</a>
        </div>
      </nav>
      <main className="ld-wrap">
        {notifOpen && (
          <div className="ld-notifs">
            <div className="ld-notifhead"><b>Notifications</b><button onClick={() => setNotifOpen(false)}>Close</button></div>
            {notifs.length === 0 ? <p className="ld-notifempty">Nothing yet — new leads, messages, and buyer decisions show here.</p> : (
              <ul>
                {notifs.map((n) => (
                  <li key={n.id} className={n.read_at ? '' : 'unread'}>
                    <span>{n.title}</span>
                    <small>{new Date(n.created_at).toLocaleDateString()}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <h1>Leads inbox {leads.filter((l) => l.status === 'new').length > 0 && <span className="ld-newcnt">{leads.filter((l) => l.status === 'new').length} new</span>}</h1>
        <p className="ld-sub">Buyers who requested a quote or service from your listings. Respond inside NXT{'//'}LINK.</p>
        {checking ? <div className="ld-empty">Loading…</div>
          : !signedIn ? <div className="ld-empty">Sign in first — <a href="/vendor-login">go to sign in</a></div>
          : leads.length === 0 ? <div className="ld-empty">No leads yet. Publish listings so buyers can find you.</div>
          : (
            <div className="ld-list">
              {leads.map((l) => (
                <div className="ld-card" key={l.id}>
                  <div className="ld-top">
                    <span className={'ld-status ' + l.status}>{l.status}</span>
                    <span className="ld-reqtype">{REQ_LABEL[l.answers?.request_type || 'quote'] || l.answers?.request_type}</span>
                    <b>{l.company}</b>
                    <small>{l.listing_name ? `→ ${l.listing_name}` : ''} · {new Date(l.created_at).toLocaleDateString()}</small>
                    <span className="ld-ref">{l.public_ref}</span>
                  </div>
                  <div className="ld-contact">
                    {l.contact_name && <span>{l.contact_name}</span>}
                    {l.email ? (
                      <>
                        <a href={`mailto:${l.email}`}>{l.email}</a>
                        {l.phone && <span>{l.phone}</span>}
                      </>
                    ) : (
                      <span className="ld-hiddenc">Contact details unlock when the buyer accepts your quote — use Messages below</span>
                    )}
                  </div>
                  {l.message && <p className="ld-msg">{l.message}</p>}

                  {/* Buyer profile card — revealed after acceptance */}
                  {l.buyer_profile && (
                    <div className="ld-buyercard">
                      <div className="ld-buyerlogo">{l.buyer_profile.logo_url ? <img src={l.buyer_profile.logo_url} alt="" /> : <span>{(l.buyer_profile.company_name || l.company || '?').slice(0, 2).toUpperCase()}</span>}</div>
                      <div className="ld-buyerinfo">
                        <b>{l.buyer_profile.company_name || l.company}</b>
                        <small>
                          {[l.buyer_profile.contact_name, l.buyer_profile.position].filter(Boolean).join(' · ')}
                          {l.buyer_profile.industry ? ` · ${l.buyer_profile.industry}` : ''}
                          {l.buyer_profile.city ? ` · ${l.buyer_profile.city}` : ''}
                        </small>
                        {l.buyer_profile.phone && <small>{l.buyer_profile.phone}</small>}
                      </div>
                    </div>
                  )}

                  {/* Quote answer + commission — the deal stays inside NXT//LINK */}
                  <div className="ld-quote">
                    {l.buyer_decision && <div className={'ld-decision ' + l.buyer_decision}>Buyer {l.buyer_decision} your quote</div>}
                    {l.quote_amount != null && openQuote !== l.id && (
                      <div className="ld-qsum">
                        <span>Your quote: <b>{money(l.quote_amount)}</b></span>
                        {l.commission && <span>NXT//LINK commission: <b>{money(l.commission.commission_amount)}</b></span>}
                        {l.quote_timeline && <span>{l.quote_timeline}</span>}
                        {l.commission?.protected_until && <span className="ld-prot">protected to {new Date(l.commission.protected_until).toLocaleDateString()}</span>}
                      </div>
                    )}
                    {openQuote === l.id ? (
                      <div className="ld-qform">
                        <div className="ld-qrow">
                          <label>Quote amount (USD)<input type="number" min="0" value={qform.amount} onChange={(e) => setQform({ ...qform, amount: e.target.value })} placeholder="e.g. 25000" /></label>
                          <label>Timeline<input value={qform.timeline} onChange={(e) => setQform({ ...qform, timeline: e.target.value })} placeholder="e.g. 4–6 weeks" /></label>
                          <label>Valid until<input type="date" value={qform.valid_until} onChange={(e) => setQform({ ...qform, valid_until: e.target.value })} /></label>
                        </div>
                        <textarea rows={3} value={qform.message} onChange={(e) => setQform({ ...qform, message: e.target.value })} placeholder="Scope and notes for the buyer…" />
                        <div className="ld-qcom">Estimated NXT//LINK commission: <b>{money(estimateCommission(Number(qform.amount)))}</b> <small>— give the buyer the same-scope price; do not add this on top.</small></div>
                        <div className="ld-qactions">
                          <button className="ld-qsend" disabled={qBusy || !(Number(qform.amount) > 0)} onClick={() => sendQuote(l.id)}>{qBusy ? 'Sending…' : 'Send quote through NXT//LINK'}</button>
                          <button className="ld-qcancel" onClick={() => setOpenQuote(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="ld-qopen" onClick={() => openQuoteForm(l)}>{l.quote_amount != null ? 'Update quote' : 'Send quote'}</button>
                    )}
                  </div>

                  {/* Purchase record + commission bill (after buyer accepts) */}
                  {l.buyer_decision === 'accepted' && (
                    <div className="ld-purchase">
                      {l.commission?.invoice_number ? (
                        <div className="ld-bill">
                          <div className="ld-billtop">
                            <b>Deal closed: {money(l.commission.final_amount || l.quote_amount || 0)}</b>
                            <span className={'ld-billstatus ' + (l.commission.paid_at ? 'paid' : 'due')}>{l.commission.paid_at ? 'Commission paid' : 'Commission due'}</span>
                          </div>
                          <div className="ld-billrow">
                            <span>NXT{'//'}LINK commission: <b>{money(l.commission.commission_amount)}</b></span>
                            <span>Invoice {l.commission.invoice_number}</span>
                            {l.commission.due_date && !l.commission.paid_at && <span>due {new Date(l.commission.due_date).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      ) : purFor === l.id ? (
                        <div className="ld-qform">
                          <div className="ld-qrow">
                            <label>Final purchase amount (USD)<input type="number" min="0" value={purForm.amount} onChange={(e) => setPurForm({ ...purForm, amount: e.target.value })} placeholder={l.quote_amount != null ? String(l.quote_amount) : 'e.g. 25000'} /></label>
                            <label>PO number<input value={purForm.po_number} onChange={(e) => setPurForm({ ...purForm, po_number: e.target.value })} placeholder="Buyer's PO #" /></label>
                            <label>Your invoice #<input value={purForm.invoice_ref} onChange={(e) => setPurForm({ ...purForm, invoice_ref: e.target.value })} placeholder="Your invoice to the buyer" /></label>
                          </div>
                          <div className="ld-qcom">NXT{'//'}LINK commission on this amount: <b>{money(estimateCommission(Number(purForm.amount)))}</b> <small>— billed to you with 30-day terms.</small></div>
                          <div className="ld-qactions">
                            <button className="ld-qsend" disabled={purBusy || !(Number(purForm.amount) > 0)} onClick={() => recordPurchase(l.id)}>{purBusy ? 'Recording…' : 'Record purchase'}</button>
                            <button className="ld-qcancel" onClick={() => setPurFor(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button className="ld-purbtn" onClick={() => { setPurForm({ amount: l.quote_amount != null ? String(l.quote_amount) : '', po_number: '', invoice_ref: '', purchased_at: '' }); setPurFor(l.id); }}>
                          Record the purchase (required — closes the deal)
                        </button>
                      )}
                    </div>
                  )}

                  {/* Demo / pilot tracking — stays inside NXT//LINK */}
                  <div className="ld-pilots">
                    {(l.pilots || []).map((p) => (
                      <div className="ld-pcard" key={p.id}>
                        <div className="ld-ptop">
                          <span className={'ld-pkind ' + p.kind}>{p.kind.replace('_', ' ')}</span>
                          <span className={'ld-pstatus ' + p.status}>{p.status.replace('_', ' ')}</span>
                          {p.scheduled_for && <small>{new Date(p.scheduled_for).toLocaleString()}</small>}
                          {p.location && <small>· {p.location}</small>}
                          {p.outcome && <span className={'ld-poutcome ' + p.outcome}>{p.outcome}</span>}
                        </div>
                        {p.scope && <p className="ld-pscope"><span>Scope:</span> {p.scope}</p>}
                        {p.success_criteria && <p className="ld-pscope"><span>Success =</span> {p.success_criteria}</p>}
                        {p.results && <p className="ld-pscope"><span>Results:</span> {p.results}</p>}
                        {resultsFor === p.id ? (
                          <div className="ld-presults">
                            <textarea rows={2} placeholder="What happened? Measurements, observations…" value={rform.results} onChange={(e) => setRform({ ...rform, results: e.target.value })} />
                            <div className="ld-qactions">
                              <select value={rform.outcome} onChange={(e) => setRform({ ...rform, outcome: e.target.value })}>
                                <option value="passed">Passed</option><option value="failed">Failed</option><option value="inconclusive">Inconclusive</option>
                              </select>
                              <button className="ld-qsend" disabled={pBusy} onClick={() => saveResults(l.id, p.id)}>{pBusy ? 'Saving…' : 'Save results'}</button>
                              <button className="ld-qcancel" onClick={() => setResultsFor(null)}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="ld-pactions">
                            {p.status === 'proposed' && <button onClick={() => patchPilot(l.id, p.id, { status: 'scheduled' })}>Mark scheduled</button>}
                            {(p.status === 'scheduled' || p.status === 'proposed') && <button onClick={() => patchPilot(l.id, p.id, { status: 'in_progress' })}>Start</button>}
                            {p.status !== 'completed' && p.status !== 'cancelled' && <button onClick={() => { setRform({ results: p.results || '', outcome: p.outcome || 'passed' }); setResultsFor(p.id); }}>Record results</button>}
                            {p.status !== 'completed' && p.status !== 'cancelled' && <button onClick={() => patchPilot(l.id, p.id, { status: 'cancelled' })}>Cancel</button>}
                          </div>
                        )}
                      </div>
                    ))}
                    {openPilot === l.id ? (
                      <div className="ld-qform">
                        <div className="ld-qrow">
                          <label>Type
                            <select value={pform.kind} onChange={(e) => setPform({ ...pform, kind: e.target.value })}>
                              <option value="demo">Demo</option><option value="pilot">Pilot</option><option value="site_visit">Site visit</option>
                            </select>
                          </label>
                          <label>When<input type="datetime-local" value={pform.scheduled_for} onChange={(e) => setPform({ ...pform, scheduled_for: e.target.value })} /></label>
                          <label>Location<input value={pform.location} onChange={(e) => setPform({ ...pform, location: e.target.value })} placeholder="Buyer site / online" /></label>
                        </div>
                        <textarea rows={2} placeholder="Scope — what will you show or test?" value={pform.scope} onChange={(e) => setPform({ ...pform, scope: e.target.value })} />
                        <textarea rows={2} placeholder="Success criteria — what does success look like?" value={pform.success_criteria} onChange={(e) => setPform({ ...pform, success_criteria: e.target.value })} />
                        <div className="ld-qactions">
                          <button className="ld-qsend" disabled={pBusy} onClick={() => createPilot(l.id)}>{pBusy ? 'Saving…' : 'Propose through NXT//LINK'}</button>
                          <button className="ld-qcancel" onClick={() => setOpenPilot(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="ld-popen" onClick={() => setOpenPilot(l.id)}>+ Schedule demo / pilot</button>
                    )}
                  </div>

                  {/* Buyer <-> vendor messages, inside NXT//LINK */}
                  <div className="ld-chat">
                    {chatFor === l.id ? (
                      <div className="ld-chatbox">
                        <div className="ld-chatlist" ref={chatListRef}>
                          {chatMsgs.length === 0 && <div className="ld-chatempty">No messages yet — say hello.</div>}
                          {chatMsgs.map((m) => (
                            <div key={m.id} className={'ld-bubble ' + (m.sender === 'vendor' ? 'me' : 'them')}>
                              {m.body}
                              <small>{new Date(m.created_at).toLocaleString()}</small>
                            </div>
                          ))}
                        </div>
                        <div className="ld-chatrow">
                          <input value={chatInput} placeholder="Message the buyer…" onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendChat(l.id); }} />
                          <button className="ld-qsend" disabled={chatBusy || !chatInput.trim()} onClick={() => sendChat(l.id)}>Send</button>
                          <button className="ld-qcancel" onClick={() => setChatFor(null)}>Close</button>
                        </div>
                        {l.buyer_decision !== 'accepted' && <p className="ld-guardnote">Emails, phone numbers, and links are hidden automatically until the buyer accepts — deals stay on NXT{'//'}LINK (your terms: commission owed during the protected period either way).</p>}
                      </div>
                    ) : (
                      <button className="ld-chatopen" onClick={() => openChat(l.id)}>Messages</button>
                    )}
                  </div>

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
.ld-navr{display:flex;align-items:center;gap:14px;}
.ld-bell{position:relative;font-family:inherit;font-size:13px;font-weight:600;color:#C4B5FD;background:rgba(124,92,252,.1);border:1px solid rgba(124,92,252,.35);border-radius:99px;padding:7px 14px;cursor:pointer;}
.ld-belldot{margin-left:7px;background:#EF4444;color:#fff;font-size:11px;font-weight:800;border-radius:99px;padding:1px 7px;}
.ld-notifs{background:#12121B;border:1px solid rgba(124,92,252,.3);border-radius:14px;padding:16px 18px;margin:0 0 18px;}
.ld-notifhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.ld-notifhead b{font-size:14.5px;}
.ld-notifhead button{background:none;border:none;color:#8080A0;font:inherit;font-size:12.5px;cursor:pointer;}
.ld-notifempty{color:#8080A0;font-size:13.5px;margin:4px 0;}
.ld-notifs ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px;max-height:280px;overflow-y:auto;}
.ld-notifs li{display:flex;justify-content:space-between;gap:12px;padding:9px 10px;border-radius:9px;font-size:13.5px;color:#C0C0D0;}
.ld-notifs li.unread{background:rgba(124,92,252,.08);color:#F0F0F5;font-weight:500;}
.ld-notifs li small{color:#8080A0;white-space:nowrap;}
.ld-wrap{max-width:760px;margin:0 auto;padding:36px 20px 100px;}
.ld-wrap h1{font-size:28px;font-weight:800;letter-spacing:-.02em;}
.ld-newcnt{font-size:12px;font-weight:700;color:#C4B5FD;background:rgba(124,92,252,.15);border-radius:99px;padding:4px 12px;vertical-align:6px;margin-left:8px;}
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
.ld-reqtype{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:4px 9px;border-radius:99px;background:rgba(52,211,153,.12);color:#34D399;}
.ld-status.new{background:rgba(124,92,252,.15);color:#C4B5FD;}
.ld-status.won{background:rgba(52,211,153,.12);color:#34D399;}
.ld-status.lost{background:rgba(252,165,165,.1);color:#FCA5A5;}
.ld-contact{display:flex;gap:14px;flex-wrap:wrap;font-size:13.5px;color:#C0C0D0;margin-top:10px;}
.ld-contact a{color:#A78BFA;}
.ld-hiddenc{color:#FBBF24;font-size:12.5px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:8px;padding:5px 10px;}
.ld-buyercard{display:flex;align-items:center;gap:13px;margin-top:12px;background:rgba(52,211,153,.05);border:1px solid rgba(52,211,153,.25);border-radius:12px;padding:12px 14px;}
.ld-buyerlogo{width:46px;height:46px;flex-shrink:0;border-radius:11px;border:1px solid rgba(255,255,255,.1);background:#0A0A0F;display:grid;place-items:center;overflow:hidden;font-size:14px;font-weight:800;color:#34D399;}
.ld-buyerlogo img{width:100%;height:100%;object-fit:contain;}
.ld-buyerinfo{display:flex;flex-direction:column;gap:3px;}
.ld-buyerinfo b{font-size:14.5px;}
.ld-buyerinfo small{color:#8080A0;font-size:12.5px;line-height:1.45;}
.ld-guardnote{margin:9px 0 0;font-size:11.5px;color:#8080A0;line-height:1.5;}
.ld-msg{margin:12px 0 0;font-size:14px;color:#D5D4E0;line-height:1.6;background:#111118;border-radius:10px;padding:12px 14px;white-space:pre-wrap;}
.ld-quote{margin-top:14px;border-top:1px solid rgba(255,255,255,.07);padding-top:14px;}
.ld-decision{display:inline-block;font-size:12px;font-weight:700;padding:5px 11px;border-radius:99px;margin-bottom:10px;text-transform:capitalize;}
.ld-decision.accepted{background:rgba(52,211,153,.14);color:#34D399;}
.ld-decision.declined{background:rgba(252,165,165,.12);color:#FCA5A5;}
.ld-qsum{display:flex;flex-wrap:wrap;gap:14px;font-size:13.5px;color:#C0C0D0;align-items:center;}
.ld-qsum b{color:#F0F0F5;}
.ld-prot{color:#8080A0;font-size:12px;}
.ld-qopen{margin-top:10px;font-family:inherit;font-size:12.5px;font-weight:600;background:rgba(124,92,252,.15);border:1px solid #7C5CFC;color:#C4B5FD;border-radius:9px;padding:8px 14px;cursor:pointer;}
.ld-qform{display:flex;flex-direction:column;gap:10px;background:#111118;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px;margin-top:6px;}
.ld-qrow{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
@media(max-width:600px){.ld-qrow{grid-template-columns:1fr;}}
.ld-qform label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:#8080A0;}
.ld-qform input,.ld-qform textarea{font-family:inherit;font-size:14px;padding:10px 12px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:#0A0A0F;color:#F0F0F5;outline:none;resize:vertical;}
.ld-qform input:focus,.ld-qform textarea:focus{border-color:#7C5CFC;}
.ld-qcom{font-size:13px;color:#C0C0D0;background:rgba(124,92,252,.08);border:1px solid rgba(124,92,252,.25);border-radius:9px;padding:9px 12px;}
.ld-qcom b{color:#C4B5FD;}
.ld-qcom small{color:#8080A0;}
.ld-qactions{display:flex;gap:9px;}
.ld-qsend{font-family:inherit;font-size:13.5px;font-weight:700;background:#7C5CFC;border:none;color:#fff;border-radius:9px;padding:10px 16px;cursor:pointer;}
.ld-qsend:disabled{opacity:.5;cursor:not-allowed;}
.ld-qcancel{font-family:inherit;font-size:13px;background:none;border:1px solid rgba(255,255,255,.14);color:#C0C0D0;border-radius:9px;padding:10px 14px;cursor:pointer;}
.ld-purchase{margin-top:14px;border-top:1px solid rgba(255,255,255,.07);padding-top:14px;}
.ld-purbtn{font-family:inherit;font-size:13px;font-weight:700;background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.45);color:#34D399;border-radius:10px;padding:10px 16px;cursor:pointer;}
.ld-purbtn:hover{background:rgba(52,211,153,.2);}
.ld-bill{background:rgba(52,211,153,.06);border:1px solid rgba(52,211,153,.3);border-radius:12px;padding:13px 15px;}
.ld-billtop{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;}
.ld-billtop b{font-size:15px;color:#F0F0F5;}
.ld-billstatus{font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;text-transform:uppercase;letter-spacing:.05em;}
.ld-billstatus.due{background:rgba(251,191,36,.14);color:#FBBF24;}
.ld-billstatus.paid{background:rgba(52,211,153,.15);color:#34D399;}
.ld-billrow{display:flex;gap:16px;flex-wrap:wrap;margin-top:9px;font-size:13px;color:#C0C0D0;}
.ld-billrow b{color:#34D399;}
.ld-pilots{margin-top:14px;border-top:1px solid rgba(255,255,255,.07);padding-top:14px;display:flex;flex-direction:column;gap:10px;}
.ld-pcard{background:#111118;border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:12px 14px;}
.ld-ptop{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.ld-ptop small{color:#8080A0;font-size:12px;}
.ld-pkind{font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:4px 9px;border-radius:99px;background:rgba(124,92,252,.15);color:#C4B5FD;}
.ld-pkind.pilot{background:rgba(52,211,153,.12);color:#34D399;}
.ld-pkind.site_visit{background:rgba(251,191,36,.12);color:#FBBF24;}
.ld-pstatus{font-size:11px;font-weight:600;padding:4px 9px;border-radius:99px;background:rgba(255,255,255,.06);color:#C0C0D0;text-transform:capitalize;}
.ld-pstatus.completed{background:rgba(52,211,153,.12);color:#34D399;}
.ld-pstatus.cancelled{background:rgba(252,165,165,.1);color:#FCA5A5;}
.ld-poutcome{font-size:11px;font-weight:700;padding:4px 9px;border-radius:99px;text-transform:capitalize;}
.ld-poutcome.passed{background:rgba(52,211,153,.14);color:#34D399;}
.ld-poutcome.failed{background:rgba(252,165,165,.12);color:#FCA5A5;}
.ld-poutcome.inconclusive{background:rgba(251,191,36,.12);color:#FBBF24;}
.ld-pscope{margin:8px 0 0;font-size:13px;color:#C0C0D0;line-height:1.5;}
.ld-pscope span{color:#8080A0;}
.ld-pactions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;}
.ld-pactions button{font-family:inherit;background:none;border:1px solid rgba(255,255,255,.12);color:#C0C0D0;font-size:12px;border-radius:8px;padding:6px 11px;cursor:pointer;}
.ld-pactions button:hover{border-color:#A78BFA;color:#C4B5FD;}
.ld-presults{display:flex;flex-direction:column;gap:9px;margin-top:10px;}
.ld-presults textarea,.ld-presults select{font-family:inherit;font-size:13.5px;padding:10px 12px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:#0A0A0F;color:#F0F0F5;outline:none;resize:vertical;}
.ld-popen{align-self:flex-start;font-family:inherit;font-size:12.5px;font-weight:600;background:none;border:1px dashed rgba(124,92,252,.5);color:#C4B5FD;border-radius:9px;padding:8px 14px;cursor:pointer;}
.ld-chat{margin-top:14px;border-top:1px solid rgba(255,255,255,.07);padding-top:14px;}
.ld-chatopen{font-family:inherit;font-size:12.5px;font-weight:600;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.35);color:#34D399;border-radius:9px;padding:8px 14px;cursor:pointer;}
.ld-chatbox{background:#111118;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px;}
.ld-chatlist{display:flex;flex-direction:column;gap:8px;max-height:260px;overflow-y:auto;padding:4px 2px 10px;}
.ld-chatempty{color:#8080A0;font-size:13px;text-align:center;padding:14px 0;}
.ld-bubble{max-width:82%;padding:9px 12px;border-radius:12px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;display:flex;flex-direction:column;gap:3px;}
.ld-bubble small{font-size:10.5px;opacity:.6;}
.ld-bubble.me{align-self:flex-end;background:#7C5CFC;color:#fff;border-bottom-right-radius:4px;}
.ld-bubble.them{align-self:flex-start;background:rgba(255,255,255,.07);color:#E5E4F0;border-bottom-left-radius:4px;}
.ld-chatrow{display:flex;gap:8px;}
.ld-chatrow input{flex:1;font-family:inherit;font-size:14px;padding:10px 12px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:#0A0A0F;color:#F0F0F5;outline:none;}
.ld-chatrow input:focus{border-color:#7C5CFC;}
.ld-qform select{font-family:inherit;font-size:14px;padding:10px 12px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:#0A0A0F;color:#F0F0F5;outline:none;}
.ld-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;}
.ld-actions button{font-family:inherit;background:none;border:1px solid rgba(255,255,255,.12);color:#C0C0D0;font-size:12px;border-radius:8px;padding:6px 11px;cursor:pointer;}
.ld-actions button:hover{border-color:#A78BFA;color:#C4B5FD;}
`;
