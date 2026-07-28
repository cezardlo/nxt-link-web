'use client';

// /vendor/quotes — the vendor proposal builder, DB-backed.
// North star: a vendor answers a lead in ~2 minutes, never a blank 20-field
// form. Pick a lead → line items with live totals (prefilled starter row) →
// terms → live commission preview → Save draft or Send. Submitted revisions
// are immutable; "Revise" starts revision+1. Replaces the old localStorage-only
// builder — proposals now persist and survive logout.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import VendorNav from '@/components/VendorNav';
import LanguageToggle, { useLang, type Lang } from '@/components/LanguageToggle';

// Design System v1.0 reskin (Premium Polish Phase 2, 2026-07-23): visual/CSS
// only — every handler and state above is unchanged.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-vquotes',
  display: 'swap',
});

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
  { v: 'product', en: 'Product / equipment', es: 'Producto / equipo' }, { v: 'labor', en: 'Labor', es: 'Mano de obra' },
  { v: 'install', en: 'Installation', es: 'Instalación' }, { v: 'shipping', en: 'Shipping', es: 'Envío' },
  { v: 'travel', en: 'Travel / mobile fee', es: 'Viaje / cargo de traslado' }, { v: 'other', en: 'Other', es: 'Otro' },
];
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString(); } catch { return ''; } };
const EMPTY_ITEM: Item = { description: '', qty: 1, unit_price: 0, kind: 'product' };
const DEFAULT_PAYMENT_TERMS: Record<Lang, string> = {
  en: '50% deposit, 50% on completion',
  es: '50% de depósito, 50% al finalizar',
};

