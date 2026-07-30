// Pure, framework-free helpers for R4's "offer-in-chat" (Cesar: "send
// contract... track... a contract in the chat like an icon"). Turns a
// vendor's quote_proposals revision history (src/app/api/vendor/proposals/
// route.ts — draft -> submitted -> revised on re-submit) into a timeline of
// embedded OFFER CARDS for the buyer<->vendor thread, with an honest status
// per card derived from REAL data only:
//
//   Sent -> Seen -> Revised -> Accepted / Declined / Expired
//
// "Seen" comes from the notifications row NOTIFYING THE BUYER about this
// quote (type 'quote', written by POST /api/vendor/proposals and the legacy
// POST /api/vendor/quote) having read_at set — the exact same signal the
// buyer dashboard already uses for its "unread chat" dot
// (src/app/buyer/page.tsx's unreadChatIds). Nothing here writes anything or
// invents a new column; it is a read-only projection of existing rows.
//
// Backward compat: a lead answered through the OLDER flat-amount endpoint
// (src/app/api/vendor/quote/route.ts) has no quote_proposals rows at all
// (that route never wrote one) — synthesizeLegacyOffer() builds a single
// "revision 1" card straight from the quote_requests mirror fields so old
// quotes still render as a real offer card, never a blank thread.

export type OfferStatus = 'sent' | 'seen' | 'revised' | 'accepted' | 'declined' | 'expired';

export interface OfferRevisionInput {
  id: string;
  revision: number;
  /** quote_proposals.status: draft | submitted | revised | final. */
  status: string;
  total: number | null;
  currency?: string | null;
  lead_time?: string | null;
  valid_until?: string | null;
  payment_terms?: string | null;
  warranty?: string | null;
  notes?: string | null;
  submitted_at?: string | null;
  created_at: string;
}

export interface OfferThreadContext {
  buyerDecision?: string | null;
  /** True when the buyer has read the in-app notification for this quote. */
  buyerHasSeenOffer?: boolean;
  nowMs?: number;
}

export interface OfferDelta {
  direction: 'down' | 'up';
  amount: number;
  currency: string | null;
}

export interface OfferCardView {
  id: string;
  revision: number;
  isLatest: boolean;
  total: number | null;
  currency: string | null;
  leadTime: string | null;
  validUntil: string | null;
  paymentTerms: string | null;
  warranty: string | null;
  notes: string | null;
  /** Timestamp used to place this card in the merged message+offer timeline. */
  at: string;
  status: OfferStatus;
  /** Every non-latest revision fades and carries the "Revised" badge (design addendum #6). */
  faded: boolean;
  revisedBadge: boolean;
  /** Price change vs. the immediately preceding revision, if any. */
  delta: OfferDelta | null;
}

/** Only non-draft revisions are real "offers" a buyer should ever see. */
function excludeDrafts(rows: OfferRevisionInput[]): OfferRevisionInput[] {
  return rows.filter((r) => r.status !== 'draft');
}

export function isOfferExpired(validUntil: string | null | undefined, nowMs: number): boolean {
  if (!validUntil) return false;
  const t = new Date(validUntil).getTime();
  if (!Number.isFinite(t)) return false;
  return t < nowMs;
}

/**
 * Build the ordered (oldest -> newest), status-annotated offer timeline for
 * one thread. `revisionsInput` should be every non-draft quote_proposals row
 * for this quote_request_id (or the single synthesized legacy card — see
 * synthesizeLegacyOffer). Draft rows are filtered out defensively even if the
 * caller forgot to.
 */
export function buildOfferTimeline(
  revisionsInput: OfferRevisionInput[],
  ctx: OfferThreadContext = {},
): OfferCardView[] {
  const nowMs = ctx.nowMs ?? Date.now();
  const sorted = excludeDrafts(revisionsInput).slice().sort((a, b) => a.revision - b.revision);

  return sorted.map((r, i) => {
    const isLatest = i === sorted.length - 1;
    const prev = i > 0 ? sorted[i - 1] : null;

    let delta: OfferDelta | null = null;
    if (prev && prev.total != null && r.total != null && prev.total !== r.total) {
      delta = {
        direction: r.total < prev.total ? 'down' : 'up',
        amount: Math.abs(r.total - prev.total),
        currency: r.currency ?? prev.currency ?? null,
      };
    }

    let status: OfferStatus;
    if (!isLatest) {
      status = 'revised';
    } else if (ctx.buyerDecision === 'accepted') {
      status = 'accepted';
    } else if (ctx.buyerDecision === 'declined') {
      status = 'declined';
    } else if (isOfferExpired(r.valid_until, nowMs)) {
      status = 'expired';
    } else if (ctx.buyerHasSeenOffer) {
      status = 'seen';
    } else {
      status = 'sent';
    }

    return {
      id: r.id,
      revision: r.revision,
      isLatest,
      total: r.total,
      currency: r.currency ?? null,
      leadTime: r.lead_time ?? null,
      validUntil: r.valid_until ?? null,
      paymentTerms: r.payment_terms ?? null,
      warranty: r.warranty ?? null,
      notes: r.notes ?? null,
      at: r.submitted_at || r.created_at,
      status,
      faded: !isLatest,
      revisedBadge: !isLatest,
      delta,
    };
  });
}

/** Shape of the quote_requests mirror fields every quote-send path writes. */
export interface LegacyOfferSource {
  id: string;
  quote_amount: number | null;
  quote_currency?: string | null;
  quote_timeline?: string | null;
  quote_valid_until?: string | null;
  quote_payment_terms?: string | null;
  quote_warranty?: string | null;
  quote_message?: string | null;
  quoted_at?: string | null;
  created_at: string;
}

/**
 * A single "revision 1" card for a lead that only ever went through the
 * legacy flat-amount endpoint (no quote_proposals rows). Returns null when
 * no quote has actually been sent (nothing to synthesize).
 */
export function synthesizeLegacyOffer(source: LegacyOfferSource): OfferRevisionInput | null {
  if (source.quote_amount == null) return null;
  return {
    id: `legacy-${source.id}`,
    revision: 1,
    status: 'submitted',
    total: source.quote_amount,
    currency: source.quote_currency ?? null,
    lead_time: source.quote_timeline ?? null,
    valid_until: source.quote_valid_until ?? null,
    payment_terms: source.quote_payment_terms ?? null,
    warranty: source.quote_warranty ?? null,
    notes: source.quote_message ?? null,
    submitted_at: source.quoted_at ?? null,
    created_at: source.quoted_at || source.created_at,
  };
}

/**
 * The single entry point a thread's data loader should call: prefer real
 * quote_proposals revision history; fall back to one synthesized card for
 * older, pre-R3 leads that only have the flat quote_requests mirror.
 */
export function offerRevisionsForThread(
  proposals: OfferRevisionInput[],
  legacySource: LegacyOfferSource,
): OfferRevisionInput[] {
  const real = excludeDrafts(proposals);
  if (real.length > 0) return real;
  const legacy = synthesizeLegacyOffer(legacySource);
  return legacy ? [legacy] : [];
}
