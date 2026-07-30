'use client';

// Vendor leads inbox: quote/service requests from marketplace buyers,
// scoped to the signed-in vendor's own listings. Fully EN/ES via the shared
// LanguageToggle/useLang pattern (see /cart).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-auth';
import LanguageToggle, { useLang, type Lang } from '@/components/LanguageToggle';
import VendorNav from '@/components/VendorNav';
import { Megaphone, MessageCircle, Inbox, Eye, Reply, Trophy, XCircle, Paperclip, Download, X, type LucideIcon } from 'lucide-react';
import { MatchReasons, MATCH_REASONS_CSS } from '@/components/marketplace/MatchReasons';
import { EmptyAction, EMPTY_ACTION_CSS } from '@/components/marketplace/EmptyAction';
import { calculateFee } from '@/lib/fees/engine';
import { useChatPolling, resolvePendingMessage, dropPendingMessage, type ChatMessage } from '@/components/marketplace/useChatPolling';
import {
  ALLOWED_ATTACHMENT_EXTENSIONS, MAX_ATTACHMENTS_PER_MESSAGE, formatFileSize,
  validateAttachmentBatch,
} from '@/lib/messages/attachments';
import {
  validateQuoteExtras, autoCalcProductTotal, type RequestKind, type QuoteExtras,
} from '@/lib/requests/structured';

// Design System v1.0 reskin (Premium Polish Phase 2, 2026-07-23): light
// warm-white + violet, matching the rest of the marketplace. Visual/CSS only
// — every handler, state, and the chat polling hook below are unchanged.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-leads',
  display: 'swap',
});

interface Commission {
  commission_amount: number; effective_rate: number; status: string; protected_until: string | null;
  final_amount?: number | null; invoice_number?: string | null; due_date?: string | null; paid_at?: string | null;
}
interface Pilot {
  id: string; kind: string; status: string; scheduled_for: string | null;
  location: string | null; scope: string | null; success_criteria: string | null;
  results: string | null; outcome: string | null;
}
interface BundleItem { listing_id: string; kind: string; name: string; qty: number; note?: string }
interface Lead {
  id: string; public_ref: string; kind: string; listing_name: string | null;
  company: string; contact_name: string | null; email: string | null; phone: string | null;
  contact_hidden?: boolean;
  buyer_profile?: { company_name: string | null; contact_name: string | null; position: string | null; industry: string | null; city: string | null; phone: string | null; logo_url: string | null } | null;
  message: string | null; status: string; created_at: string;
  answers?: { request_type?: string; bundle?: boolean; items?: BundleItem[] } | null;
  quote_amount?: number | null; quote_currency?: string | null; quote_message?: string | null;
  quote_timeline?: string | null; quote_valid_until?: string | null; quoted_at?: string | null;
  quote_payment_terms?: string | null; quote_warranty?: string | null; quote_extras?: QuoteExtras | null;
  buyer_decision?: string | null; commission?: Commission | null; pilots?: Pilot[];
  // Opportunity framing (Slice R3) — structured facts written at request-
  // creation time (R1) + the honest match-reason chips GET /api/vendor/leads
  // computes from real overlap only. NEVER includes budget (blind by design —
  // budget_min/budget_max are stripped server-side before this ever ships).
  request_kind?: RequestKind | null; quantity?: number | null;
  delivery_location?: string | null; preferred_timeline?: string | null;
  structured_specs?: Record<string, unknown> | null;
  match_reasons?: string[];
}

// Slice R3 — the structured quote template. One flat form covers the COMMON
// fields (every kind) + the PER-KIND extras (only the ones for the
// opportunity's own request_kind are ever sent — see buildQuoteExtras).
// All string-typed so plain <input>/<select> can bind directly; converted to
// numbers only at submit time.
interface QuoteFormState {
  total: string; totalTouched: boolean; currency: string;
  lead_time: string; valid_until: string; payment_terms: string; warranty: string; notes: string;
  unit_price: string; installation: string; training: string; shipping_cost: string;
  scope_summary: string; duration: string; team_size: string; emergency_response: string;
  license_model: string; pricing_details: string; implementation_cost: string; annual_support: string; sla_summary: string;
}
function emptyQform(): QuoteFormState {
  return {
    total: '', totalTouched: false, currency: 'USD',
    lead_time: '', valid_until: '', payment_terms: '', warranty: '', notes: '',
    unit_price: '', installation: '', training: '', shipping_cost: '',
    scope_summary: '', duration: '', team_size: '', emergency_response: '',
    license_model: '', pricing_details: '', implementation_cost: '', annual_support: '', sla_summary: '',
  };
}
const numOrNull = (v: string): number | null => (v.trim() === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);
/** Build the payload for the OPPORTUNITY's own kind only — an opportunity
 * with no request_kind (older row, pre-R1) always builds {} since there's no
 * per-kind schema to fill in yet, same rule the server validates against. */
function buildQuoteExtras(kind: RequestKind | null | undefined, f: QuoteFormState): QuoteExtras {
  if (kind === 'product') {
    return {
      unit_price: numOrNull(f.unit_price),
      installation: (f.installation || null) as QuoteExtras['installation'],
      training: (f.training || null) as QuoteExtras['training'],
      shipping_cost: numOrNull(f.shipping_cost),
    };
  }
  if (kind === 'service') {
    return {
      scope_summary: f.scope_summary.trim() || null,
      duration: f.duration.trim() || null,
      team_size: numOrNull(f.team_size),
      emergency_response: f.emergency_response.trim() || null,
    };
  }
  if (kind === 'technology') {
    return {
      license_model: (f.license_model || null) as QuoteExtras['license_model'],
      pricing_details: f.pricing_details.trim() || null,
      implementation_cost: numOrNull(f.implementation_cost),
      annual_support: numOrNull(f.annual_support),
      sla_summary: f.sla_summary.trim() || null,
    };
  }
  return {};
}
/** Pre-accept only, per the binding spec (post-accept quote behavior is a
 * separate, Opus-reviewed money batch — never touched here). A lead the
 * buyer already accepted or definitively closed can't be revised from this
 * UI; the underlying API is untouched either way. */
function canReviseQuote(l: Lead): boolean {
  return l.buyer_decision !== 'accepted' && l.status !== 'won' && l.status !== 'lost';
}
const STATUSES = ['new', 'viewed', 'responded', 'won', 'lost'];
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
// Live estimate — calls the SAME sacred fee engine the server uses
// (calculateFee: 4% on the first $50k, 2% above, $20k cap), so the vendor
// preview can never drift from the commission NXT//LINK actually bills.
function estimateCommission(amount: number): number {
  if (!(amount > 0)) return 0;
  return calculateFee(amount).fee;
}
// Soft-warn (never blocks) when the final purchase amount looks like a typo
// against the quoted amount — audit-flagged UX gap, display-only.
function amountLooksOffFromQuote(entered: number, quoted: number | null | undefined): boolean {
  if (!(entered > 0) || quoted == null || !(quoted > 0)) return false;
  return Math.abs(entered - quoted) / quoted > 0.5;
}