// EN/ES dictionary — same shared LanguageToggle/useLang pattern as
// /vendor/leads (nxt_lang in localStorage). This page had no lang mechanism
// at all before; every vendor-visible string below now goes through `t`.
const T: Record<Lang, Record<string, string>> = {
  en: {
    pageTitle: 'Quotes & proposals',
    pageSub: 'Answer a lead in about two minutes. Your proposal is saved, versioned, and delivered inside NXT//LINK.',
    signInFirst: 'Sign in to see your leads —', goToSignIn: 'vendor sign in',
    loadingLeads: 'Loading your leads…',
    noOpenLeads: 'No open leads yet. When a buyer requests a quote on one of your listings, it appears here.',
    openLeadsHead: 'Open leads', serviceRequest: 'Service request', productRequest: 'Product request',
    buyerFallback: 'Buyer', quoted: 'quoted', awaitingQuote: 'awaiting quote',
    pickLeadHint: '← Pick a lead to build its proposal.',
    request: 'Request', revSent: 'Rev', sent: 'sent',
    lineItems: 'Line items', descriptionPh: 'Description (e.g. 5,000 lb electric forklift)',
    qtyPh: 'Qty', unitPh: 'Unit $', addLine: '+ Add line',
    subtotal: 'Subtotal', tax: 'Tax', discount: 'Discount', total: 'Total',
    feeIfWonPrefix: 'NXT//LINK success fee if won:', feeIfWonSuffix: '— only due when you get paid.',
    terms: 'Terms', leadTime: 'Lead time', leadTimePh: 'e.g. 2–3 weeks',
    warranty: 'Warranty', warrantyPh: 'e.g. 2-year parts & labor', paymentTerms: 'Payment terms',
    quoteValidUntil: 'Quote valid until',
    assumptions: 'Assumptions', assumptionsPh: 'What this quote assumes (site access, power, etc.)',
    exclusions: 'Exclusions', exclusionsPh: 'What is NOT included',
    messageToBuyer: 'Message to the buyer', messageToBuyerPh: 'Short note — contact details are shared automatically after acceptance.',
    saveDraft: 'Save draft', sendRevisedProposal: 'Send revised proposal →', sendProposal: 'Send proposal →',
    proposalSent: 'Proposal sent to the buyer (revision {rev}). NXT//LINK fee if won: {fee}.',
    draftSaved: 'Draft saved — finish it anytime.',
    somethingWrong: 'Something went wrong.', somethingWrongRetry: 'Something went wrong. Please try again.',
    history: 'History', draftStatus: 'draft',
    stDraft: 'draft', stSubmitted: 'submitted', stRevised: 'revised', stFinal: 'final',
  },
  es: {
    pageTitle: 'Cotizaciones y propuestas',
    pageSub: 'Responde a un lead en unos dos minutos. Tu propuesta se guarda, se versiona y se entrega dentro de NXT//LINK.',
    signInFirst: 'Inicia sesión para ver tus leads —', goToSignIn: 'inicio de sesión de proveedor',
    loadingLeads: 'Cargando tus leads…',
    noOpenLeads: 'Aún no hay leads abiertos. Cuando un comprador solicite una cotización en una de tus publicaciones, aparecerá aquí.',
    openLeadsHead: 'Leads abiertos', serviceRequest: 'Solicitud de servicio', productRequest: 'Solicitud de producto',
    buyerFallback: 'Comprador', quoted: 'cotizado', awaitingQuote: 'esperando cotización',
    pickLeadHint: '← Elige un lead para armar su propuesta.',
    request: 'Solicitud', revSent: 'Rev', sent: 'enviada',
    lineItems: 'Partidas', descriptionPh: 'Descripción (ej. montacargas eléctrico de 5,000 lb)',
    qtyPh: 'Cant.', unitPh: 'Unidad $', addLine: '+ Agregar partida',
    subtotal: 'Subtotal', tax: 'Impuesto', discount: 'Descuento', total: 'Total',
    feeIfWonPrefix: 'Comisión de éxito de NXT//LINK si se gana:', feeIfWonSuffix: '— solo se debe cuando te paguen.',
    terms: 'Términos', leadTime: 'Plazo de entrega', leadTimePh: 'ej. 2–3 semanas',
    warranty: 'Garantía', warrantyPh: 'ej. 2 años de piezas y mano de obra', paymentTerms: 'Términos de pago',
    quoteValidUntil: 'Cotización válida hasta',
    assumptions: 'Supuestos', assumptionsPh: 'Qué asume esta cotización (acceso al sitio, energía, etc.)',
    exclusions: 'Exclusiones', exclusionsPh: 'Qué NO está incluido',
    messageToBuyer: 'Mensaje para el comprador', messageToBuyerPh: 'Nota breve — los datos de contacto se comparten automáticamente después de la aceptación.',
    saveDraft: 'Guardar borrador', sendRevisedProposal: 'Enviar propuesta revisada →', sendProposal: 'Enviar propuesta →',
    proposalSent: 'Propuesta enviada al comprador (revisión {rev}). Comisión NXT//LINK si se gana: {fee}.',
    draftSaved: 'Borrador guardado — termínalo cuando quieras.',
    somethingWrong: 'Algo salió mal.', somethingWrongRetry: 'Algo salió mal. Inténtalo de nuevo.',
    history: 'Historial', draftStatus: 'borrador',
    stDraft: 'borrador', stSubmitted: 'enviada', stRevised: 'revisada', stFinal: 'final',
  },
};

