// NXT Link success-fee engine — DETERMINISTIC. AI may recommend a bracket or
// flag missing data, but it can never finalize or change a fee: this module
// calculates, an authorized admin reviews exceptions, and every result
// carries the exact policy version it was computed under.
//
// Fee model: marginal brackets (like tax brackets — no rate cliffs).
// Launch schedule (owner ruling 2026-07-27; versioned as launch-v3 in DB):
//   first $50,000 → 4%; above $50,000 → 2%; hard cap $20,000/deal; no min.
//   Worked examples: $100k → 2,000 + 1,000 = $3,000 (3.0%);
//   $500k → 2,000 + 9,000 = $11,000 (uncapped);
//   $1M → 2,000 + 19,000 = $21,000 → capped at $20,000.
//   The cap only engages above $950,000 of eligible subtotal:
//   2,000 + 2% × (net − 50,000) > 20,000 ⟺ net > $950,000. At exactly $950k the
//   bracket math lands on $20,000 — equal to the cap, so it is NOT clamped.
// First-deal benefit (the first eligible deal per vendor company gets 50% OFF
// the computed, already-capped commission) lives just below as
// resolveFirstDealDiscount — a pure resolver applied by the deal/money layer,
// never inside calculateFee. It REPLACES the retired first-deal CREDIT system.
//
// Eligible base = pre-tax transaction subtotal EXCLUDING sales/VAT tax,
// refundable deposits, separately stated shipping/freight, pure pass-through
// expenses, refunds, credits, and cancelled quantities — unless an approved
// agreement says otherwise (negotiated policy fields).

export interface FeeBracket {
  /** Upper bound of the bracket (inclusive), null = no upper bound. */
  upTo: number | null;
  /** Marginal rate applied inside this bracket, e.g. 0.15. */
  rate: number;
}

export interface FeePolicy {
  /** Immutable identifier recorded on every calculation. */
  version: string;
  /** Human label, e.g. "Provisional launch schedule". */
  label: string;
  brackets: FeeBracket[];
  /** Optional floor for the total fee. */
  minimumFee?: number | null;
  /** Optional cap for the total fee. */
  maximumFee?: number | null;
  /** Negotiated flat rate that REPLACES bracket math when set (0-1). */
  negotiatedRate?: number | null;
}

/** Launch default — versioned as launch-v3 in DB. Requires legal/tax review. */
export const DEFAULT_FEE_POLICY: FeePolicy = {
  version: 'launch-v3',
  label: 'Launch schedule: 4% on first $50k, 2% above, $20k cap per deal, no minimum (requires legal/tax review before launch)',
  brackets: [
    { upTo: 50_000, rate: 0.04 },
    { upTo: null, rate: 0.02 },
  ],
  minimumFee: null,
  maximumFee: 20_000,
  negotiatedRate: null,
};

/** Protected-introduction window (months) from the NXT//LINK introduction. */
export const PROTECTION_MONTHS = 12;

export interface DisplayedProtectedUntilInput {
  /** quote_requests.buyer_decision — only 'accepted' unlocks the real 12-month date. */
  buyerDecision: string | null | undefined;
  /**
   * commissions.protected_until — a 90-day PRE-acceptance quote-protection
   * date, set at quote-send time (a real, separate rule; correct to show
   * as-is for any lead that hasn't been accepted yet).
   */
  commissionProtectedUntil: string | null | undefined;
  /**
   * The linked manual_deals.protected_until, computed at acceptance time as
   * signupless `now + PROTECTION_MONTHS` months (see
   * /api/buyer/quote-decision) — the real 12-month promise. Pass null/undefined
   * if no deal row exists yet.
   */
  dealProtectedUntil: string | null | undefined;
}

/**
 * Pure resolver for what a vendor should see as "protected until" on a lead.
 * `commissions.protected_until` is a 90-DAY figure that only ever covers the
 * pre-acceptance quote window — it is never rewritten once the buyer accepts.
 * The real, marketed protection is 12 MONTHS (PROTECTION_MONTHS above),
 * computed and stored on the linked manual_deals row at acceptance. Once a
 * lead is accepted, prefer that 12-month date so a vendor is never shown a
 * date that makes their protection look expired early. No I/O — the caller
 * looks up both dates; this only decides which one to display.
 */
export function resolveDisplayedProtectedUntil(input: DisplayedProtectedUntilInput): string | null {
  if (input.buyerDecision === 'accepted' && input.dealProtectedUntil) {
    return input.dealProtectedUntil;
  }
  return input.commissionProtectedUntil ?? null;
}

