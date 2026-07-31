import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isStep1Valid, isStep2Valid, isStep3Valid, buildPostNeedPayload,
  MIN_DESCRIPTION_LEN, QUANTITY_UNITS, TIMELINE_OPTIONS,
  type BuildPayloadInput,
} from '@/lib/requests/postNeedWizard';
import { validateStructuredRequest } from '@/lib/requests/structured';

// RFQ Slice R2b — the buyer "Post a Need" wizard's kind -> field -> payload
// mapping (workplace/audit/flow-readiness-2026-07-30.md: technology had no
// live buyer-facing entry point at all before this slice).

function baseInput(overrides: Partial<BuildPayloadInput> = {}): BuildPayloadInput {
  return {
    selection: 'product',
    description: '50 pallet jacks, electric, need by next month',
    location: 'El Paso, TX',
    timelineLabel: 'ASAP',
    quantity: 50,
    quantityUnitLabel: 'Pieces',
    usersOrLocations: null,
    currentSystems: '',
    usersUnitLabel: null,
    budgetMin: null,
    budgetMax: null,
    contactName: '',
    locale: 'en',
    ...overrides,
  };
}

test('step validity gates', () => {
  assert.equal(isStep1Valid(null), false);
  assert.equal(isStep1Valid('product'), true);
  assert.equal(isStep1Valid('unsure'), true);

  assert.equal(isStep2Valid(''), false);
  assert.equal(isStep2Valid('short'), false); // < MIN_DESCRIPTION_LEN
  assert.equal('short'.length < MIN_DESCRIPTION_LEN, true);
  assert.equal(isStep2Valid('This is a long enough description'), true);

  assert.equal(
    isStep3Valid('product', { location: '', timeline: 'asap', quantity: 5, usersOrLocations: null }),
    false, // no location
  );
  assert.equal(
    isStep3Valid('product', { location: 'El Paso', timeline: null, quantity: 5, usersOrLocations: null }),
    false, // no timeline
  );
  assert.equal(
    isStep3Valid('product', { location: 'El Paso', timeline: 'asap', quantity: 0, usersOrLocations: null }),
    false, // quantity must be > 0
  );
  assert.equal(
    isStep3Valid('product', { location: 'El Paso', timeline: 'asap', quantity: 5, usersOrLocations: null }),
    true,
  );
  assert.equal(
    isStep3Valid('service', { location: 'El Paso', timeline: 'asap', quantity: null, usersOrLocations: null }),
    true, // service needs only location + timeline
  );
  assert.equal(
    isStep3Valid('technology', { location: 'El Paso', timeline: 'asap', quantity: null, usersOrLocations: null }),
    false, // technology needs users/locations > 0
  );
  assert.equal(
    isStep3Valid('technology', { location: 'El Paso', timeline: 'asap', quantity: null, usersOrLocations: 40 }),
    true,
  );
  assert.equal(
    isStep3Valid('unsure', { location: 'El Paso', timeline: 'flexible', quantity: null, usersOrLocations: null }),
    true,
  );
});

test('QUANTITY_UNITS and TIMELINE_OPTIONS are stable, non-empty value sets', () => {
  assert.ok(QUANTITY_UNITS.length >= 4);
  assert.ok(TIMELINE_OPTIONS.includes('asap'));
  assert.ok(TIMELINE_OPTIONS.includes('flexible'));
});

test('product payload: quantity -> quantity_int, unit -> structured_specs.quantity_unit', () => {
  const payload = buildPostNeedPayload(baseInput());
  assert.equal(payload.request_kind, 'product');
  assert.equal(payload.summary.quantity_int, 50);
  assert.deepEqual(payload.summary.structured_specs, { quantity_unit: 'Pieces' });
  assert.equal(payload.summary.delivery_location, 'El Paso, TX');
  assert.equal(payload.summary.location, 'El Paso, TX');
  assert.equal(payload.summary.preferred_timeline, 'ASAP');
  assert.equal(payload.summary.budget_min, null);
  assert.equal(payload.summary.budget_max, null);
  assert.equal('category' in payload.summary, false); // deliberately never set — see module header
});

test('service payload: no kind-specific extras beyond the two common fields', () => {
  const payload = buildPostNeedPayload(baseInput({
    selection: 'service',
    description: 'Safety audit of 14 forklifts across two shifts, OSHA compliance',
    quantity: null,
    quantityUnitLabel: null,
  }));
  assert.equal(payload.request_kind, 'service');
  assert.equal(payload.summary.quantity_int, null);
  assert.deepEqual(payload.summary.structured_specs, {});
});

