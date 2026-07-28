import assert from 'node:assert/strict';
import test from 'node:test';

import {
  autosaveKey,
  isAutosaveWorthKeeping,
  mergeWithDefaults,
  parseAutosave,
  serializeAutosave,
} from '@/lib/vendor/listing-autosave';

// Local-only draft persistence for the vendor listing editor (never lose
// work on a tab close). These are the pure serialize/restore/merge rules —
// no localStorage or React involved, so they're plain unit tests.

test('autosaveKey: scopes by vendor + kind + listing id', () => {
  assert.equal(autosaveKey('vendor-1', 'product', 'listing-9'), 'nxt_listing_draft_v1:vendor-1:product:listing-9');
});

test('autosaveKey: a new (unsaved) listing uses the "new" slot', () => {
  assert.equal(autosaveKey('vendor-1', 'service', null), 'nxt_listing_draft_v1:vendor-1:service:new');
});

test('autosaveKey: missing/blank auth id falls back to "anon" rather than an empty segment', () => {
  assert.equal(autosaveKey('', 'product', null), 'nxt_listing_draft_v1:anon:product:new');
  assert.equal(autosaveKey('   ', 'product', null), 'nxt_listing_draft_v1:anon:product:new');
});

test('autosaveKey: two different vendors never collide on the same slot', () => {
  const a = autosaveKey('vendor-a', 'product', null);
  const b = autosaveKey('vendor-b', 'product', null);
  assert.notEqual(a, b);
});

test('serializeAutosave / parseAutosave round-trip the form and timestamp', () => {
  const form = { name: 'Forklift 5000lb', best_for: ['Warehousing'] };
  const raw = serializeAutosave(form, 1000);
  const snap = parseAutosave<typeof form>(raw, 1000 + 5_000);
  assert.ok(snap);
  assert.equal(snap?.savedAt, 1000);
  assert.deepEqual(snap?.form, form);
});

test('parseAutosave: null/undefined/empty input is not a stashed draft', () => {
  assert.equal(parseAutosave(null), null);
  assert.equal(parseAutosave(undefined), null);
  assert.equal(parseAutosave(''), null);
});

test('parseAutosave: corrupt JSON is treated as nothing stashed, not a crash', () => {
  assert.equal(parseAutosave('{not valid json'), null);
});

test('parseAutosave: missing savedAt or non-object form is rejected', () => {
  assert.equal(parseAutosave(JSON.stringify({ form: { a: 1 } })), null);
  assert.equal(parseAutosave(JSON.stringify({ savedAt: 1000, form: 'nope' })), null);
  assert.equal(parseAutosave(JSON.stringify({ savedAt: 1000, form: null })), null);
});

test('parseAutosave: a draft older than 7 days is never offered back', () => {
  const eightDaysMs = 8 * 24 * 60 * 60 * 1000;
  const raw = serializeAutosave({ name: 'Old draft' }, 0);
  assert.equal(parseAutosave(raw, eightDaysMs), null);
});

test('parseAutosave: a draft right at the edge of the window still restores', () => {
  const almostSevenDays = 7 * 24 * 60 * 60 * 1000 - 1000;
  const raw = serializeAutosave({ name: 'Still fresh' }, 0);
  assert.ok(parseAutosave(raw, almostSevenDays));
});

test('parseAutosave: a future-dated savedAt (clock skew/tampering) is rejected', () => {
  const raw = serializeAutosave({ name: 'From the future' }, 10_000);
  assert.equal(parseAutosave(raw, 0), null);
});

test('isAutosaveWorthKeeping: a brand-new/blank form is not worth keeping', () => {
  assert.equal(isAutosaveWorthKeeping({ name: '', category: '', best_for: [], emergency_available: false }), false);
});

test('isAutosaveWorthKeeping: any non-empty string, true boolean, or non-empty array counts', () => {
  assert.equal(isAutosaveWorthKeeping({ name: 'Air compressor', best_for: [] }), true);
  assert.equal(isAutosaveWorthKeeping({ name: '', emergency_available: true }), true);
  assert.equal(isAutosaveWorthKeeping({ name: '', best_for: ['Manufacturing'] }), true);
});

test('isAutosaveWorthKeeping: whitespace-only strings do not count', () => {
  assert.equal(isAutosaveWorthKeeping({ name: '   ', overview: '\n\t' }), false);
});

const DEFAULTS = { name: '', buy: false, industries: [] as string[] };

test('mergeWithDefaults: same-typed stored values win over defaults', () => {
  const merged = mergeWithDefaults(DEFAULTS, { name: 'Pallet jack', buy: true, industries: ['Logistics'] });
  assert.deepEqual(merged, { name: 'Pallet jack', buy: true, industries: ['Logistics'] });
});

test('mergeWithDefaults: a wrong-typed field falls back to the default instead of poisoning state', () => {
  const merged = mergeWithDefaults(DEFAULTS, { name: 12345, buy: 'yes', industries: 'not-an-array' });
  assert.deepEqual(merged, DEFAULTS);
});

test('mergeWithDefaults: missing keys fall back to defaults; unknown extra keys are dropped', () => {
  const merged = mergeWithDefaults(DEFAULTS, { name: 'Only this field', extra_unknown_key: 'ignored' });
  assert.deepEqual(merged, { name: 'Only this field', buy: false, industries: [] });
  assert.equal('extra_unknown_key' in merged, false);
});

test('mergeWithDefaults: null/non-object stored input yields the defaults unchanged', () => {
  assert.deepEqual(mergeWithDefaults(DEFAULTS, null), DEFAULTS);
  assert.deepEqual(mergeWithDefaults(DEFAULTS, 'garbage'), DEFAULTS);
});
