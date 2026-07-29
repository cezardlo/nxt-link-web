import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Regression suite for the #1 audit finding (backend-correctness-2026-07-28.md
// §3 Finding 1 / §2 Finding 4, ALL-DEPT-AUDIT-2026-07-28.md #1): the live
// `quote_requests_status_check` constraint only allowed
//   new, sent_to_vendor, quoted, won, lost, closed
// while the app has always written/read this column with
//   new, viewed, responded, won, lost, spam
// — so every vendor "send a quote" write (status: 'responded') was silently
// rejected by Postgres, and the core loop (vendor quotes -> buyer accepts ->
// deal) never completed. The fix (supabase/migrations/
// 20260729_quote_requests_status_vocabulary.sql) widens the CHECK to the
// UNION of both vocabularies and changes ZERO application code — the read
// side (buyer/vendor dashboards) already expected these values.
//
// These tests read the REAL migration SQL and REAL route/page source files
// off disk (not hand-duplicated literals) so they fail if the migration or
// the source ever drift apart again.

const ROOT = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

// The exact constraint the LIVE database enforced BEFORE this fix (confirmed
// via direct read-only SQL against project dwotpviynxkbvyxambdy, 2026-07-29:
// `select pg_get_constraintdef(oid) ... quote_requests_status_check`).
const LIVE_STATUS_CHECK_BEFORE_FIX = [
  'new', 'sent_to_vendor', 'quoted', 'won', 'lost', 'closed',
];

// The exact vocabulary the application writes to quote_requests.status,
// enumerated from every write site (grepped 2026-07-29):
//   - 'new'      — src/lib/requests/dispatch.ts, src/app/api/marketplace/request/route.ts (x2),
//                  src/app/api/vendor/open-requests/route.ts (insert)
//   - 'viewed'   — src/app/api/vendor/leads/route.ts PATCH (vendor opens a lead)
//   - 'responded'— src/app/api/vendor/quote/route.ts POST, src/app/api/vendor/proposals/route.ts
//                  POST (submit), src/app/api/vendor/leads/route.ts PATCH — THE bug: vendor
//                  sending a quote writes this value
//   - 'spam'     — src/app/api/vendor/leads/route.ts PATCH (vendor flags a lead)
//   - 'won'      — src/app/api/buyer/quote-decision/route.ts (buyer accepts)
//   - 'lost'     — src/app/api/buyer/quote-decision/route.ts (buyer declines)
const APP_WRITE_VOCABULARY = ['new', 'viewed', 'responded', 'spam', 'won', 'lost'];

function extractCheckValues(sql: string, constraintName: string): string[] {
  const re = new RegExp(
    `add constraint ${constraintName}[\\s\\S]*?check\\s*\\(status in \\(([\\s\\S]*?)\\)\\)`,
    'i',
  );
  const m = sql.match(re);
  assert.ok(m, `could not find "add constraint ${constraintName} ... check (status in (...))" in the migration`);
  return Array.from(m![1].matchAll(/'([^']+)'/g)).map((mm) => mm[1]);
}

// A tiny stand-in for the Postgres CHECK constraint itself — same semantics
// (status must be a member of the allowed array), so we can prove the write
// the vendor routes perform was rejected before the fix and is accepted after.
function wouldPostgresAccept(allowed: string[], status: string): boolean {
  return allowed.includes(status);
}

test('repro: the live pre-fix constraint rejected the vendor "send a quote" write (status: responded)', () => {
  assert.equal(wouldPostgresAccept(LIVE_STATUS_CHECK_BEFORE_FIX, 'responded'), false);
  assert.equal(wouldPostgresAccept(LIVE_STATUS_CHECK_BEFORE_FIX, 'viewed'), false);
  assert.equal(wouldPostgresAccept(LIVE_STATUS_CHECK_BEFORE_FIX, 'spam'), false);
});

