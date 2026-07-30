'use client';

// R4 pinned deal tracker (Cesar: "tracking throughout the conversation...
// current milestones... click an icon... go up in the conversation"). A slim
// header pinned above a thread's scrollable message list (rendered BETWEEN
// the chat header and the message list, so it never scrolls away with the
// messages — the existing chat box already has this fixed-header/scrolling-
// body shape, this just adds a second fixed row). Tapping it scrolls the
// thread to the latest offer card.
//
// Milestones are display-only, derived by src/lib/messages/dealTracker.ts
// from real statuses already on this quote_requests/commissions pair — no
// new DB status, no payment-funded step (binding deviation #2).

import { FileText } from 'lucide-react';
import { DEAL_MILESTONE_SEQUENCE, milestoneIndex, type DealMilestone } from '@/lib/messages/dealTracker';

export interface DealTrackerLabels {
  milestones: Record<DealMilestone, string>;
  jumpToOffer: string;
}

export const DEFAULT_DEAL_TRACKER_LABELS: DealTrackerLabels = {
  milestones: {
    request: 'Request', quote_sent: 'Quote sent', revised: 'Revised',
    accepted: 'Accepted', in_progress: 'In progress', completed: 'Completed',
    declined: 'Declined',
  },
  jumpToOffer: 'Jump to the latest offer',
};

export const DEAL_TRACKER_LABELS_ES: DealTrackerLabels = {
  milestones: {
    request: 'Solicitud', quote_sent: 'Cotización enviada', revised: 'Revisada',
    accepted: 'Aceptada', in_progress: 'En progreso', completed: 'Completada',
    declined: 'Rechazada',
  },
  jumpToOffer: 'Ir a la última oferta',
};

function money(amount: number, currency?: string | null, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale || 'en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}

export function DealTracker({
  milestone,
  currentPrice,
  currentCurrency,
  locale,
  labels = DEFAULT_DEAL_TRACKER_LABELS,
  onJumpToOffer,
}: {
  milestone: DealMilestone;
  currentPrice: number | null;
  currentCurrency?: string | null;
  locale?: string;
  labels?: DealTrackerLabels;
  onJumpToOffer?: () => void;
}) {
  const idx = milestoneIndex(milestone);
  const isDeclined = milestone === 'declined';

  return (
    <div className="dtr-wrap">
      <div className="dtr-pills" role="list" aria-label={labels.milestones[milestone]}>
        {isDeclined ? (
          <span className="dtr-pill dtr-declined" role="listitem">{labels.milestones.declined}</span>
        ) : (
          DEAL_MILESTONE_SEQUENCE.map((m, i) => (
            <span
              key={m}
              role="listitem"
              className={'dtr-pill' + (i === idx ? ' dtr-current' : '') + (i < idx ? ' dtr-done' : '')}
            >
              {labels.milestones[m]}
            </span>
          ))
        )}
      </div>
      {/* Mobile-only collapsed form: just the current milestone (design
          addendum — "mobile: collapses to icon + current milestone"). Kept in
          the DOM always and toggled purely by CSS so there's one source of
          truth for the label. */}
      <span className={'dtr-pill dtr-current dtr-mobileonly' + (isDeclined ? ' dtr-declined' : '')}>
        {labels.milestones[milestone]}
      </span>
      {currentPrice != null && (
        <button type="button" className="dtr-price" onClick={onJumpToOffer} title={labels.jumpToOffer} aria-label={`${labels.jumpToOffer} — ${money(currentPrice, currentCurrency, locale)}`}>
          <FileText size={13} strokeWidth={2} aria-hidden="true" />
          <span className="dtr-priceval">{money(currentPrice, currentCurrency, locale)}</span>
        </button>
      )}
    </div>
  );
}

// Namespaced (dtr-). Desktop: pill row + price chip side by side. Mobile:
// pills collapse to just the current one (icon + label) — thumb-safe, still
// tappable, same jump. One violet accent (the current pill + price chip).
export const DEAL_TRACKER_CSS = `
.dtr-wrap{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;margin:-12px -12px 10px;background:#F7F6FB;border-bottom:1px solid var(--spec-border,#E2DFEC);border-radius:12px 12px 0 0;flex-wrap:wrap;}
.dtr-pills{display:flex;align-items:center;gap:4px;flex-wrap:wrap;list-style:none;}
.dtr-pill{font-size:10px;font-weight:700;letter-spacing:.02em;color:var(--spec-text-2nd,#615F72);background:#EFEDF5;border-radius:99px;padding:3px 8px;white-space:nowrap;}
.dtr-pill.dtr-done{color:#1F7A54;background:#E9F7F0;}
.dtr-pill.dtr-current{color:#fff;background:var(--spec-violet,#6C5CE0);}
.dtr-pill.dtr-declined{color:#B3362B;background:#FBEAEA;}
.dtr-price{display:inline-flex;align-items:center;gap:5px;font-family:inherit;font-size:12px;font-weight:800;color:var(--spec-violet-deep,#4A3DB0);background:#fff;border:1px solid rgba(108,92,224,.3);border-radius:9px;padding:5px 10px;cursor:pointer;white-space:nowrap;box-shadow:0 1px 4px rgba(108,92,224,.1);}
.dtr-price:hover{background:rgba(108,92,224,.06);}
.dtr-price:focus-visible{outline:2px solid var(--spec-violet,#6C5CE0);outline-offset:2px;}
.dtr-mobileonly{display:none;}
@media (max-width:520px){
  .dtr-pills{display:none;}
  .dtr-mobileonly{display:inline-block;}
}
`;
