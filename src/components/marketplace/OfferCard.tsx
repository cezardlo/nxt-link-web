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
  const hasDetails = !!(card.validUntil || card.paymentTerms || card.warranty || card.notes);

  return (
    <div ref={cardRef} className={'ofc-card' + (card.faded ? ' ofc-faded' : '') + ` ofc-${card.status}`}>
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
.ofc-detailrow{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--spec-ink,#141320);}
.ofc-detailrow b{font-weight:600;color:var(--spec-text-2nd,#615F72);}
.ofc-notes{font-size:12px;color:var(--spec-text-2nd,#615F72);margin:2px 0 0;line-height:1.4;white-space:pre-wrap;}
.ofc-actions{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;}
@media (prefers-reduced-motion: reduce){.ofc-card,.ofc-details{transition:none!important;}}
`;
