// Pure, framework-free helpers for the buyer's quote comparison (FIX 1) and the
// post-accept "what happens next" state (FIX 2). No masking / contact data is
// involved here: callers pass only non-sensitive quote fields (the vendor's
// PUBLIC company name, price, lead time, validity). Contact details (email /
// phone) are never part of a comparison row and stay governed by src/lib/guard.ts.
//
// Why grouping exists: a buyer who posts one open RFQ (/intake) has it fanned
// out to several vendors (src/lib/requests/dispatch.ts), so several
// `quote_requests` rows — each a competing quote for the SAME need — land in
// their dashboard. Those rows share `answers.source_request` (the originating
// request's public_ref). Self-service single-listing requests have no
// `source_request`, so each is its own singleton need.

export interface ComparableQuote {
  id: string;
  /**
   * The open-RFQ public_ref this quote answers, if any. Multiple vendors
   * quoting the same open request share this value; self-service
   * (single-listing) quotes have none.
   */
  sourceRequest?: string | null;
  quote_amount?: number | null;
}

export interface QuoteGroup<T extends ComparableQuote> {
  /** Stable de-dupe key for React lists. */
  key: string;
  /** Non-null only for real multi-vendor RFQ groups (the shared request ref). */
  sourceRequest: string | null;
  quotes: T[];
  /** A group is "comparable" (worth a side-by-side table) when 2+ quotes carry a price. */
  comparable: boolean;
}

/** Grouping key: the shared open-RFQ ref if present, else the quote's own id (a singleton). */
export function needKey(q: ComparableQuote): string {
  const src = (q.sourceRequest || '').trim();
  return src ? `rfq:${src}` : `one:${q.id}`;
}

/**
 * Cluster a buyer's received quotes into "same need" groups, preserving input
 * order. Quotes for one open RFQ collapse into a single group; single-listing
 * requests each stand alone. A group is flagged `comparable` when 2+ of its
 * quotes actually have a price (so the UI can show a side-by-side table and
 * degrade cleanly to a single-quote view otherwise).
 */
export function groupQuotesForCompare<T extends ComparableQuote>(quotes: T[]): QuoteGroup<T>[] {
  const byKey = new Map<string, T[]>();
  const order: string[] = [];
  for (const q of quotes) {
    const k = needKey(q);
    if (!byKey.has(k)) { byKey.set(k, []); order.push(k); }
    byKey.get(k)!.push(q);
  }
  return order.map((k) => {
    const list = byKey.get(k)!;
    const pricedCount = list.reduce((n, q) => (q.quote_amount != null ? n + 1 : n), 0);
    const src = (list[0]?.sourceRequest || '').trim() || null;
    return {
      key: k,
      // Only surface the shared ref for genuine multi-quote groups.
      sourceRequest: list.length > 1 ? src : null,
      quotes: list,
      comparable: pricedCount >= 2,
    };
  });
}

/**
 * The lowest-priced quote's id among priced quotes ("best value" by price).
 * Ties resolve to the first in input order. Returns null when nothing is priced.
 * (Lowest price is not always the best deal — the UI still shows timeline and
 * fit — but a clear price anchor is the single most useful comparison cue.)
 */
export function bestValueQuoteId(quotes: ComparableQuote[]): string | null {
  let bestId: string | null = null;
  let bestAmt = Number.POSITIVE_INFINITY;
  for (const q of quotes) {
    if (q.quote_amount == null) continue;
    if (q.quote_amount < bestAmt) { bestAmt = q.quote_amount; bestId = q.id; }
  }
  return bestId;
}

/**
 * Parse a free-text lead time ("2 weeks", "6 wks", "10 days", "3 months") into
 * days so a comparison can draw a length-proportional bar. Returns null when
 * unparseable (the UI then simply omits the bar).
 */
export function parseTimelineDays(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = s.match(/(\d+(?:\.\d+)?)\s*(days?|d|weeks?|wks?|w|months?|mos?|mo|m)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const u = m[2].toLowerCase();
  if (u.startsWith('d')) return n;
  if (u.startsWith('w')) return n * 7;
  return n * 30; // month(s)
}

export interface AcceptedDealView {
  /** The buyer has accepted — the deal is live and being tracked. */
  connected: boolean;
  /**
   * Contact masking has lifted for this thread. Mirrors the server rule in
   * src/lib/guard.ts consumers (buyer/vendor message POST skip maskContacts
   * only when buyer_decision === 'accepted'); this is a read of that rule, not
   * a second source of truth.
   */
  contactUnlocked: boolean;
  amount: number | null;
  currency: string | null;
  timeline: string | null;
  validUntil: string | null;
}

/**
 * Post-accept "what happens next" selector (FIX 2). Returns the agreed terms +
 * the fact that the deal is connected and contact is unlocked — or null when
 * the quote is not accepted (declined / undecided render their own states).
 * Deliberately says nothing about payment/escrow: none exists in the
 * commission model.
 */
export function describeAcceptedDeal(q: {
  buyer_decision?: string | null;
  quote_amount?: number | null;
  quote_currency?: string | null;
  quote_timeline?: string | null;
  quote_valid_until?: string | null;
}): AcceptedDealView | null {
  if (q.buyer_decision !== 'accepted') return null;
  return {
    connected: true,
    contactUnlocked: true,
    amount: q.quote_amount ?? null,
    currency: q.quote_currency ?? null,
    timeline: q.quote_timeline ?? null,
    validUntil: q.quote_valid_until ?? null,
  };
}
