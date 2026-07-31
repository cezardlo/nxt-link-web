// Pure, dependency-free helpers for the buyer "Post a Need" wizard
// (Slice R2b, workplace/audit/flow-readiness-2026-07-30.md — the technology
// buyer-facing gap; workplace/plans/rfq-seamless-build-2026-07-29.md for the
// underlying field spec). No React/JSX here so this is directly
// unit-testable (tests/post-need-wizard.test.ts) and so the exact request
// body this module builds can be re-validated against the REAL server-side
// validator (src/lib/requests/structured.ts validateStructuredRequest) in
// the same test file, proving the technology payload actually reaches the
// shape R1's API expects.
//
// Every field this module touches rides in columns/jsonb R1 already
// shipped (quantity_int, delivery_location, preferred_timeline, budget_min/
// budget_max, structured_specs) — ZERO API or schema changes for this slice.
//
// BLIND BUDGET: budget_min/budget_max are only ever populated when
// `selection === 'technology'` AND the buyer actually typed a value — for
// every other kind (or when left blank) they come back null. There is no
// "share" flag on this payload at all (R1's budget_min/budget_max have no
// opt-in-to-share mechanism anywhere in the codebase — see
// src/lib/requests/vendor-view.ts stripBlindBudgetFields, which
// unconditionally strips them from every vendor-facing response), so this
// module cannot silently turn sharing "on" — there is nothing to turn on.

import type { RequestKind } from './structured';

// ---------------------------------------------------------------------------
// Step 1 — what do you need? Three real kinds + a quieter "Not sure" lane
// (submits with request_kind = null, which is valid per R1 — see
// src/lib/requests/structured.ts:115, `isRequestKind` simply returns false
// for null and validateStructuredRequest treats an unrecognized kind as
// null, never an error).
// ---------------------------------------------------------------------------
export type PostNeedSelection = RequestKind | 'unsure';
export const POST_NEED_KINDS: readonly RequestKind[] = ['product', 'service', 'technology'];

export function isStep1Valid(selection: PostNeedSelection | null): boolean {
  return selection !== null;
}

// ---------------------------------------------------------------------------
// Step 2 — one free-text description, kind-tailored placeholder (owned by
// the page's own T dict — this module only owns the length gate so the UI
// and any future caller can't drift on what "valid" means).
// ---------------------------------------------------------------------------
export const MIN_DESCRIPTION_LEN = 10;

export function isStep2Valid(description: string): boolean {
  return description.trim().length >= MIN_DESCRIPTION_LEN;
}

// ---------------------------------------------------------------------------
// Step 3 — kind-adaptive key details, ≤4 fields visible at once:
//   all kinds:  location (prefilled, editable) + timeline chips
//   product:    + quantity + unit selector
//   technology: + number of users/locations + current systems (optional)
//               + an optional, collapsed-by-default blind budget range
//   service / unsure: no extra fields beyond the two common ones
// ---------------------------------------------------------------------------
export const QUANTITY_UNITS = ['pieces', 'sets', 'pallets', 'units', 'hours', 'loads'] as const;
export type QuantityUnit = (typeof QUANTITY_UNITS)[number];
export const DEFAULT_QUANTITY_UNIT: QuantityUnit = 'pieces';

export const TIMELINE_OPTIONS = ['asap', 'week', 'month', 'flexible'] as const;
export type TimelineOption = (typeof TIMELINE_OPTIONS)[number];

export interface Step3Fields {
  location: string;
  timeline: TimelineOption | null;
  quantity: number | null;           // product
  usersOrLocations: number | null;   // technology
}

export function isStep3Valid(selection: PostNeedSelection, fields: Step3Fields): boolean {
  if (!fields.location.trim() || !fields.timeline) return false;
  if (selection === 'product') return Number.isFinite(fields.quantity) && (fields.quantity as number) > 0;
  if (selection === 'technology') return Number.isFinite(fields.usersOrLocations) && (fields.usersOrLocations as number) > 0;
  return true;
}

// ---------------------------------------------------------------------------
// Step 4 — build the exact POST /api/platform/requests body. Pure: every
// display-language string (timeline label, unit label) is resolved by the
// PAGE'S OWN T dict and passed in already-localized — this module stays
// language-agnostic, matching the convention every other src/lib/requests
// helper in this codebase already uses (structured.ts, dispatch.ts).
// ---------------------------------------------------------------------------
export interface BuildPayloadInput {
  selection: PostNeedSelection;
  description: string;
  location: string;
  timelineLabel: string | null;
  quantity: number | null;            // product only
  quantityUnitLabel: string | null;   // product only, localized (e.g. "Pieces"/"Piezas")
  usersOrLocations: number | null;    // technology only
  currentSystems: string;             // technology only, optional
  usersUnitLabel: string | null;      // technology only, localized (e.g. "users"/"usuarios")
  budgetMin: number | null;           // technology only, optional
  budgetMax: number | null;           // technology only, optional
  contactName: string;
  locale: 'en' | 'es';
}

export interface PostNeedPayload {
  request_kind: RequestKind | null;
  locale: string;
  contact: { name?: string };
  summary: {
    problem: string;
    location: string;
    delivery_location: string;
    preferred_timeline: string | null;
    quantity_int: number | null;
    structured_specs: Record<string, unknown>;
    budget_min: number | null;
    budget_max: number | null;
  };
}

/**
 * Deliberately NEVER sets `summary.category`. scoreVendors (src/lib/
 * matching.ts) gives every vendor a flat +20 "no category filter" baseline
 * when category is empty, but scores a REAL non-matching string (e.g. a
 * generic "Technology request" label, which isn't in the real category
 * taxonomy) as a hard 0-overlap match against every vendor's actual
 * categories — worse than sending nothing. This wizard has no
 * category-taxonomy picker (out of scope, see task brief), so leaving
 * `category` unset is the matching-correct choice, not an oversight.
 */
export function buildPostNeedPayload(input: BuildPayloadInput): PostNeedPayload {
  const kind: RequestKind | null = input.selection === 'unsure' ? null : input.selection;
  const loc = input.location.trim();

  const structured_specs: Record<string, unknown> = {};
  let quantity_int: number | null = null;

  if (input.selection === 'product') {
    quantity_int = Number.isFinite(input.quantity) && (input.quantity as number) > 0 ? (input.quantity as number) : null;
    if (input.quantityUnitLabel) structured_specs.quantity_unit = input.quantityUnitLabel;
  } else if (input.selection === 'technology') {
    quantity_int = Number.isFinite(input.usersOrLocations) && (input.usersOrLocations as number) > 0 ? (input.usersOrLocations as number) : null;
    if (input.usersUnitLabel) structured_specs.quantity_unit = input.usersUnitLabel;
    const systems = input.currentSystems.trim();
    if (systems) structured_specs.current_systems = systems;
  }

  // BLIND BUDGET INVARIANT: only 'technology' ever carries a budget, and
  // only when the buyer actually typed a number — never inferred, never
  // defaulted, and structurally impossible to attach to any other kind.
  const budget_min = input.selection === 'technology' && Number.isFinite(input.budgetMin) ? (input.budgetMin as number) : null;
  const budget_max = input.selection === 'technology' && Number.isFinite(input.budgetMax) ? (input.budgetMax as number) : null;

  return {
    request_kind: kind,
    locale: input.locale,
    contact: input.contactName.trim() ? { name: input.contactName.trim() } : {},
    summary: {
      problem: input.description.trim(),
      location: loc,
      delivery_location: loc,
      preferred_timeline: input.timelineLabel || null,
      quantity_int,
      structured_specs,
      budget_min,
      budget_max,
    },
  };
}
