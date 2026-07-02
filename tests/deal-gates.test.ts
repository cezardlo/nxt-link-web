import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateAcceptanceGate,
  evaluateRevealGate,
  evaluateRfqSendGate,
  type AgreementRecord,
  type ConsentRecord,
  type FeeAckRecord,
} from '@/lib/deals/gates';

const V1 = 'vendor-account-1';
const V2 = 'vendor-account-2';

function fullSet(vendor: string): {
  agreements: AgreementRecord[];
  consents: ConsentRecord[];
  feeAcks: FeeAckRecord[];
} {
  return {
    agreements: [
      { kind: 'nda', status: 'signed', vendor_account_id: vendor },
      { kind: 'nca', status: 'signed', vendor_account_id: vendor },
    ],
    consents: [
      { action: 'reveal_identity', grantee_vendor_account_id: vendor, revoked_at: null },
    ],
    feeAcks: [
      { party: 'customer', stage: 'pre_introduction' },
      { party: 'vendor', stage: 'pre_introduction' },
    ],
  };
}

test('reveal gate opens only when consent, agreements, and fee acks are all present', () => {
  const result = evaluateRevealGate({ ...fullSet(V1), vendorAccountId: V1 });
  assert.equal(result.allowed, true);
  assert.deepEqual(result.missing, []);
});

test('reveal gate blocks without customer consent', () => {
  const input = fullSet(V1);
  input.consents = [];
  const result = evaluateRevealGate({ ...input, vendorAccountId: V1 });
  assert.equal(result.allowed, false);
  assert.ok(result.missing.some((m) => m.includes('consent')));
});

test('revoked consent blocks the reveal gate', () => {
  const input = fullSet(V1);
  input.consents[0].revoked_at = '2026-07-01T00:00:00Z';
  const result = evaluateRevealGate({ ...input, vendorAccountId: V1 });
  assert.equal(result.allowed, false);
});

test('consent for vendor A never unlocks vendor B', () => {
  const input = fullSet(V1);
  input.agreements.push(
    { kind: 'nda', status: 'signed', vendor_account_id: V2 },
    { kind: 'nca', status: 'signed', vendor_account_id: V2 },
  );
  const result = evaluateRevealGate({ ...input, vendorAccountId: V2 });
  assert.equal(result.allowed, false);
  assert.ok(result.missing.some((m) => m.includes('consent')));
});

test('blanket consent (no grantee) is not accepted for identity reveal', () => {
  const input = fullSet(V1);
  input.consents = [{ action: 'reveal_identity', grantee_vendor_account_id: null, revoked_at: null }];
  const result = evaluateRevealGate({ ...input, vendorAccountId: V1 });
  assert.equal(result.allowed, false);
});

test('unsigned or declined NDA blocks; MNDA satisfies the NDA requirement', () => {
  const input = fullSet(V1);
  input.agreements = [
    { kind: 'nda', status: 'declined', vendor_account_id: V1 },
    { kind: 'nca', status: 'signed', vendor_account_id: V1 },
  ];
  let result = evaluateRevealGate({ ...input, vendorAccountId: V1 });
  assert.equal(result.allowed, false);
  assert.ok(result.missing.some((m) => m.includes('NDA')));

  input.agreements.push({ kind: 'mnda', status: 'signed', vendor_account_id: V1 });
  result = evaluateRevealGate({ ...input, vendorAccountId: V1 });
  assert.equal(result.allowed, true);
});

test('missing NCA blocks when required, passes when config disables it', () => {
  const input = fullSet(V1);
  input.agreements = [{ kind: 'nda', status: 'signed', vendor_account_id: V1 }];
  let result = evaluateRevealGate({ ...input, vendorAccountId: V1 });
  assert.equal(result.allowed, false);
  assert.ok(result.missing.some((m) => m.includes('NCA')));

  result = evaluateRevealGate({
    ...input,
    vendorAccountId: V1,
    config: { requireNda: true, requireNca: false },
  });
  assert.equal(result.allowed, true);
});

test('a deal-wide signed agreement (null vendor) covers every vendor', () => {
  const input = fullSet(V1);
  input.agreements = [
    { kind: 'mnda', status: 'signed', vendor_account_id: null },
    { kind: 'nca', status: 'signed', vendor_account_id: null },
  ];
  const result = evaluateRevealGate({ ...input, vendorAccountId: V1 });
  assert.equal(result.allowed, true);
});

test('missing fee acknowledgments block the reveal gate', () => {
  const input = fullSet(V1);
  input.feeAcks = [{ party: 'customer', stage: 'pre_introduction' }];
  const result = evaluateRevealGate({ ...input, vendorAccountId: V1 });
  assert.equal(result.allowed, false);
  assert.ok(result.missing.some((m) => m.includes('vendor fee acknowledgment')));
});

test('acceptance gate requires both pre-acceptance fee acks', () => {
  assert.equal(evaluateAcceptanceGate({ feeAcks: [] }).allowed, false);
  assert.equal(
    evaluateAcceptanceGate({
      feeAcks: [
        { party: 'customer', stage: 'pre_acceptance' },
        { party: 'vendor', stage: 'pre_acceptance' },
      ],
    }).allowed,
    true,
  );
  // pre-introduction acks do NOT satisfy the acceptance stage
  assert.equal(
    evaluateAcceptanceGate({
      feeAcks: [
        { party: 'customer', stage: 'pre_introduction' },
        { party: 'vendor', stage: 'pre_introduction' },
      ],
    }).allowed,
    false,
  );
});

test('RFQ send gate requires per-vendor send approval, revocable', () => {
  const consents: ConsentRecord[] = [
    { action: 'send_rfq', grantee_vendor_account_id: V1, revoked_at: null },
  ];
  assert.equal(evaluateRfqSendGate({ consents, vendorAccountId: V1 }).allowed, true);
  assert.equal(evaluateRfqSendGate({ consents, vendorAccountId: V2 }).allowed, false);
  consents[0].revoked_at = '2026-07-01T00:00:00Z';
  assert.equal(evaluateRfqSendGate({ consents, vendorAccountId: V1 }).allowed, false);
});