test('migration: widened constraint accepts the FULL app vocabulary (new/viewed/responded/spam/won/lost)', () => {
  const sql = read('supabase/migrations/20260729_quote_requests_status_vocabulary.sql');
  const widened = extractCheckValues(sql, 'quote_requests_status_check');
  for (const status of APP_WRITE_VOCABULARY) {
    assert.equal(wouldPostgresAccept(widened, status), true, `migration must allow status='${status}'`);
  }
});

test('migration: widening is purely additive — every previously-allowed live value still allowed (no narrowing/regression)', () => {
  const sql = read('supabase/migrations/20260729_quote_requests_status_vocabulary.sql');
  const widened = extractCheckValues(sql, 'quote_requests_status_check');
  for (const status of LIVE_STATUS_CHECK_BEFORE_FIX) {
    assert.equal(wouldPostgresAccept(widened, status), true, `must not remove previously-allowed status='${status}'`);
  }
});

test('migration: is idempotent (drops the constraint before re-adding it)', () => {
  const sql = read('supabase/migrations/20260729_quote_requests_status_vocabulary.sql');
  assert.match(sql, /drop constraint if exists quote_requests_status_check/i);
  assert.match(sql, /add constraint quote_requests_status_check/i);
});

test('migration: does NOT touch commissions.status (separate table, separate constraint, already correct)', () => {
  const sql = read('supabase/migrations/20260729_quote_requests_status_vocabulary.sql');
  assert.doesNotMatch(sql, /commissions_status_check/i);
  assert.doesNotMatch(sql, /alter table public\.commissions/i);
});

test('write side unchanged: vendor/quote route still writes quote_requests.status = "responded" (Option A — zero app-code change)', () => {
  const src = read('src/app/api/vendor/quote/route.ts');
  assert.match(src, /status:\s*'responded'/);
  // The commissions upsert in the SAME route keeps its own, already-correct
  // vocabulary — must remain 'quoted' and must NOT have been touched.
  assert.match(src, /status:\s*'quoted'/);
});

test('write side unchanged: vendor/proposals route still writes quote_requests.status = "responded" on submit', () => {
  const src = read('src/app/api/vendor/proposals/route.ts');
  assert.match(src, /status:\s*'responded'/);
  assert.match(src, /status:\s*'quoted'/);
});

test('write side unchanged: vendor/leads PATCH still accepts the full viewed/responded/spam vocabulary', () => {
  const src = read('src/app/api/vendor/leads/route.ts');
  assert.match(src, /const STATUSES = \['new', 'viewed', 'responded', 'won', 'lost', 'spam'\];/);
});

test('read side already coherent: buyer dashboard QUOTE_LABEL already has a label for every value the vendor writes', () => {
  const src = read('src/app/buyer/page.tsx');
  const m = src.match(/const QUOTE_LABEL: Record<string, string> = \{([^}]+)\};/);
  assert.ok(m, 'QUOTE_LABEL map not found in src/app/buyer/page.tsx');
  const keys = Array.from(m![1].matchAll(/(\w+):/g)).map((mm) => mm[1]);
  for (const status of APP_WRITE_VOCABULARY) {
    assert.ok(keys.includes(status), `buyer QUOTE_LABEL is missing a label for status='${status}' — the read side would show the raw DB value`);
  }
  // The buyer card also keys its "responding" highlight class directly off
  // this exact value — proves the display logic was always waiting for it.
  assert.match(src, /q\.status === 'responded'/);
});

test('read side already coherent: vendor leads inbox tab list already includes "responded"', () => {
  const src = read('src/app/vendor/leads/page.tsx');
  assert.match(src, /const STATUSES = \['new', 'viewed', 'responded', 'won', 'lost'\];/);
});

test('fee math untouched: calculateFee is still the only commission computation in the vendor quote routes (no forked math)', () => {
  const quoteSrc = read('src/app/api/vendor/quote/route.ts');
  const proposalsSrc = read('src/app/api/vendor/proposals/route.ts');
  assert.match(quoteSrc, /calculateFee\(amount\)/);
  assert.match(proposalsSrc, /calculateFee\(total\)/);
});
