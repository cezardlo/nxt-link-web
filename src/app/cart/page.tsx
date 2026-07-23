'use client';

// Quote cart — collect several listings and send them as ONE bundled quote
// request through the existing NXT//LINK RFQ pipeline (one request per vendor;
// each vendor quotes the whole bundle once). Anonymous carts live in
// localStorage and survive the magic-link auth round-trip; signed-in carts
// merge into the account (see src/components/cart/useCart.ts). Fully EN/ES.

import { useEffect, useMemo, useRef, useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import Link from 'next/link';
import { useCart, type CartItem } from '@/components/cart/useCart';
import LanguageToggle, { useLang, type Lang } from '@/components/LanguageToggle';

// Design System v1.0 reskin (Premium Polish Phase 2, 2026-07-23): visual/CSS
// only — every handler and state above is unchanged.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-cart',
  display: 'swap',
});

const T: Record<Lang, Record<string, string>> = {
  en: {
    navTag: 'Quote cart',
    title: 'Your quote cart',
    subtitle: 'Collect listings, then send them as one bundled quote request — vendors reply inside NXT//LINK.',
    back: '← Continue browsing',
    loading: 'Loading…',
    emptyTitle: 'Your cart is empty',
    emptyHint: 'Add listings from the marketplace and send one bundled quote request — free to send.',
    browse: 'Browse the marketplace',
    vendorFallback: 'Vendor',
    requestTo: 'Request to',
    item: 'item',
    items: 'items',
    multiVendor: 'Your items come from {n} vendors — each vendor receives one bundled request with only their own items.',
    qty: 'Qty',
    decQty: 'Decrease quantity',
    incQty: 'Increase quantity',
    notePh: 'Note — specs, size, timing… (optional)',
    remove: 'Remove',
    clear: 'Clear cart',
    yourDetails: 'Your details',
    company: 'Company *',
    yourName: 'Your name',
    email: 'Work email *',
    phone: 'Phone',
    messagePh: 'Message for the vendors — quantities, timeline, site details… (optional)',
    send: 'Send bundled request',
    sendMulti: 'Send bundled request — {n} vendors',
    sending: 'Sending…',
    safety: 'Free to send · no commitment until you accept a quote',
    disclosure: 'Managed through NXT//LINK. NXT//LINK may receive a commission from the vendor. You compare offers and communicate through the platform; your contact info is never shown publicly.',
    couldNotSend: 'Could not send — please try again',
    errCompanyRequired: 'Company is required',
    errEmailInvalid: 'A valid email is required',
    errNoValidItems: 'No valid items in the cart',
    errNoPublishedListings: 'No published listings in your cart — they may have been removed',
    errCreateFailed: 'Could not create the request — please try again',
    sentTitle: 'Request sent through NXT//LINK',
    sentBody: 'Vendors respond inside NXT//LINK — track everything in your dashboard.',
    reference: 'Reference',
    skipped: 'Some items were no longer available and were skipped.',
    dashboard: 'Go to my dashboard',
    product: 'Product',
    service: 'Service',
    terms: 'Terms',
    privacy: 'Privacy',
  },
  es: {
    navTag: 'Carrito de cotización',
    title: 'Tu carrito de cotización',
    subtitle: 'Reúne publicaciones y envíalas como una sola solicitud de cotización agrupada — los proveedores responden dentro de NXT//LINK.',
    back: '← Seguir explorando',
    loading: 'Cargando…',
    emptyTitle: 'Tu carrito está vacío',
    emptyHint: 'Añade publicaciones del marketplace y envía una sola solicitud agrupada — gratis enviar.',
    browse: 'Explorar el marketplace',
    vendorFallback: 'Proveedor',
    requestTo: 'Solicitud a',
    item: 'artículo',
    items: 'artículos',
    multiVendor: 'Tus artículos vienen de {n} proveedores — cada proveedor recibe una sola solicitud agrupada solo con sus artículos.',
    qty: 'Cant.',
    decQty: 'Reducir cantidad',
    incQty: 'Aumentar cantidad',
    notePh: 'Nota — especificaciones, tamaño, plazos… (opcional)',
    remove: 'Quitar',
    clear: 'Vaciar carrito',
    yourDetails: 'Tus datos',
    company: 'Empresa *',
    yourName: 'Tu nombre',
    email: 'Correo de trabajo *',
    phone: 'Teléfono',
    messagePh: 'Mensaje para los proveedores — cantidades, plazos, detalles del sitio… (opcional)',
    send: 'Enviar solicitud agrupada',
    sendMulti: 'Enviar solicitud agrupada — {n} proveedores',
    sending: 'Enviando…',
    safety: 'Gratis enviar · sin compromiso hasta que aceptes una cotización',
    disclosure: 'Gestionado a través de NXT//LINK. NXT//LINK puede recibir una comisión del proveedor. Comparas ofertas y te comunicas por la plataforma; tu información de contacto nunca se muestra públicamente.',
    couldNotSend: 'No se pudo enviar — inténtalo de nuevo',
    errCompanyRequired: 'La empresa es obligatoria',
    errEmailInvalid: 'Se requiere un correo válido',
    errNoValidItems: 'No hay artículos válidos en el carrito',
    errNoPublishedListings: 'No hay publicaciones activas en tu carrito — es posible que hayan sido eliminadas',
    errCreateFailed: 'No se pudo crear la solicitud — inténtalo de nuevo',
    sentTitle: 'Solicitud enviada a través de NXT//LINK',
    sentBody: 'Los proveedores responden dentro de NXT//LINK — sigue todo en tu panel.',
    reference: 'Referencia',
    skipped: 'Algunos artículos ya no estaban disponibles y se omitieron.',
    dashboard: 'Ir a mi panel',
    product: 'Producto',
    service: 'Servicio',
    terms: 'Términos',
    privacy: 'Privacidad',
  },
};