// ── First-deal discount (Cesar's ruling 2026-07-27) ─────────────────────────
// A vendor company's FIRST eligible deal gets 50% OFF the computed commission.
// This REPLACES the retired first-deal CREDIT system (the tiered $250 / $1,250
// credits and the deprecated $1,250 free-deal credit). There is no per-tier
// dollar cap anymore: the same 50% applies to every eligible first deal, so the
// admin side and the vendor side can never disagree on the amount — both derive
// it from firstDealDiscountAmount() below.
//
// Order of operations (money-critical, fixed): brackets → cap → 50% off the
// already-capped fee. i.e. the discount is taken AFTER the $20,000 cap, so a
// capped first deal nets $10,000.

/** First-deal benefit: fraction taken off the (already-capped) commission. */
export const FIRST_DEAL_DISCOUNT_RATE = 0.5;
/** First-deal eligibility window, in days after vendor signup (strictly before day 90). */
export const FIRST_DEAL_WINDOW_DAYS = 90;

/**
 * The first-deal benefit as a dollar amount off a given (already-capped) fee.
 * The ONE place the 50% is turned into money — both the vendor money path and
 * the admin deal form call this, so the discount can never diverge between them.
 */
export function firstDealDiscountAmount(fee: number): number {
  assertFinite(fee, 'fee');
  return round2(fee * FIRST_DEAL_DISCOUNT_RATE);
}

export interface FirstDealDiscountInput {
  /** Vendor signup anchor — `vendor_profiles.created_at`. */
  signupAt: Date;
  /** Evaluation time (injectable for tests; production passes `new Date()`). */
  now: Date;
  /** Count of this company's deals that already used the first-deal discount (credit_applied > 0, not cancelled). */
  priorDiscountedDeals: number;
  /** The calculated fee (from calculateFee, already capped) the discount applies against. */
  fee: number;
}

export interface FirstDealDiscountResult {
  eligible: boolean;
  /** The discount fraction applied (FIRST_DEAL_DISCOUNT_RATE) when eligible, otherwise 0. */
  rate: number;
  /** round2(fee * FIRST_DEAL_DISCOUNT_RATE) when eligible, otherwise 0. */
  discountApplied: number;
  /** fee - discountApplied, never below 0. */
  netFee: number;
  reason: string;
  /** signupAt + FIRST_DEAL_WINDOW_DAYS days — the moment eligibility ends. */
  expiresAt: Date;
}

/**
 * Pure, server-authoritative resolver for the one-per-company first-deal
 * discount. No DB access, no client input trusted beyond what the caller
 * already looked up (signup date + prior-discounted count + the capped fee).
 * Same eligibility spirit as the retired credit resolver — one per company,
 * within FIRST_DEAL_WINDOW_DAYS of signup — but the benefit is 50% off, not a
 * fixed-dollar credit.
 */
export function resolveFirstDealDiscount(input: FirstDealDiscountInput): FirstDealDiscountResult {
  const { signupAt, now, priorDiscountedDeals, fee } = input;
  assertFinite(fee, 'fee');
  if (!(signupAt instanceof Date) || Number.isNaN(signupAt.getTime())) {
    throw new Error('signupAt must be a valid Date');
  }
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error('now must be a valid Date');
  }
  if (!Number.isInteger(priorDiscountedDeals) || priorDiscountedDeals < 0) {
    throw new Error('priorDiscountedDeals must be a non-negative integer');
  }

  const expiresAt = new Date(signupAt.getTime() + FIRST_DEAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  let eligible: boolean;
  let reason: string;
  if (priorDiscountedDeals > 0) {
    eligible = false;
    reason = 'ineligible: this company already used its one-per-company first-deal discount';
  } else if (now.getTime() >= expiresAt.getTime()) {
    eligible = false;
    reason = `ineligible: more than ${FIRST_DEAL_WINDOW_DAYS} days since signup`;
  } else {
    eligible = true;
    reason = 'eligible: first deal, within the discount window';
  }

  const discountApplied = eligible ? firstDealDiscountAmount(fee) : 0;
  const netFee = round2(Math.max(0, fee - discountApplied));

  return { eligible, rate: eligible ? FIRST_DEAL_DISCOUNT_RATE : 0, discountApplied, netFee, reason, expiresAt };
}

// PHASE 2 EXTENSION POINT (NOT built here — out of scope 2026-07-27):
// the 0% pre-existing-customer exemption. When an admin approves a vendor's
// dated proof that a buyer was already their customer BEFORE the NXT//LINK
// introduction, that deal owes no commission. It would slot in as a separate,
// higher-priority pure resolver — e.g. resolvePreExistingCustomerExemption()
// returning { exempt, proofRef, approvedBy } — applied to calculateFee(net).fee
// BEFORE resolveFirstDealDiscount (an exempt deal is simply 0, so the first-deal
// discount never runs on it). Keep it a pure function fed by admin-reviewed
// inputs (never client-trusted), mirroring resolveFirstDealDiscount's shape.

