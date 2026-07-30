'use client';

// Buyer dashboard: the signed-in buyer's marketplace footprint — intake
// requests (NXT-assisted) and marketplace quote/service requests (self-service),
// matched server-side to their verified email, plus saved listings (localStorage).
// Fully EN/ES via the shared LanguageToggle/useLang pattern (see /cart).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import LanguageToggle, { useLang, type Lang } from '@/components/LanguageToggle';
import { PackageSearch, Inbox, Lightbulb, MessageCircle, Paperclip, Download, X, Store, Eye } from 'lucide-react';
import { EmptyAction, EMPTY_ACTION_CSS } from '@/components/marketplace/EmptyAction';
import { useChatPolling, resolvePendingMessage, dropPendingMessage, type ChatMessage } from '@/components/marketplace/useChatPolling';
import { type CompareTableRow } from '@/components/marketplace/QuoteCompareTable';
import { QuoteCompareDeck, QUOTE_COMPARE_DECK_CSS, type DeckLabels } from '@/components/marketplace/QuoteCompareDeck';
import { OfferCard, OFFER_CARD_CSS, type OfferCardLabels, OFFER_CARD_LABELS_ES, DEFAULT_OFFER_CARD_LABELS } from '@/components/marketplace/OfferCard';
import { DealTracker, DEAL_TRACKER_CSS, type DealTrackerLabels, DEAL_TRACKER_LABELS_ES, DEFAULT_DEAL_TRACKER_LABELS } from '@/components/marketplace/DealTracker';
import { groupQuotesForCompare, describeAcceptedDeal } from '@/lib/buyer/compare';
import { computeRequestActivity, isRequestStale, linkedQuotes, deriveRequestStage, type RequestStage } from '@/lib/buyer/requestStats';
import { buildOfferTimeline, offerRevisionsForThread, type OfferRevisionInput, type LegacyOfferSource } from '@/lib/messages/offerTimeline';
import { buildThreadTimeline, latestOffer } from '@/lib/messages/threadTimeline';
import { deriveDealMilestone } from '@/lib/messages/dealTracker';
import {
  ALLOWED_ATTACHMENT_EXTENSIONS, MAX_ATTACHMENTS_PER_MESSAGE, formatFileSize,
  validateAttachmentBatch,
} from '@/lib/messages/attachments';

// Design System v1.0 reskin (Premium Polish Phase 2, 2026-07-23): light
// warm-white + violet, matching the marketplace/buyer-facing pages. Visual/CSS
// only — every handler, state, and the chat polling hook below are unchanged.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-buyer',
  display: 'swap',
});

interface IntakeRequest {
  id: string; public_ref: string; category: string | null; problem: string | null;
  location: string | null; urgency: string | null; status: string | null;
  pipeline_stage: string | null; created_at: string;
}
interface QuoteRequest {
  id: string; public_ref: string; kind: string; listing_name: string | null;
  vendor_name?: string | null;
  product_id?: string | null; service_id?: string | null;
  company: string | null; message: string | null; status: string; created_at: string;
  quote_amount?: number | null; quote_currency?: string | null; quote_message?: string | null;
  quote_timeline?: string | null; quote_valid_until?: string | null; quoted_at?: string | null;
  quote_payment_terms?: string | null; quote_warranty?: string | null;
  buyer_decision?: string | null; reviewed?: boolean;
  updated_at?: string | null;
  answers?: { request_type?: string; bundle?: boolean; source_request?: string | null; items?: Array<{ listing_id: string; kind: string; name: string; qty: number; note?: string }> } | null;
  pilots?: Array<{ kind: string; status: string; scheduled_for: string | null; location: string | null; scope: string | null; outcome: string | null }>;
}
interface DashboardData {
  signed_in: boolean; email_verified?: boolean; email?: string | null;
  requests?: IntakeRequest[]; quotes?: QuoteRequest[];
}

