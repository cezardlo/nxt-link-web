'use client';

// /vendor/deals — the vendor's read-only view of their deals & commission.
// Shows the vendor's first-deal fee-credit standing, each deal's status through
// the pipeline, the NXT//LINK commission, and the protected-until date.
// Concierge phase: operators drive the deals; the vendor just tracks where
// things stand.

import { useEffect, useState } from 'react';
import VendorNav from '@/components/VendorNav';

interface Deal {
  id: string; opportunity_ref: string | null; buyer_company: string | null; description: string | null;
  net_amount: number; commission_amount: number | null; effective_rate: number | null;
  is_free_credit: boolean; status: string; invoice_ref: string | null; protected_until: string | null; created_at: string;
}
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString(); } catch { return ''; } };
const STATUS_LABEL: Record<string, string> = {
  reserved: 'Reserved', won: 'Won', payment_reported: 'Payment reported', payment_confirmed: 'Payment confirmed',
  invoiced: 'Commission invoiced', paid: 'Paid', overdue: 'Overdue', disputed: 'Disputed', credited: 'Credited', cancelled: 'Cancelled',
};

interface Credit { tier: 'standard' | 'founding'; cap: number; available: boolean; expiresAt: string | null; }

export default function VendorDealsPage() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [credit, setCredit] = useState<Credit>({ tier: 'standard', cap: 250, available: false, expiresAt: null });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/vendor/deals');
        if (r.status === 401) { setSignedIn(false); setLoading(false); return; }
        const j = await r.json();
        if (j.ok) { setDeals(j.deals); if (j.credit) setCredit(j.credit); }
      } catch { /* */ }
      setLoading(false);
    })();
  }, []);

  const totals = deals.reduce((acc, d) => {
    const c = Number(d.commission_amount) || 0;
    acc.deals += 1; acc.owed += c; if (d.status === 'paid') acc.paid += c;
    return acc;
  }, { deals: 0, owed: 0, paid: 0 });

  return (
    <div className="vd">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <VendorNav active="deals" />

      <div className="vd-wrap">
        <h1>My deals &amp; commission</h1>
        <p className="vd-sub">Where each deal stands, and what you owe NXT//LINK — only ever after you’ve been paid.</p>

        {!signedIn ? (
          <div className="vd-empty">Sign in to see your deals — <a href="/vendor-login">vendor sign in</a></div>
        ) : (
          <>
            {/* First-deal fee-credit banner */}
            <div className="vd-credits">
              <div className="vd-creditmain">
                {credit.available ? (
                  <>
                    <b>First-deal credit: up to {money(credit.cap)} off your first commission</b>
                    <span>New vendors get a one-time credit toward the NXT//LINK fee on their first closed deal (within 90 days of joining, one per company). On that deal and every deal after: 5% on the first $50k, 3% above, capped at $20,000 — charged only on deals that close through NXT//LINK, and only after you’ve been paid.</span>
                  </>
                ) : (
                  <>
                    <b>NXT//LINK commission</b>
                    <span>5% on the first $50k, 3% above, capped at $20,000 — charged only on deals that close through NXT//LINK, and only after you’ve been paid.</span>
                  </>
                )}
              </div>
              <div className="vd-creditdots">
                <span className={credit.available ? 'on' : ''} />
              </div>
            </div>

            <div className="vd-stats">
              <div className="vd-stat"><b>{totals.deals}</b><span>Deals</span></div>
              <div className="vd-stat"><b>{money(totals.owed)}</b><span>Commission (all deals)</span></div>
              <div className="vd-stat"><b>{money(totals.paid)}</b><span>Paid</span></div>
            </div>

            {loading ? <div className="vd-empty">Loading…</div> : deals.length === 0 ? (
              <div className="vd-empty">No deals yet. When NXT//LINK introduces you to a buyer and you win the work, it shows up here.</div>
            ) : (
              <div className="vd-list">
                {deals.map((d) => (
                  <div key={d.id} className="vd-card">
                    <div className="vd-cardtop">
                      <div><b>{d.buyer_company || 'Buyer'}</b>{d.opportunity_ref && <span className="vd-ref">{d.opportunity_ref}</span>}</div>
                      <span className={`vd-badge s-${d.status}`}>{STATUS_LABEL[d.status] || d.status}</span>
                    </div>
                    {d.description && <div className="vd-desc">{d.description}</div>}
                    <div className="vd-row">
                      <div><span>Deal value</span><b>{money(d.net_amount)}</b></div>
                      <div><span>NXT//LINK fee</span><b>{money(Number(d.commission_amount) || 0)}{d.is_free_credit && <em> · credit applied</em>}</b></div>
                      {d.protected_until && <div><span>Protected until</span><b>{fmtDate(d.protected_until)}</b></div>}
                      {d.invoice_ref && <div><span>Invoice</span><b>{d.invoice_ref}</b></div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const CSS = `
.vd{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.vd *{box-sizing:border-box;}
.vd-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(10,10,15,.9);backdrop-filter:blur(20px);z-index:30;}
.vd-brand{display:flex;align-items:baseline;gap:10px;color:#F0F0F5;text-decoration:none;}
.vd-brand b{font-size:17px;}.vd-brand i{color:#A78BFA;font-style:normal;}.vd-brand span{color:#8080A0;font-size:13px;}
.vd-navr{display:flex;gap:8px;}
.vd-pill{font-size:13px;font-weight:500;color:#C0C0D0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:99px;padding:8px 14px;text-decoration:none;}
.vd-wrap{max-width:860px;margin:0 auto;padding:30px 20px 90px;}
.vd-wrap h1{font-size:25px;font-weight:800;letter-spacing:-.02em;margin:0;}
.vd-sub{color:#8080A0;font-size:14px;margin:8px 0 22px;max-width:60ch;line-height:1.6;}
.vd-empty{color:#8080A0;font-size:14px;padding:40px 0;text-align:center;}
.vd-empty a{color:#A78BFA;}
.vd-credits{display:flex;justify-content:space-between;align-items:center;gap:18px;background:linear-gradient(120deg,rgba(124,92,252,.14),rgba(52,211,153,.07));border:1px solid rgba(124,92,252,.3);border-radius:15px;padding:18px 20px;}
.vd-creditmain b{font-size:16px;font-weight:800;display:block;}
.vd-creditmain span{font-size:12.5px;color:#B8B6CC;line-height:1.5;display:block;margin-top:6px;max-width:60ch;}
.vd-creditdots{display:flex;gap:8px;flex-shrink:0;}
.vd-creditdots span{width:16px;height:16px;border-radius:50%;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);}
.vd-creditdots span.on{background:#34D399;border-color:transparent;}
.vd-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0;}
.vd-stat{background:#14141F;border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:15px;}
.vd-stat b{font-size:20px;font-weight:800;display:block;font-variant-numeric:tabular-nums;}
.vd-stat span{font-size:11.5px;color:#8080A0;}
.vd-list{display:flex;flex-direction:column;gap:11px;}
.vd-card{background:#12121B;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px 18px;}
.vd-cardtop{display:flex;justify-content:space-between;align-items:center;gap:10px;}
.vd-cardtop b{font-size:15px;}
.vd-ref{margin-left:8px;font-size:11.5px;color:#8080A0;font-variant-numeric:tabular-nums;}
.vd-badge{font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;background:rgba(255,255,255,.06);color:#C0C0D0;white-space:nowrap;}
.vd-badge.s-paid{background:rgba(52,211,153,.14);color:#34D399;}
.vd-badge.s-invoiced,.vd-badge.s-payment_confirmed{background:rgba(124,92,252,.14);color:#C4B5FD;}
.vd-badge.s-overdue,.vd-badge.s-disputed{background:rgba(248,113,113,.14);color:#FCA5A5;}
.vd-desc{font-size:13px;color:#B8B6CC;margin-top:8px;line-height:1.5;}
.vd-row{display:flex;flex-wrap:wrap;gap:10px 28px;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.07);}
.vd-row>div{display:flex;flex-direction:column;gap:2px;}
.vd-row span{font-size:11px;color:#5A5A70;}
.vd-row b{font-size:14px;font-weight:700;font-variant-numeric:tabular-nums;}
.vd-row em{font-style:normal;font-size:11px;color:#34D399;}
`;
