import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildOfferTimeline,
  isOfferExpired,
  offerRevisionsForThread,
  synthesizeLegacyOffer,
  type OfferRevisionInput,
} from '@/lib/messages/offerTimeline';

// R4 offer-in-chat — status derivation must come from real data only:
// proposal revision history, buyer_decision, valid_until, and whether the
// buyer's "you got a quote" notification has been read. Nothing invented.

function rev(overrides: Partial<OfferRevisionInput> & { id: string; revision: number }): OfferRevisionInput {
  return {
    status: 'submitted',
    total: 1000,
    created_at: '2026-07-30T00:00:00.000Z',
    ...overrides,
  };
}

test('a single submitted revision with no buyer engagement yet is "sent"', () => {
  const timeline = buildOfferTimeline([rev({ id: 'a', revision: 1 })]);
  assert.equal(timeline.length, 1);
  assert.equal(timeline[0].status, 'sent');
  assert.equal(timeline[0].isLatest, true);
  assert.equal(timeline[0].faded, false);
});

test('buyerHasSeenOffer flips the latest, undecided card to "seen"', () => {
  const timeline = buildOfferTimeline([rev({ id: 'a', revision: 1 })], { buyerHasSeenOffer: true });
  assert.equal(timeline[0].status, 'seen');
});

test('an older revision is always "revised", faded, badged — regardless of seen/accept state', () => {
  const timeline = buildOfferTimeline(
    [rev({ id: 'a', revision: 1, total: 5000 }), rev({ id: 'b', revision: 2, total: 4500 })],
    { buyerHasSeenOffer: true },
  );
  assert.equal(timeline.length, 2);
  assert.equal(timeline[0].status, 'revised');
  assert.equal(timeline[0].faded, true);
  assert.equal(timeline[0].revisedBadge, true);
  // The LATEST revision still gets its own real status (seen), not "revised".
  assert.equal(timeline[1].status, 'seen');
  assert.equal(timeline[1].faded, false);
});

test('price decrease on a revision produces a "down" delta vs. the prior revision', () => {
  const timeline = buildOfferTimeline([
    rev({ id: 'a', revision: 1, total: 5000, currency: 'USD' }),
    rev({ id: 'b', revision: 2, total: 4700, currency: 'USD' }),
  ]);
  assert.deepEqual(timeline[1].delta, { direction: 'down', amount: 300, currency: 'USD' });
  assert.equal(timeline[0].delta, null); // nothing precedes the first revision
});

test('price increase on a revision produces an "up" delta (honest either direction, no spin)', () => {
  const timeline = buildOfferTimeline([
    rev({ id: 'a', revision: 1, total: 4000 }),
    rev({ id: 'b', revision: 2, total: 4800 }),
  ]);
  assert.deepEqual(timeline[1].delta, { direction: 'up', amount: 800, currency: null });
});

test('equal price across a revision produces no delta callout', () => {
  const timeline = buildOfferTimeline([
    rev({ id: 'a', revision: 1, total: 4000 }),
    rev({ id: 'b', revision: 2, total: 4000 }),
  ]);
  assert.equal(timeline[1].delta, null);
});

test('buyer_decision accepted wins over seen/expired on the latest card', () => {
  const timeline = buildOfferTimeline([rev({ id: 'a', revision: 1, valid_until: '2020-01-01' })], {
    buyerDecision: 'accepted',
    buyerHasSeenOffer: true,
    nowMs: Date.parse('2026-07-30T00:00:00.000Z'),
  });
  assert.equal(timeline[0].status, 'accepted');
});

test('buyer_decision declined is reflected even if never marked seen', () => {
  const timeline = buildOfferTimeline([rev({ id: 'a', revision: 1 })], { buyerDecision: 'declined' });
  assert.equal(timeline[0].status, 'declined');
});

test('an undecided offer past its valid_until is "expired"', () => {
  const nowMs = Date.parse('2026-08-01T00:00:00.000Z');
  const timeline = buildOfferTimeline([rev({ id: 'a', revision: 1, valid_until: '2026-07-15' })], { nowMs });
  assert.equal(timeline[0].status, 'expired');
});

