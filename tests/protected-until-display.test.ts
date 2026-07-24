import assert from 'node:assert/strict';
import test from 'node:test';

import { PROTECTION_MONTHS, resolveDisplayedProtectedUntil } from '@/lib/fees/engine';

// Audit finding (High): /vendor/leads was showing the 90-day pre-acceptance
// commissions.protected_until forever, even after the buyer accepted and the
// REAL 12-month (PROTECTION_MONTHS) date was computed onto manual_deals. A
// vendor could read the stale 90-day date as their protection having lapsed.
// These tests pin the fix's decision logic: once accepted, the 12-month deal
// date wins over the 90-day quote-time date.

test('PROTECTION_MONTHS is 12 (the real, marketed protection window)', () => {
  assert.equal(PROTECTION_MONTHS, 12);
});

test('before acceptance: shows the 90-day commissions.protected_until as-is (correct, not a bug)', () => {
  const quoteSentAt = new Date('2026-01-01T00:00:00.000Z');
  const ninetyDayDate = new Date(quoteSentAt.getTime() + 90 * 86400000).toISOString();

  const result = resolveDisplayedProtectedUntil({
    buyerDecision: null,
    commissionProtectedUntil: ninetyDayDate,
    dealProtectedUntil: null, // no deal yet — buyer hasn't accepted
  });

  assert.equal(result, ninetyDayDate);
});

test('after acceptance: shows the 12-month deal date, NOT the stale 90-day quote date', () => {
  const acceptedAt = new Date('2026-01-01T00:00:00.000Z');
  const staleNinetyDayDate = new Date(acceptedAt.getTime() + 90 * 86400000).toISOString();
  const twelveMonthDate = new Date(acceptedAt);
  twelveMonthDate.setMonth(twelveMonthDate.getMonth() + PROTECTION_MONTHS);
  const realDate = twelveMonthDate.toISOString();

  const result = resolveDisplayedProtectedUntil({
    buyerDecision: 'accepted',
    commissionProtectedUntil: staleNinetyDayDate, // still sitting on the old row
    dealProtectedUntil: realDate, // written by /api/buyer/quote-decision
  });

  assert.equal(result, realDate);
  assert.notEqual(result, staleNinetyDayDate);
  // The real date must be well past the stale 90-day date — proves this
  // resolves to 12 MONTHS out, not 90 days out, from the same anchor.
  assert.ok(new Date(result as string).getTime() > new Date(staleNinetyDayDate).getTime());
});

test('accepted but no linked deal row yet: falls back to the commission date rather than showing nothing', () => {
  const commissionDate = '2026-04-01T00:00:00.000Z';
  const result = resolveDisplayedProtectedUntil({
    buyerDecision: 'accepted',
    commissionProtectedUntil: commissionDate,
    dealProtectedUntil: null,
  });
  assert.equal(result, commissionDate);
});

test('declined lead never uses a deal date even if one somehow exists', () => {
  const commissionDate = '2026-04-01T00:00:00.000Z';
  const result = resolveDisplayedProtectedUntil({
    buyerDecision: 'declined',
    commissionProtectedUntil: commissionDate,
    dealProtectedUntil: '2027-01-01T00:00:00.000Z',
  });
  assert.equal(result, commissionDate);
});

test('no commission date and no deal date resolves to null, not a crash', () => {
  const result = resolveDisplayedProtectedUntil({
    buyerDecision: 'accepted',
    commissionProtectedUntil: null,
    dealProtectedUntil: null,
  });
  assert.equal(result, null);
});
