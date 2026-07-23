'use client';

// Public listing detail page — Carvana-style tabs: Overview, Specs/Process,
// Pilot, Implementation, Pricing, Warranty & Support, Documents, Case Studies,
// plus related listings and an inline Request Quote / Request Service form.
// Fully EN/ES via the shared LanguageToggle/useLang pattern (see /cart).

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { IBM_Plex_Sans } from 'next/font/google';
import AddToCartButton from '@/components/cart/AddToCartButton';
import { useLang, type Lang } from '@/components/LanguageToggle';
import PublicHeader from '@/components/PublicHeader';
import { pilotEntriesOf, customFieldsOf } from '@/lib/marketplace/types';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-detail',
  display: 'swap',
});

interface Detail {
  kind: 'product' | 'service';
  listing: Record<string, unknown>;
  images: Array<{ path: string; url: string | null }>;
  documents: Array<{ id: string; file_name: string; title: string | null; ai_summary: string | null; url: string | null }>;
  case_studies: Array<{ id: string; title: string; challenge: string | null; solution: string | null; results: string[] | null }>;
  vendor: { company_name: string; city: string | null; website: string | null; description: string | null; rating?: number | null; review_count?: number } | null;
  reviews?: Array<{ rating: number; title: string | null; body: string | null; created_at: string }>;
  related: { same_vendor: Array<{ id: string; kind: string; name: string; category: string }>; same_category: Array<{ id: string; kind: string; name: string; category: string }> };
}
const stars = (n: number) => '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));

const s = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

// Every deal-starting action runs THROUGH NXT//LINK (never "email the vendor"
// or "visit their site"). One tracked request record per action. Keys only —
// labels/headings/cta/placeholder come from the T table below (bilingual).
const REQUEST_KEYS = ['quote', 'contact_sales', 'demo', 'pilot', 'question'] as const;
type RequestKey = (typeof REQUEST_KEYS)[number];

// Stable error codes from /api/marketplace/request's single-listing branch,
// mapped to bilingual copy (same pattern as /cart's bundle-branch mapping).
const ERROR_CODE_KEY: Record<string, string> = {
  too_fast: 'errTooFast',
  listing_id_required: 'errListingIdRequired',
  company_required: 'errCompanyRequired',
  email_invalid: 'errEmailInvalid',
  listing_not_found: 'errListingNotFound',
  create_failed: 'errCreateFailed',
};

const ACTIONS: Record<Lang, Record<RequestKey, { label: string; heading: string; cta: string; placeholder: string }>> = {
  en: {
    quote: { label: 'Request Quote', heading: 'Request a quote', cta: 'Send request', placeholder: 'What do you need? Quantity, timeline, site details…' },
    contact_sales: { label: 'Contact Sales', heading: 'Contact sales', cta: 'Send message', placeholder: 'What would you like to discuss with the sales team?' },
    demo: { label: 'Request Demo', heading: 'Request a demo', cta: 'Request demo', placeholder: 'What would you like the demo to show? Any preferred dates?' },
    pilot: { label: 'Request Pilot', heading: 'Request a pilot', cta: 'Request pilot', placeholder: 'What outcome should a pilot prove? Site, timeline, success measure?' },
    question: { label: 'Ask a Question', heading: 'Ask a question', cta: 'Send question', placeholder: 'What would you like to ask about this listing?' },
  },
  es: {
    quote: { label: 'Solicitar cotización', heading: 'Solicitar una cotización', cta: 'Enviar solicitud', placeholder: '¿Qué necesitas? Cantidad, plazos, detalles del sitio…' },
    contact_sales: { label: 'Contactar ventas', heading: 'Contactar a ventas', cta: 'Enviar mensaje', placeholder: '¿Qué te gustaría hablar con el equipo de ventas?' },
    demo: { label: 'Solicitar demo', heading: 'Solicitar una demo', cta: 'Solicitar demo', placeholder: '¿Qué te gustaría que mostrara la demo? ¿Fechas preferidas?' },
    pilot: { label: 'Solicitar piloto', heading: 'Solicitar un piloto', cta: 'Solicitar piloto', placeholder: '¿Qué resultado debe demostrar un piloto? Sitio, plazos, medida de éxito?' },
    question: { label: 'Hacer una pregunta', heading: 'Hacer una pregunta', cta: 'Enviar pregunta', placeholder: '¿Qué te gustaría preguntar sobre esta publicación?' },
  },
};

