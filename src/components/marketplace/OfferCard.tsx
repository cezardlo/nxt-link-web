'use client';

// R4 "offer-in-chat" — a vendor's quote/proposal rendered as an embedded,
// soft-shadowed CARD inside the buyer<->vendor thread (Cesar: "send
// contract... track... a contract in the chat like an icon"), instead of a
// plain text mention. Pure presentation: all status/delta logic lives in
// src/lib/messages/offerTimeline.ts (buildOfferTimeline) — this component
// only renders an OfferCardView plus whatever action buttons the page passes
// in (Accept/Decline on the buyer side; nothing / a "Revise" link on the
// vendor side — accept is NEVER triggered from this card itself, per the
// binding "accept must never be gesture-triggered" rule).
//
// 🔒 SCOPE GUARD: this is the structured OFFER card, not a legal contract —
// no e-signature/document affordance belongs here (see the R4 spec's scope
// guard on "contract").

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Clock, ShieldCheck, CreditCard, CalendarClock } from 'lucide-react';
import type { OfferCardView, OfferStatus } from '@/lib/messages/offerTimeline';
import {
  DEFAULT_COMPARE_EXTRAS_LABELS, installationValueLabel, trainingValueLabel, licenseModelValueLabel,
  partsPolicyValueLabel, responseSlaValueLabel,
  type CompareExtrasLabels,
} from './QuoteCompareTable';

export interface OfferCardLabels {
  offer: string;
  viewDetails: string;
  hideDetails: string;
  revised: string;
  leadTime: string;
  validUntil: string;
  paymentTerms: string;
  warranty: string;
  notes: string;
  priceReducedBy: string;
  priceChangedTo: string;
  was: string;
  status: Record<OfferStatus, string>;
  /** Slice R6 (flow-readiness fix) — same field-name set + wording as the
   * compare table/deck (REUSE, not a third copy of these strings). */
  extras: CompareExtrasLabels;
}

export const DEFAULT_OFFER_CARD_LABELS: OfferCardLabels = {
  offer: 'Offer',
  viewDetails: 'View details',
  hideDetails: 'Hide details',
  revised: 'Revised',
  leadTime: 'Lead time',
  validUntil: 'Valid until',
  paymentTerms: 'Payment terms',
  warranty: 'Warranty',
  notes: 'Note',
  priceReducedBy: 'Price reduced by',
  priceChangedTo: 'Price changed to',
  was: 'was',
  status: {
    sent: 'Sent', seen: 'Seen', revised: 'Revised',
    accepted: 'Accepted', declined: 'Declined', expired: 'Expired',
  },
  extras: DEFAULT_COMPARE_EXTRAS_LABELS,
};

export const OFFER_CARD_LABELS_ES: OfferCardLabels = {
  offer: 'Oferta',
  viewDetails: 'Ver detalles',
  hideDetails: 'Ocultar detalles',
  revised: 'Revisada',
  leadTime: 'Tiempo de entrega',
  validUntil: 'Válida hasta',
  paymentTerms: 'Condiciones de pago',
  warranty: 'Garantía',
  notes: 'Nota',
  priceReducedBy: 'Precio reducido en',
  priceChangedTo: 'Precio cambió a',
  was: 'antes',
  status: {
    sent: 'Enviada', seen: 'Vista', revised: 'Revisada',
    accepted: 'Aceptada', declined: 'Rechazada', expired: 'Vencida',
  },
  extras: {
    unitPrice: 'Precio unitario', shippingCost: 'Costo de envío',
    installation: 'Instalación', installationIncluded: 'Incluida', installationExtra: 'Costo adicional', installationNone: 'No disponible',
    training: 'Capacitación', trainingIncluded: 'Incluida', trainingExtra: 'Costo adicional',
    scopeSummary: 'Resumen del alcance (incluido / excluido)', duration: 'Duración', teamSize: 'Tamaño del equipo',
    emergencyResponse: 'Tiempo de respuesta de emergencia (si aplica)',
    laborRate: 'Tarifa por hora', additionalFees: 'Cargos adicionales',
    partsPolicy: 'Política de refacciones', partsOemOnly: 'Solo refacciones OEM', partsOemAftermarket: 'OEM o aftermarket',
    partsCustomerSupplied: 'El cliente surte las refacciones', partsIncludedInRate: 'Refacciones incluidas en la tarifa',
    responseSla: 'Tiempo de respuesta en sitio', rtSameDay: 'El mismo día', rtWithin24h: 'En menos de 24 horas',
    rtWithin48h: 'En menos de 48 horas', rtDays3Plus: '3 días o más',
    contractTerms: 'Términos de contrato',
    licenseModel: 'Modelo de licencia', licenseSubscription: 'Suscripción', licensePerpetual: 'Perpetua', licenseTiered: 'Por niveles',
    implementationCost: 'Costo de implementación', annualSupport: 'Cuota anual de soporte / mantenimiento',
    slaSummary: 'Resumen del SLA', pricingDetails: 'Detalles de precios',
  },
};