const T: Record<Lang, Record<string, string>> = {
  en: {
    leadsTag: 'Leads', alerts: 'Alerts', profile: 'Profile', yourListings: 'Your listings',
    notifications: 'Notifications', close: 'Close', notifEmpty: 'Nothing yet — new leads, messages, and buyer decisions show here.',
    openRequests: 'Open buyer requests', openRequestsHint: 'respond and it becomes a lead — buyer contact stays hidden until they accept your quote',
    matchesProfile: 'Matches your profile', buyerNeed: 'Buyer need', urgency: 'Urgency', budget: 'Budget',
    responded: '✓ Responded — see your leads below', respondQuote: 'Respond with a quote', creatingLead: 'Creating lead…',
    leadsInbox: 'Leads inbox', newBadge: 'new', subtitle: 'Buyers who requested a quote or service from your listings. Respond inside NXT//LINK.',
    loading: 'Loading…', signInFirst: 'Sign in first —', goToSignIn: 'go to sign in',
    emptyTitle: 'No leads yet', emptyHint: 'Buyers find you through your listings — publish products and services so requests land here.',
    manageListings: 'Manage your listings', completeProfile: 'Complete your profile',
    contactHidden: 'Contact details unlock when the buyer accepts your quote — use Messages below',
    yourQuote: 'Your quote:', commission: 'NXT//LINK commission:', protectedTo: 'protected to',
    quoteAmount: 'Total price', timeline: 'Lead time / delivery date', timelinePh: 'e.g. 4–6 weeks', validUntil: 'Quote expiration date',
    scopeNotesPh: 'Optional short message to the buyer…', estCommission: 'Estimated NXT//LINK commission:',
    estCommissionNote: '— give the buyer the same-scope price; do not add this on top.',
    sendQuote: 'Send quote through NXT//LINK', sending: 'Sending…', cancel: 'Cancel',
    updateQuote: 'Revise quote', sendQuoteBtn: 'Prepare quote',
    // Slice R3 — the structured quote template (common fields, reused across kinds)
    currencyLabel: 'Currency', totalAutoHint: 'Auto-calculated from unit price + shipping — you can still edit it',
    paymentTermsLabel: 'Payment terms', paymentTermsPh: 'e.g. 30% upfront, 70% on delivery',
    warrantyLabel: 'Warranty', warrantyPh: 'e.g. 1 year parts and labor',
    saveDraft: 'Save draft', draftSaved: 'Draft saved — resume anytime before you submit.',
    reviseNote: 'Revising sends the buyer an updated quote — this only works before they accept.',
    needTotal: 'Enter a total price before submitting.',
    quoteSendError: 'Could not send the quote — please try again.',
    selectPh: '— select —',
    // Per-kind extras
    unitPrice: 'Unit price', installationLabel: 'Installation', installationIncluded: 'Included',
    installationExtra: 'Extra cost', installationNone: 'Not available',
    trainingLabel: 'Training', trainingIncluded: 'Included', trainingExtra: 'Extra cost',
    shippingCost: 'Shipping cost',
    scopeSummary: 'Scope summary (included / excluded)', scopeSummaryPh: 'What’s included… what’s not included…',
    durationLabel: 'Duration', durationPh: 'e.g. 3 days', teamSize: 'Team size',
    emergencyResponse: 'Emergency response time (if applicable)', emergencyResponsePh: 'e.g. 2 hours',
    licenseModel: 'License model', licenseSubscription: 'Subscription', licensePerpetual: 'Perpetual', licenseTiered: 'Tiered',
    pricingDetails: 'Pricing details', pricingDetailsPh: 'e.g. $500/mo per seat',
    implementationCost: 'Implementation cost', annualSupport: 'Annual support / maintenance fee',
    slaSummary: 'SLA summary', slaSummaryPh: 'e.g. 99.9% uptime, 4h response',
    // Opportunity framing (the vendor lead card's "matched opportunity" facts)
    kindProduct: 'Product', kindService: 'Service', kindTechnology: 'Technology',
    qtyLabel: 'Qty', quoteByLabel: 'Quote by',
    finalAmount: 'Final purchase amount (USD)', poNumber: 'PO number', poPh: 'Buyer’s PO #',
    invoiceNum: 'Your invoice #', invoicePh: 'Your invoice to the buyer',
    commissionOnAmount: 'NXT//LINK commission on this amount:', commissionBilled: '— billed to you with 30-day terms.',
    recordPurchase: 'Record purchase', recording: 'Recording…',
    recordPurchaseRequired: 'Record the purchase (required — closes the deal)',
    purAmountWarn: 'This is very different from your quoted amount — double-check before submitting.',
    dealClosed: 'Deal closed:', commissionPaid: 'Commission paid', commissionDue: 'Commission due',
    invoice: 'Invoice', due: 'due',
    scope: 'Scope:', successEquals: 'Success =', results: 'Results:',
    resultsPh: 'What happened? Measurements, observations…', saveResults: 'Save results', saving: 'Saving…',
    markScheduled: 'Mark scheduled', start: 'Start', recordResults: 'Record results',
    scheduleDemoPilot: '+ Schedule demo / pilot',
    type: 'Type', when: 'When', location: 'Location', locationPh: 'Buyer site / online',
    scopePh: 'Scope — what will you show or test?', successCriteriaPh: 'Success criteria — what does success look like?',
    proposeThrough: 'Propose through NXT//LINK',
    noMessages: 'No messages yet — say hello.', messageBuyerPh: 'Message the buyer…', send: 'Send', sendingMsg: 'Sending…',
    guardNote: 'Emails, phone numbers, and links are hidden automatically until the buyer accepts — deals stay on NXT//LINK (your terms: commission owed during the protected period either way).',
    messages: 'Messages', newMessageHint: 'New message', live: 'Live',
    attachFile: 'Attach a file', attachFileTitle: 'Attach specs, drawings, or a quote document', removeFile: 'Remove file',
    uploadingFiles: 'Uploading…', downloadFile: 'Download',
    attachHint: `PDF, PNG, JPG, WEBP, XLSX, CSV, DWG, DXF · up to 10 MB · up to ${MAX_ATTACHMENTS_PER_MESSAGE} files`,
    attachContentsWarning: 'Files are shared as-is — contact details inside a document are not hidden until you accept.',
    no_files: 'Choose at least one file.',
    too_many_files: `You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`,
    file_empty: 'That file is empty.',
    file_too_large: 'That file is too large — max 10 MB per file.',
    file_type_not_allowed: 'That file type isn’t supported. Allowed: PDF, PNG, JPG, WEBP, XLSX, CSV, DWG, DXF.',
    attachSendError: 'Could not send the attachment — please try again.',
    mark: 'Mark',
    reqQuote: 'Quote', reqSales: 'Sales', reqDemo: 'Demo', reqPilot: 'Pilot', reqQuestion: 'Question',
    stNew: 'new', stViewed: 'viewed', stResponded: 'responded', stWon: 'won', stLost: 'lost',
    pkDemo: 'Demo', pkPilot: 'Pilot', pkSiteVisit: 'Site visit',
    psProposed: 'Proposed', psScheduled: 'Scheduled', psInProgress: 'In progress', psCompleted: 'Completed', psCancelled: 'Cancelled',
    poPassed: 'Passed', poFailed: 'Failed', poInconclusive: 'Inconclusive',
    buyerAccepted: 'Buyer accepted your quote', buyerDeclined: 'Buyer declined your quote',
    bundlePrefix: 'Bundle', bundleSuffix: 'one quote covers everything', bundleItem: 'item', bundleItems: 'items',
  },
  es: {
    leadsTag: 'Leads', alerts: 'Alertas', profile: 'Perfil', yourListings: 'Tus publicaciones',
    notifications: 'Notificaciones', close: 'Cerrar', notifEmpty: 'Nada por aquí todavía — nuevos leads, mensajes y decisiones del comprador aparecerán aquí.',
    openRequests: 'Solicitudes abiertas de compradores', openRequestsHint: 'responde y se convierte en un lead — el contacto del comprador se mantiene oculto hasta que acepte tu cotización',
    matchesProfile: 'Coincide con tu perfil', buyerNeed: 'Necesidad del comprador', urgency: 'Urgencia', budget: 'Presupuesto',
    responded: '✓ Respondido — ve tus leads abajo', respondQuote: 'Responder con una cotización', creatingLead: 'Creando lead…',
    leadsInbox: 'Bandeja de leads', newBadge: 'nuevos', subtitle: 'Compradores que solicitaron una cotización o servicio de tus publicaciones. Responde dentro de NXT//LINK.',
    loading: 'Cargando…', signInFirst: 'Inicia sesión primero —', goToSignIn: 'ir a iniciar sesión',
    emptyTitle: 'Aún no hay leads', emptyHint: 'Los compradores te encuentran a través de tus publicaciones — publica productos y servicios para que lleguen solicitudes aquí.',
    manageListings: 'Administrar tus publicaciones', completeProfile: 'Completar tu perfil',
    contactHidden: 'Los datos de contacto se desbloquean cuando el comprador acepta tu cotización — usa Mensajes abajo',
    yourQuote: 'Tu cotización:', commission: 'Comisión NXT//LINK:', protectedTo: 'protegido hasta',
    quoteAmount: 'Precio total', timeline: 'Plazo de entrega / fecha de entrega', timelinePh: 'ej. 4–6 semanas', validUntil: 'Fecha de vencimiento de la cotización',
    scopeNotesPh: 'Mensaje corto opcional para el comprador…', estCommission: 'Comisión NXT//LINK estimada:',
    estCommissionNote: '— dale al comprador el precio del mismo alcance; no la agregues encima.',
    sendQuote: 'Enviar cotización a través de NXT//LINK', sending: 'Enviando…', cancel: 'Cancelar',
    updateQuote: 'Revisar cotización', sendQuoteBtn: 'Preparar cotización',
    // Slice R3 — plantilla estructurada de cotización (campos comunes, reutilizados entre tipos)
    currencyLabel: 'Moneda', totalAutoHint: 'Calculado automáticamente con el precio unitario + envío — puedes editarlo',
    paymentTermsLabel: 'Términos de pago', paymentTermsPh: 'ej. 30% por adelantado, 70% a la entrega',
    warrantyLabel: 'Garantía', warrantyPh: 'ej. 1 año en piezas y mano de obra',
    saveDraft: 'Guardar borrador', draftSaved: 'Borrador guardado — puedes continuar cuando quieras antes de enviarlo.',
    reviseNote: 'Revisar envía al comprador una cotización actualizada — solo funciona antes de que acepte.',
    needTotal: 'Ingresa un precio total antes de enviar.',
    quoteSendError: 'No se pudo enviar la cotización — inténtalo de nuevo.',
    selectPh: '— selecciona —',
    // Extras por tipo
    unitPrice: 'Precio unitario', installationLabel: 'Instalación', installationIncluded: 'Incluida',
    installationExtra: 'Costo adicional', installationNone: 'No disponible',
    trainingLabel: 'Capacitación', trainingIncluded: 'Incluida', trainingExtra: 'Costo adicional',
    shippingCost: 'Costo de envío',
    scopeSummary: 'Resumen del alcance (incluido / excluido)', scopeSummaryPh: 'Qué está incluido… qué no está incluido…',
    durationLabel: 'Duración', durationPh: 'ej. 3 días', teamSize: 'Tamaño del equipo',
    emergencyResponse: 'Tiempo de respuesta de emergencia (si aplica)', emergencyResponsePh: 'ej. 2 horas',
    licenseModel: 'Modelo de licencia', licenseSubscription: 'Suscripción', licensePerpetual: 'Perpetua', licenseTiered: 'Por niveles',
    pricingDetails: 'Detalles de precios', pricingDetailsPh: 'ej. $500/mes por usuario',
    implementationCost: 'Costo de implementación', annualSupport: 'Cuota anual de soporte / mantenimiento',
    slaSummary: 'Resumen del SLA', slaSummaryPh: 'ej. 99.9% de disponibilidad, respuesta en 4h',
    // Contexto de la oportunidad (tarjeta de lead del vendedor)
    kindProduct: 'Producto', kindService: 'Servicio', kindTechnology: 'Tecnología',
    qtyLabel: 'Cant.', quoteByLabel: 'Cotizar antes del',
    finalAmount: 'Monto final de la compra (USD)', poNumber: 'Número de orden de compra', poPh: 'Orden de compra del comprador',
    invoiceNum: 'Tu número de factura', invoicePh: 'Tu factura al comprador',
    commissionOnAmount: 'Comisión NXT//LINK sobre este monto:', commissionBilled: '— facturado a ti con términos de 30 días.',
    recordPurchase: 'Registrar compra', recording: 'Registrando…',
    recordPurchaseRequired: 'Registrar la compra (obligatorio — cierra el trato)',
    purAmountWarn: 'Esto es muy diferente de tu monto cotizado — verifica antes de enviar.',
    dealClosed: 'Trato cerrado:', commissionPaid: 'Comisión pagada', commissionDue: 'Comisión pendiente',
    invoice: 'Factura', due: 'vence',
    scope: 'Alcance:', successEquals: 'Éxito =', results: 'Resultados:',
    resultsPh: '¿Qué pasó? Mediciones, observaciones…', saveResults: 'Guardar resultados', saving: 'Guardando…',
    markScheduled: 'Marcar programado', start: 'Iniciar', recordResults: 'Registrar resultados',
    scheduleDemoPilot: '+ Programar demo / piloto',
    type: 'Tipo', when: 'Cuándo', location: 'Ubicación', locationPh: 'Sitio del comprador / en línea',
    scopePh: 'Alcance — ¿qué vas a mostrar o probar?', successCriteriaPh: 'Criterios de éxito — ¿cómo se ve el éxito?',
    proposeThrough: 'Proponer a través de NXT//LINK',
    noMessages: 'Aún no hay mensajes — saluda.', messageBuyerPh: 'Mensaje para el comprador…', send: 'Enviar', sendingMsg: 'Enviando…',
    guardNote: 'Los correos, teléfonos y enlaces se ocultan automáticamente hasta que el comprador acepte — los tratos se quedan en NXT//LINK (tus términos: la comisión se debe durante el período protegido de cualquier forma).',
    messages: 'Mensajes', newMessageHint: 'Mensaje nuevo', live: 'En vivo',
    attachFile: 'Adjuntar un archivo', attachFileTitle: 'Adjunta especificaciones, planos o un documento de cotización', removeFile: 'Quitar archivo',
    uploadingFiles: 'Subiendo…', downloadFile: 'Descargar',
    attachHint: `PDF, PNG, JPG, WEBP, XLSX, CSV, DWG, DXF · hasta 10 MB · hasta ${MAX_ATTACHMENTS_PER_MESSAGE} archivos`,
    attachContentsWarning: 'Los archivos se comparten tal cual — los datos de contacto dentro de un documento no se ocultan hasta que aceptes.',
    no_files: 'Elige al menos un archivo.',
    too_many_files: `Puedes adjuntar hasta ${MAX_ATTACHMENTS_PER_MESSAGE} archivos por mensaje.`,
    file_empty: 'Ese archivo está vacío.',
    file_too_large: 'Ese archivo es demasiado grande — máximo 10 MB por archivo.',
    file_type_not_allowed: 'Ese tipo de archivo no es compatible. Permitidos: PDF, PNG, JPG, WEBP, XLSX, CSV, DWG, DXF.',
    attachSendError: 'No se pudo enviar el archivo adjunto — inténtalo de nuevo.',
    mark: 'Marcar',
    reqQuote: 'Cotización', reqSales: 'Ventas', reqDemo: 'Demo', reqPilot: 'Piloto', reqQuestion: 'Pregunta',
    stNew: 'nuevo', stViewed: 'visto', stResponded: 'respondido', stWon: 'ganado', stLost: 'perdido',
    pkDemo: 'Demo', pkPilot: 'Piloto', pkSiteVisit: 'Visita al sitio',
    psProposed: 'Propuesto', psScheduled: 'Programado', psInProgress: 'En progreso', psCompleted: 'Completado', psCancelled: 'Cancelado',
    poPassed: 'Aprobado', poFailed: 'Fallido', poInconclusive: 'No concluyente',
    buyerAccepted: 'El comprador aceptó tu cotización', buyerDeclined: 'El comprador rechazó tu cotización',
    bundlePrefix: 'Paquete', bundleSuffix: 'una cotización cubre todo', bundleItem: 'artículo', bundleItems: 'artículos',
  },
};

