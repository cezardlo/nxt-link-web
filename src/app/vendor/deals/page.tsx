'use client';

// /vendor/deals — the vendor's read-only view of their deals & commission.
// Shows the vendor's first-deal discount standing, each deal's status through
// the pipeline, the NXT//LINK commission, and the protected-until date.
// Concierge phase: operators drive the deals; the vendor just tracks where
// things stand.
//
// EN/ES via the shared LanguageToggle/useLang pattern (same as /vendor/leads,
// /vendor/listings, /vendor/quotes — nxt_lang in localStorage). This page had
// no lang mechanism at all before; every vendor-visible string now goes
// through `t`. The two commission/fee sentences are frozen wording pending
// owner sign-off — translated literally, numbers untouched.

import { useEffect, useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import VendorNav from '@/components/VendorNav';
import LanguageToggle, { useLang, type Lang } from '@/components/LanguageToggle';

// Design System v1.0 reskin (Premium Polish Phase 2, 2026-07-23): visual/CSS
// only — every handler and state above is unchanged.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-vdeals',
  display: 'swap',
});

interface Deal {
  id: string; opportunity_ref: string | null; buyer_company: string | null; description: string | null;
  net_amount: number; commission_amount: number | null; effective_rate: number | null;
  is_free_credit: boolean; status: string; invoice_ref: string | null; protected_until: string | null; created_at: string;
}
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString(); } catch { return ''; } };

interface Credit { rate: number; available: boolean; expiresAt: string | null; }

const T: Record<Lang, Record<string, string>> = {
  en: {
    title: 'My deals & commission',
    subtitle: 'Where each deal stands, and what you owe NXT//LINK — only ever after you’ve been paid.',
    signInPrefix: 'Sign in to see your deals —', goToSignIn: 'vendor sign in',
    creditHeadAvailable: 'First-deal offer: 50% off your first commission',
    creditBodyAvailable: 'New vendors get 50% off the NXT//LINK fee on their first closed deal (within 90 days of joining, one per company). On that deal and every deal after: 4% on the first $50k, 2% above, capped at $20,000 — charged only on deals that close through NXT//LINK, and only after you’ve been paid.',
    creditHeadDefault: 'NXT//LINK commission',
    creditBodyDefault: '4% on the first $50k, 2% above, capped at $20,000 — charged only on deals that close through NXT//LINK, and only after you’ve been paid.',
    statDeals: 'Deals', statCommission: 'Commission (all deals)', statPaid: 'Paid',
    loading: 'Loading…',
    emptyDeals: 'No deals yet. When NXT//LINK introduces you to a buyer and you win the work, it shows up here.',
    buyerFallback: 'Buyer',
    dealValue: 'Deal value', nxtFee: 'NXT//LINK fee', creditApplied: '· credit applied',
    protectedUntil: 'Protected until', invoiceLabel: 'Invoice',
    stReserved: 'Reserved', stWon: 'Won', stPaymentReported: 'Payment reported', stPaymentConfirmed: 'Payment confirmed',
    stInvoiced: 'Commission invoiced', stPaid: 'Paid', stOverdue: 'Overdue', stDisputed: 'Disputed',
    stCredited: 'Credited', stCancelled: 'Cancelled',
  },
  es: {
    title: 'Mis tratos y comisión',
    subtitle: 'En qué punto está cada trato, y qué le debes a NXT//LINK — solo después de que te hayan pagado.',
    signInPrefix: 'Inicia sesión para ver tus tratos —', goToSignIn: 'inicio de sesión de proveedor',
    creditHeadAvailable: 'Oferta de primer trato: 50% de descuento en tu primera comisión',
    creditBodyAvailable: 'Los proveedores nuevos reciben 50% de descuento en la comisión de NXT//LINK en su primer trato cerrado (dentro de los primeros 90 días después de unirse, uno por empresa). En ese trato y en cada trato posterior: 4% sobre los primeros $50k, 2% por encima de eso, con un tope de $20,000 — cobrado solo en tratos que se cierran a través de NXT//LINK, y solo después de que te hayan pagado.',
    creditHeadDefault: 'Comisión de NXT//LINK',
    creditBodyDefault: '4% sobre los primeros $50k, 2% por encima de eso, con un tope de $20,000 — cobrado solo en tratos que se cierran a través de NXT//LINK, y solo después de que te hayan pagado.',
    statDeals: 'Tratos', statCommission: 'Comisión (todos los tratos)', statPaid: 'Pagado',
    loading: 'Cargando…',
    emptyDeals: 'Aún no hay tratos. Cuando NXT//LINK te presente a un comprador y ganes el trabajo, aparecerá aquí.',
    buyerFallback: 'Comprador',
    dealValue: 'Valor del trato', nxtFee: 'Comisión NXT//LINK', creditApplied: '· crédito aplicado',
    protectedUntil: 'Protegido hasta', invoiceLabel: 'Factura',
    stReserved: 'Reservado', stWon: 'Ganado', stPaymentReported: 'Pago reportado', stPaymentConfirmed: 'Pago confirmado',
    stInvoiced: 'Comisión facturada', stPaid: 'Pagado', stOverdue: 'Vencido', stDisputed: 'Disputado',
    stCredited: 'Acreditado', stCancelled: 'Cancelado',
  },
};

