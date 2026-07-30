import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeRequestActivity,
  deriveRequestStage,
  isRequestStale,
  isStaleWithNoResponse,
  linkedQuotes,
  STALE_HINT_HOURS,
  type LinkableQuote,
} from '@/lib/buyer/requestStats';

// Slice RV (2026-07-29): "Sent to N vendors · X quotes received · last
// activity" on the buyer's original (/intake) request card. N comes from
// counting the real quote_requests rows the dispatch fan-out
// (src/lib/requests/dispatch.ts) or a vendor's self-claim
// (api/vendor/open-requests) already created for this request — matched via
// answers.source_request === request.public_ref. No invented numbers.

const HOUR = 3600_000;

function quote(overrides: Partial<LinkableQuote> & { id: string }): LinkableQuote {
  return {
    status: 'new',
    quote_amount: null,
    created_at: '2026-07-29T00:00:00.000Z',
    ...overrides,
  };
}

test('linkedQuotes matches only quotes sharing this request\'s public_ref via answers.source_request', () => {
  const quotes = [
    quote({ id: 'a', answers: { source_request: 'REQ-1' } }),
    quote({ id: 'b', answers: { source_request: 'REQ-2' } }),
    quote({ id: 'c', answers: { source_request: 'REQ-1' } }),
    quote({ id: 'd' }), // self-service quote, no source_request at all
  ];
  const linked = linkedQuotes('REQ-1', quotes);
  assert.deepEqual(linked.map((q) => q.id), ['a', 'c']);
});

test('linkedQuotes returns empty for a null/blank ref (never matches everything by accident)', () => {
  const quotes = [quote({ id: 'a', answers: { source_request: '' } }), quote({ id: 'b' })];
  assert.deepEqual(linkedQuotes(null, quotes), []);
  assert.deepEqual(linkedQuotes('  ', quotes), []);
});

test('computeRequestActivity: sentTo counts every linked vendor lead, quotesReceived only priced ones', () => {
  const quotes = [
    quote({ id: 'a', answers: { source_request: 'REQ-9' }, status: 'new' }),
    quote({ id: 'b', answers: { source_request: 'REQ-9' }, status: 'viewed' }),
    quote({ id: 'c', answers: { source_request: 'REQ-9' }, status: 'responded', quote_amount: 4200 }),
    quote({ id: 'x', answers: { source_request: 'OTHER' } }), // different request — must not count
  ];
  const activity = computeRequestActivity({ public_ref: 'REQ-9', created_at: '2026-07-29T00:00:00.000Z' }, quotes);
  assert.equal(activity.sentTo, 3);
  assert.equal(activity.quotesReceived, 1);
});

test('computeRequestActivity: viewedBy counts leads that progressed past new/sent_to_vendor', () => {
  const quotes = [
    quote({ id: 'a', answers: { source_request: 'REQ-9' }, status: 'new' }),
    quote({ id: 'b', answers: { source_request: 'REQ-9' }, status: 'sent_to_vendor' }),
    quote({ id: 'c', answers: { source_request: 'REQ-9' }, status: 'viewed' }),
    quote({ id: 'd', answers: { source_request: 'REQ-9' }, status: 'responded', quote_amount: 100 }),
    quote({ id: 'e', answers: { source_request: 'REQ-9' }, status: 'won', quote_amount: 100 }),
  ];
  const activity = computeRequestActivity({ public_ref: 'REQ-9', created_at: '2026-07-29T00:00:00.000Z' }, quotes);
  assert.equal(activity.sentTo, 5);
  assert.equal(activity.viewedBy, 3); // viewed, responded, won — not new/sent_to_vendor
});

test('computeRequestActivity: zero linked vendors is honest, not an error (edge case: dispatch matched nobody)', () => {
  const activity = computeRequestActivity({ public_ref: 'REQ-LONELY', created_at: '2026-07-29T00:00:00.000Z' }, []);
  assert.equal(activity.sentTo, 0);
  assert.equal(activity.viewedBy, 0);
  assert.equal(activity.quotesReceived, 0);
  assert.equal(activity.lastActivityAt, '2026-07-29T00:00:00.000Z'); // falls back to the request's own timestamp
});

