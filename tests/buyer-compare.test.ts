import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bestValueQuoteId,
  describeAcceptedDeal,
  groupQuotesForCompare,
  lowestNumericFieldId,
  needKey,
  parseTimelineDays,
} from '@/lib/buyer/compare';

// FIX 1 — multi-quote grouping. A buyer's dashboard mixes single-listing
// quotes (each its own need) with open-RFQ quotes fanned out to several
// vendors (same need, shared answers.source_request). Grouping must cluster
// the RFQ ones and leave singletons alone.

test('single-listing quotes each form their own singleton group (degrades to single-quote view)', () => {
  const groups = groupQuotesForCompare([
    { id: 'a', sourceRequest: null, quote_amount: 1000 },
    { id: 'b', sourceRequest: null, quote_amount: 2000 },
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].comparable, false);
  assert.equal(groups[1].comparable, false);
  assert.equal(groups[0].sourceRequest, null);
});

test('open-RFQ quotes sharing source_request collapse into one comparable group', () => {
  const groups = groupQuotesForCompare([
    { id: 'a', sourceRequest: 'REQ-100', quote_amount: 5000 },
    { id: 'b', sourceRequest: 'REQ-100', quote_amount: 4200 },
    { id: 'c', sourceRequest: 'REQ-100', quote_amount: 4800 },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].quotes.length, 3);
  assert.equal(groups[0].comparable, true);
  assert.equal(groups[0].sourceRequest, 'REQ-100');
});

test('two separate open RFQs stay in separate groups', () => {
  const groups = groupQuotesForCompare([
    { id: 'a', sourceRequest: 'REQ-1', quote_amount: 100 },
    { id: 'b', sourceRequest: 'REQ-2', quote_amount: 200 },
    { id: 'c', sourceRequest: 'REQ-1', quote_amount: 150 },
  ]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map((g) => g.key), ['rfq:REQ-1', 'rfq:REQ-2']);
  assert.deepEqual(groups[0].quotes.map((q) => q.id), ['a', 'c']);
});

test('an RFQ group with only one priced quote is NOT comparable (needs 2+ prices)', () => {
  const groups = groupQuotesForCompare([
    { id: 'a', sourceRequest: 'REQ-9', quote_amount: 5000 },
    { id: 'b', sourceRequest: 'REQ-9', quote_amount: null }, // vendor hasn't quoted yet
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].quotes.length, 2);
  assert.equal(groups[0].comparable, false);
});

test('input order is preserved across groups', () => {
  const groups = groupQuotesForCompare([
    { id: 'x', sourceRequest: null, quote_amount: 1 },
    { id: 'a', sourceRequest: 'R', quote_amount: 2 },
    { id: 'b', sourceRequest: 'R', quote_amount: 3 },
    { id: 'y', sourceRequest: null, quote_amount: 4 },
  ]);
  assert.deepEqual(groups.map((g) => g.key), ['one:x', 'rfq:R', 'one:y']);
});

test('needKey: rfq ref wins, else own id; blank/whitespace source is treated as none', () => {
  assert.equal(needKey({ id: '1', sourceRequest: 'REQ-5' }), 'rfq:REQ-5');
  assert.equal(needKey({ id: '1', sourceRequest: '  ' }), 'one:1');
  assert.equal(needKey({ id: '1', sourceRequest: null }), 'one:1');
  assert.equal(needKey({ id: '1' }), 'one:1');
});

// FIX 1 — best-value pick.

test('bestValueQuoteId picks the lowest priced quote', () => {
  assert.equal(
    bestValueQuoteId([
      { id: 'a', quote_amount: 5000 },
      { id: 'b', quote_amount: 4200 },
      { id: 'c', quote_amount: 4800 },
    ]),
    'b',
  );
});

test('bestValueQuoteId ignores unpriced quotes and resolves ties to the first', () => {
  assert.equal(
    bestValueQuoteId([
      { id: 'a', quote_amount: null },
      { id: 'b', quote_amount: 4200 },
      { id: 'c', quote_amount: 4200 },
    ]),
    'b',
  );
});

test('bestValueQuoteId returns null when nothing is priced', () => {
  assert.equal(bestValueQuoteId([{ id: 'a', quote_amount: null }, { id: 'b' }]), null);
});

// Timeline parsing for the length-proportional bars.

test('parseTimelineDays handles days / weeks / months and unparseable text', () => {
  assert.equal(parseTimelineDays('10 days'), 10);
  assert.equal(parseTimelineDays('2 weeks'), 14);
  assert.equal(parseTimelineDays('6 wks'), 42);
  assert.equal(parseTimelineDays('3 months'), 90);
  assert.equal(parseTimelineDays('ASAP'), null);
  assert.equal(parseTimelineDays(null), null);
  assert.equal(parseTimelineDays(undefined), null);
});

// FIX 2 — post-accept "what happens next" selector.

test('describeAcceptedDeal returns the agreed terms + connected/unlocked once accepted', () => {
  const view = describeAcceptedDeal({
    buyer_decision: 'accepted',
    quote_amount: 4200,
    quote_currency: 'USD',
    quote_timeline: '2 weeks',
    quote_valid_until: '2026-08-01',
  });
  assert.ok(view);
  assert.equal(view!.connected, true);
  assert.equal(view!.contactUnlocked, true);
  assert.equal(view!.amount, 4200);
  assert.equal(view!.timeline, '2 weeks');
  assert.equal(view!.validUntil, '2026-08-01');
});

test('describeAcceptedDeal returns null for undecided and declined quotes (no unlock leak)', () => {
  assert.equal(describeAcceptedDeal({ buyer_decision: null, quote_amount: 4200 }), null);
  assert.equal(describeAcceptedDeal({ buyer_decision: 'declined', quote_amount: 4200 }), null);
});

// Slice R6 (flow-readiness fix, 2026-07-30) — generalized "lowest wins" for
// any per-kind numeric quote extra (shipping cost, implementation cost,
// annual support, unit price), shared by both QuoteCompareTable's own
// best-tag column logic and compareDeck.ts's bestValueByMetric.

test('lowestNumericFieldId picks the lowest value, same rule as bestValueQuoteId', () => {
  assert.equal(
    lowestNumericFieldId([{ id: 'a', value: 50 }, { id: 'b', value: 20 }, { id: 'c', value: 35 }]),
    'b',
  );
});

test('lowestNumericFieldId ignores rows missing the field and resolves ties to the first', () => {
  assert.equal(
    lowestNumericFieldId([{ id: 'a', value: null }, { id: 'b', value: 20 }, { id: 'c', value: 20 }]),
    'b',
  );
});

test('lowestNumericFieldId returns null when nobody set the field', () => {
  assert.equal(lowestNumericFieldId([{ id: 'a', value: null }, { id: 'b', value: undefined }]), null);
});
