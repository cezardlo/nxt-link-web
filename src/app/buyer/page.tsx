'use client';

// Buyer dashboard: the signed-in buyer's marketplace footprint — intake
// requests (NXT-assisted) and marketplace quote/service requests (self-service),
// matched server-side to their verified email, plus saved listings (localStorage).
// Fully EN/ES via the shared LanguageToggle/useLang pattern (see /cart).

import { useCallback, useEffect, useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import LanguageToggle, { useLang, type Lang } from '@/components/LanguageToggle';
import { PackageSearch, Inbox } from 'lucide-react';
import { EmptyAction, EMPTY_ACTION_CSS } from '@/components/marketplace/EmptyAction';

interface IntakeRequest {
  id: string; public_ref: string; category: string | null; problem: string | null;
  location: string | null; urgency: string | null; status: string | null;
  pipeline_stage: string | null; created_at: string;
}
interface QuoteRequest {
  id: string; public_ref: string; kind: string; listing_name: string | null;
  product_id?: string | null; service_id?: string | null;
  company: string | null; message: string | null; status: string; created_at: string;
  quote_amount?: number | null; quote_currency?: string | null; quote_message?: string | null;
  quote_timeline?: string | null; quote_valid_until?: string | null; quoted_at?: string | null;
  buyer_decision?: string | null; reviewed?: boolean;
  answers?: { request_type?: string; bundle?: boolean; items?: Array<{ listing_id: string; kind: string; name: string; qty: number; note?: string }> } | null;
  pilots?: Array<{ kind: string; status: string; scheduled_for: string | null; location: string | null; scope: string | null; outcome: string | null }>;
}
interface DashboardData {
  signed_in: boolean; email_verified?: boolean; email?: string | null;
  requests?: IntakeRequest[]; quotes?: QuoteRequest[];
}

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const T: Record<Lang, Record<string, string>> = {
  en: {
    dashboardTag: 'Dashboard', alerts: 'Alerts', refresh: 'Refresh',
    browseMarketplace: 'Browse marketplace', describeNeed: 'Describe a need', myProfile: 'My profile', account: 'Account',
    yourDashboard: 'Your dashboard', signedInAs: 'Signed in as',
    notifications: 'Notifications', close: 'Close', notifEmpty: 'Nothing yet — you’ll see quotes, messages, and pilot updates here.',
    loading: 'Loading…', signInFirst: 'Sign in to see your requests —', goToSignIn: 'go to sign in',
    verifyEmail: 'Verify your email to see your requests.', checkInbox: 'Check your inbox for the confirmation link, then reload this page.',
    needsAttention: 'Needs attention', reviewNow: 'Review now →',
    quoteAwaiting: 'quote', quotesAwaiting: 'quotes', awaitingDecision: 'awaiting your decision',
    expiringWithin: 'expiring within 3 days',
    savedListings: 'Saved listings', browseMore: 'Browse more',
    savedOnDevice: 'saved on this device', viewInMarketplace: '→ view in marketplace (sign-in saves them to your account)',
    nothingSaved: 'Nothing saved yet.', browseTheMarketplace: 'Browse the marketplace', tapSave: 'and tap Save on listings you like.',
    yourRequests: 'Your requests', newRequest: '+ New request',
    noRequestsYet: 'No requests yet', noRequestsHint: 'Describe what you need and NXT//LINK will source vendors for you.', describeWhatYouNeed: 'Describe what you need',
    quoteRequests: 'Quote requests', browseListings: 'Browse listings',
    noQuoteRequestsYet: 'No quote requests yet', noQuoteRequestsHint: 'Find a product or service and request a quote — vendor replies land here.',
    received: 'Received', request: 'Request', urgency: 'Urgency',
    serviceRequest: 'Service request', productRequest: 'Product request',
    statusSent: 'Sent', statusSeenByVendor: 'Seen by vendor', statusVendorResponding: 'Vendor responding', statusClosed: 'Closed',
    bundlePrefix: 'Bundle', bundleItem: 'item', bundleItems: 'items',
    noMessagesVendor: 'No messages yet — ask the vendor anything.', messageVendorPh: 'Message the vendor…', send: 'Send',
    guardChat: 'For your protection, contact details are hidden in chat until you accept a quote — keep the conversation on NXT//LINK.',
    messageVendor: 'Message vendor',
    pkDemo: 'Demo', pkPilot: 'Pilot', pkSiteVisit: 'Site visit',
    psProposed: 'Proposed', psScheduled: 'Scheduled', psInProgress: 'In progress', psCompleted: 'Completed', psCancelled: 'Cancelled',
    poPassed: 'Passed', poFailed: 'Failed', poInconclusive: 'Inconclusive',
    quoteReceived: 'Quote received:',
    validUntil: 'Valid until', expiresToday: 'expires today', dayLeft: 'day left', daysLeft: 'days left', expired: 'Expired',
    youAccepted: 'You accepted this quote', youDeclined: 'You declined this quote',
    accept: 'Accept —', decline: 'Decline',
    guardAccept: 'Accepting doesn’t charge you anything — it connects you with the vendor to finalize the deal on your terms.',
    reviewedVendor: '✓ You reviewed this vendor',
    titleOptional: 'Title (optional)', howDidItGo: 'How did it go? (optional)',
    submitReview: 'Submit review', saving: 'Saving…', cancel: 'Cancel', leaveReview: 'Leave a review',
    noActivity: 'You have no activity yet. Start by', browsingMarketplace: 'browsing the marketplace', or: 'or', describingNeed: 'describing what you need',
    docTitle: 'My dashboard — NXT//LINK',
    kindProduct: 'product', kindService: 'service',
  },
  es: {
    dashboardTag: 'Panel', alerts: 'Alertas', refresh: 'Actualizar',
    browseMarketplace: 'Explorar marketplace', describeNeed: 'Describir una necesidad', myProfile: 'Mi perfil', account: 'Cuenta',
    yourDashboard: 'Tu panel', signedInAs: 'Sesión iniciada como',
    notifications: 'Notificaciones', close: 'Cerrar', notifEmpty: 'Nada por aquí todavía — verás cotizaciones, mensajes y actualizaciones de pilotos aquí.',
    loading: 'Cargando…', signInFirst: 'Inicia sesión para ver tus solicitudes —', goToSignIn: 'ir a iniciar sesión',
    verifyEmail: 'Verifica tu correo para ver tus solicitudes.', checkInbox: 'Revisa tu bandeja de entrada por el enlace de confirmación y recarga esta página.',
    needsAttention: 'Necesita atención', reviewNow: 'Revisar ahora →',
    quoteAwaiting: 'cotización', quotesAwaiting: 'cotizaciones', awaitingDecision: 'esperando tu decisión',
    expiringWithin: 'vencen en 3 días',
    savedListings: 'Publicaciones guardadas', browseMore: 'Ver más',
    savedOnDevice: 'guardado(s) en este dispositivo', viewInMarketplace: '→ ver en el marketplace (inicia sesión para guardarlos en tu cuenta)',
    nothingSaved: 'Aún no has guardado nada.', browseTheMarketplace: 'Explora el marketplace', tapSave: 'y toca Guardar en las publicaciones que te gusten.',
    yourRequests: 'Tus solicitudes', newRequest: '+ Nueva solicitud',
    noRequestsYet: 'Aún no hay solicitudes', noRequestsHint: 'Describe lo que necesitas y NXT//LINK buscará proveedores por ti.', describeWhatYouNeed: 'Describe lo que necesitas',
    quoteRequests: 'Solicitudes de cotización', browseListings: 'Ver publicaciones',
    noQuoteRequestsYet: 'Aún no hay solicitudes de cotización', noQuoteRequestsHint: 'Encuentra un producto o servicio y solicita una cotización — las respuestas del proveedor llegan aquí.',
    received: 'Recibida', request: 'Solicitud', urgency: 'Urgencia',
    serviceRequest: 'Solicitud de servicio', productRequest: 'Solicitud de producto',
    statusSent: 'Enviada', statusSeenByVendor: 'Vista por el proveedor', statusVendorResponding: 'El proveedor está respondiendo', statusClosed: 'Cerrada',
    bundlePrefix: 'Paquete', bundleItem: 'artículo', bundleItems: 'artículos',
    noMessagesVendor: 'Aún no hay mensajes — pregúntale algo al proveedor.', messageVendorPh: 'Mensaje para el proveedor…', send: 'Enviar',
    guardChat: 'Para tu protección, los datos de contacto se ocultan en el chat hasta que aceptes una cotización — mantén la conversación en NXT//LINK.',
    messageVendor: 'Mensaje al proveedor',
    pkDemo: 'Demo', pkPilot: 'Piloto', pkSiteVisit: 'Visita al sitio',
    psProposed: 'Propuesto', psScheduled: 'Programado', psInProgress: 'En progreso', psCompleted: 'Completado', psCancelled: 'Cancelado',
    poPassed: 'Aprobado', poFailed: 'Fallido', poInconclusive: 'No concluyente',
    quoteReceived: 'Cotización recibida:',
    validUntil: 'Válido hasta', expiresToday: 'vence hoy', dayLeft: 'día restante', daysLeft: 'días restantes', expired: 'Venció',
    youAccepted: 'Aceptaste esta cotización', youDeclined: 'Rechazaste esta cotización',
    accept: 'Aceptar —', decline: 'Rechazar',
    guardAccept: 'Aceptar no te cobra nada — te conecta con el proveedor para cerrar el trato en tus términos.',
    reviewedVendor: '✓ Reseñaste a este proveedor',
    titleOptional: 'Título (opcional)', howDidItGo: '¿Cómo te fue? (opcional)',
    submitReview: 'Enviar reseña', saving: 'Guardando…', cancel: 'Cancelar', leaveReview: 'Dejar una reseña',
    noActivity: 'Aún no tienes actividad. Empieza', browsingMarketplace: 'explorando el marketplace', or: 'o', describingNeed: 'describiendo lo que necesitas',
    docTitle: 'Mi panel — NXT//LINK',
    kindProduct: 'producto', kindService: 'servicio',
  },
};

export default function BuyerDashboardPage() {
  const [lang, setLang] = useLang(); // stored `nxt_lang` — shared across marketplace pages
  const t = T[lang];
  const dateLocale = lang === 'es' ? 'es-MX' : 'en-US';
  const REQUEST_LABEL: Record<string, string> = { request_received: t.received, new_request: t.received };
  const QUOTE_LABEL: Record<string, string> = { new: t.statusSent, viewed: t.statusSeenByVendor, responded: t.statusVendorResponding, won: t.statusClosed, lost: t.statusClosed, spam: t.statusClosed };
  const PILOT_KIND_LABEL: Record<string, string> = { demo: t.pkDemo, pilot: t.pkPilot, site_visit: t.pkSiteVisit };
  const PILOT_STATUS_LABEL: Record<string, string> = { proposed: t.psProposed, scheduled: t.psScheduled, in_progress: t.psInProgress, completed: t.psCompleted, cancelled: t.psCancelled };
  const PILOT_OUTCOME_LABEL: Record<string, string> = { passed: t.poPassed, failed: t.poFailed, inconclusive: t.poInconclusive };
  const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString(dateLocale); } catch { return ''; } };
  // "Valid until Fri, Mar 28 · 6 days left" — day names + countdown make the
  // deadline concrete (specificity converts better than a bare date).
  const fmtValidUntil = (s: string) => {
    try {
      const d = new Date(s);
      if (isNaN(d.getTime())) return `${t.validUntil} ${s}`;
      const date = d.toLocaleDateString(dateLocale, { weekday: 'short', month: 'short', day: 'numeric' });
      const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
      if (days < 0) return `${t.expired} ${date}`;
      if (days === 0) return `${t.validUntil} ${date} · ${t.expiresToday}`;
      return `${t.validUntil} ${date} · ${days} ${days === 1 ? t.dayLeft : t.daysLeft}`;
    } catch { return `${t.validUntil} ${s}`; }
  };

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
  const chatListRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatListRef.current?.scrollTo({ top: chatListRef.current.scrollHeight }); }, [chatMsgs, chatFor]);
  const [savedItems, setSavedItems] = useState<Array<{ listing_id: string; kind: string; name: string | null }>>([]);
  const [notifs, setNotifs] = useState<Array<{ id: string; title: string; read_at: string | null; created_at: string }>>([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  async function toggleNotifs() {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next && notifUnread > 0) {
      await fetch('/api/buyer/notifications', { method: 'POST' });
      setNotifUnread(0);
    }
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/buyer/dashboard');
      const json = (await res.json()) as DashboardData;
      setData(json);
      const n = await fetch('/api/buyer/notifications').then((r) => r.json()).catch(() => null);
      if (n?.ok) { setNotifs(n.notifications || []); setNotifUnread(n.unread || 0); }
      const sv = await fetch('/api/buyer/saved').then((r) => r.json()).catch(() => null);
      if (sv?.ok && sv.signed_in) setSavedItems(sv.items || []);
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

  useEffect(() => { document.title = t.docTitle; }, [t.docTitle]);

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
      <style dangerouslySetInnerHTML={{ __html: CSS + EMPTY_ACTION_CSS + ATTENTION_CSS }} />
      <nav className="by-nav">
        <a className="by-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b><span>{t.dashboardTag}</span></a>
        <div className="by-navlinks">
          <button className="by-bell" onClick={toggleNotifs} aria-label="Notifications">
            {t.alerts}{notifUnread > 0 && <span className="by-belldot">{notifUnread}</span>}
          </button>
          <button className="by-link by-refresh" onClick={() => { setChecking(true); load(); }} aria-label="Refresh">{t.refresh}</button>
          <a className="by-link" href="/marketplace">{t.browseMarketplace}</a>
          <a className="by-link" href="/intake">{t.describeNeed}</a>
          <a className="by-link" href="/buyer/profile">{t.myProfile}</a>
          <a className="by-link" href="/account">{t.account}</a>
          <LanguageToggle lang={lang} onChange={setLang} variant="dark" />
        </div>
      </nav>

      <main className="by-wrap">
        <h1>{t.yourDashboard}</h1>
        {data.email && <p className="by-sub">{t.signedInAs} {data.email}</p>}

        {notifOpen && (
          <div className="by-notifs">
            <div className="by-notifhead"><b>{t.notifications}</b><button onClick={() => setNotifOpen(false)}>{t.close}</button></div>
            {notifs.length === 0 ? <p className="by-notifempty">{t.notifEmpty}</p> : (
              <ul>
                {notifs.map((n) => (
                  <li key={n.id} className={n.read_at ? '' : 'unread'}>
                    <span>{n.title}</span>
                    <small>{fmtDate(n.created_at)}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {checking ? (
          <div className="by-empty">{t.loading}</div>
        ) : !data.signed_in ? (
          <div className="by-empty">{t.signInFirst} <a href="/login">{t.goToSignIn}</a></div>
        ) : data.email_verified === false ? (
          <div className="by-empty">
            {t.verifyEmail}<br />
            <small>{t.checkInbox}</small>
          </div>
        ) : (
          <>
            {/* Needs attention — surface only the immediate actions (spec §05 / Upwork pattern) */}
            {(() => {
              const toReview = quotes.filter((q) => q.quote_amount != null && !q.buyer_decision);
              const expiring = toReview.filter((q) => {
                if (!q.quote_valid_until) return false;
                const days = (new Date(q.quote_valid_until).getTime() - Date.now()) / 86400000;
                return days >= 0 && days <= 3;
              });
              if (toReview.length === 0) return null;
              return (
                <div className="by-attn">
                  <b>{t.needsAttention}</b>
                  <span>{toReview.length} {toReview.length === 1 ? t.quoteAwaiting : t.quotesAwaiting} {t.awaitingDecision}{expiring.length > 0 ? ` · ${expiring.length} ${t.expiringWithin}` : ''}</span>
                  <a href="#quotes">{t.reviewNow}</a>
                </div>
              );
            })()}
            {/* Saved listings — account-level, follow the buyer across devices */}
            <section className="by-sec">
              <div className="by-sechead"><h2>{t.savedListings} {savedItems.length > 0 && <small className="by-cnt">{savedItems.length}</small>}</h2><a className="by-link" href="/marketplace">{t.browseMore}</a></div>
              {savedItems.length > 0 ? (
                <div className="by-savedgrid">
                  {savedItems.filter((s) => s.name).map((s) => (
                    <a key={s.listing_id} className="by-saveditem" href={`/marketplace/${s.kind}/${s.listing_id}`}>
                      <i className={s.kind}>{s.kind === 'service' ? t.kindService : t.kindProduct}</i>
                      <span>{s.name}</span>
                    </a>
                  ))}
                </div>
              ) : savedCount > 0 ? (
                <a className="by-saved" href="/marketplace">
                  <b>{savedCount}</b> {t.savedOnDevice} <span>{t.viewInMarketplace}</span>
                </a>
              ) : (
                <div className="by-empty sm">{t.nothingSaved} <a href="/marketplace">{t.browseTheMarketplace}</a> {t.tapSave}</div>
              )}
            </section>

            {/* NXT-assisted intake requests */}
            <section className="by-sec">
              <div className="by-sechead"><h2>{t.yourRequests} {requests.length > 0 && <small className="by-cnt">{requests.length}</small>}</h2><a className="by-link" href="/intake">{t.newRequest}</a></div>
              {requests.length === 0 ? (
                <EmptyAction size="sm" icon={<Inbox strokeWidth={1.75} />} title={t.noRequestsYet} hint={t.noRequestsHint} actionLabel={t.describeWhatYouNeed} actionHref="/intake" />
              ) : (
                <div className="by-list">
                  {requests.map((r) => (
                    <div className="by-card" key={r.id}>
                      <div className="by-top">
                        <span className="by-status">{REQUEST_LABEL[r.status || ''] || r.status || t.received}</span>
                        <b>{r.category || t.request}</b>
                        <small>{fmtDate(r.created_at)}</small>
                        <span className="by-ref">{r.public_ref}</span>
                      </div>
                      {r.problem && <p className="by-msg">{r.problem}</p>}
                      <div className="by-meta">
                        {r.location && <span>{r.location}</span>}
                        {r.urgency && <span>{t.urgency}: {r.urgency}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Self-service marketplace quote requests */}
            <section className="by-sec" id="quotes">
              <div className="by-sechead"><h2>{t.quoteRequests} {quotes.length > 0 && <small className="by-cnt">{quotes.length}</small>}</h2><a className="by-link" href="/marketplace">{t.browseListings}</a></div>
              {quotes.length === 0 ? (
                <EmptyAction size="sm" icon={<PackageSearch strokeWidth={1.75} />} title={t.noQuoteRequestsYet} hint={t.noQuoteRequestsHint} actionLabel={t.browseTheMarketplace} actionHref="/marketplace" />
              ) : (
                <div className="by-list">
                  {quotes.map((q) => (
                    <div className="by-card" key={q.id}>
                      <div className="by-top">
                        <span className={'by-status ' + (q.status === 'responded' ? 'resp' : '')}>{QUOTE_LABEL[q.status] || q.status}</span>
                        {(q.product_id || q.service_id) ? (
                          <a className="by-listinglink" href={`/marketplace/${q.kind}/${q.product_id || q.service_id}`}><b>{q.listing_name || (q.kind === 'service' ? t.serviceRequest : t.productRequest)}</b></a>
                        ) : (
                          <b>{q.listing_name || (q.kind === 'service' ? t.serviceRequest : t.productRequest)}</b>
                        )}
                        <small>{fmtDate(q.created_at)}</small>
                        <span className="by-ref">{q.public_ref}</span>
                      </div>
                      {/* Bundled request (quote cart): every item, one vendor quote */}
                      {(q.answers?.items?.length || 0) > 0 && (
                        <div className="by-bundle">
                          <b>
                            {t.bundlePrefix} · {q.answers!.items!.length} {q.answers!.items!.length === 1 ? t.bundleItem : t.bundleItems}
                          </b>
                          <ul>
                            {q.answers!.items!.map((it) => (
                              <li key={it.listing_id}>
                                <span className="by-bqty">{it.qty}×</span> {it.name}
                                {it.note ? <em> — {it.note}</em> : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {q.message && <p className="by-msg">{q.message}</p>}
                      {/* Message the vendor — inside NXT//LINK */}
                      <div className="by-chat">
                        {chatFor === q.id ? (
                          <div className="by-chatbox">
                            <div className="by-chatlist" ref={chatListRef}>
                              {chatMsgs.length === 0 && <div className="by-chatempty">{t.noMessagesVendor}</div>}
                              {chatMsgs.map((m) => (
                                <div key={m.id} className={'by-bubble ' + (m.sender === 'buyer' ? 'me' : 'them')}>
                                  {m.body}
                                  <small>{new Date(m.created_at).toLocaleString(dateLocale)}</small>
                                </div>
                              ))}
                            </div>
                            <div className="by-chatrow">
                              <input value={chatInput} placeholder={t.messageVendorPh} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendChat(q.id); }} />
                              <button className="by-accept" disabled={chatBusy || !chatInput.trim()} onClick={() => sendChat(q.id)}>{t.send}</button>
                              <button className="by-decline" onClick={() => setChatFor(null)}>{t.close}</button>
                            </div>
                            {q.buyer_decision !== 'accepted' && <p className="by-guardnote">{t.guardChat}</p>}
                          </div>
                        ) : (
                          <button className="by-chatopen" onClick={() => openChat(q.id)}>{t.messageVendor}</button>
                        )}
                      </div>
                      {(q.pilots || []).length > 0 && (
                        <div className="by-pilots">
                          {(q.pilots || []).map((p, i) => (
                            <div className="by-pilot" key={i}>
                              <span className="by-pkind">{PILOT_KIND_LABEL[p.kind] || p.kind.replace('_', ' ')}</span>
                              <span className="by-pstatus">{PILOT_STATUS_LABEL[p.status] || p.status.replace('_', ' ')}</span>
                              {p.scheduled_for && <small>{new Date(p.scheduled_for).toLocaleString(dateLocale)}</small>}
                              {p.location && <small>· {p.location}</small>}
                              {p.outcome && <span className={'by-poutcome ' + p.outcome}>{PILOT_OUTCOME_LABEL[p.outcome] || p.outcome}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {q.quote_amount != null && (
                        <div className="by-quote">
                          <div className="by-qhead">{t.quoteReceived} <b>{money(q.quote_amount)}</b>{q.quote_timeline ? ` · ${q.quote_timeline}` : ''}</div>
                          {q.quote_message && <p className="by-qmsg">{q.quote_message}</p>}
                          {q.quote_valid_until && <div className="by-qvalid">{fmtValidUntil(q.quote_valid_until)}</div>}
                          {q.buyer_decision ? (
                            <div className={'by-decided ' + q.buyer_decision}>{q.buyer_decision === 'accepted' ? t.youAccepted : t.youDeclined}</div>
                          ) : (
                            <>
                              <div className="by-qactions">
                                <button className="by-accept" onClick={() => decide(q.id, 'accepted')}>{t.accept} {money(q.quote_amount)}</button>
                                <button className="by-decline" onClick={() => decide(q.id, 'declined')}>{t.decline}</button>
                              </div>
                              <p className="by-guardnote">{t.guardAccept}</p>
                            </>
                          )}
                          {q.buyer_decision === 'accepted' && (
                            q.reviewed ? (
                              <div className="by-reviewed">{t.reviewedVendor}</div>
                            ) : reviewOpen === q.id ? (
                              <div className="by-rvform">
                                <div className="by-stars">
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <button key={n} type="button" className={n <= rv.rating ? 'on' : ''} onClick={() => setRv({ ...rv, rating: n })} aria-label={`${n} star${n > 1 ? 's' : ''}`}>★</button>
                                  ))}
                                </div>
                                <input placeholder={t.titleOptional} value={rv.title} onChange={(e) => setRv({ ...rv, title: e.target.value })} />
                                <textarea rows={2} placeholder={t.howDidItGo} value={rv.body} onChange={(e) => setRv({ ...rv, body: e.target.value })} />
                                <div className="by-rvactions">
                                  <button className="by-accept" disabled={rvBusy} onClick={() => submitReview(q.id)}>{rvBusy ? t.saving : t.submitReview}</button>
                                  <button className="by-decline" onClick={() => setReviewOpen(null)}>{t.cancel}</button>
                                </div>
                              </div>
                            ) : (
                              <button className="by-rvopen" onClick={() => { setRv({ rating: 5, title: '', body: '' }); setReviewOpen(q.id); }}>{t.leaveReview}</button>
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
                {t.noActivity} <a href="/marketplace">{t.browsingMarketplace}</a> {t.or} <a href="/intake">{t.describingNeed}</a>.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

const ATTENTION_CSS = `
.by-attn{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:14px 0 6px;padding:12px 16px;border-radius:12px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);}
.by-attn b{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#FBBF24;}
.by-attn span{font-size:13.5px;color:#EDEDEF;}
.by-attn a{margin-left:auto;font-size:13px;font-weight:700;color:#FBBF24;text-decoration:none;}
`;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
.by{min-height:100vh;background:#0A0A0F;color:#F0F0F5;font-family:'Outfit',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.by *{box-sizing:border-box;}
.by-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(10,10,15,.85);backdrop-filter:blur(20px);z-index:20;}
.by-brand{display:flex;align-items:baseline;gap:10px;color:#F0F0F5;text-decoration:none;}
.by-brand b{font-size:17px;}.by-brand i{color:#A78BFA;font-style:normal;}
.by-brand span{color:#8080A0;font-size:13px;}
.by-navlinks{display:flex;gap:18px;align-items:center;}
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
.by-cnt{font-size:11.5px;font-weight:700;color:#C4B5FD;background:rgba(124,92,252,.14);border-radius:99px;padding:2px 9px;margin-left:7px;vertical-align:2px;}
.by-bell{position:relative;font-family:inherit;font-size:13.5px;font-weight:600;color:#C4B5FD;background:rgba(124,92,252,.1);border:1px solid rgba(124,92,252,.35);border-radius:99px;padding:7px 14px;cursor:pointer;}
.by-refresh{background:none;border:none;cursor:pointer;font-family:inherit;}
.by-belldot{margin-left:7px;background:#EF4444;color:#fff;font-size:11px;font-weight:800;border-radius:99px;padding:1px 7px;}
.by-notifs{background:#12121B;border:1px solid rgba(124,92,252,.3);border-radius:14px;padding:16px 18px;margin:14px 0 6px;}
.by-notifhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.by-notifhead b{font-size:14.5px;}
.by-notifhead button{background:none;border:none;color:#8080A0;font:inherit;font-size:12.5px;cursor:pointer;}
.by-notifempty{color:#8080A0;font-size:13.5px;margin:4px 0;}
.by-notifs ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px;max-height:280px;overflow-y:auto;}
.by-notifs li{display:flex;justify-content:space-between;gap:12px;padding:9px 10px;border-radius:9px;font-size:13.5px;color:#C0C0D0;}
.by-notifs li.unread{background:rgba(124,92,252,.08);color:#F0F0F5;font-weight:500;}
.by-notifs li small{color:#8080A0;white-space:nowrap;}
.by-listinglink{text-decoration:none;color:inherit;}
.by-listinglink:hover b{color:#C4B5FD;}
.by-list{display:flex;flex-direction:column;gap:14px;}
.by-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px 18px;}
.by-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.by-top b{font-size:15px;}
.by-top small{color:#8080A0;font-size:12.5px;}
.by-ref{margin-left:auto;color:#505068;font-size:12px;}
.by-status{font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:4px 9px;border-radius:99px;background:rgba(124,92,252,.15);color:#C4B5FD;}
.by-status.resp{background:rgba(52,211,153,.12);color:#34D399;}
.by-msg{margin:12px 0 0;font-size:14px;color:#D5D4E0;line-height:1.6;background:#111118;border-radius:10px;padding:11px 13px;white-space:pre-wrap;}
.by-bundle{margin-top:12px;background:rgba(124,92,252,.06);border:1px solid rgba(124,92,252,.25);border-radius:12px;padding:12px 14px;}
.by-bundle b{font-size:12.5px;color:#C4B5FD;}
.by-bundle ul{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:5px;}
.by-bundle li{font-size:13.5px;color:#D5D4E0;line-height:1.5;}
.by-bundle li em{font-style:normal;color:#8080A0;}
.by-bqty{display:inline-block;min-width:30px;font-weight:700;color:#C4B5FD;}
.by-meta{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:#9090A8;margin-top:10px;}
.by-savedgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;}
.by-saveditem{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:11px 14px;color:#D5D4E0;text-decoration:none;font-size:13.5px;}
.by-saveditem:hover{border-color:rgba(124,92,252,.5);color:#F0F0F5;}
.by-saveditem i{font-style:normal;font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 7px;border-radius:99px;background:rgba(124,92,252,.15);color:#C4B5FD;flex-shrink:0;}
.by-saveditem i.service{background:rgba(52,211,153,.12);color:#34D399;}
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
.by-guardnote{margin:9px 0 0;font-size:11.5px;color:#8080A0;line-height:1.5;}
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
