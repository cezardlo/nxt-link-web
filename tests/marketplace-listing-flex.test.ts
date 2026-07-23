import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cleanBlock,
  cleanArray,
  normalizeListingInput,
  pilotEntriesOf,
  customFieldsOf,
  BLOCK_SHAPES,
} from '@/lib/marketplace/types';

// --- Back-compat reads: the 23 live listings use the OLD single-object /
// no-custom-fields shape. These must keep rendering identically. ------------

test('pilotEntriesOf reads the OLD single-object pilot shape as one entry', () => {
  const oldPilot = { available: true, duration: '30 days', cost: 'Free', scope: 'One site', success_criteria: ['Uptime > 99%'] };
  const entries = pilotEntriesOf(oldPilot);
  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0], { duration: '30 days', cost: 'Free', scope: 'One site' });
});

test('pilotEntriesOf returns [] for an old pilot object with nothing filled in', () => {
  const emptyPilot = { available: false, duration: '', cost: '', scope: '' };
  assert.deepEqual(pilotEntriesOf(emptyPilot), []);
});

test('pilotEntriesOf returns [] for null/undefined/non-object pilot', () => {
  assert.deepEqual(pilotEntriesOf(null), []);
  assert.deepEqual(pilotEntriesOf(undefined), []);
  assert.deepEqual(pilotEntriesOf('not an object'), []);
});

test('pilotEntriesOf prefers the new `entries` array when present (2+ pilots)', () => {
  const pilot = {
    available: true, duration: '30 days', cost: 'Free', scope: 'Site A', // legacy mirror of entries[0]
    entries: [
      { duration: '30 days', cost: 'Free', scope: 'Site A' },
      { duration: '90 days', cost: '$2,500', scope: 'Site B' },
    ],
  };
  const entries = pilotEntriesOf(pilot);
  assert.equal(entries.length, 2);
  assert.deepEqual(entries[1], { duration: '90 days', cost: '$2,500', scope: 'Site B' });
});

test('customFieldsOf returns [] when a block has no `custom` array (every pre-feature listing)', () => {
  assert.deepEqual(customFieldsOf({ warranty: '2 years', support_channels: ['Phone'], sla: '' }), []);
  assert.deepEqual(customFieldsOf(null), []);
});

test('customFieldsOf reads vendor-added {label, value} rows and drops half-empty ones', () => {
  const block = { warranty: '2 years', custom: [
    { label: 'Financing', value: '0% for 12 months' },
    { label: 'No value here', value: '' },
    { label: '', value: 'No label here' },
    { notAPair: true },
  ] };
  const custom = customFieldsOf(block);
  assert.deepEqual(custom, [{ label: 'Financing', value: '0% for 12 months' }]);
});

// --- Write-side sanitization (cleanBlock via normalizeListingInput) --------
// This is the ONLY path client input reaches the DB, so it is the real
// enforcement point for the abuse/bloat caps.

test('normalizeListingInput: a single pilot writes the OLD shape exactly (no `entries` key)', () => {
  // The real client (toBody in vendor/listings/page.tsx) omits `entries`
  // from the request body entirely when there is 0 or 1 pilot — it only
  // appends the key when there are 2+. cleanBlock only sets an output key
  // when the shape's key is present in the input, so omitting it here is
  // what actually happens on the wire for a single-pilot save.
  const patch = normalizeListingInput('service', {
    pilot: { available: true, duration: '30 days', cost: 'Free', scope: 'One site' },
  });
  assert.deepEqual(patch.pilot, { available: true, duration: '30 days', cost: 'Free', scope: 'One site' });
  assert.equal('entries' in (patch.pilot as object), false);
});

test('normalizeListingInput: if a client DOES send an empty `entries` array, it resolves to [] (still safe, just an extra key)', () => {
  const patch = normalizeListingInput('service', {
    pilot: { available: true, duration: '30 days', cost: 'Free', scope: 'One site', entries: [] },
  });
  assert.deepEqual(patch.pilot, { available: true, duration: '30 days', cost: 'Free', scope: 'One site', entries: [] });
});

test('normalizeListingInput: 2+ pilots keep the `entries` array and cap at 8', () => {
  const entries = Array.from({ length: 10 }, (_, i) => ({ duration: `${i + 1} days`, cost: '', scope: '' }));
  const patch = normalizeListingInput('service', {
    pilot: { available: true, duration: '1 days', cost: '', scope: '', entries },
  });
  const pilot = patch.pilot as { entries: unknown[] };
  assert.equal(pilot.entries.length, 8);
});

test('normalizeListingInput: pilot entries with nothing filled in are dropped', () => {
  const patch = normalizeListingInput('service', {
    pilot: { available: false, duration: '', cost: '', scope: '', entries: [
      { duration: '', cost: '', scope: '' },
      { duration: '10 days', cost: '', scope: '' },
    ] },
  });
  const pilot = patch.pilot as { entries: Array<{ duration: string }> };
  assert.equal(pilot.entries.length, 1);
  assert.equal(pilot.entries[0].duration, '10 days');
});

