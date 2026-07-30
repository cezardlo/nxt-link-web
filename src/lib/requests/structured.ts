// Structured RFQ fields — Slice R1 (workplace/plans/rfq-seamless-build-2026-07-29.md).
// Pure, dependency-free validation shared by both request-creation routes
// (POST /api/marketplace/request, POST /api/platform/requests) and both
// vendor quote-submission routes (POST /api/vendor/quote,
// POST /api/vendor/proposals). No database, no Next.js request object — so
// it can be exercised directly by tests/rfq-structured-*.test.ts.
//
// Every field is OPTIONAL. Migration 20260729_rfq_structured_fields_r1.sql
// makes every new column nullable/defaulted, so an old-shape caller (nothing
// new in the body) must validate cleanly to null/empty defaults, never throw,
// never fail a request that used to succeed.
//
// BLIND BUDGET INVARIANT: budget_min/budget_max are the buyer's private
// number. This module only VALIDATES them — it never decides who gets to see
// them. That decision lives in src/lib/requests/vendor-view.ts, which every
// vendor-facing route must pass rows through before responding.

export type RequestKind = 'product' | 'service' | 'technology';
export const REQUEST_KINDS: readonly RequestKind[] = ['product', 'service', 'technology'];

export function isRequestKind(v: unknown): v is RequestKind {
  return typeof v === 'string' && (REQUEST_KINDS as readonly string[]).includes(v);
}

export interface StructuredRequestFields {
  request_kind: RequestKind | null;
  quantity: number | null;
  delivery_location: string | null;
  preferred_timeline: string | null;
  /** BLIND — see module header. Never forward to a vendor-facing response. */
  budget_min: number | null;
  /** BLIND — see module header. Never forward to a vendor-facing response. */
  budget_max: number | null;
  structured_specs: Record<string, unknown>;
}

export interface FieldValidation<T> {
  ok: boolean;
  value: T;
  errors: string[];
}

const MAX_LOCATION = 300;
const MAX_TIMELINE = 200;
const MAX_SPECS_KEYS = 40;
const MAX_SPECS_JSON_LEN = 6000;
const MAX_QUANTITY = 999999;

function cleanStr(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  return s || null;
}

interface NumResult { value: number | null; error?: string }

function cleanPositiveInt(v: unknown, label = 'quantity'): NumResult {
  if (v === undefined || v === null || v === '') return { value: null };
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    return { value: null, error: `${label} must be a positive whole number` };
  }
  return { value: Math.min(n, MAX_QUANTITY) };
}

function cleanNonNegativeNumber(v: unknown, label: string): NumResult {
  if (v === undefined || v === null || v === '') return { value: null };
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return { value: null, error: `${label} must be a non-negative number` };
  return { value: n };
}

/** Keep structured_specs a small JSON blob — same abuse-prevention discipline
 * as marketplace/types.ts cleanBlock (cap key count + value size) but
 * intentionally permissive on KEY NAMES: category-specific question sets
 * (the forklift 6-question wedge etc., Part 7 of the RFQ blueprint) are a
 * later layer that must drop in here without schema/validator churn. */
export function cleanStructuredSpecs(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const src = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  let count = 0;
  for (const [rawKey, val] of Object.entries(src)) {
    if (count >= MAX_SPECS_KEYS) break;
    const key = String(rawKey).trim().slice(0, 80);
    if (!key) continue;
    if (typeof val === 'string') out[key] = val.trim().slice(0, 500);
    else if (typeof val === 'number' && Number.isFinite(val)) out[key] = val;
    else if (typeof val === 'boolean') out[key] = val;
    else if (Array.isArray(val)) {
      out[key] = val
        .slice(0, 20)
        .map((x) => (typeof x === 'string' ? x.slice(0, 200) : x))
        .filter((x) => typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean');
    } else continue;
    count++;
  }
  // Defense in depth: drop trailing keys if the blob is still too large overall.
  const keys = Object.keys(out);
  while (JSON.stringify(out).length > MAX_SPECS_JSON_LEN && keys.length) {
    delete out[keys.pop() as string];
  }
  return out;
}

/** Validate + clean the structured request-side fields. Accepts a raw,
 * untrusted body (or a sub-object of one) — every field is read defensively
 * and every failure is reported by name so the caller can 400 with a useful
 * message. Errors are only produced for a field the caller actually SET to a
 * bad value — an omitted field is never an error (everything is optional). */
export function validateStructuredRequest(input: unknown): FieldValidation<StructuredRequestFields> {
  const errors: string[] = [];
  const body = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};

  const request_kind = isRequestKind(body.request_kind) ? body.request_kind : null;

  const qty = cleanPositiveInt(body.quantity, 'quantity');
  if (qty.error) errors.push(qty.error);

  const delivery_location = cleanStr(body.delivery_location, MAX_LOCATION);
  const preferred_timeline = cleanStr(body.preferred_timeline, MAX_TIMELINE);

  const bMin = cleanNonNegativeNumber(body.budget_min, 'budget_min');
  const bMax = cleanNonNegativeNumber(body.budget_max, 'budget_max');
  if (bMin.error) errors.push(bMin.error);
  if (bMax.error) errors.push(bMax.error);
  if (bMin.value != null && bMax.value != null && bMin.value > bMax.value) {
    errors.push('budget_min must not be greater than budget_max');
  }

  const structured_specs = cleanStructuredSpecs(body.structured_specs);

  return {
    ok: errors.length === 0,
    errors,
    value: {
      request_kind,
      quantity: qty.value,
      delivery_location,
      preferred_timeline,
      budget_min: bMin.value,
      budget_max: bMax.value,
      structured_specs,
    },
  };
}

