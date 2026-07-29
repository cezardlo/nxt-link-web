// Pure helpers to compute HONEST, already-derivable activity stats for a
// buyer's original open request card (Slice RV, 2026-07-29) — "Sent to N
// vendors · X quotes received · last activity …". Nothing here is a new data
// source: every number comes from the same `quote_requests` rows the buyer
// dashboard already fetches (GET /api/buyer/dashboard), linked to the
// originating open-RFQ request via `answers.source_request` (written by
// src/lib/requests/dispatch.ts and the POST in
// src/app/api/vendor/open-requests/route.ts — both set it to the request's
// own public_ref). No schema change; no invented numbers.

export interface LinkableQuote {
  id: string;
  status?: string | null;
  quote_amount?: number | null;
  buyer_decision?: string | null;
  created_at: string;
  updated_at?: string | null;
  answers?: { source_request?: string | null } | null;
}

export interface RequestActivity {
  /** Vendors this open request was actually fanned out to / claimed by. */
  sentTo: number;
  /** Of those, how many have progressed past "new" (opened, quoted, decided). */
  viewedBy: number;
  /** Of those, how many have actually returned a priced quote. */
  quotesReceived: number;
  /** Most recent timestamp across the request itself and its linked quotes. */
  lastActivityAt: string | null;
}

// Statuses that mean "a vendor hasn't done anything with this lead yet" —
// mirrors src/lib/vendor/leadStatus.ts's AUTO_VIEWABLE_STATUSES (the same two
// values a lead starts in before any vendor action).
const UNSEEN_STATUSES = new Set(['new', 'sent_to_vendor']);

/** Quotes fanned out from / claiming the same open request (by public_ref). */
export function linkedQuotes<T extends LinkableQuote>(
  requestRef: string | null | undefined,
  quotes: T[],
): T[] {
  const ref = (requestRef || '').trim();
  if (!ref) return [];
  return quotes.filter((q) => (q.answers?.source_request || '').trim() === ref);
}

export function computeRequestActivity(
  request: { public_ref: string | null; created_at: string },
  quotes: LinkableQuote[],
): RequestActivity {
  const linked = linkedQuotes(request.public_ref, quotes);
  const sentTo = linked.length;
  const viewedBy = linked.filter((q) => !!q.status && !UNSEEN_STATUSES.has(q.status)).length;
  const quotesReceived = linked.filter((q) => q.quote_amount != null).length;
  const stamps = [request.created_at, ...linked.map((q) => q.updated_at || q.created_at)].filter(
    (s): s is string => !!s,
  );
  const lastActivityAt = stamps.length
    ? stamps.reduce((latest, s) => (new Date(s).getTime() > new Date(latest).getTime() ? s : latest))
    : null;
  return { sentTo, viewedBy, quotesReceived, lastActivityAt };
}

// How long to wait before showing the calm "no quotes yet" hint — a UI
// reveal threshold only, NOT a response-time promise (binding copy
// deviation: no invented SLA — we have zero volume to back a number like
// "vendors typically respond within 24/48 hours").
export const STALE_HINT_HOURS = 48;

/** True when a request has waited "a while" (see STALE_HINT_HOURS) with zero priced quotes. */
export function isRequestStale(
  request: { created_at: string },
  activity: Pick<RequestActivity, 'quotesReceived'>,
  nowMs: number = Date.now(),
): boolean {
  if (activity.quotesReceived > 0) return false;
  const created = new Date(request.created_at).getTime();
  if (!Number.isFinite(created)) return false;
  return nowMs - created >= STALE_HINT_HOURS * 3600_000;
}

// --- Status pill (Slice RV, item 4) -----------------------------------------
// A discrete, calm pipeline pill for a buyer's ORIGINAL request card — derived
// purely from the statuses/decisions already on its linked quote_requests
// rows (never a write, never a new column). client_requests.status itself is
// insert-only (no writer exists anywhere in src/ — a known, separately-scoped
// gap), so this is computed fresh on every render instead of trusting that
// stale column. Mirrors the exact vocabulary in the binding spec: Sent →
// Viewed → Quotes received → Accepted/Closed "as data supports".

export type RequestStage = 'sent' | 'viewed' | 'quotes_received' | 'accepted' | 'closed';

/** Statuses that count as "a vendor closed this out without the buyer accepting". */
const CLOSED_WITHOUT_ACCEPT_STATUSES = new Set(['lost', 'spam']);

export function deriveRequestStage(
  linked: Array<Pick<LinkableQuote, 'status' | 'quote_amount' | 'buyer_decision'>>,
): RequestStage {
  if (linked.length === 0) return 'sent';
  if (linked.some((q) => q.buyer_decision === 'accepted')) return 'accepted';
  const allClosedNoAccept = linked.every(
    (q) => q.buyer_decision === 'declined' || CLOSED_WITHOUT_ACCEPT_STATUSES.has(q.status || ''),
  );
  if (allClosedNoAccept) return 'closed';
  if (linked.some((q) => q.quote_amount != null)) return 'quotes_received';
  if (linked.some((q) => !!q.status && !UNSEEN_STATUSES.has(q.status))) return 'viewed';
  return 'sent';
}
