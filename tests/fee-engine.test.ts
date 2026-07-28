import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_FEE_POLICY,
  FIRST_DEAL_DISCOUNT_RATE,
  FIRST_DEAL_WINDOW_DAYS,
  applyAdjustments,
  calculateFee,
  computeEligibleSubtotal,
  explainFee,
  firstDealDiscountAmount,
  resolveFirstDealDiscount,
  type FeePolicy,
} from '@/lib/fees/engine';

// ── Bracket math: 4% first $50k, 2% above, $20,000 cap (launch-v3) ──────────

test('worked example from the launch-v3 schedule: $60,000 → $2,200 at 3.67% effective', () => {
  const result = calculateFee(60_000);
  assert.equal(result.fee, 2_200);
  assert.deepEqual(
    result.lines.map((l) => l.fee),
    [2_000, 200],
  );
  assert.equal(result.effectiveRate, 0.036667); // round2(2200/60000 * 10000) / 10000
  assert.equal(result.policyVersion, DEFAULT_FEE_POLICY.version);
  assert.equal(DEFAULT_FEE_POLICY.version, 'launch-v3');
});

test('marginal brackets have no rate cliffs at boundaries', () => {
  const atBoundary = calculateFee(10_000);
  assert.equal(atBoundary.fee, 400); // 4% of 10,000
  const justOver = calculateFee(10_000.01);
  // one cent over adds ~0.04% of a cent, never a jump
  assert.ok(justOver.fee - atBoundary.fee < 0.01);
  const under = calculateFee(5_000);
  assert.equal(under.fee, 200); // 4% of 5,000
  assert.equal(under.lines.length, 1);
});

test('bracket boundary: the top (2%) bracket applies only above $50,000', () => {
  const fifty = calculateFee(50_000);
  assert.equal(fifty.fee, 2_000); // 4% of 50,000, single bracket
  assert.equal(fifty.lines.length, 1);

  // One dollar into the top bracket adds exactly 2 cents (2% of $1), no cliff.
  const justOver = calculateFee(50_001);
  assert.equal(justOver.fee, 2_000.02);
  assert.equal(justOver.lines.length, 2);
});

test('zero subtotal produces zero fee and zero rate', () => {
  const result = calculateFee(0);
  assert.equal(result.fee, 0);
  assert.equal(result.effectiveRate, 0);
  assert.equal(result.lines.length, 0);
});

test('cap boundary: $20,000 cap engages only above $950,000 of eligible subtotal', () => {
  // 2,000 (4% of 50k) + 18,000 (2% of 900k) = 20,000 exactly — equal to the cap,
  // so the cap does NOT flag (fee must exceed the cap to be clamped).
  const atCap = calculateFee(950_000);
  assert.equal(atCap.fee, 20_000);
  assert.equal(atCap.appliedMaximum, false);

  // 2,000 + 19,000 (2% of 950k) = 21,000 > 20,000 → clamped and flagged.
  const overCap = calculateFee(1_000_000);
  assert.equal(overCap.fee, 20_000);
  assert.equal(overCap.appliedMaximum, true);

  // A very large deal stays clamped at the $20,000 cap.
  const capped = calculateFee(5_000_000);
  assert.equal(capped.fee, 20_000);
  assert.equal(capped.appliedMaximum, true);
});

test('launch-v3 policy constants are pinned: 4% / 2% / $20,000 cap / no minimum', () => {
  // Money guard. The cap moved $12,500 → $20,000 by Cesar's ruling 2026-07-27;
  // this test exists so it can never drift again without a deliberate failure.
  // Must stay in lockstep with supabase/migrations/20260727_fee_policy_launch_v3.sql.
  assert.equal(DEFAULT_FEE_POLICY.version, 'launch-v3');
  assert.equal(DEFAULT_FEE_POLICY.maximumFee, 20_000);
  assert.equal(DEFAULT_FEE_POLICY.minimumFee, null);
  assert.equal(DEFAULT_FEE_POLICY.negotiatedRate, null);
  assert.deepEqual(DEFAULT_FEE_POLICY.brackets, [
    { upTo: 50_000, rate: 0.04 },
    { upTo: null, rate: 0.02 },
  ]);
});