// ---------------------------------------------------------------------------
// Vendor quote — per-kind "extras" (the comparable commons — total price,
// lead time, quote expiration, payment terms, warranty, short message — are
// already real columns on quote_proposals/quote_requests; only the per-kind
// extras below are new).
// ---------------------------------------------------------------------------

export interface ProductQuoteExtras {
  unit_price: number | null;
  installation: 'included' | 'extra' | 'not_available' | null;
  training: 'included' | 'extra' | null;
  shipping_cost: number | null;
}
export interface ServiceQuoteExtras {
  scope_summary: string | null;
  duration: string | null;
  team_size: number | null;
  emergency_response: string | null;
}
export interface TechnologyQuoteExtras {
  license_model: 'subscription' | 'perpetual' | 'tiered' | null;
  pricing_details: string | null;
  implementation_cost: number | null;
  annual_support: number | null;
  sla_summary: string | null;
}
export type QuoteExtras = Partial<ProductQuoteExtras & ServiceQuoteExtras & TechnologyQuoteExtras>;

/** Vendor quote TEMPLATE — live auto-calculated total (Slice R3,
 * workplace/plans/rfq-seamless-build-2026-07-29.md: "total price auto-calc
 * from unit + add-ons + shipping when applicable, editable"). Only 'product'
 * has a per-unit breakdown to calculate FROM (unit_price × quantity +
 * shipping_cost — installation/training are included/extra/not_available
 * enums with no separate cost field in this slice, so they never enter the
 * sum). Services/technology have no unit price to derive a total from — the
 * vendor types the total directly there, so this returns null for any other
 * kind or when unit_price itself is unset. Pure + dependency-free so the
 * SAME function drives both the live client-side preview and its test
 * (tests/rfq-quote-template.test.ts) — no separate "mirror" to drift. */
export function autoCalcProductTotal(
  extras: { unit_price: number | null | undefined; shipping_cost?: number | null | undefined },
  quantity: number | null | undefined,
): number | null {
  const unitPrice = extras.unit_price;
  if (unitPrice == null || !Number.isFinite(unitPrice) || unitPrice < 0) return null;
  const qty = quantity != null && Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  const shipping = extras.shipping_cost != null && Number.isFinite(extras.shipping_cost) && extras.shipping_cost > 0
    ? extras.shipping_cost : 0;
  // Round to cents — floating point (e.g. 19.99 * 3) otherwise leaks a third
  // decimal into the input the vendor sees.
  return Math.round((unitPrice * qty + shipping) * 100) / 100;
}

const INSTALLATION_VALUES = ['included', 'extra', 'not_available'];
const TRAINING_VALUES = ['included', 'extra'];
const LICENSE_MODEL_VALUES = ['subscription', 'perpetual', 'tiered'];

/** Validate the vendor's per-kind quote extras against the SERVER-KNOWN kind
 * of the opportunity being quoted (the caller must pass the opportunity's own
 * `request_kind` — never trust a vendor-supplied kind for this). An unknown
 * or null kind (older opportunities created before this slice) always
 * validates to an empty object — no schema to enforce yet, never an error. */
export function validateQuoteExtras(kind: RequestKind | null | undefined, input: unknown): FieldValidation<QuoteExtras> {
  const errors: string[] = [];
  const body = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};

  if (kind === 'product') {
    const unitPrice = cleanNonNegativeNumber(body.unit_price, 'unit_price');
    const shipping = cleanNonNegativeNumber(body.shipping_cost, 'shipping_cost');
    if (unitPrice.error) errors.push(unitPrice.error);
    if (shipping.error) errors.push(shipping.error);
    const installation = INSTALLATION_VALUES.includes(String(body.installation))
      ? (body.installation as ProductQuoteExtras['installation']) : null;
    const training = TRAINING_VALUES.includes(String(body.training))
      ? (body.training as ProductQuoteExtras['training']) : null;
    return { ok: errors.length === 0, errors, value: { unit_price: unitPrice.value, installation, training, shipping_cost: shipping.value } };
  }

  if (kind === 'service') {
    const teamSize = cleanPositiveInt(body.team_size, 'team_size');
    if (teamSize.error) errors.push(teamSize.error);
    return {
      ok: errors.length === 0,
      errors,
      value: {
        scope_summary: cleanStr(body.scope_summary, 1000),
        duration: cleanStr(body.duration, 200),
        team_size: teamSize.value,
        emergency_response: cleanStr(body.emergency_response, 200),
      },
    };
  }

  if (kind === 'technology') {
    const implCost = cleanNonNegativeNumber(body.implementation_cost, 'implementation_cost');
    const annualSupport = cleanNonNegativeNumber(body.annual_support, 'annual_support');
    if (implCost.error) errors.push(implCost.error);
    if (annualSupport.error) errors.push(annualSupport.error);
    const licenseModel = LICENSE_MODEL_VALUES.includes(String(body.license_model))
      ? (body.license_model as TechnologyQuoteExtras['license_model']) : null;
    return {
      ok: errors.length === 0,
      errors,
      value: {
        license_model: licenseModel,
        pricing_details: cleanStr(body.pricing_details, 1000),
        implementation_cost: implCost.value,
        annual_support: annualSupport.value,
        sla_summary: cleanStr(body.sla_summary, 500),
      },
    };
  }

  // No known kind (older opportunity, or the request-creation route never
  // set one) — no per-kind schema to validate against yet. Never an error.
  return { ok: true, errors: [], value: {} };
}