export default function VendorDealsPage() {
  const [lang, setLang] = useLang();
  const t = T[lang];
  const STATUS_LABEL: Record<string, string> = {
    reserved: t.stReserved, won: t.stWon, payment_reported: t.stPaymentReported, payment_confirmed: t.stPaymentConfirmed,
    invoiced: t.stInvoiced, paid: t.stPaid, overdue: t.stOverdue, disputed: t.stDisputed, credited: t.stCredited, cancelled: t.stCancelled,
  };

  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [credit, setCredit] = useState<Credit>({ rate: 0.5, available: false, expiresAt: null });

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
    <div className={`vd ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <VendorNav active="deals" extra={<LanguageToggle lang={lang} onChange={setLang} variant="light" />} />

      <div className="vd-wrap">
        <h1>{t.title}</h1>
        <p className="vd-sub">{t.subtitle}</p>

        {!signedIn ? (
          <div className="vd-empty">{t.signInPrefix} <a href="/vendor-login">{t.goToSignIn}</a></div>
        ) : (
          <>
            {/* First-deal discount banner */}
            <div className="vd-credits">
              <div className="vd-creditmain">
                {credit.available ? (
                  <>
                    <b>{t.creditHeadAvailable}</b>
                    <span>{t.creditBodyAvailable}</span>
                  </>
                ) : (
                  <>
                    <b>{t.creditHeadDefault}</b>
                    <span>{t.creditBodyDefault}</span>
                  </>
                )}
              </div>
              <div className="vd-creditdots">
                <span className={credit.available ? 'on' : ''} />
              </div>
            </div>

            <div className="vd-stats">
              <div className="vd-stat"><b>{totals.deals}</b><span>{t.statDeals}</span></div>
              <div className="vd-stat"><b>{money(totals.owed)}</b><span>{t.statCommission}</span></div>
              <div className="vd-stat"><b>{money(totals.paid)}</b><span>{t.statPaid}</span></div>
            </div>

            {loading ? <div className="vd-empty">{t.loading}</div> : deals.length === 0 ? (
              <div className="vd-empty">{t.emptyDeals}</div>
            ) : (
              <div className="vd-list">
                {deals.map((d) => (
                  <div key={d.id} className="vd-card">
                    <div className="vd-cardtop">
                      <div><b>{d.buyer_company || t.buyerFallback}</b>{d.opportunity_ref && <span className="vd-ref">{d.opportunity_ref}</span>}</div>
                      <span className={`vd-badge s-${d.status}`}>{STATUS_LABEL[d.status] || d.status}</span>
                    </div>
                    {d.description && <div className="vd-desc">{d.description}</div>}
                    <div className="vd-row">
                      <div><span>{t.dealValue}</span><b>{money(d.net_amount)}</b></div>
                      <div><span>{t.nxtFee}</span><b>{money(Number(d.commission_amount) || 0)}{d.is_free_credit && <em> {t.creditApplied}</em>}</b></div>
                      {d.protected_until && <div><span>{t.protectedUntil}</span><b>{fmtDate(d.protected_until)}</b></div>}
                      {d.invoice_ref && <div><span>{t.invoiceLabel}</span><b>{d.invoice_ref}</b></div>}
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
.vd{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-vdeals),'IBM Plex Sans',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.vd *{box-sizing:border-box;}
.vd a:focus-visible,.vd button:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.vd-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid var(--spec-border,#E2DFEC);position:sticky;top:0;background:rgba(248,247,251,.92);backdrop-filter:blur(20px);z-index:30;}
.vd-brand{display:flex;align-items:baseline;gap:10px;color:var(--spec-ink,#141320);text-decoration:none;}
.vd-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:17px;font-weight:700;}.vd-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}.vd-brand span{color:var(--spec-text-2nd,#615F72);font-size:13px;}
.vd-navr{display:flex;gap:8px;}
.vd-pill{font-size:13px;font-weight:500;color:var(--spec-ink,#141320);background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:99px;padding:8px 14px;text-decoration:none;}
.vd-wrap{max-width:860px;margin:0 auto;padding:30px 20px 90px;}
.vd-wrap h1{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:25px;font-weight:700;letter-spacing:-.01em;margin:0;}
.vd-sub{color:var(--spec-text-2nd,#615F72);font-size:14px;margin:8px 0 22px;max-width:60ch;line-height:1.6;}
.vd-empty{color:var(--spec-text-2nd,#615F72);font-size:14px;padding:40px 0;text-align:center;}
.vd-empty a{color:var(--spec-violet-deep,#4A3DB0);}
.vd-credits{display:flex;justify-content:space-between;align-items:center;gap:18px;background:linear-gradient(120deg,rgba(108,92,224,.1),rgba(47,158,106,.06));border:1px solid rgba(108,92,224,.28);border-radius:15px;padding:18px 20px;}
.vd-creditmain b{font-size:16px;font-weight:800;display:block;}
.vd-creditmain span{font-size:12.5px;color:var(--spec-text-2nd,#615F72);line-height:1.5;display:block;margin-top:6px;max-width:60ch;}
.vd-creditdots{display:flex;gap:8px;flex-shrink:0;}
.vd-creditdots span{width:16px;height:16px;border-radius:50%;background:#fff;border:1px solid var(--spec-border,#E2DFEC);}
.vd-creditdots span.on{background:var(--spec-success,#2F9E6A);border-color:transparent;}
.vd-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0;}
.vd-stat{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:13px;padding:15px;}
.vd-stat b{font-size:20px;font-weight:800;display:block;font-variant-numeric:tabular-nums;}
.vd-stat span{font-size:11.5px;color:var(--spec-text-2nd,#615F72);}
.vd-list{display:flex;flex-direction:column;gap:11px;}
.vd-card{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:14px;padding:16px 18px;}
.vd-cardtop{display:flex;justify-content:space-between;align-items:center;gap:10px;}
.vd-cardtop b{font-size:15px;}
.vd-ref{margin-left:8px;font-size:11.5px;color:var(--spec-text-2nd,#615F72);font-variant-numeric:tabular-nums;}
.vd-badge{font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;background:var(--spec-surface,#EFEDF5);color:var(--spec-ink,#141320);white-space:nowrap;}
.vd-badge.s-paid{background:#E9F7F0;color:#1F7A54;}
.vd-badge.s-invoiced,.vd-badge.s-payment_confirmed{background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);}
.vd-badge.s-overdue,.vd-badge.s-disputed{background:#FBECEA;color:var(--spec-error,#CE4B43);}
.vd-desc{font-size:13px;color:var(--spec-text-2nd,#615F72);margin-top:8px;line-height:1.5;}
.vd-row{display:flex;flex-wrap:wrap;gap:10px 28px;margin-top:12px;padding-top:12px;border-top:1px solid var(--spec-border,#E2DFEC);}
.vd-row>div{display:flex;flex-direction:column;gap:2px;}
.vd-row span{font-size:11px;color:#706D88;}
.vd-row b{font-size:14px;font-weight:700;font-variant-numeric:tabular-nums;}
.vd-row em{font-style:normal;font-size:11px;color:var(--spec-success,#2F9E6A);}
`;