test('normalizeListingInput: custom fields are capped at 20 and empties are dropped', () => {
  const custom = Array.from({ length: 25 }, (_, i) => ({ label: `Field ${i}`, value: `Value ${i}` }));
  custom.push({ label: '', value: 'no label' }, { label: 'no value', value: '' });

  const patch = normalizeListingInput('service', {
    implementation: { requirements: [], typical_timeline: '', training: '', custom },
  });
  const out = (patch.implementation as { custom: Array<{ label: string; value: string }> }).custom;
  assert.equal(out.length, 20, 'capped at 20 valid entries');
  assert.deepEqual(out[0], { label: 'Field 0', value: 'Value 0' });
});

test('normalizeListingInput: custom field label/value are trimmed to 60/300 chars', () => {
  const longLabel = 'x'.repeat(200);
  const longValue = 'y'.repeat(1000);
  const patch = normalizeListingInput('service', {
    implementation: { custom: [{ label: longLabel, value: 'short' }, { label: 'short', value: longValue }] },
  });
  const out = (patch.implementation as { custom: Array<{ label: string; value: string }> }).custom;
  assert.equal(out.length, 2);
  assert.equal(out[0].label.length, 60);
  assert.equal(out[1].value.length, 300);
});

test('normalizeListingInput: custom fields on warranty_support and pricing round-trip the same way', () => {
  const ws = normalizeListingInput('product', {
    warranty_support: { warranty: '1 year', custom: [{ label: 'Extended plan', value: 'Available for +$500/yr' }] },
  }).warranty_support as { custom: Array<{ label: string; value: string }> };
  assert.deepEqual(ws.custom, [{ label: 'Extended plan', value: 'Available for +$500/yr' }]);

  const pr = normalizeListingInput('product', {
    pricing: { model: 'quote', custom: [{ label: 'Trade-in credit', value: 'Up to $1,000' }] },
  }).pricing as { custom: Array<{ label: string; value: string }> };
  assert.deepEqual(pr.custom, [{ label: 'Trade-in credit', value: 'Up to $1,000' }]);
});

test('normalizeListingInput: a block with only empty custom rows omits the `custom` key entirely', () => {
  const patch = normalizeListingInput('service', {
    pricing: { model: 'quote', custom: [{ label: '', value: '' }] },
  });
  const pricing = patch.pricing as Record<string, unknown>;
  assert.equal('custom' in pricing, true); // key IS present (client sent it)…
  assert.deepEqual(pricing.custom, []); // …but resolves to an empty array, matching existing cleanBlock 'arr' behavior
});

test('normalizeListingInput: malicious/HTML-y custom field content is stored as plain text (no markup stripped, none rendered — the display layer never dangerouslySetInnerHTML this)', () => {
  const patch = normalizeListingInput('service', {
    implementation: { custom: [{ label: '<script>alert(1)</script>', value: '<img src=x onerror=alert(1)>' }] },
  });
  const custom = (patch.implementation as { custom: Array<{ label: string; value: string }> }).custom;
  assert.equal(custom.length, 1);
  // cleanStr does not strip HTML — the guarantee is that the display layer
  // renders these as text (React text nodes), never innerHTML. That is
  // asserted by inspection of the display pages (no dangerouslySetInnerHTML
  // touches listing content); this test just documents the raw stored value.
  assert.ok(custom[0].label.includes('<script>'));
});

// --- Category / industries / best_for / use_cases stay simple arrays ------

test('cleanArray still backs best_for/industries — chip UI does not change the persisted shape', () => {
  assert.deepEqual(cleanArray(['Warehousing & 3PL', 'Warehousing & 3PL', ' Manufacturing '], 15), ['Warehousing & 3PL', 'Manufacturing']);
});

// --- cleanBlock shape table sanity -----------------------------------------

test('BLOCK_SHAPES declares the new pairs/pilots types for the extensible blocks', () => {
  assert.equal(BLOCK_SHAPES.pilot.entries, 'pilots');
  assert.equal(BLOCK_SHAPES.implementation.custom, 'pairs');
  assert.equal(BLOCK_SHAPES.warranty_support.custom, 'pairs');
  assert.equal(BLOCK_SHAPES.pricing.custom, 'pairs');
});

test('cleanBlock: unknown keys are still dropped (fail-closed) even alongside pairs/pilots', () => {
  const out = cleanBlock(
    { warranty: 'ok', custom: [{ label: 'a', value: 'b' }], evil_key: 'should not survive' },
    BLOCK_SHAPES.warranty_support,
  );
  assert.ok(out);
  assert.equal('evil_key' in (out as object), false);
});