export type LineKind =
  | 'product'
  | 'service'
  | 'pilot'
  | 'installation'
  | 'subscription'
  | 'shipping'
  | 'tax'
  | 'deposit'
  | 'passthrough';

/** Line kinds excluded from the eligible base by default. */
const EXCLUDED_KINDS: ReadonlySet<LineKind> = new Set(['shipping', 'tax', 'deposit', 'passthrough']);

export interface TransactionLine {
  amount: number;
  kind: LineKind;
  description?: string;
  /** Force-exclude an otherwise eligible line (requires a reason). */
  excluded?: boolean;
  exclusionReason?: string;
}

export interface EligibleSubtotalInput {
  lines: TransactionLine[];
  /** Post-hoc reductions, entered as positive numbers. */
  refunds?: number;
  credits?: number;
  cancelled?: number;
}

export interface Exclusion {
  amount: number;
  reason: string;
}

export interface EligibleSubtotalResult {
  eligible: number;
  gross: number;
  exclusions: Exclusion[];
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function assertFinite(n: number, name: string) {
  if (!Number.isFinite(n)) throw new Error(`${name} must be a finite number`);
  if (n < 0) throw new Error(`${name} must not be negative`);
}

/**
 * Derive the fee-eligible subtotal from transaction lines. Deterministic and
 * fully itemized: every excluded dollar appears in `exclusions` with a reason
 * so the customer/vendor-facing calculator can show its math.
 */
export function computeEligibleSubtotal(input: EligibleSubtotalInput): EligibleSubtotalResult {
  const exclusions: Exclusion[] = [];
  let gross = 0;
  let eligible = 0;

  for (const line of input.lines) {
    assertFinite(line.amount, 'line.amount');
    gross = round2(gross + line.amount);

    if (EXCLUDED_KINDS.has(line.kind)) {
      exclusions.push({ amount: round2(line.amount), reason: `${line.kind} (excluded by policy)` });
      continue;
    }
    if (line.excluded) {
      if (!line.exclusionReason || !line.exclusionReason.trim()) {
        throw new Error('Manually excluded lines require an exclusionReason');
      }
      exclusions.push({ amount: round2(line.amount), reason: line.exclusionReason.trim() });
      continue;
    }
    eligible = round2(eligible + line.amount);
  }

  for (const [key, reason] of [
    ['refunds', 'refunds'],
    ['credits', 'credits'],
    ['cancelled', 'cancelled quantities'],
  ] as const) {
    const value = input[key] ?? 0;
    assertFinite(value, key);
    if (value > 0) {
      exclusions.push({ amount: round2(value), reason });
      eligible = round2(eligible - value);
    }
  }

  if (eligible < 0) eligible = 0;
  return { eligible, gross, exclusions };
}

export interface BracketLine {
  from: number;
  to: number | null;
  amountInBracket: number;
  rate: number;
  fee: number;
}

export interface FeeResult {
  policyVersion: string;
  eligibleSubtotal: number;
  lines: BracketLine[];
  /** Fee from bracket math (or negotiated rate) before floor/cap. */
  rawFee: number;
  /** Final fee after minimum/maximum clamps. */
  fee: number;
  /** fee / eligibleSubtotal (0 when subtotal is 0). */
  effectiveRate: number;
  appliedMinimum: boolean;
  appliedMaximum: boolean;
  usedNegotiatedRate: boolean;
}

function validatePolicy(policy: FeePolicy) {
  if (!policy.brackets.length) throw new Error('Fee policy needs at least one bracket');
  let prev = 0;
  for (let i = 0; i < policy.brackets.length; i++) {
    const b = policy.brackets[i];
    if (b.rate < 0 || b.rate > 1) throw new Error('Bracket rates must be between 0 and 1');
    if (b.upTo === null) {
      if (i !== policy.brackets.length - 1) throw new Error('Only the last bracket may be unbounded');
    } else {
      if (b.upTo <= prev) throw new Error('Bracket bounds must be strictly increasing');
      prev = b.upTo;
    }
  }
  const last = policy.brackets[policy.brackets.length - 1];
  if (last.upTo !== null) throw new Error('The last bracket must be unbounded (upTo: null)');
  if (policy.negotiatedRate != null && (policy.negotiatedRate < 0 || policy.negotiatedRate > 1)) {
    throw new Error('negotiatedRate must be between 0 and 1');
  }
}

/**
 * Marginal-bracket fee calculation. Pure function of (subtotal, policy);
 * records the policy version on the result.
 */
export function calculateFee(eligibleSubtotal: number, policy: FeePolicy = DEFAULT_FEE_POLICY): FeeResult {
  assertFinite(eligibleSubtotal, 'eligibleSubtotal');
  validatePolicy(policy);

  const lines: BracketLine[] = [];
  let rawFee = 0;
  let usedNegotiatedRate = false;

  if (policy.negotiatedRate != null) {
    usedNegotiatedRate = true;
    rawFee = round2(eligibleSubtotal * policy.negotiatedRate);
    lines.push({
      from: 0,
      to: null,
      amountInBracket: round2(eligibleSubtotal),
      rate: policy.negotiatedRate,
      fee: rawFee,
    });
  } else {
    let lower = 0;
    for (const bracket of policy.brackets) {
      if (eligibleSubtotal <= lower) break;
      const upper = bracket.upTo ?? Infinity;
      const amountInBracket = Math.min(eligibleSubtotal, upper) - lower;
      if (amountInBracket <= 0) {
        lower = upper;
        continue;
      }
      const fee = round2(amountInBracket * bracket.rate);
      lines.push({
        from: lower,
        to: bracket.upTo,
        amountInBracket: round2(amountInBracket),
        rate: bracket.rate,
        fee,
      });
      rawFee = round2(rawFee + fee);
      lower = upper;
    }
  }

  let fee = rawFee;
  let appliedMinimum = false;
  let appliedMaximum = false;
  if (policy.minimumFee != null && fee < policy.minimumFee && eligibleSubtotal > 0) {
    fee = round2(policy.minimumFee);
    appliedMinimum = true;
  }
  if (policy.maximumFee != null && fee > policy.maximumFee) {
    fee = round2(policy.maximumFee);
    appliedMaximum = true;
  }

  return {
    policyVersion: policy.version,
    eligibleSubtotal: round2(eligibleSubtotal),
    lines,
    rawFee,
    fee,
    effectiveRate: eligibleSubtotal > 0 ? round2((fee / eligibleSubtotal) * 10000) / 10000 : 0,
    appliedMinimum,
    appliedMaximum,
    usedNegotiatedRate,
  };
}

export interface FeeAdjustment {
  /** Positive or negative delta applied to the calculated fee. */
  amount: number;
  reason: string;
  approvedBy: string;
}

export interface AdjustedFeeResult extends FeeResult {
  adjustments: FeeAdjustment[];
  adjustedFee: number;
}

/**
 * Manual adjustment (negotiated exception, clawback, goodwill credit).
 * Requires a reason AND an approver — the engine refuses silent changes.
 */
export function applyAdjustments(result: FeeResult, adjustments: FeeAdjustment[]): AdjustedFeeResult {
  let adjustedFee = result.fee;
  for (const adj of adjustments) {
    if (!Number.isFinite(adj.amount)) throw new Error('Adjustment amount must be finite');
    if (!adj.reason || !adj.reason.trim()) throw new Error('Adjustments require a reason');
    if (!adj.approvedBy || !adj.approvedBy.trim()) throw new Error('Adjustments require an approver');
    adjustedFee = round2(adjustedFee + adj.amount);
  }
  if (adjustedFee < 0) adjustedFee = 0;
  return { ...result, adjustments, adjustedFee };
}

/** Plain-language bilingual explanation for the live calculator / statement. */
export function explainFee(result: FeeResult): { en: string; es: string } {
  const pct = (r: number) => `${(r * 100).toFixed(r * 100 % 1 === 0 ? 0 : 1)}%`;
  const money = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

  const enLines = result.lines
    .map(
      (l) =>
        `${money(l.amountInBracket)} at ${pct(l.rate)} = ${money(l.fee)}` +
        (l.to === null && !result.usedNegotiatedRate ? ' (above the top bracket)' : ''),
    )
    .join('; ');
  const esLines = result.lines
    .map((l) => `${money(l.amountInBracket)} al ${pct(l.rate)} = ${money(l.fee)}`)
    .join('; ');

  const en =
    `NXT Link success fee on an eligible subtotal of ${money(result.eligibleSubtotal)}: ${enLines}. ` +
    `Total fee ${money(result.fee)} (effective rate ${pct(result.effectiveRate)}), policy ${result.policyVersion}.` +
    (result.appliedMinimum ? ' A policy minimum fee was applied.' : '') +
    (result.appliedMaximum ? ' A policy fee cap was applied.' : '') +
    (result.usedNegotiatedRate ? ' A negotiated rate replaced the standard brackets.' : '');

  const es =
    `Comisión de éxito de NXT Link sobre un subtotal elegible de ${money(result.eligibleSubtotal)}: ${esLines}. ` +
    `Comisión total ${money(result.fee)} (tasa efectiva ${pct(result.effectiveRate)}), política ${result.policyVersion}.` +
    (result.appliedMinimum ? ' Se aplicó la comisión mínima de la política.' : '') +
    (result.appliedMaximum ? ' Se aplicó el tope máximo de la política.' : '') +
    (result.usedNegotiatedRate ? ' Una tasa negociada reemplazó los tramos estándar.' : '');

  return { en, es };
}
