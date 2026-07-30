import assert from 'node:assert/strict';
import test from 'node:test';

import { bestValueByMetric, identicalMetrics, shouldShowMetric, type CompareMetricKey } from '@/lib/buyer/compareDeck';
import type { CompareTableRow } from '@/components/marketplace/QuoteCompareTable';

// R4 design addendum #1 — the card deck's "best value per metric" (soft
// violet top-border) and "Show differences only" toggle.

function row(overrides: Partial<CompareTableRow> & { id: string }): CompareTableRow {
  return { vendor: 'V', amount: 1000, status: 'received', ...overrides };
}

test('bestValueByMetric: lowest price wins the price metric', () => {
  const { priceId } = bestValueByMetric([
    { id: 'a', amount: 5000 }, { id: 'b', amount: 4200 }, { id: 'c', amount: 4800 },
  ]);
  assert.equal(priceId, 'b');
});

test('bestValueByMetric: shortest lead time wins the leadTime metric', () => {
  const { leadTimeId } = bestValueByMetric([
    { id: 'a', amount: 1, timeline: '3 weeks' },
    { id: 'b', amount: 1, timeline: '5 days' },
    { id: 'c', amount: 1, timeline: '2 months' },
  ]);
  assert.equal(leadTimeId, 'b');
});

test('bestValueByMetric: unparseable/missing timelines never win and never crash', () => {
  const { leadTimeId } = bestValueByMetric([
    { id: 'a', amount: 1, timeline: 'ASAP' },
    { id: 'b', amount: 1, timeline: null },
  ]);
  assert.equal(leadTimeId, null);
});

test('bestValueByMetric: price and lead-time winners can be different vendors', () => {
  const { priceId, leadTimeId } = bestValueByMetric([
    { id: 'cheap-slow', amount: 100, timeline: '3 months' },
    { id: 'pricey-fast', amount: 500, timeline: '2 days' },
  ]);
  assert.equal(priceId, 'cheap-slow');
  assert.equal(leadTimeId, 'pricey-fast');
});

test('identicalMetrics: fewer than 2 rows never collapses anything', () => {
  assert.equal(identicalMetrics([row({ id: 'a' })]).size, 0);
  assert.equal(identicalMetrics([]).size, 0);
});

test('identicalMetrics: a metric where every row has the exact same value is identical', () => {
  const rows = [
    row({ id: 'a', warranty: '1 year' }),
    row({ id: 'b', warranty: '1 year' }),
  ];
  assert.ok(identicalMetrics(rows).has('warranty'));
});

test('identicalMetrics: everyone leaving a metric blank counts as identical (null === null)', () => {
  const rows = [row({ id: 'a', warranty: null }), row({ id: 'b', warranty: null })];
  assert.ok(identicalMetrics(rows).has('warranty'));
});

test('identicalMetrics: any differing value (including one blank vs one filled) is NOT identical', () => {
  const rows = [row({ id: 'a', warranty: '1 year' }), row({ id: 'b', warranty: null })];
  assert.equal(identicalMetrics(rows).has('warranty'), false);
});

test('identicalMetrics: price and leadTime participate in the same identical/different check', () => {
  const rows = [
    row({ id: 'a', amount: 5000, timeline: '2 weeks' }),
    row({ id: 'b', amount: 5000, timeline: '3 weeks' }),
  ];
  const identical = identicalMetrics(rows);
  assert.ok(identical.has('price'));
  assert.equal(identical.has('leadTime'), false);
});

test('shouldShowMetric: toggle off always shows everything', () => {
  const identical = new Set<CompareMetricKey>(['price']);
  assert.equal(shouldShowMetric('price', identical, false), true);
});

test('shouldShowMetric: toggle on hides only metrics in the identical set', () => {
  const identical = new Set<CompareMetricKey>(['price']);
  assert.equal(shouldShowMetric('price', identical, true), false);
  assert.equal(shouldShowMetric('warranty', identical, true), true);
});
