'use client';

// Buyer dashboard: the signed-in buyer's marketplace footprint — intake
// requests (NXT-assisted) and marketplace quote/service requests (self-service),
// matched server-side to their verified email, plus saved listings (localStorage).

import { useCallback, useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';

interface IntakeRequest {
  id: string; public_ref: string; category: string | null; problem: string | null;
  location: string | null; urgency: string | null; status: string | null;
  pipeline_stage: string | null; created_at: string;
}
interface QuoteRequest {
  id: string; public_ref: string; kind: string; listing_name: string | null;
  company: string | null; message: string | null; status: string; created_at: string;
  quote_amount?: number | null; quote_currency?: string | null; quote_message?: string | null;
  quote_timeline?: string | null; quote_valid_until?: string | null; quoted_at?: string | null;
  buyer_decision?: string | null; reviewed?: boolean;
  pilots?: Array<{ kind: string; status: string; scheduled_for: string | null; location: string | null; scope: string | null; outcome: string | null }>;
}
interface DashboardData {
  signed_in: boolean; email_verified?: boolean; email?: string | null;
  requests?: IntakeRequest[]; quotes?: QuoteRequest[];
}

// Buyer-facing status labels (internal vendor states are softened, never raw).
const QUOTE_LABEL: Record<string, string> = {
  new: 'Sent', viewed: 'Seen by vendor', responded: 'Vendor responding',
  won: 'Closed', lost: 'Closed', spam: 'Closed',
};
const REQUEST_LABEL: Record<string, string> = {
  request_received: 'Received', new_request: 'Received',
};
const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString(); } catch { return ''; } };
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function BuyerDashboardPage() {
  const [checking, setChecking] = useState(true);
  const [data, setData] = useState<DashboardData>({ signed_in: false });
  const [savedCount, setSavedCount] = useState(0);
  const [reviewOpen, setReviewOpen] = useState<string | null>(null);
  const [rv, setRv] = useState({ rating: 5, title: '', body: '' });
  const [rvBusy, setRvBusy] = useState(false);
  const [chatFor, setChatFor] = useState<string | null>(null);
  const [chatMsgs, setChatMsgs] = useState<Array<{ id: string; sender: string; body: string; created_at: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/buyer/dashboard');
      const json = (await res.json()) as DashboardData;
      setData(json);
    } catch {
      setData({ signed_in: false });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    try { setSavedCount(new Set(JSON.parse(localStorage.getItem('nxt_saved') || '[]')).size); } catch { /* ignore */ }
    const sb = createBrowserSupabaseClient();
    sb.auth.getSession().then(({ data: s }) => { if (s.session) load(); else setChecking(false); });
  }, [load]);

  async function decide(id: string, decision: 'accepted' | 'declined') {
    setData((d) => ({ ...d, quotes: (d.quotes || []).map((q) => (q.id === id ? { ...q, buyer_decision: decision, status: decision === 'accepted' ? 'won' : 'lost' } : q)) }));
    await fetch('/api/buyer/quote-decision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quote_request_id: id, decision }) });
  }
  async function openChat(id: string) {
    setChatFor(id); setChatMsgs([]); setChatInput('');
    const res = await fetch(`/api/buyer/messages?quote_request_id=${id}`);
    const data = await res.json();
    if (data.ok) setChatMsgs(data.messages || []);
  }
  async function sendChat(id: string) {
    const text = chatInput.trim();
    if (!text || chatBusy) return;
    setChatBusy(true);
    const res = await fetch('/api/buyer/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quote_request_id: id, body: text }) });
    const data = await res.json();
    if (data.ok) { setChatMsgs((m) => [...m, data.message]); setChatInput(''); }
    setChatBusy(false);
  }

  async function submitReview(id: string) {
    setRvBusy(true);
    const res = await fetch('/api/buyer/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quote_request_id: id, rating: rv.rating, title: rv.title, body: rv.body }) });
    const data = await res.json();
    if (data.ok) {
      setData((d) => ({ ...d, quotes: (d.quotes || []).map((q) => (q.id === id ? { ...q, reviewed: true } : q)) }));
      setReviewOpen(null); setRv({ rating: 5, title: '', body: '' });
    }
    setRvBusy(false);
  }

  const requests = data.requests || [];
  const quotes = data.quotes || [];
  const hasActivity = requests.length > 0 || quotes.length > 0;

  return (
    <div className="by">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="by-nav">
        <a className="by-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b><span>Dashboard</span></a>
        <div className="by-navlinks">
          <a className="by-link" href="/marketplace">Browse marketplace</a>
          <a className="by-link" href="/intake">Describe a need</a>
        </div>
      </nav>

      <main className="by-wrap">
        <h1>Your dashboard</h1>
        {data.email && <p className="by-sub">Signed in as {data.email}</p>}

        {checking ? (
          <div className="by-empty">Loading…</div>
        ) : !data.signed_in ? (
          <div className="by-empty">Sign in to see your requests — <a href="/login">go to sign in</a></div>
        ) : data.email_verified === false ? (
          <div className="by-empty">
            Verify your email to see your requests.<br />
            <small>Check your inbox for the confirmation link, then reload this page.</small>
          </div>
        ) : (
          <>
            {/* Saved listings */}
            <section className="by-sec">
              <div className="by-sechead"><h2>Saved listings</h2></div>
              {savedCount === 0 ? (
                <div className="by-empty sm">Nothing saved yet. <a href="/marketplace">Browse the marketplace</a> and tap Save on listings you like.</div>
              ) : (
                <a className="by-saved" href="/marketplace">
                  <b>{savedCount}</b> saved listing{savedCount === 1 ? '' : 's'} <span>→ view in marketplace</span>
                </a>
              )}
            </section>

            {/* NXT-assisted intake requests */}
            <section className="by-sec">
              <div className="by-sechead"><h2>Your requests</h2><a className="by-link" href="/intake">+ New request</a></div>
              {requests.length === 0 ? (
                <div className="by-empty sm">No requests yet. <a href="/intake">Describe what you need</a> and NXT//LINK will help.</div>
              ) : (
                <div className="by-list">
                  {requests.map((r) => (
                    <div className="by-card" key={r.id}>
                      <div className="by-top">
                        <span className="by-status">{REQUEST_LABEL[r.status || ''] || r.status || 'Received'}</span>
                        <b>{r.category || 'Request'}</b>
                        <small>{fmtDate(r.created_at)}</small>
                        <span className="by-ref">{r.public_ref}</span>
                      </div>
                      {r.problem && <p className="by-msg">{r.problem}</p>}
                      <div className="by-meta">
                        {r.location && <span>{r.location}</span>}
                        {r.urgency && <span>Urgency: {r.urgency}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Self-service marketplace quote requests */}
            <section className="by-sec">
              <div className="by-sechead"><h2>Quote requests</h2><a className="by-link" href="/marketplace">Browse listings</a></div>
              {quotes.length === 0 ? (
                <div className="by-empty sm">No quote requests yet. <a href="/marketplace">Find a product or service</a> and request a quote.</div>
              ) : (
                <div className="by-list">
                  {quotes.map((q) => (
                    <div className="by-card" key={q.id}>
                      <div className="by-top">
                        <span className={'by-status ' + (q.status === 'responded' ? 'resp' : '')}>{QUOTE_LABEL[q.status] || q.status}</span>
                        <b>{q.listing_name || (q.kind === 'service' ? 'Service request' : 'Product request')}</b>
                        <small>{fmtDate(q.created_at)}</small>
                        <span className="by-ref">{q.public_ref}</span>
                      </div>
                      {q.message && <p className="by-msg">{q.message}</p>}
                      {/* Message the vendor — inside NXT//LINK */}
                      <div className="by-chat">
                        {chatFor === q.id ? (
                          <div className="by-chatbox">
                            <div className="by-chatlist">
                              {chatMsgs.length === 0 && <div className="by-chatempty">No messages yet — ask the vendor anything.</div>}
                              {chatMsgs.map((m) => (
                                <div key={m.id} className={'by-bubble ' + (m.sender === 'buyer' ? 'me' : 'them')}>
                                  {m.body}
                                  <small>{new Date(m.created_at).toLocaleString()}</small>
                                </div>
                              ))}
                            </div>
                            <div className="by-chatrow">
                              <input value={chatInput} placeholder="Message the vendor…" onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendChat(q.id); }} />
                              <button className="by-accept" disabled={chatBusy || !chatInput.trim()} onClick={() => sendChat(q.id)}>Send</button>
                              <button className="by-decline" onClick={() => setChatFor(null)}>Close</button>
                            </div>
                          </div>
                        ) : (
                          <button className="by-chatopen" onClick={() => openChat(q.id)}>Message vendor</button>
                        )}
                      </div>
                      {(q.pilots || []).length > 0 && (
                        <div className="by-pilots">
                          {(q.pilots || []).map((p, i) => (
                            <div className="by-pilot" key={i}>
                              <span className="by-pkind">{p.kind.replace('_', ' ')}</span>
                              <span className="by-pstatus">{p.status.replace('_', ' ')}</span>
                              {p.scheduled_for && <small>{new Date(p.scheduled_for).toLocaleString()}</small>}
                              {p.location && <small>· {p.location}</small>}
                              {p.outcome && <span className={'by-poutcome ' + p.outcome}>{p.outcome}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {q.quote_amount != null && (
                        <div className="by-quote">
                          <div className="by-qhead">Quote received: <b>{money(q.quote_amount)}</b>{q.quote_timeline ? ` · ${q.quote_timeline}` : ''}</div>
                          {q.quote_message && <p className="by-qmsg">{q.quote_message}</p>}
                          {q.quote_valid_until && <div className="by-qvalid">Valid until {fmtDate(q.quote_valid_until)}</div>}
                          {q.buyer_decision ? (
                            <div className={'by-decided ' + q.buyer_decision}>You {q.buyer_decision} this quote</div>
                          ) : (
                            <div className="by-qactions">
                              <button className="by-accept" onClick={() => decide(q.id, 'accepted')}>Accept quote</button>
                              <button className="by-decline" onClick={() => decide(q.id, 'declined')}>Decline</button>
                            </div>
                          )}
                          {q.buyer_decision === 'accepted' && (
                            q.reviewed ? (
                              <div className="by-reviewed">✓ You reviewed this vendor</div>
                            ) : reviewOpen === q.id ? (
                              <div className="by-rvform">
                                <div className="by-stars">
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <button key={n} type="button" className={n <= rv.rating ? 'on' : ''} onClick={() => setRv({ ...rv, rating: n })} aria-label={`${n} star${n > 1 ? 's' : ''}`}>★</button>
                                  ))}
                                </div>
                                <input placeholder="Title (optional)" value={rv.title} onChange={(e) => setRv({ ...rv, title: e.target.value })} />
                                <textarea rows={2} placeholder="How did it go? (optional)" value={rv.body} onChange={(e) => setRv({ ...rv, body: e.target.value })} />
                                <div className="by-rvactions">
                                  <button className="by-accept" disabled={rvBusy} onClick={() => submitReview(q.id)}>{rvBusy ? 'Saving…' : 'Submit review'}</button>
                                  <button className="by-decline" onClick={() => setReviewOpen(null)}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <button className="by-rvopen" onClick={() => { setRv({ rating: 5, title: '', body: '' }); setReviewOpen(q.id); }}>Leave a review</button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {!hasActivity && (
              <p className="by-hint">
                You have no activity yet. Start by <a href="/marketplace">browsing the marketplace</a> or <a href="/intake">describing what you need</a>.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
.by{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.by *{box-sizing:border-box;}
.by-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(10,10,15,.85);backdrop-filter:blur(20px);z-index:20;}
.by-brand{display:flex;align-items:baseline;gap:10px;color:#F0F0F5;text-decoration:none;}
.by-brand b{font-size:17px;}.by-brand i{color:#A78BFA;font-style:normal;}
.by-brand span{color:#8080A0;font-size:13px;}
.by-navlinks{display:flex;gap:18px;}
.by-link{color:#A78BFA;font-size:13.5px;font-weight:600;text-decoration:none;white-space:nowrap;}
.by-link:hover{color:#C4B5FD;}
.by-wrap{max-width:760px;margin:0 auto;padding:36px 20px 100px;}
.by-wrap h1{font-size:28px;font-weight:800;letter-spacing:-.02em;}
.by-sub{color:#8080A0;font-size:14px;margin:6px 0 8px;}
.by-empty{text-align:center;color:#8080A0;padding:60px 0;line-height:1.7;}
.by-empty.sm{padding:26px 0;font-size:14px;}
.by-empty small{color:#606078;font-size:12.5px;}
.by-empty a{color:#A78BFA;}
.by-sec{margin-top:34px;}
.by-sechead{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;border-bottom:1px solid rgba(255,255,255,.06);padding-bottom:8px;}
.by-sechead h2{font-size:16px;font-weight:700;letter-spacing:-.01em;}
.by-list{display:flex;flex-direction:column;gap:14px;}
.by-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px 18px;}
.by-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.by-top b{font-size:15px;}
.by-top small{color:#8080A0;font-size:12.5px;}
.by-ref{margin-left:auto;color:#505068;font-size:12px;}
.by-status{font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:4px 9px;border-radius:99px;background:rgba(124,92,252,.15);color:#C4B5FD;}
.by-status.resp{background:rgba(52,211,153,.12);color:#34D399;}
.by-msg{margin:12px 0 0;font-size:14px;color:#D5D4E0;line-height:1.6;background:#111118;border-radius:10px;padding:11px 13px;white-space:pre-wrap;}
.by-meta{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:#9090A8;margin-top:10px;}
.by-saved{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px 16px;color:#D5D4E0;text-decoration:none;font-size:14px;}
.by-saved b{font-size:18px;color:#C4B5FD;}
.by-saved span{color:#8080A0;font-size:13px;}
.by-saved:hover{border-color:#A78BFA;}
.by-quote{margin-top:12px;background:#111118;border:1px solid rgba(124,92,252,.3);border-radius:12px;padding:13px 15px;}
.by-qhead{font-size:14.5px;color:#D5D4E0;}
.by-qhead b{color:#C4B5FD;font-size:16px;}
.by-qmsg{margin:9px 0 0;font-size:13.5px;color:#C0C0D0;line-height:1.55;white-space:pre-wrap;}
.by-qvalid{margin-top:8px;font-size:12.5px;color:#8080A0;}
.by-qactions{display:flex;gap:9px;margin-top:12px;}
.by-accept{font-family:inherit;font-size:13.5px;font-weight:700;background:#34D399;border:none;color:#05271b;border-radius:9px;padding:9px 16px;cursor:pointer;}
.by-decline{font-family:inherit;font-size:13px;background:none;border:1px solid rgba(255,255,255,.16);color:#C0C0D0;border-radius:9px;padding:9px 14px;cursor:pointer;}
.by-decided{margin-top:10px;font-size:13px;font-weight:700;text-transform:capitalize;}
.by-decided.accepted{color:#34D399;}
.by-decided.declined{color:#FCA5A5;}
.by-chat{margin-top:11px;}
.by-chatopen{font-family:inherit;font-size:12.5px;font-weight:600;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.35);color:#34D399;border-radius:9px;padding:8px 14px;cursor:pointer;}
.by-chatbox{background:#111118;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px;}
.by-chatlist{display:flex;flex-direction:column;gap:8px;max-height:260px;overflow-y:auto;padding:4px 2px 10px;}
.by-chatempty{color:#8080A0;font-size:13px;text-align:center;padding:14px 0;}
.by-bubble{max-width:82%;padding:9px 12px;border-radius:12px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;display:flex;flex-direction:column;gap:3px;}
.by-bubble small{font-size:10.5px;opacity:.6;}
.by-bubble.me{align-self:flex-end;background:#7C5CFC;color:#fff;border-bottom-right-radius:4px;}
.by-bubble.them{align-self:flex-start;background:rgba(255,255,255,.07);color:#E5E4F0;border-bottom-left-radius:4px;}
.by-chatrow{display:flex;gap:8px;}
.by-chatrow input{flex:1;font-family:inherit;font-size:14px;padding:10px 12px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:#0A0A0F;color:#F0F0F5;outline:none;}
.by-chatrow input:focus{border-color:#7C5CFC;}
.by-pilots{margin-top:10px;display:flex;flex-direction:column;gap:7px;}
.by-pilot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:#111118;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:9px 12px;}
.by-pilot small{color:#8080A0;font-size:12px;}
.by-pkind{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:3px 9px;border-radius:99px;background:rgba(124,92,252,.15);color:#C4B5FD;}
.by-pstatus{font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:99px;background:rgba(255,255,255,.06);color:#C0C0D0;text-transform:capitalize;}
.by-poutcome{font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:99px;text-transform:capitalize;}
.by-poutcome.passed{background:rgba(52,211,153,.14);color:#34D399;}
.by-poutcome.failed{background:rgba(252,165,165,.12);color:#FCA5A5;}
.by-poutcome.inconclusive{background:rgba(251,191,36,.12);color:#FBBF24;}
.by-reviewed{margin-top:10px;font-size:13px;color:#34D399;font-weight:600;}
.by-rvopen{margin-top:10px;font-family:inherit;font-size:12.5px;font-weight:600;background:none;border:1px solid rgba(255,255,255,.16);color:#C4B5FD;border-radius:9px;padding:8px 14px;cursor:pointer;}
.by-rvform{margin-top:12px;display:flex;flex-direction:column;gap:9px;}
.by-stars{display:flex;gap:3px;}
.by-stars button{background:none;border:none;font-size:24px;line-height:1;color:#3A3A48;cursor:pointer;padding:0;}
.by-stars button.on{color:#FBBF24;}
.by-rvform input,.by-rvform textarea{font-family:inherit;font-size:14px;padding:10px 12px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:#0A0A0F;color:#F0F0F5;outline:none;resize:vertical;}
.by-rvform input:focus,.by-rvform textarea:focus{border-color:#7C5CFC;}
.by-rvactions{display:flex;gap:9px;}
.by-hint{margin-top:34px;color:#8080A0;font-size:14px;text-align:center;line-height:1.7;}
.by-hint a{color:#A78BFA;}
@media(max-width:520px){.by-navlinks{gap:12px;}}
`;
