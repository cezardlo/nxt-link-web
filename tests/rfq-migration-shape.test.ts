import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Structural regression guard for
// supabase/migrations/20260729_rfq_structured_fields_r1.sql — reads the REAL
// migration file off disk (same approach as tests/quote-status-vocabulary.test.ts)
// so these checks fail if the migration ever drifts from the R1 hard
// constraints: additive-only, every new column nullable/defaulted, no
// existing column/constraint/status vocabulary touched, money/fee tables
// untouched.

const ROOT = join(__dirname, '..');
const sql = readFileSync(join(ROOT, 'supabase/migrations/20260729_rfq_structured_fields_r1.sql'), 'utf8');

test('migration never alters or drops an existing column (additive-only)', () => {
  assert.doesNotMatch(sql, /alter\s+column/i);
  assert.doesNotMatch(sql, /drop\s+column/i);
});

test('migration never touches quote_requests.status or its CHECK (separate, already-decided concern)', () => {
  assert.doesNotMatch(sql, /quote_requests_status_check/i);
  assert.doesNotMatch(sql, /\bstatus\s+text\b/i);
});

test('migration never touches the money tables (commissions, manual_deals) or the fee engine', () => {
  assert.doesNotMatch(sql, /alter table public\.commissions/i);
  assert.doesNotMatch(sql, /alter table public\.manual_deals/i);
  assert.doesNotMatch(sql, /calculateFee/);
});

test('every ADD COLUMN uses IF NOT EXISTS (idempotent, safe to run more than once)', () => {
  const addColumnLines = sql.match(/alter table [^\n]*add column[^\n]*/gi) || [];
  assert.ok(addColumnLines.length > 10, 'expected many add-column statements');
  for (const line of addColumnLines) {
    assert.match(line, /add column if not exists/i, `not idempotent: ${line}`);
  }
});

test('the two new table-level budget-range CHECK constraints are added idempotently (drop-then-add, matching the repo convention)', () => {
  for (const name of ['quote_requests_budget_range_chk', 'client_requests_budget_range_chk']) {
    assert.match(sql, new RegExp(`drop constraint if exists ${name}`, 'i'));
    assert.match(sql, new RegExp(`add constraint ${name}`, 'i'));
  }
});

test('quote_requests gains the expected new request-side + quote-side columns', () => {
  for (const col of [
    'request_kind', 'quantity', 'delivery_location', 'preferred_timeline',
    'budget_min', 'budget_max', 'structured_specs',
    'quote_payment_terms', 'quote_warranty', 'quote_extras',
  ]) {
    assert.match(sql, new RegExp(`quote_requests add column if not exists ${col}\\b`), `missing quote_requests.${col}`);
  }
});

test('client_requests gains the expected new typed columns alongside its existing free-text ones', () => {
  for (const col of [
    'request_kind', 'quantity_int', 'delivery_location', 'preferred_timeline',
    'budget_min', 'budget_max', 'structured_specs',
  ]) {
    assert.match(sql, new RegExp(`client_requests add column if not exists ${col}\\b`), `missing client_requests.${col}`);
  }
  // The legacy free-text columns must never be mentioned as altered/dropped.
  assert.doesNotMatch(sql, /client_requests[^\n]*drop column/i);
});

test('quote_proposals gains request_kind + quote_extras only (its existing commons columns are untouched)', () => {
  assert.match(sql, /quote_proposals add column if not exists request_kind\b/);
  assert.match(sql, /quote_proposals add column if not exists quote_extras\b/);
  // The pre-existing comparable commons (already cover total/lead_time/
  // valid_until/payment_terms/warranty/notes) must not be re-declared here.
  assert.doesNotMatch(sql, /quote_proposals add column if not exists (total|lead_time|valid_until|payment_terms|warranty|notes)\b/);
});

test('request_kind is constrained to the exact three kinds everywhere it appears', () => {
  const matches = sql.match(/check \(request_kind is null or request_kind in \(([^)]+)\)\)/g) || [];
  assert.ok(matches.length >= 3, 'expected a request_kind CHECK on all three tables');
  for (const m of matches) {
    assert.match(m, /'product'/);
    assert.match(m, /'service'/);
    assert.match(m, /'technology'/);
  }
});
