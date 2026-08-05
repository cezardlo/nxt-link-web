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

// Slice R6 (flow-readiness fix, 2026-07-30) — the per-kind quote extras
// (unit price, shipping cost, installation, training, scope summary,
// duration, team size, emergency response, license model, implementation
// cost, annual support, SLA summary, pricing details) now flow through the
// SAME bestValueByMetric/identicalMetrics machinery proven above, instead of
// being invisible to the buyer entirely (audit gap #2,
// workplace/audit/flow-readiness-2026-07-30.md).

test('bestValueByMetric: lowest unit_price/shipping_cost/implementation_cost/annual_support each win their own metric independently', () => {
  const best = bestValueByMetric([
    { id: 'a', amount: 1, extras: { unit_price: 50, shipping_cost: 20, implementation_cost: 900, annual_support: 300 } },
    { id: 'b', amount: 1, extras: { unit_price: 40, shipping_cost: 25, implementation_cost: 800, annual_support: 250 } },
    { id: 'c', amount: 1, extras: { unit_price: 60, shipping_cost: 10, implementation_cost: 950, annual_support: 400 } },
  ]);
  assert.equal(best.unitPriceId, 'b');
  assert.equal(best.shippingCostId, 'c');
  assert.equal(best.implementationCostId, 'b');
  assert.equal(best.annualSupportId, 'b');
});

test('bestValueByMetric: a numeric extra nobody set never wins (no crash, no false best-tag)', () => {
  const best = bestValueByMetric([
    { id: 'a', amount: 1, extras: { scope_summary: 'full teardown' } },
    { id: 'b', amount: 1, extras: null },
  ]);
  assert.equal(best.unitPriceId, null);
  assert.equal(best.implementationCostId, null);
});

test('bestValueByMetric: rows with no extras at all (product/service request with no technology fields) never crash', () => {
  const best = bestValueByMetric([{ id: 'a', amount: 100 }, { id: 'b', amount: 90 }]);
  assert.equal(best.unitPriceId, null);
  assert.equal(best.shippingCostId, null);
});

// Service wedge fields (2026-08-04): labor rate is the one numeric,
// objectively-lower-is-better wedge field, so it gets its own best-value
// metric like the other money extras; the enum/text wedge fields never do.
test('bestValueByMetric: lowest labor_rate wins; nobody set -> no winner', () => {
  const best = bestValueByMetric([
    { id: 'a', amount: 1, extras: { labor_rate: 95 } },
    { id: 'b', amount: 1, extras: { labor_rate: 80 } },
    { id: 'c', amount: 1, extras: { response_sla: 'same_day' } },
  ]);
  assert.equal(best.laborRateId, 'b');

  const none = bestValueByMetric([
    { id: 'a', amount: 1, extras: { contract_terms: 'per visit' } },
    { id: 'b', amount: 1, extras: null },
  ]);
  assert.equal(none.laborRateId, null);
});

test('identicalMetrics: a categorical extra (installation) participates like any other metric — identical when every row agrees', () => {
  const rows = [
    row({ id: 'a', extras: { installation: 'included' } }),
    row({ id: 'b', extras: { installation: 'included' } }),
  ];
  assert.ok(identicalMetrics(rows).has('installation'));
});

test('identicalMetrics: extras differ across rows -> NOT collapsed by "show differences only"', () => {
  const rows = [
    row({ id: 'a', extras: { license_model: 'subscription' } }),
    row({ id: 'b', extras: { license_model: 'perpetual' } }),
  ];
  const identical = identicalMetrics(rows);
  assert.equal(identical.has('licenseModel'), false);
  assert.equal(shouldShowMetric('licenseModel', identical, true), true);
});

test('identicalMetrics: a request kind whose extras never apply (e.g. teamSize on a product request) is "identical" (null===null) and collapses under the toggle, same as any universally-blank field', () => {
  const rows = [row({ id: 'a', extras: { unit_price: 10 } }), row({ id: 'b', extras: { unit_price: 20 } })];
  const identical = identicalMetrics(rows);
  assert.ok(identical.has('teamSize'));
  assert.equal(shouldShowMetric('teamSize', identical, true), false);
});
