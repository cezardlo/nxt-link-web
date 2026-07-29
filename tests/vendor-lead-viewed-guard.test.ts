import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AUTO_VIEWABLE_STATUSES, canAutoMarkViewed } from '@/lib/vendor/leadStatus';

// Slice RV (2026-07-29): the vendor leads inbox now auto-writes
// status='viewed' the first time a vendor opens their leads list (there is
// no separate detail route — the whole lead renders inline on
// /vendor/leads, so opening the list IS opening the detail). This must be a
// one-way upgrade: a lead that has already progressed past "new" must never
// be pulled back down to 'viewed', or a buyer would see a vendor's real
// progress (a submitted quote, a decision) visibly regress.

const ROOT = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

test('canAutoMarkViewed allows only the two untouched-lead statuses', () => {
  assert.equal(canAutoMarkViewed('new'), true);
  assert.equal(canAutoMarkViewed('sent_to_vendor'), true);
});

test('canAutoMarkViewed refuses every status that represents real vendor progress', () => {
  for (const status of ['viewed', 'responded', 'won', 'lost', 'spam']) {
    assert.equal(canAutoMarkViewed(status), false, `must not auto-mark a "${status}" lead as viewed`);
  }
});

test('canAutoMarkViewed refuses null/undefined/empty/unknown values (fail closed, no accidental upgrade)', () => {
  assert.equal(canAutoMarkViewed(null), false);
  assert.equal(canAutoMarkViewed(undefined), false);
  assert.equal(canAutoMarkViewed(''), false);
  assert.equal(canAutoMarkViewed('some_future_status'), false);
});

test('AUTO_VIEWABLE_STATUSES is exactly the two pre-vendor-action values (single source of truth for the DB guard)', () => {
  assert.deepEqual([...AUTO_VIEWABLE_STATUSES].sort(), ['new', 'sent_to_vendor']);
});

// Regression: prove the route actually wires the guard in — reading the real
// source (not a hand-duplicated literal) so this fails if someone reverts to
// an unconditional status:'viewed' write.
test('vendor/leads GET route uses the guard before writing status=\'viewed\', re-checks status in the update itself', () => {
  const src = read('src/app/api/vendor/leads/route.ts');
  assert.match(src, /canAutoMarkViewed\(/, 'GET handler must call canAutoMarkViewed before auto-marking a lead viewed');
  assert.match(src, /status:\s*'viewed'/, 'auto-view write must set status to \'viewed\'');
  // The update's own .in('status', AUTO_VIEWABLE_STATUSES...) re-check is the
  // real guard against a race with a concurrent quote submission — assert it
  // is present, not just the in-memory filter.
  assert.match(src, /\.in\(\s*'status'\s*,\s*AUTO_VIEWABLE_STATUSES/, 'the DB update must re-check current status, not just the pre-fetched one');
});

test('manual PATCH status vocabulary is unchanged by this slice (still new/viewed/responded/won/lost/spam)', () => {
  const src = read('src/app/api/vendor/leads/route.ts');
  assert.match(src, /const STATUSES = \['new', 'viewed', 'responded', 'won', 'lost', 'spam'\];/);
});