test('cap clamps from exactly one dollar past the $950,000 threshold', () => {
  // $950,000 is the last subtotal whose bracket math equals the cap exactly.
  const atThreshold = calculateFee(950_000);
  assert.equal(atThreshold.rawFee, 20_000);
  assert.equal(atThreshold.appliedMaximum, false);

  // One dollar more adds 2 cents of raw fee, which now EXCEEDS the cap.
  const oneOver = calculateFee(950_001);
  assert.equal(oneOver.rawFee, 20_000.02);
  assert.equal(oneOver.fee, 20_000);
  assert.equal(oneOver.appliedMaximum, true);
});

test('minimum fee floor clamps a tiny fee and is flagged', () => {
  const withMin: FeePolicy = { ...DEFAULT_FEE_POLICY, minimumFee: 1_000 };
  const min = calculateFee(1_000, withMin); // raw 40 (4% of 1,000)
  assert.equal(min.fee, 1_000);
  assert.equal(min.appliedMinimum, true);
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

// ── Eligible subtotal (unchanged by the rate change) ───────────────────────

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

// ── Adjustments ────────────────────────────────────────────────────────────

test('adjustments demand a reason and an approver', () => {
  const base = calculateFee(60_000);
  assert.throws(() => applyAdjustments(base, [{ amount: -500, reason: '', approvedBy: 'admin' }]));
  assert.throws(() => applyAdjustments(base, [{ amount: -500, reason: 'clawback', approvedBy: '' }]));
  const adjusted = applyAdjustments(base, [
    { amount: -500, reason: 'partial shipment clawback', approvedBy: 'admin@nxtlink' },
  ]);
  assert.equal(adjusted.adjustedFee, 1_700);
  assert.equal(adjusted.fee, 2_200); // original preserved
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
  assert.ok(en.includes('$2,200'));
  assert.ok(en.includes('3.7%'));
  assert.ok(en.includes(DEFAULT_FEE_POLICY.version));
  assert.ok(es.includes('$2,200'));
  assert.ok(es.includes('Comisión'));
});

test('vendor leads live estimate mirrors calculateFee (single source of truth)', () => {
  // /vendor/leads estimateCommission() returns calculateFee(amount).fee verbatim
  // — the exact numbers a vendor sees for common quote sizes under launch-v3.
  assert.equal(calculateFee(25_000).fee, 1_000); // 4% of 25k
  assert.equal(calculateFee(100_000).fee, 3_000); // 2,000 + 1,000
  assert.equal(calculateFee(1_000_000).fee, 20_000); // $20,000 cap
});

// ── First-deal discount: 50% off the already-capped fee ─────────────────────

test('firstDealDiscountAmount is exactly 50% of the (capped) fee', () => {
  assert.equal(FIRST_DEAL_DISCOUNT_RATE, 0.5);
  assert.equal(firstDealDiscountAmount(2_200), 1_100);
  assert.equal(firstDealDiscountAmount(20_000), 10_000); // capped fee → half
  assert.equal(firstDealDiscountAmount(40), 20); // tiny deal
  assert.throws(() => firstDealDiscountAmount(Number.NaN));
  assert.throws(() => firstDealDiscountAmount(-1));
});

test('resolveFirstDealDiscount: first eligible deal nets 50% off', () => {
  const signupAt = new Date('2026-01-01T00:00:00Z');
  const now = new Date('2026-01-05T00:00:00Z');
  const fee = calculateFee(60_000).fee; // 2,200
  const result = resolveFirstDealDiscount({ signupAt, now, priorDiscountedDeals: 0, fee });
  assert.equal(result.eligible, true);
  assert.equal(result.rate, 0.5);
  assert.equal(result.discountApplied, 1_100);
  assert.equal(result.netFee, 1_100);
});

test('resolveFirstDealDiscount: order of operations is brackets → cap → 50% off', () => {
  // $1,000,000 → bracket math 21,000 → capped 20,000 → 50% off → 10,000 net.
  const fee = calculateFee(1_000_000).fee; // 20,000 (already capped)
  const signupAt = new Date('2026-01-01T00:00:00Z');
  const now = new Date('2026-01-05T00:00:00Z');
  const result = resolveFirstDealDiscount({ signupAt, now, priorDiscountedDeals: 0, fee });
  assert.equal(fee, 20_000);
  assert.equal(result.discountApplied, 10_000);
  assert.equal(result.netFee, 10_000);
});

test('resolveFirstDealDiscount: a tiny first deal still gets 50% off', () => {
  const signupAt = new Date('2026-01-01T00:00:00Z');
  const now = new Date('2026-01-05T00:00:00Z');
  const fee = calculateFee(1_000).fee; // 40 (4% of 1,000)
  const result = resolveFirstDealDiscount({ signupAt, now, priorDiscountedDeals: 0, fee });
  assert.equal(result.discountApplied, 20);
  assert.equal(result.netFee, 20);
});

test('resolveFirstDealDiscount: the SECOND deal for the same company pays the full fee', () => {
  const signupAt = new Date('2026-01-01T00:00:00Z');
  const now = new Date('2026-01-05T00:00:00Z');
  const fee = calculateFee(60_000).fee; // 2,200
  const result = resolveFirstDealDiscount({ signupAt, now, priorDiscountedDeals: 1, fee });
  assert.equal(result.eligible, false);
  assert.equal(result.rate, 0);
  assert.equal(result.discountApplied, 0);
  assert.equal(result.netFee, 2_200); // full fee, no discount
});

test('resolveFirstDealDiscount: eligible strictly before day 90, expired at day 90 and after', () => {
  const signupAt = new Date('2026-01-01T00:00:00Z');
  const oneDayMs = 24 * 60 * 60 * 1000;
  const dayOffset = (days: number) => new Date(signupAt.getTime() + days * oneDayMs);
  const fee = calculateFee(25_000).fee; // 1,000

  const day89 = resolveFirstDealDiscount({ signupAt, now: dayOffset(89), priorDiscountedDeals: 0, fee });
  assert.equal(day89.eligible, true);
  assert.equal(day89.discountApplied, 500);

  const day90 = resolveFirstDealDiscount({ signupAt, now: dayOffset(90), priorDiscountedDeals: 0, fee });
  assert.equal(day90.eligible, false);
  assert.equal(day90.discountApplied, 0);
  assert.equal(day90.netFee, 1_000);

  const day91 = resolveFirstDealDiscount({ signupAt, now: dayOffset(91), priorDiscountedDeals: 0, fee });
  assert.equal(day91.eligible, false);
  assert.equal(day91.discountApplied, 0);

  // expiresAt is exactly signupAt + FIRST_DEAL_WINDOW_DAYS days
  assert.equal(day89.expiresAt.getTime(), signupAt.getTime() + FIRST_DEAL_WINDOW_DAYS * oneDayMs);
});

test('resolveFirstDealDiscount: malformed inputs throw instead of silently resolving', () => {
  const signupAt = new Date('2026-01-01T00:00:00Z');
  const now = new Date('2026-01-05T00:00:00Z');
  const ok = { signupAt, now, priorDiscountedDeals: 0, fee: 1_000 };

  assert.throws(() => resolveFirstDealDiscount({ ...ok, fee: Number.NaN }), /fee/);
  assert.throws(() => resolveFirstDealDiscount({ ...ok, fee: Number.POSITIVE_INFINITY }), /fee/);

  assert.throws(() => resolveFirstDealDiscount({ ...ok, signupAt: null as never }), /signupAt/);
  assert.throws(() => resolveFirstDealDiscount({ ...ok, signupAt: new Date('garbage') }), /signupAt/);
  assert.throws(() => resolveFirstDealDiscount({ ...ok, now: null as never }), /now/);
  assert.throws(() => resolveFirstDealDiscount({ ...ok, now: new Date(Number.NaN) }), /now/);

  assert.throws(() => resolveFirstDealDiscount({ ...ok, priorDiscountedDeals: -1 }), /priorDiscountedDeals/);
  assert.throws(() => resolveFirstDealDiscount({ ...ok, priorDiscountedDeals: 0.5 }), /priorDiscountedDeals/);
});
