import assert from 'node:assert/strict';
import test from 'node:test';

import { buildThreadTimeline, latestOffer } from '@/lib/messages/threadTimeline';
import { buildOfferTimeline } from '@/lib/messages/offerTimeline';

test('buildThreadTimeline interleaves messages and offer cards in chronological order', () => {
  const messages = [
    { id: 'm1', created_at: '2026-07-30T10:00:00.000Z' },
    { id: 'm2', created_at: '2026-07-30T12:00:00.000Z' },
  ];
  const offers = buildOfferTimeline([
    { id: 'o1', revision: 1, status: 'submitted', total: 1000, created_at: '2026-07-30T11:00:00.000Z' },
  ]);
  const timeline = buildThreadTimeline(messages, offers);
  assert.deepEqual(timeline.map((t) => t.kind), ['message', 'offer', 'message']);
});

test('latestOffer picks the highest revision number', () => {
  const offers = buildOfferTimeline([
    { id: 'a', revision: 1, status: 'submitted', total: 100, created_at: '2026-07-30T00:00:00.000Z' },
    { id: 'b', revision: 2, status: 'submitted', total: 90, created_at: '2026-07-30T01:00:00.000Z' },
  ]);
  assert.equal(latestOffer(offers)!.id, 'b');
});

test('latestOffer returns null for an empty thread (no offer sent yet)', () => {
  assert.equal(latestOffer([]), null);
});
