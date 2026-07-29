import assert from 'node:assert/strict';
import test from 'node:test';

import { validateQuoteExtras } from '@/lib/requests/structured';

// Slice R1: per-kind vendor quote "extras" — the comparable commons (total
// price, lead time, quote expiration, payment terms, warranty, short message)
// already exist as real columns on quote_proposals/quote_requests; only
// these per-kind extras are new. kind is always the OPPORTUNITY's own
// request_kind (server-known), never vendor-supplied — see route wiring in
// src/app/api/vendor/quote/route.ts and src/app/api/vendor/proposals/route.ts.

test('null/undefined kind (legacy opportunity, created before this slice) always validates to {}', () => {
  assert.deepEqual(validateQuoteExtras(null, { unit_price: 100 }), { ok: true, errors: [], value: {} });
  assert.deepEqual(validateQuoteExtras(undefined, { anything: 'x' }), { ok: true, errors: [], value: {} });
});

test('product: valid extras round-trip exactly', () => {
  const result = validateQuoteExtras('product', {
    unit_price: 199.99, installation: 'included', training: 'extra', shipping_cost: 25,
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { unit_price: 199.99, installation: 'included', training: 'extra', shipping_cost: 25 });
});

test('product: an unrecognized enum value is silently nulled, not a hard error', () => {
  const result = validateQuoteExtras('product', { installation: 'free_shipping_lol', training: 'nonsense' });
  assert.equal(result.ok, true);
  assert.equal(result.value.installation, null);
  assert.equal(result.value.training, null);
});

test('product: negative unit_price / shipping_cost is rejected', () => {
  assert.equal(validateQuoteExtras('product', { unit_price: -1 }).ok, false);
  assert.equal(validateQuoteExtras('product', { shipping_cost: -1 }).ok, false);
});

test('product: omitted fields validate to null, not an error', () => {
  const result = validateQuoteExtras('product', {});
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { unit_price: null, installation: null, training: null, shipping_cost: null });
});

test('service: valid extras round-trip, team_size must be a positive integer', () => {
  const ok = validateQuoteExtras('service', {
    scope_summary: 'Full HVAC tune-up, filters included',
    duration: '3 days', team_size: 3, emergency_response: '2 hours',
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.team_size, 3);
  assert.equal(ok.value.scope_summary, 'Full HVAC tune-up, filters included');

  const bad = validateQuoteExtras('service', { team_size: -2 });
  assert.equal(bad.ok, false);
});

test('technology: license_model enum + numeric cost fields', () => {
  const ok = validateQuoteExtras('technology', {
    license_model: 'subscription', pricing_details: '$500/mo per seat',
    implementation_cost: 2000, annual_support: 1200, sla_summary: '99.9% uptime, 4h response',
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.license_model, 'subscription');
  assert.equal(ok.value.implementation_cost, 2000);
  assert.equal(ok.value.annual_support, 1200);

  const bad = validateQuoteExtras('technology', { annual_support: -5 });
  assert.equal(bad.ok, false);

  const badEnum = validateQuoteExtras('technology', { license_model: 'lifetime_forever' });
  assert.equal(badEnum.ok, true);
  assert.equal(badEnum.value.license_model, null);
});

test('a product opportunity never accepts service/technology-only fields (per-kind isolation)', () => {
  const result = validateQuoteExtras('product', { scope_summary: 'should be ignored', license_model: 'subscription' });
  assert.equal(result.ok, true);
  assert.equal('scope_summary' in result.value, false);
  assert.equal('license_model' in result.value, false);
});

test('a service opportunity never accepts product/technology-only fields (per-kind isolation)', () => {
  const result = validateQuoteExtras('service', { unit_price: 500, implementation_cost: 1000 });
  assert.equal(result.ok, true);
  assert.equal('unit_price' in result.value, false);
  assert.equal('implementation_cost' in result.value, false);
});

test('non-object input (garbage body) never throws, validates to the kind default shape', () => {
  assert.doesNotThrow(() => validateQuoteExtras('product', null));
  assert.doesNotThrow(() => validateQuoteExtras('product', 'nonsense'));
  assert.doesNotThrow(() => validateQuoteExtras('product', undefined));
  const result = validateQuoteExtras('product', null);
  assert.equal(result.ok, true);
});