test('technology payload: users/locations -> quantity_int, current systems + unit label in structured_specs', () => {
  const payload = buildPostNeedPayload(baseInput({
    selection: 'technology',
    description: 'Cloud inventory software for 3 warehouses, integrate with our ERP',
    quantity: null,
    quantityUnitLabel: null,
    usersOrLocations: 40,
    usersUnitLabel: 'users',
    currentSystems: 'SAP, QuickBooks',
  }));
  assert.equal(payload.request_kind, 'technology');
  assert.equal(payload.summary.quantity_int, 40);
  assert.deepEqual(payload.summary.structured_specs, { quantity_unit: 'users', current_systems: 'SAP, QuickBooks' });
});

test('technology payload: budget range only attaches when the buyer actually typed one', () => {
  const withBudget = buildPostNeedPayload(baseInput({
    selection: 'technology', usersOrLocations: 10, usersUnitLabel: 'users',
    quantity: null, quantityUnitLabel: null,
    budgetMin: 5000, budgetMax: 20000,
  }));
  assert.equal(withBudget.summary.budget_min, 5000);
  assert.equal(withBudget.summary.budget_max, 20000);

  const withoutBudget = buildPostNeedPayload(baseInput({
    selection: 'technology', usersOrLocations: 10, usersUnitLabel: 'users',
    quantity: null, quantityUnitLabel: null,
  }));
  assert.equal(withoutBudget.summary.budget_min, null);
  assert.equal(withoutBudget.summary.budget_max, null);
});

// BLIND BUDGET — default-off proof: this payload builder has no "share"
// concept at all (there is nothing in this codebase that can flip R1's
// budget_min/budget_max to vendor-visible — see src/lib/requests/
// vendor-view.ts). Proven two ways: (1) a non-technology kind can never
// carry a budget even if the caller mistakenly supplies one, and (2) the
// built payload never contains a `share_budget` key of any kind.
test('blind budget: non-technology kinds never carry a budget, even if the caller passes one by mistake', () => {
  const payload = buildPostNeedPayload(baseInput({
    selection: 'product', budgetMin: 1000, budgetMax: 9000,
  }));
  assert.equal(payload.summary.budget_min, null);
  assert.equal(payload.summary.budget_max, null);
});

test('blind budget: the payload never has a share/reveal flag of any kind', () => {
  const payload = buildPostNeedPayload(baseInput({
    selection: 'technology', usersOrLocations: 5, usersUnitLabel: 'users',
    quantity: null, quantityUnitLabel: null, budgetMin: 1000, budgetMax: 5000,
  }));
  const json = JSON.stringify(payload);
  assert.ok(!/share/i.test(json));
});

test('"Not sure" selection: request_kind is null (valid per R1), no kind-specific fields set', () => {
  const payload = buildPostNeedPayload(baseInput({
    selection: 'unsure',
    description: 'We need help figuring out the right vendor for a warehouse problem',
    quantity: null, quantityUnitLabel: null,
  }));
  assert.equal(payload.request_kind, null);
  assert.equal(payload.summary.quantity_int, null);
  assert.deepEqual(payload.summary.structured_specs, {});
});

// Integration proof (Verify section requirement): every payload this module
// builds must validate cleanly against the REAL server-side validator the
// live POST /api/platform/requests route already runs
// (src/lib/requests/structured.ts validateStructuredRequest) — proving the
// technology (and every other kind's) payload reaches the exact shape R1's
// API expects, not just a shape this test file assumes is compatible.
test('every kind\'s payload validates ok:true against the real R1 validateStructuredRequest', () => {
  const cases: BuildPayloadInput[] = [
    baseInput(), // product
    baseInput({ selection: 'service', quantity: null, quantityUnitLabel: null }),
    baseInput({
      selection: 'technology', quantity: null, quantityUnitLabel: null,
      usersOrLocations: 25, usersUnitLabel: 'users', currentSystems: 'ERP',
      budgetMin: 2000, budgetMax: 8000,
    }),
    baseInput({ selection: 'unsure', quantity: null, quantityUnitLabel: null }),
  ];
  for (const input of cases) {
    const payload = buildPostNeedPayload(input);
    const result = validateStructuredRequest({
      request_kind: payload.request_kind,
      quantity: payload.summary.quantity_int,
      delivery_location: payload.summary.delivery_location,
      preferred_timeline: payload.summary.preferred_timeline,
      budget_min: payload.summary.budget_min,
      budget_max: payload.summary.budget_max,
      structured_specs: payload.summary.structured_specs,
    });
    assert.equal(result.ok, true, `expected ok for ${input.selection}: ${result.errors.join(', ')}`);
    assert.equal(result.value.request_kind, payload.request_kind);
  }
});
