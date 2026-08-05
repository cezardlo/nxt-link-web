// Shared intake-field parsing for the vendor-application system
// (vendor_applications). Extracted from /api/apply/submit and /api/apply/my so
// both routes — and the 2026-08-04 multi-select fields — parse identically.

/** Dedup + trim + cap a string-array field. Returns undefined when the caller
 *  did not send the field at all (so PATCH can tell "absent" from "empty"). */
export function cleanStringArray(values: unknown, max: number, maxLen: number): string[] | undefined {
  if (!Array.isArray(values)) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    if (typeof raw !== 'string') continue;
    const v = raw.trim().slice(0, maxLen);
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

/** Multi-value field with a legacy single-value fallback: the /apply form
 *  submitted ONE `region` / `target_customer` before 2026-08-04, and a cached
 *  page may still POST only the single key. Prefer the multi list; fall back
 *  to the single value so nothing a vendor typed is dropped. */
export function resolveMultiValue(multi: string[] | undefined, legacySingle: string): string[] {
  if (multi && multi.length) return multi;
  const v = legacySingle.trim();
  return v ? [v] : [];
}

export const MAX_REGIONS = 8;
export const REGION_MAXLEN = 60;
export const MAX_TARGET_CUSTOMERS = 12;
export const TARGET_CUSTOMER_MAXLEN = 80;

// ---- "needs more info" (2026-08-04 Batch B) ---------------------------------

/** Admin's send-back note: trim + cap. Returns null when empty — a needs_info
 *  send-back without a message is rejected by the caller. */
export const VENDOR_MESSAGE_MAXLEN = 500;
export function cleanVendorMessage(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().slice(0, VENDOR_MESSAGE_MAXLEN).trim();
  return v || null;
}

/** Resubmit rule: when a vendor saves their application after an admin sent
 *  it back for more info (needs_info), it returns to review — the SAME row
 *  flips back to 'pending' (the one-application-per-company rule is
 *  untouched; no second application is ever created). Any other status is
 *  left alone — vendors can never approve/reject themselves. */
export function resubmitStatusPatch(currentStatus: string): { status?: 'pending' } {
  return currentStatus === 'needs_info' ? { status: 'pending' } : {};
}

// ---- Wedge fields (2026-08-04) ----------------------------------------------
// Cesar: "Labor rate / Mobile fee / Response time / Contract type — those are
// not optional. They are your differentiation. Without them, you're a
// directory again." These four are REQUIRED on the vendor application and are
// what makes two forklift companies COMPARABLE instead of two names.

/** Hourly labor rate: a positive number, never free text ("call us" is
 *  rejected — comparability is the whole point). Returns null when blank or
 *  invalid; the caller treats null as "required field missing" (400). */
export const LABOR_RATE_MAX = 100000;
export function cleanLaborRate(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0 || n > LABOR_RATE_MAX) return null;
  return Math.round(n * 100) / 100;
}

/** Trip/mobilization fee per visit: a NON-NEGATIVE number — 0 is a real,
 *  explicit answer ("we don't charge one") and must never be confused with
 *  blank. Blank/invalid returns null (required field missing → 400); only a
 *  present, parseable number — including '0' — returns a value. */
export const MOBILE_FEE_MAX = 100000;
export function cleanMobileFee(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > MOBILE_FEE_MAX) return null;
  return Math.round(n * 100) / 100;
}

/** Currency for the two money fields. Fixed list (same set the marketplace
 *  quote form offers); anything else falls back to USD. */
export const WEDGE_CURRENCIES = ['USD', 'MXN', 'CAD', 'EUR'] as const;
export function cleanWedgeCurrency(raw: unknown): string {
  const c = String(raw ?? '').trim().toUpperCase();
  return (WEDGE_CURRENCIES as readonly string[]).includes(c) ? c : 'USD';
}

/** Response time: FIXED choices so it sorts — never free text. */
export const RESPONSE_TIMES = ['same_day', 'within_24h', 'within_48h', 'days_3_plus'] as const;
export type ResponseTime = (typeof RESPONSE_TIMES)[number];
export function cleanResponseTime(raw: unknown): ResponseTime | null {
  const v = String(raw ?? '').trim();
  return (RESPONSE_TIMES as readonly string[]).includes(v) ? (v as ResponseTime) : null;
}

/** Contract type: FIXED choices, MULTI-select (a forklift service company
 *  genuinely offers more than one — per-visit work AND an annual PM
 *  contract). 'none' ("no contract — per-visit only") is exclusive: if it is
 *  present the answer collapses to just ['none'], matching the form UI where
 *  picking it clears the others. Empty array = required field missing. */
export const CONTRACT_TYPES = ['none', 'membership', 'annual'] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];
export function cleanContractTypes(values: unknown): ContractType[] {
  if (!Array.isArray(values)) return [];
  const out: ContractType[] = [];
  for (const raw of values) {
    const v = String(raw ?? '').trim();
    if ((CONTRACT_TYPES as readonly string[]).includes(v) && !out.includes(v as ContractType)) {
      out.push(v as ContractType);
    }
  }
  return out.includes('none') ? ['none'] : out;
}