interface SentRequest { public_ref: string; vendor_name: string | null; item_count: number }

// Stable error codes from /api/marketplace/request's bundle branch, mapped to
// bilingual copy. Unknown/absent codes fall back to the server's English
// `message` (kept for API compat) or the generic couldNotSend string.
const ERROR_CODE_KEY: Record<string, string> = {
  company_required: 'errCompanyRequired',
  email_invalid: 'errEmailInvalid',
  no_valid_items: 'errNoValidItems',
  no_published_listings: 'errNoPublishedListings',
  create_failed: 'errCreateFailed',
};

export default function CartPage() {
  const { items, count, remove, setQty, setNote, clear } = useCart();
  const [lang, setLang] = useLang();
  const t = T[lang];
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Contact form (prefilled from the buyer profile when signed in).
  const [company, setCompany] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState(''); // honeypot
  const startedAtRef = useRef(Date.now());
  const [sending, setSending] = useState(false);
  const [formMsg, setFormMsg] = useState('');
  const [sent, setSent] = useState<SentRequest[] | null>(null);
  const [sentSkipped, setSentSkipped] = useState(false);

  useEffect(() => {
    fetch('/api/buyer/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        if (!me?.ok || !me.profile) return;
        setCompany((v) => v || me.profile.company_name || '');
        setContact((v) => v || me.profile.contact_name || '');
        setEmail((v) => v || me.profile.buyer_email || '');
        setPhone((v) => v || me.profile.phone || '');
      })
      .catch(() => {});
  }, []);

  // Group items by vendor for display; the server re-groups from DB truth.
  const groups = useMemo(() => {
    const m = new Map<string, { vendor_name: string | null; items: CartItem[] }>();
    for (const it of items) {
      const key = it.vendor_id || it.vendor_name || '·';
      const g = m.get(key) || { vendor_name: it.vendor_name, items: [] };
      g.items.push(it);
      if (!g.vendor_name && it.vendor_name) g.vendor_name = it.vendor_name;
      m.set(key, g);
    }
    return Array.from(m.values());
  }, [items]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!items.length || sending) return;
    setSending(true); setFormMsg('');
    try {
      const res = await fetch('/api/marketplace/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ listing_id: i.id, kind: i.kind, qty: i.qty, note: i.note || '' })),
          company, contact_name: contact, email, phone, message,
          website_url: websiteUrl, started_at: startedAtRef.current,
        }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.requests)) {
        setSent(data.requests as SentRequest[]);
        setSentSkipped(Array.isArray(data.skipped) && data.skipped.length > 0);
        clear();
      } else {
        const key = data.code ? ERROR_CODE_KEY[String(data.code)] : undefined;
        setFormMsg((key && t[key]) || data.message || t.couldNotSend);
      }
    } catch { setFormMsg(t.couldNotSend); }
    setSending(false);
  }

  const nItems = (n: number) => `${n} ${n === 1 ? t.item : t.items}`;

  return (
    <div className={`qc ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="qc-nav">
        <Link className="qc-brand" href="/marketplace"><b>NXT<i>{'//'}</i>LINK</b><span>{t.navTag}</span></Link>
        <div className="qc-navr">
          <Link className="qc-back" href="/marketplace">{t.back}</Link>
          <LanguageToggle lang={lang} onChange={setLang} variant="light" />
        </div>
      </nav>

      <main className="qc-wrap">
        {sent ? (
          <div className="qc-sent">
            <b>{t.sentTitle}</b>
            <ul>
              {sent.map((r) => (
                <li key={r.public_ref}>
                  <span className="qc-sentvendor">{r.vendor_name || t.vendorFallback}</span>
                  <span>{t.reference}: <b>{r.public_ref}</b> · {nItems(r.item_count)}</span>
                </li>
              ))}
            </ul>
            {sentSkipped && <p className="qc-skipnote">{t.skipped}</p>}
            <p>{t.sentBody}</p>
            <div className="qc-sentactions">
              <Link className="qc-primary" href="/buyer">{t.dashboard}</Link>
              <Link className="qc-secondary" href="/marketplace">{t.browse}</Link>
            </div>
          </div>
        ) : (
          <>
            <h1>{t.title} {mounted && count > 0 && <span className="qc-count">{nItems(count)}</span>}</h1>
            <p className="qc-sub">{t.subtitle}</p>

            {!mounted ? (
              <div className="qc-empty">{t.loading}</div>
            ) : items.length === 0 ? (
              <div className="qc-empty big">
                <b>{t.emptyTitle}</b>
                <p>{t.emptyHint}</p>
                <Link className="qc-primary" href="/marketplace">{t.browse}</Link>
              </div>
            ) : (
              <>
                {groups.length > 1 && (
                  <p className="qc-multinote">{t.multiVendor.replace('{n}', String(groups.length))}</p>
                )}

                {groups.map((g, gi) => (
                  <section className="qc-group" key={gi}>
                    <h2>{t.requestTo} <b>{g.vendor_name || t.vendorFallback}</b> <small>{nItems(g.items.length)}</small></h2>
                    {g.items.map((it) => (
                      <div className="qc-item" key={it.id}>
                        <div className="qc-itemtop">
                          <span className={'qc-kind ' + it.kind}>{it.kind === 'service' ? t.service : t.product}</span>
                          <Link className="qc-name" href={`/marketplace/${it.kind}/${it.id}`}>{it.name || t.product}</Link>
                          <button type="button" className="qc-remove" onClick={() => remove(it.id)}>{t.remove}</button>
                        </div>
                        <div className="qc-itemrow">
                          <div className="qc-qty" role="group" aria-label={t.qty}>
                            <span className="qc-qtylabel">{t.qty}</span>
                            <button type="button" aria-label={t.decQty} onClick={() => setQty(it.id, it.qty - 1)} disabled={it.qty <= 1}>−</button>
                            <span className="qc-qtyval" aria-live="polite">{it.qty}</span>
                            <button type="button" aria-label={t.incQty} onClick={() => setQty(it.id, it.qty + 1)}>+</button>
                          </div>
                          <input
                            className="qc-note"
                            value={it.note || ''}
                            placeholder={t.notePh}
                            aria-label={t.notePh}
                            maxLength={300}
                            onChange={(e) => setNote(it.id, e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </section>
                ))}

                <button type="button" className="qc-clear" onClick={clear}>{t.clear}</button>

                <form className="qc-form" onSubmit={submit}>
                  <h2>{t.yourDetails}</h2>
                  <input type="text" name="website_url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
                  <div className="qc-formgrid">
                    <label>{t.company}<input value={company} onChange={(e) => setCompany(e.target.value)} required /></label>
                    <label>{t.yourName}<input value={contact} onChange={(e) => setContact(e.target.value)} /></label>
                    <label>{t.email}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
                    <label>{t.phone}<input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
                  </div>
                  <textarea rows={4} value={message} placeholder={t.messagePh} aria-label={t.messagePh} onChange={(e) => setMessage(e.target.value)} />
                  {formMsg && <div className="qc-err" role="alert">{formMsg}</div>}
                  <button type="submit" className="qc-primary qc-submit" disabled={sending}>
                    {sending ? t.sending : groups.length > 1 ? t.sendMulti.replace('{n}', String(groups.length)) : t.send}
                  </button>
                  <p className="qc-safenote">{t.safety}</p>
                  <p className="qc-disclosure">{t.disclosure} <Link href="/terms">{t.terms}</Link> · <Link href="/privacy">{t.privacy}</Link></p>
                </form>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

const CSS = `
.qc{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-cart),'IBM Plex Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.qc *{box-sizing:border-box;}
.qc a:focus-visible,.qc button:focus-visible,.qc input:focus-visible,.qc textarea:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.qc-nav{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;row-gap:8px;gap:12px;padding:14px 26px;border-bottom:1px solid var(--spec-border,#E2DFEC);position:sticky;top:0;background:rgba(248,247,251,.92);backdrop-filter:blur(20px);z-index:30;}
.qc-brand{display:flex;align-items:baseline;gap:10px;color:var(--spec-ink,#141320);text-decoration:none;}
.qc-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:17px;font-weight:700;}.qc-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}
.qc-brand span{color:var(--spec-text-2nd,#615F72);font-size:13px;}
.qc-navr{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.qc-back{color:var(--spec-violet-deep,#4A3DB0);font-size:13.5px;font-weight:600;text-decoration:none;white-space:nowrap;}
.qc-back:hover{color:var(--spec-violet,#6C5CE0);}
.qc-wrap{max-width:720px;margin:0 auto;padding:36px 20px 120px;}
.qc-wrap h1{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:28px;font-weight:700;letter-spacing:-.01em;}
.qc-count{font-size:12px;font-weight:700;color:var(--spec-violet-deep,#4A3DB0);background:rgba(108,92,224,.1);border-radius:99px;padding:4px 12px;vertical-align:6px;margin-left:8px;white-space:nowrap;}
.qc-sub{color:var(--spec-text-2nd,#615F72);font-size:14px;margin:6px 0 24px;line-height:1.6;}
.qc-empty{text-align:center;color:var(--spec-text-2nd,#615F72);padding:60px 0;}
.qc-empty.big{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:18px;padding:48px 24px;}
.qc-empty b{display:block;font-size:18px;color:var(--spec-ink,#141320);margin-bottom:8px;}
.qc-empty p{font-size:14px;line-height:1.6;max-width:420px;margin:0 auto 18px;}
.qc-multinote{font-size:13px;color:var(--spec-violet-deep,#4A3DB0);background:rgba(108,92,224,.06);border:1px solid rgba(108,92,224,.22);border-radius:10px;padding:10px 14px;line-height:1.55;margin:0 0 18px;}
.qc-group{margin-bottom:22px;}
.qc-group h2{font-size:15px;font-weight:600;color:var(--spec-ink,#141320);margin:0 0 10px;}
.qc-group h2 b{color:var(--spec-ink,#141320);}
.qc-group h2 small{color:var(--spec-text-2nd,#615F72);font-weight:400;font-size:12.5px;margin-left:8px;}
.qc-item{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:14px;padding:14px 16px;margin-bottom:10px;}
.qc-itemtop{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.qc-kind{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:99px;flex-shrink:0;}
.qc-kind.product{background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);}
.qc-kind.service{background:#E9F7F0;color:#1F7A54;}
.qc-name{flex:1;min-width:160px;font-size:14.5px;font-weight:700;color:var(--spec-ink,#141320);text-decoration:none;line-height:1.35;}
.qc-name:hover{color:var(--spec-violet-deep,#4A3DB0);}
.qc-remove{font-family:inherit;font-size:12px;font-weight:600;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-text-2nd,#615F72);border-radius:8px;padding:6px 11px;cursor:pointer;}
.qc-remove:hover{border-color:rgba(206,75,67,.4);color:var(--spec-error,#CE4B43);}
.qc-itemrow{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:11px;}
.qc-qty{display:inline-flex;align-items:center;gap:8px;}
.qc-qtylabel{font-size:12px;color:var(--spec-text-2nd,#615F72);}
.qc-qty button{width:32px;height:32px;font-size:17px;font-family:inherit;font-weight:700;border-radius:9px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);cursor:pointer;line-height:1;}
.qc-qty button:hover:not(:disabled){border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.qc-qty button:disabled{opacity:.35;cursor:not-allowed;}
.qc-qtyval{min-width:26px;text-align:center;font-size:14.5px;font-weight:700;}
.qc-note{flex:1;min-width:200px;font-family:inherit;font-size:13.5px;padding:9px 12px;border-radius:9px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;}
.qc-note:focus{border-color:var(--spec-violet,#6C5CE0);}
.qc-clear{font-family:inherit;font-size:12.5px;font-weight:600;background:none;border:none;color:#8A87A0;cursor:pointer;text-decoration:underline;padding:0;margin:2px 0 8px;}
.qc-clear:hover{color:var(--spec-ink,#141320);}
.qc-form{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:16px;padding:20px;margin-top:18px;display:flex;flex-direction:column;gap:12px;position:relative;}
.qc-form h2{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:16px;font-weight:700;margin:0;}
.qc-formgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
@media(max-width:600px){.qc-formgrid{grid-template-columns:1fr;}}
.qc-form label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--spec-text-2nd,#615F72);font-weight:600;}
.qc-form input,.qc-form textarea{font-family:inherit;font-size:14px;padding:11px 13px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;resize:vertical;}
.qc-form input:focus,.qc-form textarea:focus{border-color:var(--spec-violet,#6C5CE0);box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.qc-err{color:var(--spec-error,#CE4B43);font-size:13px;}
.qc-primary{display:inline-block;font-family:inherit;font-size:14.5px;font-weight:700;padding:13px 22px;border-radius:10px;border:none;background:var(--spec-violet,#6C5CE0);color:#fff;cursor:pointer;text-decoration:none;text-align:center;}
.qc-primary:hover{background:var(--spec-violet-deep,#4A3DB0);}
.qc-primary:disabled{opacity:.6;cursor:not-allowed;}
.qc-secondary{display:inline-block;font-family:inherit;font-size:13.5px;font-weight:600;padding:12px 18px;border-radius:10px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);text-decoration:none;text-align:center;}
.qc-secondary:hover{border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.qc-submit{width:100%;}
.qc-safenote{margin:0;font-size:12.5px;font-weight:600;color:var(--spec-success,#2F9E6A);text-align:center;}
.qc-disclosure{margin:0;font-size:11.5px;line-height:1.5;color:#8A87A0;}
.qc-disclosure a{color:var(--spec-text-2nd,#615F72);}
.qc-sent{background:#F3FAF6;border:1px solid rgba(47,158,106,.3);border-radius:18px;padding:26px 24px;}
.qc-sent>b{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:19px;color:#1F7A54;}
.qc-sent ul{list-style:none;margin:16px 0;padding:0;display:flex;flex-direction:column;gap:10px;}
.qc-sent li{display:flex;flex-direction:column;gap:3px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:12px;padding:12px 15px;font-size:13.5px;color:var(--spec-ink,#141320);}
.qc-sent li b{color:var(--spec-ink,#141320);}
.qc-sentvendor{font-weight:700;color:var(--spec-ink,#141320);font-size:14.5px;}
.qc-skipnote{color:var(--spec-warning,#C68A28);font-size:13px;line-height:1.5;}
.qc-sent p{color:var(--spec-ink,#141320);font-size:14px;line-height:1.6;}
.qc-sentactions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;}
`;