test('an undecided offer before its valid_until is not expired', () => {
  const nowMs = Date.parse('2026-07-20T00:00:00.000Z');
  const timeline = buildOfferTimeline([rev({ id: 'a', revision: 1, valid_until: '2026-08-01' })], { nowMs });
  assert.notEqual(timeline[0].status, 'expired');
});

test('a missing/unparseable valid_until is never treated as expired', () => {
  assert.equal(isOfferExpired(null, Date.now()), false);
  assert.equal(isOfferExpired(undefined, Date.now()), false);
  assert.equal(isOfferExpired('not-a-date', Date.now()), false);
});

test('draft revisions are excluded from the buyer-visible timeline entirely', () => {
  const timeline = buildOfferTimeline([
    rev({ id: 'a', revision: 1, status: 'submitted' }),
    rev({ id: 'b', revision: 2, status: 'draft' }), // vendor's in-progress WIP, not sent yet
  ]);
  assert.equal(timeline.length, 1);
  assert.equal(timeline[0].id, 'a');
});

test('revisions are ordered oldest -> newest regardless of input order', () => {
  const timeline = buildOfferTimeline([
    rev({ id: 'b', revision: 2, total: 100 }),
    rev({ id: 'a', revision: 1, total: 200 }),
  ]);
  assert.deepEqual(timeline.map((t) => t.id), ['a', 'b']);
});

// Backward compatibility — legacy flat-amount quotes (src/app/api/vendor/
// quote/route.ts) never wrote a quote_proposals row. They must still render
// as a real offer card, not a blank thread.

test('synthesizeLegacyOffer builds a revision-1 card from the quote_requests mirror fields', () => {
  const card = synthesizeLegacyOffer({
    id: 'qr-1', quote_amount: 3200, quote_currency: 'USD', quote_timeline: '2 weeks',
    quote_valid_until: '2026-08-15', quoted_at: '2026-07-20T00:00:00.000Z', created_at: '2026-07-01T00:00:00.000Z',
  });
  assert.ok(card);
  assert.equal(card!.id, 'legacy-qr-1');
  assert.equal(card!.revision, 1);
  assert.equal(card!.total, 3200);
  assert.equal(card!.created_at, '2026-07-20T00:00:00.000Z'); // prefers quoted_at
});

test('synthesizeLegacyOffer returns null when no quote was ever sent (no fake offer)', () => {
  assert.equal(synthesizeLegacyOffer({ id: 'qr-2', quote_amount: null, created_at: '2026-07-01T00:00:00.000Z' }), null);
});

test('offerRevisionsForThread prefers real (non-draft) proposals over the legacy synthesis', () => {
  const real = offerRevisionsForThread(
    [rev({ id: 'p1', revision: 1, total: 999 })],
    { id: 'qr-3', quote_amount: 5000, created_at: '2026-07-01T00:00:00.000Z' },
  );
  assert.equal(real.length, 1);
  assert.equal(real[0].id, 'p1');
});

test('offerRevisionsForThread falls back to legacy synthesis when there are zero real proposals', () => {
  const legacy = offerRevisionsForThread([], { id: 'qr-4', quote_amount: 2200, created_at: '2026-07-01T00:00:00.000Z' });
  assert.equal(legacy.length, 1);
  assert.equal(legacy[0].id, 'legacy-qr-4');
});

test('offerRevisionsForThread with no proposals AND no legacy quote is an honest empty thread', () => {
  assert.deepEqual(offerRevisionsForThread([], { id: 'qr-5', quote_amount: null, created_at: '2026-07-01T00:00:00.000Z' }), []);
});

test('offerRevisionsForThread ignores draft-only proposals (falls back to legacy if present)', () => {
  const result = offerRevisionsForThread(
    [rev({ id: 'p1', revision: 1, status: 'draft' })],
    { id: 'qr-6', quote_amount: 1800, created_at: '2026-07-01T00:00:00.000Z' },
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'legacy-qr-6');
});
