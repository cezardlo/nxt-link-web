// NXT Link success-fee engine — DETERMINISTIC. AI may recommend a bracket or
// flag missing data, but it can never finalize or change a fee: this module
// calculates, an authorized admin reviews exceptions, and every result
// carries the exact policy version it was computed under.
//
// Fee model: marginal brackets (like tax brackets — no rate cliffs).
// Provisional default schedule (admin-editable + versioned in DB later):
//   first $10,000 → 15%; $10,000.01–$50,000 → 12.5%; above $50,000 → 10%.
// Worked example: $60,000 eligible → 1,500 + 5,000 + 1,000 = $7,500 (12.5%).
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

/** Provisional default — admin-editable and versioned once persisted. */
export const DEFAULT_FEE_POLICY: FeePolicy = {
  version: 'provisional-v1',
  label: 'Provisional launch schedule (requires legal/tax review before launch)',
  brackets: [
    { upTo: 10_000, rate: 0.15 },
    { upTo: 50_000, rate: 0.125 },
    { upTo: null, rate: 0.1 },
  ],
  minimumFee: null,
  maximumFee: null,
  negotiatedRate: null,
};

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