const T: Record<Lang, Record<string, string>> = {
  en: {
    navMarketplace: 'Marketplace',
    loading: 'Loading…',
    notFound: 'Listing not found.',
    backToMarketplace: 'Back to marketplace',
    linkCopied: 'Link copied ✓',
    share: 'Share',
    kindProduct: 'product',
    kindService: 'service',
    ratingReview: 'review',
    ratingReviews: 'reviews',
    pilotAvailable: 'Pilot available',
    warranty: 'Warranty',
    leadTime: 'Lead time',
    response: 'Response',
    emergency: '24/7 emergency',
    tabOverview: 'Overview',
    tabSpecs: 'Specs',
    tabProcess: 'Process',
    tabPilot: 'Pilot / Demo',
    tabImplementation: 'Implementation',
    tabPricing: 'Pricing',
    tabWarranty: 'Warranty & Support',
    tabDocuments: 'Documents',
    tabCases: 'Case Studies',
    tabReviews: 'Reviews',
    noDescription: 'No description provided yet.',
    rowBestFor: 'Best for',
    rowIndustries: 'Industries',
    rowUseCases: 'Use cases',
    rowServiceAreas: 'Service areas',
    rowCertifications: 'Certifications',
    rowCompanySizes: 'Company sizes',
    rowRoiDrivers: 'ROI drivers',
    itemPilot: 'Pilot',
    itemPilotN: 'Pilot {n}',
    itemAvailable: 'Available',
    itemDuration: 'Duration',
    itemCost: 'Cost',
    itemScope: 'Scope',
    itemSuccessCriteria: 'Success criteria',
    itemRequirements: 'Requirements',
    itemTypicalTimeline: 'Typical timeline',
    itemTraining: 'Training',
    itemIntegrations: 'Integrations',
    itemModel: 'Model',
    itemRange: 'Range',
    itemOptions: 'Options',
    itemNotes: 'Notes',
    pricingHint: 'Exact pricing depends on your situation — request a quote below.',
    itemWarranty: 'Warranty',
    itemSupport: 'Support',
    itemSla: 'SLA',
    itemMaintenance: 'Maintenance',
    caseChallenge: 'Challenge:',
    caseSolution: 'Solution:',
    caseResults: 'Results:',
    reviewsHint: 'Reviews come only from buyers who accepted a quote through NXT//LINK — verified engagements.',
    relatedListings: 'Related listings',
    through: 'Through NXT',
    requestSentPrefix: 'Request sent through NXT//LINK. Reference:',
    respondsInside: 'responds inside NXT//LINK — track it in',
    theVendor: 'The vendor',
    yourDashboard: 'your dashboard',
    fCompany: 'Company *',
    fName: 'Your name',
    fEmail: 'Work email *',
    fPhone: 'Phone',
    sending: 'Sending…',
    safety: 'Free to send · no commitment until you accept a quote',
    requestTypeAria: 'Request type',
    disclosure: 'Managed through NXT//LINK. NXT//LINK may receive a commission from the vendor. You compare offers and communicate through the platform; your contact info is never shown publicly.',
    terms: 'Terms',
    privacy: 'Privacy',
    storefront: 'View storefront →',
    reportThanks: 'Thanks — our team will review this listing.',
    reportLink: 'Something wrong with this listing? Report it',
    reportTitle: 'Report this listing',
    reasonWrongInfo: 'Information is wrong',
    reasonMisleading: 'Misleading claims',
    reasonSpam: 'Spam or fake',
    reasonNotAvailable: 'No longer available',
    reasonOther: 'Other',
    reportDetailsPh: 'What is wrong? (optional)',
    reportEmailPh: 'Your email (optional)',
    sendReport: 'Send report',
    cancel: 'Cancel',
    mobileCtaSuffix: '— through NXT//LINK',
    errTooFast: 'Form submitted too quickly — please try again',
    errListingIdRequired: 'listing_id is required',
    errCompanyRequired: 'Company is required',
    errEmailInvalid: 'A valid email is required',
    errListingNotFound: 'Listing not found',
    errCreateFailed: 'Could not send — please try again',
    couldNotSend: 'Could not send',
  },
  es: {
    navMarketplace: 'Marketplace',
    loading: 'Cargando…',
    notFound: 'Publicación no encontrada.',
    backToMarketplace: 'Volver al marketplace',
    linkCopied: 'Enlace copiado ✓',
    share: 'Compartir',
    kindProduct: 'producto',
    kindService: 'servicio',
    ratingReview: 'reseña',
    ratingReviews: 'reseñas',
    pilotAvailable: 'Piloto disponible',
    warranty: 'Garantía',
    leadTime: 'Tiempo de entrega',
    response: 'Respuesta',
    emergency: 'Emergencia 24/7',
    tabOverview: 'Resumen',
    tabSpecs: 'Especificaciones',
    tabProcess: 'Proceso',
    tabPilot: 'Piloto / Demo',
    tabImplementation: 'Implementación',
    tabPricing: 'Precios',
    tabWarranty: 'Garantía y soporte',
    tabDocuments: 'Documentos',
    tabCases: 'Casos de éxito',
    tabReviews: 'Reseñas',
    noDescription: 'Aún no se ha agregado una descripción.',
    rowBestFor: 'Ideal para',
    rowIndustries: 'Industrias',
    rowUseCases: 'Casos de uso',
    rowServiceAreas: 'Áreas de servicio',
    rowCertifications: 'Certificaciones',
    rowCompanySizes: 'Tamaños de empresa',
    rowRoiDrivers: 'Factores de ROI',
    itemPilot: 'Piloto',
    itemPilotN: 'Piloto {n}',
    itemAvailable: 'Disponible',
    itemDuration: 'Duración',
    itemCost: 'Costo',
    itemScope: 'Alcance',
    itemSuccessCriteria: 'Criterios de éxito',
    itemRequirements: 'Requisitos',
    itemTypicalTimeline: 'Plazo típico',
    itemTraining: 'Capacitación',
    itemIntegrations: 'Integraciones',
    itemModel: 'Modelo',
    itemRange: 'Rango',
    itemOptions: 'Opciones',
    itemNotes: 'Notas',
    pricingHint: 'El precio exacto depende de tu situación — solicita una cotización abajo.',
    itemWarranty: 'Garantía',
    itemSupport: 'Soporte',
    itemSla: 'SLA',
    itemMaintenance: 'Mantenimiento',
    caseChallenge: 'Reto:',
    caseSolution: 'Solución:',
    caseResults: 'Resultados:',
    reviewsHint: 'Las reseñas provienen solo de compradores que aceptaron una cotización a través de NXT//LINK — participaciones verificadas.',
    relatedListings: 'Publicaciones relacionadas',
    through: 'A través de NXT',
    requestSentPrefix: 'Solicitud enviada a través de NXT//LINK. Referencia:',
    respondsInside: 'responde dentro de NXT//LINK — síguelo en',
    theVendor: 'El proveedor',
    yourDashboard: 'tu panel',
    fCompany: 'Empresa *',
    fName: 'Tu nombre',
    fEmail: 'Correo de trabajo *',
    fPhone: 'Teléfono',
    sending: 'Enviando…',
    safety: 'Gratis enviar · sin compromiso hasta que aceptes una cotización',
    requestTypeAria: 'Tipo de solicitud',
    disclosure: 'Gestionado a través de NXT//LINK. NXT//LINK puede recibir una comisión del proveedor. Comparas ofertas y te comunicas por la plataforma; tu información de contacto nunca se muestra públicamente.',
    terms: 'Términos',
    privacy: 'Privacidad',
    storefront: 'Ver perfil del proveedor →',
    reportThanks: 'Gracias — nuestro equipo revisará esta publicación.',
    reportLink: '¿Algo incorrecto en esta publicación? Repórtalo',
    reportTitle: 'Reportar esta publicación',
    reasonWrongInfo: 'La información es incorrecta',
    reasonMisleading: 'Afirmaciones engañosas',
    reasonSpam: 'Spam o falso',
    reasonNotAvailable: 'Ya no está disponible',
    reasonOther: 'Otro',
    reportDetailsPh: '¿Qué está mal? (opcional)',
    reportEmailPh: 'Tu correo (opcional)',
    sendReport: 'Enviar reporte',
    cancel: 'Cancelar',
    mobileCtaSuffix: '— a través de NXT//LINK',
    errTooFast: 'Formulario enviado demasiado rápido — inténtalo de nuevo',
    errListingIdRequired: 'Se requiere listing_id',
    errCompanyRequired: 'La empresa es obligatoria',
    errEmailInvalid: 'Se requiere un correo válido',
    errListingNotFound: 'Publicación no encontrada',
    errCreateFailed: 'No se pudo enviar — inténtalo de nuevo',
    couldNotSend: 'No se pudo enviar',
  },
};

