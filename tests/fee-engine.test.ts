import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CREDIT_WINDOW_DAYS,
  DEFAULT_FEE_POLICY,
  FIRST_DEAL_CREDIT_FOUNDING,
  FIRST_DEAL_CREDIT_STANDARD,
  applyAdjustments,
  calculateFee,
  computeEligibleSubtotal,
  explainFee,
  resolveFirstDealCredit,
  type FeePolicy,
} from '@/lib/fees/engine';

test('worked example from the launch-v2 schedule: $60,000 → $2,800 at 4.67% effective', () => {
  const result = calculateFee(60_000);
  assert.equal(result.fee, 2_800);
  assert.deepEqual(
    result.lines.map((l) => l.fee),
    [2_500, 300],
  );
  assert.equal(result.effectiveRate, 0.046667); // round2(2800/60000 * 10000) / 10000
  assert.equal(result.policyVersion, DEFAULT_FEE_POLICY.version);
});

test('marginal brackets have no rate cliffs at boundaries', () => {
  const atBoundary = calculateFee(10_000);
  assert.equal(atBoundary.fee, 500);
  const justOver = calculateFee(10_000.01);
  // one cent over adds ~0.05% of a cent, never a jump
  assert.ok(justOver.fee - atBoundary.fee < 0.01);
  const under = calculateFee(5_000);
  assert.equal(under.fee, 250);
  assert.equal(under.lines.length, 1);
});

test('top bracket applies only above $50,000', () => {
  const fifty = calculateFee(50_000);
  assert.equal(fifty.fee, 2_500);
  assert.equal(fifty.lines.length, 1);
});

test('zero subtotal produces zero fee and zero rate', () => {
  const result = calculateFee(0);
  assert.equal(result.fee, 0);
  assert.equal(result.effectiveRate, 0);
  assert.equal(result.lines.length, 0);
});

test('minimum fee and cap clamp the result and are flagged', () => {
  const withMin: FeePolicy = { ...DEFAULT_FEE_POLICY, minimumFee: 1_000 };
  const min = calculateFee(1_000, withMin); // raw 50 (5% of 1,000)
  assert.equal(min.fee, 1_000);
  assert.equal(min.appliedMinimum, true);

  // $1,000,000 raw = 2,500 (5% of 50k) + 28,500 (3% of 950k) = 31,000,
  // which exceeds the real $20,000 policy cap — so the cap actually engages.
  const capped = calculateFee(1_000_000);
  assert.equal(capped.fee, 20_000);
  assert.equal(capped.appliedMaximum, true);
});

test('negotiated rate replaces bracket math and is flagged', () => {
  const negotiated: FeePolicy = { ...DEFAULT_FEE_POLICY, negotiatedRate: 0.08 };
  const result = calculateFee(60_000, negotiated);
  assert.equal(result.fee, 4_800);
  assert.equal(result.usedNegotiatedRate, true);
  assert.equal(result.lines.length, 1);
});

test('invalid policies are rejected', () => {
  assert.throws(() => calculateFee(100, { ...DEFAULT_FEE_POLICY, brackets: [] }));
  assert.throws(() =>
    calculateFee(100, {
      ...DEFAULT_FEE_POLICY,
      brackets: [{ upTo: 10, rate: 0.1 }], // last bracket must be unbounded
    }),
  );
  assert.throws(() =>
    calculateFee(100, {
      ...DEFAULT_FEE_POLICY,
      brackets: [
        { upTo: null, rate: 0.1 },
        { upTo: 50, rate: 0.2 }, // unbounded bracket not last
      ],
    }),
  );
  assert.throws(() => calculateFee(-5));
});

test('eligible subtotal excludes tax, shipping, deposits, pass-throughs, refunds', () => {
  const { eligible, gross, exclusions } = computeEligibleSubtotal({
    lines: [
      { amount: 40_000, kind: 'product' },
      { amount: 10_000, kind: 'installation' },
      { amount: 4_000, kind: 'tax' },
      { amount: 1_200, kind: 'shipping' },
      { amount: 2_000, kind: 'deposit' },
      { amount: 500, kind: 'passthrough' },
    ],
    refunds: 1_000,
  });
  assert.equal(gross, 57_700);
  assert.equal(eligible, 49_000); // 50,000 - 1,000 refund
  assert.equal(exclusions.length, 5);
});

test('manual line exclusion requires a reason', () => {
  assert.throws(() =>
    computeEligibleSubtotal({
      lines: [{ amount: 100, kind: 'product', excluded: true }],
    }),
  );
  const ok = computeEligibleSubtotal({
    lines: [{ amount: 100, kind: 'product', excluded: true, exclusionReason: 'approved agreement §3' }],
  });
  assert.equal(ok.eligible, 0);
  assert.equal(ok.exclusions[0].reason, 'approved agreement §3');
});

test('eligible subtotal never goes negative', () => {
  const { eligible } = computeEligibleSubtotal({
    lines: [{ amount: 500, kind: 'service' }],
    refunds: 2_000,
  });
  assert.equal(eligible, 0);
});

test('adjustments demand a reason and an approver', () => {
  const base = calculateFee(60_000);
  assert.throws(() => applyAdjustments(base, [{ amount: -500, reason: '', approvedBy: 'admin' }]));
  assert.throws(() => applyAdjustments(base, [{ amount: -500, reason: 'clawback', approvedBy: '' }]));
  const adjusted = applyAdjustments(base, [
    { amount: -500, reason: 'partial shipment clawback', approvedBy: 'admin@nxtlink' },
  ]);
  assert.equal(adjusted.adjustedFee, 2_300);
  assert.equal(adjusted.fee, 2_800); // original preserved
});