export default function VendorProposalsPage() {
  const [lang, setLang] = useLang(); // stored `nxt_lang` — shared across marketplace pages
  const t = T[lang];
  const STATUS_LABEL: Record<string, string> = { draft: t.stDraft, submitted: t.stSubmitted, revised: t.stRevised, final: t.stFinal };
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sel, setSel] = useState<Lead | null>(null);
  const [history, setHistory] = useState<Proposal[]>([]);

  const [items, setItems] = useState<Item[]>([{ ...EMPTY_ITEM }]);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [terms, setTerms] = useState({ lead_time: '', warranty: '', payment_terms: DEFAULT_PAYMENT_TERMS[lang], valid_until: '', assumptions: '', exclusions: '', notes: '' });
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
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/vendor/quote?amount=${total}`);
        const j = await r.json();
        if (j.ok) setCommission({ amount: j.commission_amount, rate: j.effective_rate });
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [total]);

  const pickLead = useCallback(async (lead: Lead) => {
    setSel(lead); setMsg('');
    // Smart default: start the first line from what they asked about.
    setItems([{ ...EMPTY_ITEM, description: lead.listing_name || '' }]);
    setTax(0); setDiscount(0);
    setTerms({ lead_time: '', warranty: '', payment_terms: DEFAULT_PAYMENT_TERMS[lang], valid_until: '', assumptions: '', exclusions: '', notes: '' });
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
          payment_terms: editable.payment_terms || DEFAULT_PAYMENT_TERMS[lang],
          valid_until: editable.valid_until || '', assumptions: editable.assumptions || '',
          exclusions: editable.exclusions || '', notes: editable.notes || '',
        });
      }
    } catch { setHistory([]); }
  }, [lang]);

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
          ? `✓ ${t.proposalSent.replace('{rev}', String(j.revision)).replace('{fee}', money(j.commission.amount))}`
          : `✓ ${t.draftSaved}`);
        pickLead(sel);
      } else setMsg(j.message || t.somethingWrong);
    } catch { setMsg(t.somethingWrongRetry); }
    setBusy(false);
  }

  const latestSubmitted = history.find((p) => ['submitted', 'final'].includes(p.status));

  return (
    <div className={`vp ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <VendorNav active="quotes" extra={<LanguageToggle lang={lang} onChange={setLang} variant="light" />} />

      <div className="vp-wrap">
        <h1>{t.pageTitle}</h1>
        <p className="vp-sub">{t.pageSub}</p>

        {!signedIn ? (
          <div className="vp-empty">{t.signInFirst} <a href="/vendor-login">{t.goToSignIn}</a></div>
        ) : loading ? (
          <div className="vp-empty">{t.loadingLeads}</div>
        ) : leads.length === 0 ? (
          <div className="vp-empty">{t.noOpenLeads}</div>
        ) : (
          <div className="vp-layout">
            {/* Lead picker */}
            <aside className="vp-leads">
              <div className="vp-leadhead">{t.openLeadsHead} ({leads.length})</div>
              {leads.map((l) => (
                <button key={l.id} className={`vp-lead ${sel?.id === l.id ? 'on' : ''}`} onClick={() => pickLead(l)}>
                  <div className="vp-leadname">{l.listing_name || (l.kind === 'service' ? t.serviceRequest : t.productRequest)}</div>
                  <div className="vp-leadmeta">{l.company || l.contact_name || t.buyerFallback} · {fmtDate(l.created_at)}</div>
                  <div className="vp-leadrow">
                    <span className="vp-ref">{l.public_ref}</span>
                    {l.quote_amount ? <span className="vp-quoted">{t.quoted} {money(l.quote_amount)}</span> : <span className="vp-await">{t.awaitingQuote}</span>}
                  </div>
                </button>
              ))}
            </aside>

            {/* Builder */}
            <main className="vp-main">
              {!sel ? (
                <div className="vp-empty">{t.pickLeadHint}</div>
              ) : (
                <>
                  <div className="vp-selhead">
                    <div>
                      <div className="vp-selname">{sel.listing_name || t.request} <span className="vp-ref">{sel.public_ref}</span></div>
                      {sel.message && <div className="vp-buyermsg">“{sel.message.slice(0, 240)}”</div>}
                    </div>
                    {latestSubmitted && <span className="vp-rev">{t.revSent} {latestSubmitted.revision} {t.sent} {latestSubmitted.submitted_at ? fmtDate(latestSubmitted.submitted_at) : ''}</span>}
                  </div>

                  {/* Line items */}
                  <div className="vp-sec">{t.lineItems}</div>
                  <div className="vp-items">
                    {items.map((it, i) => (
                      <div key={i} className="vp-item">
                        <input className="vp-desc" placeholder={t.descriptionPh} value={it.description}
                          onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                        <select value={it.kind} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, kind: e.target.value } : x))}>
                          {ITEM_KINDS.map((k) => <option key={k.v} value={k.v}>{lang === 'es' ? k.es : k.en}</option>)}
                        </select>
                        <input className="vp-num" type="number" min={1} value={it.qty || ''}
                          onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, qty: Number(e.target.value) } : x))} placeholder={t.qtyPh} />
                        <input className="vp-num wide" type="number" min={0} value={it.unit_price || ''}
                          onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, unit_price: Number(e.target.value) } : x))} placeholder={t.unitPh} />
                        <span className="vp-line">{money((it.qty || 0) * (it.unit_price || 0))}</span>
                        {items.length > 1 && <button className="vp-x" onClick={() => setItems(items.filter((_, j) => j !== i))}>×</button>}
                      </div>
                    ))}
                  </div>
                  <button className="vp-add" onClick={() => setItems([...items, { ...EMPTY_ITEM, kind: 'labor' }])}>{t.addLine}</button>

                  {/* Totals */}
                  <div className="vp-totals">
                    <div><span>{t.subtotal}</span><b>{money(subtotal)}</b></div>
                    <div><span>{t.tax}</span><input type="number" min={0} value={tax || ''} onChange={(e) => setTax(Number(e.target.value))} placeholder="0" /></div>
                    <div><span>{t.discount}</span><input type="number" min={0} value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value))} placeholder="0" /></div>
                    <div className="vp-total"><span>{t.total}</span><b>{money(total)}</b></div>
                    {commission && (
                      <div className="vp-fee">{t.feeIfWonPrefix} <b>{money(commission.amount)}</b> ({(commission.rate * 100).toFixed(1)}%) {t.feeIfWonSuffix}</div>
                    )}
                  </div>

                  {/* Terms — smart defaults, all editable */}
                  <div className="vp-sec">{t.terms}</div>
                  <div className="vp-grid">
                    <label>{t.leadTime}<input value={terms.lead_time} onChange={(e) => setTerms({ ...terms, lead_time: e.target.value })} placeholder={t.leadTimePh} /></label>
                    <label>{t.warranty}<input value={terms.warranty} onChange={(e) => setTerms({ ...terms, warranty: e.target.value })} placeholder={t.warrantyPh} /></label>
                    <label>{t.paymentTerms}<input value={terms.payment_terms} onChange={(e) => setTerms({ ...terms, payment_terms: e.target.value })} /></label>
                    <label>{t.quoteValidUntil}<input type="date" value={terms.valid_until} onChange={(e) => setTerms({ ...terms, valid_until: e.target.value })} /></label>
                  </div>
                  <div className="vp-grid">
                    <label>{t.assumptions}<textarea rows={2} value={terms.assumptions} onChange={(e) => setTerms({ ...terms, assumptions: e.target.value })} placeholder={t.assumptionsPh} /></label>
                    <label>{t.exclusions}<textarea rows={2} value={terms.exclusions} onChange={(e) => setTerms({ ...terms, exclusions: e.target.value })} placeholder={t.exclusionsPh} /></label>
                  </div>
                  <label className="vp-noteslab">{t.messageToBuyer}<textarea rows={2} value={terms.notes} onChange={(e) => setTerms({ ...terms, notes: e.target.value })} placeholder={t.messageToBuyerPh} /></label>

                  <div className="vp-actions">
                    <button className="vp-save" disabled={busy} onClick={() => send('save')}>{t.saveDraft}</button>
                    <button className="vp-send" disabled={busy || total <= 0} onClick={() => send('submit')}>
                      {latestSubmitted ? t.sendRevisedProposal : t.sendProposal}
                    </button>
                  </div>
                  {msg && <div className={`vp-msg ${msg.startsWith('✓') ? 'ok' : 'err'}`}>{msg}</div>}

                  {/* Revision history */}
                  {history.length > 0 && (
                    <>
                      <div className="vp-sec">{t.history}</div>
                      <div className="vp-hist">
                        {history.map((p) => (
                          <div key={p.id} className="vp-histrow">
                            <span className={`vp-hstat ${p.status}`}>{STATUS_LABEL[p.status] || p.status}</span>
                            <span>{t.revSent} {p.revision}</span>
                            <span>{money(p.total || 0)}</span>
                            <span className="vp-hdate">{p.submitted_at ? fmtDate(p.submitted_at) : t.draftStatus}</span>
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
.vp{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-vquotes),'IBM Plex Sans',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.vp *{box-sizing:border-box;}
.vp a:focus-visible,.vp button:focus-visible,.vp input:focus-visible,.vp select:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.vp-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid var(--spec-border,#E2DFEC);position:sticky;top:0;background:rgba(248,247,251,.92);backdrop-filter:blur(20px);z-index:30;}
.vp-brand{display:flex;align-items:baseline;gap:10px;color:var(--spec-ink,#141320);text-decoration:none;}
.vp-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:17px;font-weight:700;}.vp-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}.vp-brand span{color:var(--spec-text-2nd,#615F72);font-size:13px;}
.vp-navr{display:flex;gap:8px;}
.vp-pill{font-size:13px;font-weight:500;color:var(--spec-ink,#141320);background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:99px;padding:8px 14px;text-decoration:none;}
.vp-wrap{max-width:1120px;margin:0 auto;padding:30px 20px 100px;}
.vp-wrap h1{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:clamp(22px,3.5vw,30px);font-weight:700;letter-spacing:-.01em;margin:0;}
.vp-sub{color:var(--spec-text-2nd,#615F72);font-size:14px;margin:8px 0 0;max-width:560px;line-height:1.6;}
.vp-empty{color:var(--spec-text-2nd,#615F72);font-size:14px;padding:44px 0;text-align:center;}
.vp-empty a{color:var(--spec-violet-deep,#4A3DB0);}
.vp-layout{display:grid;grid-template-columns:300px 1fr;gap:20px;margin-top:24px;align-items:start;}
@media(max-width:860px){.vp-layout{grid-template-columns:1fr;}}
.vp-leads{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:15px;padding:12px;display:flex;flex-direction:column;gap:8px;position:sticky;top:76px;max-height:80vh;overflow-y:auto;}
.vp-leadhead{font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--spec-text-2nd,#615F72);padding:4px 6px 6px;}
.vp-lead{font-family:inherit;text-align:left;background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:11px;padding:11px 12px;cursor:pointer;color:var(--spec-ink,#141320);transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.vp-lead:hover{border-color:var(--spec-violet,#6C5CE0);}
.vp-lead.on{border-color:var(--spec-violet,#6C5CE0);background:rgba(108,92,224,.06);}
.vp-leadname{font-size:13px;font-weight:700;line-height:1.3;}
.vp-leadmeta{font-size:11px;color:var(--spec-text-2nd,#615F72);margin-top:3px;}
.vp-leadrow{display:flex;justify-content:space-between;align-items:center;margin-top:7px;gap:6px;}
.vp-ref{font-size:10.5px;color:#706D88;font-variant-numeric:tabular-nums;}
.vp-quoted{font-size:10.5px;font-weight:700;color:var(--spec-success,#2F9E6A);}
.vp-await{font-size:10.5px;font-weight:700;color:var(--spec-warning,#C68A28);}
.vp-main{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:15px;padding:20px;}
.vp-selhead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid var(--spec-border,#E2DFEC);padding-bottom:14px;}
.vp-selname{font-size:16px;font-weight:800;}
.vp-selname .vp-ref{margin-left:8px;font-size:11.5px;}
.vp-buyermsg{font-size:12.5px;color:var(--spec-text-2nd,#615F72);margin-top:6px;line-height:1.5;font-style:italic;}
.vp-rev{font-size:11px;font-weight:700;color:var(--spec-violet-deep,#4A3DB0);background:rgba(108,92,224,.1);padding:5px 10px;border-radius:99px;white-space:nowrap;}
.vp-sec{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--spec-text-2nd,#615F72);margin:20px 0 10px;}
.vp-items{display:flex;flex-direction:column;gap:8px;}
.vp-item{display:grid;grid-template-columns:1fr 130px 60px 90px 80px 24px;gap:7px;align-items:center;}
@media(max-width:720px){.vp-item{grid-template-columns:1fr 1fr;}.vp-item .vp-desc{grid-column:1/-1;}}
.vp-item input,.vp-item select,.vp-totals input,.vp-grid input,.vp-grid textarea,.vp-noteslab textarea{font-family:inherit;font-size:13px;padding:9px 10px;border-radius:9px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;width:100%;}
.vp-item input:focus,.vp-grid input:focus,.vp-grid textarea:focus,.vp-noteslab textarea:focus{border-color:var(--spec-violet,#6C5CE0);box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.vp-item select{cursor:pointer;}
.vp-line{font-size:12.5px;font-weight:700;text-align:right;font-variant-numeric:tabular-nums;}
.vp-x{background:none;border:none;color:#706D88;font-size:18px;cursor:pointer;padding:0;transition:color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.vp-x:hover{color:var(--spec-error,#CE4B43);}
.vp-add{font-family:inherit;font-size:12.5px;font-weight:700;color:var(--spec-violet-deep,#4A3DB0);background:none;border:1px dashed rgba(108,92,224,.4);border-radius:9px;padding:9px;margin-top:9px;cursor:pointer;width:100%;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.vp-add:hover{background:rgba(108,92,224,.05);}
.vp-totals{margin-top:16px;background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:12px;padding:13px 15px;display:flex;flex-direction:column;gap:9px;}
.vp-totals>div{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--spec-text-2nd,#615F72);gap:12px;}
.vp-totals input{max-width:110px;text-align:right;}
.vp-totals b{font-variant-numeric:tabular-nums;}
.vp-total{border-top:1px solid var(--spec-border,#E2DFEC);padding-top:10px;font-size:15px !important;}
.vp-total b{font-size:18px;color:var(--spec-ink,#141320);}
.vp-fee{font-size:12px;color:var(--spec-violet-deep,#4A3DB0);background:rgba(108,92,224,.06);border-radius:8px;padding:9px 11px;line-height:1.5;}
.vp-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:11px;}
@media(max-width:640px){.vp-grid{grid-template-columns:1fr;}}
.vp-grid label,.vp-noteslab{display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--spec-text-2nd,#615F72);}
.vp-noteslab{margin-top:2px;}
.vp-actions{display:flex;gap:10px;margin-top:18px;}
.vp-save{font-family:inherit;font-size:13.5px;font-weight:700;padding:12px 18px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);cursor:pointer;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.vp-save:hover{border-color:var(--spec-violet,#6C5CE0);}
.vp-send{flex:1;font-family:inherit;font-size:14px;font-weight:700;padding:12px 18px;border-radius:10px;border:none;background:var(--spec-violet,#6C5CE0);color:#fff;cursor:pointer;box-shadow:0 10px 26px -12px rgba(108,92,224,.5);transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.vp-send:hover{background:var(--spec-violet-deep,#4A3DB0);}
.vp-save:disabled,.vp-send:disabled{opacity:.45;cursor:default;}
.vp-msg{margin-top:12px;font-size:13px;padding:10px 13px;border-radius:10px;line-height:1.5;}
.vp-msg.ok{background:#E9F7F0;color:#1F7A54;}
.vp-msg.err{background:#FBECEA;color:var(--spec-error,#CE4B43);}
.vp-hist{display:flex;flex-direction:column;gap:6px;}
.vp-histrow{display:flex;align-items:center;gap:14px;font-size:12.5px;color:var(--spec-text-2nd,#615F72);background:var(--spec-surface,#EFEDF5);border-radius:9px;padding:9px 12px;font-variant-numeric:tabular-nums;}
.vp-hstat{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:3px 8px;border-radius:99px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-text-2nd,#615F72);}
.vp-hstat.submitted{background:#E9F7F0;border-color:transparent;color:#1F7A54;}
.vp-hstat.draft{background:#FBF3E7;border-color:transparent;color:var(--spec-warning,#C68A28);}
.vp-hstat.revised{background:rgba(108,92,224,.1);border-color:transparent;color:var(--spec-violet-deep,#4A3DB0);}
.vp-hdate{margin-left:auto;color:#8A87A0;}
`;