export default function ListingDetailPage() {
  const params = useParams<{ kind: string; id: string }>();
  const kind = params.kind === 'service' ? 'service' : 'product';
  const [lang, setLang] = useLang();
  const t = T[lang];
  const actionsT = ACTIONS[lang];
  const [d, setD] = useState<Detail | null>(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState('overview');
  const [imgIdx, setImgIdx] = useState(0);

  // Quote form
  const [company, setCompany] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [requestType, setRequestType] = useState<RequestKey>('quote');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const startedAtRef = useRef(Date.now());
  const [sending, setSending] = useState(false);
  const [sentRef, setSentRef] = useState('');
  const [formMsg, setFormMsg] = useState('');

  // Copy-link share
  const [copied, setCopied] = useState(false);
  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  }

  // Report a problem
  const [repOpen, setRepOpen] = useState(false);
  const [repReason, setRepReason] = useState('wrong_info');
  const [repDetails, setRepDetails] = useState('');
  const [repEmail, setRepEmail] = useState('');
  const [repDone, setRepDone] = useState(false);

  useEffect(() => {
    fetch(`/api/marketplace/listings/${params.id}?kind=${kind}`)
      .then((r) => r.json())
      .then((data) => { if (data.ok) setD(data); else setMissing(true); })
      .catch(() => setMissing(true));
    // Signed-in buyers: prefill the request form from their profile.
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
  }, [params.id, kind]);

  async function submitQuote(e: React.FormEvent) {
    e.preventDefault();
    setSending(true); setFormMsg('');
    try {
      const res = await fetch('/api/marketplace/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, request_type: requestType, listing_id: params.id, company, contact_name: contact, email, phone, message, website_url: websiteUrl, started_at: startedAtRef.current }),
      });
      const data = await res.json();
      if (data.ok) setSentRef(data.public_ref || 'received');
      else {
        const key = data.code ? ERROR_CODE_KEY[String(data.code)] : undefined;
        setFormMsg((key && t[key]) || data.message || t.couldNotSend);
      }
    } catch { setFormMsg(t.couldNotSend); }
    setSending(false);
  }

  async function submitReport() {
    try {
      await fetch('/api/marketplace/report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, listing_id: params.id, reason: repReason, details: repDetails, email: repEmail }),
      });
    } catch { /* best effort */ }
    setRepDone(true);
  }

  if (missing) return <div className="dt"><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="dt-empty">{t.notFound} <Link href="/marketplace">{t.backToMarketplace}</Link></div></div>;
  if (!d) return <div className="dt"><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="dt-empty">{t.loading}</div></div>;

  const L = d.listing;
  const pilot = obj(L.pilot); const impl = obj(L.implementation); const ws = obj(L.warranty_support);
  const pricing = obj(L.pricing); const fit = obj(L.fit); const roi = obj(L.roi);
  const specs = obj(L.specs);
  const kindLabel = (k: string) => (k === 'service' ? t.kindService : t.kindProduct);

  const TABS: Array<[string, string, boolean]> = [
    ['overview', t.tabOverview, true],
    [kind === 'product' ? 'specs' : 'process', kind === 'product' ? t.tabSpecs : t.tabProcess, kind === 'product' ? Object.keys(specs).length > 0 : arr(L.process).length > 0],
    ['pilot', t.tabPilot, Object.keys(pilot).length > 0],
    ['implementation', t.tabImplementation, Object.keys(impl).length > 0],
    ['pricing', t.tabPricing, Object.keys(pricing).length > 0 || Boolean(s(L.pricing_model))],
    ['warranty', t.tabWarranty, Object.keys(ws).length > 0],
    ['documents', t.tabDocuments, d.documents.length > 0],
    ['cases', t.tabCases, d.case_studies.length > 0],
    ['reviews', t.tabReviews, (d.reviews?.length || 0) > 0],
  ];

  const related = [...d.related.same_vendor, ...d.related.same_category];
  const a = actionsT[requestType];

  return (
    <div className={`dt ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {/* ONE shared public header (Flow Blueprint 2026-07-22 §4, Slice 2) —
          replaces this page's old dark `dt-nav`. Breadcrumbs / share / kind
          badge are page-specific, so they move to a slim secondary row
          directly underneath instead of being dropped. */}
      <PublicHeader lang={lang} onLangChange={setLang} />
      <nav className="dt-subnav">
        <div className="dt-crumbs">
          <Link href="/marketplace">{t.navMarketplace}</Link>
          {s(L.category) && <><span>›</span><Link href={`/marketplace?tab=${kind}`}>{s(L.category)}</Link></>}
          <span>›</span><em>{s(L.name).slice(0, 40)}{s(L.name).length > 40 ? '…' : ''}</em>
        </div>
        <div className="dt-navr">
          <button className="dt-share" onClick={copyLink}>{copied ? t.linkCopied : t.share}</button>
          <span className={'dt-kind ' + kind}>{kindLabel(kind)}</span>
        </div>
      </nav>

      <div className="dt-wrap">
        <div className="dt-main">
          <div className="dt-gallery">
            {d.images.length > 0 ? (
              <>
                <div className="dt-img">{d.images[imgIdx]?.url && <img src={d.images[imgIdx].url!} alt={s(L.name)} />}</div>
                {d.images.length > 1 && (
                  <div className="dt-thumbs">
                    {d.images.map((im, i) => (
                      <button key={im.path} className={i === imgIdx ? 'on' : ''} onClick={() => setImgIdx(i)} aria-label={`Photo ${i + 1}`}>{im.url && <img src={im.url} alt="" loading="lazy" />}</button>
                    ))}
                  </div>
                )}
              </>
            ) : <div className="dt-img dt-noimg">{kindLabel(kind)}</div>}
          </div>

          <div className="dt-head">
            <h1>{s(L.name)}</h1>
            <div className="dt-sub">{s(L.category)}{d.vendor ? ` · ${d.vendor.company_name}` : ''}{d.vendor?.city ? ` · ${d.vendor.city}` : ''}</div>
            <div className="dt-badges">
              {typeof d.vendor?.rating === 'number' && (d.vendor.review_count || 0) > 0 && <span className="rating">★ {d.vendor.rating.toFixed(1)} ({d.vendor.review_count} {d.vendor.review_count === 1 ? t.ratingReview : t.ratingReviews})</span>}
              {Boolean(pilot.available) && <span>{t.pilotAvailable}</span>}
              {s(ws.warranty) && <span>{t.warranty}</span>}
              {s(L.lead_time) && <span>{t.leadTime}: {s(L.lead_time)}</span>}
              {s(L.response_time) && <span>{t.response}: {s(L.response_time)}</span>}
              {Boolean(L.emergency_available) && <span className="urgent">{t.emergency}</span>}
              {arr(L.availability).map((av) => <span key={av}>{av}</span>)}
            </div>
          </div>

          <div className="dt-tabs">
            {TABS.filter(([, , show]) => show).map(([key, label]) => (
              <button key={key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>{label}</button>
            ))}
          </div>

          <div className="dt-panel">
            {tab === 'overview' && (
              <>
                <p className="dt-overview">{s(L.overview) || t.noDescription}</p>
                {arr(L.best_for).length > 0 && <Row label={t.rowBestFor} items={arr(L.best_for)} />}
                {arr(L.industries).length > 0 && <Row label={t.rowIndustries} items={arr(L.industries)} />}
                {arr(L.use_cases).length > 0 && <Row label={t.rowUseCases} items={arr(L.use_cases)} />}
                {arr(L.service_areas).length > 0 && <Row label={t.rowServiceAreas} items={arr(L.service_areas)} />}
                {arr(L.certifications).length > 0 && <Row label={t.rowCertifications} items={arr(L.certifications)} />}
                {arr(fit.company_sizes).length > 0 && <Row label={t.rowCompanySizes} items={arr(fit.company_sizes)} />}
                {arr(roi.drivers).length > 0 && <Row label={t.rowRoiDrivers} items={arr(roi.drivers)} />}
              </>
            )}
            {tab === 'specs' && (
              <table className="dt-specs"><tbody>
                {Object.entries(specs).map(([k, v]) => <tr key={k}><td>{k}</td><td>{String(v)}</td></tr>)}
              </tbody></table>
            )}
            {tab === 'process' && (
              <ol className="dt-process">{arr(L.process).map((p, i) => <li key={i}>{p}</li>)}</ol>
            )}
            {tab === 'pilot' && (() => {
              // Back-compat + repeatable: pilotEntriesOf() reads BOTH the old
              // single-object shape (every listing published before this
              // feature) and the new `entries` array (2+ pilots) — this
              // render path never needs to know which one it got.
              const entries = pilotEntriesOf(pilot);
              if (entries.length <= 1) {
                const e = entries[0] || { duration: '', cost: '', scope: '' };
                return (
                  <dl className="dt-kv">
                    {Boolean(pilot.available) && <Item k={t.itemPilot} v={t.itemAvailable} />}
                    <Item k={t.itemDuration} v={e.duration} /><Item k={t.itemCost} v={e.cost} /><Item k={t.itemScope} v={e.scope} />
                    {arr(pilot.success_criteria).length > 0 && <Item k={t.itemSuccessCriteria} v={arr(pilot.success_criteria).join(' · ')} />}
                  </dl>
                );
              }
              return (
                <div className="dt-pilotlist">
                  {Boolean(pilot.available) && <p className="dt-hint">{t.itemPilot}: {t.itemAvailable}</p>}
                  {entries.map((e, i) => (
                    <div className="dt-pilotitem" key={i}>
                      <h4>{t.itemPilotN.replace('{n}', String(i + 1))}</h4>
                      <dl className="dt-kv">
                        <Item k={t.itemDuration} v={e.duration} /><Item k={t.itemCost} v={e.cost} /><Item k={t.itemScope} v={e.scope} />
                      </dl>
                    </div>
                  ))}
                  {arr(pilot.success_criteria).length > 0 && (
                    <dl className="dt-kv"><Item k={t.itemSuccessCriteria} v={arr(pilot.success_criteria).join(' · ')} /></dl>
                  )}
                </div>
              );
            })()}
            {tab === 'implementation' && (
              <dl className="dt-kv">
                {arr(impl.requirements).length > 0 && <Item k={t.itemRequirements} v={arr(impl.requirements).join(' · ')} />}
                <Item k={t.itemTypicalTimeline} v={s(impl.typical_timeline)} /><Item k={t.itemTraining} v={s(impl.training)} />
                {arr(impl.integrations).length > 0 && <Item k={t.itemIntegrations} v={arr(impl.integrations).join(' · ')} />}
                {customFieldsOf(impl).map((c, i) => <Item key={`c${i}`} k={c.label} v={c.value} />)}
              </dl>
            )}
            {tab === 'pricing' && (
              <dl className="dt-kv">
                <Item k={t.itemModel} v={s(pricing.model) || s(L.pricing_model)} /><Item k={t.itemRange} v={s(pricing.range)} />
                {(pricing.buy || pricing.rent || pricing.lease) ? <Item k={t.itemOptions} v={['buy', 'rent', 'lease'].filter((o) => pricing[o]).join(' · ')} /> : null}
                <Item k={t.itemNotes} v={s(pricing.notes)} />
                {customFieldsOf(pricing).map((c, i) => <Item key={`c${i}`} k={c.label} v={c.value} />)}
                {!s(pricing.range) && <p className="dt-hint">{t.pricingHint}</p>}
              </dl>
            )}
            {tab === 'warranty' && (
              <dl className="dt-kv">
                <Item k={t.itemWarranty} v={s(ws.warranty)} />
                {arr(ws.support_channels).length > 0 && <Item k={t.itemSupport} v={arr(ws.support_channels).join(' · ')} />}
                <Item k={t.itemSla} v={s(ws.sla)} /><Item k={t.itemMaintenance} v={s(ws.maintenance)} />
                {customFieldsOf(ws).map((c, i) => <Item key={`c${i}`} k={c.label} v={c.value} />)}
              </dl>
            )}
            {tab === 'documents' && (
              <ul className="dt-docs">
                {d.documents.map((doc) => (
                  <li key={doc.id}>
                    {doc.url ? <a href={doc.url} target="_blank" rel="noreferrer">{doc.title || doc.file_name}</a> : <span>{doc.title || doc.file_name}</span>}
                    {doc.ai_summary && <p>{doc.ai_summary}</p>}
                  </li>
                ))}
              </ul>
            )}
            {tab === 'cases' && (
              <div className="dt-cases">
                {d.case_studies.map((c) => (
                  <div className="dt-case" key={c.id}>
                    <b>{c.title}</b>
                    {c.challenge && <p><span>{t.caseChallenge}</span> {c.challenge}</p>}
                    {c.solution && <p><span>{t.caseSolution}</span> {c.solution}</p>}
                    {Array.isArray(c.results) && c.results.length > 0 && <p><span>{t.caseResults}</span> {c.results.join(' · ')}</p>}
                  </div>
                ))}
              </div>
            )}
            {tab === 'reviews' && (
              <div className="dt-reviews">
                <p className="dt-hint">{t.reviewsHint}</p>
                {(d.reviews || []).map((rv, i) => (
                  <div className="dt-review" key={i}>
                    <div className="dt-rvhead"><span className="dt-rvstars">{stars(rv.rating)}</span>{rv.title && <b>{rv.title}</b>}<small className="dt-rvdate">{new Date(rv.created_at).toLocaleDateString()}</small></div>
                    {rv.body && <p>{rv.body}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {related.length > 0 && (
            <div className="dt-related">
              <h3>{t.relatedListings}</h3>
              <div className="dt-relgrid">
                {related.slice(0, 4).map((r) => (
                  <Link key={r.id} href={`/marketplace/${r.kind}/${r.id}`} className="dt-relcard">
                    <span className={'dt-kind ' + r.kind}>{kindLabel(r.kind)}</span>
                    <b>{r.name}</b>
                    <small>{r.category}</small>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="dt-side" id="quote">
          <div className="dt-quote">
            <div className="dt-thru">{t.through}<span>{'//'}</span>LINK</div>
            <div className="dt-cartrow">
              <AddToCartButton
                listing={{ id: String(params.id), kind, name: s(L.name), vendor_id: s(L.vendor_id) || null, vendor_name: d.vendor?.company_name || null }}
                className="dt-cartadd"
                activeClassName="on"
                showHint
              />
            </div>
            <h3>{a.heading}</h3>
            <div className="dt-actions" role="tablist" aria-label={t.requestTypeAria}>
              {REQUEST_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={requestType === key}
                  className={requestType === key ? 'on' : ''}
                  onClick={() => { setRequestType(key); setSentRef(''); setFormMsg(''); }}
                >
                  {actionsT[key].label}
                </button>
              ))}
            </div>
            {sentRef ? (
              <div className="dt-sent">{t.requestSentPrefix} <b>{sentRef}</b>. {d.vendor ? d.vendor.company_name : t.theVendor} {t.respondsInside} <Link href="/buyer">{t.yourDashboard}</Link>.</div>
            ) : (
              <form onSubmit={submitQuote}>
                <input type="text" name="website_url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
                <input placeholder={t.fCompany} value={company} onChange={(e) => setCompany(e.target.value)} required />
                <input placeholder={t.fName} value={contact} onChange={(e) => setContact(e.target.value)} />
                <input placeholder={t.fEmail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <input placeholder={t.fPhone} value={phone} onChange={(e) => setPhone(e.target.value)} />
                <textarea placeholder={a.placeholder} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
                {formMsg && <div className="dt-err">{formMsg}</div>}
                <button type="submit" disabled={sending}>{sending ? t.sending : a.cta}</button>
                <p className="dt-safenote">{t.safety}</p>
                <p className="dt-disclosure">{t.disclosure} <Link href="/terms">{t.terms}</Link> · <Link href="/privacy">{t.privacy}</Link></p>
              </form>
            )}
          </div>
          {d.vendor && (
            <div className="dt-vendorcard">
              <h4>{d.vendor.company_name}</h4>
              {d.vendor.description && <p>{d.vendor.description.slice(0, 300)}</p>}
              <Link className="dt-storelink" href={`/marketplace/vendor/${s(L.vendor_id)}`}>{t.storefront}</Link>
            </div>
          )}

          <div className="dt-report">
            {repDone ? (
              <p>{t.reportThanks}</p>
            ) : !repOpen ? (
              <button className="dt-replink" onClick={() => setRepOpen(true)}>{t.reportLink}</button>
            ) : (
              <div className="dt-repform">
                <b>{t.reportTitle}</b>
                <select value={repReason} onChange={(e) => setRepReason(e.target.value)}>
                  <option value="wrong_info">{t.reasonWrongInfo}</option>
                  <option value="misleading">{t.reasonMisleading}</option>
                  <option value="spam">{t.reasonSpam}</option>
                  <option value="not_available">{t.reasonNotAvailable}</option>
                  <option value="other">{t.reasonOther}</option>
                </select>
                <textarea rows={3} placeholder={t.reportDetailsPh} value={repDetails} onChange={(e) => setRepDetails(e.target.value)} />
                <input type="email" placeholder={t.reportEmailPh} value={repEmail} onChange={(e) => setRepEmail(e.target.value)} />
                <div className="dt-repactions">
                  <button className="dt-repsend" onClick={submitReport}>{t.sendReport}</button>
                  <button className="dt-replink" onClick={() => setRepOpen(false)}>{t.cancel}</button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile: sticky request bar so the action is always reachable */}
      {!sentRef && (
        <div className="dt-mobilecta">
          <a href="#quote">{a.label} {t.mobileCtaSuffix}</a>
        </div>
      )}
    </div>
  );
}

function Row({ label, items }: { label: string; items: string[] }) {
  return <div className="dt-row"><span>{label}</span><div>{items.map((t) => <em key={t}>{t}</em>)}</div></div>;
}
function Item({ k, v }: { k: string; v: string }) {
  if (!v) return null;
  return <div className="dt-item"><dt>{k}</dt><dd>{v}</dd></div>;
}

const CSS = `
.dt{min-height:100vh;background:var(--spec-warm-white);color:var(--spec-ink);font-family:var(--font-ibm-plex-sans-detail),'IBM Plex Sans',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.dt *{box-sizing:border-box;}
/* On-brand focus ring (the app-wide default in globals.css is the old v4
   blue accent, which drifts off Design System v1.0 on this light page). */
.dt a:focus-visible,.dt button:focus-visible,.dt input:focus-visible,.dt textarea:focus-visible,.dt select:focus-visible{outline:2px solid var(--spec-violet);outline-offset:2px;}
.dt h1,.dt h3,.dt h4{font-family:var(--font-space-grotesk),'Space Grotesk',system-ui,sans-serif;}
.dt-empty{min-height:60vh;display:grid;place-items:center;color:var(--spec-text-2nd);}
.dt-empty a{color:var(--spec-violet-deep);}
.dt-subnav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid var(--spec-border);background:#fff;}
.dt-crumbs{display:flex;align-items:center;gap:8px;font-size:13px;min-width:0;flex-wrap:wrap;}
.dt-crumbs a{color:var(--spec-violet-deep);text-decoration:none;font-weight:600;}
.dt-crumbs a:hover{color:var(--spec-violet);}
.dt-crumbs span{color:var(--spec-text-2nd);}
.dt-crumbs em{font-style:normal;color:var(--spec-ink);}
.dt-navr{display:flex;align-items:center;gap:10px;}
.dt-share{font-family:inherit;font-size:12.5px;font-weight:600;background:none;border:1px solid var(--spec-border);color:var(--spec-text-2nd);border-radius:9px;padding:7px 13px;cursor:pointer;}
.dt-share:hover{border-color:var(--spec-violet);color:var(--spec-violet-deep);}
.dt-mobilecta{display:none;position:fixed;bottom:0;left:0;right:0;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:rgba(255,255,255,.96);backdrop-filter:blur(16px);border-top:1px solid var(--spec-border);z-index:30;}
.dt-mobilecta a{display:block;text-align:center;background:var(--spec-violet);color:#fff;font-weight:700;font-size:14.5px;padding:13px;border-radius:12px;text-decoration:none;}
@media(max-width:900px){.dt-mobilecta{display:block;}.dt-wrap{padding-bottom:150px;}}
.dt-kind{font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 9px;border-radius:99px;}
.dt-kind.product{background:rgba(108,92,224,.14);color:var(--spec-violet-deep);}
.dt-kind.service{background:rgba(47,158,106,.14);color:#1F7A54;}
.dt-wrap{max-width:1080px;margin:0 auto;padding:28px 20px 100px;display:grid;grid-template-columns:1fr 340px;gap:26px;}
@media(max-width:900px){.dt-wrap{grid-template-columns:1fr;}}
.dt-img{height:320px;border-radius:16px;overflow:hidden;background:#fff;border:1px solid var(--spec-border);}
.dt-img img{width:100%;height:100%;object-fit:cover;}
.dt-noimg{display:grid;place-items:center;color:var(--spec-text-2nd);letter-spacing:.15em;text-transform:uppercase;font-size:14px;}
.dt-thumbs{display:flex;gap:8px;margin-top:10px;}
.dt-thumbs button{width:64px;height:48px;border-radius:8px;overflow:hidden;border:1.5px solid var(--spec-border);background:#fff;cursor:pointer;padding:0;}
.dt-thumbs button.on{border-color:var(--spec-violet);}
.dt-thumbs img{width:100%;height:100%;object-fit:cover;}
.dt-head h1{font-size:clamp(22px,3.4vw,32px);font-weight:800;letter-spacing:-.02em;margin-top:20px;color:var(--spec-ink);}
.dt-sub{color:var(--spec-text-2nd);font-size:14px;margin-top:6px;}
.dt-badges{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px;}
.dt-badges span{font-size:11.5px;font-weight:600;padding:5px 10px;border-radius:99px;background:var(--spec-surface);color:var(--spec-text-2nd);}
/* #8A5D14: a darker shade of the same --spec-warning amber, calibrated for
   4.5:1 on a light surface (the raw token measures ~3:1 as text — one of
   the audited contrast failures this reskin fixes). */
.dt-badges span.urgent{background:rgba(198,138,40,.14);color:#8A5D14;}
.dt-badges span.rating{background:rgba(198,138,40,.14);color:#8A5D14;font-weight:700;}
.dt-reviews{display:flex;flex-direction:column;gap:14px;}
.dt-review{background:#fff;border:1px solid var(--spec-border);border-radius:14px;padding:15px 17px;}
.dt-rvhead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.dt-rvstars{color:#8A5D14;font-size:15px;letter-spacing:2px;}
.dt-rvdate{margin-left:auto;color:var(--spec-text-2nd);font-size:11.5px;}
.dt-review b{font-size:14.5px;color:var(--spec-ink);}
.dt-review p{font-size:13.5px;color:var(--spec-text-2nd);margin:8px 0 0;line-height:1.55;white-space:pre-wrap;}
.dt-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-top:22px;border-bottom:1px solid var(--spec-border);padding-bottom:10px;}
.dt-tabs button{font-family:inherit;font-size:13px;font-weight:600;padding:8px 13px;border-radius:9px;border:none;background:none;color:var(--spec-text-2nd);cursor:pointer;}
.dt-tabs button.on{background:rgba(108,92,224,.14);color:var(--spec-violet-deep);}
.dt-panel{padding:20px 2px;min-height:120px;}
.dt-overview{font-size:15px;line-height:1.7;color:var(--spec-ink);font-weight:400;margin-bottom:18px;white-space:pre-wrap;}
.dt-row{display:flex;gap:14px;margin-bottom:12px;align-items:baseline;}
.dt-row>span{font-size:12px;color:var(--spec-text-2nd);min-width:110px;}
.dt-row em{font-style:normal;font-size:12.5px;color:var(--spec-violet-deep);background:rgba(108,92,224,.08);padding:3px 9px;border-radius:6px;margin:0 5px 5px 0;display:inline-block;}
.dt-specs{width:100%;border-collapse:collapse;font-size:14px;}
.dt-specs td{padding:9px 12px;border-bottom:1px solid var(--spec-border);color:var(--spec-ink);}
.dt-specs td:first-child{color:var(--spec-text-2nd);width:40%;}
.dt-process{padding-left:20px;display:flex;flex-direction:column;gap:10px;font-size:14.5px;color:var(--spec-ink);line-height:1.5;}
.dt-kv{margin:0;}
.dt-item{display:flex;gap:14px;padding:9px 0;border-bottom:1px solid var(--spec-border);}
.dt-item dt{color:var(--spec-text-2nd);font-size:13px;min-width:130px;}
.dt-item dd{margin:0;font-size:14px;color:var(--spec-ink);line-height:1.5;}
.dt-pilotitem{margin-bottom:16px;}
.dt-pilotitem h4{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--spec-violet-deep,#4A3DB0);margin:0 0 4px;}
.dt-pilotitem .dt-kv{margin-bottom:0;}
.dt-hint{color:var(--spec-text-2nd);font-size:13px;line-height:1.5;margin-top:12px;}
.dt-docs{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px;}
.dt-docs a{color:var(--spec-violet-deep);font-size:14.5px;}
.dt-docs p{color:var(--spec-text-2nd);font-size:13px;margin:5px 0 0;line-height:1.5;}
.dt-cases{display:flex;flex-direction:column;gap:14px;}
.dt-case{background:#fff;border:1px solid var(--spec-border);border-radius:14px;padding:16px 18px;}
.dt-case b{font-size:15px;color:var(--spec-ink);}
.dt-case p{font-size:13.5px;color:var(--spec-text-2nd);margin:8px 0 0;line-height:1.55;}
.dt-case p span{color:var(--spec-ink);font-weight:600;}
.dt-related h3{font-size:16px;margin:26px 0 12px;color:var(--spec-ink);}
.dt-relgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;}
.dt-relcard{display:flex;flex-direction:column;gap:6px;background:#fff;border:1px solid var(--spec-border);border-radius:12px;padding:14px;text-decoration:none;color:var(--spec-ink);}
.dt-relcard:hover{border-color:var(--spec-violet);}
.dt-relcard b{font-size:14px;}
.dt-relcard small{color:var(--spec-text-2nd);font-size:12px;}
.dt-relcard .dt-kind{align-self:flex-start;}
.dt-side{display:flex;flex-direction:column;gap:16px;}
.dt-quote{background:#fff;border:1px solid rgba(108,92,224,.3);border-radius:16px;padding:20px;position:sticky;top:74px;}
.dt-thru{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--spec-violet-deep);background:rgba(108,92,224,.14);border:1px solid rgba(108,92,224,.3);padding:4px 10px;border-radius:99px;margin-bottom:12px;}
.dt-thru span{color:var(--spec-violet);}
.dt-cartrow{margin:0 0 14px;padding-bottom:14px;border-bottom:1px solid var(--spec-border);}
.dt-cartadd{width:100%;font-family:inherit;font-size:13.5px;font-weight:700;padding:11px;border-radius:10px;border:1px solid var(--spec-violet);background:none;color:var(--spec-violet-deep);cursor:pointer;}
.dt-cartadd:hover{background:rgba(108,92,224,.08);}
.dt-cartadd.on{background:rgba(108,92,224,.14);border-color:var(--spec-violet);}
.dt-quote h3{font-size:17px;margin-bottom:6px;color:var(--spec-ink);}
.dt-actions{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 4px;}
.dt-actions button{font-family:inherit;font-size:12.5px;font-weight:600;padding:7px 11px;border-radius:9px;border:1px solid var(--spec-border);background:none;color:var(--spec-text-2nd);cursor:pointer;transition:all .12s;}
.dt-actions button:hover{border-color:var(--spec-violet);color:var(--spec-violet-deep);}
.dt-actions button.on{background:rgba(108,92,224,.14);border-color:var(--spec-violet);color:var(--spec-violet-deep);}
/* Success-green text needs a slightly darker shade than the --spec-success
   swatch to clear 4.5:1 on a light surface (the raw token measures ~3.4:1
   here — one of the audited contrast failures this reskin fixes); same hue
   family, just AA-safe for body text. */
.dt-safenote{margin:9px 0 0;font-size:12.5px;font-weight:600;color:#1F7A54;text-align:center;}
.dt-disclosure{margin:12px 0 0;font-size:11.5px;line-height:1.5;color:var(--spec-text-2nd);}
.dt-disclosure a{color:var(--spec-text-2nd);text-decoration:underline;}
.dt-quote form{display:flex;flex-direction:column;gap:10px;margin-top:14px;}
.dt-quote input,.dt-quote textarea{font-family:inherit;font-size:14px;padding:11px 13px;border-radius:10px;border:1px solid var(--spec-border);background:var(--spec-warm-white);color:var(--spec-ink);outline:none;resize:vertical;}
.dt-quote input:focus,.dt-quote textarea:focus{border-color:var(--spec-violet);}
.dt-quote button{font-family:inherit;font-size:14.5px;font-weight:700;padding:13px;border-radius:11px;border:none;background:var(--spec-violet);color:#fff;cursor:pointer;}
.dt-quote button:hover{background:var(--spec-violet-deep);}
.dt-quote button:disabled{opacity:.6;}
.dt-sent{margin-top:14px;background:rgba(47,158,106,.1);border:1px solid rgba(47,158,106,.3);color:#1F7A54;border-radius:12px;padding:14px;font-size:13.5px;line-height:1.6;}
.dt-err{color:var(--spec-error);font-size:13px;}
.dt-vendorcard{background:#fff;border:1px solid var(--spec-border);border-radius:16px;padding:18px;}
.dt-vendorcard h4{font-size:15px;margin-bottom:8px;color:var(--spec-ink);}
.dt-vendorcard p{font-size:13px;color:var(--spec-text-2nd);line-height:1.6;}
.dt-storelink{display:inline-block;margin-top:10px;color:var(--spec-violet-deep);font-size:13px;font-weight:700;text-decoration:none;}
.dt-storelink:hover{color:var(--spec-violet);}
.dt-report{text-align:center;}
.dt-report p{color:var(--spec-text-2nd);font-size:13px;}
.dt-replink{background:none;border:none;color:var(--spec-text-2nd);font:inherit;font-size:12.5px;cursor:pointer;text-decoration:underline;}
.dt-replink:hover{color:var(--spec-ink);}
.dt-repform{background:#fff;border:1px solid var(--spec-border);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:9px;text-align:left;}
.dt-repform b{font-size:14px;color:var(--spec-ink);}
.dt-repform select,.dt-repform textarea,.dt-repform input{font-family:inherit;font-size:13.5px;padding:10px 12px;border-radius:9px;border:1px solid var(--spec-border);background:var(--spec-warm-white);color:var(--spec-ink);outline:none;resize:vertical;}
.dt-repactions{display:flex;gap:10px;align-items:center;}
.dt-repsend{font-family:inherit;font-size:13px;font-weight:700;padding:9px 14px;border-radius:9px;border:none;background:rgba(206,75,67,.12);color:var(--spec-error);cursor:pointer;}
`;
