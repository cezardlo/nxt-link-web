import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Structural regression guard for
// supabase/migrations/20260730_rfq_invitations_r1b.sql — same approach as
// tests/rfq-migration-shape.test.ts: reads the REAL migration file off disk so
// these checks fail if it ever drifts from the R1b hard constraints:
// brand-new additive table only, idempotent, RLS locked to service_role,
// no existing column/table/money-path touched.

const ROOT = join(__dirname, '..');
const sql = readFileSync(join(ROOT, 'supabase/migrations/20260730_rfq_invitations_r1b.sql'), 'utf8');

test('migration never alters or drops an existing column/table (additive-only, brand-new table)', () => {
  assert.doesNotMatch(sql, /alter\s+column/i);
  assert.doesNotMatch(sql, /drop\s+column/i);
  assert.doesNotMatch(sql, /drop\s+table/i);
});

test('migration never touches the money tables (commissions, manual_deals) or the fee engine, or quote_requests.status', () => {
  assert.doesNotMatch(sql, /alter table public\.commissions/i);
  assert.doesNotMatch(sql, /alter table public\.manual_deals/i);
  assert.doesNotMatch(sql, /calculateFee/);
  assert.doesNotMatch(sql, /quote_requests_status_check/i);
  assert.doesNotMatch(sql, /alter table public\.quote_requests/i);
  assert.doesNotMatch(sql, /alter table public\.client_requests/i);
});

test('request_invitations is created idempotently (create table if not exists)', () => {
  assert.match(sql, /create table if not exists public\.request_invitations/i);
});

test('every index is created idempotently (if not exists)', () => {
  const indexLines = sql.match(/create index[^\n]*/gi) || [];
  assert.ok(indexLines.length >= 3, 'expected at least 3 indexes (request, vendor, quote_request)');
  for (const line of indexLines) {
    assert.match(line, /create index if not exists/i, `not idempotent: ${line}`);
  }
});

test('request_invitations has the exact minimal columns the spec calls for (request ref, vendor_id, invited_at, status)', () => {
  for (const col of ['request_id', 'vendor_id', 'quote_request_id', 'status', 'invited_at', 'created_at', 'updated_at']) {
    assert.match(sql, new RegExp(`\\b${col}\\b`), `missing request_invitations.${col}`);
  }
});

test('request_id references client_requests, vendor_id references vendor_profiles, quote_request_id references quote_requests', () => {
  assert.match(sql, /request_id\s+uuid not null references public\.client_requests\(id\)/i);
  assert.match(sql, /vendor_id\s+uuid not null references public\.vendor_profiles\(id\)/i);
  assert.match(sql, /quote_request_id\s+uuid references public\.quote_requests\(id\)/i);
});

test('status is constrained to the exact minimal vocabulary: invited/viewed/quoted/declined, defaulting to invited', () => {
  assert.match(sql, /status\s+text not null default 'invited'/i);
  const m = sql.match(/check \(status in \(([^)]+)\)\)/i);
  assert.ok(m, 'expected a status CHECK constraint');
  for (const v of ['invited', 'viewed', 'quoted', 'declined']) {
    assert.match(m![1], new RegExp(`'${v}'`));
  }
});

test('one invitation per (request, vendor) — unique constraint present', () => {
  assert.match(sql, /unique\s*\(request_id,\s*vendor_id\)/i);
});

test('RLS is enabled and locked to service_role only (no anon/authenticated access), mirroring 20260708_notifications.sql', () => {
  assert.match(sql, /alter table public\.request_invitations enable row level security;/i);
  assert.match(sql, /create policy request_invitations_service_all on public\.request_invitations\s*\n\s*for all to service_role using \(true\) with check \(true\);/i);
  // The policy creation is wrapped so re-running the migration doesn't error.
  assert.match(sql, /exception when duplicate_object then null;/i);
});