function money(amount: number, currency?: string | null, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale || 'en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}

export function OfferCard({
  card,
  labels = DEFAULT_OFFER_CARD_LABELS,
  locale,
  actions,
  cardRef,
}: {
  card: OfferCardView;
  labels?: OfferCardLabels;
  locale?: string;
  /** Accept/Decline (buyer) or Revise (vendor) — rendered only on the latest card by the caller. */
  actions?: React.ReactNode;
  /** Lets the pinned tracker scroll straight to the LATEST card. */
  cardRef?: React.Ref<HTMLDivElement>;
}) {
  const [expanded, setExpanded] = useState(false);
  // Slice R6 (flow-readiness fix) — a quote "has extras" when at least one
  // per-kind field is actually set (never rendered as an empty/placeholder row).
  const e = card.extras;
  const hasExtras = !!e && (
    e.unit_price != null || e.shipping_cost != null || !!e.installation || !!e.training
    || !!e.scope_summary || !!e.duration || e.team_size != null || !!e.emergency_response
    || e.labor_rate != null || !!e.additional_fees || !!e.parts_policy || !!e.response_sla || !!e.contract_terms
    || !!e.license_model || e.implementation_cost != null || e.annual_support != null
    || !!e.sla_summary || !!e.pricing_details
  );
  const hasDetails = !!(card.validUntil || card.paymentTerms || card.warranty || card.notes || hasExtras);

  return (
    <div ref={cardRef} className={'ofc-card nxm-in' + (card.faded ? ' ofc-faded' : '') + ` ofc-${card.status}`}>
      <div className="ofc-top">
        <span className="ofc-icon" aria-hidden="true"><FileText size={14} strokeWidth={2} /></span>
        <span className="ofc-label">{labels.offer}{card.revision > 1 ? ` · v${card.revision}` : ''}</span>
        {card.revisedBadge && <span className="ofc-badge">{labels.revised}</span>}
        <span className={`ofc-status ofc-status-${card.status}`}>{labels.status[card.status]}</span>
      </div>

      <div className="ofc-headline">
        <span className="ofc-price">{card.total != null ? money(card.total, card.currency, locale) : '—'}</span>
        {card.leadTime && (
          <span className="ofc-leadtime"><Clock size={12} strokeWidth={2} aria-hidden="true" />{card.leadTime}</span>
        )}
      </div>

      {card.delta && (
        <div className={'ofc-delta ofc-delta-' + card.delta.direction}>
          {card.delta.direction === 'down'
            ? `${labels.priceReducedBy} ${money(card.delta.amount, card.delta.currency, locale)}`
            : `${labels.priceChangedTo} ${card.total != null ? money(card.total, card.delta.currency, locale) : ''} (${labels.was} ${money((card.total ?? 0) - card.delta.amount, card.delta.currency, locale)})`}
        </div>
      )}

      {hasDetails && (
        <button type="button" className="ofc-toggle" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          {expanded ? labels.hideDetails : labels.viewDetails}
          {expanded ? <ChevronUp size={13} strokeWidth={2} aria-hidden="true" /> : <ChevronDown size={13} strokeWidth={2} aria-hidden="true" />}
        </button>
      )}

      {expanded && hasDetails && (
        <div className="ofc-details">
          {card.validUntil && (
            <div className="ofc-detailrow"><CalendarClock size={12} strokeWidth={2} aria-hidden="true" /><b>{labels.validUntil}:</b> {new Date(card.validUntil).toLocaleDateString(locale)}</div>
          )}
          {card.paymentTerms && (
            <div className="ofc-detailrow"><CreditCard size={12} strokeWidth={2} aria-hidden="true" /><b>{labels.paymentTerms}:</b> {card.paymentTerms}</div>
          )}
          {card.warranty && (
            <div className="ofc-detailrow"><ShieldCheck size={12} strokeWidth={2} aria-hidden="true" /><b>{labels.warranty}:</b> {card.warranty}</div>
          )}
          {/* Slice R6 (flow-readiness fix) — the vendor's per-kind quote
              extras, compact list, data-gated field-by-field. No icon per
              row (13 possible fields — one repeated icon would be noise,
              not signal); the existing 3 rows above keep their icons. */}
          {hasExtras && (
            <div className="ofc-extras">
              {e!.unit_price != null && <div className="ofc-detailrow"><b>{labels.extras.unitPrice}:</b> {money(e!.unit_price, card.currency, locale)}</div>}
              {e!.shipping_cost != null && <div className="ofc-detailrow"><b>{labels.extras.shippingCost}:</b> {money(e!.shipping_cost, card.currency, locale)}</div>}
              {!!e!.installation && <div className="ofc-detailrow"><b>{labels.extras.installation}:</b> {installationValueLabel(e!.installation, labels.extras)}</div>}
              {!!e!.training && <div className="ofc-detailrow"><b>{labels.extras.training}:</b> {trainingValueLabel(e!.training, labels.extras)}</div>}
              {!!e!.scope_summary && <div className="ofc-detailrow"><b>{labels.extras.scopeSummary}:</b> {e!.scope_summary}</div>}
              {!!e!.duration && <div className="ofc-detailrow"><b>{labels.extras.duration}:</b> {e!.duration}</div>}
              {e!.team_size != null && <div className="ofc-detailrow"><b>{labels.extras.teamSize}:</b> {e!.team_size}</div>}
              {!!e!.emergency_response && <div className="ofc-detailrow"><b>{labels.extras.emergencyResponse}:</b> {e!.emergency_response}</div>}
              {e!.labor_rate != null && <div className="ofc-detailrow"><b>{labels.extras.laborRate}:</b> {money(e!.labor_rate, card.currency, locale)}</div>}
              {!!e!.additional_fees && <div className="ofc-detailrow"><b>{labels.extras.additionalFees}:</b> {e!.additional_fees}</div>}
              {!!e!.parts_policy && <div className="ofc-detailrow"><b>{labels.extras.partsPolicy}:</b> {partsPolicyValueLabel(e!.parts_policy, labels.extras)}</div>}
              {!!e!.response_sla && <div className="ofc-detailrow"><b>{labels.extras.responseSla}:</b> {responseSlaValueLabel(e!.response_sla, labels.extras)}</div>}
              {!!e!.contract_terms && <div className="ofc-detailrow"><b>{labels.extras.contractTerms}:</b> {e!.contract_terms}</div>}
              {!!e!.license_model && <div className="ofc-detailrow"><b>{labels.extras.licenseModel}:</b> {licenseModelValueLabel(e!.license_model, labels.extras)}</div>}
              {e!.implementation_cost != null && <div className="ofc-detailrow"><b>{labels.extras.implementationCost}:</b> {money(e!.implementation_cost, card.currency, locale)}</div>}
              {e!.annual_support != null && <div className="ofc-detailrow"><b>{labels.extras.annualSupport}:</b> {money(e!.annual_support, card.currency, locale)}</div>}
              {!!e!.sla_summary && <div className="ofc-detailrow"><b>{labels.extras.slaSummary}:</b> {e!.sla_summary}</div>}
              {!!e!.pricing_details && <div className="ofc-detailrow"><b>{labels.extras.pricingDetails}:</b> {e!.pricing_details}</div>}
            </div>
          )}
          {card.notes && <p className="ofc-notes">{card.notes}</p>}
        </div>
      )}

      {actions && card.isLatest && <div className="ofc-actions">{actions}</div>}
    </div>
  );
}

// Namespaced (ofc-) so it drops safely into either chat thread. One violet
// accent per zone (the icon chip + "seen/accepted" tints); soft violet-tinted
// shadow per the design charter. Reduced-motion respected: the only motion is
// the expand/collapse, which is a height/opacity transition already skipped
// under prefers-reduced-motion below.
export const OFFER_CARD_CSS = `
.ofc-card{background:#fff;border:1px solid rgba(108,92,224,.22);border-radius:14px;padding:12px 14px;box-shadow:0 2px 10px rgba(108,92,224,.08);max-width:340px;}
.ofc-card.ofc-faded{opacity:.6;}
.ofc-top{display:flex;align-items:center;gap:7px;margin-bottom:8px;flex-wrap:wrap;}
.ofc-icon{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:7px;background:rgba(108,92,224,.12);color:var(--spec-violet-deep,#4A3DB0);flex-shrink:0;}
.ofc-label{font-size:11px;font-weight:700;color:var(--spec-text-2nd,#615F72);text-transform:uppercase;letter-spacing:.04em;}
.ofc-badge{font-size:9.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;background:#F3EFEF;color:#8A6D3B;border-radius:99px;padding:2px 7px;}
.ofc-status{margin-left:auto;font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px;white-space:nowrap;}
.ofc-status-sent{background:#FBF3E7;color:#C68A28;}
.ofc-status-seen{background:rgba(108,92,224,.1);color:var(--spec-violet-deep,#4A3DB0);}
.ofc-status-revised{background:#F3EFEF;color:#8A6D3B;}
.ofc-status-accepted{background:#E9F7F0;color:#1F7A54;}
.ofc-status-declined{background:#FBEAEA;color:#B3362B;}
.ofc-status-expired{background:#F1F0F4;color:#706D88;}
.ofc-headline{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:2px;}
.ofc-price{font-size:20px;font-weight:800;color:var(--spec-ink,#141320);font-variant-numeric:tabular-nums;}
.ofc-leadtime{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;font-weight:700;color:var(--spec-ink,#141320);}
.ofc-delta{margin-top:6px;font-size:11.5px;font-weight:700;padding:5px 9px;border-radius:8px;display:inline-block;}
.ofc-delta-down{background:#E9F7F0;color:#1F7A54;}
.ofc-delta-up{background:#F1F0F4;color:#4A4760;}
.ofc-toggle{margin-top:8px;display:inline-flex;align-items:center;gap:4px;font-family:inherit;font-size:11.5px;font-weight:600;color:var(--spec-violet-deep,#4A3DB0);background:none;border:none;padding:0;cursor:pointer;}
.ofc-details{margin-top:8px;padding-top:8px;border-top:1px solid var(--spec-border,#E2DFEC);display:flex;flex-direction:column;gap:5px;}
.ofc-extras{display:flex;flex-direction:column;gap:5px;}
.ofc-detailrow{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--spec-ink,#141320);}
.ofc-detailrow b{font-weight:600;color:var(--spec-text-2nd,#615F72);}
.ofc-notes{font-size:12px;color:var(--spec-text-2nd,#615F72);margin:2px 0 0;line-height:1.4;white-space:pre-wrap;}
.ofc-actions{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;}
@media (prefers-reduced-motion: reduce){.ofc-card,.ofc-details{transition:none!important;}}
`;
