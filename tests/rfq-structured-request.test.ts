import assert from 'node:assert/strict';
import test from 'node:test';

import { validateStructuredRequest, cleanStructuredSpecs, isRequestKind, REQUEST_KINDS } from '@/lib/requests/structured';

// Slice R1 (workplace/plans/rfq-seamless-build-2026-07-29.md): structured
// request-side fields shared by POST /api/marketplace/request and
// POST /api/platform/requests. Pure functions, no database, no server.

test('isRequestKind accepts only product/service/technology', () => {
  assert.equal(isRequestKind('product'), true);
  assert.equal(isRequestKind('service'), true);
  assert.equal(isRequestKind('technology'), true);
  assert.equal(isRequestKind('forklift'), false);
  assert.equal(isRequestKind(undefined), false);
  assert.equal(isRequestKind(null), false);
  assert.equal(isRequestKind(42), false);
  assert.deepEqual(REQUEST_KINDS, ['product', 'service', 'technology']);
});

test('validateStructuredRequest: empty input validates to all-null/empty defaults, never throws (old-shape compat)', () => {
  const result = validateStructuredRequest({});
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.value, {
    request_kind: null,
    quantity: null,
    delivery_location: null,
    preferred_timeline: null,
    budget_min: null,
    budget_max: null,
    structured_specs: {},
  });
});

test('validateStructuredRequest: undefined input (no body at all) also validates cleanly', () => {
  const result = validateStructuredRequest(undefined);
  assert.equal(result.ok, true);
  assert.equal(result.value.request_kind, null);
});

test('validateStructuredRequest: a full, valid product request round-trips exactly', () => {
  const result = validateStructuredRequest({
    request_kind: 'product',
    quantity: 12,
    delivery_location: '123 Main St, El Paso, TX',
    preferred_timeline: 'within 2 weeks',
    budget_min: 1000,
    budget_max: 5000,
    structured_specs: { voltage: '220V', color: 'yellow' },
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.request_kind, 'product');
  assert.equal(result.value.quantity, 12);
  assert.equal(result.value.delivery_location, '123 Main St, El Paso, TX');
  assert.equal(result.value.preferred_timeline, 'within 2 weeks');
  assert.equal(result.value.budget_min, 1000);
  assert.equal(result.value.budget_max, 5000);
  assert.deepEqual(result.value.structured_specs, { voltage: '220V', color: 'yellow' });
});

test('validateStructuredRequest: rejects a non-integer, zero, or negative quantity', () => {
  assert.equal(validateStructuredRequest({ quantity: 0 }).ok, false);
  assert.equal(validateStructuredRequest({ quantity: -3 }).ok, false);
  assert.equal(validateStructuredRequest({ quantity: 2.5 }).ok, false);
  assert.equal(validateStructuredRequest({ quantity: 'a lot' }).ok, false);
});

test('validateStructuredRequest: an out-of-range quantity is clamped, not rejected', () => {
  const result = validateStructuredRequest({ quantity: 5_000_000 });
  assert.equal(result.ok, true);
  assert.equal(result.value.quantity, 999999);
});

test('validateStructuredRequest: an unrecognized request_kind silently becomes null, not an error', () => {
  const result = validateStructuredRequest({ request_kind: 'forklift' });
  assert.equal(result.ok, true);
  assert.equal(result.value.request_kind, null);
});

test('validateStructuredRequest: rejects budget_min greater than budget_max', () => {
  const result = validateStructuredRequest({ budget_min: 5000, budget_max: 1000 });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /budget_min must not be greater/.test(e)));
});

test('validateStructuredRequest: rejects a negative budget on either bound', () => {
  assert.equal(validateStructuredRequest({ budget_min: -1 }).ok, false);
  assert.equal(validateStructuredRequest({ budget_max: -1 }).ok, false);
});

test('validateStructuredRequest: budget_min alone (no max) is valid — a floor with no ceiling', () => {
  const result = validateStructuredRequest({ budget_min: 500 });
  assert.equal(result.ok, true);
  assert.equal(result.value.budget_min, 500);
  assert.equal(result.value.budget_max, null);
});

test('validateStructuredRequest: delivery_location and preferred_timeline are trimmed and length-capped', () => {
  const result = validateStructuredRequest({
    delivery_location: `  ${'x'.repeat(400)}  `,
    preferred_timeline: `  ${'y'.repeat(300)}  `,
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.delivery_location?.length, 300);
  assert.equal(result.value.preferred_timeline?.length, 200);
});

test('cleanStructuredSpecs: drops non-object input entirely', () => {
  assert.deepEqual(cleanStructuredSpecs(null), {});
  assert.deepEqual(cleanStructuredSpecs(undefined), {});
  assert.deepEqual(cleanStructuredSpecs('a string'), {});
  assert.deepEqual(cleanStructuredSpecs([1, 2, 3]), {});
});

test('cleanStructuredSpecs: caps key count at 40 (abuse prevention, mirrors marketplace/types.ts cleanBlock discipline)', () => {
  const huge: Record<string, string> = {};
  for (let i = 0; i < 100; i++) huge[`key${i}`] = 'value';
  const cleaned = cleanStructuredSpecs(huge);
  assert.ok(Object.keys(cleaned).length <= 40);
});

test('cleanStructuredSpecs: keeps strings/numbers/booleans/arrays, drops functions and nested objects', () => {
  const cleaned = cleanStructuredSpecs({
    ok_str: 'hello',
    ok_num: 42,
    ok_bool: true,
    ok_arr: ['a', 'b'],
    bad_fn: () => {},
    bad_nested: { a: 1 },
  });
  assert.equal(cleaned.ok_str, 'hello');
  assert.equal(cleaned.ok_num, 42);
  assert.equal(cleaned.ok_bool, true);
  assert.deepEqual(cleaned.ok_arr, ['a', 'b']);
  assert.equal('bad_fn' in cleaned, false);
  assert.equal('bad_nested' in cleaned, false);
});

test('cleanStructuredSpecs: category-specific question sets (future layer) drop in as flexible key/value pairs without validator changes', () => {
  // Simulates a future forklift-specific question set (Part 7 of the RFQ
  // blueprint) being written straight into structured_specs — proves the
  // jsonb + permissive-key-names design actually supports this without
  // touching this function or the schema.
  const forkliftSpecs = cleanStructuredSpecs({
    lift_capacity_lbs: 5000,
    fuel_type: 'electric',
    mast_height_ft: 20,
    indoor_use: true,
  });
  assert.deepEqual(forkliftSpecs, {
    lift_capacity_lbs: 5000,
    fuel_type: 'electric',
    mast_height_ft: 20,
    indoor_use: true,
  });
});