// Opportunity framing (Slice R3) — the "Matched Opportunities" feel on a
// vendor's own lead card: real structured facts + honest match-reason chips.
// quantity/location/timeline/request_kind come straight from R1's structured
// request columns; quote_deadline and the quantity unit live inside
// structured_specs (read defensively — both keys are new/optional additions
// from a parallel slice, so an older or in-flight request may not have
// either yet; absent = skipped, never invented). match_reasons is computed
// SERVER-SIDE from real category/service-area overlap only (GET
// /api/vendor/leads) — this component only renders what it's given.
function OpportunityFacts({ lead, t, lang }: { lead: Lead; t: Record<string, string>; lang: Lang }) {
  const KIND_LABEL: Record<string, string> = { product: t.kindProduct, service: t.kindService, technology: t.kindTechnology };
  const specs = (lead.structured_specs || {}) as Record<string, unknown>;
  const qtyUnit = typeof specs.quantity_unit === 'string' ? specs.quantity_unit
    : typeof specs.unit === 'string' ? specs.unit
    : typeof specs.qty_unit === 'string' ? specs.qty_unit : null;
  const quoteDeadlineRaw = typeof specs.quote_deadline === 'string' ? specs.quote_deadline : null;
  const quoteDeadline = quoteDeadlineRaw ? (() => { try { return new Date(quoteDeadlineRaw).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US'); } catch { return null; } })() : null;
  const reasons = lead.match_reasons || [];
  const hasFacts = Boolean(lead.request_kind || lead.quantity != null || lead.delivery_location || lead.preferred_timeline || quoteDeadline);
  if (!hasFacts && reasons.length === 0) return null;
  return (
    <div className="ld-oppfacts">
      {hasFacts && (
        <div className="ld-oppchips">
          {lead.request_kind && <span className="ld-oppchip ld-oppkind">{KIND_LABEL[lead.request_kind] || lead.request_kind}</span>}
          {lead.quantity != null && <span className="ld-oppchip">{t.qtyLabel} {lead.quantity}{qtyUnit ? ` ${qtyUnit}` : ''}</span>}
          {lead.delivery_location && <span className="ld-oppchip">{lead.delivery_location}</span>}
          {lead.preferred_timeline && <span className="ld-oppchip">{lead.preferred_timeline}</span>}
          {quoteDeadline && <span className="ld-oppchip ld-oppdeadline">{t.quoteByLabel} {quoteDeadline}</span>}
        </div>
      )}
      {reasons.length > 0 && <MatchReasons reasons={reasons} compact />}
    </div>
  );
}

export default function VendorLeadsPage() {
  const [lang, setLang] = useLang(); // stored `nxt_lang` — shared across marketplace pages
  const t = T[lang];
  const REQ_LABEL: Record<string, string> = { quote: t.reqQuote, contact_sales: t.reqSales, demo: t.reqDemo, pilot: t.reqPilot, question: t.reqQuestion };
  const STATUS_LABEL: Record<string, string> = { new: t.stNew, viewed: t.stViewed, responded: t.stResponded, won: t.stWon, lost: t.stLost };
  // Color-coded by meaning (Design System v1.0 palette) + a small icon per
  // status — visual only, the status VALUES themselves are untouched.
  const STATUS_ICON: Record<string, LucideIcon> = { new: Inbox, viewed: Eye, responded: Reply, won: Trophy, lost: XCircle };
  const PILOT_KIND_LABEL: Record<string, string> = { demo: t.pkDemo, pilot: t.pkPilot, site_visit: t.pkSiteVisit };
  const PILOT_STATUS_LABEL: Record<string, string> = { proposed: t.psProposed, scheduled: t.psScheduled, in_progress: t.psInProgress, completed: t.psCompleted, cancelled: t.psCancelled };
  const PILOT_OUTCOME_LABEL: Record<string, string> = { passed: t.poPassed, failed: t.poFailed, inconclusive: t.poInconclusive };

  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [openQuote, setOpenQuote] = useState<string | null>(null);
  const [qform, setQform] = useState<QuoteFormState>(emptyQform());
  const [qLoading, setQLoading] = useState(false);
  const [qBusy, setQBusy] = useState<'save' | 'submit' | null>(null);
  const [qError, setQError] = useState<string | null>(null);
  const [qDraftSaved, setQDraftSaved] = useState(false);
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
  const [chatMsgs, setChatMsgs] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [attachFiles, setAttachFiles] = useState<File[]>([]);
  const [attachBusy, setAttachBusy] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const chatListRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatListRef.current?.scrollTo({ top: chatListRef.current.scrollHeight }); }, [chatMsgs, chatFor]);
  // Auto-refresh the open thread only — polls the existing GET /messages
  // endpoint (no Supabase browser-realtime; that needs new RLS, out of scope).
  useChatPolling(chatFor, '/api/vendor/messages', setChatMsgs);
  const [notifs, setNotifs] = useState<Array<{ id: string; title: string; read_at: string | null; created_at: string; type?: string; quote_request_id?: string | null }>>([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  // Cheap unread-chat hint: reuses the notifications already fetched on load
  // (no extra API call) — a lead has an unread message if there's an unread
  // 'message' notification pointing at it.
  const unreadChatIds = useMemo(
    () => new Set(notifs.filter((n) => !n.read_at && n.type === 'message' && n.quote_request_id).map((n) => n.quote_request_id as string)),
    [notifs],
  );
  const [openReqs, setOpenReqs] = useState<Array<{ id: string; public_ref: string; category: string | null; problem: string | null; location: string | null; urgency: string | null; budget_range: string | null; relevant: boolean; reasons?: string[]; responded: boolean }>>([]);
  const [orBusy, setOrBusy] = useState<string | null>(null);
  async function respondToRequest(id: string) {
    setOrBusy(id);
    const res = await fetch('/api/vendor/open-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const data = await res.json();
    if (data.ok) {
      setOpenReqs((rs) => rs.map((r) => (r.id === id ? { ...r, responded: true } : r)));
      load(); // the new lead appears in the inbox below
    }
    setOrBusy(null);
  }
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
    const o = await fetch('/api/vendor/open-requests').then((r) => r.json()).catch(() => null);
    if (o?.ok) setOpenReqs(o.requests || []);
  }, []);

  useEffect(() => {
    const sb = createBrowserSupabaseClient();
    sb.auth.getSession().then(({ data }) => { if (data.session) load(); else setChecking(false); });
  }, [load]);

  async function setStatus(id: string, status: string) {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
    await fetch('/api/vendor/leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
  }

  // "Prepare Quote" — opens the structured template (Slice R3). Loads MY
  // latest draft/revision for this lead from the proposals API (the SAME
  // draft+revision store the submit path writes to — never a second save
  // path) so a vendor can resume a draft they started earlier, or see the
  // fields they last submitted when revising pre-accept.
  async function openQuoteForm(l: Lead) {
    setOpenQuote(l.id);
    setQError(null);
    setQDraftSaved(false);
    setQform(emptyQform());
    setQLoading(true);
    try {
      const res = await fetch(`/api/vendor/proposals?quote_request_id=${l.id}`);
      const data = await res.json();
      const latest = data.ok ? (data.proposals || [])[0] : null;
      if (latest) {
        const extras = (latest.quote_extras || {}) as Record<string, unknown>;
        const str = (v: unknown) => (v == null ? '' : String(v));
        setQform({
          total: str(latest.total), totalTouched: true, currency: latest.currency || 'USD',
          lead_time: str(latest.lead_time), valid_until: str(latest.valid_until),
          payment_terms: str(latest.payment_terms), warranty: str(latest.warranty), notes: str(latest.notes),
          unit_price: str(extras.unit_price), installation: str(extras.installation), training: str(extras.training),
          shipping_cost: str(extras.shipping_cost),
          scope_summary: str(extras.scope_summary), duration: str(extras.duration), team_size: str(extras.team_size),
          emergency_response: str(extras.emergency_response),
          license_model: str(extras.license_model), pricing_details: str(extras.pricing_details),
          implementation_cost: str(extras.implementation_cost), annual_support: str(extras.annual_support),
          sla_summary: str(extras.sla_summary),
        });
      }
    } catch {
      // No existing draft/proposal to prefill from — the blank template is fine.
    }
    setQLoading(false);
  }
  // Live auto-calc (products only): unit price × quantity + shipping, but
  // ONLY until the vendor edits the total field directly — once touched, we
  // never silently overwrite their number again this session.
  function patchQform(patch: Partial<QuoteFormState>, kind: RequestKind | null | undefined, quantity: number | null | undefined) {
    setQform((prev) => {
      const next = { ...prev, ...patch };
      if (kind === 'product' && !next.totalTouched && ('unit_price' in patch || 'shipping_cost' in patch)) {
        const auto = autoCalcProductTotal(
          { unit_price: numOrNull(next.unit_price), shipping_cost: numOrNull(next.shipping_cost) },
          quantity,
        );
        if (auto != null) next.total = String(auto);
      }
      return next;
    });
  }
  // Save draft (action:'save') or submit/revise (action:'submit') — both
  // paths go through POST /api/vendor/proposals, the SAME structured,
  // draft+revision-aware API (src/app/api/vendor/proposals/route.ts). Client
  // validation reuses validateQuoteExtras directly (src/lib/requests/
  // structured.ts) — the exact function the server calls — so there is no
  // separate "mirror" that can drift from server truth.
  async function submitProposal(l: Lead, action: 'save' | 'submit') {
    const extras = buildQuoteExtras(l.request_kind, qform);
    const check = validateQuoteExtras(l.request_kind ?? null, extras);
    if (!check.ok) { setQError(check.errors[0]); return; }
    const total = Number(qform.total) || 0;
    if (action === 'submit' && !(total > 0)) { setQError(t.needTotal); return; }
    setQError(null);
    setQDraftSaved(false);
    setQBusy(action);
    const line_items = total > 0 ? [{
      description: t.quoteAmount, // "Total price" / "Precio total" — the one line item carrying the template's total
      qty: 1, unit_price: total,
      kind: l.request_kind === 'service' ? 'labor' : l.request_kind === 'technology' ? 'other' : 'product',
    }] : [];
    try {
      const res = await fetch('/api/vendor/proposals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_request_id: l.id, action, line_items,
          currency: qform.currency || 'USD',
          lead_time: qform.lead_time || null,
          warranty: qform.warranty || null,
          payment_terms: qform.payment_terms || null,
          valid_until: qform.valid_until || null,
          notes: qform.notes || null,
          quote_extras: extras,
        }),
      });
      const data = await res.json();
      if (!data.ok) { setQError(data.message || t.quoteSendError); setQBusy(null); return; }
      if (action === 'save') { setQDraftSaved(true); setQBusy(null); return; }
      setLeads((ls) => ls.map((x) => (x.id === l.id ? {
        ...x, status: 'responded', quote_amount: data.total ?? total, quote_currency: qform.currency || 'USD',
        quote_timeline: qform.lead_time || null, quote_valid_until: qform.valid_until || null,
        quote_message: qform.notes || null,
        quote_payment_terms: qform.payment_terms || null, quote_warranty: qform.warranty || null,
        quote_extras: (data.quote_extras ?? extras) as QuoteExtras,
        commission: { commission_amount: data.commission.amount, effective_rate: data.commission.effective_rate, status: 'quoted', protected_until: data.commission.protected_until },
      } : x)));
      setOpenQuote(null); setQform(emptyQform()); setQBusy(null);
    } catch {
      setQError(t.quoteSendError); setQBusy(null);
    }
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
    setChatFor(leadId); setChatMsgs([]); setChatInput(''); setAttachFiles([]); setAttachError(null);
    // Clear the local unread hint for this thread right away — the server
    // side "all read" only happens via the bell (no per-thread mark-read
    // endpoint), so this is a same-session visual clear, not persisted.
    setNotifs((ns) => ns.map((n) => (n.quote_request_id === leadId && n.type === 'message' && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)));
    const res = await fetch(`/api/vendor/messages?quote_request_id=${leadId}`);
    const data = await res.json();
    if (data.ok) setChatMsgs(data.messages || []);
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
  async function sendChat(leadId: string) {
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
    setChatMsgs((m) => [...m, { id: tempId, sender: 'vendor', body: text, created_at: new Date().toISOString(), pending: true, attachments: tempAttachments }]);

    if (files.length === 0) {
      setChatBusy(true);
      try {
        const res = await fetch('/api/vendor/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quote_request_id: leadId, body: text }) });
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
      fd.append('quote_request_id', leadId);
      fd.append('body', text);
      for (const f of files) fd.append('file', f);
      const res = await fetch('/api/vendor/messages', { method: 'POST', body: fd });
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

  return (
    <div className={`ld ${ibmPlexSans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS + MATCH_REASONS_CSS + EMPTY_ACTION_CSS + '.ld-opencard .mrx-chips{margin-bottom:8px;}' }} />
      <VendorNav
        active="leads"
        extra={
          <>
            <button className="ld-bell" onClick={toggleNotifs} aria-label={t.notifications}>{t.alerts}{notifUnread > 0 && <span className="ld-belldot">{notifUnread}</span>}</button>
            <LanguageToggle lang={lang} onChange={setLang} variant="light" />
          </>
        }
      />
      <main className="ld-wrap">
        {notifOpen && (
          <div className="ld-notifs">
            <div className="ld-notifhead"><b>{t.notifications}</b><button onClick={() => setNotifOpen(false)}>{t.close}</button></div>
            {notifs.length === 0 ? <p className="ld-notifempty">{t.notifEmpty}</p> : (
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
        {openReqs.length > 0 && (
          <section className="ld-open">
            <h2>{t.openRequests} <small>{t.openRequestsHint}</small></h2>
            <div className="ld-openlist">
              {openReqs.map((r) => (
                <div className={'ld-opencard' + (r.relevant ? ' rel' : '')} key={r.id}>
                  <div className="ld-opentop">
                    {r.relevant && !(r.reasons || []).length && <span className="ld-relbadge">{t.matchesProfile}</span>}
                    <b>{r.category || t.buyerNeed}</b>
                    <small>{r.public_ref}</small>
                  </div>
                  {(r.reasons || []).length > 0 && <MatchReasons reasons={r.reasons || []} compact />}
                  {r.problem && <p>{r.problem}</p>}
                  <div className="ld-openmeta">
                    {r.location && <span>{r.location}</span>}
                    {r.urgency && <span>{t.urgency}: {r.urgency}</span>}
                    {r.budget_range && <span>{t.budget}: {r.budget_range}</span>}
                  </div>
                  {r.responded
                    ? <span className="ld-openok">{t.responded}</span>
                    : <button className="ld-qsend" disabled={orBusy === r.id} onClick={() => respondToRequest(r.id)}>{orBusy === r.id ? t.creatingLead : t.respondQuote}</button>}
                </div>
              ))}
            </div>
          </section>
        )}

        <h1>{t.leadsInbox} {leads.filter((l) => l.status === 'new').length > 0 && <span className="ld-newcnt">{leads.filter((l) => l.status === 'new').length} {t.newBadge}</span>}</h1>
        <p className="ld-sub">{t.subtitle}</p>
        {checking ? <div className="ld-empty">{t.loading}</div>
          : !signedIn ? <div className="ld-empty">{t.signInFirst} <a href="/vendor-login">{t.goToSignIn}</a></div>
          : leads.length === 0 ? (
            <EmptyAction
              icon={<Megaphone strokeWidth={1.75} />}
              title={t.emptyTitle}
              hint={t.emptyHint}
              actionLabel={t.manageListings}
              actionHref="/vendor/listings"
              secondaryLabel={t.completeProfile}
              secondaryHref="/vendor/portal"
            />
          )
          : (
            <div className="ld-list">
              {leads.map((l) => (
                <div className="ld-card" key={l.id}>
                  <div className="ld-top">
                    <span className={'ld-status ' + l.status}>{STATUS_LABEL[l.status] || l.status}</span>
                    <span className="ld-reqtype">{REQ_LABEL[l.answers?.request_type || 'quote'] || l.answers?.request_type}</span>
                    <b>{l.company}</b>
                    <small>{l.listing_name ? `→ ${l.listing_name}` : ''} · {new Date(l.created_at).toLocaleDateString()}</small>
                    <span className="ld-ref">{l.public_ref}</span>
                  </div>

                  {/* Opportunity framing (Slice R3) — the structured facts the
                      buyer gave (kind, quantity, location, timeline, quote
                      deadline) + honest "why this matches you" chips. NEVER
                      budget — R1's blind-budget invariant strips it server-side
                      before this response ever ships; nothing here renders it. */}
                  <OpportunityFacts lead={l} t={t} lang={lang} />

                  {/* Bundled quote request (quote cart): show EVERY item, not just the first */}
                  {(l.answers?.items?.length || 0) > 0 && (
                    <div className="ld-bundle">
                      <b>
                        {t.bundlePrefix} · {l.answers!.items!.length} {l.answers!.items!.length === 1 ? t.bundleItem : t.bundleItems} — {t.bundleSuffix}
                      </b>
                      <ul>
                        {l.answers!.items!.map((it) => (
                          <li key={it.listing_id}>
                            <span className="ld-bqty">{it.qty}×</span> {it.name}
                            {it.note ? <em> — {it.note}</em> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="ld-contact">
                    {l.contact_name && <span>{l.contact_name}</span>}
                    {l.email ? (
                      <>
                        <a href={`mailto:${l.email}`}>{l.email}</a>
                        {l.phone && <span>{l.phone}</span>}
                      </>
                    ) : (
                      <span className="ld-hiddenc">{t.contactHidden}</span>
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
                    {l.buyer_decision && <div className={'ld-decision ' + l.buyer_decision}>{l.buyer_decision === 'accepted' ? t.buyerAccepted : t.buyerDeclined}</div>}
                    {l.quote_amount != null && openQuote !== l.id && (
                      <div className="ld-qsum">
                        <span>{t.yourQuote} <b>{money(l.quote_amount)}</b></span>
                        {l.commission && <span>{t.commission} <b>{money(l.commission.commission_amount)}</b></span>}
                        {l.quote_timeline && <span>{l.quote_timeline}</span>}
                        {(l.quote_payment_terms || l.quote_warranty) && (
                          <span className="ld-qterms">{[l.quote_payment_terms, l.quote_warranty].filter(Boolean).join(' · ')}</span>
                        )}
                        {l.commission?.protected_until && <span className="ld-prot">{t.protectedTo} {new Date(l.commission.protected_until).toLocaleDateString()}</span>}
                      </div>
                    )}
                    {openQuote === l.id ? (
                      <div className="ld-qform">
                        {qLoading ? <p className="ld-qloading">{t.loading}</p> : (
                          <>
                            {l.quote_amount != null && canReviseQuote(l) && <p className="ld-revisenote">{t.reviseNote}</p>}
                            <div className="ld-qrow">
                              <label>{t.quoteAmount}
                                <input type="number" min="0" step="0.01" value={qform.total} onChange={(e) => patchQform({ total: e.target.value, totalTouched: true }, l.request_kind, l.quantity)} placeholder="e.g. 25000" />
                              </label>
                              <label>{t.currencyLabel}
                                <select value={qform.currency} onChange={(e) => setQform((f) => ({ ...f, currency: e.target.value }))}>
                                  <option value="USD">USD</option><option value="MXN">MXN</option><option value="CAD">CAD</option><option value="EUR">EUR</option>
                                </select>
                              </label>
                              <label>{t.timeline}<input value={qform.lead_time} onChange={(e) => setQform((f) => ({ ...f, lead_time: e.target.value }))} placeholder={t.timelinePh} maxLength={200} /></label>
                            </div>
                            {l.request_kind === 'product' && <p className="ld-autohint">{t.totalAutoHint}</p>}

                            <div className="ld-qrow">
                              <label>{t.validUntil}<input type="date" value={qform.valid_until} onChange={(e) => setQform((f) => ({ ...f, valid_until: e.target.value }))} /></label>
                              <label>{t.paymentTermsLabel}<input value={qform.payment_terms} onChange={(e) => setQform((f) => ({ ...f, payment_terms: e.target.value }))} placeholder={t.paymentTermsPh} maxLength={300} /></label>
                              <label>{t.warrantyLabel}<input value={qform.warranty} onChange={(e) => setQform((f) => ({ ...f, warranty: e.target.value }))} placeholder={t.warrantyPh} maxLength={400} /></label>
                            </div>

                            {/* Per-kind extras — only the fields the OPPORTUNITY's own request_kind accepts (validated server-side by validateQuoteExtras) */}
                            {l.request_kind === 'product' && (
                              <div className="ld-qextras">
                                <div className="ld-qrow">
                                  <label>{t.unitPrice}<input type="number" min="0" step="0.01" value={qform.unit_price} onChange={(e) => patchQform({ unit_price: e.target.value }, l.request_kind, l.quantity)} /></label>
                                  <label>{t.shippingCost}<input type="number" min="0" step="0.01" value={qform.shipping_cost} onChange={(e) => patchQform({ shipping_cost: e.target.value }, l.request_kind, l.quantity)} /></label>
                                  <label>{t.installationLabel}
                                    <select value={qform.installation} onChange={(e) => setQform((f) => ({ ...f, installation: e.target.value }))}>
                                      <option value="">{t.selectPh}</option>
                                      <option value="included">{t.installationIncluded}</option>
                                      <option value="extra">{t.installationExtra}</option>
                                      <option value="not_available">{t.installationNone}</option>
                                    </select>
                                  </label>
                                </div>
                                <label>{t.trainingLabel}
                                  <select value={qform.training} onChange={(e) => setQform((f) => ({ ...f, training: e.target.value }))}>
                                    <option value="">{t.selectPh}</option>
                                    <option value="included">{t.trainingIncluded}</option>
                                    <option value="extra">{t.trainingExtra}</option>
                                  </select>
                                </label>
                              </div>
                            )}
                            {l.request_kind === 'service' && (
                              <div className="ld-qextras">
                                <textarea rows={2} value={qform.scope_summary} onChange={(e) => setQform((f) => ({ ...f, scope_summary: e.target.value }))} placeholder={t.scopeSummaryPh} maxLength={1000} />
                                <div className="ld-qrow">
                                  <label>{t.durationLabel}<input value={qform.duration} onChange={(e) => setQform((f) => ({ ...f, duration: e.target.value }))} placeholder={t.durationPh} maxLength={200} /></label>
                                  <label>{t.teamSize}<input type="number" min="1" step="1" value={qform.team_size} onChange={(e) => setQform((f) => ({ ...f, team_size: e.target.value }))} /></label>
                                  <label>{t.emergencyResponse}<input value={qform.emergency_response} onChange={(e) => setQform((f) => ({ ...f, emergency_response: e.target.value }))} placeholder={t.emergencyResponsePh} maxLength={200} /></label>
                                </div>
                              </div>
                            )}
                            {l.request_kind === 'technology' && (
                              <div className="ld-qextras">
                                <div className="ld-qrow">
                                  <label>{t.licenseModel}
                                    <select value={qform.license_model} onChange={(e) => setQform((f) => ({ ...f, license_model: e.target.value }))}>
                                      <option value="">{t.selectPh}</option>
                                      <option value="subscription">{t.licenseSubscription}</option>
                                      <option value="perpetual">{t.licensePerpetual}</option>
                                      <option value="tiered">{t.licenseTiered}</option>
                                    </select>
                                  </label>
                                  <label>{t.implementationCost}<input type="number" min="0" step="0.01" value={qform.implementation_cost} onChange={(e) => setQform((f) => ({ ...f, implementation_cost: e.target.value }))} /></label>
                                  <label>{t.annualSupport}<input type="number" min="0" step="0.01" value={qform.annual_support} onChange={(e) => setQform((f) => ({ ...f, annual_support: e.target.value }))} /></label>
                                </div>
                                <input value={qform.pricing_details} onChange={(e) => setQform((f) => ({ ...f, pricing_details: e.target.value }))} placeholder={t.pricingDetailsPh} maxLength={1000} />
                                <input value={qform.sla_summary} onChange={(e) => setQform((f) => ({ ...f, sla_summary: e.target.value }))} placeholder={t.slaSummaryPh} maxLength={500} />
                              </div>
                            )}

                            <textarea rows={2} value={qform.notes} onChange={(e) => setQform((f) => ({ ...f, notes: e.target.value }))} placeholder={t.scopeNotesPh} maxLength={3000} />
                            <div className="ld-qcom">{t.estCommission} <b>{money(estimateCommission(Number(qform.total) || 0))}</b> <small>{t.estCommissionNote}</small></div>
                            {qError && <p className="ld-formerr" role="alert">{qError}</p>}
                            {qDraftSaved && <p className="ld-draftok">{t.draftSaved}</p>}
                            <div className="ld-qactions">
                              <button className="ld-qsend" disabled={qBusy !== null || !(Number(qform.total) > 0)} onClick={() => submitProposal(l, 'submit')}>{qBusy === 'submit' ? t.sending : t.sendQuote}</button>
                              <button className="ld-qdraft" disabled={qBusy !== null} onClick={() => submitProposal(l, 'save')}>{qBusy === 'save' ? t.saving : t.saveDraft}</button>
                              <button className="ld-qcancel" onClick={() => { setOpenQuote(null); setQError(null); }}>{t.cancel}</button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      (l.quote_amount == null || canReviseQuote(l)) && (
                        <button className="ld-qopen" onClick={() => openQuoteForm(l)}>{l.quote_amount != null ? t.updateQuote : t.sendQuoteBtn}</button>
                      )
                    )}
                  </div>

                  {/* Purchase record + commission bill (after buyer accepts) */}
                  {l.buyer_decision === 'accepted' && (
                    <div className="ld-purchase">
                      {l.commission?.invoice_number ? (
                        <div className="ld-bill">
                          <div className="ld-billtop">
                            <b>{t.dealClosed} {money(l.commission.final_amount || l.quote_amount || 0)}</b>
                            <span className={'ld-billstatus ' + (l.commission.paid_at ? 'paid' : 'due')}>{l.commission.paid_at ? t.commissionPaid : t.commissionDue}</span>
                          </div>
                          <div className="ld-billrow">
                            <span>{t.commission} <b>{money(l.commission.commission_amount)}</b></span>
                            <span>{t.invoice} {l.commission.invoice_number}</span>
                            {l.commission.due_date && !l.commission.paid_at && <span>{t.due} {new Date(l.commission.due_date).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      ) : purFor === l.id ? (
                        <div className="ld-qform">
                          <div className="ld-qrow">
                            <label>{t.finalAmount}<input type="number" min="0" value={purForm.amount} onChange={(e) => setPurForm({ ...purForm, amount: e.target.value })} placeholder={l.quote_amount != null ? String(l.quote_amount) : 'e.g. 25000'} /></label>
                            <label>{t.poNumber}<input value={purForm.po_number} onChange={(e) => setPurForm({ ...purForm, po_number: e.target.value })} placeholder={t.poPh} /></label>
                            <label>{t.invoiceNum}<input value={purForm.invoice_ref} onChange={(e) => setPurForm({ ...purForm, invoice_ref: e.target.value })} placeholder={t.invoicePh} /></label>
                          </div>
                          <div className="ld-qcom">{t.commissionOnAmount} <b>{money(estimateCommission(Number(purForm.amount)))}</b> <small>{t.commissionBilled}</small></div>
                          {amountLooksOffFromQuote(Number(purForm.amount), l.quote_amount) && (
                            <div className="ld-amountwarn" role="alert">{t.purAmountWarn}</div>
                          )}
                          <div className="ld-qactions">
                            <button className="ld-qsend" disabled={purBusy || !(Number(purForm.amount) > 0)} onClick={() => recordPurchase(l.id)}>{purBusy ? t.recording : t.recordPurchase}</button>
                            <button className="ld-qcancel" onClick={() => setPurFor(null)}>{t.cancel}</button>
                          </div>
                        </div>
                      ) : (
                        <button className="ld-purbtn" onClick={() => { setPurForm({ amount: l.quote_amount != null ? String(l.quote_amount) : '', po_number: '', invoice_ref: '', purchased_at: '' }); setPurFor(l.id); }}>
                          {t.recordPurchaseRequired}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Demo / pilot tracking — stays inside NXT//LINK */}
                  <div className="ld-pilots">
                    {(l.pilots || []).map((p) => (
                      <div className="ld-pcard" key={p.id}>
                        <div className="ld-ptop">
                          <span className={'ld-pkind ' + p.kind}>{PILOT_KIND_LABEL[p.kind] || p.kind.replace('_', ' ')}</span>
                          <span className={'ld-pstatus ' + p.status}>{PILOT_STATUS_LABEL[p.status] || p.status.replace('_', ' ')}</span>
                          {p.scheduled_for && <small>{new Date(p.scheduled_for).toLocaleString()}</small>}
                          {p.location && <small>· {p.location}</small>}
                          {p.outcome && <span className={'ld-poutcome ' + p.outcome}>{PILOT_OUTCOME_LABEL[p.outcome] || p.outcome}</span>}
                        </div>
                        {p.scope && <p className="ld-pscope"><span>{t.scope}</span> {p.scope}</p>}
                        {p.success_criteria && <p className="ld-pscope"><span>{t.successEquals}</span> {p.success_criteria}</p>}
                        {p.results && <p className="ld-pscope"><span>{t.results}</span> {p.results}</p>}
                        {resultsFor === p.id ? (
                          <div className="ld-presults">
                            <textarea rows={2} placeholder={t.resultsPh} value={rform.results} onChange={(e) => setRform({ ...rform, results: e.target.value })} />
                            <div className="ld-qactions">
                              <select value={rform.outcome} onChange={(e) => setRform({ ...rform, outcome: e.target.value })}>
                                <option value="passed">{t.poPassed}</option><option value="failed">{t.poFailed}</option><option value="inconclusive">{t.poInconclusive}</option>
                              </select>
                              <button className="ld-qsend" disabled={pBusy} onClick={() => saveResults(l.id, p.id)}>{pBusy ? t.saving : t.saveResults}</button>
                              <button className="ld-qcancel" onClick={() => setResultsFor(null)}>{t.cancel}</button>
                            </div>
                          </div>
                        ) : (
                          <div className="ld-pactions">
                            {p.status === 'proposed' && <button onClick={() => patchPilot(l.id, p.id, { status: 'scheduled' })}>{t.markScheduled}</button>}
                            {(p.status === 'scheduled' || p.status === 'proposed') && <button onClick={() => patchPilot(l.id, p.id, { status: 'in_progress' })}>{t.start}</button>}
                            {p.status !== 'completed' && p.status !== 'cancelled' && <button onClick={() => { setRform({ results: p.results || '', outcome: p.outcome || 'passed' }); setResultsFor(p.id); }}>{t.recordResults}</button>}
                            {p.status !== 'completed' && p.status !== 'cancelled' && <button onClick={() => patchPilot(l.id, p.id, { status: 'cancelled' })}>{t.cancel}</button>}
                          </div>
                        )}
                      </div>
                    ))}
                    {openPilot === l.id ? (
                      <div className="ld-qform">
                        <div className="ld-qrow">
                          <label>{t.type}
                            <select value={pform.kind} onChange={(e) => setPform({ ...pform, kind: e.target.value })}>
                              <option value="demo">{t.pkDemo}</option><option value="pilot">{t.pkPilot}</option><option value="site_visit">{t.pkSiteVisit}</option>
                            </select>
                          </label>
                          <label>{t.when}<input type="datetime-local" value={pform.scheduled_for} onChange={(e) => setPform({ ...pform, scheduled_for: e.target.value })} /></label>
                          <label>{t.location}<input value={pform.location} onChange={(e) => setPform({ ...pform, location: e.target.value })} placeholder={t.locationPh} /></label>
                        </div>
                        <textarea rows={2} placeholder={t.scopePh} value={pform.scope} onChange={(e) => setPform({ ...pform, scope: e.target.value })} />
                        <textarea rows={2} placeholder={t.successCriteriaPh} value={pform.success_criteria} onChange={(e) => setPform({ ...pform, success_criteria: e.target.value })} />
                        <div className="ld-qactions">
                          <button className="ld-qsend" disabled={pBusy} onClick={() => createPilot(l.id)}>{pBusy ? t.saving : t.proposeThrough}</button>
                          <button className="ld-qcancel" onClick={() => setOpenPilot(null)}>{t.cancel}</button>
                        </div>
                      </div>
                    ) : (
                      <button className="ld-popen" onClick={() => setOpenPilot(l.id)}>{t.scheduleDemoPilot}</button>
                    )}
                  </div>

                  {/* Buyer <-> vendor messages, inside NXT//LINK */}
                  <div className="ld-chat">
                    {chatFor === l.id ? (
                      <div className="ld-chatbox">
                        <div className="ld-chathead">
                          <span>{t.messages}</span>
                          <span className="ld-live" aria-hidden="true"><i />{t.live}</span>
                        </div>
                        <div className="ld-chatlist" ref={chatListRef} aria-live="polite" aria-atomic="false" aria-relevant="additions">
                          {chatMsgs.length === 0 && <div className="ld-chatempty">{t.noMessages}</div>}
                          {chatMsgs.map((m) => (
                            <div key={m.id} className={'ld-bubble ' + (m.sender === 'vendor' ? 'me' : 'them') + (m.pending ? ' pending' : '')}>
                              {m.body && <div>{m.body}</div>}
                              {(m.attachments || []).length > 0 && (
                                <div className="ld-attachlist">
                                  {(m.attachments || []).map((a) => (
                                    a.url ? (
                                      <a key={a.id} className="ld-attachitem" href={a.url} target="_blank" rel="noreferrer" title={t.downloadFile}>
                                        <Paperclip size={11} strokeWidth={2} aria-hidden="true" />
                                        <span className="ld-attachname">{a.file_name}</span>
                                        <small>{formatFileSize(a.size_bytes)}</small>
                                        <Download size={11} strokeWidth={2} aria-hidden="true" />
                                      </a>
                                    ) : (
                                      <span key={a.id} className="ld-attachitem is-pending">
                                        <Paperclip size={11} strokeWidth={2} aria-hidden="true" />
                                        <span className="ld-attachname">{a.file_name}</span>
                                        <small>{formatFileSize(a.size_bytes)}</small>
                                      </span>
                                    )
                                  ))}
                                </div>
                              )}
                              <small>{m.pending ? t.sendingMsg : new Date(m.created_at).toLocaleString()}</small>
                            </div>
                          ))}
                        </div>
                        {attachFiles.length > 0 && (
                          <div className="ld-attachchips">
                            {attachFiles.map((f, i) => (
                              <span className="ld-attachchip" key={`${f.name}-${i}`}>
                                <span className="ld-attachname">{f.name}</span>
                                <small>{formatFileSize(f.size)}</small>
                                <button type="button" onClick={() => removeAttachFile(i)} aria-label={t.removeFile}><X size={11} strokeWidth={2.5} aria-hidden="true" /></button>
                              </span>
                            ))}
                          </div>
                        )}
                        {attachError && <p className="ld-attacherr">{attachError}</p>}
                        <div className="ld-chatrow">
                          <input
                            ref={attachInputRef} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true"
                            accept={ALLOWED_ATTACHMENT_EXTENSIONS.map((e) => `.${e}`).join(',')}
                            onChange={handleAttachSelect}
                          />
                          <button type="button" className="ld-attachbtn" title={t.attachFileTitle} aria-label={t.attachFile} disabled={attachBusy || chatBusy} onClick={() => attachInputRef.current?.click()}>
                            <Paperclip size={16} strokeWidth={2} aria-hidden="true" />
                          </button>
                          <label className="sr-only" htmlFor={`ld-chat-${l.id}`}>{t.messageBuyerPh}</label>
                          <input id={`ld-chat-${l.id}`} value={chatInput} placeholder={t.messageBuyerPh} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendChat(l.id); }} />
                          <button className="ld-qsend" disabled={chatBusy || attachBusy || (!chatInput.trim() && attachFiles.length === 0)} onClick={() => sendChat(l.id)}>{attachBusy ? t.uploadingFiles : t.send}</button>
                          <button className="ld-qcancel" onClick={() => setChatFor(null)}>{t.close}</button>
                        </div>
                        <p className="ld-attachhint">{t.attachHint}</p>
                        {l.buyer_decision !== 'accepted' && <p className="ld-attachhint ld-attachwarn">{t.attachContentsWarning}</p>}
                        {l.buyer_decision !== 'accepted' && <p className="ld-guardnote">{t.guardNote}</p>}
                      </div>
                    ) : (
                      <button className="ld-chatopen" onClick={() => openChat(l.id)}>
                        <MessageCircle size={14} strokeWidth={2} aria-hidden="true" />
                        {t.messages}
                        {unreadChatIds.has(l.id) && <span className="ld-chatdot" aria-hidden="true" />}
                        {unreadChatIds.has(l.id) && <span className="sr-only">{t.newMessageHint}</span>}
                      </button>
                    )}
                  </div>

                  <div className="ld-actions">
                    {STATUSES.filter((st) => st !== l.status).map((st) => {
                      const StatusIcon = STATUS_ICON[st];
                      return (
                        <button key={st} className={'ld-act ld-act-' + st} onClick={() => setStatus(l.id, st)}>
                          {StatusIcon && <StatusIcon size={13} strokeWidth={2} aria-hidden="true" />}
                          {t.mark} {STATUS_LABEL[st] || st}
                        </button>
                      );
                    })}
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
.ld{min-height:100vh;background:var(--spec-warm-white,#F8F7FB);color:var(--spec-ink,#141320);font-family:var(--font-ibm-plex-sans-leads),'IBM Plex Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
.ld *{box-sizing:border-box;}
.ld a:focus-visible,.ld button:focus-visible,.ld input:focus-visible,.ld textarea:focus-visible,.ld select:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.ld-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 26px;border-bottom:1px solid var(--spec-border,#E2DFEC);position:sticky;top:0;background:rgba(248,247,251,.92);backdrop-filter:blur(20px);z-index:20;}
.ld-brand{display:flex;align-items:baseline;gap:10px;color:var(--spec-ink,#141320);text-decoration:none;}
.ld-brand b{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:17px;font-weight:700;}.ld-brand i{color:var(--spec-violet,#6C5CE0);font-style:normal;}
.ld-brand span{color:var(--spec-text-2nd,#615F72);font-size:13px;}
.ld-link{color:var(--spec-violet-deep,#4A3DB0);font-size:13.5px;font-weight:600;text-decoration:none;}
.ld-navr{display:flex;align-items:center;gap:14px;}
.ld-bell{position:relative;font-family:inherit;font-size:13px;font-weight:600;color:var(--spec-violet-deep,#4A3DB0);background:rgba(108,92,224,.08);border:1px solid rgba(108,92,224,.3);border-radius:99px;padding:7px 14px;cursor:pointer;}
.ld-belldot{margin-left:7px;background:var(--spec-error,#CE4B43);color:#fff;font-size:11px;font-weight:800;border-radius:99px;padding:1px 7px;}
.ld-notifs{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:14px;padding:16px 18px;margin:0 0 18px;box-shadow:0 8px 24px rgba(20,19,32,.08);}
.ld-notifhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.ld-notifhead b{font-size:14.5px;}
.ld-notifhead button{background:none;border:none;color:var(--spec-text-2nd,#615F72);font:inherit;font-size:12.5px;cursor:pointer;}
.ld-notifempty{color:var(--spec-text-2nd,#615F72);font-size:13.5px;margin:4px 0;}
.ld-notifs ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px;max-height:280px;overflow-y:auto;}
.ld-notifs li{display:flex;justify-content:space-between;gap:12px;padding:9px 10px;border-radius:9px;font-size:13.5px;color:var(--spec-ink,#141320);}
.ld-notifs li.unread{background:rgba(108,92,224,.06);font-weight:600;}
.ld-notifs li small{color:var(--spec-text-2nd,#615F72);white-space:nowrap;}
.ld-wrap{max-width:760px;margin:0 auto;padding:36px 20px 100px;}
.ld-wrap h1{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:28px;font-weight:700;letter-spacing:-.01em;}
.ld-newcnt{font-size:12px;font-weight:700;color:var(--spec-violet-deep,#4A3DB0);background:rgba(108,92,224,.1);border-radius:99px;padding:4px 12px;vertical-align:6px;margin-left:8px;}
.ld-open{margin-bottom:28px;}
.ld-open h2{font-family:var(--font-space-grotesk),'Space Grotesk',sans-serif;font-size:17px;font-weight:700;letter-spacing:-.01em;}
.ld-open h2 small{display:block;color:var(--spec-text-2nd,#615F72);font-size:12.5px;font-weight:400;font-family:var(--font-ibm-plex-sans-leads),'IBM Plex Sans',sans-serif;margin-top:5px;line-height:1.5;}
.ld-openlist{display:flex;flex-direction:column;gap:12px;margin-top:14px;}
.ld-opencard{background:#fff;border:1px dashed rgba(108,92,224,.4);border-radius:14px;padding:15px 17px;}
.ld-opencard.rel{border-style:solid;border-color:rgba(47,158,106,.4);}
.ld-opentop{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.ld-opentop b{font-size:15px;}
.ld-opentop small{margin-left:auto;color:#706D88;font-size:12px;}
.ld-relbadge{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:4px 9px;border-radius:99px;background:#E9F7F0;color:#1F7A54;}
.ld-opencard p{margin:9px 0 0;font-size:13.5px;color:var(--spec-ink,#141320);line-height:1.55;}
.ld-openmeta{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:var(--spec-text-2nd,#615F72);margin:9px 0 12px;}
.ld-openok{color:var(--spec-success,#2F9E6A);font-size:13px;font-weight:600;}
.ld-sub{color:var(--spec-text-2nd,#615F72);font-size:14px;margin:6px 0 24px;}
.ld-empty{text-align:center;color:var(--spec-text-2nd,#615F72);padding:70px 0;}
.ld-empty a{color:var(--spec-violet-deep,#4A3DB0);}
.ld-list{display:flex;flex-direction:column;gap:14px;}
.ld-card{background:#fff;border:1px solid var(--spec-border,#E2DFEC);border-radius:16px;padding:18px 20px;}
.ld-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.ld-top b{font-size:15.5px;}
.ld-top small{color:var(--spec-text-2nd,#615F72);}
.ld-ref{margin-left:auto;color:#706D88;font-size:12px;}
.ld-status{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 9px;border-radius:99px;background:var(--spec-surface,#EFEDF5);color:var(--spec-ink,#141320);}
.ld-reqtype{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:4px 9px;border-radius:99px;background:#E9F7F0;color:#1F7A54;}
.ld-status.new{background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);}
.ld-status.viewed{background:var(--spec-surface,#EFEDF5);color:var(--spec-slate,#3B3A4A);}
.ld-status.responded{background:rgba(62,111,208,.1);color:#2F5AA8;}
.ld-status.won{background:#E9F7F0;color:#1F7A54;}
.ld-status.lost{background:#FBECEA;color:var(--spec-error,#CE4B43);}
.ld-bundle{margin-top:12px;background:rgba(108,92,224,.05);border:1px solid rgba(108,92,224,.22);border-radius:12px;padding:12px 14px;}
.ld-bundle b{font-size:12.5px;color:var(--spec-violet-deep,#4A3DB0);}
.ld-bundle ul{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:5px;}
.ld-bundle li{font-size:13.5px;color:var(--spec-ink,#141320);line-height:1.5;}
.ld-bundle li em{font-style:normal;color:var(--spec-text-2nd,#615F72);}
.ld-bqty{display:inline-block;min-width:30px;font-weight:700;color:var(--spec-violet-deep,#4A3DB0);}
.ld-contact{display:flex;gap:14px;flex-wrap:wrap;font-size:13.5px;color:var(--spec-ink,#141320);margin-top:10px;}
.ld-contact a{color:var(--spec-violet-deep,#4A3DB0);}
.ld-hiddenc{color:#8A5D14;font-size:12.5px;background:#FBF3E7;border:1px solid #EFD9AE;border-radius:8px;padding:5px 10px;}
.ld-buyercard{display:flex;align-items:center;gap:13px;margin-top:12px;background:#F3FAF6;border:1px solid rgba(47,158,106,.25);border-radius:12px;padding:12px 14px;}
.ld-buyerlogo{width:46px;height:46px;flex-shrink:0;border-radius:11px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;display:grid;place-items:center;overflow:hidden;font-size:14px;font-weight:800;color:#1F7A54;}
.ld-buyerlogo img{width:100%;height:100%;object-fit:contain;}
.ld-buyerinfo{display:flex;flex-direction:column;gap:3px;}
.ld-buyerinfo b{font-size:14.5px;}
.ld-buyerinfo small{color:var(--spec-text-2nd,#615F72);font-size:12.5px;line-height:1.45;}
.ld-guardnote{margin:9px 0 0;font-size:11.5px;color:var(--spec-text-2nd,#615F72);line-height:1.5;}
.ld-msg{margin:12px 0 0;font-size:14px;color:var(--spec-ink,#141320);line-height:1.6;background:var(--spec-surface,#EFEDF5);border-radius:10px;padding:12px 14px;white-space:pre-wrap;}
.ld-quote{margin-top:14px;border-top:1px solid var(--spec-border,#E2DFEC);padding-top:14px;}
.ld-decision{display:inline-block;font-size:12px;font-weight:700;padding:5px 11px;border-radius:99px;margin-bottom:10px;text-transform:capitalize;}
.ld-decision.accepted{background:#E9F7F0;color:#1F7A54;}
.ld-decision.declined{background:#FBECEA;color:var(--spec-error,#CE4B43);}
.ld-qsum{display:flex;flex-wrap:wrap;gap:14px;font-size:13.5px;color:var(--spec-ink,#141320);align-items:center;}
.ld-qsum b{color:var(--spec-ink,#141320);}
.ld-prot{color:var(--spec-text-2nd,#615F72);font-size:12px;}
.ld-qopen{margin-top:10px;font-family:inherit;font-size:12.5px;font-weight:600;background:rgba(108,92,224,.1);border:1px solid var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);border-radius:9px;padding:8px 14px;cursor:pointer;}
.ld-qform{display:flex;flex-direction:column;gap:10px;background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:12px;padding:14px;margin-top:6px;}
.ld-qrow{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
@media(max-width:600px){.ld-qrow{grid-template-columns:1fr;}}
.ld-qform label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--spec-text-2nd,#615F72);}
.ld-qform input,.ld-qform textarea{font-family:inherit;font-size:14px;padding:10px 12px;border-radius:9px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;resize:vertical;}
.ld-qform input:focus,.ld-qform textarea:focus{border-color:var(--spec-violet,#6C5CE0);box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.ld-qcom{font-size:13px;color:var(--spec-ink,#141320);background:rgba(108,92,224,.06);border:1px solid rgba(108,92,224,.22);border-radius:9px;padding:9px 12px;}
.ld-amountwarn{font-size:12.5px;font-weight:600;color:var(--spec-warning,#C68A28);background:#FBF3E7;border:1px solid rgba(198,138,40,.3);border-radius:9px;padding:8px 12px;}
.ld-qcom b{color:var(--spec-violet-deep,#4A3DB0);}
.ld-qcom small{color:var(--spec-text-2nd,#615F72);}
.ld-qactions{display:flex;gap:9px;}
.ld-qsend{font-family:inherit;font-size:13.5px;font-weight:700;background:var(--spec-violet,#6C5CE0);border:none;color:#fff;border-radius:9px;padding:10px 16px;cursor:pointer;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ld-qsend:hover{background:var(--spec-violet-deep,#4A3DB0);}
.ld-qsend:disabled{opacity:.5;cursor:not-allowed;}
.ld-qcancel{font-family:inherit;font-size:13px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-ink,#141320);border-radius:9px;padding:10px 14px;cursor:pointer;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ld-qcancel:hover{border-color:#C7C2DE;}
/* Slice R3 — opportunity framing (structured facts + honest match chips) */
.ld-oppfacts{display:flex;flex-direction:column;gap:8px;margin-top:12px;}
.ld-oppchips{display:flex;flex-wrap:wrap;gap:6px;}
.ld-oppchip{font-size:12px;font-weight:600;color:var(--spec-text-2nd,#615F72);background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:99px;padding:4px 11px;white-space:nowrap;}
.ld-oppkind{color:var(--spec-ink,#141320);text-transform:capitalize;}
.ld-oppdeadline{color:#8A5D14;background:#FBF3E7;border-color:rgba(198,138,40,.35);}
/* Slice R3 — the structured quote template's per-kind extras + save-draft/revise/error affordances */
.ld-qextras{display:flex;flex-direction:column;gap:10px;padding-top:2px;}
.ld-autohint{margin:-2px 0 0;font-size:11.5px;color:var(--spec-text-2nd,#615F72);}
.ld-revisenote{margin:0;font-size:12.5px;color:var(--spec-violet-deep,#4A3DB0);background:rgba(108,92,224,.06);border:1px solid rgba(108,92,224,.2);border-radius:9px;padding:8px 12px;}
.ld-formerr{margin:0;font-size:12.5px;font-weight:600;color:var(--spec-error,#CE4B43);background:#FBECEA;border:1px solid rgba(206,75,67,.3);border-radius:9px;padding:8px 12px;}
.ld-draftok{margin:0;font-size:12.5px;font-weight:600;color:#1F7A54;background:#E9F7F0;border:1px solid rgba(47,158,106,.3);border-radius:9px;padding:8px 12px;}
.ld-qloading{margin:0;font-size:13px;color:var(--spec-text-2nd,#615F72);}
.ld-qterms{color:var(--spec-text-2nd,#615F72);font-size:12.5px;}
.ld-qdraft{font-family:inherit;font-size:13px;font-weight:600;background:#fff;border:1px solid var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);border-radius:9px;padding:10px 14px;cursor:pointer;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ld-qdraft:hover{background:rgba(108,92,224,.08);}
.ld-qdraft:disabled{opacity:.5;cursor:not-allowed;}
.ld-purchase{margin-top:14px;border-top:1px solid var(--spec-border,#E2DFEC);padding-top:14px;}
.ld-purbtn{font-family:inherit;font-size:13px;font-weight:700;background:#E9F7F0;border:1px solid rgba(47,158,106,.4);color:#1F7A54;border-radius:10px;padding:10px 16px;cursor:pointer;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ld-purbtn:hover{background:#DBF1E5;}
.ld-bill{background:#F3FAF6;border:1px solid rgba(47,158,106,.3);border-radius:12px;padding:13px 15px;}
.ld-billtop{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;}
.ld-billtop b{font-size:15px;color:var(--spec-ink,#141320);}
.ld-billstatus{font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;text-transform:uppercase;letter-spacing:.05em;}
.ld-billstatus.due{background:#FBF3E7;color:var(--spec-warning,#C68A28);}
.ld-billstatus.paid{background:#E9F7F0;color:#1F7A54;}
.ld-billrow{display:flex;gap:16px;flex-wrap:wrap;margin-top:9px;font-size:13px;color:var(--spec-ink,#141320);}
.ld-billrow b{color:#1F7A54;}
.ld-pilots{margin-top:14px;border-top:1px solid var(--spec-border,#E2DFEC);padding-top:14px;display:flex;flex-direction:column;gap:10px;}
.ld-pcard{background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:12px;padding:12px 14px;}
.ld-ptop{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.ld-ptop small{color:var(--spec-text-2nd,#615F72);font-size:12px;}
.ld-pkind{font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:4px 9px;border-radius:99px;background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);}
.ld-pkind.pilot{background:#E9F7F0;color:#1F7A54;}
.ld-pkind.site_visit{background:#FBF3E7;color:var(--spec-warning,#C68A28);}
.ld-pstatus{font-size:11px;font-weight:600;padding:4px 9px;border-radius:99px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-ink,#141320);text-transform:capitalize;}
.ld-pstatus.completed{background:#E9F7F0;border-color:transparent;color:#1F7A54;}
.ld-pstatus.cancelled{background:#FBECEA;border-color:transparent;color:var(--spec-error,#CE4B43);}
.ld-poutcome{font-size:11px;font-weight:700;padding:4px 9px;border-radius:99px;text-transform:capitalize;}
.ld-poutcome.passed{background:#E9F7F0;color:#1F7A54;}
.ld-poutcome.failed{background:#FBECEA;color:var(--spec-error,#CE4B43);}
.ld-poutcome.inconclusive{background:#FBF3E7;color:var(--spec-warning,#C68A28);}
.ld-pscope{margin:8px 0 0;font-size:13px;color:var(--spec-ink,#141320);line-height:1.5;}
.ld-pscope span{color:var(--spec-text-2nd,#615F72);}
.ld-pactions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;}
.ld-pactions button{font-family:inherit;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-ink,#141320);font-size:12px;border-radius:8px;padding:6px 11px;cursor:pointer;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ld-pactions button:hover{border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet-deep,#4A3DB0);}
.ld-presults{display:flex;flex-direction:column;gap:9px;margin-top:10px;}
.ld-presults textarea,.ld-presults select{font-family:inherit;font-size:13.5px;padding:10px 12px;border-radius:9px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;resize:vertical;}
.ld-popen{align-self:flex-start;font-family:inherit;font-size:12.5px;font-weight:600;background:#fff;border:1px dashed rgba(108,92,224,.45);color:var(--spec-violet-deep,#4A3DB0);border-radius:9px;padding:8px 14px;cursor:pointer;}
.ld-chat{margin-top:14px;border-top:1px solid var(--spec-border,#E2DFEC);padding-top:14px;}
.ld-chatopen{position:relative;display:inline-flex;align-items:center;gap:7px;font-family:inherit;font-size:12.5px;font-weight:600;background:#E9F7F0;border:1px solid rgba(47,158,106,.35);color:#1F7A54;border-radius:9px;padding:8px 14px;cursor:pointer;}
.ld-chatdot{width:8px;height:8px;border-radius:99px;background:var(--spec-error,#CE4B43);box-shadow:0 0 0 2px #fff;}
.ld-chatbox{background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);border-radius:12px;padding:12px;}
.ld-chathead{display:flex;justify-content:space-between;align-items:center;padding:0 2px 8px;font-size:12px;font-weight:700;color:var(--spec-ink,#141320);}
.ld-live{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;letter-spacing:.04em;color:#1F7A54;text-transform:uppercase;}
.ld-live i{width:6px;height:6px;border-radius:99px;background:var(--spec-success,#2F9E6A);animation:ld-livepulse 1.8s ease-in-out infinite;}
@keyframes ld-livepulse{0%,100%{opacity:1;}50%{opacity:.35;}}
.ld-chatlist{display:flex;flex-direction:column;gap:8px;max-height:260px;overflow-y:auto;padding:4px 2px 10px;}
.ld-chatempty{color:var(--spec-text-2nd,#615F72);font-size:13px;text-align:center;padding:14px 0;}
.ld-bubble{max-width:82%;padding:9px 12px;border-radius:12px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;display:flex;flex-direction:column;gap:3px;}
.ld-bubble small{font-size:10.5px;opacity:.65;}
.ld-bubble.pending{opacity:.65;}
.ld-bubble.me{align-self:flex-end;background:var(--spec-violet,#6C5CE0);color:#fff;border-bottom-right-radius:4px;}
.ld-bubble.them{align-self:flex-start;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-ink,#141320);border-bottom-left-radius:4px;}
.ld-chatrow{display:flex;gap:8px;}
.ld-chatrow input{flex:1;font-family:inherit;font-size:14px;padding:10px 12px;border-radius:9px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;}
.ld-chatrow input:focus{border-color:var(--spec-violet,#6C5CE0);box-shadow:0 0 0 3px rgba(108,92,224,.12);}
.ld-attachbtn{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;flex:none;font-family:inherit;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-text-2nd,#615F72);border-radius:9px;cursor:pointer;transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease),color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ld-attachbtn:hover{border-color:var(--spec-violet,#6C5CE0);color:var(--spec-violet,#6C5CE0);}
.ld-attachbtn:disabled{opacity:.5;cursor:default;}
.ld-attachhint{margin:7px 0 0;font-size:11px;color:var(--spec-text-2nd,#615F72);}
.ld-attachwarn{margin-top:3px;}
.ld-attacherr{margin:8px 0;font-size:12.5px;color:var(--spec-error,#CE4B43);line-height:1.5;}
.ld-attachchips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;}
.ld-attachchip{display:inline-flex;align-items:center;gap:6px;font-size:12px;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-ink,#141320);border-radius:8px;padding:5px 8px;max-width:220px;}
.ld-attachchip .ld-attachname{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px;}
.ld-attachchip small{color:var(--spec-text-2nd,#615F72);flex:none;}
.ld-attachchip button{display:inline-flex;align-items:center;justify-content:center;background:none;border:none;color:var(--spec-text-2nd,#615F72);cursor:pointer;padding:1px;flex:none;transition:color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ld-attachchip button:hover{color:var(--spec-error,#CE4B43);}
.ld-attachlist{display:flex;flex-direction:column;gap:5px;}
.ld-attachitem{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;border-radius:8px;padding:6px 9px;text-decoration:none;max-width:100%;}
.ld-attachitem .ld-attachname{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ld-attachitem small{opacity:.75;flex:none;}
.ld-bubble.me .ld-attachitem{background:rgba(255,255,255,.14);color:#fff;transition:background var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ld-bubble.me .ld-attachitem:hover{background:rgba(255,255,255,.24);}
.ld-bubble.them .ld-attachitem{background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-ink,#141320);transition:border-color var(--spec-duration-fast,150ms) var(--spec-ease,ease);}
.ld-bubble.them .ld-attachitem:hover{border-color:var(--spec-violet,#6C5CE0);}
a.ld-attachitem:active{transform:scale(.98);transition:transform .1s ease;}
.ld-attachitem.is-pending{opacity:.7;cursor:default;}
.ld-qform select{font-family:inherit;font-size:14px;padding:10px 12px;border-radius:9px;border:1px solid var(--spec-border,#E2DFEC);background:#fff;color:var(--spec-ink,#141320);outline:none;}
.ld-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;}
.ld-act{display:inline-flex;align-items:center;gap:6px;font-family:inherit;background:#fff;border:1px solid var(--spec-border,#E2DFEC);color:var(--spec-ink,#141320);font-size:12px;font-weight:600;border-radius:8px;padding:7px 12px;min-height:30px;cursor:pointer;transition:filter .15s ease;}
.ld-act:hover{filter:brightness(0.97);}
/* Color-coded by meaning (Design System v1.0): neutral=viewed, violet=new,
   blue=responded/in-progress, green=won, red=lost. Icon + label carry the
   meaning too, so color is never the only cue (colorblind-safe). */
.ld-act-new{background:rgba(108,92,224,.1);border-color:rgba(108,92,224,.35);color:var(--spec-violet-deep,#4A3DB0);}
.ld-act-viewed{background:var(--spec-surface,#EFEDF5);border-color:var(--spec-border,#E2DFEC);color:var(--spec-slate,#3B3A4A);}
.ld-act-responded{background:rgba(62,111,208,.1);border-color:rgba(62,111,208,.35);color:#2F5AA8;}
.ld-act-won{background:#E9F7F0;border-color:rgba(47,158,106,.4);color:#1F7A54;}
.ld-act-lost{background:#FBECEA;border-color:rgba(206,75,67,.35);color:var(--spec-error,#CE4B43);}
`;
