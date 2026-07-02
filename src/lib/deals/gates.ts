// Deterministic stage-gate evaluation for protected reveals and quote
// acceptance. Pure functions — the server routes load agreements, consents,
// and fee acknowledgments for a deal and ask these gates whether an action
// is allowed. AI never evaluates gates; humans grant consents; this code
// only checks the records (docs/AGENT_INSTRUCTIONS.md, gates 1-8).

export type AgreementKind = 'nda' | 'mnda' | 'nca';
export type AgreementStatus = 'draft' | 'sent' | 'signed' | 'declined' | 'expired';
export type ConsentAction =
  | 'reveal_identity'
  | 'share_document'
  | 'share_field'
  | 'send_rfq'
  | 'introduce'
  | 'fee_acknowledged';

export interface AgreementRecord {
  kind: AgreementKind;
  status: AgreementStatus;
  /** null = deal-wide (covers every invited vendor); set = that vendor only. */
  vendor_account_id: string | null;
}

export interface ConsentRecord {
  action: ConsentAction;
  /** null = not granted to a specific vendor; per-vendor grants set this. */
  grantee_vendor_account_id: string | null;
  revoked_at: string | null;
}

export interface FeeAckRecord {
  party: 'vendor' | 'customer';
  stage: 'pre_introduction' | 'pre_acceptance';
}

export interface GateConfig {
  /** Require a signed NDA or MNDA before identity reveal. */
  requireNda: boolean;
  /** Require a signed NCA (non-circumvention) before contact reveal. */
  requireNca: boolean;
}

export const DEFAULT_GATE_CONFIG: GateConfig = { requireNda: true, requireNca: true };

export interface GateResult {
  allowed: boolean;
  /** Human-readable list of everything still missing (empty when allowed). */
  missing: string[];
}

function hasSignedAgreement(
  agreements: AgreementRecord[],
  kinds: AgreementKind[],
  vendorAccountId: string,
): boolean {
  return agreements.some(
    (a) =>
      kinds.includes(a.kind) &&
      a.status === 'signed' &&
      (a.vendor_account_id === null || a.vendor_account_id === vendorAccountId),
  );
}

function hasActiveConsent(
  consents: ConsentRecord[],
  action: ConsentAction,
  vendorAccountId: string,
): boolean {
  // Consent must be explicit per vendor — a grant for vendor A never unlocks
  // vendor B, and a blanket row (no grantee) is not accepted for reveals.
  return consents.some(
    (c) =>
      c.action === action &&
      c.revoked_at === null &&
      c.grantee_vendor_account_id === vendorAccountId,
  );
}

function hasFeeAck(feeAcks: FeeAckRecord[], party: 'vendor' | 'customer', stage: FeeAckRecord['stage']): boolean {
  return feeAcks.some((a) => a.party === party && a.stage === stage);
}

/**
 * May the customer's protected identity/contact be revealed to this vendor?
 * Requires: unrevoked per-vendor customer consent, the configured signed
 * agreements (NDA/MNDA and/or NCA), and BOTH parties' pre-introduction fee
 * acknowledgment. The fee is never hidden.
 */
export function evaluateRevealGate(input: {
  config?: GateConfig;
  agreements: AgreementRecord[];
  consents: ConsentRecord[];
  feeAcks: FeeAckRecord[];
  vendorAccountId: string;
}): GateResult {
  const config = input.config ?? DEFAULT_GATE_CONFIG;
  const missing: string[] = [];

  if (!hasActiveConsent(input.consents, 'reveal_identity', input.vendorAccountId)) {
    missing.push('customer consent to reveal identity to this vendor');
  }
  if (config.requireNda && !hasSignedAgreement(input.agreements, ['nda', 'mnda'], input.vendorAccountId)) {
    missing.push('signed NDA or MNDA covering this vendor');
  }
  if (config.requireNca && !hasSignedAgreement(input.agreements, ['nca'], input.vendorAccountId)) {
    missing.push('signed NCA (non-circumvention) covering this vendor');
  }
  if (!hasFeeAck(input.feeAcks, 'customer', 'pre_introduction')) {
    missing.push('customer fee acknowledgment (pre-introduction)');
  }
  if (!hasFeeAck(input.feeAcks, 'vendor', 'pre_introduction')) {
    missing.push('vendor fee acknowledgment (pre-introduction)');
  }

  return { allowed: missing.length === 0, missing };
}

/**
 * May a quote acceptance proceed? Requires both parties' pre-acceptance fee
 * acknowledgment (the second disclosure — before money changes hands).
 */
export function evaluateAcceptanceGate(input: { feeAcks: FeeAckRecord[] }): GateResult {
  const missing: string[] = [];
  if (!hasFeeAck(input.feeAcks, 'customer', 'pre_acceptance')) {
    missing.push('customer fee acknowledgment (pre-acceptance)');
  }
  if (!hasFeeAck(input.feeAcks, 'vendor', 'pre_acceptance')) {
    missing.push('vendor fee acknowledgment (pre-acceptance)');
  }
  return { allowed: missing.length === 0, missing };
}

/**
 * May an RFQ packet be sent to this vendor? Requires an unrevoked send_rfq
 * consent for that vendor (the customer approved the exact packet + list).
 * Identity is NOT required at this stage — packets are anonymized.
 */
export function evaluateRfqSendGate(input: {
  consents: ConsentRecord[];
  vendorAccountId: string;
}): GateResult {
  const missing: string[] = [];
  if (!hasActiveConsent(input.consents, 'send_rfq', input.vendorAccountId)) {
    missing.push('customer approval to send the RFQ to this vendor');
  }
  return { allowed: missing.length === 0, missing };
}
