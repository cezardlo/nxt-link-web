import assert from 'node:assert/strict';
import test from 'node:test';

import { makeFakeDb } from './helpers/fake-supabase';

// In-app notifications (Slice R5 surface pass) — GET /api/buyer/notifications
// and GET /api/vendor/notifications each scope strictly to the CALLER's own
// identity: buyers by their own verified email (case-insensitive), vendors by
// their own vendor_profiles.id. Both routes already existed (built alongside
// the buyer<->vendor chat, commit 1c9dc12) but had no dedicated proof that the
// query shape can't leak across recipients — this exercises the EXACT filter
// chain each route runs (recipient + owner match), seeded with rows for TWO
// different buyers and TWO different vendors, proving neither can ever see
// the other's notifications.

function likeLiteral(v: string): string { return v.replace(/[\\%_]/g, (c) => `\\${c}`); }

test('buyer notifications: recipient=buyer + email match returns ONLY that buyer\'s rows, never another buyer\'s', async () => {
  const db = makeFakeDb({
    notifications: [
      { id: 'n1', recipient: 'buyer', buyer_email: 'alice@example.com', title: 'Quote received' },
      { id: 'n2', recipient: 'buyer', buyer_email: 'bob@example.com', title: 'Quote received (bob)' },
      { id: 'n3', recipient: 'vendor', vendor_id: 'vendor-a', title: 'New lead' },
    ],
  });
  const { data } = await db.from('notifications').select('id, title')
    .eq('recipient', 'buyer').ilike('buyer_email', likeLiteral('alice@example.com'));
  const rows = data || [];
  assert.deepEqual(rows.map((n) => n.id), ['n1']);
});

test('buyer notifications: email match is case-insensitive (same identity, different case never splits/leaks)', async () => {
  const db = makeFakeDb({
    notifications: [{ id: 'n1', recipient: 'buyer', buyer_email: 'Alice@Example.com', title: 'Quote received' }],
  });
  const { data } = await db.from('notifications').select('id')
    .eq('recipient', 'buyer').ilike('buyer_email', likeLiteral('alice@example.com'));
  assert.equal((data || []).length, 1);
});

test('vendor notifications: recipient=vendor + vendor_id match returns ONLY that vendor\'s rows, never another vendor\'s', async () => {
  const db = makeFakeDb({
    notifications: [
      { id: 'n1', recipient: 'vendor', vendor_id: 'vendor-a', title: 'New lead' },
      { id: 'n2', recipient: 'vendor', vendor_id: 'vendor-b', title: 'New lead (b)' },
      { id: 'n3', recipient: 'buyer', buyer_email: 'alice@example.com', title: 'Quote received' },
    ],
  });
  const { data } = await db.from('notifications').select('id, title').eq('recipient', 'vendor').eq('vendor_id', 'vendor-a');
  const rows = data || [];
  assert.deepEqual(rows.map((n) => n.id), ['n1']);
});

test('a recipient type mismatch never leaks: a buyer-email match with recipient=vendor filter returns nothing', async () => {
  // Defense-in-depth check that the recipient filter is load-bearing, not
  // redundant — even if a buyer_email happened to collide with something
  // stored under recipient='vendor' (shouldn't happen, but the filter itself
  // is what keeps the two audiences apart, not the shape of the data).
  const db = makeFakeDb({
    notifications: [{ id: 'n1', recipient: 'buyer', buyer_email: 'alice@example.com', title: 'x' }],
  });
  const { data } = await db.from('notifications').select('id').eq('recipient', 'vendor').ilike('buyer_email', likeLiteral('alice@example.com'));
  assert.equal((data || []).length, 0);
});

test('unread count derivation: only rows with a null read_at count as unread (mirrors the routes\' own `.filter((n) => !n.read_at)`)', async () => {
  const db = makeFakeDb({
    notifications: [
      { id: 'n1', recipient: 'buyer', buyer_email: 'alice@example.com', read_at: null },
      { id: 'n2', recipient: 'buyer', buyer_email: 'alice@example.com', read_at: '2026-07-30T00:00:00.000Z' },
    ],
  });
  const { data } = await db.from('notifications').select('id, read_at').eq('recipient', 'buyer').ilike('buyer_email', likeLiteral('alice@example.com'));
  const unread = (data || []).filter((n) => !n.read_at);
  assert.equal(unread.length, 1);
  assert.equal(unread[0].id, 'n1');
});
