import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveDealMilestone, milestoneIndex, DEAL_MILESTONE_SEQUENCE } from '@/lib/messages/dealTracker';

// R4 pinned deal tracker — milestone pills derived purely from data that
// already exists on this thread's quote_requests/commissions rows. No new
// DB status is introduced (binding deviation #2: no "Payment Funded" step).

test('no offer sent yet = request', () => {
  assert.equal(deriveDealMilestone({ quoteAmount: null, hasRevision: false }), 'request');
});

test('an offer exists, no revision, no decision = quote_sent', () => {
  assert.equal(deriveDealMilestone({ quoteAmount: 4200, hasRevision: false }), 'quote_sent');
});

test('2+ non-draft revisions with no decision yet = revised', () => {
  assert.equal(deriveDealMilestone({ quoteAmount: 4200, hasRevision: true }), 'revised');
});

test('buyer_decision accepted (no invoice yet) = accepted', () => {
  assert.equal(
    deriveDealMilestone({ quoteAmount: 4200, hasRevision: false, buyerDecision: 'accepted' }),
    'accepted',
  );
});

test('accepted + vendor recorded an invoice = in_progress', () => {
  assert.equal(
    deriveDealMilestone({
      quoteAmount: 4200, hasRevision: false, buyerDecision: 'accepted',
      commission: { invoice_number: 'INV-1' },
    }),
    'in_progress',
  );
});

test('commission.status paid wins as the terminal completed state', () => {
  assert.equal(
    deriveDealMilestone({
      quoteAmount: 4200, hasRevision: false, buyerDecision: 'accepted',
      commission: { invoice_number: 'INV-1', status: 'paid' },
    }),
    'completed',
  );
});

test('declined is a separate terminal state, never folded into the happy path', () => {
  assert.equal(
    deriveDealMilestone({ quoteAmount: 4200, hasRevision: true, buyerDecision: 'declined' }),
    'declined',
  );
});

test('declined takes precedence even if a (stale) commission row says something else', () => {
  assert.equal(
    deriveDealMilestone({
      quoteAmount: 4200, hasRevision: false, buyerDecision: 'declined',
      commission: { status: 'quoted' },
    }),
    'declined',
  );
});

test('milestoneIndex places every happy-path stage in the documented left-to-right order', () => {
  assert.deepEqual(DEAL_MILESTONE_SEQUENCE, ['request', 'quote_sent', 'revised', 'accepted', 'in_progress', 'completed']);
  assert.equal(milestoneIndex('request'), 0);
  assert.equal(milestoneIndex('completed'), 5);
});

test('milestoneIndex returns -1 for the declined terminal state (not part of the linear sequence)', () => {
  assert.equal(milestoneIndex('declined'), -1);
});