test('computeRequestActivity: lastActivityAt is the most recent timestamp across the request and every linked quote', () => {
  const quotes = [
    quote({ id: 'a', answers: { source_request: 'REQ-9' }, created_at: '2026-07-29T01:00:00.000Z', updated_at: '2026-07-29T03:00:00.000Z' }),
    quote({ id: 'b', answers: { source_request: 'REQ-9' }, created_at: '2026-07-29T02:00:00.000Z', updated_at: null }),
  ];
  const activity = computeRequestActivity({ public_ref: 'REQ-9', created_at: '2026-07-29T00:00:00.000Z' }, quotes);
  // 'a' has updated_at 03:00 (most recent); 'b' falls back to its created_at 02:00.
  assert.equal(activity.lastActivityAt, '2026-07-29T03:00:00.000Z');
});

test('isRequestStale: never stale once at least one priced quote exists, regardless of age', () => {
  const request = { created_at: new Date(Date.now() - 100 * HOUR).toISOString() };
  assert.equal(isRequestStale(request, { quotesReceived: 1 }), false);
});

test(`isRequestStale: false before ${STALE_HINT_HOURS}h, true at/after it, with zero quotes`, () => {
  const now = Date.now();
  const justUnder = { created_at: new Date(now - (STALE_HINT_HOURS * HOUR - 1)).toISOString() };
  const atThreshold = { created_at: new Date(now - STALE_HINT_HOURS * HOUR).toISOString() };
  assert.equal(isRequestStale(justUnder, { quotesReceived: 0 }, now), false);
  assert.equal(isRequestStale(atThreshold, { quotesReceived: 0 }, now), true);
});

test('isRequestStale: a brand-new request (0 quotes, 0 elapsed) is not flagged stale', () => {
  assert.equal(isRequestStale({ created_at: new Date().toISOString() }, { quotesReceived: 0 }), false);
});

// Slice RV item 4 — the buyer's original request card's status pill, derived
// purely from its linked quotes (client_requests.status never updates after
// creation, so trusting it would freeze every card at "Received" forever —
// the exact dead end the RFQ process map flagged).

test('deriveRequestStage: no linked vendors yet = sent', () => {
  assert.equal(deriveRequestStage([]), 'sent');
});

test('deriveRequestStage: only new/sent_to_vendor leads = sent', () => {
  assert.equal(deriveRequestStage([{ status: 'new' }, { status: 'sent_to_vendor' }]), 'sent');
});

test('deriveRequestStage: at least one lead progressed past new/sent_to_vendor, no price yet = viewed', () => {
  assert.equal(deriveRequestStage([{ status: 'new' }, { status: 'viewed' }]), 'viewed');
});

test('deriveRequestStage: any linked quote carries a price = quotes_received', () => {
  assert.equal(
    deriveRequestStage([{ status: 'new' }, { status: 'responded', quote_amount: 4200 }]),
    'quotes_received',
  );
});

test('deriveRequestStage: any accepted decision wins even if others are still pending/priced', () => {
  assert.equal(
    deriveRequestStage([
      { status: 'responded', quote_amount: 500 },
      { status: 'won', quote_amount: 4200, buyer_decision: 'accepted' },
    ]),
    'accepted',
  );
});

test('deriveRequestStage: every linked lead closed without an accept = closed', () => {
  assert.equal(
    deriveRequestStage([
      { status: 'lost', quote_amount: 100, buyer_decision: 'declined' },
      { status: 'spam' },
    ]),
    'closed',
  );
});

test('deriveRequestStage: one lead still open keeps the request out of "closed" even if another is lost', () => {
  assert.equal(
    deriveRequestStage([{ status: 'lost', buyer_decision: 'declined' }, { status: 'viewed' }]),
    'viewed',
  );
});

// Slice R5 — the stale-request ACTIONABLE nudge is a narrower, more specific
// condition than the generic RV teaching card: it only fires once real
// vendors were actually reached (sentTo > 0). A request that's stale but
// never reached anyone (sentTo === 0, still under internal review) keeps
// showing the generic teaching card instead — "invite more vendors" would be
// a lie if none were ever contacted.

test('isStaleWithNoResponse: false when the request isn\'t stale, even if it reached vendors', () => {
  assert.equal(isStaleWithNoResponse({ sentTo: 3 }, false), false);
});

test('isStaleWithNoResponse: false when stale but it never reached any vendor (sentTo=0)', () => {
  assert.equal(isStaleWithNoResponse({ sentTo: 0 }, true), false);
});

test('isStaleWithNoResponse: true only when BOTH stale and it reached at least one real vendor', () => {
  assert.equal(isStaleWithNoResponse({ sentTo: 1 }, true), true);
  assert.equal(isStaleWithNoResponse({ sentTo: 5 }, true), true);
});