test('adjusted fee never goes negative', () => {
  const base = calculateFee(1_000);
  const adjusted = applyAdjustments(base, [
    { amount: -10_000, reason: 'full refund clawback', approvedBy: 'admin@nxtlink' },
  ]);
  assert.equal(adjusted.adjustedFee, 0);
});

test('explanations are bilingual and cite policy version + math', () => {
  const { en, es } = explainFee(calculateFee(60_000));
  assert.ok(en.includes('$2,800'));
  assert.ok(en.includes('4.7%'));
  assert.ok(en.includes(DEFAULT_FEE_POLICY.version));
  assert.ok(es.includes('$2,800'));
  assert.ok(es.includes('Comisión'));
});

test('resolveFirstDealCredit: standard tier caps at $250', () => {
  const signupAt = new Date('2026-01-01T00:00:00Z');
  const now = new Date('2026-01-05T00:00:00Z');
  const result = resolveFirstDealCredit({ tier: 'standard', signupAt, now, priorCreditedDeals: 0, fee: 2_800 });
  assert.equal(result.eligible, true);
  assert.equal(result.cap, FIRST_DEAL_CREDIT_STANDARD);
  assert.equal(result.creditApplied, 250);
});

test('resolveFirstDealCredit: founding tier caps at $1,250', () => {
  const signupAt = new Date('2026-01-01T00:00:00Z');
  const now = new Date('2026-01-05T00:00:00Z');
  const result = resolveFirstDealCredit({ tier: 'founding', signupAt, now, priorCreditedDeals: 0, fee: 2_800 });
  assert.equal(result.eligible, true);
  assert.equal(result.cap, FIRST_DEAL_CREDIT_FOUNDING);
  assert.equal(result.creditApplied, 1_250);
});

test('resolveFirstDealCredit: credit clamps to the fee when the fee is below the cap', () => {
  const signupAt = new Date('2026-01-01T00:00:00Z');
  const now = new Date('2026-01-05T00:00:00Z');
  const standard = resolveFirstDealCredit({ tier: 'standard', signupAt, now, priorCreditedDeals: 0, fee: 100 });
  assert.equal(standard.creditApplied, 100);
  const founding = resolveFirstDealCredit({ tier: 'founding', signupAt, now, priorCreditedDeals: 0, fee: 900 });
  assert.equal(founding.creditApplied, 900);
});

test('resolveFirstDealCredit: eligible strictly before day 90, expired at day 90 and after', () => {
  const signupAt = new Date('2026-01-01T00:00:00Z');
  const oneDayMs = 24 * 60 * 60 * 1000;
  const dayOffset = (days: number) => new Date(signupAt.getTime() + days * oneDayMs);

  const day89 = resolveFirstDealCredit({ tier: 'standard', signupAt, now: dayOffset(89), priorCreditedDeals: 0, fee: 1_000 });
  assert.equal(day89.eligible, true);
  assert.equal(day89.creditApplied, 250);

  const day90 = resolveFirstDealCredit({ tier: 'standard', signupAt, now: dayOffset(90), priorCreditedDeals: 0, fee: 1_000 });
  assert.equal(day90.eligible, false);
  assert.equal(day90.creditApplied, 0);

  const day91 = resolveFirstDealCredit({ tier: 'standard', signupAt, now: dayOffset(91), priorCreditedDeals: 0, fee: 1_000 });
  assert.equal(day91.eligible, false);
  assert.equal(day91.creditApplied, 0);

  // expiresAt is exactly signupAt + CREDIT_WINDOW_DAYS days
  assert.equal(day89.expiresAt.getTime(), signupAt.getTime() + CREDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
});

test('resolveFirstDealCredit: second deal for the same company is ineligible', () => {
  const signupAt = new Date('2026-01-01T00:00:00Z');
  const now = new Date('2026-01-05T00:00:00Z');
  const result = resolveFirstDealCredit({ tier: 'standard', signupAt, now, priorCreditedDeals: 1, fee: 2_800 });
  assert.equal(result.eligible, false);
  assert.equal(result.creditApplied, 0);
});

test('resolveFirstDealCredit: malformed inputs throw instead of silently resolving', () => {
  const signupAt = new Date('2026-01-01T00:00:00Z');
  const now = new Date('2026-01-05T00:00:00Z');
  const ok = { tier: 'standard' as const, signupAt, now, priorCreditedDeals: 0, fee: 1_000 };

  // Unknown tier must never silently pick a cap — not even the smaller one.
  assert.throws(() => resolveFirstDealCredit({ ...ok, tier: 'vip' as never }), /tier must be/);
  assert.throws(() => resolveFirstDealCredit({ ...ok, tier: undefined as never }), /tier must be/);

  assert.throws(() => resolveFirstDealCredit({ ...ok, fee: Number.NaN }), /fee/);
  assert.throws(() => resolveFirstDealCredit({ ...ok, fee: Number.POSITIVE_INFINITY }), /fee/);

  assert.throws(() => resolveFirstDealCredit({ ...ok, signupAt: null as never }), /signupAt/);
  assert.throws(() => resolveFirstDealCredit({ ...ok, signupAt: new Date('garbage') }), /signupAt/);
  assert.throws(() => resolveFirstDealCredit({ ...ok, now: null as never }), /now/);
  assert.throws(() => resolveFirstDealCredit({ ...ok, now: new Date(Number.NaN) }), /now/);

  assert.throws(() => resolveFirstDealCredit({ ...ok, priorCreditedDeals: -1 }), /priorCreditedDeals/);
  assert.throws(() => resolveFirstDealCredit({ ...ok, priorCreditedDeals: 0.5 }), /priorCreditedDeals/);
});
