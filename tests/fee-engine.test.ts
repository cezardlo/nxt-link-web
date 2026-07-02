import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_FEE_POLICY,
  applyAdjustments,
  calculateFee,
  computeEligibleSubtotal,
  explainFee,
  type FeePolicy,
} from '@/lib/fees/engine';

test('worked example from the spec: $60,000 → $7,500 at 12.5% effective', () => {
  const result = calculateFee(60_000);
  assert.equal(result.fee, 7_500);
  assert.deepEqual(
    result.lines.map((l) => l.fee),
    [1_500, 5_000, 1_000],
  );
  assert.equal(result.effectiveRate, 0.125);
  assert.equal(result.policyVersion, DEFAULT_FEE_POLICY.version);
});

test('marginal brackets have no rate cliffs at boundaries', () => {
  const atBoundary = calculateFee(10_000);
  assert.equal(atBoundary.fee, 1_500);
  const justOver = calculateFee(10_000.01);
  // one cent over adds ~0.125% of a cent, never a jump
  assert.ok(justOver.fee - atBoundary.fee < 0.01);
  const under = calculateFee(5_000);
  assert.equal(under.fee, 750);
  assert.equal(under.lines.length, 1);
});

test('top bracket applies only above $50,000', () => {
  const fifty = calculateFee(50_000);
  assert.equal(fifty.fee, 1_500 + 5_000);
  assert.equal(fifty.lines.length, 2);
});

test('zero subtotal produces zero fee and zero rate', () => {
  const result = calculateFee(0);
  assert.equal(result.fee, 0);
  assert.equal(result.effectiveRate, 0);
  assert.equal(result.lines.length, 0);
});

test('minimum fee and cap clamp the result and are flagged', () => {
  const withMin: FeePolicy = { ...DEFAULT_FEE_POLICY, minimumFee: 1_000 };
  const min = calculateFee(1_000, withMin); // raw 150
  assert.equal(min.fee, 1_000);
  assert.equal(min.appliedMinimum, true);

  const withCap: FeePolicy = { ...DEFAULT_FEE_POLICY, maximumFee: 5_000 };
  const capped = calculateFee(60_000, withCap); // raw 7,500
  assert.equal(capped.fee, 5_000);
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
  assert.equal(adjusted.adjustedFee, 7_000);
  assert.equal(adjusted.fee, 7_500); // original preserved
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
  assert.ok(en.includes('$7,500'));
  assert.ok(en.includes('12.5%'));
  assert.ok(en.includes(DEFAULT_FEE_POLICY.version));
  assert.ok(es.includes('$7,500'));
  assert.ok(es.includes('Comisión'));
});
