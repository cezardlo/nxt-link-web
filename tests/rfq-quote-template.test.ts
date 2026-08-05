import assert from 'node:assert/strict';
import test from 'node:test';

import { autoCalcProductTotal, validateQuoteExtras } from '@/lib/requests/structured';

// Slice R3: the vendor quote TEMPLATE — live auto-calculated total (products
// only) + the per-kind extras validation the template's fields must satisfy
// before submit. The template's client code imports validateQuoteExtras
// DIRECTLY (src/app/vendor/leads/page.tsx) rather than re-implementing
// bounds, so there is no separate "mirror" to test for drift — this file
// documents that reuse with the same fixtures the server-side test
// (tests/rfq-structured-quote.test.ts) already proves, plus the new
// auto-calc helper itself.

test('autoCalcProductTotal: unit_price x quantity + shipping_cost', () => {
  assert.equal(autoCalcProductTotal({ unit_price: 100, shipping_cost: 25 }, 3), 325);
  assert.equal(autoCalcProductTotal({ unit_price: 19.99 }, 3), 59.97);
});

test('autoCalcProductTotal: quantity defaults to 1 when null, zero, or missing', () => {
  assert.equal(autoCalcProductTotal({ unit_price: 50 }, null), 50);
  assert.equal(autoCalcProductTotal({ unit_price: 50 }, 0), 50);
  assert.equal(autoCalcProductTotal({ unit_price: 50 }, undefined), 50);
});

test('autoCalcProductTotal: shipping_cost is optional and defaults to 0', () => {
  assert.equal(autoCalcProductTotal({ unit_price: 10 }, 2), 20);
  assert.equal(autoCalcProductTotal({ unit_price: 10, shipping_cost: null }, 2), 20);
});

test('autoCalcProductTotal: no unit_price yet -> null (nothing to calculate from, not zero)', () => {
  assert.equal(autoCalcProductTotal({ unit_price: null }, 5), null);
  assert.equal(autoCalcProductTotal({ unit_price: undefined }, 5), null);
});

test('autoCalcProductTotal: never throws or goes negative on garbage input', () => {
  assert.doesNotThrow(() => autoCalcProductTotal({ unit_price: -5 }, 1));
  assert.equal(autoCalcProductTotal({ unit_price: -5 }, 1), null); // negative unit price is invalid, not a negative total
  assert.doesNotThrow(() => autoCalcProductTotal({ unit_price: NaN }, 1));
  assert.equal(autoCalcProductTotal({ unit_price: NaN }, 1), null);
});

test('autoCalcProductTotal: rounds to cents (floating point safety)', () => {
  assert.equal(autoCalcProductTotal({ unit_price: 19.99 }, 3), 59.97);
  assert.notEqual(String(autoCalcProductTotal({ unit_price: 19.99 }, 3)).split('.')[1]?.length ?? 0, 3);
});

// The template's client-side "mirror" of the server's per-kind extras
// validation is not a re-implementation — src/app/vendor/leads/page.tsx
// imports validateQuoteExtras from this same module directly, so client and
// server can never drift. These fixtures exercise it the way the template
// form actually calls it (kind resolved from the OPPORTUNITY, never from the
// vendor's own input) before building the quote_extras payload it posts to
// POST /api/vendor/proposals.
test('template reuse: product extras built from form state validate cleanly', () => {
  const formExtras = { unit_price: 199.99, installation: 'included', training: 'extra', shipping_cost: 25 };
  const result = validateQuoteExtras('product', formExtras);
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, formExtras);
});

test('template reuse: an empty per-kind section (vendor left it blank) validates to null fields, not an error', () => {
  const result = validateQuoteExtras('service', { scope_summary: '', duration: '', team_size: '', emergency_response: '' });
  assert.equal(result.ok, true);
  // The five wedge fields (2026-08-04) join the service shape. A blank section
  // still means "no answer" for every field, old and new — null, never an error.
  assert.deepEqual(result.value, {
    scope_summary: null, duration: null, team_size: null, emergency_response: null,
    labor_rate: null, additional_fees: null, parts_policy: null, response_sla: null, contract_terms: null,
  });
});

test('template reuse: a negative field the template lets a vendor type is rejected the same way server-side would', () => {
  const result = validateQuoteExtras('technology', { annual_support: -100 });
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /annual_support/);
});