// Same convention as QuoteCompareTable.money(): honor the quote's own currency
// (vendors can quote MXN), fall back safely if the stored code is invalid.
const money = (n: number, currency?: string | null) => {
  try {
    return n.toLocaleString('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 });
  } catch {
    return `$${n.toLocaleString()}`;
  }
};

const T: Record<Lang, Record<string, string>> = {
  en: {
    dashboardTag: 'Dashboard', alerts: 'Alerts', refresh: 'Refresh',
    browseMarketplace: 'Browse marketplace', describeNeed: 'Describe a need', myProfile: 'My profile', account: 'Account',
    yourDashboard: 'Your dashboard', signedInAs: 'Signed in as',
    notifications: 'Notifications', close: 'Close', notifEmpty: 'Nothing yet — you’ll see quotes, messages, and pilot updates here.',
    loading: 'Loading…', signInFirst: 'Sign in to see your requests —', goToSignIn: 'go to sign in',
    loadError: "Couldn't load your dashboard — check your connection and try again.", retry: 'Try again',
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
    // Request activity stats (Slice RV, 2026-07-29) — real computed numbers
    // from the vendor leads this request already spawned, never invented.
    sentToPrefix: 'Sent to', vendorSingular: 'vendor', vendorsPlural: 'vendors',
    quoteReceivedWord: 'quote received', quotesReceivedWord: 'quotes received',
    viewedByPrefix: 'Viewed by', lastActivityPrefix: 'Last activity',
    relJustNow: 'just now', relMinAgo: '{n} min ago', relHourAgo: '{n}h ago', relDayAgo: '{n}d ago',
    reviewingRequest: "We're still finding vendors for this request.",
    noQuotesYetHint: "No quotes yet — we'll notify you as soon as one arrives.",
    teachExpect: "Here's what a quote will look like:",
    exampleBadge: 'Example', sampleVendorName: 'Vendor name', samplePrice: '$4,200',
    sampleTimeline: '2–3 weeks', sampleWarranty: '1-year warranty',
    // Aggregate pipeline pill for the buyer's original request card (Slice RV,
    // item 4) — derived from its linked quotes' real statuses, never a raw
    // stored value (client_requests.status never updates after creation).
    pipelineSent: 'Sent', pipelineViewed: 'Viewed', pipelineQuotesReceived: 'Quotes received',
    pipelineAccepted: 'Accepted', pipelineClosed: 'Closed',
    bundlePrefix: 'Bundle', bundleItem: 'item', bundleItems: 'items',
    noMessagesVendor: 'No messages yet — ask the vendor anything.', messageVendorPh: 'Message the vendor…', send: 'Send', sendingMsg: 'Sending…',
    guardChat: 'For your protection, contact details are hidden in chat until you accept a quote — keep the conversation on NXT//LINK.',
    messageVendor: 'Message vendor', newMessageHint: 'New message', live: 'Live',
    attachFile: 'Attach a file', attachFileTitle: 'Attach specs, drawings, or a PO', removeFile: 'Remove file',
    uploadingFiles: 'Uploading…', downloadFile: 'Download',
    attachHint: `PDF, PNG, JPG, WEBP, XLSX, CSV, DWG, DXF · up to 10 MB · up to ${MAX_ATTACHMENTS_PER_MESSAGE} files`,
    attachContentsWarning: 'Files are shared as-is — contact details inside a document are not hidden until you accept.',
    no_files: 'Choose at least one file.',
    too_many_files: `You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`,
    file_empty: 'That file is empty.',
    file_too_large: 'That file is too large — max 10 MB per file.',
    file_type_not_allowed: 'That file type isn’t supported. Allowed: PDF, PNG, JPG, WEBP, XLSX, CSV, DWG, DXF.',
    attachSendError: 'Could not send the attachment — please try again.',
    pkDemo: 'Demo', pkPilot: 'Pilot', pkSiteVisit: 'Site visit',
    psProposed: 'Proposed', psScheduled: 'Scheduled', psInProgress: 'In progress', psCompleted: 'Completed', psCancelled: 'Cancelled',
    poPassed: 'Passed', poFailed: 'Failed', poInconclusive: 'Inconclusive',
    quoteReceived: 'Quote received:',
    validUntil: 'Valid until', expiresToday: 'expires today', dayLeft: 'day left', daysLeft: 'days left', expired: 'Expired',
    youAccepted: 'You accepted this quote', youDeclined: 'You declined this quote',
    accept: 'Accept —', decline: 'Decline',
    guardAccept: 'Accepting doesn’t charge you anything — it connects you with the vendor to finalize the deal on your terms.',
    // Side-by-side comparison (FIX 1)
    cmpTitle: 'Compare quotes', cmpVendor: 'Vendor', cmpQuote: 'Quote', cmpTimeline: 'Timeline',
    cmpValidUntil: 'Valid until', cmpStatus: 'Status', cmpLowest: 'Lowest', cmpAwaiting: 'Awaiting',
    cmpReceived: 'Received', cmpAccepted: 'Accepted', cmpSort: 'Sort', cmpPriceAsc: 'Price ↑',
    cmpPriceDesc: 'Price ↓', cmpAz: 'A–Z',
    cmpNote: 'Lowest price isn’t always the best value — weigh timeline and fit. Contact details stay hidden until you accept.',
    cmpFor: 'Comparing quotes for the same request',
    cmpPaymentTerms: 'Payment terms', cmpWarranty: 'Warranty',
    // R4 comparison card deck (design addendum #1)
    cmpDiffOnly: 'Show differences only', cmpCardsView: 'Cards', cmpTableView: 'Table', cmpBestValue: 'Best value',
    // Post-accept "what happens next" (FIX 2)
    dealInProgress: 'Deal in progress', connectedWith: 'You’re connected with',
    nextContactUnlocked: 'Contact details are now unlocked in your chat — you can share your phone and email with the vendor.',
    nextContinueChat: 'Continue the conversation with the vendor here on NXT//LINK.',
    nextTracked: 'NXT//LINK is keeping this deal on record for you — no extra steps needed.',
    continueInChat: 'Continue in chat',
    decideError: 'Could not save your decision — please try again.',
    reviewedVendor: '✓ You reviewed this vendor',
    titleOptional: 'Title (optional)', howDidItGo: 'How did it go? (optional)',
    submitReview: 'Submit review', saving: 'Saving…', cancel: 'Cancel', leaveReview: 'Leave a review',
    firstRunTitle: 'What do you need today?',
    firstRunCard1Title: 'I’m looking for a specific product or service',
    firstRunCard1Hint: 'Search the marketplace — products and services from verified Borderplex vendors.',
    firstRunCard1Cta: 'Search the marketplace',
    firstRunCard2Title: 'I need help figuring out what I need — let suppliers propose solutions',
    firstRunCard2Hint: 'Describe your problem once — NXT//LINK matches vendors and they quote you.',
    firstRunBrowseLink: 'Just browsing? Explore categories',
    startSellTitle: 'Want to sell on NXT//LINK?',
    startSellHint: 'Set up your company storefront with a short application. Our team reviews and approves every vendor.',
    startSellCta: 'Start selling',
    docTitle: 'My dashboard — NXT//LINK',
    kindProduct: 'product', kindService: 'service',
  },
  es: {
    dashboardTag: 'Panel', alerts: 'Alertas', refresh: 'Actualizar',
    browseMarketplace: 'Explorar marketplace', describeNeed: 'Describir una necesidad', myProfile: 'Mi perfil', account: 'Cuenta',
    yourDashboard: 'Tu panel', signedInAs: 'Sesión iniciada como',
    notifications: 'Notificaciones', close: 'Cerrar', notifEmpty: 'Nada por aquí todavía — verás cotizaciones, mensajes y actualizaciones de pilotos aquí.',
    loading: 'Cargando…', signInFirst: 'Inicia sesión para ver tus solicitudes —', goToSignIn: 'ir a iniciar sesión',
    loadError: 'No se pudo cargar tu panel — revisa tu conexión e inténtalo de nuevo.', retry: 'Intentar de nuevo',
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
    // Estadísticas de actividad de la solicitud (Slice RV, 2026-07-29) — cifras
    // reales calculadas de las solicitudes a proveedores ya generadas, nunca inventadas.
    sentToPrefix: 'Enviada a', vendorSingular: 'proveedor', vendorsPlural: 'proveedores',
    quoteReceivedWord: 'cotización recibida', quotesReceivedWord: 'cotizaciones recibidas',
    viewedByPrefix: 'Vista por', lastActivityPrefix: 'Última actividad',
    relJustNow: 'justo ahora', relMinAgo: 'hace {n} min', relHourAgo: 'hace {n} h', relDayAgo: 'hace {n} d',
    reviewingRequest: 'Todavía estamos buscando proveedores para esta solicitud.',
    noQuotesYetHint: 'Aún no hay cotizaciones — te avisaremos en cuanto llegue una.',
    teachExpect: 'Así se verá una cotización:',
    exampleBadge: 'Ejemplo', sampleVendorName: 'Nombre del proveedor', samplePrice: '$4,200',
    sampleTimeline: '2–3 semanas', sampleWarranty: 'Garantía de 1 año',
    pipelineSent: 'Enviada', pipelineViewed: 'Vista', pipelineQuotesReceived: 'Cotizaciones recibidas',
    pipelineAccepted: 'Aceptada', pipelineClosed: 'Cerrada',
    bundlePrefix: 'Paquete', bundleItem: 'artículo', bundleItems: 'artículos',
    noMessagesVendor: 'Aún no hay mensajes — pregúntale algo al proveedor.', messageVendorPh: 'Mensaje para el proveedor…', send: 'Enviar', sendingMsg: 'Enviando…',
    guardChat: 'Para tu protección, los datos de contacto se ocultan en el chat hasta que aceptes una cotización — mantén la conversación en NXT//LINK.',
    messageVendor: 'Mensaje al proveedor', newMessageHint: 'Mensaje nuevo', live: 'En vivo',
    attachFile: 'Adjuntar un archivo', attachFileTitle: 'Adjunta especificaciones, planos u orden de compra', removeFile: 'Quitar archivo',
    uploadingFiles: 'Subiendo…', downloadFile: 'Descargar',
    attachHint: `PDF, PNG, JPG, WEBP, XLSX, CSV, DWG, DXF · hasta 10 MB · hasta ${MAX_ATTACHMENTS_PER_MESSAGE} archivos`,
    attachContentsWarning: 'Los archivos se comparten tal cual — los datos de contacto dentro de un documento no se ocultan hasta que aceptes.',
    no_files: 'Elige al menos un archivo.',
    too_many_files: `Puedes adjuntar hasta ${MAX_ATTACHMENTS_PER_MESSAGE} archivos por mensaje.`,
    file_empty: 'Ese archivo está vacío.',
    file_too_large: 'Ese archivo es demasiado grande — máximo 10 MB por archivo.',
    file_type_not_allowed: 'Ese tipo de archivo no es compatible. Permitidos: PDF, PNG, JPG, WEBP, XLSX, CSV, DWG, DXF.',
    attachSendError: 'No se pudo enviar el archivo adjunto — inténtalo de nuevo.',
    pkDemo: 'Demo', pkPilot: 'Piloto', pkSiteVisit: 'Visita al sitio',
    psProposed: 'Propuesto', psScheduled: 'Programado', psInProgress: 'En progreso', psCompleted: 'Completado', psCancelled: 'Cancelado',
    poPassed: 'Aprobado', poFailed: 'Fallido', poInconclusive: 'No concluyente',
    quoteReceived: 'Cotización recibida:',
    validUntil: 'Válido hasta', expiresToday: 'vence hoy', dayLeft: 'día restante', daysLeft: 'días restantes', expired: 'Venció',
    youAccepted: 'Aceptaste esta cotización', youDeclined: 'Rechazaste esta cotización',
    accept: 'Aceptar —', decline: 'Rechazar',
    guardAccept: 'Aceptar no te cobra nada — te conecta con el proveedor para cerrar el trato en tus términos.',
    // Comparación lado a lado (FIX 1)
    cmpTitle: 'Comparar cotizaciones', cmpVendor: 'Proveedor', cmpQuote: 'Cotización', cmpTimeline: 'Tiempo',
    cmpValidUntil: 'Válido hasta', cmpStatus: 'Estado', cmpLowest: 'Más baja', cmpAwaiting: 'Pendiente',
    cmpReceived: 'Recibida', cmpAccepted: 'Aceptada', cmpSort: 'Ordenar', cmpPriceAsc: 'Precio ↑',
    cmpPriceDesc: 'Precio ↓', cmpAz: 'A–Z',
    cmpNote: 'El precio más bajo no siempre es la mejor opción — considera el tiempo y la compatibilidad. Los datos de contacto quedan ocultos hasta que aceptas.',
    cmpFor: 'Comparando cotizaciones de la misma solicitud',
    cmpPaymentTerms: 'Términos de pago', cmpWarranty: 'Garantía',
    cmpDiffOnly: 'Mostrar solo diferencias', cmpCardsView: 'Tarjetas', cmpTableView: 'Tabla', cmpBestValue: 'Mejor valor',
    // Qué sigue después de aceptar (FIX 2)
    dealInProgress: 'Trato en progreso', connectedWith: 'Estás conectado con',
    nextContactUnlocked: 'Los datos de contacto ya están desbloqueados en tu chat — puedes compartir tu teléfono y correo con el proveedor.',
    nextContinueChat: 'Continúa la conversación con el proveedor aquí en NXT//LINK.',
    nextTracked: 'NXT//LINK mantiene este trato registrado para ti — sin pasos adicionales.',
    continueInChat: 'Continuar en el chat',
    decideError: 'No se pudo guardar tu decisión — inténtalo de nuevo.',
    reviewedVendor: '✓ Reseñaste a este proveedor',
    titleOptional: 'Título (opcional)', howDidItGo: '¿Cómo te fue? (opcional)',
    submitReview: 'Enviar reseña', saving: 'Guardando…', cancel: 'Cancelar', leaveReview: 'Dejar una reseña',
    firstRunTitle: '¿Qué necesitas hoy?',
    firstRunCard1Title: 'Busco un producto o servicio específico',
    firstRunCard1Hint: 'Explora el marketplace — productos y servicios de proveedores verificados del Borderplex.',
    firstRunCard1Cta: 'Buscar en el marketplace',
    firstRunCard2Title: 'Necesito ayuda para saber qué necesito — que los proveedores propongan soluciones',
    firstRunCard2Hint: 'Describe tu problema una vez — NXT//LINK conecta proveedores y ellos te cotizan.',
    firstRunBrowseLink: '¿Solo estás explorando? Explora las categorías',
    startSellTitle: '¿Quieres vender en NXT//LINK?',
    startSellHint: 'Crea el escaparate de tu empresa con una solicitud breve. Nuestro equipo revisa y aprueba a cada proveedor.',
    startSellCta: 'Empezar a vender',
    docTitle: 'Mi panel — NXT//LINK',
    kindProduct: 'producto', kindService: 'servicio',
  },
};

export default function BuyerDashboardPage() {
  const [lang, setLang] = useLang(); // stored `nxt_lang` — shared across marketplace pages
  const t = T[lang];
  const dateLocale = lang === 'es' ? 'es-MX' : 'en-US';
  const QUOTE_LABEL: Record<string, string> = { new: t.statusSent, viewed: t.statusSeenByVendor, responded: t.statusVendorResponding, won: t.statusClosed, lost: t.statusClosed, spam: t.statusClosed };
  // Slice RV item 4 — the aggregate pipeline pill for a buyer's ORIGINAL
  // request card, derived (never stored) from its linked quotes' real
  // statuses via src/lib/buyer/requestStats.deriveRequestStage.
  const STAGE_LABEL: Record<RequestStage, string> = {
    sent: t.pipelineSent, viewed: t.pipelineViewed, quotes_received: t.pipelineQuotesReceived,
    accepted: t.pipelineAccepted, closed: t.pipelineClosed,
  };
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
  // "2h ago" / "hace 2 h" — a real elapsed-time readout for the request
  // activity line (Slice RV), fully bilingual via the T dict (not a
  // hardcoded word swap — Spanish "hace" leads, English "ago" trails).
  const fmtRelative = (s: string) => {
    try {
      const ms = Date.now() - new Date(s).getTime();
      if (!Number.isFinite(ms) || ms < 0) return '';
      const mins = Math.floor(ms / 60000);
      if (mins < 1) return t.relJustNow;
      if (mins < 60) return t.relMinAgo.replace('{n}', String(mins));
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return t.relHourAgo.replace('{n}', String(hrs));
      const days = Math.floor(hrs / 24);
      return t.relDayAgo.replace('{n}', String(days));
    } catch { return ''; }
  };

  const [checking, setChecking] = useState(true);
  const [data, setData] = useState<DashboardData>({ signed_in: false });
  // A genuine fetch/network/server failure is NOT the same as a confirmed
  // "you're signed out" — /api/buyer/dashboard always answers 200 with an
  // explicit signed_in:true/false (never a bare 401), so a thrown exception
  // or a non-OK response here means we don't actually know the auth state.
  // Conflating the two would tell a signed-in buyer hitting a network blip
  // to "sign in first," which is misleading — show a distinct retry state.
  const [loadError, setLoadError] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [reviewOpen, setReviewOpen] = useState<string | null>(null);
  const [rv, setRv] = useState({ rating: 5, title: '', body: '' });
  const [rvBusy, setRvBusy] = useState(false);
  const [chatFor, setChatFor] = useState<string | null>(null);
  const [chatMsgs, setChatMsgs] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [attachFiles, setAttachFiles] = useState<File[]>([]);
  const [attachBusy, setAttachBusy] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const chatListRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatListRef.current?.scrollTo({ top: chatListRef.current.scrollHeight }); }, [chatMsgs, chatFor]);
  // R4 offer-in-chat + pinned deal tracker — the open thread's proposal
  // revision history + real "has the buyer seen it" / commission signal,
  // both returned inline by GET /api/buyer/messages alongside the messages
  // it already fetched (src/app/api/buyer/messages/route.ts). Refreshed on
  // open AND on every chat poll tick (see useChatPolling's onData below) so
  // a revision the vendor just sent shows up without a page reload.
  const [offerProposals, setOfferProposals] = useState<OfferRevisionInput[]>([]);
  const [offerCtx, setOfferCtx] = useState<{
    buyerDecision: string | null;
    buyerHasSeenOffer: boolean;
    commission: { invoice_number?: string | null; status?: string | null } | null;
    legacy: LegacyOfferSource;
  } | null>(null);
  const offerCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  function applyOfferData(data: Record<string, unknown>) {
    const proposals = (data.proposals as OfferRevisionInput[] | undefined) || [];
    setOfferProposals(proposals);
    const offer = data.offer as {
      buyer_decision: string | null; buyer_has_seen_offer: boolean;
      commission: { invoice_number?: string | null; status?: string | null } | null;
      legacy: LegacyOfferSource;
    } | null;
    if (offer) {
      setOfferCtx({
        buyerDecision: offer.buyer_decision, buyerHasSeenOffer: offer.buyer_has_seen_offer,
        commission: offer.commission, legacy: offer.legacy,
      });
    }
  }
  // Auto-refresh the open thread only — polls the existing GET /messages
  // endpoint (no Supabase browser-realtime; that needs new RLS, out of scope).
  useChatPolling(chatFor, '/api/buyer/messages', setChatMsgs, 4000, applyOfferData);
  const [savedItems, setSavedItems] = useState<Array<{ listing_id: string; kind: string; name: string | null }>>([]);
  const [notifs, setNotifs] = useState<Array<{ id: string; title: string; read_at: string | null; created_at: string; type?: string; quote_request_id?: string | null }>>([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decideError, setDecideError] = useState<{ id: string; message: string } | null>(null);
  // Cheap unread-chat hint: reuses the notifications already fetched on load
  // (no extra API call) — a quote request has an unread message if there's
  // an unread 'message' notification pointing at it.
  const unreadChatIds = useMemo(
    () => new Set(notifs.filter((n) => !n.read_at && n.type === 'message' && n.quote_request_id).map((n) => n.quote_request_id as string)),
    [notifs],
  );
  // FIX 1 — cluster quotes into "same need" groups so competing quotes for one
  // open RFQ show side by side. Self-service (single-listing) quotes are
  // singletons and degrade to the normal single-quote card view. Grouping key
  // is answers.source_request (set by src/lib/requests/dispatch.ts).
  const compareGroups = useMemo(
    () => groupQuotesForCompare(
      (data.quotes || []).map((q) => ({ ...q, sourceRequest: q.answers?.source_request ?? null })),
    ).filter((g) => g.comparable),
    [data.quotes],
  );
  // M1 dedup fix — a quote already shown as a row in the compare table above
  // must not ALSO restate its price + timeline headline in the full card
  // below (the exact "$X · timeline" repeat is what read as the same quote
  // twice). Everything else on the card — status, message, chat, bundle,
  // pilots, accept/decline, expiry countdown, review — stays untouched: none
  // of that lives in the table, and every quote (grouped or not) still needs
  // its own Accept/Decline reachable from exactly one place.
  const comparedQuoteIds = useMemo(
    () => new Set(compareGroups.flatMap((g) => g.quotes.map((q) => q.id))),
    [compareGroups],
  );
  async function toggleNotifs() {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next && notifUnread > 0) {
      await fetch('/api/buyer/notifications', { method: 'POST' });
      setNotifUnread(0);
    }
  }

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await fetch('/api/buyer/dashboard');
      if (!res.ok) { setLoadError(true); return; }
      const json = (await res.json()) as DashboardData;
      setData(json);
      const n = await fetch('/api/buyer/notifications').then((r) => r.json()).catch(() => null);
      if (n?.ok) { setNotifs(n.notifications || []); setNotifUnread(n.unread || 0); }
      const sv = await fetch('/api/buyer/saved').then((r) => r.json()).catch(() => null);
      if (sv?.ok && sv.signed_in) setSavedItems(sv.items || []);
    } catch {
      setLoadError(true);
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
    if (decidingId) return;
    setDecidingId(id);
    setDecideError(null);
    // Optimistic paint for snappy feedback, but we only keep it if the server
    // confirms — on any failure (bad response or thrown error) we revert to
    // the prior quotes and surface a clear EN/ES error instead of a false
    // "accepted"/"declined" state (audit findings #4/#7/#8).
    let prevQuotes: QuoteRequest[] | undefined;
    setData((d) => {
      prevQuotes = d.quotes;
      return { ...d, quotes: (d.quotes || []).map((q) => (q.id === id ? { ...q, buyer_decision: decision, status: decision === 'accepted' ? 'won' : 'lost' } : q)) };
    });
    try {
      const res = await fetch('/api/buyer/quote-decision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quote_request_id: id, decision }) });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setData((d) => ({ ...d, quotes: prevQuotes ?? d.quotes }));
        setDecideError({ id, message: t.decideError });
      }
    } catch {
      setData((d) => ({ ...d, quotes: prevQuotes ?? d.quotes }));
      setDecideError({ id, message: t.decideError });
    } finally {
      setDecidingId(null);
    }
  }
  async function openChat(id: string) {
    setChatFor(id); setChatMsgs([]); setChatInput(''); setAttachFiles([]); setAttachError(null);
    setOfferProposals([]); setOfferCtx(null);
    // Clear the local unread hint for this thread right away — the server
    // side "all read" only happens via the bell (no per-thread mark-read
    // endpoint), so this is a same-session visual clear, not persisted.
    setNotifs((ns) => ns.map((n) => (n.quote_request_id === id && n.type === 'message' && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)));
    const res = await fetch(`/api/buyer/messages?quote_request_id=${id}`);
    const data = await res.json();
    if (data.ok) { setChatMsgs(data.messages || []); applyOfferData(data); }
  }
  // R4 — jump the (internally-scrolling) chat list to the latest offer card,
  // reduced-motion safe. Used by both the pinned DealTracker and the "See
  // the offer" hint when accept/decline moved into the in-chat card.
  function jumpToLatestOffer(id: string) {
    const el = offerCardRefs.current[id];
    if (!el) return;
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  }
  function attachErrorText(code?: string, fallback?: string): string {
    return (code && (t as Record<string, string>)[code]) || fallback || t.attachSendError;
  }
  function handleAttachSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-picking the same file later
    if (chosen.length === 0) return;
    const combined = [...attachFiles, ...chosen];
    const validation = validateAttachmentBatch(combined.map((f) => ({ name: f.name, size: f.size })));
    if (!validation.ok) {
      setAttachError(attachErrorText(validation.error.code, validation.error.message));
      return;
    }
    setAttachError(null);
    setAttachFiles(combined);
  }
  function removeAttachFile(index: number) {
    setAttachFiles((fs) => fs.filter((_, i) => i !== index));
  }
  async function sendChat(id: string) {
    const text = chatInput.trim();
    const files = attachFiles;
    if ((!text && files.length === 0) || chatBusy || attachBusy) return;
    setChatInput('');
    setAttachFiles([]);
    setAttachError(null);
    // Optimistic bubble — appears immediately; the poll's dedupe-by-id means
    // it's never double-rendered once the server round-trip / next poll lands.
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tempAttachments = files.map((f, i) => ({ id: `${tempId}-${i}`, file_name: f.name, file_type: f.type || null, size_bytes: f.size, url: null }));
    setChatMsgs((m) => [...m, { id: tempId, sender: 'buyer', body: text, created_at: new Date().toISOString(), pending: true, attachments: tempAttachments }]);

    if (files.length === 0) {
      setChatBusy(true);
      try {
        const res = await fetch('/api/buyer/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quote_request_id: id, body: text }) });
        const data = await res.json();
        if (data.ok) {
          setChatMsgs((m) => resolvePendingMessage(m, tempId, data.message));
        } else {
          setChatMsgs((m) => dropPendingMessage(m, tempId));
          setChatInput(text);
        }
      } catch {
        setChatMsgs((m) => dropPendingMessage(m, tempId));
        setChatInput(text);
      }
      setChatBusy(false);
      return;
    }

    setAttachBusy(true);
    try {
      const fd = new FormData();
      fd.append('quote_request_id', id);
      fd.append('body', text);
      for (const f of files) fd.append('file', f);
      const res = await fetch('/api/buyer/messages', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.ok) {
        setChatMsgs((m) => resolvePendingMessage(m, tempId, data.message));
      } else {
        setChatMsgs((m) => dropPendingMessage(m, tempId));
        setChatInput(text);
        setAttachFiles(files);
        setAttachError(attachErrorText(data.code, data.message));
      }
    } catch {
      setChatMsgs((m) => dropPendingMessage(m, tempId));
      setChatInput(text);
      setAttachFiles(files);
      setAttachError(t.attachSendError);
    }
    setAttachBusy(false);
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
  // Localized column labels for the shared comparison table (no fee column on
  // the buyer dashboard — feeIfWon is unused here).
  const cmpLabels: DeckLabels = {
    title: t.cmpTitle, vendor: t.cmpVendor, quote: t.cmpQuote, timeline: t.cmpTimeline,
    validUntil: t.cmpValidUntil, feeIfWon: '', paymentTerms: t.cmpPaymentTerms, warranty: t.cmpWarranty,
    status: t.cmpStatus, lowest: t.cmpLowest,
    awaiting: t.cmpAwaiting, received: t.cmpReceived, accepted: t.cmpAccepted, sort: t.cmpSort,
    priceAsc: t.cmpPriceAsc, priceDesc: t.cmpPriceDesc, az: t.cmpAz, note: t.cmpNote,
    showDifferencesOnly: t.cmpDiffOnly, cardsView: t.cmpCardsView, tableView: t.cmpTableView, bestValue: t.cmpBestValue,
  };
  const offerLabels: OfferCardLabels = lang === 'es' ? OFFER_CARD_LABELS_ES : DEFAULT_OFFER_CARD_LABELS;
  const trackerLabels: DealTrackerLabels = lang === 'es' ? DEAL_TRACKER_LABELS_ES : DEFAULT_DEAL_TRACKER_LABELS;

  return (
    <div className={`by ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS + EMPTY_ACTION_CSS + ATTENTION_CSS + FIRSTRUN_CSS + QUOTE_COMPARE_DECK_CSS + OFFER_CARD_CSS + DEAL_TRACKER_CSS }} />
      <nav className="by-nav">
        <a className="by-brand" href="/"><b>NXT<i>{'//'}</i>LINK</b><span>{t.dashboardTag}</span></a>
        <div className="by-navlinks">
          <button className="by-bell" onClick={toggleNotifs} aria-label={t.notifications}>
            {t.alerts}{notifUnread > 0 && <span className="by-belldot">{notifUnread}</span>}
          </button>
          <button className="by-link by-refresh" onClick={() => { setChecking(true); load(); }} aria-label="Refresh">{t.refresh}</button>
          <a className="by-link" href="/marketplace">{t.browseMarketplace}</a>
          <a className="by-link" href="/intake">{t.describeNeed}</a>
          <a className="by-link" href="/buyer/profile">{t.myProfile}</a>
          <a className="by-link" href="/account">{t.account}</a>
          <LanguageToggle lang={lang} onChange={setLang} variant="light" />
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
        ) : loadError ? (
          <div className="by-empty">
            {t.loadError}<br />
            <button className="by-rvopen" onClick={() => { setChecking(true); load(); }}>{t.retry}</button>
          </div>
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
            {/* Saved listings — account-level, follow the buyer across devices.
                Shown whenever there's real saved data, or once the buyer has
                other activity; a brand-new buyer with nothing saved gets the
                first-run prompt below instead of an empty saved-items box. */}
            {(hasActivity || savedItems.length > 0 || savedCount > 0) && (
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
            )}

            {/* First-run buyer (no request/quote activity yet): one clear choice
                instead of a wall of empty widgets. Once there's any activity,
                the normal requests + quotes dashboard below takes over. */}
            {!hasActivity && <FirstRunPrompt t={t} />}

            {hasActivity && (
              <>
            {/* NXT-assisted intake requests */}
            <section className="by-sec">
              <div className="by-sechead"><h2>{t.yourRequests} {requests.length > 0 && <small className="by-cnt">{requests.length}</small>}</h2><a className="by-link" href="/intake">{t.newRequest}</a></div>
              {requests.length === 0 ? (
                <EmptyAction size="sm" icon={<Inbox strokeWidth={1.75} />} title={t.noRequestsYet} hint={t.noRequestsHint} actionLabel={t.describeWhatYouNeed} actionHref="/intake" />
              ) : (
                <div className="by-list">
                  {requests.map((r) => {
                    // Slice RV: real, already-derivable activity for THIS
                    // request — every quote_requests row the fan-out
                    // (src/lib/requests/dispatch.ts) or a vendor's self-claim
                    // (api/vendor/open-requests) created for it, matched by
                    // the shared answers.source_request = this public_ref.
                    // No new data source, no schema change.
                    const activity = computeRequestActivity(r, quotes);
                    const stale = isRequestStale(r, activity);
                    const stage = deriveRequestStage(linkedQuotes(r.public_ref, quotes));
                    return (
                    <div className="by-card" key={r.id}>
                      <div className="by-top">
                        <span className={'by-status ' + (stage === 'quotes_received' || stage === 'accepted' ? 'resp' : '')}>{STAGE_LABEL[stage]}</span>
                        <b>{r.category || t.request}</b>
                        <small>{fmtDate(r.created_at)}</small>
                        <span className="by-ref">{r.public_ref}</span>
                      </div>
                      {r.problem && <p className="by-msg">{r.problem}</p>}
                      <div className="by-meta">
                        {r.location && <span>{r.location}</span>}
                        {r.urgency && <span>{t.urgency}: {r.urgency}</span>}
                      </div>
                      <div className="by-activity">
                        <span className="by-actstat">
                          {t.sentToPrefix} <b>{activity.sentTo}</b> {activity.sentTo === 1 ? t.vendorSingular : t.vendorsPlural}
                        </span>
                        <span className="by-actstat">
                          <b>{activity.quotesReceived}</b> {activity.quotesReceived === 1 ? t.quoteReceivedWord : t.quotesReceivedWord}
                        </span>
                        {activity.viewedBy > 0 && (
                          <span className="by-actstat">
                            <Eye size={12} strokeWidth={2} aria-hidden="true" /> {t.viewedByPrefix} <b>{activity.viewedBy}</b>
                          </span>
                        )}
                        {activity.lastActivityAt && (
                          <span className="by-actstat by-acttime">{t.lastActivityPrefix} · {fmtRelative(activity.lastActivityAt)}</span>
                        )}
                      </div>
                      {activity.sentTo === 0 && <p className="by-actnote">{t.reviewingRequest}</p>}
                      {stale && <NoQuotesYetTeaching t={t} />}
                    </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Self-service marketplace quote requests */}
            <section className="by-sec" id="quotes">
              <div className="by-sechead"><h2>{t.quoteRequests} {quotes.length > 0 && <small className="by-cnt">{quotes.length}</small>}</h2><a className="by-link" href="/marketplace">{t.browseListings}</a></div>
              {quotes.length === 0 ? (
                <EmptyAction size="sm" icon={<PackageSearch strokeWidth={1.75} />} title={t.noQuoteRequestsYet} hint={t.noQuoteRequestsHint} actionLabel={t.browseTheMarketplace} actionHref="/marketplace" />
              ) : (
                <>
                {/* FIX 1 — side-by-side comparison for any need with 2+ priced quotes */}
                {compareGroups.map((g) => (
                  <div className="by-cmpgroup" key={g.key}>
                    <div className="by-cmpcaption">{t.cmpFor}{g.sourceRequest ? ` · ${g.sourceRequest}` : ''}</div>
                    <QuoteCompareDeck
                      labels={cmpLabels}
                      locale={dateLocale}
                      rows={g.quotes.map((q): CompareTableRow => ({
                        id: q.id,
                        vendor: q.vendor_name || t.cmpVendor,
                        amount: q.quote_amount ?? null,
                        currency: q.quote_currency,
                        timeline: q.quote_timeline,
                        validUntil: q.quote_valid_until,
                        paymentTerms: q.quote_payment_terms,
                        warranty: q.quote_warranty,
                        status: q.buyer_decision === 'accepted' ? 'accepted' : q.quote_amount != null ? 'received' : 'awaiting',
                        ref: q.public_ref,
                      }))}
                      renderActions={(row) => {
                        const q = g.quotes.find((qq) => qq.id === row.id);
                        if (!q || q.buyer_decision || q.quote_amount == null) return null;
                        return (
                          <>
                            <button className="by-accept" disabled={decidingId === q.id} onClick={() => decide(q.id, 'accepted')}>{decidingId === q.id ? t.saving : `${t.accept} ${money(q.quote_amount, q.quote_currency)}`}</button>
                            <button className="by-decline" disabled={decidingId === q.id} onClick={() => decide(q.id, 'declined')}>{t.decline}</button>
                          </>
                        );
                      }}
                    />
                  </div>
                ))}
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
                        {q.vendor_name && <span className="by-vendorname">{q.vendor_name}</span>}
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
                      {/* Slice RV: same calm, honest "no quotes yet" hint as the
                          intake requests above — no SLA claim, just real elapsed
                          time vs. whether a quote actually arrived. */}
                      {q.quote_amount == null && isRequestStale({ created_at: q.created_at }, { quotesReceived: 0 }) && (
                        <NoQuotesYetTeaching t={t} />
                      )}
                      {/* Message the vendor — inside NXT//LINK */}
                      <div className="by-chat">
                        {chatFor === q.id ? (() => {
                          // R4 offer-in-chat + pinned deal tracker — merge
                          // this thread's structured proposal history (or the
                          // legacy single-quote fallback for pre-R3 leads)
                          // with the plain chat messages into one
                          // chronological timeline. See
                          // src/lib/messages/offerTimeline.ts /
                          // threadTimeline.ts / dealTracker.ts for the pure
                          // derivation logic (fully unit-tested).
                          const legacySource: LegacyOfferSource = offerCtx?.legacy || {
                            id: q.id, quote_amount: q.quote_amount ?? null, quote_currency: q.quote_currency ?? null,
                            quote_timeline: q.quote_timeline ?? null, quote_valid_until: q.quote_valid_until ?? null,
                            quote_payment_terms: q.quote_payment_terms ?? null, quote_warranty: q.quote_warranty ?? null,
                            quote_message: q.quote_message ?? null, quoted_at: q.quoted_at ?? null, created_at: q.created_at,
                          };
                          const buyerDecision = offerCtx?.buyerDecision ?? q.buyer_decision ?? null;
                          const offerCards = buildOfferTimeline(
                            offerRevisionsForThread(offerProposals, legacySource),
                            { buyerDecision, buyerHasSeenOffer: offerCtx?.buyerHasSeenOffer ?? false },
                          );
                          const timeline = buildThreadTimeline(chatMsgs, offerCards);
                          const latest = latestOffer(offerCards);
                          const milestone = deriveDealMilestone({
                            quoteAmount: latest?.total ?? null, hasRevision: offerCards.length > 1,
                            buyerDecision, commission: offerCtx?.commission ?? null,
                          });
                          return (
                          <div className="by-chatbox">
                            <div className="by-chathead">
                              <span>{t.messageVendor}</span>
                              <span className="by-live" aria-hidden="true"><i />{t.live}</span>
                            </div>
                            <DealTracker
                              milestone={milestone}
                              currentPrice={latest?.total ?? null}
                              currentCurrency={latest?.currency}
                              locale={dateLocale}
                              labels={trackerLabels}
                              onJumpToOffer={() => latest && jumpToLatestOffer(latest.id)}
                            />
                            <div className="by-chatlist" ref={chatListRef}>
                              {timeline.length === 0 && <div className="by-chatempty">{t.noMessagesVendor}</div>}
                              {timeline.map((item) => item.kind === 'offer' ? (
                                <OfferCard
                                  key={`offer-${item.offer.id}`}
                                  card={item.offer}
                                  labels={offerLabels}
                                  locale={dateLocale}
                                  cardRef={(el) => { offerCardRefs.current[item.offer.id] = el; }}
                                  actions={item.offer.isLatest && !buyerDecision && item.offer.total != null ? (
                                    <>
                                      <button className="by-accept" disabled={decidingId === q.id} onClick={() => decide(q.id, 'accepted')}>{decidingId === q.id ? t.saving : `${t.accept} ${money(item.offer.total, item.offer.currency)}`}</button>
                                      <button className="by-decline" disabled={decidingId === q.id} onClick={() => decide(q.id, 'declined')}>{t.decline}</button>
                                    </>
                                  ) : undefined}
                                />
                              ) : (
                                <div key={item.message.id} className={'by-bubble ' + (item.message.sender === 'buyer' ? 'me' : 'them') + (item.message.pending ? ' pending' : '')}>
                                  {item.message.body && <div>{item.message.body}</div>}
                                  {(item.message.attachments || []).length > 0 && (
                                    <div className="by-attachlist">
                                      {(item.message.attachments || []).map((a) => (
                                        a.url ? (
                                          <a key={a.id} className="by-attachitem" href={a.url} target="_blank" rel="noreferrer" title={t.downloadFile}>
                                            <Paperclip size={11} strokeWidth={2} aria-hidden="true" />
                                            <span className="by-attachname">{a.file_name}</span>
                                            <small>{formatFileSize(a.size_bytes)}</small>
                                            <Download size={11} strokeWidth={2} aria-hidden="true" />
                                          </a>
                                        ) : (
                                          <span key={a.id} className="by-attachitem is-pending">
                                            <Paperclip size={11} strokeWidth={2} aria-hidden="true" />
                                            <span className="by-attachname">{a.file_name}</span>
                                            <small>{formatFileSize(a.size_bytes)}</small>
                                          </span>
                                        )
                                      ))}
                                    </div>
                                  )}
                                  <small>{item.message.pending ? t.sendingMsg : new Date(item.message.created_at).toLocaleString(dateLocale)}</small>
                                </div>
                              ))}
                            </div>
                            {attachFiles.length > 0 && (
                              <div className="by-attachchips">
                                {attachFiles.map((f, i) => (
                                  <span className="by-attachchip" key={`${f.name}-${i}`}>
                                    <span className="by-attachname">{f.name}</span>
                                    <small>{formatFileSize(f.size)}</small>
                                    <button type="button" onClick={() => removeAttachFile(i)} aria-label={t.removeFile}><X size={11} strokeWidth={2.5} aria-hidden="true" /></button>
                                  </span>
                                ))}
                              </div>
                            )}
                            {attachError && <p className="by-attacherr">{attachError}</p>}
                            <div className="by-chatrow">
                              <input
                                ref={attachInputRef} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true"
                                accept={ALLOWED_ATTACHMENT_EXTENSIONS.map((e) => `.${e}`).join(',')}
                                onChange={handleAttachSelect}
                              />
                              <button type="button" className="by-attachbtn" title={t.attachFileTitle} aria-label={t.attachFile} disabled={attachBusy || chatBusy} onClick={() => attachInputRef.current?.click()}>
                                <Paperclip size={16} strokeWidth={2} aria-hidden="true" />
                              </button>
                              <label className="sr-only" htmlFor={`by-chat-${q.id}`}>{t.messageVendorPh}</label>
                              <input id={`by-chat-${q.id}`} value={chatInput} placeholder={t.messageVendorPh} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendChat(q.id); }} />
                              <button className="by-accept" disabled={chatBusy || attachBusy || (!chatInput.trim() && attachFiles.length === 0)} onClick={() => sendChat(q.id)}>{attachBusy ? t.uploadingFiles : t.send}</button>
                              <button className="by-decline" onClick={() => setChatFor(null)}>{t.close}</button>
                            </div>
                            <p className="by-attachhint">{t.attachHint}</p>
                            {q.buyer_decision !== 'accepted' && <p className="by-attachhint by-attachwarn">{t.attachContentsWarning}</p>}
                            {q.buyer_decision !== 'accepted' && <p className="by-guardnote">{t.guardChat}</p>}
                          </div>
                          );
                        })() : (
                          <button className="by-chatopen" onClick={() => openChat(q.id)}>
                            <MessageCircle size={14} strokeWidth={2} aria-hidden="true" />
                            {t.messageVendor}
                            {unreadChatIds.has(q.id) && <span className="by-chatdot" aria-hidden="true" />}
                            {unreadChatIds.has(q.id) && <span className="sr-only">{t.newMessageHint}</span>}
                          </button>
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
                          {/* M1: already shown as this quote's row in the compare table above — don't restate it here. */}
                          {!comparedQuoteIds.has(q.id) && (
                            <div className="by-qhead">{t.quoteReceived} <b>{money(q.quote_amount, q.quote_currency)}</b>{q.quote_timeline ? ` · ${q.quote_timeline}` : ''}</div>
                          )}
                          {q.quote_message && <p className="by-qmsg">{q.quote_message}</p>}
                          {q.quote_valid_until && <div className="by-qvalid">{fmtValidUntil(q.quote_valid_until)}</div>}
                          {q.buyer_decision ? (
                            q.buyer_decision === 'accepted' ? (() => {
                              // FIX 2 — the honest "what happens next" in the commission
                              // model: you're connected, contact is unlocked in chat,
                              // the deal is on record. No payment/escrow step exists.
                              const deal = describeAcceptedDeal(q)!;
                              return (
                                <div className="by-nextpanel">
                                  <div className="by-npttitle">{t.dealInProgress}</div>
                                  {q.vendor_name && <p className="by-nptsub">{t.connectedWith} <b>{q.vendor_name}</b></p>}
                                  <div className="by-nptterms">
                                    {deal.amount != null && <span>{money(deal.amount)}</span>}
                                    {deal.timeline && <span>{deal.timeline}</span>}
                                    {deal.validUntil && <span>{fmtValidUntil(deal.validUntil)}</span>}
                                  </div>
                                  <ul className="by-nptsteps">
                                    <li>{t.nextContactUnlocked}</li>
                                    <li>{t.nextContinueChat}</li>
                                    <li>{t.nextTracked}</li>
                                  </ul>
                                  <button className="by-nptcta" onClick={() => openChat(q.id)}>
                                    <MessageCircle size={14} strokeWidth={2} aria-hidden="true" />{t.continueInChat}
                                  </button>
                                </div>
                              );
                            })() : (
                              <div className="by-decided declined">{t.youDeclined}</div>
                            )
                          ) : (
                            <>
                              <div className="by-qactions">
                                <button className="by-accept" disabled={decidingId === q.id} onClick={() => decide(q.id, 'accepted')}>{decidingId === q.id ? t.saving : `${t.accept} ${money(q.quote_amount, q.quote_currency)}`}</button>
                                <button className="by-decline" disabled={decidingId === q.id} onClick={() => decide(q.id, 'declined')}>{decidingId === q.id ? t.saving : t.decline}</button>
                              </div>
                              <p className="by-guardnote">{t.guardAccept}</p>
                              {decideError?.id === q.id && <p className="by-decideerr" role="alert">{decideError.message}</p>}
                            </>
                          )}
                          {q.buyer_decision === 'accepted' && (
                            q.reviewed ? (
                              <div className="by-reviewed">{t.reviewedVendor}</div>
                            ) : reviewOpen === q.id ? (
                              <div className="by-rvform">
                                <div className="by-stars">
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <button key={n} type="button" className={n <= rv.rating ? 'on' : ''} onClick={() => setRv({ ...rv, rating: n })} aria-label={lang === 'es' ? `${n} estrella${n > 1 ? 's' : ''}` : `${n} star${n > 1 ? 's' : ''}`}>★</button>
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
                </>
              )}
            </section>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// Slice RV — design addendum item 7 (2026-07-29): the "0 quotes yet" moment
// is a teaching state, not a dead end. A calm illustration + the honest
// no-SLA copy ("we'll notify you as soon as one arrives" — never a promised
// response time) plus an OPTIONAL sample quote card, unmistakably marked
// Example/Ejemplo (never real data — see design charter's "no fake stats"
// rule, satisfied here because the badge makes it explicit this is a
// template, not a claim). Reduced-motion safe by construction: nothing here
// animates.
function NoQuotesYetTeaching({ t }: { t: Record<string, string> }) {
  return (
    <div className="by-teach">
      <svg className="by-teachsvg" width="64" height="48" viewBox="0 0 120 84" aria-hidden="true" focusable="false">
        <rect x="14" y="30" width="92" height="40" rx="10" fill="#EFEDF5" stroke="#E2DFEC" />
        <rect x="24" y="14" width="92" height="40" rx="10" fill="#fff" stroke="#E2DFEC" strokeWidth="1.5" />
        <rect x="34" y="26" width="48" height="6" rx="3" fill="#D7D3E6" />
        <rect x="34" y="38" width="72" height="6" rx="3" fill="#EDEBF6" />
        <rect x="34" y="48" width="30" height="8" rx="4" fill="#A99DF2" />
        <circle cx="98" cy="20" r="3" fill="#6C5CE0" />
      </svg>
      <div className="by-teachbody">
        <p className="by-teachhint">{t.noQuotesYetHint}</p>
        <span className="by-teachexpect">{t.teachExpect}</span>
        <div className="by-teachsample">
          <span className="by-teachbadge">{t.exampleBadge}</span>
          <div className="by-teachrow"><span>{t.sampleVendorName}</span><b>{t.samplePrice}</b></div>
          <div className="by-teachmeta">{t.sampleTimeline} · {t.sampleWarranty}</div>
        </div>
      </div>
    </div>
  );
}

function FirstRunPrompt({ t }: { t: Record<string, string> }) {
  return (
    <div className="by-firstrun">
      <h2>{t.firstRunTitle}</h2>
      {/* Card 2 ("help me figure out what I need" -> /intake) removed
          2026-07-28 per Cesar: open-ended requests belong later in the
          journey, and with a young catalog they have nowhere to route.
          Buyers land on the specific-search path only.
          2026-07-29 (Cesar): the slot now holds "Start selling" — signup no
          longer asks buyer-vs-vendor, so selling starts HERE (OfferUp/Alibaba
          pattern: plain signup, a visible sell entry, review before live). */}
      <div className="by-frcards">
        <a href="/marketplace" className="by-frcard">
          <span className="by-fricon"><PackageSearch size={18} strokeWidth={1.75} /></span>
          <b>{t.firstRunCard1Title}</b>
          <p>{t.firstRunCard1Hint}</p>
          <span className="by-frcta">{t.firstRunCard1Cta} →</span>
        </a>
        <a href="/apply" className="by-frcard">
          <span className="by-fricon"><Store size={18} strokeWidth={1.75} /></span>
          <b>{t.startSellTitle}</b>
          <p>{t.startSellHint}</p>
          <span className="by-frcta">{t.startSellCta} →</span>
        </a>
      </div>
    </div>
  );
}

const FIRSTRUN_CSS = `
.by-firstrun{margin:24px 0 8px;text-align:center;}
.by-firstrun h2{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:21px;font-weight:700;letter-spacing:-.01em;margin:0 0 20px;color:var(--spec-ink,#141320);}
.by-frcards{display:grid;grid-template-columns:1fr 1fr;gap:14px;text-align:left;}
@media(max-width:620px){.by-frcards{grid-template-columns:1fr;}}
.by-frcard{display:flex;flex-direction:column;gap:7px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:16px;padding:20px;color:var(--spec-ink,#141320);text-decoration:none;transition:border-color .15s,transform .15s,box-shadow .15s;}
.by-frcard:hover{border-color:var(--spec-violet,#6C5CE0);transform:translateY(-2px);box-shadow:0 8px 20px rgba(20,19,32,.08);}
.by-fricon{width:36px;height:36px;border-radius:10px;background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);display:grid;place-items:center;margin-bottom:2px;}
.by-frcard b{font-size:15px;font-weight:700;line-height:1.35;}
.by-frcard p{color:var(--spec-text-2nd,#615F72);font-size:12.5px;line-height:1.55;margin:0;flex:1;}
.by-frcta{color:var(--spec-violet-deep,#4A3DB0);font-size:12.5px;font-weight:700;}
.by-frbrowse{display:inline-block;margin-top:20px;color:var(--spec-text-2nd,#615F72);font-size:13px;text-decoration:underline;}
.by-frbrowse:hover{color:var(--spec-ink,#141320);}
`;

const ATTENTION_CSS = `
.by-attn{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:14px 0 6px;padding:12px 16px;border-radius:12px;background:#FBF3E7;border:1px solid #EFD9AE;}
.by-attn b{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--spec-warning,#C68A28);}
.by-attn span{font-size:13.5px;color:var(--spec-ink,#141320);}
.by-attn a{margin-left:auto;font-size:13px;font-weight:700;color:#8A5D14;text-decoration:none;}
`;

const CSS = `
.by{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-buyer),'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;}
.by *{box-sizing:border-box;}
.by a:focus-visible,.by button:focus-visible,.by input:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.by-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid var(--spec-border,#E2DFEC);position:sticky;top:0;background:rgba(248,247,251,.92);backdrop-filter:blur(20px);z-index:20;}
.by-brand{display:flex;align-items:baseline;gap:10px;color:var(--spec-ink,#141320);text-decoration:none;}
.by-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:17px;font-weight:700;letter-spacing:-.01em;}.by-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}
.by-brand span{color:var(--spec-text-2nd,#615F72);font-size:13px;}
.by-navlinks{display:flex;gap:18px;align-items:center;}
.by-link{color:var(--spec-violet-deep,#4A3DB0);font-size:13.5px;font-weight:600;text-decoration:none;white-space:nowrap;}
.by-link:hover{color:var(--spec-violet,#6C5CE0);}
.by-wrap{max-width:760px;margin:0 auto;padding:36px 20px 100px;}
.by-wrap h1{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:28px;font-weight:700;letter-spacing:-.01em;}
.by-sub{color:var(--spec-text-2nd,#615F72);font-size:14px;margin:6px 0 8px;}
.by-empty{text-align:center;color:var(--spec-text-2nd,#615F72);padding:60px 0;line-height:1.7;}
.by-empty.sm{padding:26px 0;font-size:14px;}
.by-empty small{color:#706D88;font-size:12.5px;}
.by-empty a{color:var(--spec-violet-deep,#4A3DB0);}
.by-sec{margin-top:34px;}
.by-sechead{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;border-bottom:1px solid var(--spec-border,#E2DFEC);padding-bottom:8px;}
.by-sechead h2{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:16px;font-weight:700;letter-spacing:-.01em;}
.by-cnt{font-size:11.5px;font-weight:700;color:var(--spec-violet-deep,#4A3DB0);background:rgba(108,92,224,.1);border-radius:99px;padding:2px 9px;margin-left:7px;vertical-align:2px;}
.by-bell{position:relative;font-family:inherit;font-size:13.5px;font-weight:600;color:var(--spec-violet-deep,#4A3DB0);background:rgba(108,92,224,.08);border:1px solid rgba(108,92,224,.3);border-radius:99px;padding:7px 14px;cursor:pointer;}
.by-refresh{background:none;border:none;cursor:pointer;font-family:inherit;}
.by-belldot{margin-left:7px;background:var(--spec-error,#CE4B43);color:#fff;font-size:11px;font-weight:800;border-radius:99px;padding:1px 7px;}
.by-notifs{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:14px;padding:16px 18px;margin:14px 0 6px;box-shadow:0 8px 24px rgba(20,19,32,.08);}
.by-notifhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.by-notifhead b{font-size:14.5px;}
.by-notifhead button{background:none;border:none;color:var(--spec-text-2nd,#615F72);font:inherit;font-size:12.5px;cursor:pointer;}
.by-notifempty{color:var(--spec-text-2nd,#615F72);font-size:13.5px;margin:4px 0;}
.by-notifs ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px;max-height:280px;overflow-y:auto;}
.by-notifs li{display:flex;justify-content:space-between;gap:12px;padding:9px 10px;border-radius:9px;font-size:13.5px;color:var(--spec-ink,#141320);}
.by-notifs li.unread{background:rgba(108,92,224,.06);font-weight:600;}
.by-notifs li small{color:var(--spec-text-2nd,#615F72);white-space:nowrap;}
.by-listinglink{text-decoration:none;color:inherit;}
.by-listinglink:hover b{color:var(--spec-violet-deep,#4A3DB0);}
.by-list{display:flex;flex-direction:column;gap:14px;}
.by-card{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:16px;padding:16px 18px;}
.by-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.by-top b{font-size:15px;}
.by-top small{color:var(--spec-text-2nd,#615F72);font-size:12.5px;}
.by-ref{margin-left:auto;color:#706D88;font-size:12px;}
.by-status{font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:4px 9px;border-radius:99px;background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);}
.by-status.resp{background:#E9F7F0;color:#1F7A54;}
.by-msg{margin:12px 0 0;font-size:14px;color:var(--spec-ink,#141320);line-height:1.6;background:var(--spec-surface,#EFEDF5);border-radius:10px;padding:11px 13px;white-space:pre-wrap;}
.by-bundle{margin-top:12px;background:rgba(108,92,224,.05);border:1px solid rgba(108,92,224,.22);border-radius:12px;padding:12px 14px;}
.by-bundle b{font-size:12.5px;color:var(--spec-violet-deep,#4A3DB0);}
.by-bundle ul{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:5px;}
.by-bundle li{font-size:13.5px;color:var(--spec-ink,#141320);line-height:1.5;}
.by-bundle li em{font-style:normal;color:var(--spec-text-2nd,#615F72);}
.by-bqty{display:inline-block;min-width:30px;font-weight:700;color:var(--spec-violet-deep,#4A3DB0);}
.by-meta{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--spec-text-2nd,#615F72);margin-top:10px;}
/* Slice RV — request activity stats (real computed numbers, big-value/small-label) */
.by-activity{display:flex;gap:6px 14px;flex-wrap:wrap;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid var(--spec-border,#E2DFEC);font-size:12.5px;color:var(--spec-text-2nd,#615F72);}
.by-actstat{display:inline-flex;align-items:center;gap:4px;}
.by-actstat b{color:var(--spec-violet-deep,#4A3DB0);font-weight:700;font-variant-numeric:tabular-nums;}
.by-actstat svg{color:#706D88;flex-shrink:0;}
.by-acttime{color:#706D88;}
.by-actnote{margin:9px 0 0;font-size:12.5px;color:var(--spec-text-2nd,#615F72);line-height:1.5;}
/* Slice RV — "0 quotes yet" teaching state (design addendum item 7) */
.by-teach{display:flex;gap:14px;align-items:flex-start;margin-top:12px;padding:14px 16px;border-radius:12px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);box-shadow:0 4px 12px rgba(124,58,237,.08);}
.by-teachsvg{flex:none;}
.by-teachbody{flex:1;min-width:0;}
.by-teachhint{margin:0 0 10px;font-size:13px;color:var(--spec-ink,#141320);line-height:1.5;}
.by-teachexpect{display:block;margin:0 0 6px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8A87A0;}
.by-teachsample{position:relative;border:1px dashed #C7C2DE;border-radius:10px;padding:11px 12px;background:var(--spec-surface,#EFEDF5);}
.by-teachbadge{position:absolute;top:-9px;right:10px;font-size:9.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;background:#fff;border:1px solid #C7C2DE;color:#706D88;border-radius:99px;padding:2px 8px;}
.by-teachrow{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:13px;color:#706D88;}
.by-teachrow b{color:var(--spec-ink,#141320);font-size:14px;font-weight:700;}
.by-teachmeta{margin-top:5px;font-size:11.5px;color:#8A87A0;}
@media(max-width:480px){.by-teach{flex-direction:column;}}
.by-savedgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;}
.by-saveditem{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:12px;padding:11px 14px;color:var(--spec-ink,#141320);text-decoration:none;font-size:13.5px;}
.by-saveditem:hover{border-color:var(--spec-violet,#6C5CE0);}
.by-saveditem i{font-style:normal;font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 7px;border-radius:99px;background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);flex-shrink:0;}
.by-saveditem i.service{background:#E9F7F0;color:#1F7A54;}
.by-saved{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:14px;padding:12px 16px;color:var(--spec-ink,#141320);text-decoration:none;font-size:14px;}
.by-saved b{font-size:18px;color:var(--spec-violet-deep,#4A3DB0);}
.by-saved span{color:var(--spec-text-2nd,#615F72);font-size:13px;}
.by-saved:hover{border-color:var(--spec-violet,#6C5CE0);}
.by-quote{margin-top:12px;background:var(--spec-surface,#EFEDF5);border:1px solid rgba(108,92,224,.25);border-radius:12px;padding:13px 15px;}
.by-qhead{font-size:14.5px;color:var(--spec-ink,#141320);}
.by-qhead b{color:var(--spec-violet-deep,#4A3DB0);font-size:16px;}
.by-qmsg{margin:9px 0 0;font-size:13.5px;color:var(--spec-ink,#141320);line-height:1.55;white-space:pre-wrap;}
.by-qvalid{margin-top:8px;font-size:12.5px;color:var(--spec-text-2nd,#615F72);}
.by-qactions{display:flex;gap:9px;margin-top:12px;}
.by-accept{font-family:inherit;font-size:13.5px;font-weight:700;background:var(--spec-success,#2F9E6A);border:none;color:#fff;border-radius:9px;padding:9px 16px;cursor:pointer;min-height:40px;}
.by-accept:hover{background:#248059;}
.by-accept:disabled,.by-decline:disabled{opacity:.6;cursor:not-allowed;}
.by-decline{font-family:inherit;font-size:13px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-ink,#141320);border-radius:9px;padding:9px 14px;cursor:pointer;min-height:40px;}
.by-decline:hover{border-color:#C7C2DE;}
.by-decided{margin-top:10px;font-size:13px;font-weight:700;text-transform:capitalize;}
.by-decided.accepted{color:var(--spec-success,#2F9E6A);}
.by-decided.declined{color:var(--spec-error,#CE4B43);}
.by-vendorname{font-size:12px;font-weight:600;color:var(--spec-violet-deep,#4A3DB0);background:rgba(108,92,224,.08);border-radius:99px;padding:2px 9px;}
.by-cmpgroup{margin-bottom:16px;}
.by-cmpcaption{font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--spec-text-2nd,#615F72);margin:0 0 8px 2px;}
/* FIX 2 — post-accept "what happens next" panel */
.by-nextpanel{margin-top:12px;background:#F3FAF6;border:1px solid rgba(47,158,106,.3);border-radius:12px;padding:14px 16px;}
.by-npttitle{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#1F7A54;}
.by-nptsub{margin:6px 0 0;font-size:14px;color:var(--spec-ink,#141320);}
.by-nptsub b{font-weight:700;}
.by-nptterms{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:9px;font-size:14px;font-weight:700;color:var(--spec-ink,#141320);font-variant-numeric:tabular-nums;}
.by-nptterms span:not(:first-child){font-weight:500;color:var(--spec-text-2nd,#615F72);}
.by-nptterms span:not(:first-child)::before{content:'·';margin-right:8px;color:#B7C7BD;}
.by-nptsteps{margin:11px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px;}
.by-nptsteps li{position:relative;padding-left:20px;font-size:13px;color:var(--spec-ink,#141320);line-height:1.5;}
.by-nptsteps li::before{content:'✓';position:absolute;left:0;top:0;color:var(--spec-success,#2F9E6A);font-weight:800;font-size:12px;}
.by-nptcta{margin-top:13px;display:inline-flex;align-items:center;gap:7px;font-family:inherit;font-size:13.5px;font-weight:700;background:var(--spec-success,#2F9E6A);border:none;color:#fff;border-radius:9px;padding:9px 16px;cursor:pointer;min-height:40px;}
.by-nptcta:hover{background:#248059;}
.by-chat{margin-top:11px;}
.by-chatopen{position:relative;display:inline-flex;align-items:center;gap:7px;font-family:inherit;font-size:12.5px;font-weight:600;background:#E9F7F0;border:1px solid rgba(47,158,106,.35);color:#1F7A54;border-radius:9px;padding:8px 14px;cursor:pointer;}
.by-chatdot{width:8px;height:8px;border-radius:99px;background:var(--spec-error,#CE4B43);box-shadow:0 0 0 2px #fff;}
.by-chatbox{background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:12px;padding:12px;}
.by-chathead{display:flex;justify-content:space-between;align-items:center;padding:0 2px 8px;font-size:12px;font-weight:700;color:var(--spec-ink,#141320);}
.by-live{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;letter-spacing:.04em;color:#1F7A54;text-transform:uppercase;}
.by-live i{width:6px;height:6px;border-radius:99px;background:var(--spec-success,#2F9E6A);animation:by-livepulse 1.8s ease-in-out infinite;}
@keyframes by-livepulse{0%,100%{opacity:1;}50%{opacity:.35;}}
.by-chatlist{display:flex;flex-direction:column;gap:8px;max-height:260px;overflow-y:auto;padding:4px 2px 10px;}
.by-chatempty{color:var(--spec-text-2nd,#615F72);font-size:13px;text-align:center;padding:14px 0;}
.by-bubble{max-width:82%;padding:9px 12px;border-radius:12px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;display:flex;flex-direction:column;gap:3px;}
.by-bubble small{font-size:10.5px;opacity:.65;}
.by-bubble.pending{opacity:.65;}
.by-bubble.me{align-self:flex-end;background:var(--spec-violet,#6C5CE0);color:#fff;border-bottom-right-radius:4px;}
.by-bubble.them{align-self:flex-start;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-ink,#141320);border-bottom-left-radius:4px;}
.by-chatrow{display:flex;gap:8px;}
.by-chatrow input{flex:1;font-family:inherit;font-size:14px;padding:10px 12px;border-radius:9px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;}
.by-chatrow input:focus{border-color:var(--spec-violet,#6C5CE0);box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.by-attachbtn{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;flex:none;font-family:inherit;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-text-2nd,#615F72);border-radius:9px;cursor:pointer;}
.by-attachbtn:hover{border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet,#6C5CE0);}
.by-attachbtn:disabled{opacity:.5;cursor:default;}
.by-attachhint{margin:7px 0 0;font-size:11px;color:var(--spec-text-2nd,#615F72);}
.by-attachwarn{margin-top:3px;}
.by-attacherr{margin:8px 0;font-size:12.5px;color:var(--spec-error,#CE4B43);line-height:1.5;}
.by-attachchips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;}
.by-attachchip{display:inline-flex;align-items:center;gap:6px;font-size:12px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-ink,#141320);border-radius:8px;padding:5px 8px;max-width:220px;}
.by-attachchip .by-attachname{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px;}
.by-attachchip small{color:var(--spec-text-2nd,#615F72);flex:none;}
.by-attachchip button{display:inline-flex;align-items:center;justify-content:center;background:none;border:none;color:var(--spec-text-2nd,#615F72);cursor:pointer;padding:1px;flex:none;}
.by-attachchip button:hover{color:var(--spec-error,#CE4B43);}
.by-attachlist{display:flex;flex-direction:column;gap:5px;}
.by-attachitem{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;border-radius:8px;padding:6px 9px;text-decoration:none;max-width:100%;}
.by-attachitem .by-attachname{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.by-attachitem small{opacity:.75;flex:none;}
.by-bubble.me .by-attachitem{background:rgba(255,255,255,.14);color:#fff;}
.by-bubble.me .by-attachitem:hover{background:rgba(255,255,255,.24);}
.by-bubble.them .by-attachitem{background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-ink,#141320);}
.by-bubble.them .by-attachitem:hover{border-color:var(--spec-violet,#6C5CE0);}
.by-attachitem.is-pending{opacity:.7;cursor:default;}
.by-guardnote{margin:9px 0 0;font-size:11.5px;color:var(--spec-text-2nd,#615F72);line-height:1.5;}
.by-decideerr{margin:8px 0 0;font-size:12.5px;color:var(--spec-error,#CE4B43);line-height:1.5;}
.by-pilots{margin-top:10px;display:flex;flex-direction:column;gap:7px;}
.by-pilot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:10px;padding:9px 12px;}
.by-pilot small{color:var(--spec-text-2nd,#615F72);font-size:12px;}
.by-pkind{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:3px 9px;border-radius:99px;background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);}
.by-pstatus{font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:99px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-ink,#141320);text-transform:capitalize;}
.by-poutcome{font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:99px;text-transform:capitalize;}
.by-poutcome.passed{background:#E9F7F0;color:#1F7A54;}
.by-poutcome.failed{background:#FBECEA;color:var(--spec-error,#CE4B43);}
.by-poutcome.inconclusive{background:#FBF3E7;color:var(--spec-warning,#C68A28);}
.by-reviewed{margin-top:10px;font-size:13px;color:var(--spec-success,#2F9E6A);font-weight:600;}
.by-rvopen{margin-top:10px;font-family:inherit;font-size:12.5px;font-weight:600;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-violet-deep,#4A3DB0);border-radius:9px;padding:8px 14px;cursor:pointer;}
.by-rvform{margin-top:12px;display:flex;flex-direction:column;gap:9px;}
.by-stars{display:flex;gap:3px;}
.by-stars button{background:none;border:none;font-size:24px;line-height:1;color:#D7D3E6;cursor:pointer;padding:0;}
.by-stars button.on{color:var(--spec-warning,#C68A28);}
.by-rvform input,.by-rvform textarea{font-family:inherit;font-size:14px;padding:10px 12px;border-radius:9px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;resize:vertical;}
.by-rvform input:focus,.by-rvform textarea:focus{border-color:var(--spec-violet,#6C5CE0);box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.by-rvactions{display:flex;gap:9px;}
.by-hint{margin-top:34px;color:var(--spec-text-2nd,#615F72);font-size:14px;text-align:center;line-height:1.7;}
.by-hint a{color:var(--spec-violet-deep,#4A3DB0);}
@media(max-width:640px){.by-nav{flex-wrap:wrap;row-gap:10px;}.by-navlinks{flex-wrap:wrap;row-gap:10px;gap:12px;}}
`;
